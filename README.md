# NEOSOUL — 轻量、开放、健康的兴趣语音社交平台

> **有 Soul 的灵魂，没有 Soul 的套路。**

面向兴趣而不是付费门槛的语音社区：让完整社交能力保持可用，让创作者获得回报，让安全规则可以被看见。

面向全球 Z 世代的 Web+PWA 兴趣语音社交平台。在 Soul 和 Clubhouse 的经验教训之上，用四大基因超越：**轻（Web+PWA）、可扩展（插件 SDK）、公平（免费完整社交 + 创作者可提现）、安全（强审核 + 透明 AI）**。

技术栈：Next.js 15（App Router）+ React 19 + Supabase + LiveKit + Stripe + react-three-fiber。

---

## 快速开始

```bash
pnpm install
cp .env.example .env.local   # 填入凭证
pnpm dev                     # http://localhost:3000
```

验证：`pnpm typecheck && pnpm build`

---

## 外部服务开通

### 1. Supabase
1. 创建项目，记下 `Project URL`、`anon key`、`service_role key`。
2. **Auth → Providers**：启用 Email（OTP）+ 可选 OAuth（Google/Apple/Discord）。
3. **Storage**：新建 public bucket：`avatars`、`chat-images`。
4. **SQL Editor**：先运行 `supabase/schema.sql`（v1 基础），再运行 `supabase/schema_v2.sql`（v2 增量）。

### 2. LiveKit Cloud
1. 创建项目，记下 `wss://` URL、API Key、API Secret。
2. **Webhooks**：配置回调到 `https://<domain>/api/livekit/webhook`。
3. **Egress**（录制）：配置输出到 Supabase Storage 或 S3 兼容存储。

### 3. Stripe
1. 创建账户，记下 Secret Key、Publishable Key、Webhook Secret。
2. 创建 Pro 月订阅 Price，记下 Price ID。
3. **Webhooks**：配置回调到 `https://<domain>/api/stripe/webhook`。

### 4. AI Provider（可选）
- 设置 `OPENAI_API_KEY` 用于文本审核和 AI 辅助。未配置时审核降级为敏感词表。

---

## 环境变量

| 变量 | 说明 | 端 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL | 客户端+服务端 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | 客户端+服务端 |
| `SUPABASE_SERVICE_ROLE_KEY` | 绕过 RLS，仅服务端 | 仅服务端 |
| `NEXT_PUBLIC_LIVEKIT_URL` | LiveKit wss URL | 客户端+服务端 |
| `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` | LiveKit 凭证 | 仅服务端 |
| `AI_PROVIDER` / `AI_MODEL` / `OPENAI_API_KEY` | AI Provider | 仅服务端 |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Stripe | 仅服务端 |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe 公钥 | 客户端 |
| `STRIPE_PRICE_PRO_MONTHLY` | Pro 月订阅 Price ID | 仅服务端 |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Web Push | 混合 |

> **密钥安全**：所有 Secret 只在 `app/api/**` 和 `lib/` 服务端引用，绝不带 `NEXT_PUBLIC_` 前缀。

---

## 架构

```
Client (Next.js + R3F 3D/2D Lite + PWA/SW)
  ↕ Auth/DB/Realtime/Storage      ↕ WebRTC
Supabase                          LiveKit Cloud + Egress
  ↕ service role                   ↕ RoomService/Egress
Next.js Route Handlers / Edge Functions
  → Moderation Provider → AI Provider → Stripe → Push
```

### 核心子系统

| 子系统 | 文件 | 说明 |
|---|---|---|
| **舞台权限** | `lib/room-roles.ts` | Host > Cohost > Speaker > Audience 四角色服务端强校验 |
| **房间生命周期** | `app/api/livekit/webhook/` | 签名校验、participant_count 维护、空房自动下播、Egress→recordings |
| **内容审核** | `lib/moderation.ts` + `app/api/moderate/` | 敏感词表 + AI 分层审核，入库前拦截 |
| **反诈** | `lib/moderation.ts:detectFraud` | 转账/投资/外链检测 + 横幅提示 |
| **安全工具** | `components/safety/` | 举报/拉黑/同意门/未成年门 |
| **发现排序** | `lib/ranking.ts` | 启发式（关注+兴趣+人数+新鲜度），可替换 |
| **活动插件** | `lib/activities/` | RoomActivity 接口 + registry + listen-together |
| **商业化** | `lib/stripe.ts` + `app/api/stripe/` | Pro 订阅 + entitlements + Connect 预留 |
| **限流** | `lib/ratelimit.ts` | 内存 token-bucket，可替换 Upstash |

### 路由保护

中间件保护 `/rooms`、`/discover`、`/onboarding`、`/settings`。同意门（ToS + 出生年份 + 未成年分层）在 `/rooms`、`/discover`、`/settings` 渲染。

---

## 部署（Vercel）

1. 推送到 GitHub。
2. Vercel 导入项目，Framework: Next.js。
3. 填入所有环境变量。
4. 配置 LiveKit Webhook → `/api/livekit/webhook`。
5. 配置 Stripe Webhook → `/api/stripe/webhook`。
6. Deploy。

---

## Runbook

### 健康检查
`GET /api/health` — 探 Supabase/LiveKit/Stripe 可达性。

### 安全事件响应
- **违规内容**：用户举报 → `/admin` 队列（P1 完善自动化）
- **诈骗**：反诈横幅自动触发；用户可举报
- **封禁**：房主/admin 可封禁进房；全局封号走 admin
- **未成年**：注册时 age gate；< 13 拒绝，< 18 保护模式（不可付费/不可陌生人匹配）

### §16 反面清单（绝不做）
这是产品 DNA，任何人提议都应被否决：
1. ❌ 强制送礼才能发起对话
2. ❌ 按年龄/性别明码标价匹配
3. ❌ 对高人气用户自动抬高门槛
4. ❌ 礼物不可提现且 100% 归平台
5. ❌ 抽卡/盲盒/赌博式付费
6. ❌ "再匹配需付费"诱导话术
7. ❌ 伪装真人的暧昧 AI 伴侣
8. ❌ 把社交基本权利放进付费墙
9. ❌ 无审核放任有毒内容
10. ❌ 无内容沉淀的纯 FOMO 增长

---

## 版本历史

- **v2.0** (M0–M6)：上线版——四角色舞台、审核管线、公平商业化、活动插件 SDK、PWA、回放、法律合规
- **v1.0**：Demo 地基——邮箱 OTP、DiceBear 头像、房间+公屏、3D 场景、admin

## Preview status

**v0.1.0-preview.1** is a source preview of the Next.js/PWA voice-social prototype. The repository currently carries the product surface, safety rules, Supabase/LiveKit/Stripe boundaries, and a green typecheck/build gate.

Verified in CI:

- `pnpm install --frozen-lockfile`
- `pnpm typecheck`
- `pnpm build` with CI-only placeholder Supabase configuration

The preview does not claim live Supabase, LiveKit, Stripe, moderation, creator payouts, or production operations. Those integrations require configured services and independent end-to-end acceptance.

[Preview release](https://github.com/tim0n1994/Neosoul/releases/tag/v0.1.0-preview.1) · [CI](https://github.com/tim0n1994/Neosoul/actions/runs/40154387784) · [Release gate](https://github.com/tim0n1994/Neosoul/actions/runs/40119998846)

Security and acceptance gates now include:

- pnpm security:check plus gitleaks on every CI run.
- GET /api/health?deep=1 for read-only Supabase, LiveKit, and Stripe probes.
- Manual [provider smoke workflow](https://github.com/tim0n1994/Neosoul/actions/workflows/provider-smoke.yml) requiring real GitHub secrets.
- Manual [browser E2E workflow](https://github.com/tim0n1994/Neosoul/actions/workflows/e2e-smoke.yml) requiring a deployed base URL.

The current tree no longer contains the previously tracked Supabase token assignment. The historical value still requires external rotation and history cleanup before a formal release. The current preview remains a demo artifact until the provider smoke and browser E2E gates produce real evidence.
