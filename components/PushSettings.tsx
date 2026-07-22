'use client';

import { useState, useEffect } from 'react';
import { registerPush, getPushStatus, type PushStatus } from '@/lib/push';

// PRD §6.12 通知设置——Web Push 开关。
export function PushSettings() {
  const [status, setStatus] = useState<PushStatus>('unsupported');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getPushStatus().then(setStatus);
  }, []);

  async function handleEnable() {
    setBusy(true);
    const result = await registerPush();
    setBusy(false);
    if (result.ok) {
      setStatus('subscribed');
    } else if (result.error === 'denied') {
      setStatus('denied');
    }
  }

  if (status === 'unsupported') {
    return (
      <p className="text-[12px] font-light text-cream-300/50">
        当前浏览器不支持推送通知
      </p>
    );
  }

  if (status === 'denied') {
    return (
      <p className="text-[12px] font-light text-rose/60">
        通知权限已被拒绝，请在浏览器设置中开启
      </p>
    );
  }

  if (status === 'subscribed') {
    return (
      <div className="flex items-center gap-2 text-[12px] font-light text-green-300/80">
        <span>✓</span>
        <span>推送通知已开启</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleEnable}
      disabled={busy}
      className="btn-rose rounded-2xl px-5 py-2.5 text-[12px] font-medium text-white disabled:opacity-40"
    >
      {busy ? '开启中…' : '开启推送通知'}
    </button>
  );
}
