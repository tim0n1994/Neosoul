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
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function ChatPanel({ roomId }: Props) {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [senders, setSenders] = useState<Record<string, Sender>>({});
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendText(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim().slice(0, MAX_TEXT);
    if (!body) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setBusy(true);
    setText('');
    const { error } = await supabase.from('messages').insert({
      room_id: roomId,
      sender_id: user!.id,
      kind: 'text',
      body,
    });
    if (error) alert('发送失败：' + error.message);
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
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${roomId}/${user?.id}/${Date.now()}-${safeName}`;
    const { error: upErr } = await supabase.storage
      .from('chat-images')
      .upload(path, file, { contentType: file.type });
    if (upErr) {
      alert('上传失败：' + upErr.message);
      setBusy(false);
      return;
    }
    const { data: pub } = supabase.storage.from('chat-images').getPublicUrl(path);
    const { error: mErr } = await supabase
      .from('messages')
      .insert({ room_id: roomId, sender_id: user!.id, kind: 'image', body: pub.publicUrl });
    if (mErr) alert('消息发送失败：' + mErr.message);
    setBusy(false);
  }

  return (
    <div className="flex h-full flex-col">
      {/* 标题 */}
      <div className="border-b border-white/5 px-5 py-3">
        <span className="text-[11px] font-light tracking-[0.2em] text-cream-300">公屏</span>
      </div>

      {/* 消息流 */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="pt-8 text-center text-xs font-light text-cream-300/50">
            还没有消息，说点什么吧
          </p>
        )}
        {messages.map((m) => {
          const s = senders[m.sender_id];
          return (
            <div key={m.id} className="flex items-start gap-2.5 animate-fade-in">
              {s && <AvatarImage style={s.avatar_style} seed={s.avatar_seed} size={28} />}
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-light tracking-wide text-cream-300/70">
                  {s?.display_name ?? 'Guest'}
                </div>
                {m.kind === 'text' ? (
                  <div className="mt-0.5 break-words text-[13px] font-light leading-relaxed text-cream-100">
                    {m.body}
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.body}
                    alt="聊天图片"
                    className="mt-1 max-w-[180px] rounded-xl border border-white/5"
                  />
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* 输入栏 */}
      <form
        onSubmit={sendText}
        className="flex items-center gap-2 border-t border-white/5 p-3"
      >
        <label className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/5 text-sm text-cream-200 transition-colors hover:bg-white/8">
          📎
          <input type="file" accept="image/*" className="hidden" onChange={sendImage} />
        </label>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={MAX_TEXT}
          placeholder="说点什么…"
          className="input-warm flex-1 rounded-full px-4 py-2 text-[13px] font-light text-cream-50 outline-none placeholder:text-cream-300/40"
        />
        <button
          type="submit"
          disabled={busy || !text.trim()}
          className="btn-rose flex h-9 w-9 items-center justify-center rounded-full text-sm text-white disabled:opacity-30"
        >
          ↑
        </button>
      </form>
    </div>
  );
}
