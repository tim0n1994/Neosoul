import { NextResponse } from 'next/server';

type Check = 'ok' | 'degraded';

const withTimeout = async <T>(operation: (signal: AbortSignal) => Promise<T>, timeoutMs = 5000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await operation(controller.signal);
  } finally {
    clearTimeout(timer);
  }
};

async function checkSupabase(deep: boolean): Promise<Check> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return 'degraded';
  if (!deep) return 'ok';

  try {
    const response = await withTimeout((signal) =>
      fetch(new URL('/auth/v1/settings', url), {
        headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
        signal,
        cache: 'no-store',
      }),
    );
    return response.ok ? 'ok' : 'degraded';
  } catch {
    return 'degraded';
  }
}

async function checkLiveKit(deep: boolean): Promise<Check> {
  const url = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!url || !apiKey || !apiSecret) return 'degraded';
  if (!deep) return 'ok';

  try {
    const { RoomServiceClient } = await import('livekit-server-sdk');
    const httpUrl = url.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:');
    const client = new RoomServiceClient(httpUrl, apiKey, apiSecret);
    await withTimeout(() => client.listRooms([]));
    return 'ok';
  } catch {
    return 'degraded';
  }
}

async function checkStripe(deep: boolean): Promise<Check> {
  if (!process.env.STRIPE_SECRET_KEY) return 'degraded';
  if (!deep) return 'ok';

  try {
    const { getStripe } = await import('@/lib/stripe');
    const stripe = await getStripe();
    await withTimeout(() => stripe.balance.retrieve());
    return 'ok';
  } catch {
    return 'degraded';
  }
}

export async function GET(request: Request) {
  const deep = new URL(request.url).searchParams.get('deep') === '1';
  const checks = {
    supabase: await checkSupabase(deep),
    livekit: await checkLiveKit(deep),
    stripe: await checkStripe(deep),
  };
  const allOk = Object.values(checks).every((value) => value === 'ok');

  return NextResponse.json(
    { status: allOk ? 'ok' : 'degraded', mode: deep ? 'deep' : 'config', checks },
    { status: allOk ? 200 : 503 },
  );
}
