'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AvatarPicker } from '@/components/AvatarPicker';
import { InterestPicker } from '@/components/InterestPicker';
import { randomSeed, type AvatarConfig } from '@/lib/avatar';

interface Props {
  userId: string;
  initial: {
    display_name: string;
    avatar_style: string;
    avatar_seed: string;
    avatar_type: string;
    avatar_config: AvatarConfig | null;
    interests: string[];
  };
}

export function ProfileEditor({ userId, initial }: Props) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [displayName, setDisplayName] = useState(initial.display_name);
  const [style, setStyle] = useState(initial.avatar_style);
  const [seed, setSeed] = useState(initial.avatar_seed);
  const [avatarType, setAvatarType] = useState(initial.avatar_type);
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig | null>(initial.avatar_config);
  const [interests, setInterests] = useState<string[]>(initial.interests);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const name = displayName.trim().slice(0, 40) || 'Guest';
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: name,
        avatar_style: style,
        avatar_seed: seed,
        avatar_type: avatarType,
        avatar_config: avatarConfig,
        interests,
      })
      .eq('id', userId);
    setSaving(false);
    if (error) { setError(error.message); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  return (
    <form onSubmit={handleSave} className="glass rounded-3xl p-6">
      <h2 className="mb-4 text-base font-medium text-cream-50">编辑资料</h2>

      <AvatarPicker
        style={style}
        seed={seed}
        avatarType={avatarType}
        userId={userId}
        avatarConfig={avatarConfig}
        onChange={(next) => {
          setStyle(next.style);
          setSeed(next.seed);
          setAvatarType(next.avatarType);
          if (next.avatarConfig !== undefined) setAvatarConfig(next.avatarConfig);
        }}
      />

      <div className="mt-5">
        <label className="mb-1.5 block text-[11px] font-medium tracking-wider text-cream-300">昵称</label>
        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={40}
          className="input-warm w-full rounded-2xl px-4 py-3 text-sm text-cream-50 outline-none placeholder:text-cream-300/40" placeholder="给自己起个名字" />
      </div>

      <div className="mt-5">
        <InterestPicker selected={interests} onChange={setInterests} />
      </div>

      {error && <p className="mt-4 text-xs text-rose/80">{error}</p>}
      {saved && <p className="mt-4 text-xs text-green-300/80">✓ 已保存</p>}

      <button type="submit" disabled={saving}
        className="btn-rose mt-5 w-full rounded-2xl py-3 text-sm font-medium tracking-wide text-white disabled:opacity-40">
        {saving ? '保存中…' : '保存资料'}
      </button>
    </form>
  );
}
