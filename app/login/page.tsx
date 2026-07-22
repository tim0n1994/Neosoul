'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startCooldown() {
    setCooldown(60);
    const timer = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setStep('otp');
    startCooldown();
  }

  async function verifyOtpCode(e: React.FormEvent) {
    e.preventDefault();
    if (token.trim().length !== 6) return;
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: token.trim(),
      type: 'email',
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace('/');
  }

  async function resend() {
    if (cooldown > 0) return;
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    startCooldown();
  }

  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center px-6 py-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/4 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-rose/8 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[300px] rounded-full bg-gold/6 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-[340px] animate-fade-in space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-light tracking-[0.15em] text-cream-50">Neosoul</h1>
          <p className="mt-3 text-xs font-light tracking-wider text-cream-300">
            一场漂浮在暧昧深空里的语音派对
          </p>
        </div>

        <div className="glass rounded-3xl p-7">
          {step === 'email' ? (
            <form onSubmit={sendOtp} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-medium tracking-wider text-cream-300">
                  邮箱
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
                {loading ? '发送中…' : '发送验证码'}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyOtpCode} className="space-y-4">
              <div className="text-center">
                <p className="text-xs text-cream-300">验证码已发送至</p>
                <p className="text-sm font-medium text-cream-50">{email}</p>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-medium tracking-wider text-cream-300">
                  验证码
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={6}
                  inputMode="numeric"
                  value={token}
                  onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
                  className="input-warm w-full rounded-2xl px-4 py-3 text-center text-lg tracking-[0.5em] text-cream-50 outline-none placeholder:text-cream-300/40"
                  placeholder="000000"
                />
              </div>
              {error && <p className="text-xs leading-relaxed text-rose/80">{error}</p>}
              <button
                type="submit"
                disabled={loading || token.length !== 6}
                className="btn-rose w-full rounded-2xl py-3 text-sm font-medium tracking-wide text-white"
              >
                {loading ? '验证中…' : '登录'}
              </button>
              <div className="flex justify-between pt-1">
                <button
                  type="button"
                  onClick={resend}
                  disabled={cooldown > 0}
                  className="text-[11px] font-light text-cream-300 transition-colors hover:text-cream-100 disabled:opacity-40"
                >
                  {cooldown > 0 ? `${cooldown}s 后可重发` : '重新发送'}
                </button>
                <button
                  type="button"
                  onClick={() => { setStep('email'); setToken(''); setError(null); }}
                  className="text-[11px] font-light text-cream-300 transition-colors hover:text-cream-100"
                >
                  换一个邮箱
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
