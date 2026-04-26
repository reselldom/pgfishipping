export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  customerCode: string;
  role: 'CUSTOMER' | 'SUPER_ADMIN' | 'MANAGER' | 'STAFF';
  language?: string;
}

export interface ApiSuccess<T> {
  ok: true;
  data: T;
  message?: string;
  meta?: Record<string, unknown>;
}

export interface Shipment {
  id: string;
  trackingCode: string;
  status: string;
  serviceType: 'AIR' | 'SEA' | 'EXPRESS';
  contentsDescription: string | null;
  vendor: string | null;
  externalTracking: string | null;
  totalCost: number | null;
  paidAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
}

export interface TrackingEventRow {
  id: string;
  status: string;
  label: string | null;
  location: string | null;
  notes: string | null;
  timestamp: string;
}

export interface ShipmentDetail extends Shipment {
  trackingEvents?: TrackingEventRow[];
  thirdPartyAuth?: unknown;
  fobValue?: number | null;
  fobCurrency?: string | null;
  invoiceUrl?: string | null;
}

export interface WalletTransaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

export interface WalletBalance {
  balanceUsd: number;
  balanceHtg: number;
  exchangeRate: number;
  transactions: {
    items: WalletTransaction[];
    total: number;
    page: number;
    pageSize: number;
  };
}

export interface DepositInitResult {
  transactionId: string;
  reference: string;
  paymentMethod: string;
  amountUsd: number;
  redirectUrl: string;
  sandboxConfirmation?: { secret: string; payload: Record<string, unknown> };
}

export interface CalculatorResult {
  serviceType: string;
  billableWeightLbs: number;
  lines: Array<{
    feeType: string;
    name: string;
    amountUsd: number;
  }>;
  subtotalUsd: number;
  taxRate: number;
  taxUsd: number;
  totalUsd: number;
  exchangeRate: number;
  totalHtg: number;
  fobValueUsd: number | null;
}

