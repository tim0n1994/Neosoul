import { NextResponse } from 'next/server';
import { TrackSource } from 'livekit-server-sdk';
import { createClient } from '@/lib/supabase/server';
import { roomService } from '@/lib/livekit-server';

type Action = 'grant' | 'mute' | 'remove';

// 房主管麦：每次都用 service role / host_id 复核调用者确为房主（PRD §9.2、§17）
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let body: { roomId?: string; action?: Action; targetIdentity?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid body' }, { status: 400 });
  }
  const { roomId, action, targetIdentity } = body;
  if (!roomId || !action || !targetIdentity) {
    return NextResponse.json({ ok: false, error: 'missing fields' }, { status: 400 });
  }

  const { data: room } = await supabase
    .from('rooms')
    .select('livekit_room, host_id, is_live')
    .eq('id', roomId)
    .maybeSingle();
  if (!room) {
    return NextResponse.json({ ok: false, error: 'room not found' }, { status: 404 });
  }
  if (room.host_id !== user.id) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  const lkRoom = room.livekit_room;

  async function micSidOf(identity: string): Promise<string | null> {
    const participants = await roomService.listParticipants(lkRoom);
    const target = participants.find((p) => p.identity === identity);
    const mic = target?.tracks.find((t) => t.source === TrackSource.MICROPHONE);
    return mic?.sid ?? null;
  }

  try {
    if (action === 'grant') {
      await roomService.updateParticipant(lkRoom, targetIdentity, undefined, {
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      });
    } else if (action === 'remove') {
      await roomService.updateParticipant(lkRoom, targetIdentity, undefined, {
        canPublish: false,
        canSubscribe: true,
        canPublishData: true,
      });
      const sid = await micSidOf(targetIdentity);
      if (sid) await roomService.mutePublishedTrack(lkRoom, targetIdentity, sid, true);
    } else if (action === 'mute') {
      const sid = await micSidOf(targetIdentity);
      if (!sid) {
        return NextResponse.json(
          { ok: false, error: 'no microphone track' },
          { status: 400 },
        );
      }
      await roomService.mutePublishedTrack(lkRoom, targetIdentity, sid, true);
    } else {
      return NextResponse.json({ ok: false, error: 'invalid action' }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'moderation failed' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
