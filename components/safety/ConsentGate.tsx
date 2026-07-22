'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// PRD §6.1 [红线]：同意门——首次登录必须勾选同意 ToS + 隐私政策 + 社区规范。
// PRD §6.1 [红线]：未成年门——注册时收集出生日期。<18 标记 is_minor，进入保护模式。<13 拒绝。
export function ConsentGate({ userId }: { userId: string }) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [birthYear, setBirthYear] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();

  async function handleAccept() {
    if (!agreed) {
      setError('请先阅读并同意服务条款');
      return;
    }
    const year = parseInt(birthYear, 10);
    if (!year || year < 1900 || year > currentYear) {
      setError('请输入有效的出生年份');
      return;
    }

    const age = currentYear - year;
    // PRD §6.1：<13 直接拒绝
    if (age < 13) {
      setError('很抱歉，NEOSOUL 仅面向 13 岁及以上用户');
      return;
    }

    const isMinor = age < 18;

    setSaving(true);
    const { error: dbError } = await supabase
      .from('profiles')
      .update({
        birth_year: year,
        is_minor: isMinor,
        tos_accepted_at: new Date().toISOString(),
      })
      .eq('id', userId);
    setSaving(false);

    if (dbError) {
      setError(dbError.message);
      return;
    }

    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/90 backdrop-blur-md">
      <div className="glass-strong w-full max-w-md space-y-5 rounded-3xl p-7">
        <div className="text-center">
          <h2 className="text-lg font-light text-cream-50">欢迎使用 NEOSOUL</h2>
          <p className="mt-1 text-[11px] text-cream-300/60">
            请先完成以下步骤
          </p>
        </div>

        {/* 出生年份（未成年门） */}
        <div>
          <label className="mb-1.5 block text-[11px] font-medium tracking-wider text-cream-300">
            你的出生年份
          </label>
          <input
            type="number"
            min={1900}
            max={currentYear}
            value={birthYear}
            onChange={(e) => setBirthYear(e.target.value)}
            placeholder="例如 2000"
            className="input-warm w-full rounded-2xl px-4 py-3 text-sm text-cream-50 outline-none placeholder:text-cream-300/40"
          />
          <p className="mt-1 text-[10px] text-cream-300/50">
            用于年龄分层保护。未满 18 岁将启用未成年保护模式。
          </p>
        </div>

        {/* 同意条款 */}
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[#c47b78]"
          />
          <span className="text-[12px] font-light leading-relaxed text-cream-200">
            我已阅读并同意
            <a href="/legal/terms" className="text-rose-light underline" target="_blank" rel="noopener">服务条款</a>、
            <a href="/legal/privacy" className="text-rose-light underline" target="_blank" rel="noopener">隐私政策</a>
            和
            <a href="/legal/guidelines" className="text-rose-light underline" target="_blank" rel="noopener">社区规范</a>。
          </span>
        </label>

        {error && <p className="text-xs text-rose/80">{error}</p>}

        <button
          onClick={handleAccept}
          disabled={saving || !agreed || !birthYear}
          className="btn-rose w-full rounded-2xl py-3.5 text-sm font-medium text-white disabled:opacity-30"
        >
          {saving ? '保存中…' : '同意并继续'}
        </button>
      </div>
    </div>
  );
}
