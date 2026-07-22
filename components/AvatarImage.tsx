import { resolveAvatarSrc } from '@/lib/avatar';

interface Props {
  style: string;
  seed: string;
  avatarType?: string;
  size?: number;
  className?: string;
}

// 由 style + seed 渲染 <img>（PRD §14）。3D 场景里把同一 dataURI 作纹理。
export function AvatarImage({ style, seed, avatarType, size = 36, className }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolveAvatarSrc(avatarType, style, seed)}
      width={size}
      height={size}
      alt="头像"
      className={className}
      style={{
        borderRadius: '9999px',
        objectFit: 'cover',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    />
  );
}
