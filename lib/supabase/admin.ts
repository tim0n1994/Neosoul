import { createClient } from '@supabase/supabase-js';

// service role client —— 绕过 RLS，仅用于服务端鉴权校验（房主复核等）。
// 绝不可在客户端 bundle 或 NEXT_PUBLIC_* 中引用。PRD §17。
export function createAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
