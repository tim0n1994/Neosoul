'use client';

import { AVATAR_STYLES, avatarDataUri, randomSeed } from '@/lib/avatar';

interface Props {
  style: string;
  seed: string;
  onChange: (next: { style: string; seed: string }) => void;
}

// 头像选择：风格 tab + 🎲 随机换种子，预览实时变化（PRD §8.2）。
export function AvatarPicker({ style, seed, onChange }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarDataUri(style, seed)}
          width={120}
          height={120}
          alt="头像预览"
          className="rounded-3xl border border-white/10 bg-black/30"
        />
        <button
          type="button"
          onClick={() => onChange({ style, seed: randomSeed() })}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:text-white"
        >
          🎲 随机
        </button>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {AVATAR_STYLES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange({ style: s, seed })}
            className={
              'rounded-lg border px-3 py-1.5 text-xs ' +
              (style === s
                ? 'border-brand-to text-white'
                : 'border-white/10 text-white/50 hover:text-white/80')
            }
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
