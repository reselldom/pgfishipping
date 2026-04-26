'use client';

import { useToastStore } from '@/lib/store/toast';
import { cn } from '@/lib/utils';

export function Toaster(): JSX.Element {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto rounded-md border bg-card p-4 shadow-lg transition-all',
            t.variant === 'success' && 'border-green-300 bg-green-50',
            t.variant === 'error' && 'border-destructive/40 bg-red-50',
          )}
          onClick={() => dismiss(t.id)}
        >
          {t.title && <div className="text-sm font-semibold">{t.title}</div>}
          {t.description && (
            <div className="mt-0.5 text-sm text-muted-foreground">
              {t.description}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
