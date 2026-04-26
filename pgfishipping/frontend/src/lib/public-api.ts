import { api, unwrap, type ApiSuccess } from './api';

export interface TrackingEvent {
  status: string;
  label: string | null;
  location: string | null;
  timestamp: string;
}

export interface PublicTracking {
  trackingCode: string;
  externalTracking: string | null;
  externalCarrier: string | null;
  status: string;
  step: number;
  serviceType: string;
  originCountry: string | null;
  destinationCountry: string | null;
  contentsDescription: string | null;
  weightLbs: number | null;
  recipientName: string | null;
  createdAt: string;
  deliveredAt: string | null;
  events: TrackingEvent[];
}

export async function trackPublic(code: string): Promise<PublicTracking> {
  const r = await api.get<ApiSuccess<PublicTracking>>(
    `/track/${encodeURIComponent(code)}`,
  );
  return unwrap(r);
}

export type ServiceType = 'AIR' | 'SEA' | 'EXPRESS';

export interface CalculatorInput {
  serviceType: ServiceType;
  weightLbs: number;
  length?: number;
  width?: number;
  height?: number;
  fobValue?: number;
  fobCurrency?: 'USD' | 'EUR';
  contentType?: 'PACKAGE' | 'DOCUMENT';
}

export interface FeeLine {
  feeType: string;
  name: string;
  ratePerLb: number | null;
  flatFee: number | null;
  amountUsd: number;
}

export interface CalculatorResult {
  serviceType: ServiceType;
  billableWeightLbs: number;
  lines: FeeLine[];
  subtotalUsd: number;
  taxRate: number;
  taxUsd: number;
  totalUsd: number;
  exchangeRate: number;
  totalHtg: number;
  fobValueUsd: number | null;
}

export async function estimateShipping(
  input: CalculatorInput,
): Promise<CalculatorResult> {
  const r = await api.post<ApiSuccess<CalculatorResult>>(
    '/calculator/estimate',
    input,
  );
  return unwrap(r);
}

export async function getExchangeRate(): Promise<{
  fromCurrency: string;
  toCurrency: string;
  rate: number;
}> {
  const r = await api.get<
    ApiSuccess<{ fromCurrency: string; toCurrency: string; rate: number }>
  >('/calculator/exchange-rate');
  return unwrap(r);
}
