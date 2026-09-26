import type { UserAccount, UserProfile } from '../types';

export class FirebaseServerSyncError extends Error {
  readonly firebaseAuthSucceeded = true;
}

function isGenericFirebaseProfile(user: UserAccount): boolean {
  const p = user.profile;
  return p?.location === 'Global Member' && p.bio === 'Connecting on AURA 18+.' &&
    p.age === 26 && p.identityRole === 'Versatile' && p.locationPrivacy === 'APPROXIMATE' &&
    p.lat === undefined && p.lng === undefined &&
    (p.approximateArea === undefined || p.approximateArea === 'Within ~1 km') &&
    p.heightCm === undefined && p.weightKg === undefined && p.relationshipStatus === undefined &&
    !p.instagramHandle && !p.spotifyTopArtist && !p.verified && !p.isPremium &&
    p.photos?.length === 1 && p.photos[0].id === `ph-${user.id}-1` &&
    p.tribes?.length === 1 && p.tribes[0] === 'Clean Cut' &&
    p.lookingFor?.length === 2 && p.lookingFor.includes('Dating') && p.lookingFor.includes('Friends') &&
    p.interests?.length === 3 && p.interests.includes('Design') &&
    p.interests.includes('Music') && p.interests.includes('Fitness');
}

/** Copy only user-editable fields from a pre-existing Firebase profile. */
export function firebaseProfileBackfill(firestoreData: unknown, serverUser: UserAccount): {
  fields: Partial<UserProfile>;
  photos?: UserProfile['photos'];
} | null {
  if (!isGenericFirebaseProfile(serverUser) || !firestoreData || typeof firestoreData !== 'object') return null;
  const doc = firestoreData as Record<string, unknown>;
  const source = (doc.profile && typeof doc.profile === 'object' && !Array.isArray(doc.profile)
    ? doc.profile : doc) as Record<string, unknown>;
  const fields: Partial<UserProfile> = {};
  const stringFields = [
    'displayName', 'bio', 'identityRole', 'location', 'approximateArea',
    'relationshipStatus', 'instagramHandle', 'spotifyTopArtist'
  ] as const;
  for (const key of stringFields) {
    const value = source[key];
    if (typeof value !== 'string' || !value.trim()) continue;
    if (key === 'location' && ['Los Angeles, CA', 'Global Member'].includes(value.trim())) continue;
    if (key === 'bio' && value === 'Passionate about life, good energy, and authentic connections.') continue;
    if (key === 'displayName' && ['AURA Member', 'New Member'].includes(value.trim())) continue;
    if (key === 'displayName') {
      const serverName = serverUser.profile.displayName?.trim().toLowerCase();
      const emailPrefix = serverUser.email?.split('@')[0]?.toLowerCase();
      if (!['aura member', 'new member', 'global member', emailPrefix].includes(serverName)) continue;
    }
    (fields as Record<string, unknown>)[key] = value.trim();
  }
  if (Number.isInteger(source.age) && (source.age as number) >= 18 && (source.age as number) <= 99) {
    fields.age = source.age as number;
  }
  for (const key of ['lookingFor', 'tribes', 'interests'] as const) {
    const value = source[key];
    if (Array.isArray(value) && value.length <= 30 && value.every(item => typeof item === 'string')) {
      (fields as Record<string, unknown>)[key] = value;
    }
  }
  if (typeof source.lat === 'number' && Number.isFinite(source.lat) && Math.abs(source.lat) <= 90 &&
      typeof source.lng === 'number' && Number.isFinite(source.lng) && Math.abs(source.lng) <= 180) {
    fields.lat = source.lat;
    fields.lng = source.lng;
  }
  if (['HIDDEN', 'EXACT', 'APPROXIMATE'].includes(String(source.locationPrivacy))) {
    fields.locationPrivacy = source.locationPrivacy as UserProfile['locationPrivacy'];
  }
  for (const key of ['heightCm', 'weightKg'] as const) {
    const value = source[key];
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      (fields as Record<string, unknown>)[key] = value;
    }
  }
  const photos = Array.isArray(source.photos) && source.photos.length <= 6 &&
    source.photos.every(photo => photo && typeof photo.id === 'string' && typeof photo.url === 'string')
    ? source.photos as UserProfile['photos'] : undefined;
  return Object.keys(fields).length || photos?.length ? { fields, photos } : null;
}

/** A Firebase login is complete only after its account exists in the discovery database. */
export async function ensureFirebaseServerSession(
  token: string,
  firebaseUid: string,
  firestoreData?: unknown,
  request: typeof fetch = fetch
): Promise<UserAccount> {
  try {
    const response = await request('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store'
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data?.user || data.user.id !== firebaseUid || data.user.status !== 'ACTIVE') {
      throw new Error('Server account mismatch');
    }
    const user = data.user as UserAccount;
    const backfill = firebaseProfileBackfill(firestoreData, user);
    if (!backfill) return user;

    const update = async (fields: Partial<UserProfile>): Promise<UserProfile> => {
      const result = await request('/api/profile', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(fields)
      });
      if (!result.ok) throw new Error(`Profile sync HTTP ${result.status}`);
      const body = await result.json();
      if (!body?.profile) throw new Error('Profile sync response missing');
      return body.profile as UserProfile;
    };

    let profile = user.profile;
    if (Object.keys(backfill.fields).length) profile = await update(backfill.fields);
    if (backfill.photos?.length) {
      try {
        profile = await update({ photos: backfill.photos });
      } catch (error) {
        // Historical Firebase photo URLs may fail current upload ownership rules.
        console.warn('[Firebase Sync] Historical profile photos require a new upload:', error);
      }
    }
    return { ...user, profile };
  } catch {
    throw new FirebaseServerSyncError(
      'Konto Firebase jest gotowe, ale profil na serwerze jest chwilowo niedostępny. Spróbuj zalogować się ponownie.'
    );
  }
}
