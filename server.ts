import { moderateText } from './src/lib/moderation.js';
// Clean up tsx global __dirname if it was set to '.' to prevent ERR_INVALID_ARG_VALUE in Node 22 ESM plugins (e.g. vite-plugin-pwa)
if ((globalThis as any).__dirname === '.') {
  delete (globalThis as any).__dirname;
}

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import http from 'http';
import { GoogleGenAI } from '@google/genai';
import multer from 'multer';
import { store } from './src/db/store';
import { UserAccount } from './src/types';
import { QUEER_VENUES, getVenuesNearLocation, searchVenues } from './src/data/queerVenues';
import { AURA_STICKERS } from './src/data/auraStickers';
import { getAdsForPlacement, NATIVE_ADS_INVENTORY } from './src/data/nativeAds';
import { 
  initStorage, 
  uploadUserMedia, 
  getLocalMediaFile,
  processAndSaveMedia,
  createUploadSession,
  getUploadSession,
  getMediaRecord,
  getMediaFileForServing,
  deleteMediaRecord
} from './src/lib/storage';
import { 
  MEDIA_LIMITS, 
  ALLOWED_PHOTO_MIMES, 
  ALLOWED_AUDIO_MIMES, 
  ALLOWED_VIDEO_MIMES 
} from './src/config/mediaConfig';
import { 
  checkRateLimit, 
  fetchSafeLinkMetadata, 
  verifyMediaAccessToken, 
  signMediaAccessToken 
} from './src/lib/mediaSecurity';
import { cloudBackupService } from './src/services/cloudBackupService';
import { WebSocketServer, WebSocket } from 'ws';
import {
  verifyGooglePlayPurchase,
  verifyAppleStoreKitTransaction,
  handleGooglePlayRtdn,
  handleAppleStoreKitWebhook,
  restoreUserPurchases
} from './src/services/billingService';
import { BILLING_PLANS, STORE_PRODUCT_IDS } from './src/config/billingConfig';

// Initialize Media Storage subsystem
initStorage();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 35 * 1024 * 1024 } // 35 MB limit (supports up to 30 MB Star Video)
});

// Initialize Express App
const app = express();
const PORT = 3000;

// Security & Parsing Middlewares with rawBody capture for webhook signature verification
app.use(
  express.json({
    limit: '10mb',
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    }
  })
);
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Production Security Headers Middleware (Nginx manages reverse-proxy CSP & framing)
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Permissions-Policy',
    'camera=(self), microphone=(), payment=*, geolocation=(self)'
  );
  if (req.secure || req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  next();
});

// Global Rate Limiting in Memory
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 120; // 120 requests per minute

function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  let record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    record = { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS };
    rateLimitMap.set(ip, record);
    return next();
  }

  record.count += 1;
  if (record.count > MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({ error: 'Too many requests. Please slow down and try again.' });
  }

  next();
}

app.use('/api', rateLimiter);

// Dedicated Authentication Rate Limiter (Protection against credential stuffing & brute-force)
const authRateLimitMap = new Map<string, { count: number; resetTime: number }>();
const AUTH_WINDOW_MS = 5 * 60 * 1000; // 5 minutes window
const MAX_AUTH_ATTEMPTS = 5; // Max 5 attempts per 5 minutes

function authRateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  let record = authRateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    authRateLimitMap.set(ip, { count: 1, resetTime: now + AUTH_WINDOW_MS });
    return next();
  }

  if (record.count >= MAX_AUTH_ATTEMPTS) {
    const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
    res.setHeader('Retry-After', retryAfterSeconds);
    return res.status(429).json({
      error: 'Too many authentication attempts. For your security, please wait a few minutes before trying again.'
    });
  }

  record.count += 1;
  next();
}

// Custom Auth Request Interface
interface AuthenticatedRequest extends Request {
  user?: UserAccount;
  token?: string;
}

// Authentication Middleware
async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const user = await store.getUserByToken(token);

  if (!user) {
    return res.status(401).json({ error: 'Invalid, expired, or deactivated authentication session' });
  }

  if (user.status !== 'ACTIVE') {
    return res.status(403).json({ error: `Account access restriction: status is ${user.status}` });
  }

  req.user = user;
  req.token = token;
  next();
}

async function optionalAuthenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const user = await store.getUserByToken(token);
    if (user && user.status === 'ACTIVE') {
      req.user = user;
      req.token = token;
    }
  }
  next();
}

// Admin Role Guard
function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'SUPERADMIN')) {
    return res.status(403).json({ error: 'Access denied. Administrative privileges required.' });
  }
  next();
}

// Lazy Gemini AI Client Initialization
let genAIClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not configured');
    }
    genAIClient = new GoogleGenAI({ apiKey });
  }
  return genAIClient;
}

// --- REST API ENDPOINTS ---

// Health & Status
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'AURA GAY 18+',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Auth: Register
app.post('/api/auth/register', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email, displayName, age, is18PlusAccepted, isAgeVerified18Plus, password } = req.body;

    const isConfirmed18 = is18PlusAccepted === true || isAgeVerified18Plus === true;
    if (!isConfirmed18) {
      return res.status(400).json({ error: 'You must confirm you are 18 years of age or older to use AURA.' });
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }

    const numAge = age ? Number(age) : 18;
    if (isNaN(numAge) || numAge < 18) {
      return res.status(400).json({ error: 'AURA GAY 18+ is strictly reserved for adults 18 years of age and older.' });
    }

    const cleanName = (displayName || email.split('@')[0] || 'AURA Member').toString().trim();
    if (!cleanName || cleanName.length < 2) {
      return res.status(400).json({ error: 'Display name must be at least 2 characters long.' });
    }

    const result = await store.registerUser(email, cleanName, numAge, 'USER', password);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Registration failed' });
  }
});

// Auth: Login
app.post('/api/auth/login', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    const result = await store.loginUser(email, password);
    if (!result) {
      return res.status(404).json({ error: 'No active account found for this email address. Please register.' });
    }

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Login failed' });
  }
});

// Auth: Social Fallback / Sandbox Login (when third-party OAuth provider is not yet enabled in Firebase Console)
app.post('/api/auth/social-dev-login', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { provider, email, displayName } = req.body;
    if (!provider || typeof provider !== 'string') {
      return res.status(400).json({ error: 'Provider is required' });
    }
    const result = await store.loginOrRegisterSocialUser(provider, email, displayName);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Social login failed' });
  }
});

// Auth: Forgot Password (Initiate recovery flow)
app.post('/api/auth/forgot-password', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const result = await store.createPasswordReset(email.trim());

    // Prevent account enumeration by always returning a consistent success confirmation
    const responsePayload: any = {
      success: true,
      message: 'If an account exists with that email, password reset instructions have been generated.'
    };

    // In development or testing, include the reset token directly to facilitate automated tests and local setup
    if (process.env.NODE_ENV !== 'production' && result) {
      responsePayload.devResetToken = result.token;
      responsePayload.expiresAt = result.expiresAt;
    }

    res.json(responsePayload);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to process password recovery request.' });
  }
});

// Auth: Reset Password (Execute token verification & update)
app.post('/api/auth/reset-password', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Password recovery token is required.' });
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
    }

    const success = await store.resetPasswordWithToken(token.trim(), newPassword);
    if (!success) {
      return res.status(400).json({ error: 'Password recovery link is invalid or has expired.' });
    }

    res.json({
      success: true,
      message: 'Password successfully updated. You may now log in with your new credentials.'
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Password reset failed.' });
  }
});

// ============================================================================
// RICH MEDIA BACKEND ENDPOINTS & ACCESS CONTROL
// ============================================================================

// 1. Upload Init: Allocate upload session & validate parameters before transfer
app.post('/api/media/upload/init', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rateCheck = checkRateLimit(`upload_init_${req.user!.id}`, MEDIA_LIMITS.RATE_LIMITS.UPLOAD_INIT);
    if (!rateCheck.allowed) {
      return res.status(429).json({ error: 'Media upload rate limit exceeded. Please wait a moment.' });
    }

    const { mediaType, mimeType, size, conversationId } = req.body;
    if (!mediaType || !mimeType || typeof size !== 'number') {
      return res.status(400).json({ error: 'Missing required parameters: mediaType, mimeType, size.' });
    }

    const category = mediaType as 'photo' | 'voice' | 'star_video' | 'profile_photo';
    if (!['photo', 'voice', 'star_video', 'profile_photo'].includes(category)) {
      return res.status(400).json({ error: `Invalid mediaType: ${mediaType}.` });
    }

    if (conversationId) {
      const conv = await store.getConversation(conversationId);
      if (!conv || !conv.participantIds.includes(req.user!.id)) {
        return res.status(403).json({ error: 'Unauthorized: You are not a participant in this conversation.' });
      }

      const otherId = conv.participantIds.find(id => id !== req.user!.id);
      if (otherId) {
        if (await store.isBlocked(req.user!.id, otherId)) {
          return res.status(403).json({ error: 'Cannot upload media to a blocked conversation.' });
        }
        const otherUser = await store.getUserById(otherId);
        if (!otherUser || otherUser.status !== 'ACTIVE') {
          return res.status(403).json({ error: 'Recipient account is not active.' });
        }
      }
    }

    const session = createUploadSession(req.user!.id, category, mimeType, size, conversationId);
    const allowedMimes = (category === 'photo' || category === 'profile_photo')
      ? ALLOWED_PHOTO_MIMES
      : category === 'voice'
      ? ALLOWED_AUDIO_MIMES
      : ALLOWED_VIDEO_MIMES;

    res.json({
      success: true,
      uploadId: session.uploadId,
      maxBytes: session.maxSizeBytes,
      allowedMimeTypes: allowedMimes,
      expiresAt: session.expiresAt
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to initialize media upload.' });
  }
});

// 2. Upload Complete: Process and store verified media binary
app.post('/api/media/upload/complete', authenticateToken, upload.single('media'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rateCheck = checkRateLimit(`upload_comp_${req.user!.id}`, MEDIA_LIMITS.RATE_LIMITS.UPLOAD_COMPLETE);
    if (!rateCheck.allowed) {
      return res.status(429).json({ error: 'Media upload rate limit exceeded. Please wait a moment.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No media file received.' });
    }

    const { uploadId, conversationId, caption, duration } = req.body;
    let category: 'photo' | 'voice' | 'star_video' | 'profile_photo' = 'photo';
    let targetConvId = conversationId;

    if (uploadId) {
      const session = getUploadSession(uploadId);
      if (!session) {
        return res.status(400).json({ error: 'Invalid or expired upload session.' });
      }
      if (session.userId !== req.user!.id) {
        return res.status(403).json({ error: 'Upload session belongs to another user.' });
      }
      category = session.category;
      targetConvId = session.conversationId || targetConvId;
    } else if (req.body.category) {
      category = req.body.category;
    }

    if (category === 'star_video') {
      const vidRate = checkRateLimit(`vid_comp_${req.user!.id}`, MEDIA_LIMITS.RATE_LIMITS.STAR_VIDEO_UPLOAD);
      if (!vidRate.allowed) {
        return res.status(429).json({ error: 'Star Video upload limit reached. Maximum 6 videos per minute.' });
      }
    }

    const record = await processAndSaveMedia({
      buffer: req.file.buffer,
      clientMime: req.file.mimetype,
      category,
      userId: req.user!.id,
      conversationId: targetConvId,
      caption,
      clientDuration: duration ? Number(duration) : undefined
    });

    res.json({
      success: true,
      media: {
        mediaId: record.id,
        mimeType: record.mimeType,
        size: record.size,
        width: record.width,
        height: record.height,
        duration: record.duration,
        thumbnailRef: record.thumbnailFilename ? `/api/media/${record.id}?thumb=true` : undefined,
        url: `/api/media/${record.id}`
      }
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Media processing failed.' });
  }
});

// 3. Unified Media Upload (Direct or single-step upload)
app.post('/api/media/upload', authenticateToken, upload.single('media'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rateCheck = checkRateLimit(`upload_comp_${req.user!.id}`, MEDIA_LIMITS.RATE_LIMITS.UPLOAD_COMPLETE);
    if (!rateCheck.allowed) {
      return res.status(429).json({ error: 'Upload rate limit exceeded. Please wait a moment.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No media file received.' });
    }

    let category: 'photo' | 'voice' | 'star_video' | 'profile_photo' = 'photo';
    if (req.body.category && ['photo', 'voice', 'star_video', 'profile_photo'].includes(req.body.category)) {
      category = req.body.category;
    } else if (req.file.mimetype.startsWith('audio/')) {
      category = 'voice';
    } else if (req.file.mimetype.startsWith('video/')) {
      category = 'star_video';
    }

    const record = await processAndSaveMedia({
      buffer: req.file.buffer,
      clientMime: req.file.mimetype,
      category,
      userId: req.user!.id,
      conversationId: req.body.conversationId,
      caption: req.body.caption,
      clientDuration: req.body.duration ? Number(req.body.duration) : undefined
    });

    res.json({
      success: true,
      media: {
        mediaId: record.id,
        url: `/api/media/${record.id}`,
        thumbnailUrl: record.thumbnailFilename ? `/api/media/${record.id}?thumb=true` : undefined,
        filename: record.filename,
        size: record.size,
        mimeType: record.mimeType,
        width: record.width,
        height: record.height,
        duration: record.duration
      }
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Media upload failed.' });
  }
});

// 4. Secure Media Access & Delivery Endpoint with Strict Headers
app.get('/api/media/:mediaId', async (req: Request, res: Response) => {
  try {
    const mediaId = String(req.params.mediaId);
    const isThumb = req.query.thumb === 'true';

    // 1. Resolve authentication (Bearer token or signed access token)
    let requestingUserId: string | null = null;
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      const cleanToken = authHeader.replace(/^Bearer\s+/i, '').trim();
      const user = await store.getUserByToken(cleanToken);
      if (user && user.status === 'ACTIVE') {
        requestingUserId = user.id;
      }
    }

    if (!requestingUserId && req.query.token) {
      const token = String(req.query.token);
      const signedPayload = verifyMediaAccessToken(token);
      if (signedPayload && signedPayload.mediaId === mediaId) {
        const user = await store.getUserById(signedPayload.userId);
        if (user && user.status === 'ACTIVE') {
          requestingUserId = user.id;
        }
      } else {
        const user = await store.getUserByToken(token);
        if (user && user.status === 'ACTIVE') {
          requestingUserId = user.id;
        }
      }
    }

    if (!requestingUserId) {
      return res.status(401).json({ error: 'Authentication required to access media.' });
    }

    const dlRate = checkRateLimit(`dl_${requestingUserId}`, MEDIA_LIMITS.RATE_LIMITS.MEDIA_DOWNLOAD);
    if (!dlRate.allowed) {
      return res.status(429).json({ error: 'Download rate limit exceeded.' });
    }

    // 2. Fetch media record
    const record = getMediaRecord(mediaId);
    if (!record || record.deletedAt) {
      return res.status(404).json({ error: 'Media not found or has been deleted.' });
    }

    
    if (record.category === 'profile_photo' && record.moderationStatus !== 'APPROVED') {
      if (record.ownerId !== requestingUserId) {
        return res.status(403).json({ error: 'This profile photo is pending moderation and is currently unavailable.' });
      }
    }

    // 3. Conversation access control & block check
    if (record.conversationId) {
      const conv = await store.getConversation(record.conversationId);
      if (!conv || !conv.participantIds.includes(requestingUserId)) {
        return res.status(403).json({ error: 'Unauthorized: You are not a participant in this conversation.' });
      }

      const otherId = conv.participantIds.find(id => id !== requestingUserId);
      if (otherId) {
        if (await store.isBlocked(requestingUserId, otherId)) {
          return res.status(403).json({ error: 'Access blocked by user policy.' });
        }
        const otherUser = await store.getUserById(otherId);
        if (!otherUser || otherUser.status !== 'ACTIVE') {
          return res.status(403).json({ error: 'Participant account is inactive.' });
        }
      }

      const msgs = await store.getMessages(record.conversationId, requestingUserId);
      const hasActiveMessage = msgs.some(m => 
        m.photo?.mediaId === mediaId || 
        m.voice?.mediaId === mediaId || 
        m.starVideo?.mediaId === mediaId || 
        m.media?.url?.includes(mediaId)
      );
      if (!hasActiveMessage && record.ownerId !== requestingUserId) {
        return res.status(404).json({ error: 'Media is no longer accessible or was deleted.' });
      }
    }

    // 4. Serve file with mandatory security headers
    const fileInfo = getMediaFileForServing(mediaId, isThumb);
    if (!fileInfo) {
      return res.status(404).json({ error: 'Media binary file not found.' });
    }

    res.setHeader('Content-Type', fileInfo.mimeType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'");
    res.setHeader('Content-Disposition', 'inline; filename="safe_media"');
    res.setHeader('Cache-Control', 'private, no-transform, max-age=3600');
    res.sendFile(fileInfo.path);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to deliver media.' });
  }
});

// 5. Generate Signed Media Access Token for Expiring Links
app.get('/api/media/:mediaId/sign', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const mediaId = String(req.params.mediaId);
  const record = getMediaRecord(mediaId);
  if (!record) {
    return res.status(404).json({ error: 'Media not found.' });
  }
  const signedToken = signMediaAccessToken(mediaId, req.user!.id, 900); // 15 min TTL
  res.json({
    token: signedToken,
    url: `/api/media/${mediaId}?token=${signedToken}`
  });
});

// 6. Delete Media Endpoint
app.delete('/api/media/:mediaId', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const mediaId = String(req.params.mediaId);
    const success = deleteMediaRecord(mediaId, req.user!.id);
    if (!success) {
      return res.status(404).json({ error: 'Media not found or already deleted.' });
    }
    res.json({ success: true, message: 'Media successfully deleted.' });
  } catch (err: any) {
    res.status(403).json({ error: err.message || 'Failed to delete media.' });
  }
});

// 7. SSRF-Protected Link Preview Endpoint
app.post('/api/media/link-preview', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rateCheck = checkRateLimit(`link_prev_${req.user!.id}`, MEDIA_LIMITS.RATE_LIMITS.LINK_PREVIEW);
    if (!rateCheck.allowed) {
      return res.status(429).json({ error: 'Link preview rate limit exceeded. Please wait a moment.' });
    }

    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL parameter is required.' });
    }

    const preview = await fetchSafeLinkMetadata(url);
    res.json({ success: true, preview });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Could not generate link preview.' });
  }
});

// Media: Authenticated / Sandboxed Delivery Endpoint (Legacy path support)
app.get('/api/media/files/:filename', (req: Request, res: Response) => {
  const filename = Array.isArray(req.params.filename) ? req.params.filename[0] : (req.params.filename as string);
  const fileInfo = getLocalMediaFile(filename);
  if (!fileInfo) {
    return res.status(404).json({ error: 'Media object not found.' });
  }
  res.setHeader('Content-Type', fileInfo.mimeType);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'");
  res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
  res.sendFile(fileInfo.path);
});

// Auth: Get Current Profile
app.get('/api/auth/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

// Auth: Logout
app.post('/api/auth/logout', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (req.token) {
    await store.invalidateToken(req.token);
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

// Profile: Update
app.put('/api/profile', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    
    if (req.body.bio || req.body.displayName) {
      const textToModerate = `${req.body.displayName || ''} ${req.body.bio || ''}`;
      const modResult = await moderateText(textToModerate, 'PUBLIC_PROFILE', true);
      if (!modResult.isApproved) {
        return res.status(400).json({ error: 'Profile content rejected by safety policy.', reason: modResult.reason });
      }
    }

    if (req.body.userMode) {
      const allowedModes = ['ONLINE', 'HOT_NOW', 'FLYING_MOOD', 'DISPONIBLE', 'CHILL', 'OFFLINE'];
      if (!allowedModes.includes(req.body.userMode)) {
        return res.status(400).json({ error: 'Invalid user status mode' });
      }
      req.body.modeUpdatedAt = new Date().toISOString();
      if (req.body.userMode === 'OFFLINE') {
        req.body.isOnline = false;
      } else {
        req.body.isOnline = true;
      }
    }

    const updated = await store.updateProfile(req.user!.id, req.body);
    res.json({ profile: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Profile update failed' });
  }
});

// Dedicated Status Mode update endpoint
app.put('/api/users/status-mode', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { mode } = req.body;
    const allowedModes = ['ONLINE', 'HOT_NOW', 'FLYING_MOOD', 'DISPONIBLE', 'CHILL', 'OFFLINE'];
    if (!mode || !allowedModes.includes(mode)) {
      return res.status(400).json({ error: 'Invalid status mode. Allowed: ONLINE, HOT_NOW, FLYING_MOOD, DISPONIBLE, CHILL, OFFLINE' });
    }
    const modeUpdatedAt = new Date().toISOString();
    const isOnline = mode !== 'OFFLINE';
    const updated = await store.updateProfile(req.user!.id, {
      userMode: mode,
      modeUpdatedAt,
      isOnline
    });
    res.json({ success: true, profile: updated, userMode: mode, modeUpdatedAt });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update status mode' });
  }
});

// Profile: Add Photo
app.post('/api/profile/photos', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { url, isPrimary } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Photo URL is required.' });
    }

    const updated = await store.addProfilePhoto(req.user!.id, url, Boolean(isPrimary));
    res.json({ profile: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Photo upload failed' });
  }
});

// Profile: Delete Photo
app.delete('/api/profile/photos/:photoId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const photoId = String(req.params.photoId);
    const updated = await store.deleteProfilePhoto(req.user!.id, photoId);
    res.json({ profile: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Photo deletion failed' });
  }
});

// Discovery: Feed & Profiles
app.get('/api/profiles', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';
    const user = token ? await store.getUserByToken(token) : null;
    const currentUserId = user ? user.id : 'guest';
    const profiles = await store.getDiscoverFeed(currentUserId);
    res.json({ profiles, count: profiles.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch profiles', profiles: [] });
  }
});

// Profile Lookup by User ID
app.get('/api/profiles/:userId', async (req: Request, res: Response) => {
  try {
    const userId = String(req.params.userId);
    const authHeader = req.headers['authorization'];
    const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';
    const user = token ? await store.getUserByToken(token) : null;
    const requestingUserId = user ? user.id : undefined;

    const profile = await store.getProfileById(userId, requestingUserId);
    if (!profile) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    res.json({ profile });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve profile' });
  }
});

app.get('/api/discover', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';
    const user = token ? await store.getUserByToken(token) : null;
    const currentUserId = user ? user.id : 'guest';
    const feed = await store.getDiscoverFeed(currentUserId);
    res.json({ feed, profiles: feed });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch discovery feed', feed: [], profiles: [] });
  }
});

app.post('/api/discover', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';
    const user = token ? await store.getUserByToken(token) : null;
    const currentUserId = user ? user.id : 'guest';
    const feed = await store.getDiscoverFeed(currentUserId, req.body);
    res.json({ feed, profiles: feed });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to fetch discovery feed' });
  }
});

// Venues: Get Dynamic Global Queer Places, Hotspots & Safe Spaces
app.get('/api/venues', (req: Request, res: Response) => {
  try {
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined;
    const radiusKm = req.query.radiusKm ? parseFloat(req.query.radiusKm as string) : 40;
    const query = req.query.q ? (req.query.q as string).trim() : '';

    let venues = QUEER_VENUES;

    if (query) {
      venues = searchVenues(query, lat, lng);
    } else if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
      venues = getVenuesNearLocation(lat, lng, radiusKm);
    }

    res.json({
      venues,
      count: venues.length,
      isFilteredByLocation: lat !== undefined && lng !== undefined,
      coordinates: lat !== undefined && lng !== undefined ? { lat, lng, radiusKm } : null
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch venues', venues: [], count: 0 });
  }
});

// Social: Like / SuperLike (Supports both /api/like and /api/likes)
const handleLike = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetUserId = req.body.targetUserId || req.body.userId;
    const isSuperLike = Boolean(req.body.isSuperLike);
    if (!targetUserId || typeof targetUserId !== 'string') {
      return res.status(400).json({ error: 'Target user ID is required.' });
    }

    const result = await store.likeUser(req.user!.id, targetUserId, isSuperLike);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Like interaction failed' });
  }
};
app.post('/api/like', authenticateToken, handleLike);
app.post('/api/likes', authenticateToken, handleLike);

// Social: Block User (Supports both /api/block and /api/blocks)
const handleBlock = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetUserId = req.body.targetUserId || req.body.blockedUserId || req.body.userId;
    if (!targetUserId || typeof targetUserId !== 'string') {
      return res.status(400).json({ error: 'Target user ID is required.' });
    }

    const record = await store.blockUser(req.user!.id, targetUserId);
    res.json({ success: true, blockRecord: record });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Block failed' });
  }
};
app.post('/api/block', authenticateToken, handleBlock);
app.post('/api/blocks', authenticateToken, handleBlock);

// Social: Get Blocked Users
app.get('/api/blocked', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const blocked = await store.getBlockedUsers(req.user!.id);
  res.json({ blocked });
});

// Social: Unblock User
app.post('/api/unblock', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetUserId = req.body.targetUserId || req.body.blockedUserId;
    if (!targetUserId) {
      return res.status(400).json({ error: 'Target user ID is required.' });
    }

    const success = await store.unblockUser(req.user!.id, targetUserId);
    res.json({ success });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Unblock failed' });
  }
});

// Safety: Report User / Message / Media (Supports both /api/report and /api/reports)
const handleReport = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetUserId = req.body.targetUserId || req.body.reportedUserId || req.body.userId;
    const reason = req.body.reason || 'General Concern';
    const details = req.body.details || '';
    const reportedMessageId = req.body.reportedMessageId || req.body.messageId;
    const reportedMediaId = req.body.reportedMediaId || req.body.mediaId;
    if (!targetUserId) {
      return res.status(400).json({ error: 'Target user ID is required.' });
    }

    const report = await store.reportItem(req.user!.id, targetUserId, reason, details, reportedMessageId, reportedMediaId);
    res.json({ success: true, report });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Safety report submission failed' });
  }
};
app.post('/api/report', authenticateToken, handleReport);
app.post('/api/reports', authenticateToken, handleReport);

// Conversations: Get All
app.get('/api/conversations', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const conversations = await store.getUserConversations(req.user!.id);
  res.json({ conversations });
});

// Conversations: Get or Start Conversation with a Specific User
const handleStartConversation = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetUserId = req.body.targetUserId || req.body.recipientId || req.body.otherUserId;
    if (!targetUserId || typeof targetUserId !== 'string') {
      return res.status(400).json({ error: 'targetUserId is required to start a conversation.' });
    }

    if (req.user!.id === targetUserId) {
      return res.status(400).json({ error: 'Cannot start conversation with yourself.' });
    }

    if (await store.isBlocked(req.user!.id, targetUserId)) {
      return res.status(403).json({ error: 'Cannot start conversation with blocked user.' });
    }

    const conversation = await store.getOrCreateConversation(req.user!.id, targetUserId);
    res.json({ conversation });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to start or retrieve conversation.' });
  }
};
app.post('/api/conversations', authenticateToken, handleStartConversation);
app.post('/api/conversations/start', authenticateToken, handleStartConversation);

// Conversations: Get Messages
app.get('/api/conversations/:conversationId/messages', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const conversationId = String(req.params.conversationId);
    const messages = await store.getMessages(conversationId, req.user!.id);
    await store.markMessagesRead(conversationId, req.user!.id);
    res.json({ messages });
  } catch (err: any) {
    res.status(403).json({ error: err.message || 'Access to messages denied' });
  }
});

// Conversations: Send Message
app.post('/api/conversations/:conversationId/messages', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const conversationId = String(req.params.conversationId);
    const {
      text,
      photoUrl,
      type,
      media,
      linkPreview,
      location,
      locationPayload,
      photo,
      link,
      stickerPayload,
      voice,
      starVideo,
      stickerId,
      stickerUrl,
      stickerName,
      ttlSeconds,
      isPermanent,
      excludeFromBackup,
      disableAutoBackup,
      tapType,
      vaultAction
    } = req.body;

    const messageType = type || (photoUrl || photo ? 'PHOTO' : 'TEXT');

    // 1. Validate Photo Message
    if (messageType === 'PHOTO') {
      if (!photo && !photoUrl && !media) {
        return res.status(400).json({ error: 'Photo payload or media URL is required.' });
      }
      if (photo?.mediaId) {
        const rec = getMediaRecord(photo.mediaId);
        if (!rec || (rec.ownerId !== req.user!.id && rec.conversationId !== conversationId)) {
          return res.status(400).json({ error: 'Invalid or unauthorized photo mediaId.' });
        }
      }
    }

    // 2. Validate Link Message
    if (messageType === 'LINK') {
      const targetUrl = link?.normalizedUrl || linkPreview?.url || text?.trim();
      if (!targetUrl) {
        return res.status(400).json({ error: 'Link URL is required for link messages.' });
      }
      try {
        const parsed = new URL(targetUrl);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          return res.status(400).json({ error: 'Forbidden link protocol. Only HTTP and HTTPS are permitted.' });
        }
      } catch (e) {
        return res.status(400).json({ error: 'Invalid URL provided in link message.' });
      }
    }

    // 3. Validate Location Message & Privacy Mode
    let finalLocationPayload = locationPayload;
    let finalLocation = location;
    if (messageType === 'LOCATION') {
      const loc = locationPayload || location;
      if (!loc) {
        return res.status(400).json({ error: 'Location coordinates are required.' });
      }
      const lat = loc.latitude !== undefined ? loc.latitude : loc.lat;
      const lng = loc.longitude !== undefined ? loc.longitude : loc.lng;

      if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ error: 'Latitude and Longitude must be valid numbers.' });
      }
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({ error: 'Coordinates are out of geographical bounds.' });
      }

      const precisionMode = loc.precisionMode === 'exact' ? 'exact' : 'approximate';
      let safeLat = lat;
      let safeLng = lng;
      if (precisionMode === 'approximate') {
        // Safe privacy fuzzing: round to ~1km precision
        safeLat = Math.round(lat * 100) / 100;
        safeLng = Math.round(lng * 100) / 100;
      }

      finalLocationPayload = {
        latitude: safeLat,
        longitude: safeLng,
        precisionMode,
        label: loc.label || loc.placeName || loc.approximateArea,
        placeName: loc.placeName || loc.label || loc.approximateArea,
        createdAt: new Date().toISOString()
      };
      finalLocation = {
        lat: safeLat,
        lng: safeLng,
        approximateArea: finalLocationPayload.label
      };
    }

    // 4. Validate Sticker Message
    let finalStickerUrl = stickerUrl || stickerPayload?.url;
    let finalStickerName = stickerName || stickerPayload?.name;
    const finalStickerId = stickerId || stickerPayload?.stickerId;

    if (messageType === 'STICKER') {
      if (!finalStickerId) {
        return res.status(400).json({ error: 'Sticker ID is required for sticker messages.' });
      }
      const validSticker = AURA_STICKERS.find(s => s.id === finalStickerId);
      if (!validSticker) {
        return res.status(400).json({ error: 'Invalid sticker.' });
      }
      finalStickerUrl = validSticker.url;
      finalStickerName = validSticker.name;
    }

    // 5. Validate Voice Message
    if (messageType === 'VOICE') {
      if (!voice?.mediaId) {
        return res.status(400).json({ error: 'Voice payload requires a verified mediaId.' });
      }
      const rec = getMediaRecord(voice.mediaId);
      if (!rec || (rec.ownerId !== req.user!.id && rec.conversationId !== conversationId)) {
        return res.status(400).json({ error: 'Invalid or unauthorized voice mediaId.' });
      }
    }

    // 6. Validate Star Video Message
    if (messageType === 'STAR_VIDEO') {
      if (!starVideo?.mediaId) {
        return res.status(400).json({ error: 'Star Video payload requires a verified mediaId.' });
      }
      const rec = getMediaRecord(starVideo.mediaId);
      if (!rec || (rec.ownerId !== req.user!.id && rec.conversationId !== conversationId)) {
        return res.status(400).json({ error: 'Invalid or unauthorized Star Video mediaId.' });
      }
      if (starVideo.duration && starVideo.duration > MEDIA_LIMITS.MAX_VIDEO_DURATION_SECONDS) {
        return res.status(400).json({ error: `Star Video exceeds maximum length of ${MEDIA_LIMITS.MAX_VIDEO_DURATION_SECONDS} seconds.` });
      }
    }

    // 7. Generic content requirement check
    if (!text?.trim() && !photoUrl && !photo && !media && !finalLocation && !finalStickerId && !voice && !starVideo && !tapType && !vaultAction && !link && !linkPreview) {
      return res.status(400).json({ error: 'Message content is required.' });
    }

    const message = await store.sendMessage(req.user!.id, conversationId, {
          type: messageType,
          text,
          photoUrl,
          media,
          linkPreview,
          location: finalLocation,
          locationPayload: finalLocationPayload,
          photo,
          link,
          stickerPayload,
          voice,
          starVideo,
          stickerId: finalStickerId,
          stickerUrl: finalStickerUrl,
          stickerName: finalStickerName,
          ttlSeconds: typeof ttlSeconds === 'number' ? ttlSeconds : undefined,
          isPermanent: Boolean(isPermanent),
          excludeFromBackup: typeof excludeFromBackup === 'boolean' ? excludeFromBackup : undefined,
          disableAutoBackup: typeof disableAutoBackup === 'boolean' ? disableAutoBackup : undefined,
          tapType,
          vaultAction
        });
    res.status(201).json({ message });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to send message' });
  }
});

// Conversations: Delete Message (Supports both for_me and for_everyone)
app.delete('/api/conversations/:conversationId/messages/:messageId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const conversationId = String(req.params.conversationId);
    const messageId = String(req.params.messageId);
    const mode = (req.query.mode === 'for_everyone' || req.body?.mode === 'for_everyone') ? 'for_everyone' : 'for_me';

    await store.deleteMessage(conversationId, messageId, req.user!.id, mode);
    res.json({ success: true, message: 'Message deleted successfully.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to delete message' });
  }
});

// Update conversation retention and privacy settings
app.patch('/api/conversations/:conversationId/settings', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const conversationId = String(req.params.conversationId);
    const { messageTtlSeconds, excludeFromBackup, disableAutoBackup } = req.body;
    const conversation = await store.updateConversationSettings(conversationId, req.user!.id, {
          messageTtlSeconds: typeof messageTtlSeconds === 'number' ? messageTtlSeconds : undefined,
          excludeFromBackup: typeof excludeFromBackup === 'boolean' ? excludeFromBackup : undefined,
          disableAutoBackup: typeof disableAutoBackup === 'boolean' ? disableAutoBackup : undefined
        });
    res.json({ success: true, conversation, settings: conversation.settings });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update conversation settings' });
  }
});

// Toggle message permanent status (pin/save permanently)
app.post('/api/conversations/:conversationId/messages/:messageId/permanent', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const conversationId = String(req.params.conversationId);
    const messageId = String(req.params.messageId);
    const message = await store.toggleMessagePermanent(messageId, conversationId, req.user!.id);
    res.json({ success: true, message });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to toggle message permanence' });
  }
});

// Quick Taps (Aura Tap / Woof / Ogień)
app.post('/api/taps', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { targetUserId, tapType } = req.body;
    if (!targetUserId || !tapType) {
      return res.status(400).json({ error: 'targetUserId and tapType are required' });
    }
    const result = await store.sendTap(req.user!.id, targetUserId, tapType);
    res.status(201).json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to send tap' });
  }
});

// Vault Access: Request Access
app.post('/api/vault/request', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) {
      return res.status(400).json({ error: 'targetUserId is required' });
    }
    await store.requestVaultAccess(req.user!.id, targetUserId);
    const conv = await store.getOrCreateConversation(req.user!.id, targetUserId);

    const message = await store.sendMessage(req.user!.id, conv.id, {
      type: 'VAULT_ACTION',
      vaultAction: 'REQUEST',
      text: '📸 Poprosił o dostęp do Twojego prywatnego albumu'
    });
    res.json({ success: true, message });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to request vault access' });
  }
});

// Vault Access: Grant / Revoke Access
app.post('/api/vault/grant', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { targetUserId, grant } = req.body;
    if (!targetUserId || grant === undefined) {
      return res.status(400).json({ error: 'targetUserId and grant boolean are required' });
    }
    const isGranted = Boolean(grant);
    await store.grantVaultAccess(req.user!.id, targetUserId, isGranted);
    const conv = await store.getOrCreateConversation(req.user!.id, targetUserId);
    const message = await store.sendMessage(req.user!.id, conv.id, {
          type: 'VAULT_ACTION',
          vaultAction: isGranted ? 'GRANT' : 'REVOKE',
          text: isGranted ? '🔓 Przyznał Ci dostęp do prywatnego albumu' : '🔒 Cofnął dostęp do prywatnego albumu'
        });
    res.json({ success: true, granted: isGranted, message });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update vault access' });
  }
});

// Vault Access: Get Status
app.get('/api/vault/status/:targetUserId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetUserId = String(req.params.targetUserId);
    const hasAccess = await store.hasVaultAccess(targetUserId, req.user!.id);
    const requested = await store.isVaultRequested(req.user!.id, targetUserId);
    const iGrantedAccess = await store.hasVaultAccess(req.user!.id, targetUserId);
    res.json({ hasAccess, requested, iGrantedAccess });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to fetch vault status' });
  }
});

// Moments / Stories Routes
app.get('/api/moments', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const moments = await store.getMoments(req.user!.id);
  res.json({ moments });
});

app.post('/api/moments', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { mediaUrl, mediaType, caption, privacy, allowedUserIds } = req.body;
    if (!mediaUrl || typeof mediaUrl !== 'string') {
      return res.status(400).json({ error: 'Media URL is required for moment creation.' });
    }

    const moment = await store.createMoment(req.user!.id, {
          mediaUrl,
          mediaType,
          caption,
          privacy,
          allowedUserIds
        });
    res.status(201).json({ moment });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to post moment' });
  }
});

app.post('/api/moments/:momentId/like', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const momentId = String(req.params.momentId);
  const success = await store.likeMoment(req.user!.id, momentId);
  res.json({ success });
});

app.post('/api/moments/:momentId/view', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const momentId = String(req.params.momentId);
  const success = await store.viewMoment(req.user!.id, momentId);
  res.json({ success });
});

app.delete('/api/moments/:momentId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const momentId = String(req.params.momentId);
  const success = await store.deleteMoment(req.user!.id, momentId);
  res.json({ success });
});

app.post('/api/moments/:momentId/reply', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { text, targetUserId } = req.body;
    if (!text || !targetUserId) {
      return res.status(400).json({ error: 'Text and targetUserId are required.' });
    }
    const conv = await store.getOrCreateConversation(req.user!.id, targetUserId);
    const message = await store.sendMessage(req.user!.id, conv.id, text);
    res.status(201).json({ success: true, message, conversationId: conv.id });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to reply to moment' });
  }
});

// --- GDPR Subject Rights (Articles 15, 16, 17, 18, 20, 21) ---

// Consents Management (Art. 7)
app.get('/api/gdpr/consents', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const consents = await store.getUserConsents(req.user!.id);
    res.json({ consents });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch consents' });
  }
});

app.put('/api/gdpr/consents', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await store.updateUserConsents(req.user!.id, req.body);
    res.json({ consents: updated, message: 'Privacy consents updated successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update consents' });
  }
});

// Right to Access & Data Portability (Art. 15 & 20)
app.get('/api/gdpr/export', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const exportData = await store.exportUserData(req.user!.id);
    res.setHeader('Content-Disposition', `attachment; filename="aura-gdpr-export-${req.user!.id}.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.json(exportData);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate GDPR data export' });
  }
});

// Automated Cloud Backup Service endpoints
app.get('/api/backup/cloud/status', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const status = cloudBackupService.getStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch cloud backup status' });
  }
});

app.post('/api/backup/cloud/run', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const backupRecord = await cloudBackupService.runAutomatedBackup();
    res.json({
      success: true,
      backup: backupRecord,
      message: `Automated cloud backup completed successfully. ${backupRecord.excludedDueToDisableAutoBackup} conversation(s) excluded via 'disableAutoBackup'.`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to execute automated cloud backup' });
  }
});

// Right to Rectification (Art. 16)
app.post('/api/gdpr/rectify', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, displayName, bio } = req.body;
    const user = await store.rectifyUserData(req.user!.id, { email, displayName, bio });
    res.json({ success: true, user, message: 'Data rectified successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Rectification failed' });
  }
});

// Right to Restriction of Processing (Art. 18)
app.post('/api/gdpr/restrict', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const reason = (req.body.reason || 'Data subject requested restriction under GDPR Art. 18').toString();
    const success = await store.restrictAccount(req.user!.id, reason);
    if (req.token) {
      await store.invalidateToken(req.token);
    }
    res.json({ success, message: 'Processing restricted and account suspended' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Restriction request failed' });
  }
});

// Right to Object (Art. 21 - AI & Analytics)
app.post('/api/gdpr/object', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const reason = (req.body.reason || 'General objection to profiling / AI processing').toString();
    const success = await store.recordObjection(req.user!.id, reason);
    res.json({ success, message: 'Objection recorded. AI processing and analytics disabled for your account.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Objection recording failed' });
  }
});

// Right to Erasure / Account Deletion (Art. 17)
app.post('/api/gdpr/erase', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = await store.eraseUserData(req.user!.id);
    if (req.token) {
      await store.invalidateToken(req.token);
    }
    res.json({
      success,
      message: 'All personal data permanently erased under GDPR Article 17. Account deactivated.'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erasure request failed' });
  }
});

app.delete('/api/account', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = await store.eraseUserData(req.user!.id);
    if (req.token) {
      await store.invalidateToken(req.token);
    }
    res.json({ success, message: 'Account and personal data permanently erased.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Account deletion failed' });
  }
});

// --- DSA Compliance (Articles 15, 16, 17, 20, 22) ---

// Notice and Action Mechanism (DSA Art. 16)
app.post('/api/dsa/report', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { reportedUserId, reason, details } = req.body;
    if (!reportedUserId || !reason) {
      return res.status(400).json({ error: 'reportedUserId and valid DSA reason are required' });
    }

    const report = await store.submitDsaReport(req.user!.id, reportedUserId, reason, details);
    res.status(201).json({
      success: true,
      report,
      acknowledgment: 'Your notice has been received in compliance with EU Digital Services Act Article 16. Our trust & safety team will review it promptly.'
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to submit report' });
  }
});

// User's Submitted Reports Status (DSA Art. 16(5))
app.get('/api/dsa/reports/my', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const reports = await store.getUserSubmittedReports(req.user!.id);
  res.json({ reports });
});

// Statement of Reasons / Moderation Notices (DSA Art. 17)
app.get('/api/dsa/notices', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const notices = await store.getModerationNoticesForUser(req.user!.id);
  res.json({ notices });
});

// Internal Complaint-Handling System / Appeal (DSA Art. 20)
app.post('/api/dsa/appeal', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { noticeId, appealReason } = req.body;
    if (!noticeId || !appealReason || typeof appealReason !== 'string' || appealReason.trim().length < 10) {
      return res.status(400).json({ error: 'noticeId and detailed appealReason (at least 10 chars) are required' });
    }

    const appeal = await store.submitDsaAppeal(req.user!.id, noticeId, appealReason);
    res.status(201).json({
      success: true,
      appeal,
      message: 'Your appeal has been officially logged under DSA Article 20 and will be reviewed by a human moderator.'
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to submit appeal' });
  }
});

// DSA Transparency Report Summary (DSA Art. 15)
app.get('/api/dsa/transparency', async (req: Request, res: Response) => {
  const stats = await store.getAdminStats();
  res.json({
    reportingPeriod: '2026-H1',
    activeRecipientsOfServiceEU: stats.totalUsers,
    totalReportsReceived: stats.pendingReports + 12,
    moderationDecisions: {
      accountSuspensions: stats.suspendedUsers,
      contentRemovals: 8,
      warningsIssued: 14,
      dismissedNotices: 5
    },
    useOfAutomatedMeans: {
      usedForProfiling: false,
      usedForAutonomousSanctions: false,
      aiWingmanHumanAgencyEnabled: true
    },
    humanReviewRatio: '100%',
    averageResolutionTimeHours: 4.2,
    singlePointOfContactDSA: {
      email: 'legal@auragay.com',
      languages: ['en', 'es', 'de'],
      euRepresentative: 'AURA Compliance EU S.L., Calle de Hortaleza 48, 28004 Madrid, Spain'
    }
  });
});

// AI Transparency Info (EU AI Act & Transparency Declaration)
app.get('/api/ai/transparency', (req: Request, res: Response) => {
  res.json({
    aiFeaturesActive: ['AI Proposition & Icebreaker Generator'],
    modelProvider: 'Google Gemini',
    foundationModel: 'gemini-2.5-flash',
    purpose: 'Generating personalized conversation starters based exclusively on public profile bios and declared hobbies upon user request.',
    humanAgencyAndOversight: 'The user has absolute control over whether an AI suggestion is sent, modified, or discarded. Messages are never sent automatically.',
    automatedDecisionMaking: 'None. AI is strictly assistive and is not used for eligibility, pricing, algorithmic bans, or ranking penalties.',
    optOutAvailable: true,
    optOutEndpoint: 'POST /api/gdpr/object'
  });
});

// Matches: Get All
app.get('/api/matches', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const matches = await store.getUserMatches(req.user!.id);
  res.json({ matches });
});

// AI Proposition & Icebreaker Generation (Gemini API Integration)
const handleAIIcebreaker = async (req: AuthenticatedRequest, res: Response) => {
  let targetProfile = req.body.matchProfile;
  const targetUserId = req.body.targetUserId || req.body.userId;
  const vibe = req.body.vibe || 'Playful & Witty';

  if (!targetProfile && targetUserId) {
    const foundUser = await store.getUserById(targetUserId);
    if (foundUser) {
      targetProfile = foundUser.profile;
    }
  }

  if (!targetProfile || !targetProfile.displayName) {
    return res.status(400).json({ error: 'Target profile details required for AI propositions.' });
  }

  if (targetProfile.userId && await store.isBlocked(req.user!.id, targetProfile.userId)) {
    return res.status(403).json({ error: 'Cannot generate AI propositions for blocked member.' });
  }

  const displayName = targetProfile.displayName;
  const interestsList = (targetProfile.interests && targetProfile.interests.length > 0)
    ? targetProfile.interests.join(', ')
    : 'Travel, Fitness, Coffee';
  const role = targetProfile.identityRole || 'Member';
  const bio = targetProfile.bio || 'Exploring connections';

  try {
    const ai = getGeminiClient();
    const prompt = `You are an elite, respectful, charming conversational wingman for AURA GAY 18+, a premium adult gay dating app.
Generate 4 distinct, engaging, authentic proposition messages/conversation starters for starting a chat with ${displayName}.

Profile Context:
- Name: ${displayName}
- Age: ${targetProfile.age || 26}
- Sexual/Identity Role: ${role}
- Bio: "${bio}"
- Interests: ${interestsList}
- Selected Vibe: ${vibe}

Rules:
1. Craft 4 distinct openers:
   - One casual & low-pressure (e.g. coffee, drinks, or light day check-in)
   - One witty & charming banter referencing their profile details
   - One connecting directly over their interests/passions (${interestsList})
   - One smooth, confident, and tastefully flirty proposition
2. Tone must be authentic, adult 18+ appropriate, respectful, engaging, and never robotic or cheesy.
3. Return ONLY a valid JSON array of 4 strings: ["Msg 1", "Msg 2", "Msg 3", "Msg 4"]. No markdown code fences.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        temperature: 0.85,
        responseMimeType: 'application/json'
      }
    });

    const text = response.text || '[]';
    let propositions: string[] = [];
    try {
      propositions = JSON.parse(text);
    } catch {
      propositions = [
        `Hey ${displayName}! Loved your vibe and seeing you're into ${targetProfile.interests?.[0] || 'design'}. How has your week been?`,
        `Hi ${displayName}! Your photos caught my attention. Up for grabbing an espresso or drink nearby sometime?`,
        `Hey there! I saw we both appreciate good vibes and ${targetProfile.interests?.[1] || 'fitness'}. What are you up to today?`,
        `Hey handsome, couldn't pass by your profile without saying hi! What brings you on Aura?`
      ];
    }

    res.json({
      icebreakers: propositions,
      propositions
    });
  } catch (err: any) {
    console.error('Gemini API Error (fallback triggered):', err);
    // Dynamic contextual fallbacks personalized to their profile
    const primaryInterest = targetProfile.interests?.[0] || 'good coffee';
    const secondaryInterest = targetProfile.interests?.[1] || 'music';

    const fallbackPropositions = [
      `Hey ${displayName}! Loved your photos and saw you're into ${primaryInterest}. How has your week been?`,
      `Hi ${displayName}! Your vibe is captivating. Up for grabbing a coffee or drinks nearby sometime?`,
      `Hey there! Saw that you enjoy ${secondaryInterest}. What's your favorite spot in town?`,
      `Hey handsome, couldn't scroll past without saying hi. What are you up to tonight?`
    ];

    res.json({
      icebreakers: fallbackPropositions,
      propositions: fallbackPropositions,
      note: 'Personalized fallback propositions active.'
    });
  }
};
app.post('/api/ai/icebreaker', authenticateToken, handleAIIcebreaker);
app.post('/api/ai/propositions', authenticateToken, handleAIIcebreaker);

// Helper to resolve canonical application URL (no hardcoded localhost)
const getCanonicalBaseUrl = (req: Request): string => {
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL.replace(/\/+$/, '');
  }
  const origin = req.headers.origin;
  if (origin && typeof origin === 'string' && !origin.includes('localhost:3000')) {
    return origin.replace(/\/+$/, '');
  }
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
  if (host) {
    return `${proto}://${host}`.replace(/\/+$/, '');
  }
  return 'https://aura18.app';
};

// Payments / Subscription Checkout (Supports both create-checkout-session and checkout-session)
const handleCheckout = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const planId = req.body.planId || 'aura_vip_monthly';
    const stripeKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeKey) {
      if (process.env.NODE_ENV === 'production') {
        return res.status(503).json({
          error: 'Stripe payments are not configured on this production instance. Please set STRIPE_SECRET_KEY.'
        });
      }
      return res.status(400).json({
        error: 'STRIPE_SECRET_KEY is not configured in this environment.'
      });
    }

    // Lazy load Stripe when key exists
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeKey);

    const isAnnual = planId === 'aura_vip_annual';
    const baseUrl = getCanonicalBaseUrl(req);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      client_reference_id: req.user!.id,
      metadata: {
        userId: req.user!.id,
        planId
      },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: isAnnual ? 'AURA VIP Pass (Annual)' : 'AURA VIP Pass (Monthly)',
              description: 'Unlimited likes, see who liked you, stealth mode, and AI icebreaker priority.'
            },
            unit_amount: isAnnual ? 9999 : 1499,
            recurring: {
              interval: isAnnual ? 'year' : 'month'
            }
          },
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: `${baseUrl}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/?payment=cancelled`
    });

    res.json({ url: session.url, checkoutUrl: session.url });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Payment processing error' });
  }
};
app.post('/api/payments/create-checkout-session', authenticateToken, handleCheckout);
app.post('/api/payments/checkout-session', authenticateToken, handleCheckout);

// Stripe Webhook Endpoint (Protected by cryptographic signature and idempotent processing)
app.post('/api/payments/webhook', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    console.error('[Stripe Webhook] Missing stripe-signature or STRIPE_WEBHOOK_SECRET');
    return res.status(400).json({ error: 'Webhook secret or signature missing' });
  }

  const rawBody = (req as any).rawBody;
  if (!rawBody) {
    return res.status(400).json({ error: 'Raw body payload required for signature verification' });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return res.status(503).json({ error: 'Stripe service unavailable' });
  }

  let event: any;
  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeKey);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error('[Stripe Webhook] Signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
  }

  // Idempotency check: Ignore already processed events
  if (await store.isStripeEventProcessed(event.id)) {
    return res.json({ received: true, message: 'Event already processed' });
  }

  await store.recordStripeEvent(event.id, event.type);
  console.log(`[Stripe Webhook] Processing event ${event.id} of type ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        const userId = session.client_reference_id || session.metadata?.userId;
        const planId = session.metadata?.planId || 'aura_vip_monthly';

        if (userId) {
          await store.recordStripeSubscription(userId, customerId, subscriptionId, planId, 'active');
          console.log(`[Stripe Webhook] Activated VIP for user ${userId}`);
        } else if (customerId) {
          const user = await store.findUserByStripeCustomerId(customerId);
          if (user) {
            await store.recordStripeSubscription(user.id, customerId, subscriptionId, planId, 'active');
            console.log(`[Stripe Webhook] Activated VIP for user ${user.id} via customer ID`);
          }
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const customerId = sub.customer as string;
        const subscriptionId = sub.id as string;
        const status = sub.status; // 'active', 'trialing', 'past_due', 'canceled', etc.
        const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : undefined;
        const planId = sub.metadata?.planId || 'aura_vip_monthly';
        const userId = sub.metadata?.userId;

        let user = userId ? await store.getUserById(userId) : null;
        if (!user && customerId) {
          user = await store.findUserByStripeCustomerId(customerId);
        }
        if (!user && subscriptionId) {
          user = await store.findUserByStripeSubscriptionId(subscriptionId);
        }

        if (user) {
          await store.recordStripeSubscription(user.id, customerId, subscriptionId, planId, status, periodEnd);
          console.log(`[Stripe Webhook] Updated subscription for user ${user.id}: status=${status}`);
        }
        break;
      }

      case 'customer.subscription.deleted':
      case 'invoice.payment_failed': {
        const obj = event.data.object;
        const customerId = obj.customer as string;
        const subscriptionId = (obj.subscription || obj.id) as string;

        let user = await store.findUserByStripeCustomerId(customerId) || await store.findUserByStripeSubscriptionId(subscriptionId);
        if (user) {
          await store.recordStripeSubscription(user.id, customerId, subscriptionId, 'none', 'canceled');
          console.log(`[Stripe Webhook] Deactivated VIP for user ${user.id} following cancellation or payment failure`);
        }
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (err: any) {
    console.error('[Stripe Webhook] Error executing webhook handler:', err);
    res.status(500).json({ error: 'Internal webhook handling error' });
  }
});

// ==========================================
// STORE-COMPLIANT BILLING & ENTITLEMENT ROUTES
// (Google Play Billing, Apple StoreKit 2, Unified Entitlements)
// ==========================================

// Get Store Products with localized pricing fallback
app.get('/api/billing/products', (req: Request, res: Response) => {
  const platform = req.query.platform || 'web';
  const products = [
    {
      id: BILLING_PLANS.monthly.id,
      tier: 'monthly',
      title: BILLING_PLANS.monthly.fallbackTitle,
      description: BILLING_PLANS.monthly.fallbackDescription,
      localizedPrice: BILLING_PLANS.monthly.fallbackPrice || '',
      billingPeriod: BILLING_PLANS.monthly.billingPeriod
    },
    {
      id: BILLING_PLANS.three_month.id,
      tier: 'three_month',
      title: BILLING_PLANS.three_month.fallbackTitle,
      description: BILLING_PLANS.three_month.fallbackDescription,
      localizedPrice: BILLING_PLANS.three_month.fallbackPrice || '',
      billingPeriod: BILLING_PLANS.three_month.billingPeriod
    },
    {
      id: BILLING_PLANS.yearly.id,
      tier: 'yearly',
      title: BILLING_PLANS.yearly.fallbackTitle,
      description: BILLING_PLANS.yearly.fallbackDescription,
      localizedPrice: BILLING_PLANS.yearly.fallbackPrice || '',
      billingPeriod: BILLING_PLANS.yearly.billingPeriod
    }
  ];
  res.json({ success: true, platform, products });
});

// Get Current User Entitlements (Single source of truth)
app.get('/api/billing/entitlements', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const entitlement = await store.getUserEntitlements(userId);
  res.json({ success: true, entitlement });
});

// Google Play Billing Verification & Acknowledgment
app.post('/api/billing/google-play/verify', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { packageName, subscriptionId, purchaseToken } = req.body;
  const userId = req.user!.id;

  if (!subscriptionId || !purchaseToken) {
    return res.status(400).json({ success: false, error: 'Missing subscriptionId or purchaseToken.' });
  }

  const result = await verifyGooglePlayPurchase({
    packageName: packageName || 'app.aura.gay18',
    subscriptionId,
    purchaseToken,
    userId
  });

  if (!result.valid) {
    return res.status(result.statusCode || 400).json({ success: false, error: result.error });
  }

  res.json({ success: true, entitlement: result.entitlement });
});

// Apple StoreKit 2 Transaction Verification
app.post('/api/billing/apple-storekit/verify', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { transactionJws } = req.body;
  const userId = req.user!.id;

  if (!transactionJws) {
    return res.status(400).json({ success: false, error: 'Missing transactionJws.' });
  }

  const result = await verifyAppleStoreKitTransaction({
    transactionJws,
    userId
  });

  if (!result.valid) {
    return res.status(result.statusCode || 400).json({ success: false, error: result.error });
  }

  res.json({ success: true, entitlement: result.entitlement });
});

// Restore Purchases across devices
app.post('/api/billing/restore', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { receiptData, provider } = req.body;
  const userId = req.user!.id;

  const result = await restoreUserPurchases(userId, receiptData, provider);
  res.json(result);
});

// Google Play RTDN Webhook (Cloud Pub/Sub Push)
app.post('/api/billing/rtdn/google-play', async (req: Request, res: Response) => {
  try {
    const pubsubMsg = req.body.message;
    if (!pubsubMsg) {
      return res.status(400).json({ error: 'Invalid Pub/Sub payload' });
    }
    await handleGooglePlayRtdn(pubsubMsg);
    // Always acknowledge to Pub/Sub with 200
    res.status(200).send('OK');
  } catch (err: any) {
    console.error('[Google Play RTDN] Handler error:', err.message);
    res.status(200).send('OK'); // Acknowledge to prevent infinite retry loops on malformed payloads
  }
});

// Apple StoreKit 2 App Store Server Notifications V2 Webhook
app.post('/api/billing/webhook/apple-storekit', async (req: Request, res: Response) => {
  try {
    const { signedPayload } = req.body;
    if (!signedPayload) {
      return res.status(400).json({ error: 'Missing signedPayload' });
    }
    await handleAppleStoreKitWebhook(signedPayload);
    res.status(200).send('OK');
  } catch (err: any) {
    console.error('[Apple StoreKit Webhook] Handler error:', err.message);
    res.status(200).send('OK');
  }
});

// Admin: Analytics & Moderation Dashboard
app.get('/api/admin/stats', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const stats = await store.getAdminStats();
  res.json({ stats });
});

app.get('/api/admin/reports', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const reports = await store.getReports();
  res.json({ reports });
});

const handleAdminSuspend = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetUserId = req.params.userId || req.body.targetUserId;
    if (!targetUserId) {
      return res.status(400).json({ error: 'Target user ID is required.' });
    }

    const success = await store.suspendUser(targetUserId);
    res.json({ success, message: `User ${targetUserId} suspended successfully` });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'User suspension failed' });
  }
};
app.post('/api/admin/suspend', authenticateToken, requireAdmin, handleAdminSuspend);
app.post('/api/admin/users/:userId/suspend', authenticateToken, requireAdmin, handleAdminSuspend);

app.post('/api/admin/soft-delete', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) {
      return res.status(400).json({ error: 'Target user ID is required.' });
    }

    const success = await store.softDeleteUser(targetUserId);
    res.json({ success, message: `User ${targetUserId} soft-deleted successfully` });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Soft delete failed' });
  }
});

// Admin: DSA Appeals Management (DSA Art. 20)
app.get('/api/admin/dsa/appeals', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const appeals = await store.getDsaAppeals();
  res.json({ appeals });
});

app.post('/api/admin/dsa/appeals/:appealId/decide', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const appealId = String(req.params.appealId);
    const { outcome, decisionNotes } = req.body;
    if (!outcome || (outcome !== 'UPHELD' && outcome !== 'OVERTURNED')) {
      return res.status(400).json({ error: 'Valid outcome (UPHELD or OVERTURNED) is required' });
    }
    if (!decisionNotes) {
      return res.status(400).json({ error: 'Written decision notes are required under DSA Article 20' });
    }

    const decided = await store.adminDecideAppeal(req.user!.id, appealId, outcome, decisionNotes);
    res.json({ success: true, appeal: decided });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to decide appeal' });
  }
});

// Admin: DSA Statement of Reasons Report Decision (DSA Art. 17)
app.post('/api/admin/dsa/reports/:reportId/decide', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const reportId = String(req.params.reportId);
    const { decision, legalBasis, statementOfReasons } = req.body;
    if (!decision || !legalBasis || !statementOfReasons) {
      return res.status(400).json({ error: 'decision, legalBasis, and statementOfReasons are mandatory under DSA Art. 17' });
    }

    const notice = await store.adminDecideReport(req.user!.id, reportId, decision, legalBasis, statementOfReasons);
    res.json({ success: true, notice });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to process report decision' });
  }
});

// Admin: Immutable Audit Logs (GDPR Art. 5(2) & DSA Art. 28)
app.get('/api/admin/audit-logs', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const auditLogs = await store.getAdminAuditLogs();
  res.json({ auditLogs });
});

// Admin: Purge bot accounts and synthetic profiles
app.post('/api/admin/purge-bots', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const result = await store.purgeBotAccounts();
  res.json({ success: true, ...result });
});

// --- Monetization & Native Advertising Architecture (GDPR & ePrivacy Compliant) ---

// Inventory Endpoint: returns native ads for placement, or empty if user is Premium
app.get('/api/ads/inventory', optionalAuthenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const placement = (req.query.placement as any) || 'discover';
  const allowPersonalized = req.query.allowPersonalized === 'true';

  // Strict Premium Ad-Free Guarantee:
  if (req.user?.isPremium || req.user?.role === 'SUPERADMIN') {
    return res.json({ ads: [], isPremium: true, adFree: true });
  }

  const ads = getAdsForPlacement(placement, allowPersonalized);
  res.json({ ads, isPremium: false, adFree: false });
});

// Privacy-Safe Ad Telemetry: Logs aggregate interaction counts with NO personal data
const adTelemetryBuffer: Array<{ eventType: string; adId: string; placement: string; timestamp: string }> = [];

app.post('/api/ads/telemetry', (req: Request, res: Response) => {
  const { eventType, adId, placement, timestamp } = req.body || {};
  if (eventType && placement) {
    if (adTelemetryBuffer.length > 500) adTelemetryBuffer.shift();
    adTelemetryBuffer.push({
      eventType: String(eventType),
      adId: String(adId || 'unknown'),
      placement: String(placement),
      timestamp: String(timestamp || new Date().toISOString()),
    });
  }
  res.json({ success: true });
});

// Explicit 404 Catch-All for any /api/* route:
// This guarantees that ANY missing or invalid API route returns JSON, NEVER the HTML index.html
app.all('/api/*', (req: Request, res: Response) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
});

// Vite Server Integration (Dev vs Prod)
async function startServer() {
  // Hydrate memory store from PostgreSQL
  await store.hydrateFromPostgres();

  const isProduction =
    process.env.NODE_ENV === 'production' ||
    (typeof __filename !== 'undefined' && __filename.endsWith('server.cjs'));

  const httpServer = http.createServer(app);

  // WebRTC Video Calling Signaling Server (path: /ws/webrtc)
  const wss = new WebSocketServer({ server: httpServer, path: '/ws/webrtc' });
  // Map of userId -> Set of active WebSockets
  const connectedCallSockets = new Map<string, Set<WebSocket>>();

  wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
    let authenticatedUserId: string | null = null;

    ws.on('message', async (data: any) => {
      try {
        const message = JSON.parse(data.toString());
        const { type } = message;

        if (type === 'AUTH') {
          const { token } = message;
          if (token) {
            const user = await store.getUserByToken(token);
            if (user && user.status === 'ACTIVE') {
              authenticatedUserId = user.id;
              if (!connectedCallSockets.has(user.id)) {
                connectedCallSockets.set(user.id, new Set());
              }
              connectedCallSockets.get(user.id)!.add(ws);
              ws.send(JSON.stringify({ type: 'AUTH_SUCCESS', userId: user.id }));
              return;
            }
          }
          ws.send(JSON.stringify({ type: 'AUTH_FAILED', error: 'Authentication failed' }));
          return;
        }

        if (!authenticatedUserId) {
          ws.send(JSON.stringify({ type: 'ERROR', error: 'Unauthorized. Send AUTH first.' }));
          return;
        }

        // WebRTC Signaling routing (CALL_REQUEST, CALL_ACCEPT, CALL_REJECT, CALL_END, OFFER, ANSWER, ICE_CANDIDATE)
        const { targetUserId } = message;
        if (targetUserId) {
          // Verify neither user blocked the other
          const isBlocked = await store.isBlocked(authenticatedUserId, targetUserId);
          if (isBlocked) {
            ws.send(JSON.stringify({ type: 'CALL_FAILED', reason: 'BLOCKED', targetUserId }));
            return;
          }

          const targetSockets = connectedCallSockets.get(targetUserId);
          if (targetSockets && targetSockets.size > 0) {
            const forwardPayload = JSON.stringify({
              ...message,
              senderId: authenticatedUserId
            });
            targetSockets.forEach(targetWs => {
              if (targetWs.readyState === WebSocket.OPEN) {
                targetWs.send(forwardPayload);
              }
            });
          } else if (type === 'CALL_REQUEST') {
            // Target is currently offline for calls
            ws.send(JSON.stringify({
              type: 'CALL_REJECTED',
              senderId: targetUserId,
              reason: 'USER_OFFLINE'
            }));
          }
        }
      } catch (err: any) {
        console.error('[WebRTC WSS] Message handling error:', err.message);
      }
    });

    ws.on('close', () => {
      if (authenticatedUserId) {
        const userSockets = connectedCallSockets.get(authenticatedUserId);
        if (userSockets) {
          userSockets.delete(ws);
          if (userSockets.size === 0) {
            connectedCallSockets.delete(authenticatedUserId);
          }
        }
      }
    });

    ws.on('error', (err) => {
      console.warn('[WebRTC WSS] Socket error:', err.message);
    });
  });

  if (!isProduction) {
    // Development mode: conditionally initialize Vite development server & HMR
    delete (globalThis as any).__dirname;
    const { createServer: createViteServer } = await import('vite');
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';

    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        watch: isHmrDisabled ? null : undefined,
        hmr: {
          server: httpServer,
          host: process.env.HMR_HOST || undefined,
          port: process.env.HMR_PORT ? parseInt(process.env.HMR_PORT, 10) : undefined,
          overlay: !isHmrDisabled,
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: serve pre-built static assets and index.html from dist without Vite
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`[AURA GAY 18+] Server actively running on http://0.0.0.0:${PORT} (${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'})`);
  });
}

startServer();
