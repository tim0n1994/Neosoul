'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useWakeLock } from '@/lib/useWakeLock';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useConnectionState,
  useLocalParticipant,
} from '@livekit/components-react';
import { ConnectionState } from 'livekit-client';
import { MicControls } from '@/components/MicControls';
import { HostPanel } from '@/components/HostPanel';
import { ChatPanel } from '@/components/ChatPanel';
import { PartyScene } from '@/components/PartyScene';
import { LiteGrid } from '@/components/room/LiteGrid';
import { RoomEventHandlers } from '@/components/RoomEventHandlers';
import { Reactions } from '@/components/room/Reactions';
import { PinnedBar } from '@/components/room/PinnedBar';
import { ActivityHost } from '@/components/room/ActivityHost';
import { PresenceList } from '@/components/room/PresenceList';
import { useUI } from '@/lib/store';

interface Props {
  roomId: string;
  isHost: boolean;
  roomName: string;
  backgroundUrl: string | null;
  userId: string;
  role: 'host' | 'cohost' | 'speaker' | 'audience';
  hostId: string;
  cohostIds: string[];
  recordingEnabled: boolean;
}

function HostMicSetup({ isHost }: { isHost: boolean }) {
  const connectionState = useConnectionState();
  const { localParticipant } = useLocalParticipant();
  const setMicEnabled = useUI((s) => s.setMicEnabled);
  const prevConnState = useRef<ConnectionState | null>(null);

  useEffect(() => {
    // 检测重连：之前已 Connected，中间断开，现在又 Connected
    const wasConnected = prevConnState.current === ConnectionState.Connected;
    const justReconnected =
      wasConnected && connectionState === ConnectionState.Connected;

    if (connectionState === ConnectionState.Connected && isHost) {
      localParticipant
        .setMicrophoneEnabled(true)
        .then(() => setMicEnabled(true))
        .catch(() => {});
    }

    prevConnState.current = connectionState;
  }, [connectionState, isHost, localParticipant, setMicEnabled]);

  return null;
}

export function RoomView({
  roomId,
  isHost,
  roomName,
  backgroundUrl,
  userId,
  role,
  hostId,
  cohostIds,
  recordingEnabled,
}: Props) {
  const t = useTranslations('room');
  const tc = useTranslations('common');
  const [token, setToken] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  const [entered, setEntered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hostPanelOpen, setHostPanelOpen] = useState(false);
  const chatOpen = useUI((s) => s.chatOpen);
  const toggleChat = useUI((s) => s.toggleChat);

  // PRD §6.12 Lite 模式：低端设备/弱网/prefers-reduced-motion 用 2D 降级
  const [liteMode, setLiteMode] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lowCPU = (navigator.hardwareConcurrency ?? 8) <= 4;
    const conn = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
    const slowNet = conn?.effectiveType === '2g' || conn?.effectiveType === 'slow-2g';
    if (reduceMotion || lowCPU || slowNet) {
      setLiteMode(true);
    }
  }, []);

  // host/cohost 可开管麦面板
  const canModerate = role === 'host' || role === 'cohost';

  // PRD §6.12：进房后保持屏幕常亮，防止手机息屏断开音频
  useWakeLock(entered);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/livekit/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId }),
    })
      .then(async (r) => {
        if (!r.ok) {
          const e = await r.json().catch(() => ({}));
          throw new Error(e.error ?? 'token 获取失败');
        }
        return r.json();
      })
      .then((d) => {
        if (!cancelled) {
          setToken(d.token);
          setUrl(d.url);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'token 获取失败');
      });
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  if (error) {
    return (
      <main className="relative flex min-h-[100dvh] flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sm text-rose/80">{error}</p>
        <button
          onClick={() => location.reload()}
          className="rounded-full border border-white/8 px-5 py-2 text-xs font-light text-cream-100"
        >
          重试
        </button>
      </main>
    );
  }

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden">
      {/* 房间背景图 + 朦胧调暗覆盖（暧昧·高级感核心）*/}
      {backgroundUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={backgroundUrl}
            alt=""
            className="fixed inset-0 h-full w-full object-cover"
          />
          {/* 暗化 + 朦胧 */}
          <div className="room-overlay" />
        </>
      ) : (
        /* 无背景图时的暧昧深空渐变 */
        <div className="pointer-events-none fixed inset-0">
          <div className="absolute top-1/4 left-1/3 h-[600px] w-[600px] rounded-full bg-rose/6 blur-[140px]" />
          <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-gold/4 blur-[120px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-ink-950/80 via-ink-900/60 to-ink-950/90" />
        </div>
      )}

      {/* 顶部信息栏（玻璃）*/}
      <div className="absolute left-0 right-0 top-0 z-30 flex items-center justify-between p-4">
        <div className="glass flex items-center gap-2 rounded-full px-4 py-1.5">
          <span className="text-sm font-light text-cream-50">{roomName}</span>
          {role === 'host' && <span className="text-[10px] font-medium tracking-wider text-rose-light">{t('host')}</span>}
          {role === 'cohost' && <span className="text-[10px] font-medium tracking-wider text-gold/80">{t('cohost')}</span>}
          {recordingEnabled && (
            <span className="flex items-center gap-1 rounded-full bg-rose/15 px-2 py-0.5 text-[9px] font-medium text-rose-light">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose" />
              {t('recording')}
            </span>
          )}
        </div>
        <Link
          href="/rooms"
          className="glass rounded-full px-4 py-1.5 text-xs font-light text-cream-200 transition-colors hover:text-cream-50"
        >
          {tc('leave')}
        </Link>
      </div>

      {/* 主内容 */}
      {token ? (
        <LiveKitRoom
          token={token}
          serverUrl={url}
          connect={entered}
          audio={false}
          video={false}
        >
          {/* 场景：低端走 2D Lite，其余走 3D (PRD §6.12) */}
          <div className="absolute inset-0 z-10 md:right-[340px]" style={{ height: '100%' }}>
            {liteMode ? <LiteGrid /> : <PartyScene />}
          </div>

          <RoomAudioRenderer />
          <RoomEventHandlers isHost={isHost} />
          <HostMicSetup isHost={isHost} />

          {/* PRD §6.3 置顶栏 */}
          <PinnedBar roomId={roomId} />

          {/* PRD §6.3 Reactions 飘屏 */}
          <Reactions />

          {/* PRD §6.4 ActivityHost——可插拔房间活动 */}
          <ActivityHost roomId={roomId} selfId={userId} role={role} />

          {/* 底部麦控（玻璃浮岛）*/}
          <MicControls
            isHost={isHost}
            role={role}
            onOpenHostPanel={canModerate ? () => setHostPanelOpen(true) : undefined}
            onToggleChat={toggleChat}
          />

          {/* 桌面端：右侧聊天（玻璃）*/}
          <aside className="glass absolute right-0 top-0 z-20 hidden h-full w-[340px] flex-col border-l border-white/5 md:flex">
            <ChatPanel roomId={roomId} myRole={role} myUserId={userId} />
          </aside>

          {/* 移动端聊天抽屉 */}
          {chatOpen && (
            <div
              className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/60 backdrop-blur-sm md:hidden"
              onClick={toggleChat}
            >
              <div
                className="glass-strong flex h-[75dvh] w-full flex-col rounded-t-3xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* 拖拽指示器 */}
                <div className="flex justify-center pt-2 pb-1">
                  <div className="h-1 w-10 rounded-full bg-white/15" />
                </div>
                <div className="min-h-0 flex-1 overflow-hidden">
                  <ChatPanel roomId={roomId} myRole={role} myUserId={userId} />
                </div>
              </div>
            </div>
          )}

          {/* 房主/共主持管麦抽屉 */}
          {hostPanelOpen && (
            <div
              className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm"
              onClick={() => setHostPanelOpen(false)}
            >
              <div
                className="glass-strong h-full w-80 max-w-[85vw] overflow-y-auto p-5"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-sm font-medium tracking-wide text-cream-50">房间管理</h2>
                  <button
                    onClick={() => setHostPanelOpen(false)}
                    className="text-[11px] font-light text-cream-300"
                  >
                    关闭
                  </button>
                </div>
                <HostPanel roomId={roomId} myRole={role as 'host' | 'cohost'} hostId={hostId} cohostIds={cohostIds} recordingEnabled={recordingEnabled} />
                {/* PRD §6.6 在场成员列表 + 邀请链接 */}
                <div className="mt-5 border-t border-white/5 pt-4">
                  <PresenceList roomId={roomId} />
                </div>
              </div>
            </div>
          )}
        </LiveKitRoom>
      ) : (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <p className="text-sm font-light text-cream-300">{tc('loading')}</p>
        </div>
      )}

      {/* 进入房间浮层 */}
      {token && !entered && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-6 bg-ink-950/60 backdrop-blur-sm">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-light tracking-wide text-cream-50">{roomName}</h2>
            <p className="text-xs font-light text-cream-300">{t('enterHint')}</p>
          </div>
          {recordingEnabled && (
            <div className="glass rounded-2xl px-4 py-2 text-center">
              <p className="text-[11px] font-medium text-rose-light">🔴 {t('recordingActive')}</p>
              <p className="text-[10px] font-light text-cream-300/60">{t('recordingNotice')}</p>
            </div>
          )}
          <button
            onClick={() => setEntered(true)}
            className="btn-rose rounded-full px-8 py-3 text-sm font-medium tracking-wide text-white"
          >
            {t('enterRoom')}
          </button>
        </div>
      )}
    </main>
  );
}
