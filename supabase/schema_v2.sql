-- ========== schema_v2.sql — incremental on top of schema.sql (PRD-v2 §7) ==========
-- 在 v1 schema.sql 基础上新增/修改。GLM 存为 supabase/schema_v2.sql，含必要的 RLS。

-- ========== profiles 增列 ==========
alter table public.profiles
  add column if not exists avatar_config jsonb,          -- 分层捏脸参数
  add column if not exists avatar_glb_url text,           -- [P1] 3D
  add column if not exists interests text[] default '{}',
  add column if not exists personality text,              -- [P1] MBTI 等
  add column if not exists birth_year int,                -- 未成年门
  add column if not exists is_minor boolean default false,
  add column if not exists role text default 'user' check (role in ('user','admin')),
  add column if not exists tos_accepted_at timestamptz;

-- ========== rooms 增列 ==========
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

-- ========== messages 增列（软删 §6.3）==========
alter table public.messages
  add column if not exists deleted_at timestamptz;

-- ========== 新表 ==========
create table if not exists public.follows (
  follower_id uuid references public.profiles(id) on delete cascade,
  followee_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, followee_id)
);

create table if not exists public.room_roles (        -- 持久化 cohost 任命（token 之外的兜底）
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

create table if not exists public.match_queue (       -- [P1]
  user_id uuid primary key references public.profiles(id) on delete cascade,
  prefs jsonb, enqueued_at timestamptz default now()
);

-- ========== 商业化 ==========
create table if not exists public.entitlements (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  is_pro boolean default false, pro_until timestamptz,
  cosmetics text[] default '{}'
);
create table if not exists public.subscriptions (
  id text primary key,                                  -- stripe subscription id
  user_id uuid references public.profiles(id) on delete cascade,
  status text, current_period_end timestamptz, created_at timestamptz default now()
);
create table if not exists public.purchases (
  id text primary key,                                  -- stripe payment intent id
  user_id uuid references public.profiles(id) on delete cascade,
  sku text, amount int, currency text, created_at timestamptz default now()
);
create table if not exists public.creator_payouts (    -- Stripe Connect
  id bigint generated always as identity primary key,
  creator_id uuid references public.profiles(id) on delete cascade,
  from_user_id uuid, amount int, currency text, kind text, created_at timestamptz default now()
);

-- ========== RLS：所有新表启用 RLS ==========
alter table public.follows          enable row level security;
alter table public.room_roles       enable row level security;
alter table public.room_bans        enable row level security;
alter table public.recordings       enable row level security;
alter table public.activity_sessions enable row level security;
alter table public.blocks           enable row level security;
alter table public.reports          enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.match_queue      enable row level security;
alter table public.entitlements     enable row level security;
alter table public.subscriptions    enable row level security;
alter table public.purchases        enable row level security;
alter table public.creator_payouts  enable row level security;

-- follows：本人可增删自己的行；可读与自己相关的
create policy "follows_read"   on public.follows for select to authenticated
  using (auth.uid() = follower_id or auth.uid() = followee_id);
create policy "follows_insert" on public.follows for insert to authenticated
  with check (auth.uid() = follower_id);
create policy "follows_delete" on public.follows for delete to authenticated
  using (auth.uid() = follower_id);

-- blocks：本人可增删自己的行；可读与自己相关的
create policy "blocks_read"   on public.blocks for select to authenticated
  using (auth.uid() = blocker_id or auth.uid() = blocked_id);
create policy "blocks_insert" on public.blocks for insert to authenticated
  with check (auth.uid() = blocker_id);
create policy "blocks_delete" on public.blocks for delete to authenticated
  using (auth.uid() = blocker_id);

-- room_roles：房内可读；写入仅服务端（service role 绕过 RLS）
create policy "room_roles_read" on public.room_roles for select to authenticated using (true);

-- room_bans：房内可读（用于准入判断）；写入仅服务端
create policy "room_bans_read" on public.room_bans for select to authenticated using (true);

-- recordings：公开房回放可读（M4 细化私密房权限）
create policy "recordings_read" on public.recordings for select to authenticated using (true);

-- activity_sessions：房内可读；写入仅服务端
create policy "activity_sessions_read" on public.activity_sessions for select to authenticated using (true);

-- reports：任何登录用户可 insert（举报）；仅 admin 可 select/update
create policy "reports_insert" on public.reports for insert to authenticated with check (true);
create policy "reports_admin_read" on public.reports for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "reports_admin_update" on public.reports for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- moderation_actions：仅 admin
create policy "mod_actions_admin_read" on public.moderation_actions for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "mod_actions_admin_write" on public.moderation_actions for insert to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- match_queue：仅本人可读写
create policy "match_queue_owner" on public.match_queue for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- entitlements：仅本人可读；写入仅服务端（Stripe webhook）
create policy "entitlements_read" on public.entitlements for select to authenticated
  using (auth.uid() = user_id);

-- subscriptions：仅本人可读；写入仅服务端
create policy "subscriptions_read" on public.subscriptions for select to authenticated
  using (auth.uid() = user_id);

-- purchases：仅本人可读；写入仅服务端
create policy "purchases_read" on public.purchases for select to authenticated
  using (auth.uid() = user_id);

-- creator_payouts：创作者可读自己的；写入仅服务端
create policy "creator_payouts_read" on public.creator_payouts for select to authenticated
  using (auth.uid() = creator_id);

-- ========== Realtime ==========
alter publication supabase_realtime add table public.activity_sessions;

-- ========== 索引（发现/排序用）==========
create index if not exists follows_followee_idx on public.follows(followee_id);
create index if not exists rooms_live_topic_idx on public.rooms(is_live, topic, created_at desc);
create index if not exists room_bans_lookup_idx on public.room_bans(room_id, user_id);

-- Stripe webhook event claims: service-role only, one event id can be processed once.
create table if not exists public.stripe_webhook_events (
  id text primary key,
  event_type text not null,
  claimed_at timestamptz not null default now()
);

alter table public.stripe_webhook_events enable row level security;

