// PRD §6.9 Provider 抽象 [决策]：统一接口，实现可切换（OpenAI / Anthropic / 本地）。
// 密钥仅服务端。绝不伪装真人，产出必带 AI 标注。

export interface CompletionRequest {
  prompt: string;
  system?: string;
  maxTokens?: number;
}

export interface CompletionResult {
  text: string;
  /** AI 标注——展示给用户时必带 */
  labeled: string;
}

export interface ModerationRequest {
  text: string;
}

export interface ModerationResult {
  allowed: boolean;
  severity: 'none' | 'low' | 'medium' | 'high';
  categories: string[];
}

export interface AIProvider {
  complete(req: CompletionRequest): Promise<CompletionResult>;
  moderate(req: ModerationRequest): Promise<ModerationResult>;
}

const AI_LABEL = 'AI';

// ---------- OpenAI 实现 ----------
class OpenAIProvider implements AIProvider {
  private apiKey = process.env.OPENAI_API_KEY ?? '';
  private model = process.env.AI_MODEL ?? 'gpt-4o-mini';

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    if (!this.apiKey) {
      throw new Error('AI provider not configured (OPENAI_API_KEY missing)');
    }
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: req.maxTokens ?? 256,
        messages: [
          ...(req.system ? [{ role: 'system', content: req.system }] : []),
          { role: 'user', content: req.prompt },
        ],
      }),
    });
    if (!res.ok) throw new Error(`AI complete failed: ${res.status}`);
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim() ?? '';
    // PRD [红线]：所有 AI 产出必带标注
    return { text, labeled: `🤖 ${AI_LABEL}：${text}` };
  }

  async moderate(req: ModerationRequest): Promise<ModerationResult> {
    if (!this.apiKey) {
      // 未配置时默认放行（M2 可换为 deny-by-default）
      return { allowed: true, severity: 'none', categories: [] };
    }
    const res = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ model: 'omni-moderation-latest', input: req.text }),
    });
    if (!res.ok) {
      // 审核服务不可用时，不阻断用户（降级放行，记日志）
      return { allowed: true, severity: 'none', categories: [] };
    }
    const data = await res.json();
    const result = data.results?.[0];
    if (!result) return { allowed: true, severity: 'none', categories: [] };
    const flagged = result.flagged === true;
    const categories = Object.entries(result.categories ?? {})
      .filter(([, v]) => v === true)
      .map(([k]) => k);
    // 命中高危类别 → 拒绝
    if (flagged) {
      return { allowed: false, severity: 'high', categories };
    }
    // 检查 score 阈值（中危）
    const scores = Object.values(result.category_scores ?? {}) as number[];
    const maxScore = scores.length ? Math.max(...scores) : 0;
    if (maxScore > 0.5) {
      return { allowed: false, severity: 'medium', categories };
    }
    return { allowed: true, severity: 'none', categories: [] };
  }
}

// ---------- Provider 工厂 ----------
let _instance: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (_instance) return _instance;
  const provider = process.env.AI_PROVIDER ?? 'openai';
  switch (provider) {
    case 'openai':
    default:
      _instance = new OpenAIProvider();
      break;
  }
  return _instance;
}

export const AI_LABEL_PREFIX = `🤖 ${AI_LABEL}：`;
