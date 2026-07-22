'use client';

import { useState } from 'react';

// PRD §6.11 订阅/内购按钮——调用 Stripe Checkout。
interface Props {
  type: 'pro_monthly';
  sku?: string;
  label: string;
}

export function SubscribeButton({ type, sku, label }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkout() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, sku }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '支付初始化失败');
        return;
      }
      // 跳转到 Stripe Checkout
      window.location.href = data.url;
    } catch {
      setError('网络错误');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        onClick={checkout}
        disabled={busy}
        className="btn-rose w-full rounded-2xl py-3 text-sm font-medium text-white disabled:opacity-40"
      >
        {busy ? '跳转中…' : label}
      </button>
      {error && <p className="mt-2 text-[11px] text-rose/70">{error}</p>}
      <p className="mt-2 text-[10px] font-light text-cream-300/40">
        可随时取消 · 明码标价 · 无抽卡/盲盒
      </p>
    </div>
  );
}
