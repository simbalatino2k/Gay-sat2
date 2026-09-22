import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import { UserAccount, UserProfile, LocationPrivacyMode, QueerVenue } from '../types';
import {
  LocateFixed,
  Shield,
  Eye,
  EyeOff,
  RefreshCw,
  MessageCircle,
  User as UserIcon,
  X,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Radio,
  ChevronRight,
  Info,
  Flame,
  Navigation,
  Compass,
  ExternalLink,
  Clock,
  MapPin,
  Waves,
  Search
} from 'lucide-react';

// MapLibre 6 requires an explicit bundled worker URL with Vite.
maplibregl.setWorkerUrl(mapWorkerUrl);

interface MapViewProps {
  authToken: string | null;
  currentUser: UserAccount | null;
  onUpdateUser: (updated: UserAccount) => void;
  onOpenProfile: (profile: UserProfile) => void;
  onOpenChat: (userId: string) => void;
  onOpenPremium: () => void;
}

// Default center: Warsaw, Poland [longitude, latitude]
const DEFAULT_CENTER: [number, number] = [21.0122, 52.2297];
const DEFAULT_ZOOM = 12.5;

export interface CityPreset {
  id: string;
  name: string;
  flag: string;
  lat: number;
  lng: number;
  zoom: number;
}

export const POPULAR_CITIES: CityPreset[] = [
  { id: 'zurich', name: 'Zurych', flag: '🇨🇭', lat: 47.3734, lng: 8.5447, zoom: 13.8 },
  { id: 'warsaw', name: 'Warszawa', flag: '🇵🇱', lat: 52.2297, lng: 21.0122, zoom: 12.5 },
  { id: 'berlin', name: 'Berlin', flag: '🇩🇪', lat: 52.5200, lng: 13.4050, zoom: 12.5 },
  { id: 'london', name: 'Londyn', flag: '🇬🇧', lat: 51.5074, lng: -0.1278, zoom: 12.5 },
  { id: 'amsterdam', name: 'Amsterdam', flag: '🇳🇱', lat: 52.3676, lng: 4.9041, zoom: 12.5 },
  { id: 'paris', name: 'Paryż', flag: '🇫🇷', lat: 48.8566, lng: 2.3522, zoom: 12.5 },
  { id: 'barcelona', name: 'Barcelona', flag: '🇪🇸', lat: 41.3879, lng: 2.1699, zoom: 12.5 },
  { id: 'krakow', name: 'Kraków', flag: '🇵🇱', lat: 50.0647, lng: 19.9450, zoom: 13.0 }
];

// Primary vector style from OpenFreeMap (Free for production use with OpenStreetMap attribution)
// Optional override available via VITE_MAP_STYLE_URL for enterprise or self-hosted tile servers
const PRIMARY_STYLE_URL =
  import.meta.env.VITE_MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/dark';

export const MapView: React.FC<MapViewProps> = ({
  authToken,
  currentUser,
  onUpdateUser,
  onOpenProfile,
  onOpenChat,
  onOpenPremium: _onOpenPremium
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const venueMarkersRef = useRef<maplibregl.Marker[]>([]);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);

  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [venues, setVenues] = useState<QueerVenue[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<QueerVenue | null>(null);
  const [venueFilter, setVenueFilter] = useState<'all' | 'cruising' | 'sauna' | 'club' | 'bar'>('all');
  const [isAutoUpdating, setIsAutoUpdating] = useState(true);
  const [lastAutoUpdate, setLastAutoUpdate] = useState<Date>(new Date());
  const [isLocating, setIsLocating] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapGeneration, setMapGeneration] = useState(0);
  const [mapError, setMapError] = useState<string | null>(null);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [isUpdatingPrivacy, setIsUpdatingPrivacy] = useState(false);
  const [notice, setNotice] = useState<{ message: string; type: 'info' | 'success' | 'warning' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(() => {
    if (typeof currentUser?.profile?.lat === 'number' && typeof currentUser?.profile?.lng === 'number') {
      return { lat: currentUser.profile.lat, lng: currentUser.profile.lng };
    }
    try {
      const stored = localStorage.getItem('aura_last_known_coords');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.lat && parsed?.lng && !isNaN(parsed.lat) && !isNaN(parsed.lng)) {
          return parsed;
        }
      }
    } catch (e) {}
    return null;
  });

  const userCoordsRef = useRef(userCoords);
  userCoordsRef.current = userCoords;

  const currentPrivacy: LocationPrivacyMode =
    currentUser?.profile?.locationPrivacy || 'APPROXIMATE';

  const showNotice = useCallback((message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    setNotice({ message, type });
    setTimeout(() => {
      setNotice(prev => (prev?.message === message ? null : prev));
    }, 4500);
  }, []);

  // Fetch discover feed (profiles) from backend
  const fetchProfiles = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      const res = await fetch('/api/discover', { headers });
      if (!res.ok) throw new Error('Błąd ładowania profili');
      if (!res.headers.get('content-type')?.includes('application/json')) {
        throw new Error('API profili jest niedostępne. Mapa pozostaje dostępna.');
      }
      const data = await res.json();
      const list: UserProfile[] = data.feed || data.profiles || [];
      setProfiles(list);
    } catch (err: any) {
      console.warn('[MapView] Nie udało się pobrać profili:', err.message || err);
    }
  }, [authToken]);

  // Fetch LGBTQ+ venues & cruising spots from backend
  const fetchVenues = useCallback(async (customCoords?: { lat: number; lng: number }, queryOverride?: string) => {
    try {
      const coords = customCoords || userCoordsRef.current;
      const params = new URLSearchParams();
      const q = queryOverride !== undefined ? queryOverride : searchQuery;
      if (q && q.trim()) {
        params.append('q', q.trim());
      }
      if (coords) {
        params.append('lat', coords.lat.toString());
        params.append('lng', coords.lng.toString());
        params.append('radiusKm', '65');
      }
      if (venueFilter === 'cruising') {
        params.append('cruisingOnly', 'true');
      } else if (venueFilter !== 'all') {
        params.append('category', venueFilter);
      }

      const res = await fetch(`/api/venues?${params.toString()}`);
      if (!res.ok) throw new Error('Błąd pobierania miejsc LGBT+');
      const data = await res.json();
      if (Array.isArray(data.venues)) {
        setVenues(data.venues);
        setLastAutoUpdate(new Date());
      }
    } catch (err: any) {
      console.warn('[MapView] Błąd pobierania miejsc LGBT+ / cruisingu:', err);
    }
  }, [venueFilter, searchQuery]);

  const handleSelectCity = (city: CityPreset) => {
    setSelectedCity(city.id);
    setSearchQuery('');
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [city.lng, city.lat],
        zoom: city.zoom,
        essential: true,
        duration: 1200
      });
    }
    fetchVenues({ lat: city.lat, lng: city.lng }, '');
    showNotice(`Przełączono mapę na: ${city.name} ${city.flag}`, 'info');
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      fetchVenues(undefined, '');
      return;
    }

    if (q === 'zurych' || q === 'zurich' || q === 'zrh' || q.includes('zurych') || q.includes('zurich')) {
      handleSelectCity(POPULAR_CITIES[0]);
      return;
    }

    const matchingCity = POPULAR_CITIES.find(c => c.name.toLowerCase().includes(q) || c.id.includes(q));
    if (matchingCity) {
      handleSelectCity(matchingCity);
      return;
    }

    fetchVenues(undefined, q).then(() => {
      showNotice(`Wyniki wyszukiwania dla: "${searchQuery}"`, 'info');
    });
  };

  // Auto-update locations, cruising spots & profiles every 30 seconds
  useEffect(() => {
    fetchVenues();
    if (!isAutoUpdating) return;

    const interval = setInterval(() => {
      fetchVenues();
      fetchProfiles();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchVenues, fetchProfiles, isAutoUpdating]);

  // Apply AURA custom colors: pure dark background, purple roads, high-contrast labels
  const applyAuraTheme = useCallback((map: maplibregl.Map) => {
    try {
      const style = map.getStyle();
      if (!style || !style.layers) return;

      for (const layer of style.layers) {
        // Deep black background
        if (layer.type === 'background') {
          map.setPaintProperty(layer.id, 'background-color', '#05060a');
        }

        // Deep dark water
        if (layer.id.includes('water') && layer.type === 'fill') {
          map.setPaintProperty(layer.id, 'fill-color', '#070a16');
        }

        // Vibrant Purple Roads & Highways
        if (
          layer.type === 'line' &&
          (layer.id.includes('road') ||
            layer.id.includes('highway') ||
            layer.id.includes('transportation') ||
            layer.id.includes('street') ||
            layer.id.includes('bridge') ||
            layer.id.includes('tunnel'))
        ) {
          if (
            layer.id.includes('motorway') ||
            layer.id.includes('trunk') ||
            layer.id.includes('primary')
          ) {
            map.setPaintProperty(layer.id, 'line-color', '#a855f7');
            map.setPaintProperty(layer.id, 'line-opacity', 0.95);
          } else {
            map.setPaintProperty(layer.id, 'line-color', '#7c3aed');
            map.setPaintProperty(layer.id, 'line-opacity', 0.75);
          }
        }

        // Crisp white / silver typography with dark halos for maximum legibility
        if (layer.type === 'symbol') {
          if (map.getPaintProperty(layer.id, 'text-color') !== undefined) {
            map.setPaintProperty(layer.id, 'text-color', '#f8fafc');
            map.setPaintProperty(layer.id, 'text-halo-color', '#05060a');
            map.setPaintProperty(layer.id, 'text-halo-width', 1.8);
          }
        }
      }
    } catch (err) {
      console.warn('[MapView] Style adjustment warning:', err);
    }
  }, []);

  // Initialize MapLibre GL JS
  const initMap = useCallback(() => {
    if (!mapContainerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    setMapLoading(true);
    setMapError(null);

    const coords = userCoordsRef.current;
    const initialCenter: [number, number] = coords
      ? [coords.lng, coords.lat]
      : DEFAULT_CENTER;

    try {
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: PRIMARY_STYLE_URL,
        center: initialCenter,
        zoom: DEFAULT_ZOOM,
        attributionControl: false
      });

      // Add compact attribution adhering to OpenStreetMap & OpenFreeMap licensing
      map.addControl(
        new maplibregl.AttributionControl({
          compact: true,
          customAttribution:
            '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>, <a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a>'
        }),
        'bottom-left'
      );

      map.addControl(
        new maplibregl.NavigationControl({
          showCompass: true,
          showZoom: true,
          visualizePitch: false
        }),
        'bottom-right'
      );

      let styleReady = false;
      let mapLoaded = false;
      const loadingTimeout = window.setTimeout(() => {
        if (mapRef.current !== map || mapLoaded) return;
        setMapLoading(false);
        setMapError('Ładowanie mapy trwa zbyt długo. Sprawdź połączenie i ponów próbę.');
      }, 20000);
      const resizeObserver = new ResizeObserver(() => map.resize());
      resizeObserver.observe(mapContainerRef.current);
      map.once('remove', () => {
        window.clearTimeout(loadingTimeout);
        resizeObserver.disconnect();
      });

      map.on('load', () => {
        if (mapRef.current !== map) return;
        mapLoaded = true;
        window.clearTimeout(loadingTimeout);
        setMapLoading(false);
        setMapError(null);
      });

      map.on('style.load', () => {
        if (mapRef.current !== map) return;
        styleReady = true;
        applyAuraTheme(map);
        map.resize();
      });

      // Error handler: report failure cleanly without unauthorized tile fallbacks
      map.on('error', (e: any) => {
        console.warn('[MapView] MapLibre error:', e);
        if (mapRef.current !== map) return;
        if (styleReady) {
          showNotice('Część mapy nie została pobrana. Sprawdź połączenie.', 'warning');
          return;
        }
        window.clearTimeout(loadingTimeout);
        setMapLoading(false);
        setMapError('Nie udało się załadować mapy OpenFreeMap. Sprawdź połączenie z siecią.');
      });

      mapRef.current = map;
      setMapGeneration(value => value + 1);
    } catch (err: any) {
      console.error('[MapView] Fatal Map initialization error:', err);
      setMapLoading(false);
      setMapError('Błąd inicjalizacji silnika mapy.');
    }
  }, [applyAuraTheme, showNotice]);

  // Profile refresh must not destroy the map or reset its viewport.
  useEffect(() => {
    void fetchProfiles();
  }, [fetchProfiles]);

  // Initialize once; geolocation updates only move the existing map.
  useEffect(() => {
    initMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [initMap]);

  // Sync user's own marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }

    if (!userCoords || currentPrivacy === 'HIDDEN') return;

    const el = document.createElement('div');
    el.className = 'aura-current-user-pin relative flex items-center justify-center cursor-pointer';
    el.innerHTML = `
      <div class="absolute w-8 h-8 rounded-full bg-fuchsia-500/25 animate-ping"></div>
      <div class="relative w-7 h-7 rounded-full bg-gradient-to-tr from-purple-600 via-fuchsia-600 to-indigo-600 border-2 border-white shadow-[0_0_15px_rgba(217,70,239,0.9)] flex items-center justify-center text-white text-[10px] font-black">
        TY
      </div>
      <div class="absolute -bottom-5 px-2 py-0.5 rounded-full bg-[#070810]/90 border border-white/20 text-[9px] font-bold text-fuchsia-300 shadow-lg whitespace-nowrap">
        ${currentPrivacy === 'EXACT' ? 'Dokładna' : 'Przybliżona (~1.5 km)'}
      </div>
    `;

    userMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'center' })
      .setLngLat([userCoords.lng, userCoords.lat])
      .addTo(map);
  }, [userCoords, currentPrivacy, mapGeneration]);

  // Render profile markers on the map
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear previous markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Filter profiles that have valid coordinates (server already strips coordinates if HIDDEN or fuzzes if APPROXIMATE)
    const mappableProfiles = profiles.filter(
      p =>
        typeof p.lat === 'number' && Number.isFinite(p.lat) && Math.abs(p.lat) <= 90 &&
        typeof p.lng === 'number' && Number.isFinite(p.lng) && Math.abs(p.lng) <= 180 &&
        p.locationPrivacy !== 'HIDDEN' &&
        p.id !== currentUser?.id &&
        p.userId !== currentUser?.id
    );

    mappableProfiles.forEach(prof => {
      const el = document.createElement('div');
      el.className =
        'aura-profile-marker group relative cursor-pointer transform hover:scale-110 active:scale-95 transition-all duration-200';

      const photoUrl = prof.photos && prof.photos.length > 0 ? prof.photos[0].url : '';
      const isOnline = prof.isOnline;
      const isExact = prof.locationPrivacy === 'EXACT';

      el.innerHTML = `
        <div class="relative w-10 h-10 rounded-2xl overflow-hidden border-2 ${
          isExact ? 'border-fuchsia-400 shadow-[0_0_12px_rgba(217,70,239,0.7)]' : 'border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]'
        } bg-[#0b0d14] flex items-center justify-center">
          ${
            photoUrl
              ? `<img src="${photoUrl}" alt="${prof.displayName}" class="w-full h-full object-cover" />`
              : `<div class="w-full h-full bg-gradient-to-br from-purple-900 to-indigo-900 flex items-center justify-center text-white text-xs font-bold">${prof.displayName.charAt(0)}</div>`
          }
          ${
            isOnline
              ? `<span class="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0b0d14]"></span>`
              : ''
          }
        </div>
        <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-[#070810]/95 border border-white/15 text-[9px] font-semibold text-slate-200 whitespace-nowrap shadow-md pointer-events-none group-hover:border-purple-400">
          ${prof.displayName}, ${prof.age}
        </div>
      `;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        setSelectedProfile(prof);
        map.flyTo({
          center: [prof.lng!, prof.lat!],
          zoom: Math.max(map.getZoom(), 13.5),
          duration: 700
        });
      });

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([prof.lng!, prof.lat!])
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [profiles, currentUser, mapGeneration]);

  // Render LGBT+ venues & Cruising spots markers on the map
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear previous venue markers
    venueMarkersRef.current.forEach(m => m.remove());
    venueMarkersRef.current = [];

    venues.forEach(venue => {
      const isCruising = venue.isCruising || venue.category === 'cruising';
      const isSauna = venue.category === 'sauna';

      const el = document.createElement('div');
      el.className =
        'aura-venue-marker group relative cursor-pointer transform hover:scale-115 active:scale-95 transition-all duration-200 z-10';

      let pinGradient = 'from-purple-600 to-indigo-600 border-purple-300';
      let pinShadow = 'shadow-[0_0_12px_rgba(168,85,247,0.6)]';
      let iconHtml = `📍`;
      let typeBadge = 'LGBT+';

      if (isCruising) {
        pinGradient = 'from-amber-500 via-rose-600 to-red-600 border-amber-300';
        pinShadow = 'shadow-[0_0_18px_rgba(244,63,94,0.95)]';
        iconHtml = `🔥`;
        typeBadge = 'CRUISING';
      } else if (isSauna) {
        pinGradient = 'from-cyan-500 via-blue-600 to-indigo-600 border-cyan-300';
        pinShadow = 'shadow-[0_0_15px_rgba(6,182,212,0.85)]';
        iconHtml = `♨️`;
        typeBadge = 'SAUNA';
      } else if (venue.category === 'club') {
        pinGradient = 'from-fuchsia-600 to-purple-700 border-fuchsia-300';
        pinShadow = 'shadow-[0_0_14px_rgba(217,70,239,0.7)]';
        iconHtml = `🪩`;
        typeBadge = 'KLUB';
      } else if (venue.category === 'bar') {
        pinGradient = 'from-violet-600 to-purple-800 border-violet-300';
        iconHtml = `🍸`;
        typeBadge = 'BAR';
      }

      el.innerHTML = `
        <div class="relative flex flex-col items-center">
          ${isCruising ? `<div class="absolute -inset-1 rounded-2xl bg-rose-500/40 animate-ping"></div>` : ''}
          <div class="relative w-9 h-9 rounded-2xl bg-gradient-to-tr ${pinGradient} border-2 ${pinShadow} flex items-center justify-center text-sm">
            <span>${iconHtml}</span>
          </div>
          <div class="mt-1 px-1.5 py-0.5 rounded-md bg-[#05060a]/95 border ${
            isCruising ? 'border-amber-400/80 text-amber-300 font-black' : 'border-white/20 text-slate-200 font-bold'
          } text-[8.5px] uppercase tracking-wider shadow-xl whitespace-nowrap">
            ${typeBadge}
          </div>
        </div>
      `;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        setSelectedProfile(null);
        setSelectedVenue(venue);
        map.flyTo({
          center: [venue.lng, venue.lat],
          zoom: Math.max(map.getZoom(), 14.5),
          duration: 700
        });
      });

      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([venue.lng, venue.lat])
        .addTo(map);

      venueMarkersRef.current.push(marker);
    });
  }, [venues, mapGeneration]);

  // Handle "Moja lokalizacja" click
  // Critical requirement: ONLY ask for geolocation on explicit user click, refusal never blocks map!
  const handleLocateMe = () => {
    if (!('geolocation' in navigator)) {
      showNotice('Twoja przeglądarka nie obsługuje geolokalizacji.', 'warning');
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        setUserCoords({ lat: latitude, lng: longitude });

        if (mapRef.current) {
          mapRef.current.flyTo({
            center: [longitude, latitude],
            zoom: 14,
            essential: true,
            duration: 1000
          });
        }

        // Persist coordinates to user's profile on backend
        if (authToken) {
          try {
            const res = await fetch('/api/profile', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${authToken}`
              },
              body: JSON.stringify({
                lat: latitude,
                lng: longitude,
                location: 'Bieżąca lokalizacja'
              })
            });
            if (res.ok) {
              const data = await res.json();
              if (data.profile && currentUser) onUpdateUser({ ...currentUser, profile: data.profile });
            } else {
              throw new Error('Location update failed');
            }
          } catch (err) {
            console.warn('Błąd aktualizacji lokalizacji na serwerze:', err);
            showNotice('GPS działa, ale nie udało się zapisać lokalizacji. Spróbuj ponownie.', 'warning');
            return;
          }
        }

        fetchProfiles();
        fetchVenues({ lat: latitude, lng: longitude });
        showNotice('Zlokalizowano! Zaktualizowano miejsca cruisingu w okolicy.', 'success');
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err.code, err.message);
        // Odmowa nie może blokować mapy!
        showNotice(
          'Odmówiono dostępu do lokalizacji. Mapa działa dalej w trybie domyślnym.',
          'warning'
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // Change privacy mode (EXACT / APPROXIMATE / HIDDEN)
  const handleChangePrivacy = async (mode: LocationPrivacyMode) => {
    setIsUpdatingPrivacy(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({ locationPrivacy: mode })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.profile && currentUser) {
          onUpdateUser({ ...currentUser, profile: data.profile });
        }
        showNotice(`Zmieniono tryb prywatności na: ${mode}`, 'success');
      } else {
        throw new Error('Profile update failed');
      }
    } catch (e) {
      console.error('Błąd aktualizacji prywatności:', e);
      showNotice('Nie udało się zapisać trybu prywatności.', 'warning');
    } finally {
      setIsUpdatingPrivacy(false);
      setShowPrivacyModal(false);
    }
  };

  const handleRetryMap = () => {
    setMapError(null);
    initMap();
    fetchProfiles();
  };

  return (
    <div className="relative w-full h-[calc(100vh-8.5rem)] md:h-[calc(100vh-7rem)] rounded-3xl overflow-hidden border border-white/[0.08] shadow-2xl flex flex-col bg-[#05060a]">
      {/* Top Floating Control Bar */}
      <div className="absolute top-3 inset-x-3 z-20 flex flex-col gap-2 pointer-events-none">
        <div className="flex items-center justify-between gap-2">
          {/* Radar Status Badge */}
          <div className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[#070810]/90 backdrop-blur-xl border border-white/10 shadow-lg">
            <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Radar AURA
            </span>
            <span className="text-[11px] text-purple-300 font-medium px-1.5 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/20">
              {profiles.length} osób
            </span>
            <span className="text-[10px] text-amber-400 font-bold px-1.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 flex items-center gap-1">
              <Flame className="w-3 h-3" /> {venues.length} miejsc
            </span>
          </div>

          {/* Privacy Selector Trigger */}
          <button
            onClick={() => setShowPrivacyModal(true)}
            className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#070810]/90 backdrop-blur-xl border border-white/10 hover:border-purple-500/40 text-slate-200 hover:text-white transition-all shadow-lg active:scale-95 text-xs font-medium"
            title="Ustawienia prywatności lokalizacji"
          >
            {currentPrivacy === 'HIDDEN' ? (
              <EyeOff className="w-3.5 h-3.5 text-rose-400" />
            ) : currentPrivacy === 'EXACT' ? (
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Eye className="w-3.5 h-3.5 text-purple-400" />
            )}
            <span className="hidden sm:inline">Prywatność:</span>
            <span className="font-bold text-purple-300">
              {currentPrivacy === 'HIDDEN'
                ? 'Ukryta'
                : currentPrivacy === 'EXACT'
                ? 'Dokładna'
                : 'Przybliżona'}
            </span>
          </button>
        </div>

        {/* City Switcher & Search Bar */}
        <div className="pointer-events-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 bg-[#070810]/92 backdrop-blur-2xl p-1.5 rounded-2xl border border-white/10 shadow-xl">
          {/* Quick Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 flex items-center">
            <Search className="w-3.5 h-3.5 text-purple-400 absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Szukaj: Zurych, klub, sauna, cruising..."
              className="w-full pl-8 pr-7 py-1.5 bg-black/40 border border-white/10 focus:border-purple-500 rounded-xl text-xs text-white placeholder-slate-400 outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  fetchVenues(undefined, '');
                }}
                className="absolute right-2 text-slate-400 hover:text-white p-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </form>

          {/* Quick City Presets */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 max-w-full">
            {POPULAR_CITIES.map((c) => {
              const isActive = selectedCity === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelectCity(c)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap flex items-center gap-1 transition-all active:scale-95 cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.6)] border border-purple-300'
                      : 'bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08] border border-white/10'
                  }`}
                >
                  <span>{c.flag}</span>
                  <span>{c.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Venue & Cruising Filters Bar */}
        <div className="pointer-events-auto flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => setVenueFilter('cruising')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all shadow-md active:scale-95 ${
              venueFilter === 'cruising'
                ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-[0_0_15px_rgba(244,63,94,0.6)] border border-amber-300'
                : 'bg-[#070810]/90 backdrop-blur-xl text-amber-300/90 border border-amber-500/30 hover:border-amber-400'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>Gay Cruising</span>
          </button>

          <button
            onClick={() => setVenueFilter('sauna')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all shadow-md active:scale-95 ${
              venueFilter === 'sauna'
                ? 'bg-cyan-600 text-white shadow-[0_0_12px_rgba(6,182,212,0.6)] border border-cyan-300'
                : 'bg-[#070810]/90 backdrop-blur-xl text-slate-300 border border-white/10 hover:border-cyan-400/50'
            }`}
          >
            <span>♨️ Sauny</span>
          </button>

          <button
            onClick={() => setVenueFilter('club')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all shadow-md active:scale-95 ${
              venueFilter === 'club'
                ? 'bg-fuchsia-600 text-white shadow-[0_0_12px_rgba(217,70,239,0.6)] border border-fuchsia-300'
                : 'bg-[#070810]/90 backdrop-blur-xl text-slate-300 border border-white/10 hover:border-fuchsia-400/50'
            }`}
          >
            <span>🪩 Kluby</span>
          </button>

          <button
            onClick={() => setVenueFilter('bar')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all shadow-md active:scale-95 ${
              venueFilter === 'bar'
                ? 'bg-violet-600 text-white shadow-[0_0_12px_rgba(139,92,246,0.6)] border border-violet-300'
                : 'bg-[#070810]/90 backdrop-blur-xl text-slate-300 border border-white/10 hover:border-violet-400/50'
            }`}
          >
            <span>🍸 Bary</span>
          </button>

          <button
            onClick={() => setVenueFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all shadow-md active:scale-95 ${
              venueFilter === 'all'
                ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.6)] border border-purple-300'
                : 'bg-[#070810]/90 backdrop-blur-xl text-slate-300 border border-white/10 hover:border-purple-400/50'
            }`}
          >
            <span>🌈 Wszystkie</span>
          </button>

          <div className="ml-auto hidden sm:flex items-center gap-1 text-[10px] text-purple-300/80 px-2 py-1 rounded-lg bg-[#070810]/80 border border-white/10">
            <RefreshCw className="w-2.5 h-2.5 text-emerald-400 animate-spin" />
            <span>Aktualizacja na żywo</span>
          </div>
        </div>
      </div>

      {/* Notice Toast */}
      {notice && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 pointer-events-none transition-all duration-300 animate-fade-in">
          <div
            className={`px-4 py-2 rounded-2xl border text-xs font-medium shadow-xl flex items-center gap-2 backdrop-blur-xl pointer-events-auto ${
              notice.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/40'
                : notice.type === 'warning'
                ? 'bg-amber-950/90 text-amber-200 border-amber-500/40'
                : 'bg-indigo-950/90 text-indigo-200 border-indigo-500/40'
            }`}
          >
            {notice.type === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
            ) : notice.type === 'warning' ? (
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
            ) : (
              <Info className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
            )}
            <span>{notice.message}</span>
          </div>
        </div>
      )}

      {/* Map Canvas Container */}
      <div ref={mapContainerRef} className="w-full h-full flex-1 bg-[#05060a]" />

      {/* Loading Overlay */}
      {mapLoading && (
        <div className="absolute inset-0 z-20 bg-[#05060a]/80 backdrop-blur-sm flex flex-col items-center justify-center p-6">
          <div className="w-10 h-10 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin mb-3" />
          <p className="text-xs text-slate-300 font-medium">Ładowanie mapy...</p>
        </div>
      )}

      {/* Error Overlay with Retry Button (Requirement 9) */}
      {mapError && (
        <div className="absolute inset-0 z-30 bg-[#05060a]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-purple-950/50 border border-purple-500/30 flex items-center justify-center mb-3 text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">Nie udało się załadować mapy</h3>
          <p className="text-xs text-slate-400 max-w-xs mb-5">
            {mapError}
          </p>
          <button
            onClick={handleRetryMap}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-medium text-xs hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-purple-600/30"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Ponów próbę</span>
          </button>
        </div>
      )}

      {/* Floating "Moja lokalizacja" Action Button (Requirement 5 & 7) */}
      <div className="absolute bottom-24 sm:bottom-20 right-4 z-20 flex flex-col items-end gap-2">
        <button
          onClick={handleLocateMe}
          disabled={isLocating}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-semibold text-xs shadow-[0_8px_25px_rgba(168,85,247,0.45)] hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
          title="Ustal moją lokalizację"
        >
          {isLocating ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <LocateFixed className="w-4 h-4" />
          )}
          <span>Moja lokalizacja</span>
        </button>
      </div>

      {/* Selected LGBT / Gay Cruising Venue Preview Card */}
      {selectedVenue && (
        <div className="absolute bottom-3 inset-x-3 sm:left-auto sm:right-4 sm:w-96 z-20 animate-slide-up">
          <div className="p-4 rounded-3xl bg-[#080a14]/95 backdrop-blur-2xl border border-white/15 shadow-[0_16px_45px_rgba(0,0,0,0.85)] flex flex-col gap-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-2xl overflow-hidden border border-white/15 bg-gradient-to-br from-purple-950 to-indigo-950 shrink-0 flex items-center justify-center text-xl shadow-inner">
                  {selectedVenue.imageUrl ? (
                    <img
                      src={selectedVenue.imageUrl}
                      alt={selectedVenue.name}
                      className="w-full h-full object-cover"
                    />
                  ) : selectedVenue.isCruising || selectedVenue.category === 'cruising' ? (
                    <span className="text-2xl animate-pulse">🔥</span>
                  ) : selectedVenue.category === 'sauna' ? (
                    <span className="text-2xl">♨️</span>
                  ) : (
                    <span className="text-2xl">📍</span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-sm text-white truncate">
                      {selectedVenue.name}
                    </h4>
                    {selectedVenue.isCruising ? (
                      <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-rose-500/20 border border-amber-500/40 text-amber-300 font-extrabold text-[9px] tracking-wide uppercase">
                        Gay Cruising
                      </span>
                    ) : selectedVenue.category === 'sauna' ? (
                      <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold text-[9px] tracking-wide uppercase">
                        Sauna dla Mężczyzn
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 font-bold text-[9px] tracking-wide uppercase">
                        {selectedVenue.category}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <MapPin className="w-3 h-3 text-purple-400 shrink-0" />
                    <span className="truncate">{selectedVenue.address}{selectedVenue.neighborhood ? `, ${selectedVenue.neighborhood}` : ''}</span>
                    {typeof selectedVenue.distanceKm === 'number' && (
                      <span className="text-emerald-400 font-bold ml-auto shrink-0">
                        {selectedVenue.distanceKm.toFixed(1)} km
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedVenue(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Zamknij"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Description */}
            <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
              {selectedVenue.description}
            </p>

            {/* Opening Hours & Cruising Details */}
            <div className="space-y-1.5">
              {selectedVenue.openingHours && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-300 bg-white/[0.03] px-2.5 py-1.5 rounded-xl border border-white/[0.08]">
                  <Clock className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span className="font-semibold text-slate-400">Godziny:</span>
                  <span className="font-medium text-slate-200">{selectedVenue.openingHours}</span>
                </div>
              )}

              {/* Tags / Amenities */}
              {selectedVenue.tags && selectedVenue.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {selectedVenue.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[10px] text-slate-300 font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons: Navigate & Check Nearby */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${selectedVenue.lat},${selectedVenue.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 hover:brightness-110 text-white text-xs font-bold shadow-md transition-all active:scale-95"
              >
                <Navigation className="w-3.5 h-3.5 text-amber-300" />
                <span>Trasa (Google Maps)</span>
              </a>

              <button
                onClick={() => {
                  if (mapRef.current) {
                    mapRef.current.flyTo({
                      center: [selectedVenue.lng, selectedVenue.lat],
                      zoom: 16,
                      duration: 800
                    });
                  }
                }}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white text-xs font-semibold border border-white/10 transition-all active:scale-95 cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5 text-purple-400" />
                <span>Przybliż na mapie</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Profile Preview Card (Requirement 5 & 6) */}
      {selectedProfile && (
        <div className="absolute bottom-3 inset-x-3 sm:left-auto sm:right-4 sm:w-80 z-20 animate-slide-up">
          <div className="p-3.5 rounded-3xl bg-[#090b14]/95 backdrop-blur-2xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.85)] flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-2xl overflow-hidden border border-white/15 bg-purple-950/40 shrink-0">
                  {selectedProfile.photos && selectedProfile.photos.length > 0 ? (
                    <img
                      src={selectedProfile.photos[0].url}
                      alt={selectedProfile.displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white font-bold">
                      {selectedProfile.displayName.charAt(0)}
                    </div>
                  )}
                  {selectedProfile.isOnline && (
                    <span className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#090b14]" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-sm text-white">
                      {selectedProfile.displayName}, {selectedProfile.age}
                    </h4>
                    {selectedProfile.verified && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <Radio className="w-3 h-3 text-purple-400" />
                    <span>
                      {selectedProfile.locationPrivacy === 'EXACT'
                        ? 'Dokładna pozycja'
                        : '~1.5 km w okolicy'}
                    </span>
                    {selectedProfile.identityRole && (
                      <span className="px-1.5 py-0.2 rounded-md bg-white/5 text-purple-300 text-[10px]">
                        {selectedProfile.identityRole}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedProfile(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Zamknij"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedProfile.bio && (
              <p className="text-xs text-slate-300 line-clamp-2 italic">
                "{selectedProfile.bio}"
              </p>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => onOpenChat(selectedProfile.userId || selectedProfile.id)}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md transition-all active:scale-95"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Napisz</span>
              </button>
              <button
                onClick={() => onOpenProfile(selectedProfile)}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white text-xs font-semibold border border-white/10 transition-all active:scale-95"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Profil</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Settings Modal (Requirement 6) */}
      {showPrivacyModal && (
        <div className="absolute inset-0 z-40 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-[#0a0c16] border border-white/15 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Prywatność lokalizacji</h3>
              </div>
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Ty decydujesz, jak widzą Cię inni użytkownicy na mapie radarowej AURA:
            </p>

            <div className="space-y-2">
              {/* APPROXIMATE */}
              <button
                onClick={() => handleChangePrivacy('APPROXIMATE')}
                disabled={isUpdatingPrivacy}
                className={`w-full p-3 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                  currentPrivacy === 'APPROXIMATE'
                    ? 'bg-purple-950/40 border-purple-500/60 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                    : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                }`}
              >
                <Eye className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">
                      Przybliżona (~1.5 km)
                    </span>
                    <span className="text-[10px] text-purple-300 font-semibold px-1.5 py-0.5 rounded bg-purple-500/20">
                      Domyślna
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Bezpieczna: serwer nakłada losowe rozmycie, nikt nie widzi Twojego dokładnego adresu.
                  </p>
                </div>
              </button>

              {/* EXACT */}
              <button
                onClick={() => handleChangePrivacy('EXACT')}
                disabled={isUpdatingPrivacy}
                className={`w-full p-3 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                  currentPrivacy === 'EXACT'
                    ? 'bg-purple-950/40 border-purple-500/60 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                    : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                }`}
              >
                <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="text-xs font-bold text-white">
                    Dokładna (precyzyjna)
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Wyświetla precyzyjny punkt na mapie. Zalecana tylko w miejscach publicznych.
                  </p>
                </div>
              </button>

              {/* HIDDEN */}
              <button
                onClick={() => handleChangePrivacy('HIDDEN')}
                disabled={isUpdatingPrivacy}
                className={`w-full p-3 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                  currentPrivacy === 'HIDDEN'
                    ? 'bg-rose-950/40 border-rose-500/60 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
                    : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                }`}
              >
                <EyeOff className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="text-xs font-bold text-white">
                    Całkowicie ukryta
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Twój profil nie pojawi się na mapie radarowej żadnego użytkownika.
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapView;
