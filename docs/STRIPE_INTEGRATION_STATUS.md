# Stripe integration status

Owner selected Simba (Switzerland). The last live read showed charges and payouts enabled. No live payments were initiated. TWINT/Bizum/BLIK/Pix were unavailable in the inspected configurations.

## Changes

Checkout requires configured recurring STRIPE_PRICE_MONTHLY / STRIPE_PRICE_ANNUAL identifiers and STRIPE_WEBHOOK_SECRET. APP_BASE_URL must be a trusted HTTPS origin; request headers cannot choose payment redirect destinations. Unknown plan IDs fail. Ownership metadata is also attached to the subscription. Eligible payment methods are selected dynamically by Stripe rather than hardcoding cards.

Webhook processing records completion after handling, awaits subscription persistence and uses PostgreSQL for processed-event checks. Checkout events must indicate a paid subscription before granting access. Unified entitlement persistence is awaited. These corrections are not a complete ordered/atomic event-processing implementation: concurrent delivery and stale/out-of-order subscription events still require integration testing and hardening.

## Deployment blockers

- Owner must confirm prices/currency; current live catalogue contains no recurring prices. Do not guess or repurpose unrelated one-time prices.
- Existing Stripe webhook points to the AI Studio editor instead of the backend. After verifying production deployment, configure the HTTPS backend /api/payments/webhook route and matching signing secret in Google Secret Manager. Include checkout.session.completed, checkout.session.async_payment_succeeded and customer.subscription.created/updated/deleted events used by the handler; review invoice event handling before launch.
- Restricted Stripe key, matching signing secret and Price IDs must belong to the same account/environment. No secrets belong in GitHub or chat.
- Confirm tax registrations and tax treatment before enabling automatic tax or selling subscriptions.
- Verify subscription creation, renewal, cancellation, failed payments, delayed/repeated/out-of-order events and restart on live PostgreSQL using a Stripe test environment before enabling sales. Existing renewal handling remains incomplete.
- No production deployment, secret provisioning, webhook mutation or complete payment integration test has occurred.

Local checkout and persistence regression tests pass, alongside existing isolated suites. They use mocks/local storage and do not demonstrate a successful real purchase.
