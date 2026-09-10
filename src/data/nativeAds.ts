import { NativeAd, AdPlacement } from '../types';

/**
 * Curated Native Ad Inventory
 * Premium, design-matched native sponsorships tailored for LGBTQ+ lifestyle & community.
 * Fully contextual, privacy-safe, with zero deceptive elements.
 */
export const NATIVE_ADS_INVENTORY: NativeAd[] = [
  {
    id: 'ad-aura-premium',
    placement: 'discover',
    brandName: 'AURA Black',
    tagline: 'Bez reklam • Incognito • Filtry',
    headline: 'Przejdź na AURA Black',
    description: 'Doświadczaj AURA bez żadnych przerw, przeglądaj profile w trybie niewidocznym i odblokuj nieograniczone filtry.',
    ctaText: 'Sprawdź AURA Black',
    ctaUrl: '#settings-premium',
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=1000',
    advertiserDomain: 'aura18.app/premium',
    category: 'Subskrypcja Premium',
    isNonPersonalizedOnly: true,
  },
  {
    id: 'ad-palais-boutique',
    placement: 'discover',
    brandName: 'Palais Boutique Hotel',
    tagline: 'Berlin • Prywatny Rooftop Lounge',
    headline: 'Ekskluzywny pobyt w sercu Berlina',
    description: 'Butikowe apartamenty, strefa saun tylko dla gości oraz prywatne wieczory na dachu z widokiem na Schöneberg.',
    ctaText: 'Rezerwuj pobyt',
    ctaUrl: 'https://palais-boutique-berlin.example.com',
    imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1000',
    advertiserDomain: 'palais-berlin.de',
    category: 'Podróże & Hotelarstwo',
    isNonPersonalizedOnly: true,
  },
  {
    id: 'ad-sanctuary-wellness',
    placement: 'discover',
    brandName: 'Sanctuary Holistic Spa',
    tagline: 'Odnowa biologiczna & masaż',
    headline: 'Prywatna strefa relaksu i regeneracji',
    description: 'Dedykowane sesje masażu powięziowego, aromaterapii i kriosauny stworzone z myślą o pełnym wyciszeniu.',
    ctaText: 'Zarezerwuj wizytę',
    ctaUrl: 'https://sanctuary-wellness.example.com',
    imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=1000',
    advertiserDomain: 'sanctuary-spa.eu',
    category: 'Zdrowie & Wellness',
    isNonPersonalizedOnly: true,
  },
  {
    id: 'ad-atelier-fragrance',
    placement: 'moments',
    brandName: 'Atelier Nuit',
    tagline: 'Niszowa woda perfumowana',
    headline: 'Atelier Nuit: Drzewo sandałowe & skóra',
    description: 'Głęboki, zmysłowy aromat o 16-godzinnej trwałości. Dyskretna elegancja zamknięta w matowej butelce.',
    ctaText: 'Odkryj zapach',
    ctaUrl: 'https://atelier-nuit.example.com',
    imageUrl: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&q=80&w=1000',
    advertiserDomain: 'atelier-nuit.paris',
    category: 'Styl & Zapachy',
    isNonPersonalizedOnly: true,
  },
  {
    id: 'ad-checkpoint-health',
    placement: 'moments',
    brandName: 'CheckPoint Europe',
    tagline: 'Darmowa i dyskretna profilaktyka',
    headline: 'Zamów dyskretny pakiet profilaktyki do domu',
    description: 'Szybkie, bezpieczne i poufne zestawy kontrolne z bezpłatną dostawą do paczkomatu w całej UE.',
    ctaText: 'Dowiedz się więcej',
    ctaUrl: 'https://checkpoint-europe.example.org',
    imageUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=1000',
    advertiserDomain: 'checkpoint-europe.org',
    category: 'Zdrowie Publiczne',
    isNonPersonalizedOnly: true,
  },
  {
    id: 'ad-spectrum-fest',
    placement: 'radar',
    brandName: 'Spectrum Fest 2026',
    tagline: 'Barcelona • 3 Dni Muzyki Elektronicznej',
    headline: 'Festiwal Spectrum: Muzyka, plaża i wolność',
    description: 'Największe letnie spotkanie miłośników muzyki techno i house na wybrzeżu Barcelony. Pula biletów Early Bird.',
    ctaText: 'Sprawdź line-up',
    ctaUrl: 'https://spectrum-fest.example.com',
    imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=1000',
    advertiserDomain: 'spectrum-festival.com',
    category: 'Wydarzenia & Muzyka',
    isNonPersonalizedOnly: true,
  },
  {
    id: 'ad-lounge-privat',
    placement: 'radar',
    brandName: 'Velvet Rooftop Club',
    tagline: 'Cocktail bar & Speakeasy',
    headline: 'Velvet Lounge: Kameralny cocktail bar',
    description: 'Najwyższej klasy miksologia, wyselekcjonowane wina i intymna atmosfera bez tłumów i kompromisów.',
    ctaText: 'Zobacz menu & stoliki',
    ctaUrl: 'https://velvet-lounge.example.com',
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=1000',
    advertiserDomain: 'velvet-lounge.eu',
    category: 'Nightlife & Bary',
    isNonPersonalizedOnly: true,
  },
  {
    id: 'ad-settings-premium',
    placement: 'settings',
    brandName: 'AURA 18+ Premium',
    tagline: '100% Ad-Free Experience',
    headline: 'Wyłącz wszystkie reklamy w aplikacji',
    description: 'Wspieraj rozwój niezależnej platformy AURA i ciesz się czystym interfejsem bez żadnych treści sponsorowanych.',
    ctaText: 'Włącz AURA Premium',
    ctaUrl: '#activate-premium',
    imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=1000',
    advertiserDomain: 'aura18.app',
    category: 'Członkostwo',
    isNonPersonalizedOnly: true,
  }
];

export function getAdsForPlacement(placement: AdPlacement, allowPersonalized = false): NativeAd[] {
  return NATIVE_ADS_INVENTORY.filter(ad => {
    if (ad.placement !== placement) return false;
    // If user has not consented to personalization, only serve non-personalized ads
    if (!allowPersonalized && !ad.isNonPersonalizedOnly) return false;
    return true;
  });
}
