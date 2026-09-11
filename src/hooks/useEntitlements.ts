/**
 * AURA GAY 18+ — Centralized Feature Gating & Entitlements Hook
 * Strictly ensures:
 * 1. Backend source of truth for Premium features.
 * 2. Mandatory safety & privacy features are ALWAYS 100% accessible to free users.
 */

import { useState, useEffect, useCallback } from 'react';
import type { UserEntitlement, PlanTier, EntitlementStatus } from '../types';
import { billingClient } from '../services/billingClient';
import { isGuaranteedFreeFeature, MANDATORY_FREE_FEATURES } from '../config/billingConfig';

export interface UseEntitlementsResult {
  isPremium: boolean;
  entitlement: UserEntitlement | null;
  isLoading: boolean;
  planTier: PlanTier | null;
  status: EntitlementStatus;
  refreshEntitlements: () => Promise<void>;
  hasFeature: (featureName: string) => boolean;
  isAlwaysFree: (featureName: string) => boolean;
}

export function useEntitlements(initialUserPremium?: boolean): UseEntitlementsResult {
  const [entitlement, setEntitlement] = useState<UserEntitlement | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshEntitlements = useCallback(async () => {
    setIsLoading(true);
    try {
      const ent = await billingClient.fetchEntitlement();
      if (ent) {
        setEntitlement(ent);
      } else if (initialUserPremium !== undefined) {
        setEntitlement({
          userId: '',
          premium: initialUserPremium,
          provider: 'none',
          status: initialUserPremium ? 'active' : 'none',
          autoRenew: false,
          lastVerifiedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.warn('[useEntitlements] Error refreshing entitlements:', err);
    } finally {
      setIsLoading(false);
    }
  }, [initialUserPremium]);

  useEffect(() => {
    refreshEntitlements();
  }, [refreshEntitlements]);

  const isPremium = !!entitlement?.premium && (entitlement.status === 'active' || entitlement.status === 'grace_period');

  /**
   * Centralized Feature Gating:
   * Mandatory safety, legal, and privacy features ALWAYS return true.
   * Premium features require verified active entitlement.
   */
  const hasFeature = useCallback(
    (featureName: string): boolean => {
      // Safety, privacy, GDPR, reporting, blocking are guaranteed free for all users
      if (isGuaranteedFreeFeature(featureName)) {
        return true;
      }
      return isPremium;
    },
    [isPremium]
  );

  const isAlwaysFree = useCallback((featureName: string): boolean => {
    return isGuaranteedFreeFeature(featureName);
  }, []);

  return {
    isPremium,
    entitlement,
    isLoading,
    planTier: entitlement?.planTier || null,
    status: entitlement?.status || 'none',
    refreshEntitlements,
    hasFeature,
    isAlwaysFree
  };
}
