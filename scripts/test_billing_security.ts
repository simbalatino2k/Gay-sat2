/**
 * AURA GAY 18+ — Billing Security & Fail-Closed Test Suite
 * Validates:
 * 1. Missing Google credentials -> 503 BILLING_NOT_CONFIGURED (Fail-Closed)
 * 2. Invalid / forged Apple JWS -> SignedDataVerifier rejects -> 400 (Fail-Closed)
 * 3. Replay / Token Hijacking -> 409 CONFLICT (No reassignment)
 * 4. Revocation / Refund handling -> isPremium = false, status = revoked
 */

import {
  verifyGooglePlayPurchase,
  verifyAppleStoreKitTransaction,
  hashPurchaseToken
} from '../src/services/billingService';
import { store } from '../src/db/store';

async function runTests() {
  console.log('==============================================');
  console.log('AURA BILLING SECURITY & FAIL-CLOSED TEST SUITE');
  console.log('==============================================\n');

  let passed = 0;
  let failed = 0;

  // TEST 1: Missing Google Credentials -> Fail Closed (503)
  console.log('--- TEST 1: Missing Google Credentials Fail-Closed ---');
  delete process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  const t1Result = await verifyGooglePlayPurchase({
    packageName: 'app.aura.gay18',
    subscriptionId: 'aura.premium.monthly',
    purchaseToken: 'test_token_12345',
    userId: 'test_user_1'
  });

  if (!t1Result.valid && t1Result.statusCode === 503 && t1Result.error?.includes('BILLING_NOT_CONFIGURED')) {
    console.log('PASS: Google Play verification failed closed with 503 when credentials missing.');
    passed++;
  } else {
    console.error('FAIL: Expected 503 BILLING_NOT_CONFIGURED, got:', t1Result);
    failed++;
  }

  // Verify no entitlement was written
  const t1Entitlement = await store.getUserEntitlements('test_user_1');
  if (!t1Entitlement.premium) {
    console.log('PASS: No entitlement granted to user.');
    passed++;
  } else {
    console.error('FAIL: User was granted premium despite missing credentials!');
    failed++;
  }

  // TEST 2: Invalid / Forged Apple JWS -> Rejection (400)
  console.log('\n--- TEST 2: Forged Apple JWS Signature Rejection ---');
  const fakeJws = 'eyJhbGciOiJFUzI1NiJ9.eyJidW5kbGVJZCI6ImFwcC5hdXJhLmdheTE4IiwicHJvZHVjdElkIjoiYXVyYS5wcmVtaXVtLm1vbnRobHkifQ.invalidsignaturehere';
  const t2Result = await verifyAppleStoreKitTransaction({
    transactionJws: fakeJws,
    userId: 'test_user_2'
  });

  if (!t2Result.valid && t2Result.statusCode === 400 && t2Result.error?.includes('cryptographic verification failed')) {
    console.log('PASS: SignedDataVerifier rejected forged JWS with 400 status code.');
    passed++;
  } else {
    console.error('FAIL: Expected 400 with cryptographic verification failure, got:', t2Result);
    failed++;
  }

  const t2Entitlement = await store.getUserEntitlements('test_user_2');
  if (!t2Entitlement.premium) {
    console.log('PASS: No entitlement granted for forged Apple JWS.');
    passed++;
  } else {
    console.error('FAIL: User was granted premium for forged Apple JWS!');
    failed++;
  }

  // TEST 3: Replay / Collision / Token Hijacking Protection -> 409
  console.log('\n--- TEST 3: Purchase Token Replay & Ownership Guard ---');
  const sharedToken = 'legit_store_purchase_token_abc123';
  const tokenHash = hashPurchaseToken(sharedToken);

  // Authoritatively record existing ownership by User A
  await store.recordStoreEntitlement({
    userId: 'user_owner_alice',
    premium: true,
    provider: 'google_play',
    productId: 'aura.premium.monthly',
    planTier: 'monthly',
    status: 'active',
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    autoRenew: true,
    purchaseTokenHash: tokenHash,
    environment: 'sandbox',
    lastVerifiedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  // User B tries to claim the same token
  const t3Result = await verifyGooglePlayPurchase({
    packageName: 'app.aura.gay18',
    subscriptionId: 'aura.premium.monthly',
    purchaseToken: sharedToken,
    userId: 'user_attacker_bob'
  });

  if (!t3Result.valid && t3Result.statusCode === 409) {
    console.log('PASS: Token replay attempt rejected with 409 CONFLICT.');
    passed++;
  } else {
    console.error('FAIL: Expected 409 CONFLICT on claimed token, got:', t3Result);
    failed++;
  }

  // Verify User B did not get premium
  const bobEntitlement = await store.getUserEntitlements('user_attacker_bob');
  if (!bobEntitlement.premium) {
    console.log('PASS: Attacker was not granted entitlement.');
    passed++;
  } else {
    console.error('FAIL: Attacker obtained entitlement through replay!');
    failed++;
  }

  // TEST 4: Revocation / Expiration Handling
  console.log('\n--- TEST 4: Revocation / Expiration Entitlement State ---');
  await store.recordStoreEntitlement({
    userId: 'user_revoked_charlie',
    premium: false,
    provider: 'apple_storekit',
    productId: 'aura.premium.yearly',
    planTier: 'yearly',
    status: 'revoked',
    expiresAt: new Date(Date.now() - 3600000).toISOString(),
    autoRenew: false,
    environment: 'sandbox',
    lastVerifiedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  const charlieEntitlement = await store.getUserEntitlements('user_revoked_charlie');
  if (!charlieEntitlement.premium && charlieEntitlement.status === 'revoked') {
    console.log('PASS: Revoked status authoritatively persists premium = false.');
    passed++;
  } else {
    console.error('FAIL: Revoked entitlement returned active status!');
    failed++;
  }

  console.log('\n==============================================');
  console.log(`TOTAL PASSED: ${passed}, FAILED: ${failed}`);
  console.log('==============================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
