'use client';

import { useState } from 'react';
import { useParticipants } from '@livekit/components-react';
import { useUI } from '@/lib/store';
import type { StageRole } from '@/lib/room-roles';

interface Props {
  roomId: string;
  myRole: 'host' | 'cohost';
  hostId: string;
  cohostIds: string[];
}

// PRD §6.2 房主/共主持：举手 + 在麦管理 + 踢/封/promote/demote/pin
export function HostPanel({ roomId, myRole, hostId, cohostIds }: Props) {
  const participants = useParticipants();
  const raisedHands = useUI((s) => s.raisedHands);
  const removeRaisedHand = useUI((s) => s.removeRaisedHand);
  const [busy, setBusy] = useState<string | null>(null);

  // 我能做什么——host 可做全部；cohost 仅 grant/revoke/mute
  const canHostOnly = myRole === 'host';

  // 在麦的发言者（非本地、canPublish）
  const speakers = participants.filter(
    (p) => p.permissions?.canPublish,
  );

  async function moderate(
    action: string,
    targetIdentity: string,
  ) {
    setBusy(`${action}:${targetIdentity}`);
    try {
      const res = await fetch('/api/livekit/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, action, targetIdentity }),
      });
      if (res.ok && (action === 'grant' || action === 'revoke')) {
        removeRaisedHand(targetIdentity);
      }
    } finally {
      setBusy(null);
    }
  }

  // 房间标签辅助
  function participantRoleLabel(pIdentity: string): StageRole {
    if (pIdentity === hostId) return 'host';
    if (cohostIds.includes(pIdentity)) return 'cohost';
    return 'speaker';
  }

  return (
    <div className="space-y-6">
      {/* 举手申请 */}
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

      {/* 麦上成员管理 */}
      {speakers.length > 0 && (
        <section>
          <h3 className="mb-3 text-[11px] font-medium tracking-[0.15em] text-cream-300">
            麦上成员
          </h3>
          <div className="space-y-2">
            {speakers.map((p) => {
              const pRole = participantRoleLabel(p.identity);
              const isHost = pRole === 'host';
              const isCohost = pRole === 'cohost';
              return (
                <div
                  key={p.identity}
                  className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/3 px-3 py-2.5"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="truncate text-[13px] font-light text-cream-100">
                      {p.name ?? p.identity}
                    </span>
                    {isHost && (
                      <span className="rounded-full bg-rose/15 px-2 py-0.5 text-[9px] text-rose-light">
                        房主
                      </span>
                    )}
                    {isCohost && (
                      <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[9px] text-gold/80">
                        共主持
                      </span>
                    )}
                  </div>
                  {!isHost && (
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => moderate('mute', p.identity)}
                        disabled={busy === `mute:${p.identity}`}
                        className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-light text-cream-200 transition-colors hover:bg-white/8 disabled:opacity-40"
                      >
                        静音
                      </button>
                      <button
                        onClick={() => moderate('revoke', p.identity)}
                        disabled={busy === `revoke:${p.identity}`}
                        className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-light text-cream-200 transition-colors hover:bg-white/8 disabled:opacity-40"
                      >
                        下麦
                      </button>
                      {isCohost ? (
                        canHostOnly && (
                          <button
                            onClick={() => moderate('demote_cohost', p.identity)}
                            disabled={busy === `demote_cohost:${p.identity}`}
                            className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-light text-gold/60 transition-colors hover:bg-gold/10 disabled:opacity-40"
                          >
                            取消主持
                          </button>
                        )
                      ) : (
                        canHostOnly && (
                          <button
                            onClick={() => moderate('promote_cohost', p.identity)}
                            disabled={busy === `promote_cohost:${p.identity}`}
                            className="rounded-full bg-gold/10 px-2.5 py-1 text-[10px] font-light text-gold/80 transition-colors hover:bg-gold/15 disabled:opacity-40"
                          >
                            设主持
                          </button>
                        )
                      )}
                      {canHostOnly && (
                        <>
                          <button
                            onClick={() => moderate('kick', p.identity)}
                            disabled={busy === `kick:${p.identity}`}
                            className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-light text-orange-300/70 transition-colors hover:bg-orange-500/10 disabled:opacity-40"
                          >
                            踢出
                          </button>
                          <button
                            onClick={() => moderate('ban', p.identity)}
                            disabled={busy === `ban:${p.identity}`}
                            className="rounded-full bg-rose/5 px-2.5 py-1 text-[10px] font-light text-rose/70 transition-colors hover:bg-rose/10 disabled:opacity-40"
                          >
                            封禁
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
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
