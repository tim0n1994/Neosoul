import { AvatarImage } from '@/components/AvatarImage';
import { LogoutButton } from '@/components/LogoutButton';

interface Props {
  name: string;
  style: string;
  seed: string;
  right?: React.ReactNode;
}

export function TopBar({ name, style, seed, right }: Props) {
  return (
    <header className="flex items-center justify-between px-6 py-5">
      <span className="text-lg font-light tracking-[0.2em] text-cream-50">
        Neosoul
      </span>
      <div className="flex items-center gap-3">
        {right}
        <div className="flex items-center gap-2">
          <AvatarImage style={style} seed={seed} size={28} />
          <span className="hidden text-xs font-light text-cream-200 sm:inline">{name}</span>
        </div>
        <LogoutButton />
      </div>
    </header>
  );
}
