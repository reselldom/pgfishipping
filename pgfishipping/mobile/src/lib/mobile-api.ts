import { api, unwrap } from './api';
import type {
  ApiSuccess,
  CalculatorResult,
  DepositInitResult,
  Shipment,
  ShipmentDetail,
  WalletBalance,
} from './types';

export type ShipmentTab = 'ALL' | 'PRE_ALERTS' | 'ACTIVE' | 'DELIVERED';


export async function listShipments(
  tab: ShipmentTab = 'ALL',
  page = 1,
  pageSize = 30,
): Promise<Shipment[]> {
  const status =
    tab === 'ALL' ? undefined : tab;
  const r = await api.get<ApiSuccess<Shipment[]>>('/shipments', {
    params: { page, pageSize, status },
  });
  return unwrap(r);
}

export async function getShipment(id: string): Promise<ShipmentDetail> {
  const r = await api.get<ApiSuccess<ShipmentDetail>>(`/shipments/${id}`);
  return unwrap(r);
}

export async function walletBalance(): Promise<WalletBalance> {
  const r = await api.get<ApiSuccess<WalletBalance>>('/wallet/balance', {
    params: { page: 1, pageSize: 20 },
  });
  return unwrap(r);
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

export async function redeemGiftCard(
  code: string,
): Promise<{ creditedUsd: number; balanceUsd: number }> {
  const r = await api.post<
    ApiSuccess<{ creditedUsd: number; balanceUsd: number }>
  >('/wallet/redeem-gift-card', { code });
  return unwrap(r);
}

export async function payShipment(
  shipmentId: string,
  amountUsd: number,
): Promise<{ balanceUsd: number; transactionId: string }> {
  const r = await api.post<
    ApiSuccess<{ balanceUsd: number; transactionId: string }>
  >('/wallet/pay-shipment', { shipmentId, amountUsd });
  return unwrap(r);
}

export async function estimate(input: {
  serviceType: 'AIR' | 'SEA';
  weightLbs: number;
  fobValue?: number;
  fobCurrency?: 'USD' | 'EUR';
}): Promise<CalculatorResult> {
  const r = await api.post<ApiSuccess<CalculatorResult>>('/calculator/estimate', {
    serviceType: input.serviceType,
    weightLbs: input.weightLbs,
    fobValue: input.fobValue,
    fobCurrency: input.fobCurrency,
    contentType: 'PACKAGE',
  });
  return unwrap(r);
}

export async function uploadShipmentInvoice(
  shipmentId: string,
  uri: string,
): Promise<void> {
  const formData = new FormData();
  formData.append('file', {
    uri,
    type: 'image/jpeg',
    name: `invoice-${Date.now()}.jpg`,
  } as unknown as Blob);

  const r = await api.post<ApiSuccess<{ invoiceUrl: string }>>(
    `/shipments/${shipmentId}/invoice`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  );
  unwrap(r);
}
