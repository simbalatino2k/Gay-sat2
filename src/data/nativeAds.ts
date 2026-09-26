import { NativeAd, AdPlacement } from '../types';

/**
 * First-party promotion only. External advertising inventory stays empty until
 * AURA has a real, approved advertising partner and the required consent flow.
 * This card does not represent advertising revenue.
 */
export const NATIVE_ADS_INVENTORY: NativeAd[] = [
  {
    id: 'ad-aura-premium',
    placement: 'discover',
    brandName: 'AURA Black',
    tagline: 'Oferta własna AURA',
    headline: 'Odkryj AURA Black',
    description: 'Sprawdź dodatkowe możliwości AURA, w tym tryb incognito i zaawansowane filtry.',
    ctaText: 'Zobacz AURA Black',
    ctaUrl: '#settings-premium',
    imageUrl: '/icon-512.png',
    advertiserDomain: 'auragay.com',
    category: 'Oferta AURA',
    isNonPersonalizedOnly: true,
  },
];

export function getAdsForPlacement(placement: AdPlacement, allowPersonalized = false): NativeAd[] {
  return NATIVE_ADS_INVENTORY.filter(ad => {
    if (ad.placement !== placement) return false;
    if (!allowPersonalized && !ad.isNonPersonalizedOnly) return false;
    return true;
  });
}
