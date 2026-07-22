'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  useDataChannel,
  useLocalParticipant,
} from '@livekit/components-react';

// PRD §6.3 Reactions：轻量表情飘屏，走 LiveKit data channel，不入库、不收费。
// 高级感 3D emoji：径向晕开光晕 + 弹性浮升 + 模糊散开消散

const REACTIONS = ['👏', '❤️', '😂', '🔥', '😍', '🤣', '👍', '🎉'] as const;
type Emoji = (typeof REACTIONS)[number];

interface FloatingEmoji {
  id: number;
  emoji: string;
  left: number;
  fromName: string;
  hue: number;
}

interface ReactionPayload {
  type: 'reaction';
  emoji: string;
  name: string;
}

// 每个 emoji 对应一个晕染色相
const EMOJI_HUE: Record<string, number> = {
  '👏': 45,
  '❤️': 350,
  '😂': 50,
  '🔥': 15,
  '😍': 330,
  '🤣': 40,
  '👍': 200,
  '🎉': 280,
};

export function Reactions() {
  const { send } = useDataChannel('reactions');
  const { localParticipant } = useLocalParticipant();
  const [floating, setFloating] = useState<FloatingEmoji[]>([]);
  const [decoder] = useState(() => new TextDecoder());
  const counterRef = useRef(0);

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
    counterRef.current += 1;
    const item: FloatingEmoji = {
      id: counterRef.current,
      emoji,
      left: 15 + Math.random() * 70,
      fromName: name,
      hue: EMOJI_HUE[emoji] ?? 350,
    };
    setFloating((prev) => [...prev, item]);
    setTimeout(() => {
      setFloating((prev) => prev.filter((f) => f.id !== item.id));
    }, 3500);
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

  useEffect(() => {
    if (floating.length > 25) {
      setFloating((prev) => prev.slice(-15));
    }
  }, [floating.length]);

  return (
    <>
      {/* 飘屏层——晕开光晕 + 弹性浮升 */}
      <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
        {floating.map((f) => (
          <div
            key={f.id}
            className="absolute"
            style={{
              left: `${f.left}%`,
              bottom: '100px',
              animation: 'reactionFloat 3.5s ease-out forwards',
            }}
          >
            {/* 晕开光晕 */}
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: `radial-gradient(circle, hsla(${f.hue}, 80%, 60%, 0.4) 0%, hsla(${f.hue}, 80%, 60%, 0) 70%)`,
                animation: 'reactionBloom 3.5s ease-out forwards',
              }}
            />
            {/* emoji 本体 */}
            <span
              className="relative block text-3xl"
              style={{ filter: `drop-shadow(0 0 8px hsla(${f.hue}, 80%, 60%, 0.5))` }}
            >
              {f.emoji}
            </span>
            <span className="block text-center text-[9px] font-light text-cream-300/40">
              {f.fromName}
            </span>
          </div>
        ))}
      </div>

      {/* 表情按钮条——长按连续发送 + 触觉反馈 */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center p-4">
        <div className="glass pointer-events-auto mb-16 flex items-center gap-0.5 rounded-full px-1.5 py-1.5">
          {REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                sendReaction(emoji);
                // 触觉反馈（支持的设备）
                if (navigator.vibrate) navigator.vibrate(8);
              }}
              className="group relative flex h-9 w-9 items-center justify-center rounded-full text-lg transition-all hover:scale-125 active:scale-90"
            >
              {/* hover 晕开 */}
              <span
                className="absolute inset-0 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                style={{
                  background: `radial-gradient(circle, hsla(${EMOJI_HUE[emoji] ?? 350}, 80%, 60%, 0.2) 0%, transparent 70%)`,
                }}
              />
              <span className="relative">{emoji}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
