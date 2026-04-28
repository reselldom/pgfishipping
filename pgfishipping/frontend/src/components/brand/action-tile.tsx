import * as React from 'react';
import Link from 'next/link';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const tileVariants = cva(
  'relative flex flex-col items-center justify-center gap-1.5 rounded-xl px-3 py-4 text-center text-xs font-semibold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pg-orange focus-visible:ring-offset-2',
  {
    variants: {
      tone: {
        navy: 'bg-pg-navy text-white hover:bg-pg-navy-700',
        red: 'bg-pg-red text-white hover:bg-pg-red-700',
        orange: 'bg-pg-orange text-white hover:brightness-95',
        mint: 'bg-pg-mint text-white hover:brightness-95',
        gold: 'bg-pg-gold text-pg-ink hover:brightness-95',
      },
    },
    defaultVariants: { tone: 'navy' },
  },
);

interface ActionTileProps extends VariantProps<typeof tileVariants> {
  href: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  className?: string;
}

/**
 * Liberty-style action tile — used in a 4-tile row on the dashboard
 * (Calculate / Pre-Alert / Track / Cart).
 */
export function ActionTile({
  href,
  icon,
  label,
  badge,
  tone,
  className,
}: ActionTileProps): JSX.Element {
  return (
    <Link href={href} className={cn(tileVariants({ tone }), className)}>
      <span className="text-2xl">{icon}</span>
      <span>{label}</span>
      {typeof badge === 'number' && badge > 0 ? (
        <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-pg-red px-1 text-[10px] font-bold text-white">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}
