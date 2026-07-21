-- ========== profiles：用户资料（1:1 于 auth.users）==========
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null default 'Guest',
  avatar_style  text not null default 'thumbs',   -- DiceBear 风格名
  avatar_seed   text not null default 'neo',       -- DiceBear 种子
  created_at    timestamptz not null default now()
);

-- 新用户注册时自动建 profile（含匿名用户）
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', 'Guest'))
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ========== rooms：房间 ==========
create table if not exists public.rooms (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  host_id       uuid not null references public.profiles(id) on delete cascade,
  livekit_room  text not null unique,     -- 例：'room_<id>'
  is_live       boolean not null default true,
  created_at    timestamptz not null default now()
);
create index if not exists rooms_is_live_idx on public.rooms(is_live, created_at desc);

-- ========== messages：公屏消息 ==========
create table if not exists public.messages (
  id         bigint generated always as identity primary key,
  room_id    uuid not null references public.rooms(id) on delete cascade,
  sender_id  uuid not null references public.profiles(id) on delete cascade,
  kind       text not null check (kind in ('text','image')),
  body       text not null,              -- text 内容 或 image 的 public URL
  created_at timestamptz not null default now()
);
create index if not exists messages_room_idx on public.messages(room_id, created_at);

-- ========== RLS ==========
alter table public.profiles enable row level security;
alter table public.rooms    enable row level security;
alter table public.messages enable row level security;

-- profiles：所有登录用户可读；只能改自己的
create policy "profiles_read"   on public.profiles for select to authenticated using (true);
create policy "profiles_update" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- rooms：所有登录用户可读；只能以自己为 host 建房；只能改/删自己建的房
create policy "rooms_read"   on public.rooms for select to authenticated using (true);
create policy "rooms_insert" on public.rooms for insert to authenticated with check (auth.uid() = host_id);
create policy "rooms_update" on public.rooms for update to authenticated using (auth.uid() = host_id);
create policy "rooms_delete" on public.rooms for delete to authenticated using (auth.uid() = host_id);

-- messages：所有登录用户可读；只能以自己为 sender 发消息
create policy "messages_read"   on public.messages for select to authenticated using (true);
create policy "messages_insert" on public.messages for insert to authenticated with check (auth.uid() = sender_id);

-- ========== Realtime：把 messages 加入 realtime publication ==========
alter publication supabase_realtime add table public.messages;
