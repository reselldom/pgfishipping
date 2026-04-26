export type ShipmentStatus =
  | 'WAITING'
  | 'RECEIVED'
  | 'IN_TRANSIT'
  | 'IN_TRANSIT_B'
  | 'INVENTORY'
  | 'AVAILABLE'
  | 'DELIVERED'
  | 'RETURNED'
  | 'LOST'
  | 'CANCELLED';

export type ServiceType = 'AIR' | 'SEA' | 'EXPRESS';
export type ContentType = 'PACKAGE' | 'DOCUMENT';

export interface Shipment {
  id: string;
  trackingCode: string;
  externalTracking: string | null;
  externalCarrier: string | null;
  status: ShipmentStatus;
  serviceType: ServiceType;
  contentType: ContentType | null;
  contentsDescription: string | null;
  vendor: string | null;
  weightLbs: number | null;
  dimensionLength: number | null;
  dimensionWidth: number | null;
  dimensionHeight: number | null;
  fobValue: number | null;
  fobCurrency: string | null;
  invoiceUrl: string | null;
  totalCost: number | null;
  isPaid: boolean;
  recipientName: string | null;
  recipientPhone: string | null;
  destinationCountry: string | null;
  originCountry: string | null;
  createdAt: string;
  deliveredAt: string | null;
  trackingEvents?: TrackingEventRow[];
}

export interface TrackingEventRow {
  id: string;
  status: string;
  label: string | null;
  location: string | null;
  notes: string | null;
  timestamp: string;
}

export interface Transaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string | null;
  reference: string | null;
  notes: string | null;
  createdAt: string;
}

export interface WalletBalance {
  balanceUsd: number;
  balanceHtg: number;
  exchangeRate: number;
  transactions: {
    items: Transaction[];
    total: number;
    page: number;
    pageSize: number;
  };
}

export interface UsAddress {
  customerCode: string;
  airAddress: string;
  seaAddress: string;
  warehouse: {
    id: string;
    name: string;
    address: string;
    city: string;
  } | null;
}

export interface MyProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  customerCode: string;
  role: string;
  language?: string;
  phoneCell: string | null;
  phoneHome: string | null;
  profilePhotoUrl: string | null;
  idPhotoUrl: string | null;
  idType: string | null;
  idNumber: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  createdAt: string;
}
