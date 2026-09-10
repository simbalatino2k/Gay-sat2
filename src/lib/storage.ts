import { Storage } from '@google-cloud/storage';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
]);

const EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif'
};

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB

let gcsStorage: Storage | null = null;
let bucketName: string | null = null;

export function initStorage() {
  const gcsBucket = process.env.GCS_MEDIA_BUCKET || process.env.STORAGE_BUCKET;
  if (gcsBucket) {
    bucketName = gcsBucket;
    try {
      gcsStorage = new Storage();
      console.log(`[Storage] Configured Google Cloud Storage bucket: ${bucketName}`);
    } catch (err: any) {
      console.warn(`[Storage] GCS initialization notice: ${err.message}. Local secure media storage active.`);
    }
  } else {
    // Check firebase-applet-config.json for bucket
    try {
      const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
      if (fs.existsSync(configPath)) {
        const raw = fs.readFileSync(configPath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.storageBucket) {
          bucketName = parsed.storageBucket;
          gcsStorage = new Storage({ projectId: parsed.projectId });
          console.log(`[Storage] Initialized Storage from Firebase config: ${bucketName}`);
        }
      }
    } catch (e) {
      // Ignore
    }
  }

  // Ensure local uploads directory exists
  const localUploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(localUploadDir)) {
    fs.mkdirSync(localUploadDir, { recursive: true });
  }
}

export interface UploadResult {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

export async function uploadUserMedia(
  buffer: Buffer,
  mimeType: string,
  originalName: string,
  userId: string
): Promise<UploadResult> {
  // Validate MIME type strictly
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error(`Invalid file type: ${mimeType}. Allowed formats: JPG, PNG, WEBP, GIF.`);
  }

  // Validate File Size
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new Error('File size exceeds the 8 MB maximum limit.');
  }

  // Validate Magic Numbers / Headers
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  const isGif = buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46;
  const isWebp = buffer.slice(8, 12).toString('ascii') === 'WEBP';

  if (!isJpeg && !isPng && !isGif && !isWebp) {
    throw new Error('File content does not match allowed image signatures.');
  }

  // Generate randomized server-side object name to prevent path traversal
  const ext = EXTENSION_MAP[mimeType] || '.jpg';
  const randomSuffix = crypto.randomBytes(16).toString('hex');
  const safeFilename = `aura_${userId.replace(/[^a-zA-Z0-9_-]/g, '')}_${Date.now()}_${randomSuffix}${ext}`;

  // If GCS is configured and active, upload to private bucket
  if (gcsStorage && bucketName) {
    try {
      const bucket = gcsStorage.bucket(bucketName);
      const file = bucket.file(`media/${safeFilename}`);

      await file.save(buffer, {
        metadata: {
          contentType: mimeType,
          metadata: {
            uploadedBy: userId,
            uploadedAt: new Date().toISOString()
          }
        },
        resumable: false
      });

      // Try signed URL or secure proxy URL
      try {
        const [signedUrl] = await file.getSignedUrl({
          action: 'read',
          expires: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
        });
        return {
          url: signedUrl,
          filename: safeFilename,
          size: buffer.length,
          mimeType
        };
      } catch (signErr) {
        // Return authenticated delivery route
        return {
          url: `/api/media/files/${safeFilename}`,
          filename: safeFilename,
          size: buffer.length,
          mimeType
        };
      }
    } catch (gcsErr: any) {
      console.warn(`[Storage] GCS upload encountered: ${gcsErr.message}. Writing securely to persistent local storage.`);
    }
  }

  // Persistent local storage path
  const localUploadDir = path.join(process.cwd(), 'uploads');
  const targetPath = path.join(localUploadDir, safeFilename);

  // Prevent path traversal
  if (!targetPath.startsWith(localUploadDir)) {
    throw new Error('Path traversal attempt detected.');
  }

  fs.writeFileSync(targetPath, buffer);

  return {
    url: `/api/media/files/${safeFilename}`,
    filename: safeFilename,
    size: buffer.length,
    mimeType
  };
}

export function getLocalMediaFile(filename: string): { path: string; mimeType: string } | null {
  // Prevent path traversal
  const cleanFilename = path.basename(filename);
  const localUploadDir = path.join(process.cwd(), 'uploads');
  const fullPath = path.join(localUploadDir, cleanFilename);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const ext = path.extname(cleanFilename).toLowerCase();
  let mimeType = 'image/jpeg';
  if (ext === '.png') mimeType = 'image/png';
  if (ext === '.webp') mimeType = 'image/webp';
  if (ext === '.gif') mimeType = 'image/gif';

  return { path: fullPath, mimeType };
}

export function deleteMediaFile(filename: string): boolean {
  try {
    const cleanFilename = path.basename(filename);
    const localUploadDir = path.join(process.cwd(), 'uploads');
    const fullPath = path.join(localUploadDir, cleanFilename);

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
    return false;
  } catch (err) {
    return false;
  }
}
