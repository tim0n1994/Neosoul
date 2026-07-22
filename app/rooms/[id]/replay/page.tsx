import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createAdmin } from '@/lib/supabase/admin';

// PRD §6.7 回放——音频播放器 + 元信息。
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const admin = createAdmin();
  const { data: room } = await admin
    .from('rooms')
    .select('name')
    .eq('id', id)
    .maybeSingle();
  return { title: room ? `回放：${room.name} — NEOSOUL` : '回放 — NEOSOUL' };
}

export default async function ReplayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const admin = createAdmin();

  // 查房间 + 录制
  const { data: room } = await admin
    .from('rooms')
    .select('id, name, host_id')
    .eq('id', id)
    .maybeSingle();

  if (!room) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center">
        <p className="text-sm text-cream-300">房间不存在</p>
      </main>
    );
  }

  const { data: recordings } = await admin
    .from('recordings')
    .select('id, url, duration, created_at')
    .eq('room_id', id)
    .order('created_at', { ascending: false });

  const { data: host } = await admin
    .from('profiles')
    .select('display_name')
    .eq('id', room.host_id)
    .maybeSingle();

  return (
    <main className="min-h-[100dvh] bg-ink-950 px-6 py-16">
      <div className="mx-auto max-w-lg">
        <Link
          href="/discover"
          className="mb-6 inline-block text-[12px] font-light text-cream-300 hover:text-cream-100"
        >
          ← 返回发现
        </Link>

        <div className="glass rounded-3xl p-6">
          <h1 className="text-xl font-light text-cream-50">{room.name}</h1>
          <p className="mt-1 text-[12px] text-cream-300/60">
            房主：{host?.display_name ?? 'Unknown'}
          </p>

          {recordings && recordings.length > 0 ? (
            <div className="mt-6 space-y-4">
              {recordings.map((rec) => (
                <div
                  key={rec.id}
                  className="rounded-2xl border border-white/5 bg-white/3 p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[11px] font-light text-cream-300/60">
                      {new Date(rec.created_at).toLocaleString('zh-CN')}
                    </span>
                    {rec.duration && (
                      <span className="text-[11px] text-cream-300/40">
                        {Math.floor(rec.duration / 60)}:{String(rec.duration % 60).padStart(2, '0')}
                      </span>
                    )}
                  </div>
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <audio controls className="w-full">
                    <source src={rec.url} />
                  </audio>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-6 py-8 text-center text-sm font-light text-cream-300/50">
              还没有回放
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
