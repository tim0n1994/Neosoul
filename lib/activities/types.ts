// PRD §6.4 Room Activity SDK [决策] ——可插拔房间活动接口。
// 一个 Activity = manifest + 客户端 UI(Panel) + 权威 reducer + 状态同步通道。
// 后续所有玩法（狼人杀/Quiz/投票）走插件，零核心改动。

export type ActivityRole = 'host' | 'cohost' | 'speaker' | 'audience';

export interface ActivityContext {
  roomId: string;
  selfId: string;
  role: ActivityRole;
  participants: { id: string; name: string; role: string }[];
  /** 广播动作（reliable data channel） */
  send: (action: ActivityAction) => void;
}

export interface ActivityAction {
  type: string;
  payload?: Record<string, unknown>;
}

export interface RoomActivity<S = Record<string, unknown>, A = ActivityAction> {
  /** 唯一标识 'listen-together' | 'quiz' | 'werewolf' */
  id: string;
  /** 显示名称 */
  name: string;
  /** 最小/最大玩家数 */
  minPlayers: number;
  maxPlayers: number;
  /** 是否仅房主可启动 */
  hostOnlyStart: boolean;
  /** 初始状态工厂 */
  initialState: (ctx: ActivityContext) => S;
  /**
   * 权威 reducer：默认由 host 客户端执行并广播结果。
   * 敏感隐藏信息（狼人杀身份牌）用 serverAuthoritative=true。
   */
  reduce: (state: S, action: A, ctx: ActivityContext) => S;
  /** 房内 UI 覆盖层 */
  Panel: React.ComponentType<{ state: S; ctx: ActivityContext }>;
  /** true 时状态机跑在 Edge Function，隐藏信息不下发 */
  serverAuthoritative?: boolean;
}
