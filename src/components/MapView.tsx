import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
  useApiLoadingStatus,
  APILoadingStatus
} from '@vis.gl/react-google-maps';
import { UserProfile, QueerVenue, LocationPrivacyMode } from '../types';
import { formatDistance, formatDistanceDescriptive } from '../utils/formatDistance';
import {
  MapPin,
  Users,
  Beer,
  Music,
  Coffee,
  Sparkles,
  ShieldCheck,
  MessageSquare,
  ExternalLink,
  Locate,
  Layers,
  HeartHandshake,
  Compass,
  Plus,
  Minus,
  Crosshair,
  Radio,
  Search,
  Lock,
  Eye,
  EyeOff,
  ChevronUp,
  X,
  Navigation as NavigationIcon,
  AlertCircle
} from 'lucide-react';
import { ProfileAuraFrame } from './ProfileAuraFrame';
import { ErrorBoundary } from './ErrorBoundary';
import { AdSlot } from './ads';
import { getVenuesNearLocation } from '../data/queerVenues';

interface MapViewProps {
  authToken: string | null;
  onOpenProfile: (profile: UserProfile) => void;
  onOpenChat: (userId: string) => void;
  onOpenPremium?: () => void;
}

type LayerFilter = 'all' | 'members' | 'bars' | 'clubs' | 'cafes' | 'community';

// Global Queer Metropolises Presets for instant navigation
interface CityPreset {
  name: string;
  country: string;
  lat: number;
  lng: number;
  zoom: number;
}

const GLOBAL_CITY_PRESETS: CityPreset[] = [
  { name: 'London', country: 'UK', lat: 51.5074, lng: -0.1278, zoom: 13 },
  { name: 'Berlin', country: 'DE', lat: 52.5200, lng: 13.4050, zoom: 13 },
  { name: 'New York', country: 'US', lat: 40.7338, lng: -74.0021, zoom: 13 },
  { name: 'Paris', country: 'FR', lat: 48.8585, lng: 2.3551, zoom: 13 },
  { name: 'San Francisco', country: 'US', lat: 37.7628, lng: -122.4349, zoom: 13 },
  { name: 'Tokyo', country: 'JP', lat: 35.6908, lng: 139.7088, zoom: 14 },
  { name: 'Madrid', country: 'ES', lat: 40.4227, lng: -3.6978, zoom: 14 },
  { name: 'Sydney', country: 'AU', lat: -33.8798, lng: 151.2158, zoom: 13 },
  { name: 'Los Angeles', country: 'US', lat: 34.0886, lng: -118.3812, zoom: 13 }
];

// Custom AURA Dark-Neon Google Maps Theme: Ultra-deep #050507 black base, violet/purple road hierarchy,
// subtle lavender typography, near-black violet-tinted water, and high-contrast marker visibility.
const AURA_MAP_STYLES: google.maps.MapTypeStyle[] = [
  // 1. Global Reset & Base Canvas
  { elementType: 'geometry', stylers: [{ color: '#050507' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] }, // Strip bright commercial & default icons
  { elementType: 'labels.text.fill', stylers: [{ color: '#7e6f96' }] }, // Muted default label color
  { elementType: 'labels.text.stroke', stylers: [{ color: '#050507' }, { weight: 3 }] },

  // 2. Administrative Boundaries & Locality Labels
  {
    featureType: 'administrative',
    elementType: 'geometry',
    stylers: [{ color: '#160d2a' }]
  },
  {
    featureType: 'administrative.country',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#311459' }]
  },
  {
    featureType: 'administrative.province',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#220d3f' }]
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#D8B4FE' }] // Subtle lavender labels
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#050507' }, { weight: 3 }]
  },
  {
    featureType: 'administrative.neighborhood',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#a78bfa' }] // Muted secondary lavender
  },
  {
    featureType: 'administrative.neighborhood',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#050507' }, { weight: 3 }]
  },
  {
    featureType: 'administrative.land_parcel',
    stylers: [{ visibility: 'off' }]
  },

  // 3. Landscape & Almost-Black Buildings
  {
    featureType: 'landscape',
    elementType: 'geometry',
    stylers: [{ color: '#050507' }]
  },
  {
    featureType: 'landscape.man_made',
    elementType: 'geometry',
    stylers: [{ color: '#090810' }] // Almost-black buildings
  },
  {
    featureType: 'landscape.man_made',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#150f24' }]
  },
  {
    featureType: 'landscape.natural',
    elementType: 'geometry',
    stylers: [{ color: '#050507' }]
  },
  {
    featureType: 'landscape.natural.terrain',
    elementType: 'geometry',
    stylers: [{ color: '#050507' }]
  },

  // 4. Points of Interest (POIs) - Neutralized Greens & Clutter
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#090810' }]
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#65557e' }] // Muted secondary labels
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#050507' }, { weight: 3 }]
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#07060e' }] // Replaces bright greens with near-black depth
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#56466f' }]
  },
  {
    featureType: 'poi.business',
    stylers: [{ visibility: 'off' }] // Remove yellow/blue commercial clutter
  },

  // 5. Roads - Tailored Violet & Purple Hierarchy
  // Secondary roads & general road geometry: #5B21B6
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#5B21B6' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#15062c' }, { weight: 1 }]
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#7a6b95' }] // Muted secondary road labels
  },
  {
    featureType: 'road',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#050507' }, { weight: 3 }]
  },

  // Small/local roads: dark purple #2E1065
  {
    featureType: 'road.local',
    elementType: 'geometry',
    stylers: [{ color: '#2E1065' }]
  },
  {
    featureType: 'road.local',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#0f0420' }, { weight: 1 }]
  },
  {
    featureType: 'road.local',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#63537b' }]
  },
  {
    featureType: 'road.local',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#050507' }, { weight: 2 }]
  },

  // Main roads (arterials): #7C3AED
  {
    featureType: 'road.arterial',
    elementType: 'geometry',
    stylers: [{ color: '#7C3AED' }]
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#200747' }, { weight: 1 }]
  },
  {
    featureType: 'road.arterial',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#c4b5fd' }]
  },
  {
    featureType: 'road.arterial',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#050507' }, { weight: 3 }]
  },

  // Highways: bright violet #8B5CF6
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#8B5CF6' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#2e085c' }, { weight: 1.5 }]
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#D8B4FE' }] // Subtle lavender labels
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#050507' }, { weight: 3 }]
  },
  {
    featureType: 'road.highway.controlled_access',
    elementType: 'geometry',
    stylers: [{ color: '#8B5CF6' }]
  },
  {
    featureType: 'road.highway.controlled_access',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#390b73' }, { weight: 1.5 }]
  },

  // 6. Transit Network
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#100a20' }]
  },
  {
    featureType: 'transit.line',
    elementType: 'geometry',
    stylers: [{ color: '#26104e' }]
  },
  {
    featureType: 'transit.station',
    elementType: 'geometry',
    stylers: [{ color: '#160e2a' }]
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#7f719b' }]
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#050507' }, { weight: 3 }]
  },

  // 7. Water - Near-black with slight violet tint
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#090715' }]
  },
  {
    featureType: 'water',
    elementType: 'geometry.fill',
    stylers: [{ color: '#090715' }]
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#4b3c6b' }]
  },
  {
    featureType: 'water',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#050507' }, { weight: 3 }]
  }
];

// Helper to determine region based on browser timezone when GPS is denied
function getInitialRegionByTimezone(): { lat: number; lng: number; name: string } {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.includes('London') || tz.includes('Dublin')) {
      return { lat: 51.5074, lng: -0.1278, name: 'London, UK' };
    }
    if (tz.includes('Berlin') || tz.includes('Frankfurt') || tz.includes('Munich')) {
      return { lat: 52.5200, lng: 13.4050, name: 'Berlin, Germany' };
    }
    if (tz.includes('Paris') || tz.includes('Brussels')) {
      return { lat: 48.8585, lng: 2.3551, name: 'Paris, France' };
    }
    if (tz.includes('Madrid')) {
      return { lat: 40.4227, lng: -3.6978, name: 'Madrid, Spain' };
    }
    if (tz.includes('Tokyo') || tz.includes('Japan')) {
      return { lat: 35.6908, lng: 139.7088, name: 'Tokyo, Japan' };
    }
    if (tz.includes('Sydney') || tz.includes('Melbourne')) {
      return { lat: -33.8798, lng: 151.2158, name: 'Sydney, Australia' };
    }
    if (tz.includes('New_York') || tz.includes('Toronto') || tz.includes('Montreal')) {
      return { lat: 40.7338, lng: -74.0021, name: 'New York, USA' };
    }
    if (tz.includes('Los_Angeles') || tz.includes('Vancouver')) {
      return { lat: 37.7628, lng: -122.4349, name: 'San Francisco, USA' };
    }
  } catch (e) {
    // fallback
  }
  return { lat: 51.5074, lng: -0.1278, name: 'London, UK' };
}

// Sub-component to manage map panning/zooming programmatically via useMap
const MapCameraController: React.FC<{
  targetCoords: { lat: number; lng: number } | null;
  targetZoom?: number;
}> = ({ targetCoords, targetZoom }) => {
  const map = useMap('aura-radar-map');

  useEffect(() => {
    if (!map || !targetCoords) return;
    map.panTo(targetCoords);
    if (targetZoom) {
      map.setZoom(targetZoom);
    }
  }, [map, targetCoords, targetZoom]);

  return null;
};

// Sub-component watching Google Maps API loading & auth status
const GoogleMapsStatusWatcher: React.FC<{ onAuthError: () => void }> = ({ onAuthError }) => {
  const status = useApiLoadingStatus();

  useEffect(() => {
    if (status === APILoadingStatus.AUTH_FAILURE || status === APILoadingStatus.FAILED) {
      console.warn('Google Maps loading status failed:', status);
      onAuthError();
    }
  }, [status, onAuthError]);

  return null;
};

// Visual Member Marker Component (Adheres strictly to AURA aesthetic)
const MemberMarkerItem: React.FC<{
  profile: UserProfile;
  isSelected: boolean;
  onSelect: () => void;
}> = React.memo(({ profile, isSelected, onSelect }) => {
  return (
    <div
      onClick={e => {
        e.stopPropagation();
        onSelect();
      }}
      className={`relative cursor-pointer transition-all duration-300 group select-none ${
        isSelected ? 'scale-115 z-40' : 'hover:scale-110 z-20'
      }`}
    >
      {/* High-visibility Neon Outer Glow Aura */}
      <div
        className={`absolute -inset-2 rounded-full transition-all duration-300 blur-sm ${
          isSelected
            ? 'bg-gradient-to-r from-fuchsia-500 via-purple-500 to-violet-500 opacity-95 shadow-[0_0_28px_rgba(217,70,239,0.95)] scale-110'
            : 'bg-gradient-to-r from-purple-500 to-fuchsia-500 opacity-50 group-hover:opacity-90 group-hover:shadow-[0_0_20px_rgba(192,132,252,0.85)]'
        }`}
      />

      {/* Black glass container with vibrant AURA LED perimeter */}
      <ProfileAuraFrame
        isOnline={profile.isOnline}
        intensity={isSelected ? 'prominent' : 'subtle'}
        className={`relative w-11 h-11 rounded-full transition-all drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)] ring-2 ${
          isSelected ? 'scale-110 ring-fuchsia-400 shadow-[0_0_22px_rgba(217,70,239,0.75)]' : 'ring-purple-400/60 group-hover:ring-fuchsia-400'
        }`}
      >
        <img
          src={profile.photos[0]?.url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&q=80'}
          alt={profile.displayName}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover bg-black"
        />

        {/* Verification Shield Badge */}
        {profile.verified && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#050507] border border-cyan-400 flex items-center justify-center text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.8)] z-10">
            <ShieldCheck className="w-2.5 h-2.5" />
          </span>
        )}

        {/* Emerald Online Pulse */}
        {profile.isOnline && (
          <span className="absolute bottom-0 right-0 flex h-3 w-3 z-10">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400 border border-[#050507] shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          </span>
        )}
      </ProfileAuraFrame>

      {/* High-contrast Name and Distance Badge */}
      <div
        className={`absolute -bottom-5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full backdrop-blur-md text-[10px] font-semibold whitespace-nowrap transition-all shadow-xl flex items-center gap-1.5 border ${
          isSelected
            ? 'bg-[#050507] border-fuchsia-400 text-fuchsia-100 shadow-[0_0_14px_rgba(217,70,239,0.7)]'
            : 'bg-[#050507]/95 border-purple-500/40 text-slate-100 group-hover:border-purple-400 group-hover:text-purple-200'
        }`}
      >
        <span>{profile.displayName}</span>
        <span className="text-[9px] text-purple-300 font-medium">
          • {profile.approximateArea || formatDistance(profile.distanceKm)}
        </span>
      </div>
    </div>
  );
});

// Visual Venue Marker Component
const VenueMarkerItem: React.FC<{
  venue: QueerVenue;
  isSelected: boolean;
  onSelect: () => void;
}> = React.memo(({ venue, isSelected, onSelect }) => {
  const getCategoryConfig = (cat: string) => {
    switch (cat) {
      case 'club':
        return {
          icon: Music,
          gradient: 'from-fuchsia-600 via-purple-600 to-violet-800',
          glow: 'rgba(217, 70, 239, 0.8)',
          border: 'border-fuchsia-400'
        };
      case 'bar':
        return {
          icon: Beer,
          gradient: 'from-purple-600 via-indigo-600 to-slate-900',
          glow: 'rgba(168, 85, 247, 0.8)',
          border: 'border-purple-400'
        };
      case 'cafe':
        return {
          icon: Coffee,
          gradient: 'from-rose-600 via-purple-700 to-slate-900',
          glow: 'rgba(244, 63, 94, 0.75)',
          border: 'border-rose-400'
        };
      case 'community':
      default:
        return {
          icon: HeartHandshake,
          gradient: 'from-cyan-600 via-purple-700 to-slate-900',
          glow: 'rgba(6, 182, 212, 0.75)',
          border: 'border-cyan-400'
        };
    }
  };

  const config = getCategoryConfig(venue.category);
  const IconComponent = config.icon;

  return (
    <div
      onClick={e => {
        e.stopPropagation();
        onSelect();
      }}
      className={`relative cursor-pointer transition-all duration-300 group flex flex-col items-center select-none ${
        isSelected ? 'scale-115 z-40' : 'hover:scale-110 z-20'
      }`}
    >
      <div
        className={`w-10 h-10 rounded-2xl p-0.5 backdrop-blur-md shadow-2xl transition-all flex items-center justify-center drop-shadow-[0_4px_18px_rgba(0,0,0,0.95)] ${
          isSelected
            ? 'ring-2 ring-fuchsia-400 shadow-[0_0_26px_rgba(217,70,239,0.9)] scale-105'
            : 'hover:shadow-[0_0_18px_rgba(168,85,247,0.7)] ring-1 ring-white/25 hover:ring-purple-400'
        } bg-[#050507] border ${config.border}`}
      >
        <div
          className={`w-full h-full rounded-[14px] bg-gradient-to-tr ${config.gradient} flex items-center justify-center text-white shadow-inner`}
        >
          <IconComponent className="w-4 h-4 drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]" />
        </div>
      </div>

      <span
        className={`mt-1.5 px-2.5 py-0.5 rounded-full backdrop-blur-md text-[9px] font-bold tracking-tight whitespace-nowrap shadow-xl transition-all border ${
          isSelected
            ? 'bg-[#050507] border-fuchsia-400 text-fuchsia-100 shadow-[0_0_14px_rgba(217,70,239,0.7)]'
            : 'bg-[#050507]/95 border-purple-500/40 text-slate-100 group-hover:text-purple-200 group-hover:border-purple-400'
        }`}
      >
        {venue.name}
      </span>
    </div>
  );
});

const GoogleMapsLiveRendererContent: React.FC<{
  cameraTarget: { lat: number; lng: number } | null;
  cameraZoom: number;
  userLocation: { lat: number; lng: number } | null;
  showMembers: boolean;
  profiles: UserProfile[];
  filteredVenues: QueerVenue[];
  selectedUser: UserProfile | null;
  selectedVenue: QueerVenue | null;
  setSelectedUser: (u: UserProfile | null) => void;
  setSelectedVenue: (v: QueerVenue | null) => void;
  onAuthError: () => void;
}> = (props) => {
  const status = useApiLoadingStatus();

  const isAdvancedMarkerSupported = typeof window !== 'undefined' &&
    Boolean(
      (window as any).google?.maps?.marker?.AdvancedMarkerElement &&
      (window as any).google?.maps?.Map
    );

  useEffect(() => {
    if (status === APILoadingStatus.AUTH_FAILURE || status === APILoadingStatus.FAILED) {
      console.warn('Google Maps loading status failed:', status);
      props.onAuthError();
    } else if (status === APILoadingStatus.LOADED && !isAdvancedMarkerSupported) {
      console.warn('AdvancedMarkerElement not available in current Maps session. Falling back to radar.');
      props.onAuthError();
    }
  }, [status, isAdvancedMarkerSupported, props.onAuthError]);

  const initialCenter = useMemo(() => {
    return props.cameraTarget || { lat: 51.5074, lng: -0.1278 };
  }, []);

  if (status !== APILoadingStatus.LOADED || !isAdvancedMarkerSupported) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#050507]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-fuchsia-500/30 border-t-fuchsia-400 animate-spin" />
          <span className="text-[10px] text-fuchsia-300 font-bold tracking-widest uppercase animate-pulse">Establishing Secure Uplink...</span>
        </div>
      </div>
    );
  }

  return (
      <Map
        id="aura-radar-map"
        mapId="DEMO_MAP_ID"
        defaultCenter={initialCenter}
        defaultZoom={props.cameraZoom}
        colorScheme="DARK"
        styles={AURA_MAP_STYLES}
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        style={{ width: '100%', height: '100%' }}
        gestureHandling="greedy"
        disableDefaultUI={true}
      >
        <MapCameraController targetCoords={props.cameraTarget} targetZoom={props.cameraZoom} />

        {/* Current User Approximate Privacy Ring & Center Dot */}
        {props.userLocation && (
          <AdvancedMarker position={props.userLocation} title="Your Location (Protected Radius)" zIndex={100}>
            <div className="relative flex items-center justify-center pointer-events-none drop-shadow-[0_0_16px_rgba(217,70,239,0.9)]">
              {/* Approximate ~1.5km Privacy Boundary Illusion */}
              <span className="absolute w-16 h-16 rounded-full bg-fuchsia-500/20 border border-fuchsia-400/50 animate-pulse" />
              <span className="absolute w-9 h-9 rounded-full bg-purple-500/30 border border-purple-300/60" />
              <span className="w-4 h-4 rounded-full bg-gradient-to-tr from-fuchsia-400 via-purple-300 to-white border-2 border-white shadow-[0_0_16px_rgba(217,70,239,1)] ring-2 ring-purple-600" />
            </div>
          </AdvancedMarker>
        )}

        {/* Member Markers */}
        {props.showMembers &&
          props.profiles.map(profile => {
            if (profile.locationPrivacy === 'HIDDEN' || profile.lat === undefined || profile.lng === undefined) {
              return null;
            }

            return (
              <AdvancedMarker
                key={profile.id}
                position={{ lat: profile.lat, lng: profile.lng }}
                title={profile.displayName}
              >
                <MemberMarkerItem
                  profile={profile}
                  isSelected={props.selectedUser?.id === profile.id}
                  onSelect={() => {
                    props.setSelectedUser(profile);
                    props.setSelectedVenue(null);
                  }}
                />
              </AdvancedMarker>
            );
          })}

        {/* Queer Venue Markers */}
        {props.filteredVenues.map(venue => (
          <AdvancedMarker
            key={venue.id}
            position={{ lat: venue.lat, lng: venue.lng }}
            title={venue.name}
          >
            <VenueMarkerItem
              venue={venue}
              isSelected={props.selectedVenue?.id === venue.id}
              onSelect={() => {
                props.setSelectedVenue(venue);
                props.setSelectedUser(null);
              }}
            />
          </AdvancedMarker>
        ))}
      </Map>
  );
};

// Global listener registry for Google Maps auth failures (e.g. gm_authFailure callback)
const authFailureListeners = new Set<() => void>();
if (typeof window !== 'undefined') {
  const prevAuthFailure = (window as unknown as { gm_authFailure?: () => void }).gm_authFailure;
  (window as unknown as { gm_authFailure?: () => void }).gm_authFailure = () => {
    console.warn('Google Maps authentication failed (InvalidKeyMapError / gm_authFailure). Switching to interactive radar mode.');
    authFailureListeners.forEach(listener => {
      try {
        listener();
      } catch {}
    });
    if (typeof prevAuthFailure === 'function') {
      try {
        prevAuthFailure();
      } catch {}
    }
  };
}

// Google Maps Interactive Live Tile Renderer
const GoogleMapsLiveRenderer: React.FC<{
  apiKey: string;
  cameraTarget: { lat: number; lng: number } | null;
  cameraZoom: number;
  userLocation: { lat: number; lng: number } | null;
  showMembers: boolean;
  profiles: UserProfile[];
  filteredVenues: QueerVenue[];
  selectedUser: UserProfile | null;
  selectedVenue: QueerVenue | null;
  setSelectedUser: (u: UserProfile | null) => void;
  setSelectedVenue: (v: QueerVenue | null) => void;
  onAuthError: () => void;
}> = (props) => {
  useEffect(() => {
    const handleAuthFail = () => props.onAuthError();
    authFailureListeners.add(handleAuthFail);
    return () => {
      authFailureListeners.delete(handleAuthFail);
    };
  }, [props.onAuthError]);

  return (
    <APIProvider
      apiKey={props.apiKey}
      libraries={['places', 'marker']}
      onError={() => {
        console.warn('APIProvider failed to load Google Maps SDK. Switching to radar fallback.');
        props.onAuthError();
      }}
      onLoad={() => {
        if (typeof window !== 'undefined' && !(window as any).google?.maps?.marker?.AdvancedMarkerElement) {
          console.warn('Google Maps loaded without AdvancedMarkerElement, switching to radar fallback.');
          props.onAuthError();
        }
      }}
    >
      <GoogleMapsLiveRendererContent {...props} />
    </APIProvider>
  );
};

// Tactical Interactive Radar Screen (Clean zero-dependency fallback adhering to AURA palette)
const RadarCanvasView: React.FC<{
  center: { lat: number; lng: number };
  zoom: number;
  userLocation: { lat: number; lng: number } | null;
  profiles: UserProfile[];
  venues: QueerVenue[];
  showMembers: boolean;
  selectedUser: UserProfile | null;
  selectedVenue: QueerVenue | null;
  onSelectUser: (u: UserProfile | null) => void;
  onSelectVenue: (v: QueerVenue | null) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetCenter: () => void;
  authErrorOccurred: boolean;
}> = ({
  center,
  zoom,
  userLocation,
  profiles,
  venues,
  showMembers,
  selectedUser,
  selectedVenue,
  onSelectUser,
  onSelectVenue,
  onZoomIn,
  onZoomOut,
  onResetCenter,
  authErrorOccurred
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, startPanX: 0, startPanY: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth || 800,
          height: containerRef.current.clientHeight || 600
        });
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setPanOffset({ x: 0, y: 0 });
  }, [center.lat, center.lng]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.interactive-card, button, a')) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startPanX: panOffset.x,
      startPanY: panOffset.y
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPanOffset({
      x: dragStartRef.current.startPanX + dx,
      y: dragStartRef.current.startPanY + dy
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Geographic Mercator projection centered dynamically anywhere on Earth
  const pxPerKm = 32 * Math.pow(1.35, zoom - 12);
  const cx = dimensions.width / 2 + panOffset.x;
  const cy = dimensions.height / 2 + panOffset.y;

  const latRad = (center.lat * Math.PI) / 180;
  const projectCoords = (lat: number, lng: number) => {
    const dLatKm = (lat - center.lat) * 111.0;
    const dLngKm = (lng - center.lng) * (111.0 * Math.cos(latRad));
    return {
      x: cx + dLngKm * pxPerKm,
      y: cy - dLatKm * pxPerKm
    };
  };

  const rangeRings = [1, 2.5, 5, 8, 12, 18];

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className={`w-full h-full relative overflow-hidden select-none touch-none cursor-${
        isDragging ? 'grabbing' : 'grab'
      } bg-[#050507]`}
    >
      {/* Background Radar Grid */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              'radial-gradient(#a855f7 1px, transparent 1px), linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '40px 40px, 40px 40px, 40px 40px'
          }}
        />

        {/* Concentric Range Rings */}
        <svg className="absolute inset-0 w-full h-full">
          {rangeRings.map(km => {
            const r = km * pxPerKm;
            return (
              <g key={km}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke="rgba(168, 85, 247, 0.14)"
                  strokeWidth="1"
                  strokeDasharray="4 6"
                />
                <text
                  x={cx + r + 4}
                  y={cy - 4}
                  fill="rgba(192, 132, 252, 0.4)"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {km} km
                </text>
              </g>
            );
          })}

          {/* Coordinate Crosshairs */}
          <line
            x1={cx}
            y1={0}
            x2={cx}
            y2={dimensions.height}
            stroke="rgba(255, 255, 255, 0.04)"
            strokeWidth="1"
          />
          <line
            x1={0}
            y1={cy}
            x2={dimensions.width}
            y2={cy}
            stroke="rgba(255, 255, 255, 0.04)"
            strokeWidth="1"
          />

          {/* Sweeping Radar Line */}
          <g transform={`translate(${cx}, ${cy})`}>
            <line
              x1="0"
              y1="0"
              x2={Math.min(dimensions.width, dimensions.height)}
              y2="0"
              stroke="rgba(217, 70, 239, 0.22)"
              strokeWidth="2"
              className="origin-left"
              style={{
                animation: 'radarSweep 6.5s linear infinite'
              }}
            />
          </g>
        </svg>
      </div>

      {/* User Approximate Privacy Pin on Radar */}
      {userLocation && (
        (() => {
          const pt = projectCoords(userLocation.lat, userLocation.lng);
          return (
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{ left: pt.x, top: pt.y }}
            >
              <div className="relative flex items-center justify-center">
                <span className="absolute w-12 h-12 rounded-full bg-fuchsia-500/15 border border-fuchsia-500/25 animate-pulse" />
                <span className="w-3.5 h-3.5 rounded-full bg-fuchsia-400 border-2 border-white shadow-[0_0_12px_rgba(217,70,239,0.8)]" />
              </div>
            </div>
          );
        })()
      )}

      {/* Render Member Markers on Radar */}
      {showMembers &&
        profiles.map(profile => {
          if (profile.locationPrivacy === 'HIDDEN' || profile.lat === undefined || profile.lng === undefined) {
            return null;
          }
          const pt = projectCoords(profile.lat, profile.lng);
          if (
            pt.x < -60 ||
            pt.x > dimensions.width + 60 ||
            pt.y < -60 ||
            pt.y > dimensions.height + 60
          ) {
            return null;
          }

          return (
            <div
              key={profile.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: pt.x, top: pt.y }}
            >
              <MemberMarkerItem
                profile={profile}
                isSelected={selectedUser?.id === profile.id}
                onSelect={() => {
                  onSelectUser(profile);
                  onSelectVenue(null);
                }}
              />
            </div>
          );
        })}

      {/* Render Venue Markers on Radar */}
      {venues.map(venue => {
        const pt = projectCoords(venue.lat, venue.lng);
        if (
          pt.x < -60 ||
          pt.x > dimensions.width + 60 ||
          pt.y < -60 ||
          pt.y > dimensions.height + 60
        ) {
          return null;
        }

        return (
          <div
            key={venue.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: pt.x, top: pt.y }}
          >
            <VenueMarkerItem
              venue={venue}
              isSelected={selectedVenue?.id === venue.id}
              onSelect={() => {
                onSelectVenue(venue);
                onSelectUser(null);
              }}
            />
          </div>
        );
      })}

      {/* Tactical Radar Zoom Controls */}
      <div className="absolute bottom-4 right-4 z-30 flex flex-col gap-1.5 bg-[#090b16]/90 backdrop-blur-xl p-1 rounded-2xl border border-purple-500/20 shadow-xl pointer-events-auto">
        <button
          onClick={onZoomIn}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 active:scale-90 transition-all"
          title="Zoom In"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={onZoomOut}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 active:scale-90 transition-all"
          title="Zoom Out"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={onResetCenter}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-fuchsia-400 hover:text-fuchsia-300 hover:bg-white/10 active:scale-90 transition-all"
          title="Center on Target"
        >
          <Crosshair className="w-4 h-4" />
        </button>
      </div>

      {/* Informative Radar Telemetry Banner */}
      <div className="absolute top-20 left-3 right-3 z-30 pointer-events-none flex justify-center">
        <div className="pointer-events-auto max-w-lg flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[#080a18]/90 border border-purple-500/30 text-[11px] text-slate-300 backdrop-blur-xl shadow-2xl">
          <Radio className="w-3.5 h-3.5 text-fuchsia-400 shrink-0 animate-pulse" />
          <div className="flex-1 truncate">
            {authErrorOccurred ? (
              <span>Google Maps Key Restricted. Operating in Tactical Radar Mode.</span>
            ) : (
              <span>Interactive Tactical Radar Active • Showing approximate radius locations.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Safe helper to strip any invalid/control characters from auth tokens
const getSafeAuthHeader = (token?: string | null): Record<string, string> => {
  if (!token || typeof token !== 'string') return {};
  const sanitized = token.replace(/[\r\n\t\0]/g, '').trim();
  if (!sanitized || sanitized === 'null' || sanitized === 'undefined' || sanitized === '""') return {};
  if (!/^[\x21-\x7E]+$/.test(sanitized)) return {};
  return { Authorization: `Bearer ${sanitized}` };
};

// Strictly validates whether the provided string matches a genuine Google Maps Platform API key structure.
// Valid Google Cloud API keys start with 'AIza' (e.g. AIzaSy...) and consist of alphanumeric characters,
// underscores, and hyphens (typically 39 characters). Bogus strings like package names ('@vis.gl/...'),
// URLs, or placeholder words are rejected upfront to avoid triggering Google Maps InvalidKeyMapError.
const isValidGoogleMapsKey = (key?: string | null): boolean => {
  if (!key || typeof key !== 'string') return false;
  const trimmed = key.trim();
  if (!trimmed.startsWith('AIza')) return false;
  if (trimmed.length < 35 || trimmed.length > 45) return false;
  if (!/^AIza[0-9A-Za-z_-]{31,}$/.test(trimmed)) return false;
  return true;
};

export const MapView: React.FC<MapViewProps> = ({
  authToken,
  onOpenProfile,
  onOpenChat,
  onOpenPremium
}) => {
  const rawApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const isKeyConfigured = isValidGoogleMapsKey(rawApiKey);

  const [authErrorOccurred, setAuthErrorOccurred] = useState(false);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [venues, setVenues] = useState<QueerVenue[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);
  const [isLoadingVenues, setIsLoadingVenues] = useState(false);
  const [activeFilter, setActiveFilter] = useState<LayerFilter>('all');

  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<QueerVenue | null>(null);

  // Initial center determined dynamically (not hardcoded to LA!)
  const initialRegion = useMemo(() => getInitialRegionByTimezone(), []);
  const [cameraTarget, setCameraTarget] = useState<{ lat: number; lng: number }>({
    lat: initialRegion.lat,
    lng: initialRegion.lng
  });
  const [currentRegionName, setCurrentRegionName] = useState<string>(`Exploring: ${initialRegion.name}`);
  const [cameraZoom, setCameraZoom] = useState<number>(13);

  // Geolocation & Privacy State
  const [isLocating, setIsLocating] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'prompt' | 'granted' | 'denied' | 'unavailable'>('prompt');
  const [privacyMode, setPrivacyMode] = useState<LocationPrivacyMode>('APPROXIMATE');
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isCityPickerOpen, setIsCityPickerOpen] = useState(false);

  // Sync privacy mode locally and to backend profile
  const handleUpdatePrivacyMode = (newMode: LocationPrivacyMode) => {
    setPrivacyMode(newMode);
    setIsPrivacyModalOpen(false);
    const authHeader = getSafeAuthHeader(authToken);
    if (Object.keys(authHeader).length > 0) {
      fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader
        },
        body: JSON.stringify({ locationPrivacy: newMode })
      }).catch(err => {
        console.warn('Failed to sync privacy mode with server:', err);
      });
    }
  };

  // City Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Fetch dynamic venues for given coordinates
  const fetchVenuesForLocation = useCallback((lat: number, lng: number, radiusKm = 40) => {
    setIsLoadingVenues(true);
    try {
      fetch(`/api/venues?lat=${lat}&lng=${lng}&radiusKm=${radiusKm}`)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then(data => {
          if (data?.venues && Array.isArray(data.venues) && data.venues.length > 0) {
            setVenues(data.venues);
          } else {
            const localFallback = getVenuesNearLocation(lat, lng, radiusKm);
            if (localFallback.length > 0) {
              setVenues(localFallback);
            }
          }
        })
        .catch(err => {
          console.warn('Notice loading venues, using curated fallback:', err?.message || err);
          const localFallback = getVenuesNearLocation(lat, lng, radiusKm);
          if (localFallback.length > 0) {
            setVenues(localFallback);
          }
        })
        .finally(() => {
          setIsLoadingVenues(false);
        });
    } catch {
      const localFallback = getVenuesNearLocation(lat, lng, radiusKm);
      if (localFallback.length > 0) {
        setVenues(localFallback);
      }
      setIsLoadingVenues(false);
    }
  }, []);

  // Fetch nearby profiles from server
  const fetchProfiles = useCallback(() => {
    setIsLoadingProfiles(true);
    try {
      const headers = getSafeAuthHeader(authToken);
      fetch('/api/discover', { headers })
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then(data => {
          if (data?.profiles && Array.isArray(data.profiles)) {
            setProfiles(data.profiles);
          }
        })
        .catch(err => {
          console.warn('Notice loading profiles for map:', err?.message || err);
        })
        .finally(() => {
          setIsLoadingProfiles(false);
        });
    } catch (err: any) {
      console.warn('Notice initializing profiles fetch:', err?.message || err);
      setIsLoadingProfiles(false);
    }
  }, [authToken]);

  // Initial Location detection (non-blocking, single-shot, cached)
  useEffect(() => {
    fetchProfiles();

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const coords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          };
          setUserLocation(coords);
          setCameraTarget(coords);
          setLocationStatus('granted');
          setCurrentRegionName('Current Location');
          fetchVenuesForLocation(coords.lat, coords.lng);
        },
        err => {
          setLocationStatus(err.code === 1 ? 'denied' : 'unavailable');
          // Fallback to initial regional hub (e.g. London or Berlin or NY based on timezone)
          fetchVenuesForLocation(initialRegion.lat, initialRegion.lng);
        },
        { timeout: 6000, maximumAge: 300000, enableHighAccuracy: false }
      );
    } else {
      setLocationStatus('unavailable');
      fetchVenuesForLocation(initialRegion.lat, initialRegion.lng);
    }
  }, [fetchProfiles, fetchVenuesForLocation, initialRegion.lat, initialRegion.lng]);

  // Hook into Google Maps authentication failure interceptor
  useEffect(() => {
    const handleAuthFailure = () => {
      setAuthErrorOccurred(true);
    };
    authFailureListeners.add(handleAuthFailure);
    return () => {
      authFailureListeners.delete(handleAuthFailure);
    };
  }, []);

  // Handle locating user explicitly
  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus('unavailable');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };
        setUserLocation(coords);
        setCameraTarget(coords);
        setCameraZoom(14);
        setLocationStatus('granted');
        setCurrentRegionName('Current Location');
        fetchVenuesForLocation(coords.lat, coords.lng);
        setIsLocating(false);
      },
      err => {
        setLocationStatus(err.code === 1 ? 'denied' : 'unavailable');
        setCurrentRegionName(`Exploring: ${initialRegion.name} (Manual Mode)`);
        setIsLocating(false);
      },
      { timeout: 7000, enableHighAccuracy: false, maximumAge: 60000 }
    );
  }, [fetchVenuesForLocation, initialRegion.name]);

  // Handle Global City preset selection
  const handleSelectCity = (city: CityPreset) => {
    setCameraTarget({ lat: city.lat, lng: city.lng });
    setCameraZoom(city.zoom);
    setCurrentRegionName(`Exploring: ${city.name}, ${city.country}`);
    fetchVenuesForLocation(city.lat, city.lng);
    setIsCityPickerOpen(false);
  };

  // Handle Global City Search
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanQ = searchQuery.trim().toLowerCase();
    if (!cleanQ) return;

    setIsSearching(true);

    // Check if it matches any global preset directly
    const foundPreset = GLOBAL_CITY_PRESETS.find(
      c => c.name.toLowerCase().includes(cleanQ) || c.country.toLowerCase().includes(cleanQ)
    );

    if (foundPreset) {
      handleSelectCity(foundPreset);
      setSearchQuery('');
      setIsSearching(false);
      return;
    }

    // Try querying backend /api/venues?q=... to see if venues match
    fetch(`/api/venues?q=${encodeURIComponent(cleanQ)}`)
      .then(res => res.json())
      .then(data => {
        if (data.venues && data.venues.length > 0) {
          const first = data.venues[0];
          setCameraTarget({ lat: first.lat, lng: first.lng });
          setCameraZoom(14);
          setCurrentRegionName(first.neighborhood || cleanQ);
          setVenues(data.venues);
        } else {
          // Attempt standard geocoding
          fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQ)}&limit=1`)
            .then(res => res.json())
            .then(geo => {
              if (geo && geo.length > 0) {
                const lat = parseFloat(geo[0].lat);
                const lng = parseFloat(geo[0].lon);
                setCameraTarget({ lat, lng });
                setCameraZoom(13);
                setCurrentRegionName(geo[0].display_name.split(',')[0]);
                fetchVenuesForLocation(lat, lng);
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsSearching(false);
        setSearchQuery('');
      });
  };

  // Filter venues based on active filter
  const showMembers = activeFilter === 'all' || activeFilter === 'members';

  const filteredVenues = useMemo(() => {
    return venues.filter(v => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'bars' && v.category === 'bar') return true;
      if (activeFilter === 'clubs' && v.category === 'club') return true;
      if (activeFilter === 'cafes' && v.category === 'cafe') return true;
      if (activeFilter === 'community' && v.category === 'community') return true;
      return false;
    });
  }, [venues, activeFilter]);

  const shouldUseLiveGoogleMaps = isKeyConfigured && !authErrorOccurred;

  return (
    <div className="relative w-full h-[calc(100vh-8.5rem)] md:h-[calc(100vh-7rem)] rounded-3xl overflow-hidden border border-white/[0.08] shadow-2xl flex flex-col bg-[#07080f]">
      {/* Top Floating Control Stack */}
      <div className="absolute top-3 left-3 right-3 z-30 flex flex-col gap-2 pointer-events-none">
        {/* Row 1: Search Bar + Location Jump + Privacy Control */}
        <div className="flex items-center justify-between gap-2 pointer-events-auto">
          {/* Global City Search Bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="flex-1 max-w-md flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#080914]/90 border border-purple-500/25 backdrop-blur-xl shadow-lg focus-within:border-fuchsia-400 transition-all aura-glass-card"
          >
            <Search className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search global city, district, or venue..."
              className="bg-transparent text-xs text-white placeholder-slate-400 outline-none w-full min-w-0"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </form>

          {/* Privacy Mode Control Pill */}
          <button
            onClick={() => setIsPrivacyModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#090b18]/90 border border-purple-500/30 text-xs font-semibold backdrop-blur-xl shadow-lg hover:border-fuchsia-400 transition-all active:scale-95 text-slate-200 hover:text-white shrink-0 aura-glass-card"
            title="Configure Location Privacy"
          >
            <Lock className="w-3.5 h-3.5 text-fuchsia-400" />
            <span className="hidden md:inline text-[11px]">Privacy:</span>
            <span className="text-[11px] font-bold text-fuchsia-300">
              {privacyMode === 'APPROXIMATE' ? 'Approximate' : privacyMode === 'EXACT' ? 'Exact' : 'Hidden'}
            </span>
          </button>

          {/* Near Me GPS Trigger */}
          <button
            onClick={handleLocateMe}
            disabled={isLocating}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-bold transition-all shadow-lg active:scale-95 shrink-0 ${
              locationStatus === 'granted'
                ? 'bg-gradient-to-r from-fuchsia-600 via-purple-600 to-violet-700 text-white shadow-[0_0_14px_rgba(217,70,239,0.4)]'
                : 'bg-[#0a0c18]/90 border border-purple-500/30 text-slate-200 hover:text-white'
            }`}
            title="Locate my position"
          >
            <Locate className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin text-fuchsia-300' : ''}`} />
            <span className="hidden sm:inline">Near Me</span>
          </button>
        </div>

        {/* Row 2: Global Metropolises Quick Jumps */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pointer-events-auto py-0.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 px-1 flex items-center gap-1 shrink-0">
            <Compass className="w-3 h-3 text-fuchsia-400" />
            <span>GLOBAL HUBS</span>
          </span>

          {GLOBAL_CITY_PRESETS.map(city => (
            <button
              key={city.name}
              onClick={() => handleSelectCity(city)}
              className="px-2.5 py-1 rounded-xl text-[11px] font-semibold whitespace-nowrap bg-[#080a18]/85 hover:bg-[#121528] text-slate-300 hover:text-white border border-purple-500/20 hover:border-purple-400/40 transition-all active:scale-95 shadow-sm"
            >
              {city.name}
            </button>
          ))}
        </div>

        {/* Row 3: Category Layer Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pointer-events-auto py-0.5">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-tight shadow-md border backdrop-blur-md transition-all active:scale-95 flex items-center gap-1.5 whitespace-nowrap ${
              activeFilter === 'all'
                ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 border-purple-400 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                : 'bg-[#090b16]/90 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>All ({profiles.length + filteredVenues.length})</span>
          </button>

          <button
            onClick={() => setActiveFilter('members')}
            className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-tight shadow-md border backdrop-blur-md transition-all active:scale-95 flex items-center gap-1.5 whitespace-nowrap ${
              activeFilter === 'members'
                ? 'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                : 'bg-[#090b16]/90 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Users className="w-3 h-3 text-emerald-400" />
            <span>Members ({profiles.length})</span>
          </button>

          <button
            onClick={() => setActiveFilter('bars')}
            className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-tight shadow-md border backdrop-blur-md transition-all active:scale-95 flex items-center gap-1.5 whitespace-nowrap ${
              activeFilter === 'bars'
                ? 'bg-purple-700 border-purple-400 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                : 'bg-[#090b16]/90 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Beer className="w-3 h-3 text-purple-300" />
            <span>Gay Bars</span>
          </button>

          <button
            onClick={() => setActiveFilter('clubs')}
            className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-tight shadow-md border backdrop-blur-md transition-all active:scale-95 flex items-center gap-1.5 whitespace-nowrap ${
              activeFilter === 'clubs'
                ? 'bg-fuchsia-600 border-fuchsia-400 text-white shadow-[0_0_12px_rgba(217,70,239,0.4)]'
                : 'bg-[#090b16]/90 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Music className="w-3 h-3 text-fuchsia-300" />
            <span>Dance Clubs</span>
          </button>

          <button
            onClick={() => setActiveFilter('cafes')}
            className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-tight shadow-md border backdrop-blur-md transition-all active:scale-95 flex items-center gap-1.5 whitespace-nowrap ${
              activeFilter === 'cafes'
                ? 'bg-rose-700 border-rose-400 text-white shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                : 'bg-[#090b16]/90 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Coffee className="w-3 h-3 text-rose-300" />
            <span>Queer Cafes</span>
          </button>

          <button
            onClick={() => setActiveFilter('community')}
            className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-tight shadow-md border backdrop-blur-md transition-all active:scale-95 flex items-center gap-1.5 whitespace-nowrap ${
              activeFilter === 'community'
                ? 'bg-indigo-700 border-indigo-400 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]'
                : 'bg-[#090b16]/90 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <HeartHandshake className="w-3 h-3 text-cyan-300" />
            <span>Community Hubs</span>
          </button>
        </div>

        {/* Location Permission Denied / Unavailable Notification Banner */}
        {(locationStatus === 'denied' || locationStatus === 'unavailable') && (
          <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-[#140c1e]/95 border border-purple-500/30 text-xs text-purple-200 backdrop-blur-xl shadow-xl aura-glass-card">
            <div className="flex items-center gap-2">
              <Compass className="w-3.5 h-3.5 text-fuchsia-400 shrink-0" />
              <span>Location permission disabled. Safe exploration mode active.</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setIsCityPickerOpen(true)}
                className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-fuchsia-200 border border-fuchsia-500/30 transition-all flex items-center gap-1 active:scale-95"
              >
                <Compass className="w-3 h-3 text-fuchsia-300" />
                <span>Choose City</span>
              </button>
              <button
                onClick={handleLocateMe}
                className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-fuchsia-600/40 hover:bg-fuchsia-600 text-white transition-all flex items-center gap-1 active:scale-95"
              >
                <Locate className="w-3 h-3" />
                <span>Retry GPS</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Map or Tactical Radar Renderer */}
      <div className="w-full h-full relative">
        {shouldUseLiveGoogleMaps ? (
          <ErrorBoundary
            onError={() => {
              console.warn('Google Maps crashed via ErrorBoundary, falling back...');
              setAuthErrorOccurred(true);
            }}
            fallback={
              <RadarCanvasView
                center={cameraTarget || { lat: 51.5074, lng: -0.1278 }}
                zoom={cameraZoom}
                userLocation={userLocation}
                profiles={profiles}
                venues={filteredVenues}
                showMembers={showMembers}
                selectedUser={selectedUser}
                selectedVenue={selectedVenue}
                onSelectUser={setSelectedUser}
                onSelectVenue={setSelectedVenue}
                onZoomIn={() => setCameraZoom(z => Math.min(20, z + 1))}
                onZoomOut={() => setCameraZoom(z => Math.max(2, z - 1))}
                onResetCenter={handleLocateMe}
                authErrorOccurred={authErrorOccurred}
              />
            }
          >
            <GoogleMapsLiveRenderer
              apiKey={rawApiKey!}
              cameraTarget={cameraTarget}
              cameraZoom={cameraZoom}
              userLocation={userLocation}
              showMembers={showMembers}
              profiles={profiles}
              filteredVenues={filteredVenues}
              selectedUser={selectedUser}
              selectedVenue={selectedVenue}
              setSelectedUser={setSelectedUser}
              setSelectedVenue={setSelectedVenue}
              onAuthError={() => setAuthErrorOccurred(true)}
            />
          </ErrorBoundary>
        ) : (
          <RadarCanvasView
            center={cameraTarget}
            zoom={cameraZoom}
            userLocation={userLocation}
            profiles={profiles}
            venues={filteredVenues}
            showMembers={showMembers}
            selectedUser={selectedUser}
            selectedVenue={selectedVenue}
            onSelectUser={setSelectedUser}
            onSelectVenue={setSelectedVenue}
            onZoomIn={() => setCameraZoom(z => Math.min(z + 1, 16))}
            onZoomOut={() => setCameraZoom(z => Math.max(z - 1, 11))}
            onResetCenter={() => {
              setCameraTarget(initialRegion);
              setCameraZoom(13);
            }}
            authErrorOccurred={authErrorOccurred}
          />
        )}
      </div>

      {/* Empty States (when no venues exist in current viewed area) */}
      {!isLoadingVenues && filteredVenues.length === 0 && activeFilter !== 'members' && (
        <div className="absolute bottom-16 sm:bottom-14 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-30 pointer-events-auto aura-glass-card rounded-2xl p-4 border border-purple-500/30 text-left shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-950/60 border border-purple-500/40 flex items-center justify-center text-fuchsia-400 shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-white">No Safe Spaces in this Immediate Area</h4>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                AURA verifies queer bars, cafes, and health sanctuaries globally. Zoom out, explore another city above, or submit your local safe space.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Selected Member: Mobile Bottom Sheet + Desktop Floating Panel */}
      {selectedUser && (
        <div
          onClick={e => e.stopPropagation()}
          className="interactive-card fixed sm:absolute bottom-16 sm:bottom-auto sm:top-20 left-0 right-0 sm:left-auto sm:right-6 sm:w-96 z-40 max-h-[46vh] sm:max-h-[calc(100%-6rem)] overflow-y-auto custom-scrollbar aura-glass-card-elevated rounded-t-[28px] sm:rounded-[24px] border-t sm:border border-purple-500/30 p-4 sm:p-5 shadow-[0_-16px_50px_rgba(0,0,0,0.85)] text-left"
        >
          {/* Mobile Drag Indicator */}
          <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-3 sm:hidden" />

          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <ProfileAuraFrame
                  isOnline={selectedUser.isOnline}
                  className="w-14 h-14 rounded-2xl shrink-0 shadow-lg"
                >
                  <img
                    src={
                      selectedUser.photos[0]?.url ||
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80'
                    }
                    alt={selectedUser.displayName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </ProfileAuraFrame>
                {selectedUser.isOnline && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-black shadow z-10" />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-base font-bold text-white truncate">
                    {selectedUser.displayName}, {selectedUser.age}
                  </h3>
                  {selectedUser.verified && (
                    <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-purple-300 mt-0.5">
                  <span className="font-semibold text-fuchsia-300">{selectedUser.identityRole}</span>
                  <span>•</span>
                  <span>{selectedUser.location}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedUser(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-all shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Privacy Guarantee Pill */}
          <div className="mt-3 px-2.5 py-1.5 rounded-xl bg-purple-950/40 border border-purple-500/20 flex items-center justify-between text-[11px]">
            <span className="text-slate-300 flex items-center gap-1">
              <Lock className="w-3 h-3 text-fuchsia-400" />
              <span>Location Security</span>
            </span>
            <span className="font-bold text-fuchsia-300">
              {selectedUser.approximateArea || formatDistanceDescriptive(selectedUser.distanceKm)}
            </span>
          </div>

          {/* Bio Preview */}
          {selectedUser.bio && (
            <p className="text-xs text-slate-300 mt-2.5 line-clamp-2 leading-relaxed italic">
              "{selectedUser.bio}"
            </p>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 mt-4 pt-2 border-t border-white/10">
            <button
              onClick={() => {
                onOpenProfile(selectedUser);
                setSelectedUser(null);
              }}
              className="py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white transition-all text-center border border-white/10 active:scale-95"
            >
              View Full Profile
            </button>
            <button
              onClick={() => {
                onOpenChat(selectedUser.userId);
                setSelectedUser(null);
              }}
              className="py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-fuchsia-600 via-purple-600 to-violet-700 hover:brightness-110 text-white transition-all flex items-center justify-center gap-1.5 shadow-lg active:scale-95"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Direct Chat</span>
            </button>
          </div>
        </div>
      )}

      {/* Selected Venue: Mobile Bottom Sheet + Desktop Floating Panel */}
      {selectedVenue && (
        <div
          onClick={e => e.stopPropagation()}
          className="interactive-card fixed sm:absolute bottom-16 sm:bottom-auto sm:top-20 left-0 right-0 sm:left-auto sm:right-6 sm:w-96 z-40 max-h-[50vh] sm:max-h-[calc(100%-6rem)] overflow-y-auto custom-scrollbar aura-glass-card-elevated rounded-t-[28px] sm:rounded-[24px] border-t sm:border border-purple-500/30 p-4 sm:p-5 shadow-[0_-16px_50px_rgba(0,0,0,0.85)] text-left space-y-3"
        >
          {/* Mobile Drag Indicator */}
          <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-2 sm:hidden" />

          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-fuchsia-400 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span>VERIFIED QUEER SAFE SPACE</span>
            </span>
            <button
              onClick={() => setSelectedVenue(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {selectedVenue.imageUrl && (
            <img
              src={selectedVenue.imageUrl}
              alt={selectedVenue.name}
              referrerPolicy="no-referrer"
              className="w-full h-28 rounded-xl object-cover border border-purple-500/20 shadow-md"
            />
          )}

          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-white">{selectedVenue.name}</h3>
              <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">
                {selectedVenue.category}
              </span>
            </div>
            <p className="text-xs text-slate-300 flex items-center gap-1 mt-1">
              <MapPin className="w-3.5 h-3.5 text-fuchsia-400 shrink-0" />
              <span className="truncate">{selectedVenue.address}</span>
            </p>
          </div>

          <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
            {selectedVenue.description}
          </p>

          <div className="flex flex-wrap gap-1">
            {selectedVenue.tags.map(t => (
              <span
                key={t}
                className="text-[10px] px-2 py-0.5 bg-white/[0.06] text-purple-200 rounded-md font-medium border border-purple-500/20"
              >
                #{t}
              </span>
            ))}
          </div>

          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
              selectedVenue.address
            )}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-700 via-fuchsia-600 to-pink-600 hover:brightness-110 text-white transition-all text-center shadow-lg active:scale-95 mt-1"
          >
            <span>Get Directions</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          {/* Subtle Native Radar Ad in Venue Drawer */}
          <div className="pt-2 border-t border-white/10">
            <AdSlot
              placement="radar"
              format="radar-card"
              onOpenPremium={onOpenPremium}
            />
          </div>
        </div>
      )}

      {/* Privacy Mode Selector Modal */}
      {isPrivacyModalOpen && (
        <div
          onClick={() => setIsPrivacyModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md aura-glass-card-elevated rounded-[28px] border border-purple-500/30 p-6 shadow-2xl text-left space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-fuchsia-400" />
                <h3 className="text-base font-bold text-white">Location Privacy Model</h3>
              </div>
              <button
                onClick={() => setIsPrivacyModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              At AURA, privacy comes before precision. Your exact residential or physical coordinates are never broadcast to other users without explicit consent.
            </p>

            <div className="space-y-2.5">
              <button
                onClick={() => handleUpdatePrivacyMode('APPROXIMATE')}
                className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                  privacyMode === 'APPROXIMATE'
                    ? 'bg-purple-900/40 border-fuchsia-400 text-white ring-1 ring-fuchsia-400/50 shadow-[0_0_16px_rgba(217,70,239,0.3)]'
                    : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.06]'
                }`}
              >
                <ShieldCheck className="w-5 h-5 text-fuchsia-400 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">Approximate (~1.5–2km)</span>
                    <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-300 font-black">
                      Recommended
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Places your discovery pin within an approximate neighborhood radius with deterministic fuzzing. Your exact street address is never exposed.
                  </p>
                </div>
              </button>

              <button
                onClick={() => handleUpdatePrivacyMode('EXACT')}
                className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                  privacyMode === 'EXACT'
                    ? 'bg-purple-900/40 border-fuchsia-400 text-white ring-1 ring-fuchsia-400/50 shadow-[0_0_16px_rgba(217,70,239,0.3)]'
                    : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.06]'
                }`}
              >
                <Eye className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">Exact Coordinate Precision</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Only enabled with your explicit consent. Shows pinpoint accuracy for matching and meeting verified contacts.
                  </p>
                </div>
              </button>

              <button
                onClick={() => handleUpdatePrivacyMode('HIDDEN')}
                className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                  privacyMode === 'HIDDEN'
                    ? 'bg-purple-900/40 border-fuchsia-400 text-white ring-1 ring-fuchsia-400/50 shadow-[0_0_16px_rgba(217,70,239,0.3)]'
                    : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.06]'
                }`}
              >
                <EyeOff className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">Hidden (Ghost Mode)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Your pin is completely hidden from discovery radar. You can still view other members and browse safe spaces.
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safe Manual Option: Choose City Modal */}
      {isCityPickerOpen && (
        <div
          onClick={() => setIsCityPickerOpen(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md aura-glass-card-elevated rounded-[28px] border border-purple-500/30 p-6 shadow-2xl text-left space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-fuchsia-400" />
                <h3 className="text-base font-bold text-white">Choose City / Safe Region</h3>
              </div>
              <button
                onClick={() => setIsCityPickerOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              When location is disabled or approximate, select a global LGBTQ+ metropolis to explore safe spaces and active community members:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
              {GLOBAL_CITY_PRESETS.map(city => (
                <button
                  key={city.name}
                  onClick={() => handleSelectCity(city)}
                  className="p-3 rounded-2xl bg-white/[0.04] hover:bg-purple-900/40 border border-purple-500/20 hover:border-fuchsia-400 text-left transition-all active:scale-95 group"
                >
                  <div className="text-xs font-bold text-white group-hover:text-fuchsia-300 truncate">
                    {city.name}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {city.country}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Persistent Bottom Status & Telemetry Bar */}
      <div className="p-2.5 bg-[#070914]/90 backdrop-blur-xl border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-400 z-20">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="font-medium text-slate-300 truncate">
            {currentRegionName} • {profiles.length} Members • {filteredVenues.length} Safe Spaces
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-purple-300/80 font-mono hidden sm:inline">
            Privacy: {privacyMode}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {shouldUseLiveGoogleMaps ? 'Google Maps Platform' : 'AURA Tactical Radar'}
          </span>
        </div>
      </div>
    </div>
  );
};
