import assert from 'node:assert/strict';
import { buildStripeCheckout } from '../src/lib/stripeCheckout';
const env = { APP_BASE_URL: 'https://auragay.com', STRIPE_PRICE_MONTHLY: 'price_monthly', STRIPE_PRICE_ANNUAL: 'price_annual', STRIPE_WEBHOOK_SECRET: 'test-only-placeholder' };
const monthly = buildStripeCheckout('user-test', 'aura_vip_monthly', env);
assert.deepEqual(monthly.line_items, [{ price: 'price_monthly', quantity: 1 }]);
assert.equal(monthly.payment_method_types, undefined);
assert.deepEqual(monthly.metadata, monthly.subscription_data?.metadata);
assert.equal(buildStripeCheckout('user-test', 'aura_vip_annual', env).line_items?.[0].price, 'price_annual');
for (const plan of ['bogus', 'toString', '__proto__', 1]) assert.throws(() => buildStripeCheckout('u', plan, env));
for (const url of ['', 'http://auragay.com', 'https://user:password@auragay.com', 'https://auragay.com/path', 'https://auragay.com?redirect=evil']) {
  assert.throws(() => buildStripeCheckout('u', 'aura_vip_monthly', { ...env, APP_BASE_URL: url }));
}
assert.throws(() => buildStripeCheckout('u', 'aura_vip_monthly', { ...env, STRIPE_PRICE_MONTHLY: '' }));
assert.throws(() => buildStripeCheckout('u', 'aura_vip_monthly', { ...env, STRIPE_WEBHOOK_SECRET: '' }));
console.log('PASS: trusted redirect, configured prices, explicit plan validation, subscription ownership metadata, dynamic methods');
