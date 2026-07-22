import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimitResponse } from '@/lib/ratelimit';

// PRD §6.6 关注——单向关注（对标 Clubhouse/微博）。
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // 限流
  const limited = rateLimitResponse(user.id, 'follow', 20, 60);
  if (limited) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  let body: { targetUserId?: string; action?: 'follow' | 'unfollow' };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const { targetUserId, action } = body;
  if (!targetUserId || !action) {
    return NextResponse.json({ error: 'missing fields' }, { status: 400 });
  }
  if (targetUserId === user.id) {
    return NextResponse.json({ error: 'cannot follow self' }, { status: 400 });
  }

  if (action === 'follow') {
    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: user.id, followee_id: targetUserId });
    if (error?.code === '23505') {
      // already following — idempotent
      return NextResponse.json({ ok: true, following: true });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, following: true });
  } else {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('followee_id', targetUserId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, following: false });
  }
}
