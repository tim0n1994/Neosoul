'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// 「+ 创建房间」：弹层输入房名 → insert rooms（host_id=自己, livekit_room 唯一）→ 跳房（PRD §8.3）
export function CreateRoomButton() {
  const router = useRouter();
  const supabase = createClient();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null));
  }, [supabase]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    const roomName = name.trim().slice(0, 40);
    if (!roomName) {
      setError('房名不能为空');
      return;
    }
    setBusy(true);
    setError(null);
    const { data, error } = await supabase
      .from('rooms')
      .insert({
        name: roomName,
        host_id: userId,
        livekit_room: 'room_' + crypto.randomUUID(),
      })
      .select('id')
      .single();
    setBusy(false);
    if (error || !data) {
      setError(error?.message ?? '创建失败');
      return;
    }
    router.push(`/rooms/${data.id}`);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl bg-gradient-to-r from-brand-from to-brand-to px-4 py-2 text-sm font-semibold text-white"
      >
        + 创建房间
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
          onClick={() => setOpen(false)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleCreate}
            className="w-full max-w-sm space-y-4 rounded-3xl border border-white/10 bg-[#0a0a12] p-6"
          >
            <h2 className="text-lg font-bold">创建房间</h2>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              placeholder="房间名称"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-brand-to"
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-2 text-sm text-white/50"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-xl bg-gradient-to-r from-brand-from to-brand-to px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy ? '创建中…' : '创建'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
