import { api, unwrap, type ApiSuccess, type ApiError } from './api';
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

/** Download label PDF or invoice file (raw binary) with auth; triggers browser save. */
export async function downloadShipmentBinary(
  relativePath: string,
  fallbackFilename: string,
): Promise<void> {
  const r = await api.get<ArrayBuffer>(relativePath, {
    responseType: 'arraybuffer',
  });
  const ctypeRaw = String(r.headers['content-type'] ?? '');
  const ctype = ctypeRaw.split(';')[0]?.trim() ?? '';

  if (ctype.includes('application/json')) {
    const txt = new TextDecoder().decode(new Uint8Array(r.data));
    let msg = 'Download failed';
    try {
      const parsed = JSON.parse(txt) as ApiError;
      if (!parsed.ok && parsed.error?.message) msg = parsed.error.message;
    } catch {
      msg = txt.slice(0, 200);
    }
    throw new Error(msg);
  }

  const rawCdRaw = r.headers['content-disposition'];
  const rawCd =
    typeof rawCdRaw === 'string'
      ? rawCdRaw
      : Array.isArray(rawCdRaw)
        ? rawCdRaw[0]
        : '';

  let filename = fallbackFilename;
  const quoted = rawCd.match(/filename="([^"]+)"/)?.[1];
  if (quoted) filename = quoted;

  const blobType = ctype || 'application/octet-stream';

  const blob = new Blob([new Uint8Array(r.data)], { type: blobType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function downloadShipmentLabelPdf(
  shipmentId: string,
  trackingCode: string,
): Promise<void> {
  await downloadShipmentBinary(
    `/shipments/${shipmentId}/label`,
    `label-${trackingCode.replace(/[^\w\-]/g, '')}.pdf`,
  );
}

export async function downloadShipmentInvoiceFile(
  shipmentId: string,
  trackingCode: string,
): Promise<void> {
  await downloadShipmentBinary(
    `/shipments/${shipmentId}/invoice`,
    `invoice-${trackingCode.replace(/[^\w\-]/g, '')}.pdf`,
  );
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
  haitiDepartmentKey: string;
  haitiDeliveryCity: string;
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

// ─── Support chat ───────────────────────────────────────────────────────────

export type SupportConversationStatus = 'OPEN' | 'WAITING' | 'CLOSED';
export type SupportSenderType = 'CUSTOMER' | 'STAFF' | 'SYSTEM';

export interface SupportConversation {
  id: string;
  customerId: string;
  assignedStaffId?: string | null;
  status: SupportConversationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SupportMessage {
  id: string;
  conversationId: string;
  senderType: SupportSenderType;
  senderUserId?: string | null;
  body: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  createdAt: string;
}

export async function getActiveSupportConversation(): Promise<SupportConversation> {
  const r = await api.get<ApiSuccess<SupportConversation>>('/support/chat/active');
  return unwrap(r);
}

export async function listSupportMessages(
  conversationId: string,
  page = 1,
  pageSize = 100,
): Promise<{ items: SupportMessage[]; total: number; page: number; pageSize: number }> {
  const r = await api.get<ApiSuccess<SupportMessage[]>>(
    `/support/chat/${conversationId}/messages`,
    { params: { page, pageSize } },
  );
  const data = r.data;
  const meta = (data.meta?.pagination ?? data.meta) as
    | { total?: number; page?: number; pageSize?: number }
    | undefined;
  return {
    items: data.data,
    total: meta?.total ?? data.data.length,
    page: meta?.page ?? 1,
    pageSize: meta?.pageSize ?? data.data.length,
  };
}

export async function sendSupportMessage(
  conversationId: string,
  body: string,
): Promise<SupportMessage> {
  const r = await api.post<ApiSuccess<SupportMessage>>(
    `/support/chat/${conversationId}/messages`,
    { body },
  );
  return unwrap(r);
}

export async function uploadSupportAttachment(
  conversationId: string,
  file: File,
): Promise<SupportMessage> {
  const fd = new FormData();
  fd.append('file', file);
  const r = await api.post<ApiSuccess<SupportMessage>>(
    `/support/chat/${conversationId}/attachments`,
    fd,
  );
  return unwrap(r);
}
