import assert from 'node:assert/strict';
import { ensureFirebaseServerSession, FirebaseServerSyncError } from '../src/services/firebaseServerSync';
import { getMapProfilePosition } from '../src/lib/mapProfilePosition';
import { PERMISSIONS_PROMPTED_KEY, shouldRememberPermissionsChoice } from '../src/lib/permissionsPrompt';
import { requestAllPermissionsOnLogin } from '../src/services/permissionsService';
import type { UserAccount, UserProfile } from '../src/types';

const account = { id: 'firebase-b', status: 'ACTIVE' } as UserAccount;
const calls: Array<{ url: string; options?: RequestInit }> = [];
const okRequest = (async (url: string, options?: RequestInit) => {
  calls.push({ url, options });
  return { ok: true, json: async () => ({ user: account }) } as Response;
}) as typeof fetch;

assert.equal(await ensureFirebaseServerSession('signed-token', account.id, undefined, okRequest), account);
assert.equal(calls[0].url, '/api/auth/me');
assert.equal((calls[0].options?.headers as Record<string, string>).Authorization, 'Bearer signed-token');
assert.equal(calls[0].options?.cache, 'no-store');

await assert.rejects(
  ensureFirebaseServerSession('signed-token', 'different-user', undefined, okRequest),
  FirebaseServerSyncError
);
await assert.rejects(
  ensureFirebaseServerSession('signed-token', account.id, undefined, (async () => ({ ok: false, status: 503 }) as Response) as typeof fetch),
  FirebaseServerSyncError
);

const createdAt = new Date().toISOString();
const genericProfile = {
  id: account.id, userId: account.id, displayName: 'Firebase B', age: 26,
  bio: 'Connecting on AURA 18+.', identityRole: 'Versatile', location: 'Global Member',
  tribes: ['Clean Cut'], lookingFor: ['Dating', 'Friends'], interests: ['Design', 'Music', 'Fitness'],
  photos: [{ id: `ph-${account.id}-1`, url: 'https://example.invalid/default.jpg', isPrimary: true }],
  locationPrivacy: 'APPROXIMATE', approximateArea: 'Within ~1 km'
} as UserProfile;
const genericAccount = { ...account, createdAt, updatedAt: createdAt, profile: genericProfile };
const firebaseDoc = { profile: {
  displayName: 'Real B', age: 29, location: 'Zürich, Switzerland', lat: 47.37, lng: 8.54,
  locationPrivacy: 'HIDDEN', bio: 'Hello from Zürich', tribes: ['Bear'],
  role: 'ADMIN', verified: true, isBoosted: true
} };
const backfillCalls: Array<{ url: string; options?: RequestInit }> = [];
const backfillRequest = (async (url: string, options?: RequestInit) => {
  backfillCalls.push({ url, options });
  return url === '/api/auth/me'
    ? { ok: true, json: async () => ({ user: genericAccount }) } as Response
    : { ok: true, json: async () => ({ profile: { ...genericProfile, ...JSON.parse(String(options?.body)) } }) } as Response;
}) as typeof fetch;
const synced = await ensureFirebaseServerSession('signed-token', account.id, firebaseDoc, backfillRequest);
assert.equal(synced.profile.location, 'Zürich, Switzerland', 'Firestore city reaches the discovery database');
assert.equal(synced.profile.locationPrivacy, 'HIDDEN', 'Privacy choice is preserved');
const savedFields = JSON.parse(String(backfillCalls[1].options?.body));
assert.equal(backfillCalls[1].url, '/api/profile');
assert.equal(savedFields.lat, 47.37);
assert.equal(savedFields.lng, 8.54);
assert.equal(savedFields.role, undefined, 'Client account roles are not copied');
assert.equal(savedFields.verified, undefined, 'Client verification status is not copied');
assert.equal(savedFields.isBoosted, undefined, 'Client paid visibility is not copied');

const olderGenericAccount = { ...genericAccount, createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:01.000Z', profile: { ...genericProfile, approximateArea: undefined } };
const olderSynced = await ensureFirebaseServerSession('signed-token', account.id, firebaseDoc, (async (url: string, options?: RequestInit) =>
  url === '/api/auth/me'
    ? { ok: true, json: async () => ({ user: olderGenericAccount }) } as Response
    : { ok: true, json: async () => ({ profile: { ...olderGenericAccount.profile, ...JSON.parse(String(options?.body)) } }) } as Response
) as typeof fetch);
assert.equal(olderSynced.profile.location, 'Zürich, Switzerland', 'Older generic accounts can be backfilled');

const newerAccount = { ...genericAccount, profile: { ...genericProfile, location: 'Berlin' } };
let newerWrites = 0;
await ensureFirebaseServerSession('signed-token', account.id, firebaseDoc, (async (url: string) => {
  if (url !== '/api/auth/me') newerWrites++;
  return { ok: true, json: async () => ({ user: newerAccount }) } as Response;
}) as typeof fetch);
assert.equal(newerWrites, 0, 'A newer server profile is never overwritten by stale Firestore data');

const cities = [{ id: 'zurich', name: 'Zurych', lat: 47.3734, lng: 8.5447 }];
const profile = { id: 'prof-b', userId: account.id, location: 'Zürich, Switzerland', locationPrivacy: 'APPROXIMATE' } as UserProfile;
assert.deepEqual(getMapProfilePosition(profile, cities), { lat: 47.3734, lng: 8.5447, kind: 'city', cityName: 'Zurych' });
assert.equal(getMapProfilePosition({ ...profile, locationPrivacy: 'HIDDEN' }, cities), null);
assert.equal(getMapProfilePosition({ ...profile, location: 'Los Angeles, CA' }, cities), null, 'Generic signup city is never treated as a real position');
assert.equal(getMapProfilePosition({ ...profile, location: '' }, cities), null, 'A missing city cannot become a false Warsaw marker');
assert.deepEqual(getMapProfilePosition({ ...profile, lat: 47.37, lng: 8.54 }, cities), { lat: 47.37, lng: 8.54, kind: 'approximate' });

Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: { geolocation: { getCurrentPosition: (success: (position: unknown) => void) => success({ coords: { latitude: 47.37, longitude: 8.54 } }) } }
});
const localWrites: string[] = [];
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: { setItem(key: string) { localWrites.push(key); } }
});
let finishSave!: (value: Response) => void;
globalThis.fetch = (() => new Promise<Response>(resolve => { finishSave = resolve; })) as typeof fetch;
let completed = false;
const pending = requestAllPermissionsOnLogin('signed-token', undefined, { location: true, camera: false, microphone: false })
  .then(result => { completed = true; return result; });
await new Promise(resolve => setTimeout(resolve, 0));
assert.equal(completed, false, 'Permission success waits for the profile write');
finishSave({ ok: true } as Response);
assert.equal((await pending).locationSaved, true);

globalThis.fetch = (async () => ({ ok: false, status: 503 }) as Response) as typeof fetch;
const failedSave = await requestAllPermissionsOnLogin('signed-token', undefined, { location: true, camera: false, microphone: false });
assert.equal(failedSave.locationGranted, true);
assert.equal(failedSave.locationSaved, false);
assert.ok(failedSave.error);
assert.equal(shouldRememberPermissionsChoice(failedSave), false, 'Failed GPS save remains retryable after reload');
assert.equal(shouldRememberPermissionsChoice(await pending), true);
assert.equal(localWrites.includes(PERMISSIONS_PROMPTED_KEY), false, 'Permission prompt key is not stored by the request itself');

console.log('PASS: Firebase profile backfill, safe map city fallback, and retryable GPS persistence.');
