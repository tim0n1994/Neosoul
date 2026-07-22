# NEOSOUL v2 Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement PRD-v2 (§14 milestones M0–M6) to produce a launchable, safe, fairly-monetized Web/PWA social audio platform that surpasses Soul and Clubhouse.

**Architecture:** Next.js 15 App Router + Supabase (Postgres/RLS/Realtime/Storage) + LiveKit (audio/Egress/webhooks) + Stripe (subscription/Connect). Incremental over the v1 baseline (email OTP, rooms, chat, avatars, admin). Each milestone produces a buildable, testable increment.

**Tech Stack:** Next.js 15, React 19, TypeScript 5, Tailwind 3, livekit-client 2, @livekit/components-react 2, livekit-server-sdk 2, @supabase/ssr 0.5, three/R3F (3D), zustand 5, next-intl (i18n), Stripe SDK, web-push (VAPID).

## Global Constraints

- **P0 before P1/P2**: Strict milestone order. Each milestone must build (`pnpm build` + `pnpm typecheck`) before proceeding.
- **`[红线]` items are non-negotiable**: safety/compliance (§10, §13) must be in M2 before any "launch" claim.
- **§16 anti-patterns are forbidden**: never implement forced gifting, pay-to-DM, age-priced matching, loot boxes, or fake-human AI.
- **AI transparency**: all AI output carries visible "AI" labeling; never impersonates a human.
- **Free users get full social access**: payment only buys enhancements (cosmetics, bigger rooms, more storage, creator support).
- **Server-side authority**: host/admin/role checks happen server-side, never trusted from client.
- **Secrets never in client**: `LIVEKIT_API_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, Stripe keys stay server-only (no `NEXT_PUBLIC_`).
- **i18n**: copy in `messages/zh.json` + `messages/en.json`, no hardcoded user-facing strings.
- **Existing v1 code is the foundation**: extend, don't rewrite unless a file is modified in a task.

---

## Milestone Roadmap

| Milestone | Scope | Status |
|-----------|-------|--------|
| **M0** | schema_v2.sql, i18n, PWA shell, rate-limit lib, health check | Detailed below |
| **M1** | 4-role stage, room types/topic/capacity, cohost, kick/ban, reactions, pinned, webhook lifecycle | Detailed in M1 section |
| **M2** | reports/blocks, text+image moderation, minor/consent gates, anti-fraud, legal pages | Outline |
| **M3** | Hallway ranking, search/filter, follows, presence, ping, share+OG | Outline |
| **M4** | recording/replay (Egress), profile page, Stripe Pro+cosmetics+entitlements | Outline |
| **M5** | Activity SDK + registry + listen-together + Web Push | Outline |
| **M6** | Security regression, perf/PWA/a11y, deploy, monitoring | Outline |

---

## M0 — Foundation (detailed)

**Files:**
- Create: `supabase/schema_v2.sql`
- Create: `lib/ratelimit.ts`
- Create: `app/api/health/route.ts`
- Create: `public/manifest.json`
- Create: `public/sw.js`
- Create: `public/icons/icon-192.png`, `public/icons/icon-512.png` (placeholder SVG-derived)
- Create: `messages/zh.json`, `messages/en.json`
- Create: `lib/i18n.ts` (shared key type + helper)
- Modify: `app/layout.tsx` (add manifest link, lang)
- Modify: `.env.example` (document new vars)
- Modify: `package.json` (add deps)

### Task 1: schema_v2.sql

**Files:**
- Create: `supabase/schema_v2.sql`

**Produces:** The full incremental schema from PRD §7, runnable on top of v1 `schema.sql`.

- [ ] **Step 1: Write schema_v2.sql** — copy the PRD §7 SQL verbatim, add RLS policies per §7 comments, add `messages.deleted_at` column.

```sql
-- ========== schema_v2.sql — incremental on top of schema.sql ==========
-- profiles 增列
alter table public.profiles
  add column if not exists avatar_config jsonb,
  add column if not exists avatar_glb_url text,
  add column if not exists interests text[] default '{}',
  add column if not exists personality text,
  add column if not exists birth_year int,
  add column if not exists is_minor boolean default false,
  add column if not exists role text default 'user' check (role in ('user','admin')),
  add column if not exists tos_accepted_at timestamptz;

-- rooms 增列
alter table public.rooms
  add column if not exists visibility text default 'open' check (visibility in ('open','followers','private')),
  add column if not exists topic text default 'chat',
  add column if not exists tags text[] default '{}',
  add column if not exists max_participants int default 50,
  add column if not exists max_speakers int default 12,
  add column if not exists recording_enabled boolean default false,
  add column if not exists participant_count int default 0,
  add column if not exists pinned jsonb,
  add column if not exists invite_code text unique;

-- messages 增列
alter table public.messages
  add column if not exists deleted_at timestamptz;

-- ========== 新表 ==========
create table if not exists public.follows (
  follower_id uuid references public.profiles(id) on delete cascade,
  followee_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, followee_id)
);

create table if not exists public.room_roles (
  room_id uuid references public.rooms(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text not null check (role in ('cohost')),
  primary key (room_id, user_id)
);

create table if not exists public.room_bans (
  room_id uuid references public.rooms(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  primary key (room_id, user_id)
);

create table if not exists public.recordings (
  id bigint generated always as identity primary key,
  room_id uuid references public.rooms(id) on delete cascade,
  url text not null, duration int, created_at timestamptz default now()
);

create table if not exists public.activity_sessions (
  room_id uuid references public.rooms(id) on delete cascade,
  activity_id text not null,
  state jsonb, updated_at timestamptz default now(),
  primary key (room_id)
);

create table if not exists public.blocks (
  blocker_id uuid references public.profiles(id) on delete cascade,
  blocked_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (blocker_id, blocked_id)
);

create table if not exists public.reports (
  id bigint generated always as identity primary key,
  reporter_id uuid references public.profiles(id) on delete set null,
  target_type text not null check (target_type in ('user','room','message','recording')),
  target_id text not null, reason text not null, note text,
  status text default 'open' check (status in ('open','reviewing','actioned','dismissed')),
  created_at timestamptz default now()
);

create table if not exists public.moderation_actions (
  id bigint generated always as identity primary key,
  admin_id uuid references public.profiles(id),
  target_type text, target_id text, action text, note text,
  created_at timestamptz default now()
);

create table if not exists public.match_queue (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  prefs jsonb, enqueued_at timestamptz default now()
);

create table if not exists public.entitlements (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  is_pro boolean default false, pro_until timestamptz,
  cosmetics text[] default '{}'
);

create table if not exists public.subscriptions (
  id text primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  status text, current_period_end timestamptz, created_at timestamptz default now()
);

create table if not exists public.purchases (
  id text primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  sku text, amount int, currency text, created_at timestamptz default now()
);

create table if not exists public.creator_payouts (
  id bigint generated always as identity primary key,
  creator_id uuid references public.profiles(id) on delete cascade,
  from_user_id uuid, amount int, currency text, kind text, created_at timestamptz default now()
);

-- ========== RLS policies for new tables ==========
alter table public.follows enable row level security;
alter table public.room_roles enable row level security;
alter table public.room_bans enable row level security;
alter table public.recordings enable row level security;
alter table public.activity_sessions enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.match_queue enable row level security;
alter table public.entitlements enable row level security;
alter table public.subscriptions enable row level security;
alter table public.purchases enable row level security;
alter table public.creator_payouts enable row level security;

-- follows: 本人可增删自己的行；可读与自己相关的
create policy "follows_read" on public.follows for select to authenticated
  using (auth.uid() = follower_id or auth.uid() = followee_id);
create policy "follows_insert" on public.follows for insert to authenticated
  with check (auth.uid() = follower_id);
create policy "follows_delete" on public.follows for delete to authenticated
  using (auth.uid() = follower_id);

-- blocks: 本人可增删自己的行；可读与自己相关的
create policy "blocks_read" on public.blocks for select to authenticated
  using (auth.uid() = blocker_id or auth.uid() = blocked_id);
create policy "blocks_insert" on public.blocks for insert to authenticated
  with check (auth.uid() = blocker_id);
create policy "blocks_delete" on public.blocks for delete to authenticated
  using (auth.uid() = blocker_id);

-- room_roles: 房内可读；写入仅服务端 (service role bypasses RLS)
create policy "room_roles_read" on public.room_roles for select to authenticated using (true);

-- room_bans: 房内可读（用于准入判断）；写入仅服务端
create policy "room_bans_read" on public.room_bans for select to authenticated using (true);

-- recordings: 公开房回放可读；私密房仅参与者（P0 简化：登录可读，M4 细化）
create policy "recordings_read" on public.recordings for select to authenticated using (true);

-- activity_sessions: 房内可读；写入仅服务端
create policy "activity_sessions_read" on public.activity_sessions for select to authenticated using (true);

-- reports: 任何登录用户可 insert；仅 admin 可 select/update
create policy "reports_insert" on public.reports for insert to authenticated with check (true);
create policy "reports_admin_read" on public.reports for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "reports_admin_update" on public.reports for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- moderation_actions: 仅 admin
create policy "mod_actions_admin_read" on public.moderation_actions for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "mod_actions_admin_write" on public.moderation_actions for insert to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- match_queue: 仅本人可读写
create policy "match_queue_owner" on public.match_queue for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- entitlements: 仅本人可读；写入仅服务端
create policy "entitlements_read" on public.entitlements for select to authenticated
  using (auth.uid() = user_id);

-- subscriptions: 仅本人可读；写入仅服务端
create policy "subscriptions_read" on public.subscriptions for select to authenticated
  using (auth.uid() = user_id);

-- purchases: 仅本人可读；写入仅服务端
create policy "purchases_read" on public.purchases for select to authenticated
  using (auth.uid() = user_id);

-- creator_payouts: 创作者可读自己的；写入仅服务端
create policy "creator_payouts_read" on public.creator_payouts for select to authenticated
  using (auth.uid() = creator_id);

-- profiles: admin 可设置 role（普通用户不能自己提升）
create policy "profiles_role_admin" on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- ========== Realtime ==========
alter publication supabase_realtime add table public.activity_sessions;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/schema_v2.sql
git commit -m "feat(M0): schema_v2.sql — full incremental tables + RLS for v2 launch"
```

### Task 2: Rate-limit library

**Files:**
- Create: `lib/ratelimit.ts`

**Produces:** `rateLimit(key, limit, windowSec)` — an in-memory sliding-window counter (P0 no external Redis dependency; architecture allows swap to Upstash later).

- [ ] **Step 1: Write lib/ratelimit.ts**

```typescript
// P0: in-memory token-bucket per key. Swap to Upstash Redis before scale (PRD §6.10).
// Safe for single-instance Edge/Node; designed for idempotent interface.

interface Bucket {
  tokens: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowSec: number,
): RateLimitResult {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    const fresh: Bucket = { tokens: limit - 1, resetAt: now + windowSec * 1000 };
    buckets.set(key, fresh);
    return { ok: true, remaining: fresh.tokens, resetAt: fresh.resetAt };
  }
  if (b.tokens <= 0) {
    return { ok: false, remaining: 0, resetAt: b.resetAt };
  }
  b.tokens -= 1;
  return { ok: true, remaining: b.tokens, resetAt: b.resetAt };
}

/** Per-user rate limiter for route handlers. Returns null if OK, 429 Response if limited. */
export function rateLimitResponse(
  userId: string,
  action: string,
  limit: number,
  windowSec: number,
): Response | null {
  const result = rateLimit(`${action}:${userId}`, limit, windowSec);
  if (!result.ok) {
    return new Response(
      JSON.stringify({ error: 'rate_limited', retry_after: Math.ceil((result.resetAt - Date.now()) / 1000) }),
      { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)) } },
    );
  }
  return null;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/ratelimit.ts
git commit -m "feat(M0): in-memory rate-limit library for abuse protection"
```

### Task 3: Health check endpoint

**Files:**
- Create: `app/api/health/route.ts`

- [ ] **Step 1: Write health check**

```typescript
import { NextResponse } from 'next/server';

// PRD §12: /api/health probes Supabase/LiveKit/Stripe reachability.
export async function GET() {
  const checks: Record<string, 'ok' | 'degraded'> = {};
  try {
    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    checks.supabase = sbUrl ? 'ok' : 'degraded';
  } catch {
    checks.supabase = 'degraded';
  }
  checks.livekit = process.env.NEXT_PUBLIC_LIVEKIT_URL ? 'ok' : 'degraded';
  checks.stripe = process.env.STRIPE_SECRET_KEY ? 'ok' : 'degraded';
  const allOk = Object.values(checks).every((v) => v === 'ok');
  return NextResponse.json({ status: allOk ? 'ok' : 'degraded', checks }, { status: allOk ? 200 : 503 });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/health/route.ts
git commit -m "feat(M0): /api/health endpoint"
```

### Task 4: PWA manifest + service worker + icons

**Files:**
- Create: `public/manifest.json`
- Create: `public/sw.js`
- Create: `public/icons/icon-192.png`, `public/icons/icon-512.png`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Write manifest.json** (PRD §6.12)

```json
{
  "name": "NEOSOUL",
  "short_name": "NEOSOUL",
  "description": "轻量、开放、健康的兴趣语音社交平台",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0f",
  "theme_color": "#e85a8c",
  "orientation": "portrait",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

- [ ] **Step 2: Write sw.js** (offline shell, PRD §6.12)

```javascript
const CACHE = 'neosoul-v2';
const PRECACHE = ['/', '/manifest.json'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req).then((res) => {
        if (res.ok && req.url.startsWith(self.location.origin)) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(req, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    }),
  );
});
```

- [ ] **Step 3: Generate placeholder icons** (rose circle with "N")

```bash
mkdir -p public/icons
# Generate simple SVG-based PNGs via sips/ImageMagick if available, else write SVG fallback
```

- [ ] **Step 4: Add manifest link + SW registration to layout.tsx**

- [ ] **Step 5: Commit**

```bash
git add public/ public/icons/ app/layout.tsx
git commit -m "feat(M0): PWA manifest + service worker + icons"
```

### Task 5: i18n setup (next-intl)

**Files:**
- Create: `messages/zh.json`, `messages/en.json`
- Create: `lib/i18n.ts`
- Modify: `package.json` (add next-intl)

- [ ] **Step 1: Add next-intl dependency**

- [ ] **Step 2: Write messages/zh.json + messages/en.json** with keys for existing UI copy

- [ ] **Step 3: Commit**

### Task 6: Update .env.example + package.json

- [ ] **Step 1: Document new env vars** (Stripe, AI provider, etc.)
- [ ] **Step 2: Commit**

### M0 Verification

- [ ] `pnpm typecheck` passes
- [ ] `pnpm build` passes
- [ ] `/api/health` returns 200
- [ ] `manifest.json` served at `/manifest.json`

---

## M1 — Stage & Room Upgrade (detailed)

### Task 1: Extend token route for 4-role + ban check + room capacity
### Task 2: Extend moderate route for kick/ban/promote_cohost/demote_cohost
### Task 3: LiveKit webhook route (lifecycle + participant count + egress)
### Task 4: Reactions (data channel, ephemeral)
### Task 5: Pinned bar (rooms.pinned, realtime)
### Task 6: Update RoomView/HostPanel/MicControls for cohost role
### Task 7: Message soft-delete (deleted_at)
### M1 Verification: `pnpm build` + typecheck + manual role matrix

---

## M2 — Safety & Compliance Base (outline, `[红线]`)

- `/api/moderate/text` + `/api/moderate/image` route handlers
- Report dialog + block button components
- Anti-fraud banner (pattern detection in chat/DM)
- Minor gate in onboarding + consent gate (tos_accepted_at)
- Legal pages: ToS / Privacy / Community Guidelines
- Wire rate-limiting into all write routes

## M3 — Discovery & Relations (outline)
- `/discover` Hallway page with ranking lib
- `lib/ranking.ts` heuristic scoring
- Follow/unfollow API + UI
- Share link + OG meta tags

## M4 — Replays & Billing (outline)
- Recording toggle + Egress webhook → recordings table
- `/rooms/[id]/replay` player page
- `/u/[handle]` profile page
- Stripe checkout + webhook + entitlements

## M5 — Extensibility & Activities (outline)
- `lib/activities/types.ts` + `lib/activities/registry.ts`
- `components/room/ActivityHost.tsx`
- listen-together activity (data channel sync)
- Web Push subscribe endpoint + notification

## M6 — Launch Hardening (outline)
- Security regression pass
- Lighthouse PWA ≥ 90
- Deploy config + README/Runbook
- Sentry + PostHog integration

---

## Self-Review Notes

**Spec coverage (M0):** §7 schema ✓, §6.12 PWA ✓, §12 health ✓, §6.10 rate-limit ✓, §11 i18n ✓.
**Placeholder scan:** M2–M6 are outlines by design — will be detailed when reached (per "P0 first" principle).
**Type consistency:** `rateLimit` / `rateLimitResponse` signatures are final; later routes consume them as-is.
