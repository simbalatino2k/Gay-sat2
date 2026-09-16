import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { AURA_ALBUM_PHOTOS } from '../data/auraAlbum';
import { getPostgresPool, initPostgresSchema, PostgresStoreAdapter } from './postgres';
import { purgeAllUserMedia, deleteMediaRecord } from '../lib/storage';
import {
  UserAccount,
  UserProfile,
  LikeRecord,
  MatchRecord,
  BlockRecord,
  ReportRecord,
  Conversation,
  Message,
  Moment,
  FilterState,
  AdminStats,
  AccountStatus,
  UserConsents,
  SessionRecord,
  AdminAuditLog,
  ModerationNotice,
  DsaAppealRecord,
  DsaReportReason,
  GdprExportData,
  TapType,
  ConversationSettings,
  CloudBackupRecord,
  CloudBackupStatus,
  UserEntitlement
} from '../types';

// Production database state: No pre-seeded bot accounts or synthetic profiles
const INITIAL_PROFILES: UserProfile[] = [];
const INITIAL_USERS: UserAccount[] = [];
const INITIAL_CONVERSATIONS: Conversation[] = [];
const INITIAL_MESSAGES: Record<string, Message[]> = {};
const INITIAL_MOMENTS: Moment[] = [];

export class DataStore {

  public async hydrateFromPostgres(): Promise<void> {
    if (!this.pgAdapter) return;
    try {
      console.log('[DataStore] Hydrating from PostgreSQL...');
      const users = await this.pgAdapter.loadAllUsers();
      for (const u of users) {
        this.users.set(u.id, u);
      }
      const sessions = await this.pgAdapter.loadAllSessions();
      for (const s of sessions) {
        this.sessions.set(s.token, {
          token: s.token,
          userId: s.user_id,
          createdAt: s.created_at.toISOString(),
          expiresAt: s.expires_at.toISOString(),
          lastUsedAt: s.last_used_at.toISOString()
        });
        this.tokens.set(s.token, s.user_id);
      }
      const convs = await this.pgAdapter.loadAllConversations();
      for (const c of convs) {
        this.conversations.set(c.id, c);
      }
      const msgs = await this.pgAdapter.loadAllMessages();
      for (const m of msgs) {
        const arr = this.messages.get(m.conversationId) || [];
        arr.push(m);
        this.messages.set(m.conversationId, arr);
      }
      console.log('[DataStore] Hydration complete.');
    } catch (err: any) {
      console.error('[DataStore] Hydration failed:', err.message);
    }
  }

  private users: Map<string, UserAccount> = new Map();
  private tokens: Map<string, string> = new Map(); // token -> userId (legacy compatibility)
  private sessions: Map<string, SessionRecord> = new Map(); // token -> SessionRecord
  private consents: Map<string, UserConsents> = new Map(); // userId -> UserConsents
  private likes: LikeRecord[] = [];
  private matches: MatchRecord[] = [];
  private blocks: BlockRecord[] = [];
  private reports: ReportRecord[] = [];
  private moments: Moment[] = [];
  private conversations: Map<string, Conversation> = new Map();
  private messages: Map<string, Message[]> = new Map();
  private adminAuditLogs: AdminAuditLog[] = [];
  private moderationNotices: ModerationNotice[] = [];
  private appeals: DsaAppealRecord[] = [];
  private erasureAuditLog: Array<{ hashId: string; erasedAt: string; reason: string }> = [];
  private userPasswords: Map<string, string> = new Map(); // userId -> salt:scryptHash
  private passwordResets: Map<string, { userId: string; expiresAt: string; used: boolean }> = new Map();
  private stripeEvents: Set<string> = new Set();
  private stripeSubscriptions: Map<string, { customerId: string; subscriptionId: string; planId: string; status: string; currentPeriodEnd?: string }> = new Map();
  private localStoreSubscriptions: Map<string, UserEntitlement> = new Map(); // development fallback
  private localStoreEvents: Set<string> = new Set();
  private vaultAccess: Map<string, Set<string>> = new Map(); // ownerUserId -> Set of granted userIds
  private vaultRequests: Map<string, Set<string>> = new Map(); // targetUserId -> Set of requester userIds
  private cloudBackupHistory: CloudBackupRecord[] = [];
  private pgAdapter: PostgresStoreAdapter | null = null;
  private dbFilePath = path.join(process.cwd(), 'data', 'aura_db.json');

  private saveToDisk(): void {
    // In production, local JSON storage is strictly prohibited
    if (process.env.NODE_ENV === 'production') {
      return;
    }
    // Only save to disk if explicitly permitted in development
    if (process.env.ALLOW_DEV_LOCAL_STORE !== 'true') {
      return;
    }

    try {
      const dir = path.dirname(this.dbFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const serialized = {
        users: Array.from(this.users.entries()),
        tokens: Array.from(this.tokens.entries()),
        sessions: Array.from(this.sessions.entries()),
        consents: Array.from(this.consents.entries()),
        likes: this.likes,
        matches: this.matches,
        blocks: this.blocks,
        reports: this.reports,
        moments: this.moments,
        conversations: Array.from(this.conversations.entries()),
        messages: Array.from(this.messages.entries()),
        adminAuditLogs: this.adminAuditLogs,
        moderationNotices: this.moderationNotices,
        appeals: this.appeals,
        erasureAuditLog: this.erasureAuditLog,
        userPasswords: Array.from(this.userPasswords.entries()),
        passwordResets: Array.from(this.passwordResets.entries()),
        stripeSubscriptions: Array.from(this.stripeSubscriptions.entries()),
        localStoreSubscriptions: Array.from(this.localStoreSubscriptions.entries()),
        localStoreEvents: Array.from(this.localStoreEvents)
      };
      fs.writeFileSync(this.dbFilePath, JSON.stringify(serialized, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DataStore] Error saving development file store:', err);
    }
  }

  private loadFromDisk(): boolean {
    if (process.env.NODE_ENV === 'production') {
      return false;
    }
    if (process.env.ALLOW_DEV_LOCAL_STORE !== 'true') {
      return false;
    }

    try {
      if (!fs.existsSync(this.dbFilePath)) return false;
      const raw = fs.readFileSync(this.dbFilePath, 'utf-8');
      if (!raw.trim()) return false;
      const data = JSON.parse(raw);

      this.users = new Map(data.users || []);
      this.tokens = new Map(data.tokens || []);
      this.sessions = new Map(data.sessions || []);
      this.consents = new Map(data.consents || []);
      this.likes = data.likes || [];
      this.matches = data.matches || [];
      this.blocks = data.blocks || [];
      this.reports = data.reports || [];
      this.moments = data.moments || [];
      this.conversations = new Map(data.conversations || []);
      this.messages = new Map(data.messages || []);
      this.adminAuditLogs = data.adminAuditLogs || [];
      this.moderationNotices = data.moderationNotices || [];
      this.appeals = data.appeals || [];
      this.erasureAuditLog = data.erasureAuditLog || [];
      this.userPasswords = new Map(data.userPasswords || []);
      this.passwordResets = new Map(data.passwordResets || []);
      this.stripeSubscriptions = new Map(data.stripeSubscriptions || []);
      this.localStoreSubscriptions = new Map(data.localStoreSubscriptions || []);
      this.localStoreEvents = new Set(data.localStoreEvents || []);
      return true;
    } catch (err: any) {
      console.error('[DataStore] Critical error loading file store:', err.message);
      // NEVER overwrite broken database with empty state! Preserve the file:
      try {
        const backupCorrupt = path.join(process.cwd(), 'data', `aura_db.corrupt.${Date.now()}.json`);
        fs.copyFileSync(this.dbFilePath, backupCorrupt);
        console.warn(`[DataStore] Preserved corrupted database file to ${backupCorrupt}`);
      } catch (copyErr) {
        // Ignore
      }
      return false;
    }
  }

  constructor() {
    // Check for PostgreSQL configuration
    const pool = getPostgresPool();
    if (pool) {
      this.pgAdapter = new PostgresStoreAdapter(pool);
      initPostgresSchema().then((ok) => {
        if (ok) {
          console.log('[DataStore] PostgreSQL persistence layer connected and schema ready.');
        } else {
          console.error('[DataStore] PostgreSQL schema initialization failed.');
        }
      }).catch((e) => {
        console.error('[DataStore] PostgreSQL connection error:', e.message);
      });
    } else {
      if (process.env.NODE_ENV === 'production') {
        console.error(
          '[DataStore CRITICAL] Neither DATABASE_URL nor SQL_HOST is configured for PostgreSQL in production!\n' +
          'Production requires a persistent Cloud SQL PostgreSQL instance to prevent data loss across Cloud Run container lifecycles.'
        );
      }
    }

    if (this.loadFromDisk()) {
      console.log('[DataStore] Loaded development local data from disk.');
      this.purgeBotAccounts();
    } else {
      console.log('[DataStore] Clean database initialized (zero bots).');
      // Notice: Do NOT call saveToDisk() here to prevent overwriting failed files
    }
  }

  /**
   * Purges all bot, test, synthetic, and non-real accounts, sessions, moments, and messages.
   * Protects real verified user accounts (such as adas.stasz1@gmail.com) and promotes the primary owner to SUPERADMIN.
   */
  public async purgeBotAccounts(): Promise<{ purgedUsersCount: number; purgedMomentsCount: number }> {
    const isBotUser = (userId: string, email?: string): boolean => {
      if (userId === 'YfFbq4qTCjZYMPZUZEZPzrkOM2k2') return false;
      const lowerEmail = (email || '').toLowerCase().trim();
      if (lowerEmail === 'adas.stasz1@gmail.com') return false;

      // Known seeded bot IDs
      if (
        userId.startsWith('user-demo') ||
        userId.startsWith('user-marcus') ||
        userId.startsWith('user-julian') ||
        userId.startsWith('user-mateo') ||
        userId.startsWith('user-alex') ||
        userId.startsWith('user-dante') ||
        userId.startsWith('user-leo') ||
        userId.startsWith('user-gabriel') ||
        userId.startsWith('user-admin') ||
        userId.startsWith('user-1788609190714') ||
        userId.startsWith('user-1788726769224')
      ) {
        return true;
      }

      // Synthetic bot domains & test emails
      if (
        lowerEmail.endsWith('@deleted.aura.local') ||
        lowerEmail.startsWith('synthetic-bot-') ||
        lowerEmail.startsWith('bot-seed-') ||
        lowerEmail.endsWith('@test-bot.local')
      ) {
        return true;
      }

      return false;
    };

    const botUserIds = new Set<string>();
    for (const [id, user] of this.users.entries()) {
      if (isBotUser(id, user.email)) {
        botUserIds.add(id);
      } else if (user.email?.toLowerCase().trim() === 'adas.stasz1@gmail.com') {
        user.role = 'SUPERADMIN';
        user.status = 'ACTIVE';
      }
    }

    // Purge bot users, credentials, and consents
    for (const botId of botUserIds) {
      this.users.delete(botId);
      this.consents.delete(botId);
      this.userPasswords.delete(botId);
    }

    // Purge sessions & tokens for bots or demo tokens
    for (const [token, session] of this.sessions.entries()) {
      if (botUserIds.has(session.userId) || token.includes('demo') || token === 'aura-demo-token') {
        this.sessions.delete(token);
      }
    }
    for (const [token, userId] of this.tokens.entries()) {
      if (botUserIds.has(userId) || token.includes('demo') || token === 'aura-demo-token') {
        this.tokens.delete(token);
      }
    }

    // Purge moments from bots
    const initialMomentsCount = this.moments.length;
    this.moments = this.moments.filter(m => !botUserIds.has(m.userId));
    const purgedMomentsCount = initialMomentsCount - this.moments.length;

    // Purge matches
    this.matches = this.matches.filter(m => !botUserIds.has(m.user1Id) && !botUserIds.has(m.user2Id));

    // Purge likes
    this.likes = this.likes.filter(l => !botUserIds.has(l.fromUserId) && !botUserIds.has(l.toUserId));

    // Purge blocks & reports
    this.blocks = this.blocks.filter(b => !botUserIds.has(b.blockerUserId) && !botUserIds.has(b.blockedUserId));
    this.reports = this.reports.filter(r => !botUserIds.has(r.reporterUserId) && !botUserIds.has(r.reportedUserId));

    // Purge conversations & messages
    for (const [convId, conv] of this.conversations.entries()) {
      if (conv.participantIds.some(id => botUserIds.has(id))) {
        this.conversations.delete(convId);
        this.messages.delete(convId);
      }
    }

    if (botUserIds.size > 0 || purgedMomentsCount > 0) {
      console.log(`[DataStore] Successfully purged ${botUserIds.size} bot accounts and ${purgedMomentsCount} bot moments.`);
      this.saveToDisk();
    }

    return { purgedUsersCount: botUserIds.size, purgedMomentsCount };
  }

  // --- Auth Methods ---
  public async registerUser(
    email: string,
    displayName: string,
    age: number,
    role: string = 'USER',
    password?: string
  ): Promise<{ token: string; user: UserAccount }> {
    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw new Error('Valid email address is required');
    }

    if (!age || age < 18) {
      throw new Error('Access denied. AURA GAY is an adult platform strictly restricted to individuals aged 18 and older.');
    }

    let existing = Array.from(this.users.values()).find(u => u.email === cleanEmail);
    if (!existing && this.pgAdapter) {
      existing = (await this.pgAdapter.getUserByEmail(cleanEmail)) || undefined;
    }
    if (existing) {
      throw new Error('An account with this email address already exists. Please log in instead.');
    }

    const userId = `user-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const profileId = `prof-${Date.now()}`;
    const cleanDisplayName = displayName.replace(/<[^>]*>?/gm, '').trim() || 'New Member';

    const newUserProfile: UserProfile = {
      id: profileId,
      userId: userId,
      displayName: cleanDisplayName,
      age: Math.min(Math.max(18, age), 99),
      identityRole: 'Versatile',
      location: 'Los Angeles, CA',
      distanceKm: 0.5,
      locationPrivacy: 'APPROXIMATE',
      approximateArea: 'Within ~1 km',
      bio: 'New on AURA! Excited to connect with authentic people.',
      lookingFor: ['Dating', 'Friends'],
      tribes: ['Clean Cut'],
      interests: ['Travel', 'Art', 'Fitness'],
      photos: [
        {
          id: `ph-${Date.now()}`,
          url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800',
          isPrimary: true
        }
      ],
      verified: false,
      isOnline: true,
      lastActiveMinutesAgo: 0
    };

    const newUser: UserAccount = {
      id: userId,
      email: cleanEmail,
      role: role === 'SUPERADMIN' ? 'SUPERADMIN' : 'USER',
      status: 'ACTIVE',
      isAgeVerified18Plus: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      profile: newUserProfile
    };

    let pwdHashAndSalt: string | undefined;
    if (password && password.trim().length >= 6) {
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = crypto.scryptSync(password, salt, 64).toString('hex');
      pwdHashAndSalt = `${salt}:${hash}`;
      this.userPasswords.set(userId, pwdHashAndSalt);
    }

    this.users.set(userId, newUser);

    // Create 7-day secure cryptographic session
    const token = `aura_sess_${userId}_${crypto.randomBytes(24).toString('hex')}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const sessionRecord: SessionRecord = {
      token,
      userId,
      createdAt: now.toISOString(),
      expiresAt,
      lastUsedAt: now.toISOString()
    };
    this.sessions.set(token, sessionRecord);
    this.tokens.set(token, userId);

    // Initialize GDPR Consents
    const initialConsents: UserConsents = {
      necessaryCookies: true,
      functionalCookies: true,
      analyticsCookies: false,
      explicitSpecialCategoryConsent: true,
      aiAssistanceConsent: true,
      locationProcessingConsent: true,
      termsAcceptedVersion: '2026.1',
      privacyPolicyAcceptedVersion: '2026.1',
      updatedAt: now.toISOString(),
      safeContentEnabled: true
    };
    this.consents.set(userId, initialConsents);

    this.saveToDisk();

    if (this.pgAdapter) {
      await this.pgAdapter.saveUserAndSession(newUser, token, new Date(expiresAt), pwdHashAndSalt);
      await this.pgAdapter.saveUserConsents(userId, initialConsents);
    }

    return { token, user: newUser };
  }

  public async loginUser(email: string, password?: string): Promise<{ token: string; user: UserAccount } | null> {
    const cleanEmail = email.toLowerCase().trim();
    let user = Array.from(this.users.values()).find(u => u.email === cleanEmail);
    if (!user && this.pgAdapter) {
      user = (await this.pgAdapter.getUserByEmail(cleanEmail)) || undefined;
      if (user) {
        this.users.set(user.id, user);
      }
    }
    if (!user) return null;

    if (user.status !== 'ACTIVE') {
      throw new Error(`Account is ${user.status.toLowerCase()}`);
    }

    let stored = this.userPasswords.get(user.id);
    if (!stored && this.pgAdapter) {
      const dbHash = await this.pgAdapter.getPasswordHash(user.id);
      if (dbHash) {
        stored = dbHash;
        this.userPasswords.set(user.id, dbHash);
      }
    }

    if (stored) {
      if (!password) {
        throw new Error('Password is required for this account.');
      }
      const [salt, hash] = stored.split(':');
      if (salt && hash) {
        const testHash = crypto.scryptSync(password, salt, 64).toString('hex');
        if (testHash !== hash) {
          throw new Error('Invalid email or password');
        }
      }
    } else {
      if (!password) {
        throw new Error('This account was created with Google or has no password set. Please provide a password to initialize your account credentials.');
      }
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = crypto.scryptSync(password, salt, 64).toString('hex');
      const newHash = `${salt}:${hash}`;
      this.userPasswords.set(user.id, newHash);
      if (this.pgAdapter) {
        await this.pgAdapter.saveUserPassword(user.id, newHash);
      }
    }

    const token = `aura_sess_${user.id}_${crypto.randomBytes(24).toString('hex')}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const sessionRecord: SessionRecord = {
      token,
      userId: user.id,
      createdAt: now.toISOString(),
      expiresAt,
      lastUsedAt: now.toISOString()
    };
    this.sessions.set(token, sessionRecord);
    this.tokens.set(token, user.id);
    this.saveToDisk();

    if (this.pgAdapter) {
      await this.pgAdapter.saveUserAndSession(user, token, new Date(expiresAt));
    }

    return { token, user };
  }

  public async loginOrRegisterSocialUser(provider: string, email?: string, displayName?: string): Promise<{ token: string; user: UserAccount }> {
    const cleanProvider = (provider || 'social').toLowerCase().trim();
    const cleanEmail = (email || `${cleanProvider}.user@aura.local`).toLowerCase().trim();

    let user = Array.from(this.users.values()).find(u => u.email === cleanEmail);
    if (!user) {
      const cleanName = displayName || `${cleanProvider.charAt(0).toUpperCase() + cleanProvider.slice(1)} Member`;
      const res = await this.registerUser(cleanEmail, cleanName, 25, 'USER');
      user = res.user;
      return res;
    }

    const token = `aura_sess_${user.id}_${crypto.randomBytes(24).toString('hex')}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const sessionRecord: SessionRecord = {
      token,
      userId: user.id,
      createdAt: now.toISOString(),
      expiresAt,
      lastUsedAt: now.toISOString()
    };
    this.sessions.set(token, sessionRecord);
    this.tokens.set(token, user.id);
    this.saveToDisk();
    return { token, user };
  }

  public async getUserByToken(token: string): Promise<UserAccount | null> {
    if (!token) return null;
    const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
    if (!cleanToken) return null;

    // 0. Authoritative multi-instance PostgreSQL session verification
    if (this.pgAdapter) {
      const dbUser = await this.pgAdapter.getUserByToken(cleanToken);
      if (dbUser) {
        if (dbUser.status !== 'ACTIVE') return null;
        this.users.set(dbUser.id, dbUser);
        return dbUser;
      }
      if (cleanToken.startsWith('aura_sess_')) {
        // If it's an aura_sess_ token and not in PostgreSQL, it was revoked or expired
        return null;
      }
    }

    // 1. Modern session lookup with expiration check
    const session = this.sessions.get(cleanToken);
    if (session) {
      if (new Date(session.expiresAt).getTime() < Date.now()) {
        // Expired
        this.sessions.delete(cleanToken);
        this.tokens.delete(cleanToken);
        this.saveToDisk();
        return null;
      }
      session.lastUsedAt = new Date().toISOString();
      const user = this.users.get(session.userId);
      if (user && user.status === 'ACTIVE') {
        return user;
      }
      return null;
    }

    // 2. Legacy fallback session map
    const userId = this.tokens.get(cleanToken);
    if (userId) {
      const user = this.users.get(userId);
      if (user && user.status === 'ACTIVE') {
        const now = new Date();
        this.sessions.set(cleanToken, {
          token: cleanToken,
          userId,
          createdAt: now.toISOString(),
          expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          lastUsedAt: now.toISOString()
        });
        return user;
      }
      return null;
    }

    // 3. Fallback for legacy tokens: explicitly reject fake demo tokens
    if (cleanToken === 'demo-token' || cleanToken === 'aura-demo-token' || cleanToken === 'aura_auth_token') {
      return null;
    }

    // 4. Secure decode Firebase JWT token if passed
    if (cleanToken.includes('.')) {
      try {
        const parts = cleanToken.split('.');
        if (parts.length === 3) {
          const headerStr = Buffer.from(parts[0], 'base64').toString('utf-8');
          const header = JSON.parse(headerStr);
          // Only standard RS256 Firebase tokens are valid
          if (header.alg !== 'RS256') {
            return null;
          }

          const payloadStr = Buffer.from(parts[1], 'base64').toString('utf-8');
          const payload = JSON.parse(payloadStr);

          // Verify standard claims against Firebase project
          const validProjectIds = [
            'ai-studio-aura-0580ece6-7701-4148-bdcf-9accc85a9917',
            'aura-dating-gay-mab'
          ];
          const validIssuers = validProjectIds.map(id => `https://securetoken.google.com/${id}`);
          if (!validProjectIds.includes(payload.aud) || !validIssuers.includes(payload.iss)) {
            return null;
          }

          // Check expiration
          const nowSec = Math.floor(Date.now() / 1000);
          if (!payload.exp || payload.exp < nowSec) {
            return null;
          }

          const fbUid = payload.user_id || payload.sub;
          if (fbUid && typeof fbUid === 'string' && fbUid.length > 3) {
            let user = this.users.get(fbUid);
            if (!user) {
              const email = payload.email || `${fbUid}@user.auragay.com`;
              const isSuperAdmin = email.toLowerCase().trim() === 'adas.stasz1@gmail.com';
              user = {
                id: fbUid,
                email,
                role: isSuperAdmin ? 'SUPERADMIN' : 'USER',
                status: 'ACTIVE',
                isAgeVerified18Plus: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                profile: {
                  id: `prof-${fbUid}`,
                  userId: fbUid,
                  displayName: (payload.name || email.split('@')[0] || 'AURA Member').replace(/<[^>]*>?/gm, ''),
                  age: 26,
                  identityRole: 'Versatile',
                  location: 'Global Member',
                  distanceKm: 1.2,
                  locationPrivacy: 'APPROXIMATE',
                  approximateArea: 'Within ~1 km',
                  bio: 'Connecting on AURA 18+.',
                  lookingFor: ['Dating', 'Friends'],
                  tribes: ['Clean Cut'],
                  interests: ['Design', 'Music', 'Fitness'],
                  photos: [
                    { id: `ph-${fbUid}-1`, url: payload.picture || AURA_ALBUM_PHOTOS[0], isPrimary: true }
                  ],
                  verified: true,
                  isOnline: true,
                  lastActiveMinutesAgo: 0
                }
              };
              this.users.set(fbUid, user);
              this.saveToDisk();
            }
            const now = new Date();
            this.sessions.set(cleanToken, {
              token: cleanToken,
              userId: fbUid,
              createdAt: now.toISOString(),
              expiresAt: new Date(payload.exp * 1000).toISOString(),
              lastUsedAt: now.toISOString()
            });
            this.tokens.set(cleanToken, fbUid);
            return user;
          }
        }
      } catch (err) {
        // Not a valid JWT or parse error, reject
        return null;
      }
    }

    return null;
  }

  public async invalidateToken(token: string): Promise<boolean> {
    const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
    const resSessions = this.sessions.delete(cleanToken);
    const resTokens = this.tokens.delete(cleanToken);
    if (this.pgAdapter) {
      await this.pgAdapter.deleteSession(cleanToken);
    }
    this.saveToDisk();
    return resSessions || resTokens;
  }

  // --- Password Recovery Flow ---
  public async createPasswordReset(email: string): Promise<{ token: string; expiresAt: string } | null> {
    const cleanEmail = email.toLowerCase().trim();
    const user = Array.from(this.users.values()).find(u => u.email === cleanEmail);
    if (!user) return null;

    // Check if user has local password (not federated)
    if (!this.userPasswords.has(user.id)) {
      return null;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
    this.passwordResets.set(token, {
      userId: user.id,
      expiresAt,
      used: false
    });

    if (this.pgAdapter) {
      this.pgAdapter.createPasswordReset(cleanEmail).catch(err => {
        console.error('[Postgres] Password reset sync error:', err.message);
      });
    }

    this.saveToDisk();
    return { token, expiresAt };
  }

  public async resetPasswordWithToken(token: string, newPassword: string): Promise<boolean> {
    if (!token || !newPassword) return false;
    const cleanToken = token.trim();
    const record = this.passwordResets.get(cleanToken);
    if (!record) return false;

    if (record.used) return false;
    if (new Date(record.expiresAt).getTime() < Date.now()) return false;

    record.used = true;
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(newPassword, salt, 64).toString('hex');
    this.userPasswords.set(record.userId, `${salt}:${hash}`);

    // Invalidate all active sessions for security
    for (const [sToken, sRecord] of this.sessions.entries()) {
      if (sRecord.userId === record.userId) {
        this.sessions.delete(sToken);
        this.tokens.delete(sToken);
      }
    }

    if (this.pgAdapter) {
      this.pgAdapter.resetPasswordWithToken(cleanToken, `${salt}:${hash}`).catch(err => {
        console.error('[Postgres] Password reset sync error:', err.message);
      });
    }

    this.saveToDisk();
    return true;
  }

  // --- Stripe Subscription & Webhook Processing ---
  public async isStripeEventProcessed(eventId: string): Promise<boolean> {
    return this.stripeEvents.has(eventId);
  }

  public async recordStripeEvent(eventId: string, eventType: string): Promise<void> {
    this.stripeEvents.add(eventId);
    if (this.pgAdapter) {
      this.pgAdapter.recordProcessedEvent(eventId, eventType).catch(err => {
        console.error('[Postgres] Stripe event sync error:', err.message);
      });
    }
  }

  public async recordStripeSubscription(
    userId: string,
    customerId: string,
    subscriptionId: string,
    planId: string,
    status: string,
    periodEnd?: Date
  ): Promise<UserAccount | null> {
    const user = this.users.get(userId);
    if (!user) return null;

    const isActive = status === 'active' || status === 'trialing';
    user.isPremium = isActive;
    user.profile.isPremium = isActive;
    if (isActive) {
      user.premiumExpiresAt = periodEnd ? periodEnd.toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      user.profile.premiumTier = planId === 'aura_vip_annual' ? 'VIP_ANNUAL' : 'VIP_MONTHLY';
    } else {
      delete user.premiumExpiresAt;
      user.profile.premiumTier = undefined;
    }
    user.updatedAt = new Date().toISOString();

    this.stripeSubscriptions.set(userId, {
      customerId,
      subscriptionId,
      planId,
      status,
      currentPeriodEnd: user.premiumExpiresAt
    });

    // Also record into unified store subscriptions
    this.localStoreSubscriptions.set(userId, {
      userId,
      premium: isActive,
      provider: 'stripe',
      productId: planId,
      planTier: planId === 'aura_vip_annual' ? 'yearly' : 'monthly',
      status: isActive ? 'active' : 'canceled',
      expiresAt: user.premiumExpiresAt,
      autoRenew: isActive,
      storeTransactionId: subscriptionId,
      lastVerifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    if (this.pgAdapter) {
      this.pgAdapter.setStripeSubscription(userId, customerId, subscriptionId, planId, status, periodEnd).catch(err => {
        console.error('[Postgres] Subscription sync error:', err.message);
      });
    }

    this.saveToDisk();
    return user;
  }

  public async findUserByStripeCustomerId(customerId: string): Promise<UserAccount | null> {
    for (const [userId, sub] of this.stripeSubscriptions.entries()) {
      if (sub.customerId === customerId) {
        return this.users.get(userId) || null;
      }
    }
    return null;
  }

  public async findUserByStripeSubscriptionId(subscriptionId: string): Promise<UserAccount | null> {
    for (const [userId, sub] of this.stripeSubscriptions.entries()) {
      if (sub.subscriptionId === subscriptionId) {
        return this.users.get(userId) || null;
      }
    }
    return null;
  }

  /**
   * Unified Store Entitlement Resolution (Google Play, Apple StoreKit, Stripe).
   * Backed by PostgreSQL in production and local store in development.
   */
  public async getUserEntitlements(userId: string): Promise<UserEntitlement> {
    if (this.pgAdapter) {
      const pgEnt = await this.pgAdapter.getStoreSubscriptionByUserId(userId);
      if (pgEnt) return pgEnt;
    }

    const existing = this.localStoreSubscriptions.get(userId);
    const user = this.users.get(userId);

    if (existing) {
      // Check for expiration (do not overwrite revoked status)
      if (existing.status !== 'revoked' && existing.expiresAt && new Date(existing.expiresAt).getTime() < Date.now()) {
        existing.premium = false;
        existing.status = 'expired';
        existing.updatedAt = new Date().toISOString();
        if (user) {
          user.isPremium = false;
          user.profile.isPremium = false;
        }
      }
      return existing;
    }

    // Fallback if legacy isPremium is set on user
    const isPrem = !!user?.isPremium;
    const defaultEntitlement: UserEntitlement = {
      userId,
      premium: isPrem,
      provider: isPrem ? 'stripe' : 'none',
      status: isPrem ? 'active' : 'none',
      expiresAt: user?.premiumExpiresAt,
      autoRenew: isPrem,
      lastVerifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.localStoreSubscriptions.set(userId, defaultEntitlement);
    return defaultEntitlement;
  }

  public async recordStoreEntitlement(entitlement: UserEntitlement): Promise<UserEntitlement> {
    if (this.pgAdapter) {
      await this.pgAdapter.upsertStoreSubscription(entitlement);
    }

    const user = this.users.get(entitlement.userId);
    if (user) {
      user.isPremium = entitlement.premium;
      user.profile.isPremium = entitlement.premium;
      if (entitlement.premium && entitlement.expiresAt) {
        user.premiumExpiresAt = entitlement.expiresAt;
        user.profile.premiumTier = entitlement.planTier === 'yearly' ? 'VIP_ANNUAL' : 'VIP_MONTHLY';
      } else if (!entitlement.premium) {
        delete user.premiumExpiresAt;
        user.profile.premiumTier = undefined;
      }
      user.updatedAt = new Date().toISOString();
      this.users.set(entitlement.userId, user);
    }

    this.localStoreSubscriptions.set(entitlement.userId, entitlement);
    this.saveToDisk();
    return entitlement;
  }

  public async findUserByPurchaseTokenHash(tokenHash: string): Promise<UserAccount | null> {
    if (this.pgAdapter) {
      const uid = await this.pgAdapter.findUserByPurchaseTokenHash(tokenHash);
      if (uid) return this.getUserById(uid) || ({ id: uid } as any);
    }
    for (const [userId, ent] of this.localStoreSubscriptions.entries()) {
      if (ent.purchaseTokenHash === tokenHash) {
        return this.users.get(userId) || ({ id: userId } as any);
      }
    }
    return null;
  }

  public async findUserByOriginalTransactionId(origId: string): Promise<UserAccount | null> {
    if (this.pgAdapter) {
      const uid = await this.pgAdapter.findUserByOriginalTransactionId(origId);
      if (uid) return this.getUserById(uid) || ({ id: uid } as any);
    }
    for (const [userId, ent] of this.localStoreSubscriptions.entries()) {
      if (ent.originalTransactionId === origId) {
        return this.users.get(userId) || ({ id: userId } as any);
      }
    }
    return null;
  }

  public async isStoreEventProcessed(provider: string, externalEventId: string): Promise<boolean> {
    if (this.pgAdapter) {
      return this.pgAdapter.isStoreEventProcessed(provider, externalEventId);
    }
    const key = `${provider}:${externalEventId}`;
    return this.localStoreEvents.has(key);
  }

  public async recordStoreBillingEvent(
    id: string,
    provider: string,
    externalEventId: string,
    eventType: string,
    metadata?: any
  ): Promise<boolean> {
    if (this.pgAdapter) {
      return this.pgAdapter.recordStoreBillingEvent(id, provider, externalEventId, eventType, metadata);
    }
    const key = `${provider}:${externalEventId}`;
    this.localStoreEvents.add(key);
    this.saveToDisk();
    return true;
  }

  public async getUserById(userId: string): Promise<UserAccount | null> {
    if (this.pgAdapter) {
      const u = await this.pgAdapter.getUserById(userId);
      if (u) {
        this.users.set(u.id, u);
        return u;
      }
    }
    return this.users.get(userId) || null;
  }

  public async setUserPremium(userId: string, isPremium: boolean): Promise<UserAccount> {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');
    user.isPremium = isPremium;
    if (isPremium) {
      user.premiumExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    } else {
      delete user.premiumExpiresAt;
    }
    user.updatedAt = new Date().toISOString();
    this.users.set(userId, user);
    this.saveToDisk();
    return user;
  }

  public async getProfileById(targetUserId: string, requestingUserId?: string): Promise<UserProfile | null> {
    const targetUser = this.users.get(targetUserId);
    if (!targetUser || targetUser.status !== 'ACTIVE') {
      return null;
    }

    if (requestingUserId && (await this.isBlocked(requestingUserId, targetUserId))) {
      return null;
    }

    return this.sanitizeProfilePrivacy(targetUser.profile, requestingUserId);
  }

  // --- Profile Methods ---
  public async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');
    if (user.status !== 'ACTIVE') throw new Error(`User account is ${user.status.toLowerCase()}`);

    // Whitelist allowed fields ONLY. Prevent role/verified/status/id tampering.
    const allowedKeys: (keyof UserProfile)[] = [
      'displayName',
      'bio',
      'heightCm',
      'weightKg',
      'relationshipStatus',
      'lookingFor',
      'tribes',
      'interests',
      'instagramHandle',
      'spotifyTopArtist',
      'identityRole',
      'locationPrivacy',
      'approximateArea',
      'location'
    ];

    const safeProfileUpdates: Partial<UserProfile> = {};
    for (const key of allowedKeys) {
      if (updates[key] !== undefined) {
        if (typeof updates[key] === 'string') {
          (safeProfileUpdates as any)[key] = (updates[key] as string).replace(/<[^>]*>?/gm, '').trim();
        } else {
          (safeProfileUpdates as any)[key] = updates[key];
        }
      }
    }

    user.profile = {
      ...user.profile,
      ...safeProfileUpdates,
      userId
    };

    user.updatedAt = new Date().toISOString();
    this.saveToDisk();

    if (this.pgAdapter) {
      await this.pgAdapter.saveUser(user);
    }

    return user.profile;
  }

  public async addProfilePhoto(userId: string, url: string, isPrimary: boolean = false): Promise<UserProfile> {
    const user = await this.getUserById(userId);
    if (!user) throw new Error('User not found');

    const cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://') && !cleanUrl.startsWith('data:image/') && !cleanUrl.startsWith('/api/media/')) {
      throw new Error('Invalid image URL format');
    }

    // SVG XSS prevention
    if (cleanUrl.includes('image/svg+xml') || cleanUrl.includes('<script')) {
      throw new Error('Dangerous or unsupported image payload');
    }

    const newPhoto = {
      id: `ph-${Date.now()}`,
      url: cleanUrl,
      isPrimary: isPrimary || user.profile.photos.length === 0
    };

    if (newPhoto.isPrimary) {
      user.profile.photos.forEach(p => (p.isPrimary = false));
    }

    user.profile.photos.push(newPhoto);
    user.updatedAt = new Date().toISOString();
    this.saveToDisk();

    if (this.pgAdapter) {
      await this.pgAdapter.saveUser(user);
    }

    return user.profile;
  }

  public async deleteProfilePhoto(userId: string, photoId: string): Promise<UserProfile> {
    const user = await this.getUserById(userId);
    if (!user) throw new Error('User not found');

    user.profile.photos = user.profile.photos.filter(p => p.id !== photoId);
    if (user.profile.photos.length > 0 && !user.profile.photos.some(p => p.isPrimary)) {
      user.profile.photos[0].isPrimary = true;
    }

    user.updatedAt = new Date().toISOString();
    this.saveToDisk();

    if (this.pgAdapter) {
      await this.pgAdapter.saveUser(user);
    }

    return user.profile;
  }

  // --- GDPR Subject Rights & Consents ---
  public async getUserConsents(userId: string): Promise<UserConsents> {
    if (this.pgAdapter) {
      const dbConsents = await this.pgAdapter.getUserConsents(userId);
      if (dbConsents) {
        this.consents.set(userId, dbConsents);
        return dbConsents;
      }
    }
    const existing = this.consents.get(userId);
    if (existing) return existing;

    const defaultConsents: UserConsents = {
      necessaryCookies: true,
      functionalCookies: true,
      analyticsCookies: false,
      explicitSpecialCategoryConsent: true,
      aiAssistanceConsent: true,
      locationProcessingConsent: true,
      termsAcceptedVersion: '2026.1',
      privacyPolicyAcceptedVersion: '2026.1',
      updatedAt: new Date().toISOString(),
      safeContentEnabled: true
    };
    this.consents.set(userId, defaultConsents);
    if (this.pgAdapter) {
      await this.pgAdapter.saveUserConsents(userId, defaultConsents);
    }
    this.saveToDisk();
    return defaultConsents;
  }

  public async updateUserConsents(userId: string, partial: Partial<UserConsents>): Promise<UserConsents> {
    const current = await this.getUserConsents(userId);
    const updated: UserConsents = {
      ...current,
      ...partial,
      necessaryCookies: true,
      updatedAt: new Date().toISOString()
    };
    this.consents.set(userId, updated);
    if (this.pgAdapter) {
      await this.pgAdapter.saveUserConsents(userId, updated);
    }
    this.saveToDisk();
    return updated;
  }

  public async exportUserData(userId: string): Promise<GdprExportData> {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');

    const consents = await this.getUserConsents(userId);
    const matches = this.matches.filter(m => m.user1Id === userId || m.user2Id === userId);
    const likesGiven = this.likes.filter(l => l.fromUserId === userId);
    const blockedUserIds = this.blocks.filter(b => b.blockerUserId === userId).map(b => b.blockedUserId);
    const reportsSubmitted = this.reports.filter(r => r.reporterUserId === userId);

    const userConvs = Array.from(this.conversations.values()).filter(c => c.participantIds.includes(userId));
    const allMessages: Message[] = [];
    userConvs.forEach(c => {
      // Excluded from backup by conversation-level privacy setting or Disable Auto-Backup
      if (c.excludeFromBackup || c.disableAutoBackup || c.settings?.excludeFromBackup || c.settings?.disableAutoBackup) return;
      const msgs = this.messages.get(c.id) || [];
      const now = Date.now();
      msgs.forEach(m => {
        // Exclude messages flagged as excludeFromBackup, disableAutoBackup or expired
        if (m.senderId === userId && !m.excludeFromBackup && !m.disableAutoBackup) {
          if (m.expiresAt && !m.isPermanent && new Date(m.expiresAt).getTime() <= now) {
            return;
          }
          allMessages.push(m);
        }
      });
    });

    const publishedMoments = this.moments.filter(m => m.userId === userId);

    const payloadWithoutChecksum = {
      exportTimestamp: new Date().toISOString(),
      dataSubject: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        isAgeVerified18Plus: user.isAgeVerified18Plus,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      profile: user.profile,
      consents,
      socialData: {
        matchesCount: matches.length,
        matches,
        likesCount: likesGiven.length,
        likesGiven,
        blocksCount: blockedUserIds.length,
        blockedUserIds,
        reportsCount: reportsSubmitted.length,
        reportsSubmitted
      },
      messages: {
        conversationsCount: userConvs.length,
        messagesSent: allMessages
      },
      moments: {
        publishedMoments
      }
    };

    const serialized = JSON.stringify(payloadWithoutChecksum);
    const checksumSha256 = crypto.createHash('sha256').update(serialized).digest('hex');

    return {
      ...payloadWithoutChecksum,
      checksumSha256
    };
  }

  /**
   * Generates an automated cloud backup snapshot of the system state,
   * strictly respecting conversation-level and message-level 'disableAutoBackup' flags.
   * Any conversation with disableAutoBackup (or excludeFromBackup) is completely excluded.
   */
  public performAutomatedCloudBackup(automated: boolean = true): CloudBackupRecord {
    const backupId = `cb-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const timestamp = new Date().toISOString();

    const allConversations = Array.from(this.conversations.values());
    const excludedConversationIds: string[] = [];
    const eligibleConversations: Conversation[] = [];
    const backedUpMessages: Message[] = [];
    const now = Date.now();

    for (const conv of allConversations) {
      const isAutoBackupDisabled = !!(
        conv.disableAutoBackup ||
        conv.settings?.disableAutoBackup ||
        conv.excludeFromBackup ||
        conv.settings?.excludeFromBackup
      );

      if (isAutoBackupDisabled) {
        excludedConversationIds.push(conv.id);
        continue;
      }

      eligibleConversations.push(conv);

      const convMessages = this.messages.get(conv.id) || [];
      for (const msg of convMessages) {
        if (msg.disableAutoBackup || msg.excludeFromBackup) {
          continue;
        }
        if (msg.expiresAt && !msg.isPermanent && new Date(msg.expiresAt).getTime() <= now) {
          continue;
        }
        backedUpMessages.push(msg);
      }
    }

    const backupPayload = {
      backupId,
      timestamp,
      automated,
      metadata: {
        totalUsers: this.users.size,
        totalConversations: allConversations.length,
        backedUpConversationsCount: eligibleConversations.length,
        excludedConversationsCount: excludedConversationIds.length,
        backedUpMessagesCount: backedUpMessages.length
      },
      conversations: eligibleConversations,
      messages: backedUpMessages,
      matches: this.matches,
      likes: this.likes,
      moments: this.moments
    };

    const serialized = JSON.stringify(backupPayload);
    const checksumSha256 = crypto.createHash('sha256').update(serialized).digest('hex');

    const backupDir = path.join(process.cwd(), 'data', 'backups');
    let backupFilePath: string | undefined;
    let backupSizeBytes: number | undefined;

    try {
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      backupFilePath = path.join(backupDir, `cloud_backup_${backupId}.json`);
      fs.writeFileSync(backupFilePath, serialized, 'utf-8');
      backupSizeBytes = Buffer.byteLength(serialized, 'utf-8');
    } catch (err) {
      console.warn('[DataStore] Notice: Unable to write local backup file (retaining in-memory snapshot):', err);
    }

    const record: CloudBackupRecord = {
      backupId,
      timestamp,
      status: 'SUCCESS',
      totalConversations: allConversations.length,
      backedUpConversations: eligibleConversations.length,
      excludedConversations: excludedConversationIds.length,
      excludedDueToDisableAutoBackup: excludedConversationIds.length,
      totalMessagesBackedUp: backedUpMessages.length,
      checksumSha256,
      backupSizeBytes,
      backupFilePath,
      automated,
      excludedConversationIds
    };

    this.cloudBackupHistory.unshift(record);
    if (this.cloudBackupHistory.length > 50) {
      this.cloudBackupHistory.pop();
    }

    return record;
  }

  public getLatestCloudBackup(): CloudBackupRecord | null {
    return this.cloudBackupHistory[0] || null;
  }

  public getCloudBackupHistory(): CloudBackupRecord[] {
    return [...this.cloudBackupHistory];
  }

  public getConversationsWithAutoBackupDisabled(): string[] {
    return Array.from(this.conversations.values())
      .filter(c => c.disableAutoBackup || c.settings?.disableAutoBackup || c.excludeFromBackup || c.settings?.excludeFromBackup)
      .map(c => c.id);
  }

  public getCloudBackupStatus(): CloudBackupStatus {
    const totalConversations = this.conversations.size;
    const disabledCount = this.getConversationsWithAutoBackupDisabled().length;
    return {
      serviceActive: true,
      lastBackup: this.getLatestCloudBackup(),
      totalConversations,
      conversationsWithAutoBackupDisabled: disabledCount,
      historyCount: this.cloudBackupHistory.length
    };
  }

  public async rectifyUserData(userId: string, updates: { email?: string; displayName?: string; bio?: string }): Promise<UserAccount> {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');

    if (updates.email) {
      const clean = updates.email.toLowerCase().trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) throw new Error('Invalid email format');
      const conflict = Array.from(this.users.values()).find(u => u.id !== userId && u.email === clean);
      if (conflict) throw new Error('Email is already taken by another account');
      user.email = clean;
    }

    if (updates.displayName) {
      user.profile.displayName = updates.displayName.replace(/<[^>]*>?/gm, '').trim();
    }

    if (updates.bio !== undefined) {
      user.profile.bio = updates.bio.replace(/<[^>]*>?/gm, '').trim();
    }

    user.updatedAt = new Date().toISOString();
    this.saveToDisk();
    return user;
  }

  public async restrictAccount(userId: string, reason: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) return false;

    user.status = 'SUSPENDED';
    user.updatedAt = new Date().toISOString();

    for (const [tok, session] of Array.from(this.sessions.entries())) {
      if (session.userId === userId) this.sessions.delete(tok);
    }
    for (const [tok, uid] of Array.from(this.tokens.entries())) {
      if (uid === userId) this.tokens.delete(tok);
    }

    this.saveToDisk();
    return true;
  }

  public async recordObjection(userId: string, reason: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) return false;

    const consents = await this.getUserConsents(userId);
    consents.aiAssistanceConsent = false;
    consents.analyticsCookies = false;
    consents.updatedAt = new Date().toISOString();
    this.consents.set(userId, consents);

    this.saveToDisk();
    return true;
  }

  public async eraseUserData(userId: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) return false;

    const userHash = crypto.createHash('sha256').update(userId).digest('hex');

    user.email = `erased-${userHash.slice(0, 12)}@deleted.aura.local`;
    user.status = 'DELETED';
    user.updatedAt = new Date().toISOString();

    user.profile = {
      id: user.profile.id,
      userId: userId,
      displayName: 'Deleted Member',
      age: 0,
      identityRole: 'Unspecified',
      location: 'Account Deleted',
      distanceKm: 0,
      bio: 'This account has been permanently erased under GDPR Article 17.',
      lookingFor: [],
      tribes: [],
      interests: [],
      photos: [],
      verified: false,
      isOnline: false,
      lastActiveMinutesAgo: 999999
    };

    this.moments = this.moments.filter(m => m.userId !== userId);
    this.likes = this.likes.filter(l => l.fromUserId !== userId && l.toUserId !== userId);

    for (const [tok, session] of Array.from(this.sessions.entries())) {
      if (session.userId === userId) this.sessions.delete(tok);
    }
    for (const [tok, uid] of Array.from(this.tokens.entries())) {
      if (uid === userId) this.tokens.delete(tok);
    }

    this.localStoreSubscriptions.delete(userId);

    this.erasureAuditLog.push({
      hashId: userHash,
      erasedAt: new Date().toISOString(),
      reason: 'GDPR_ART_17_RIGHT_TO_ERASURE'
    });

    // GDPR Right to Erasure: Purge all uploaded binary media and records
    try {
      purgeAllUserMedia(userId);
    } catch (e) {
      // ignore
    }

    this.saveToDisk();
    return true;
  }

  // --- DSA Compliance: Reports, Moderation & Appeals ---
  public async submitDsaReport(
    reporterUserId: string,
    reportedUserId: string,
    reason: DsaReportReason,
    details?: string
  ): Promise<ReportRecord> {
    if (reporterUserId === reportedUserId) {
      throw new Error('Cannot report yourself');
    }

    const reportedUser = this.users.get(reportedUserId);
    if (!reportedUser) {
      throw new Error('Reported user does not exist');
    }

    const report: ReportRecord = {
      id: `dsa-rep-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      reporterUserId,
      reportedUserId,
      reason,
      details: details ? details.replace(/<[^>]*>?/gm, '').trim() : undefined,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      reportedProfile: this.sanitizeProfilePrivacy(reportedUser.profile)
    };

    this.reports.push(report);
    this.saveToDisk();
    if (this.pgAdapter && typeof (this.pgAdapter as any).saveReport === "function") { await (this.pgAdapter as any).saveReport({ id: report.id, reporterUserId: report.reporterUserId, reportedUserId: report.reportedUserId, reason: report.reason, details: report.details, status: report.status, createdAt: report.createdAt }); }
    return report;
  }

  public async getUserSubmittedReports(reporterUserId: string): Promise<ReportRecord[]> {
    return this.reports.filter(r => r.reporterUserId === reporterUserId);
  }

  public async adminDecideReport(
    adminId: string,
    reportId: string,
    decision: 'SUSPEND_ACCOUNT' | 'REMOVE_CONTENT' | 'WARNING' | 'DISMISSED',
    legalBasis: string,
    statementOfReasons: string
  ): Promise<ModerationNotice> {
    const report = this.reports.find(r => r.id === reportId);
    if (!report) throw new Error('Report not found');

    report.status = decision === 'DISMISSED' ? 'DISMISSED' : 'RESOLVED';

    if (decision === 'SUSPEND_ACCOUNT') {
      this.suspendUser(report.reportedUserId);
    }

    const deadline = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();
    const notice: ModerationNotice = {
      id: `notice-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      reportId,
      targetUserId: report.reportedUserId,
      decision,
      reason: report.reason,
      legalBasis: legalBasis.trim(),
      statementOfReasons: statementOfReasons.trim(),
      createdAt: new Date().toISOString(),
      appealStatus: 'NONE',
      appealDeadline: deadline
    };

    this.moderationNotices.push(notice);
    if (this.pgAdapter) {
      await this.pgAdapter.saveModerationNotice(notice);
    }

    await this.logAdminAction(
      adminId,
      decision === 'DISMISSED' ? 'DISMISS_REPORT' : 'RESOLVE_REPORT',
      report.reportedUserId,
      `Report decision: ${decision}. Basis: ${legalBasis}`,
      { reportId, statementOfReasons }
    );

    this.saveToDisk();
    return notice;
  }

  public async getModerationNoticesForUser(userId: string): Promise<ModerationNotice[]> {
    if (this.pgAdapter) {
      return await this.pgAdapter.getModerationNotices(userId);
    }
    return this.moderationNotices.filter(n => n.targetUserId === userId);
  }

  public async submitDsaAppeal(userId: string, noticeId: string, appealReason: string): Promise<DsaAppealRecord> {
    const notice = this.moderationNotices.find(n => n.id === noticeId && n.targetUserId === userId);
    if (!notice) {
      throw new Error('Moderation notice not found or unauthorized');
    }

    if (new Date(notice.appealDeadline).getTime() < Date.now()) {
      throw new Error('Appeal deadline of 6 months has expired under DSA Article 20');
    }

    const appeal: DsaAppealRecord = {
      id: `appeal-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      noticeId,
      userId,
      appealReason: appealReason.replace(/<[^>]*>?/gm, '').trim(),
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };

    notice.appealStatus = 'PENDING';
    this.appeals.push(appeal);
    this.saveToDisk();
    if (this.pgAdapter) {
      await this.pgAdapter.saveDsaAppeal(appeal);
    }
    return appeal;
  }

  public async getDsaAppeals(): Promise<DsaAppealRecord[]> {
    if (this.pgAdapter) {
      return await this.pgAdapter.getDsaAppeals();
    }
    return this.appeals;
  }

  public async adminDecideAppeal(
    adminId: string,
    appealId: string,
    outcome: 'UPHELD' | 'OVERTURNED',
    decisionNotes: string
  ): Promise<DsaAppealRecord> {
    const appeal = this.appeals.find(a => a.id === appealId);
    if (!appeal) throw new Error('Appeal not found');

    appeal.status = outcome;
    appeal.adminDecisionNotes = decisionNotes.trim();
    appeal.decidedAt = new Date().toISOString();

    const notice = this.moderationNotices.find(n => n.id === appeal.noticeId);
    if (notice) {
      notice.appealStatus = outcome;
    }

    if (outcome === 'OVERTURNED') {
      const user = this.users.get(appeal.userId);
      if (user && user.status === 'SUSPENDED') {
        user.status = 'ACTIVE';
        user.updatedAt = new Date().toISOString();
        if (this.pgAdapter) {
          await this.pgAdapter.updateUserStatus(user.id, 'ACTIVE');
        }
      }
    }

    if (this.pgAdapter) {
      await this.pgAdapter.updateDsaAppeal(appealId, outcome, decisionNotes);
    }

    await this.logAdminAction(
      adminId,
      'APPEAL_DECISION',
      appeal.userId,
      `Appeal ${appealId} outcome: ${outcome}`,
      { appealId, decisionNotes }
    );

    this.saveToDisk();
    return appeal;
  }

  public async logAdminAction(
    adminId: string,
    action: AdminAuditLog['action'],
    targetUserId?: string,
    reason?: string,
    details?: Record<string, any>
  ): Promise<AdminAuditLog> {
    const log: AdminAuditLog = {
      id: `audit-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      adminId,
      targetUserId,
      action,
      reason,
      details,
      createdAt: new Date().toISOString()
    };
    this.adminAuditLogs.push(log);
    this.saveToDisk();
    if (this.pgAdapter) {
      await this.pgAdapter.saveAdminAuditLog(log);
    }
    return log;
  }

  public async getAdminAuditLogs(): Promise<AdminAuditLog[]> {
    if (this.pgAdapter) {
      return await this.pgAdapter.getAdminAuditLogs();
    }
    return this.adminAuditLogs;
  }


  // --- Discovery Feed & Filtering ---
  public async getDiscoverFeed(currentUserId: string, filters?: Partial<FilterState>): Promise<UserProfile[]> {
    // Get list of blocked user IDs
    const blockedUserIds = new Set<string>();
    this.blocks.forEach(b => {
      if (b.blockerUserId === currentUserId) blockedUserIds.add(b.blockedUserId);
      if (b.blockedUserId === currentUserId) blockedUserIds.add(b.blockerUserId);
    });

    let eligible = Array.from(this.users.values())
      .filter(u => u.id !== currentUserId)
      .filter(u => u.status === 'ACTIVE')
      .filter(u => !blockedUserIds.has(u.id))
      .map(u => u.profile);

    const filtered = filters
      ? eligible.filter(p => {
          if (filters.minAge && p.age < filters.minAge) return false;
          if (filters.maxAge && p.age > filters.maxAge) return false;
          if (filters.maxDistanceKm && p.distanceKm > filters.maxDistanceKm) return false;
          if (filters.verifiedOnly && !p.verified) return false;
          if (filters.onlineOnly && !p.isOnline) return false;
          if (filters.hasPhotosOnly && p.photos.length === 0) return false;
          if (filters.roles && filters.roles.length > 0) {
            if (!filters.roles.includes(p.identityRole)) return false;
          }
          if (filters.tribes && filters.tribes.length > 0) {
            const hasTribe = p.tribes.some(t => filters.tribes?.includes(t));
            if (!hasTribe) return false;
          }
          return true;
        })
      : eligible;

    return filtered.map(p => this.sanitizeProfilePrivacy(p));
  }

  /**
   * Sanitizes user coordinates to enforce privacy-safe location:
   * - HIDDEN: completely removes latitude and longitude
   * - EXACT: retains coordinates only with explicit permission
   * - APPROXIMATE (Default): applies deterministic ~1.5km fuzzy offset
   * Never exposes exact physical address to other users.
   */
  public sanitizeProfilePrivacy(profile: UserProfile, viewerUserId?: string): UserProfile {
    const privacy = profile.locationPrivacy || 'APPROXIMATE';
    const isOwner = viewerUserId && (viewerUserId === profile.userId || viewerUserId === profile.id);
    const hasVault = isOwner || (viewerUserId ? this.hasVaultAccess(profile.userId, viewerUserId) : false);

    const sanitizePhotos = (photos: any[]) => {
      return (photos || []).map(p => {
        if (p.isPrivate && !hasVault) {
          return {
            ...p,
            isLocked: true
          };
        }
        return {
          ...p,
          isLocked: false
        };
      });
    };

    if (privacy === 'HIDDEN') {
      const copy = { ...profile };
      delete copy.lat;
      delete copy.lng;
      copy.locationPrivacy = 'HIDDEN';
      copy.approximateArea = 'Location Hidden';
      copy.distanceKm = Math.round(profile.distanceKm || 0);
      copy.photos = sanitizePhotos(profile.photos);
      return copy;
    }

    if (privacy === 'EXACT') {
      const copy = { ...profile };
      copy.locationPrivacy = 'EXACT';
      copy.approximateArea = 'Exact (Permission Granted)';
      copy.distanceKm = Math.round((profile.distanceKm || 0) * 1000) / 1000;
      if (copy.lat !== undefined) {
        copy.lat = Math.round(copy.lat * 1000) / 1000;
      }
      if (copy.lng !== undefined) {
        copy.lng = Math.round(copy.lng * 1000) / 1000;
      }
      copy.photos = sanitizePhotos(profile.photos);
      return copy;
    }

    // Default: APPROXIMATE
    const copy = { ...profile };
    copy.locationPrivacy = 'APPROXIMATE';
    copy.photos = sanitizePhotos(profile.photos);

    if (profile.lat !== undefined && profile.lng !== undefined) {
      let hash = 0;
      const str = (profile.userId || profile.id) + 'aura-privacy-salt-2026';
      for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
      }
      const angle = (Math.abs(hash) % 360) * (Math.PI / 180);
      const offsetKm = 1.2 + ((Math.abs(hash >> 3) % 100) / 100) * 1.0;
      const latOffset = (offsetKm / 111.0) * Math.cos(angle);
      const lngOffset =
        (offsetKm / (111.0 * Math.cos(((profile.lat || 34) * Math.PI) / 180))) * Math.sin(angle);

      copy.lat = Math.round((profile.lat + latOffset) * 1000) / 1000;
      copy.lng = Math.round((profile.lng + lngOffset) * 1000) / 1000;
    }

    const dist = profile.distanceKm !== undefined ? profile.distanceKm : 1;
    if (dist <= 0.02) {
      copy.approximateArea = '~15m far';
    } else if (dist <= 0.045) {
      copy.approximateArea = '~30m far';
    } else if (dist < 1) {
      copy.approximateArea = `~${Math.round(dist * 1000)}m`;
    } else {
      copy.approximateArea = `Within ~${Math.round(dist)} km`;
    }
    copy.distanceKm = dist;
    return copy;
  }

  // --- Social Interactions (Like, Match, Block, Report) ---
  public async likeUser(fromUserId: string, toUserId: string, isSuperLike: boolean = false): Promise<{ isMatch: boolean; match?: MatchRecord }> {
    if (fromUserId === toUserId) {
      throw new Error('Cannot like yourself');
    }

    if (await this.isBlocked(fromUserId, toUserId)) {
      throw new Error('Action blocked by user policy');
    }

    let likeRecord: LikeRecord | undefined = this.likes.find(l => l.fromUserId === fromUserId && l.toUserId === toUserId);
    if (!likeRecord) {
      likeRecord = {
        id: `like-${Date.now()}`,
        fromUserId,
        toUserId,
        isSuperLike,
        createdAt: new Date().toISOString()
      };
      this.likes.push(likeRecord);
      if (this.pgAdapter) {
        await this.pgAdapter.saveLike(likeRecord);
      }
    }

    // Check mutual like
    const reciprocalLike = this.likes.find(l => l.fromUserId === toUserId && l.toUserId === fromUserId);
    if (reciprocalLike) {
      let match = this.matches.find(m => (m.user1Id === fromUserId && m.user2Id === toUserId) || (m.user1Id === toUserId && m.user2Id === fromUserId));
      if (!match) {
        const targetUser = this.users.get(toUserId);
        match = {
          id: `match-${Date.now()}`,
          user1Id: fromUserId,
          user2Id: toUserId,
          createdAt: new Date().toISOString(),
          matchedProfile: targetUser?.profile
        };
        this.matches.push(match);
        if (this.pgAdapter) {
          await this.pgAdapter.saveMatch(match);
        }

        // Auto create conversation
        await this.getOrCreateConversation(fromUserId, toUserId);
      }
      this.saveToDisk();
      return { isMatch: true, match };
    }

    this.saveToDisk();
    return { isMatch: false };
  }

  public async blockUser(blockerUserId: string, blockedUserId: string): Promise<BlockRecord> {
    if (blockerUserId === blockedUserId) {
      throw new Error('Cannot block yourself');
    }

    const existing = this.blocks.find(b => b.blockerUserId === blockerUserId && b.blockedUserId === blockedUserId);
    if (existing) return existing;

    const record: BlockRecord = {
      id: `block-${Date.now()}`,
      blockerUserId,
      blockedUserId,
      createdAt: new Date().toISOString()
    };
    this.blocks.push(record);
    if (this.pgAdapter) {
      await this.pgAdapter.saveBlock(record);
    }
    this.saveToDisk();
    return record;
  }

  public async unblockUser(blockerUserId: string, blockedUserId: string): Promise<boolean> {
    const initialLen = this.blocks.length;
    this.blocks = this.blocks.filter(b => !(b.blockerUserId === blockerUserId && b.blockedUserId === blockedUserId));
    const changed = this.blocks.length < initialLen;
    if (this.pgAdapter) {
      await this.pgAdapter.unblockUser(blockerUserId, blockedUserId);
    }
    if (changed) this.saveToDisk();
    return changed;
  }

  public async getBlockedUsers(userId: string): Promise<UserProfile[]> {
    const blockedIds = this.blocks.filter(b => b.blockerUserId === userId).map(b => b.blockedUserId);
    return blockedIds.map(id => this.users.get(id)?.profile).filter((p): p is UserProfile => !!p);
  }

  public async isBlocked(userA: string, userB: string): Promise<boolean> {
    if (this.pgAdapter && typeof (this.pgAdapter as any).isBlocked === "function") {
      return (this.pgAdapter as any).isBlocked(userA, userB);
    }
    return this.blocks.some(b => 
      (b.blockerUserId === userA && b.blockedUserId === userB) ||
      (b.blockerUserId === userB && b.blockedUserId === userA)
    );
  }

  public async reportItem(
    reporterUserId: string,
    reportedUserId: string,
    reason: string,
    details?: string,
    reportedMessageId?: string,
    reportedMediaId?: string
  ): Promise<ReportRecord> {
    if (reporterUserId === reportedUserId) {
      throw new Error('Cannot report yourself');
    }

    const reportedUser = await this.getUserById(reportedUserId);
    const report: ReportRecord = {
      id: `rep-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      reporterUserId,
      reportedUserId,
      reason: reason.trim(),
      details: details ? details.trim() : undefined,
      reportedMessageId,
      reportedMediaId,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      reportedProfile: reportedUser?.profile
    };
    this.reports.push(report);
    if (this.pgAdapter) {
      await this.pgAdapter.saveReport(report);
    }
    this.saveToDisk();
    return report;
  }

  public async reportUser(reporterUserId: string, reportedUserId: string, reason: string, details?: string): Promise<ReportRecord> {
    return this.reportItem(reporterUserId, reportedUserId, reason, details);
  }

  // --- Vault Access Control ---
  public async grantVaultAccess(ownerId: string, targetUserId: string, grant: boolean): Promise<boolean> {
    if (!this.vaultAccess.has(ownerId)) {
      this.vaultAccess.set(ownerId, new Set());
    }
    const granted = this.vaultAccess.get(ownerId)!;
    if (grant) {
      granted.add(targetUserId);
      if (this.vaultRequests.has(ownerId)) {
        this.vaultRequests.get(ownerId)!.delete(targetUserId);
      }
    } else {
      granted.delete(targetUserId);
    }
    this.saveToDisk();
    return grant;
  }

  public async requestVaultAccess(requesterId: string, targetUserId: string): Promise<boolean> {
    if (!this.vaultRequests.has(targetUserId)) {
      this.vaultRequests.set(targetUserId, new Set());
    }
    this.vaultRequests.get(targetUserId)!.add(requesterId);
    this.saveToDisk();
    return true;
  }

  public hasVaultAccess(ownerId: string, viewerUserId: string): boolean {
    if (ownerId === viewerUserId) return true;
    return !!this.vaultAccess.get(ownerId)?.has(viewerUserId);
  }

  public isVaultRequested(requesterId: string, targetUserId: string): boolean {
    return !!this.vaultRequests.get(targetUserId)?.has(requesterId);
  }

  // --- Conversations & Messaging ---
  public async getOrCreateConversation(userAId: string, userBId: string): Promise<Conversation> {
    const convKey = [userAId, userBId].sort().join('_');
    let conv = Array.from(this.conversations.values()).find(c => {
      const sorted = [...c.participantIds].sort().join('_');
      return sorted === convKey;
    });

    if (!conv) {
      const otherUser = this.users.get(userBId);
      if (!otherUser) throw new Error('Recipient user not found');

      conv = {
        id: `conv-${Date.now()}`,
        participantIds: [userAId, userBId],
        unreadCount: 0,
        otherParticipant: this.sanitizeProfilePrivacy(otherUser.profile, userAId)
      };
      this.conversations.set(conv.id, conv);
      this.messages.set(conv.id, []);
      this.saveToDisk();
    }

    if (this.pgAdapter && typeof (this.pgAdapter as any).saveConversation === "function") { await (this.pgAdapter as any).saveConversation({ id: conv.id, participants: conv.participantIds, isMatch: false, createdAt: new Date().toISOString() }); }
    return conv;
  }

  public async getUserConversations(userId: string): Promise<Conversation[]> {
    const blockedUserIds = new Set(
      this.blocks
        .filter(b => b.blockerUserId === userId || b.blockedUserId === userId)
        .map(b => (b.blockerUserId === userId ? b.blockedUserId : b.blockerUserId))
    );

    return Array.from(this.conversations.values())
      .filter(c => c.participantIds.includes(userId))
      .filter(c => {
        const otherId = c.participantIds.find(id => id !== userId);
        if (!otherId) return false;
        if (blockedUserIds.has(otherId)) return false;
        const otherUser = this.users.get(otherId);
        return otherUser && otherUser.status === 'ACTIVE';
      })
      .map(c => {
        const otherId = c.participantIds.find(id => id !== userId)!;
        const otherProfile = this.sanitizeProfilePrivacy(this.users.get(otherId)!.profile, userId);
        
        // Prune expired messages for this conversation
        this.pruneExpiredMessages(c.id);

        const convMsgs = this.messages.get(c.id) || [];
        const lastMsg = convMsgs[convMsgs.length - 1];
        const unreadCount = convMsgs.filter(m => m.receiverId === userId && m.status !== 'READ').length;

        return {
          ...c,
          otherParticipant: otherProfile,
          lastMessage: lastMsg,
          unreadCount,
          vaultAccessGranted: this.hasVaultAccess(userId, otherId),
          vaultAccessReceived: this.hasVaultAccess(otherId, userId),
          vaultRequested: this.isVaultRequested(userId, otherId)
        };
      })
      .sort((a, b) => {
        const tA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
        const tB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
        return tB - tA;
      });
  }

  public async getConversation(conversationId: string): Promise<Conversation | null> {
    return this.conversations.get(conversationId) || null;
  }

  public async updateConversationSettings(
    conversationId: string,
    userId: string,
    settings: { messageTtlSeconds?: number; excludeFromBackup?: boolean; disableAutoBackup?: boolean }
  ): Promise<Conversation> {
    const conv = this.conversations.get(conversationId);
    if (!conv || !conv.participantIds.includes(userId)) {
      throw new Error('Unauthorized conversation access');
    }
    if (!conv.settings) {
      conv.settings = {};
    }
    if (settings.messageTtlSeconds !== undefined) {
      conv.messageTtlSeconds = settings.messageTtlSeconds;
      conv.settings.messageTtlSeconds = settings.messageTtlSeconds;
    }
    if (settings.excludeFromBackup !== undefined) {
      conv.excludeFromBackup = settings.excludeFromBackup;
      conv.settings.excludeFromBackup = settings.excludeFromBackup;
    }
    if (settings.disableAutoBackup !== undefined) {
      conv.disableAutoBackup = settings.disableAutoBackup;
      conv.settings.disableAutoBackup = settings.disableAutoBackup;
      if (settings.disableAutoBackup) {
        conv.excludeFromBackup = true;
        conv.settings.excludeFromBackup = true;
      }
    }
    this.conversations.set(conversationId, conv);
    this.saveToDisk();
    return conv;
  }

  public async toggleMessagePermanent(messageId: string, conversationId: string, userId: string): Promise<Message> {
    const conv = this.conversations.get(conversationId);
    if (!conv || !conv.participantIds.includes(userId)) {
      throw new Error('Unauthorized conversation access');
    }
    const msgs = this.messages.get(conversationId) || [];
    const msg = msgs.find(m => m.id === messageId);
    if (!msg) {
      throw new Error('Message not found');
    }
    msg.isPermanent = !msg.isPermanent;
    if (msg.isPermanent) {
      delete msg.expiresAt;
    } else if (msg.ttlSeconds && msg.ttlSeconds > 0) {
      msg.expiresAt = new Date(new Date(msg.createdAt).getTime() + msg.ttlSeconds * 1000).toISOString();
    }
    this.saveToDisk();
    if (this.pgAdapter && typeof (this.pgAdapter as any).saveMessage === "function") { await (this.pgAdapter as any).saveMessage(msg); }
    return msg;
  }

  public async pruneExpiredMessages(conversationId: string): Promise<void> {
    const msgs = this.messages.get(conversationId);
    if (!msgs || msgs.length === 0) return;

    const now = Date.now();
    const active = msgs.filter(m => {
      if (m.isPermanent) return true;
      if (!m.expiresAt) return true;
      return new Date(m.expiresAt).getTime() > now;
    });

    if (active.length !== msgs.length) {
      this.messages.set(conversationId, active);
      const conv = this.conversations.get(conversationId);
      if (conv) {
        conv.lastMessage = active[active.length - 1];
        this.conversations.set(conversationId, conv);
      }
      this.saveToDisk();
    }
  }

  public async getMessages(conversationId: string, requestingUserId: string): Promise<Message[]> {
    let conv = this.conversations.get(conversationId);
    if (!conv && this.pgAdapter) {
      const all = await this.pgAdapter.loadAllConversations();
      conv = all.find(c => c.id === conversationId);
      if (conv) this.conversations.set(conv.id, conv);
    }
    if (!conv || !conv.participantIds.includes(requestingUserId)) {
      throw new Error('Unauthorized conversation access');
    }

    const otherId = conv.participantIds.find(id => id !== requestingUserId)!;
    if (await this.isBlocked(requestingUserId, otherId)) {
      throw new Error('Access blocked by user policy');
    }

    if (this.pgAdapter) {
      const dbMsgs = await this.pgAdapter.getMessages(conversationId);
      return dbMsgs.filter(m => {
        if (m.deletedStatus === 'deleted_for_everyone') return false;
        if (m.deletedForUserIds && m.deletedForUserIds.includes(requestingUserId)) return false;
        return true;
      });
    }

    this.pruneExpiredMessages(conversationId);
    const msgs = this.messages.get(conversationId) || [];

    // Filter out deleted messages for this user
    return msgs.filter(m => {
      if (m.deletedStatus === 'deleted_for_everyone') return false;
      if (m.deletedForUserIds && m.deletedForUserIds.includes(requestingUserId)) return false;
      return true;
    });
  }

  public async deleteMessage(
    conversationId: string,
    messageId: string,
    requestingUserId: string,
    mode: 'for_me' | 'for_everyone' = 'for_me'
  ): Promise<boolean> {
    const conv = this.conversations.get(conversationId);
    if (!conv || !conv.participantIds.includes(requestingUserId)) {
      throw new Error('Unauthorized conversation access');
    }

    const msgs = this.messages.get(conversationId) || [];
    const msg = msgs.find(m => m.id === messageId);
    if (!msg) {
      throw new Error('Message not found');
    }

    if (mode === 'for_everyone') {
      if (msg.senderId !== requestingUserId) {
        throw new Error('Only the sender can delete a message for everyone');
      }
      msg.deletedStatus = 'deleted_for_everyone';
      msg.text = 'This message was deleted';
      const mediaId = msg.photo?.mediaId || msg.voice?.mediaId || msg.starVideo?.mediaId;
      if (mediaId) {
        try {
          deleteMediaRecord(mediaId, requestingUserId);
        } catch (e) {
          // ignore
        }
      }
    } else {
      if (!msg.deletedForUserIds) {
        msg.deletedForUserIds = [];
      }
      if (!msg.deletedForUserIds.includes(requestingUserId)) {
        msg.deletedForUserIds.push(requestingUserId);
      }
      msg.deletedStatus = 'deleted_for_me';
    }

    this.saveToDisk();
    return true;
  }

  public async sendMessage(senderId: string, conversationId: string, payload: Partial<Message>): Promise<Message> {
    const conv = this.conversations.get(conversationId);
    if (!conv || !conv.participantIds.includes(senderId)) {
      throw new Error('Unauthorized conversation access');
    }

    const receiverId = conv.participantIds.find(id => id !== senderId)!;
    if (await this.isBlocked(senderId, receiverId)) {
      throw new Error('Cannot message a blocked user');
    }

    // Idempotency check: if clientMessageId provided, return existing message if found
    if (payload.clientMessageId && typeof payload.clientMessageId === 'string' && payload.clientMessageId.trim()) {
      const cleanKey = payload.clientMessageId.trim();
      if (this.pgAdapter) {
        const existingPg = await this.pgAdapter.getMessageByClientMessageId(conversationId, cleanKey);
        if (existingPg) return existingPg;
      }
      const existingMem = (this.messages.get(conversationId) || []).find(m => m.clientMessageId === cleanKey);
      if (existingMem) return existingMem;
    }

    const receiverUser = this.users.get(receiverId);
    if (!receiverUser || receiverUser.status !== 'ACTIVE') {
      throw new Error('Recipient account is not active');
    }

    const ttlSeconds = payload.ttlSeconds !== undefined ? payload.ttlSeconds : conv.messageTtlSeconds;
    let expiresAt: string | undefined = undefined;
    if (ttlSeconds && ttlSeconds > 0 && !payload.isPermanent) {
      expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    }

    // Media & payload backward-compatibility normalization
    let finalMedia = payload.media;
    let finalPhotoUrl = payload.photoUrl?.trim();
    if (payload.photo) {
      finalPhotoUrl = `/api/media/${payload.photo.mediaId}`;
      finalMedia = {
        url: `/api/media/${payload.photo.mediaId}`,
        mimeType: payload.photo.mimeType,
        width: payload.photo.width,
        height: payload.photo.height,
        sizeBytes: payload.photo.size,
        thumbnailUrl: payload.photo.thumbnailRef ? `/api/media/${payload.photo.mediaId}?thumb=true` : undefined
      };
    } else if (payload.voice) {
      finalMedia = {
        url: `/api/media/${payload.voice.mediaId}`,
        mimeType: payload.voice.mimeType,
        durationSeconds: payload.voice.duration,
        sizeBytes: payload.voice.size
      };
    } else if (payload.starVideo) {
      finalMedia = {
        url: `/api/media/${payload.starVideo.mediaId}`,
        mimeType: payload.starVideo.mimeType,
        durationSeconds: payload.starVideo.duration,
        width: payload.starVideo.width,
        height: payload.starVideo.height,
        sizeBytes: payload.starVideo.size,
        thumbnailUrl: payload.starVideo.thumbnailRef ? `/api/media/${payload.starVideo.mediaId}?thumb=true` : undefined
      };
    }

    let finalLocation = payload.location;
    if (payload.locationPayload) {
      finalLocation = {
        lat: payload.locationPayload.latitude,
        lng: payload.locationPayload.longitude,
        approximateArea: payload.locationPayload.label || payload.locationPayload.placeName
      };
    }

    let finalLinkPreview = payload.linkPreview;
    if (payload.link) {
      finalLinkPreview = {
        url: payload.link.normalizedUrl,
        domain: payload.link.domain,
        title: payload.link.title,
        thumbnailUrl: payload.link.thumbnailRef
      };
    }

    const newMessage: Message = {
      id: `msg-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      clientMessageId: payload.clientMessageId?.trim() || undefined,
      conversationId,
      senderId,
      receiverId,
      recipientId: receiverId,
      type: payload.type || 'TEXT',
      text: payload.text?.trim(),
      photoUrl: finalPhotoUrl,
      media: finalMedia,
      linkPreview: finalLinkPreview,
      location: finalLocation,
      photo: payload.photo,
      link: payload.link,
      locationPayload: payload.locationPayload,
      stickerPayload: payload.stickerPayload,
      voice: payload.voice,
      starVideo: payload.starVideo,
      stickerId: payload.stickerId || payload.stickerPayload?.stickerId,
      stickerUrl: payload.stickerUrl || payload.stickerPayload?.url,
      stickerName: payload.stickerName || payload.stickerPayload?.name,
      tapType: payload.tapType,
      vaultAction: payload.vaultAction,
      expiresAt,
      ttlSeconds,
      isPermanent: payload.isPermanent,
      excludeFromBackup: payload.excludeFromBackup ?? payload.disableAutoBackup ?? conv.disableAutoBackup ?? conv.settings?.disableAutoBackup ?? conv.excludeFromBackup ?? false,
      disableAutoBackup: payload.disableAutoBackup ?? conv.disableAutoBackup ?? conv.settings?.disableAutoBackup ?? false,
      status: 'DELIVERED',
      deliveryStatus: payload.deliveryStatus || 'delivered',
      readStatus: payload.readStatus || false,
      deletedStatus: payload.deletedStatus || 'none',
      deletedForUserIds: payload.deletedForUserIds || [],
      createdAt: new Date().toISOString()
    };

    const msgs = this.messages.get(conversationId) || [];
    msgs.push(newMessage);
    this.messages.set(conversationId, msgs);

    conv.lastMessage = newMessage;
    this.conversations.set(conversationId, conv);

    this.saveToDisk();

    if (this.pgAdapter) {
      await this.pgAdapter.saveMessage(newMessage);
      await this.pgAdapter.saveConversation(conv);
    }

    return newMessage;
  }

  public async sendTap(senderId: string, targetUserId: string, tapType: TapType): Promise<{ conversation: Conversation; message: Message }> {
    const conv = await this.getOrCreateConversation(senderId, targetUserId);
    const tapTexts: Record<TapType, string> = {
      HOT: '🔥 Wysłał Ci ogień!',
      WOOF: '🐾 Wysłał Ci Woof!',
      BOLT: '⚡ Wysłał Ci Aura Tap!',
      WAVE: '👋 Pomachał do Ciebie!'
    };
    const message = await this.sendMessage(senderId, conv.id, {
      type: 'TAP',
      tapType,
      text: tapTexts[tapType] || '⚡ Wysłał Ci Aura Tap!'
    });
    return { conversation: conv, message };
  }

  public async markMessagesRead(conversationId: string, userId: string): Promise<void> {
    const conv = this.conversations.get(conversationId);
    if (!conv || !conv.participantIds.includes(userId)) {
      return;
    }

    const msgs = this.messages.get(conversationId) || [];
    let updated = false;
    msgs.forEach(m => {
      if (m.receiverId === userId && m.status !== 'READ') {
        m.status = 'READ';
        updated = true;
      }
    });

    if (updated) {
      this.saveToDisk();
    }
  }

  // --- Matches ---
  public async getUserMatches(userId: string): Promise<MatchRecord[]> {
    const blockedUserIds = new Set(
      this.blocks
        .filter(b => b.blockerUserId === userId || b.blockedUserId === userId)
        .map(b => (b.blockerUserId === userId ? b.blockedUserId : b.blockerUserId))
    );

    const result: MatchRecord[] = [];
    for (const m of this.matches) {
      if (m.user1Id === userId || m.user2Id === userId) {
        const otherId = m.user1Id === userId ? m.user2Id : m.user1Id;
        if (blockedUserIds.has(otherId)) continue;
        const otherUser = this.users.get(otherId);
        if (!otherUser || otherUser.status !== 'ACTIVE') continue;
        result.push({
          ...m,
          matchedProfile: otherUser.profile
        });
      }
    }
    return result;
  }

  // --- Admin & Safety Moderation ---
  public async getReports(): Promise<ReportRecord[]> {
    return this.reports;
  }

  public async suspendUser(userId: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (user) {
      user.status = 'SUSPENDED';
      user.updatedAt = new Date().toISOString();
    }

    // Invalidate all tokens for this suspended user
    for (const [tok, uid] of Array.from(this.tokens.entries())) {
      if (uid === userId) this.tokens.delete(tok);
    }

    if (this.pgAdapter) {
      await this.pgAdapter.updateUserStatus(userId, 'SUSPENDED');
    }

    this.saveToDisk();
    return true;
  }

  public async softDeleteUser(userId: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (user) {
      user.status = 'DELETED';
      user.updatedAt = new Date().toISOString();
    }

    // Invalidate all tokens for this deleted user
    for (const [tok, uid] of Array.from(this.tokens.entries())) {
      if (uid === userId) this.tokens.delete(tok);
    }

    if (this.pgAdapter) {
      await this.pgAdapter.updateUserStatus(userId, 'DELETED');
    }

    this.saveToDisk();
    return true;
  }

  public async getAdminStats(): Promise<AdminStats> {
    const usersArr = Array.from(this.users.values());
    return {
      totalUsers: usersArr.length,
      activeUsers: usersArr.filter(u => u.status === 'ACTIVE').length,
      suspendedUsers: usersArr.filter(u => u.status === 'SUSPENDED').length,
      pendingReports: this.reports.filter(r => r.status === 'PENDING').length,
      totalMatches: this.matches.length,
      totalMessagesSent: Array.from(this.messages.values()).reduce((acc, m) => acc + m.length, 0)
    };
  }

  // --- Moments / Stories ---
  public async getMoments(userId: string): Promise<Moment[]> {
    const now = new Date();
    const blockedUserIds = new Set(
      this.blocks
        .filter(b => b.blockerUserId === userId || b.blockedUserId === userId)
        .map(b => (b.blockerUserId === userId ? b.blockedUserId : b.blockerUserId))
    );

    return this.moments
      .filter(m => new Date(m.expiresAt) > now)
      .filter(m => !blockedUserIds.has(m.userId))
      .filter(m => {
        if (m.userId === userId) return true;
        if (m.privacy === 'everyone') return true;
        if (m.privacy === 'specific' && m.allowedUserIds) {
          return m.allowedUserIds.includes(userId);
        }
        return true;
      })
      .map(m => {
        const creator = this.users.get(m.userId);
        return {
          ...m,
          creatorProfile: creator?.profile
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async createMoment(
    userId: string,
    data: { mediaUrl: string; mediaType?: 'photo' | 'video'; caption?: string; privacy?: 'everyone' | 'connections' | 'specific'; allowedUserIds?: string[] }
  ): Promise<Moment> {
    const newMoment: Moment = {
      id: `mom-${Date.now()}`,
      userId,
      mediaUrl: data.mediaUrl.trim(),
      mediaType: data.mediaType || 'photo',
      caption: data.caption ? data.caption.trim() : undefined,
      privacy: data.privacy || 'everyone',
      allowedUserIds: data.allowedUserIds,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // 24 hours
      viewsCount: 0,
      likesCount: 0,
      hasLiked: false
    };

    const creator = this.users.get(userId);
    newMoment.creatorProfile = creator?.profile;

    this.moments.unshift(newMoment);
    this.saveToDisk();
    if (this.pgAdapter) {
      await this.pgAdapter.saveMoment(newMoment);
    }
    return newMoment;
  }

  public async likeMoment(userId: string, momentId: string): Promise<boolean> {
    const mom = this.moments.find(m => m.id === momentId);
    if (!mom) return false;
    mom.likesCount = (mom.likesCount || 0) + 1;
    mom.hasLiked = true;
    this.saveToDisk();
    if (this.pgAdapter) {
      await this.pgAdapter.saveMoment(mom);
    }
    return true;
  }

  public async viewMoment(userId: string, momentId: string): Promise<boolean> {
    const mom = this.moments.find(m => m.id === momentId);
    if (!mom) return false;
    mom.viewsCount = (mom.viewsCount || 0) + 1;
    this.saveToDisk();
    if (this.pgAdapter) {
      await this.pgAdapter.saveMoment(mom);
    }
    return true;
  }

  public async deleteMoment(userId: string, momentId: string): Promise<boolean> {
    const idx = this.moments.findIndex(m => m.id === momentId && m.userId === userId);
    if (idx === -1) return false;
    this.moments.splice(idx, 1);
    this.saveToDisk();
    if (this.pgAdapter) {
      await this.pgAdapter.deleteMoment(momentId, userId);
    }
    return true;
  }
}

export const store = new DataStore();
export function getStore(): DataStore {
  return store;
}
