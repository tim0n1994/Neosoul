'use client';

import { useState } from 'react';
import { detectFraud } from '@/lib/moderation';

// PRD §10 [红线]：反诈横幅——检测聊天/公屏出现转账/投资/外链等风险模式时显示。
interface Props {
  text: string;
}

export function AntiFraudBanner({ text }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const detection = detectFraud(text);

  if (!detection.isRisk || dismissed) return null;

  return (
    <div className="mb-2 flex items-start gap-2 rounded-2xl border border-orange-500/20 bg-orange-500/8 px-3 py-2">
      <span className="text-base">⚠️</span>
      <div className="flex-1">
        <p className="text-[11px] font-medium text-orange-300/90">
          警惕转账/投资/线下诱导
        </p>
        <p className="mt-0.5 text-[10px] font-light text-orange-300/60">
          NEOSOUL 平台内无任何转账功能。请勿向陌生人转账或线下见面。
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-[10px] text-orange-300/50 hover:text-orange-300"
      >
        ✕
      </button>
    </div>
  );
}
