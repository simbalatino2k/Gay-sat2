# Local payment methods requested by owner
Updated 2026-09-22. Requirement: offer TWINT, Bizum, BLIK and Pix to eligible customers. Not activated or integration-tested yet.

| Method | Customer market / currency | Stripe recurring support at review |
| --- | --- | --- |
| TWINT | Switzerland / CHF | Supported; merchant capability must be active |
| Bizum | Spain / EUR | Not supported in subscription or setup mode |
| BLIK | Poland / PLN | Recurring is private preview; do not assume account access |
| Pix | Brazil / BRL | Subscriptions require Pix Automático and eligible merchant account; Brazil-account limitations apply |

Sources: https://docs.stripe.com/payments/twint , https://docs.stripe.com/payments/bizum , https://docs.stripe.com/payments/blik , https://docs.stripe.com/payments/pix .
Recheck documentation and actual Stripe account capabilities at implementation time.

Current server.ts limits Checkout to card, USD, mode=subscription. Merely adding four payment_method_types will not meet this requirement.
Implementation acceptance:
- Confirm merchant account country, active capabilities and approved business eligibility; configure test/live separately.
- Define owner-approved currency-specific prices server-side; never accept arbitrary client amount, currency or premium duration.
- Use supported localized Checkout methods only when eligible. Do not advertise all four as available worldwide.
- Offer fixed-duration prepaid Premium through one-time payment for Bizum and other methods without available recurring support. Label no automatic renewal explicitly.
- Keep recurring subscriptions for supported methods; build the correct mandate flow for Pix Automático and gated BLIK only when account supports it.
- Implement paid one-time entitlement fulfillment separately from subscription handling, using verified webhook amount/currency/product/user and authoritative payment status.
- Handle delayed success/failure, webhook retries and duplicates, refund/revocation, expiry, existing subscriptions and concurrent purchases. Never grant Premium from the browser success URL.
- Test each enabled method in appropriate currency, including failure/cancellation, duplicate webhook, refund and access after restart.
- TWINT onboarding requires a functional public website and operator details; current Coming Soon domain is a blocker.
- Do not change native store billing to external local methods without separately verifying the applicable distribution requirements.
A method is complete only when configured on the actual merchant account and tested end-to-end. Documentation alone is not activation.
