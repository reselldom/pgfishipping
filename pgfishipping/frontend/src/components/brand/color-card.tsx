import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const headerVariants = cva(
  'flex items-center gap-2 rounded-t-2xl px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-white',
  {
    variants: {
      tone: {
        navy: 'bg-pg-navy',
        red: 'bg-pg-red',
        orange: 'bg-pg-orange',
        mint: 'bg-pg-mint',
        gold: 'bg-pg-gold text-pg-ink',
      },
    },
    defaultVariants: { tone: 'navy' },
  },
);

interface ColorCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'>,
    VariantProps<typeof headerVariants> {
  title: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

export function ColorCard({
  tone,
  title,
  icon,
  badge,
  className,
  children,
  ...props
}: ColorCardProps): JSX.Element {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-slate-200 bg-card shadow-card',
        className,
      )}
      {...props}
    >
      <div className={headerVariants({ tone })}>
        {icon ? <span className="shrink-0">{icon}</span> : null}
        <span className="flex-1">{title}</span>
        {badge ? <span className="ml-auto">{badge}</span> : null}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
