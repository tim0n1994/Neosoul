'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState<null | 'login' | 'signup' | 'anon'>(null);
  const [error, setError] = useState<string | null>(null);

  async function finishAuth() {
    // 交回落地页判定 onboarding 状态后再分流（PRD §8）
    router.replace('/');
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading('login');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(null);
    if (error) {
      setError(error.message);
      return;
    }
    await finishAuth();
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading('signup');
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(null);
    if (error) {
      setError(error.message);
      return;
    }
    // 若开启邮箱确认，需提示查收邮件；否则直接分流。
    if (data.user && data.session) {
      await finishAuth();
    } else {
      setError('注册成功，请查收邮件完成确认后再登录。');
    }
  }

  async function handleAnonymous() {
    setError(null);
    setLoading('anon');
    const { error } = await supabase.auth.signInAnonymously();
    setLoading(null);
    if (error) {
      setError(error.message);
      return;
    }
    await finishAuth();
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
        <div className="mb-8 text-center">
          <h1 className="bg-gradient-to-r from-brand-from to-brand-to bg-clip-text text-3xl font-bold text-transparent">
            Neosoul
          </h1>
          <p className="mt-2 text-sm text-white/50">一场漂浮在深空里的语音派对</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs text-white/60">邮箱</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-brand-to"
              placeholder="you@example.com"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-white/60">密码</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-brand-to"
              placeholder="••••••••"
            />
          </label>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading !== null}
            className="w-full rounded-xl bg-gradient-to-r from-brand-from to-brand-to py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading === 'login' ? '登录中…' : '登录'}
          </button>
        </form>

        <div className="mt-3 space-y-3">
          <button
            type="button"
            onClick={handleSignUp}
            disabled={loading !== null}
            className="w-full rounded-xl border border-white/10 py-3 text-sm text-white/80 disabled:opacity-50"
          >
            {loading === 'signup' ? '注册中…' : '注册'}
          </button>
          <button
            type="button"
            onClick={handleAnonymous}
            disabled={loading !== null}
            className="w-full rounded-xl py-3 text-sm text-white/40 hover:text-white/70 disabled:opacity-50"
          >
            {loading === 'anon' ? '进入中…' : '先随便逛逛（匿名进入）'}
          </button>
        </div>
      </div>
    </main>
  );
}
