'use client';

import { useState } from 'react';
import { useParticipants } from '@livekit/components-react';
import { useUI } from '@/lib/store';

interface Props {
  roomId: string;
}

// 房主：举手列表（批准上麦）+ 在麦管理（静音 / 请下麦）。PRD §8.4、§10。
export function HostPanel({ roomId }: Props) {
  const participants = useParticipants();
  const raisedHands = useUI((s) => s.raisedHands);
  const removeRaisedHand = useUI((s) => s.removeRaisedHand);
  const [busy, setBusy] = useState<string | null>(null);

  // 在麦上的其他人（canPublish 且非本机）
  const speakers = participants.filter(
    (p) => !p.isLocal && p.permissions?.canPublish,
  );

  async function moderate(
    action: 'grant' | 'mute' | 'remove',
    targetIdentity: string,
  ) {
    setBusy(`${action}:${targetIdentity}`);
    try {
      const res = await fetch('/api/livekit/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, action, targetIdentity }),
      });
      if (res.ok && (action === 'grant' || action === 'remove')) {
        removeRaisedHand(targetIdentity);
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {raisedHands.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs text-white/50">举手申请</h3>
          <div className="space-y-2">
            {raisedHands.map((h) => (
              <div
                key={h.identity}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-3 py-2"
              >
                <span className="truncate text-sm">{h.name}</span>
                <button
                  onClick={() => moderate('grant', h.identity)}
                  disabled={busy === `grant:${h.identity}`}
                  className="rounded-lg bg-gradient-to-r from-brand-from to-brand-to px-3 py-1 text-xs font-semibold disabled:opacity-50"
                >
                  批准
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {speakers.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs text-white/50">麦上成员</h3>
          <div className="space-y-2">
            {speakers.map((p) => (
              <div
                key={p.identity}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-3 py-2"
              >
                <span className="truncate text-sm">{p.name ?? p.identity}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => moderate('mute', p.identity)}
                    disabled={busy === `mute:${p.identity}`}
                    className="rounded-lg bg-white/10 px-3 py-1 text-xs disabled:opacity-50"
                  >
                    静音
                  </button>
                  <button
                    onClick={() => moderate('remove', p.identity)}
                    disabled={busy === `remove:${p.identity}`}
                    className="rounded-lg bg-white/10 px-3 py-1 text-xs text-red-300 disabled:opacity-50"
                  >
                    下麦
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {raisedHands.length === 0 && speakers.length === 0 && (
        <p className="text-xs text-white/30">暂无举手或麦上成员。</p>
      )}
    </div>
  );
}
