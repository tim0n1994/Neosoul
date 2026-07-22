import { createAvatar } from '@dicebear/core';
import * as collection from '@dicebear/collection';

// DiceBear 风格（PRD §14）。从 collection 命名导出中按名取对应模块。
export const AVATAR_STYLES = [
  'thumbs',
  'bottts',
  'funEmoji',
  'notionists',
  'avataaars',
  'identicon',
] as const;

export type AvatarStyle = (typeof AVATAR_STYLES)[number];

// PRD §6.1 分层捏脸参数结构——核心部件全部免费
export interface AvatarConfig {
  backgroundColor?: string[];  // 背景色（DiceBear backgroundColor 选项）
  radius?: number;             // 圆角
  backgroundType?: string;     // gradient / solid
  scale?: number;              // 缩放
  flip?: boolean;
}

// 预置色板——捏脸时选择
export const BG_COLORS = [
  'c47b78', 'b89968', 'd9a29a', '6b8e7f', '8a7f78', '5a6c7d',
] as const;

export const BG_TYPES = ['solid', 'gradientLinear'] as const;

export function avatarDataUri(style: string, seed: string, options?: AvatarConfig): string {
  const mod = (collection as Record<string, unknown>)[style] ?? collection.thumbs;
  const dicebearOptions: Record<string, unknown> = { seed };
  if (options?.backgroundColor?.length) {
    dicebearOptions.backgroundColor = options.backgroundColor;
  }
  if (options?.radius !== undefined) {
    dicebearOptions.radius = options.radius;
  }
  if (options?.backgroundType) {
    dicebearOptions.backgroundType = options.backgroundType;
  }
  if (options?.scale !== undefined) {
    dicebearOptions.scale = options.scale;
  }
  if (options?.flip !== undefined) {
    dicebearOptions.flip = options.flip;
  }
  return createAvatar(mod as Parameters<typeof createAvatar>[0], dicebearOptions).toDataUri();
}

export function randomSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function resolveAvatarSrc(
  avatarType: string | null | undefined,
  style: string,
  seed: string,
  avatarConfig?: AvatarConfig | null,
): string {
  if (avatarType === 'custom' && seed.startsWith('http')) {
    return seed;
  }
  return avatarDataUri(style, seed, avatarConfig ?? undefined);
}
