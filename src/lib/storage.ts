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
import { getPostgresPool } from '../db/postgres';

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
  moderationStatus?: "PENDING" | "APPROVED" | "REJECTED";
  moderationReason?: string;
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
const activeDownloads = new Map<string, Promise<{ path: string; mimeType: string } | null>>();

const REGISTRY_FILE = path.join(process.cwd(), 'uploads', 'media_registry.json');
const MEDIA_ID_PATTERN = /^aura_(?:pho|pro|sta|voi)_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function requiresDurableMedia(): boolean {
  return process.env.NODE_ENV === 'production' || Boolean(process.env.K_SERVICE);
}

function durableBucket() {
  return gcsStorage && bucketName ? gcsStorage.bucket(bucketName) : null;
}

function durableRecordPath(mediaId: string): string {
  return `media/records/${mediaId}.json`;
}

function isSafeMediaFilename(mediaId: string, filename: string): boolean {
  return typeof filename === 'string' && filename === path.basename(filename) &&
    (filename.startsWith(`${mediaId}.`) || filename === `thumb_${mediaId}.webp`);
}

function parseDurableRecord(mediaId: string, bytes: Buffer): MediaRecord | null {
  const record = JSON.parse(bytes.toString('utf-8')) as MediaRecord;
  if (!record || record.id !== mediaId || !record.ownerId ||
      !['photo', 'profile_photo', 'voice', 'star_video'].includes(record.category) ||
      !isSafeMediaFilename(mediaId, record.filename) ||
      (record.thumbnailFilename && !isSafeMediaFilename(mediaId, record.thumbnailFilename))) {
    return null;
  }
  return record;
}

async function readDurableRecord(mediaId: string): Promise<MediaRecord | null> {
  const bucket = durableBucket();
  if (!bucket || !MEDIA_ID_PATTERN.test(mediaId)) return null;
  try {
    const [bytes] = await bucket.file(durableRecordPath(mediaId)).download();
    return parseDurableRecord(mediaId, bytes);
  } catch (err: any) {
    if (err?.code !== 404) console.warn('[Storage] Durable metadata read failed:', err?.message || err);
    return null;
  }
}

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

  if (requiresDurableMedia() && (!durableBucket() || !getPostgresPool())) {
    throw new Error('Durable media storage is unavailable. Upload rejected to prevent data loss.');
  }

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
  const pool = getPostgresPool();
  const bucket = durableBucket();
  const uploadedObjects: string[] = [];
  try {
    if (bucket) {
      const mainObject = `media/${mainFilename}`;
      await bucket.file(mainObject).save(finalBuffer, {
        metadata: { contentType: finalMime, cacheControl: 'private, no-store' },
        resumable: false
      });
      uploadedObjects.push(mainObject);

      if (thumbnailFilename) {
        const thumbObject = `media/${thumbnailFilename}`;
        await bucket.file(thumbObject).save(fs.readFileSync(path.join(localUploadDir, thumbnailFilename)), {
          metadata: { contentType: 'image/webp', cacheControl: 'private, no-store' },
          resumable: false
        });
        uploadedObjects.push(thumbObject);
      }

      const recordObject = durableRecordPath(mediaId);
      await bucket.file(recordObject).save(JSON.stringify(record), {
        metadata: { contentType: 'application/json', cacheControl: 'private, no-store' },
        resumable: false
      });
      uploadedObjects.push(recordObject);
    }

    if (pool) {
      await pool.query(
      `INSERT INTO media_records (id, owner_id, category, moderation_status, moderation_reason, mime_type, size, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         moderation_status = EXCLUDED.moderation_status,
         moderation_reason = EXCLUDED.moderation_reason`,
      [
        record.id,
        record.ownerId,
        record.category,
        record.moderationStatus || 'PENDING',
        record.moderationReason || null,
        record.mimeType,
        record.size,
        new Date(record.createdAt)
      ]
      );
    }
  } catch (err: any) {
    if (requiresDurableMedia()) {
      if (bucket) {
        await Promise.allSettled(uploadedObjects.map(objectName => bucket.file(objectName).delete()));
      }
      try { fs.unlinkSync(targetPath); } catch {}
      if (thumbnailFilename) {
        try { fs.unlinkSync(path.join(localUploadDir, thumbnailFilename)); } catch {}
      }
      throw new Error('Durable media write failed. Upload rejected to prevent data loss.');
    }
    console.warn('[Storage] Durable media sync notice:', err?.message || err);
  }

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
  const localUploadDir = path.join(process.cwd(), 'uploads');
  const record = mediaRegistry.get(mediaId);

  if (record && !record.deletedAt) {
    const filename = thumb && record.thumbnailFilename ? record.thumbnailFilename : record.filename;
    const fullPath = path.join(localUploadDir, filename);

    if (fs.existsSync(fullPath)) {
      const mimeType = thumb ? 'image/webp' : record.mimeType;
      return { path: fullPath, mimeType };
    }
  }

  // Fallback: check if media binary exists on disk matching mediaId
  const cleanId = path.basename(mediaId);
  const possibleExts = ['.mp4', '.webm', '.webp', '.jpg', '.jpeg', '.png', '.mp3', '.m4a', '.ogg'];
  for (const ext of possibleExts) {
    const candidate = path.join(localUploadDir, `${cleanId}${ext}`);
    if (fs.existsSync(candidate)) {
      let mimeType = 'application/octet-stream';
      if (ext === '.mp4') mimeType = 'video/mp4';
      else if (ext === '.webm') mimeType = 'video/webm';
      else if (ext === '.webp') mimeType = 'image/webp';
      else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
      else if (ext === '.png') mimeType = 'image/png';
      else if (ext === '.mp3') mimeType = 'audio/mpeg';
      else if (ext === '.m4a') mimeType = 'audio/mp4';
      else if (ext === '.ogg') mimeType = 'audio/ogg';
      return { path: candidate, mimeType };
    }
  }

  return null;
}

/**
 * Production reads require both a live database row and the durable GCS record.
 * Local registry entries alone cannot prove that a media file survived a restart.
 */
export async function getMediaRecordDurable(mediaId: string): Promise<MediaRecord | null> {
  if (!requiresDurableMedia()) return getMediaRecord(mediaId);
  if (!MEDIA_ID_PATTERN.test(mediaId) || !durableBucket()) return null;
  const pool = getPostgresPool();
  if (!pool) return null;

  try {
    const result = await pool.query(
      'SELECT owner_id, category, moderation_status, moderation_reason FROM media_records WHERE id = $1',
      [mediaId]
    );
    const row = result.rows[0];
    if (!row) return null;

    // Always check GCS. A cached record on another Cloud Run instance must not
    // remain readable after its owner deletes the media or a purge tombstones it.
    const record = await readDurableRecord(mediaId);
    if (!record || record.deletedAt || record.ownerId !== row.owner_id || record.category !== row.category) {
      return null;
    }

    record.moderationStatus = row.moderation_status || undefined;
    record.moderationReason = row.moderation_reason || undefined;
    mediaRegistry.set(mediaId, record);
    return record;
  } catch (err: any) {
    console.warn('[Storage] Durable media lookup failed:', err?.message || err);
    return null;
  }
}

/** Bind an uploaded message attachment to one conversation, across instances. */
export async function bindMediaToConversationDurable(
  mediaId: string,
  ownerId: string,
  conversationId: string
): Promise<boolean> {
  if (!MEDIA_ID_PATTERN.test(mediaId) || !ownerId || !conversationId) return false;
  if (!requiresDurableMedia()) {
    const record = getMediaRecord(mediaId);
    if (!record || record.ownerId !== ownerId ||
        (record.conversationId && record.conversationId !== conversationId)) return false;
    record.conversationId = conversationId;
    persistRegistryToDisk();
    return true;
  }

  const pool = getPostgresPool();
  const bucket = durableBucket();
  if (!pool || !bucket) throw new Error('Durable media storage is unavailable.');
  const result = await pool.query('SELECT owner_id, category FROM media_records WHERE id = $1', [mediaId]);
  const row = result.rows[0];
  if (!row || row.owner_id !== ownerId) return false;

  const objectName = durableRecordPath(mediaId);
  const file = bucket.file(objectName);
  let generation: string | number;
  let record: MediaRecord | null;
  try {
    const [metadata] = await file.getMetadata();
    if (!metadata.generation) return false;
    generation = metadata.generation;
    const [bytes] = await bucket.file(objectName, { generation }).download();
    record = parseDurableRecord(mediaId, bytes);
  } catch (err: any) {
    if (err?.code === 404) return false;
    throw err;
  }
  if (!record || record.deletedAt || record.ownerId !== ownerId || record.category !== row.category ||
      (record.conversationId && record.conversationId !== conversationId)) return false;
  if (record.conversationId === conversationId) return true;

  record.conversationId = conversationId;
  try {
    await file.save(JSON.stringify(record), {
      metadata: { contentType: 'application/json', cacheControl: 'private, no-store' },
      resumable: false,
      preconditionOpts: { ifGenerationMatch: generation }
    });
  } catch (err: any) {
    // A simultaneous bind or deletion changed the GCS generation. Re-read it;
    // only the same conversation may count as a successful idempotent bind.
    if (err?.code === 412) {
      const current = await getMediaRecordDurable(mediaId);
      return current?.ownerId === ownerId && current.conversationId === conversationId;
    }
    throw err;
  }
  mediaRegistry.set(mediaId, record);
  persistRegistryToDisk();
  return true;
}

/** Download on first use per Cloud Run instance, then serve from its local cache. */
export async function getMediaFileForServingDurable(
  mediaId: string,
  thumb = false
): Promise<{ path: string; mimeType: string } | null> {
  if (!requiresDurableMedia()) return getMediaFileForServing(mediaId, thumb);
  const record = await getMediaRecordDurable(mediaId);
  const bucket = durableBucket();
  if (!record || !bucket) return null;

  const filename = thumb && record.thumbnailFilename ? record.thumbnailFilename : record.filename;
  const mimeType = thumb && record.thumbnailFilename ? 'image/webp' : record.mimeType;
  if (!isSafeMediaFilename(mediaId, filename)) return null;
  const localPath = path.join(process.cwd(), 'uploads', filename);
  if (fs.existsSync(localPath)) return { path: localPath, mimeType };

  const key = `${mediaId}:${filename}`;
  const existing = activeDownloads.get(key);
  if (existing) return existing;
  const download = (async () => {
    const temporaryPath = `${localPath}.${crypto.randomUUID()}.tmp`;
    try {
      await bucket.file(`media/${filename}`).download({ destination: temporaryPath });
      fs.renameSync(temporaryPath, localPath);
      return { path: localPath, mimeType };
    } catch (err: any) {
      try { fs.unlinkSync(temporaryPath); } catch {}
      if (err?.code !== 404) console.warn('[Storage] Durable media download failed:', err?.message || err);
      return null;
    }
  })();
  activeDownloads.set(key, download);
  try {
    return await download;
  } finally {
    activeDownloads.delete(key);
  }
}

/** Revoke in PostgreSQL and GCS before reporting deletion as complete. */
export async function deleteMediaRecordDurable(mediaId: string, requestingUserId: string): Promise<boolean> {
  if (!requiresDurableMedia()) return deleteMediaRecord(mediaId, requestingUserId);
  if (!MEDIA_ID_PATTERN.test(mediaId)) return false;
  const pool = getPostgresPool();
  const bucket = durableBucket();
  if (!pool || !bucket) throw new Error('Durable media storage is unavailable.');

  const result = await pool.query('SELECT owner_id FROM media_records WHERE id = $1', [mediaId]);
  const row = result.rows[0];
  if (!row) return false;
  if (row.owner_id !== requestingUserId) throw new Error('Unauthorized to delete this media item.');

  const record = await readDurableRecord(mediaId);
  if (record && record.ownerId !== requestingUserId) throw new Error('Media ownership mismatch.');
  if (record) {
    record.deletedAt = record.deletedAt || new Date().toISOString();
    record.deletedBy = requestingUserId;
    await bucket.file(durableRecordPath(mediaId)).save(JSON.stringify(record), {
      metadata: { contentType: 'application/json', cacheControl: 'private, no-store' },
      resumable: false
    });
  }
  mediaRegistry.delete(mediaId);

  // Older GCS copies predate durable JSON records. They remain unreadable but
  // must still be removable for account erasure.
  const legacyFiles = record ? [] : (await bucket.getFiles({ prefix: `media/${mediaId}.`, maxResults: 20 }))[0];
  const objects = record
    ? [record.filename, record.thumbnailFilename].filter((filename): filename is string => Boolean(filename))
    : [...legacyFiles.map(file => path.basename(file.name)), `thumb_${mediaId}.webp`];
  for (const filename of objects) {
    if (!isSafeMediaFilename(mediaId, filename)) throw new Error('Invalid durable media filename.');
    try {
      await bucket.file(`media/${filename}`).delete();
    } catch (err: any) {
      if (err?.code !== 404) throw err;
    }
  }
  // Keep the database row until GCS cleanup is complete. If any step fails,
  // the tombstone (or missing JSON) blocks reads and the row allows a retry.
  if (record) {
    try {
      await bucket.file(durableRecordPath(mediaId)).delete();
    } catch (err: any) {
      if (err?.code !== 404) throw err;
    }
  }
  await pool.query('DELETE FROM media_records WHERE id = $1 AND owner_id = $2', [mediaId, requestingUserId]);

  const localUploadDir = path.join(process.cwd(), 'uploads');
  for (const filename of objects) {
    try { fs.unlinkSync(path.join(localUploadDir, filename)); } catch {}
  }
  persistRegistryToDisk();
  return true;
}

export async function purgeAllUserMediaDurable(userId: string): Promise<number> {
  if (!requiresDurableMedia()) return purgeAllUserMedia(userId);
  const pool = getPostgresPool();
  if (!pool) throw new Error('PostgreSQL is unavailable for media erasure.');
  const result = await pool.query('SELECT id FROM media_records WHERE owner_id = $1', [userId]);
  let purged = 0;
  for (const row of result.rows) {
    if (await deleteMediaRecordDurable(row.id, userId)) purged += 1;
  }
  return purged;
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


export function getPendingMedia(): MediaRecord[] {
  return Array.from(mediaRegistry.values()).filter(m => m.moderationStatus === 'PENDING');
}

export function updateMediaModeration(mediaId: string, status: 'APPROVED' | 'REJECTED', reason?: string): boolean {
  const record = mediaRegistry.get(mediaId);
  if (!record) return false;
  record.moderationStatus = status;
  record.moderationReason = reason;
  persistRegistryToDisk();

  const pool = getPostgresPool();
  if (pool) {
    pool.query(
      'UPDATE media_records SET moderation_status = $1, moderation_reason = $2 WHERE id = $3',
      [status, reason || null, mediaId]
    ).catch(e => console.error('[Storage PG] Error updating media moderation:', e.message));
  }

  return true;
}
