'use client';

import { useState } from 'react';

export function RoomActions({ roomId }: { roomId: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  async function act(action: 'end' | 'delete') {
    if (!confirm(action === 'delete' ? '确定删除此房间？此操作不可恢复。' : '确定解散此房间？')) return;
    setBusy(action);
    try {
      const res = await fetch('/api/admin/rooms', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, roomId }),
      });
      if (res.ok) location.reload(); else { const d = await res.json(); alert(d.error || '操作失败'); }
    } finally { setBusy(null); }
  }
  return (
    <div className="flex gap-1.5">
      <button onClick={() => act('end')} disabled={busy !== null} className="rounded-full bg-white/5 px-3 py-1.5 text-[11px] font-light text-cream-200 hover:bg-white/8 disabled:opacity-40">解散</button>
      <button onClick={() => act('delete')} disabled={busy !== null} className="rounded-full bg-white/5 px-3 py-1.5 text-[11px] font-light text-rose-light/80 hover:bg-rose/10 disabled:opacity-40">删除</button>
    </div>
  );
}

export function UserActions({ userId, displayName, banned }: { userId: string; displayName: string; banned: boolean }) {
  const [busy, setBusy] = useState<string | null>(null);
  async function act(action: 'ban' | 'unban' | 'delete' | 'rename') {
    let name: string | undefined;
    if (action === 'rename') { name = prompt('输入新昵称：', displayName) ?? undefined; if (!name) return; }
    if (action === 'delete' && !confirm('确定删除此用户？此操作不可恢复。')) return;
    if (action === 'ban' && !confirm('确定封禁此用户？')) return;
    setBusy(action);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, userId, name }),
      });
      if (res.ok) location.reload(); else { const d = await res.json(); alert(d.error || '操作失败'); }
    } finally { setBusy(null); }
  }
  return (
    <div className="flex justify-end gap-1.5">
      <button onClick={() => act('rename')} disabled={busy !== null} className="rounded-full bg-white/5 px-3 py-1.5 text-[11px] font-light text-cream-200 hover:bg-white/8 disabled:opacity-40">改名</button>
      <button onClick={() => act(banned ? 'unban' : 'ban')} disabled={busy !== null} className="rounded-full bg-white/5 px-3 py-1.5 text-[11px] font-light text-cream-200 hover:bg-white/8 disabled:opacity-40">{banned ? '解封' : '封禁'}</button>
      <button onClick={() => act('delete')} disabled={busy !== null} className="rounded-full bg-white/5 px-3 py-1.5 text-[11px] font-light text-rose-light/80 hover:bg-rose/10 disabled:opacity-40">删除</button>
    </div>
  );
}
