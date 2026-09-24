// Dependency-free regression checks for Node 24+. No application data or database is opened.
// Classes are evaluated without their startup imports; PostgreSQL transport is a test double.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';

function loadClass(file, name, end) {
  const source = readFileSync(new URL(file, import.meta.url), 'utf8');
  const start = source.indexOf('export class ' + name);
  const code = source.slice(start, end ? source.indexOf(end, start) : undefined)
    .replace('export class ', 'class ');
  return vm.runInNewContext(stripTypeScriptTypes(code, { mode: 'transform' }) + '\n' + name, { console });
}
const Adapter = loadClass('../src/db/postgres.ts', 'PostgresStoreAdapter');
const Store = loadClass('../src/db/store.ts', 'DataStore', 'export const store');
const rows = new Map();
const queries = [];
const client = {
  release() {},
  async query(sql, args) {
    queries.push({ sql, args });
    if (sql.includes('INSERT INTO users')) {
      rows.set(args[0], {
        id: args[0], email: args[1], display_name: args[2], age: args[3],
        role: args[4], status: args[5], bio: args[6], sexual_role: args[7],
        tribe: args[8], looking_for: args[9], interests: JSON.parse(args[11]),
        location: JSON.parse(args[12]), photos: JSON.parse(args[13]),
        privacy: JSON.parse(args[17])
      });
    }
    if (sql.startsWith('SELECT * FROM users WHERE id')) return { rows: rows.has(args[0]) ? [rows.get(args[0])] : [] };
    if (sql.includes('SELECT u.* FROM users u')) return { rows: [...rows.values()].filter(r => r.id !== args[0] && r.status === 'ACTIVE') };
    return { rows: [] };
  }
};
const pool = { ...client, async connect() { return client; } };
const writer = new Adapter(pool);
const reader = new Adapter(pool);
const user = {
  id: 'account-b', email: 'b@example.invalid', role: 'USER', status: 'ACTIVE',
  createdAt: new Date().toISOString(),
  profile: {
    id: 'account-b', userId: 'account-b', displayName: 'B', age: 28,
    location: 'Test city', lat: 0, lng: 0, locationPrivacy: 'HIDDEN',
    lookingFor: ['Dating', 'Friends'], tribes: ['Queer', 'Bear'], photos: [], interests: []
  }
};
await writer.saveUserAndSession(user, 'test-session', new Date());
let restored = await reader.getUserById(user.id);
assert.equal(restored.profile.lat, 0);
assert.equal(restored.profile.lng, 0);
assert.equal(restored.profile.locationPrivacy, 'HIDDEN');
assert.equal(JSON.stringify(restored.profile.tribes), JSON.stringify(user.profile.tribes));
await writer.saveUser(restored);
restored = await reader.getUserById(user.id);
assert.equal(restored.profile.location, 'Test city');
assert.equal(restored.profile.tribes.length, 2);

const store = Object.create(Store.prototype);
Object.assign(store, { users: new Map(), blocks: [], pgAdapter: reader, saveToDisk() {} });
let feed = await store.getDiscoverFeed('account-a');
assert.equal(feed.length, 1, 'A sees B even with an empty local cache');
assert.equal(feed[0].lat, undefined, 'Hidden coordinates never leave discovery');
assert.equal(feed[0].lng, undefined);
assert.equal((await store.getDiscoverFeed('account-b')).length, 0, 'Own account is excluded');
const discoveryQuery = queries.find(q => q.sql.includes('SELECT u.* FROM users u'));
assert.ok(discoveryQuery.sql.includes('b.blocker_user_id = $1 AND b.blocked_user_id = u.id'));
assert.ok(discoveryQuery.sql.includes('b.blocked_user_id = $1 AND b.blocker_user_id = u.id'));

await store.updateProfile(user.id, { lat: 47.37, lng: 8.54, locationPrivacy: 'APPROXIMATE' });
restored = await reader.getUserById(user.id);
assert.equal(restored.profile.lat, 47.37);
assert.equal(restored.profile.lng, 8.54);
feed = await store.getDiscoverFeed('account-a');
assert.notEqual(feed[0].lat, restored.profile.lat, 'Approximate mode obscures coordinates');
for (const invalid of [{ lat: 91, lng: 0 }, { lat: 0 }, { lat: null, lng: 0 }, { lat: NaN, lng: 0 }, { locationPrivacy: 'PUBLIC' }]) {
  await assert.rejects(() => store.updateProfile(user.id, invalid));
}
await store.updateProfile(user.id, { lat: 0, lng: 0, role: 'ADMIN', verified: true });
restored = await reader.getUserById(user.id);
assert.equal(restored.role, 'USER');
assert.equal(restored.profile.verified, false);
assert.equal(restored.profile.lat, 0);
await store.updateProfile(user.id, {
  age: 29,
  photos: [
    { id: 'public', url: 'https://example.invalid/public.jpg', isPrimary: true },
    { id: 'private', url: 'https://example.invalid/private.jpg', isPrivate: true }
  ]
});
restored = await reader.getUserById(user.id);
assert.equal(restored.profile.age, 29);
assert.equal(restored.profile.photos.length, 2);
feed = await store.getDiscoverFeed('account-a');
assert.equal(feed[0].photos.length, 1, 'Private photos are omitted from discovery');
assert.equal(feed[0].photos[0].url, 'https://example.invalid/public.jpg');
await assert.rejects(() => store.updateProfile(user.id, { age: 17 }));
await assert.rejects(() => store.updateProfile(user.id, { photos: [{ id: 'bad', url: 'javascript:alert(1)' }] }));
console.log('PASS: registration serialization, location and profile persistence, discovery without cache, privacy and input validation.');
console.log('SQL is inspected using a test transport; a live PostgreSQL integration test is still required.');
