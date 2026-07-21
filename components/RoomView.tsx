'use client';

import { useEffect, useRef, useState } from 'react';
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
import { RoomEventHandlers } from '@/components/RoomEventHandlers';
import { useUI } from '@/lib/store';

interface Props {
  roomId: string;
  isHost: boolean;
}

// 房主连上后自动开麦（token 已带 canPublish=true）。
function HostMicSetup({ isHost }: { isHost: boolean }) {
  const connectionState = useConnectionState();
  const { localParticipant } = useLocalParticipant();
  const setMicEnabled = useUI((s) => s.setMicEnabled);
  const done = useRef(false);

  useEffect(() => {
    if (
      connectionState === ConnectionState.Connected &&
      isHost &&
      !done.current
    ) {
      done.current = true;
      localParticipant
        .setMicrophoneEnabled(true)
        .then(() => setMicEnabled(true))
        .catch(() => {
          /* 浏览器拒绝麦克风权限：UI 仍显示未开麦（PRD §16） */
        });
    }
  }, [connectionState, isHost, localParticipant, setMicEnabled]);

  return null;
}

export function RoomView({ roomId, isHost }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  const [entered, setEntered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hostPanelOpen, setHostPanelOpen] = useState(false);
  const chatOpen = useUI((s) => s.chatOpen);
  const toggleChat = useUI((s) => s.toggleChat);

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

  // 移动端音频自动播放限制：需一次用户手势才连接（PRD §16）
  if (error) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-red-400">{error}</p>
        <button
          onClick={() => location.reload()}
          className="rounded-xl border border-white/10 px-4 py-2 text-sm"
        >
          重试
        </button>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-white/40">
        连接中…
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh">
      {/* 3D 主视觉（桌面占满，聊天为右侧栏；移动端全屏） */}
      <div className="absolute inset-0 md:right-80">
        <PartyScene />
      </div>

      <LiveKitRoom
        token={token}
        serverUrl={url}
        connect={entered}
        audio={false}
        video={false}
      >
        <RoomAudioRenderer />
        <RoomEventHandlers isHost={isHost} />
        <HostMicSetup isHost={isHost} />
        <MicControls
          isHost={isHost}
          onOpenHostPanel={isHost ? () => setHostPanelOpen(true) : undefined}
          onToggleChat={toggleChat}
        />
      </LiveKitRoom>

      {/* 桌面端：右侧聊天栏 */}
      <aside className="absolute right-0 top-0 z-20 hidden h-full w-80 border-l border-white/10 bg-black/40 md:block">
        <ChatPanel roomId={roomId} />
      </aside>

      {/* 移动端：聊天抽屉 */}
      {chatOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 md:hidden"
          onClick={toggleChat}
        >
          <div
            className="h-[70vh] w-full border-t border-white/10 bg-[#0a0a12]"
            onClick={(e) => e.stopPropagation()}
          >
            <ChatPanel roomId={roomId} />
          </div>
        </div>
      )}

      {/* 房主管麦抽屉（PRD §8.4） */}
      {hostPanelOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/50"
          onClick={() => setHostPanelOpen(false)}
        >
          <div
            className="h-full w-80 max-w-[85vw] overflow-y-auto border-l border-white/10 bg-[#0a0a12] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold">房间管理</h2>
              <button
                onClick={() => setHostPanelOpen(false)}
                className="text-sm text-white/40"
              >
                关闭
              </button>
            </div>
            <HostPanel roomId={roomId} />
          </div>
        </div>
      )}

      {!entered && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-black/70 p-6 text-center">
          <p className="text-white/70">点击进入房间（需要麦克风权限）</p>
          <button
            onClick={() => setEntered(true)}
            className="rounded-xl bg-gradient-to-r from-brand-from to-brand-to px-6 py-3 text-sm font-semibold text-white"
          >
            进入房间
          </button>
        </div>
      )}
    </div>
  );
}
