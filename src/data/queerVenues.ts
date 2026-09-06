import { QueerVenue } from '../types';

// Haversine distance formula in kilometers
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Curated global directory of prominent LGBTQ+ safe spaces, heritage sites & community hubs
export const GLOBAL_QUEER_VENUES: QueerVenue[] = [
  // --- LONDON, UK ---
  {
    id: 'venue-london-heaven',
    name: 'Heaven Nightclub',
    category: 'club',
    lat: 51.5074,
    lng: -0.1238,
    address: '17 Craven St, Charing Cross, London WC2N 5NT',
    neighborhood: 'Soho / Charing Cross',
    description: 'Legendary multi-room underground nightclub operating since 1979 under Charing Cross station, hosting iconic G-A-Y events.',
    distanceKm: 0,
    tags: ['Legendary Club', 'DJs & Dance', 'Historic', 'Underground'],
    imageUrl: 'https://images.unsplash.com/photo-1545128485-c400e7702796?w=600&q=80',
    isVerified: true
  },
  {
    id: 'venue-london-rvt',
    name: 'Royal Vauxhall Tavern',
    category: 'bar',
    lat: 51.4862,
    lng: -0.1226,
    address: '372 Kennington Ln, London SE11 5HY',
    neighborhood: 'Vauxhall',
    description: 'South London’s premier LGBTQ+ cabaret venue, historic Grade II listed building celebrated for queer arts and alternative performance.',
    distanceKm: 0,
    tags: ['Cabaret', 'Queer Performance', 'Historic Landmark', 'Vauxhall'],
    imageUrl: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&q=80',
    isVerified: true
  },
  {
    id: 'venue-london-dalston',
    name: 'Dalston Superstore',
    category: 'cafe',
    lat: 51.5478,
    lng: -0.0754,
    address: '117 Kingsland High St, London E8 2PB',
    neighborhood: 'East London / Dalston',
    description: 'Eclectic East London daytime queer diner, cafe and art space transforming into an energetic subterranean dance sanctuary at night.',
    distanceKm: 0,
    tags: ['Queer Diner & Brunch', 'Art Exhibitions', 'Basement Club', 'East London'],
    imageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&q=80',
    isVerified: true
  },
  {
    id: 'venue-london-center',
    name: 'London LGBTQ+ Community Centre',
    category: 'community',
    lat: 51.5065,
    lng: -0.0988,
    address: '60-62 Hopton St, London SE1 9JH',
    neighborhood: 'Bankside / Southwark',
    description: 'Sober, intergenerational community lounge on Bankside offering mental health support, queer lending library, and inclusive social workshops.',
    distanceKm: 0,
    tags: ['Sober Space', 'Mental Health', 'Queer Library', 'Workshops'],
    imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&q=80',
    isVerified: true
  },

  // --- BERLIN, GERMANY ---
  {
    id: 'venue-berlin-schwuz',
    name: 'SchwuZ Club',
    category: 'club',
    lat: 52.4789,
    lng: 13.4398,
    address: 'Rollbergstraße 26, 12053 Berlin',
    neighborhood: 'Neukölln',
    description: 'Germany’s oldest continuously running queer club, housed in a historic Neukölln brewery with three diverse dance floors and community focus.',
    distanceKm: 0,
    tags: ['Historic 1977', 'Multi-floor', 'Solidarity Events', 'Neukölln'],
    imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&q=80',
    isVerified: true
  },
  {
    id: 'venue-berlin-mobel',
    name: 'Möbel Olfe',
    category: 'bar',
    lat: 52.4994,
    lng: 13.4184,
    address: 'Reichenberger Str. 177, 10999 Berlin',
    neighborhood: 'Kreuzberg',
    description: 'High-ceilinged retro bar in Kottbusser Tor with eclectic chairs suspended from the ceiling, welcoming a diverse queer Kreuzberg crowd.',
    distanceKm: 0,
    tags: ['Kreuzberg', 'Draft Beer', 'Queer Gathering', 'Outdoor Terrace'],
    imageUrl: 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=600&q=80',
    isVerified: true
  },
  {
    id: 'venue-berlin-museum',
    name: 'Schwules Museum Berlin',
    category: 'community',
    lat: 52.5028,
    lng: 13.3592,
    address: 'Lützowstraße 73, 10785 Berlin',
    neighborhood: 'Tiergarten / Schöneberg',
    description: 'World-renowned archival institution and exhibition space dedicated to preserving queer history, LGBTIQ+ culture, and emancipatory movements.',
    distanceKm: 0,
    tags: ['Queer History', 'Archives', 'Exhibitions', 'Safe Space'],
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80',
    isVerified: true
  },

  // --- NEW YORK CITY, USA ---
  {
    id: 'venue-nyc-stonewall',
    name: 'The Stonewall Inn',
    category: 'bar',
    lat: 40.7338,
    lng: -74.0021,
    address: '53 Christopher St, New York, NY 10014',
    neighborhood: 'Greenwich Village',
    description: 'Birthplace of the modern LGBTQ+ civil rights movement, National Historic Landmark featuring live cabaret, piano shows, and upstairs dance floor.',
    distanceKm: 0,
    tags: ['Historic Landmark 1969', 'Cabaret', 'Greenwich Village', 'Heritage'],
    imageUrl: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&q=80',
    isVerified: true
  },
  {
    id: 'venue-nyc-cubbyhole',
    name: 'Cubbyhole Bar',
    category: 'bar',
    lat: 40.7362,
    lng: -74.0044,
    address: '281 W 12th St, New York, NY 10014',
    neighborhood: 'West Village',
    description: 'Intimate, warm neighborhood queer bar famous for its ceiling packed with hanging paper lanterns, toys, and eclectic local patrons.',
    distanceKm: 0,
    tags: ['Cozy Atmosphere', 'Jukebox', 'Neighborhood Icon', 'West Village'],
    imageUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&q=80',
    isVerified: true
  },
  {
    id: 'venue-nyc-center',
    name: 'The Lesbian, Gay, Bisexual & Transgender Community Center NYC',
    category: 'community',
    lat: 40.7376,
    lng: -73.9997,
    address: '208 W 13th St, New York, NY 10011',
    neighborhood: 'Greenwich Village',
    description: 'Iconic multi-story community haven providing wellness clinics, substance use recovery programs, Keith Haring mural, and youth groups.',
    distanceKm: 0,
    tags: ['Community Center', 'Wellness', 'Keith Haring Mural', 'Youth & Seniors'],
    imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&q=80',
    isVerified: true
  },

  // --- PARIS, FRANCE ---
  {
    id: 'venue-paris-raidd',
    name: 'Le Raidd Bar',
    category: 'bar',
    lat: 48.8585,
    lng: 2.3551,
    address: '23 Rue du Temple, 75004 Paris',
    neighborhood: 'Le Marais',
    description: 'Famous Marais institution known for high-energy music, cocktail lounge, famous shower show performances, and vibrant international crowds.',
    distanceKm: 0,
    tags: ['Le Marais', 'Shower Show', 'Cocktails', 'Nightlife'],
    imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&q=80',
    isVerified: true
  },
  {
    id: 'venue-paris-mutinerie',
    name: 'La Mutinerie',
    category: 'cafe',
    lat: 48.8617,
    lng: 2.3524,
    address: '176 Rue Saint-Martin, 75003 Paris',
    neighborhood: 'Beaubourg / Marais',
    description: 'Feminist, queer, and trans-positive bar, cafe, and self-managed political safe space hosting workshops, book launches, and queer concerts.',
    distanceKm: 0,
    tags: ['Queer Cafe & Books', 'Trans Inclusive', 'Workshops', 'Sober Options'],
    imageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&q=80',
    isVerified: true
  },

  // --- SAN FRANCISCO, USA ---
  {
    id: 'venue-sf-twinpeaks',
    name: 'Twin Peaks Tavern',
    category: 'bar',
    lat: 37.7628,
    lng: -122.4349,
    address: '401 Castro St, San Francisco, CA 94114',
    neighborhood: 'The Castro',
    description: 'The "Gateway to the Castro" — legendary landmark bar recognized as one of the first gay bars with clear, open picture windows to the street.',
    distanceKm: 0,
    tags: ['Historic Landmark', 'Castro Icon', 'Cocktails', 'Windows to Castro'],
    imageUrl: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&q=80',
    isVerified: true
  },
  {
    id: 'venue-sf-center',
    name: 'SF LGBT Center',
    category: 'community',
    lat: 37.7712,
    lng: -122.4234,
    address: '1800 Market St, San Francisco, CA 94102',
    neighborhood: 'Market / Castro',
    description: 'Vibrant community center connecting LGBTQ+ individuals to economic opportunities, housing navigation, health services, and community arts.',
    distanceKm: 0,
    tags: ['Community Hub', 'Health & Housing', 'Arts', 'Victorian Building'],
    imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&q=80',
    isVerified: true
  },

  // --- MADRID, SPAIN ---
  {
    id: 'venue-madrid-ll',
    name: 'LL Showbar Chueca',
    category: 'bar',
    lat: 40.4227,
    lng: -3.6978,
    address: 'Calle de Pelayo, 11, 28004 Madrid',
    neighborhood: 'Chueca',
    description: 'Classic Chueca cabaret and comedy bar celebrating Spanish drag artistry, hilarious live shows, and warm Spanish hospitality.',
    distanceKm: 0,
    tags: ['Chueca', 'Drag Shows', 'Cabaret', 'Spanish Nightlife'],
    imageUrl: 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=600&q=80',
    isVerified: true
  },

  // --- TOKYO, JAPAN ---
  {
    id: 'venue-tokyo-dragonmen',
    name: 'Dragon Men Shinjuku',
    category: 'bar',
    lat: 35.6908,
    lng: 139.7088,
    address: '2-11-4 Shinjuku, Shinjuku City, Tokyo 160-0022',
    neighborhood: 'Shinjuku Ni-chōme',
    description: 'Friendly, internationally renowned bar in the heart of Ni-chōme welcoming locals and queer travelers with DJ sets and terrace seating.',
    distanceKm: 0,
    tags: ['Shinjuku Ni-chome', 'International Friendly', 'DJs', 'Cocktails'],
    imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&q=80',
    isVerified: true
  },

  // --- SYDNEY, AUSTRALIA ---
  {
    id: 'venue-sydney-stonewall',
    name: 'Stonewall Hotel Oxford St',
    category: 'club',
    lat: -33.8798,
    lng: 151.2158,
    address: '175 Oxford St, Darlinghurst NSW 2010',
    neighborhood: 'Darlinghurst / Oxford St',
    description: 'Iconic three-story venue on Sydney’s famed Oxford Street featuring top drag divas, DJ dance parties, and LGBTQ+ pride events.',
    distanceKm: 0,
    tags: ['Oxford St', 'Drag Queens', '3 Levels', 'Sydney Mardi Gras'],
    imageUrl: 'https://images.unsplash.com/photo-1545128485-c400e7702796?w=600&q=80',
    isVerified: true
  },

  // --- LOS ANGELES, USA (Retained in global catalog with exact coordinates) ---
  {
    id: 'venue-la-abbey',
    name: 'The Abbey Food & Bar',
    category: 'bar',
    lat: 34.0850,
    lng: -118.3842,
    address: '692 N Robertson Blvd, West Hollywood, CA 90069',
    neighborhood: 'West Hollywood',
    description: 'World-famous gay bar with expansive open-air patio, dancing, signature martinis, and high-energy crowd.',
    distanceKm: 0,
    tags: ['Patio', 'Dancing', 'Cocktails', 'WeHo Icon'],
    imageUrl: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&q=80',
    isVerified: true
  },
  {
    id: 'venue-la-mickys',
    name: "Micky's WeHo",
    category: 'club',
    lat: 34.0886,
    lng: -118.3812,
    address: '8857 Santa Monica Blvd, West Hollywood, CA 90069',
    neighborhood: 'West Hollywood',
    description: 'High-energy 2-story LGBTQ+ dance club featuring resident DJs, theme parties, and mezzanine lounge.',
    distanceKm: 0,
    tags: ['Dance Club', 'DJs', 'Theme Nights', 'WeHo'],
    imageUrl: 'https://images.unsplash.com/photo-1545128485-c400e7702796?w=600&q=80',
    isVerified: true
  },
  {
    id: 'venue-la-akbar',
    name: 'Akbar',
    category: 'bar',
    lat: 34.0955,
    lng: -118.2798,
    address: '4356 Sunset Blvd, Los Angeles, CA 90029',
    neighborhood: 'Silver Lake',
    description: 'Beloved neighborhood queer haven in Silver Lake with legendary rock/indie jukebox and red-lit back room.',
    distanceKm: 0,
    tags: ['Indie & Alternative', 'Jukebox', 'Silver Lake Local'],
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80',
    isVerified: true
  },
  {
    id: 'venue-la-precinct',
    name: 'Precinct DTLA',
    category: 'club',
    lat: 34.0452,
    lng: -118.2520,
    address: '357 S Broadway, Los Angeles, CA 90013',
    neighborhood: 'Downtown LA',
    description: 'Expansive second-story gay rock-n-roll bar and nightclub with exposed brick, drag showcases, and outdoor balcony.',
    distanceKm: 0,
    tags: ['Downtown Queer', 'Live Drag Shows', 'Balcony Lounge'],
    imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&q=80',
    isVerified: true
  },
  {
    id: 'venue-la-lgbtcenter',
    name: 'Los Angeles LGBT Center',
    category: 'community',
    lat: 34.0982,
    lng: -118.3371,
    address: '1118 N McCadden Pl, Los Angeles, CA 90038',
    neighborhood: 'Hollywood',
    description: 'World landmark community campus offering queer health services, PrEP/PEP clinic, youth & senior programs.',
    distanceKm: 0,
    tags: ['Health & PrEP', 'Community Center', 'Safe Space'],
    imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&q=80',
    isVerified: true
  }
];

// Alias for backwards compatibility
export const QUEER_VENUES = GLOBAL_QUEER_VENUES;

/**
 * Dynamically queries venues within a geographic radius of given coordinates.
 * Returns ONLY venues within the specified max radius (default: 45 km).
 * Returns empty array [] if no verified venues exist in that radius.
 * Never invents fake locations.
 */
export function getVenuesNearLocation(
  lat: number,
  lng: number,
  maxRadiusKm = 45
): QueerVenue[] {
  if (isNaN(lat) || isNaN(lng)) return [];

  const results: QueerVenue[] = [];
  for (const venue of GLOBAL_QUEER_VENUES) {
    const dist = calculateDistanceKm(lat, lng, venue.lat, venue.lng);
    if (dist <= maxRadiusKm) {
      results.push({
        ...venue,
        distanceKm: dist
      });
    }
  }

  // Sort by nearest first
  return results.sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * Searches venues globally by text query (city, neighborhood, name, or tags).
 */
export function searchVenues(
  query: string,
  userLat?: number,
  userLng?: number
): QueerVenue[] {
  const cleanQ = query.toLowerCase().trim();
  if (!cleanQ) return [];

  return GLOBAL_QUEER_VENUES.filter(v => {
    return (
      v.name.toLowerCase().includes(cleanQ) ||
      v.neighborhood.toLowerCase().includes(cleanQ) ||
      v.address.toLowerCase().includes(cleanQ) ||
      v.category.toLowerCase().includes(cleanQ) ||
      v.tags.some(t => t.toLowerCase().includes(cleanQ))
    );
  }).map(v => {
    if (userLat !== undefined && userLng !== undefined) {
      return {
        ...v,
        distanceKm: calculateDistanceKm(userLat, userLng, v.lat, v.lng)
      };
    }
    return v;
  });
}
