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

export function avatarDataUri(style: string, seed: string): string {
  const mod = (collection as Record<string, unknown>)[style] ?? collection.thumbs;
  return createAvatar(mod as Parameters<typeof createAvatar>[0], { seed }).toDataUri();
}

export function randomSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function resolveAvatarSrc(
  avatarType: string | null | undefined,
  style: string,
  seed: string,
): string {
  if (avatarType === 'custom' && seed.startsWith('http')) {
    return seed;
  }
  return avatarDataUri(style, seed);
}
