import assert from 'node:assert/strict';
import {
  buildProfileBoostCheckout,
  isPaidProfileBoostSession,
  PROFILE_BOOST_AMOUNT_CENTS,
  PROFILE_BOOST_DURATION_HOURS,
  PROFILE_BOOST_PRODUCT_ID
} from '../src/lib/stripeCheckout';

const env = { APP_BASE_URL: 'https://auragay.com', STRIPE_WEBHOOK_SECRET: 'test-only-placeholder' };
const checkout = buildProfileBoostCheckout('buyer-1', env);
assert.equal(checkout.mode, 'payment');
assert.equal(checkout.client_reference_id, 'buyer-1');
assert.equal(checkout.metadata?.productId, PROFILE_BOOST_PRODUCT_ID);
assert.equal(checkout.payment_intent_data?.metadata?.userId, 'buyer-1');
assert.equal(checkout.line_items?.[0].price_data?.unit_amount, PROFILE_BOOST_AMOUNT_CENTS);
assert.equal(checkout.line_items?.[0].price_data?.currency, 'eur');
assert.equal(checkout.line_items?.[0].quantity, 1);
assert.equal(checkout.allow_promotion_codes, false);
assert.equal(checkout.automatic_tax, undefined);
assert.equal(checkout.payment_method_types, undefined);
assert.equal(checkout.success_url, 'https://auragay.com/boost/confirmation?session_id={CHECKOUT_SESSION_ID}');
assert.equal(PROFILE_BOOST_DURATION_HOURS, 12);

assert.throws(() => buildProfileBoostCheckout('buyer-1', { ...env, STRIPE_WEBHOOK_SECRET: '' }));
assert.throws(() => buildProfileBoostCheckout('buyer-1', env, 'auragay.com', undefined, 'https://evil.example'));
assert.equal(buildProfileBoostCheckout('buyer-1', env, 'evil.example').success_url,
  'https://auragay.com/boost/confirmation?session_id={CHECKOUT_SESSION_ID}');

const paid = {
  mode: 'payment' as const,
  status: 'complete' as const,
  payment_status: 'paid' as const,
  client_reference_id: 'buyer-1',
  metadata: { userId: 'buyer-1', productId: PROFILE_BOOST_PRODUCT_ID },
  amount_total: 199,
  currency: 'eur'
};
assert.equal(isPaidProfileBoostSession(paid), true);
assert.equal(isPaidProfileBoostSession({ ...paid, mode: 'subscription' }), false);
assert.equal(isPaidProfileBoostSession({ ...paid, status: 'open' }), false);
assert.equal(isPaidProfileBoostSession({ ...paid, payment_status: 'unpaid' }), false);
assert.equal(isPaidProfileBoostSession({ ...paid, client_reference_id: 'someone-else' }), false);
assert.equal(isPaidProfileBoostSession({ ...paid, metadata: { userId: 'buyer-1', productId: 'other' } }), false);
assert.equal(isPaidProfileBoostSession({ ...paid, amount_total: 150 }), false);
assert.equal(isPaidProfileBoostSession({ ...paid, currency: 'usd' }), false);
console.log('PASS: Booster checkout is a fixed €1.99 one-time purchase; fulfillment rejects unpaid, wrong-user, wrong-product, wrong-amount and wrong-currency sessions');
