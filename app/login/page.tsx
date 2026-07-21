'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState<null | 'login' | 'signup' | 'anon'>(null);
  const [error, setError] = useState<string | null>(null);

  async function finishAuth() {
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
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center px-6 py-12">
      {/* 暧昧背景光晕 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/4 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-rose/8 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[300px] rounded-full bg-gold/6 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-[340px] animate-fade-in space-y-8">
        {/* 品牌 */}
        <div className="text-center">
          <h1 className="text-4xl font-light tracking-[0.15em] text-cream-50">
            Neosoul
          </h1>
          <p className="mt-3 text-xs font-light tracking-wider text-cream-300">
            一场漂浮在暧昧深空里的语音派对
          </p>
        </div>

        {/* 表单 */}
        <div className="glass rounded-3xl p-7">
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[11px] font-medium tracking-wider text-cream-300">
                邮箱
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-warm w-full rounded-2xl px-4 py-3 text-sm text-cream-50 outline-none placeholder:text-cream-300/40"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-medium tracking-wider text-cream-300">
                密码
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-warm w-full rounded-2xl px-4 py-3 text-sm text-cream-50 outline-none placeholder:text-cream-300/40"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-xs leading-relaxed text-rose/80">{error}</p>
            )}

            <button
              type="button"
              onClick={handleLogin}
              disabled={loading !== null}
              className="btn-rose w-full rounded-2xl py-3 text-sm font-medium tracking-wide text-white"
            >
              {loading === 'login' ? '正在连接…' : '登录'}
            </button>
          </div>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/5" />
            <span className="text-[10px] tracking-wider text-cream-300/50">或</span>
            <div className="h-px flex-1 bg-white/5" />
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={handleSignUp}
              disabled={loading !== null}
              className="w-full rounded-2xl border border-white/8 py-3 text-sm font-light tracking-wide text-cream-100 transition-colors hover:border-rose/20 hover:text-cream-50 disabled:opacity-40"
            >
              {loading === 'signup' ? '注册中…' : '注册新账号'}
            </button>
            <button
              type="button"
              onClick={handleAnonymous}
              disabled={loading !== null}
              className="w-full rounded-2xl py-3 text-sm font-light tracking-wide text-cream-300 transition-colors hover:text-cream-100 disabled:opacity-40"
            >
              {loading === 'anon' ? '进入中…' : '先随便逛逛'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
