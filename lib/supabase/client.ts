import { createBrowserClient } from '@supabase/ssr';

// 浏览器端 Supabase client（受 RLS 保护，匿名 key）
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
