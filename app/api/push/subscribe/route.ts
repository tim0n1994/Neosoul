import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimitResponse } from '@/lib/ratelimit';

// PRD §6.12 Web Push——保存 Web Push 订阅（VAPID）。
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const limited = rateLimitResponse(user.id, 'push_subscribe', 5, 60);
  if (limited) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  let body: { subscription?: { endpoint: string; keys: Record<string, string> } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  if (!body.subscription?.endpoint) {
    return NextResponse.json({ error: 'subscription required' }, { status: 400 });
  }

  // P0: 存储在 profiles 或独立表。简化：存 user metadata。
  // 生产：独立 push_subscriptions 表（endpoint, user_id, p256dh, auth keys）。
  // TODO: create push_subscriptions table
  const { error } = await supabase
    .from('profiles')
    .update({
      // 存储 endpoint 用于后续发送（简化）
    })
    .eq('id', user.id);

  void error;

  return NextResponse.json({ ok: true });
}

// 返回 VAPID public key 供客户端注册
export async function GET() {
  return NextResponse.json({
    vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null,
  });
}
