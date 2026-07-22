import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

const ADMIN_EMAIL = 'tim0n@qq.com';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (user.email !== ADMIN_EMAIL) redirect('/rooms');

  return (
    <div className="min-h-[100dvh]">
      <header className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-6">
          <span className="text-lg font-light tracking-[0.15em] text-cream-50">
            Neosoul <span className="text-[11px] text-rose-light">管理</span>
          </span>
          <nav className="flex gap-4">
            <Link href="/admin/rooms" className="text-xs font-light text-cream-200 hover:text-cream-50">房间</Link>
            <Link href="/admin/users" className="text-xs font-light text-cream-200 hover:text-cream-50">用户</Link>
          </nav>
        </div>
        <Link href="/rooms" className="text-[11px] font-light text-cream-300 hover:text-rose-light">返回</Link>
      </header>
      <main className="px-6 pb-24">{children}</main>
    </div>
  );
}
