import path from 'node:path';
import { Router, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { SupportConversationStatus } from '@prisma/client';
import { asyncHandler } from '../../utils/asyncHandler';
import { validate } from '../../middleware/validate';
import { ok, paginated, Errors } from '../../utils/response';
import { supportChatUpload } from '../../middleware/upload';
import { uploadFile } from '../../services/storage.service';
import {
  closeConversation,
  getConversationForStaff,
  listConversationsForStaff,
  listMessages,
  sendMessage,
  transferConversation,
} from '../../services/support/support-chat.service';

const router = Router();

const chatMessageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

const listConversationsSchema = z.object({
  status: z.nativeEnum(SupportConversationStatus).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

router.get(
  '/chats',
  validate({ query: listConversationsSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await listConversationsForStaff({
      status: req.query.status as SupportConversationStatus | undefined,
      page: Number(req.query.page) || 1,
      pageSize: Number(req.query.pageSize) || 25,
    });
    paginated(res, result.items, result.page, result.pageSize, result.total);
  }),
);

const listMessagesSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

router.get(
  '/chats/:conversationId/messages',
  validate({ query: listMessagesSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const conversation = await getConversationForStaff(req.params.conversationId);
    const result = await listMessages(
      conversation.id,
      Number(req.query.page) || 1,
      Number(req.query.pageSize) || 50,
    );
    paginated(res, result.items, result.page, result.pageSize, result.total);
  }),
);

const sendMessageSchema = z.object({
  body: z.string().trim().min(1).max(5000),
});

router.post(
  '/chats/:conversationId/messages',
  chatMessageLimiter,
  validate({ body: sendMessageSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.auth) throw Errors.unauthorized();
    const conversation = await getConversationForStaff(req.params.conversationId);
    const message = await sendMessage({
      conversationId: conversation.id,
      senderType: 'STAFF',
      senderUserId: req.auth.userId,
      body: req.body.body,
    });
    ok(res, message, undefined, 201);
  }),
);

router.post(
  '/chats/:conversationId/attachments',
  supportChatUpload.single('file'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.auth) throw Errors.unauthorized();
    const conversation = await getConversationForStaff(req.params.conversationId);
    const file = req.file;
    if (!file) throw Errors.badRequest('File is required');
    const safeName = file.originalname.replace(/[^\w.\-]/g, '_');
    const key = `support/${conversation.id}/${Date.now()}-${safeName}`;
    const uploaded = await uploadFile({
      key,
      buffer: file.buffer,
      contentType: file.mimetype || 'application/octet-stream',
    });
    const message = await sendMessage({
      conversationId: conversation.id,
      senderType: 'STAFF',
      senderUserId: req.auth.userId,
      body: `Attachment: ${path.basename(file.originalname)}`,
      attachment: {
        attachmentUrl: uploaded.url,
        attachmentKey: uploaded.key,
        attachmentName: file.originalname,
        attachmentMimeType: file.mimetype || 'application/octet-stream',
        attachmentSizeBytes: file.size,
      },
    });
    ok(res, message, undefined, 201);
  }),
);

const transferSchema = z.object({
  toStaffId: z.string().min(1),
});

router.post(
  '/chats/:conversationId/transfer',
  validate({ body: transferSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.auth) throw Errors.unauthorized();
    const existing = await getConversationForStaff(req.params.conversationId);
    const updated = await transferConversation({
      conversationId: existing.id,
      fromStaffId: existing.assignedStaffId,
      toStaffId: req.body.toStaffId,
      transferredByUserId: req.auth.userId,
    });
    ok(res, updated);
  }),
);

router.post(
  '/chats/:conversationId/close',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.auth) throw Errors.unauthorized();
    const existing = await getConversationForStaff(req.params.conversationId);
    const updated = await closeConversation({
      conversationId: existing.id,
      closedByUserId: req.auth.userId,
    });
    ok(res, updated);
  }),
);

export default router;
