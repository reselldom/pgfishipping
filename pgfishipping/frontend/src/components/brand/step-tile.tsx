import * as React from 'react';
import { cn } from '@/lib/utils';

interface StepTileProps {
  n: number;
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
  done?: boolean;
  className?: string;
}

/**
 * Liberty-style numbered wizard tile. Used as a row of three or four for
 * calculator/pre-alert/pricing flows.
 */
export function StepTile({
  n,
  label,
  icon,
  active = false,
  done = false,
  className,
}: StepTileProps): JSX.Element {
  const filled = active || done;
  return (
    <div
      className={cn(
        'flex flex-col items-stretch overflow-hidden rounded-xl border border-slate-200 bg-card shadow-card',
        className,
      )}
    >
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-3 text-sm font-semibold',
          filled ? 'bg-pg-navy text-white' : 'bg-slate-100 text-pg-muted',
        )}
      >
        <span
          className={cn(
            'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
            filled ? 'bg-white/20 text-white' : 'bg-slate-200 text-pg-muted',
          )}
        >
          {n}
        </span>
        <span className="flex-1 truncate">{label}</span>
        {icon ? <span className="shrink-0 opacity-90">{icon}</span> : null}
      </div>
      {/* Optional accent strip — used in active/done state */}
      <div
        className={cn(
          'h-1 w-full',
          filled ? 'bg-pg-red' : 'bg-transparent',
        )}
      />
    </div>
  );
}

interface StepTileRowProps {
  steps: Array<{
    n: number;
    label: string;
    icon?: React.ReactNode;
  }>;
  current: number;
  className?: string;
}

export function StepTileRow({
  steps,
  current,
  className,
}: StepTileRowProps): JSX.Element {
  return (
    <div
      className={cn(
        'grid gap-3',
        steps.length === 3 && 'sm:grid-cols-3',
        steps.length === 4 && 'sm:grid-cols-4',
        className,
      )}
    >
      {steps.map((s) => (
        <StepTile
          key={s.n}
          n={s.n}
          label={s.label}
          icon={s.icon}
          active={s.n === current}
          done={s.n < current}
        />
      ))}
    </div>
  );
}
