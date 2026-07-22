import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdmin } from '@/lib/supabase/admin';
import { TopBar } from '@/components/TopBar';
import { RoomCard } from '@/components/discovery/RoomCard';
import { CreateRoomButton } from '@/components/CreateRoomButton';
import { rankRooms, type RankableRoom, type RankContext } from '@/lib/ranking';

// PRD §6.5 发现（Hallway）——正在直播的公开房，按兴趣+关注启发式排序。
export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const admin = createAdmin();

  // 用户信息——兴趣、关注列表、avatar
  const { data: me } = await supabase
    .from('profiles')
    .select('display_name, avatar_style, avatar_seed, avatar_type, interests')
    .eq('id', user.id)
    .maybeSingle();
  if (!me || me.display_name === 'Guest') redirect('/onboarding');

  // 关注列表
  const { data: follows } = await admin
    .from('follows')
    .select('followee_id')
    .eq('follower_id', user.id);
  const followingIds = new Set((follows ?? []).map((f) => f.followee_id as string));

  // 查正在直播的公开房
  let query = admin
    .from('rooms')
    .select(
      'id, name, topic, tags, participant_count, created_at, background_url, host_id, host:profiles!host_id(display_name, avatar_style, avatar_seed, avatar_type)',
    )
    .eq('is_live', true)
    .eq('visibility', 'open')
    .order('created_at', { ascending: false });

  // 按主题筛选
  if (sp.topic) {
    query = query.eq('topic', sp.topic);
  }

  // 按名称搜索
  if (sp.q) {
    query = query.ilike('name', `%${sp.q}%`);
  }

  const { data: rawRooms } = await query.limit(50);

  type DiscoveryRoom = RankableRoom & {
    name: string;
    background_url: string | null;
    host: {
      display_name: string;
      avatar_style: string;
      avatar_seed: string;
      avatar_type: string;
    } | null;
  };

  const rooms = (rawRooms ?? []) as unknown as DiscoveryRoom[];

  // 排序
  const ctx: RankContext = {
    userId: user.id,
    followingIds,
    interests: me.interests ?? [],
  };
  const ranked = rankRooms(rooms, ctx);

  const TOPICS = [
    { value: '', label: '全部' },
    { value: 'chat', label: '闲聊' },
    { value: 'treehole', label: '树洞' },
    { value: 'study', label: '学习' },
    { value: 'karaoke', label: 'K歌' },
    { value: 'game', label: '游戏' },
    { value: 'reading', label: '读书' },
    { value: 'emotion', label: '情感' },
    { value: 'career', label: '职场' },
  ];

  return (
    <div className="min-h-[100dvh]">
      <TopBar
        name={me.display_name}
        style={me.avatar_style}
        seed={me.avatar_seed}
        avatarType={me.avatar_type}
        email={user.email ?? ''}
        right={<CreateRoomButton />}
      />

      <main className="px-6 pb-24">
        {/* 标题 + 搜索 */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-light tracking-[0.25em] text-cream-300">发现</h2>
          <form className="relative">
            <input
              type="search"
              name="q"
              defaultValue={sp.q ?? ''}
              placeholder="搜索房间…"
              className="input-warm w-40 rounded-full px-4 py-1.5 text-[12px] font-light text-cream-50 outline-none placeholder:text-cream-300/40 sm:w-56"
            />
          </form>
        </div>

        {/* 主题筛选 */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
          {TOPICS.map((t) => (
            <a
              key={t.value || 'all'}
              href={t.value ? `/discover?topic=${t.value}` : '/discover'}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-light transition-colors ${
                (sp.topic ?? '') === t.value
                  ? 'bg-rose/15 text-rose-light ring-1 ring-rose/20'
                  : 'bg-white/5 text-cream-300 hover:bg-white/8'
              }`}
            >
              {t.label}
            </a>
          ))}
        </div>

        {/* 房间列表 */}
        {ranked.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-24 text-center">
            <div className="h-16 w-16 rounded-full bg-rose/8 blur-[2px]" />
            <p className="text-sm font-light text-cream-300">
              {sp.q || sp.topic ? '没有找到匹配的房间' : '还没有正在直播的房间'}
            </p>
            <p className="text-xs text-cream-300/50">开一场，邀请谁来聊聊</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {ranked.map((room) => (
              <RoomCard
                key={room.id}
                id={room.id}
                name={room.name}
                topic={room.topic}
                tags={room.tags ?? []}
                participantCount={room.participant_count ?? 0}
                backgroundUrl={room.background_url}
                host={room.host}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
