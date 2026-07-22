'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  useDataChannel,
  useLocalParticipant,
  useLocalParticipantPermissions,
} from '@livekit/components-react';
import { useUI } from '@/lib/store';

interface Props {
  isHost: boolean;
  role: 'host' | 'cohost' | 'speaker' | 'audience';
  onOpenHostPanel?: () => void;
  onToggleChat?: () => void;
}

// 底部麦控（玻璃浮岛）。
export function MicControls({ isHost, role, onOpenHostPanel, onToggleChat }: Props) {
  const t = useTranslations('room');
  const { localParticipant } = useLocalParticipant();
  const permissions = useLocalParticipantPermissions();
  const micEnabled = useUI((s) => s.micEnabled);
  const setMicEnabled = useUI((s) => s.setMicEnabled);
  const raisedHands = useUI((s) => s.raisedHands);
  const { send } = useDataChannel('raise_hand');
  const [raised, setRaised] = useState(false);

  // 关键：用 LiveKit 的 permissions.canPublish 判断是否能开麦
  // host/cohost 的 token 直接带 canPublish=true
  // audience 被 grant 后 LiveKit 推送权限更新 → permissions.canPublish 变 true
  const canPublish = permissions?.canPublish ?? (isHost || role === 'cohost');

  async function toggle() {
    const next = !micEnabled;
    try {
      await localParticipant.setMicrophoneEnabled(next);
      setMicEnabled(next);
    } catch {
      // 浏览器拒绝麦克风权限或设备不可用，保持当前状态
    }
  }

  async function raiseHand() {
    const encoder = new TextEncoder();
    try {
      await send(
        encoder.encode(
          JSON.stringify({
            type: 'raise_hand',
            name: localParticipant.name ?? 'Guest',
            identity: localParticipant.identity,
          }),
        ),
        { reliable: true },
      );
      setRaised(true);
    } catch {
      // 连接断开，静默失败
    }
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex justify-center p-4">
      <div className="glass pointer-events-auto mb-14 flex items-center gap-1.5 rounded-full px-2 py-2">
        {canPublish ? (
          <button
            onClick={toggle}
            className={
              'flex h-11 w-11 items-center justify-center rounded-full text-base transition-all ' +
              (micEnabled
                ? 'bg-rose/20 text-rose-light ring-1 ring-rose/30'
                : 'bg-white/5 text-cream-300')
            }
          >
            {micEnabled ? '🎤' : '🔇'}
          </button>
        ) : (
          <button
            onClick={raiseHand}
            disabled={raised}
            className={
              'flex h-11 w-11 items-center justify-center rounded-full text-base transition-all ' +
              (raised
                ? 'bg-rose/15 text-rose-light/50'
                : 'bg-white/5 text-cream-100 hover:bg-white/8')
            }
          >
            ✋
          </button>
        )}

        {(role === 'host' || role === 'cohost') && onOpenHostPanel && (
          <button
            onClick={onOpenHostPanel}
            className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white/5 text-lg text-cream-200 transition-colors hover:bg-white/8"
          >
            ⚙
            {raisedHands.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose px-1 text-[10px] font-bold text-white">
                {raisedHands.length}
                <span className="absolute inset-0 animate-ping rounded-full bg-rose/40" />
              </span>
            )}
          </button>
        )}

        {onToggleChat && (
          <button
            onClick={onToggleChat}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 text-base text-cream-200 transition-colors hover:bg-white/8 md:hidden"
          >
            💬
          </button>
        )}
      </div>
    </div>
  );
}
