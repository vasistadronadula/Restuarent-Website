import Image from 'next/image';

import { cn } from '@/lib/utils';

interface LogoProps {
  /**
   * Visual variant:
   * - 'light': Default on bright/cream/white surfaces. Pure transparent logo mark with dark text.
   * - 'dark' | 'white': For colored/red/dark backgrounds. Pure transparent logo mark with white text.
   * - 'plain': Clean image with no container styling.
   */
  variant?: 'light' | 'dark' | 'white' | 'plain';
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
  const isWhite = variant === 'dark' || variant === 'white';

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center transition-transform duration-200 hover:scale-[1.02] select-none',
        className
      )}
    >
      <Image
        src={isWhite ? '/logo-white.png' : '/logo.png'}
        alt="Pala Pitta Ruchulu"
        width={1948}
        height={579}
        sizes={`${w}px`}
        priority={priority}
        className="block h-auto w-auto object-contain"
        style={{ height: `${h}px`, width: 'auto' }}
      />
    </span>
  );
}
