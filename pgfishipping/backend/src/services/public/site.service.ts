import { z } from 'zod';
import { prisma } from '../../config/database';

const SOCIAL_CONFIG_KEY = 'public_social_links';

// ─── Warehouses & branches (read-only marketing list) ──────────────────────

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

// ─── Branding images (homepage banner + photo tiles; admin-controlled) ────
//
// Each slot maps to a single SystemConfig row that stores a URL. When the URL
// is empty, the public site falls back to the bundled image at
// `frontend/public/<defaultPath>`. New slots only require an entry here and a
// matching default file in the frontend.

export const BRANDING_SLOTS = {
  hero: {
    configKey: 'public_hero_image',
    label: 'Homepage hero (full background)',
    defaultPath: '/brand/hero-default.png',
  },
  homeAir: {
    configKey: 'public_home_air_image',
    label: 'Home — Air freight tile',
    defaultPath: '/brand/home/air-cargo.png',
  },
  homeWarehouse: {
    configKey: 'public_home_warehouse_image',
    label: 'Home — Warehouse / hub tile',
    defaultPath: '/brand/home/warehouse.png',
  },
  homeTruck: {
    configKey: 'public_home_truck_image',
    label: 'Home — Truck / road tile',
    defaultPath: '/brand/home/truck-highway.png',
  },
  homePickup: {
    configKey: 'public_home_pickup_image',
    label: 'Home — Customer at branch',
    defaultPath: '/brand/home/customer-pickup.png',
  },
  homeDoorstep: {
    configKey: 'public_home_doorstep_image',
    label: 'Home — Doorstep delivery',
    defaultPath: '/brand/home/customer-doorstep.png',
  },
} as const;

export type BrandingSlot = keyof typeof BRANDING_SLOTS;

export const BRANDING_SLOT_KEYS = Object.keys(BRANDING_SLOTS) as BrandingSlot[];

export interface BrandingImage {
  /** URL stored in DB. Empty string means "use bundled default". */
  url: string;
  /** Public path of the bundled default served by the frontend. */
  defaultPath: string;
  /** Human-readable label for the admin UI. */
  label: string;
}

export type BrandingImagesPayload = Record<BrandingSlot, BrandingImage>;

function isBrandingSlot(value: string): value is BrandingSlot {
  return Object.prototype.hasOwnProperty.call(BRANDING_SLOTS, value);
}

/** Read all branding-image slots in a single round-trip. */
export async function getPublicBrandingImages(): Promise<BrandingImagesPayload> {
  const keys = BRANDING_SLOT_KEYS.map((s) => BRANDING_SLOTS[s].configKey);
  const rows = await prisma.systemConfig.findMany({
    where: { key: { in: keys } },
  });
  const byKey = new Map(rows.map((r) => [r.key, (r.value ?? '').trim()]));
  const out = {} as BrandingImagesPayload;
  for (const slot of BRANDING_SLOT_KEYS) {
    const conf = BRANDING_SLOTS[slot];
    out[slot] = {
      url: byKey.get(conf.configKey) ?? '',
      defaultPath: conf.defaultPath,
      label: conf.label,
    };
  }
  return out;
}

/** Persist a slot URL. Pass empty string to reset to the bundled default. */
export async function setBrandingImageUrl(
  slot: BrandingSlot,
  url: string,
): Promise<BrandingImage> {
  const conf = BRANDING_SLOTS[slot];
  if (!conf) throw new Error(`Invalid branding slot: ${String(slot)}`);
  const value = (url ?? '').trim();
  await prisma.systemConfig.upsert({
    where: { key: conf.configKey },
    create: { key: conf.configKey, value },
    update: { value },
  });
  return { url: value, defaultPath: conf.defaultPath, label: conf.label };
}

/** Validate a string and return the corresponding slot, or null. */
export function parseBrandingSlot(input: string): BrandingSlot | null {
  return isBrandingSlot(input) ? input : null;
}

// ─── Hero image (legacy alias kept so existing public hero endpoint keeps
//     working — internally now backed by the branding slots above) ──────────

export interface PublicHeroImage {
  url: string;
}

export async function getPublicHeroImage(): Promise<PublicHeroImage> {
  const all = await getPublicBrandingImages();
  return { url: all.hero.url };
}

export async function setPublicHeroImageUrl(url: string): Promise<PublicHeroImage> {
  const result = await setBrandingImageUrl('hero', url);
  return { url: result.url };
}

/**
 * Active warehouses for the public site. Only safe-to-show fields are returned;
 * inactive warehouses are excluded so admins can hide entries without deleting.
 */
export async function getPublicWarehouses(): Promise<PublicWarehouse[]> {
  const items = await prisma.warehouse.findMany({
    where: { isActive: true },
    orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      type: true,
      address: true,
      city: true,
      state: true,
      country: true,
      phone: true,
      email: true,
      sortOrder: true,
    },
  });
  return items;
}

const optionalUrl = z
  .union([z.string().url(), z.literal('')])
  .optional();

const socialLinksSchema = z.object({
  facebook: optionalUrl,
  instagram: optionalUrl,
  twitter: optionalUrl,
  youtube: optionalUrl,
  tiktok: optionalUrl,
});

export type PublicSocialLinks = z.infer<typeof socialLinksSchema>;

/** Read social URLs for the marketing site (set from admin → Config / Social links). */
export async function getPublicSocialLinks(): Promise<PublicSocialLinks> {
  const row = await prisma.systemConfig.findUnique({ where: { key: SOCIAL_CONFIG_KEY } });
  if (!row?.value.trim()) return {};
  try {
    const parsed = JSON.parse(row.value) as unknown;
    const data = socialLinksSchema.safeParse(parsed);
    return data.success ? stripEmptyUrls(data.data) : {};
  } catch {
    return {};
  }
}

function stripEmptyUrls(links: PublicSocialLinks): PublicSocialLinks {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(links)) {
    if (v && typeof v === 'string' && v.trim() !== '') {
      out[k] = v.trim();
    }
  }
  return out as PublicSocialLinks;
}

// ─── Footer (locations + contact lines) ──────────────────────────────────────

export const FOOTER_CONFIG_KEY = 'public_footer_content';

const footerSpotSchema = z.object({
  title: z.string().min(1).max(300),
  detail: z.string().max(8000).optional(),
});

const phoneEntrySchema = z.object({
  label: z.string().max(120).optional(),
  number: z.string().max(120),
});

const footerContentSchema = z.object({
  phones: z
    .array(
      z.union([z.string().max(120), phoneEntrySchema]),
    )
    .optional(),
  email: z.union([z.string().email(), z.literal('')]).optional(),
  businessHours: z.string().max(800).optional(),
  usaLocations: z.array(footerSpotSchema).optional(),
  haitiLocations: z.array(footerSpotSchema).optional(),
});

export type FooterPhoneLine = { label?: string; number: string };

export type PublicFooterContent = {
  phones: FooterPhoneLine[];
  email: string;
  /** Free-text line shown in the footer (e.g. open hours); optional in CMS. */
  businessHours: string;
  usaLocations: Array<{ title: string; detail: string }>;
  haitiLocations: Array<{ title: string; detail: string }>;
};

/** Shown when a section has not been set in Admin → Footer content (marketing fallback). */
const FOOTER_FALLBACK: PublicFooterContent = {
  phones: [{ number: '+1 305 000 0000' }],
  email: 'support@pgfishipping.com',
  businessHours: 'Monday–Saturday · 9:00 AM – 5:00 PM',
  usaLocations: [
    {
      title: 'Miami (US hub)',
      detail: '8435 NW 68TH ST\nMedley, FL 33166, USA',
    },
  ],
  haitiLocations: [
    {
      title: 'Port-au-Prince',
      detail: 'Delmas 33\nPort-au-Prince',
    },
    {
      title: 'Cap-Haïtien',
      detail: 'Rue 11\nCap-Haïtien',
    },
  ],
};

export const FALLBACK_PUBLIC_FOOTER_JSON = JSON.stringify({
  phones: FOOTER_FALLBACK.phones,
  email: FOOTER_FALLBACK.email,
  businessHours: FOOTER_FALLBACK.businessHours,
  usaLocations: FOOTER_FALLBACK.usaLocations,
  haitiLocations: FOOTER_FALLBACK.haitiLocations,
});

function emptyFooter(): PublicFooterContent {
  return {
    phones: [],
    email: '',
    businessHours: '',
    usaLocations: [],
    haitiLocations: [],
  };
}

function mergeFooterDefaults(normalized: PublicFooterContent): PublicFooterContent {
  const out = { ...normalized };
  if (out.phones.length === 0 && !out.email) {
    out.phones = [...FOOTER_FALLBACK.phones];
    out.email = FOOTER_FALLBACK.email;
  }
  if (out.usaLocations.length === 0) {
    out.usaLocations = FOOTER_FALLBACK.usaLocations.map((x) => ({ ...x }));
  }
  if (out.haitiLocations.length === 0) {
    out.haitiLocations = FOOTER_FALLBACK.haitiLocations.map((x) => ({ ...x }));
  }
  if (!out.businessHours?.trim()) {
    out.businessHours = FOOTER_FALLBACK.businessHours;
  }
  return out;
}

/** Contact + USA / Haiti address blocks controlled from Admin → Footer content. */
export async function getPublicFooterContent(): Promise<PublicFooterContent> {
  const row = await prisma.systemConfig.findUnique({
    where: { key: FOOTER_CONFIG_KEY },
  });
  if (!row?.value.trim()) {
    return mergeFooterDefaults(emptyFooter());
  }
  try {
    const parsed = JSON.parse(row.value) as unknown;
    const data = footerContentSchema.safeParse(parsed);
    if (!data.success) {
      return mergeFooterDefaults(emptyFooter());
    }
    return mergeFooterDefaults(normalizeFooter(data.data));
  } catch {
    return mergeFooterDefaults(emptyFooter());
  }
}

function normalizeFooter(
  input: z.infer<typeof footerContentSchema>,
): PublicFooterContent {
  const phones = normalizePhoneEntries(input.phones ?? []);
  const rawEmail = (input.email ?? '').trim();
  const email =
    rawEmail === '' ? '' : z.string().email().safeParse(rawEmail).success
      ? rawEmail
      : '';
  const businessHours = (input.businessHours ?? '').trim().slice(0, 800);

  function cleanSpots(list: typeof input.usaLocations): PublicFooterContent['usaLocations'] {
    return (
      list ?? ([] as z.infer<typeof footerSpotSchema>[])
    )
      .map((loc) => ({
        title: loc.title.trim(),
        detail: (loc.detail ?? '').trim(),
      }))
      .filter((loc) => loc.title.length > 0)
      .slice(0, 35);
  }

  return {
    phones,
    email,
    businessHours,
    usaLocations: cleanSpots(input.usaLocations),
    haitiLocations: cleanSpots(input.haitiLocations),
  };
}

function normalizePhoneEntries(
  raw: Array<string | z.infer<typeof phoneEntrySchema>>,
): FooterPhoneLine[] {
  const out: FooterPhoneLine[] = [];
  for (const item of raw) {
    if (typeof item === 'string') {
      const n = item.trim();
      if (n) out.push({ number: n });
      continue;
    }
    const number = item.number.trim();
    if (!number) continue;
    const labelRaw = item.label?.trim();
    const line: FooterPhoneLine = { number };
    if (labelRaw) line.label = labelRaw;
    out.push(line);
    if (out.length >= 40) break;
  }
  return out;
}
