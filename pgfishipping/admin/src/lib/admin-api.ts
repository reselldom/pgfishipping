import { api, unwrap, type ApiSuccess } from './api';

export interface PaginatedListResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

function parsePagination<T>(r: { data: ApiSuccess<T[]> }): PaginatedListResult<T> {
  const data = r.data;
  if (!data.ok) throw new Error('failed');
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

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function adminLogin(
  identifier: string,
  password: string,
): Promise<{
  user: import('./store/auth').AdminUser;
  tokens: { accessToken: string; refreshToken: string };
}> {
  const r = await api.post<ApiSuccess<{
    user: import('./store/auth').AdminUser;
    tokens: { accessToken: string; refreshToken: string };
  }>>('/auth/login', { identifier, password });
  return unwrap(r);
}

export async function adminLogout(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } catch {
    /* ignore */
  }
}

// ─── Customers ───────────────────────────────────────────────────────────────

export interface AdminCustomer {
  id: string;
  customerCode: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  clientType?: string;
  language: string;
  emailVerified?: boolean;
  createdAt: string;
  phoneCell?: string | null;
  loyaltyPoints?: number;
  wallet?: { balanceUsd: number; balanceHtg?: number } | null;
}

export async function listCustomers(params: {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedListResult<AdminCustomer>> {
  const r = await api.get<ApiSuccess<AdminCustomer[]>>('/admin/customers', {
    params,
  });
  return parsePagination(r);
}

export interface CustomerDetailShipment {
  id: string;
  trackingCode: string;
  status: string;
  serviceType: string;
  totalCost: number | null;
  createdAt: string;
}

export interface CustomerDetailTransaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  paymentMethod?: string | null;
  reference?: string | null;
  createdAt: string;
}

export interface CustomerDetail {
  user: AdminCustomer & {
    wallet?: { balanceUsd: number; balanceHtg?: number } | null;
    referralCode?: string;
    profilePhotoUrl?: string | null;
  };
  stats: { shipmentCount: number; totalPaidUsd: number };
  recentShipments: CustomerDetailShipment[];
  recentTransactions: CustomerDetailTransaction[];
}

export async function getCustomer(id: string): Promise<CustomerDetail> {
  const r = await api.get<ApiSuccess<CustomerDetail>>(
    `/admin/customers/${id}`,
  );
  return unwrap(r);
}

export async function setCustomerStatus(
  id: string,
  status: string,
): Promise<unknown> {
  const r = await api.patch<ApiSuccess<unknown>>(
    `/admin/customers/${id}/status`,
    { status },
  );
  return unwrap(r);
}

export async function adjustWallet(
  id: string,
  amountUsd: number,
  reason: string,
): Promise<unknown> {
  const r = await api.post<ApiSuccess<unknown>>(
    `/admin/customers/${id}/adjust-wallet`,
    { amountUsd, reason },
  );
  return unwrap(r);
}

// ─── Shipments ───────────────────────────────────────────────────────────────

export interface AdminShipment {
  id: string;
  trackingCode: string;
  externalTracking: string | null;
  externalCarrier: string | null;
  status: string;
  serviceType: string;
  contentType?: string;
  weightLbs: number | null;
  totalCost: number | null;
  paidAt: string | null;
  deliveredAt: string | null;
  fobValue?: number | null;
  vendor?: string | null;
  contentsDescription?: string | null;
  createdAt: string;
  user?: {
    id: string;
    customerCode: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneCell?: string | null;
  } | null;
}

export async function listAdminShipments(params: {
  search?: string;
  status?: string;
  serviceType?: string;
  customerCode?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedListResult<AdminShipment>> {
  const r = await api.get<ApiSuccess<AdminShipment[]>>('/admin/shipments', {
    params,
  });
  return parsePagination(r);
}

export interface AdminShipmentDetail extends AdminShipment {
  trackingEvents?: Array<{
    id: string;
    status: string;
    label: string | null;
    location: string | null;
    timestamp: string;
  }>;
  transactions?: Array<{
    id: string;
    type: string;
    amount: number;
    status: string;
    createdAt: string;
  }>;
  thirdPartyAuth?: unknown;
  destinationBranch?: { id: string; name: string; city: string } | null;
  originWarehouse?: { id: string; name: string; city: string } | null;
}

export async function getAdminShipment(id: string): Promise<AdminShipmentDetail> {
  const r = await api.get<ApiSuccess<AdminShipmentDetail>>(
    `/admin/shipments/${id}`,
  );
  return unwrap(r);
}

export async function updateAdminShipment(
  id: string,
  payload: Record<string, unknown>,
): Promise<unknown> {
  const r = await api.patch<ApiSuccess<unknown>>(
    `/admin/shipments/${id}`,
    payload,
  );
  return unwrap(r);
}

export async function addShipmentEvent(
  id: string,
  status: string,
  label?: string,
  location?: string,
): Promise<unknown> {
  const r = await api.post<ApiSuccess<unknown>>(
    `/admin/shipments/${id}/events`,
    { status, label, location },
  );
  return unwrap(r);
}

export async function bulkUpdateStatus(
  shipmentIds: string[],
  status: string,
  location?: string,
): Promise<unknown> {
  const r = await api.post<ApiSuccess<unknown>>(`/admin/shipments/bulk-status`, {
    shipmentIds,
    status,
    location,
  });
  return unwrap(r);
}

// ─── Pricing ─────────────────────────────────────────────────────────────────

export interface PricingRule {
  id: string;
  name: string;
  serviceType: string;
  feeType: string;
  ratePerLb: number | null;
  flatFee: number | null;
  minCharge: number | null;
  currency: string;
  isActive: boolean;
}

export async function listPricing(): Promise<PricingRule[]> {
  const r = await api.get<ApiSuccess<PricingRule[]>>('/admin/pricing');
  return unwrap(r);
}
export async function createPricing(p: Partial<PricingRule>): Promise<PricingRule> {
  const r = await api.post<ApiSuccess<PricingRule>>('/admin/pricing', p);
  return unwrap(r);
}
export async function updatePricing(
  id: string,
  p: Partial<PricingRule>,
): Promise<PricingRule> {
  const r = await api.patch<ApiSuccess<PricingRule>>(`/admin/pricing/${id}`, p);
  return unwrap(r);
}
export async function deletePricing(id: string): Promise<void> {
  await api.delete(`/admin/pricing/${id}`);
}

// ─── Warehouses ──────────────────────────────────────────────────────────────

export interface Warehouse {
  id: string;
  name: string;
  type: string;
  address: string;
  city: string;
  state: string | null;
  country: string;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  sortOrder?: number;
}

export async function listWarehouses(): Promise<Warehouse[]> {
  const r = await api.get<ApiSuccess<Warehouse[]>>('/admin/warehouses');
  return unwrap(r);
}
export async function createWarehouse(w: Partial<Warehouse>): Promise<Warehouse> {
  const r = await api.post<ApiSuccess<Warehouse>>('/admin/warehouses', w);
  return unwrap(r);
}
export async function updateWarehouse(
  id: string,
  w: Partial<Warehouse>,
): Promise<Warehouse> {
  const r = await api.patch<ApiSuccess<Warehouse>>(
    `/admin/warehouses/${id}`,
    w,
  );
  return unwrap(r);
}
export async function deleteWarehouse(id: string): Promise<void> {
  await api.delete(`/admin/warehouses/${id}`);
}

// ─── Gift cards ──────────────────────────────────────────────────────────────

export interface GiftCard {
  id: string;
  code: string;
  valueUsd: number;
  status: string;
  issuedTo: string | null;
  redeemedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}
export async function listGiftCards(params: {
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedListResult<GiftCard>> {
  const r = await api.get<ApiSuccess<GiftCard[]>>('/admin/gift-cards', {
    params,
  });
  return parsePagination(r);
}
export async function issueGiftCard(payload: {
  valueUsd: number;
  issuedTo?: string | null;
  expiresAt?: string | null;
}): Promise<GiftCard> {
  const r = await api.post<ApiSuccess<GiftCard>>('/admin/gift-cards', payload);
  return unwrap(r);
}
export async function voidGiftCard(id: string): Promise<GiftCard> {
  const r = await api.post<ApiSuccess<GiftCard>>(
    `/admin/gift-cards/${id}/void`,
  );
  return unwrap(r);
}

// ─── Tickets ─────────────────────────────────────────────────────────────────

export interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  reply?: string | null;
  status: string;
  assignedTo?: string | null;
  createdAt: string;
  updatedAt?: string;
  user?: {
    id?: string;
    customerCode: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

export async function listTickets(params: {
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedListResult<SupportTicket>> {
  const r = await api.get<ApiSuccess<SupportTicket[]>>('/admin/tickets', {
    params,
  });
  return parsePagination(r);
}
export async function getTicket(id: string): Promise<SupportTicket> {
  const r = await api.get<ApiSuccess<SupportTicket>>(`/admin/tickets/${id}`);
  return unwrap(r);
}
export async function replyTicket(id: string, reply: string): Promise<unknown> {
  const r = await api.post<ApiSuccess<unknown>>(`/admin/tickets/${id}/reply`, {
    reply,
  });
  return unwrap(r);
}
export async function closeTicket(id: string): Promise<unknown> {
  const r = await api.post<ApiSuccess<unknown>>(`/admin/tickets/${id}/close`);
  return unwrap(r);
}

// ─── System config ───────────────────────────────────────────────────────────

export interface SystemConfig {
  key: string;
  value: string;
  description?: string | null;
  updatedAt?: string;
}

export async function listConfig(): Promise<SystemConfig[]> {
  const r = await api.get<ApiSuccess<SystemConfig[]>>('/admin/config');
  return unwrap(r);
}
export async function setConfig(
  key: string,
  value: string,
): Promise<SystemConfig> {
  const r = await api.put<ApiSuccess<SystemConfig>>('/admin/config', {
    key,
    value,
  });
  return unwrap(r);
}
export async function deleteConfig(key: string): Promise<void> {
  await api.delete(`/admin/config/${encodeURIComponent(key)}`);
}

// ─── Staff ───────────────────────────────────────────────────────────────────

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'MANAGER' | 'STAFF';
  warehouseId: string | null;
  isActive: boolean;
  createdAt?: string;
}

export async function listStaff(): Promise<StaffMember[]> {
  const r = await api.get<ApiSuccess<StaffMember[]>>('/admin/staff');
  return unwrap(r);
}
export async function createStaff(payload: {
  name: string;
  email: string;
  password: string;
  role: 'SUPER_ADMIN' | 'MANAGER' | 'STAFF';
  warehouseId?: string | null;
}): Promise<StaffMember> {
  const r = await api.post<ApiSuccess<StaffMember>>('/admin/staff', payload);
  return unwrap(r);
}
export async function updateStaff(
  id: string,
  payload: Partial<{
    name: string;
    email: string;
    password: string;
    role: 'SUPER_ADMIN' | 'MANAGER' | 'STAFF';
    warehouseId: string | null;
    isActive: boolean;
  }>,
): Promise<StaffMember> {
  const r = await api.patch<ApiSuccess<StaffMember>>(
    `/admin/staff/${id}`,
    payload,
  );
  return unwrap(r);
}
export async function deactivateStaff(id: string): Promise<StaffMember> {
  const r = await api.post<ApiSuccess<StaffMember>>(
    `/admin/staff/${id}/deactivate`,
  );
  return unwrap(r);
}

// ─── Broadcast preview/send response shapes (declared at end of file) ───────

// ─── Analytics ───────────────────────────────────────────────────────────────

export interface DashboardStats {
  customers: {
    total: number;
    active: number;
    suspended: number;
    newLast30d: number;
  };
  shipments: {
    total: number;
    waiting: number;
    inTransit: number;
    available: number;
    delivered: number;
    last30d: number;
  };
  revenue: {
    last30dUsd: number;
    pendingDepositsUsd: number;
    totalWalletBalanceUsd: number;
  };
  giftCards: { active: number; activeValueUsd: number };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const r = await api.get<ApiSuccess<DashboardStats>>('/admin/analytics/dashboard');
  return unwrap(r);
}

export interface RevenuePoint {
  date: string;
  revenueUsd: number;
}

export async function getRevenue30(): Promise<RevenuePoint[]> {
  const r = await api.get<ApiSuccess<RevenuePoint[]>>(
    '/admin/analytics/revenue/last-30-days',
  );
  return unwrap(r);
}

// ─── Broadcast ───────────────────────────────────────────────────────────────

export interface BroadcastPayload {
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  segment?: 'all' | 'active' | 'verified' | 'with-balance';
  customerIds?: string[];
}

export interface BroadcastPreviewResult {
  count: number;
  sample: Array<{ email: string; firstName: string }>;
}

export async function previewBroadcast(
  p: BroadcastPayload,
): Promise<BroadcastPreviewResult> {
  const r = await api.post<ApiSuccess<BroadcastPreviewResult>>(
    '/admin/broadcast/preview',
    p,
  );
  return unwrap(r);
}

export interface BroadcastSendResult {
  sent: number;
  failed: number;
  recipients: number;
}

export async function sendBroadcast(
  p: BroadcastPayload,
): Promise<BroadcastSendResult> {
  const r = await api.post<ApiSuccess<BroadcastSendResult>>(
    '/admin/broadcast/send',
    p,
  );
  return unwrap(r);
}
