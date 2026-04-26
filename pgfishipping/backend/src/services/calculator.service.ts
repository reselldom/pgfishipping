import { ServiceType, type PricingRule } from '@prisma/client';
import { prisma } from '../config/database';
import { Errors } from '../utils/response';
import { getUsdToHtgRate } from './exchangeRate.service';

export interface CalculatorInput {
  serviceType: ServiceType;
  weightLbs: number;
  length?: number;
  width?: number;
  height?: number;
  fobValue?: number;
  fobCurrency?: 'USD' | 'EUR';
  contentType?: 'PACKAGE' | 'DOCUMENT';
  specialCategory?: string;
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

const DIM_WEIGHT_DIVISOR = 166; // industry-standard for inch/lb air freight

function dimensionalWeight(input: CalculatorInput): number | null {
  if (!input.length || !input.width || !input.height) return null;
  return (input.length * input.width * input.height) / DIM_WEIGHT_DIVISOR;
}

async function getTaxRate(): Promise<number> {
  const cfg = await prisma.systemConfig.findUnique({ where: { key: 'tax_rate' } });
  return cfg ? Number(cfg.value) : 0;
}

const EUR_TO_USD = 1.07; // simple constant; can be made configurable later

export async function estimate(
  input: CalculatorInput,
): Promise<CalculatorResult> {
  if (!input.weightLbs || input.weightLbs <= 0) {
    throw Errors.badRequest('weightLbs must be > 0');
  }

  // Pick the higher of actual vs dimensional weight (only for AIR).
  let billable = input.weightLbs;
  if (input.serviceType === 'AIR') {
    const dim = dimensionalWeight(input);
    if (dim && dim > billable) billable = dim;
  }
  // Round up to nearest 0.1 lb.
  billable = Math.ceil(billable * 10) / 10;

  const rules = await prisma.pricingRule.findMany({
    where: { serviceType: input.serviceType, isActive: true },
    orderBy: { createdAt: 'asc' },
  });

  const lines: FeeLine[] = rules.map<FeeLine>((r: PricingRule) => {
    const fromRate = r.ratePerLb ? r.ratePerLb * billable : 0;
    const fromFlat = r.flatFee ?? 0;
    const raw = fromRate + fromFlat;
    const amount =
      r.minCharge && raw < r.minCharge ? r.minCharge : raw;
    return {
      feeType: r.feeType,
      name: r.name,
      ratePerLb: r.ratePerLb,
      flatFee: r.flatFee,
      amountUsd: round2(amount),
    };
  });

  const subtotal = round2(lines.reduce((s, l) => s + l.amountUsd, 0));
  const taxRate = await getTaxRate();
  const tax = round2(subtotal * taxRate);
  const total = round2(subtotal + tax);
  const rate = await getUsdToHtgRate();

  let fobUsd: number | null = null;
  if (input.fobValue !== undefined) {
    fobUsd = input.fobCurrency === 'EUR'
      ? round2(input.fobValue * EUR_TO_USD)
      : round2(input.fobValue);
  }

  return {
    serviceType: input.serviceType,
    billableWeightLbs: billable,
    lines,
    subtotalUsd: subtotal,
    taxRate,
    taxUsd: tax,
    totalUsd: total,
    exchangeRate: rate,
    totalHtg: round2(total * rate),
    fobValueUsd: fobUsd,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function getPublicRates(): Promise<{
  air: PricingRule[];
  sea: PricingRule[];
}> {
  const [air, sea] = await Promise.all([
    prisma.pricingRule.findMany({
      where: { serviceType: 'AIR', isActive: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.pricingRule.findMany({
      where: { serviceType: 'SEA', isActive: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);
  return { air, sea };
}
