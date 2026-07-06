'use client';

import { useState } from 'react';
import Link from 'next/link';

const NAV_LINKS = [
  { label: 'Explore',   href: '/explore'   },
  { label: 'Features',  href: '/#features' },
  { label: 'Projects',  href: '/#projects' },
  { label: 'Team',      href: '/#team'     },
  { label: 'About',     href: '/#about'    },
];

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <nav className="rh-nav">
        <Link href="/" className="nav-logo">
          Research<sup>hub</sup>
        </Link>
        <ul className="nav-links">
          {NAV_LINKS.map(({ label, href }) => (
            <li key={label}><a href={href}>{label}</a></li>
          ))}
        </ul>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/login" className="nav-join">Sign In →</Link>
          <button 
            className="mobile-menu-btn" 
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            ☰
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(242, 237, 228, 0.98)', backdropFilter: 'blur(10px)',
          zIndex: 9999, display: 'flex', flexDirection: 'column', padding: '1.5rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              onClick={() => setMobileMenuOpen(false)}
              style={{ background: 'transparent', border: 'none', fontSize: '2rem', cursor: 'pointer', color: 'var(--ink)' }}
            >
              ✕
            </button>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, marginTop: '4rem', display: 'flex', flexDirection: 'column', gap: '2.5rem', alignItems: 'center' }}>
            {NAV_LINKS.map(({ label, href }) => (
              <li key={label}>
                <a 
                  href={href} 
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ fontFamily: 'var(--font-sans)', fontSize: '2rem', fontWeight: 600, color: 'var(--ink)', textDecoration: 'none', letterSpacing: '-0.5px' }}
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <style>{`
        .mobile-menu-btn {
          display: none;
          background: transparent;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: var(--ink);
          padding: 0;
          line-height: 1;
        }
        @media (max-width: 768px) {
          .mobile-menu-btn {
            display: block;
          }
        }
      `}</style>
    </>
  );
}
