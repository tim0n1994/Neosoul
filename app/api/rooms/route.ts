import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimitResponse, LIMITS } from '@/lib/ratelimit';

// PRD §6.10 [红线]：建房——限流。
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const limited = rateLimitResponse(user.id, 'createRoom', LIMITS.createRoom.limit, LIMITS.createRoom.windowSec);
  if (limited) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  let body: { name?: string; backgroundUrl?: string; topic?: string; visibility?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const name = body.name?.trim().slice(0, 40);
  if (!name) {
    return NextResponse.json({ error: 'name required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('rooms')
    .insert({
      name,
      host_id: user.id,
      livekit_room: 'room_' + crypto.randomUUID(),
      background_url: body.backgroundUrl ?? null,
      topic: body.topic ?? 'chat',
      visibility: body.visibility ?? 'open',
    })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id });
}
