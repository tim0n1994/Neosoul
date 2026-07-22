'use client';

import { useState, useCallback, useRef } from 'react';
import { useDataChannel, useParticipants } from '@livekit/components-react';
import type { RoomActivity, ActivityContext, ActivityAction } from '@/lib/activities/types';
import { loadActivity } from '@/lib/activities/registry';

// PRD §6.4 ActivityHost——承载活动在房内运行的宿主组件。
// 负责：加载活动 Panel + data channel 同步状态 + 持久快照。
// 不修改即可通过 registry 增删活动。

interface Props {
  roomId: string;
  selfId: string;
  role: 'host' | 'cohost' | 'speaker' | 'audience';
}

export function ActivityHost({ roomId, selfId, role }: Props) {
  const [activeActivity, setActiveActivity] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [decoder] = useState(() => new TextDecoder());
  const participants = useParticipants();

  // 活动状态（reducer 运行在 host 客户端）
  const [activityState, setActivityState] = useState<unknown>(null);
  const stateRef = useRef(activityState);
  stateRef.current = activityState;

  // 当前活动的模块引用
  const [activityMod, setActivityMod] = useState<RoomActivity | null>(null);

  // 构建 ActivityContext
  const ctxRef = useRef<ActivityContext>({
    roomId,
    selfId,
    role,
    participants: participants.map((p) => ({
      id: p.identity,
      name: p.name ?? p.identity,
      role: 'audience',
    })),
    send: () => {}, // 在下方赋值
  });
  ctxRef.current.participants = participants.map((p) => ({
    id: p.identity,
    name: p.name ?? p.identity,
    role: 'audience',
  }));

  // 接收活动动作（data channel 'activity'）
  const handleAction = useCallback(
    (action: ActivityAction) => {
      if (!activityMod) return;
      // host 执行 reduce 并广播结果；非 host 只接收状态更新
      if (role === 'host' || role === 'cohost') {
        const currentState = (stateRef.current ?? activityMod.initialState(ctxRef.current)) as never;
        const newState = activityMod.reduce(currentState, action as never, ctxRef.current);
        setActivityState(newState);
        // 广播新状态
        const encoder = new TextEncoder();
        sendStateRef.current?.(
          encoder.encode(JSON.stringify({ type: 'state_sync', state: newState })),
          { reliable: true },
        );
      }
    },
    [activityMod, role],
  );

  // data channel：'activity' 发/收动作，'activity_state' 接收状态
  const { send: sendAction } = useDataChannel('activity');
  const { send: sendState } = useDataChannel('activity_state');
  const sendStateRef = useRef(sendState);
  sendStateRef.current = sendState;

  ctxRef.current.send = (action: ActivityAction) => {
    const encoder = new TextEncoder();
    sendAction(encoder.encode(JSON.stringify(action)), { reliable: true }).catch(() => {});
  };

  useDataChannel('activity', (msg) => {
    try {
      const action = JSON.parse(decoder.decode(msg.payload)) as ActivityAction;
      handleAction(action);
    } catch {
      // ignore
    }
  });

  // 接收 host 广播的状态
  useDataChannel('activity_state', (msg) => {
    try {
      const parsed = JSON.parse(decoder.decode(msg.payload)) as { type: string; state: unknown };
      if (parsed.type === 'state_sync') {
        setActivityState(parsed.state);
      }
    } catch {
      // ignore
    }
  });

  // 启动活动
  async function startActivity(id: string) {
    const mod = await loadActivity(id);
    if (!mod) return;
    setActiveActivity(id);
    setShowMenu(false);
    setActivityMod(mod);
    setActivityState(mod.initialState(ctxRef.current));
  }

  function stopActivity() {
    setActiveActivity(null);
    setActivityMod(null);
    setActivityState(null);
  }

  const canStart = role === 'host' || role === 'cohost';
  const Panel = activityMod?.Panel;
  const ACTIVITY_NAMES: Record<string, string> = {
    'listen-together': '🎵 一起听',
  };

  return (
    <>
      {/* 活动入口按钮 */}
      {!activeActivity && canStart && (
        <div className="pointer-events-none absolute left-4 top-20 z-30">
          <button
            onClick={() => setShowMenu((v) => !v)}
            className="glass pointer-events-auto rounded-full px-3 py-1.5 text-[11px] font-light text-cream-200 transition-colors hover:text-cream-50"
          >
            🎮 活动
          </button>
          {showMenu && (
            <div className="glass-strong mt-2 w-48 rounded-2xl p-2">
              <button
                onClick={() => startActivity('listen-together')}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[12px] font-light text-cream-100 transition-colors hover:bg-white/5"
              >
                {ACTIVITY_NAMES['listen-together']}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 活动 Panel */}
      {activeActivity && Panel && activityState !== null && (
        <div className="absolute left-4 top-20 z-30 w-72 max-w-[85vw]">
          <div className="relative">
            <Panel state={activityState as never} ctx={ctxRef.current} />
            {canStart && (
              <button
                onClick={stopActivity}
                className="absolute right-2 top-2 text-[10px] text-cream-300/50 hover:text-rose"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
