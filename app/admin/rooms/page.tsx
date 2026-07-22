import { createAdmin } from '@/lib/supabase/admin';
import { AvatarImage } from '@/components/AvatarImage';
import { RoomActions } from '@/components/admin/AdminActions';

type Room = {
  id: string; name: string; is_live: boolean; created_at: string; background_url: string | null;
  host: { display_name: string; avatar_style: string; avatar_seed: string; avatar_type: string } | null;
};

export default async function AdminRoomsPage() {
  const admin = createAdmin();
  const { data: rooms } = await admin.from('rooms')
    .select('id, name, is_live, created_at, background_url, host:profiles!host_id(display_name, avatar_style, avatar_seed, avatar_type)')
    .order('created_at', { ascending: false });
  const list = (rooms ?? []) as unknown as Room[];

  return (
    <div>
      <h1 className="mb-6 text-sm font-light tracking-[0.2em] text-cream-300">房间管理 ({list.length})</h1>
      <div className="glass overflow-hidden rounded-3xl">
        <table className="w-full text-left">
          <thead><tr className="border-b border-white/5 text-[11px] font-medium tracking-wider text-cream-300">
            <th className="px-4 py-3">房间</th><th className="px-4 py-3">房主</th><th className="px-4 py-3">状态</th><th className="px-4 py-3">创建时间</th><th className="px-4 py-3 text-right">操作</th>
          </tr></thead>
          <tbody>
            {list.map((room) => (
              <tr key={room.id} className="border-b border-white/3 text-[13px] font-light text-cream-100">
                <td className="px-4 py-3"><div className="flex items-center gap-2">
                  {room.background_url && <img src={room.background_url} alt="" className="h-8 w-8 rounded-lg object-cover" />}
                  <span>{room.name}</span>
                </div></td>
                <td className="px-4 py-3">{room.host && <div className="flex items-center gap-2">
                  <AvatarImage style={room.host.avatar_style} seed={room.host.avatar_seed} avatarType={room.host.avatar_type} size={24} />
                  <span className="text-cream-200">{room.host.display_name}</span>
                </div>}</td>
                <td className="px-4 py-3"><span className={'rounded-full px-2 py-0.5 text-[10px] ' + (room.is_live ? 'bg-rose/15 text-rose-light' : 'bg-white/5 text-cream-300')}>{room.is_live ? 'LIVE' : '已结束'}</span></td>
                <td className="px-4 py-3 text-cream-300">{new Date(room.created_at).toLocaleDateString('zh-CN')}</td>
                <td className="px-4 py-3 text-right"><RoomActions roomId={room.id} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <p className="py-12 text-center text-xs font-light text-cream-300/50">暂无房间</p>}
      </div>
    </div>
  );
}
