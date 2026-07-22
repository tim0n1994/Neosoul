import { NextResponse } from 'next/server';
import { WebhookReceiver } from 'livekit-server-sdk';
import { createAdmin } from '@/lib/supabase/admin';

// PRD §6.2 房间生命周期 [红线：清理]：
// room_finished/participant_left → 维护 participant_count、空房置 is_live=false
// egress_ended → 写 recordings
// 必须校验 LiveKit 签名

const receiver = new WebhookReceiver(
  process.env.LIVEKIT_API_KEY!,
  process.env.LIVEKIT_API_SECRET!,
);

export async function POST(req: Request) {
  // LiveKit 签名校验：从 header 取 body + auth
  const rawBody = await req.text();
  const authHeader = req.headers.get('authorization') ?? '';

  let event;
  try {
    event = await receiver.receive(rawBody, authHeader);
  } catch {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  const admin = createAdmin();
  const eventType = event.event;

  // 从 LiveKit room name 找到数据库 room（livekit_room 列）
  async function findRoomByLivekitName(lkName: string) {
    const { data } = await admin
      .from('rooms')
      .select('id, host_id, is_live, participant_count')
      .eq('livekit_room', lkName)
      .maybeSingle();
    return data;
  }

  switch (eventType) {
    case 'room_started': {
      // 房间已在建房时标记 is_live=true，无需额外操作
      break;
    }

    case 'participant_joined': {
      const room = await findRoomByLivekitName(event.room?.name ?? '');
      if (room) {
        const newCount = (room.participant_count ?? 0) + 1;
        await admin
          .from('rooms')
          .update({ participant_count: newCount })
          .eq('id', room.id);
      }
      break;
    }

    case 'participant_left': {
      const room = await findRoomByLivekitName(event.room?.name ?? '');
      if (room) {
        const newCount = Math.max(0, (room.participant_count ?? 1) - 1);
        // PRD §6.2：空房自动下播
        if (newCount === 0) {
          await admin
            .from('rooms')
            .update({ participant_count: 0, is_live: false })
            .eq('id', room.id);
        } else {
          await admin
            .from('rooms')
            .update({ participant_count: newCount })
            .eq('id', room.id);
        }
      }
      break;
    }

    case 'room_finished': {
      const room = await findRoomByLivekitName(event.room?.name ?? '');
      if (room) {
        await admin
          .from('rooms')
          .update({ participant_count: 0, is_live: false })
          .eq('id', room.id);
      }
      break;
    }

    case 'egress_started': {
      // 录制开始——可在 rooms.recording_enabled 已标记时确认
      break;
    }

    case 'egress_ended': {
      // PRD §6.7：录制完成 → 写 recordings
      // event 是 union type，egress 事件结构未在 WebhookEvent 联合类型中完整导出
      const e = event as unknown as {
        room?: { name?: string };
        egress?: {
          file?: { location?: string; s3?: { url?: string; key?: string } };
          endedAt?: string;
          startedAt?: string;
        };
      };
      const lkName = e.room?.name ?? '';
      const room = await findRoomByLivekitName(lkName);
      const url =
        e.egress?.file?.location ??
        e.egress?.file?.s3?.url ??
        e.egress?.file?.s3?.key ??
        null;
      const duration = e.egress?.endedAt
        ? Math.round(
            (Number(e.egress.endedAt) - Number(e.egress.startedAt)) / 1_000_000_000,
          )
        : null;
      if (room && url) {
        await admin.from('recordings').insert({
          room_id: room.id,
          url,
          duration,
        });
      }
      break;
    }

    default:
      // 忽略未处理的事件类型
      break;
  }

  return NextResponse.json({ ok: true });
}
