'use client';

import { useEffect, useRef } from 'react';

// PRD §6.12：手机息屏后保持音频连接。
// 策略：
// 1. Screen Wake Lock API——防止屏幕自动熄灭（用户在房间内时）
// 2. 静音 audio 元素——iOS Safari 需要正在播放的 audio 才能保持后台运行
// 3. visibilitychange 监听——页面回到前台时重新获取 wake lock

export function useWakeLock(active: boolean) {
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!active) return;

    // 1. 创建静音 audio 保持后台运行（iOS 必需）
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
      audioRef.current.loop = true;
      audioRef.current.volume = 0;
      audioRef.current.play().catch(() => {});
    }

    // 2. 获取 Wake Lock
    async function acquireLock() {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as Navigator & { wakeLock: { request: (type: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock.request('screen');
        }
      } catch {
        // 浏览器不支持或用户拒绝——静默失败
      }
    }
    acquireLock();

    // 3. 页面从后台回来时重新获取
    function onVisible() {
      if (document.visibilityState === 'visible') {
        acquireLock();
      }
    }
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [active]);
}
