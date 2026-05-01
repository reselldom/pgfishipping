import { prisma } from '../../config/database';
import { deleteFile } from '../storage.service';

const RETENTION_DAYS = 30;

export async function purgeExpiredSupportChats(): Promise<{
  conversations: number;
  messages: number;
  attachmentsDeleted: number;
}> {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const expired = await prisma.supportConversation.findMany({
    where: {
      OR: [{ updatedAt: { lt: cutoff } }, { createdAt: { lt: cutoff } }],
    },
    select: { id: true },
  });
  if (expired.length === 0) {
    return { conversations: 0, messages: 0, attachmentsDeleted: 0 };
  }
  const ids = expired.map((x) => x.id);
  const attachments = await prisma.supportMessage.findMany({
    where: { conversationId: { in: ids }, attachmentKey: { not: null } },
    select: { attachmentKey: true },
  });
  await Promise.all(
    attachments
      .map((x) => x.attachmentKey)
      .filter((x): x is string => Boolean(x))
      .map((key) => deleteFile(key)),
  );
  const deletedMessages = await prisma.supportMessage.deleteMany({
    where: { conversationId: { in: ids } },
  });
  const deletedConversations = await prisma.supportConversation.deleteMany({
    where: { id: { in: ids } },
  });
  return {
    conversations: deletedConversations.count,
    messages: deletedMessages.count,
    attachmentsDeleted: attachments.length,
  };
}
