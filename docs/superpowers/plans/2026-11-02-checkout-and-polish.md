# Checkout and frontend repair implementation plan

> **For agentic workers:** Use isolated file ownership with superpowers:dispatching-parallel-agents, then root integration and fresh security review.

**Goal:** Complete the shopping payment/delivery flow and repair the concrete frontend defects before domain migration.
**Architecture:** Existing Expo app and Firebase identity use a Supabase-owned checkout and fulfilment API. Razorpay and Shiprocket secrets stay in Edge Functions. Browser/native SDK callbacks are verified on the server.
**Spec:** docs/superpowers/specs/2026-11-02-checkout-and-polish-design.md

## Global constraints

- INR integer paise; free delivery only above99900, otherwise5000; COD adds20000.
- Test orders tagged and isolated from live stock and shipping.
- No WordPress imports, live charges, courier purchases or DNS cutover while testing.
- Preserve approved palette/fonts, current role/ownership rules and source changes made by other workers.

## Review focus

- Ownership, amount/mode spoofing, callback/webhook duplication and late capture never oversell or ship unpaid orders.
- Ambiguous provider creation errors do not silently create duplicate payment/shipping operations.
- A changed cart/address/method invalidates previous delivery/payment state; cancellation/failure preserves cart.
- Native modules require a development build; web checkout is HTTPS script-loaded and handles cancellation/failure/timeout.
- Admin validation and money edits remain usable and accessible across editor steps, mobile and desktop.

## Tasks

- [x] Product worker: reproduce and repair product gallery, metadata and responsive alignment; verify meaningful regressions.
- [x] Admin/forms worker: compact editor, inline friendly validation, decimal-input preservation, packed shipping metadata; verify meaningful regressions.
- [x] Backend worker: quote, idempotent checkout/reservation, mode/ownership isolation, verified payments/COD, webhook reconciliation and deliberate staff shipping; PostgreSQL/provider-mocked security tests.
- [x] Root: checkout/orders/payment-launcher frontend, provider setup/readiness and shipment controls; test integration failures and cart preservation.
- [x] Root: run integrated tests, typecheck, lint, web/native bundles, browser desktop/mobile review; independent security review and fix serious findings.
- [x] Root: deploy verified backend, read-only provider tests, owner admin data/form checks; prepare a hosted website and exact pending domain steps.

## Verified deployment and release follow-up

Firebase Hosting chosen by owner for free custom-domain hosting: https://grnutritions.web.app. Supabase remains the store backend. Root/www Firebase mappings prepared; DNS unchanged, certificates/ownership pending. Existing WordPress stays live. Both Razorpay modes and Shiprocket authenticate; the registered pickup matches. Live admin orders read initially exposed a PostgreSQL alias ambiguity, now fixed via separate deployed migration and strict-setting regression.

135 frontend tests and 63 backend tests passed. Web/iOS/Android bundles pass; Deno entrypoints pass. Independent review's refund and payment-retry findings were fixed with regressions. Browser review caught and fixed mobile flex compression; owned admin data and invalid product forms were verified. This evidence does not claim an actual provider payment or device install.

- [ ] Owner inventory input: real products, photos, stock and measured packed dimensions, then live-catalog rebuild.
- [ ] Complete hosted test-mode online/COD checkout and actual signed provider delivery; verify automatic capture.
- [ ] Native development/release builds, OAuth platform IDs and device payment/login checks.
- [ ] Confirm commercial store policies, GST/invoices and operational refunds.
- [ ] Recreate required DNS records under owner control, cut over domain, verify HTTPS/login/checkout.
