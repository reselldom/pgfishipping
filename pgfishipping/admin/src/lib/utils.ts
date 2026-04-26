import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatCurrency(n: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(n);
}

export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString();
}

export function formatDateTime(d: string | Date | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleString();
}
