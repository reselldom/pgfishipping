import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export interface UploadFile {
  /** logical key, e.g. "profiles/<userId>/profile.jpg" */
  key: string;
  buffer: Buffer;
  contentType: string;
  publicRead?: boolean;
}

export interface UploadResult {
  /** Where the file actually lives. */
  url: string;
  key: string;
  provider: 'r2' | 'local';
}

const LOCAL_UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads');

let s3Instance: S3Client | null = null;

function r2Configured(): boolean {
  return Boolean(
    env.R2_ACCOUNT_ID &&
      env.R2_ACCESS_KEY_ID &&
      env.R2_SECRET_ACCESS_KEY &&
      env.R2_BUCKET_NAME,
  );
}

function r2Client(): S3Client {
  if (!s3Instance) {
    s3Instance = new S3Client({
      region: 'auto',
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Instance;
}

export async function uploadFile(file: UploadFile): Promise<UploadResult> {
  if (r2Configured()) {
    await r2Client().send(
      new PutObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: file.key,
        Body: file.buffer,
        ContentType: file.contentType,
      }),
    );
    const base = env.R2_PUBLIC_URL || `https://${env.R2_BUCKET_NAME}.r2.dev`;
    return { url: `${base}/${file.key}`, key: file.key, provider: 'r2' };
  }

  const filePath = path.join(LOCAL_UPLOAD_ROOT, file.key);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, file.buffer);
  const url = `${env.API_URL}/uploads/${file.key}`;
  logger.debug({ key: file.key, size: file.buffer.length }, 'Saved upload locally');
  return { url, key: file.key, provider: 'local' };
}

export async function deleteFile(key: string): Promise<void> {
  if (r2Configured()) {
    try {
      await r2Client().send(
        new DeleteObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }),
      );
    } catch (err) {
      logger.warn({ err, key }, 'R2 delete failed (ignored)');
    }
    return;
  }
  try {
    await fs.unlink(path.join(LOCAL_UPLOAD_ROOT, key));
  } catch {
    // ignore
  }
}

export async function presignDownloadUrl(
  key: string,
  expiresInSec = 600,
): Promise<string> {
  if (r2Configured()) {
    const cmd = new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key });
    return getSignedUrl(r2Client(), cmd, { expiresIn: expiresInSec });
  }
  return `${env.API_URL}/uploads/${key}`;
}

export const localUploadRoot = LOCAL_UPLOAD_ROOT;
