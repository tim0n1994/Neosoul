'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function LogoutButton() {
  const router = useRouter();
  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/login');
  }
  return (
    <button
      onClick={handleLogout}
      className="text-xs text-white/40 hover:text-white"
    >
      退出登录
    </button>
  );
}
