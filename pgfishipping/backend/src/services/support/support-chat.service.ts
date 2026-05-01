import type {
  SupportConversation,
  SupportConversationStatus,
  SupportMessage,
  SupportSenderType,
  UserRole,
} from '@prisma/client';
import { prisma } from '../../config/database';
import { Errors } from '../../utils/response';
import { getSupportSocket } from './socket.gateway';

const STAFF_ROLES: UserRole[] = ['SUPER_ADMIN', 'MANAGER', 'SUPPORT'];

const CONVERSATION_INCLUDE = {
  customer: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      customerCode: true,
    },
  },
  assignedStaff: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
    },
  },
} as const;

export type SupportConversationWithUsers = SupportConversation & {
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    customerCode: string;
  };
  assignedStaff: {
    id: string;
    firstName: string;
    lastName: string;
    role: UserRole;
  } | null;
};

const SYSTEM_MESSAGES = {
  waiting: 'All staff are currently busy. Please wait, we will be with you soon.',
  closed: 'This chat has been closed. Start a new message if you need more help.',
} as const;

function welcomeMessage(firstName?: string | null): string {
  const name = (firstName ?? '').trim();
  if (name) {
    return `Hi ${name}, welcome to PGFI support. A staff member will assist you shortly.`;
  }
  return 'Welcome to PGFI support. A staff member will assist you shortly.';
}

export interface MessageAttachmentInput {
  attachmentUrl: string;
  attachmentKey: string;
  attachmentName: string;
  attachmentMimeType: string;
  attachmentSizeBytes: number;
}

function emitConversationEvent(
  conversationId: string,
  event: string,
  payload: unknown,
): void {
  const io = getSupportSocket();
  if (!io) return;
  io.to(`conversation:${conversationId}`).emit(event, payload);
}

async function createSystemMessage(
  conversationId: string,
  body: string,
): Promise<SupportMessage> {
  const message = await prisma.supportMessage.create({
    data: {
      conversationId,
      senderType: 'SYSTEM',
      body,
    },
  });
  emitConversationEvent(conversationId, 'support:message', message);
  return message;
}

async function nextAssignee(): Promise<{ id: string; order: number } | null> {
  const [lastConversation, eligibleStaff] = await Promise.all([
    prisma.supportConversation.findFirst({
      where: { assignedStaffId: { not: null } },
      orderBy: [{ lastAssignedOrder: 'desc' }, { createdAt: 'desc' }],
      select: { lastAssignedOrder: true },
    }),
    prisma.user.findMany({
      where: {
        role: { in: STAFF_ROLES },
        status: 'ACTIVE',
        deletedAt: null,
      },
      orderBy: [{ createdAt: 'asc' }],
      select: { id: true },
    }),
  ]);
  if (eligibleStaff.length === 0) return null;
  const order = (lastConversation?.lastAssignedOrder ?? 0) + 1;
  const idx = (order - 1) % eligibleStaff.length;
  return { id: eligibleStaff[idx].id, order };
}

export async function createOrGetCustomerConversation(
  customerId: string,
): Promise<SupportConversation> {
  const existing = await prisma.supportConversation.findFirst({
    where: { customerId, status: { in: ['OPEN', 'WAITING'] } },
    orderBy: { updatedAt: 'desc' },
  });
  if (existing) return existing;

  const [assignee, customer] = await Promise.all([
    nextAssignee(),
    prisma.user.findUnique({
      where: { id: customerId },
      select: { firstName: true },
    }),
  ]);
  const conversation = await prisma.supportConversation.create({
    data: {
      customerId,
      assignedStaffId: assignee?.id ?? null,
      lastAssignedOrder: assignee?.order ?? 0,
      status: assignee ? 'OPEN' : 'WAITING',
    },
  });
  await createSystemMessage(conversation.id, welcomeMessage(customer?.firstName));
  if (!assignee) await createSystemMessage(conversation.id, SYSTEM_MESSAGES.waiting);
  return conversation;
}

export async function getConversationForCustomer(
  conversationId: string,
  customerId: string,
): Promise<SupportConversation> {
  const conversation = await prisma.supportConversation.findUnique({
    where: { id: conversationId },
  });
  if (!conversation || conversation.customerId !== customerId) {
    throw Errors.notFound('Conversation not found');
  }
  return conversation;
}

export async function getConversationForStaff(
  conversationId: string,
): Promise<SupportConversationWithUsers> {
  const conversation = await prisma.supportConversation.findUnique({
    where: { id: conversationId },
    include: CONVERSATION_INCLUDE,
  });
  if (!conversation) throw Errors.notFound('Conversation not found');
  return conversation;
}

export async function listMessages(
  conversationId: string,
  page = 1,
  pageSize = 50,
): Promise<{
  items: SupportMessage[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(100, Math.max(1, pageSize));
  const where = { conversationId };
  const [items, total] = await Promise.all([
    prisma.supportMessage.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      skip: (safePage - 1) * safePageSize,
      take: safePageSize,
    }),
    prisma.supportMessage.count({ where }),
  ]);
  return { items, total, page: safePage, pageSize: safePageSize };
}

export async function sendMessage(params: {
  conversationId: string;
  senderType: SupportSenderType;
  senderUserId?: string | null;
  body: string;
  attachment?: MessageAttachmentInput;
}): Promise<SupportMessage> {
  const conversation = await prisma.supportConversation.findUnique({
    where: { id: params.conversationId },
  });
  if (!conversation) throw Errors.notFound('Conversation not found');
  if (conversation.status === 'CLOSED') throw Errors.badRequest('Chat is closed');

  const message = await prisma.supportMessage.create({
    data: {
      conversationId: params.conversationId,
      senderType: params.senderType,
      senderUserId: params.senderUserId ?? null,
      body: params.body,
      attachmentUrl: params.attachment?.attachmentUrl,
      attachmentKey: params.attachment?.attachmentKey,
      attachmentName: params.attachment?.attachmentName,
      attachmentMimeType: params.attachment?.attachmentMimeType,
      attachmentSizeBytes: params.attachment?.attachmentSizeBytes,
    },
  });
  await prisma.supportConversation.update({
    where: { id: params.conversationId },
    data: {
      status: conversation.assignedStaffId ? 'OPEN' : 'WAITING',
      lastMessageAt: new Date(),
    },
  });
  emitConversationEvent(params.conversationId, 'support:message', message);
  return message;
}

export async function listConversationsForStaff(input: {
  status?: SupportConversationStatus;
  page?: number;
  pageSize?: number;
}): Promise<{
  items: SupportConversationWithUsers[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 25));
  const where = input.status ? { status: input.status } : {};
  const [items, total] = await Promise.all([
    prisma.supportConversation.findMany({
      where,
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: CONVERSATION_INCLUDE,
    }),
    prisma.supportConversation.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function transferConversation(params: {
  conversationId: string;
  fromStaffId?: string | null;
  toStaffId: string;
  transferredByUserId: string;
}): Promise<SupportConversation> {
  const targetStaff = await prisma.user.findUnique({
    where: { id: params.toStaffId },
  });
  if (!targetStaff || !STAFF_ROLES.includes(targetStaff.role)) {
    throw Errors.badRequest('Target staff is invalid');
  }

  const updated = await prisma.supportConversation.update({
    where: { id: params.conversationId },
    data: {
      assignedStaffId: params.toStaffId,
      status: 'OPEN',
      lastMessageAt: new Date(),
    },
  });

  await prisma.supportTransferEvent.create({
    data: {
      conversationId: params.conversationId,
      fromStaffId: params.fromStaffId ?? null,
      toStaffId: params.toStaffId,
      transferredByUserId: params.transferredByUserId,
    },
  });
  await createSystemMessage(
    params.conversationId,
    'Chat transferred to another staff member.',
  );
  emitConversationEvent(params.conversationId, 'support:transfer', updated);
  return updated;
}

export async function closeConversation(params: {
  conversationId: string;
  closedByUserId: string;
}): Promise<SupportConversation> {
  const updated = await prisma.supportConversation.update({
    where: { id: params.conversationId },
    data: {
      status: 'CLOSED',
      closedAt: new Date(),
      closedByUserId: params.closedByUserId,
    },
  });
  await createSystemMessage(params.conversationId, SYSTEM_MESSAGES.closed);
  emitConversationEvent(params.conversationId, 'support:closed', updated);
  return updated;
}
