import { z } from 'zod';
import { prisma } from '../../config/database';
import {
  type HaitiDepartmentKey,
  HAITI_DEPARTMENTS,
  haitiCityCompoundKey,
  isValidHaitiDeliveryPair,
  listAllCityCompoundKeys,
} from '../../constants/haiti-delivery';
import { Errors } from '../../utils/response';

const CONFIG_KEY = 'haiti_delivery_disabled_cities';

const disabledPayloadSchema = z.object({
  keys: z.array(z.string().max(120)).optional(),
});

export type PublicHaitiDeptOption = {
  key: HaitiDepartmentKey;
  nameFr: string;
  capital: string;
  cities: string[];
};

/**
 * Persisted compound keys `"DEPT:CITY"` (e.g. `OUEST:Carrefour`) that are hidden
 * from customer pre-alert and must not be submitted.
 */
export async function getDisabledHaitiCityKeys(): Promise<Set<string>> {
  const row = await prisma.systemConfig.findUnique({ where: { key: CONFIG_KEY } });
  if (!row?.value?.trim()) return new Set();
  try {
    const raw = JSON.parse(row.value) as unknown;
    const data = disabledPayloadSchema.safeParse(raw);
    const keys = data.success ? (data.data.keys ?? []) : [];
    return new Set(keys.filter(Boolean));
  } catch {
    return new Set();
  }
}

export async function setDisabledHaitiCityKeys(keys: string[]): Promise<void> {
  const allowed = new Set(listAllCityCompoundKeys());
  const sanitized = [...new Set(keys)]
    .map((k) => k.trim())
    .filter((k) => k.length > 0 && allowed.has(k));
  await prisma.systemConfig.upsert({
    where: { key: CONFIG_KEY },
    create: { key: CONFIG_KEY, value: JSON.stringify({ keys: sanitized }) },
    update: { value: JSON.stringify({ keys: sanitized }) },
  });
}

export async function getAdminHaitiDeliveryPayload(): Promise<{
  departments: typeof HAITI_DEPARTMENTS;
  disabledKeys: string[];
}> {
  const disabled = await getDisabledHaitiCityKeys();
  return {
    departments: [...HAITI_DEPARTMENTS],
    disabledKeys: [...disabled],
  };
}

/** Customer-facing catalog with disabled pickup cities removed entirely. */
export async function getPublicHaitiDeliveryOptions(): Promise<{
  departments: PublicHaitiDeptOption[];
}> {
  const disabled = await getDisabledHaitiCityKeys();
  const departments: PublicHaitiDeptOption[] = [];

  for (const d of HAITI_DEPARTMENTS) {
    const cities = d.cities.filter(
      (c) => !disabled.has(haitiCityCompoundKey(d.key, c)),
    );
    if (cities.length === 0) continue;
    departments.push({
      key: d.key,
      nameFr: d.nameFr,
      capital: d.capital,
      cities,
    });
  }

  return { departments };
}

export async function assertHaitiDeliveryAllowed(
  deptKey: string | undefined | null,
  city: string | undefined | null,
): Promise<{ deptKey: HaitiDepartmentKey; city: string }> {
  if (!deptKey?.trim() || !city?.trim()) {
    throw Errors.badRequest('Select Haiti department and delivery city.');
  }
  const dk = deptKey.trim() as HaitiDepartmentKey;
  const ct = city.trim();
  if (!isValidHaitiDeliveryPair(dk, ct)) {
    throw Errors.badRequest('Invalid Haiti department or city.');
  }
  const disabled = await getDisabledHaitiCityKeys();
  const compound = haitiCityCompoundKey(dk, ct);
  if (disabled.has(compound)) {
    throw Errors.badRequest(
      'This delivery city is not available right now. Pick another.',
    );
  }
  return { deptKey: dk, city: ct };
}
