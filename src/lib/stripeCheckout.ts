import type Stripe from 'stripe';

export function buildStripeCheckout(userId: string, planId: unknown, env: Record<string, string | undefined>): Stripe.Checkout.SessionCreateParams {
  const plans: Record<string, string | undefined> = {
    aura_vip_monthly: env.STRIPE_PRICE_MONTHLY,
    aura_vip_annual: env.STRIPE_PRICE_ANNUAL
  };
  if (typeof planId !== 'string' || !Object.hasOwn(plans, planId)) throw new Error('Unknown subscription plan');
  const price = plans[planId];
  if (!price || !/^price_[a-zA-Z0-9]+$/.test(price)) throw new Error('Subscription price is not configured');
  if (!env.STRIPE_WEBHOOK_SECRET) throw new Error('Payment confirmation is not configured');
  const base = new URL(env.APP_BASE_URL || '');
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash || base.pathname !== '/') {
    throw new Error('APP_BASE_URL must be the HTTPS application origin');
  }
  const metadata = { userId, planId };
  return {
    mode: 'subscription',
    client_reference_id: userId,
    metadata,
    subscription_data: { metadata },
    line_items: [{ price, quantity: 1 }],
    success_url: `${base.origin}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base.origin}/?payment=cancelled`
  };
}
