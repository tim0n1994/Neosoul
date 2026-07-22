'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// PRD §6.10 [红线]：拉黑——拉黑后互相不出现在匹配/公屏/私信/同房可选静音。
interface Props {
  targetUserId: string;
  label?: string;
}

export function BlockButton({ targetUserId, label = '拉黑' }: Props) {
  const [supabase] = useState(() => createClient());
  const [blocked, setBlocked] = useState(false);
  const [busy, setBusy] = useState(false);

  async function toggleBlock() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setBusy(true);
    if (blocked) {
      await supabase
        .from('blocks')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', targetUserId);
      setBlocked(false);
    } else {
      await supabase
        .from('blocks')
        .insert({ blocker_id: user.id, blocked_id: targetUserId });
      setBlocked(true);
    }
    setBusy(false);
  }

  return (
    <button
      onClick={toggleBlock}
      disabled={busy}
      className="rounded-full px-3 py-1.5 text-[11px] font-light transition-colors disabled:opacity-40"
      style={{
        background: blocked ? 'rgba(196,123,120,0.15)' : 'rgba(255,255,255,0.05)',
        color: blocked ? '#d9a29a' : '#c0b5ac',
      }}
    >
      {blocked ? '已拉黑' : label}
    </button>
  );
}
