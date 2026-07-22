'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const [supabase] = useState(() => createClient());

  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: window.location.origin + '/',
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  async function resend() {
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: window.location.origin + '/',
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
  }

  // PRD §6.1 OAuth 登录（Google / Apple / Discord）
  async function oauthLogin(provider: 'google' | 'apple' | 'discord') {
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin + '/' },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    }
  }

  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center px-6 py-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/4 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-rose/8 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[300px] rounded-full bg-gold/6 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-[340px] animate-fade-in space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-light tracking-[0.15em] text-cream-50">{tc('appName')}</h1>
          <p className="mt-3 text-xs font-light tracking-wider text-cream-300">
            {tc('tagline')}
          </p>
        </div>

        <div className="glass rounded-3xl p-7">
          {!sent ? (
            <>
              <form onSubmit={sendMagicLink} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[11px] font-medium tracking-wider text-cream-300">
                    {t('email')}
                  </label>
                  <input
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-warm w-full rounded-2xl px-4 py-3 text-sm text-cream-50 outline-none placeholder:text-cream-300/40"
                    placeholder="you@example.com"
                  />
                </div>
                {error && <p className="text-xs leading-relaxed text-rose/80">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-rose w-full rounded-2xl py-3 text-sm font-medium tracking-wide text-white"
                >
                  {loading ? tc('loading') : t('sendCode')}
                </button>
              </form>

              {/* OAuth 分隔线 + 按钮 PRD §6.1 */}
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/5" />
                <span className="text-[10px] font-light tracking-wider text-cream-300/40">或</span>
                <div className="h-px flex-1 bg-white/5" />
              </div>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => oauthLogin('google')}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/8 bg-white/3 py-3 text-sm font-light text-cream-100 transition-colors hover:bg-white/5 disabled:opacity-40"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  Google
                </button>
                <button
                  type="button"
                  onClick={() => oauthLogin('apple')}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/8 bg-white/3 py-3 text-sm font-light text-cream-100 transition-colors hover:bg-white/5 disabled:opacity-40"
                >
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                  Apple
                </button>
                <button
                  type="button"
                  onClick={() => oauthLogin('discord')}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/8 bg-white/3 py-3 text-sm font-light text-cream-100 transition-colors hover:bg-white/5 disabled:opacity-40"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.79 19.79 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                  Discord
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-5 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose/10">
                <span className="text-2xl">📧</span>
              </div>
              <div>
                <p className="text-sm font-light text-cream-100">验证邮件已发送至</p>
                <p className="mt-1 text-base font-medium text-cream-50">{email}</p>
              </div>
              <p className="text-xs leading-relaxed text-cream-300/60">
                点击邮件中的「确认注册」按钮即可登录。<br />
                链接将跳转回 NEOSOUL 完成验证。
              </p>
              {error && <p className="text-xs text-rose/80">{error}</p>}
              <button
                type="button"
                onClick={resend}
                disabled={loading}
                className="text-[11px] font-light text-cream-300 transition-colors hover:text-cream-100 disabled:opacity-40"
              >
                {loading ? '重新发送中…' : '重新发送'}
              </button>
              <button
                type="button"
                onClick={() => { setSent(false); setError(null); }}
                className="block w-full text-[11px] font-light text-cream-300/50 transition-colors hover:text-cream-100"
              >
                换一个邮箱
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
