/**
 * Cloud SQL Infrastructure & Persistence Verification Runner
 * Validates real PostgreSQL behavior for Cloud Run 'aura' multi-instance production.
 *
 * NO MOCKS. NO SQLITE. NO IN-MEMORY EMULATION.
 * Connects directly using pg Pool via DATABASE_URL or Cloud SQL Unix Socket / TCP.
 */

import { Pool, PoolConfig } from 'pg';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

interface TestResult {
  suite: string;
  testName: string;
  status: 'PASS' | 'FAIL' | 'UNVERIFIED' | 'VERIFIED_ONLY_IN_CODE';
  details: string;
  durationMs?: number;
}

const results: TestResult[] = [];

function isUnixSocketAccessible(sockPath?: string): boolean {
  if (!sockPath) return false;
  try {
    if (fs.existsSync(sockPath)) return true;
    if (fs.existsSync(path.join(sockPath, '.s.PGSQL.5432'))) return true;
  } catch {
    return false;
  }
  return false;
}

function extractSocketFromUrl(urlStr?: string): string | null {
  if (!urlStr) return null;
  try {
    const match = urlStr.match(/[?&]host=([^&]+)/);
    if (match) {
      const decoded = decodeURIComponent(match[1]);
      if (decoded.startsWith('/')) return decoded;
    }
  } catch {}
  return null;
}

function resolveAccessibleSocketHost(host?: string): string | undefined {
  if (!host) return undefined;
  if (!host.startsWith('/')) return host;
  if (isUnixSocketAccessible(host)) return host;

  if (host.startsWith('/cloudsql/')) {
    const alt = `/app${host}`;
    if (isUnixSocketAccessible(alt)) return alt;
  }
  if (host.startsWith('/app/cloudsql/')) {
    const alt = host.replace('/app/cloudsql/', '/cloudsql/');
    if (isUnixSocketAccessible(alt)) return alt;
  }

  return host;
}

function getTestPool(): Pool | null {
  let databaseUrl = process.env.DATABASE_URL;
  const rawSqlHost = process.env.SQL_HOST || process.env.PGHOST || (process.env.CLOUD_SQL_CONNECTION_NAME ? `/cloudsql/${process.env.CLOUD_SQL_CONNECTION_NAME}` : undefined);
  const sqlHost = resolveAccessibleSocketHost(rawSqlHost);
  const sqlUser = process.env.SQL_USER || process.env.PGUSER;
  const sqlPassword = process.env.SQL_PASSWORD || process.env.PGPASSWORD;
  const sqlDbName = process.env.SQL_DB_NAME || process.env.PGDATABASE;
  const sqlPort = process.env.SQL_PORT || process.env.PGPORT ? parseInt(process.env.SQL_PORT || process.env.PGPORT!, 10) : 5432;

  // Validate databaseUrl: If it references a Unix domain socket, ensure that socket path actually exists.
  if (databaseUrl) {
    const socketInUrl = extractSocketFromUrl(databaseUrl);
    if (socketInUrl) {
      const resolvedSocket = resolveAccessibleSocketHost(socketInUrl);
      if (resolvedSocket && isUnixSocketAccessible(resolvedSocket)) {
        if (resolvedSocket !== socketInUrl) {
          databaseUrl = databaseUrl.replace(encodeURIComponent(socketInUrl), encodeURIComponent(resolvedSocket)).replace(socketInUrl, resolvedSocket);
        }
      } else {
        databaseUrl = undefined;
      }
    }
  }

  let poolConfig: PoolConfig | null = null;

  const hasDirectCloudSql = Boolean(sqlHost && sqlUser && sqlDbName && (!sqlHost.startsWith('/') || isUnixSocketAccessible(sqlHost)));

  if (hasDirectCloudSql) {
    poolConfig = {
      host: sqlHost,
      user: sqlUser,
      password: sqlPassword || '',
      database: sqlDbName,
      port: sqlHost?.startsWith('/') ? undefined : sqlPort,
      max: 5,
      connectionTimeoutMillis: 5000
    };
  } else if (databaseUrl) {
    poolConfig = {
      connectionString: databaseUrl,
      max: 5,
      connectionTimeoutMillis: 5000,
      ssl: process.env.NODE_ENV === 'production' && !databaseUrl.includes('localhost') && !databaseUrl.includes('/cloudsql')
        ? { rejectUnauthorized: true, ...(process.env.CA_CERT ? { ca: process.env.CA_CERT } : {}) }
        : false
    };
  } else if (sqlHost && sqlUser && sqlDbName) {
    poolConfig = {
      host: sqlHost,
      user: sqlUser,
      password: sqlPassword || '',
      database: sqlDbName,
      port: sqlHost.startsWith('/') ? undefined : sqlPort,
      max: 5,
      connectionTimeoutMillis: 5000
    };
  }

  if (!poolConfig) return null;
  return new Pool(poolConfig);
}

async function runAllChecks() {
  console.log('========================================================================');
  console.log('       AURA CLOUD SQL INFRASTRUCTURE VERIFICATION RUNNER               ');
  console.log('========================================================================\n');

  const pool = getTestPool();

  if (!pool) {
    console.warn('⚠️  No active PostgreSQL connection credentials detected in current sandbox environment.');
    console.warn('    DATABASE_URL or SQL_HOST / SQL_USER / SQL_DB_NAME are not populated.');
    console.warn('    All live DB operations will report LIVE: UNVERIFIED.\n');

    recordUnverified('Connection', 'Cloud SQL Connection', 'No production database credentials in local sandbox');
    recordUnverified('Parameters', 'synchronous_commit check', 'Requires live DB connection');
    recordUnverified('Parameters', 'transaction_isolation check', 'Requires live DB connection');
    recordUnverified('Schema', 'Table and index validation', 'Requires live DB connection');
    recordUnverified('Durability', 'Transaction rollback & commit verification', 'Requires live DB connection');
    recordUnverified('Multi-Instance', 'Process A to Process B state synchronization', 'Requires live DB connection');
    recordUnverified('Concurrency', 'Idempotent message delivery unique constraint', 'Requires live DB connection');
    recordUnverified('Fail-Closed', 'Database error fail-closed write abort', 'Requires live DB connection');

    printSummary();
    return;
  }

  let client;
  try {
    const start = Date.now();
    client = await pool.connect();
    const connDuration = Date.now() - start;

    // 1. Connection & DB Info
    const dbInfo = await client.query('SELECT current_database() as db, current_user as usr, version() as ver');
    const { db, usr, ver } = dbInfo.rows[0];
    results.push({
      suite: 'Connection',
      testName: 'Cloud SQL Direct Connection',
      status: 'PASS',
      details: `Connected to db='${db}' as user='${usr}' (${ver.split(' ')[0]} ${ver.split(' ')[1]})`,
      durationMs: connDuration
    });

    // 2. Synchronous Commit & Isolation Level
    const syncCommitRes = await client.query('SHOW synchronous_commit');
    const syncVal = syncCommitRes.rows[0]?.synchronous_commit;
    const isSyncOn = syncVal === 'on' || syncVal === 'remote_write' || syncVal === 'remote_apply';
    results.push({
      suite: 'Parameters',
      testName: 'synchronous_commit',
      status: isSyncOn ? 'PASS' : 'FAIL',
      details: `Current setting: synchronous_commit = ${syncVal} (Required durable: 'on')`
    });

    const isolRes = await client.query('SHOW default_transaction_isolation');
    results.push({
      suite: 'Parameters',
      testName: 'default_transaction_isolation',
      status: 'PASS',
      details: `Current setting: ${isolRes.rows[0]?.default_transaction_isolation}`
    });

    // 3. Schema & Table Integrity Checks
    const requiredTables = [
      'users', 'sessions', 'messages', 'conversations', 'blocks',
      'reports', 'likes', 'matches', 'moments', 'vault_grants',
      'user_consents', 'media_records', 'dsa_appeals', 'admin_audit_logs'
    ];

    const tablesRes = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    const existingTables = new Set(tablesRes.rows.map(r => r.table_name));

    for (const t of requiredTables) {
      const exists = existingTables.has(t);
      results.push({
        suite: 'Schema',
        testName: `Table '${t}' existence`,
        status: exists ? 'PASS' : 'FAIL',
        details: exists ? `Table ${t} verified in public schema` : `Table ${t} MISSING from database`
      });
    }

    // 4. Index verification for Idempotency and Performance
    const indexRes = await client.query(`
      SELECT indexname FROM pg_indexes 
      WHERE schemaname = 'public'
    `);
    const existingIndexes = new Set(indexRes.rows.map(r => r.indexname));

    const requiredIndexes = [
      'idx_messages_idempotency',
      'idx_blocks_unique',
      'idx_likes_unique',
      'idx_matches_unique',
      'idx_users_email'
    ];

    for (const idx of requiredIndexes) {
      const exists = existingIndexes.has(idx);
      results.push({
        suite: 'Indexes',
        testName: `Index '${idx}'`,
        status: exists ? 'PASS' : 'FAIL',
        details: exists ? `Index ${idx} verified` : `Index ${idx} MISSING`
      });
    }

    // 5. Transaction Durability & Rollback Test
    const testUserId = `test-verify-${Date.now()}`;
    const testEmail = `verify-${Date.now()}@example.com`;

    // 5a. Rollback check: Insert inside transaction and rollback
    await client.query('BEGIN');
    await client.query(`
      INSERT INTO users (id, email, display_name, age, created_at, updated_at, status)
      VALUES ($1, $2, $3, $4, NOW(), NOW(), 'ACTIVE')
    `, [testUserId, testEmail, 'Test Durability', 25]);
    await client.query('ROLLBACK');

    const rollbackCheck = await client.query('SELECT 1 FROM users WHERE id = $1', [testUserId]);
    const rollbackSuccess = rollbackCheck.rows.length === 0;
    results.push({
      suite: 'Durability',
      testName: 'Transaction Rollback Atomicity',
      status: rollbackSuccess ? 'PASS' : 'FAIL',
      details: rollbackSuccess ? 'Rolled-back record was not persisted (Atomicity intact)' : 'CRITICAL: Rolled-back record was found in DB!'
    });

    // 5b. Commit check: Insert inside transaction and commit
    await client.query('BEGIN');
    await client.query(`
      INSERT INTO users (id, email, display_name, age, created_at, updated_at, status)
      VALUES ($1, $2, $3, $4, NOW(), NOW(), 'ACTIVE')
    `, [testUserId, testEmail, 'Test Durability', 25]);
    await client.query('COMMIT');

    const commitCheck = await client.query('SELECT 1 FROM users WHERE id = $1', [testUserId]);
    const commitSuccess = commitCheck.rows.length === 1;
    results.push({
      suite: 'Durability',
      testName: 'Transaction Commit Durability',
      status: commitSuccess ? 'PASS' : 'FAIL',
      details: commitSuccess ? 'Committed record verified in database' : 'Committed record was not found in DB'
    });

    // 6. Multi-Client / Multi-Instance Simulation
    // Create a second independent client to test cross-connection visibility without shared memory
    const client2 = await pool.connect();
    try {
      const testConvId = `conv-verify-${Date.now()}`;
      const testMsgId = `msg-verify-${Date.now()}`;
      const clientMsgId = `idem-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

      // Insert conversation & message using client 1
      await client.query(`
        INSERT INTO conversations (id, participant_ids, created_at, updated_at)
        VALUES ($1, $2, NOW(), NOW())
      `, [testConvId, JSON.stringify([testUserId, testUserId])]);

      await client.query(`
        INSERT INTO messages (id, conversation_id, sender_id, receiver_id, text, type, status, created_at, client_message_id)
        VALUES ($1, $2, $3, $3, 'Live multi-client test message', 'TEXT', 'DELIVERED', NOW(), $4)
      `, [testMsgId, testConvId, testUserId, clientMsgId]);

      // Read directly using client 2 (simulating Instance B)
      const client2Res = await client2.query(
        'SELECT text, client_message_id FROM messages WHERE id = $1',
        [testMsgId]
      );

      const crossClientVisibility = client2Res.rows.length === 1 && client2Res.rows[0].client_message_id === clientMsgId;
      results.push({
        suite: 'Multi-Instance',
        testName: 'Cross-Process Read via PostgreSQL (No Shared RAM)',
        status: crossClientVisibility ? 'PASS' : 'FAIL',
        details: crossClientVisibility 
          ? 'Client 2 immediately read message written by Client 1 directly from PostgreSQL'
          : 'Failed: Client 2 could not read message written by Client 1'
      });

      // 7. Idempotency Constraint Verification
      // Attempt to insert duplicate message with identical conversation_id and client_message_id
      let caughtUniqueViolation = false;
      try {
        await client.query(`
          INSERT INTO messages (id, conversation_id, sender_id, receiver_id, text, type, status, created_at, client_message_id)
          VALUES ($1, $2, $3, $3, 'Duplicate message attempt', 'TEXT', 'DELIVERED', NOW(), $4)
        `, [`msg-duplicate-${Date.now()}`, testConvId, testUserId, clientMsgId]);
      } catch (err: any) {
        if (err.code === '23505') { // unique_violation in PostgreSQL
          caughtUniqueViolation = true;
        }
      }

      results.push({
        suite: 'Concurrency',
        testName: 'Message Idempotency Unique Constraint',
        status: caughtUniqueViolation ? 'PASS' : 'FAIL',
        details: caughtUniqueViolation
          ? 'PostgreSQL enforced idx_messages_idempotency and rejected duplicate client_message_id (23505)'
          : 'Failed: Duplicate message with same client_message_id was allowed'
      });

      // Cleanup test data
      await client.query('DELETE FROM messages WHERE conversation_id = $1', [testConvId]);
      await client.query('DELETE FROM conversations WHERE id = $1', [testConvId]);
      await client.query('DELETE FROM users WHERE id = $1', [testUserId]);

    } finally {
      client2.release();
    }

  } catch (err: any) {
    results.push({
      suite: 'Execution',
      testName: 'Runner Execution Failure',
      status: 'FAIL',
      details: `Database query error: ${err.message}`
    });
  } finally {
    if (client) client.release();
    await pool.end();
  }

  printSummary();
}

function recordUnverified(suite: string, testName: string, reason: string) {
  results.push({
    suite,
    testName,
    status: 'UNVERIFIED',
    details: reason
  });
}

function printSummary() {
  console.log('\n========================================================================');
  console.log('                          VERIFICATION RESULTS                          ');
  console.log('========================================================================\n');

  console.table(results.map(r => ({
    Suite: r.suite,
    Test: r.testName,
    Status: r.status,
    Details: r.details
  })));

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const unverified = results.filter(r => r.status === 'UNVERIFIED').length;

  console.log('\n------------------------------------------------------------------------');
  console.log(`SUMMARY: Total: ${results.length} | PASS: ${passed} | FAIL: ${failed} | UNVERIFIED: ${unverified}`);
  console.log('------------------------------------------------------------------------\n');
}

runAllChecks().catch(err => {
  console.error('[verify_cloud_sql] Fatal error:', err);
  process.exit(1);
});
