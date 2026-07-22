'use client';

import { useRef, useState } from 'react';
import { AVATAR_STYLES, avatarDataUri, randomSeed } from '@/lib/avatar';
import { createClient } from '@/lib/supabase/client';

interface Props {
  style: string;
  seed: string;
  avatarType: string;
  userId: string;
  onChange: (next: { style: string; seed: string; avatarType: string }) => void;
}

export function AvatarPicker({ style, seed, avatarType, userId, onChange }: Props) {
  const [mode, setMode] = useState<'dicebear' | 'upload'>(avatarType === 'custom' ? 'upload' : 'dicebear');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('仅支持图片'); return; }
    if (file.size > 2 * 1024 * 1024) { setError('图片不能超过 2MB'); return; }
    setError(null);
    setUploading(true);
    const supabase = createClient();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${userId}/${Date.now()}-${safeName}`;
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { contentType: file.type });
    setUploading(false);
    if (upErr) { setError('上传失败：' + upErr.message); return; }
    const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
    onChange({ style, seed: pub.publicUrl, avatarType: 'custom' });
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-center gap-1.5">
        <button type="button" onClick={() => { setMode('dicebear'); onChange({ style, seed: seed.startsWith('http') ? randomSeed() : seed, avatarType: 'dicebear' }); }} className={'rounded-full px-3 py-1.5 text-[11px] font-light tracking-wide transition-all ' + (mode === 'dicebear' ? 'bg-rose/15 text-rose-light ring-1 ring-rose/20' : 'border border-white/5 text-cream-300')}>DiceBear</button>
        <button type="button" onClick={() => setMode('upload')} className={'rounded-full px-3 py-1.5 text-[11px] font-light tracking-wide transition-all ' + (mode === 'upload' ? 'bg-rose/15 text-rose-light ring-1 ring-rose/20' : 'border border-white/5 text-cream-300')}>上传头像</button>
      </div>
      <div className="flex flex-col items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatarType === 'custom' && seed.startsWith('http') ? seed : avatarDataUri(style, seed)} width={96} height={96} alt="头像预览" className="rounded-2xl border border-white/8 shadow-[0_8px_40px_-8px_rgba(196,123,120,0.2)]" />
        {mode === 'dicebear' ? (
          <button type="button" onClick={() => onChange({ style, seed: randomSeed(), avatarType: 'dicebear' })} className="rounded-full border border-white/8 px-4 py-1.5 text-[11px] font-light tracking-wider text-cream-200 transition-colors hover:border-rose/20 hover:text-cream-50">🎲 换一个</button>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="rounded-full border border-white/8 px-4 py-1.5 text-[11px] font-light tracking-wider text-cream-200 transition-colors hover:border-rose/20 hover:text-cream-50 disabled:opacity-40">{uploading ? '上传中…' : '选择图片'}</button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </div>
        )}
      </div>
      {error && <p className="text-center text-xs text-rose/80">{error}</p>}
      {mode === 'dicebear' && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {AVATAR_STYLES.map((s) => (
            <button key={s} type="button" onClick={() => onChange({ style: s, seed, avatarType: 'dicebear' })} className={'rounded-full px-3 py-1.5 text-[11px] font-light tracking-wide transition-all ' + (style === s ? 'bg-rose/15 text-rose-light ring-1 ring-rose/20' : 'border border-white/5 text-cream-300 hover:border-white/10 hover:text-cream-100')}>{s}</button>
          ))}
        </div>
      )}
    </div>
  );
}
