'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { AvatarPicker } from '@/components/AvatarPicker';
import { InterestPicker } from '@/components/InterestPicker';
import { randomSeed, type AvatarConfig } from '@/lib/avatar';

export default function OnboardingPage() {
  const router = useRouter();
  const t = useTranslations('onboarding');
  const tc = useTranslations('common');
  const [supabase] = useState(() => createClient());

  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [style, setStyle] = useState('thumbs');
  const [seed, setSeed] = useState('neo');
  const [avatarType, setAvatarType] = useState('dicebear');
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [birthYear, setBirthYear] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.replace('/login'); return; }
        setUserId(user.id);
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, avatar_style, avatar_seed, avatar_type, avatar_config, interests, birth_year, tos_accepted_at')
          .eq('id', user.id)
          .maybeSingle();
        if (profile) {
          setDisplayName(!profile.display_name || profile.display_name === 'Guest' ? '' : profile.display_name);
          setStyle(profile.avatar_style ?? 'thumbs');
          setSeed(profile.avatar_seed ?? randomSeed());
          setAvatarType(profile.avatar_type ?? 'dicebear');
          setAvatarConfig(profile.avatar_config ?? null);
          setInterests(profile.interests ?? []);
          if (profile.birth_year) setBirthYear(String(profile.birth_year));
          if (profile.tos_accepted_at) setAgreed(true);
        }
      } catch {
        setError('加载失败，请刷新重试');
      }
    })();
  }, [router, supabase]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    const name = displayName.trim().slice(0, 40) || 'Guest';
    setError(null);

    // 年龄校验
    const year = parseInt(birthYear, 10);
    if (!year || year < 1900 || year > currentYear) {
      setError('请输入有效的出生年份');
      return;
    }
    const age = currentYear - year;
    if (age < 13) {
      setError('很抱歉，NEOSOUL 仅面向 13 岁及以上用户');
      return;
    }
    if (!agreed) {
      setError('请阅读并同意服务条款');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: name,
        avatar_style: style,
        avatar_seed: seed,
        avatar_type: avatarType,
        avatar_config: avatarConfig,
        interests,
        birth_year: year,
        is_minor: age < 18,
        tos_accepted_at: new Date().toISOString(),
      })
      .eq('id', userId);
    setSaving(false);
    if (error) { setError(error.message); return; }
    router.replace('/discover');
  }

  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center px-6 py-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 h-[400px] w-[400px] rounded-full bg-rose/8 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 h-[300px] w-[300px] rounded-full bg-gold/5 blur-[100px]" />
      </div>

      <form onSubmit={handleSave} className="relative z-10 w-full max-w-[340px] animate-fade-in space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-light tracking-wide text-cream-50">{t('title')}</h1>
          <p className="mt-2 text-xs font-light tracking-wider text-cream-300">{t('subtitle')}</p>
        </div>

        <div className="glass rounded-3xl p-7">
          <AvatarPicker
            style={style}
            seed={seed}
            avatarType={avatarType}
            userId={userId!}
            avatarConfig={avatarConfig}
            onChange={(next) => {
              setStyle(next.style);
              setSeed(next.seed);
              setAvatarType(next.avatarType);
              if (next.avatarConfig !== undefined) setAvatarConfig(next.avatarConfig);
            }}
          />

          <div className="mt-6">
            <label className="mb-1.5 block text-[11px] font-medium tracking-wider text-cream-300">{t('nickname')}</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={40}
              className="input-warm w-full rounded-2xl px-4 py-3 text-sm text-cream-50 outline-none placeholder:text-cream-300/40" placeholder="给自己起个名字" />
          </div>

          <div className="mt-5">
            <InterestPicker selected={interests} onChange={setInterests} />
          </div>

          {/* 出生年份 + 同意（一次完成，不再弹 ConsentGate）*/}
          <div className="mt-5">
            <label className="mb-1.5 block text-[11px] font-medium tracking-wider text-cream-300">出生年份</label>
            <input type="number" min={1900} max={currentYear} value={birthYear}
              onChange={(e) => setBirthYear(e.target.value)}
              className="input-warm w-full rounded-2xl px-4 py-3 text-sm text-cream-50 outline-none placeholder:text-cream-300/40" placeholder="例如 2000" />
            <p className="mt-1 text-[10px] text-cream-300/50">用于年龄分层保护，不会公开。</p>
          </div>

          <label className="mt-4 flex items-start gap-2.5 cursor-pointer">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#c47b78]" />
            <span className="text-[12px] font-light leading-relaxed text-cream-200">
              我已阅读并同意
              <a href="/legal/terms" className="text-rose-light underline" target="_blank" rel="noopener">服务条款</a>、
              <a href="/legal/privacy" className="text-rose-light underline" target="_blank" rel="noopener">隐私政策</a>和
              <a href="/legal/guidelines" className="text-rose-light underline" target="_blank" rel="noopener">社区规范</a>
            </span>
          </label>

          {error && <p className="mt-4 text-xs text-rose/80">{error}</p>}
        </div>

        <button type="submit" disabled={saving || !agreed || !birthYear}
          className="btn-rose w-full rounded-2xl py-3.5 text-sm font-medium tracking-wide text-white disabled:opacity-40">
          {saving ? tc('loading') : t('enter')}
        </button>
      </form>
    </main>
  );
}
