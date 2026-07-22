'use client';

// PRD §6.1 兴趣标签选择器——onboarding 选 3-10 个兴趣，存 profiles.interests text[]
interface Props {
  selected: string[];
  onChange: (next: string[]) => void;
  min?: number;
  max?: number;
}

export const INTEREST_OPTIONS = [
  '音乐', '游戏', '情感', '学习', '二次元', '影视',
  '运动', '职场', '读书', 'K歌', '科技', '旅行',
] as const;

export function InterestPicker({ selected, onChange, min = 3, max = 10 }: Props) {
  function toggle(tag: string) {
    if (selected.includes(tag)) {
      onChange(selected.filter((t) => t !== tag));
    } else if (selected.length < max) {
      onChange([...selected, tag]);
    }
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] font-medium tracking-wider text-cream-300">
          兴趣标签
        </span>
        <span className={`text-[10px] font-light ${selected.length >= min ? 'text-cream-300/50' : 'text-rose/60'}`}>
          {selected.length}/{max}（至少 {min} 个）
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {INTEREST_OPTIONS.map((tag) => {
          const active = selected.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggle(tag)}
              className={
                'rounded-full px-3 py-1.5 text-[12px] font-light transition-all ' +
                (active
                  ? 'bg-rose/15 text-rose-light ring-1 ring-rose/20'
                  : 'border border-white/5 text-cream-300 hover:border-white/10 hover:text-cream-100')
              }
            >
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
}
