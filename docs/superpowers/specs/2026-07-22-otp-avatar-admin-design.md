# Design Spec: 邮箱验证码登录 + 自定义头像 + 超管面板

> 日期：2026-07-22
> 状态：Approved（用户逐段确认）
> 基线：Neosoul 已上线运行（commit 33d9c69）

---

## 1. 背景

Neosoul 当前使用匿名登录 + 密码注册。本次新增三个独立功能模块：
1. 邮箱验证码（OTP）登录替换密码和匿名
2. 自定义头像上传，与 DiceBear 并存可切换
3. 超级管理员管理面板

---

## 2. 邮箱验证码登录（OTP）

### 2.1 用户流程

```
输入邮箱 → 点"发送验证码" → Resend SMTP 发 6 位验证码邮件
→ 用户输入验证码 → Supabase signInWithOtp 验证
→ 成功：新用户跳 /onboarding，老用户跳 /rooms
→ 失败：显示"验证码错误或已过期"，可重发（60s 冷却）
```

### 2.2 技术方案

- **Supabase Auth 原生 OTP**：`supabase.auth.signInWithOtp({ email, shouldCreateUser: true })` 发送验证码；用户输入后 `supabase.auth.verifyOtp({ email, token, type: 'email' })` 验证。
- **Resend 作为 SMTP**：在 Supabase Dashboard → Auth → Settings → SMTP 填入 Resend 的 SMTP 配置（`smtp.resend.com`，端口 465，用户 `resend`，密码为 Resend API key）。这样验证码邮件由 Resend 发送，不受 Supabase 免费版每小时 3 封限制。
- **环境变量**：新增 `RESEND_API_KEY`（仅用于 Supabase SMTP 配置，不进代码）。`.env.example` 需说明在 Supabase 填 SMTP。
- **完全移除**：密码注册（`signUp`）、密码登录（`signInWithPassword`）、匿名登录（`signInAnonymously`）。

### 2.3 登录页 UI（`app/login/page.tsx`）

两步式表单（单页面状态切换，不分页）：

**Step 1 — 输入邮箱**：
- 邮箱输入框
- "发送验证码"按钮（btn-rose）
- 点击后：按钮变为"已发送（60s）"倒计时，切换到 Step 2

**Step 2 — 输入验证码**：
- 显示"验证码已发送至 xxx@xxx.com"
- 6 位数字输入框
- "登录"按钮
- "重新发送"链接（60s 冷却）
- "换一个邮箱"链接（回到 Step 1）

### 2.4 数据模型变更

- Supabase Auth 配置：启用 Email OTP，关闭密码登录。
- **不需要改 profiles 表**——trigger 仍自动建 profile（OTP 新用户也会触发 `on_auth_user_created`）。
- landing page 的 onboarding 判断不变：`display_name === 'Guest'` 或空视为未完成。

### 2.5 错误处理

| 场景 | 处理 |
|---|---|
| 验证码错误 | 提示"验证码错误"，不清空输入，可重新输入 |
| 验证码过期（默认 1 小时） | 提示"验证码已过期，请重新发送" |
| 频繁请求发送 | 前端 60s 冷却 + Supabase 后端 rate limit |
| 网络错误 | Toast 提示 + 重试 |

### 2.6 迁移注意

- 现有匿名/密码用户不受影响——他们仍能用旧 session。但新登录只能走 OTP。
- middleware 保护逻辑不变。
- `.env.example` 新增 Resend 说明。

---

## 3. 自定义头像上传

### 3.1 用户流程

Onboarding 和 profile 编辑时，用户可：
- 选 DiceBear 头像（现有功能）
- 或上传自定义图片
- 两者可随时切换

### 3.2 数据模型变更

`profiles` 表新增字段：

```sql
alter table public.profiles
  add column if not exists avatar_type text not null default 'dicebear'
  check (avatar_type in ('dicebear', 'custom'));
```

- `avatar_type = 'dicebear'`（默认）：`avatar_style` + `avatar_seed` 生成 DiceBear 头像（现有逻辑）
- `avatar_type = 'custom'`：`avatar_seed` 存储 Storage public URL（复用字段，避免新增列）

### 3.3 RLS 策略

- 现有 `profiles_update` 策略（`auth.uid() = id`）已覆盖 `avatar_type` 字段，无需新增。
- Storage `avatars` bucket 的写入策略已在上一轮修复（`storage_auth_write`），已覆盖。

### 3.4 上传流程

1. 用户在 AvatarPicker 点"上传头像"
2. 选图（`<input type="file" accept="image/*">`）
3. 前端校验：仅 `image/*`，≤ 2MB
4. 上传到 `avatars` bucket：路径 `avatars/{uid}/{timestamp}.png`，文件名 sanitize 为 ASCII
5. 拿到 public URL
6. 保存到 profiles：`avatar_type = 'custom'`, `avatar_seed = publicUrl`

### 3.5 组件变更

**`AvatarPicker.tsx`**：新增一个 tab/切换：
- "DiceBear" tab：现有的风格选择 + 随机（不变）
- "上传" tab：上传按钮 + 预览
- 切换 tab 时更新 `avatar_type`

**`AvatarImage.tsx`**：根据 `avatar_type` 渲染：
- `custom` → `<img src={avatar_seed}>`（avatar_seed 此时是 URL）
- `dicebear` → `avatarDataUri(style, seed)`（现有逻辑）
- 需要传入 `avatar_type` prop

**`AvatarOrb.tsx`**（3D）：同理，custom 时用 `useTexture(url)` 加载 URL 而非 dataUri。

### 3.6 兼容性

- 现有用户的 `avatar_type` 默认为 `'dicebear'`，行为不变。
- 新字段有默认值 + check 约束，向后兼容。

---

## 4. 超级管理员面板

### 4.1 超管识别

- 硬编码：`user.email === 'tim0n@qq.com'` 即为超级管理员。
- 不在数据库存 `is_admin` 字段（YAGNI——只有一个超管）。
- 判断在服务端做（API + Server Component），不信任前端。

### 4.2 路由

```
/admin          → 重定向到 /admin/rooms
/admin/rooms    → 房间管理表格
/admin/users    → 用户管理表格
```

- 访问 `/admin/*` 时，Server Component 检查 `user.email === 'tim0n@qq.com'`，否则重定向 `/rooms`。
- middleware 不拦截 `/admin`（让 Server Component 自己处理鉴权，因为需要查 email）。

### 4.3 API 设计

所有 admin API 用 `lib/supabase/server.ts` 获取当前用户 email 校验后，用 `lib/supabase/admin.ts`（service role）执行操作。

**`/api/admin/rooms`**（`POST`）：
```jsonc
// 请求
{ "action": "end" | "delete", "roomId": "uuid" }
// end: set is_live = false
// delete: delete room row
// 响应
{ "ok": true } | { "ok": false, "error": "..." }
```

**`/api/admin/users`**（`POST`）：
```jsonc
// 请求
{ "action": "ban" | "unban" | "delete" | "rename", "userId": "uuid", "name"?: "string" }
// ban: set banned_until = now() + 100 years（通过 auth.admin API）
// unban: set banned_until = null
// delete: auth.admin.deleteUser(userId) + cascade
// rename: update profiles.display_name
// 响应
{ "ok": true } | { "ok": false, "error": "..." }
```

### 4.4 页面 UI

**`/admin/rooms`**：
- 表格：房名、房主（头像+昵称）、背景图缩略、状态 badge（live/end）、创建时间
- 操作列：解散（end）、删除（delete）
- 操作有二次确认（简单 confirm）

**`/admin/users`**：
- 表格：头像、昵称、邮箱、注册时间、状态（正常/封禁）
- 操作列：改名、封禁/解封、删除
- 改名：弹层输入新昵称

**设计语言**：延续现有暧昧·高级感（glass 面板 + rose 色调），表格用 glass 卡片包裹。

### 4.5 顶栏入口

- 在 TopBar 中，如果当前用户 email 是 `tim0n@qq.com`，显示一个"管理"链接指向 `/admin`。
- 普通 TopBar（房间列表页）检测，不在房间内页显示。

### 4.6 安全

- 每次 admin API 调用：`getUser()` → `user.email === 'tim0n@qq.com'`？→ 否则 403。
- 页面级：Server Component 同样校验，非超管重定向。
- service role key 只在 admin API + Server Component 中使用，不进客户端 bundle。

---

## 5. 实现顺序（里程碑）

1. **F1 — OTP 登录**：改 Supabase Auth 配置 → 重写 login 页 → 配 Resend SMTP → 验证码发送+验证跑通
2. **F2 — 自定义头像**：加 `avatar_type` 列 → 改 AvatarPicker/AvatarImage/AvatarOrb → 上传跑通
3. **F3 — 超管面板**：建 `/admin` 路由 + API → 房间/用户表格 → 操作跑通

每个里程碑结束后 typecheck + build + deploy + 验证。

---

## 6. 文件变更清单

### 新增
```
app/admin/layout.tsx          # 超管布局 + 鉴权
app/admin/page.tsx            # 重定向到 /admin/rooms
app/admin/rooms/page.tsx      # 房间管理
app/admin/users/page.tsx      # 用户管理
app/api/admin/rooms/route.ts  # 房间操作 API
app/api/admin/users/route.ts  # 用户操作 API
```

### 修改
```
app/login/page.tsx            # OTP 替换密码
app/onboarding/page.tsx       # 传 avatar_type
components/AvatarPicker.tsx    # 新增上传 tab + avatar_type
components/AvatarImage.tsx     # 根据 avatar_type 渲染
components/AvatarOrb.tsx       # 根据 avatar_type 加载纹理
components/TopBar.tsx          # 超管入口
app/rooms/page.tsx            # 查询含 avatar_type
app/rooms/[id]/page.tsx       # 查询含 avatar_type
lib/avatar.ts                 # 头像 URL 解析工具
supabase/schema.sql           # 加 avatar_type 列
.env.example                  # 加 Resend 说明
```

---

## 7. 环境变量变更

无新增代码环境变量。Resend API key 配置在 Supabase Dashboard（Auth → SMTP），不进 `.env`。

---

## 8. 不做（YAGNI）

- 多超管 / 角色权限系统
- 超管操作审计日志
- 头像裁剪/编辑器
- OTP 验证码的防爆破限制（Supabase 内置 rate limit 足够）
- 房间/用户搜索过滤（用户量小）
- 管理面板的数据分页（用户量小，一次加载全部）
