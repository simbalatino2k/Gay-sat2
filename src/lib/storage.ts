import { Storage } from '@google-cloud/storage';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { 
  validateMediaBuffer, 
  processPhotoMedia, 
  inspectMp4DurationSeconds 
} from './mediaSecurity';
import { MEDIA_LIMITS } from '../config/mediaConfig';

export interface MediaRecord {
  id: string; // Unpredictable crypto UUID
  ownerId: string;
  conversationId?: string;
  category: 'photo' | 'voice' | 'star_video' | 'profile_photo';
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  filename: string; // internal storage path / gcs key
  thumbnailFilename?: string;
  caption?: string;
  createdAt: string;
  deletedAt?: string;
  deletedBy?: string;
}

export interface UploadSession {
  uploadId: string;
  userId: string;
  conversationId?: string;
  category: 'photo' | 'voice' | 'star_video' | 'profile_photo';
  expectedMimeType: string;
  maxSizeBytes: number;
  expiresAt: number;
}

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
  'image/gif': '.gif',
  'audio/webm': '.webm',
  'audio/ogg': '.ogg',
  'audio/mp4': '.m4a',
  'audio/aac': '.aac',
  'audio/mpeg': '.mp3',
  'audio/wav': '.wav',
  'audio/x-m4a': '.m4a',
  'video/mp4': '.mp4',
  'video/webm': '.webm'
};

let gcsStorage: Storage | null = null;
let bucketName: string | null = null;

// In-memory media registry and upload sessions
const mediaRegistry = new Map<string, MediaRecord>();
const uploadSessions = new Map<string, UploadSession>();

const REGISTRY_FILE = path.join(process.cwd(), 'uploads', 'media_registry.json');

function loadRegistryFromDisk() {
  try {
    if (fs.existsSync(REGISTRY_FILE)) {
      const raw = fs.readFileSync(REGISTRY_FILE, 'utf-8');
      const items: MediaRecord[] = JSON.parse(raw);
      items.forEach(it => mediaRegistry.set(it.id, it));
      console.log(`[Storage] Loaded ${items.length} media records from persistent registry.`);
    }
  } catch (err: any) {
    console.warn(`[Storage] Error reading media registry: ${err.message}`);
  }
}

function persistRegistryToDisk() {
  try {
    const list = Array.from(mediaRegistry.values());
    fs.writeFileSync(REGISTRY_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err: any) {
    console.warn(`[Storage] Failed to persist media registry: ${err.message}`);
  }
}

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

  loadRegistryFromDisk();
}

// ============================================================================
// UPLOAD SESSION MANAGEMENT
// ============================================================================

export function createUploadSession(
  userId: string,
  category: 'photo' | 'voice' | 'star_video' | 'profile_photo',
  expectedMimeType: string,
  declaredSize: number,
  conversationId?: string
): UploadSession {
  // Determine limits
  const maxSize = category === 'star_video'
    ? MEDIA_LIMITS.MAX_VIDEO_SIZE
    : category === 'voice'
    ? MEDIA_LIMITS.MAX_AUDIO_SIZE
    : MEDIA_LIMITS.MAX_PHOTO_SIZE;

  if (declaredSize > maxSize) {
    throw new Error(`Declared size (${(declaredSize / (1024 * 1024)).toFixed(1)} MB) exceeds limit of ${(maxSize / (1024 * 1024)).toFixed(1)} MB.`);
  }

  const uploadId = `upl_${crypto.randomUUID()}`;
  const session: UploadSession = {
    uploadId,
    userId,
    conversationId,
    category,
    expectedMimeType,
    maxSizeBytes: maxSize,
    expiresAt: Date.now() + 15 * 60 * 1000 // 15 minutes window
  };

  uploadSessions.set(uploadId, session);
  return session;
}

export function getUploadSession(uploadId: string): UploadSession | null {
  const session = uploadSessions.get(uploadId);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    uploadSessions.delete(uploadId);
    return null;
  }
  return session;
}

// ============================================================================
// COMPREHENSIVE MEDIA PROCESSING & STORAGE
// ============================================================================

export interface ProcessAndSaveMediaOptions {
  buffer: Buffer;
  clientMime: string;
  category: 'photo' | 'voice' | 'star_video' | 'profile_photo';
  userId: string;
  conversationId?: string;
  caption?: string;
  clientDuration?: number;
}

export async function processAndSaveMedia(opts: ProcessAndSaveMediaOptions): Promise<MediaRecord> {
  const { buffer, clientMime, category, userId, conversationId, caption, clientDuration } = opts;

  // 1. Binary validation
  const validation = validateMediaBuffer(buffer, category, clientMime);
  if (!validation.valid) {
    throw new Error(validation.error || 'Media file validation failed.');
  }

  const verifiedMime = validation.detectedMime;
  const mediaId = `aura_${category.slice(0, 3)}_${crypto.randomUUID()}`;
  const localUploadDir = path.join(process.cwd(), 'uploads');

  let finalBuffer = buffer;
  let finalMime = verifiedMime;
  let thumbnailFilename: string | undefined = undefined;
  let width: number | undefined = undefined;
  let height: number | undefined = undefined;
  let duration: number | undefined = clientDuration;

  // 2. Category-Specific Processing
  if (category === 'photo' || category === 'profile_photo') {
    // Sharp processing: strips EXIF GPS, auto-rotates, optimizes, generates thumbnail
    const processed = await processPhotoMedia(buffer);
    finalBuffer = processed.displayBuffer;
    finalMime = processed.mimeType;
    width = processed.width;
    height = processed.height;

    // Save thumbnail
    const thumbName = `thumb_${mediaId}.webp`;
    const thumbPath = path.join(localUploadDir, thumbName);
    fs.writeFileSync(thumbPath, processed.thumbnailBuffer);
    thumbnailFilename = thumbName;
  } else if (category === 'star_video') {
    // Video Duration verification
    if (verifiedMime === 'video/mp4') {
      const parsedDuration = inspectMp4DurationSeconds(buffer);
      if (parsedDuration !== null) {
        duration = Math.round(parsedDuration);
      }
    }

    // Enforce strict duration limit
    if (duration !== undefined && duration > MEDIA_LIMITS.MAX_VIDEO_DURATION_SECONDS) {
      throw new Error(`Star Video duration exceeds maximum of ${MEDIA_LIMITS.MAX_VIDEO_DURATION_SECONDS} seconds.`);
    }

    // Default duration if missing
    if (!duration || duration <= 0) {
      duration = Math.min(clientDuration || 15, MEDIA_LIMITS.MAX_VIDEO_DURATION_SECONDS);
    }
  } else if (category === 'voice') {
    // Voice duration bounds check
    if (clientDuration && clientDuration > 300) { // Max 5 min voice
      throw new Error('Voice message duration exceeds 5 minutes.');
    }
    duration = clientDuration || 5;
  }

  // 3. Save main media file
  const ext = EXTENSION_MAP[finalMime] || '.bin';
  const mainFilename = `${mediaId}${ext}`;
  const targetPath = path.join(localUploadDir, mainFilename);

  fs.writeFileSync(targetPath, finalBuffer);

  // If GCS is configured, upload copy to private GCS
  if (gcsStorage && bucketName) {
    try {
      const bucket = gcsStorage.bucket(bucketName);
      const file = bucket.file(`media/${mainFilename}`);
      await file.save(finalBuffer, {
        metadata: {
          contentType: finalMime,
          metadata: {
            uploadedBy: userId,
            mediaId,
            category
          }
        },
        resumable: false
      });
    } catch (err: any) {
      console.warn(`[Storage] GCS backup sync notice: ${err.message}`);
    }
  }

  // 4. Record metadata
  const record: MediaRecord = {
    id: mediaId,
    ownerId: userId,
    conversationId,
    category,
    mimeType: finalMime,
    size: finalBuffer.length,
    width,
    height,
    duration,
    filename: mainFilename,
    thumbnailFilename,
    caption: caption ? caption.trim().slice(0, 500) : undefined,
    createdAt: new Date().toISOString()
  };

  mediaRegistry.set(mediaId, record);
  persistRegistryToDisk();

  return record;
}

export function getMediaRecord(mediaId: string): MediaRecord | null {
  const record = mediaRegistry.get(mediaId);
  if (!record || record.deletedAt) return null;
  return record;
}

export function getMediaFileForServing(mediaId: string, thumb = false): { path: string; mimeType: string } | null {
  const record = mediaRegistry.get(mediaId);
  if (!record || record.deletedAt) return null;

  const localUploadDir = path.join(process.cwd(), 'uploads');
  const filename = thumb && record.thumbnailFilename ? record.thumbnailFilename : record.filename;
  const fullPath = path.join(localUploadDir, filename);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const mimeType = thumb ? 'image/webp' : record.mimeType;
  return { path: fullPath, mimeType };
}

export function deleteMediaRecord(mediaId: string, requestingUserId: string): boolean {
  const record = mediaRegistry.get(mediaId);
  if (!record) return false;

  // Only owner or system can delete
  if (record.ownerId !== requestingUserId) {
    throw new Error('Unauthorized to delete this media item.');
  }

  record.deletedAt = new Date().toISOString();
  record.deletedBy = requestingUserId;

  // Cleanup physical files
  const localUploadDir = path.join(process.cwd(), 'uploads');
  try {
    const mainPath = path.join(localUploadDir, record.filename);
    if (fs.existsSync(mainPath)) fs.unlinkSync(mainPath);

    if (record.thumbnailFilename) {
      const thumbPath = path.join(localUploadDir, record.thumbnailFilename);
      if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
    }
  } catch (err: any) {
    console.warn(`[Storage] Physical delete warning: ${err.message}`);
  }

  persistRegistryToDisk();
  return true;
}

export function purgeAllUserMedia(userId: string): number {
  let purgedCount = 0;
  const localUploadDir = path.join(process.cwd(), 'uploads');

  for (const [id, record] of Array.from(mediaRegistry.entries())) {
    if (record.ownerId === userId) {
      try {
        const mainPath = path.join(localUploadDir, record.filename);
        if (fs.existsSync(mainPath)) fs.unlinkSync(mainPath);

        if (record.thumbnailFilename) {
          const thumbPath = path.join(localUploadDir, record.thumbnailFilename);
          if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
        }
      } catch (e) {
        // ignore
      }
      mediaRegistry.delete(id);
      purgedCount++;
    }
  }

  persistRegistryToDisk();
  return purgedCount;
}

// ============================================================================
// BACKWARD COMPATIBILITY HELPERS
// ============================================================================

export interface UploadResult {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  mediaId?: string;
}

export async function uploadUserMedia(
  buffer: Buffer,
  mimeType: string,
  originalName: string,
  userId: string
): Promise<UploadResult> {
  const record = await processAndSaveMedia({
    buffer,
    clientMime: mimeType,
    category: 'profile_photo',
    userId
  });

  return {
    url: `/api/media/${record.id}`,
    filename: record.filename,
    size: record.size,
    mimeType: record.mimeType,
    mediaId: record.id
  };
}

export function getLocalMediaFile(filename: string): { path: string; mimeType: string } | null {
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
  if (ext === '.mp4') mimeType = 'video/mp4';
  if (ext === '.webm') mimeType = 'video/webm';
  if (ext === '.mp3') mimeType = 'audio/mpeg';

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
