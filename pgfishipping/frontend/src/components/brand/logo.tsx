import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  monochrome?: boolean;
}

const SIZES: Record<NonNullable<LogoProps['size']>, string> = {
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-3xl',
  xl: 'text-4xl',
};

const ICON_SIZES: Record<NonNullable<LogoProps['size']>, number> = {
  sm: 18,
  md: 26,
  lg: 36,
  xl: 44,
};

export function Logo({
  size = 'md',
  className,
  monochrome = false,
}: LogoProps): JSX.Element {
  const iconSize = ICON_SIZES[size];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-extrabold leading-none tracking-tight',
        SIZES[size],
        className,
      )}
    >
      <span className={monochrome ? 'text-current' : 'text-brand-red'}>
        PGFI
      </span>
      <svg
        width={iconSize}
        height={iconSize * 0.6}
        viewBox="0 0 60 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <path
          d="M3 12 L48 12 L42 4 L52 4 L60 14 L48 14 L42 22 L52 22 L60 12"
          stroke={monochrome ? 'currentColor' : 'hsl(var(--brand-navy))'}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M3 22 L42 22"
          stroke={monochrome ? 'currentColor' : 'hsl(var(--brand-red))'}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M3 30 L36 30"
          stroke={monochrome ? 'currentColor' : 'hsl(var(--brand-red))'}
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      <span className={monochrome ? 'text-current' : 'text-brand-navy'}>
        Shipping
      </span>
    </span>
  );
}
