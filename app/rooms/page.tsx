import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TopBar } from '@/components/TopBar';
import { AvatarImage } from '@/components/AvatarImage';
import { CreateRoomButton } from '@/components/CreateRoomButton';
import Link from 'next/link';

type Host = {
  display_name: string;
  avatar_style: string;
  avatar_seed: string;
} | null;

type Room = {
  id: string;
  name: string;
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
    .select('display_name, avatar_style, avatar_seed')
    .eq('id', user.id)
    .maybeSingle();
  if (!me || me.display_name === 'Guest') redirect('/onboarding');

  const { data: rooms } = await supabase
    .from('rooms')
    .select(
      'id, name, created_at, host:profiles!host_id(display_name, avatar_style, avatar_seed)',
    )
    .eq('is_live', true)
    .order('created_at', { ascending: false });

  const list = (rooms ?? []) as unknown as Room[];

  return (
    <div className="min-h-dvh">
      <TopBar
        name={me.display_name}
        style={me.avatar_style}
        seed={me.avatar_seed}
        right={<CreateRoomButton />}
      />

      <main className="px-6 pb-16">
        {list.length === 0 ? (
          <div className="mt-20 text-center text-sm text-white/40">
            还没有房间，创建第一个吧。
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {list.map((room) => (
              <Link
                key={room.id}
                href={`/rooms/${room.id}`}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-brand-to/60 hover:bg-white/10"
              >
                <div className="mb-3 truncate font-semibold">{room.name}</div>
                {room.host && (
                  <div className="flex items-center gap-2">
                    <AvatarImage
                      style={room.host.avatar_style}
                      seed={room.host.avatar_seed}
                      size={24}
                    />
                    <span className="truncate text-xs text-white/50">
                      {room.host.display_name}
                    </span>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
