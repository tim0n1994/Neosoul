import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { moderateImage } from '@/lib/moderation';
import { rateLimitResponse, LIMITS } from '@/lib/ratelimit';

// PRD §6.10 [红线]：图片审核——上传后发布前调用。
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const limited = rateLimitResponse(user.id, 'moderate_image', LIMITS.upload.limit, LIMITS.upload.windowSec);
  if (limited) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  let body: { storagePath?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const storagePath = body.storagePath?.trim() ?? '';
  if (!storagePath) {
    return NextResponse.json({ error: 'storagePath required' }, { status: 400 });
  }

  const verdict = await moderateImage(storagePath);

  return NextResponse.json({
    allowed: verdict.allowed,
    severity: verdict.severity,
    categories: verdict.categories,
  });
}
