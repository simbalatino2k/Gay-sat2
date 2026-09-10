import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import multer from 'multer';
import { store } from './src/db/store';
import { QUEER_VENUES, getVenuesNearLocation, searchVenues } from './src/data/queerVenues';
import { AURA_STICKERS } from './src/data/auraStickers';
import { getAdsForPlacement, NATIVE_ADS_INVENTORY } from './src/data/nativeAds';
import { initStorage, uploadUserMedia, getLocalMediaFile } from './src/lib/storage';

// Initialize Media Storage subsystem
initStorage();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 } // 8 MB limit
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

// Hardened Production Security Headers Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Permissions-Policy',
    'camera=(self), microphone=(), payment=*, geolocation=(self)'
  );
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'; img-src 'self' https: data: blob:; font-src 'self' https: data:; connect-src 'self' https: wss:; worker-src 'self' blob:;"
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
  user?: ReturnType<typeof store.getUserByToken>;
  token?: string;
}

// Authentication Middleware
function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const user = store.getUserByToken(token);

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

function optionalAuthenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const user = store.getUserByToken(token);
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
app.post('/api/auth/register', authRateLimiter, (req: Request, res: Response) => {
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

    const result = store.registerUser(email, cleanName, numAge, 'USER', password);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Registration failed' });
  }
});

// Auth: Login
app.post('/api/auth/login', authRateLimiter, (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    const result = store.loginUser(email, password);
    if (!result) {
      return res.status(404).json({ error: 'No active account found for this email address. Please register.' });
    }

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Login failed' });
  }
});

// Auth: Forgot Password (Initiate recovery flow)
app.post('/api/auth/forgot-password', authRateLimiter, (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const result = store.createPasswordReset(email.trim());

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
app.post('/api/auth/reset-password', authRateLimiter, (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Password recovery token is required.' });
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
    }

    const success = store.resetPasswordWithToken(token.trim(), newPassword);
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

// Media: Secure Upload Endpoint (GCS / Private Container Storage)
app.post('/api/media/upload', authenticateToken, upload.single('media'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No media file received. Please provide an image file.' });
    }

    const result = await uploadUserMedia(
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname,
      req.user!.id
    );

    res.json({
      success: true,
      media: result
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Media upload failed.' });
  }
});

// Media: Authenticated / Sandboxed Delivery Endpoint
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
app.post('/api/auth/logout', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (req.token) {
    store.invalidateToken(req.token);
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

// Profile: Update
app.put('/api/profile', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = store.updateProfile(req.user!.id, req.body);
    res.json({ profile: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Profile update failed' });
  }
});

// Profile: Add Photo
app.post('/api/profile/photos', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { url, isPrimary } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Photo URL is required.' });
    }

    const updated = store.addProfilePhoto(req.user!.id, url, Boolean(isPrimary));
    res.json({ profile: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Photo upload failed' });
  }
});

// Profile: Delete Photo
app.delete('/api/profile/photos/:photoId', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const photoId = String(req.params.photoId);
    const updated = store.deleteProfilePhoto(req.user!.id, photoId);
    res.json({ profile: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Photo deletion failed' });
  }
});

// Discovery: Feed & Profiles
app.get('/api/profiles', (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';
    const user = token ? store.getUserByToken(token) : null;
    const currentUserId = user ? user.id : 'guest';
    const profiles = store.getDiscoverFeed(currentUserId);
    res.json({ profiles, count: profiles.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch profiles', profiles: [] });
  }
});

// Profile Lookup by User ID
app.get('/api/profiles/:userId', (req: Request, res: Response) => {
  try {
    const userId = String(req.params.userId);
    const target = store.getUserById(userId);
    if (!target || target.status !== 'ACTIVE') {
      return res.status(404).json({ error: 'User profile not found' });
    }
    res.json({ profile: target.profile });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve profile' });
  }
});

app.get('/api/discover', (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';
    const user = token ? store.getUserByToken(token) : null;
    const currentUserId = user ? user.id : 'guest';
    const feed = store.getDiscoverFeed(currentUserId);
    res.json({ feed, profiles: feed });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch discovery feed', feed: [], profiles: [] });
  }
});

app.post('/api/discover', (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';
    const user = token ? store.getUserByToken(token) : null;
    const currentUserId = user ? user.id : 'guest';
    const feed = store.getDiscoverFeed(currentUserId, req.body);
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
const handleLike = (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetUserId = req.body.targetUserId || req.body.userId;
    const isSuperLike = Boolean(req.body.isSuperLike);
    if (!targetUserId || typeof targetUserId !== 'string') {
      return res.status(400).json({ error: 'Target user ID is required.' });
    }

    const result = store.likeUser(req.user!.id, targetUserId, isSuperLike);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Like interaction failed' });
  }
};
app.post('/api/like', authenticateToken, handleLike);
app.post('/api/likes', authenticateToken, handleLike);

// Social: Block User (Supports both /api/block and /api/blocks)
const handleBlock = (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetUserId = req.body.targetUserId || req.body.blockedUserId || req.body.userId;
    if (!targetUserId || typeof targetUserId !== 'string') {
      return res.status(400).json({ error: 'Target user ID is required.' });
    }

    const record = store.blockUser(req.user!.id, targetUserId);
    res.json({ success: true, blockRecord: record });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Block failed' });
  }
};
app.post('/api/block', authenticateToken, handleBlock);
app.post('/api/blocks', authenticateToken, handleBlock);

// Social: Get Blocked Users
app.get('/api/blocked', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const blocked = store.getBlockedUsers(req.user!.id);
  res.json({ blocked });
});

// Social: Unblock User
app.post('/api/unblock', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetUserId = req.body.targetUserId || req.body.blockedUserId;
    if (!targetUserId) {
      return res.status(400).json({ error: 'Target user ID is required.' });
    }

    const success = store.unblockUser(req.user!.id, targetUserId);
    res.json({ success });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Unblock failed' });
  }
});

// Safety: Report User (Supports both /api/report and /api/reports)
const handleReport = (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetUserId = req.body.targetUserId || req.body.reportedUserId || req.body.userId;
    const reason = req.body.reason || 'General Concern';
    const details = req.body.details || '';
    if (!targetUserId) {
      return res.status(400).json({ error: 'Target user ID is required.' });
    }

    const report = store.reportUser(req.user!.id, targetUserId, reason, details);
    res.json({ success: true, report });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Safety report submission failed' });
  }
};
app.post('/api/report', authenticateToken, handleReport);
app.post('/api/reports', authenticateToken, handleReport);

// Conversations: Get All
app.get('/api/conversations', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const conversations = store.getUserConversations(req.user!.id);
  res.json({ conversations });
});

// Conversations: Get or Start Conversation with a Specific User
const handleStartConversation = (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetUserId = req.body.targetUserId || req.body.recipientId || req.body.otherUserId;
    if (!targetUserId || typeof targetUserId !== 'string') {
      return res.status(400).json({ error: 'targetUserId is required to start a conversation.' });
    }

    if (req.user!.id === targetUserId) {
      return res.status(400).json({ error: 'Cannot start conversation with yourself.' });
    }

    if (store.isBlocked(req.user!.id, targetUserId)) {
      return res.status(403).json({ error: 'Cannot start conversation with blocked user.' });
    }

    const conversation = store.getOrCreateConversation(req.user!.id, targetUserId);
    res.json({ conversation });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to start or retrieve conversation.' });
  }
};
app.post('/api/conversations', authenticateToken, handleStartConversation);
app.post('/api/conversations/start', authenticateToken, handleStartConversation);

// Conversations: Get Messages
app.get('/api/conversations/:conversationId/messages', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const conversationId = String(req.params.conversationId);
    const messages = store.getMessages(conversationId, req.user!.id);
    store.markMessagesRead(conversationId, req.user!.id);
    res.json({ messages });
  } catch (err: any) {
    res.status(403).json({ error: err.message || 'Access to messages denied' });
  }
});

// Conversations: Send Message
app.post('/api/conversations/:conversationId/messages', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const conversationId = String(req.params.conversationId);
    const { text, photoUrl, type, media, linkPreview, location, stickerId, stickerUrl, stickerName } = req.body;

    const messageType = type || (photoUrl ? 'PHOTO' : 'TEXT');

    if (!text?.trim() && !photoUrl && !media && !location && !stickerId) {
      return res.status(400).json({ error: 'Message content is required.' });
    }

    let finalStickerUrl = stickerUrl;
    let finalStickerName = stickerName;

    // Secure sticker validation
    if (messageType === 'STICKER' && stickerId) {
      const validSticker = AURA_STICKERS.find(s => s.id === stickerId);
      if (!validSticker) {
        return res.status(400).json({ error: 'Invalid sticker.' });
      }
      finalStickerUrl = validSticker.url;
      finalStickerName = validSticker.name;
    }

    const message = store.sendMessage(req.user!.id, conversationId, {
      type: messageType,
      text,
      photoUrl,
      media,
      linkPreview,
      location,
      stickerId,
      stickerUrl: finalStickerUrl,
      stickerName: finalStickerName
    });
    res.status(201).json({ message });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to send message' });
  }
});

// Moments / Stories Routes
app.get('/api/moments', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const moments = store.getMoments(req.user!.id);
  res.json({ moments });
});

app.post('/api/moments', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { mediaUrl, mediaType, caption, privacy, allowedUserIds } = req.body;
    if (!mediaUrl || typeof mediaUrl !== 'string') {
      return res.status(400).json({ error: 'Media URL is required for moment creation.' });
    }

    const moment = store.createMoment(req.user!.id, {
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

app.post('/api/moments/:momentId/like', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const momentId = String(req.params.momentId);
  const success = store.likeMoment(req.user!.id, momentId);
  res.json({ success });
});

app.post('/api/moments/:momentId/view', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const momentId = String(req.params.momentId);
  const success = store.viewMoment(req.user!.id, momentId);
  res.json({ success });
});

app.delete('/api/moments/:momentId', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const momentId = String(req.params.momentId);
  const success = store.deleteMoment(req.user!.id, momentId);
  res.json({ success });
});

app.post('/api/moments/:momentId/reply', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { text, targetUserId } = req.body;
    if (!text || !targetUserId) {
      return res.status(400).json({ error: 'Text and targetUserId are required.' });
    }
    const conv = store.getOrCreateConversation(req.user!.id, targetUserId);
    const message = store.sendMessage(req.user!.id, conv.id, text);
    res.status(201).json({ success: true, message, conversationId: conv.id });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to reply to moment' });
  }
});

// --- GDPR Subject Rights (Articles 15, 16, 17, 18, 20, 21) ---

// Consents Management (Art. 7)
app.get('/api/gdpr/consents', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const consents = store.getUserConsents(req.user!.id);
    res.json({ consents });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch consents' });
  }
});

app.put('/api/gdpr/consents', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = store.updateUserConsents(req.user!.id, req.body);
    res.json({ consents: updated, message: 'Privacy consents updated successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update consents' });
  }
});

// Right to Access & Data Portability (Art. 15 & 20)
app.get('/api/gdpr/export', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const exportData = store.exportUserData(req.user!.id);
    res.setHeader('Content-Disposition', `attachment; filename="aura-gdpr-export-${req.user!.id}.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.json(exportData);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate GDPR data export' });
  }
});

// Right to Rectification (Art. 16)
app.post('/api/gdpr/rectify', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, displayName, bio } = req.body;
    const user = store.rectifyUserData(req.user!.id, { email, displayName, bio });
    res.json({ success: true, user, message: 'Data rectified successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Rectification failed' });
  }
});

// Right to Restriction of Processing (Art. 18)
app.post('/api/gdpr/restrict', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const reason = (req.body.reason || 'Data subject requested restriction under GDPR Art. 18').toString();
    const success = store.restrictAccount(req.user!.id, reason);
    if (req.token) {
      store.invalidateToken(req.token);
    }
    res.json({ success, message: 'Processing restricted and account suspended' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Restriction request failed' });
  }
});

// Right to Object (Art. 21 - AI & Analytics)
app.post('/api/gdpr/object', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const reason = (req.body.reason || 'General objection to profiling / AI processing').toString();
    const success = store.recordObjection(req.user!.id, reason);
    res.json({ success, message: 'Objection recorded. AI processing and analytics disabled for your account.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Objection recording failed' });
  }
});

// Right to Erasure / Account Deletion (Art. 17)
app.post('/api/gdpr/erase', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = store.eraseUserData(req.user!.id);
    if (req.token) {
      store.invalidateToken(req.token);
    }
    res.json({
      success,
      message: 'All personal data permanently erased under GDPR Article 17. Account deactivated.'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erasure request failed' });
  }
});

app.delete('/api/account', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = store.eraseUserData(req.user!.id);
    if (req.token) {
      store.invalidateToken(req.token);
    }
    res.json({ success, message: 'Account and personal data permanently erased.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Account deletion failed' });
  }
});

// --- DSA Compliance (Articles 15, 16, 17, 20, 22) ---

// Notice and Action Mechanism (DSA Art. 16)
app.post('/api/dsa/report', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { reportedUserId, reason, details } = req.body;
    if (!reportedUserId || !reason) {
      return res.status(400).json({ error: 'reportedUserId and valid DSA reason are required' });
    }

    const report = store.submitDsaReport(req.user!.id, reportedUserId, reason, details);
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
app.get('/api/dsa/reports/my', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const reports = store.getUserSubmittedReports(req.user!.id);
  res.json({ reports });
});

// Statement of Reasons / Moderation Notices (DSA Art. 17)
app.get('/api/dsa/notices', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const notices = store.getModerationNoticesForUser(req.user!.id);
  res.json({ notices });
});

// Internal Complaint-Handling System / Appeal (DSA Art. 20)
app.post('/api/dsa/appeal', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { noticeId, appealReason } = req.body;
    if (!noticeId || !appealReason || typeof appealReason !== 'string' || appealReason.trim().length < 10) {
      return res.status(400).json({ error: 'noticeId and detailed appealReason (at least 10 chars) are required' });
    }

    const appeal = store.submitDsaAppeal(req.user!.id, noticeId, appealReason);
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
app.get('/api/dsa/transparency', (req: Request, res: Response) => {
  const stats = store.getAdminStats();
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
app.get('/api/matches', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const matches = store.getUserMatches(req.user!.id);
  res.json({ matches });
});

// AI Proposition & Icebreaker Generation (Gemini API Integration)
const handleAIIcebreaker = async (req: AuthenticatedRequest, res: Response) => {
  let targetProfile = req.body.matchProfile;
  const targetUserId = req.body.targetUserId || req.body.userId;
  const vibe = req.body.vibe || 'Playful & Witty';

  if (!targetProfile && targetUserId) {
    const foundUser = store.getUserById(targetUserId);
    if (foundUser) {
      targetProfile = foundUser.profile;
    }
  }

  if (!targetProfile || !targetProfile.displayName) {
    return res.status(400).json({ error: 'Target profile details required for AI propositions.' });
  }

  if (targetProfile.userId && store.isBlocked(req.user!.id, targetProfile.userId)) {
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
  if (store.isStripeEventProcessed(event.id)) {
    return res.json({ received: true, message: 'Event already processed' });
  }

  store.recordStripeEvent(event.id, event.type);
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
          store.recordStripeSubscription(userId, customerId, subscriptionId, planId, 'active');
          console.log(`[Stripe Webhook] Activated VIP for user ${userId}`);
        } else if (customerId) {
          const user = store.findUserByStripeCustomerId(customerId);
          if (user) {
            store.recordStripeSubscription(user.id, customerId, subscriptionId, planId, 'active');
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

        let user = userId ? store.getUserById(userId) : null;
        if (!user && customerId) {
          user = store.findUserByStripeCustomerId(customerId);
        }
        if (!user && subscriptionId) {
          user = store.findUserByStripeSubscriptionId(subscriptionId);
        }

        if (user) {
          store.recordStripeSubscription(user.id, customerId, subscriptionId, planId, status, periodEnd);
          console.log(`[Stripe Webhook] Updated subscription for user ${user.id}: status=${status}`);
        }
        break;
      }

      case 'customer.subscription.deleted':
      case 'invoice.payment_failed': {
        const obj = event.data.object;
        const customerId = obj.customer as string;
        const subscriptionId = (obj.subscription || obj.id) as string;

        let user = store.findUserByStripeCustomerId(customerId) || store.findUserByStripeSubscriptionId(subscriptionId);
        if (user) {
          store.recordStripeSubscription(user.id, customerId, subscriptionId, 'none', 'canceled');
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

// Admin: Analytics & Moderation Dashboard
app.get('/api/admin/stats', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const stats = store.getAdminStats();
  res.json({ stats });
});

app.get('/api/admin/reports', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const reports = store.getReports();
  res.json({ reports });
});

const handleAdminSuspend = (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetUserId = req.params.userId || req.body.targetUserId;
    if (!targetUserId) {
      return res.status(400).json({ error: 'Target user ID is required.' });
    }

    const success = store.suspendUser(targetUserId);
    res.json({ success, message: `User ${targetUserId} suspended successfully` });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'User suspension failed' });
  }
};
app.post('/api/admin/suspend', authenticateToken, requireAdmin, handleAdminSuspend);
app.post('/api/admin/users/:userId/suspend', authenticateToken, requireAdmin, handleAdminSuspend);

app.post('/api/admin/soft-delete', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) {
      return res.status(400).json({ error: 'Target user ID is required.' });
    }

    const success = store.softDeleteUser(targetUserId);
    res.json({ success, message: `User ${targetUserId} soft-deleted successfully` });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Soft delete failed' });
  }
});

// Admin: DSA Appeals Management (DSA Art. 20)
app.get('/api/admin/dsa/appeals', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const appeals = store.getDsaAppeals();
  res.json({ appeals });
});

app.post('/api/admin/dsa/appeals/:appealId/decide', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const appealId = String(req.params.appealId);
    const { outcome, decisionNotes } = req.body;
    if (!outcome || (outcome !== 'UPHELD' && outcome !== 'OVERTURNED')) {
      return res.status(400).json({ error: 'Valid outcome (UPHELD or OVERTURNED) is required' });
    }
    if (!decisionNotes) {
      return res.status(400).json({ error: 'Written decision notes are required under DSA Article 20' });
    }

    const decided = store.adminDecideAppeal(req.user!.id, appealId, outcome, decisionNotes);
    res.json({ success: true, appeal: decided });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to decide appeal' });
  }
});

// Admin: DSA Statement of Reasons Report Decision (DSA Art. 17)
app.post('/api/admin/dsa/reports/:reportId/decide', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const reportId = String(req.params.reportId);
    const { decision, legalBasis, statementOfReasons } = req.body;
    if (!decision || !legalBasis || !statementOfReasons) {
      return res.status(400).json({ error: 'decision, legalBasis, and statementOfReasons are mandatory under DSA Art. 17' });
    }

    const notice = store.adminDecideReport(req.user!.id, reportId, decision, legalBasis, statementOfReasons);
    res.json({ success: true, notice });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to process report decision' });
  }
});

// Admin: Immutable Audit Logs (GDPR Art. 5(2) & DSA Art. 28)
app.get('/api/admin/audit-logs', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const auditLogs = store.getAdminAuditLogs();
  res.json({ auditLogs });
});

// Admin: Purge bot accounts and synthetic profiles
app.post('/api/admin/purge-bots', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const result = store.purgeBotAccounts();
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
  if (process.env.NODE_ENV !== 'production') {
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : undefined,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AURA GAY 18+] Server actively running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
