import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimitResponse } from '@/lib/ratelimit';

// PRD §6.11 Stripe Checkout——创建订阅/内购 Checkout Session。
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // 限流
  const limited = rateLimitResponse(user.id, 'checkout', 5, 60);
  if (limited) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  // PRD §6.1/§6.11 [红线]：未成年不可付费
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_minor')
    .eq('id', user.id)
    .maybeSingle();
  if (profile?.is_minor) {
    return NextResponse.json({ error: 'minors_cannot_pay' }, { status: 403 });
  }

  let body: { type?: 'pro_monthly'; sku?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  // 动态导入 stripe——避免未配 key 时 build 失败
  let stripe;
  try {
    const { getStripe } = await import('@/lib/stripe');
    stripe = await getStripe();
  } catch {
    return NextResponse.json(
      { error: 'payment_not_configured' },
      { status: 503 },
    );
  }

  const origin = req.headers.get('origin') ?? 'http://localhost:3000';

  let priceId: string;
  let mode: 'subscription' | 'payment';

  if (body.type === 'pro_monthly') {
    priceId = process.env.STRIPE_PRICE_PRO_MONTHLY!;
    mode = 'subscription';
  } else if (body.sku) {
    // 内购——sku 映射到 price（简化：直接用 env）
    priceId = process.env[`STRIPE_PRICE_${body.sku.toUpperCase()}`] ?? '';
    mode = 'payment';
  } else {
    return NextResponse.json({ error: 'invalid type' }, { status: 400 });
  }

  if (!priceId) {
    return NextResponse.json({ error: 'price_not_configured' }, { status: 503 });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/settings?checkout=success`,
      cancel_url: `${origin}/settings?checkout=cancelled`,
      client_reference_id: user.id,
      metadata: { userId: user.id, type: body.type ?? body.sku ?? '' },
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'checkout failed' },
      { status: 500 },
    );
  }
}
