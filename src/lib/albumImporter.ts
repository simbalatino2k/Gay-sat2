import dns from 'dns';
import http from 'http';
import https from 'https';
import { URL } from 'url';
import { isForbiddenIp, isForbiddenHostname, validateMediaBuffer } from './mediaSecurity';
import { processAndSaveMedia } from './storage';

export interface AlbumImportCandidate {
  id: string;
  previewUrl: string;
  sourceUrl: string;
  width?: number;
  height?: number;
  caption?: string;
}

export interface AlbumInspectResult {
  success: boolean;
  provider: 'icloud' | 'google_photos' | 'unsupported';
  albumTitle?: string;
  photos: AlbumImportCandidate[];
  requiresAuth?: boolean;
  error?: string;
  suggestion?: string;
}

// Strict domain whitelists for SSRF protection
const ALLOWED_ALBUM_HOSTS = [
  'photos.app.goo.gl',
  'photos.google.com',
  'icloud.com',
  'www.icloud.com',
  'share.icloud.com'
];

const ALLOWED_ASSET_DOMAINS = [
  'googleusercontent.com',
  'lh3.googleusercontent.com',
  'lh4.googleusercontent.com',
  'lh5.googleusercontent.com',
  'lh6.googleusercontent.com',
  'apple.com',
  'cdn-apple.com',
  'icloud.com',
  'sharedstreams.icloud.com'
];

function isAllowedAssetHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return ALLOWED_ASSET_DOMAINS.some(allowed => host === allowed || host.endsWith('.' + allowed));
}

function isAllowedAlbumHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return ALLOWED_ALBUM_HOSTS.some(allowed => host === allowed || host.endsWith('.' + allowed));
}

/**
 * Validates a URL against strict SSRF constraints, resolving DNS to ensure non-private IPs.
 */
export async function validateSsrfUrl(targetUrl: string, assetOnly = false): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl.trim());
  } catch (err) {
    throw new Error('Nieprawidłowy format adresu URL.');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('Obsługiwane są wyłącznie bezpieczne połączenia HTTPS.');
  }

  if (isForbiddenHostname(parsed.hostname)) {
    throw new Error('Zabroniony adres hosta.');
  }

  if (assetOnly) {
    if (!isAllowedAssetHost(parsed.hostname)) {
      throw new Error(`Niedozwolona domena pliku: ${parsed.hostname}`);
    }
  } else {
    if (!isAllowedAlbumHost(parsed.hostname)) {
      throw new Error('Obsługiwane są wyłącznie udostępnione linki iCloud i Google Photos.');
    }
  }

  // Resolve DNS to verify all addresses are public
  const records = await dns.promises.lookup(parsed.hostname, { all: true });
  if (!records || records.length === 0) {
    throw new Error(`Nie można rozwiązać nazwy hosta: ${parsed.hostname}`);
  }

  for (const rec of records) {
    if (isForbiddenIp(rec.address)) {
      throw new Error('Host wskazuje na chroniony adres sieciowy lub metadane.');
    }
  }

  return parsed;
}

/**
 * Safe HTTPS GET with redirect validation and buffer size limits.
 */
export async function fetchSafeBuffer(
  targetUrl: string,
  maxBytes = 8 * 1024 * 1024,
  timeoutMs = 10000,
  maxRedirects = 5
): Promise<{ buffer: Buffer; contentType: string; finalUrl: string }> {
  let currentUrl = targetUrl;
  let redirects = 0;

  while (redirects <= maxRedirects) {
    const parsed = await validateSsrfUrl(currentUrl, true);

    const result = await new Promise<{
      buffer: Buffer;
      contentType: string;
      redirectUrl?: string;
      statusCode: number;
    }>((resolve, reject) => {
      const req = https.get(
        parsed.toString(),
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
          },
          timeout: timeoutMs
        },
        (res) => {
          const statusCode = res.statusCode || 0;

          if ([301, 302, 303, 307, 308].includes(statusCode) && res.headers.location) {
            res.resume();
            return resolve({
              buffer: Buffer.alloc(0),
              contentType: '',
              redirectUrl: new URL(res.headers.location, parsed.origin).toString(),
              statusCode
            });
          }

          if (statusCode < 200 || statusCode >= 300) {
            res.resume();
            return reject(new Error(`Serwer zwrócił błąd HTTP ${statusCode}`));
          }

          const chunks: Buffer[] = [];
          let totalBytes = 0;

          res.on('data', (chunk: Buffer) => {
            totalBytes += chunk.length;
            if (totalBytes > maxBytes) {
              req.destroy();
              return reject(new Error(`Plik przekracza dopuszczalny limit ${(maxBytes / (1024 * 1024)).toFixed(1)} MB`));
            }
            chunks.push(chunk);
          });

          res.on('end', () => {
            resolve({
              buffer: Buffer.concat(chunks),
              contentType: res.headers['content-type'] || 'application/octet-stream',
              statusCode
            });
          });
        }
      );

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Przekroczono limit czasu pobierania (timeout).'));
      });

      req.on('error', (err) => {
        reject(err);
      });
    });

    if (result.redirectUrl) {
      currentUrl = result.redirectUrl;
      redirects++;
      continue;
    }

    return {
      buffer: result.buffer,
      contentType: result.contentType,
      finalUrl: currentUrl
    };
  }

  throw new Error('Przekroczono maksymalną liczbę przekierowań.');
}

/**
 * Safe HTTPS POST or GET for fetching text/JSON metadata with SSRF protection.
 */
async function fetchSafeText(
  targetUrl: string,
  method: 'GET' | 'POST' = 'GET',
  postData?: string,
  headers: Record<string, string> = {},
  maxBytes = 2 * 1024 * 1024,
  timeoutMs = 8000
): Promise<{ text: string; statusCode: number; finalUrl: string; headers: http.IncomingHttpHeaders }> {
  let currentUrl = targetUrl;
  let redirects = 0;

  while (redirects <= 5) {
    const parsed = await validateSsrfUrl(currentUrl, false);

    const result = await new Promise<{
      text: string;
      statusCode: number;
      redirectUrl?: string;
      headers: http.IncomingHttpHeaders;
    }>((resolve, reject) => {
      const req = https.request(
        parsed.toString(),
        {
          method,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
            'Accept': 'text/html,application/json,application/xhtml+xml,*/*',
            ...headers
          },
          timeout: timeoutMs
        },
        (res) => {
          const statusCode = res.statusCode || 0;

          if ([301, 302, 303, 307, 308].includes(statusCode) && res.headers.location) {
            res.resume();
            return resolve({
              text: '',
              statusCode,
              redirectUrl: new URL(res.headers.location, parsed.origin).toString(),
              headers: res.headers
            });
          }

          const chunks: Buffer[] = [];
          let totalBytes = 0;

          res.on('data', (chunk: Buffer) => {
            totalBytes += chunk.length;
            if (totalBytes > maxBytes) {
              req.destroy();
              return reject(new Error('Odpowiedź serwera przekracza dopuszczalny limit rozmiaru.'));
            }
            chunks.push(chunk);
          });

          res.on('end', () => {
            resolve({
              text: Buffer.concat(chunks).toString('utf-8'),
              statusCode,
              headers: res.headers
            });
          });
        }
      );

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Przekroczono limit czasu oczekiwania na odpowiedź serwera.'));
      });

      req.on('error', (err) => {
        reject(err);
      });

      if (postData) {
        req.write(postData);
      }
      req.end();
    });

    if (result.redirectUrl) {
      currentUrl = result.redirectUrl;
      redirects++;
      continue;
    }

    return {
      text: result.text,
      statusCode: result.statusCode,
      finalUrl: currentUrl,
      headers: result.headers
    };
  }

  throw new Error('Zbyt wiele przekierowań.');
}

/**
 * Inspect an iCloud Shared Album or iCloud Photos Link.
 */
async function inspectICloud(rawUrl: string): Promise<AlbumInspectResult> {
  const parsed = new URL(rawUrl);

  // 1. Format: https://www.icloud.com/sharedalbum/#B0XXXXX
  let token = '';
  if (parsed.hash && parsed.hash.startsWith('#')) {
    token = parsed.hash.substring(1);
  } else if (parsed.pathname.includes('/photos/')) {
    const parts = parsed.pathname.split('/photos/');
    token = parts[1]?.replace(/\/$/, '') || '';
  }

  // If this is a direct share.icloud.com link, fetch the landing page
  if (parsed.hostname === 'share.icloud.com') {
    try {
      const page = await fetchSafeText(rawUrl);
      if (page.finalUrl.includes('idmsa.apple.com') || page.text.includes('Zaloguj się') || page.text.includes('Sign In')) {
        return {
          success: false,
          provider: 'icloud',
          photos: [],
          requiresAuth: true,
          error: 'Ten link iCloud Photos wygasł (linki iCloud wygasają po 30 dniach) lub wymaga zalogowania do konta Apple ID.',
          suggestion: 'Pobierz zdjęcia na urządzenie i skorzystaj z opcji „Prześlij z urządzenia” lub utwórz publiczny udostępniony album iCloud.'
        };
      }

      // Try to extract preview image and title
      const ogImage = page.text.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
      const ogTitle = page.text.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);

      if (ogImage && ogImage[1]) {
        return {
          success: true,
          provider: 'icloud',
          albumTitle: ogTitle?.[1] || 'Udostępnione zdjęcie iCloud',
          photos: [
            {
              id: `icloud-img-1`,
              previewUrl: ogImage[1],
              sourceUrl: ogImage[1]
            }
          ]
        };
      }
    } catch (err: any) {
      // Fall through to sharedstreams
    }
  }

  if (!token) {
    return {
      success: false,
      provider: 'icloud',
      photos: [],
      error: 'Nie znaleziono tokenu albumu w podanym linku iCloud.',
      suggestion: 'Upewnij się, że link ma postać https://www.icloud.com/sharedalbum/#<token> i posiada włączoną opcję „Witryna publiczna”.'
    };
  }

  // 2. Query Apple Shared Streams API
  let partitionHost = 'p01-sharedstreams.icloud.com';
  const webstreamUrl = `https://${partitionHost}/${token}/sharedstreams/webstream`;

  try {
    let streamRes = await fetchSafeText(
      webstreamUrl,
      'POST',
      JSON.stringify({ streamCtag: null }),
      { 'Content-Type': 'application/json' }
    );

    // If redirected to specific partition via 330 or X-Apple-MMe-Host
    if (streamRes.statusCode === 330 && streamRes.headers['x-apple-mme-host']) {
      partitionHost = String(streamRes.headers['x-apple-mme-host']);
      streamRes = await fetchSafeText(
        `https://${partitionHost}/${token}/sharedstreams/webstream`,
        'POST',
        JSON.stringify({ streamCtag: null }),
        { 'Content-Type': 'application/json' }
      );
    }

    if (streamRes.statusCode === 404 || streamRes.statusCode === 401 || streamRes.statusCode === 403) {
      return {
        success: false,
        provider: 'icloud',
        photos: [],
        requiresAuth: true,
        error: 'Album iCloud nie jest publiczny lub został usunięty.',
        suggestion: 'W aplikacji Zdjęcia (Photos) na iPhone/Mac przejdź do albumu, dotknij ikony osób i włącz opcję „Witryna publiczna”. Następnie skopiuj wygenerowany link.'
      };
    }

    const streamData = JSON.parse(streamRes.text);
    const rawPhotos: any[] = streamData.photos || [];

    if (rawPhotos.length === 0) {
      return {
        success: true,
        provider: 'icloud',
        albumTitle: streamData.streamName || 'Album iCloud',
        photos: [],
        error: 'Album iCloud jest pusty.'
      };
    }

    // Limit candidate photos to 30
    const photoGuids = rawPhotos.slice(0, 30).map(p => p.photoGuid);

    // Request web asset URLs from Apple
    const assetUrlsRes = await fetchSafeText(
      `https://${partitionHost}/${token}/sharedstreams/webasseturls`,
      'POST',
      JSON.stringify({ photoGuids }),
      { 'Content-Type': 'application/json' }
    );

    const assetData = JSON.parse(assetUrlsRes.text);
    const items: AlbumImportCandidate[] = [];

    for (let i = 0; i < rawPhotos.length && i < 30; i++) {
      const p = rawPhotos[i];
      const guid = p.photoGuid;
      const derivatives = p.derivatives || {};
      
      // Select best derivative (preview / medium / original)
      const derivKeys = Object.keys(derivatives);
      if (derivKeys.length === 0) continue;

      // Pick highest resolution available or reasonable web resolution
      const chosenKey = derivKeys.sort((a, b) => {
        const da = derivatives[a];
        const db = derivatives[b];
        return (Number(db.fileSize) || 0) - (Number(da.fileSize) || 0);
      })[0];

      const deriv = derivatives[chosenKey];
      const checksum = deriv?.checksum;

      if (checksum && assetData.items && assetData.items[checksum]) {
        const itemLocation = assetData.items[checksum];
        const host = assetData.locations?.[itemLocation.url_location]?.hosts?.[0] || 'cvws.icloud-content.com';
        const scheme = assetData.locations?.[itemLocation.url_location]?.scheme || 'https';
        const directUrl = `${scheme}://${host}${itemLocation.url_path}`;

        items.push({
          id: guid || `icloud-${i}`,
          previewUrl: directUrl,
          sourceUrl: directUrl,
          width: Number(deriv.width) || undefined,
          height: Number(deriv.height) || undefined,
          caption: p.caption || undefined
        });
      }
    }

    return {
      success: true,
      provider: 'icloud',
      albumTitle: streamData.streamName || 'Album iCloud',
      photos: items
    };
  } catch (err: any) {
    return {
      success: false,
      provider: 'icloud',
      photos: [],
      error: `Nie udało się wczytać albumu iCloud: ${err.message || 'Błąd połączenia'}`,
      suggestion: 'Sprawdź, czy album ma włączoną opcję „Witryna publiczna” w ustawieniach udostępniania na iOS/macOS.'
    };
  }
}

/**
 * Inspect Google Photos Shared Album Link.
 */
async function inspectGooglePhotos(rawUrl: string): Promise<AlbumInspectResult> {
  try {
    const page = await fetchSafeText(rawUrl);

    // Check if Google redirected to signin
    if (
      page.finalUrl.includes('accounts.google.com') ||
      page.text.includes('Zaloguj się') ||
      page.text.includes('Sign in to view') ||
      page.text.includes('Sign in - Google Accounts')
    ) {
      return {
        success: false,
        provider: 'google_photos',
        photos: [],
        requiresAuth: true,
        error: 'Ten album Google Photos wymaga zalogowania na konto Google lub ma ograniczone uprawnienia dostępu.',
        suggestion: 'W Zdjęciach Google upewnij się, że w opcjach udostępniania albumu włączono „Udostępnianie przez link” oraz dostęp bez logowania, lub pobierz zdjęcia i dodaj je z urządzenia.'
      };
    }

    // Extract page title
    const titleMatch = page.text.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
                       page.text.match(/<title[^>]*>([^<]+)<\/title>/i);
    const albumTitle = titleMatch ? titleMatch[1].replace(/- Zdjęcia Google.*/i, '').trim() : 'Album Google Photos';

    // Search for photos hosted on Google Photos CDN (lh3.googleusercontent.com/pw/... or lh3.googleusercontent.com/...)
    // In Google Photos shared album HTML, image URLs are embedded in JSON data structures or meta tags
    const photoUrls = new Set<string>();

    // 1. Check OpenGraph image
    const ogImage = page.text.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    if (ogImage && ogImage[1] && ogImage[1].includes('googleusercontent.com')) {
      const cleanOg = ogImage[1].replace(/=w\d+.*$/, '=w1200');
      photoUrls.add(cleanOg);
    }

    // 2. Regex scan for high-resolution photo items in Google Photos payload
    const regex = /"(https:\/\/[a-z0-9]+\.googleusercontent\.com\/(?:pw\/)?[a-zA-Z0-9_\-]+)"/g;
    let match: RegExpExecArray | null;
    let count = 0;

    while ((match = regex.exec(page.text)) !== null && count < 60) {
      const url = match[1];
      // Exclude tiny icons, avatars or UI glyphs
      if (!url.includes('googleusercontent.com/a/') && !url.includes('googleusercontent.com/og/')) {
        photoUrls.add(url);
        count++;
      }
    }

    if (photoUrls.size === 0) {
      return {
        success: false,
        provider: 'google_photos',
        photos: [],
        error: 'Nie znaleziono dostępnych zdjęć w podanym albumie Google Photos.',
        suggestion: 'Upewnij się, że album zawiera zdjęcia oraz posiada włączone udostępnianie publiczne.'
      };
    }

    const photos: AlbumImportCandidate[] = Array.from(photoUrls).slice(0, 30).map((url, idx) => ({
      id: `gp-photo-${idx + 1}`,
      previewUrl: `${url}=w400-h400-c`,
      sourceUrl: `${url}=w1600`
    }));

    return {
      success: true,
      provider: 'google_photos',
      albumTitle,
      photos
    };
  } catch (err: any) {
    return {
      success: false,
      provider: 'google_photos',
      photos: [],
      error: `Błąd podczas wczytywania albumu Google Photos: ${err.message || 'Błąd połączenia'}`,
      suggestion: 'Upewnij się, że link jest poprawny i nie wygasł.'
    };
  }
}

/**
 * Main inspect function.
 */
export async function inspectSharedAlbum(rawUrl: string): Promise<AlbumInspectResult> {
  const cleanUrl = rawUrl.trim();
  let parsed: URL;
  try {
    parsed = new URL(cleanUrl);
  } catch (err) {
    return {
      success: false,
      provider: 'unsupported',
      photos: [],
      error: 'Nieprawidłowy adres URL.'
    };
  }

  const host = parsed.hostname.toLowerCase();

  if (host.includes('icloud.com') || host.includes('apple.com')) {
    return await inspectICloud(cleanUrl);
  }

  if (host.includes('photos.app.goo.gl') || host.includes('photos.google.com')) {
    return await inspectGooglePhotos(cleanUrl);
  }

  return {
    success: false,
    provider: 'unsupported',
    photos: [],
    error: 'Nieobsługiwany dostawca albumu.',
    suggestion: 'AURA obsługuje udostępnione albumy z iCloud (z włączoną „Witryną publiczną”) oraz Google Photos (z włączonym „Udostępnianiem przez link”).'
  };
}

/**
 * Execute import of selected photos into AURA user gallery.
 */
export async function executePhotoImport(
  userId: string,
  selectedPhotos: Array<{ id: string; sourceUrl: string }>,
  primaryPhotoId?: string
): Promise<{
  importedCount: number;
  failedCount: number;
  results: Array<{ id: string; success: boolean; url?: string; error?: string; isPrimary?: boolean }>;
}> {
  const results: Array<{ id: string; success: boolean; url?: string; error?: string; isPrimary?: boolean }> = [];
  let importedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < selectedPhotos.length; i++) {
    const item = selectedPhotos[i];
    try {
      // 1. Safe SSRF fetch of image bytes
      const { buffer, contentType } = await fetchSafeBuffer(item.sourceUrl, 8 * 1024 * 1024, 10000);

      // 2. Validate file format signature
      const validation = validateMediaBuffer(buffer, 'profile_photo', contentType);
      if (!validation.valid) {
        throw new Error(validation.error || 'Nieprawidłowy format pliku obrazu.');
      }

      // 3. Process with Sharp: strip EXIF/GPS, rotate, re-encode to optimized WebP
      const record = await processAndSaveMedia({
        buffer,
        clientMime: validation.detectedMime,
        category: 'profile_photo',
        userId
      });

      const isPrimary = item.id === primaryPhotoId || (i === 0 && !primaryPhotoId);

      results.push({
        id: item.id,
        success: true,
        url: `/api/media/${record.id}`,
        isPrimary
      });
      importedCount++;
    } catch (err: any) {
      failedCount++;
      results.push({
        id: item.id,
        success: false,
        error: err.message || 'Nie udało się przetworzyć zdjęcia.'
      });
    }
  }

  return {
    importedCount,
    failedCount,
    results
  };
}
