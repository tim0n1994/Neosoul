import { NextResponse } from 'next/server';
import { createAdmin } from '@/lib/supabase/admin';

// PRD §6.11 [红线]：Stripe Webhook——校验签名后更新 entitlements；幂等处理。
// 必须用 raw body（Stripe 签名校验需要）。

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'no signature' }, { status: 401 });
  }

  const rawBody = await req.text();

  let stripe;
  try {
    const { getStripe } = await import('@/lib/stripe');
    stripe = await getStripe();
  } catch {
    return NextResponse.json({ error: 'payment_not_configured' }, { status: 503 });
  }

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  const admin = createAdmin();

  // Claim the event before side effects. The primary key makes Stripe retries harmless.
  const { error: claimError } = await admin.from('stripe_webhook_events').insert({
    id: event.id,
    event_type: event.type,
  });
  if (claimError) {
    if (claimError.code === '23505') {
      return NextResponse.json({ received: true, duplicate: true });
    }
    return NextResponse.json({ error: 'event_claim_failed' }, { status: 503 });
  }
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = session.client_reference_id ?? session.metadata?.userId;
      if (!userId) break;

      if (session.mode === 'subscription') {
        // 订阅——记录 subscriptions 表
        const subId = session.subscription as string;
        // 查订阅详情获取 period_end
        try {
          const sub = await stripe.subscriptions.retrieve(subId);
          const subData = sub as unknown as { current_period_end: number };
          const proUntil = new Date(subData.current_period_end * 1000).toISOString();
          await admin.from('subscriptions').upsert(
            {
              id: subId,
              user_id: userId,
              status: sub.status,
              current_period_end: proUntil,
            },
            { onConflict: 'id' },
          );
          // 更新权益
          const { setProEntitlement } = await import('@/lib/stripe');
          await setProEntitlement(userId, true, proUntil);
        } catch {
          // 查询失败——记录但不阻断
        }
      } else if (session.mode === 'payment') {
        // 内购——记录 purchases 表
        await admin.from('purchases').upsert({
          id: session.payment_intent as string,
          user_id: userId,
          sku: session.metadata?.type ?? 'unknown',
          amount: session.amount_total ?? 0,
          currency: session.currency ?? 'usd',
        });
        // 装扮权益可在这里附加到 cosmetics
      }
      break;
    }

    case 'customer.subscription.deleted': {
      // 订阅取消——降级权益
      const sub = event.data.object;
      const { data: subRow } = await admin
        .from('subscriptions')
        .select('user_id')
        .eq('id', sub.id)
        .maybeSingle();
      if (subRow?.user_id) {
        const { setProEntitlement } = await import('@/lib/stripe');
        await setProEntitlement(subRow.user_id, false, null);
      }
      break;
    }

    case 'customer.subscription.updated': {
      // 订阅更新（续期/升降级）
      const sub = event.data.object as unknown as { id: string; status: string; current_period_end: number };
      const proUntil = new Date(sub.current_period_end * 1000).toISOString();
      const { data: subRow } = await admin
        .from('subscriptions')
        .select('user_id')
        .eq('id', sub.id)
        .maybeSingle();
      if (subRow?.user_id) {
        await admin.from('subscriptions').upsert(
          {
            id: sub.id,
            user_id: subRow.user_id,
            status: sub.status,
            current_period_end: proUntil,
          },
          { onConflict: 'id' },
        );
        const isActive = sub.status === 'active' || sub.status === 'trialing';
        const { setProEntitlement } = await import('@/lib/stripe');
        await setProEntitlement(subRow.user_id, isActive, isActive ? proUntil : null);
      }
      break;
    }

    default:
      // 忽略未处理的事件
      break;
  }

  return NextResponse.json({ received: true });
}
