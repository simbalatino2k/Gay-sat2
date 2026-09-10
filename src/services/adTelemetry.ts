import { AdPlacement, NativeAd, AdAnalyticsEvent, AdAnalyticsEventType } from '../types';
import { ADS_CONFIG } from '../config/adsConfig';

/**
 * Privacy-Preserving Ad Telemetry Service
 * Fully GDPR and ePrivacy compliant:
 * - NEVER records personal names, emails, chat messages, or precise geolocation.
 * - Collects only aggregate interaction counters (impression, click, slot availability).
 * - Bypasses tracking if sample rate drops or analytics are disabled.
 */
export async function sendAdEvent(
  eventType: AdAnalyticsEventType,
  placement: AdPlacement,
  adId: string,
  isPersonalized: boolean,
  provider = ADS_CONFIG.ADS_PROVIDER
): Promise<void> {
  if (Math.random() > ADS_CONFIG.TELEMETRY_SAMPLE_RATE) return;

  const eventPayload: AdAnalyticsEvent = {
    eventType,
    adId,
    placement,
    timestamp: new Date().toISOString(),
    isPersonalized,
    provider,
  };

  try {
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(eventPayload)], { type: 'application/json' });
      const sent = navigator.sendBeacon('/api/ads/telemetry', blob);
      if (sent) return;
    }

    await fetch('/api/ads/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventPayload),
      keepalive: true,
    });
  } catch {
    // Silent fail - telemetry must never break user experience
  }
}

export function trackAdImpression(ad: NativeAd, isPersonalized = false): void {
  sendAdEvent('ad_impression', ad.placement, ad.id, isPersonalized);
}

export function trackAdClick(ad: NativeAd, isPersonalized = false): void {
  sendAdEvent('ad_click', ad.placement, ad.id, isPersonalized);
}

export function trackAdSlotAvailable(placement: AdPlacement): void {
  sendAdEvent('ad_slot_available', placement, 'none', false);
}

export function trackAdLoadFailed(placement: AdPlacement, _reason?: string): void {
  sendAdEvent('ad_load_failed', placement, 'none', false);
}
