/**
 * AURA GAY 18+ — Backend Billing & Entitlement Service
 * Real production verification for:
 * - Google Play Billing (Subscriptions v2 via official googleapis)
 * - Google Play Real-Time Developer Notifications (RTDN via Cloud Pub/Sub)
 * - Apple StoreKit 2 (Cryptographic JWS verification via @apple/app-store-server-library)
 * - Apple App Store Server Notifications V2 (SignedDataVerifier)
 * - Persistent PostgreSQL storage (store_subscriptions, store_billing_events)
 */

import crypto from 'crypto';
import { google } from 'googleapis';
import {
  SignedDataVerifier,
  Environment,
  ResponseBodyV2DecodedPayload,
  JWSTransactionDecodedPayload
} from '@apple/app-store-server-library';
import type { UserEntitlement, BillingProviderType, EntitlementStatus, PlanTier } from '../types';
import { STORE_PRODUCT_IDS, resolveTierFromProductId } from '../config/billingConfig';
import { store } from '../db/store';
import { getAppleRootCertificates } from '../config/appleCerts';

export interface GooglePlayVerifyParams {
  packageName: string;
  subscriptionId: string;
  purchaseToken: string;
  userId: string;
}

export interface AppleStoreKitVerifyParams {
  transactionJws: string;
  userId: string;
}

export interface VerificationResult {
  valid: boolean;
  entitlement?: UserEntitlement;
  error?: string;
  statusCode?: number;
  requiresAcknowledgment?: boolean;
}

/**
 * SHA-256 hash helper for purchase tokens (for collision check & secure indexing)
 */
export function hashPurchaseToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

/**
 * Helper to initialize the official Google Play Android Publisher API client.
 * Returns null if credentials are not configured in environment.
 */
export function getGooglePlayAndroidPublisher() {
  const serviceAccountJson = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) {
    return null;
  }

  try {
    const credentials = JSON.parse(serviceAccountJson);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/androidpublisher']
    });
    return google.androidpublisher({ version: 'v3', auth });
  } catch (err: any) {
    console.error('[Google Play Billing] Error parsing GOOGLE_PLAY_SERVICE_ACCOUNT_JSON:', err.message);
    return null;
  }
}

/**
 * Helper to initialize Apple StoreKit 2 SignedDataVerifier using official Apple Root Certificates.
 */
export function getAppleSignedDataVerifier(): SignedDataVerifier | null {
  try {
    const certs = getAppleRootCertificates();
    const isProd = process.env.NODE_ENV === 'production' && !process.env.APPLE_USE_SANDBOX;
    const environment = isProd ? Environment.PRODUCTION : Environment.SANDBOX;
    const expectedBundle = process.env.APPLE_BUNDLE_ID || 'app.aura.gay18';
    const appAppleId = process.env.APPLE_APP_ID ? parseInt(process.env.APPLE_APP_ID, 10) : undefined;

    // In production, Apple requires appAppleId for signature chain verification
    if (environment === Environment.PRODUCTION && appAppleId === undefined) {
      console.warn('[Apple StoreKit] APPLE_APP_ID is not configured for production verifier.');
      return null;
    }

    return new SignedDataVerifier(certs, false, environment, expectedBundle, appAppleId);
  } catch (err: any) {
    console.error('[Apple StoreKit] Error creating SignedDataVerifier:', err.message);
    return null;
  }
}

/**
 * Verifies a Google Play Subscription purchase token using Google Play Developer API (Subscriptions v2).
 * Fails closed if credentials are not configured or verification fails.
 */
export async function verifyGooglePlayPurchase(params: GooglePlayVerifyParams): Promise<VerificationResult> {
  const { packageName, subscriptionId, purchaseToken, userId } = params;

  if (!packageName || !subscriptionId || !purchaseToken || !userId) {
    return { valid: false, error: 'Missing required Google Play verification parameters.', statusCode: 400 };
  }

  // Strictly validate package name matches AURA production package
  const expectedPackage = process.env.GOOGLE_PLAY_PACKAGE_NAME || 'app.aura.gay18';
  if (packageName !== expectedPackage) {
    return { valid: false, error: `Package name mismatch. Expected ${expectedPackage}, got ${packageName}`, statusCode: 400 };
  }

  // Strictly validate product ID matches configured AURA tiers
  const validProductIds = Object.values(STORE_PRODUCT_IDS) as string[];
  if (!validProductIds.includes(subscriptionId)) {
    return { valid: false, error: `Unknown or unconfigured Google Play product ID: ${subscriptionId}`, statusCode: 400 };
  }

  const tokenHash = hashPurchaseToken(purchaseToken);
  const planTier = resolveTierFromProductId(subscriptionId);

  // Prevent account takeover: verify this purchase token is not assigned to another AURA user
  const existingOwner = await store.findUserByPurchaseTokenHash(tokenHash);
  if (existingOwner && existingOwner.id !== userId) {
    return {
      valid: false,
      error: 'This Google Play purchase token is already associated with another AURA account. Please restore purchases from the original account.',
      statusCode: 409
    };
  }

  // Obtain Google API client
  const play = getGooglePlayAndroidPublisher();
  if (!play) {
    console.error('[Google Play Billing] GOOGLE_PLAY_SERVICE_ACCOUNT_JSON not configured. Verification failing closed.');
    return {
      valid: false,
      error: 'BILLING_NOT_CONFIGURED: Google Play API credentials missing on server.',
      statusCode: 503
    };
  }

  try {
    console.log(`[Google Play Billing] Calling Subscriptions v2 for package ${packageName}, token hash ${tokenHash.slice(0, 10)}...`);
    const subRes = await play.purchases.subscriptionsv2.get({
      packageName,
      token: purchaseToken
    });

    const sub = subRes.data;
    if (!sub || !sub.subscriptionState) {
      return { valid: false, error: 'Invalid or empty subscription response from Google Play Developer API.', statusCode: 400 };
    }

    // Google Play Subscriptions v2 States:
    // SUBSCRIPTION_STATE_UNSPECIFIED (0)
    // SUBSCRIPTION_STATE_PENDING (1)
    // SUBSCRIPTION_STATE_ACTIVE (2)
    // SUBSCRIPTION_STATE_PAUSED (3)
    // SUBSCRIPTION_STATE_IN_GRACE_PERIOD (4)
    // SUBSCRIPTION_STATE_ON_HOLD (5)
    // SUBSCRIPTION_STATE_CANCELED (6)
    // SUBSCRIPTION_STATE_EXPIRED (7)
    const state = sub.subscriptionState;
    let status: EntitlementStatus = 'active';
    let isPremium = false;

    if (state === 'SUBSCRIPTION_STATE_ACTIVE') {
      status = 'active';
      isPremium = true;
    } else if (state === 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD') {
      status = 'grace_period';
      isPremium = true;
    } else if (state === 'SUBSCRIPTION_STATE_ON_HOLD' || state === 'SUBSCRIPTION_STATE_PAUSED') {
      status = 'account_hold';
      isPremium = false;
    } else if (state === 'SUBSCRIPTION_STATE_CANCELED') {
      status = 'canceled';
      // If still within active paid period before expiry, premium remains true
      isPremium = true;
    } else {
      status = 'expired';
      isPremium = false;
    }

    // Inspect line items for verified product ID & expiry
    let verifiedProductId = subscriptionId;
    let expiryTime = sub.lineItems?.[0]?.expiryTime;
    let autoRenew = false;

    if (sub.lineItems && sub.lineItems.length > 0) {
      const item = sub.lineItems[0];
      if (item.productId && validProductIds.includes(item.productId)) {
        verifiedProductId = item.productId;
      }
      if (item.autoRenewingPlan?.autoRenewEnabled) {
        autoRenew = true;
      }
    }

    // If Google reports expired time in the past, subscription cannot grant Premium
    if (expiryTime && new Date(expiryTime).getTime() <= Date.now()) {
      isPremium = false;
      status = 'expired';
    }

    if (!isPremium) {
      return {
        valid: false,
        error: `Subscription state is '${state}' with expiry '${expiryTime}'. Premium entitlement not granted.`,
        statusCode: 402
      };
    }

    // Handle required acknowledgement to prevent Google auto-refund within 3 days
    if (sub.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_PENDING_PURCHASE_CONFIRMATION' || !sub.acknowledgementState) {
      try {
        console.log(`[Google Play Billing] Acknowledging subscription ${verifiedProductId}...`);
        await play.purchases.subscriptions.acknowledge({
          packageName,
          subscriptionId: verifiedProductId,
          token: purchaseToken
        });
      } catch (ackErr: any) {
        console.warn('[Google Play Billing] Acknowledge warning (may already be acknowledged):', ackErr.message);
      }
    }

    const entitlement: UserEntitlement = {
      userId,
      premium: isPremium,
      provider: 'google_play',
      productId: verifiedProductId,
      planTier: resolveTierFromProductId(verifiedProductId),
      status,
      expiresAt: expiryTime || new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      autoRenew,
      purchaseTokenHash: tokenHash,
      environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
      lastVerifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Authoritatively persist in PostgreSQL database
    await store.recordStoreEntitlement(entitlement);
    return { valid: true, entitlement, requiresAcknowledgment: true };
  } catch (apiErr: any) {
    console.error('[Google Play Billing] API verification failure:', apiErr.message);
    return {
      valid: false,
      error: `Google Play API verification failed: ${apiErr.message}`,
      statusCode: apiErr.code || 400
    };
  }
}

/**
 * Verifies an Apple StoreKit 2 Transaction cryptographically using @apple/app-store-server-library SignedDataVerifier.
 * Validates Apple Root CA certificate chain, JWS signature, bundle ID, product ID, and expiry.
 * Fails closed if credentials or verifier cannot be established.
 */
export async function verifyAppleStoreKitTransaction(params: AppleStoreKitVerifyParams): Promise<VerificationResult> {
  const { transactionJws, userId } = params;

  if (!transactionJws || !userId) {
    return { valid: false, error: 'Missing required StoreKit transaction parameters.', statusCode: 400 };
  }

  const verifier = getAppleSignedDataVerifier();
  if (!verifier) {
    console.error('[Apple StoreKit] SignedDataVerifier unavailable. Verification failing closed.');
    return {
      valid: false,
      error: 'BILLING_NOT_CONFIGURED: Apple StoreKit verifier credentials missing on server.',
      statusCode: 503
    };
  }

  try {
    console.log('[Apple StoreKit] Cryptographically verifying StoreKit 2 transaction JWS...');
    const tx: JWSTransactionDecodedPayload = await verifier.verifyAndDecodeTransaction(transactionJws);

    const expectedBundle = process.env.APPLE_BUNDLE_ID || 'app.aura.gay18';
    if (tx.bundleId !== expectedBundle) {
      return { valid: false, error: `Bundle ID mismatch. Expected ${expectedBundle}, got ${tx.bundleId}`, statusCode: 400 };
    }

    const validProductIds = Object.values(STORE_PRODUCT_IDS) as string[];
    if (!tx.productId || !validProductIds.includes(tx.productId)) {
      return { valid: false, error: `Unrecognized Apple StoreKit product ID: ${tx.productId}`, statusCode: 400 };
    }

    const originalTransactionId = String(tx.originalTransactionId || tx.transactionId);

    // Replay / conflict check
    const existingOwner = await store.findUserByOriginalTransactionId(originalTransactionId);
    if (existingOwner && existingOwner.id !== userId) {
      return {
        valid: false,
        error: 'This Apple subscription is already associated with another AURA account. Please use Restore Purchases from your original account.',
        statusCode: 409
      };
    }

    const now = Date.now();
    let status: EntitlementStatus = 'active';
    let isPremium = true;

    if (tx.revocationDate && tx.revocationDate <= now) {
      status = 'revoked';
      isPremium = false;
    } else if (tx.expiresDate && tx.expiresDate <= now) {
      status = 'expired';
      isPremium = false;
    }

    if (!isPremium) {
      return {
        valid: false,
        error: `Apple subscription is not active (status: ${status}, expiresDate: ${tx.expiresDate}).`,
        statusCode: 402
      };
    }

    const planTier = resolveTierFromProductId(tx.productId);
    const expiresAt = tx.expiresDate
      ? new Date(tx.expiresDate).toISOString()
      : new Date(now + 30 * 24 * 3600 * 1000).toISOString();

    const entitlement: UserEntitlement = {
      userId,
      premium: isPremium,
      provider: 'apple_storekit',
      productId: tx.productId,
      planTier,
      status,
      expiresAt,
      autoRenew: !tx.revocationDate,
      originalTransactionId,
      storeTransactionId: String(tx.transactionId),
      environment: tx.environment === 'Sandbox' ? 'sandbox' : 'production',
      lastVerifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Authoritatively persist in PostgreSQL database
    await store.recordStoreEntitlement(entitlement);
    return { valid: true, entitlement };
  } catch (err: any) {
    console.error('[Apple StoreKit] Cryptographic verification failed:', err.message);
    return {
      valid: false,
      error: `Apple StoreKit cryptographic verification failed: ${err.message}`,
      statusCode: 400
    };
  }
}

/**
 * Handles Google Play Real-Time Developer Notifications (RTDN) from Cloud Pub/Sub.
 * Uses persistent PostgreSQL store_billing_events for idempotency.
 * Calls Google Play Developer API to obtain authoritative subscription state.
 */
export async function handleGooglePlayRtdn(pubsubMessage: { data: string; messageId: string; publishTime: string }): Promise<{ success: boolean; reason?: string }> {
  if (!pubsubMessage || !pubsubMessage.data) {
    return { success: false, reason: 'Empty Pub/Sub message' };
  }

  const messageId = pubsubMessage.messageId;

  // Persistent idempotency check in PostgreSQL
  const alreadyProcessed = await store.isStoreEventProcessed('google_play', messageId);
  if (alreadyProcessed) {
    console.log(`[Google Play RTDN] Duplicate message ${messageId} ignored.`);
    return { success: true, reason: 'Already processed' };
  }

  try {
    const decoded = JSON.parse(Buffer.from(pubsubMessage.data, 'base64').toString('utf-8'));
    await store.recordStoreBillingEvent(messageId, 'google_play', messageId, 'RTDN', decoded);

    const { subscriptionNotification, testNotification } = decoded;

    if (testNotification) {
      console.log('[Google Play RTDN] Test notification received successfully from Google Cloud Pub/Sub.');
      return { success: true, reason: 'Test notification verified' };
    }

    if (!subscriptionNotification) {
      return { success: true, reason: 'Non-subscription notification' };
    }

    const { purchaseToken, subscriptionId } = subscriptionNotification;
    if (!purchaseToken) {
      return { success: true, reason: 'No purchase token in notification' };
    }

    const tokenHash = hashPurchaseToken(purchaseToken);
    const user = await store.findUserByPurchaseTokenHash(tokenHash);

    if (!user) {
      console.warn(`[Google Play RTDN] Notification received for unlinked token hash: ${tokenHash.slice(0, 10)}`);
      return { success: true, reason: 'User not found for token' };
    }

    // Call Google Play Developer API to obtain real authoritative state
    const play = getGooglePlayAndroidPublisher();
    if (play) {
      const packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME || 'app.aura.gay18';
      const subRes = await play.purchases.subscriptionsv2.get({
        packageName,
        token: purchaseToken
      });

      const sub = subRes.data;
      if (sub && sub.subscriptionState) {
        const isPrem = sub.subscriptionState === 'SUBSCRIPTION_STATE_ACTIVE' || sub.subscriptionState === 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD';
        let status: EntitlementStatus = 'active';
        if (sub.subscriptionState === 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD') status = 'grace_period';
        else if (sub.subscriptionState === 'SUBSCRIPTION_STATE_ON_HOLD') status = 'account_hold';
        else if (sub.subscriptionState === 'SUBSCRIPTION_STATE_CANCELED') status = 'canceled';
        else if (sub.subscriptionState === 'SUBSCRIPTION_STATE_EXPIRED') status = 'expired';

        const existingEntitlement = await store.getUserEntitlements(user.id);
        const updated: UserEntitlement = {
          ...existingEntitlement,
          userId: user.id,
          premium: isPrem,
          provider: 'google_play',
          productId: subscriptionId || existingEntitlement.productId,
          status,
          expiresAt: sub.lineItems?.[0]?.expiryTime || existingEntitlement.expiresAt,
          lastVerifiedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await store.recordStoreEntitlement(updated);
        console.log(`[Google Play RTDN] Authoritatively updated user ${user.id} status to ${status} (premium: ${isPrem})`);
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('[Google Play RTDN] Processing error:', err.message);
    return { success: false, reason: err.message };
  }
}

/**
 * Handles App Store Server Notifications V2 from Apple.
 * Cryptographically verifies signedPayload using SignedDataVerifier.
 * Stores idempotency in PostgreSQL store_billing_events.
 */
export async function handleAppleStoreKitWebhook(signedPayload: string): Promise<{ success: boolean; reason?: string }> {
  if (!signedPayload) {
    return { success: false, reason: 'Missing signedPayload' };
  }

  const verifier = getAppleSignedDataVerifier();
  if (!verifier) {
    console.error('[Apple StoreKit Webhook] Verifier unavailable to process notification.');
    return { success: false, reason: 'Verifier unavailable' };
  }

  try {
    // Cryptographically verify and decode the Apple V2 notification
    const notification: ResponseBodyV2DecodedPayload = await verifier.verifyAndDecodeNotification(signedPayload);
    const notificationUUID = notification.notificationUUID;

    if (notificationUUID) {
      const alreadyProcessed = await store.isStoreEventProcessed('apple_storekit', notificationUUID);
      if (alreadyProcessed) {
        console.log(`[Apple StoreKit Webhook] Duplicate notification ${notificationUUID} ignored.`);
        return { success: true, reason: 'Already processed' };
      }
      await store.recordStoreBillingEvent(notificationUUID, 'apple_storekit', notificationUUID, notification.notificationType || 'UNKNOWN', notification);
    }

    const notificationType = notification.notificationType;
    const data = notification.data;

    if (!data || !data.signedTransactionInfo) {
      console.log(`[Apple StoreKit Webhook] Notification ${notificationType} contained no signedTransactionInfo.`);
      return { success: true };
    }

    // Cryptographically decode the embedded transaction
    const tx: JWSTransactionDecodedPayload = await verifier.verifyAndDecodeTransaction(data.signedTransactionInfo);
    const originalTransactionId = String(tx.originalTransactionId || tx.transactionId);
    const user = await store.findUserByOriginalTransactionId(originalTransactionId);

    if (!user) {
      console.warn(`[Apple StoreKit Webhook] No user found for originalTransactionId: ${originalTransactionId}`);
      return { success: true, reason: 'User not found' };
    }

    let status: EntitlementStatus = 'active';
    let isPremium = true;

    switch (notificationType) {
      case 'SUBSCRIBED':
      case 'DID_RENEW':
        status = 'active';
        isPremium = true;
        break;
      case 'EXPIRED':
        status = 'expired';
        isPremium = false;
        break;
      case 'REVOKE':
      case 'REFUND':
        status = 'revoked';
        isPremium = false;
        break;
      case 'DID_FAIL_TO_RENEW':
        status = 'grace_period';
        isPremium = true;
        break;
      case 'GRACE_PERIOD_EXPIRED':
        status = 'account_hold';
        isPremium = false;
        break;
      default:
        status = 'active';
        isPremium = true;
    }

    const existingEntitlement = await store.getUserEntitlements(user.id);
    const updated: UserEntitlement = {
      ...existingEntitlement,
      userId: user.id,
      premium: isPremium,
      provider: 'apple_storekit',
      productId: tx.productId || existingEntitlement.productId,
      status,
      expiresAt: tx.expiresDate ? new Date(tx.expiresDate).toISOString() : existingEntitlement.expiresAt,
      lastVerifiedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await store.recordStoreEntitlement(updated);
    console.log(`[Apple StoreKit Webhook] Authoritatively updated user ${user.id} to ${status} via ${notificationType}`);
    return { success: true };
  } catch (err: any) {
    console.error('[Apple StoreKit Webhook] Signature verification error:', err.message);
    return { success: false, reason: err.message };
  }
}

/**
 * Restores and reconciles user entitlements from persistent PostgreSQL storage or stores.
 */
export async function restoreUserPurchases(
  userId: string,
  receiptData?: string,
  provider?: BillingProviderType
): Promise<{ success: boolean; entitlement: UserEntitlement; message: string }> {
  const current = await store.getUserEntitlements(userId);
  if (current.premium && (current.status === 'active' || current.status === 'grace_period')) {
    return {
      success: true,
      entitlement: current,
      message: 'Active subscription found and restored for your account.'
    };
  }

  // If receipt data is provided from native client, verify it directly with Google or Apple
  if (receiptData && provider === 'google_play') {
    try {
      const parsed = JSON.parse(receiptData);
      const res = await verifyGooglePlayPurchase({
        packageName: parsed.packageName || 'app.aura.gay18',
        subscriptionId: parsed.productId,
        purchaseToken: parsed.purchaseToken,
        userId
      });
      if (res.valid && res.entitlement) {
        return {
          success: true,
          entitlement: res.entitlement,
          message: 'Google Play subscription successfully restored.'
        };
      }
    } catch {
      // Pass through
    }
  } else if (receiptData && provider === 'apple_storekit') {
    const res = await verifyAppleStoreKitTransaction({
      transactionJws: receiptData,
      userId
    });
    if (res.valid && res.entitlement) {
      return {
        success: true,
        entitlement: res.entitlement,
        message: 'Apple StoreKit subscription successfully restored.'
      };
    }
  }

  return {
    success: false,
    entitlement: current,
    message: 'No active subscriptions were found for this store account.'
  };
}
