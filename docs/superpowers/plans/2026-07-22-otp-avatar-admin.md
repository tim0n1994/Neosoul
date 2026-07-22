# OTP Login + Custom Avatar + Admin Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace password/anonymous login with email OTP, add custom avatar upload alongside DiceBear, and build an admin panel for managing all rooms and users.

**Architecture:** Three independent features implemented sequentially. OTP uses Supabase Auth native OTP with Resend SMTP. Custom avatars add an `avatar_type` column and upload to the existing `avatars` bucket. Admin panel uses service-role client with hardcoded email gate (`tim0n@qq.com`).

**Tech Stack:** Next.js 15 App Router, Supabase (Auth + Postgres + Storage), Resend SMTP, TypeScript strict.

## Global Constraints

- TypeScript strict mode, single file < 300 lines, PascalCase components, camelCase utils
- Service role key (`SUPABASE_SERVICE_ROLE_KEY`) only in `app/api/**` and Server Components — never in client bundle
- All file names sanitized to ASCII before Storage upload
- Design language: existing warm intimate palette (rose-gold `#c47b78`, ink-dark `#08060a`, glass panels)
- Supabase project ref: `mbbkeksbsxtnsdlpmelp`, Management API token available
- Admin email: `tim0n@qq.com` (hardcoded, no DB field)

---

## File Structure

### New files
```
app/admin/layout.tsx              # Admin auth gate + glass layout
app/admin/page.tsx                # Redirect → /admin/rooms
app/admin/rooms/page.tsx          # Room management table (Server Component)
app/admin/users/page.tsx          # User management table (Server Component)
app/api/admin/rooms/route.ts      # POST: end/delete room actions
app/api/admin/users/route.ts      # POST: ban/unban/delete/rename user actions
components/admin/AdminActions.tsx # Client component for table action buttons
```

### Modified files
```
app/login/page.tsx                # OTP flow replaces password/anonymous
app/onboarding/page.tsx           # Pass avatar_type to AvatarPicker/AvatarImage
components/AvatarPicker.tsx        # Add upload tab + avatar_type support
components/AvatarImage.tsx         # Render by avatar_type
components/AvatarOrb.tsx           # Load texture by avatar_type
components/TopBar.tsx              # Show admin link for tim0n@qq.com
app/rooms/page.tsx                # Query includes avatar_type
app/rooms/[id]/page.tsx           # Query includes avatar_type
lib/avatar.ts                     # Add isCustomAvatar helper
supabase/schema.sql               # Add avatar_type column
.env.example                      # Add Resend SMTP note
```

---

## Task 1: Database — Add `avatar_type` column

**Files:**
- Modify: `supabase/schema.sql`

**Interfaces:**
- Produces: `profiles.avatar_type` column (`'dicebear' | 'custom'`, default `'dicebear'`)

- [ ] **Step 1: Apply the migration to live Supabase**

```bash
SUPABASE_TOKEN=<set-outside-repository>
REF="mbbkeksbsxtnsdlpmelp"
curl -s -w "\nHTTP %{http_code}" -X POST \
  "https://api.supabase.com/v1/projects/$REF/database/query" \
  -H "Authorization: Bearer $SUPABASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"alter table public.profiles add column if not exists avatar_type text not null default '\''dicebear'\'' check (avatar_type in ('\''dicebeam'\'','\''custom'\''));"}'
```

Expected: `HTTP 201`

- [ ] **Step 2: Update schema.sql to match**

Add after the `avatar_seed` line in the `profiles` CREATE TABLE:

```sql
  avatar_type   text not null default 'dicebear' check (avatar_type in ('dicebear','custom')),
```

- [ ] **Step 3: Verify the column exists**

```bash
curl -s -X POST "https://api.supabase.com/v1/projects/mbbkeksbsxtnsdlpmelp/database/query" \
  -H "Authorization: Bearer $SUPABASE_TOKEN" -H "Content-Type: application/json" \
  -d '{"query":"SELECT column_name FROM information_schema.columns WHERE table_name='\''profiles'\'' AND column_name='\''avatar_type'\'';"}'
```

Expected: `[{"column_name":"avatar_type"}]`

- [ ] **Step 4: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat: add avatar_type column to profiles"
```

---

## Task 2: Custom Avatar — lib + components

**Files:**
- Modify: `lib/avatar.ts`
- Modify: `components/AvatarImage.tsx`
- Modify: `components/AvatarPicker.tsx`
- Modify: `components/AvatarOrb.tsx`

**Interfaces:**
- Consumes: `profiles.avatar_type` from Task 1
- Produces: `AvatarImage` accepts `avatarType` prop; `AvatarPicker` supports upload + type switching

- [ ] **Step 1: Add `isCustomAvatar` helper to `lib/avatar.ts`**

Add this function at the end of `lib/avatar.ts`:

```ts
// avatar_type === 'custom' 时，avatar_seed 存的是 Storage public URL
export function resolveAvatarSrc(
  avatarType: string | null | undefined,
  style: string,
  seed: string,
): string {
  if (avatarType === 'custom' && seed.startsWith('http')) {
    return seed; // 直接返回 URL
  }
  return avatarDataUri(style, seed);
}
```

- [ ] **Step 2: Update `AvatarImage.tsx` to accept `avatarType`**

Replace the entire file:

```tsx
import { resolveAvatarSrc } from '@/lib/avatar';

interface Props {
  style: string;
  seed: string;
  avatarType?: string;
  size?: number;
  className?: string;
}

export function AvatarImage({ style, seed, avatarType, size = 36, className }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolveAvatarSrc(avatarType, style, seed)}
      width={size}
      height={size}
      alt="头像"
      className={className}
      style={{
        borderRadius: '9999px',
        objectFit: 'cover',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    />
  );
}
```

- [ ] **Step 3: Update `AvatarPicker.tsx` — add upload tab + avatarType**

Replace the entire file. The picker now has a mode toggle between "DiceBear" and "Upload":

```tsx
'use client';

import { useRef, useState } from 'react';
import { AVATAR_STYLES, avatarDataUri, randomSeed } from '@/lib/avatar';
import { createClient } from '@/lib/supabase/client';

interface Props {
  style: string;
  seed: string;
  avatarType: string;
  userId: string;
  onChange: (next: { style: string; seed: string; avatarType: string }) => void;
}

export function AvatarPicker({ style, seed, avatarType, userId, onChange }: Props) {
  const [mode, setMode] = useState<'dicebear' | 'upload'>(avatarType === 'custom' ? 'upload' : 'dicebear');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('仅支持图片');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('图片不能超过 2MB');
      return;
    }
    setError(null);
    setUploading(true);
    const supabase = createClient();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${userId}/${Date.now()}-${safeName}`;
    const { error: upErr } = await supabase.storage
      .from('avatars')
      .upload(path, file, { contentType: file.type });
    setUploading(false);
    if (upErr) {
      setError('上传失败：' + upErr.message);
      return;
    }
    const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
    onChange({ style, seed: pub.publicUrl, avatarType: 'custom' });
  }

  return (
    <div className="space-y-5">
      {/* 模式切换 */}
      <div className="flex justify-center gap-1.5">
        <button
          type="button"
          onClick={() => { setMode('dicebear'); onChange({ style, seed: seed.startsWith('http') ? randomSeed() : seed, avatarType: 'dicebear' }); }}
          className={
            'rounded-full px-3 py-1.5 text-[11px] font-light tracking-wide transition-all ' +
            (mode === 'dicebear' ? 'bg-rose/15 text-rose-light ring-1 ring-rose/20' : 'border border-white/5 text-cream-300')
          }
        >
          DiceBear
        </button>
        <button
          type="button"
          onClick={() => setMode('upload')}
          className={
            'rounded-full px-3 py-1.5 text-[11px] font-light tracking-wide transition-all ' +
            (mode === 'upload' ? 'bg-rose/15 text-rose-light ring-1 ring-rose/20' : 'border border-white/5 text-cream-300')
          }
        >
          上传头像
        </button>
      </div>

      <div className="flex flex-col items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarType === 'custom' && seed.startsWith('http') ? seed : avatarDataUri(style, seed)}
          width={96}
          height={96}
          alt="头像预览"
          className="rounded-2xl border border-white/8 shadow-[0_8px_40px_-8px_rgba(196,123,120,0.2)]"
        />

        {mode === 'dicebear' ? (
          <button
            type="button"
            onClick={() => onChange({ style, seed: randomSeed(), avatarType: 'dicebear' })}
            className="rounded-full border border-white/8 px-4 py-1.5 text-[11px] font-light tracking-wider text-cream-200 transition-colors hover:border-rose/20 hover:text-cream-50"
          >
            🎲 换一个
          </button>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="rounded-full border border-white/8 px-4 py-1.5 text-[11px] font-light tracking-wider text-cream-200 transition-colors hover:border-rose/20 hover:text-cream-50 disabled:opacity-40"
            >
              {uploading ? '上传中…' : '选择图片'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </div>
        )}
      </div>

      {error && <p className="text-center text-xs text-rose/80">{error}</p>}

      {mode === 'dicebear' && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {AVATAR_STYLES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange({ style: s, seed, avatarType: 'dicebear' })}
              className={
                'rounded-full px-3 py-1.5 text-[11px] font-light tracking-wide transition-all ' +
                (style === s
                  ? 'bg-rose/15 text-rose-light ring-1 ring-rose/20'
                  : 'border border-white/5 text-cream-300 hover:border-white/10 hover:text-cream-100')
              }
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Update `AvatarOrb.tsx` — load texture by avatarType**

In `AvatarOrb.tsx`, replace the `dataUri` + `useTexture` lines:

```tsx
// 旧:
const dataUri = useMemo(() => avatarDataUri(style, seed), [style, seed]);
const texture = useTexture(dataUri);

// 新:
const src = useMemo(() => {
  if (style === 'custom' && seed.startsWith('http')) return seed;
  return avatarDataUri(style, seed);
}, [style, seed]);
const texture = useTexture(src);
```

Note: `AvatarOrb` receives `style` and `seed` from `PartyScene` which parses participant metadata. The metadata `style` field will be set to `'custom'` for custom avatars (handled in token route metadata).

- [ ] **Step 5: Update token route metadata to include avatar_type**

In `app/api/livekit/token/route.ts`, update the profile select and metadata:

```ts
// 旧:
.select('display_name, avatar_style, avatar_seed')

// 新:
.select('display_name, avatar_style, avatar_seed, avatar_type')
```

And in the metadata construction:

```ts
// 旧:
style: profile?.avatar_style ?? 'thumbs',

// 新:
style: profile?.avatar_type === 'custom' ? 'custom' : (profile?.avatar_style ?? 'thumbs'),
```

- [ ] **Step 6: Typecheck**

Run: `pnpm typecheck`
Expected: PASS (no errors)

- [ ] **Step 7: Commit**

```bash
git add lib/avatar.ts components/AvatarImage.tsx components/AvatarPicker.tsx components/AvatarOrb.tsx app/api/livekit/token/route.ts
git commit -m "feat: custom avatar upload alongside DiceBear"
```

---

## Task 3: Custom Avatar — wire into onboarding + rooms

**Files:**
- Modify: `app/onboarding/page.tsx`
- Modify: `app/rooms/page.tsx`
- Modify: `app/rooms/[id]/page.tsx`

**Interfaces:**
- Consumes: updated `AvatarPicker` (needs `avatarType` + `userId` props), `AvatarImage` (optional `avatarType` prop)

- [ ] **Step 1: Update onboarding to manage avatarType state and pass userId**

In `app/onboarding/page.tsx`:

1. Add `avatarType` state:
```tsx
const [avatarType, setAvatarType] = useState('dicebear');
```

2. In the profile fetch effect, set it:
```tsx
setAvatarType(profile.avatar_type ?? 'dicebear');
```

3. Update the `AvatarPicker` usage to pass `avatarType` and `userId`:
```tsx
<AvatarPicker
  style={style}
  seed={seed}
  avatarType={avatarType}
  userId={userId!}
  onChange={(next) => {
    setStyle(next.style);
    setSeed(next.seed);
    setAvatarType(next.avatarType);
  }}
/>
```

4. Update `handleSave` to include `avatar_type`:
```tsx
.update({
  display_name: name,
  avatar_style: style,
  avatar_seed: seed,
  avatar_type: avatarType,
})
```

- [ ] **Step 2: Update rooms list to pass avatarType to AvatarImage**

In `app/rooms/page.tsx`, update the host type and query:

```tsx
// Update the Host type:
type Host = {
  display_name: string;
  avatar_style: string;
  avatar_seed: string;
  avatar_type: string;
} | null;

// The select already works — just pass avatarType in AvatarImage:
<AvatarImage
  style={room.host.avatar_style}
  seed={room.host.avatar_seed}
  avatarType={room.host.avatar_type}
  size={18}
/>
```

Also update the profile select for `me`:
```tsx
.select('display_name, avatar_style, avatar_seed, avatar_type')
```
And pass to TopBar via AvatarImage where needed.

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/onboarding/page.tsx app/rooms/page.tsx app/rooms/[id]/page.tsx
git commit -m "feat: wire avatar_type into onboarding and rooms"
```

---

## Task 4: OTP Login — Supabase config + login page rewrite

**Files:**
- Modify: `app/login/page.tsx`
- Modify: `.env.example`

**Interfaces:**
- Consumes: Supabase Auth OTP API (`signInWithOtp`, `verifyOtp`)
- Produces: Login flow that sends + verifies email OTP

- [ ] **Step 1: Configure Supabase Auth for OTP via Management API**

```bash
SUPABASE_TOKEN=<set-outside-repository>
REF="mbbkeksbsxtnsdlpmelp"
# Enable email OTP, disable email confirmation requirement for faster flow
curl -s -w "\nHTTP %{http_code}" -X PATCH \
  "https://api.supabase.com/v1/projects/$REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mailer_otp_length":6,"mailer_otp_exp":3600,"mailer_autoconfirm":false,"external_anonymous_users_enabled":false}'
```

Expected: `HTTP 200`

Note: Resend SMTP must be configured manually in Supabase Dashboard → Auth → Settings → SMTP. Document in `.env.example`.

- [ ] **Step 2: Update `.env.example` with Resend note**

Add at the bottom:

```bash
# Resend (用于 Supabase Auth OTP 邮件)
# 在 Supabase Dashboard → Auth → Settings → SMTP 配置：
# Host: smtp.resend.com
# Port: 465
# Username: resend
# Password: <your Resend API key (re_...)>
# Sender email: noreply@<your-resend-domain>
```

- [ ] **Step 3: Rewrite `app/login/page.tsx` with OTP flow**

Replace the entire file:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setStep('otp');
    setCooldown(60);
    const timer = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  async function verifyOtpCode(e: React.FormEvent) {
    e.preventDefault();
    if (token.trim().length !== 6) return;
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: token.trim(),
      type: 'email',
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace('/');
  }

  async function resend() {
    if (cooldown > 0) return;
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setCooldown(60);
    const timer = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center px-6 py-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/4 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-rose/8 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[300px] rounded-full bg-gold/6 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-[340px] animate-fade-in space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-light tracking-[0.15em] text-cream-50">Neosoul</h1>
          <p className="mt-3 text-xs font-light tracking-wider text-cream-300">
            一场漂浮在暧昧深空里的语音派对
          </p>
        </div>

        <div className="glass rounded-3xl p-7">
          {step === 'email' ? (
            <form onSubmit={sendOtp} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-medium tracking-wider text-cream-300">
                  邮箱
                </label>
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-warm w-full rounded-2xl px-4 py-3 text-sm text-cream-50 outline-none placeholder:text-cream-300/40"
                  placeholder="you@example.com"
                />
              </div>
              {error && <p className="text-xs leading-relaxed text-rose/80">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="btn-rose w-full rounded-2xl py-3 text-sm font-medium tracking-wide text-white"
              >
                {loading ? '发送中…' : '发送验证码'}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyOtpCode} className="space-y-4">
              <div className="text-center">
                <p className="text-xs text-cream-300">
                  验证码已发送至
                </p>
                <p className="text-sm font-medium text-cream-50">{email}</p>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-medium tracking-wider text-cream-300">
                  验证码
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={6}
                  inputMode="numeric"
                  value={token}
                  onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
                  className="input-warm w-full rounded-2xl px-4 py-3 text-center text-lg tracking-[0.5em] text-cream-50 outline-none placeholder:text-cream-300/40"
                  placeholder="000000"
                />
              </div>
              {error && <p className="text-xs leading-relaxed text-rose/80">{error}</p>}
              <button
                type="submit"
                disabled={loading || token.length !== 6}
                className="btn-rose w-full rounded-2xl py-3 text-sm font-medium tracking-wide text-white"
              >
                {loading ? '验证中…' : '登录'}
              </button>
              <div className="flex justify-between pt-1">
                <button
                  type="button"
                  onClick={resend}
                  disabled={cooldown > 0}
                  className="text-[11px] font-light text-cream-300 transition-colors hover:text-cream-100 disabled:opacity-40"
                >
                  {cooldown > 0 ? `${cooldown}s 后可重发` : '重新发送'}
                </button>
                <button
                  type="button"
                  onClick={() => { setStep('email'); setToken(''); setError(null); }}
                  className="text-[11px] font-light text-cream-300 transition-colors hover:text-cream-100"
                >
                  换一个邮箱
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/login/page.tsx .env.example
git commit -m "feat: email OTP login replaces password/anonymous"
```

---

## Task 5: Admin Panel — auth gate + layout

**Files:**
- Create: `app/admin/layout.tsx`
- Create: `app/admin/page.tsx`

**Interfaces:**
- Produces: `/admin` route protected by email check. Non-admins redirect to `/rooms`.

- [ ] **Step 1: Create `app/admin/layout.tsx`**

```tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

const ADMIN_EMAIL = 'tim0n@qq.com';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (user.email !== ADMIN_EMAIL) redirect('/rooms');

  return (
    <div className="min-h-[100dvh]">
      <header className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-6">
          <span className="text-lg font-light tracking-[0.15em] text-cream-50">
            Neosoul <span className="text-[11px] text-rose-light">管理</span>
          </span>
          <nav className="flex gap-4">
            <Link href="/admin/rooms" className="text-xs font-light text-cream-200 hover:text-cream-50">
              房间
            </Link>
            <Link href="/admin/users" className="text-xs font-light text-cream-200 hover:text-cream-50">
              用户
            </Link>
          </nav>
        </div>
        <Link href="/rooms" className="text-[11px] font-light text-cream-300 hover:text-rose-light">
          返回
        </Link>
      </header>
      <main className="px-6 pb-24">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Create `app/admin/page.tsx`**

```tsx
import { redirect } from 'next/navigation';

export default function AdminPage() {
  redirect('/admin/rooms');
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/admin/layout.tsx app/admin/page.tsx
git commit -m "feat: admin panel auth gate and layout"
```

---

## Task 6: Admin Panel — rooms management

**Files:**
- Create: `app/admin/rooms/page.tsx`
- Create: `app/api/admin/rooms/route.ts`
- Create: `components/admin/AdminActions.tsx`

**Interfaces:**
- Consumes: `lib/supabase/admin.ts` (service role client)
- Produces: `/admin/rooms` table + `/api/admin/rooms` POST endpoint

- [ ] **Step 1: Create `app/api/admin/rooms/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdmin } from '@/lib/supabase/admin';

const ADMIN_EMAIL = 'tim0n@qq.com';

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  let body: { action?: 'end' | 'delete'; roomId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid body' }, { status: 400 });
  }
  const { action, roomId } = body;
  if (!action || !roomId) {
    return NextResponse.json({ ok: false, error: 'missing fields' }, { status: 400 });
  }

  const admin = createAdmin();

  if (action === 'end') {
    const { error } = await admin.from('rooms').update({ is_live: false }).eq('id', roomId);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  } else if (action === 'delete') {
    const { error } = await admin.from('rooms').delete().eq('id', roomId);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  } else {
    return NextResponse.json({ ok: false, error: 'invalid action' }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Create `components/admin/AdminActions.tsx`**

```tsx
'use client';

import { useState } from 'react';

interface RoomActionProps {
  roomId: string;
}

export function RoomActions({ roomId }: RoomActionProps) {
  const [busy, setBusy] = useState<string | null>(null);

  async function act(action: 'end' | 'delete') {
    if (!confirm(action === 'delete' ? '确定删除此房间？此操作不可恢复。' : '确定解散此房间？')) return;
    setBusy(action);
    try {
      const res = await fetch('/api/admin/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, roomId }),
      });
      if (res.ok) location.reload();
      else {
        const data = await res.json();
        alert(data.error || '操作失败');
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex gap-1.5">
      <button
        onClick={() => act('end')}
        disabled={busy !== null}
        className="rounded-full bg-white/5 px-3 py-1.5 text-[11px] font-light text-cream-200 hover:bg-white/8 disabled:opacity-40"
      >
        解散
      </button>
      <button
        onClick={() => act('delete')}
        disabled={busy !== null}
        className="rounded-full bg-white/5 px-3 py-1.5 text-[11px] font-light text-rose-light/80 hover:bg-rose/10 disabled:opacity-40"
      >
        删除
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Create `app/admin/rooms/page.tsx`**

```tsx
import { createAdmin } from '@/lib/supabase/admin';
import { AvatarImage } from '@/components/AvatarImage';
import { RoomActions } from '@/components/admin/AdminActions';

type Room = {
  id: string;
  name: string;
  is_live: boolean;
  created_at: string;
  background_url: string | null;
  host: {
    display_name: string;
    avatar_style: string;
    avatar_seed: string;
    avatar_type: string;
  } | null;
};

export default async function AdminRoomsPage() {
  const admin = createAdmin();
  const { data: rooms } = await admin
    .from('rooms')
    .select(
      'id, name, is_live, created_at, background_url, host:profiles!host_id(display_name, avatar_style, avatar_seed, avatar_type)',
    )
    .order('created_at', { ascending: false });

  const list = (rooms ?? []) as unknown as Room[];

  return (
    <div>
      <h1 className="mb-6 text-sm font-light tracking-[0.2em] text-cream-300">房间管理 ({list.length})</h1>
      <div className="glass overflow-hidden rounded-3xl">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/5 text-[11px] font-medium tracking-wider text-cream-300">
              <th className="px-4 py-3">房间</th>
              <th className="px-4 py-3">房主</th>
              <th className="px-4 py-3">状态</th>
              <th className="px-4 py-3">创建时间</th>
              <th className="px-4 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {list.map((room) => (
              <tr key={room.id} className="border-b border-white/3 text-[13px] font-light text-cream-100">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {room.background_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={room.background_url} alt="" className="h-8 w-8 rounded-lg object-cover" />
                    )}
                    <span>{room.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {room.host && (
                    <div className="flex items-center gap-2">
                      <AvatarImage
                        style={room.host.avatar_style}
                        seed={room.host.avatar_seed}
                        avatarType={room.host.avatar_type}
                        size={24}
                      />
                      <span className="text-cream-200">{room.host.display_name}</span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={
                    'rounded-full px-2 py-0.5 text-[10px] ' +
                    (room.is_live ? 'bg-rose/15 text-rose-light' : 'bg-white/5 text-cream-300')
                  }>
                    {room.is_live ? 'LIVE' : '已结束'}
                  </span>
                </td>
                <td className="px-4 py-3 text-cream-300">
                  {new Date(room.created_at).toLocaleDateString('zh-CN')}
                </td>
                <td className="px-4 py-3 text-right">
                  <RoomActions roomId={room.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && (
          <p className="py-12 text-center text-xs font-light text-cream-300/50">暂无房间</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/admin/rooms/page.tsx app/api/admin/rooms/route.ts components/admin/AdminActions.tsx
git commit -m "feat: admin room management panel"
```

---

## Task 7: Admin Panel — users management

**Files:**
- Create: `app/admin/users/page.tsx`
- Create: `app/api/admin/users/route.ts`

**Interfaces:**
- Consumes: `supabase.auth.admin` API (`listUsers`, `updateUserById` with `banned_until`, `deleteUser`)
- Produces: `/admin/users` table + `/api/admin/users` POST endpoint

- [ ] **Step 1: Create `app/api/admin/users/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdmin } from '@/lib/supabase/admin';

const ADMIN_EMAIL = 'tim0n@qq.com';

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  let body: {
    action?: 'ban' | 'unban' | 'delete' | 'rename';
    userId?: string;
    name?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid body' }, { status: 400 });
  }
  const { action, userId, name } = body;
  if (!action || !userId) {
    return NextResponse.json({ ok: false, error: 'missing fields' }, { status: 400 });
  }

  const admin = createAdmin();

  try {
    if (action === 'ban') {
      // 禁用 100 年
      const { error } = await admin.auth.admin.updateUserById(userId, {
        banned_until: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(),
      });
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    } else if (action === 'unban') {
      const { error } = await admin.auth.admin.updateUserById(userId, {
        banned_until: 'none',
      });
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    } else if (action === 'delete') {
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    } else if (action === 'rename') {
      if (!name) return NextResponse.json({ ok: false, error: 'name required' }, { status: 400 });
      const { error } = await admin.from('profiles').update({ display_name: name.slice(0, 40) }).eq('id', userId);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    } else {
      return NextResponse.json({ ok: false, error: 'invalid action' }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Create `app/admin/users/page.tsx`**

```tsx
import { createAdmin } from '@/lib/supabase/admin';
import { AvatarImage } from '@/components/AvatarImage';
import { UserActions } from '@/components/admin/AdminActions';

type Profile = {
  id: string;
  display_name: string;
  avatar_style: string;
  avatar_seed: string;
  avatar_type: string;
  created_at: string;
};

type AuthUser = {
  id: string;
  email: string;
  banned_until: string | null;
};

export default async function AdminUsersPage() {
  const admin = createAdmin();

  // 拿所有 auth users（分页取第一页，Demo 量小）
  const { data: authData } = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
  const authUsers = (authData?.users ?? []) as AuthUser[];
  const bannedMap: Record<string, boolean> = {};
  const emailMap: Record<string, string> = {};
  for (const u of authUsers) {
    bannedMap[u.id] = !!u.banned_until;
    emailMap[u.id] = u.email ?? '';
  }

  // 拿所有 profiles
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, display_name, avatar_style, avatar_seed, avatar_type, created_at')
    .order('created_at', { ascending: false });

  const list = (profiles ?? []) as Profile[];

  return (
    <div>
      <h1 className="mb-6 text-sm font-light tracking-[0.2em] text-cream-300">用户管理 ({list.length})</h1>
      <div className="glass overflow-hidden rounded-3xl">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/5 text-[11px] font-medium tracking-wider text-cream-300">
              <th className="px-4 py-3">用户</th>
              <th className="px-4 py-3">邮箱</th>
              <th className="px-4 py-3">注册时间</th>
              <th className="px-4 py-3">状态</th>
              <th className="px-4 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id} className="border-b border-white/3 text-[13px] font-light text-cream-100">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <AvatarImage
                      style={p.avatar_style}
                      seed={p.avatar_seed}
                      avatarType={p.avatar_type}
                      size={28}
                    />
                    <span>{p.display_name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-cream-300">{emailMap[p.id] || '—'}</td>
                <td className="px-4 py-3 text-cream-300">
                  {new Date(p.created_at).toLocaleDateString('zh-CN')}
                </td>
                <td className="px-4 py-3">
                  <span className={
                    'rounded-full px-2 py-0.5 text-[10px] ' +
                    (bannedMap[p.id] ? 'bg-rose/15 text-rose-light' : 'bg-white/5 text-cream-200')
                  }>
                    {bannedMap[p.id] ? '封禁' : '正常'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <UserActions userId={p.id} displayName={p.display_name} banned={bannedMap[p.id]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && (
          <p className="py-12 text-center text-xs font-light text-cream-300/50">暂无用户</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add `UserActions` to `components/admin/AdminActions.tsx`**

Append to the file (after `RoomActions`):

```tsx
interface UserActionProps {
  userId: string;
  displayName: string;
  banned: boolean;
}

export function UserActions({ userId, displayName, banned }: UserActionProps) {
  const [busy, setBusy] = useState<string | null>(null);

  async function act(action: 'ban' | 'unban' | 'delete' | 'rename') {
    let name: string | undefined;
    if (action === 'rename') {
      name = prompt('输入新昵称：', displayName);
      if (!name) return;
    }
    if (action === 'delete' && !confirm('确定删除此用户？此操作不可恢复。')) return;
    if (action === 'ban' && !confirm('确定封禁此用户？')) return;

    setBusy(action);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, userId, name }),
      });
      if (res.ok) location.reload();
      else {
        const data = await res.json();
        alert(data.error || '操作失败');
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex justify-end gap-1.5">
      <button
        onClick={() => act('rename')}
        disabled={busy !== null}
        className="rounded-full bg-white/5 px-3 py-1.5 text-[11px] font-light text-cream-200 hover:bg-white/8 disabled:opacity-40"
      >
        改名
      </button>
      <button
        onClick={() => act(banned ? 'unban' : 'ban')}
        disabled={busy !== null}
        className="rounded-full bg-white/5 px-3 py-1.5 text-[11px] font-light text-cream-200 hover:bg-white/8 disabled:opacity-40"
      >
        {banned ? '解封' : '封禁'}
      </button>
      <button
        onClick={() => act('delete')}
        disabled={busy !== null}
        className="rounded-full bg-white/5 px-3 py-1.5 text-[11px] font-light text-rose-light/80 hover:bg-rose/10 disabled:opacity-40"
      >
        删除
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/admin/users/page.tsx app/api/admin/users/route.ts components/admin/AdminActions.tsx
git commit -m "feat: admin user management panel"
```

---

## Task 8: TopBar admin link + build + deploy

**Files:**
- Modify: `components/TopBar.tsx`

- [ ] **Step 1: Add admin link to TopBar for admin email**

Update `TopBar.tsx` to accept an optional `email` prop and show admin link:

```tsx
interface Props {
  name: string;
  style: string;
  seed: string;
  avatarType?: string;
  email?: string;
  right?: React.ReactNode;
}

export function TopBar({ name, style, seed, avatarType, email, right }: Props) {
  return (
    <header className="flex items-center justify-between px-6 py-5">
      <span className="text-lg font-light tracking-[0.2em] text-cream-50">Neosoul</span>
      <div className="flex items-center gap-3">
        {right}
        {email === 'tim0n@qq.com' && (
          <a
            href="/admin"
            className="rounded-full border border-white/8 px-3 py-1 text-[11px] font-light text-cream-200 transition-colors hover:border-rose/20 hover:text-cream-50"
          >
            管理
          </a>
        )}
        <div className="flex items-center gap-2">
          <AvatarImage style={style} seed={seed} avatarType={avatarType} size={28} />
          <span className="hidden text-xs font-light text-cream-200 sm:inline">{name}</span>
        </div>
        <LogoutButton />
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Update rooms list page to pass email + avatarType to TopBar**

In `app/rooms/page.tsx`, update the profile select to include email and avatar_type, and pass them:

```tsx
// profile select:
.select('display_name, avatar_style, avatar_seed, avatar_type')
// Note: email comes from auth.users, not profiles. Need to get it from user object.
// Actually user.email is available from getUser() — pass that directly.

// TopBar usage:
<TopBar
  name={me.display_name}
  style={me.avatar_style}
  seed={me.avatar_seed}
  avatarType={me.avatar_type}
  email={user.email}
  right={<CreateRoomButton />}
/>
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 4: Build**

Run: `pnpm build`
Expected: PASS (all routes compile)

- [ ] **Step 5: Deploy**

```bash
vercel deploy --prod --yes
```
Expected: `✓ Ready`

- [ ] **Step 6: Verify**

```bash
URL="https://neosoul.vercel.app"
curl -s -o /dev/null -w "HTTP %{http_code}" "${URL}/login"
# Expected: 200
curl -s -o /dev/null -w "HTTP %{http_code}" "${URL}/admin"
# Expected: 307 (redirect to /login since no auth)
```

- [ ] **Step 7: Commit + push**

```bash
git add components/TopBar.tsx app/rooms/page.tsx
git commit -m "feat: admin link in TopBar + build + deploy"
git push origin main
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ OTP login (spec §2) → Task 4
- ✅ Remove password/anonymous → Task 4 (complete rewrite)
- ✅ Custom avatar upload (spec §3) → Tasks 1, 2, 3
- ✅ avatar_type column (spec §3.2) → Task 1
- ✅ AvatarPicker upload tab (spec §3.5) → Task 2
- ✅ Admin panel (spec §4) → Tasks 5, 6, 7
- ✅ Admin email gate tim0n@qq.com (spec §4.1) → Task 5
- ✅ Room management end/delete (spec §4.4) → Task 6
- ✅ User management ban/unban/delete/rename (spec §4.4) → Task 7
- ✅ TopBar admin link (spec §4.5) → Task 8

**Placeholder scan:** No TBDs, all code complete.

**Type consistency:** `AvatarImage` uses `avatarType` prop (camelCase) throughout. `AvatarPicker` uses `avatarType` consistently. Admin API uses `userId`, `roomId`, `action` consistently.

**Gaps found and fixed:**
- Room list TopBar needs `email` prop — added in Task 8.
- Token route needs `avatar_type` in metadata — added in Task 2 Step 5.
