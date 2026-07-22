import { NextResponse } from 'next/server';

// PRD §12: /api/health 探 Supabase/LiveKit/Stripe 可达性。
export async function GET() {
  const checks: Record<string, 'ok' | 'degraded'> = {};
  try {
    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    checks.supabase = sbUrl ? 'ok' : 'degraded';
  } catch {
    checks.supabase = 'degraded';
  }
  checks.livekit = process.env.NEXT_PUBLIC_LIVEKIT_URL ? 'ok' : 'degraded';
  checks.stripe = process.env.STRIPE_SECRET_KEY ? 'ok' : 'degraded';
  const allOk = Object.values(checks).every((v) => v === 'ok');
  return NextResponse.json(
    { status: allOk ? 'ok' : 'degraded', checks },
    { status: allOk ? 200 : 503 },
  );
}
