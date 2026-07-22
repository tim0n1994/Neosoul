'use client';

import { useRef, useState } from 'react';
import { AVATAR_STYLES, BG_COLORS, avatarDataUri, randomSeed, type AvatarConfig } from '@/lib/avatar';
import { createClient } from '@/lib/supabase/client';

interface Props {
  style: string;
  seed: string;
  avatarType: string;
  userId: string;
  avatarConfig?: AvatarConfig | null;
  onChange: (next: { style: string; seed: string; avatarType: string; avatarConfig?: AvatarConfig | null }) => void;
}

export function AvatarPicker({ style, seed, avatarType, userId, avatarConfig, onChange }: Props) {
  const [mode, setMode] = useState<'dicebear' | 'upload'>(avatarType === 'custom' ? 'upload' : 'dicebear');
  const [showCustomize, setShowCustomize] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const config: AvatarConfig = avatarConfig ?? {};

  // 捏脸配置变更
  function updateConfig(patch: Partial<AvatarConfig>) {
    const next = { ...config, ...patch };
    onChange({ style, seed, avatarType: 'dicebear', avatarConfig: next });
  }

  function toggleBgColor(color: string) {
    const current = config.backgroundColor ?? [];
    const next = current.includes(color)
      ? current.filter((c) => c !== color)
      : [...current, color];
    updateConfig({ backgroundColor: next.length ? next : undefined });
  }

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

  const previewSrc = avatarType === 'custom' && seed.startsWith('http')
    ? seed
    : avatarDataUri(style, seed, config);

  return (
    <div className="space-y-5">
      <div className="flex justify-center gap-1.5">
        <button type="button" onClick={() => { setMode('dicebear'); onChange({ style, seed: seed.startsWith('http') ? randomSeed() : seed, avatarType: 'dicebear', avatarConfig: config }); }} className={'rounded-full px-3 py-1.5 text-[11px] font-light tracking-wide transition-all ' + (mode === 'dicebear' ? 'bg-rose/15 text-rose-light ring-1 ring-rose/20' : 'border border-white/5 text-cream-300')}>DiceBear</button>
        <button type="button" onClick={() => setMode('upload')} className={'rounded-full px-3 py-1.5 text-[11px] font-light tracking-wide transition-all ' + (mode === 'upload' ? 'bg-rose/15 text-rose-light ring-1 ring-rose/20' : 'border border-white/5 text-cream-300')}>上传头像</button>
      </div>
      <div className="flex flex-col items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={previewSrc} width={96} height={96} alt="头像预览" className="border border-white/8 shadow-[0_8px_40px_-8px_rgba(196,123,120,0.2)]" style={{ borderRadius: `${(config.radius ?? 25)}%` }} />
        {mode === 'dicebear' ? (
          <div className="flex gap-2">
            <button type="button" onClick={() => onChange({ style, seed: randomSeed(), avatarType: 'dicebear', avatarConfig: config })} className="rounded-full border border-white/8 px-4 py-1.5 text-[11px] font-light tracking-wider text-cream-200 transition-colors hover:border-rose/20 hover:text-cream-50">🎲 换一个</button>
            <button type="button" onClick={() => setShowCustomize((v) => !v)} className={'rounded-full px-4 py-1.5 text-[11px] font-light tracking-wider transition-colors ' + (showCustomize ? 'bg-rose/15 text-rose-light' : 'border border-white/8 text-cream-200 hover:border-rose/20')}>🎨 捏脸</button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="rounded-full border border-white/8 px-4 py-1.5 text-[11px] font-light tracking-wider text-cream-200 transition-colors hover:border-rose/20 hover:text-cream-50 disabled:opacity-40">{uploading ? '上传中…' : '选择图片'}</button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </div>
        )}
      </div>
      {error && <p className="text-center text-xs text-rose/80">{error}</p>}

      {/* 风格选择 */}
      {mode === 'dicebear' && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {AVATAR_STYLES.map((s) => (
            <button key={s} type="button" onClick={() => onChange({ style: s, seed, avatarType: 'dicebear', avatarConfig: config })} className={'rounded-full px-3 py-1.5 text-[11px] font-light tracking-wide transition-all ' + (style === s ? 'bg-rose/15 text-rose-light ring-1 ring-rose/20' : 'border border-white/5 text-cream-300 hover:border-white/10 hover:text-cream-100')}>{s}</button>
          ))}
        </div>
      )}

      {/* PRD §6.1 捏脸面板——底色/背景色/圆角/背景类型 */}
      {mode === 'dicebear' && showCustomize && (
        <div className="space-y-4 rounded-2xl border border-white/5 bg-white/3 p-4 animate-fade-in">
          {/* 背景色 */}
          <div>
            <label className="mb-2 block text-[10px] font-medium tracking-wider text-cream-300">背景色</label>
            <div className="flex flex-wrap gap-2">
              {BG_COLORS.map((c) => {
                const selected = (config.backgroundColor ?? []).includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleBgColor(c)}
                    className={'h-7 w-7 rounded-full transition-all ' + (selected ? 'ring-2 ring-cream-50 ring-offset-2 ring-offset-ink-900' : 'hover:scale-110')}
                    style={{ backgroundColor: `#${c}` }}
                  />
                );
              })}
              {(config.backgroundColor ?? []).length > 0 && (
                <button type="button" onClick={() => updateConfig({ backgroundColor: undefined })} className="text-[10px] text-rose/60 hover:text-rose">清除</button>
              )}
            </div>
          </div>

          {/* 背景类型 */}
          <div>
            <label className="mb-2 block text-[10px] font-medium tracking-wider text-cream-300">背景样式</label>
            <div className="flex gap-2">
              {(['solid', 'gradientLinear'] as const).map((bt) => (
                <button
                  key={bt}
                  type="button"
                  onClick={() => updateConfig({ backgroundType: bt })}
                  className={'rounded-full px-3 py-1.5 text-[10px] font-light transition-all ' + ((config.backgroundType ?? 'solid') === bt ? 'bg-rose/15 text-rose-light' : 'border border-white/5 text-cream-300')}
                >
                  {bt === 'solid' ? '纯色' : '渐变'}
                </button>
              ))}
            </div>
          </div>

          {/* 圆角 */}
          <div>
            <label className="mb-1.5 block text-[10px] font-medium tracking-wider text-cream-300">
              圆角：{config.radius ?? 25}%
            </label>
            <input
              type="range"
              min={0}
              max={50}
              value={config.radius ?? 25}
              onChange={(e) => updateConfig({ radius: parseInt(e.target.value, 10) })}
              className="w-full accent-rose"
            />
          </div>

          {/* 缩放 */}
          <div>
            <label className="mb-1.5 block text-[10px] font-medium tracking-wider text-cream-300">
              缩放：{Math.round((config.scale ?? 100))}%
            </label>
            <input
              type="range"
              min={80}
              max={120}
              value={Math.round((config.scale ?? 100))}
              onChange={(e) => updateConfig({ scale: parseInt(e.target.value, 10) })}
              className="w-full accent-rose"
            />
          </div>
        </div>
      )}
    </div>
  );
}
