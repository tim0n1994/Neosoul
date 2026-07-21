'use client';

import { useState } from 'react';
import {
  useDataChannel,
  useLocalParticipant,
} from '@livekit/components-react';
import { useUI } from '@/lib/store';

interface Props {
  isHost: boolean;
  onOpenHostPanel?: () => void;
  onToggleChat?: () => void;
}

// 底部麦控（玻璃浮岛）。
export function MicControls({ isHost, onOpenHostPanel, onToggleChat }: Props) {
  const { localParticipant } = useLocalParticipant();
  const micEnabled = useUI((s) => s.micEnabled);
  const setMicEnabled = useUI((s) => s.setMicEnabled);
  const { send } = useDataChannel('raise_hand');
  const [raised, setRaised] = useState(false);

  const canSpeak = isHost || micEnabled;

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
          JSON.stringify({ type: 'raise_hand', name: localParticipant.name }),
        ),
        { reliable: true },
      );
      setRaised(true);
    } catch {
      // 连接断开或无 canPublishData，静默失败
    }
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center p-4">
      <div className="glass pointer-events-auto flex items-center gap-1.5 rounded-full px-2 py-2">
        {canSpeak ? (
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

        {isHost && onOpenHostPanel && (
          <button
            onClick={onOpenHostPanel}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 text-base text-cream-200 transition-colors hover:bg-white/8"
          >
            ⚙
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
