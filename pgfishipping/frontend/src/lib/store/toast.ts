import { create } from 'zustand';

export type ToastVariant = 'default' | 'success' | 'error';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant: ToastVariant;
}

export interface ToastInput {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  /** Convenience alias for `variant`. */
  kind?: ToastVariant;
  /** Convenience alias for `description`. */
  text?: string;
}

interface ToastState {
  toasts: Toast[];
  push: (t: ToastInput) => void;
  dismiss: (id: string) => void;
}

function normalize(input: ToastInput): Omit<Toast, 'id'> {
  return {
    title: input.title,
    description: input.description ?? input.text,
    variant: input.variant ?? input.kind ?? 'default',
  };
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (t) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { ...normalize(t), id }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }));
    }, 4500);
  },
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function toast(input: ToastInput): void {
  useToastStore.getState().push(input);
}
