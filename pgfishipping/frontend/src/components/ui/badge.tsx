import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-pg-navy text-white',
        navy: 'border-transparent bg-pg-navy text-white',
        red: 'border-transparent bg-pg-red text-white',
        orange: 'border-transparent bg-pg-orange text-white',
        gold: 'border-transparent bg-pg-gold text-pg-ink',
        mint: 'border-transparent bg-pg-mint text-white',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',

        /* Legacy soft variants kept for compatibility */
        success: 'border-transparent bg-pg-mint-50 text-pg-mint',
        warning: 'border-transparent bg-pg-orange-50 text-pg-orange',
        info: 'border-transparent bg-pg-navy-50 text-pg-navy',
        danger: 'border-transparent bg-pg-red-50 text-pg-red',
        muted: 'border-transparent bg-secondary text-muted-foreground',
        outline: 'text-foreground',

        /* 7-state shipment status palette (Shippex-inspired) */
        'status-waiting': 'border-transparent bg-pg-red text-white',
        'status-received': 'border-transparent bg-sky-500 text-white',
        'status-in-transit': 'border-transparent bg-pg-navy text-white',
        'status-in-transit-b':
          'border-transparent bg-indigo-700 text-white',
        'status-inventory': 'border-transparent bg-violet-600 text-white',
        'status-available': 'border-transparent bg-emerald-400 text-white',
        'status-delivered': 'border-transparent bg-pg-mint text-white',
        'status-returned': 'border-transparent bg-pg-red-700 text-white',
        'status-lost': 'border-transparent bg-pg-red-700 text-white',
        'status-cancelled': 'border-transparent bg-slate-500 text-white',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps): JSX.Element {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
