import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '定价 — NEOSOUL',
  description: '免费即可完整社交。Pro 订阅仅买增强。无抽卡、无强制送礼、无 pay-to-DM。',
};

// PRD §6.11 公平商业化——定价页。
export default function PricingPage() {
  return (
    <main className="min-h-[100dvh] bg-ink-950 px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-light text-cream-50">公平定价</h1>
          <p className="mt-2 text-sm font-light text-cream-300">
            免费即可完整社交。付费只买增强与支持创作者。
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* 免费版 */}
          <div className="glass rounded-3xl p-8">
            <h2 className="text-lg font-medium text-cream-50">免费版</h2>
            <p className="mt-1 text-[11px] text-cream-300/60">完整社交体验</p>
            <div className="mt-6">
              <span className="text-4xl font-light text-cream-50">¥0</span>
              <span className="text-sm text-cream-300/60">/永久</span>
            </div>
            <ul className="mt-6 space-y-3 text-[13px] font-light text-cream-200">
              <li>✓ 完整社交：发消息、上麦、被匹配</li>
              <li>✓ 免费 Avatar 捏脸（所有核心部件）</li>
              <li>✓ 创建和加入房间</li>
              <li>✓ 免费表情 Reactions</li>
              <li>✓ 关注 / 发现 / 分享</li>
              <li className="text-cream-300/50">· 房间上限 50 人 / 12 麦</li>
            </ul>
          </div>

          {/* Pro */}
          <div className="glass-strong relative rounded-3xl p-8 ring-1 ring-rose/20">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-rose/20 px-3 py-1 text-[10px] font-medium text-rose-light">
              推荐
            </div>
            <h2 className="text-lg font-medium text-cream-50">NEOSOUL Pro</h2>
            <p className="mt-1 text-[11px] text-cream-300/60">增强体验</p>
            <div className="mt-6">
              <span className="text-4xl font-light text-cream-50">¥28</span>
              <span className="text-sm text-cream-300/60">/月</span>
            </div>
            <ul className="mt-6 space-y-3 text-[13px] font-light text-cream-200">
              <li>✓ 房间上限 200 人 / 30 麦</li>
              <li>✓ 更多回放存储与时长</li>
              <li>✓ 专属装扮与徽章</li>
              <li>✓ 房间数据分析</li>
              <li>✓ 高清 3D 场景</li>
              <li>✓ 可随时取消，无自动续费陷阱</li>
            </ul>
            <Link
              href="/settings"
              className="btn-rose mt-8 block rounded-2xl py-3 text-center text-sm font-medium text-white"
            >
              订阅 Pro
            </Link>
          </div>
        </div>

        {/* 创作者打赏 */}
        <div className="mt-6 glass rounded-3xl p-8">
          <h2 className="text-lg font-medium text-cream-50">创作者打赏</h2>
          <p className="mt-2 text-[13px] font-light leading-relaxed text-cream-200">
            观众可给房主/主播打赏。与 Soul "礼物 100% 归平台、收礼不可提现" 不同，
            NEOSOUL 创作者拿大头，资金进实名 Stripe Connect 账户可合规提现。
            <span className="text-rose-light"> 抽成透明且低（10-20%）。</span>
          </p>
          <p className="mt-3 text-[11px] text-cream-300/50">即将上线</p>
        </div>

        {/* 绝不做 */}
        <div className="mt-8 rounded-3xl border border-rose/10 bg-rose/3 p-6">
          <h3 className="mb-3 text-[11px] font-medium tracking-wider text-rose-light/70">
            ❌ 我们的定价里绝不包含
          </h3>
          <div className="grid grid-cols-2 gap-2 text-[12px] font-light text-cream-300/60 sm:grid-cols-3">
            <span>· 强制送礼才能搭讪</span>
            <span>· 按年龄标价匹配</span>
            <span>· 抽卡/盲盒/赌博</span>
            <span>· 再匹配需付费</span>
            <span>· 礼物不可提现</span>
            <span>· 伪装真人 AI 伴侣</span>
          </div>
        </div>
      </div>
    </main>
  );
}
