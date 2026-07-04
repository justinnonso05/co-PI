import { notFound } from 'next/navigation';
import Link from 'next/link';
import { USERS } from '@/lib/endpoints';
import ProfileAuthNav from '@/components/profile/ProfileAuthNav';

// This is a Server Component, but we'll fetch data at runtime or client side.
// Wait, we can fetch it Server-side using fetch directly since it's Next.js app router.
export default async function PublicProfilePage({ params, searchParams }: { params: Promise<{ username: string }>, searchParams: Promise<{ tab?: string }> }) {
  const { username } = await params;
  const { tab } = await searchParams;
  const activeTab = tab || 'overview';
  
  // Fetch public profile data from backend
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const url = `${baseUrl}/api/users/profile/${username}`;
  
  const res = await fetch(url, {
    // Next.js cache options - no-store for real-time
    cache: 'no-store'
  });

  if (!res.ok) {
    if (res.status === 404) {
      notFound();
    }
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Error loading profile.</div>;
  }

  const profile = await res.json();
  const repoCount = profile.projects?.length || 0;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', fontFamily: 'var(--font-sans)', color: 'var(--text-main)' }}>
      {/* Header */}
      <header style={{ background: '#1A1A18', color: '#FFF', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '1.2rem', fontWeight: 600, letterSpacing: '0.05em' }}>
          co-PI <span style={{ opacity: 0.5 }}>|</span> Public Profile
        </div>
        <div>
          <ProfileAuthNav />
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '4rem 2rem' }}>
        
        {/* Profile Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '2rem', marginBottom: '2rem' }}>
          <div style={{ 
            width: '100px', 
            height: '100px', 
            borderRadius: '50%', 
            background: '#2A7C75', 
            color: 'white', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontSize: '2.5rem', 
            fontWeight: 600 
          }}>
            {profile.firstName[0]}{profile.lastName[0]}
          </div>
          <div>
            <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2.5rem', color: '#111' }}>
              {profile.firstName} {profile.lastName}
            </h1>
            <p style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-muted)' }}>
              @{username}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '2rem', borderBottom: '1px solid rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
          <Link 
            href={`/profiles/${username}?tab=overview`} 
            style={{ padding: '0.5rem 0', textDecoration: 'none', borderBottom: activeTab === 'overview' ? '2px solid #2A7C75' : '2px solid transparent', color: activeTab === 'overview' ? '#111' : 'var(--text-muted)', fontWeight: activeTab === 'overview' ? 600 : 400 }}>
            Overview
          </Link>
          <Link 
            href={`/profiles/${username}?tab=repositories`} 
            style={{ padding: '0.5rem 0', textDecoration: 'none', borderBottom: activeTab === 'repositories' ? '2px solid #2A7C75' : '2px solid transparent', color: activeTab === 'repositories' ? '#111' : 'var(--text-muted)', fontWeight: activeTab === 'repositories' ? 600 : 400 }}>
            Repositories <span style={{ background: 'rgba(0,0,0,0.05)', padding: '0.1rem 0.5rem', borderRadius: '20px', fontSize: '0.8rem', marginLeft: '0.5rem' }}>{repoCount}</span>
          </Link>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', gap: '3rem', marginBottom: '3rem' }}>
            <div>
              <div style={{ fontSize: '2.5rem', fontWeight: 600, color: '#111' }}>{repoCount}</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Repositories</div>
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#111', marginTop: '0.75rem' }}>
                {new Date(profile.createdAt).getFullYear()}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Joined</div>
            </div>
          </div>
        )}

        {/* Repositories Tab */}
        {activeTab === 'repositories' && (
          <div>
            <h2 style={{ fontSize: '1.5rem', color: '#111', marginBottom: '1.5rem', display: 'none' }}>Public Repositories</h2>
        {repoCount === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>This user doesn't have any public repositories yet.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
            {profile.projects.map((p: any) => (
              <div key={p.projectId} style={{ 
                background: '#fff', 
                border: '1px solid rgba(0,0,0,0.1)', 
                borderRadius: '8px', 
                padding: '1.5rem',
                boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <Link href={`/login`} style={{ fontSize: '1.2rem', fontWeight: 600, color: '#2A7C75', textDecoration: 'none' }}>
                    {p.project.title}
                  </Link>
                  <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '20px', color: 'var(--text-muted)' }}>
                    {p.project.visibility}
                  </span>
                </div>
                <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {p.project.description?.substring(0, 150) || 'No description provided.'}
                </p>
                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <span>Status: {p.project.status}</span>
                  <span>Updated: {new Date(p.project.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
        )}

      </main>
    </div>
  );
}
