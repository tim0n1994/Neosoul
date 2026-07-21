import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { RoomView } from '@/components/RoomView';
import { ErrorBoundary } from '@/components/ErrorBoundary';
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
    .select('id, name, livekit_room, host_id, is_live, background_url')
    .eq('id', id)
    .maybeSingle();

  if (!room || !room.is_live) {
    return (
      <main className="relative flex min-h-[100dvh] flex-col items-center justify-center gap-6 p-6 text-center">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-1/3 left-1/2 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-rose/6 blur-[120px]" />
        </div>
        <div className="relative z-10 space-y-4">
          <p className="text-sm font-light text-cream-200">房间不存在或已结束</p>
          <Link
            href="/rooms"
            className="inline-block rounded-full border border-white/8 px-5 py-2 text-xs font-light tracking-wide text-cream-100 transition-colors hover:border-rose/20"
          >
            返回列表
          </Link>
        </div>
      </main>
    );
  }

  const isHost = room.host_id === user.id;

  return (
    <ErrorBoundary>
      <RoomView
        roomId={room.id}
        isHost={isHost}
        roomName={room.name}
        backgroundUrl={room.background_url}
      />
    </ErrorBoundary>
  );
}
