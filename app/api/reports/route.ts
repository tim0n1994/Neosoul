import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimitResponse, LIMITS } from '@/lib/ratelimit';

// PRD §6.10 [红线]：举报——限流 + 服务端设置 reporter_id（防伪造）。
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const limited = rateLimitResponse(user.id, 'report', LIMITS.report.limit, LIMITS.report.windowSec);
  if (limited) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  let body: { targetType?: string; targetId?: string; reason?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const { targetType, targetId, reason, note } = body;
  if (!targetType || !targetId || !reason) {
    return NextResponse.json({ error: 'missing fields' }, { status: 400 });
  }

  // 服务端设置 reporter_id——防止客户端伪造
  const { error } = await supabase.from('reports').insert({
    reporter_id: user.id,
    target_type: targetType,
    target_id: String(targetId),
    reason,
    note: note?.trim() || null,
    status: 'open',
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
