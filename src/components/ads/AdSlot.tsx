import React, { useState, useEffect, useRef } from 'react';
import { AdPlacement, NativeAd, UserAccount } from '../../types';
import { ADS_CONFIG, isUserEligibleForAds, getAdConsent } from '../../config/adsConfig';
import { getAdsForPlacement } from '../../data/nativeAds';
import { trackAdImpression, trackAdSlotAvailable, trackAdLoadFailed } from '../../services/adTelemetry';
import { NativeAdCard } from './NativeAdCard';
import { AdSkeleton } from './AdSkeleton';

interface AdSlotProps {
  placement: AdPlacement;
  format?: 'feed-card' | 'wide-card' | 'radar-card';
  currentUser?: UserAccount | null;
  adIndex?: number;
  className?: string;
  onOpenPrivacy?: () => void;
  onOpenPremium?: () => void;
}

/**
 * Provider-Agnostic AdSlot Component
 * Features:
 * - Lazy-loaded via IntersectionObserver (improves Core Web Vitals).
 * - Suppressed completely for AURA Premium members (renders null, zero layout shift).
 * - Collapses silently to null if no ad is available (no blank boxes or empty gaps).
 * - Emits privacy-safe telemetry events (impression, click, availability).
 */
export const AdSlot: React.FC<AdSlotProps> = ({
  placement,
  format = placement === 'discover' ? 'feed-card' : placement === 'radar' ? 'radar-card' : 'wide-card',
  currentUser = null,
  adIndex = 0,
  className = '',
  onOpenPrivacy,
  onOpenPremium,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [ad, setAd] = useState<NativeAd | null>(null);
  const [loading, setLoading] = useState(true);
  const [impressionRecorded, setImpressionRecorded] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const isEligible = isUserEligibleForAds(currentUser);

  // 1. Lazy load visibility detection via IntersectionObserver
  useEffect(() => {
    if (!isEligible) return;

    const el = containerRef.current;
    if (!el || !(el instanceof Element) || typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin: '250px 0px' } // Pre-load smoothly 250px before scrolling into view
    );

    try {
      observer.observe(el);
    } catch {
      setIsVisible(true);
    }

    return () => observer.disconnect();
  }, [isEligible]);

  // 2. Ad resolution based on placement & privacy consent
  useEffect(() => {
    if (!isEligible || !isVisible) return;

    trackAdSlotAvailable(placement);
    setLoading(true);

    try {
      const consent = getAdConsent();
      const ads = getAdsForPlacement(placement, consent.allowPersonalizedAds);

      if (!ads || ads.length === 0) {
        trackAdLoadFailed(placement, 'No inventory available');
        setAd(null);
        setLoading(false);
        return;
      }

      // Select ad deterministically or by index rotation
      const selectedAd = ads[adIndex % ads.length];
      setAd(selectedAd);
      setLoading(false);
    } catch (err) {
      console.warn('Ad resolution notice:', err);
      trackAdLoadFailed(placement, 'Ad resolution error');
      setAd(null);
      setLoading(false);
    }
  }, [isEligible, isVisible, placement, adIndex]);

  // 3. Record impression once ad has been rendered in view
  useEffect(() => {
    if (!isEligible || !ad || impressionRecorded) return;

    const timer = setTimeout(() => {
      const consent = getAdConsent();
      trackAdImpression(ad, consent.allowPersonalizedAds);
      setImpressionRecorded(true);
    }, 1000); // 1-second viewability standard

    return () => clearTimeout(timer);
  }, [isEligible, ad, impressionRecorded]);

  // 4. If user is Premium or ads disabled, eliminate slot completely
  if (!isEligible) {
    return null;
  }

  // 5. If finished loading and no ad found, collapse silently to null (zero CLS)
  if (!loading && !ad) {
    return null;
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {loading ? (
        <AdSkeleton format={format} />
      ) : ad ? (
        <NativeAdCard
          ad={ad}
          format={format}
          onOpenPrivacy={onOpenPrivacy}
          onOpenPremium={onOpenPremium}
        />
      ) : null}
    </div>
  );
};
