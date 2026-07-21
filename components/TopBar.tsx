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
    <header className="flex items-center justify-between px-6 py-4">
      <span className="bg-gradient-to-r from-brand-from to-brand-to bg-clip-text text-xl font-bold text-transparent">
        Neosoul
      </span>
      <div className="flex items-center gap-3">
        {right}
        <AvatarImage style={style} seed={seed} size={32} />
        <span className="hidden text-sm text-white/70 sm:inline">{name}</span>
        <LogoutButton />
      </div>
    </header>
  );
}
