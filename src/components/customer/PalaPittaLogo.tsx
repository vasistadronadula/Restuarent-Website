import Image from 'next/image';

import { cn } from '@/lib/utils';

interface LogoProps {
  /**
   * Visual variant:
   * - 'light': Default on bright/cream/white surfaces. Pure transparent logo mark.
   * - 'dark': For dark backgrounds, places the logo on a subtle clean pill.
   * - 'plain': Clean image with no container styling.
   */
  variant?: 'light' | 'dark' | 'plain';
  size?: 'small' | 'medium' | 'large';
  className?: string;
  priority?: boolean;
}

const SIZES = {
  small: { h: 36, w: 121 },
  medium: { h: 50, w: 168 },
  large: { h: 70, w: 235 },
} as const;

export default function PalaPittaLogo({
  variant = 'light',
  size = 'medium',
  className,
  priority = false,
}: LogoProps) {
  const { h, w } = SIZES[size];

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center transition-transform duration-200 hover:scale-[1.02] select-none',
        variant === 'dark' && 'rounded-xl bg-white/95 px-3 py-1.5 shadow-sm backdrop-blur-xs',
        className
      )}
    >
      <Image
        src="/logo.png"
        alt="Pala Pitta Ruchulu"
        width={w}
        height={h}
        priority={priority}
        className="block h-auto w-auto object-contain"
        style={{ height: `${h}px` }}
      />
    </span>
  );
}

