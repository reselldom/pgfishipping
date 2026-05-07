/**
 * Canonical Haiti delivery areas for customer pre-alert + admin intake.
 * Department keys must stay stable — they are persisted on shipments as `haitiDepartmentKey`.
 */

export const HAITI_DEPARTMENT_KEYS = [
  'ARTIBONITE',
  'CENTRE',
  'GRAND_ANSE',
  'NIPPES',
  'NORD',
  'NORD_EST',
  'NORD_OUEST',
  'OUEST',
  'SUD',
  'SUD_EST',
] as const;

export type HaitiDepartmentKey = (typeof HAITI_DEPARTMENT_KEYS)[number];

export interface HaitiDeptDefinition {
  key: HaitiDepartmentKey;
  /** Preferred French label shown in selects */
  nameFr: string;
  capital: string;
  /** Capital first, then other common delivery points */
  cities: string[];
}

export const HAITI_DEPARTMENTS: HaitiDeptDefinition[] = [
  {
    key: 'ARTIBONITE',
    nameFr: 'Artibonite',
    capital: 'Gonaïves',
    cities: ['Gonaïves'],
  },
  {
    key: 'CENTRE',
    nameFr: 'Centre',
    capital: 'Hinche',
    cities: ['Hinche'],
  },
  {
    key: 'GRAND_ANSE',
    nameFr: "Grand'Anse",
    capital: 'Jérémie',
    cities: ['Jérémie'],
  },
  {
    key: 'NIPPES',
    nameFr: 'Nippes',
    capital: 'Miragoâne',
    cities: ['Miragoâne'],
  },
  {
    key: 'NORD',
    nameFr: 'Nord',
    capital: 'Cap-Haïtien',
    cities: ['Cap-Haïtien'],
  },
  {
    key: 'NORD_EST',
    nameFr: 'Nord-Est',
    capital: 'Fort-Liberté',
    cities: ['Fort-Liberté'],
  },
  {
    key: 'NORD_OUEST',
    nameFr: 'Nord-Ouest',
    capital: 'Port-de-Paix',
    cities: ['Port-de-Paix'],
  },
  {
    key: 'OUEST',
    nameFr: 'Ouest',
    capital: 'Port-au-Prince',
    cities: [
      'Port-au-Prince',
      'Carrefour',
      'Delmas',
      'Pétion-Ville',
    ],
  },
  {
    key: 'SUD',
    nameFr: 'Sud',
    capital: 'Les Cayes',
    cities: ['Les Cayes'],
  },
  {
    key: 'SUD_EST',
    nameFr: 'Sud-Est',
    capital: 'Jacmel',
    cities: ['Jacmel'],
  },
];

const DEPT_BY_KEY = new Map(
  HAITI_DEPARTMENTS.map((d) => [d.key, d] as const),
);

export function haitiCityCompoundKey(
  deptKey: HaitiDepartmentKey,
  city: string,
): string {
  return `${deptKey}:${city.trim()}`;
}

export function isValidHaitiDeliveryPair(
  deptKey: string,
  city: string,
): deptKey is HaitiDepartmentKey {
  const d = DEPT_BY_KEY.get(deptKey as HaitiDepartmentKey);
  if (!d) return false;
  const c = city.trim();
  return d.cities.some((x) => x === c);
}

export function listAllCityCompoundKeys(): string[] {
  const out: string[] = [];
  for (const d of HAITI_DEPARTMENTS) {
    for (const c of d.cities) {
      out.push(haitiCityCompoundKey(d.key, c));
    }
  }
  return out;
}
