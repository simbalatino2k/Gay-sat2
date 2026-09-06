import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { store } from './src/db/store';
import { QUEER_VENUES, getVenuesNearLocation, searchVenues } from './src/data/queerVenues';
import { AURA_STICKERS } from './src/data/auraStickers';

// Initialize Express App
const app = express();
const PORT = 3000;

// Security & Parsing Middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
app.post('/api/auth/register', (req: Request, res: Response) => {
  try {
    const { email, displayName, age, is18PlusAccepted } = req.body;

    if (!is18PlusAccepted) {
      return res.status(400).json({ error: 'You must confirm you are 18 years of age or older to use AURA.' });
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }

    const numAge = Number(age);
    if (isNaN(numAge) || numAge < 18) {
      return res.status(400).json({ error: 'AURA GAY 18+ is strictly reserved for adults 18 years of age and older.' });
    }

    const cleanName = (displayName || '').toString().trim();
    if (!cleanName || cleanName.length < 2) {
      return res.status(400).json({ error: 'Display name must be at least 2 characters long.' });
    }

    const result = store.registerUser(email, cleanName, numAge);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Registration failed' });
  }
});

// Auth: Login
app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    const result = store.loginUser(email);
    if (!result) {
      return res.status(404).json({ error: 'No active account found for this email address. Please register.' });
    }

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Login failed' });
  }
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

// Account Management
app.delete('/api/account', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    store.softDeleteUser(req.user!.id);
    if (req.token) {
      store.invalidateToken(req.token);
    }
    res.json({ success: true, message: 'Account deactivated successfully.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Account deactivation failed' });
  }
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

// Payments / Subscription Checkout (Supports both create-checkout-session and checkout-session)
const handleCheckout = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const planId = req.body.planId || 'aura_vip_monthly';
    const stripeKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeKey) {
      const mockCheckoutUrl = `${req.headers.origin || 'http://localhost:3000'}/?payment=preview_success`;
      return res.json({
        url: mockCheckoutUrl,
        checkoutUrl: mockCheckoutUrl,
        preview: true,
        message: 'Stripe payments simulated in preview mode. Set STRIPE_SECRET_KEY to activate live checkout.'
      });
    }

    // Lazy load Stripe when key exists
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeKey);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: planId === 'aura_vip_annual' ? 'AURA VIP Pass (Annual)' : 'AURA VIP Pass (Monthly)',
              description: 'Unlimited likes, see who liked you, stealth mode, and AI icebreaker priority.'
            },
            unit_amount: planId === 'aura_vip_annual' ? 9999 : 1499
          },
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: `${req.headers.origin || 'http://localhost:3000'}/?payment=success`,
      cancel_url: `${req.headers.origin || 'http://localhost:3000'}/?payment=cancelled`
    });

    res.json({ url: session.url, checkoutUrl: session.url });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Payment processing error' });
  }
};
app.post('/api/payments/create-checkout-session', authenticateToken, handleCheckout);
app.post('/api/payments/checkout-session', authenticateToken, handleCheckout);

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

// Explicit 404 Catch-All for any /api/* route:
// This guarantees that ANY missing or invalid API route returns JSON, NEVER the HTML index.html
app.all('/api/*', (req: Request, res: Response) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
});

// Vite Server Integration (Dev vs Prod)
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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
