// PRD §6.2 四角色舞台权限模型——服务端强校验的核心逻辑。
// Host > Co-host > Speaker > Audience。所有管麦操作都经此校验。

export type StageRole = 'host' | 'cohost' | 'speaker' | 'audience';

/** cohost 允许的操作（不能操作 host、不能任命 cohost） */
export const COHOST_ACTIONS = new Set([
  'grant',
  'revoke',
  'mute',
  'delete_message',
  'pin',
  'unpin',
]);

/** host 才能做的操作 */
export const HOST_ONLY_ACTIONS = new Set([
  'kick',
  'ban',
  'promote_cohost',
  'demote_cohost',
  'end_room',
  'toggle_recording',
]);

export type ModerateAction =
  | 'grant'
  | 'revoke'
  | 'mute'
  | 'kick'
  | 'ban'
  | 'promote_cohost'
  | 'demote_cohost'
  | 'delete_message'
  | 'pin'
  | 'unpin'
  | 'toggle_recording';

/** 判断调用者是否可执行某操作 */
export function canPerform(
  callerRole: StageRole,
  action: ModerateAction,
): boolean {
  if (callerRole === 'host') return true;
  if (callerRole === 'cohost') return COHOST_ACTIONS.has(action);
  return false; // speaker/audience 不能管麦
}

/** cohost 不能操作 host */
export function canTarget(
  callerRole: StageRole,
  targetRole: StageRole,
): boolean {
  if (callerRole === 'host') return true;
  if (callerRole === 'cohost' && targetRole !== 'host') return true;
  return false;
}

/** 根据 host_id / room_roles 决定用户的舞台角色 */
export function resolveRole(
  userId: string,
  hostId: string,
  cohostIds: string[],
  canPublish: boolean,
): StageRole {
  if (userId === hostId) return 'host';
  if (cohostIds.includes(userId)) return 'cohost';
  if (canPublish) return 'speaker';
  return 'audience';
}
