import type Stripe from 'stripe';

export const PROFILE_BOOST_PRODUCT_ID = 'aura_profile_boost_12h';
export const PROFILE_BOOST_AMOUNT_CENTS = 199;
export const PROFILE_BOOST_DURATION_HOURS = 12;

// The confirmation cookie belongs to the host that starts Checkout. Firebase
// Hosting may forward its public host through X-Forwarded-Host to Cloud Run.
const CHECKOUT_HOSTS = new Set(['auragay.com', 'aura-dating-gay-mab.web.app']);

function checkoutOriginForHost(host: unknown): string | null {
  if (typeof host !== 'string') return null;
  const normalized = host.toLowerCase().replace(/:443$/, '');
  return CHECKOUT_HOSTS.has(normalized) ? `https://${normalized}` : null;
}

function trustedCheckoutOrigin(
  env: Record<string, string | undefined>,
  requestHost?: unknown,
  forwardedHost?: unknown,
  requestOrigin?: unknown
): string {
  const base = new URL(env.APP_BASE_URL || '');
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash || base.pathname !== '/') {
    throw new Error('APP_BASE_URL must be the HTTPS application origin');
  }
  const returnOrigin = checkoutOriginForHost(requestHost) || checkoutOriginForHost(forwardedHost) || base.origin;
  if (requestOrigin !== undefined && requestOrigin !== returnOrigin) {
    throw new Error('Checkout request origin does not match return host');
  }
  return returnOrigin;
}

export function buildStripeCheckout(
  userId: string,
  planId: unknown,
  env: Record<string, string | undefined>,
  requestHost?: unknown,
  forwardedHost?: unknown,
  requestOrigin?: unknown
): Stripe.Checkout.SessionCreateParams {
  const plans: Record<string, string | undefined> = {
    aura_vip_monthly: env.STRIPE_PRICE_MONTHLY,
    aura_vip_three_month: env.STRIPE_PRICE_THREE_MONTH,
    aura_vip_annual: env.STRIPE_PRICE_ANNUAL
  };
  if (typeof planId !== 'string' || !Object.hasOwn(plans, planId)) throw new Error('Unknown subscription plan');
  const price = plans[planId];
  if (!price || !/^price_[a-zA-Z0-9]+$/.test(price)) throw new Error('Subscription price is not configured');
  if (!env.STRIPE_WEBHOOK_SECRET) throw new Error('Payment confirmation is not configured');
  const returnOrigin = trustedCheckoutOrigin(env, requestHost, forwardedHost, requestOrigin);
  // A browser's POST Origin must agree with the selected host. This prevents
  // a spoofed forwarding header from sending the customer to another domain
  // where their host-only confirmation cookie does not exist.
  const metadata = { userId, planId };
  return {
    mode: 'subscription',
    allow_promotion_codes: planId === 'aura_vip_annual',
    client_reference_id: userId,
    metadata,
    subscription_data: { metadata },
    line_items: [{ price, quantity: 1 }],
    success_url: `${returnOrigin}/payment/confirmation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${returnOrigin}/?payment=cancelled`
  };
}

export function buildProfileBoostCheckout(
  userId: string,
  env: Record<string, string | undefined>,
  requestHost?: unknown,
  forwardedHost?: unknown,
  requestOrigin?: unknown
): Stripe.Checkout.SessionCreateParams {
  if (!env.STRIPE_WEBHOOK_SECRET) throw new Error('Payment confirmation is not configured');
  const returnOrigin = trustedCheckoutOrigin(env, requestHost, forwardedHost, requestOrigin);
  const metadata = { userId, productId: PROFILE_BOOST_PRODUCT_ID };
  return {
    mode: 'payment',
    client_reference_id: userId,
    metadata,
    payment_intent_data: { metadata },
    allow_promotion_codes: false,
    line_items: [{
      price_data: {
        currency: 'eur',
        unit_amount: PROFILE_BOOST_AMOUNT_CENTS,
        product_data: { name: 'Aura Profile Booster — 12 godzin' }
      },
      quantity: 1
    }],
    success_url: `${returnOrigin}/boost/confirmation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${returnOrigin}/?boost=cancelled`
  };
}

export function isPaidProfileBoostSession(session: Pick<Stripe.Checkout.Session,
  'mode' | 'status' | 'payment_status' | 'client_reference_id' | 'metadata' | 'amount_total' | 'currency'
>): boolean {
  return session.mode === 'payment' &&
    session.status === 'complete' &&
    session.payment_status === 'paid' &&
    session.metadata?.productId === PROFILE_BOOST_PRODUCT_ID &&
    typeof session.client_reference_id === 'string' &&
    session.client_reference_id.length > 0 &&
    session.client_reference_id === session.metadata?.userId &&
    session.currency?.toLowerCase() === 'eur' &&
    session.amount_total === PROFILE_BOOST_AMOUNT_CENTS;
}

export type CheckoutConfirmationStatus = 'paid' | 'pending' | 'failed' | 'not_found';

export function checkoutConfirmationRedirect(status: CheckoutConfirmationStatus | 'unauthenticated'): string | null {
  if (status === 'paid') return null;
  if (status === 'pending') return '/payment/pending';
  if (status === 'unauthenticated') return '/?payment=signin';
  return '/?payment=unverified';
}

// Only Stripe's server-side Checkout Session response may authorize a paid result.
// The return URL, including its session_id parameter, is never proof of payment.
export function classifyCheckoutSession(
  session: Pick<Stripe.Checkout.Session, 'client_reference_id' | 'metadata' | 'mode' | 'status' | 'payment_status' | 'subscription'>,
  userId: string
): CheckoutConfirmationStatus {
  if (session.client_reference_id !== userId || session.metadata?.userId !== userId || session.mode !== 'subscription') {
    return 'not_found';
  }
  if (session.status === 'expired') return 'failed';
  if (session.status === 'complete' && session.payment_status === 'paid' && session.subscription) return 'paid';
  return 'pending';
}

export function isCheckoutSessionId(value: unknown): value is string {
  return typeof value === 'string' && /^cs_[A-Za-z0-9_]{8,255}$/.test(value);
}
