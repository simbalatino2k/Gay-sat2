import assert from 'node:assert/strict';
import { store } from '../src/db/store';
import type { UserAccount } from '../src/types';

// A GDPR correction must survive a fresh database read, not only change RAM.
const user = {
  id: 'rectify-member',
  email: 'member@example.test',
  status: 'ACTIVE',
  profile: { id: 'rectify-member', userId: 'rectify-member', displayName: 'Old Name', bio: 'Hello' },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
} as UserAccount;
let persisted = structuredClone(user);
let saveCount = 0;

await store.initializeDatabase();
(store as any).pgAdapter = {
  getUserById: async (id: string) => id === user.id ? structuredClone(persisted) : null,
  getUserByEmail: async (email: string) => email === 'other@example.test'
    ? { ...structuredClone(persisted), id: 'other-member', email }
    : email === persisted.email ? structuredClone(persisted) : null,
  saveUser: async (updated: UserAccount) => {
    saveCount++;
    persisted = structuredClone(updated);
  }
};

const corrected = await store.rectifyUserData(user.id, { displayName: 'Adasq', bio: 'Hello' });
assert.equal(corrected.profile.displayName, 'Adasq');
assert.equal(saveCount, 1, 'Rectification must write to PostgreSQL');
assert.equal((await store.getUserById(user.id))?.profile.displayName, 'Adasq', 'A fresh DB read must show the correction');

await assert.rejects(
  store.rectifyUserData(user.id, { email: 'other@example.test' }),
  /Email is already taken/,
  'A different account cannot claim an existing address'
);

console.log('PASS: GDPR rectification persists profile changes and rejects duplicate email');
