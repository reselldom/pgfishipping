const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

type ApiEnvelope<T> =
  | { ok: true; data: T; meta?: unknown }
  | { ok: false; error: { code: string; message: string } };

// ─── Calculator ───────────────────────────────────────────────────────────────

/** UI allows EXPRESS; backend only AIR / SEA — map EXPRESS → AIR before POST. */
export type ServiceType = 'AIR' | 'SEA' | 'EXPRESS';

export interface CalculatorInput {
  serviceType: ServiceType;
  weightLbs: number;
  length?: number;
  width?: number;
  height?: number;
  fobValue?: number;
  fobCurrency?: 'USD' | 'EUR';
  contentType?: 'PACKAGE' | 'DOCUMENT';
  specialCategory?: string;
}

export interface FeeLine {
  feeType: string;
  name: string;
  ratePerLb: number | null;
  flatFee: number | null;
  amountUsd: number;
}

export interface CalculatorResult {
  serviceType: string;
  billableWeightLbs: number;
  lines: FeeLine[];
  subtotalUsd: number;
  taxRate: number;
  taxUsd: number;
  totalUsd: number;
  exchangeRate: number;
  totalHtg: number;
  fobValueUsd: number | null;
}

export async function estimateShipping(
  input: CalculatorInput,
): Promise<CalculatorResult> {
  const serviceType =
    input.serviceType === 'SEA'
      ? 'SEA'
      : 'AIR'; /* AIR + EXPRESS */
  const body = {
    ...input,
    serviceType,
  };
  const r = await fetch(`${API_URL}/calculator/estimate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'omit',
    body: JSON.stringify(body),
  });
  const json = (await r.json()) as ApiEnvelope<CalculatorResult>;
  if (!r.ok || !json.ok) {
    throw new Error(
      !json.ok ? json.error?.message ?? 'Request failed' : 'Request failed',
    );
  }
  return json.data;
}

// ─── Public tracking ─────────────────────────────────────────────────────────

export interface PublicTracking {
  trackingCode: string;
  externalTracking: string | null;
  externalCarrier: string | null;
  status: string;
  step: number;
  serviceType: string;
  originCountry: string;
  destinationCountry: string;
  contentsDescription: string | null;
  weightLbs: number | null;
  recipientName: string | null;
  createdAt: string | Date;
  deliveredAt: string | Date | null;
  events: Array<{
    status: string;
    label: string | null;
    location: string | null;
    timestamp: string | Date;
  }>;
}

export async function trackPublic(code: string): Promise<PublicTracking> {
  const r = await fetch(
    `${API_URL}/track/${encodeURIComponent(code.trim())}`,
    { credentials: 'omit' },
  );
  const json = (await r.json()) as ApiEnvelope<PublicTracking>;
  if (!r.ok || !json.ok) {
    throw new Error(
      !json.ok ? json.error?.message ?? 'Not found' : 'Not found',
    );
  }
  return json.data;
}

// ─── Marketing site footer (URLs from Super Admin → Social links) ───────────

export interface PublicSocialLinks {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  youtube?: string;
  tiktok?: string;
}

export async function fetchPublicSocialLinks(): Promise<PublicSocialLinks> {
  try {
    const r = await fetch(`${API_URL}/public/social-links`, {
      credentials: 'omit',
      cache: 'no-store',
    });
    if (!r.ok) return {};
    const body = (await r.json()) as ApiEnvelope<PublicSocialLinks>;
    return body.ok && body.data ? body.data : {};
  } catch {
    return {};
  }
}

// ─── Footer addresses + contacts (Super Admin → Footer content) ────────────

export interface FooterLocationBlock {
  title: string;
  detail: string;
}

/** One phone line from Admin; `label` is optional (e.g. Fax, Business). */
export interface FooterPhoneLine {
  label?: string;
  number: string;
}

export interface PublicFooterContent {
  phones: FooterPhoneLine[];
  email: string;
  /** Stored as free text so you can localize in the admin UI. */
  businessHours: string;
  usaLocations: FooterLocationBlock[];
  haitiLocations: FooterLocationBlock[];
}

export async function fetchPublicFooterContent(): Promise<PublicFooterContent> {
  const empty = (): PublicFooterContent => ({
    phones: [],
    email: '',
    businessHours: '',
    usaLocations: [],
    haitiLocations: [],
  });
  try {
    const r = await fetch(`${API_URL}/public/footer`, {
      credentials: 'omit',
      cache: 'no-store',
    });
    if (!r.ok) return empty();
    const body = (await r.json()) as ApiEnvelope<PublicFooterContent>;
    return body.ok && body.data ? body.data : empty();
  } catch {
    return empty();
  }
}
