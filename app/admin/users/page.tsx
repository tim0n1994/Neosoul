import { createAdmin } from '@/lib/supabase/admin';
import { AvatarImage } from '@/components/AvatarImage';
import { UserActions } from '@/components/admin/AdminActions';

type Profile = { id: string; display_name: string; avatar_style: string; avatar_seed: string; avatar_type: string; created_at: string };

export default async function AdminUsersPage() {
  const admin = createAdmin();
  const { data: authData } = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
  const bannedMap: Record<string, boolean> = {};
  const emailMap: Record<string, string> = {};
  for (const u of authData?.users ?? []) { bannedMap[u.id] = !!u.banned_until; emailMap[u.id] = u.email ?? ''; }

  const { data: profiles } = await admin.from('profiles')
    .select('id, display_name, avatar_style, avatar_seed, avatar_type, created_at')
    .order('created_at', { ascending: false });
  const list = (profiles ?? []) as Profile[];

  return (
    <div>
      <h1 className="mb-6 text-sm font-light tracking-[0.2em] text-cream-300">用户管理 ({list.length})</h1>
      <div className="glass overflow-hidden rounded-3xl">
        <table className="w-full text-left">
          <thead><tr className="border-b border-white/5 text-[11px] font-medium tracking-wider text-cream-300">
            <th className="px-4 py-3">用户</th><th className="px-4 py-3">邮箱</th><th className="px-4 py-3">注册时间</th><th className="px-4 py-3">状态</th><th className="px-4 py-3 text-right">操作</th>
          </tr></thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id} className="border-b border-white/3 text-[13px] font-light text-cream-100">
                <td className="px-4 py-3"><div className="flex items-center gap-2">
                  <AvatarImage style={p.avatar_style} seed={p.avatar_seed} avatarType={p.avatar_type} size={28} />
                  <span>{p.display_name}</span>
                </div></td>
                <td className="px-4 py-3 text-cream-300">{emailMap[p.id] || '—'}</td>
                <td className="px-4 py-3 text-cream-300">{new Date(p.created_at).toLocaleDateString('zh-CN')}</td>
                <td className="px-4 py-3"><span className={'rounded-full px-2 py-0.5 text-[10px] ' + (bannedMap[p.id] ? 'bg-rose/15 text-rose-light' : 'bg-white/5 text-cream-200')}>{bannedMap[p.id] ? '封禁' : '正常'}</span></td>
                <td className="px-4 py-3 text-right"><UserActions userId={p.id} displayName={p.display_name} banned={bannedMap[p.id]} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <p className="py-12 text-center text-xs font-light text-cream-300/50">暂无用户</p>}
      </div>
    </div>
  );
}
