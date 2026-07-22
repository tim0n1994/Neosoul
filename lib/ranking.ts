// PRD §6.5 Hallway 排序——启发式排序（P0 可替换接口）。
// score = w1*关注房主或在场有你关注的人 + w2*兴趣标签重合度 + w3*在场人数(去极端) + w4*新鲜度

export interface RankableRoom {
  id: string;
  host_id: string;
  topic: string;
  tags: string[];
  participant_count: number;
  created_at: string;
}

export interface RankContext {
  userId: string;
  followingIds: Set<string>;
  interests: string[];
}

// 权重（可调）
const W_FOLLOW = 30; // 关注房主或在场有你关注的人
const W_INTEREST = 8; // 兴趣标签重合度（每个标签）
const W_PARTICIPANTS = 0.5; // 在场人数（去极端）
const W_FRESHNESS = 0.001; // 新鲜度（越近越好）
const MAX_PARTICIPANT_SCORE = 15; // 去极端——防止超大人房霸榜

/**
 * 计算单个房间的排序得分。
 * score 越高排越前。纯函数，可替换为 ML 排序。
 */
export function scoreRoom(room: RankableRoom, ctx: RankContext): number {
  let score = 0;

  // w1: 关注房主
  if (ctx.followingIds.has(room.host_id)) {
    score += W_FOLLOW;
  }

  // w2: 兴趣标签重合度（topic + tags）
  const roomInterests = [room.topic, ...room.tags];
  const overlap = roomInterests.filter((t) => ctx.interests.includes(t)).length;
  score += overlap * W_INTEREST;

  // w3: 在场人数（去极端——log-like 压缩）
  const pScore = Math.min(room.participant_count * W_PARTICIPANTS, MAX_PARTICIPANT_SCORE);
  score += pScore;

  // w4: 新鲜度（创建时间越近越好，每 ms 微加分）
  const ageMs = Date.now() - new Date(room.created_at).getTime();
  score += Math.max(0, W_FRESHNESS * (1000 * 60 * 60 - ageMs / 1000)); // 1h 内有新鲜度加成

  return score;
}

/**
 * 对房间列表排序。纯函数。保留原始对象的额外字段。
 */
export function rankRooms<T extends RankableRoom>(rooms: T[], ctx: RankContext): T[] {
  return [...rooms]
    .map((room) => ({ room, score: scoreRoom(room, ctx) }))
    .sort((a, b) => b.score - a.score)
    .map((item) => item.room);
}
