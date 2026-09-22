import { UserAccount, AdConsentState } from '../types';

export interface AdsConfiguration {
  ADS_ENABLED: boolean;
  ADS_PROVIDER: 'direct' | 'google-ad-manager' | 'applovin' | 'custom';
  AD_FREQUENCY_DISCOVER: number;
  AD_FREQUENCY_MOMENTS: number;
  PREMIUM_AD_FREE: boolean;
  ALLOW_PERSONALIZED_DEFAULT: boolean;
  FALLBACK_TO_CONTEXTUAL: boolean;
  TELEMETRY_SAMPLE_RATE: number;
}

/**
 * Centralized Monetization Configuration for AURA 18+
 * Change frequency, provider, or monetization rules here without altering component code.
 */
export const ADS_CONFIG: AdsConfiguration = {
  ADS_ENABLED: true,
  ADS_PROVIDER: 'direct',
  AD_FREQUENCY_DISCOVER: 6, // 1 native ad card after every 6 profiles
  AD_FREQUENCY_MOMENTS: 4,  // 1 native ad moment after every 4 moments
  PREMIUM_AD_FREE: true,     // Premium users never see ads
  ALLOW_PERSONALIZED_DEFAULT: false, // Strict GDPR default: contextual until opt-in
  FALLBACK_TO_CONTEXTUAL: true,
  TELEMETRY_SAMPLE_RATE: 1.0,
};

export const AD_CONSENT_STORAGE_KEY = 'aura_eprivacy_ad_consent';

export const DEFAULT_AD_CONSENT: AdConsentState = {
  consentGiven: false,
  allowPersonalizedAds: false, // strictly false until explicit GDPR opt-in
  allowAnalytics: false,
  updatedAt: new Date().toISOString(),
};

export function getAdConsent(): AdConsentState {
  try {
    const raw = localStorage.getItem(AD_CONSENT_STORAGE_KEY);
    if (!raw) return DEFAULT_AD_CONSENT;
    const parsed = JSON.parse(raw);
    return {
      consentGiven: Boolean(parsed.consentGiven),
      allowPersonalizedAds: Boolean(parsed.allowPersonalizedAds),
      allowAnalytics: Boolean(parsed.allowAnalytics),
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    return DEFAULT_AD_CONSENT;
  }
}

export function saveAdConsent(consent: Partial<AdConsentState>): AdConsentState {
  const current = getAdConsent();
  const updated: AdConsentState = {
    ...current,
    ...consent,
    updatedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(AD_CONSENT_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save ad consent to localStorage:', err);
  }
  return updated;
}

/**
 * Checks whether the current user is eligible to be served ads.
 * If user has isPremium === true or role === 'SUPERADMIN' or ADS_ENABLED === false, returns false.
 */
export function isUserEligibleForAds(currentUser: UserAccount | null): boolean {
  if (!ADS_CONFIG.ADS_ENABLED) return false;
  if (!currentUser) return true;
  if (ADS_CONFIG.PREMIUM_AD_FREE) {
    if (currentUser.isPremium) return false;
    // Admins and testers also enjoy ad-free experience
    if (currentUser.role === 'SUPERADMIN') return false;
  }
  return true;
}
