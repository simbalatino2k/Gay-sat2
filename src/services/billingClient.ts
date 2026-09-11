/**
 * AURA GAY 18+ — Client-Side Unified Billing Provider
 * Integrates real native Google Play BillingClient 9.1.0 on Android,
 * native StoreKit 2 on iOS via Capacitor AuraBilling plugin,
 * and Stripe Checkout on Web/PWA.
 */

import { registerPlugin, Capacitor } from '@capacitor/core';
import type { StoreProduct, UserEntitlement } from '../types';
import { BILLING_PLANS, STORE_PRODUCT_IDS, getBillingPlatform } from '../config/billingConfig';

export interface NativeProduct {
  id: string;
  title: string;
  description: string;
  price: string;
  priceAmountMicros?: number;
  currencyCode?: string;
  billingPeriod?: string;
}

export interface NativePurchaseResult {
  success: boolean;
  purchaseToken?: string;
  orderId?: string;
  packageName?: string;
  transactionJws?: string;
  transactionId?: string;
  originalTransactionId?: string;
  productId: string;
}

export interface NativeRestoreResult {
  success: boolean;
  purchases?: Array<{
    purchaseToken: string;
    productId: string;
    orderId?: string;
    purchaseTime?: number;
  }>;
  transactions?: Array<{
    transactionJws: string;
    productId: string;
    transactionId: string;
    originalTransactionId: string;
  }>;
}

export interface AuraBillingPlugin {
  initializeBilling(): Promise<{ ready: boolean; platform?: string }>;
  getPremiumProducts(): Promise<{ products: NativeProduct[] }>;
  purchasePremium(options: { productId: string; basePlanId?: string }): Promise<NativePurchaseResult>;
  restorePurchases(): Promise<NativeRestoreResult>;
  getNativePurchases(): Promise<NativeRestoreResult>;
  openManageSubscriptions(): Promise<{ success: boolean }>;
}

export const AuraBilling = registerPlugin<AuraBillingPlugin>('AuraBilling');

export interface BillingActionResult {
  success: boolean;
  message?: string;
  error?: string;
  entitlement?: UserEntitlement;
}

class UnifiedBillingClient {
  private platform: 'android' | 'ios' | 'web';
  private cachedProducts: StoreProduct[] | null = null;
  private isNativeBillingInitialized = false;

  constructor() {
    this.platform = getBillingPlatform();
  }

  public getPlatform(): 'android' | 'ios' | 'web' {
    return this.platform;
  }

  private async ensureNativeBillingInitialized(): Promise<void> {
    if (this.isNativeBillingInitialized) return;
    if (Capacitor.isNativePlatform()) {
      try {
        await AuraBilling.initializeBilling();
        this.isNativeBillingInitialized = true;
      } catch (err) {
        console.warn('[BillingClient] AuraBilling native initialization warning:', err);
      }
    }
  }

  /**
   * Fetches localized store products and pricing dynamically.
   * Uses real native store prices (Google Play / StoreKit 2) on mobile,
   * or backend catalog on Web.
   */
  public async getProducts(): Promise<StoreProduct[]> {
    if (this.cachedProducts) return this.cachedProducts;

    // If running inside native Android or iOS app, query native Store products
    if (Capacitor.isNativePlatform()) {
      try {
        await this.ensureNativeBillingInitialized();
        const nativeRes = await AuraBilling.getPremiumProducts();
        if (nativeRes && Array.isArray(nativeRes.products) && nativeRes.products.length > 0) {
          const mapped: StoreProduct[] = nativeRes.products.map(p => {
            const tier = p.id.includes('yearly') ? 'yearly' : p.id.includes('3month') ? 'three_month' : 'monthly';
            const period: 'P1M' | 'P3M' | 'P1Y' = tier === 'yearly' ? 'P1Y' : tier === 'three_month' ? 'P3M' : 'P1M';
            return {
              id: p.id,
              tier,
              title: p.title || (tier === 'yearly' ? 'AURA VIP Annual' : tier === 'three_month' ? 'AURA VIP 3-Month' : 'AURA VIP Monthly'),
              description: p.description || 'Full unlimited access to AURA VIP features',
              localizedPrice: p.price,
              billingPeriod: period
            };
          });
          this.cachedProducts = mapped;
          return mapped;
        }
      } catch (nativeErr) {
        console.warn('[BillingClient] Native getPremiumProducts failed:', nativeErr);
      }
      // On native platforms, NEVER display fallback mock prices
      this.cachedProducts = [];
      return [];
    }

    try {
      const token = localStorage.getItem('aura_auth_token') || sessionStorage.getItem('aura_auth_token');
      const res = await fetch(`/api/billing/products?platform=${this.platform}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.products) && data.products.length > 0) {
          this.cachedProducts = data.products;
          return data.products;
        }
      }
    } catch (err) {
      console.warn('[BillingClient] Could not fetch products from server:', err);
    }

    return [];
  }

  /**
   * Initiates a purchase through the platform-appropriate store.
   * Google Play Billing on Android, StoreKit 2 on iOS, Stripe on Web.
   */
  public async purchase(productId: string): Promise<BillingActionResult> {
    const token = localStorage.getItem('aura_auth_token') || sessionStorage.getItem('aura_auth_token');
    if (!token) {
      return { success: false, error: 'You must be signed in to purchase AURA Premium.' };
    }

    if (this.platform === 'android') {
      return this.purchaseGooglePlay(productId, token);
    } else if (this.platform === 'ios') {
      return this.purchaseAppleStoreKit(productId, token);
    } else {
      return this.purchaseWebStripe(productId, token);
    }
  }

  /**
   * Real Google Play Billing Purchase Flow (Android)
   * Invokes native BillingClient 9.1.0 and sends verified purchase token to backend.
   */
  private async purchaseGooglePlay(productId: string, token: string): Promise<BillingActionResult> {
    try {
      if (!Capacitor.isNativePlatform()) {
        return {
          success: false,
          error: 'Google Play purchases must be completed on an Android device running the official AURA app.'
        };
      }

      await this.ensureNativeBillingInitialized();
      console.log(`[Google Play Billing] Invoking native BillingClient for product ${productId}...`);

      const nativeResult = await AuraBilling.purchasePremium({
        productId,
        basePlanId: productId.includes('yearly') ? 'aura-vip-annual' : productId.includes('3month') ? 'aura-vip-3month' : 'aura-vip-monthly'
      });

      if (!nativeResult || !nativeResult.purchaseToken) {
        return {
          success: false,
          error: 'Google Play purchase was cancelled or did not produce a valid purchase token.'
        };
      }

      console.log('[Google Play Billing] Native purchase completed. Verifying server-side...');
      const res = await fetch('/api/billing/google-play/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          packageName: nativeResult.packageName || 'app.aura.gay18',
          subscriptionId: productId,
          purchaseToken: nativeResult.purchaseToken
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Google Play purchase verification failed on server.' };
      }

      return {
        success: true,
        message: 'Google Play subscription confirmed! Welcome to AURA Premium.',
        entitlement: data.entitlement
      };
    } catch (err: any) {
      console.error('[Google Play Billing] Purchase error:', err);
      return { success: false, error: err.message || 'An error occurred during Google Play checkout.' };
    }
  }

  /**
   * Real Apple StoreKit 2 Purchase Flow (iOS)
   * Invokes native StoreKit 2 Product.purchase() and sends cryptographic JWS to backend.
   */
  private async purchaseAppleStoreKit(productId: string, token: string): Promise<BillingActionResult> {
    try {
      if (!Capacitor.isNativePlatform()) {
        return {
          success: false,
          error: 'Apple StoreKit purchases must be completed on an iOS device running the official AURA app.'
        };
      }

      await this.ensureNativeBillingInitialized();
      console.log(`[Apple StoreKit 2] Invoking native StoreKit 2 for product ${productId}...`);

      const nativeResult = await AuraBilling.purchasePremium({ productId });

      if (!nativeResult || !nativeResult.transactionJws) {
        return {
          success: false,
          error: 'StoreKit 2 purchase was cancelled or did not produce a signed transaction.'
        };
      }

      console.log('[Apple StoreKit 2] Native purchase completed. Verifying cryptographic signature server-side...');
      const res = await fetch('/api/billing/apple-storekit/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          transactionJws: nativeResult.transactionJws
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'StoreKit 2 cryptographic verification failed on server.' };
      }

      return {
        success: true,
        message: 'Apple StoreKit subscription verified! Welcome to AURA Premium.',
        entitlement: data.entitlement
      };
    } catch (err: any) {
      console.error('[Apple StoreKit 2] Purchase error:', err);
      return { success: false, error: err.message || 'An error occurred during Apple StoreKit purchase.' };
    }
  }

  /**
   * Web Stripe Checkout Flow (Web / PWA)
   */
  private async purchaseWebStripe(productId: string, token: string): Promise<BillingActionResult> {
    try {
      const planId = productId.includes('yearly') ? 'aura_vip_annual' : 'aura_vip_monthly';
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ planId })
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        return { success: false, error: data.error || 'Failed to start Web checkout session.' };
      }

      window.location.href = data.url;
      return { success: true, message: 'Redirecting to secure Stripe Checkout...' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error connecting to payment gateway.' };
    }
  }

  /**
   * Reconciles & Restores Purchases using real native queries or database state.
   */
  public async restorePurchases(): Promise<BillingActionResult> {
    const token = localStorage.getItem('aura_auth_token') || sessionStorage.getItem('aura_auth_token');
    if (!token) {
      return { success: false, error: 'Sign in first to restore purchases.' };
    }

    try {
      // On Android native: query real purchases via BillingClient.queryPurchasesAsync
      if (Capacitor.isNativePlatform() && this.platform === 'android') {
        await this.ensureNativeBillingInitialized();
        const restoreData = await AuraBilling.restorePurchases();
        if (restoreData && Array.isArray(restoreData.purchases) && restoreData.purchases.length > 0) {
          // Verify the most recent active purchase with backend
          const activeSub = restoreData.purchases[0];
          const verifyRes = await fetch('/api/billing/google-play/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              packageName: 'app.aura.gay18',
              subscriptionId: activeSub.productId,
              purchaseToken: activeSub.purchaseToken
            })
          });
          const vData = await verifyRes.json();
          if (verifyRes.ok && vData.success && vData.entitlement) {
            return {
              success: true,
              message: 'Google Play subscription successfully restored!',
              entitlement: vData.entitlement
            };
          }
        }
      }

      // On iOS native: query real entitlements via StoreKit 2 Transaction.currentEntitlements
      if (Capacitor.isNativePlatform() && this.platform === 'ios') {
        await this.ensureNativeBillingInitialized();
        const restoreData = await AuraBilling.restorePurchases();
        if (restoreData && Array.isArray(restoreData.transactions) && restoreData.transactions.length > 0) {
          const activeTx = restoreData.transactions[0];
          const verifyRes = await fetch('/api/billing/apple-storekit/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              transactionJws: activeTx.transactionJws
            })
          });
          const vData = await verifyRes.json();
          if (verifyRes.ok && vData.success && vData.entitlement) {
            return {
              success: true,
              message: 'Apple StoreKit subscription successfully restored!',
              entitlement: vData.entitlement
            };
          }
        }
      }

      // Standard restore endpoint fallback (checks PostgreSQL authoritative entitlements)
      const res = await fetch('/api/billing/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          provider: this.platform === 'android' ? 'google_play' : this.platform === 'ios' ? 'apple_storekit' : 'stripe'
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.message || 'No active subscriptions found for this store account.'
        };
      }

      return {
        success: true,
        message: data.message || 'Subscription successfully restored!',
        entitlement: data.entitlement
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Could not contact store to restore purchases.' };
    }
  }

  /**
   * Fetches latest user entitlement from backend source of truth.
   */
  public async fetchEntitlement(): Promise<UserEntitlement | null> {
    const token = localStorage.getItem('aura_auth_token') || sessionStorage.getItem('aura_auth_token');
    if (!token) return null;

    try {
      const res = await fetch('/api/billing/entitlements', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        return data.entitlement || null;
      }
    } catch (err) {
      console.warn('[BillingClient] Error loading entitlement:', err);
    }
    return null;
  }

  /**
   * Deep links to native Store Subscription Management.
   * Google Play on Android, Apple ID Subscriptions on iOS, Stripe Portal on Web.
   */
  public async openSubscriptionManagement(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        await AuraBilling.openManageSubscriptions();
        return;
      } catch (err) {
        console.warn('[BillingClient] AuraBilling.openManageSubscriptions fallback:', err);
      }
    }

    if (this.platform === 'android') {
      const url = 'https://play.google.com/store/account/subscriptions?package=app.aura.gay18';
      window.open(url, '_system');
    } else if (this.platform === 'ios') {
      const url = 'https://apps.apple.com/account/subscriptions';
      window.open(url, '_system');
    } else {
      alert('To manage or cancel your web subscription, visit your Stripe receipt email or customer portal.');
    }
  }

  // Normalized API methods matching store release specification
  public async initializeBilling(): Promise<{ ready: boolean; platform: string }> {
    await this.ensureNativeBillingInitialized();
    return { ready: this.isNativeBillingInitialized, platform: this.platform };
  }

  public async getPremiumProducts(): Promise<StoreProduct[]> {
    return this.getProducts();
  }

  public async purchasePremium(productId: string): Promise<BillingActionResult> {
    return this.purchase(productId);
  }

  public async getNativePurchases(): Promise<NativeRestoreResult | null> {
    if (!Capacitor.isNativePlatform()) return null;
    try {
      await this.ensureNativeBillingInitialized();
      return await AuraBilling.getNativePurchases();
    } catch (err) {
      console.warn('[BillingClient] getNativePurchases error:', err);
      return null;
    }
  }

  public async getEntitlements(): Promise<UserEntitlement | null> {
    return this.fetchEntitlement();
  }

  public async openManageSubscriptions(): Promise<void> {
    return this.openSubscriptionManagement();
  }
}

export const billingClient = new UnifiedBillingClient();
