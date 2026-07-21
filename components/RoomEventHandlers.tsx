'use client';

import { useEffect, useRef } from 'react';
import {
  useDataChannel,
  useLocalParticipant,
  useLocalParticipantPermissions,
} from '@livekit/components-react';
import { useUI } from '@/lib/store';

interface Props {
  isHost: boolean;
}

// 用库自带的 hooks 承载举手与权限变更（PRD §10）：
// - useDataChannel 收/发 data（举手用 'raise_hand' topic）
// - useLocalParticipantPermissions 响应式返回 canPublish，本机据此自动开关麦
export function RoomEventHandlers({ isHost }: Props) {
  const addRaisedHand = useUI((s) => s.addRaisedHand);
  const setMicEnabled = useUI((s) => s.setMicEnabled);
  const { localParticipant } = useLocalParticipant();
  const permissions = useLocalParticipantPermissions();
  const decoder = new TextDecoder();

  // 房主端：收举手 data → 入列（去重由 store 负责）
  useDataChannel('raise_hand', (msg) => {
    if (!isHost) return;
    const from = msg.from;
    if (!from) return;
    let name = from.name ?? 'Guest';
    try {
      const parsed = JSON.parse(decoder.decode(msg.payload));
      if (typeof parsed?.name === 'string') name = parsed.name;
    } catch {
      // 非 JSON payload，用 participant.name 兜底
    }
    addRaisedHand({ identity: from.identity, name });
  });

  // 本机权限变更（grant/remove 触发）→ 自动开/关麦
  const prevCanPublish = useRef<boolean | undefined>(undefined);
  useEffect(() => {
    const canPublish = permissions?.canPublish;
    if (canPublish === undefined || canPublish === prevCanPublish.current) return;
    prevCanPublish.current = canPublish;
    localParticipant
      .setMicrophoneEnabled(canPublish)
      .then(() => setMicEnabled(canPublish))
      .catch(() => setMicEnabled(false));
  }, [permissions?.canPublish, localParticipant, setMicEnabled]);

  return null;
}
