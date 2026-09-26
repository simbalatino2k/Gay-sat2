export const MEDIA_SESSION_COOKIE = '__session';
export const LEGACY_MEDIA_SESSION_COOKIES = ['aura_auth_token', 'aura_token'] as const;

// Firebase Hosting forwards __session to Cloud Run and strips other cookies.
// Keep reading legacy cookies for people still using the existing direct origin.
export function mediaSessionTokens(cookieHeader: string | undefined): string[] {
  if (!cookieHeader) return [];

  const cookies = new Map<string, string>();
  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (name && !cookies.has(name)) cookies.set(name, value);
  }

  // A present __session is authoritative, even if empty, malformed or expired.
  // Falling back to a legacy cookie here could authenticate a previous account.
  if (cookies.has(MEDIA_SESSION_COOKIE)) {
    const encoded = cookies.get(MEDIA_SESSION_COOKIE)!;
    try {
      const token = decodeURIComponent(encoded);
      return token ? [token] : [];
    } catch {
      return [];
    }
  }

  const tokens: string[] = [];
  for (const name of LEGACY_MEDIA_SESSION_COOKIES) {
    const encoded = cookies.get(name);
    if (!encoded) continue;
    try {
      const token = decodeURIComponent(encoded);
      if (token && !tokens.includes(token)) tokens.push(token);
    } catch {
      // One malformed legacy cookie must not hide another valid legacy cookie.
    }
  }
  return tokens;
}
