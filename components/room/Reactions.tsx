'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  useDataChannel,
  useLocalParticipant,
} from '@livekit/components-react';

// PRD §6.3 Reactions：轻量表情飘屏，走 LiveKit data channel，不入库、不收费。
// 对标 Soul 的付费礼物——我们把基础情绪表达做成免费。

const REACTIONS = ['👏', '❤️', '😂', '🔥', '😍', '🤣', '👍', '🎉'] as const;
type Emoji = (typeof REACTIONS)[number];

interface FloatingEmoji {
  id: number;
  emoji: string;
  left: number;
  fromName: string;
}

interface ReactionPayload {
  type: 'reaction';
  emoji: string;
  name: string;
}

export function Reactions() {
  const { send } = useDataChannel('reactions');
  const { localParticipant } = useLocalParticipant();
  const [floating, setFloating] = useState<FloatingEmoji[]>([]);
  const [decoder] = useState(() => new TextDecoder());
  const counter = useState({ n: 0 })[0];

  // 接收飘屏
  useDataChannel('reactions', (msg) => {
    let emoji = '❤️';
    let name = 'Someone';
    try {
      const parsed = JSON.parse(decoder.decode(msg.payload)) as ReactionPayload;
      emoji = parsed.emoji ?? '❤️';
      name = parsed.name ?? msg.from?.name ?? 'Someone';
    } catch {
      // 非 JSON payload，用默认
    }
    counter.n += 1;
    const item: FloatingEmoji = {
      id: counter.n,
      emoji,
      left: 15 + Math.random() * 70,
      fromName: name,
    };
    setFloating((prev) => [...prev, item]);
    // 3s 后移除
    setTimeout(() => {
      setFloating((prev) => prev.filter((f) => f.id !== item.id));
    }, 3000);
  });

  const sendReaction = useCallback(
    (emoji: Emoji) => {
      const payload: ReactionPayload = {
        type: 'reaction',
        emoji,
        name: localParticipant.name ?? 'You',
      };
      const encoder = new TextEncoder();
      send(encoder.encode(JSON.stringify(payload)), { reliable: false }).catch(() => {});
    },
    [localParticipant.name, send],
  );

  // 隐藏溢出的飘屏（防内存泄漏）
  useEffect(() => {
    if (floating.length > 30) {
      setFloating((prev) => prev.slice(-20));
    }
  }, [floating.length]);

  return (
    <>
      {/* 飘屏层 */}
      <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
        {floating.map((f) => (
          <div
            key={f.id}
            className="absolute animate-float-up text-2xl"
            style={{ left: `${f.left}%`, bottom: '80px' }}
          >
            <span className="block">{f.emoji}</span>
            <span className="block text-[9px] font-light text-cream-300/50">
              {f.fromName}
            </span>
          </div>
        ))}
      </div>

      {/* 表情按钮条（可发送） */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center p-4">
        <div className="glass pointer-events-auto flex items-center gap-1 rounded-full px-2 py-1.5">
          {REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => sendReaction(emoji)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-base transition-transform hover:scale-125 active:scale-95"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
