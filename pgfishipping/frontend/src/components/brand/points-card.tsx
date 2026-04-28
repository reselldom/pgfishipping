import * as React from 'react';
import { cn } from '@/lib/utils';

interface PointsCardProps {
  label?: string;
  points: number;
  validUntil?: string;
  referrals?: { used: number; total: number };
  className?: string;
}

/**
 * Liberty-style points widget — red-bordered card with the user's
 * Liberty/PGFI loyalty points. Sits on the right of the welcome bar.
 */
export function PointsCard({
  label = 'PGFI Points',
  points,
  validUntil,
  referrals,
  className,
}: PointsCardProps): JSX.Element {
  return (
    <div
      className={cn(
        'inline-flex flex-col gap-0.5 rounded-xl border-2 border-pg-red bg-card px-4 py-2 text-sm shadow-card',
        className,
      )}
    >
      <span className="text-xs font-semibold uppercase tracking-wide text-pg-muted">
        {label}
      </span>
      <span className="num text-2xl font-extrabold leading-none text-pg-ink">
        {points.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </span>
      {validUntil ? (
        <span className="text-[11px] text-pg-muted">
          Valid until <span className="font-semibold">{validUntil}</span>
        </span>
      ) : null}
      {referrals ? (
        <span className="text-[11px] text-pg-muted">
          Referred:{' '}
          <span className="font-semibold text-pg-ink">
            {referrals.used}/{referrals.total}
          </span>
        </span>
      ) : null}
    </div>
  );
}
