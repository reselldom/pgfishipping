import { clientApiBaseUrl } from './client-api-base-url';

const API_URL = clientApiBaseUrl();

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
  /** Either a wa.me URL or a tel: link — the storefront treats it as href. */
  whatsapp?: string;
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

export interface PublicHaitiDeptOption {
  key: string;
  nameFr: string;
  capital: string;
  cities: string[];
}

export async function fetchPublicHaitiDeliveryOptions(): Promise<PublicHaitiDeptOption[]> {
  try {
    const r = await fetch(`${API_URL}/public/haiti-delivery`, {
      credentials: 'omit',
      cache: 'no-store',
    });
    if (!r.ok) return [];
    const body = (await r.json()) as ApiEnvelope<{ departments: PublicHaitiDeptOption[] }>;
    if (!body.ok || !body.data?.departments) return [];
    return body.data.departments;
  } catch {
    return [];
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

// ─── Homepage branding images (Super Admin → Site images) ─────────────────

export type BrandingSlot =
  | 'hero'
  | 'homeAir'
  | 'homeWarehouse'
  | 'homeTruck'
  | 'homePickup'
  | 'homeDoorstep';

export interface BrandingImage {
  /** URL stored by admin. Empty string ⇒ frontend should use `defaultPath`. */
  url: string;
  defaultPath: string;
  label: string;
}

export type BrandingImages = Record<BrandingSlot, BrandingImage>;

/** Bundled defaults — used as fallback when admin hasn't set a custom URL. */
export const BRANDING_DEFAULTS: Record<BrandingSlot, string> = {
  hero: '/brand/hero-default.png',
  homeAir: '/brand/home/air-cargo.png',
  homeWarehouse: '/brand/home/warehouse.png',
  homeTruck: '/brand/home/truck-highway.png',
  homePickup: '/brand/home/customer-pickup.png',
  homeDoorstep: '/brand/home/customer-doorstep.png',
};

/** Backwards-compatible alias kept so older imports keep working. */
export const DEFAULT_HERO_IMAGE_PATH = BRANDING_DEFAULTS.hero;

/** Fetch every branding slot at once. Returns an empty object on network error. */
export async function fetchPublicBrandingImages(): Promise<Partial<BrandingImages>> {
  try {
    const r = await fetch(`${API_URL}/public/branding-images`, {
      credentials: 'omit',
      cache: 'no-store',
    });
    if (!r.ok) return {};
    const body = (await r.json()) as ApiEnvelope<BrandingImages>;
    return body.ok && body.data ? body.data : {};
  } catch {
    return {};
  }
}

/** Resolve a slot URL to either the admin override or the bundled default. */
export function resolveBrandingUrl(
  slot: BrandingSlot,
  images: Partial<BrandingImages>,
): string {
  const u = images[slot]?.url;
  return u && u.length > 0 ? u : BRANDING_DEFAULTS[slot];
}

/** Legacy alias used by older imports — fetches just the hero slot. */
export async function fetchPublicHeroImage(): Promise<{ url: string }> {
  const all = await fetchPublicBrandingImages();
  return { url: all.hero?.url ?? '' };
}

// ─── Warehouses & branches (Super Admin → Warehouses & branches) ───────────

export interface PublicWarehouse {
  id: string;
  name: string;
  type: 'US' | 'HT' | string;
  address: string;
  city: string;
  state: string | null;
  country: string;
  phone: string | null;
  email: string | null;
  sortOrder: number;
}

export async function fetchPublicWarehouses(): Promise<PublicWarehouse[]> {
  try {
    const r = await fetch(`${API_URL}/public/warehouses`, {
      credentials: 'omit',
      cache: 'no-store',
    });
    if (!r.ok) return [];
    const body = (await r.json()) as ApiEnvelope<PublicWarehouse[]>;
    return body.ok && Array.isArray(body.data) ? body.data : [];
  } catch {
    return [];
  }
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
