// PRD §6.11 商业化——Stripe 辅助函数。公平模型 + Connect 架构预留。
// 依赖：stripe SDK（动态 import 避免 Edge Runtime 打包问题）。

export interface Entitlements {
  is_pro: boolean;
  pro_until: string | null;
  cosmetics: string[];
}

/** 获取用户权益 */
export async function getEntitlements(userId: string): Promise<Entitlements> {
  const { createAdmin } = await import('@/lib/supabase/admin');
  const admin = createAdmin();
  const { data } = await admin
    .from('entitlements')
    .select('is_pro, pro_until, cosmetics')
    .eq('user_id', userId)
    .maybeSingle();

  // Pro 是否在有效期内
  const isActive =
    !!data?.is_pro &&
    (!data.pro_until || new Date(data.pro_until) > new Date());

  return {
    is_pro: isActive,
    pro_until: data?.pro_until ?? null,
    cosmetics: data?.cosmetics ?? [],
  };
}

/** 更新权益（由 Stripe webhook 调用） */
export async function setProEntitlement(
  userId: string,
  isPro: boolean,
  proUntil: string | null,
): Promise<void> {
  const { createAdmin } = await import('@/lib/supabase/admin');
  const admin = createAdmin();
  await admin.from('entitlements').upsert(
    {
      user_id: userId,
      is_pro: isPro,
      pro_until: proUntil,
    },
    { onConflict: 'user_id' },
  );
}

/** Pro 权益对房间容量的影响（PRD §6.11）*/
export function roomCapacityFor(entitlements: Entitlements) {
  if (entitlements.is_pro) {
    return { maxParticipants: 200, maxSpeakers: 30 };
  }
  return { maxParticipants: 50, maxSpeakers: 12 };
}

/**
 * 获取 Stripe 客户端实例。
 * Stripe SDK 动态导入，仅服务端使用。
 */
export async function getStripe() {
  const Stripe = (await import('stripe')).default;
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-06-30.basil' as never,
  });
}
