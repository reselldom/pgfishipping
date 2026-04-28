import { Badge } from '@/components/ui/badge';
import type { ShipmentStatus } from '@/lib/types';

const VARIANTS: Record<
  ShipmentStatus,
  | 'status-waiting'
  | 'status-received'
  | 'status-in-transit'
  | 'status-in-transit-b'
  | 'status-inventory'
  | 'status-available'
  | 'status-delivered'
  | 'status-returned'
  | 'status-lost'
  | 'status-cancelled'
> = {
  WAITING: 'status-waiting',
  RECEIVED: 'status-received',
  IN_TRANSIT: 'status-in-transit',
  IN_TRANSIT_B: 'status-in-transit-b',
  INVENTORY: 'status-inventory',
  AVAILABLE: 'status-available',
  DELIVERED: 'status-delivered',
  RETURNED: 'status-returned',
  LOST: 'status-lost',
  CANCELLED: 'status-cancelled',
};

const LABELS: Record<ShipmentStatus, string> = {
  WAITING: 'Waiting',
  RECEIVED: 'Received',
  IN_TRANSIT: 'In transit',
  IN_TRANSIT_B: 'In transit B',
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
