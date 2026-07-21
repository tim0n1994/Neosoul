'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function LogoutButton() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/login');
  }
  return (
    <button
      onClick={handleLogout}
      className="text-[11px] font-light tracking-wider text-cream-300 transition-colors hover:text-rose-light"
    >
      退出
    </button>
  );
}
