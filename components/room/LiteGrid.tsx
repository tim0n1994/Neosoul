'use client';

import { useMemo } from 'react';
import { useParticipants } from '@livekit/components-react';
import { resolveAvatarSrc } from '@/lib/avatar';

// PRD §6.12 Lite 模式：低端设备/弱网/prefers-reduced-motion 时用 2D 头像栅格替代 3D 场景。
// 保证低端可用，不卡死。说话者加 ring 高亮 + 脉冲动画。

type Meta = {
  style?: string;
  seed?: string;
  isHost?: boolean;
  role?: string;
};

function parseMeta(raw: string | undefined): Meta {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Meta;
  } catch {
    return {};
  }
}

export function LiteGrid() {
  const participants = useParticipants();

  const { speakers, listeners } = useMemo(() => {
    const speakers: typeof participants = [];
    const listeners: typeof participants = [];
    participants.forEach((p) => {
      if (p.permissions?.canPublish) speakers.push(p);
      else listeners.push(p);
    });
    return { speakers, listeners };
  }, [participants]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 overflow-y-auto p-4">
      {/* 上麦者（内圈） */}
      {speakers.length > 0 && (
        <div className="w-full max-w-md">
          <p className="mb-3 text-center text-[10px] font-light tracking-[0.2em] text-rose-light/60">
            🎤 上麦
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {speakers.map((p) => {
              const meta = parseMeta(p.metadata);
              const speaking = !!p.isSpeaking;
              const isHost = meta.isHost || meta.role === 'host';
              return (
                <div key={p.identity} className="flex flex-col items-center gap-1">
                  <div
                    className={`relative rounded-full p-0.5 transition-all ${
                      speaking
                        ? 'bg-rose/30 ring-2 ring-rose/40'
                        : isHost
                          ? 'ring-1 ring-rose/20'
                          : ''
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolveAvatarSrc(meta.style === 'custom' ? 'custom' : undefined, meta.style ?? 'thumbs', meta.seed ?? p.identity)}
                      width={56}
                      height={56}
                      alt={p.name ?? 'Guest'}
                      className="rounded-full object-cover"
                      style={{
                        border: '1px solid rgba(255,255,255,0.06)',
                        transform: speaking ? 'scale(1.08)' : 'scale(1)',
                        transition: 'transform 0.15s ease-out',
                      }}
                    />
                    {speaking && (
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                        <span className="absolute inline-flex h-full w-full animate-glow-pulse rounded-full bg-rose opacity-75" />
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-rose-light" />
                      </span>
                    )}
                  </div>
                  <span className="max-w-[64px] truncate text-[10px] font-light text-cream-200">
                    {p.name ?? 'Guest'}
                  </span>
                  {isHost && (
                    <span className="text-[8px] font-medium text-rose-light">房主</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 分隔 */}
      {speakers.length > 0 && listeners.length > 0 && (
        <div className="h-px w-2/3 bg-white/5" />
      )}

      {/* 听众（外圈） */}
      {listeners.length > 0 && (
        <div className="w-full max-w-md">
          <p className="mb-2 text-center text-[10px] font-light tracking-[0.2em] text-cream-300/40">
            👂 听众 ({listeners.length})
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {listeners.map((p) => {
              const meta = parseMeta(p.metadata);
              return (
                <div key={p.identity} className="flex flex-col items-center gap-0.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveAvatarSrc(meta.style === 'custom' ? 'custom' : undefined, meta.style ?? 'thumbs', meta.seed ?? p.identity)}
                    width={32}
                    height={32}
                    alt={p.name ?? 'Guest'}
                    className="rounded-full object-cover opacity-70"
                    style={{ border: '1px solid rgba(255,255,255,0.04)' }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {speakers.length === 0 && listeners.length === 0 && (
        <p className="text-sm font-light text-cream-300/50">等待其他人加入…</p>
      )}
    </div>
  );
}
