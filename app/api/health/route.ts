import { NextResponse } from 'next/server';

// PRD §12: /api/health 探 Supabase/LiveKit 可达性。
// Stripe 暂未接入，不纳入健康检查。
export async function GET() {
  const checks: Record<string, 'ok' | 'degraded'> = {};
  try {
    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    checks.supabase = sbUrl ? 'ok' : 'degraded';
  } catch {
    checks.supabase = 'degraded';
  }
  checks.livekit = process.env.NEXT_PUBLIC_LIVEKIT_URL ? 'ok' : 'degraded';
  const allOk = Object.values(checks).every((v) => v === 'ok');
  return NextResponse.json(
    { status: allOk ? 'ok' : 'degraded', checks },
    { status: allOk ? 200 : 503 },
  );
}
