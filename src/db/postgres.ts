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
  const sqlHost = process.env.SQL_HOST || process.env.PGHOST || (process.env.CLOUD_SQL_CONNECTION_NAME ? `/cloudsql/${process.env.CLOUD_SQL_CONNECTION_NAME}` : undefined);
  const sqlUser = process.env.SQL_USER || process.env.PGUSER;
  const sqlPassword = process.env.SQL_PASSWORD || process.env.PGPASSWORD;
  const sqlDbName = process.env.SQL_DB_NAME || process.env.PGDATABASE;
  const sqlPort = process.env.SQL_PORT || process.env.PGPORT ? parseInt(process.env.SQL_PORT || process.env.PGPORT!, 10) : 5432;

  let poolConfig: PoolConfig | null = null;

  if (databaseUrl) {
    poolConfig = {
      connectionString: databaseUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: process.env.NODE_ENV === 'production' && !databaseUrl.includes('localhost') && !databaseUrl.includes('/cloudsql')
        ? { rejectUnauthorized: false }
        : false
    };
  } else if (sqlHost && sqlUser && sqlDbName) {
    poolConfig = {
      host: sqlHost,
      user: sqlUser,
      password: sqlPassword || '',
      database: sqlDbName,
      port: sqlHost.startsWith('/') ? undefined : sqlPort,
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

      CREATE TABLE IF NOT EXISTS media_records (
        id VARCHAR(128) PRIMARY KEY,
        owner_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category VARCHAR(64) NOT NULL,
        moderation_status VARCHAR(32) DEFAULT 'PENDING',
        moderation_reason TEXT,
        mime_type VARCHAR(128),
        size INT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE user_consents ADD COLUMN IF NOT EXISTS ai_assistance_consent BOOLEAN DEFAULT TRUE;
      ALTER TABLE user_consents ADD COLUMN IF NOT EXISTS safe_content_enabled BOOLEAN DEFAULT TRUE;
      ALTER TABLE user_consents ADD COLUMN IF NOT EXISTS location_processing_consent BOOLEAN DEFAULT TRUE;
      ALTER TABLE user_consents ADD COLUMN IF NOT EXISTS special_category_consent BOOLEAN DEFAULT TRUE;

      ALTER TABLE user_consents ADD COLUMN IF NOT EXISTS necessary_cookies BOOLEAN DEFAULT TRUE;
      ALTER TABLE user_consents ADD COLUMN IF NOT EXISTS functional_cookies BOOLEAN DEFAULT TRUE;
      ALTER TABLE user_consents ADD COLUMN IF NOT EXISTS analytics_cookies BOOLEAN DEFAULT FALSE;

      ALTER TABLE messages ADD COLUMN IF NOT EXISTS client_message_id VARCHAR(128);

      CREATE TABLE IF NOT EXISTS vault_grants (
        owner_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        granted_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        granted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (owner_id, granted_id)
      );

      ALTER TABLE reports ADD COLUMN IF NOT EXISTS reported_message_id VARCHAR(128);
      ALTER TABLE reports ADD COLUMN IF NOT EXISTS reported_media_id VARCHAR(128);
      ALTER TABLE reports ADD COLUMN IF NOT EXISTS decision VARCHAR(64);
      ALTER TABLE reports ADD COLUMN IF NOT EXISTS decision_reason TEXT;
      ALTER TABLE reports ADD COLUMN IF NOT EXISTS decided_at TIMESTAMPTZ;
      ALTER TABLE reports ADD COLUMN IF NOT EXISTS decided_by VARCHAR(128);

      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_likes_from_to ON likes(from_user_id, to_user_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_likes_unique ON likes(from_user_id, to_user_id);
      CREATE INDEX IF NOT EXISTS idx_matches_users ON matches(user1_id, user2_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_matches_unique ON matches(user1_id, user2_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_blocks_unique ON blocks(blocker_user_id, blocked_user_id);
      CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at DESC);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_idempotency ON messages(conversation_id, client_message_id) WHERE client_message_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
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

  
  public async saveUserAndSession(user: UserAccount, token: string, expiresAt: Date, passwordHash?: string): Promise<void> {
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
          user.id, user.email, user.profile.displayName, user.profile.age, user.role, user.status, p.bio || null,
          (p as any).identityRole || (p as any).sexualRole || null,
          p.tribes ? JSON.stringify(p.tribes) : ((p as any).tribe || null),
          p.lookingFor ? JSON.stringify(p.lookingFor) : null,
          (p as any).vibe || null,
          p.interests ? JSON.stringify(p.interests) : null,
          p.location || null,
          p.photos ? JSON.stringify(p.photos) : null,
          p.verified || false,
          user.isPremium || p.isPremium || false,
          p.premiumTier || 'none',
          JSON.stringify((p as any).privacy || { locationPrivacy: p.locationPrivacy || 'APPROXIMATE' }),
          user.createdAt
        ]
      );

      if (passwordHash) {
        await client.query(
          'INSERT INTO user_passwords (user_id, salt_hash) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET salt_hash = EXCLUDED.salt_hash, updated_at = CURRENT_TIMESTAMP',
          [user.id, passwordHash]
        );
      }

      await client.query(
        'INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3) ON CONFLICT (token) DO UPDATE SET expires_at = EXCLUDED.expires_at, last_used_at = CURRENT_TIMESTAMP',
        [token, user.id, expiresAt]
      );
      
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
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

  public async saveUserPassword(userId: string, passwordHashAndSalt: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO user_passwords (user_id, salt_hash, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) DO UPDATE SET salt_hash = EXCLUDED.salt_hash, updated_at = CURRENT_TIMESTAMP`,
      [userId, passwordHashAndSalt]
    );
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

  public async saveConversation(conv: Conversation): Promise<void> {
    await this.pool.query(
      `INSERT INTO conversations (id, participant_ids, last_message_text, last_message_timestamp, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         participant_ids = EXCLUDED.participant_ids,
         last_message_text = EXCLUDED.last_message_text,
         last_message_timestamp = EXCLUDED.last_message_timestamp,
         updated_at = EXCLUDED.updated_at`,
      [
        conv.id,
        JSON.stringify(conv.participantIds || []),
        conv.lastMessage?.text || null,
        conv.lastMessage?.createdAt || null,
        conv.createdAt ? new Date(conv.createdAt) : new Date(),
        conv.updatedAt ? new Date(conv.updatedAt) : new Date()
      ]
    );
  }

  public async saveMessage(msg: Message): Promise<void> {
    await this.pool.query(
      `INSERT INTO messages (id, conversation_id, sender_id, receiver_id, text, type, media, status, created_at, client_message_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status`,
      [
        msg.id,
        msg.conversationId,
        msg.senderId,
        msg.receiverId,
        msg.text || null,
        msg.type,
        msg.media ? JSON.stringify(msg.media) : null,
        msg.status,
        msg.createdAt ? new Date(msg.createdAt) : new Date(),
        msg.clientMessageId || null
      ]
    );
  }

  public async getMessageByClientMessageId(conversationId: string, clientMessageId: string): Promise<Message | null> {
    const res = await this.pool.query(
      'SELECT * FROM messages WHERE conversation_id = $1 AND client_message_id = $2 LIMIT 1',
      [conversationId, clientMessageId]
    );
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      clientMessageId: row.client_message_id,
      conversationId: row.conversation_id,
      senderId: row.sender_id,
      receiverId: row.receiver_id,
      text: row.text,
      type: row.type,
      media: row.media,
      status: row.status,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
    };
  }

  public async saveBlock(block: BlockRecord): Promise<void> {
    await this.pool.query(
      'INSERT INTO blocks (id, blocker_user_id, blocked_user_id, created_at) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
      [block.id, block.blockerUserId, block.blockedUserId, block.createdAt ? new Date(block.createdAt) : new Date()]
    );
  }

  public async unblockUser(blockerUserId: string, blockedUserId: string): Promise<boolean> {
    const res = await this.pool.query(
      'DELETE FROM blocks WHERE blocker_user_id = $1 AND blocked_user_id = $2',
      [blockerUserId, blockedUserId]
    );
    return (res.rowCount || 0) > 0;
  }

  public async saveReport(report: ReportRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO reports (id, reporter_user_id, reported_user_id, reason, details, status, reported_message_id, reported_media_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, decision = EXCLUDED.decision`,
      [
        report.id,
        report.reporterUserId,
        report.reportedUserId,
        report.reason,
        report.details || null,
        report.status,
        report.reportedMessageId || null,
        report.reportedMediaId || null,
        report.createdAt ? new Date(report.createdAt) : new Date()
      ]
    );
  }

  public async updateReportDecision(reportId: string, decision: string, reason: string, adminId: string): Promise<void> {
    await this.pool.query(
      `UPDATE reports SET status = 'RESOLVED', decision = $1, decision_reason = $2, decided_by = $3, decided_at = CURRENT_TIMESTAMP WHERE id = $4`,
      [decision, reason, adminId, reportId]
    );
  }

  public async updateUserStatus(userId: string, status: string): Promise<void> {
    await this.pool.query(
      'UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [status, userId]
    );
  }

  public async getUserConsents(userId: string): Promise<UserConsents | null> {
    const res = await this.pool.query('SELECT * FROM user_consents WHERE user_id = $1', [userId]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      necessaryCookies: !!r.necessary_cookies,
      functionalCookies: !!r.functional_cookies,
      analyticsCookies: !!r.analytics_cookies,
      explicitSpecialCategoryConsent: !!r.special_category_consent,
      aiAssistanceConsent: r.ai_assistance_consent !== false,
      locationProcessingConsent: r.location_processing_consent !== false,
      termsAcceptedVersion: r.terms_version || '2.0.0',
      privacyPolicyAcceptedVersion: r.privacy_policy_version || '2.0.0',
      updatedAt: r.timestamp ? new Date(r.timestamp).toISOString() : new Date().toISOString(),
      safeContentEnabled: r.safe_content_enabled !== false
    };
  }

  public async saveUserConsents(userId: string, consents: UserConsents): Promise<void> {
    await this.pool.query(
      `INSERT INTO user_consents (
         user_id, necessary_cookies, functional_cookies, analytics_cookies,
         special_category_consent, ai_assistance_consent, location_processing_consent,
         terms_version, privacy_policy_version, safe_content_enabled, timestamp
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) DO UPDATE SET
         necessary_cookies = EXCLUDED.necessary_cookies,
         functional_cookies = EXCLUDED.functional_cookies,
         analytics_cookies = EXCLUDED.analytics_cookies,
         special_category_consent = EXCLUDED.special_category_consent,
         ai_assistance_consent = EXCLUDED.ai_assistance_consent,
         location_processing_consent = EXCLUDED.location_processing_consent,
         terms_version = EXCLUDED.terms_version,
         privacy_policy_version = EXCLUDED.privacy_policy_version,
         safe_content_enabled = EXCLUDED.safe_content_enabled,
         timestamp = CURRENT_TIMESTAMP`,
      [
        userId,
        consents.necessaryCookies,
        consents.functionalCookies,
        consents.analyticsCookies,
        consents.explicitSpecialCategoryConsent,
        consents.aiAssistanceConsent !== false,
        consents.locationProcessingConsent !== false,
        consents.termsAcceptedVersion,
        consents.privacyPolicyAcceptedVersion,
        consents.safeContentEnabled !== false
      ]
    );
  }

  public async loadAllUsers(): Promise<UserAccount[]> {
    const res = await this.pool.query('SELECT * FROM users');
    return res.rows.map(row => this.mapUserRow(row));
  }

  public async loadAllSessions(): Promise<any[]> {
    const res = await this.pool.query('SELECT * FROM sessions');
    return res.rows;
  }

  public async loadAllConversations(): Promise<Conversation[]> {
    const res = await this.pool.query('SELECT * FROM conversations');
    return res.rows.map(row => {
      let pIds: string[] = [];
      if (Array.isArray(row.participant_ids)) {
        pIds = row.participant_ids;
      } else if (typeof row.participant_ids === 'string') {
        try { pIds = JSON.parse(row.participant_ids); } catch { pIds = []; }
      }
      return {
        id: row.id,
        participantIds: pIds,
        unreadCount: 0,
        otherParticipant: {} as any,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
        updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()
      };
    });
  }

  public async loadAllMessages(): Promise<Message[]> {
    const res = await this.pool.query('SELECT * FROM messages ORDER BY created_at ASC');
    return res.rows.map(row => ({
      id: row.id,
      conversationId: row.conversation_id,
      senderId: row.sender_id,
      receiverId: row.receiver_id,
      text: row.text,
      type: row.type,
      media: row.media,
      status: row.status,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
    }));
  }

  public async getMessages(conversationId: string): Promise<Message[]> {
    const res = await this.pool.query(
      'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
      [conversationId]
    );
    return res.rows.map(row => ({
      id: row.id,
      conversationId: row.conversation_id,
      senderId: row.sender_id,
      receiverId: row.receiver_id,
      text: row.text,
      type: row.type,
      media: row.media,
      status: row.status,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
    }));
  }

  public async isBlocked(userA: string, userB: string): Promise<boolean> {
    const res = await this.pool.query(
      'SELECT 1 FROM blocks WHERE (blocker_user_id = $1 AND blocked_user_id = $2) OR (blocker_user_id = $2 AND blocked_user_id = $1) LIMIT 1',
      [userA, userB]
    );
    return res.rows.length > 0;
  }

  public async saveLike(like: LikeRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO likes (id, from_user_id, to_user_id, is_super_like, created_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (from_user_id, to_user_id) DO NOTHING`,
      [like.id, like.fromUserId, like.toUserId, !!like.isSuperLike, like.createdAt ? new Date(like.createdAt) : new Date()]
    );
  }

  public async getLikes(userId: string): Promise<LikeRecord[]> {
    const res = await this.pool.query(
      'SELECT * FROM likes WHERE from_user_id = $1 OR to_user_id = $1',
      [userId]
    );
    return res.rows.map(r => ({
      id: r.id,
      fromUserId: r.from_user_id,
      toUserId: r.to_user_id,
      isSuperLike: r.is_super_like,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
    }));
  }

  public async saveMatch(match: MatchRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO matches (id, user1_id, user2_id, is_super_match, created_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user1_id, user2_id) DO NOTHING`,
      [match.id, match.user1Id, match.user2Id, !!match.isSuperMatch, match.createdAt ? new Date(match.createdAt) : new Date()]
    );
  }

  public async saveMoment(moment: Moment): Promise<void> {
    await this.pool.query(
      `INSERT INTO moments (id, user_id, media_url, caption, expires_at, likes_count, views_count, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         caption = EXCLUDED.caption,
         likes_count = EXCLUDED.likes_count,
         views_count = EXCLUDED.views_count`,
      [
        moment.id,
        moment.userId,
        moment.mediaUrl,
        moment.caption || null,
        new Date(moment.expiresAt),
        moment.likesCount || 0,
        moment.viewsCount || 0,
        moment.createdAt ? new Date(moment.createdAt) : new Date()
      ]
    );
  }

  public async deleteMoment(momentId: string, userId: string): Promise<boolean> {
    const res = await this.pool.query(
      'DELETE FROM moments WHERE id = $1 AND user_id = $2',
      [momentId, userId]
    );
    return (res.rowCount || 0) > 0;
  }

  public async loadAllMoments(): Promise<Moment[]> {
    const res = await this.pool.query(
      'SELECT * FROM moments WHERE expires_at > CURRENT_TIMESTAMP ORDER BY created_at DESC'
    );
    return res.rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      mediaUrl: r.media_url,
      mediaType: 'photo' as const,
      privacy: 'everyone' as const,
      caption: r.caption,
      expiresAt: new Date(r.expires_at).toISOString(),
      createdAt: new Date(r.created_at).toISOString(),
      likesCount: r.likes_count || 0,
      viewsCount: r.views_count || 0
    }));
  }

  public async saveModerationNotice(notice: ModerationNotice): Promise<void> {
    await this.pool.query(
      `INSERT INTO moderation_notices (id, user_id, reason, dsa_statement_of_reasons, action_taken, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [
        notice.id,
        notice.targetUserId,
        notice.reason,
        notice.statementOfReasons || null,
        notice.decision,
        notice.createdAt ? new Date(notice.createdAt) : new Date()
      ]
    );
  }

  public async getModerationNotices(userId: string): Promise<ModerationNotice[]> {
    const res = await this.pool.query(
      'SELECT * FROM moderation_notices WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return res.rows.map(r => ({
      id: r.id,
      targetUserId: r.user_id,
      reason: r.reason,
      legalBasis: 'DSA Art. 17',
      statementOfReasons: r.dsa_statement_of_reasons || '',
      decision: r.action_taken as any,
      createdAt: new Date(r.created_at).toISOString(),
      appealDeadline: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString()
    }));
  }

  public async saveDsaAppeal(appeal: DsaAppealRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO dsa_appeals (id, notice_id, user_id, explanation, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [
        appeal.id,
        appeal.noticeId,
        appeal.userId,
        appeal.appealReason,
        appeal.status,
        appeal.createdAt ? new Date(appeal.createdAt) : new Date()
      ]
    );
  }

  public async updateDsaAppeal(appealId: string, status: string, notes?: string): Promise<void> {
    await this.pool.query(
      `UPDATE dsa_appeals SET status = $1, reviewer_notes = $2, reviewed_at = CURRENT_TIMESTAMP WHERE id = $3`,
      [status, notes || null, appealId]
    );
  }

  public async getDsaAppeals(): Promise<DsaAppealRecord[]> {
    const res = await this.pool.query(
      'SELECT * FROM dsa_appeals ORDER BY created_at DESC'
    );
    return res.rows.map(r => ({
      id: r.id,
      noticeId: r.notice_id,
      userId: r.user_id,
      appealReason: r.explanation,
      status: r.status as any,
      createdAt: new Date(r.created_at).toISOString(),
      adminDecisionNotes: r.reviewer_notes || undefined
    }));
  }

  public async saveAdminAuditLog(log: AdminAuditLog): Promise<void> {
    await this.pool.query(
      `INSERT INTO admin_audit_logs (id, admin_id, action, target_id, details, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [
        log.id,
        log.adminId,
        log.action,
        log.targetUserId || null,
        log.details ? JSON.stringify(log.details) : null,
        log.createdAt ? new Date(log.createdAt) : new Date()
      ]
    );
  }

  public async getAdminAuditLogs(): Promise<AdminAuditLog[]> {
    const res = await this.pool.query(
      'SELECT * FROM admin_audit_logs ORDER BY timestamp DESC LIMIT 200'
    );
    return res.rows.map(r => ({
      id: r.id,
      adminId: r.admin_id,
      action: r.action,
      targetUserId: r.target_id,
      details: r.details,
      createdAt: new Date(r.timestamp).toISOString()
    }));
  }

  public async saveMediaRecord(record: any): Promise<void> {
    await this.pool.query(
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
        record.mimeType || 'image/jpeg',
        record.size || 0,
        record.createdAt ? new Date(record.createdAt) : new Date()
      ]
    );
  }

  public async getMediaRecord(mediaId: string): Promise<any | null> {
    const res = await this.pool.query('SELECT * FROM media_records WHERE id = $1', [mediaId]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      ownerId: r.owner_id,
      category: r.category,
      moderationStatus: r.moderation_status,
      moderationReason: r.moderation_reason,
      mimeType: r.mime_type,
      size: r.size,
      createdAt: new Date(r.created_at).toISOString()
    };
  }

  public async updateMediaModerationStatus(mediaId: string, status: string, reason?: string): Promise<void> {
    await this.pool.query(
      'UPDATE media_records SET moderation_status = $1, moderation_reason = $2 WHERE id = $3',
      [status, reason || null, mediaId]
    );
  }

  public async saveVaultGrant(ownerId: string, grantedId: string): Promise<void> {
    await this.pool.query(
      'INSERT INTO vault_grants (owner_id, granted_id, granted_at) VALUES ($1, $2, CURRENT_TIMESTAMP) ON CONFLICT DO NOTHING',
      [ownerId, grantedId]
    );
  }

  public async revokeVaultGrant(ownerId: string, grantedId: string): Promise<void> {
    await this.pool.query(
      'DELETE FROM vault_grants WHERE owner_id = $1 AND granted_id = $2',
      [ownerId, grantedId]
    );
  }

  public async hasVaultAccess(ownerId: string, visitorId: string): Promise<boolean> {
    const res = await this.pool.query(
      'SELECT 1 FROM vault_grants WHERE owner_id = $1 AND granted_id = $2',
      [ownerId, visitorId]
    );
    return res.rows.length > 0;
  }
}
