'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// PRD §6.10 [红线]：举报对话框——对用户/房间/消息/回放举报。
interface Props {
  targetType: 'user' | 'room' | 'message' | 'recording';
  targetId: string;
  open: boolean;
  onClose: () => void;
}

const REASONS = [
  { value: 'spam', label: '垃圾信息 / 广告' },
  { value: 'harassment', label: '骚扰 / 人身攻击' },
  { value: 'fraud', label: '诈骗 / 诱导转账' },
  { value: 'nsfw', label: '色情 / 低俗内容' },
  { value: 'minor', label: '涉及未成年不当内容' },
  { value: 'violence', label: '暴力 / 威胁' },
  { value: 'other', label: '其它' },
];

export function ReportDialog({ targetType, targetId, open, onClose }: Props) {
  const [supabase] = useState(() => createClient());
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (!open) return null;

  async function submit() {
    if (!reason) return;
    setSubmitting(true);
    // PRD §6.10 [红线]：通过 API 路由举报（限流 + 服务端设置 reporter_id 防伪造）
    await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetType,
        targetId: String(targetId),
        reason,
        note: note.trim(),
      }),
    });
    setSubmitting(false);
    setDone(true);
    setTimeout(() => {
      setDone(false);
      setReason('');
      setNote('');
      onClose();
    }, 1500);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="glass-strong w-full max-w-sm space-y-4 rounded-t-3xl p-6 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium text-cream-50">举报</h2>
          <button onClick={onClose} className="text-[11px] text-cream-300">
            关闭
          </button>
        </div>

        {done ? (
          <div className="py-6 text-center">
            <p className="text-sm text-cream-100">✓ 举报已提交</p>
            <p className="mt-1 text-[11px] text-cream-300/60">我们会尽快处理</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {REASONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setReason(r.value)}
                  className={`block w-full rounded-2xl px-4 py-2.5 text-left text-[13px] font-light transition-colors ${
                    reason === r.value
                      ? 'bg-rose/15 text-rose-light ring-1 ring-rose/20'
                      : 'bg-white/3 text-cream-200 hover:bg-white/5'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              placeholder="补充说明（可选）"
              className="input-warm w-full resize-none rounded-2xl px-4 py-3 text-[13px] text-cream-50 outline-none placeholder:text-cream-300/40"
              rows={3}
            />

            <button
              onClick={submit}
              disabled={!reason || submitting}
              className="btn-rose w-full rounded-2xl py-3 text-sm font-medium text-white disabled:opacity-30"
            >
              {submitting ? '提交中…' : '提交举报'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
