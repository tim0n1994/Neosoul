'use client';

import { useState } from 'react';

// PRD §6.6 关注/取关按钮。
interface Props {
  targetUserId: string;
  initialFollowing: boolean;
}

export function FollowButton({ targetUserId, initialFollowing }: Props) {
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      const res = await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId,
          action: following ? 'unfollow' : 'follow',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setFollowing(data.following);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={
        'rounded-full px-5 py-2 text-[12px] font-medium tracking-wide transition-all disabled:opacity-40 ' +
        (following
          ? 'border border-white/8 text-cream-200'
          : 'btn-rose text-white')
      }
    >
      {following ? '已关注' : '关注'}
    </button>
  );
}
