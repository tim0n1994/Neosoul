import { create } from 'zustand';

// PRD §13：只放 UI/瞬时状态。持久数据走 Supabase，语音状态走 LiveKit hooks。
interface RaisedHand {
  identity: string;
  name: string;
}

interface UIState {
  raisedHands: RaisedHand[]; // 房主端：举手队列
  addRaisedHand: (h: RaisedHand) => void; // 去重
  removeRaisedHand: (identity: string) => void;
  micEnabled: boolean;
  setMicEnabled: (v: boolean) => void;
  chatOpen: boolean;
  toggleChat: () => void; // 移动端抽屉
  // v2：录制状态提示
  recordingActive: boolean;
  setRecordingActive: (v: boolean) => void;
}

export const useUI = create<UIState>((set) => ({
  raisedHands: [],
  addRaisedHand: (h) =>
    set((s) =>
      s.raisedHands.some((r) => r.identity === h.identity)
        ? s
        : { raisedHands: [...s.raisedHands, h] },
    ),
  removeRaisedHand: (identity) =>
    set((s) => ({ raisedHands: s.raisedHands.filter((r) => r.identity !== identity) })),
  micEnabled: false,
  setMicEnabled: (micEnabled) => set({ micEnabled }),
  chatOpen: false,
  toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),
  recordingActive: false,
  setRecordingActive: (recordingActive) => set({ recordingActive }),
}));
