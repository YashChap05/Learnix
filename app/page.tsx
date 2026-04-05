'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    fetch('/api/me', { credentials: 'same-origin' })
      .then((r) => {
        if (r.ok) router.replace('/home');
        else router.replace('/login');
      })
      .catch(() => router.replace('/login'));
  }, [router]);

  return null;
}
