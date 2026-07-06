'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { DISCOVERY } from '@/lib/endpoints';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

interface ExploreProject {
  id: string;
  title: string;
  researchTopic: string;
  description: string;
  status: string;
  createdAt: string;
  members: { user: { firstName: string; lastName: string } }[];
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  DRAFT:      { label: 'Draft',      cls: 'badge--draft' },
  PUBLISHED:  { label: 'Active',     cls: 'badge--active' },
  ARCHIVED:   { label: 'Archived',   cls: 'badge--archived' },
};

export default function ExplorePage() {
  const router = useRouter();
  
  const [projects, setProjects] = useState<ExploreProject[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  /* ── Custom cursor ── */
  useEffect(() => {
    const dot  = document.getElementById('rh-cursor');
    const ring = document.getElementById('rh-cursor-ring');
    if (!dot || !ring) return;

    let mx = 0, my = 0, rx = 0, ry = 0;
    let raf: number;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX; my = e.clientY;
      dot.style.left = mx + 'px'; dot.style.top = my + 'px';
    };
    const animRing = () => {
      rx += (mx - rx) * 0.12; ry += (my - ry) * 0.12;
      ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
      raf = requestAnimationFrame(animRing);
    };

    document.addEventListener('mousemove', onMove);
    raf = requestAnimationFrame(animRing);

    const grow   = () => { dot.style.width  = '18px'; dot.style.height = '18px'; ring.style.width = '48px'; ring.style.height = '48px'; };
    const shrink = () => { dot.style.width  = '10px'; dot.style.height = '10px'; ring.style.width = '32px'; ring.style.height = '32px'; };

    document.querySelectorAll('a, button, .proj-card, .hero-search-row').forEach(el => {
      el.addEventListener('mouseenter', grow);
      el.addEventListener('mouseleave', shrink);
    });

    return () => { document.removeEventListener('mousemove', onMove); cancelAnimationFrame(raf); };
  }, [projects, loading]);

  useEffect(() => {
    setLoading(true);
    // Limit to 30 per page
    const url = `${DISCOVERY.EXPLORE}?page=${page}&limit=30&search=${encodeURIComponent(searchQuery)}`;
    
    apiFetch<{ data: ExploreProject[], totalPages: number }>(url)
      .then(res => {
        setProjects(res.data);
        setTotalPages(res.totalPages || 1);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, searchQuery]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchInput(val);
    setSearchQuery(val); // Instant search
    setPage(1);
  };

  const handleSearchBtn = () => {
    setSearchQuery(searchInput);
    setPage(1);
  };

  const handleApplyClick = () => {
    setLoginModalOpen(true);
  };

  return (
    <div className="rh-landing">
      <div id="rh-cursor" />
      <div id="rh-cursor-ring" />
      <Navbar />
      
      <main style={{ maxWidth: '1200px', margin: '8rem auto 4rem', padding: '0 2rem', minHeight: '60vh' }}>
        <h1 style={{ fontSize: '3.5rem', fontWeight: 800, marginBottom: '1rem', letterSpacing: '-1.5px', textAlign: 'center' }}>Explore Open Research</h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: '4rem', textAlign: 'center' }}>
          Discover collaborative repositories in AI, Health, Finance, and more.
        </p>

        {/* Instant Search Bar Matching Landing Page */}
        <div style={{ maxWidth: '800px', margin: '0 auto 4rem' }}>
          <div className="hero-search-row relative">
            <input 
              type="text" 
              id="hero-input"
              placeholder="Search a repository, researcher, or field…" 
              value={searchInput}
              onChange={handleSearchChange}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearchBtn(); }}
            />
            <button type="button" onClick={handleSearchBtn}>
              Search
            </button>
          </div>
        </div>

        {/* Project List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Loading...</div>
        ) : projects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>No repositories found.</div>
        ) : (
          <div className="dash-project-grid">
            {projects.map(p => (
              <div key={p.id} className="proj-card">
                {/* teal top bar */}
                <div className="proj-pi-bar" />

                {/* Status + date */}
                <div className="proj-card-meta">
                  <span className={`proj-badge ${STATUS_META[p.status]?.cls || 'badge--active'}`}>
                    {STATUS_META[p.status]?.label || p.status}
                  </span>
                  <span className="proj-ethics">
                    {new Date(p.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>

                {/* Title + desc */}
                <h3 className="proj-card-title">{p.title}</h3>
                <p className="proj-card-desc">{p.description}</p>

                {/* Footer: PI info + apply */}
                <div className="proj-card-foot" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
                  {p.members?.[0] && (
                    <span className="proj-ethics">
                      PI · {p.members[0].user.firstName} {p.members[0].user.lastName}
                    </span>
                  )}

                  <div style={{ display: 'flex', width: '100%' }}>
                    <button
                      className="dash-btn-primary"
                      style={{ padding: '0.5rem 0', width: '100%', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                      onClick={handleApplyClick}
                    >
                      Apply to Join
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', marginTop: '4rem' }}>
            <button 
              disabled={page === 1}
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              className="dash-btn-ghost"
              style={{ cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}
            >
              Previous
            </button>
            <span style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Page {page} of {totalPages}</span>
            <button 
              disabled={page === totalPages}
              onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
              className="dash-btn-ghost"
              style={{ cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.5 : 1 }}
            >
              Next
            </button>
          </div>
        )}
      </main>

      <Footer />

      {/* Login Modal */}
      {loginModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            background: 'var(--paper)', padding: '2.5rem', borderRadius: '16px', maxWidth: '400px', width: '90%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Login Required</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: 1.5 }}>
              You must be logged in to apply to collaborate. Would you like to login now?
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setLoginModalOpen(false)}
                className="dash-btn-ghost"
              >
                Cancel
              </button>
              <button 
                onClick={() => router.push('/login')}
                className="dash-btn-primary"
              >
                Login
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
