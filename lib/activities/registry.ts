// PRD §6.4 注册与加载 [决策]
// 导出 ACTIVITIES registry，用 next/dynamic 懒加载。
// 房主在房内「活动」菜单选择启动。
// 新增活动只需在此注册一行，不改 RoomView 核心。

import type { RoomActivity } from './types';

// 懒加载入口——每个活动独立 chunk
type ActivityLoader = () => Promise<{ default: RoomActivity<any, any> }>;

export const ACTIVITIES: Record<string, ActivityLoader> = {
  'listen-together': () => import('@/components/activities/listen-together'),
};

/** 获取活动列表（用于活动菜单） */
export function listActivities(): { id: string; name: string }[] {
  return Object.entries(ACTIVITIES).map(([id, loader]) => {
    // 同步名称从模块注释或约定获取——实际加载在 Panel 时发生
    // P0 简化：id 即展示名（可做 i18n 映射）
    const NAMES: Record<string, string> = {
      'listen-together': '一起听',
    };
    return { id, name: NAMES[id] ?? id };
  });
}

/** 加载单个活动模块 */
export async function loadActivity(id: string): Promise<RoomActivity | null> {
  const loader = ACTIVITIES[id];
  if (!loader) return null;
  try {
    const mod = await loader();
    return mod.default;
  } catch {
    return null;
  }
}
