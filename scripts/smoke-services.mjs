const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_LIVEKIT_URL',
  'LIVEKIT_API_KEY',
  'LIVEKIT_API_SECRET',
  'STRIPE_SECRET_KEY',
];

const missing = required.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(`Missing smoke-test environment variables: ${missing.join(', ')}`);
  process.exit(2);
}

const withTimeout = async (operation, timeoutMs = 8000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await operation(controller.signal);
  } finally {
    clearTimeout(timer);
  }
};

const results = {};

try {
  const url = new URL('/auth/v1/settings', process.env.NEXT_PUBLIC_SUPABASE_URL);
  const response = await withTimeout((signal) =>
    fetch(url, {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      signal,
    }),
  );
  results.supabase = response.ok ? 'ok' : `http-${response.status}`;
} catch (error) {
  results.supabase = `error:${error?.name || 'unknown'}`;
}

try {
  const { RoomServiceClient } = await import('livekit-server-sdk');
  const httpUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL
    .replace(/^wss:/, 'https:')
    .replace(/^ws:/, 'http:');
  const client = new RoomServiceClient(
    httpUrl,
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET,
  );
  await withTimeout(() => client.listRooms([]));
  results.livekit = 'ok';
} catch (error) {
  results.livekit = `error:${error?.name || 'unknown'}`;
}

try {
  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-06-30.basil',
  });
  await withTimeout(() => stripe.balance.retrieve());
  results.stripe = 'ok';
} catch (error) {
  results.stripe = `error:${error?.name || 'unknown'}`;
}

console.log(JSON.stringify(results));
if (Object.values(results).some((value) => value !== 'ok')) process.exit(1);
