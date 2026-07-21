'use client';

import { useState } from 'react';
import { useParticipants } from '@livekit/components-react';
import { useUI } from '@/lib/store';

interface Props {
  roomId: string;
}

// 房主：举手列表 + 在麦管理。
export function HostPanel({ roomId }: Props) {
  const participants = useParticipants();
  const raisedHands = useUI((s) => s.raisedHands);
  const removeRaisedHand = useUI((s) => s.removeRaisedHand);
  const [busy, setBusy] = useState<string | null>(null);

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
    <div className="space-y-6">
      {raisedHands.length > 0 && (
        <section>
          <h3 className="mb-3 text-[11px] font-medium tracking-[0.15em] text-rose-light/80">
            举手申请
          </h3>
          <div className="space-y-2">
            {raisedHands.map((h) => (
              <div
                key={h.identity}
                className="flex items-center justify-between rounded-2xl border border-rose/10 bg-rose/5 px-3 py-2.5"
              >
                <span className="truncate text-[13px] font-light text-cream-100">{h.name}</span>
                <button
                  onClick={() => moderate('grant', h.identity)}
                  disabled={busy === `grant:${h.identity}`}
                  className="btn-rose rounded-full px-4 py-1.5 text-[11px] font-medium text-white"
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
          <h3 className="mb-3 text-[11px] font-medium tracking-[0.15em] text-cream-300">
            麦上成员
          </h3>
          <div className="space-y-2">
            {speakers.map((p) => (
              <div
                key={p.identity}
                className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/3 px-3 py-2.5"
              >
                <span className="truncate text-[13px] font-light text-cream-100">
                  {p.name ?? p.identity}
                </span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => moderate('mute', p.identity)}
                    disabled={busy === `mute:${p.identity}`}
                    className="rounded-full bg-white/5 px-3 py-1.5 text-[11px] font-light text-cream-200 transition-colors hover:bg-white/8 disabled:opacity-40"
                  >
                    静音
                  </button>
                  <button
                    onClick={() => moderate('remove', p.identity)}
                    disabled={busy === `remove:${p.identity}`}
                    className="rounded-full bg-white/5 px-3 py-1.5 text-[11px] font-light text-rose-light/80 transition-colors hover:bg-rose/10 disabled:opacity-40"
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
        <p className="py-6 text-center text-xs font-light text-cream-300/50">
          暂无举手或麦上成员
        </p>
      )}
    </div>
  );
}
