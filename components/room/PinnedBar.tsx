'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// PRD §6.3 置顶（Pinned）：房主/共主持可置顶消息/链接，实时下发。
interface Props {
  roomId: string;
}

interface PinnedData {
  type: 'text' | 'link';
  content: string;
}

export function PinnedBar({ roomId }: Props) {
  const [supabase] = useState(() => createClient());
  const [pinned, setPinned] = useState<PinnedData | null>(null);

  // 初始加载
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: room } = await supabase
        .from('rooms')
        .select('pinned')
        .eq('id', roomId)
        .maybeSingle();
      if (!cancelled && room?.pinned) {
        setPinned(room.pinned as PinnedData);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roomId, supabase]);

  // Realtime 监听 pinned 变更
  useEffect(() => {
    const channel = supabase
      .channel(`pinned:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          const newPinned = (payload.new as { pinned?: PinnedData }).pinned;
          setPinned(newPinned ?? null);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, supabase]);

  if (!pinned) return null;

  return (
    <div className="glass absolute left-1/2 top-16 z-30 flex max-w-[90%] -translate-x-1/2 items-center gap-2 rounded-2xl px-4 py-2">
      <span className="text-[10px] font-medium tracking-wider text-gold/80">📌 置顶</span>
      {pinned.type === 'link' ? (
        <a
          href={pinned.content}
          target="_blank"
          rel="noopener noreferrer"
          className="truncate text-[12px] font-light text-rose-light underline-offset-2 hover:underline"
        >
          {pinned.content}
        </a>
      ) : (
        <span className="truncate text-[12px] font-light text-cream-100">
          {pinned.content}
        </span>
      )}
    </div>
  );
}
