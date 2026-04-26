import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        success: 'border-transparent bg-green-100 text-green-800',
        warning: 'border-transparent bg-amber-100 text-amber-800',
        info: 'border-transparent bg-blue-100 text-blue-800',
        danger: 'border-transparent bg-red-100 text-red-800',
        muted: 'border-transparent bg-secondary text-muted-foreground',
        outline: 'text-foreground',
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

export function statusVariant(
  status: string,
):
  | 'default'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'info'
  | 'danger'
  | 'muted' {
  const s = status.toUpperCase();
  if (
    s === 'DELIVERED' ||
    s === 'COMPLETED' ||
    s === 'ACTIVE' ||
    s === 'PAID' ||
    s === 'RESOLVED'
  )
    return 'success';
  if (
    s === 'WAITING' ||
    s === 'PENDING' ||
    s === 'PENDING_VERIFICATION' ||
    s === 'OPEN'
  )
    return 'warning';
  if (
    s === 'IN_TRANSIT' ||
    s === 'IN_TRANSIT_B' ||
    s === 'RECEIVED' ||
    s === 'INVENTORY' ||
    s === 'AVAILABLE' ||
    s === 'IN_PROGRESS'
  )
    return 'info';
  if (
    s === 'CANCELLED' ||
    s === 'LOST' ||
    s === 'RETURNED' ||
    s === 'FAILED' ||
    s === 'SUSPENDED' ||
    s === 'BANNED' ||
    s === 'CLOSED' ||
    s === 'VOIDED'
  )
    return 'danger';
  return 'muted';
}
