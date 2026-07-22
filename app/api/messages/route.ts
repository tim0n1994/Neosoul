import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimitResponse, LIMITS } from '@/lib/ratelimit';
import { moderateText } from '@/lib/moderation';

// PRD §6.10 [红线]：消息发送——限流 + 文本审核（客户端直插 Supabase 时的服务端拦截）
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // 限流
  const limited = rateLimitResponse(user.id, 'sendMessage', LIMITS.sendMessage.limit, LIMITS.sendMessage.windowSec);
  if (limited) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  let body: { roomId?: string; kind?: string; text?: string; imageUrl?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const { roomId, kind, text, imageUrl } = body;
  if (!roomId || !kind) {
    return NextResponse.json({ error: 'missing fields' }, { status: 400 });
  }

  const messageBody = kind === 'text' ? text : imageUrl;
  if (!messageBody) {
    return NextResponse.json({ error: 'empty message' }, { status: 400 });
  }

  // 文本审核
  if (kind === 'text') {
    const verdict = await moderateText(messageBody);
    if (!verdict.allowed) {
      return NextResponse.json({ error: 'content_blocked' }, { status: 422 });
    }
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      room_id: roomId,
      sender_id: user.id,
      kind,
      body: messageBody,
    })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id });
}
