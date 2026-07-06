'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getToken, getUser, removeToken } from '@/lib/api';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

const NAV = [
  { href: '/dashboard',  label: 'Dashboard',  icon: '◈' },
  { href: '/repositories',   label: 'All Repositories',icon: '▤' },
  { href: '/profile',    label: 'Profile',    icon: '◎' },
];

export default function DashboardShell({ children }: { children: ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [user, setUser]           = useState<User | null>(null);
  const [sideOpen, setSideOpen]   = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  /* ── Auth guard & Global Presence ── */
  useEffect(() => {
    const token = getToken();
    if (!token) { router.replace('/login'); return; }
    const u = getUser<User>();
    setUser(u);

    // Global Presence Ping
    if (u) {
      import('@/lib/socket').then(({ getSocket }) => {
        const socket = getSocket();
        socket.connect();
        
        // Ping immediately and then every 10s
        const ping = () => socket.emit('set-online-status', { userId: u.id, firstName: u.firstName, status: 'online' });
        ping();
        const interval = setInterval(ping, 10000);
        return () => clearInterval(interval);
      });
    }
  }, [router]);

  function handleSignOut() {
    removeToken();
    router.replace('/login');
  }

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : '??';

  return (
    <div className="ds-root">
      {/* ── Sidebar ── */}
      <aside className={`ds-sidebar ${sideOpen ? 'ds-sidebar--open' : ''}`}>
        <Link href="/" className="ds-logo">
          Research<sup>hub</sup>
        </Link>

        <nav className="ds-nav">
          {NAV.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className={`ds-nav-item ${pathname === href ? 'ds-nav-item--active' : ''}`}
            >
              <span className="ds-nav-icon">{icon}</span>
              <span className="ds-nav-label">{label}</span>
            </Link>
          ))}
          
          {/* Context-aware Repository Links */}
          {pathname.startsWith('/repositories/') && (
            <>
              <div style={{ margin: '1.5rem 0 0.5rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'rgba(26,26,24,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Current Repository
              </div>
              <Link
                href={`/repositories/${pathname.split('/')[2]}/chat`}
                className={`ds-nav-item ${pathname.endsWith('/chat') ? 'ds-nav-item--active' : ''}`}
              >
                <span className="ds-nav-icon">💬</span>
                <span className="ds-nav-label">Team Chat</span>
              </Link>
            </>
          )}
        </nav>

        <button className="ds-signout" onClick={handleSignOut}>
          <span className="ds-nav-icon">→</span>
          <span className="ds-nav-label">Sign out</span>
        </button>
      </aside>

      {/* ── Mobile overlay ── */}
      {sideOpen && (
        <div className="ds-overlay" onClick={() => setSideOpen(false)} />
      )}

      {/* ── Main content ── */}
      <div className="ds-main">
        {/* Topbar */}
        <header className="ds-topbar">
          <button
            className="ds-hamburger"
            onClick={() => setSideOpen(s => !s)}
            aria-label="Toggle sidebar"
          >
            ☰
          </button>
          
          <div id="ds-topbar-portal-target" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}></div>

          <div className="ds-topbar-right" style={{ marginLeft: 'auto', position: 'relative' }}>
            {user && (
              <div 
                className="ds-avatar" 
                title={`${user.firstName} ${user.lastName}`}
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{ cursor: 'pointer' }}
              >
                {initials}
              </div>
            )}
            
            {dropdownOpen && (
              <div style={{
                position: 'absolute', top: '120%', right: 0,
                background: 'var(--paper)', border: '1px solid rgba(0,0,0,0.1)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)', borderRadius: '4px',
                minWidth: '150px', zIndex: 1000, overflow: 'hidden'
              }}>
                <Link 
                  href="/profile" 
                  className="dash-btn-ghost" 
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem 1rem', borderBottom: '1px solid rgba(0,0,0,0.05)', borderRadius: 0 }}
                  onClick={() => setDropdownOpen(false)}
                >
                  View Profile
                </Link>
                <button 
                  className="dash-btn-ghost" 
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem 1rem', borderRadius: 0, color: 'var(--error)' }}
                  onClick={handleSignOut}
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="ds-content" style={pathname.endsWith('/chat') ? { padding: 0, display: 'flex', flexDirection: 'column' } : undefined}>
          {children}
        </main>
      </div>
    </div>
  );
}
