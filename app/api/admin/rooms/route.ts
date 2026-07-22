import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdmin } from '@/lib/supabase/admin';

const ADMIN_EMAIL = 'tim0n@qq.com';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  let body: { action?: 'end' | 'delete'; roomId?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false, error: 'invalid body' }, { status: 400 });
  }
  const { action, roomId } = body;
  if (!action || !roomId) {
    return NextResponse.json({ ok: false, error: 'missing fields' }, { status: 400 });
  }

  const admin = createAdmin();
  if (action === 'end') {
    const { error } = await admin.from('rooms').update({ is_live: false }).eq('id', roomId);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  } else if (action === 'delete') {
    const { error } = await admin.from('rooms').delete().eq('id', roomId);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  } else {
    return NextResponse.json({ ok: false, error: 'invalid action' }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
