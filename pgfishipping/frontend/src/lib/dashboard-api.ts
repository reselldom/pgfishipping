import { api, unwrap, type ApiSuccess } from './api';
import type {
  MyProfile,
  Shipment,
  ServiceType,
  ContentType,
  ShipmentStatus,
  UsAddress,
  WalletBalance,
} from './types';

export async function getMyProfile(): Promise<MyProfile> {
  const r = await api.get<ApiSuccess<MyProfile>>('/user/me');
  return unwrap(r);
}

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  phoneCell?: string | null;
  phoneHome?: string | null;
  language?: 'EN' | 'FR' | 'HT' | 'ES';
}

export async function updateMyProfile(
  payload: UpdateProfilePayload,
): Promise<MyProfile> {
  const r = await api.put<ApiSuccess<MyProfile>>('/user/profile', payload);
  return unwrap(r);
}

export async function getMyAddress(): Promise<UsAddress> {
  const r = await api.get<ApiSuccess<UsAddress>>('/user/address');
  return unwrap(r);
}

export interface ListShipmentsResponse {
  items: Shipment[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listShipments(
  filter: 'PRE_ALERTS' | 'ACTIVE' | 'DELIVERED',
  page = 1,
  pageSize = 20,
  search?: string,
): Promise<ListShipmentsResponse> {
  const r = await api.get<ApiSuccess<Shipment[]>>('/shipments', {
    params: { status: filter, page, pageSize, search },
  });
  const data = r.data;
  if (!data.ok) throw new Error('failed');
  const pagination = (data.meta?.pagination ?? data.meta) as
    | { total?: number; page?: number; pageSize?: number }
    | undefined;
  return {
    items: data.data,
    total: pagination?.total ?? data.data.length,
    page: pagination?.page ?? page,
    pageSize: pagination?.pageSize ?? pageSize,
  };
}

export async function getShipment(id: string): Promise<Shipment> {
  const r = await api.get<ApiSuccess<Shipment>>(`/shipments/${id}`);
  return unwrap(r);
}

export interface PreAlertPayload {
  externalTracking?: string;
  externalCarrier?: string;
  serviceType: ServiceType;
  contentType?: ContentType;
  contentsDescription?: string;
  vendor?: string;
  weightLbs?: number;
  fobValue?: number;
  fobCurrency?: 'USD' | 'EUR';
  recipientName?: string;
  recipientPhone?: string;
  additionalNotes?: string;
}

export async function createPreAlert(
  payload: PreAlertPayload,
): Promise<Shipment> {
  const r = await api.post<ApiSuccess<Shipment>>(
    '/shipments/pre-alert',
    payload,
  );
  return unwrap(r);
}

export async function updateShipmentFob(
  id: string,
  fobValue: number,
  fobCurrency: 'USD' | 'EUR' = 'USD',
): Promise<Shipment> {
  const r = await api.put<ApiSuccess<Shipment>>(`/shipments/${id}/fob`, {
    fobValue,
    fobCurrency,
  });
  return unwrap(r);
}

export interface ThirdPartyAuthInput {
  authorizedName: string;
  idType: string;
  idNumber: string;
  phone: string;
}

export async function setThirdPartyAuth(
  id: string,
  input: ThirdPartyAuthInput,
): Promise<unknown> {
  const r = await api.post<ApiSuccess<unknown>>(
    `/shipments/${id}/authorize`,
    input,
  );
  return unwrap(r);
}

export async function getWalletBalance(
  page = 1,
  pageSize = 20,
): Promise<WalletBalance> {
  const r = await api.get<ApiSuccess<WalletBalance>>('/wallet/balance', {
    params: { page, pageSize },
  });
  return unwrap(r);
}

export interface DepositInitResult {
  transactionId: string;
  reference: string;
  paymentMethod: string;
  amountUsd: number;
  redirectUrl?: string;
  paymentInstructions?: string;
}

export async function initDeposit(
  amountUsd: number,
  paymentMethod: 'MONCASH' | 'NATCASH' | 'PAYMON' | 'BANK_TRANSFER',
): Promise<DepositInitResult> {
  const r = await api.post<ApiSuccess<DepositInitResult>>('/wallet/deposit', {
    amountUsd,
    paymentMethod,
  });
  return unwrap(r);
}

export async function redeemGiftCard(code: string): Promise<unknown> {
  const r = await api.post<ApiSuccess<unknown>>('/wallet/redeem-gift-card', {
    code,
  });
  return unwrap(r);
}

export async function payShipment(
  shipmentId: string,
  amountUsd: number,
): Promise<unknown> {
  const r = await api.post<ApiSuccess<unknown>>('/wallet/pay-shipment', {
    shipmentId,
    amountUsd,
  });
  return unwrap(r);
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await api.post('/auth/change-password', { currentPassword, newPassword });
}

export const STATUS_TO_TAB: Record<ShipmentStatus, 'PRE_ALERTS' | 'ACTIVE' | 'DELIVERED'> = {
  WAITING: 'PRE_ALERTS',
  RECEIVED: 'ACTIVE',
  IN_TRANSIT: 'ACTIVE',
  IN_TRANSIT_B: 'ACTIVE',
  INVENTORY: 'ACTIVE',
  AVAILABLE: 'ACTIVE',
  DELIVERED: 'DELIVERED',
  RETURNED: 'DELIVERED',
  LOST: 'DELIVERED',
  CANCELLED: 'DELIVERED',
};
