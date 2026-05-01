import multer from 'multer';
import type { Request } from 'express';
import { FILE_LIMITS } from '../config/constants';

type AllowedMimes = ReadonlyArray<string>;

function fileFilter(allowed: AllowedMimes) {
  return (
    _req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback,
  ): void => {
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error(`Unsupported file type: ${file.mimetype}`));
  };
}

export const profilePhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: FILE_LIMITS.PROFILE_PHOTO_MAX_BYTES, files: 1 },
  fileFilter: fileFilter(FILE_LIMITS.ALLOWED_PROFILE),
});

export const idDocUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: FILE_LIMITS.ID_DOC_MAX_BYTES, files: 1 },
  fileFilter: fileFilter(FILE_LIMITS.ALLOWED_ID),
});

export const invoiceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: FILE_LIMITS.INVOICE_MAX_BYTES, files: 1 },
  fileFilter: fileFilter(FILE_LIMITS.ALLOWED_INVOICE),
});

export const labelImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: FILE_LIMITS.LABEL_IMAGE_MAX_BYTES, files: 1 },
  fileFilter: fileFilter(FILE_LIMITS.ALLOWED_LABEL_IMAGE),
});

export const supportChatUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: FILE_LIMITS.SUPPORT_CHAT_MAX_BYTES, files: 1 },
  fileFilter: fileFilter(FILE_LIMITS.ALLOWED_SUPPORT_CHAT),
});

export const heroImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: FILE_LIMITS.HERO_IMAGE_MAX_BYTES, files: 1 },
  fileFilter: fileFilter(FILE_LIMITS.ALLOWED_HERO_IMAGE),
});
