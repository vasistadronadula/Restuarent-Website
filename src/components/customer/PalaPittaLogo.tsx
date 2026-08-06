import Image from 'next/image';

import { cn } from '@/lib/utils';

interface LogoProps {
  /**
   * `light` puts the mark on its own dark plaque, for use over a light surface
   * — the logo art is light-on-transparent and disappears otherwise.
   */
  variant?: 'light' | 'dark';
  size?: 'small' | 'medium' | 'large';
  className?: string;
  priority?: boolean;
}

const SIZES = {
  small: { h: 42, w: 132 },
  medium: { h: 58, w: 182 },
  large: { h: 80, w: 250 },
} as const;

export default function PalaPittaLogo({
  variant = 'dark',
  size = 'medium',
  className,
  priority = false,
}: LogoProps) {
  const isLight = variant === 'light';
  const { h, w } = SIZES[size];

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center transition-transform duration-200 hover:scale-[1.03]',
        isLight && 'rounded-xl border border-accent/20 bg-[#0B0404] px-3 py-1 shadow-lg',
        className
      )}
    >
      {/* Explicit intrinsic size rather than `fill`: the navbar reserves this
          box before the image decodes, so the bar doesn't jump on first paint. */}
      <Image
        src="/logo.png"
        alt="Pala Pitta Ruchulu"
        width={w}
        height={h}
        priority={priority}
        className="block h-auto w-auto object-contain"
        style={{ height: h }}
      />
    </span>
  );
}
