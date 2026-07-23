'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function PasswordChanger() {
  const [supabase] = useState(() => createClient());
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (next.trim().length < 6) {
      setError('新密码至少 6 位');
      return;
    }
    if (next !== confirm) {
      setError('两次输入的密码不一致');
      return;
    }

    setLoading(true);

    // 先验证当前密码
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      setError('无法获取用户信息');
      setLoading(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: current,
    });
    if (signInError) {
      setError('当前密码不正确');
      setLoading(false);
      return;
    }

    // 更新密码
    const { error: updateError } = await supabase.auth.updateUser({ password: next.trim() });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(true);
    setCurrent('');
    setNext('');
    setConfirm('');
  }

  return (
    <form onSubmit={handleSubmit} className="glass rounded-3xl p-6">
      <h2 className="mb-4 text-base font-medium text-cream-50">修改密码</h2>
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-[11px] font-medium tracking-wider text-cream-300">当前密码</label>
          <input type="password" required value={current} onChange={(e) => setCurrent(e.target.value)}
            className="input-warm w-full rounded-2xl px-4 py-3 text-sm text-cream-50 outline-none placeholder:text-cream-300/40" placeholder="输入当前密码" />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-medium tracking-wider text-cream-300">新密码</label>
          <input type="password" required value={next} onChange={(e) => setNext(e.target.value)}
            className="input-warm w-full rounded-2xl px-4 py-3 text-sm text-cream-50 outline-none placeholder:text-cream-300/40" placeholder="至少 6 位" />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-medium tracking-wider text-cream-300">确认新密码</label>
          <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)}
            className="input-warm w-full rounded-2xl px-4 py-3 text-sm text-cream-50 outline-none placeholder:text-cream-300/40" placeholder="再次输入新密码" />
        </div>
        {error && <p className="text-xs text-rose/80">{error}</p>}
        {success && <p className="text-xs text-green-300/80">✓ 密码已更新</p>}
        <button type="submit" disabled={loading}
          className="btn-rose w-full rounded-2xl py-3 text-sm font-medium tracking-wide text-white disabled:opacity-40">
          {loading ? '更新中…' : '更新密码'}
        </button>
      </div>
    </form>
  );
}
