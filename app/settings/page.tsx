import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getEntitlements } from '@/lib/stripe';
import { SubscribeButton } from '@/components/SubscribeButton';

// PRD §6.11 订阅/装扮/账户设置。
export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, is_minor, tos_accepted_at')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile || profile.display_name === 'Guest') redirect('/onboarding');

  const entitlements = await getEntitlements(user.id);

  return (
    <main className="min-h-[100dvh] bg-ink-950 px-6 py-16">
      <div className="mx-auto max-w-lg space-y-6">
        <h1 className="text-xl font-light text-cream-50">设置</h1>

        {sp.checkout === 'success' && (
          <div className="rounded-2xl border border-green-500/20 bg-green-500/8 px-4 py-3 text-[13px] text-green-300/90">
            ✓ 订阅成功！权益已更新。
          </div>
        )}
        {sp.checkout === 'cancelled' && (
          <div className="rounded-2xl border border-white/8 bg-white/3 px-4 py-3 text-[13px] text-cream-300">
            已取消支付。
          </div>
        )}

        {/* Pro 订阅状态 */}
        <div className="glass rounded-3xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-medium text-cream-50">NEOSOUL Pro</h2>
              <p className="mt-0.5 text-[11px] text-cream-300/60">
                更大房间 · 更多回放 · 专属装扮 · 去广告
              </p>
            </div>
            {entitlements.is_pro && (
              <span className="rounded-full bg-gold/15 px-3 py-1 text-[10px] font-medium text-gold/80">
                Pro 活跃
              </span>
            )}
          </div>

          {entitlements.is_pro ? (
            <div className="space-y-2 text-[12px] font-light text-cream-200">
              <p>✓ 更大房间容量（200 人 / 30 麦）</p>
              <p>✓ 更多回放存储与时长</p>
              <p>✓ 专属装扮与徽章</p>
              {entitlements.pro_until && (
                <p className="text-cream-300/50">
                  到期：{new Date(entitlements.pro_until).toLocaleDateString('zh-CN')}
                </p>
              )}
            </div>
          ) : profile.is_minor ? (
            <p className="text-[12px] text-rose/70">
              未成年用户不可订阅。
            </p>
          ) : (
            <SubscribeButton type="pro_monthly" label="订阅 Pro — 月付" />
          )}
        </div>

        {/* 账户 */}
        <div className="glass rounded-3xl p-6">
          <h2 className="mb-3 text-base font-medium text-cream-50">账户</h2>
          <div className="space-y-2 text-[13px] font-light text-cream-200">
            <p>昵称：{profile.display_name}</p>
            <p>
              条款同意：
              {profile.tos_accepted_at
                ? new Date(profile.tos_accepted_at).toLocaleDateString('zh-CN')
                : '未同意'}
            </p>
          </div>
        </div>

        {/* 法律链接 */}
        <div className="flex flex-wrap gap-3 text-[11px] font-light text-cream-300/60">
          <a href="/legal/terms" className="hover:text-cream-100">服务条款</a>
          <span>·</span>
          <a href="/legal/privacy" className="hover:text-cream-100">隐私政策</a>
          <span>·</span>
          <a href="/legal/guidelines" className="hover:text-cream-100">社区规范</a>
        </div>
      </div>
    </main>
  );
}
