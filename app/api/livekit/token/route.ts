import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createToken } from '@/lib/livekit-server';

// 签发 LiveKit token，canPublish 只由服务端按 host_id 判定（PRD §9.1、§17）
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let roomId: string | undefined;
  try {
    const body = await req.json();
    roomId = body?.roomId;
  } catch {
    // empty / invalid body
  }
  if (!roomId) {
    return NextResponse.json({ error: 'roomId required' }, { status: 400 });
  }

  const { data: room } = await supabase
    .from('rooms')
    .select('id, livekit_room, host_id, is_live')
    .eq('id', roomId)
    .maybeSingle();
  if (!room || !room.is_live) {
    return NextResponse.json({ error: 'room not found' }, { status: 404 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_style, avatar_seed')
    .eq('id', user.id)
    .maybeSingle();

  const isHost = room.host_id === user.id;
  const metadata = JSON.stringify({
    style: profile?.avatar_style ?? 'thumbs',
    seed: profile?.avatar_seed ?? 'neo',
    isHost,
    raised: false,
  });

  const token = await createToken({
    identity: user.id,
    name: profile?.display_name ?? 'Guest',
    room: room.livekit_room,
    canPublish: isHost,
    metadata,
  });

  return NextResponse.json({ token, url: process.env.NEXT_PUBLIC_LIVEKIT_URL });
}
