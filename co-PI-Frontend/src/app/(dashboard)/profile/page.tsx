'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, getUser, removeToken, setUser } from '@/lib/api';
import { USERS } from '@/lib/endpoints';
import Link from 'next/link';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setLocalUser]        = useState<User | null>(null);
  const [firstName, setFirstName]   = useState('');
  const [lastName, setLastName]     = useState('');
  const [saving, setSaving]         = useState(false);
  const [message, setMessage]       = useState('');
  const [error, setError]           = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const [publicProfile, setPublicProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [copied, setCopied] = useState(false);

  function handleCopyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/profiles/${user?.email.split('@')[0]}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  useEffect(() => {
    const u = getUser<User>();
    if (!u) { router.replace('/login'); return; }
    setLocalUser(u);
    setFirstName(u.firstName ?? '');
    setLastName(u.lastName ?? '');

    // Fetch public profile to get repo stats
    const username = u.email.split('@')[0];
    apiFetch<any>(USERS.PUBLIC_PROFILE(username))
      .then(res => {
        setPublicProfile(res);
      })
      .catch(console.error);
  }, [router]);

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError('First and last name are required.');
      return;
    }
    setSaving(true); setMessage(''); setError('');
    try {
      const res = await apiFetch<{ user: User }>(USERS.PROFILE, {
        method: 'PUT',
        body: JSON.stringify({ firstName, lastName }),
      });
      setUser(res.user);
      setLocalUser(res.user);
      setMessage('Profile updated successfully.');
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  }

  async function proceedDeactivate() {
    setShowConfirm(false);
    try {
      await apiFetch(USERS.PROFILE, { method: 'DELETE' });
      removeToken();
      window.location.href = '/login';
    } catch (err: any) {
      setError(err.message || 'Failed to deactivate account.');
    }
  }

  if (!user) return null;

  return (
    <div style={{ padding: '0.75rem 1.5rem 2rem', display: 'flex', justifyContent: 'center' }}>
      <div className="auth-card auth-card--wide" style={{ maxWidth: '600px', width: '100%' }}>

        {/* Header */}
        <div className="auth-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p className="auth-eyebrow">Account</p>
            <h1 className="auth-title" style={{ marginBottom: '0.5rem' }}>Your Profile</h1>
            <button 
              onClick={handleCopyLink}
              className="dash-btn-ghost"
              style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem', border: '1px solid rgba(0,0,0,0.1)' }}
            >
              {copied ? 'Copied!' : 'Copy Public Link'}
            </button>
          </div>
          {activeTab === 'overview' && !isEditing && (
            <button onClick={() => setIsEditing(true)} className="dash-btn-ghost" style={{ border: '1px solid #ccc' }}>
              Edit Profile
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '2rem', borderBottom: '1px solid rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
          <button 
            onClick={() => setActiveTab('overview')} 
            style={{ padding: '0.5rem 0', background: 'none', border: 'none', borderBottom: activeTab === 'overview' ? '2px solid #2A7C75' : '2px solid transparent', color: activeTab === 'overview' ? '#111' : 'var(--text-muted)', fontWeight: activeTab === 'overview' ? 600 : 400, cursor: 'pointer' }}>
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('repositories')} 
            style={{ padding: '0.5rem 0', background: 'none', border: 'none', borderBottom: activeTab === 'repositories' ? '2px solid #2A7C75' : '2px solid transparent', color: activeTab === 'repositories' ? '#111' : 'var(--text-muted)', fontWeight: activeTab === 'repositories' ? 600 : 400, cursor: 'pointer' }}>
            Repositories
          </button>
          <button 
            onClick={() => setActiveTab('settings')} 
            style={{ padding: '0.5rem 0', background: 'none', border: 'none', borderBottom: activeTab === 'settings' ? '2px solid #2A7C75' : '2px solid transparent', color: activeTab === 'settings' ? '#111' : 'var(--text-muted)', fontWeight: activeTab === 'settings' ? 600 : 400, cursor: 'pointer' }}>
            Settings
          </button>
        </div>

        {activeTab === 'overview' && (
          <>
            <div style={{ marginBottom: '2rem', display: 'flex', gap: '2rem', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '1.5rem' }}>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 600, color: '#111' }}>{publicProfile?.projects?.length || 0}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Owned Repositories</div>
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111', marginTop: '0.5rem' }}>
              {publicProfile?.createdAt ? new Date(publicProfile.createdAt).toLocaleDateString() : '...'}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Member Since</div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleUpdateProfile} className="auth-form" noValidate>

          {/* Email — read only */}
          <div className="auth-field">
            <label htmlFor="profile-email" className="auth-label">Email address (read-only)</label>
            <input
              id="profile-email"
              className="auth-input"
              type="email"
              value={user.email}
              disabled
              style={{ opacity: 0.6 }}
            />
          </div>

          {/* Name row */}
          <div className="auth-row">
            <div className="auth-field">
              <label htmlFor="profile-firstname" className="auth-label">First name</label>
              <input
                id="profile-firstname"
                className="auth-input"
                type="text"
                placeholder="Ada"
                value={firstName}
                onChange={e => { setFirstName(e.target.value); setError(''); }}
                disabled={!isEditing || saving}
                style={{ opacity: !isEditing ? 0.7 : 1 }}
              />
            </div>
            <div className="auth-field">
              <label htmlFor="profile-lastname" className="auth-label">Last name</label>
              <input
                id="profile-lastname"
                className="auth-input"
                type="text"
                placeholder="Lovelace"
                value={lastName}
                onChange={e => { setLastName(e.target.value); setError(''); }}
                disabled={!isEditing || saving}
                style={{ opacity: !isEditing ? 0.7 : 1 }}
              />
            </div>
          </div>

          {error   && <p className="auth-error">{error}</p>}
          {message && <p className="auth-success">{message}</p>}

          {isEditing && (
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="button"
                className="dash-btn-ghost"
                onClick={() => {
                  setIsEditing(false);
                  setFirstName(user.firstName);
                  setLastName(user.lastName);
                }}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="auth-btn"
                disabled={saving}
                id="profile-submit"
              >
                {saving ? 'Saving…' : 'Save changes →'}
              </button>
            </div>
          )}
        </form>
          </>
        )}

        {/* List of Owned Repositories */}
        {activeTab === 'repositories' && (
          <div style={{ marginTop: '1rem' }}>
            <h3 style={{ fontSize: '1rem', color: '#111', marginBottom: '1rem' }}>Repositories Owned</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {publicProfile.projects.map((p: any) => (
                <div key={p.projectId} style={{ padding: '1rem', background: '#f9f9f8', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.05)' }}>
                  <Link href={`/repositories/${p.projectId}`} style={{ fontSize: '1.05rem', fontWeight: 600, color: '#2A7C75', textDecoration: 'none' }}>
                    {p.project.title}
                  </Link>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {p.project.description?.substring(0, 100) || 'No description'}...
                  </p>
                </div>
              ))}
            </div>
            {(!publicProfile?.projects || publicProfile.projects.length === 0) && (
              <p style={{ color: 'var(--text-muted)' }}>You don't have any owned repositories yet.</p>
            )}
          </div>
        )}

        {/* Danger zone */}
        {activeTab === 'settings' && (
          <div className="auth-form" style={{ marginTop: '1rem' }}>
          <p className="auth-eyebrow" style={{ color: 'rgba(185,28,28,0.8)', marginBottom: '0.5rem' }}>Danger zone</p>
          <p className="auth-subtitle" style={{ marginBottom: '1rem' }}>
            Deactivating your account will immediately log you out. Your data will be preserved to protect ongoing projects.
          </p>
          <button
            type="button"
            className="auth-btn"
            onClick={() => setShowConfirm(true)}
            style={{ background: 'transparent', color: 'rgb(185,28,28)', border: '1px solid rgba(185,28,28,0.4)' }}
          >
            Deactivate Account
          </button>
        </div>
        )}
      </div>

      {/* Confirm deactivation modal */}
      {showConfirm && (
        <div className="dash-modal-overlay">
          <div className="dash-modal">
            <h3 className="dash-modal-title">Deactivate Account</h3>
            <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
              Are you absolutely sure? You will lose access to all your projects immediately.
            </p>
            <div className="dash-modal-actions">
              <button className="dash-btn-ghost" onClick={() => setShowConfirm(false)}>Cancel</button>
              <button
                className="auth-btn"
                onClick={proceedDeactivate}
                style={{ background: 'rgb(185,28,28)', border: 'none' }}
              >
                Yes, Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
