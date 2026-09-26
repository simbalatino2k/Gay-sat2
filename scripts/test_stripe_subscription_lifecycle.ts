import assert from 'node:assert/strict';
import type Stripe from 'stripe';
import { store } from '../src/db/store';
import { PostgresStoreAdapter } from '../src/db/postgres';
import type { UserEntitlement } from '../src/types';
import {
  invoiceSubscriptionId, paidInvoicePeriodEnd, stripeSubscriptionPeriodEnd,
  syncStripeSubscription, type StripeSubscriptionRecord, type StripeSubscriptionStore
} from '../src/lib/stripeSubscription';

const now = Math.floor(Date.now() / 1000);
const firstEnd = now + 90 * 86400;
const renewalEnd = now + 365 * 86400;
const environment = {
  STRIPE_PRICE_MONTHLY: 'price_monthly',
  STRIPE_PRICE_THREE_MONTH: 'price_quarterly',
  STRIPE_PRICE_ANNUAL: 'price_annual'
} as NodeJS.ProcessEnv;
const subscription = {
  id: 'sub_quarterly', customer: 'cus_member', status: 'active',
  cancel_at_period_end: false, metadata: { userId: 'member', planId: 'aura_vip_three_month' },
  items: { data: [{ price: { id: 'price_quarterly' }, current_period_end: firstEnd }] }
} as unknown as Stripe.Subscription;
let current = subscription;
const stripe = { subscriptions: { retrieve: async () => current } } as unknown as Pick<Stripe, 'subscriptions'>;
const records: Array<{ status: string; periodEnd?: Date; autoRenew?: boolean; planId: string }> = [];
let prior: StripeSubscriptionRecord | null = null;
const fakeStore: StripeSubscriptionStore = {
  getUserById: async id => id === 'member' ? { id } : null,
  findUserByStripeCustomerId: async () => prior ? { id: 'member' } : null,
  findUserByStripeSubscriptionId: async id => prior?.subscriptionId === id ? { id: 'member' } : null,
  getStripeSubscriptionByUserId: async () => prior,
  recordStripeSubscription: async (_userId, _customerId, subscriptionId, planId, status, periodEnd, autoRenew) => {
    records.push({ status, periodEnd, autoRenew, planId });
    prior = { subscriptionId, planId, status, currentPeriodEnd: periodEnd };
  }
};

assert.equal(stripeSubscriptionPeriodEnd(subscription)?.getTime(), firstEnd * 1000);
await syncStripeSubscription(stripe, fakeStore, subscription.id, {}, environment);
assert.equal(records.at(-1)?.status, 'incomplete', 'an unpaid subscription event cannot grant access');
await syncStripeSubscription(stripe, fakeStore, subscription.id,
  { checkoutUserId: 'member', checkoutCustomerId: 'cus_member', checkoutPaid: true }, environment);
assert.equal(records.at(-1)?.planId, 'aura_vip_three_month');
assert.equal(records.at(-1)?.periodEnd?.getTime(), firstEnd * 1000, 'three-month Checkout uses the Stripe item period');
current = { ...subscription, metadata: {} } as Stripe.Subscription;
await assert.rejects(syncStripeSubscription(stripe, {
  ...fakeStore, getUserById: async id => ({ id })
}, subscription.id, { checkoutUserId: 'different-member', checkoutPaid: true }, environment),
/owner mismatch/, 'A Checkout identity cannot take over an existing subscription');
current = subscription;

current = { ...subscription, items: { ...subscription.items, data: [{ ...subscription.items.data[0], current_period_end: renewalEnd }] },
  cancel_at_period_end: true } as Stripe.Subscription;
await syncStripeSubscription(stripe, fakeStore, subscription.id, {}, environment);
assert.equal(records.at(-1)?.periodEnd?.getTime(), firstEnd * 1000, 'unpaid update cannot extend access');
assert.equal(records.at(-1)?.autoRenew, false, 'scheduled cancellation retains access and disables renewal');

const invoice = {
  status: 'paid', total: 0,
  parent: { type: 'subscription_details', subscription_details: { subscription: subscription.id } },
  lines: { data: [{ parent: { type: 'subscription_item_details',
    subscription_item_details: { subscription: subscription.id, proration: false } }, period: { end: renewalEnd } }] }
} as unknown as Stripe.Invoice;
assert.equal(invoiceSubscriptionId(invoice), subscription.id);
assert.equal(paidInvoicePeriodEnd(invoice, subscription.id)?.getTime(), renewalEnd * 1000);
await syncStripeSubscription(stripe, fakeStore, subscription.id,
  { paidThrough: paidInvoicePeriodEnd(invoice, subscription.id) }, environment);
assert.equal(records.at(-1)?.periodEnd?.getTime(), renewalEnd * 1000, 'paid renewal extends access');
await syncStripeSubscription(stripe, fakeStore, subscription.id,
  { paidThrough: paidInvoicePeriodEnd(invoice, subscription.id) }, environment);
assert.equal(records.at(-1)?.periodEnd?.getTime(), renewalEnd * 1000, 'replayed paid invoice does not stack periods');

current = { ...current, status: 'past_due' } as Stripe.Subscription;
await syncStripeSubscription(stripe, fakeStore, subscription.id, {}, environment);
assert.equal(records.at(-1)?.status, 'past_due', 'payment failure is not recorded as a cancellation');
current = { ...current, latest_invoice: 'in_retry' } as Stripe.Subscription;
await assert.rejects(syncStripeSubscription(stripe, fakeStore, subscription.id,
  { paidThrough: new Date(renewalEnd * 1000), paidInvoiceId: 'in_retry' }, environment),
  /has not activated/, 'latest paid invoice retries until Stripe reports active');
current = { ...current, status: 'active', cancel_at_period_end: false } as Stripe.Subscription;
await syncStripeSubscription(stripe, fakeStore, subscription.id,
  { paidThrough: new Date(renewalEnd * 1000), paidInvoiceId: 'in_retry' }, environment);
assert.equal(records.at(-1)?.status, 'active', 'successful retry restores access');
current = { ...current, status: 'canceled' } as Stripe.Subscription;
await syncStripeSubscription(stripe, fakeStore, subscription.id, {}, environment);
assert.equal(records.at(-1)?.status, 'canceled', 'final cancellation revokes access');

const oldSubscription = current;
current = {
  ...subscription, id: 'sub_annual', status: 'active', cancel_at_period_end: false,
  metadata: { userId: 'member', planId: 'aura_vip_annual' },
  items: { ...subscription.items, data: [{ ...subscription.items.data[0], price: { id: 'price_annual' }, current_period_end: renewalEnd }] }
} as Stripe.Subscription;
await syncStripeSubscription(stripe, fakeStore, current.id,
  { checkoutUserId: 'member', checkoutCustomerId: 'cus_member', checkoutPaid: true }, environment);
assert.equal(records.at(-1)?.planId, 'aura_vip_annual');
assert.equal(records.at(-1)?.periodEnd?.getTime(), renewalEnd * 1000, 'annual Checkout uses the annual Stripe period');
current = oldSubscription;
const count = records.length;
await syncStripeSubscription(stripe, fakeStore, oldSubscription.id, {}, environment);
assert.equal(records.length, count, 'late cancellation from replaced subscription cannot revoke new access');

// Production lookups must use PostgreSQL even after the process cache is empty.
const state = store as any;
state.stripeSubscriptions.clear();
state.pgAdapter = {
  findUserIdByStripeCustomerId: async (id: string) => id === 'cus_member' ? 'member' : null,
  findUserIdByStripeSubscriptionId: async (id: string) => id === 'sub_quarterly' ? 'member' : null,
  getUserById: async (id: string) => ({ id }),
  getStripeSubscriptionByUserId: async () => ({
    subscriptionId: 'sub_quarterly', planId: 'aura_vip_three_month', status: 'active', currentPeriodEnd: new Date(firstEnd * 1000)
  })
};
assert.equal((await store.findUserByStripeCustomerId('cus_member'))?.id, 'member');
assert.equal((await store.findUserByStripeSubscriptionId('sub_quarterly'))?.id, 'member');
assert.equal((await store.getStripeSubscriptionByUserId('member'))?.currentPeriodEnd?.getTime(), firstEnd * 1000);
assert.equal(await store.findUserByStripeCustomerId('cus_unknown'), null, 'PostgreSQL remains authoritative');
let persistedEntitlement: UserEntitlement | undefined;
state.pgAdapter = {
  getUserById: async (id: string) => ({ id, profile: { isPremium: false }, isPremium: false }),
  setStripeSubscription: async (_userId: string, _customerId: string, _subscriptionId: string,
    _planId: string, _status: string, _periodEnd: Date | undefined, entitlement: UserEntitlement) => {
    persistedEntitlement = entitlement;
  }
};
await assert.rejects(store.recordStripeSubscription('member', 'cus_member', 'sub_quarterly',
  'aura_vip_three_month', 'active'), /future billing period/);
await store.recordStripeSubscription('member', 'cus_member', 'sub_quarterly',
  'aura_vip_three_month', 'active', new Date(firstEnd * 1000), false);
assert.equal(persistedEntitlement?.planTier, 'three_month');
assert.equal(persistedEntitlement?.expiresAt, new Date(firstEnd * 1000).toISOString());
assert.equal(persistedEntitlement?.autoRenew, false);
state.pgAdapter = null;

const commands: string[] = [];
let failUserWrite = true;
const client = {
  query: async (sql: string) => {
    commands.push(sql);
    if (failUserWrite && sql.includes('UPDATE users SET')) throw new Error('write failed');
    return { rows: [] };
  },
  release: () => {}
};
const adapter = new PostgresStoreAdapter({ connect: async () => client } as any);
const entitlement = {
  userId: 'member', premium: true, provider: 'stripe', productId: 'aura_vip_three_month',
  planTier: 'three_month', status: 'active', autoRenew: true,
  expiresAt: new Date(firstEnd * 1000).toISOString(),
  lastVerifiedAt: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
} satisfies UserEntitlement;
await assert.rejects(adapter.setStripeSubscription('member', 'cus_member', 'sub_quarterly',
  'aura_vip_three_month', 'active', new Date(firstEnd * 1000), entitlement));
assert.equal(commands[0], 'BEGIN');
assert.equal(commands.at(-1), 'ROLLBACK', 'mapping and entitlement are rolled back together');
commands.length = 0;
failUserWrite = false;
await adapter.setStripeSubscription('member', 'cus_member', 'sub_quarterly',
  'aura_vip_three_month', 'active', new Date(firstEnd * 1000), entitlement);
assert.equal(commands[0], 'BEGIN');
assert.equal(commands.at(-1), 'COMMIT', 'mapping and entitlement commit in one transaction');

console.log('PASS: durable Stripe lookup, paid periods, three-month renewal, cancellation, retry, and replay');
