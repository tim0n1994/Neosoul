import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { RoomView } from '@/components/RoomView';
import Link from 'next/link';

export default async function RoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: room } = await supabase
    .from('rooms')
    .select('id, name, livekit_room, host_id, is_live')
    .eq('id', id)
    .maybeSingle();

  // 房间不存在 / 已解散（PRD §16）
  if (!room || !room.is_live) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-white/70">房间不存在或已结束</p>
        <Link
          href="/rooms"
          className="rounded-xl border border-white/10 px-4 py-2 text-sm"
        >
          返回列表
        </Link>
      </main>
    );
  }

  const isHost = room.host_id === user.id;

  return (
    <main className="min-h-dvh">
      <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between p-4">
        <span className="rounded-full bg-black/40 px-3 py-1 text-sm">
          {room.name}
          {isHost && <span className="ml-2 text-xs text-brand-to">房主</span>}
        </span>
        <Link
          href="/rooms"
          className="rounded-full bg-black/40 px-3 py-1 text-sm text-white/70"
        >
          离开房间
        </Link>
      </div>
      <RoomView roomId={room.id} isHost={isHost} />
    </main>
  );
}
