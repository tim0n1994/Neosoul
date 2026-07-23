import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getEntitlements } from '@/lib/stripe';
import { SubscribeButton } from '@/components/SubscribeButton';
import { PushSettings } from '@/components/PushSettings';
import { ProfileEditor } from '@/components/ProfileEditor';
import { PasswordChanger } from '@/components/PasswordChanger';
import { AvatarImage } from '@/components/AvatarImage';
import type { AvatarConfig } from '@/lib/avatar';
import Link from 'next/link';

// 用户设置/资料页——点击 TopBar 头像进入
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
    .select('display_name, avatar_style, avatar_seed, avatar_type, avatar_config, interests, is_minor, tos_accepted_at')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile || profile.display_name === 'Guest') redirect('/onboarding');

  const entitlements = await getEntitlements(user.id);

  return (
    <main className="min-h-[100dvh] bg-ink-950 px-6 py-8">
      <div className="mx-auto max-w-lg space-y-6">
        {/* 返回 */}
        <Link href="/discover" className="text-[12px] font-light text-cream-300 hover:text-cream-100">
          ← 返回
        </Link>

        {/* 头部——头像 + 名字 */}
        <div className="flex items-center gap-4">
          <AvatarImage style={profile.avatar_style} seed={profile.avatar_seed} avatarType={profile.avatar_type} size={56} />
          <div>
            <h1 className="text-xl font-medium text-cream-50">{profile.display_name}</h1>
            <p className="text-[12px] font-light text-cream-300/60">{user.email}</p>
          </div>
        </div>

        {sp.checkout === 'success' && (
          <div className="rounded-2xl border border-green-500/20 bg-green-500/8 px-4 py-3 text-[13px] text-green-300/90">
            ✓ 订阅成功！权益已更新。
          </div>
        )}

        {/* 编辑资料 */}
        <ProfileEditor
          userId={user.id}
          initial={{
            display_name: profile.display_name,
            avatar_style: profile.avatar_style,
            avatar_seed: profile.avatar_seed,
            avatar_type: profile.avatar_type,
            avatar_config: profile.avatar_config as AvatarConfig | null,
            interests: profile.interests ?? [],
          }}
        />

        {/* 修改密码 */}
        <PasswordChanger />

        {/* Pro 订阅 */}
        <div className="glass rounded-3xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-medium text-cream-50">NEOSOUL Pro</h2>
              <p className="mt-0.5 text-[11px] text-cream-300/60">更大房间 · 更多回放 · 专属装扮 · 去广告</p>
            </div>
            {entitlements.is_pro && (
              <span className="rounded-full bg-gold/15 px-3 py-1 text-[10px] font-medium text-gold/80">Pro 活跃</span>
            )}
          </div>
          {entitlements.is_pro ? (
            <div className="space-y-2 text-[12px] font-light text-cream-200">
              <p>✓ 更大房间容量（200 人 / 30 麦）</p>
              <p>✓ 更多回放存储与时长</p>
              {entitlements.pro_until && (
                <p className="text-cream-300/50">到期：{new Date(entitlements.pro_until).toLocaleDateString('zh-CN')}</p>
              )}
            </div>
          ) : profile.is_minor ? (
            <p className="text-[12px] text-rose/70">未成年用户不可订阅。</p>
          ) : (
            <SubscribeButton type="pro_monthly" label="订阅 Pro — 月付" />
          )}
        </div>

        {/* 通知 */}
        <div className="glass rounded-3xl p-6">
          <h2 className="mb-3 text-base font-medium text-cream-50">通知</h2>
          <p className="mb-3 text-[12px] font-light text-cream-300/60">开启推送通知，关注对象开播或被 ping 时提醒你</p>
          <PushSettings />
        </div>

        {/* 法律链接 */}
        <div className="flex flex-wrap justify-center gap-3 pb-8 text-[11px] font-light text-cream-300/60">
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
