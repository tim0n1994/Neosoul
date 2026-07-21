'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AvatarPicker } from '@/components/AvatarPicker';
import { randomSeed } from '@/lib/avatar';

export default function OnboardingPage() {
  const router = useRouter();
  // 固定 supabase 实例，避免每次渲染新建导致 useEffect 无限重跑
  const [supabase] = useState(() => createClient());

  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [style, setStyle] = useState('thumbs');
  const [seed, setSeed] = useState('neo');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.replace('/login');
          return;
        }
        setUserId(user.id);
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, avatar_style, avatar_seed')
          .eq('id', user.id)
          .maybeSingle();
        if (profile) {
          setDisplayName(!profile.display_name || profile.display_name === 'Guest' ? '' : profile.display_name);
          setStyle(profile.avatar_style ?? 'thumbs');
          setSeed(profile.avatar_seed ?? randomSeed());
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
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: name, avatar_style: style, avatar_seed: seed })
      .eq('id', userId);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace('/rooms');
  }

  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center px-6 py-12">
      {/* 暧昧背景光晕 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 h-[400px] w-[400px] rounded-full bg-rose/8 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 h-[300px] w-[300px] rounded-full bg-gold/5 blur-[100px]" />
      </div>

      <form
        onSubmit={handleSave}
        className="relative z-10 w-full max-w-[340px] animate-fade-in space-y-6"
      >
        <div className="text-center">
          <h1 className="text-2xl font-light tracking-wide text-cream-50">完善你的形象</h1>
          <p className="mt-2 text-xs font-light tracking-wider text-cream-300">
            选一个属于你的头像
          </p>
        </div>

        <div className="glass rounded-3xl p-7">
          <AvatarPicker
            style={style}
            seed={seed}
            onChange={(next) => {
              setStyle(next.style);
              setSeed(next.seed);
            }}
          />

          <div className="mt-6">
            <label className="mb-1.5 block text-[11px] font-medium tracking-wider text-cream-300">
              昵称
            </label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={40}
              className="input-warm w-full rounded-2xl px-4 py-3 text-sm text-cream-50 outline-none placeholder:text-cream-300/40"
              placeholder="给自己起个名字"
            />
          </div>

          {error && <p className="mt-4 text-xs text-rose/80">{error}</p>}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="btn-rose w-full rounded-2xl py-3.5 text-sm font-medium tracking-wide text-white"
        >
          {saving ? '保存中…' : '进入 Neosoul'}
        </button>
      </form>
    </main>
  );
}
