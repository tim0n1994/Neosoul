'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// 「+ 创建房间」：房名 + 可选背景图 → insert rooms → 跳房
export function CreateRoomButton() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [bgPreview, setBgPreview] = useState<string | null>(null);
  const [bgPath, setBgPath] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null));
  }, [supabase]);

  function handleBgSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('仅支持图片');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('图片不能超过 5MB');
      return;
    }
    setError(null);
    // 释放之前的 blob URL，避免内存泄漏
    if (bgPreview) URL.revokeObjectURL(bgPreview);
    setBgPreview(URL.createObjectURL(file));

    // 上传到 chat-images bucket（复用），路径用 background 前缀
    if (!userId) return;
    setBusy(true);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `backgrounds/${userId}/${Date.now()}-${safeName}`;
    supabase.storage
      .from('chat-images')
      .upload(path, file, { contentType: file.type })
      .then(({ error: upErr }) => {
        setBusy(false);
        if (upErr) {
          setError('背景上传失败：' + upErr.message);
          return;
        }
        const { data: pub } = supabase.storage.from('chat-images').getPublicUrl(path);
        setBgPath(pub.publicUrl);
      });
  }

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
    // PRD §6.10 [红线]：通过 API 路由建房（限流）
    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: roomName, backgroundUrl: bgPath }),
    });
    const data = res.ok ? await res.json() : null;
    setBusy(false);
    if (!res.ok || !data?.id) {
      const e = data ?? (await res.json().catch(() => ({})));
      if (e.error === 'rate_limited') setError('创建太快了，请稍后再试');
      else setError(e.error ?? '创建失败');
      return;
    }
    setOpen(false);
    setName('');
    setBgPreview(null);
    setBgPath(null);
    router.push(`/rooms/${data.id}`);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-rose rounded-full px-4 py-2 text-xs font-medium tracking-wide text-white"
      >
        + 创建房间
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
          onClick={() => setOpen(false)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleCreate}
            className="glass-strong w-full max-w-sm space-y-5 rounded-t-3xl p-6 sm:rounded-3xl"
          >
            <h2 className="text-lg font-light tracking-wide text-cream-50">创建房间</h2>

            <div>
              <label className="mb-1.5 block text-[11px] font-medium tracking-wider text-cream-300">
                房间名称
              </label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                placeholder="给这场派对起个名字"
                className="input-warm w-full rounded-2xl px-4 py-3 text-sm text-cream-50 outline-none placeholder:text-cream-300/40"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-medium tracking-wider text-cream-300">
                房间背景 <span className="text-cream-300/50">（可选）</span>
              </label>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleBgSelect} />
              {bgPreview ? (
                <div className="relative overflow-hidden rounded-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={bgPreview} alt="背景预览" className="h-28 w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-950/60 to-transparent" />
                  <button
                    type="button"
                    onClick={() => { if (bgPreview) URL.revokeObjectURL(bgPreview); setBgPreview(null); setBgPath(null); }}
                    className="absolute right-2 top-2 rounded-full bg-ink-950/60 px-2 py-1 text-[10px] text-cream-100"
                  >
                    移除
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex h-28 w-full flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-white/8 text-cream-300 transition-colors hover:border-rose/20 hover:text-cream-100"
                >
                  <span className="text-lg">🖼</span>
                  <span className="text-[11px] font-light">选择一张背景图</span>
                </button>
              )}
            </div>

            {error && <p className="text-xs text-rose/80">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-2xl border border-white/8 py-3 text-sm font-light text-cream-200"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={busy}
                className="btn-rose flex-1 rounded-2xl py-3 text-sm font-medium text-white"
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
