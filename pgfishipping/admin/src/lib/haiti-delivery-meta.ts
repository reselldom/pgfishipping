/** French labels for `haitiDepartmentKey` on shipments (mirror backend constants). */
export const HAITI_DEPARTMENT_LABELS_FR: Record<string, string> = {
  ARTIBONITE: 'Artibonite',
  CENTRE: 'Centre',
  GRAND_ANSE: "Grand'Anse",
  NIPPES: 'Nippes',
  NORD: 'Nord',
  NORD_EST: 'Nord-Est',
  NORD_OUEST: 'Nord-Ouest',
  OUEST: 'Ouest',
  SUD: 'Sud',
  SUD_EST: 'Sud-Est',
};

export function formatHaitiDeliveryLabel(
  deptKey: string | null | undefined,
  city: string | null | undefined,
): string | null {
  if (!deptKey?.trim() || !city?.trim()) return null;
  const dept = HAITI_DEPARTMENT_LABELS_FR[deptKey] ?? deptKey;
  return `${dept} — ${city.trim()}`;
}
