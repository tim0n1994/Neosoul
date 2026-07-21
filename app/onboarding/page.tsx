'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AvatarPicker } from '@/components/AvatarPicker';
import { randomSeed } from '@/lib/avatar';

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [style, setStyle] = useState('thumbs');
  const [seed, setSeed] = useState('neo');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
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
        setDisplayName(profile.display_name === 'Guest' ? '' : profile.display_name);
        setStyle(profile.avatar_style ?? 'thumbs');
        setSeed(profile.avatar_seed ?? randomSeed());
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
      .update({
        display_name: name,
        avatar_style: style,
        avatar_seed: seed,
      })
      .eq('id', userId);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace('/rooms');
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <form
        onSubmit={handleSave}
        className="w-full max-w-sm space-y-6 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl"
      >
        <h1 className="text-center text-2xl font-bold">完善你的形象</h1>

        <AvatarPicker
          style={style}
          seed={seed}
          onChange={(next) => {
            setStyle(next.style);
            setSeed(next.seed);
          }}
        />

        <label className="block">
          <span className="mb-1 block text-xs text-white/60">昵称</span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={40}
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-brand-to"
            placeholder="给自己起个名字"
          />
        </label>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-gradient-to-r from-brand-from to-brand-to py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? '保存中…' : '进入 Neosoul'}
        </button>
      </form>
    </main>
  );
}
