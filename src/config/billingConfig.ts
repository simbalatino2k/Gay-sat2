/**
 * AURA GAY 18+ — Centralized Billing & Entitlement Configuration
 * Strictly follows Google Play Billing & Apple StoreKit 2 guidelines.
 */

import { Capacitor } from '@capacitor/core';
import type { PlanTier, StoreProduct } from '../types';

export const SUBSCRIPTION_GROUP_NAME = 'AURA Premium';

export const STORE_PRODUCT_IDS = {
  MONTHLY: 'aura.premium.monthly',
  THREE_MONTH: 'aura.premium.3month',
  YEARLY: 'aura.premium.yearly'
} as const;

export const STRIPE_PLAN_IDS = {
  MONTHLY: 'aura_vip_monthly',
  YEARLY: 'aura_vip_annual'
} as const;

export interface PlanConfig {
  id: string;
  tier: PlanTier;
  fallbackTitle: string;
  fallbackDescription: string;
  fallbackPrice?: string;
  billingPeriod: 'P1M' | 'P3M' | 'P1Y';
  durationMonths: number;
}

export const BILLING_PLANS: Record<PlanTier, PlanConfig> = {
  monthly: {
    id: STORE_PRODUCT_IDS.MONTHLY,
    tier: 'monthly',
    fallbackTitle: 'AURA Premium Monthly',
    fallbackDescription: 'Full access to all VIP features, renewed monthly.',
    billingPeriod: 'P1M',
    durationMonths: 1
  },
  three_month: {
    id: STORE_PRODUCT_IDS.THREE_MONTH,
    tier: 'three_month',
    fallbackTitle: 'AURA Premium 3 Months',
    fallbackDescription: 'Popular option with seasonal savings, renewed every 3 months.',
    billingPeriod: 'P3M',
    durationMonths: 3
  },
  yearly: {
    id: STORE_PRODUCT_IDS.YEARLY,
    tier: 'yearly',
    fallbackTitle: 'AURA Premium Yearly',
    fallbackDescription: 'Best value VIP pass, billed annually.',
    billingPeriod: 'P1Y',
    durationMonths: 12
  }
};

/**
 * Premium VIP features unlocked upon active entitlement.
 */
export const PREMIUM_FEATURES = [
  {
    key: 'unlimited_likes',
    label: 'Unlimited Likes & Swipes',
    desc: 'Never run out of likes in Discover.'
  },
  {
    key: 'ad_free_guarantee',
    label: '100% Ad-Free Experience',
    desc: 'Zero sponsored cards across Discover and Radar.'
  },
  {
    key: 'who_viewed_me',
    label: 'Profile Visitors',
    desc: 'See who checked out your profile.'
  },
  {
    key: 'stealth_incognito',
    label: 'Stealth Incognito Mode',
    desc: 'Browse without appearing in active visitors.'
  },
  {
    key: 'priority_radar',
    label: 'Priority in Discover & Radar',
    desc: 'Elevated prominence for nearby connections.'
  },
  {
    key: 'extended_media',
    label: 'Extended Star Videos & Vaults',
    desc: 'Share Star Videos up to 20s and manage albums.'
  }
] as const;

/**
 * Mandatory safety, legal, and privacy features that are GUARANTEED 100% FREE.
 * Never paywalled under any circumstance (Apple Guideline 1.2 / Google Play UGC Policy).
 */
export const MANDATORY_FREE_FEATURES = [
  'block_user',
  'report_user',
  'report_content',
  'account_deletion',
  'privacy_settings',
  'location_privacy_modes',
  'moderation_appeals',
  'dsa_notice_and_action',
  'gdpr_data_export',
  'terms_and_privacy_policy',
  'child_safety_reporting'
] as const;

export type MandatoryFreeFeature = (typeof MANDATORY_FREE_FEATURES)[number];

export function isGuaranteedFreeFeature(feature: string): boolean {
  return (MANDATORY_FREE_FEATURES as readonly string[]).includes(feature);
}

/**
 * Detects current runtime platform: 'android' | 'ios' | 'web'.
 */
export function getBillingPlatform(): 'android' | 'ios' | 'web' {
  if (typeof window === 'undefined') return 'web';
  try {
    const platform = Capacitor.getPlatform();
    if (platform === 'android') return 'android';
    if (platform === 'ios') return 'ios';
  } catch {
    // Fallback to web
  }
  return 'web';
}

/**
 * Resolves store product tier from product ID.
 */
export function resolveTierFromProductId(productId: string): PlanTier {
  if (productId === STORE_PRODUCT_IDS.MONTHLY || productId === STRIPE_PLAN_IDS.MONTHLY) {
    return 'monthly';
  }
  if (productId === STORE_PRODUCT_IDS.THREE_MONTH) {
    return 'three_month';
  }
  if (productId === STORE_PRODUCT_IDS.YEARLY || productId === STRIPE_PLAN_IDS.YEARLY) {
    return 'yearly';
  }
  return 'monthly';
}
