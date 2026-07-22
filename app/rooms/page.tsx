import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TopBar } from '@/components/TopBar';
import { AvatarImage } from '@/components/AvatarImage';
import { CreateRoomButton } from '@/components/CreateRoomButton';
import { ConsentGate } from '@/components/safety/ConsentGate';
import Link from 'next/link';

type Host = {
  display_name: string;
  avatar_style: string;
  avatar_seed: string;
  avatar_type: string;
} | null;

type Room = {
  id: string;
  name: string;
  background_url: string | null;
  created_at: string;
  host: Host;
};

export default async function RoomsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: me } = await supabase
    .from('profiles')
    .select('display_name, avatar_style, avatar_seed, avatar_type, tos_accepted_at, is_minor')
    .eq('id', user.id)
    .maybeSingle();
  if (!me || me.display_name === 'Guest') redirect('/onboarding');

  const { data: rooms } = await supabase
    .from('rooms')
    .select(
      'id, name, background_url, created_at, host:profiles!host_id(display_name, avatar_style, avatar_seed, avatar_type)',
    )
    .eq('is_live', true)
    .order('created_at', { ascending: false });

  const list = (rooms ?? []) as unknown as Room[];

  return (
    <div className="min-h-[100dvh]">
      {/* PRD §6.1 [红线] 同意门——未同意条款则拦截 */}
      {!me.tos_accepted_at && <ConsentGate userId={user.id} />}
      <TopBar
        name={me.display_name}
        style={me.avatar_style}
        seed={me.avatar_seed}
        avatarType={me.avatar_type}
        email={user.email}
        right={<CreateRoomButton />}
      />

      <main className="px-6 pb-24">
        <div className="mb-6">
          <h2 className="text-xs font-light tracking-[0.25em] text-cream-300">活跃房间</h2>
        </div>

        {list.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-24 text-center">
            <div className="h-16 w-16 rounded-full bg-rose/8 blur-[2px]" />
            <p className="text-sm font-light text-cream-300">
              还没有房间
            </p>
            <p className="text-xs text-cream-300/50">
              创建第一个，邀请谁来聊聊
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {list.map((room) => (
              <Link
                key={room.id}
                href={`/rooms/${room.id}`}
                className="card-warm group relative aspect-[4/5] overflow-hidden rounded-3xl"
              >
                {/* 房间背景图（朦胧调暗）*/}
                {room.background_url ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={room.background_url}
                      alt=""
                      className="absolute inset-0 h-full w-full scale-105 object-cover blur-sm transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/50 to-ink-950/30" />
                  </>
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-ink-800 to-ink-900" />
                )}

                {/* 内容 */}
                <div className="relative flex h-full flex-col justify-between p-4">
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-1.5 w-1.5 items-center justify-center">
                      <span className="absolute h-1.5 w-1.5 animate-glow-pulse rounded-full bg-rose" />
                    </span>
                    <span className="text-[10px] font-light tracking-wider text-rose-light/70">LIVE</span>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-medium leading-snug text-cream-50 line-clamp-2">
                      {room.name}
                    </h3>
                    {room.host && (
                      <div className="flex items-center gap-1.5">
                        <AvatarImage
                          style={room.host.avatar_style}
                          seed={room.host.avatar_seed}
                          avatarType={room.host.avatar_type}
                          size={18}
                        />
                        <span className="truncate text-[11px] font-light text-cream-200/70">
                          {room.host.display_name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
