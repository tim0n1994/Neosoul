import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// 落地页：已登录且已 onboarding → /rooms；未登录 → /login。
export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle();

  // display_name 为空或默认 'Guest' 视为未完成 onboarding（PRD §8）
  if (!profile || !profile.display_name || profile.display_name === 'Guest') {
    redirect('/onboarding');
  }

  redirect('/discover');
}
