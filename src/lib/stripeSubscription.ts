import type Stripe from 'stripe';

export type StripeSubscriptionRecord = {
  subscriptionId: string;
  planId: string;
  status: string;
  currentPeriodEnd?: Date;
};

export interface StripeSubscriptionStore {
  getUserById(userId: string): Promise<{ id: string } | null>;
  findUserByStripeCustomerId(customerId: string): Promise<{ id: string } | null>;
  findUserByStripeSubscriptionId(subscriptionId: string): Promise<{ id: string } | null>;
  getStripeSubscriptionByUserId(userId: string): Promise<StripeSubscriptionRecord | null>;
  recordStripeSubscription(
    userId: string, customerId: string, subscriptionId: string, planId: string,
    status: string, periodEnd?: Date, autoRenew?: boolean
  ): Promise<unknown>;
}

function objectId(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && typeof (value as { id?: unknown }).id === 'string') {
    return (value as { id: string }).id;
  }
  return null;
}

export function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  // Invoice.subscription was removed in recent Stripe API versions.
  const details = invoice.parent?.subscription_details;
  return objectId(details?.subscription || (invoice as Stripe.Invoice & { subscription?: unknown }).subscription);
}

export function paidInvoicePeriodEnd(invoice: Stripe.Invoice, subscriptionId: string): Date | undefined {
  const ends = invoice.lines?.data
    .filter(line => line.parent?.type === 'subscription_item_details' &&
      !line.parent.subscription_item_details?.proration &&
      objectId(line.parent.subscription_item_details?.subscription || line.subscription) === subscriptionId)
    .map(line => line.period.end)
    .filter(end => Number.isFinite(end) && end > 0) || [];
  return ends.length ? new Date(Math.max(...ends) * 1000) : undefined;
}

export function stripeSubscriptionPeriodEnd(sub: Stripe.Subscription): Date | undefined {
  const itemEnds = sub.items?.data.map(item => item.current_period_end).filter(end => Number.isFinite(end) && end > 0) || [];
  const legacyEnd = (sub as Stripe.Subscription & { current_period_end?: number }).current_period_end;
  const end = itemEnds.length ? Math.max(...itemEnds) : legacyEnd;
  return end && Number.isFinite(end) ? new Date(end * 1000) : undefined;
}

function stripePlanId(sub: Stripe.Subscription, env: NodeJS.ProcessEnv, previousPlan?: string): string {
  const pricePlans: Record<string, string | undefined> = {
    aura_vip_monthly: env.STRIPE_PRICE_MONTHLY,
    aura_vip_three_month: env.STRIPE_PRICE_THREE_MONTH,
    aura_vip_annual: env.STRIPE_PRICE_ANNUAL
  };
  for (const [planId, priceId] of Object.entries(pricePlans)) {
    if (priceId && sub.items?.data.some(item => item.price?.id === priceId)) return planId;
  }
  for (const planId of [sub.metadata?.planId, previousPlan]) {
    if (planId && Object.hasOwn(pricePlans, planId)) return planId;
  }
  throw new Error(`Unable to identify plan for Stripe subscription ${sub.id}`);
}

/** Re-read the subscription so delayed webhooks converge on Stripe's current state. */
export async function syncStripeSubscription(
  stripe: Pick<Stripe, 'subscriptions'>,
  store: StripeSubscriptionStore,
  subscriptionId: string,
  options: { checkoutUserId?: string; checkoutCustomerId?: string; checkoutPaid?: boolean; paidThrough?: Date; paidInvoiceId?: string } = {},
  env: NodeJS.ProcessEnv = process.env
): Promise<string | null> {
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const customerId = objectId(sub.customer);
  if (!customerId) throw new Error(`Stripe subscription ${subscriptionId} has no customer`);
  if (options.checkoutCustomerId && options.checkoutCustomerId !== customerId) {
    throw new Error('Checkout customer does not match Stripe subscription');
  }
  if (options.checkoutUserId && sub.metadata?.userId && options.checkoutUserId !== sub.metadata.userId) {
    throw new Error('Checkout user does not match Stripe subscription');
  }
  if (options.paidThrough && sub.status !== 'active' && sub.status !== 'trialing') {
    // Stripe may deliver invoice.paid before the subscription status catches up.
    // Retry only for its latest invoice; an older paid invoice must not restore access.
    if ((sub.status === 'past_due' || sub.status === 'incomplete') &&
        options.paidInvoiceId && objectId(sub.latest_invoice) === options.paidInvoiceId) {
      throw new Error(`Stripe subscription ${subscriptionId} has not activated after payment`);
    }
    return null;
  }

  const bySubscription = await store.findUserByStripeSubscriptionId(subscriptionId);
  const byMetadata = sub.metadata?.userId ? await store.getUserById(sub.metadata.userId) : null;
  const byCheckout = options.checkoutUserId ? await store.getUserById(options.checkoutUserId) : null;
  const byCustomer = await store.findUserByStripeCustomerId(customerId);
  const user = bySubscription || byMetadata || byCheckout || byCustomer;
  if (!user) return null;
  for (const knownOwner of [bySubscription, byMetadata, byCheckout, byCustomer]) {
    if (knownOwner && knownOwner.id !== user.id) {
      throw new Error('Stripe subscription owner mismatch');
    }
  }

  const previous = await store.getStripeSubscriptionByUserId(user.id);
  // A late event for an old subscription cannot replace a newer Checkout purchase.
  if (previous?.subscriptionId !== subscriptionId && previous && !options.checkoutUserId) return null;
  if (options.paidThrough && options.paidThrough.getTime() <= Date.now()) return null;
  if (options.paidThrough && previous?.status === 'active' && previous.currentPeriodEnd &&
      previous.currentPeriodEnd.getTime() >= options.paidThrough.getTime()) return null;

  const stripePeriodEnd = stripeSubscriptionPeriodEnd(sub);
  let status = sub.status;
  let periodEnd: Date | undefined;
  if (sub.status === 'trialing' || options.checkoutPaid) {
    periodEnd = stripePeriodEnd;
  } else if (sub.status === 'active' && options.paidThrough) {
    periodEnd = options.paidThrough;
  } else if (sub.status === 'active') {
    // A status update alone does not prove that the next invoice was paid.
    // Keep the previously paid period, including when cancellation is scheduled.
    if (previous?.status === 'active' && previous.currentPeriodEnd && previous.currentPeriodEnd.getTime() > Date.now()) {
      periodEnd = previous.currentPeriodEnd;
    } else {
      status = 'incomplete';
    }
  } else {
    periodEnd = previous?.currentPeriodEnd;
  }
  if ((status === 'active' || status === 'trialing') && (!periodEnd || periodEnd.getTime() <= Date.now())) {
    throw new Error(`Stripe subscription ${subscriptionId} has no future billing period`);
  }
  const planId = stripePlanId(sub, env, previous?.planId);
  await store.recordStripeSubscription(
    user.id, customerId, subscriptionId, planId, status, periodEnd,
    !sub.cancel_at_period_end && sub.status !== 'canceled'
  );
  return user.id;
}
