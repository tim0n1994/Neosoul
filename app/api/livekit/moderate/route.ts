import { NextResponse } from 'next/server';
import { TrackSource } from 'livekit-server-sdk';
import { createClient } from '@/lib/supabase/server';
import { createAdmin } from '@/lib/supabase/admin';
import { roomService } from '@/lib/livekit-server';
import { rateLimitResponse } from '@/lib/ratelimit';
import { LIMITS } from '@/lib/ratelimit';
import {
  canPerform,
  canTarget,
  type ModerateAction,
  type StageRole,
} from '@/lib/room-roles';

// 房主/共主持管麦：服务端强校验调用者角色（PRD §6.2、§10）
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let body: { roomId?: string; action?: ModerateAction; targetIdentity?: string; messageId?: number; pinData?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid body' }, { status: 400 });
  }
  const { roomId, action, targetIdentity, messageId, pinData } = body;
  if (!roomId || !action) {
    return NextResponse.json({ ok: false, error: 'missing fields' }, { status: 400 });
  }

  // PRD §6.10 限流
  const limited = rateLimitResponse(user.id, 'moderate', LIMITS.moderate.limit, LIMITS.moderate.windowSec);
  if (limited) return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });

  const admin = createAdmin();

  // 查房间信息
  const { data: room } = await admin
    .from('rooms')
    .select('id, livekit_room, host_id, is_live')
    .eq('id', roomId)
    .maybeSingle();
  if (!room) {
    return NextResponse.json({ ok: false, error: 'room not found' }, { status: 404 });
  }

  // 查调用者角色
  const { data: cohostRows } = await admin
    .from('room_roles')
    .select('user_id')
    .eq('room_id', roomId)
    .eq('role', 'cohost');
  const cohostIds = (cohostRows ?? []).map((r) => r.user_id as string);

  let callerRole: StageRole;
  if (user.id === room.host_id) callerRole = 'host';
  else if (cohostIds.includes(user.id)) callerRole = 'cohost';
  else callerRole = 'audience';

  // PRD §6.2：校验调用者是否有权执行此操作
  if (!canPerform(callerRole, action)) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  // ---- 消息软删（不需要 targetIdentity）----
  if (action === 'delete_message') {
    if (!messageId) {
      return NextResponse.json({ ok: false, error: 'messageId required' }, { status: 400 });
    }
    // host/cohost 可删任意；普通用户只能删自己的（额外校验）
    const { data: msg } = await admin
      .from('messages')
      .select('sender_id')
      .eq('id', messageId)
      .maybeSingle();
    if (!msg) {
      return NextResponse.json({ ok: false, error: 'message not found' }, { status: 404 });
    }
    if (callerRole === 'audience' && msg.sender_id !== user.id) {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
    }
    const { error } = await admin
      .from('messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', messageId);
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  // ---- 置顶/取消置顶（不需要 targetIdentity）----
  if (action === 'pin') {
    const { error } = await admin
      .from('rooms')
      .update({ pinned: pinData ?? null })
      .eq('id', roomId);
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }
  if (action === 'unpin') {
    const { error } = await admin
      .from('rooms')
      .update({ pinned: null })
      .eq('id', roomId);
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  // ---- 以下操作都需要 targetIdentity ----
  if (!targetIdentity) {
    return NextResponse.json({ ok: false, error: 'targetIdentity required' }, { status: 400 });
  }

  // cohost 不能操作 host
  const targetIsHost = targetIdentity === room.host_id;
  const targetIsCohost = cohostIds.includes(targetIdentity);
  let targetRole: StageRole;
  if (targetIsHost) targetRole = 'host';
  else if (targetIsCohost) targetRole = 'cohost';
  else targetRole = 'audience'; // 简化：LiveKit 在线状态不一定知道

  if (!canTarget(callerRole, targetRole)) {
    return NextResponse.json({ ok: false, error: 'cannot target this role' }, { status: 403 });
  }

  const lkRoom = room.livekit_room;

  async function micSidOf(identity: string): Promise<string | null> {
    const participants = await roomService.listParticipants(lkRoom);
    const target = participants.find((p) => p.identity === identity);
    const mic = target?.tracks.find((t) => t.source === TrackSource.MICROPHONE);
    return mic?.sid ?? null;
  }

  try {
    switch (action) {
      case 'grant': {
        // 批准上麦 → canPublish=true（speaker）
        await roomService.updateParticipant(lkRoom, targetIdentity, undefined, {
          canPublish: true,
          canSubscribe: true,
          canPublishData: true,
        });
        break;
      }
      case 'revoke': {
        // 请下麦 → canPublish=false（回到 audience）
        await roomService.updateParticipant(lkRoom, targetIdentity, undefined, {
          canPublish: false,
          canSubscribe: true,
          canPublishData: true,
        });
        try {
          const sid = await micSidOf(targetIdentity);
          if (sid) await roomService.mutePublishedTrack(lkRoom, targetIdentity, sid, true);
        } catch {
          // track 已不存在，权限撤销本身已生效
        }
        break;
      }
      case 'mute': {
        const sid = await micSidOf(targetIdentity);
        if (!sid) {
          return NextResponse.json(
            { ok: false, error: 'no microphone track' },
            { status: 400 },
          );
        }
        await roomService.mutePublishedTrack(lkRoom, targetIdentity, sid, true);
        break;
      }
      case 'kick': {
        // 踢出（PRD §6.2）：RoomServiceClient.removeParticipant
        await roomService.removeParticipant(lkRoom, targetIdentity);
        break;
      }
      case 'ban': {
        // 封禁（PRD §6.2）：踢出 + 写 room_bans
        await roomService.removeParticipant(lkRoom, targetIdentity).catch(() => {});
        await admin
          .from('room_bans')
          .upsert({ room_id: roomId, user_id: targetIdentity });
        break;
      }
      case 'promote_cohost': {
        // 任命共主持（PRD §6.2）：写 room_roles + 给 publish 权限
        await admin
          .from('room_roles')
          .upsert({ room_id: roomId, user_id: targetIdentity, role: 'cohost' });
        await roomService.updateParticipant(lkRoom, targetIdentity, undefined, {
          canPublish: true,
          canSubscribe: true,
          canPublishData: true,
        });
        break;
      }
      case 'demote_cohost': {
        // 取消共主持
        await admin
          .from('room_roles')
          .delete()
          .eq('room_id', roomId)
          .eq('user_id', targetIdentity);
        break;
      }
      default:
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
