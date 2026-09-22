import assert from 'node:assert/strict';
import { store } from '../src/db/store';
const state = store as any;
let saved = false;
let fail = true;
state.pgAdapter = {
  isEventProcessed: async () => saved,
  recordProcessedEvent: async () => { if (fail) throw new Error('DB unavailable'); saved = true; }
};
await assert.rejects(store.recordStripeEvent('evt_retry', 'test'));
assert.equal(state.stripeEvents.has('evt_retry'), false);
assert.equal(await store.isStripeEventProcessed('evt_retry'), false);
fail = false;
await store.recordStripeEvent('evt_retry', 'test');
state.stripeEvents.clear();
assert.equal(await store.isStripeEventProcessed('evt_retry'), true, 'Durable status survives an empty process cache');
state.pgAdapter = null;
console.log('PASS: failed persistence can retry and PostgreSQL is authoritative for duplicate events');
