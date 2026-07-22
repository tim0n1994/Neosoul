import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { moderateText } from '@/lib/moderation';
import { rateLimitResponse, LIMITS } from '@/lib/ratelimit';

// PRD §6.10 [红线]：文本审核——公屏/房名/昵称发布前调用。
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // 限流
  const limited = rateLimitResponse(user.id, 'moderate_text', 30, 60);
  if (limited) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  let body: { text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const text = body.text?.trim() ?? '';
  if (!text) {
    return NextResponse.json({ error: 'text required' }, { status: 400 });
  }
  if (text.length > 2000) {
    return NextResponse.json({ error: 'text too long' }, { status: 400 });
  }

  const verdict = await moderateText(text);

  // 中危内容——写入审核队列（reports 表，status=open，target_type 标记为自动检测）
  if (verdict.severity === 'medium') {
    // P0：只标记不下发，M2 后台队列处理
    void supabase.from('reports').insert({
      reporter_id: null, // 系统自动标记
      target_type: 'message',
      target_id: 'auto:' + verdict.categories.join(','),
      reason: 'auto_moderation_medium',
      note: text.slice(0, 200),
      status: 'open',
    });
  }

  return NextResponse.json({
    allowed: verdict.allowed,
    severity: verdict.severity,
    categories: verdict.categories,
  });
}
