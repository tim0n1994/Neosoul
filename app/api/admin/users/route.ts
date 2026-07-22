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

  let body: { action?: 'ban' | 'unban' | 'delete' | 'rename'; userId?: string; name?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false, error: 'invalid body' }, { status: 400 });
  }
  const { action, userId, name } = body;
  if (!action || !userId) {
    return NextResponse.json({ ok: false, error: 'missing fields' }, { status: 400 });
  }

  const admin = createAdmin();
  try {
    if (action === 'ban') {
      const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: '876000h' });
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    } else if (action === 'unban') {
      const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: 'none' });
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    } else if (action === 'delete') {
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    } else if (action === 'rename') {
      if (!name) return NextResponse.json({ ok: false, error: 'name required' }, { status: 400 });
      const { error } = await admin.from('profiles').update({ display_name: name.slice(0, 40) }).eq('id', userId);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    } else {
      return NextResponse.json({ ok: false, error: 'invalid action' }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
