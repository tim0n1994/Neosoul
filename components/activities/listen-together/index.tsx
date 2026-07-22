'use client';

import { useRef, useState, useCallback } from 'react';
import type { RoomActivity, ActivityContext, ActivityAction } from '@/lib/activities/types';

// PRD §6.4 P0 活动「一起听」(listen-together) [P0]：
// 房主选音频源 → 同步播放 → 各端用 <audio> 对齐播放位置。
// 不集成受版权保护的第三方流媒体 [红线]。

// ---- 状态 ----
interface ListenState {
  trackUrl: string | null;
  trackName: string;
  isPlaying: boolean;
  positionMs: number;
  updatedAt: number; // server time ms for sync alignment
  hostId: string;
}

type ListenAction = ActivityAction & {
  type: 'play' | 'pause' | 'setTrack' | 'seek';
  payload?: {
    trackUrl?: string;
    trackName?: string;
    positionMs?: number;
    atServerTime?: number;
  };
};

// ---- Reducer（host 权威）----
function reduce(
  state: ListenState,
  action: ListenAction,
  ctx: ActivityContext,
): ListenState {
  switch (action.type) {
    case 'setTrack':
      return {
        ...state,
        trackUrl: action.payload?.trackUrl ?? null,
        trackName: action.payload?.trackName ?? '',
        isPlaying: false,
        positionMs: 0,
        updatedAt: Date.now(),
      };
    case 'play': {
      // 仅 host 触发
      if (ctx.selfId !== state.hostId) return state;
      return {
        ...state,
        isPlaying: true,
        positionMs: action.payload?.positionMs ?? state.positionMs,
        updatedAt: action.payload?.atServerTime ?? Date.now(),
      };
    }
    case 'pause': {
      if (ctx.selfId !== state.hostId) return state;
      return {
        ...state,
        isPlaying: false,
        positionMs: action.payload?.positionMs ?? state.positionMs,
        updatedAt: Date.now(),
      };
    }
    case 'seek': {
      return {
        ...state,
        positionMs: action.payload?.positionMs ?? 0,
        updatedAt: action.payload?.atServerTime ?? Date.now(),
      };
    }
    default:
      return state;
  }
}

// ---- Panel UI ----
function Panel({ state, ctx }: { state: ListenState; ctx: ActivityContext }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [urlInput, setUrlInput] = useState('');
  const isHost = ctx.role === 'host' || ctx.role === 'cohost';

  // 同步播放位置
  const syncPosition = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const elapsed = Date.now() - state.updatedAt;
    const targetPos = state.isPlaying
      ? (state.positionMs + elapsed) / 1000
      : state.positionMs / 1000;
    // 容差对齐——只差 >1s 才修正
    if (Math.abs(audio.currentTime - targetPos) > 1) {
      audio.currentTime = targetPos;
    }
    if (state.isPlaying && audio.paused) {
      audio.play().catch(() => {});
    } else if (!state.isPlaying && !audio.paused) {
      audio.pause();
    }
  }, [state]);

  // 状态变化时同步
  // 用 ref+effect 模拟
  const stateRef = useRef(state);
  stateRef.current = state;
  if (audioRef.current) syncPosition();

  function handlePlay() {
    const audio = audioRef.current;
    const positionMs = audio ? audio.currentTime * 1000 : 0;
    ctx.send({ type: 'play', payload: { positionMs, atServerTime: Date.now() } });
  }

  function handlePause() {
    const audio = audioRef.current;
    const positionMs = audio ? audio.currentTime * 1000 : 0;
    ctx.send({ type: 'pause', payload: { positionMs } });
  }

  function handleSetTrack() {
    const url = urlInput.trim();
    if (!url) return;
    ctx.send({
      type: 'setTrack',
      payload: { trackUrl: url, trackName: url.split('/').pop() ?? '未知曲目' },
    });
    setUrlInput('');
  }

  return (
    <div className="glass-strong rounded-2xl p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-base">🎵</span>
        <span className="text-[13px] font-medium text-cream-50">一起听</span>
      </div>

      {state.trackUrl ? (
        <>
          <p className="mb-2 truncate text-[12px] font-light text-cream-200">
            {state.trackName}
          </p>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio
            ref={audioRef}
            src={state.trackUrl}
            className="w-full"
            controls={isHost}
            onPlay={isHost ? handlePlay : undefined}
            onPause={isHost ? handlePause : undefined}
          />
          <p className="mt-1 text-[10px] text-cream-300/40">
            {ctx.participants.length} 人在听
          </p>
        </>
      ) : isHost ? (
        <div className="space-y-2">
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="粘贴音频直链 URL"
            className="input-warm w-full rounded-xl px-3 py-2 text-[12px] text-cream-50 outline-none placeholder:text-cream-300/40"
          />
          <button
            onClick={handleSetTrack}
            disabled={!urlInput.trim()}
            className="btn-rose w-full rounded-xl py-2 text-[12px] font-medium text-white disabled:opacity-30"
          >
            设置音频
          </button>
          <p className="text-[10px] text-cream-300/40">
            支持直链音频 URL。请勿使用受版权保护的流媒体。
          </p>
        </div>
      ) : (
        <p className="py-3 text-center text-[12px] text-cream-300/50">
          等待房主选择音乐…
        </p>
      )}
    </div>
  );
}

// ---- 导出活动 ----
const activity: RoomActivity<ListenState, ListenAction> = {
  id: 'listen-together',
  name: '一起听',
  minPlayers: 1,
  maxPlayers: 100,
  hostOnlyStart: true,
  initialState: (ctx: ActivityContext): ListenState => ({
    trackUrl: null,
    trackName: '',
    isPlaying: false,
    positionMs: 0,
    updatedAt: Date.now(),
    hostId: ctx.selfId,
  }),
  reduce,
  Panel,
};

export default activity;
