'use client';

import Link from 'next/link';
import { AvatarImage } from '@/components/AvatarImage';

// PRD §6.5 发现页卡片——房名/主题/房主头像/在场人数/标签。
interface Props {
  id: string;
  name: string;
  topic: string;
  tags: string[];
  participantCount: number;
  backgroundUrl: string | null;
  host: {
    display_name: string;
    avatar_style: string;
    avatar_seed: string;
    avatar_type: string;
  } | null;
}

const TOPIC_LABELS: Record<string, string> = {
  chat: '闲聊',
  treehole: '树洞',
  study: '学习',
  karaoke: 'K歌',
  game: '游戏',
  reading: '读书',
  emotion: '情感',
  career: '职场',
  other: '其它',
};

export function RoomCard({
  id,
  name,
  topic,
  tags,
  participantCount,
  backgroundUrl,
  host,
}: Props) {
  return (
    <Link
      href={`/rooms/${id}`}
      className="card-warm group relative aspect-[4/5] overflow-hidden rounded-3xl"
    >
      {/* 背景图（朦胧调暗） */}
      {backgroundUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={backgroundUrl}
            alt=""
            className="absolute inset-0 h-full w-full scale-105 object-cover blur-sm transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/50 to-ink-950/30" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-ink-800 to-ink-900" />
      )}

      <div className="relative flex h-full flex-col justify-between p-4">
        {/* LIVE 指示 */}
        <div className="flex items-center gap-1.5">
          <span className="flex h-1.5 w-1.5 items-center justify-center">
            <span className="absolute h-1.5 w-1.5 animate-glow-pulse rounded-full bg-rose" />
          </span>
          <span className="text-[10px] font-light tracking-wider text-rose-light/70">LIVE</span>
          <span className="ml-auto text-[10px] font-light text-cream-300/60">
            {participantCount} 人在场
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            <span className="rounded-full bg-rose/10 px-2 py-0.5 text-[9px] font-light text-rose-light/80">
              {TOPIC_LABELS[topic] ?? topic}
            </span>
            {tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-white/5 px-2 py-0.5 text-[9px] font-light text-cream-300/60"
              >
                #{tag}
              </span>
            ))}
          </div>

          <h3 className="text-sm font-medium leading-snug text-cream-50 line-clamp-2">
            {name}
          </h3>
          {host && (
            <div className="flex items-center gap-1.5">
              <AvatarImage
                style={host.avatar_style}
                seed={host.avatar_seed}
                avatarType={host.avatar_type}
                size={18}
              />
              <span className="truncate text-[11px] font-light text-cream-200/70">
                {host.display_name}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
