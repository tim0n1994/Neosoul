// PRD §6.1 [红线]：服务端权限守卫——同意门检查。
// 所有受保护路由都应调用此函数。

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export interface AuthResult {
  user: { id: string; email?: string | null };
  profile: {
    display_name: string;
    avatar_style: string;
    avatar_seed: string;
    avatar_type: string;
    is_minor?: boolean;
    tos_accepted_at?: string | null;
    interests?: string[];
  } | null;
}

/**
 * 确保用户已登录。未登录 redirect /login。
 * 返回 user + profile。
 */
export async function requireAuth(): Promise<AuthResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_style, avatar_seed, avatar_type, is_minor, tos_accepted_at, interests')
    .eq('id', user.id)
    .maybeSingle();

  return { user: { id: user.id, email: user.email }, profile };
}

/**
 * 确保用户已登录 + 已完成 onboarding。
 * 未完成 redirect /onboarding。
 */
export async function requireOnboarded(): Promise<AuthResult> {
  const { user, profile } = await requireAuth();
  if (!profile || !profile.display_name || profile.display_name === 'Guest') {
    redirect('/onboarding');
  }
  return { user, profile };
}
