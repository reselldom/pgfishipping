import { Badge } from '@/components/ui/badge';
import type { ShipmentStatus } from '@/lib/types';

const VARIANTS: Record<
  ShipmentStatus,
  'default' | 'secondary' | 'success' | 'warning' | 'info' | 'danger' | 'muted'
> = {
  WAITING: 'muted',
  RECEIVED: 'info',
  IN_TRANSIT: 'info',
  IN_TRANSIT_B: 'info',
  INVENTORY: 'warning',
  AVAILABLE: 'warning',
  DELIVERED: 'success',
  RETURNED: 'danger',
  LOST: 'danger',
  CANCELLED: 'danger',
};

const LABELS: Record<ShipmentStatus, string> = {
  WAITING: 'Waiting',
  RECEIVED: 'Received',
  IN_TRANSIT: 'In transit',
  IN_TRANSIT_B: 'In transit',
  INVENTORY: 'In inventory',
  AVAILABLE: 'Available',
  DELIVERED: 'Delivered',
  RETURNED: 'Returned',
  LOST: 'Lost',
  CANCELLED: 'Cancelled',
};

export function StatusBadge({ status }: { status: ShipmentStatus }): JSX.Element {
  return <Badge variant={VARIANTS[status]}>{LABELS[status]}</Badge>;
}
