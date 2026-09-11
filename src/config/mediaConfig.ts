// AURA 18+ Centralized Media Security Configuration & Limits

export const MEDIA_LIMITS = {
  // Max file sizes (bytes)
  MAX_PHOTO_SIZE: 10 * 1024 * 1024, // 10 MB
  MAX_AUDIO_SIZE: 10 * 1024 * 1024, // 10 MB
  MAX_VIDEO_SIZE: 30 * 1024 * 1024, // 30 MB
  MAX_VIDEO_DURATION_SECONDS: 20,    // Strict Star Video cap (10-20s)
  THUMBNAIL_MAX_DIMENSION: 320,      // Max width/height for thumbnails

  // Rate Limiting (per user per window)
  RATE_LIMITS: {
    UPLOAD_INIT: { max: 25, windowMs: 60 * 1000 },
    UPLOAD_COMPLETE: { max: 20, windowMs: 60 * 1000 },
    LINK_PREVIEW: { max: 15, windowMs: 60 * 1000 },
    STAR_VIDEO_UPLOAD: { max: 6, windowMs: 60 * 1000 },
    MEDIA_DOWNLOAD: { max: 200, windowMs: 60 * 1000 }
  },

  // Link Preview SSRF Limits
  SSRF: {
    MAX_RESPONSE_BYTES: 512 * 1024, // 512 KB
    REQUEST_TIMEOUT_MS: 3500,        // 3.5 seconds
    MAX_REDIRECTS: 3
  }
} as const;

export const ALLOWED_PHOTO_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp'
] as const;

export const ALLOWED_AUDIO_MIMES = [
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/aac',
  'audio/mpeg',
  'audio/wav',
  'audio/x-m4a'
] as const;

export const ALLOWED_VIDEO_MIMES = [
  'video/mp4',
  'video/webm'
] as const;

export type AllowedPhotoMime = typeof ALLOWED_PHOTO_MIMES[number];
export type AllowedAudioMime = typeof ALLOWED_AUDIO_MIMES[number];
export type AllowedVideoMime = typeof ALLOWED_VIDEO_MIMES[number];
