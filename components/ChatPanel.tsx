'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AvatarImage } from '@/components/AvatarImage';

interface Props {
  roomId: string;
}

type Sender = {
  display_name: string;
  avatar_style: string;
  avatar_seed: string;
};

type Message = {
  id: number;
  sender_id: string;
  kind: 'text' | 'image';
  body: string;
  created_at: string;
};

const MAX_TEXT = 500;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB（PRD §12.3）

export function ChatPanel({ roomId }: Props) {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [senders, setSenders] = useState<Record<string, Sender>>({});
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // 进房拉最近 50 条（PRD §12.1）
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('messages')
        .select('id, sender_id, kind, body, created_at')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (cancelled || !data) return;
      const reversed = data.reverse() as Message[];
      setMessages(reversed);
      const ids = [...new Set(reversed.map((m) => m.sender_id))];
      if (ids.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_style, avatar_seed')
          .in('id', ids);
        if (profs) {
          const map: Record<string, Sender> = {};
          profs.forEach((p) => {
            map[p.id] = {
              display_name: p.display_name,
              avatar_style: p.avatar_style,
              avatar_seed: p.avatar_seed,
            };
          });
          setSenders(map);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roomId, supabase]);

  // 实时订阅新消息（PRD §12.2）
  useEffect(() => {
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        async (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) => [...prev, msg]);
          if (!senders[msg.sender_id]) {
            const { data: prof } = await supabase
              .from('profiles')
              .select('display_name, avatar_style, avatar_seed')
              .eq('id', msg.sender_id)
              .maybeSingle();
            if (prof) {
              setSenders((prev) => ({
                ...prev,
                [msg.sender_id]: {
                  display_name: prof.display_name,
                  avatar_style: prof.avatar_style,
                  avatar_seed: prof.avatar_seed,
                },
              }));
            }
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // senders 不入依赖，避免重订阅
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, supabase]);

  // 新消息自动滚到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendText(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim().slice(0, MAX_TEXT);
    if (!body) return;
    setBusy(true);
    setText('');
    await supabase
      .from('messages')
      .insert({ room_id: roomId, kind: 'text', body });
    setBusy(false);
  }

  async function sendImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('仅支持图片');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      alert('图片不能超过 5MB');
      return;
    }
    setBusy(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const path = `${roomId}/${user?.id}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage
      .from('chat-images')
      .upload(path, file, { contentType: file.type });
    if (upErr) {
      alert('上传失败：' + upErr.message);
      setBusy(false);
      return;
    }
    const { data: pub } = supabase.storage.from('chat-images').getPublicUrl(path);
    await supabase
      .from('messages')
      .insert({ room_id: roomId, kind: 'image', body: pub.publicUrl });
    setBusy(false);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m) => {
          const s = senders[m.sender_id];
          return (
            <div key={m.id} className="flex items-start gap-2">
              {s && <AvatarImage style={s.avatar_style} seed={s.avatar_seed} size={28} />}
              <div className="min-w-0">
                <div className="text-xs text-white/40">
                  {s?.display_name ?? 'Guest'}
                </div>
                {m.kind === 'text' ? (
                  <div className="break-words text-sm">{m.body}</div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.body}
                    alt="聊天图片"
                    className="mt-1 max-w-[200px] rounded-lg border border-white/10"
                  />
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendText} className="flex items-center gap-2 border-t border-white/10 p-3">
        <label className="cursor-pointer rounded-lg bg-white/10 px-3 py-2 text-sm">
          📎
          <input type="file" accept="image/*" className="hidden" onChange={sendImage} />
        </label>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={MAX_TEXT}
          placeholder="发条消息…"
          className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-brand-to"
        />
        <button
          type="submit"
          disabled={busy || !text.trim()}
          className="rounded-xl bg-gradient-to-r from-brand-from to-brand-to px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          发送
        </button>
      </form>
    </div>
  );
}
