'use client';

import { useState } from 'react';
import Link from 'next/link';
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

// 底部麦控（PRD §8.4、§10）。
// - 房主 / 已上麦者：静音 / 解除
// - 听众：举手（data channel，topic 'raise_hand'）
export function MicControls({ isHost, onOpenHostPanel, onToggleChat }: Props) {
  const { localParticipant } = useLocalParticipant();
  const micEnabled = useUI((s) => s.micEnabled);
  const setMicEnabled = useUI((s) => s.setMicEnabled);
  const { send } = useDataChannel('raise_hand');
  const [raised, setRaised] = useState(false);

  const canSpeak = isHost || micEnabled;

  async function toggle() {
    const next = !micEnabled;
    await localParticipant.setMicrophoneEnabled(next);
    setMicEnabled(next);
  }

  async function raiseHand() {
    const encoder = new TextEncoder();
    await send(
      encoder.encode(
        JSON.stringify({ type: 'raise_hand', name: localParticipant.name }),
      ),
      { reliable: true },
    );
    setRaised(true);
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center gap-3 p-4">
      <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-white/10 bg-black/50 px-3 py-2 backdrop-blur">
        {canSpeak ? (
          <button
            onClick={toggle}
            className={
              'rounded-xl px-4 py-2 text-sm ' +
              (micEnabled ? 'bg-brand-to/30 text-white' : 'bg-white/10 text-white/60')
            }
          >
            {micEnabled ? '🎤 静音' : '🎤 已静音'}
          </button>
        ) : (
          <button
            onClick={raiseHand}
            disabled={raised}
            className="rounded-xl bg-white/10 px-4 py-2 text-sm text-white/80 disabled:opacity-50"
          >
            {raised ? '✋ 已举手' : '✋ 举手'}
          </button>
        )}

        {isHost && onOpenHostPanel && (
          <button
            onClick={onOpenHostPanel}
            className="rounded-xl bg-white/10 px-4 py-2 text-sm text-white/80"
          >
            管理
          </button>
        )}

        {onToggleChat && (
          <button
            onClick={onToggleChat}
            className="rounded-xl bg-white/10 px-4 py-2 text-sm text-white/80 md:hidden"
          >
            💬
          </button>
        )}

        <Link
          href="/rooms"
          className="rounded-xl bg-white/10 px-4 py-2 text-sm text-white/80"
        >
          离开
        </Link>
      </div>
    </div>
  );
}
