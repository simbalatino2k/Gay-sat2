import type { UserProfile } from '../types';

export interface MapCity {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface MapProfilePosition {
  lat: number;
  lng: number;
  kind: 'exact' | 'approximate' | 'city';
  cityName?: string;
}

const CITY_ALIASES: Record<string, string> = {
  zurich: 'zurich', zurych: 'zurich',
  warsaw: 'warsaw', warszawa: 'warsaw',
  berlin: 'berlin',
  london: 'london', londyn: 'london',
  amsterdam: 'amsterdam',
  paris: 'paris', paryz: 'paris',
  barcelona: 'barcelona',
  madrid: 'madrid', madryt: 'madrid',
  'new york': 'nyc', 'nowy jork': 'nyc', nyc: 'nyc',
  'san francisco': 'sf',
  tokyo: 'tokyo', tokio: 'tokyo',
  bangkok: 'bangkok', sydney: 'sydney',
  'sao paulo': 'saopaulo',
  krakow: 'krakow', cracow: 'krakow'
};

/** Only a user-entered, recognized city can supply a coarse map point. */
export function getMapProfilePosition(profile: UserProfile, cities: readonly MapCity[]): MapProfilePosition | null {
  if (profile.locationPrivacy === 'HIDDEN') return null;
  if (typeof profile.lat === 'number' && Number.isFinite(profile.lat) && Math.abs(profile.lat) <= 90 &&
      typeof profile.lng === 'number' && Number.isFinite(profile.lng) && Math.abs(profile.lng) <= 180) {
    return {
      lat: profile.lat,
      lng: profile.lng,
      kind: profile.locationPrivacy === 'EXACT' ? 'exact' : 'approximate'
    };
  }

  const cityText = profile.location?.split(',')[0]?.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const cityId = cityText ? CITY_ALIASES[cityText] : undefined;
  const city = cities.find(candidate => candidate.id === cityId);
  return city ? { lat: city.lat, lng: city.lng, kind: 'city', cityName: city.name } : null;
}
