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
  // ==========================================
  // --- WARSAW, POLAND (WARSZAWA) ---
  // ==========================================
  {
    id: 'venue-pl-waw-heaven',
    name: 'Sauna Heaven Warszawa',
    category: 'sauna',
    lat: 52.2289,
    lng: 21.0135,
    address: 'ul. Nowogrodzka 12, 00-511 Warszawa',
    neighborhood: 'Śródmieście Południowe',
    description: 'Największa gejowska sauna i strefa relaksu w Warszawie: łaźnia parowa, sauna fińska, jacuzzi, labirynt cruisingowy, prywatne kabiny i bar.',
    distanceKm: 0,
    tags: ['Sauna gejowska', 'Cruising & Darkroom', 'Jacuzzi', 'Łaźnia parowa', 'Kabiny', 'Bar'],
    imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&q=80',
    isVerified: true,
    isCruising: true,
    openingHours: 'Codziennie 14:00 - 06:00'
  },
  {
    id: 'venue-pl-waw-galla',
    name: 'Sauna Galla',
    category: 'sauna',
    lat: 52.2268,
    lng: 21.0118,
    address: 'ul. Marszałkowska 85, 00-683 Warszawa',
    neighborhood: 'Śródmieście',
    description: 'Dyskretna i popularna sauna dla mężczyzn w centrum Warszawy. Wyposażona w strefę spa, ciemnię, wideo-lounge oraz kabiny relaksacyjne.',
    distanceKm: 0,
    tags: ['Sauna & Spa', 'Cruising', 'Kabiny relaksu', 'Wideo Lounge', 'Centrum'],
    imageUrl: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=600&q=80',
    isVerified: true,
    isCruising: true,
    openingHours: 'Pon - Nd 12:00 - 05:00'
  },
  {
    id: 'venue-pl-waw-glam',
    name: 'Glam Club & Darkroom',
    category: 'club',
    lat: 52.2282,
    lng: 21.0179,
    address: 'ul. Żurawia 22, 00-515 Warszawa',
    neighborhood: 'Śródmieście',
    description: 'Najbardziej kultowy klub gejowski w Warszawie. Dwa parkiety taneczne, pokazy drag queen, strefa darkroom dla facetów oraz wspaniała atmosfera.',
    distanceKm: 0,
    tags: ['Klub nocny', 'Darkroom', 'Drag Queen Shows', 'Muzyka Pop/House', 'Weekend Party'],
    imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&q=80',
    isVerified: true,
    isCruising: true,
    openingHours: 'Czw - Sob 22:00 - 06:00'
  },
  {
    id: 'venue-pl-waw-galeria',
    name: 'Klub Galeria & Cruising',
    category: 'club',
    lat: 52.2384,
    lng: 20.9995,
    address: 'Plac Mirowski 1, 00-138 Warszawa',
    neighborhood: 'Wola / Mirów',
    description: 'Legendarny klub nocny z bogatą historią, energetycznym parkietem, tematycznymi nocami oraz przestronną strefą cruisingową / darkroom.',
    distanceKm: 0,
    tags: ['Klub gejowski', 'Cruising Zone', 'Darkroom', 'Tematyczne imprezy'],
    imageUrl: 'https://images.unsplash.com/photo-1545128485-c400e7702796?w=600&q=80',
    isVerified: true,
    isCruising: true,
    openingHours: 'Pt - Nd 22:00 - 07:00'
  },
  {
    id: 'venue-pl-waw-lapose',
    name: 'La Pose Warsaw',
    category: 'bar',
    lat: 52.2356,
    lng: 21.0142,
    address: 'ul. Mazowiecka 12, 00-048 Warszawa',
    neighborhood: 'Śródmieście Północne',
    description: 'Elegancka, inkluzywna przestrzeń queerowa w sercu Warszawy. Koktajlbar, występy artystyczne, burleska, drag i bezpieczna przystań dla społeczności.',
    distanceKm: 0,
    tags: ['LGBTQ+ Bar', 'Cocktails', 'Drag & Burlesque', 'Safe Space', 'Community'],
    imageUrl: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&q=80',
    isVerified: true,
    isCruising: false,
    openingHours: 'Śr - Nd 18:00 - 03:00'
  },
  {
    id: 'venue-pl-waw-mokotow-cruising',
    name: 'Pola Mokotowskie - Strefa Cruisingu',
    category: 'cruising',
    lat: 52.2105,
    lng: 20.9972,
    address: 'Park Pola Mokotowskie, 02-588 Warszawa',
    neighborhood: 'Mokotów / Ochota',
    description: 'Znana plenerowa strefa spotkań i cruisingu w zadrzewionej, ustronnej części Parku Pola Mokotowskie, szczególnie aktywna w ciepłe wieczory i noce.',
    distanceKm: 0,
    tags: ['Plenerowy Cruising', 'Park', 'Dyskretne alejki', 'Spotkania nocne', 'Outdoor'],
    imageUrl: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=600&q=80',
    isVerified: true,
    isCruising: true,
    openingHours: '24/7 (głównie zmierzch i noc)'
  },
  {
    id: 'venue-pl-waw-kph',
    name: 'Kampania Przeciw Homofobii (KPH)',
    category: 'community',
    lat: 52.2285,
    lng: 21.0001,
    address: 'Al. Jerozolimskie 99, 02-001 Warszawa',
    neighborhood: 'Ochota / Śródmieście',
    description: 'Czołowa ogólnopolska organizacja działająca na rzecz osób LGBTQ+. Centrum wsparcia prawnego, psychologicznego i edukacji obywatelskiej.',
    distanceKm: 0,
    tags: ['Safe Space', 'Wsparcie prawne', 'Pomoc psychologiczna', 'Edukacja'],
    imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&q=80',
    isVerified: true,
    isCruising: false,
    openingHours: 'Pon - Pt 09:00 - 17:00'
  },
  {
    id: 'venue-pl-waw-lambdawarszawa',
    name: 'Lambda Warszawa - Centrum Społeczności',
    category: 'community',
    lat: 52.2255,
    lng: 21.0163,
    address: 'ul. Żurawia 24a, 00-515 Warszawa',
    neighborhood: 'Śródmieście',
    description: 'Najstarsza polska organizacja LGBTQ+ oferująca bezpieczną przestrzeń, telefon zaufania, warsztaty oraz testy w kierunku HIV i STI.',
    distanceKm: 0,
    tags: ['Wsparcie LGBTQ+', 'Testy HIV/STI', 'Safe Space', 'Telefon Zaufania'],
    imageUrl: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=600&q=80',
    isVerified: true,
    isCruising: false,
    openingHours: 'Pon - Pt 12:00 - 20:00'
  },

  // ==========================================
  // --- KRAKÓW, POLAND ---
  // ==========================================
  {
    id: 'venue-pl-krk-saunablue',
    name: 'Sauna Blue Kraków',
    category: 'sauna',
    lat: 50.0543,
    lng: 19.9438,
    address: 'ul. Dietla 45, 31-062 Kraków',
    neighborhood: 'Kazimierz / Stare Miasto',
    description: 'Nowoczesna sauna gejowska w pobliżu krakowskiego Kazimierza. Sauna sucha, parowa, strefa darkroom, labirynt, kabiny prywatne i bar.',
    distanceKm: 0,
    tags: ['Sauna gejowska', 'Cruising & Darkroom', 'Kazimierz', 'Jacuzzi', 'Pokoje relaksu'],
    imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&q=80',
    isVerified: true,
    isCruising: true,
    openingHours: 'Codziennie 14:00 - 04:00'
  },
  {
    id: 'venue-pl-krk-lindo',
    name: 'Lindo Bar & Cruising',
    category: 'bar',
    lat: 50.0638,
    lng: 19.9365,
    address: 'ul. Sławkowska 23, 31-014 Kraków',
    neighborhood: 'Stare Miasto',
    description: 'Intymny klubo-bar gejowski z darkroomem i kabinami w piwnicach krakowskiego Starego Miasta. Dobre drinki, luźna atmosfera i cruising.',
    distanceKm: 0,
    tags: ['Cruising Bar', 'Darkroom', 'Stare Miasto', 'Drinki', 'Piwnice'],
    imageUrl: 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=600&q=80',
    isVerified: true,
    isCruising: true,
    openingHours: 'Codziennie 17:00 - 03:00'
  },
  {
    id: 'venue-pl-krk-cocon',
    name: 'Cocon Music Club',
    category: 'club',
    lat: 50.0489,
    lng: 19.9482,
    address: 'ul. Gazowa 21, 31-060 Kraków',
    neighborhood: 'Kazimierz',
    description: 'Główny klub LGBTQ+ w Krakowie z dużym parkietem, letnim ogródkiem i cotygodniowymi imprezami tematycznymi.',
    distanceKm: 0,
    tags: ['Klub LGBTQ+', 'Kazimierz', 'Taniec', 'DJs', 'Ogródek'],
    imageUrl: 'https://images.unsplash.com/photo-1545128485-c400e7702796?w=600&q=80',
    isVerified: true,
    isCruising: false,
    openingHours: 'Pt - Sob 22:00 - 06:00'
  },

  // ==========================================
  // --- WROCŁAW, POLAND ---
  // ==========================================
  {
    id: 'venue-pl-wro-saunared',
    name: 'Sauna Red Wrocław',
    category: 'sauna',
    lat: 51.1012,
    lng: 17.0354,
    address: 'ul. Kołłątaja 31, 50-004 Wrocław',
    neighborhood: 'Stare Miasto / Dworzec Główny',
    description: 'Klimatyczna sauna dla mężczyzn w centrum Wrocławia. Oferuje saunę suchą, łaźnię parową, cruisingowy labirynt, wideo lounge i bar.',
    distanceKm: 0,
    tags: ['Sauna dla gejów', 'Cruising', 'Łaźnia parowa', 'Darkroom', 'Centrum Wrocławia'],
    imageUrl: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=600&q=80',
    isVerified: true,
    isCruising: true,
    openingHours: 'Codziennie 13:00 - 04:00'
  },
  {
    id: 'venue-pl-wro-hah',
    name: 'HAH Club Wrocław',
    category: 'club',
    lat: 51.1075,
    lng: 17.0392,
    address: 'ul. Piotra Skargi 18, 50-082 Wrocław',
    neighborhood: 'Stare Miasto',
    description: 'Wielosalowy klub LGBT+ we Wrocławiu z kilkoma parkietami muzycznymi, strefą chillout i regularnymi imprezami tematycznymi.',
    distanceKm: 0,
    tags: ['Klub LGBT+', 'Wiele sal', 'Drag Queens', 'Weekend Party'],
    imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&q=80',
    isVerified: true,
    isCruising: false,
    openingHours: 'Pt - Sob 22:00 - 06:00'
  },

  // ==========================================
  // --- POZNAŃ, POLAND ---
  // ==========================================
  {
    id: 'venue-pl-poznan-lokomotywa',
    name: 'Klub Lokomotywa & Cruising',
    category: 'cruising',
    lat: 52.4012,
    lng: 16.9295,
    address: 'ul. Półwiejska, 61-888 Poznań',
    neighborhood: 'Centrum / Wilda',
    description: 'Niezależny klub cruisingowy i darkroom dla mężczyzn. Dyskretna przestrzeń z labiryntem, kabinami, slingami i barową strefą relaksu.',
    distanceKm: 0,
    tags: ['Cruising Club', 'Darkroom', 'Fetish Friendly', 'Kabiny', 'Poznań'],
    imageUrl: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&q=80',
    isVerified: true,
    isCruising: true,
    openingHours: 'Śr - Nd 20:00 - 04:00'
  },
  {
    id: 'venue-pl-poznan-hah',
    name: 'HAH Poznań',
    category: 'club',
    lat: 52.4128,
    lng: 16.9387,
    address: 'ul. Małe Garbary 9, 61-756 Poznań',
    neighborhood: 'Stare Miasto',
    description: 'Największy i najbardziej znany klub LGBTQ+ w Wielkopolsce. Trzy sale muzyczne, występy drag i energetyczna publiczność.',
    distanceKm: 0,
    tags: ['Klub LGBTQ+', 'Stare Miasto', 'Wiele parkietów', 'Imprezy weekendowe'],
    imageUrl: 'https://images.unsplash.com/photo-1545128485-c400e7702796?w=600&q=80',
    isVerified: true,
    isCruising: false,
    openingHours: 'Pt - Sob 22:00 - 06:00'
  },

  // ==========================================
  // --- GDAŃSK / TRÓJMIASTO, POLAND ---
  // ==========================================
  {
    id: 'venue-pl-gda-spartakus',
    name: 'Sauna Spartakus Trójmiasto',
    category: 'sauna',
    lat: 54.3542,
    lng: 18.6475,
    address: 'ul. Podwale Grodzkie, 80-895 Gdańsk',
    neighborhood: 'Gdańsk Główny',
    description: 'Komfortowa męska sauna w pobliżu Dworca Głównego w Gdańsku: łaźnia sucha i parowa, strefa cruisingowa, wideo sala oraz prywatne boksy.',
    distanceKm: 0,
    tags: ['Sauna gejowska', 'Cruising', 'Trójmiasto', 'Pokoje relaksu', 'Strefa Spa'],
    imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&q=80',
    isVerified: true,
    isCruising: true,
    openingHours: 'Codziennie 14:00 - 03:00'
  },
  {
    id: 'venue-pl-gda-reagan-cruising',
    name: 'Park Reagana - Strefa Cruisingu Nadmorskiego',
    category: 'cruising',
    lat: 54.4125,
    lng: 18.6015,
    address: 'Park im. Ronalda Reagana, 80-369 Gdańsk',
    neighborhood: 'Przymorze / Brzeźno',
    description: 'Nadmorska plenerowa strefa cruisingowa w zalesionym pasie nad Bałtykiem, popularna o zmierzchu w sezonie letnim.',
    distanceKm: 0,
    tags: ['Plenerowy Cruising', 'Pas nadmorski', 'Park', 'Dyskrecja'],
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80',
    isVerified: true,
    isCruising: true,
    openingHours: '24/7 (głównie wieczory)'
  },

  // ==========================================
  // --- ZURICH, SWITZERLAND (ZURYCH) ---
  // ==========================================
  {
    id: 'venue-ch-zrh-heaven',
    name: 'Heaven Club Zurich',
    category: 'club',
    lat: 47.3734,
    lng: 8.5447,
    address: 'Spitalgasse 5, 8001 Zürich, Szwajcaria',
    neighborhood: 'Niederdorf (Altstadt)',
    city: 'Zurych',
    description: 'Flagowy i najbardziej znany klub gejowski w Zurychu. Topowi DJe, muzyka pop i house, widowiska drag queens oraz specjalne imprezy z ciemnią/cruisingiem.',
    distanceKm: 0,
    tags: ['Klub gejowski', 'Niederdorf', 'Drag Shows', 'Darkroom imprezy', 'Pop & House', 'Zurych'],
    imageUrl: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=600&q=80',
    isVerified: true,
    isCruising: true,
    openingHours: 'Czw - Sob 23:00 - 05:00'
  },
  {
    id: 'venue-ch-zrh-muehlegasse',
    name: 'Sauna Mühlegasse',
    category: 'sauna',
    lat: 47.3756,
    lng: 8.5442,
    address: 'Mühlegasse 11, 8001 Zürich, Szwajcaria',
    neighborhood: 'Niederdorf',
    city: 'Zurych',
    description: 'Klasyczna, renomowana sauna dla mężczyzn w centrum Zurychu. Posiada saunę fińską, łaźnię parową, labirynt cruisingowy, prywatne kabiny, wideo lounge i bar.',
    distanceKm: 0,
    tags: ['Sauna gejowska', 'Cruising & Labirynt', 'Prywatne kabiny', 'Łaźnia parowa', 'Niederdorf'],
    imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&q=80',
    isVerified: true,
    isCruising: true,
    openingHours: 'Codziennie 13:00 - 06:00'
  },
  {
    id: 'venue-ch-zrh-apollo-sauna',
    name: 'Sauna Apollo (Männer-Sauna)',
    category: 'sauna',
    lat: 47.3751,
    lng: 8.5284,
    address: 'Bäckerstrasse 43, 8004 Zürich, Szwajcaria',
    neighborhood: 'Aussersihl (Kreis 4)',
    city: 'Zurych',
    description: 'Popularna sauna i wellness dla gejów i biseksualnych mężczyzn w tętniącej życiem dzielnicy Kreis 4. Łaźnia parowa, sauna sucha, darkroom, jacuzzi i chillout lounge.',
    distanceKm: 0,
    tags: ['Sauna gejowska', 'Spa & Wellness', 'Cruising & Ciemnia', 'Kreis 4', 'Jacuzzi'],
    imageUrl: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=600&q=80',
    isVerified: true,
    isCruising: true,
    openingHours: 'Pon - Nd 12:00 - 04:00'
  },
  {
    id: 'venue-ch-zrh-cranberry',
    name: 'Cranberry Bar',
    category: 'bar',
    lat: 47.3722,
    lng: 8.5435,
    address: 'Metzgergasse 3, 8001 Zürich, Szwajcaria',
    neighborhood: 'Altstadt / Niederdorf',
    city: 'Zurych',
    description: 'Kultowy, elegancki gejowski bar koktajlowy na starym mieście w Zurychu. Dwa poziomy, znakomite drinki, przyjazna atmosfera i doskonały punkt spotkań przed wyjściem do klubów.',
    distanceKm: 0,
    tags: ['Bar koktajlowy', 'Gejowski klasyk', 'Altstadt', 'Niederdorf', 'Drinki'],
    imageUrl: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&q=80',
    isVerified: true,
    isCruising: false,
    openingHours: 'Codziennie 17:00 - 02:00'
  },
  {
    id: 'venue-ch-zrh-kafi-apollo',
    name: 'Kafi Apollo & Bar',
    category: 'bar',
    lat: 47.3752,
    lng: 8.5285,
    address: 'Bäckerstrasse 43, 8004 Zürich, Szwajcaria',
    neighborhood: 'Kreis 4',
    city: 'Zurych',
    description: 'Modny i przyjazny bar oraz kawiarnia społeczności queer w dzielnicy Kreis 4. Przyjemny ogródek na zewnątrz, pyszne koktajle i wspaniała atmosfera.',
    distanceKm: 0,
    tags: ['Bar gejowski', 'Kawiarnia', 'Kreis 4', 'Ogródek', 'Zurych'],
    imageUrl: 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=600&q=80',
    isVerified: true,
    isCruising: false,
    openingHours: 'Wt - Nd 16:00 - 01:00'
  },
  {
    id: 'venue-ch-zrh-allmend-cruising',
    name: 'Allmend Brunau Cruising Spot',
    category: 'cruising',
    lat: 47.3512,
    lng: 8.5198,
    address: 'Allmend Brunau, 8045 Zürich, Szwajcaria',
    neighborhood: 'Brunau / Wollishofen',
    city: 'Zurych',
    description: 'Dobrze znana i bezpieczna strefa cruisingu plenerowego wzdłuż brzegu rzeki Sihl i leśnych ścieżek parku Allmend. Największy ruch późnym popołudniem i wieczorami.',
    distanceKm: 0,
    tags: ['Cruising plenerowy', 'Rzeka Sihl', 'Park Allmend', 'Dyskrecja', 'Natura'],
    imageUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&q=80',
    isVerified: true,
    isCruising: true,
    openingHours: '24/7 (głównie zmierzch i noc)'
  },
  {
    id: 'venue-ch-zrh-kweer',
    name: 'Kweer Club & Bar',
    category: 'club',
    lat: 47.3776,
    lng: 8.5273,
    address: 'Kanzleistrasse 56, 8004 Zürich, Szwajcaria',
    neighborhood: 'Helvetiaplatz / Kreis 4',
    city: 'Zurych',
    description: 'Dynamiczny klub i przestrzeń kulturalna queer przy Helvetiaplatz. Regularne imprezy klubowe, sety DJ-skie z muzyką electro i pop, drag show i wystawy.',
    distanceKm: 0,
    tags: ['Klub queer', 'Helvetiaplatz', 'Electro & Pop', 'Drag Shows', 'Kreis 4'],
    imageUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&q=80',
    isVerified: true,
    isCruising: false,
    openingHours: 'Czw - Sob 22:00 - 04:30'
  },
  {
    id: 'venue-ch-zrh-loverbar',
    name: 'Loverbar Queer Space',
    category: 'bar',
    lat: 47.3778,
    lng: 8.5292,
    address: 'Zwinglistrasse 40, 8004 Zürich, Szwajcaria',
    neighborhood: 'Langstrasse / Kreis 4',
    city: 'Zurych',
    description: 'Niezależna, spółdzielcza przestrzeń barowa i kawiarnia queer w sercu Langstrasse. Spotkania społeczności, wyśmienite lokalne drinki, występy i wieczory autorskie.',
    distanceKm: 0,
    tags: ['Przestrzeń queer', 'Langstrasse', 'Wydarzenia', 'Drinki', 'Społeczność'],
    imageUrl: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=600&q=80',
    isVerified: true,
    isCruising: false,
    openingHours: 'Śr - Nd 18:00 - 02:00'
  },
  {
    id: 'venue-ch-zrh-barfussbar',
    name: 'Barfussbar (Frauenbad Stadthausquai)',
    category: 'bar',
    lat: 47.3687,
    lng: 8.5422,
    address: 'Stadthausquai 12, 8001 Zürich, Szwajcaria',
    neighborhood: 'Limmat / Bürkliplatz',
    city: 'Zurych',
    description: 'Zabytkowa łaźnia rzeczna na rzece Limmat z zapierającym dech widokiem na Grossmünster. W ciepłe miesiące wieczorami zmienia się w kultowy open-air bar z queerowymi imprezami.',
    distanceKm: 0,
    tags: ['Bar nad rzeką', 'Plener', 'Rzeka Limmat', 'Imprezy letnie', 'Zurych'],
    imageUrl: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&q=80',
    isVerified: true,
    isCruising: false,
    openingHours: 'Maj - Wrzesień: Śr - Nd 20:00 - 24:00'
  },
  {
    id: 'venue-ch-zrh-sauna-st-peter',
    name: 'Sauna St. Peter',
    category: 'sauna',
    lat: 47.3711,
    lng: 8.5401,
    address: 'St. Peter-Strasse 1, 8001 Zürich, Szwajcaria',
    neighborhood: 'Altstadt',
    city: 'Zurych',
    description: 'Dyskretna sauna dla panów w samym centrum starego Zurychu. Posiada łaźnię parową, saunę suchą, kabiny relaksu i strefę cruisingową.',
    distanceKm: 0,
    tags: ['Sauna dla mężczyzn', 'Cruising & Kabiny', 'Centrum', 'Łaźnia parowa'],
    imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&q=80',
    isVerified: true,
    isCruising: true,
    openingHours: 'Pon - Nd 12:00 - 23:00'
  },

  // ==========================================
  // --- BERLIN, GERMANY ---
  // ==========================================
  {
    id: 'venue-berlin-boiler',
    name: 'Der Boiler Berlin (Sauna & Cruising)',
    category: 'sauna',
    lat: 52.4892,
    lng: 13.3887,
    address: 'Mehringdamm 34, 10961 Berlin',
    neighborhood: 'Kreuzberg',
    description: 'Jedna z największych i najnowocześniejszych saun gejowskich w Europie. Olbrzymia sauna fińska, łaźnia parowa, basen, jacuzzi, darkroom i labirynt cruisingowy.',
    distanceKm: 0,
    tags: ['Największa sauna gejowska', 'Cruising Labirynt', 'Basen & Spa', 'Kreuzberg', 'Darkroom'],
    imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&q=80',
    isVerified: true,
    isCruising: true,
    openingHours: 'Otwarte codziennie od 12:00 do rana'
  },
  {
    id: 'venue-berlin-laboratory',
    name: 'Lab.oratory (Berghain Basement)',
    category: 'cruising',
    lat: 52.5112,
    lng: 13.4428,
    address: 'Am Wriezener Bahnhof, 10243 Berlin',
    neighborhood: 'Friedrichshain',
    description: 'Światowej sławy klub fetyszowo-cruisingowy w podziemiach legendarnego Berghain. Noce tematyczne, rygorystyczny dress-code, labirynty i darkroomy.',
    distanceKm: 0,
    tags: ['Legendarny Cruising', 'Berghain Basement', 'Fetish & Leather', 'Darkroom', 'Men Only'],
    imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&q=80',
    isVerified: true,
    isCruising: true,
    openingHours: 'Wybrane dni (zależnie od imprezy)'
  },
  {
    id: 'venue-berlin-mutschmanns',
    name: 'Mutschmanns Berlin',
    category: 'cruising',
    lat: 52.4988,
    lng: 13.3512,
    address: 'Nollendorfstraße 28, 10777 Berlin',
    neighborhood: 'Schöneberg',
    description: 'Kultowy bar cruisingowy z darkroomem i kabinami w sercu gejowskiego Schönebergu. Bardzo popularny wśród miłośników skóry, gumy i bezpośredniego kontaktu.',
    distanceKm: 0,
    tags: ['Cruising Bar', 'Darkroom', 'Schöneberg Gay Village', 'Fetish Friendly'],
    imageUrl: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&q=80',
    isVerified: true,
    isCruising: true,
    openingHours: 'Codziennie od 20:00 do późna'
  },
  {
    id: 'venue-berlin-ficken3000',
    name: 'Ficken 3000',
    category: 'cruising',
    lat: 52.4938,
    lng: 13.4215,
    address: 'Urbanstraße 70, 10967 Berlin',
    neighborhood: 'Neukölln / Kreuzberg',
    description: 'Alternatywny, undergroundowy bar z piwnicznym darkroomem, muzyką electro i swobodną berlińską atmosferą.',
    distanceKm: 0,
    tags: ['Underground Bar', 'Darkroom Piwnica', 'DJs', 'Cruising'],
    imageUrl: 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=600&q=80',
    isVerified: true,
    isCruising: true,
    openingHours: 'Codziennie 22:00 - 06:00'
  },
  {
    id: 'venue-berlin-tiergarten',
    name: 'Großer Tiergarten - Historyczny Park Cruisingowy',
    category: 'cruising',
    lat: 52.5145,
    lng: 13.3595,
    address: 'Straße des 17. Juni, 10557 Berlin',
    neighborhood: 'Tiergarten',
    description: 'Najsłynniejszy historyczny park cruisingowy w Europie, usytuowany w rozległym sercu Berlina, z wydeptanymi alejkami i wieloletnią tradycją.',
    distanceKm: 0,
    tags: ['Historyczny Cruising', 'Plener', 'Park Tiergarten', 'Outdoor Cruising'],
    imageUrl: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=600&q=80',
    isVerified: true,
    isCruising: true,
    openingHours: '24/7'
  },
  {
    id: 'venue-berlin-schwuz',
    name: 'SchwuZ Club Berlin',
    category: 'club',
    lat: 52.4789,
    lng: 13.4398,
    address: 'Rollbergstraße 26, 12053 Berlin',
    neighborhood: 'Neukölln',
    description: 'Najstarszy klub queerowy w Niemczech (od 1977), z trzema wielkimi salami tanecznymi i zaangażowaniem w kulturę równościową.',
    distanceKm: 0,
    tags: ['Legendarny Klub', 'Wiele sal', 'Solidarność Queer', 'Neukölln'],
    imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&q=80',
    isVerified: true,
    isCruising: false,
    openingHours: 'Czw - Sob 23:00 - 08:00'
  },

  // ==========================================
  // --- LONDON, UK ---
  // ==========================================
  {
    id: 'venue-london-pleasuredrome',
    name: 'Pleasuredrome Sauna London',
    category: 'sauna',
    lat: 51.5015,
    lng: -0.1142,
    address: '124 Cornwall Rd, London SE1 8XE',
    neighborhood: 'Waterloo',
    description: 'Najsłynniejsza sauna gejowska w Londynie otwarta 24/7/365. Łaźnie parowe, dwie sauny, basen spa, ciemnie, labirynt cruisingowy i bar.',
    distanceKm: 0,
    tags: ['Otwarte 24/7', 'Sauna & Spa', 'Cruising Maze', 'Darkroom', 'Waterloo'],
    imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&q=80',
    isVerified: true,
    isCruising: true,
    openingHours: 'Czynne 24 godziny na dobę'
  },
  {
    id: 'venue-london-sweatbox',
    name: 'Sweatbox Soho Sauna',
    category: 'sauna',
    lat: 51.5148,
    lng: -0.1388,
    address: '1-2 Ramillies St, London W1F 7LN',
    neighborhood: 'Soho',
    description: 'Nowoczesna sauna, siłownia i strefa cruisingowa w ścisłym centrum londyńskiego Soho, tuż obok Oxford Circus. Działa non-stop.',
    distanceKm: 0,
    tags: ['Soho', '24/7 Sauna & Gym', 'Cruising Zone', 'Oxford Circus'],
    imageUrl: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=600&q=80',
    isVerified: true,
    isCruising: true,
    openingHours: 'Otwarte 24/7'
  },
  {
    id: 'venue-london-vault',
    name: 'The Vault London',
    category: 'cruising',
    lat: 51.5235,
    lng: -0.1385,
    address: '139-143 Whitfield St, London W1T 5EN',
    neighborhood: 'Fitzrovia / West End',
    description: 'Podziemny klub cruisingowy z labiryntami, kabinami, klatkami i darkroomami. Bardzo popularny punkt spotkań w centrum Londynu.',
    distanceKm: 0,
    tags: ['Cruising Club', 'Darkroom', 'Fitzrovia', 'Fetish Nights', 'Underground'],
    imageUrl: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&q=80',
    isVerified: true,
    isCruising: true,
    openingHours: 'Codziennie 13:00 - 01:00'
  },
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
    isVerified: true,
    isCruising: false,
    openingHours: 'Pt - Sob 22:00 - 05:00'
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
    isVerified: true,
    isCruising: false,
    openingHours: 'Codziennie od 17:00'
  },

  // ==========================================
  // --- AMSTERDAM, NETHERLANDS ---
  // ==========================================
  {
    id: 'venue-ams-nieuwezijds',
    name: 'Sauna Nieuwezijds Amsterdam',
    category: 'sauna',
    lat: 52.3752,
    lng: 4.8932,
    address: 'Nieuwezijds Armsteeg 95, 1012 NB Amsterdam',
    neighborhood: 'Centrum Amsterdam',
    description: 'Kompleks saunowo-cruisingowy w centrum Amsterdamu z basenem, łaźnią parową, jacuzzi, darkroomem i kabinami.',
    distanceKm: 0,
    tags: ['Sauna gejowska', 'Cruising & Spa', 'Basen', 'Amsterdam Centrum'],
    imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&q=80',
    isVerified: true,
    isCruising: true,
    openingHours: 'Codziennie 12:00 - 23:00 (weekend do 02:00)'
  },
  {
    id: 'venue-ams-church',
    name: 'Club Church Amsterdam',
    category: 'cruising',
    lat: 52.3645,
    lng: 4.8835,
    address: 'Kerkstraat 52, 1017 GM Amsterdam',
    neighborhood: 'Leidseplein / Reguliersdwarsstraat',
    description: 'Kultowy klub cruisingowy z tematycznymi imprezami fetish, labiryntem, darkroomem i międzynarodową publicznością.',
    distanceKm: 0,
    tags: ['Cruising Club', 'Fetish Theme Nights', 'Darkroom', 'Amsterdam'],
    imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&q=80',
    isVerified: true,
    isCruising: true,
    openingHours: 'Śr - Nd od 22:00'
  },

  // ==========================================
  // --- PARIS, FRANCE ---
  // ==========================================
  {
    id: 'venue-paris-idm',
    name: 'IDM Sauna Paris',
    category: 'sauna',
    lat: 48.8725,
    lng: 2.3421,
    address: '4 Rue du Faubourg Montmartre, 75009 Paris',
    neighborhood: 'Grands Boulevards',
    description: 'Czterokondygnacyjna prestiżowa sauna i przestrzeń cruisingowa w Paryżu: basen, sauny, ciemnie, labirynty i strefy odpoczynku.',
    distanceKm: 0,
    tags: ['4-piętrowa sauna', 'Cruising Labirynt', 'Basen', 'Darkroom', 'Paris'],
    imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&q=80',
    isVerified: true,
    isCruising: true,
    openingHours: 'Codziennie 12:00 - 06:00'
  },
  {
    id: 'venue-paris-depot',
    name: 'Le Dépôt Paris (Cruising Club)',
    category: 'cruising',
    lat: 48.8625,
    lng: 2.3538,
    address: '10 Rue du Grenier-Saint-Lazare, 75003 Paris',
    neighborhood: 'Le Marais',
    description: 'Jeden z największych klubów cruisingowych w Europie z gigantycznym labiryntem w historycznych piwnicach Le Marais.',
    distanceKm: 0,
    tags: ['Cruising Club', 'Wielki Darkroom', 'Le Marais', 'Kabiny', 'Slings'],
    imageUrl: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&q=80',
    isVerified: true,
    isCruising: true,
    openingHours: 'Codziennie 14:00 - 07:00'
  },
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
    isVerified: true,
    isCruising: false,
    openingHours: 'Codziennie 18:00 - 04:00'
  },

  // ==========================================
  // --- MADRID & BARCELONA, SPAIN ---
  // ==========================================
  {
    id: 'venue-madrid-paraiso',
    name: 'Sauna Paraíso Madrid',
    category: 'sauna',
    lat: 40.4248,
    lng: -3.7082,
    address: 'Calle del Norte, 15, 28015 Madrid',
    neighborhood: 'Malasaña / Noviciado',
    description: 'Jedna z najpopularniejszych saun w Madrycie z basenem, jacuzzi, labiryntem cruisingowym, prywatnymi kabinami i barem.',
    distanceKm: 0,
    tags: ['Sauna Madrid', 'Basen', 'Cruising Maze', 'Darkroom', 'Jacuzzi'],
    imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&q=80',
    isVerified: true,
    isCruising: true,
    openingHours: 'Otwarte 24h w weekendy'
  },
  {
    id: 'venue-madrid-boyberry',
    name: 'Boyberry Madrid (Cruising Bar)',
    category: 'cruising',
    lat: 40.4215,
    lng: -3.7018,
    address: 'Calle de Valverde, 3, 28004 Madrid',
    neighborhood: 'Chueca / Gran Vía',
    description: 'Znany bar cruisingowy z labiryntem, prywatnymi kabinami z ekranami, slingami i darkroomem w samym sercu Chueca.',
    distanceKm: 0,
    tags: ['Cruising Bar', 'Kabiny', 'Darkroom', 'Chueca', 'Madrid'],
    imageUrl: 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=600&q=80',
    isVerified: true,
    isCruising: true,
    openingHours: 'Codziennie 16:00 - 03:00'
  },
  {
    id: 'venue-bcn-condal',
    name: 'Sauna Condal Barcelona',
    category: 'sauna',
    lat: 41.3842,
    lng: 2.1665,
    address: 'Carrer de Valldonzella, 6, 08001 Barcelona',
    neighborhood: 'Raval / Universitat',
    description: 'Klimatyczna sauna gejowska w Barcelonie z łaźnią parową, cruisingowym labiryntem i strefą relaksu blisko centrum.',
    distanceKm: 0,
    tags: ['Sauna Barcelona', 'Cruising', 'Łaźnia parowa', 'Darkroom'],
    imageUrl: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=600&q=80',
    isVerified: true,
    isCruising: true,
    openingHours: 'Codziennie 14:00 - 05:00'
  }
];

// Alias for backwards compatibility
export const QUEER_VENUES = GLOBAL_QUEER_VENUES;

/**
 * Dynamically queries venues within a geographic radius of given coordinates.
 * If category or cruising filter is provided, filters accordingly.
 * If user is far from indexed locations and fallbackToAll is true, returns all venues sorted by distance.
 */
export function getVenuesNearLocation(
  lat: number,
  lng: number,
  maxRadiusKm = 45,
  options?: { category?: string; cruisingOnly?: boolean; fallbackToAll?: boolean }
): QueerVenue[] {
  if (isNaN(lat) || isNaN(lng)) {
    return GLOBAL_QUEER_VENUES.slice(0, 30);
  }

  let candidates = GLOBAL_QUEER_VENUES;

  if (options?.cruisingOnly) {
    candidates = candidates.filter(v => v.isCruising || v.category === 'cruising' || v.category === 'sauna');
  } else if (options?.category && options.category !== 'all') {
    candidates = candidates.filter(v => v.category === options.category);
  }

  const resultsWithDistance = candidates.map(v => ({
    ...v,
    distanceKm: calculateDistanceKm(lat, lng, v.lat, v.lng)
  })).sort((a, b) => a.distanceKm - b.distanceKm);

  // Return venues within maxRadiusKm if any exist, otherwise return closest venues so user sees places!
  const withinRadius = resultsWithDistance.filter(v => v.distanceKm <= maxRadiusKm);
  if (withinRadius.length > 0) {
    return withinRadius;
  }

  // If no venues within immediate radius, return closest venues (or all sorted)
  return resultsWithDistance.slice(0, 25);
}

/**
 * Searches venues globally by text query (city, neighborhood, name, or tags).
 */
export function searchVenues(
  query: string,
  userLat?: number,
  userLng?: number,
  options?: { category?: string; cruisingOnly?: boolean }
): QueerVenue[] {
  const cleanQ = query.toLowerCase().trim();
  let list = GLOBAL_QUEER_VENUES;

  if (options?.cruisingOnly) {
    list = list.filter(v => v.isCruising || v.category === 'cruising' || v.category === 'sauna');
  } else if (options?.category && options.category !== 'all') {
    list = list.filter(v => v.category === options.category);
  }

  if (cleanQ) {
    list = list.filter(v => {
      const isZurichAlias =
        (cleanQ === 'zurych' || cleanQ === 'zurich' || cleanQ === 'zrh') &&
        (v.city?.toLowerCase() === 'zurych' || v.address.toLowerCase().includes('zürich') || v.address.toLowerCase().includes('zurich'));

      return (
        isZurichAlias ||
        v.name.toLowerCase().includes(cleanQ) ||
        (v.city && v.city.toLowerCase().includes(cleanQ)) ||
        v.neighborhood.toLowerCase().includes(cleanQ) ||
        v.address.toLowerCase().includes(cleanQ) ||
        v.category.toLowerCase().includes(cleanQ) ||
        v.tags.some(t => t.toLowerCase().includes(cleanQ))
      );
    });
  }

  return list.map(v => {
    if (userLat !== undefined && userLng !== undefined && !isNaN(userLat) && !isNaN(userLng)) {
      return {
        ...v,
        distanceKm: calculateDistanceKm(userLat, userLng, v.lat, v.lng)
      };
    }
    return v;
  }).sort((a, b) => a.distanceKm - b.distanceKm);
}
