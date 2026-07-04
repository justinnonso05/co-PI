'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getToken } from '@/lib/api';

export default function ProfileAuthNav() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (getToken()) {
      setIsLoggedIn(true);
    }
  }, []);

  if (!mounted) return null;

  if (isLoggedIn) {
    return (
      <Link href="/dashboard" style={{ color: '#FFF', textDecoration: 'none', fontSize: '0.9rem', padding: '0.5rem 1rem', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px' }}>
        Go to Dashboard
      </Link>
    );
  }

  return (
    <Link href="/login" style={{ color: '#FFF', textDecoration: 'none', fontSize: '0.9rem', padding: '0.5rem 1rem', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px' }}>
      Sign In to co-PI
    </Link>
  );
}
