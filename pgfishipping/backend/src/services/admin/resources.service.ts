import {
  Prisma,
  ServiceType,
  GiftCardStatus,
  type PricingRule,
  type Warehouse,
  type GiftCard,
  type SupportTicket,
  type SystemConfig,
} from '@prisma/client';
import { prisma } from '../../config/database';
import { Errors } from '../../utils/response';
import { generateRandomToken } from '../../utils/generateCode';

// ─── Pricing rules ──────────────────────────────────────────────────────────

export interface PricingRuleInput {
  name: string;
  serviceType: ServiceType;
  feeType: string;
  ratePerLb?: number | null;
  flatFee?: number | null;
  minCharge?: number | null;
  currency?: string;
  isActive?: boolean;
}

export async function listPricingRules(): Promise<PricingRule[]> {
  return prisma.pricingRule.findMany({
    orderBy: [{ serviceType: 'asc' }, { name: 'asc' }],
  });
}

export async function createPricingRule(input: PricingRuleInput): Promise<PricingRule> {
  return prisma.pricingRule.create({ data: input });
}

export async function updatePricingRule(
  id: string,
  input: Partial<PricingRuleInput>,
): Promise<PricingRule> {
  const existing = await prisma.pricingRule.findUnique({ where: { id } });
  if (!existing) throw Errors.notFound('Pricing rule not found');
  return prisma.pricingRule.update({ where: { id }, data: input });
}

export async function deletePricingRule(id: string): Promise<void> {
  const existing = await prisma.pricingRule.findUnique({ where: { id } });
  if (!existing) throw Errors.notFound('Pricing rule not found');
  await prisma.pricingRule.delete({ where: { id } });
}

// ─── Warehouses ─────────────────────────────────────────────────────────────

export interface WarehouseInput {
  name: string;
  type: string;
  address: string;
  city: string;
  state?: string | null;
  country: string;
  phone?: string | null;
  email?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}

export async function listWarehouses(): Promise<Warehouse[]> {
  return prisma.warehouse.findMany({ orderBy: { sortOrder: 'asc' } });
}

export async function createWarehouse(input: WarehouseInput): Promise<Warehouse> {
  return prisma.warehouse.create({ data: input as Prisma.WarehouseCreateInput });
}

export async function updateWarehouse(
  id: string,
  input: Partial<WarehouseInput>,
): Promise<Warehouse> {
  const existing = await prisma.warehouse.findUnique({ where: { id } });
  if (!existing) throw Errors.notFound('Warehouse not found');
  return prisma.warehouse.update({
    where: { id },
    data: input as Prisma.WarehouseUpdateInput,
  });
}

export async function deleteWarehouse(id: string): Promise<void> {
  const existing = await prisma.warehouse.findUnique({ where: { id } });
  if (!existing) throw Errors.notFound('Warehouse not found');
  await prisma.warehouse.delete({ where: { id } });
}

// ─── Gift cards ─────────────────────────────────────────────────────────────

export interface GiftCardIssueInput {
  valueUsd: number;
  issuedTo?: string | null;
  expiresAt?: Date | null;
}

export async function issueGiftCard(input: GiftCardIssueInput): Promise<GiftCard> {
  if (input.valueUsd <= 0) throw Errors.badRequest('Value must be > 0');
  let code = '';
  for (let i = 0; i < 5; i++) {
    code = generateRandomToken(6).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
    const exists = await prisma.giftCard.findUnique({ where: { code } });
    if (!exists) break;
  }
  return prisma.giftCard.create({
    data: {
      code,
      valueUsd: input.valueUsd,
      issuedTo: input.issuedTo ?? null,
      expiresAt: input.expiresAt ?? null,
      status: GiftCardStatus.ACTIVE,
    },
  });
}

export interface ListGiftCardsInput {
  status?: GiftCardStatus;
  page?: number;
  pageSize?: number;
}

export async function listGiftCards(input: ListGiftCardsInput): Promise<{
  items: GiftCard[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 25));
  const where: Prisma.GiftCardWhereInput = input.status ? { status: input.status } : {};
  const [items, total] = await Promise.all([
    prisma.giftCard.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.giftCard.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function voidGiftCard(id: string): Promise<GiftCard> {
  const gc = await prisma.giftCard.findUnique({ where: { id } });
  if (!gc) throw Errors.notFound('Gift card not found');
  if (gc.status !== 'ACTIVE') throw Errors.badRequest(`Cannot void: status=${gc.status}`);
  return prisma.giftCard.update({
    where: { id },
    data: { status: GiftCardStatus.CANCELLED },
  });
}

// ─── Support tickets ────────────────────────────────────────────────────────

export interface ListTicketsInput {
  status?: string;
  page?: number;
  pageSize?: number;
}

export async function listTickets(input: ListTicketsInput): Promise<{
  items: unknown[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 25));
  const where: Prisma.SupportTicketWhereInput = input.status ? { status: input.status } : {};
  const [items, total] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { customerCode: true, email: true, firstName: true, lastName: true } },
      },
    }),
    prisma.supportTicket.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getTicket(id: string): Promise<unknown> {
  const t = await prisma.supportTicket.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!t) throw Errors.notFound('Ticket not found');
  return t;
}

export async function replyTicket(
  id: string,
  reply: string,
  assignedTo?: string,
): Promise<SupportTicket> {
  const t = await prisma.supportTicket.findUnique({ where: { id } });
  if (!t) throw Errors.notFound('Ticket not found');
  return prisma.supportTicket.update({
    where: { id },
    data: { reply, assignedTo, status: 'replied' },
  });
}

export async function closeTicket(id: string): Promise<SupportTicket> {
  const t = await prisma.supportTicket.findUnique({ where: { id } });
  if (!t) throw Errors.notFound('Ticket not found');
  return prisma.supportTicket.update({ where: { id }, data: { status: 'closed' } });
}

// ─── System config ──────────────────────────────────────────────────────────

export async function listSystemConfig(): Promise<SystemConfig[]> {
  return prisma.systemConfig.findMany({ orderBy: { key: 'asc' } });
}

export async function setSystemConfig(key: string, value: string): Promise<SystemConfig> {
  return prisma.systemConfig.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function deleteSystemConfig(key: string): Promise<void> {
  const existing = await prisma.systemConfig.findUnique({ where: { key } });
  if (!existing) throw Errors.notFound('Config key not found');
  await prisma.systemConfig.delete({ where: { key } });
}
