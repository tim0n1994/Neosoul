'use client';

import { useState } from 'react';
import { useParticipants } from '@livekit/components-react';
import { resolveAvatarSrc } from '@/lib/avatar';

// PRD §6.6 在线状态 + 分享链接。
// 显示在场成员列表（头像 + 名字 + 角色），以及"复制邀请链接"按钮（Ping 的 P0 简化版）。

type Meta = {
  style?: string;
  seed?: string;
  role?: string;
  isHost?: boolean;
};

function parseMeta(raw: string | undefined): Meta {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Meta;
  } catch {
    return {};
  }
}

const ROLE_LABELS: Record<string, { text: string; cls: string }> = {
  host: { text: '房主', cls: 'bg-rose/15 text-rose-light' },
  cohost: { text: '共主持', cls: 'bg-gold/15 text-gold/80' },
  speaker: { text: '发言', cls: 'bg-white/5 text-cream-300' },
};

interface Props {
  roomId: string;
}

export function PresenceList({ roomId }: Props) {
  const participants = useParticipants();
  const [copied, setCopied] = useState(false);

  const sorted = [...participants].sort((a, b) => {
    const aMeta = parseMeta(a.metadata);
    const bMeta = parseMeta(b.metadata);
    const aRole = aMeta.role ?? 'audience';
    const bRole = bMeta.role ?? 'audience';
    const order = { host: 0, cohost: 1, speaker: 2, audience: 3 };
    return (order[aRole as keyof typeof order] ?? 3) - (order[bRole as keyof typeof order] ?? 3);
  });

  async function copyInviteLink() {
    const url = `${window.location.origin}/rooms/${roomId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard 不可用
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-light tracking-[0.15em] text-cream-300/60">
          在场 {participants.length} 人
        </span>
        <button
          onClick={copyInviteLink}
          className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-light text-cream-200 transition-colors hover:bg-white/8"
        >
          {copied ? '✓ 已复制' : '🔗 邀请'}
        </button>
      </div>

      <div className="space-y-1.5">
        {sorted.map((p) => {
          const meta = parseMeta(p.metadata);
          const role = meta.role ?? 'audience';
          const label = ROLE_LABELS[role];
          return (
            <div key={p.identity} className="flex items-center gap-2 rounded-xl px-1 py-0.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolveAvatarSrc(meta.style === 'custom' ? 'custom' : undefined, meta.style ?? 'thumbs', meta.seed ?? p.identity)}
                width={24}
                height={24}
                alt={p.name ?? ''}
                className="rounded-full object-cover"
                style={{ border: '1px solid rgba(255,255,255,0.06)' }}
              />
              <span className="min-w-0 flex-1 truncate text-[12px] font-light text-cream-100">
                {p.name ?? 'Guest'}
              </span>
              {label && (
                <span className={`rounded-full px-2 py-0.5 text-[8px] font-medium ${label.cls}`}>
                  {label.text}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
