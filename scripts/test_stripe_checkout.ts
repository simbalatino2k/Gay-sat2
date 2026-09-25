import assert from 'node:assert/strict';
import { buildStripeCheckout, checkoutConfirmationRedirect, classifyCheckoutSession, isCheckoutSessionId } from '../src/lib/stripeCheckout';
const env = { APP_BASE_URL: 'https://auragay.com', STRIPE_PRICE_THREE_MONTH: 'price_quarterly', STRIPE_PRICE_MONTHLY: 'price_monthly', STRIPE_PRICE_ANNUAL: 'price_annual', STRIPE_WEBHOOK_SECRET: 'test-only-placeholder' };
const monthly = buildStripeCheckout('user-test', 'aura_vip_monthly', env);
assert.deepEqual(monthly.line_items, [{ price: 'price_monthly', quantity: 1 }]);
assert.equal(monthly.payment_method_types, undefined);
assert.deepEqual(monthly.metadata, monthly.subscription_data?.metadata);
assert.equal(monthly.success_url, 'https://auragay.com/payment/confirmation?session_id={CHECKOUT_SESSION_ID}');
assert.equal(buildStripeCheckout('user-test', 'aura_vip_annual', env).line_items?.[0].price, 'price_annual');
for (const plan of ['bogus', 'toString', '__proto__', 1]) assert.throws(() => buildStripeCheckout('u', plan, env));
for (const url of ['', 'http://auragay.com', 'https://user:password@auragay.com', 'https://auragay.com/path', 'https://auragay.com?redirect=evil']) {
  assert.throws(() => buildStripeCheckout('u', 'aura_vip_monthly', { ...env, APP_BASE_URL: url }));
}
assert.throws(() => buildStripeCheckout('u', 'aura_vip_monthly', { ...env, STRIPE_PRICE_MONTHLY: '' }));
assert.throws(() => buildStripeCheckout('u', 'aura_vip_monthly', { ...env, STRIPE_WEBHOOK_SECRET: '' }));
console.log('PASS: trusted redirect, configured prices, explicit plan validation, subscription ownership metadata, dynamic methods');

assert.equal(monthly.allow_promotion_codes, false);
const quarterly = buildStripeCheckout('u', 'aura_vip_three_month', env);
assert.equal(quarterly.line_items?.[0].price, 'price_quarterly');
assert.equal(quarterly.allow_promotion_codes, false);
assert.equal(buildStripeCheckout('u', 'aura_vip_annual', env).allow_promotion_codes, true);
assert.throws(() => buildStripeCheckout('u', 'aura_vip_three_month', { ...env, STRIPE_PRICE_THREE_MONTH: '' }));
console.log('PASS: quarterly and annual-only promotions');

const paidSession = {
  client_reference_id: 'user-test',
  metadata: { userId: 'user-test' },
  mode: 'subscription' as const,
  status: 'complete' as const,
  payment_status: 'paid' as const,
  subscription: 'sub_test'
};
assert.equal(classifyCheckoutSession(paidSession, 'user-test'), 'paid');
assert.equal(classifyCheckoutSession({ ...paidSession, payment_status: 'unpaid' }, 'user-test'), 'pending');
assert.equal(classifyCheckoutSession({ ...paidSession, status: 'expired' }, 'user-test'), 'failed');
assert.equal(classifyCheckoutSession({ ...paidSession, subscription: null }, 'user-test'), 'pending');
assert.equal(classifyCheckoutSession({ ...paidSession, client_reference_id: 'other-user' }, 'user-test'), 'not_found');
assert.equal(classifyCheckoutSession({ ...paidSession, metadata: { userId: 'other-user' } }, 'user-test'), 'not_found');
assert.equal(checkoutConfirmationRedirect('unauthenticated'), '/?payment=signin');
assert.equal(checkoutConfirmationRedirect(classifyCheckoutSession({ ...paidSession, client_reference_id: 'other-user' }, 'user-test')), '/?payment=unverified');
assert.equal(checkoutConfirmationRedirect(classifyCheckoutSession({ ...paidSession, payment_status: 'unpaid' }, 'user-test')), '/payment/pending');
assert.equal(checkoutConfirmationRedirect(classifyCheckoutSession(paidSession, 'user-test')), null);
assert.equal(isCheckoutSessionId('cs_test_1234567890'), true);
assert.equal(isCheckoutSessionId('https://evil.example/cs_test_1234567890'), false);
assert.equal(isCheckoutSessionId(['cs_test_1234567890']), false);
console.log('PASS: confirmation requires a paid Stripe session owned by the authenticated user');
