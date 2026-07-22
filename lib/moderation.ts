// PRD §6.10 文本审核管线——敏感词表 + AI Provider。
// 命中高危→拒绝；命中中危→标记进审核队列。

import { getAIProvider } from '@/lib/ai/provider';

// 敏感词表（P0 基础版——可扩展）。命中高危即拒绝，不走 AI。
const HIGH_RISK_PATTERNS: RegExp[] = [
  // 色情
  /(裸聊|色情|约炮|一夜情|援交|裸照|av女优|找小姐)/i,
  // 暴力/恐怖
  /(杀人|炸弹|恐怖袭击|砍人|自杀方法|买凶)/i,
  // 毒品
  /(卖冰毒|海洛因|大麻交易|摇头丸|可卡因)/i,
  // 政治极端（基础）
  /(法轮功|六四|达赖|台独|港独)/i,
  // 诈骗诱导（高优）—— PRD §10 反诈红线
  /(加我微信|加我qq|加我telegram|扫码付款|转账给我|投资理财|荐股|内幕消息|稳赚不赔|高返利)/i,
  // 未成年色情暗示
  /(幼女|萝莉|正太|小学生|未成年色情)/i,
];

// 中危模式——标记但允许（进审核队列）
const MEDIUM_RISK_PATTERNS: RegExp[] = [
  // 轻度辱骂
  /(傻逼|操你|草你|尼玛|去死)/i,
  // 个人信息（隐私）
  /(身份证号|银行卡号|手机号.{0,5}\d{11})/i,
  // 外链引流
  /(http[s]?:\/\/(?!neosoul)[^\s]+)/i,
];

export interface ModerationVerdict {
  allowed: boolean;
  severity: 'none' | 'low' | 'medium' | 'high';
  categories: string[];
}

/** 文本审核：敏感词表 → AI Provider 分层 */
export async function moderateText(text: string): Promise<ModerationVerdict> {
  // 1. 敏感词表（快速、确定性）
  for (const pattern of HIGH_RISK_PATTERNS) {
    if (pattern.test(text)) {
      return { allowed: false, severity: 'high', categories: ['keyword_blocklist'] };
    }
  }

  const mediumCategories: string[] = [];
  for (const pattern of MEDIUM_RISK_PATTERNS) {
    if (pattern.test(text)) {
      mediumCategories.push('keyword_flag');
    }
  }

  // 2. AI Provider 审核（深度）
  try {
    const provider = getAIProvider();
    const result = await provider.moderate({ text });
    if (!result.allowed) {
      // AI 拒绝——以更严格的为准
      return result.severity === 'high'
        ? { allowed: false, severity: 'high', categories: result.categories }
        : { allowed: false, severity: 'medium', categories: [...mediumCategories, ...result.categories] };
    }
    if (result.severity === 'medium' || mediumCategories.length > 0) {
      return { allowed: true, severity: 'medium', categories: [...mediumCategories, ...result.categories] };
    }
  } catch {
    // AI 不可用时，降级为敏感词表结果（不阻断用户）
    if (mediumCategories.length > 0) {
      return { allowed: true, severity: 'medium', categories: mediumCategories };
    }
  }

  return { allowed: true, severity: 'none', categories: [] };
}

/** 图片审核（P0 简化版：用 AI 视觉审核或跳过）*/
export async function moderateImage(storagePath: string): Promise<ModerationVerdict> {
  // P0: 未集成视觉审核 API 时降级放行（记日志）。
  // 生产建议接 NSFW.js / AWS Rekognition / 阿里云内容安全。
  // TODO: integrate vision moderation provider
  void storagePath;
  return { allowed: true, severity: 'none', categories: [] };
}

/** 反诈检测（PRD §10 反诈红线）——检测聊天中的风险模式 */
export interface FraudDetection {
  isRisk: boolean;
  patterns: string[];
}

const FRAUD_PATTERNS: RegExp[] = [
  /(转账|付款|打款|汇款|充值|代付|帮我付)/i,
  /(投资|理财|炒股|炒币|期货|基金推荐|稳赚|保本|高收益)/i,
  /(加微信|加qq|加telegram|加vx|加v信|加飞机)/i,
  /(线下见面|约线下|见面交易|当面交易)/i,
  /(借钱|借我|周转|资金周转)/i,
  /(荐股|内幕|消息股|牛股|建仓)/i,
];

export function detectFraud(text: string): FraudDetection {
  const patterns: string[] = [];
  for (const pattern of FRAUD_PATTERNS) {
    if (pattern.test(text)) {
      patterns.push(pattern.source.slice(0, 20));
    }
  }
  return { isRisk: patterns.length > 0, patterns };
}
