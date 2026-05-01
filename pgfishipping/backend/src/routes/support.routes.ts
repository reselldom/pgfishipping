import path from 'node:path';
import { Router, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { ok, paginated, Errors } from '../utils/response';
import { supportChatUpload } from '../middleware/upload';
import { uploadFile } from '../services/storage.service';
import {
  createOrGetCustomerConversation,
  getConversationForCustomer,
  listMessages,
  sendMessage,
} from '../services/support/support-chat.service';

const router = Router();
router.use(requireAuth);

const chatMessageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

router.get(
  '/chat/active',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.auth) throw Errors.unauthorized();
    const conversation = await createOrGetCustomerConversation(req.auth.userId);
    ok(res, conversation);
  }),
);

const listMessagesSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

router.get(
  '/chat/:conversationId/messages',
  validate({ query: listMessagesSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.auth) throw Errors.unauthorized();
    const conversation = await getConversationForCustomer(
      req.params.conversationId,
      req.auth.userId,
    );
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
  '/chat/:conversationId/messages',
  chatMessageLimiter,
  validate({ body: sendMessageSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.auth) throw Errors.unauthorized();
    const conversation = await getConversationForCustomer(
      req.params.conversationId,
      req.auth.userId,
    );
    const message = await sendMessage({
      conversationId: conversation.id,
      senderType: 'CUSTOMER',
      senderUserId: req.auth.userId,
      body: req.body.body,
    });
    ok(res, message, undefined, 201);
  }),
);

router.post(
  '/chat/:conversationId/attachments',
  supportChatUpload.single('file'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.auth) throw Errors.unauthorized();
    const conversation = await getConversationForCustomer(
      req.params.conversationId,
      req.auth.userId,
    );
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
      senderType: 'CUSTOMER',
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

export default router;
