# Neosoul

极简语音派对 —— 一个 Web 端 3D 语音派对 Demo。注册/匿名登录 → 选头像 → 建房/进房 → 在 3D 空间里上麦聊天 → 房主管麦 → 公屏发图文。

技术栈：Next.js 15（App Router）+ React 19 + Supabase + LiveKit + react-three-fiber。

## 一、开通外部服务（人工，一次性）

### 1. Supabase

1. 创建项目，记下：
   - `Project URL`（形如 `https://xxxx.supabase.co`）
   - `anon key`
   - `service_role key`（Settings → API）
2. **Auth → Providers**：启用 **Email**，并启用 **Anonymous sign-ins**。
3. **Storage**：新建两个 **public** bucket：
   - `avatars`
   - `chat-images`
4. **SQL Editor**：粘贴并运行 [`supabase/schema.sql`](./supabase/schema.sql)。
   - 它会建 `profiles` / `rooms` / `messages` 三张表、RLS 策略、自动建 profile 的触发器，并把 `messages` 加入 realtime publication。

> 建议在 Auth 设置里关闭「Confirm email」，Demo 可直接登录。

### 2. LiveKit Cloud

1. 创建项目，记下：
   - `wss://xxxx.livekit.cloud`（Server URL）
   - `API Key`
   - `API Secret`

## 二、本地开发

```bash
pnpm install
cp .env.example .env.local   # 填入上面拿到的凭证
pnpm dev                     # http://localhost:3000
```

类型检查：

```bash
pnpm typecheck
```

## 三、环境变量（`.env.local`）

| 变量 | 说明 | 端 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL | 客户端+服务端 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | 客户端+服务端 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role（绕过 RLS，仅房主校验用） | 仅服务端 |
| `NEXT_PUBLIC_LIVEKIT_URL` | LiveKit `wss://` URL | 客户端+服务端 |
| `LIVEKIT_API_KEY` | LiveKit API Key | 仅服务端 |
| `LIVEKIT_API_SECRET` | LiveKit API Secret | 仅服务端 |

> 密钥安全：`SUPABASE_SERVICE_ROLE_KEY` 与 `LIVEKIT_API_SECRET` 只在 `app/api/**` 服务端代码引用，绝不进客户端 bundle。

## 四、部署到 Vercel

1. 推送仓库到 GitHub。
2. 在 Vercel 导入项目，Framework Preset 选 **Next.js**。
3. 在 Vercel 项目设置 → Environment Variables 填入上面 6 个变量。
4. Deploy。`pnpm build` 已通过验证。

## 五、功能与里程碑

- ✅ M1 账号：邮箱注册/登录 + 匿名登录，Supabase session。
- ✅ M2 头像与房间：DiceBear 头像选择、房间列表、建房、进房。
- ✅ M3 语音：LiveKit 连接，房主自动上麦，听众收听，移动端手势进入。
- ✅ M4 举手与管麦：听众举手 → 房主批准上麦 → 房主可静音/请下麦。
- ⏳ M5 3D 派对场景：说话者球体实时发光放大（待 M3 语音验收后实现）。
- ✅ M6 公屏：文字 + 图片实时同步，移动端聊天抽屉。

## 六、架构要点

- **零自建后端**：所有后端能力来自 Supabase + LiveKit，只写 Next.js Route Handler 做 token 签发与房主鉴权。
- **麦位权限不落库**：听众进房 `canPublish=false`，房主批准时服务端调 LiveKit `updateParticipant` 改权限，目标端监听权限变更自动开麦。
- **两个服务端校验点**：`/api/livekit/token` 的 `canPublish` 只由服务端按 `host_id` 判定；`/api/livekit/moderate` 每次复核调用者是房主。
