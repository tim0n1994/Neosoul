import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdmin } from '@/lib/supabase/admin';
import { createToken } from '@/lib/livekit-server';
import type { StageRole } from '@/lib/room-roles';
import { resolveRole } from '@/lib/room-roles';

// 签发 LiveKit token，canPublish 由服务端按 host/cohost 判定（PRD §6.2、§10）
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let roomId: string | undefined;
  let inviteCode: string | undefined;
  try {
    const body = await req.json();
    roomId = body?.roomId;
    inviteCode = body?.inviteCode;
  } catch {
    // empty / invalid body
  }
  if (!roomId) {
    return NextResponse.json({ error: 'roomId required' }, { status: 400 });
  }

  // 用 service role 查（RLS 下 room_bans 可读但 room_roles 可读，admin 更稳妥）
  const admin = createAdmin();

  const { data: room } = await admin
    .from('rooms')
    .select('id, livekit_room, host_id, is_live, visibility, invite_code')
    .eq('id', roomId)
    .maybeSingle();
  if (!room || !room.is_live) {
    return NextResponse.json({ error: 'room not found' }, { status: 404 });
  }

  // PRD §6.2 房间类型准入：private 房需 invite_code
  if (room.visibility === 'private' && room.host_id !== user.id) {
    if (!room.invite_code || inviteCode !== room.invite_code) {
      return NextResponse.json({ error: 'invite_required' }, { status: 403 });
    }
  }

  // PRD §6.2 封禁检查：命中 room_bans 拒绝
  const { data: ban } = await admin
    .from('room_bans')
    .select('user_id')
    .eq('room_id', roomId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (ban) {
    return NextResponse.json({ error: 'banned' }, { status: 403 });
  }

  // 查 cohost 列表
  const { data: cohostRows } = await admin
    .from('room_roles')
    .select('user_id')
    .eq('room_id', roomId)
    .eq('role', 'cohost');
  const cohostIds = (cohostRows ?? []).map((r) => r.user_id as string);

  // 查 entitlements（Pro 影响房间容量）
  const { data: entitlements } = await admin
    .from('entitlements')
    .select('is_pro, pro_until')
    .eq('user_id', room.host_id)
    .maybeSingle();
  const hostIsPro =
    !!entitlements?.is_pro &&
    (!entitlements.pro_until || new Date(entitlements.pro_until) > new Date());

  const { data: profile } = await admin
    .from('profiles')
    .select('display_name, avatar_style, avatar_seed, avatar_type, avatar_config')
    .eq('id', user.id)
    .maybeSingle();

  // PRD §6.2：角色判定
  const role: StageRole = resolveRole(user.id, room.host_id, cohostIds, false);
  const isHost = role === 'host';
  const isCohost = role === 'cohost';

  const metadata = JSON.stringify({
    role,
    style: profile?.avatar_type === 'custom' ? 'custom' : (profile?.avatar_style ?? 'thumbs'),
    seed: profile?.avatar_seed ?? 'neo',
    config: profile?.avatar_config ?? null,
    isHost,
    raised: false,
  });

  const token = await createToken({
    identity: user.id,
    name: profile?.display_name ?? 'Guest',
    room: room.livekit_room,
    // host/cohost 可发布音频；speaker 在被 grant 后由 moderate 路由提升
    canPublish: isHost || isCohost,
    metadata,
  });

  return NextResponse.json({
    token,
    url: process.env.NEXT_PUBLIC_LIVEKIT_URL,
    role,
    hostIsPro,
  });
}
