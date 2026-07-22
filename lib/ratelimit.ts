// P0: in-memory token-bucket per key. Swap to Upstash Redis before scale (PRD §6.10/§12).
// Safe for single-instance Edge/Node; designed for idempotent interface so swap is transparent.

interface Bucket {
  tokens: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowSec: number,
): RateLimitResult {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    const fresh: Bucket = { tokens: limit - 1, resetAt: now + windowSec * 1000 };
    buckets.set(key, fresh);
    return { ok: true, remaining: fresh.tokens, resetAt: fresh.resetAt };
  }
  if (b.tokens <= 0) {
    return { ok: false, remaining: 0, resetAt: b.resetAt };
  }
  b.tokens -= 1;
  return { ok: true, remaining: b.tokens, resetAt: b.resetAt };
}

/** Per-user rate limiter for route handlers. Returns null if OK, 429 Response if limited. */
export function rateLimitResponse(
  userId: string,
  action: string,
  limit: number,
  windowSec: number,
): Response | null {
  const result = rateLimit(`${action}:${userId}`, limit, windowSec);
  if (!result.ok) {
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
    return new Response(
      JSON.stringify({ error: 'rate_limited', retry_after: retryAfter }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfter),
        },
      },
    );
  }
  return null;
}

// PRD §6.10 限流预设：注册/建房/发消息/上传/匹配/举报
export const LIMITS = {
  sendMessage: { limit: 20, windowSec: 60 }, // 20/min
  createRoom: { limit: 5, windowSec: 300 }, // 5/5min
  upload: { limit: 10, windowSec: 60 }, // 10/min
  report: { limit: 10, windowSec: 600 }, // 10/10min
  moderate: { limit: 30, windowSec: 60 }, // 30/min
} as const;
