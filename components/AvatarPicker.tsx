'use client';

import { AVATAR_STYLES, avatarDataUri, randomSeed } from '@/lib/avatar';

interface Props {
  style: string;
  seed: string;
  onChange: (next: { style: string; seed: string }) => void;
}

// 头像选择：风格轮播 + 🎲 随机，预览实时变化。暧昧·高级感。
export function AvatarPicker({ style, seed, onChange }: Props) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarDataUri(style, seed)}
          width={96}
          height={96}
          alt="头像预览"
          className="rounded-2xl border border-white/8 shadow-[0_8px_40px_-8px_rgba(196,123,120,0.2)]"
        />
        <button
          type="button"
          onClick={() => onChange({ style, seed: randomSeed() })}
          className="rounded-full border border-white/8 px-4 py-1.5 text-[11px] font-light tracking-wider text-cream-200 transition-colors hover:border-rose/20 hover:text-cream-50"
        >
          🎲 换一个
        </button>
      </div>

      <div className="flex flex-wrap justify-center gap-1.5">
        {AVATAR_STYLES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange({ style: s, seed })}
            className={
              'rounded-full px-3 py-1.5 text-[11px] font-light tracking-wide transition-all ' +
              (style === s
                ? 'bg-rose/15 text-rose-light ring-1 ring-rose/20'
                : 'border border-white/5 text-cream-300 hover:border-white/10 hover:text-cream-100')
            }
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
