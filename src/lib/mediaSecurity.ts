import crypto from 'crypto';
import dns from 'dns';
import http from 'http';
import https from 'https';
import sharp from 'sharp';
import { 
  MEDIA_LIMITS, 
  ALLOWED_PHOTO_MIMES, 
  ALLOWED_AUDIO_MIMES, 
  ALLOWED_VIDEO_MIMES 
} from '../config/mediaConfig';

// ============================================================================
// 1. FILE SIGNATURES & VALIDATION
// ============================================================================

export interface FileValidationResult {
  valid: boolean;
  detectedMime: string;
  error?: string;
}

export function detectFileSignature(buffer: Buffer): string | null {
  if (!buffer || buffer.length < 4) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
    buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A
  ) {
    return 'image/png';
  }

  // WebP / RIFF container
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer.slice(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }

  // WAV / RIFF container
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer.slice(8, 12).toString('ascii') === 'WAVE'
  ) {
    return 'audio/wav';
  }

  // OGG: OggS (4F 67 67 53)
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x4F && buffer[1] === 0x67 && buffer[2] === 0x67 && buffer[3] === 0x53
  ) {
    return 'audio/ogg';
  }

  // WebM / Matroska: 1A 45 DF A3
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3
  ) {
    // Check if audio/webm or video/webm by scanning first 1KB for 'webm' doc type
    const headStr = buffer.slice(0, Math.min(buffer.length, 1024)).toString('latin1');
    if (headStr.includes('webm')) {
      return 'video/webm'; // can serve as audio or video container
    }
    return 'video/webm';
  }

  // MP4 / M4A / AAC in ISO BMFF (ftyp box at offset 4)
  if (buffer.length >= 12 && buffer.slice(4, 8).toString('ascii') === 'ftyp') {
    const brand = buffer.slice(8, 12).toString('ascii').trim().toLowerCase();
    if (brand.startsWith('m4a') || brand.startsWith('m4b')) {
      return 'audio/mp4';
    }
    return 'video/mp4';
  }

  // MP3: ID3 tag or Sync frame (FF FB or FF F3 or FF F2)
  if (
    (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) ||
    (buffer[0] === 0xFF && (buffer[1] & 0xE0) === 0xE0)
  ) {
    return 'audio/mpeg';
  }

  // AAC ADTS: FF F1 or FF F9
  if (buffer[0] === 0xFF && (buffer[1] === 0xF1 || buffer[1] === 0xF9)) {
    return 'audio/aac';
  }

  return null;
}

export function validateMediaBuffer(
  buffer: Buffer,
  category: 'photo' | 'voice' | 'star_video' | 'profile_photo',
  clientMime: string
): FileValidationResult {
  // Check maximum file sizes
  const maxSize = category === 'star_video'
    ? MEDIA_LIMITS.MAX_VIDEO_SIZE
    : category === 'voice'
    ? MEDIA_LIMITS.MAX_AUDIO_SIZE
    : MEDIA_LIMITS.MAX_PHOTO_SIZE;

  if (buffer.length > maxSize) {
    return {
      valid: false,
      detectedMime: '',
      error: `File exceeds maximum allowed size of ${(maxSize / (1024 * 1024)).toFixed(1)} MB.`
    };
  }

  if (buffer.length === 0) {
    return { valid: false, detectedMime: '', error: 'Empty file received.' };
  }

  const detected = detectFileSignature(buffer);
  if (!detected) {
    return {
      valid: false,
      detectedMime: '',
      error: 'Unrecognized file format or corrupted binary signature.'
    };
  }

  if (category === 'photo' || category === 'profile_photo') {
    const allowed = (ALLOWED_PHOTO_MIMES as readonly string[]).includes(detected);
    if (!allowed) {
      return {
        valid: false,
        detectedMime: detected,
        error: `Invalid photo format (${detected}). Only JPEG, PNG and WebP are supported.`
      };
    }
    return { valid: true, detectedMime: detected };
  }

  if (category === 'voice') {
    // Both audio/* and video/webm (WebM audio recorded by MediaRecorder) are valid voice containers
    const isAllowedAudio = (ALLOWED_AUDIO_MIMES as readonly string[]).includes(detected) || detected === 'video/webm';
    if (!isAllowedAudio) {
      return {
        valid: false,
        detectedMime: detected,
        error: `Invalid audio format (${detected}). Supported: WebM, OGG, MP4, AAC, MP3, WAV.`
      };
    }
    return { valid: true, detectedMime: detected === 'video/webm' ? 'audio/webm' : detected };
  }

  if (category === 'star_video') {
    const isAllowedVideo = (ALLOWED_VIDEO_MIMES as readonly string[]).includes(detected);
    if (!isAllowedVideo) {
      return {
        valid: false,
        detectedMime: detected,
        error: `Invalid video format (${detected}). Supported: MP4 and WebM.`
      };
    }
    return { valid: true, detectedMime: detected };
  }

  return { valid: false, detectedMime: detected, error: 'Unknown media category.' };
}

// ============================================================================
// 2. PHOTO PROCESSING & EXIF GPS STRIPPING (SHARP)
// ============================================================================

export interface ProcessedPhoto {
  displayBuffer: Buffer;
  thumbnailBuffer: Buffer;
  width: number;
  height: number;
  mimeType: string;
  size: number;
  thumbnailMimeType: string;
  thumbnailSize: number;
}

export async function processPhotoMedia(buffer: Buffer): Promise<ProcessedPhoto> {
  // Load into sharp instance
  const img = sharp(buffer, { failOn: 'error', limitInputPixels: 4096 * 4096 });
  const meta = await img.metadata();

  if (!meta.width || !meta.height) {
    throw new Error('Could not read image dimensions. Corrupt image file.');
  }

  // 1. Auto-rotate according to EXIF orientation, then completely strip EXIF metadata
  // By omitting withMetadata(), sharp completely strips all EXIF, GPS coordinates, camera models, and user comments!
  const processedDisplay = await sharp(buffer)
    .rotate() // corrects orientation
    .webp({ quality: 88, effort: 4 })
    .toBuffer();

  const displayMeta = await sharp(processedDisplay).metadata();

  // 2. Generate optimized thumbnail (max 320x320 inside aspect ratio)
  const thumbnailBuffer = await sharp(buffer)
    .rotate()
    .resize({
      width: MEDIA_LIMITS.THUMBNAIL_MAX_DIMENSION,
      height: MEDIA_LIMITS.THUMBNAIL_MAX_DIMENSION,
      fit: 'inside',
      withoutEnlargement: true
    })
    .webp({ quality: 75, effort: 3 })
    .toBuffer();

  return {
    displayBuffer: processedDisplay,
    thumbnailBuffer,
    width: displayMeta.width || meta.width,
    height: displayMeta.height || meta.height,
    mimeType: 'image/webp',
    size: processedDisplay.length,
    thumbnailMimeType: 'image/webp',
    thumbnailSize: thumbnailBuffer.length
  };
}

// ============================================================================
// 3. VIDEO DURATION & ATOM PARSER
// ============================================================================

/**
 * Parses ISO-BMFF (MP4) moov -> mvhd atom to extract real duration in seconds.
 * Returns null if duration cannot be parsed from the atoms.
 */
export function inspectMp4DurationSeconds(buffer: Buffer): number | null {
  try {
    let offset = 0;
    while (offset + 8 <= buffer.length) {
      const atomSize = buffer.readUInt32BE(offset);
      const atomType = buffer.slice(offset + 4, offset + 8).toString('ascii');

      if (atomSize === 0) break; // spans to EOF
      const effectiveSize = atomSize === 1 ? buffer.readBigUInt64BE(offset + 8) : BigInt(atomSize);
      const headerSize = atomSize === 1 ? 16 : 8;

      if (atomType === 'moov') {
        // Search inside moov for mvhd
        let moovOffset = offset + headerSize;
        const moovEnd = offset + Number(effectiveSize);
        while (moovOffset + 8 <= moovEnd && moovOffset + 8 <= buffer.length) {
          const subSize = buffer.readUInt32BE(moovOffset);
          const subType = buffer.slice(moovOffset + 4, moovOffset + 8).toString('ascii');
          if (subType === 'mvhd') {
            const version = buffer.readUInt8(moovOffset + 8);
            if (version === 0 && moovOffset + 24 <= buffer.length) {
              const timeScale = buffer.readUInt32BE(moovOffset + 20);
              const duration = buffer.readUInt32BE(moovOffset + 24);
              if (timeScale > 0) return duration / timeScale;
            } else if (version === 1 && moovOffset + 36 <= buffer.length) {
              const timeScale = buffer.readUInt32BE(moovOffset + 28);
              const duration = Number(buffer.readBigUInt64BE(moovOffset + 32));
              if (timeScale > 0) return duration / timeScale;
            }
          }
          if (subSize <= 0) break;
          moovOffset += subSize;
        }
      }

      if (Number(effectiveSize) <= 0) break;
      offset += Number(effectiveSize);
    }
  } catch (e) {
    // If malformed, return null
  }
  return null;
}

// ============================================================================
// 4. STRICT SSRF-PROTECTED LINK PREVIEW EXTRACTOR
// ============================================================================

export interface SafeLinkPreview {
  normalizedUrl: string;
  displayUrl: string;
  title: string;
  domain: string;
  thumbnailRef?: string;
  description?: string;
}

/**
 * Checks if an IP address is private, loopback, link-local, carrier NAT, or Cloud metadata.
 */
export function isForbiddenIp(ip: string): boolean {
  // Normalize IPv4-mapped IPv6
  let cleanIp = ip.toLowerCase().trim();
  if (cleanIp.startsWith('::ffff:')) {
    cleanIp = cleanIp.substring(7);
  }

  // IPv6 checks
  if (cleanIp.includes(':')) {
    if (cleanIp === '::1' || cleanIp === '::') return true; // Loopback
    if (cleanIp.startsWith('fe80:')) return true; // Link-local
    if (cleanIp.startsWith('fc') || cleanIp.startsWith('fd')) return true; // Unique local
    return false;
  }

  // IPv4 checks
  const parts = cleanIp.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
    return true; // Invalid format
  }

  const [b0, b1] = parts;

  // 0.0.0.0/8 (Current network)
  if (b0 === 0) return true;

  // 127.0.0.0/8 (Loopback)
  if (b0 === 127) return true;

  // 10.0.0.0/8 (RFC 1918 Private)
  if (b0 === 10) return true;

  // 172.16.0.0/12 (RFC 1918 Private)
  if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;

  // 192.168.0.0/16 (RFC 1918 Private)
  if (b0 === 192 && b1 === 168) return true;

  // 169.254.0.0/16 (Link-Local & Cloud Metadata 169.254.169.254)
  if (b0 === 169 && b1 === 254) return true;

  // 100.64.0.0/10 (Carrier-grade NAT)
  if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;

  // 198.18.0.0/15 (Benchmarking)
  if (b0 === 198 && (b1 === 18 || b1 === 19)) return true;

  // Broadcast & Multicast: 224.0.0.0/4 and 255.255.255.255
  if (b0 >= 224) return true;

  return false;
}

export function isForbiddenHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase().trim();
  if (
    lower === 'localhost' ||
    lower.endsWith('.localhost') ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal') ||
    lower.includes('metadata.google.internal') ||
    lower === 'instance-data'
  ) {
    return true;
  }
  return false;
}

export async function fetchSafeLinkMetadata(rawUrl: string): Promise<SafeLinkPreview> {
  // 1. URL syntax & protocol validation
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl.trim());
  } catch (err) {
    throw new Error('Invalid URL format.');
  }

  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    throw new Error(`Forbidden URL protocol: ${parsedUrl.protocol}. Only HTTP and HTTPS are permitted.`);
  }

  if (isForbiddenHostname(parsedUrl.hostname)) {
    throw new Error('Access to internal or local hostnames is forbidden.');
  }

  // 2. DNS Resolution & IP Check
  const records = await dns.promises.lookup(parsedUrl.hostname, { all: true });
  if (!records || records.length === 0) {
    throw new Error('Could not resolve hostname.');
  }

  for (const rec of records) {
    if (isForbiddenIp(rec.address)) {
      throw new Error(`Host resolves to restricted or private IP: ${rec.address}`);
    }
  }

  // 3. SSRF-Safe Fetch with timeout and max size
  const htmlContent = await fetchHtmlContentSafe(parsedUrl.toString(), 0);

  // 4. Extract and sanitize metadata
  const domain = parsedUrl.hostname.replace(/^www\./i, '');
  const titleMatch = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i);
  const ogTitleMatch = htmlContent.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
                       htmlContent.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:title["']/i);
  const ogDescMatch = htmlContent.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) ||
                      htmlContent.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  const ogImageMatch = htmlContent.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);

  let title = ogTitleMatch?.[1] || titleMatch?.[1] || domain;
  let description = ogDescMatch?.[1] || '';
  let thumbnailRef = ogImageMatch?.[1] || '';

  // Sanitize strings (strip tags and limit size)
  title = sanitizeText(title, 120);
  description = sanitizeText(description, 200);

  // Validate thumbnail url if present
  if (thumbnailRef) {
    try {
      const resolvedThumb = new URL(thumbnailRef, parsedUrl.origin);
      if (resolvedThumb.protocol === 'https:' || resolvedThumb.protocol === 'http:') {
        thumbnailRef = resolvedThumb.toString();
      } else {
        thumbnailRef = '';
      }
    } catch (e) {
      thumbnailRef = '';
    }
  }

  return {
    normalizedUrl: parsedUrl.toString(),
    displayUrl: `${domain}${parsedUrl.pathname !== '/' ? parsedUrl.pathname : ''}`.slice(0, 60),
    domain,
    title,
    description: description || undefined,
    thumbnailRef: thumbnailRef || undefined
  };
}

function sanitizeText(str: string, maxLen: number): string {
  return str
    .replace(/<[^>]*>/g, '') // strip HTML tags
    .replace(/[\r\n\t]+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

async function fetchHtmlContentSafe(targetUrl: string, redirectCount: number): Promise<string> {
  if (redirectCount > MEDIA_LIMITS.SSRF.MAX_REDIRECTS) {
    throw new Error('Too many redirects.');
  }

  const parsed = new URL(targetUrl);
  if (isForbiddenHostname(parsed.hostname)) {
    throw new Error('Redirect target is a forbidden hostname.');
  }

  const records = await dns.promises.lookup(parsed.hostname, { all: true });
  for (const rec of records) {
    if (isForbiddenIp(rec.address)) {
      throw new Error(`Redirect target IP is restricted: ${rec.address}`);
    }
  }

  const client = parsed.protocol === 'https:' ? https : http;

  return new Promise<string>((resolve, reject) => {
    let resolved = false;
    const req = client.get(
      targetUrl,
      {
        headers: {
          'User-Agent': 'AuraBot/1.0 (+https://aura.local/bot)',
          'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8'
        },
        timeout: MEDIA_LIMITS.SSRF.REQUEST_TIMEOUT_MS
      },
      res => {
        // Check for redirects
        if ([301, 302, 303, 307, 308].includes(res.statusCode || 0) && res.headers.location) {
          res.resume();
          const redirectUrl = new URL(res.headers.location, parsed.origin).toString();
          resolve(fetchHtmlContentSafe(redirectUrl, redirectCount + 1));
          return;
        }

        if ((res.statusCode || 0) < 200 || (res.statusCode || 0) >= 300) {
          res.resume();
          resolve(''); // Return empty on non-200 rather than crashing preview
          return;
        }

        const contentType = res.headers['content-type'] || '';
        if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
          res.resume();
          resolve('');
          return;
        }

        let totalBytes = 0;
        const chunks: Buffer[] = [];

        res.on('data', (chunk: Buffer) => {
          totalBytes += chunk.length;
          if (totalBytes > MEDIA_LIMITS.SSRF.MAX_RESPONSE_BYTES) {
            req.destroy();
            resolve(Buffer.concat(chunks).toString('utf-8'));
          } else {
            chunks.push(chunk);
          }
        });

        res.on('end', () => {
          if (!resolved) {
            resolved = true;
            resolve(Buffer.concat(chunks).toString('utf-8'));
          }
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Link preview request timed out.'));
    });

    req.on('error', err => {
      reject(err);
    });
  });
}

// ============================================================================
// 5. SLIDING WINDOW RATE LIMITER
// ============================================================================

interface RateRecord {
  timestamps: number[];
}

const rateLimitBuckets = new Map<string, RateRecord>();

export function checkRateLimit(
  key: string,
  limit: { max: number; windowMs: number }
): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  let record = rateLimitBuckets.get(key);

  if (!record) {
    record = { timestamps: [] };
    rateLimitBuckets.set(key, record);
  }

  // Purge expired timestamps
  const cutoff = now - limit.windowMs;
  record.timestamps = record.timestamps.filter(ts => ts > cutoff);

  if (record.timestamps.length >= limit.max) {
    const oldest = record.timestamps[0];
    const retryAfterMs = Math.max(1000, oldest + limit.windowMs - now);
    return { allowed: false, retryAfterMs };
  }

  record.timestamps.push(now);
  return { allowed: true };
}

// ============================================================================
// 6. CRYPTOGRAPHIC SIGNED TOKENS FOR MEDIA
// ============================================================================

const MEDIA_SIGNING_SECRET = process.env.MEDIA_SECRET || crypto.randomBytes(32).toString('hex');

export function signMediaAccessToken(mediaId: string, userId: string, ttlSeconds = 900): string {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${mediaId}:${userId}:${expiresAt}`;
  const signature = crypto
    .createHmac('sha256', MEDIA_SIGNING_SECRET)
    .update(payload)
    .digest('hex');
  return Buffer.from(JSON.stringify({ mediaId, userId, expiresAt, sig: signature })).toString('base64url');
}

export function verifyMediaAccessToken(token: string): { mediaId: string; userId: string } | null {
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf-8');
    const parsed = JSON.parse(raw);
    const { mediaId, userId, expiresAt, sig } = parsed;

    if (!mediaId || !userId || !expiresAt || !sig) return null;
    if (Math.floor(Date.now() / 1000) > expiresAt) return null; // Expired

    const expectedSig = crypto
      .createHmac('sha256', MEDIA_SIGNING_SECRET)
      .update(`${mediaId}:${userId}:${expiresAt}`)
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expectedSig, 'hex'))) {
      return null;
    }

    return { mediaId, userId };
  } catch (err) {
    return null;
  }
}
