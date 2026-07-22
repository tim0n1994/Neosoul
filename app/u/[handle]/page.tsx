import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createAdmin } from '@/lib/supabase/admin';
import { AvatarImage } from '@/components/AvatarImage';
import { FollowButton } from '@/components/FollowButton';
import { BlockButton } from '@/components/safety/BlockButton';

// PRD §6.6 个人主页——关注/回放/装扮。
export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  return { title: `${handle} — NEOSOUL` };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const admin = createAdmin();

  // handle = user id（P0 简化；后续可支持自定义 handle）
  const { data: profile } = await admin
    .from('profiles')
    .select('id, display_name, avatar_style, avatar_seed, avatar_type, interests, is_minor')
    .eq('id', handle)
    .maybeSingle();

  if (!profile) {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-4">
        <p className="text-sm text-cream-300">用户不存在</p>
        <Link href="/discover" className="text-[12px] text-rose-light">
          返回发现
        </Link>
      </main>
    );
  }

  const isMe = profile.id === user.id;

  // 是否已关注
  const { data: existingFollow } = await admin
    .from('follows')
    .select('follower_id')
    .eq('follower_id', user.id)
    .eq('followee_id', profile.id)
    .maybeSingle();
  const isFollowing = !!existingFollow;

  // 粉丝数
  const { count: followerCount } = await admin
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('followee_id', profile.id);

  // 关注数
  const { count: followingCount } = await admin
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', profile.id);

  // 回放列表（用户作为房主的已结束房间）
  const { data: rawReplays } = await admin
    .from('recordings')
    .select('id, room_id, duration, created_at, room:rooms!inner(name)')
    .eq('room.host_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(10);
  // Supabase join 返回数组——提取第一个
  const replays = (rawReplays ?? []).map((r) => {
    const room = Array.isArray(r.room) ? r.room[0] : r.room;
    return { ...(r as Record<string, unknown>), room } as { id: number; room_id: string; duration: number | null; created_at: string; room: { name: string } };
  });

  return (
    <main className="min-h-[100dvh] bg-ink-950">
      {/* Header */}
      <div className="px-6 pt-20 pb-6">
        <div className="mx-auto max-w-lg space-y-6">
          <div className="flex items-center gap-4">
            <AvatarImage
              style={profile.avatar_style}
              seed={profile.avatar_seed}
              avatarType={profile.avatar_type}
              size={72}
            />
            <div className="flex-1">
              <h1 className="text-xl font-medium text-cream-50">{profile.display_name}</h1>
              <div className="mt-1 flex gap-4 text-[12px] text-cream-300/60">
                <span>{followerCount ?? 0} 粉丝</span>
                <span>关注 {followingCount ?? 0}</span>
              </div>
            </div>
            {!isMe && (
              <div className="flex gap-2">
                <FollowButton targetUserId={profile.id} initialFollowing={isFollowing} />
              </div>
            )}
          </div>

          {/* 兴趣标签 */}
          {profile.interests && (profile.interests as string[]).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {(profile.interests as string[]).map((tag: string) => (
                <span
                  key={tag}
                  className="rounded-full bg-white/5 px-3 py-1 text-[11px] font-light text-cream-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* 安全工具 */}
          {!isMe && (
            <div className="flex gap-2 border-t border-white/5 pt-4">
              <BlockButton targetUserId={profile.id} />
            </div>
          )}
        </div>
      </div>

      {/* 回放 */}
      <div className="px-6 pb-24">
        <div className="mx-auto max-w-lg">
          <h2 className="mb-4 text-xs font-light tracking-[0.2em] text-cream-300">回放</h2>
          {replays && replays.length > 0 ? (
            <div className="space-y-2">
              {replays.map((r) => {
                return (
                  <Link
                    key={r.id}
                    href={`/rooms/${r.room_id}/replay`}
                    className="glass flex items-center justify-between rounded-2xl px-4 py-3 transition-colors hover:bg-white/5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-light text-cream-100">
                        {r.room.name}
                      </p>
                      <p className="text-[10px] text-cream-300/50">
                        {new Date(r.created_at).toLocaleDateString('zh-CN')}
                        {r.duration && ` · ${Math.floor(r.duration / 60)}min`}
                      </p>
                    </div>
                    <span className="text-rose-light">▶</span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="py-8 text-center text-sm font-light text-cream-300/50">
              还没有回放
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
