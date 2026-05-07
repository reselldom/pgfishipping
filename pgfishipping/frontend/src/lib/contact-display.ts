import type { FooterPhoneLine } from '@/lib/public-api';

/** Treat warehouse seed placeholders like +1 305 000 0000 as “use footer instead”. */
export function isPlaceholderWarehousePhone(p: string | null | undefined): boolean {
  if (!p?.trim()) return true;
  const digits = p.replace(/\D/g, '');
  if (digits.length < 7) return true;
  // Lines that are all zeros in the local part (common seed / example numbers)
  if (/0{5,}/.test(digits)) return true;
  if (digits.endsWith('0000000') || digits.endsWith('000000')) return true;
  return false;
}

/** Prefer warehouse phone unless it is a placeholder; then use first footer line. */
export function phoneForWarehouseRow(
  warehousePhone: string | null | undefined,
  footerPhones: FooterPhoneLine[],
): string | null {
  if (!isPlaceholderWarehousePhone(warehousePhone) && warehousePhone?.trim()) {
    return warehousePhone.trim();
  }
  const first = footerPhones[0]?.number?.trim();
  return first || null;
}

export function telHref(number: string): string {
  return `tel:${number.trim().replace(/\s/g, '')}`;
}
