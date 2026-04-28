import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  /**
   * When true, render the wordmark instead of the image asset.
   * Useful on dark surfaces where we want a single-color treatment.
   */
  wordmark?: boolean;
  monochrome?: boolean;
}

const HEIGHTS: Record<NonNullable<LogoProps['size']>, number> = {
  sm: 24,
  md: 36,
  lg: 56,
  xl: 80,
};

const WORDMARK_SIZES: Record<NonNullable<LogoProps['size']>, string> = {
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-3xl',
  xl: 'text-4xl',
};

export function Logo({
  size = 'md',
  className,
  wordmark = false,
  monochrome = false,
}: LogoProps): JSX.Element {
  if (wordmark) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 font-display font-extrabold leading-none tracking-tight',
          WORDMARK_SIZES[size],
          className,
        )}
      >
        <span className={monochrome ? 'text-current' : 'text-pg-red'}>
          PGFI
        </span>
        <span className={monochrome ? 'text-current' : 'text-pg-navy'}>
          Shipping
        </span>
      </span>
    );
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src="/brand/pgfi-logo.svg"
      alt="PGFI Shipping"
      height={HEIGHTS[size]}
      style={{ height: HEIGHTS[size], width: 'auto' }}
      className={cn('select-none', className)}
    />
  );
}
