import { Pool, PoolConfig } from 'pg';
import crypto from 'crypto';
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
  GdprExportData,
  UserEntitlement
} from '../types';

let pgPool: Pool | null = null;
let isInitialized = false;

/**
 * Validates configuration and returns connection pool suitable for Cloud Run and PostgreSQL.
 */
export function getPostgresPool(): Pool | null {
  if (pgPool) return pgPool;

  const databaseUrl = process.env.DATABASE_URL;
  const sqlHost = process.env.SQL_HOST;
  const sqlUser = process.env.SQL_USER;
  const sqlPassword = process.env.SQL_PASSWORD;
  const sqlDbName = process.env.SQL_DB_NAME;

  let poolConfig: PoolConfig | null = null;

  if (databaseUrl) {
    poolConfig = {
      connectionString: databaseUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: process.env.NODE_ENV === 'production' && !databaseUrl.includes('localhost')
        ? { rejectUnauthorized: false }
        : false
    };
  } else if (sqlHost && sqlUser && sqlDbName) {
    poolConfig = {
      host: sqlHost,
      user: sqlUser,
      password: sqlPassword || '',
      database: sqlDbName,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    };
  }

  if (!poolConfig) {
    return null;
  }

  try {
    pgPool = new Pool(poolConfig);
    pgPool.on('error', (err) => {
      console.error('[PostgreSQL Pool] Unexpected error on idle client:', err.message);
    });
    return pgPool;
  } catch (err: any) {
    console.error('[PostgreSQL Pool] Initialization error:', err.message);
    return null;
  }
}

/**
 * Auto-creates tables and migrations safely.
 */
export async function initPostgresSchema(): Promise<boolean> {
  const pool = getPostgresPool();
  if (!pool) return false;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(128) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        display_name VARCHAR(255) NOT NULL,
        age INT NOT NULL,
        role VARCHAR(32) DEFAULT 'USER',
        status VARCHAR(32) DEFAULT 'ACTIVE',
        bio TEXT,
        sexual_role VARCHAR(32),
        tribe VARCHAR(64),
        looking_for VARCHAR(64),
        vibe VARCHAR(64),
        interests JSONB DEFAULT '[]'::jsonb,
        location JSONB DEFAULT '{}'::jsonb,
        photos JSONB DEFAULT '[]'::jsonb,
        is_verified BOOLEAN DEFAULT FALSE,
        is_premium BOOLEAN DEFAULT FALSE,
        premium_tier VARCHAR(64),
        privacy JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS user_passwords (
        user_id VARCHAR(128) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        salt_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS password_resets (
        token VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sessions (
        token VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMPTZ NOT NULL,
        last_used_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS user_consents (
        user_id VARCHAR(128) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        gdpr_accepted BOOLEAN NOT NULL DEFAULT TRUE,
        age_verified_18_plus BOOLEAN NOT NULL DEFAULT TRUE,
        privacy_policy_version VARCHAR(32) DEFAULT '2.0.0',
        terms_version VARCHAR(32) DEFAULT '2.0.0',
        dsa_accepted BOOLEAN NOT NULL DEFAULT TRUE,
        timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(128)
      );

      CREATE TABLE IF NOT EXISTS likes (
        id VARCHAR(128) PRIMARY KEY,
        from_user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        to_user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        is_super_like BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS matches (
        id VARCHAR(128) PRIMARY KEY,
        user1_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user2_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        is_super_match BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS blocks (
        id VARCHAR(128) PRIMARY KEY,
        blocker_user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        blocked_user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS reports (
        id VARCHAR(128) PRIMARY KEY,
        reporter_user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reported_user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reason VARCHAR(128) NOT NULL,
        details TEXT,
        status VARCHAR(32) DEFAULT 'PENDING',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS conversations (
        id VARCHAR(128) PRIMARY KEY,
        participant_ids JSONB NOT NULL,
        last_message_text TEXT,
        last_message_timestamp TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(128) PRIMARY KEY,
        conversation_id VARCHAR(128) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        sender_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        receiver_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        text TEXT,
        type VARCHAR(32) DEFAULT 'TEXT',
        media JSONB,
        status VARCHAR(32) DEFAULT 'SENT',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS moments (
        id VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        media_url TEXT NOT NULL,
        caption TEXT,
        expires_at TIMESTAMPTZ NOT NULL,
        likes_count INT DEFAULT 0,
        views_count INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS subscriptions (
        id VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        stripe_customer_id VARCHAR(255),
        stripe_subscription_id VARCHAR(255),
        status VARCHAR(64) DEFAULT 'active',
        plan_id VARCHAR(64),
        current_period_end TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS store_subscriptions (
        id VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider VARCHAR(64) NOT NULL,
        product_id VARCHAR(128) NOT NULL,
        base_plan_id VARCHAR(128),
        purchase_token_hash VARCHAR(255) UNIQUE,
        transaction_id VARCHAR(255),
        original_transaction_id VARCHAR(255) UNIQUE,
        environment VARCHAR(32) DEFAULT 'production',
        status VARCHAR(64) NOT NULL,
        auto_renew BOOLEAN DEFAULT true,
        purchase_date TIMESTAMPTZ,
        expires_at TIMESTAMPTZ,
        grace_period_expires_at TIMESTAMPTZ,
        revoked_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        last_verified_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS store_billing_events (
        id VARCHAR(128) PRIMARY KEY,
        provider VARCHAR(64) NOT NULL,
        external_event_id VARCHAR(255) NOT NULL,
        event_type VARCHAR(128) NOT NULL,
        received_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(64) DEFAULT 'processed',
        metadata JSONB,
        CONSTRAINT uq_provider_external_event UNIQUE (provider, external_event_id)
      );

      CREATE TABLE IF NOT EXISTS stripe_events (
        event_id VARCHAR(255) PRIMARY KEY,
        event_type VARCHAR(128) NOT NULL,
        processed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id VARCHAR(128) PRIMARY KEY,
        admin_id VARCHAR(128) NOT NULL,
        action VARCHAR(128) NOT NULL,
        target_id VARCHAR(128),
        details JSONB,
        timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS moderation_notices (
        id VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reason VARCHAR(255) NOT NULL,
        dsa_statement_of_reasons TEXT,
        action_taken VARCHAR(64) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS dsa_appeals (
        id VARCHAR(128) PRIMARY KEY,
        notice_id VARCHAR(128) NOT NULL,
        user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        explanation TEXT NOT NULL,
        status VARCHAR(32) DEFAULT 'PENDING',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TIMESTAMPTZ,
        reviewer_notes TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_likes_from_to ON likes(from_user_id, to_user_id);
      CREATE INDEX IF NOT EXISTS idx_matches_users ON matches(user1_id, user2_id);
      CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
      CREATE INDEX IF NOT EXISTS idx_store_sub_user ON store_subscriptions(user_id);
      CREATE INDEX IF NOT EXISTS idx_store_sub_status ON store_subscriptions(status);
      CREATE INDEX IF NOT EXISTS idx_store_sub_token_hash ON store_subscriptions(purchase_token_hash);
      CREATE INDEX IF NOT EXISTS idx_store_sub_orig_tx ON store_subscriptions(original_transaction_id);
      CREATE INDEX IF NOT EXISTS idx_store_events_ext ON store_billing_events(provider, external_event_id);
    `);

    await client.query('COMMIT');
    isInitialized = true;
    console.log('[PostgreSQL] Database schema initialized successfully.');
    return true;
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('[PostgreSQL] Schema initialization error:', err.message);
    return false;
  } finally {
    client.release();
  }
}

export class PostgresStoreAdapter {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  public async getUserById(userId: string): Promise<UserAccount | null> {
    const res = await this.pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (res.rows.length === 0) return null;
    return this.mapUserRow(res.rows[0]);
  }

  public async getUserByEmail(email: string): Promise<UserAccount | null> {
    const res = await this.pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (res.rows.length === 0) return null;
    return this.mapUserRow(res.rows[0]);
  }

  public async getUserByToken(token: string): Promise<UserAccount | null> {
    const res = await this.pool.query(
      `SELECT u.* FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.token = $1 AND s.expires_at > CURRENT_TIMESTAMP`,
      [token]
    );
    if (res.rows.length === 0) return null;

    // Update lastUsedAt
    await this.pool.query('UPDATE sessions SET last_used_at = CURRENT_TIMESTAMP WHERE token = $1', [token]);
    return this.mapUserRow(res.rows[0]);
  }

  public async saveUser(user: UserAccount, passwordHashAndSalt?: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const p = user.profile;
      await client.query(
        `INSERT INTO users (
          id, email, display_name, age, role, status, bio,
          sexual_role, tribe, looking_for, vibe, interests,
          location, photos, is_verified, is_premium, premium_tier, privacy,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12,
          $13, $14, $15, $16, $17, $18,
          $19, CURRENT_TIMESTAMP
        )
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          display_name = EXCLUDED.display_name,
          age = EXCLUDED.age,
          role = EXCLUDED.role,
          status = EXCLUDED.status,
          bio = EXCLUDED.bio,
          sexual_role = EXCLUDED.sexual_role,
          tribe = EXCLUDED.tribe,
          looking_for = EXCLUDED.looking_for,
          vibe = EXCLUDED.vibe,
          interests = EXCLUDED.interests,
          location = EXCLUDED.location,
          photos = EXCLUDED.photos,
          is_verified = EXCLUDED.is_verified,
          is_premium = EXCLUDED.is_premium,
          premium_tier = EXCLUDED.premium_tier,
          privacy = EXCLUDED.privacy,
          updated_at = CURRENT_TIMESTAMP`,
        [
          user.id,
          user.email,
          p.displayName,
          p.age,
          user.role,
          user.status,
          p.bio || null,
          p.identityRole || (p as any).sexualRole || 'Versatile',
          (p.tribes && p.tribes.length > 0 ? p.tribes[0] : (p as any).tribe) || 'Queer',
          (Array.isArray(p.lookingFor) ? p.lookingFor.join(',') : (p as any).lookingFor) || 'Dating',
          (p as any).vibe || null,
          JSON.stringify(p.interests || []),
          JSON.stringify(typeof p.location === 'object' ? p.location : { city: p.location || 'Warsaw' }),
          JSON.stringify(p.photos || []),
          p.verified ?? (p as any).isVerified ?? false,
          user.isPremium || p.isPremium || false,
          p.premiumTier || null,
          JSON.stringify((p as any).privacy || { locationPrivacy: p.locationPrivacy || 'APPROXIMATE' }),
          user.createdAt || new Date().toISOString()
        ]
      );

      if (passwordHashAndSalt) {
        await client.query(
          `INSERT INTO user_passwords (user_id, salt_hash, updated_at)
           VALUES ($1, $2, CURRENT_TIMESTAMP)
           ON CONFLICT (user_id) DO UPDATE SET salt_hash = EXCLUDED.salt_hash, updated_at = CURRENT_TIMESTAMP`,
          [user.id, passwordHashAndSalt]
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  public async getPasswordHash(userId: string): Promise<string | null> {
    const res = await this.pool.query('SELECT salt_hash FROM user_passwords WHERE user_id = $1', [userId]);
    return res.rows.length > 0 ? res.rows[0].salt_hash : null;
  }

  public async createSession(token: string, userId: string, expiresAt: Date): Promise<void> {
    await this.pool.query(
      `INSERT INTO sessions (token, user_id, expires_at, created_at, last_used_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [token, userId, expiresAt]
    );
  }

  public async deleteSession(token: string): Promise<void> {
    await this.pool.query('DELETE FROM sessions WHERE token = $1', [token]);
  }

  public async createPasswordReset(email: string): Promise<{ token: string; expiresAt: Date } | null> {
    const user = await this.getUserByEmail(email);
    if (!user) return null;

    // Check if user has local password
    const pwd = await this.getPasswordHash(user.id);
    if (!pwd) return null; // Federated account, no local password

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour validity

    await this.pool.query(
      `INSERT INTO password_resets (token, user_id, expires_at, used, created_at)
       VALUES ($1, $2, $3, FALSE, CURRENT_TIMESTAMP)`,
      [token, user.id, expiresAt]
    );

    return { token, expiresAt };
  }

  public async resetPasswordWithToken(token: string, newSaltHash: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const res = await client.query(
        `SELECT user_id, expires_at, used FROM password_resets
         WHERE token = $1 FOR UPDATE`,
        [token]
      );

      if (res.rows.length === 0) {
        await client.query('ROLLBACK');
        return false;
      }

      const { user_id, expires_at, used } = res.rows[0];
      if (used || new Date(expires_at) < new Date()) {
        await client.query('ROLLBACK');
        return false;
      }

      // Mark token used
      await client.query('UPDATE password_resets SET used = TRUE WHERE token = $1', [token]);

      // Update password
      await client.query(
        `UPDATE user_passwords SET salt_hash = $1, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2`,
        [newSaltHash, user_id]
      );

      // Invalidate all active sessions for security
      await client.query('DELETE FROM sessions WHERE user_id = $1', [user_id]);

      await client.query('COMMIT');
      return true;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  public async setStripeSubscription(userId: string, customerId: string, subscriptionId: string, planId: string, status: string, periodEnd?: Date): Promise<void> {
    const isPremium = status === 'active';
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO subscriptions (
          id, user_id, stripe_customer_id, stripe_subscription_id, status, plan_id, current_period_end, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP
        )
        ON CONFLICT (id) DO UPDATE SET
          stripe_customer_id = EXCLUDED.stripe_customer_id,
          stripe_subscription_id = EXCLUDED.stripe_subscription_id,
          status = EXCLUDED.status,
          plan_id = EXCLUDED.plan_id,
          current_period_end = EXCLUDED.current_period_end,
          updated_at = CURRENT_TIMESTAMP`,
        [
          `sub_${userId}`,
          userId,
          customerId,
          subscriptionId,
          status,
          planId,
          periodEnd || new Date(Date.now() + 30 * 24 * 3600 * 1000)
        ]
      );

      await client.query(
        `UPDATE users SET
          is_premium = $1,
          premium_tier = $2,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [isPremium, isPremium ? 'VIP_PLUS' : null, userId]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  public async isEventProcessed(eventId: string): Promise<boolean> {
    const res = await this.pool.query('SELECT event_id FROM stripe_events WHERE event_id = $1', [eventId]);
    return res.rows.length > 0;
  }

  public async recordProcessedEvent(eventId: string, eventType: string): Promise<void> {
    await this.pool.query(
      'INSERT INTO stripe_events (event_id, event_type, processed_at) VALUES ($1, $2, CURRENT_TIMESTAMP) ON CONFLICT DO NOTHING',
      [eventId, eventType]
    );
  }

  public async upsertStoreSubscription(entitlement: UserEntitlement): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const isPrem = entitlement.premium && (entitlement.status === 'active' || entitlement.status === 'grace_period');
      const planTier = entitlement.planTier || (entitlement.productId?.includes('yearly') ? 'yearly' : 'monthly');
      const premiumTier = isPrem ? (planTier === 'yearly' ? 'VIP_ANNUAL' : 'VIP_MONTHLY') : null;

      await client.query(
        `INSERT INTO store_subscriptions (
          id, user_id, provider, product_id, base_plan_id,
          purchase_token_hash, transaction_id, original_transaction_id,
          environment, status, auto_renew, purchase_date,
          expires_at, grace_period_expires_at, created_at, updated_at, last_verified_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8,
          $9, $10, $11, $12,
          $13, $14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        ON CONFLICT (id) DO UPDATE SET
          provider = EXCLUDED.provider,
          product_id = EXCLUDED.product_id,
          base_plan_id = EXCLUDED.base_plan_id,
          purchase_token_hash = COALESCE(EXCLUDED.purchase_token_hash, store_subscriptions.purchase_token_hash),
          transaction_id = COALESCE(EXCLUDED.transaction_id, store_subscriptions.transaction_id),
          original_transaction_id = COALESCE(EXCLUDED.original_transaction_id, store_subscriptions.original_transaction_id),
          environment = EXCLUDED.environment,
          status = EXCLUDED.status,
          auto_renew = EXCLUDED.auto_renew,
          expires_at = EXCLUDED.expires_at,
          grace_period_expires_at = EXCLUDED.grace_period_expires_at,
          updated_at = CURRENT_TIMESTAMP,
          last_verified_at = CURRENT_TIMESTAMP`,
        [
          entitlement.userId,
          entitlement.userId,
          entitlement.provider,
          entitlement.productId || 'aura.premium.monthly',
          entitlement.planTier || 'monthly',
          entitlement.purchaseTokenHash || null,
          entitlement.storeTransactionId || null,
          entitlement.originalTransactionId || null,
          entitlement.environment || 'production',
          entitlement.status,
          entitlement.autoRenew,
          entitlement.createdAt ? new Date(entitlement.createdAt) : new Date(),
          entitlement.expiresAt ? new Date(entitlement.expiresAt) : null,
          entitlement.gracePeriodUntil ? new Date(entitlement.gracePeriodUntil) : null
        ]
      );

      await client.query(
        `UPDATE users SET
          is_premium = $1,
          premium_tier = $2,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [isPrem, premiumTier, entitlement.userId]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  public async getStoreSubscriptionByUserId(userId: string): Promise<UserEntitlement | null> {
    const res = await this.pool.query(
      'SELECT * FROM store_subscriptions WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1',
      [userId]
    );
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    const isPrem = (row.status === 'active' || row.status === 'grace_period') &&
      (!row.expires_at || new Date(row.expires_at).getTime() > Date.now());

    return {
      userId: row.user_id,
      premium: isPrem,
      provider: row.provider,
      productId: row.product_id,
      planTier: row.base_plan_id || (row.product_id?.includes('yearly') ? 'yearly' : 'monthly'),
      status: row.status,
      expiresAt: row.expires_at ? row.expires_at.toISOString() : undefined,
      autoRenew: !!row.auto_renew,
      originalTransactionId: row.original_transaction_id || undefined,
      purchaseTokenHash: row.purchase_token_hash || undefined,
      storeTransactionId: row.transaction_id || undefined,
      environment: row.environment,
      gracePeriodUntil: row.grace_period_expires_at ? row.grace_period_expires_at.toISOString() : undefined,
      lastVerifiedAt: row.last_verified_at ? row.last_verified_at.toISOString() : new Date().toISOString(),
      createdAt: row.created_at ? row.created_at.toISOString() : new Date().toISOString(),
      updatedAt: row.updated_at ? row.updated_at.toISOString() : new Date().toISOString()
    };
  }

  public async findUserByPurchaseTokenHash(hash: string): Promise<string | null> {
    const res = await this.pool.query(
      'SELECT user_id FROM store_subscriptions WHERE purchase_token_hash = $1 LIMIT 1',
      [hash]
    );
    return res.rows.length > 0 ? res.rows[0].user_id : null;
  }

  public async findUserByOriginalTransactionId(origTxId: string): Promise<string | null> {
    const res = await this.pool.query(
      'SELECT user_id FROM store_subscriptions WHERE original_transaction_id = $1 LIMIT 1',
      [origTxId]
    );
    return res.rows.length > 0 ? res.rows[0].user_id : null;
  }

  public async isStoreEventProcessed(provider: string, externalEventId: string): Promise<boolean> {
    const res = await this.pool.query(
      'SELECT id FROM store_billing_events WHERE provider = $1 AND external_event_id = $2',
      [provider, externalEventId]
    );
    return res.rows.length > 0;
  }

  public async recordStoreBillingEvent(
    id: string,
    provider: string,
    externalEventId: string,
    eventType: string,
    metadata?: any
  ): Promise<boolean> {
    try {
      await this.pool.query(
        `INSERT INTO store_billing_events (
          id, provider, external_event_id, event_type, metadata, received_at, processed_at, status
        ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'processed')
        ON CONFLICT (provider, external_event_id) DO NOTHING`,
        [id, provider, externalEventId, eventType, metadata ? JSON.stringify(metadata) : null]
      );
      return true;
    } catch {
      return false;
    }
  }

  private mapUserRow(row: any): UserAccount {
    const lookingForArr = row.looking_for
      ? (typeof row.looking_for === 'string' ? row.looking_for.split(',') : row.looking_for)
      : ['Dating', 'Friends'];
    const tribesArr = row.tribe ? [row.tribe] : ['Queer'];

    return {
      id: row.id,
      email: row.email,
      role: row.role,
      status: row.status,
      isAgeVerified18Plus: true,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : (row.created_at || new Date().toISOString()),
      updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : (row.updated_at || new Date().toISOString()),
      isPremium: !!row.is_premium,
      profile: {
        id: row.id,
        userId: row.id,
        displayName: row.display_name,
        age: row.age || 18,
        bio: row.bio || '',
        identityRole: row.sexual_role || 'Versatile',
        tribes: tribesArr,
        lookingFor: lookingForArr,
        interests: typeof row.interests === 'string' ? JSON.parse(row.interests) : row.interests || [],
        location: typeof row.location === 'object' ? (row.location.city || 'Warsaw') : (row.location || 'Warsaw'),
        distanceKm: 0,
        photos: typeof row.photos === 'string' ? JSON.parse(row.photos) : row.photos || [],
        verified: !!row.is_verified,
        isOnline: true,
        lastActiveMinutesAgo: 0,
        isPremium: !!row.is_premium,
        premiumTier: row.premium_tier
      }
    };
  }
}
