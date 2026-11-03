# Provider and hosting status — 2 November 2026

Fresh inventory only: no WordPress products, customers or past orders are imported.

## Website hosting

The owner chose free hosting. The Expo single-page website is deployed to **https://grnutritions.web.app** with direct-route fallback and HTTPS. Firebase is used for authentication and static website delivery; **Supabase remains the PostgreSQL/Storage/Edge backend**. No Firebase Cloud Functions or paid Expo subscription is required.

Firebase Hosting Spark includes custom domains and SSL within its free usage quotas; it is not unlimited hosting. See [Firebase pricing](https://firebase.google.com/pricing). No billing plan was changed. The earlier Expo review URL remains an earlier preview; use the Firebase URL for this milestone.

`firebase.json` uploads only `dist`, excludes source maps and hidden files, and sets MIME, framing, referrer and limited browser-permission headers. Deploy only Hosting, never the entire Firebase project:

```sh
npx expo export --platform web
firebase deploy --only hosting --project grnutritions
node scripts/verify-hosting.mjs
```

The current build intentionally uses the sample catalog. Add real products, actual packed dimensions and stock in admin before changing `EXPO_PUBLIC_CATALOG_MODE=live` and rebuilding. Sample products cannot become server orders because the backend requires real published catalog IDs.

Expo puts bundled fonts and navigation images under `dist/assets/node_modules`. These are public compiled assets; do not exclude nested `node_modules` paths from the dist-only upload. The deployment smoke script compares the six hosted font files against the export bytes, since a 200 SPA fallback response can otherwise conceal a missing file.

## Domain migration

Domain: **grnutritionsnikol.com**, registrar GoDaddy. Current nameservers are Hostinger's `byte.dns-parking.com` and `pixel.dns-parking.com`. The owner has only WordPress wp-admin on the other person's shared Hostinger account. GoDaddy registration access does not currently provide control over the authoritative Hostinger zone.

Firebase now has prepared domain mappings for the root and `www`; `www` will redirect to the root. Ownership and certificates are pending DNS verification. **No nameserver or live DNS record was changed; WordPress is still live.**

Exact Firebase responses are saved in `firebase-domain-requirements.json`. The current eventual routing is:

| Type | GoDaddy name | Value |
| --- | --- | --- |
| A | @ | 199.36.158.100 |
| TXT | @ | hosting-site=grnutritions |
| CNAME | www | grnutritions.web.app |

Firebase also supplied certificate-verification TXT records under `_acme-challenge` and `_acme-challenge.www`; refresh the provider requirements before using their time-sensitive values.

Before a planned cutover: refresh the public DNS snapshot; reproduce required existing records in a GoDaddy-managed zone, retaining known MX/SPF/DMARC; verify whether any additional subdomains/records are needed; then switch nameservers and replace only website routing records. Remove conflicting old root A/AAAA and old www CNAME. Add the exact final HTTPS root/www origins to commerce CORS and Firebase authorized domains. Verify DNS, certificates, login, catalog and checkout before declaring migration complete. Keep the previous zone/nameservers recorded for rollback.

The owner uses Gmail only and has no domain mailbox to move. That does not justify silently dropping existing DNS records. `domain-dns-baseline.json` is only a public snapshot, not a full zone export; Hostinger CDN IPs change.

## Razorpay

Configured secret names:
- `RAZOR_PAY_TEST_API_KEY`, `RAZOR_PAY_TEST_SECRET_KEY`, `RAZOR_PAY_TEST_WEBHOOK_SECRET`
- `RAZOR_PAY_LIVE_API_KEY`, `RAZOR_PAY_LIVE_SECRET_KEY`, `RAZOR_PAY_LIVE_WEBHOOK_SECRET`

The owner confirmed test/live webhook dashboard setup. URLs:
- Test: https://wfibeisijbftvldgjgdb.supabase.co/functions/v1/razorpay-webhook-test
- Live: https://wfibeisijbftvldgjgdb.supabase.co/functions/v1/razorpay-webhook-live

Subscribe to payment.captured, payment.failed, order.paid and refund.processed. Use the matching mode's webhook secret, separate from API secrets. Preserve the existing WordPress webhook while that store is live.

Both deployed endpoints report configured and reject unsigned requests. Staff-only read checks confirmed **both test and live Razorpay API authentication work**. This is not evidence of an actual successful payment. Checkout stays in **test mode** unless server `STORE_PAYMENT_MODE` is deliberately changed. Confirm merchant automatic capture, then complete a real test-mode payment against actual inventory before live activation.

Captured payments are independently checked against the stored order, amount, currency and mode. Refunds flag non-shippable review, including refunds received after payment. A callback alone never confirms a sale. See `checkout-backend.md` for idempotency, expiration and ambiguous-provider recovery.

## Shiprocket

Configured API user: the owner's saved `SHIPROCKET_API_EMAIL` and API-user password in `SHIPROCKET_API_KEY`. Staff read checks confirmed authentication works.

The signed-in Shiprocket panel shows one **VERIFIED**, primary pickup:
- Code/name: `warehouse`
- Ground Floor B/4 Shantiniketan Business Hub, Ahmedabad, Gujarat, India 382350
- Contact: Rohit Tomar, 7490020905

This corresponds to the owner's supplied GR Nutritions address near Gangotri Circle, Nikol. Matching requires the exact pincode, B/4, Shantiniketan Business Hub and either the locality or the exact merchant phone; no arbitrary warehouse is created. An optional exact `SHIPROCKET_PICKUP_LOCATION` can select an existing registered pickup name.

Shipping availability is checked server-side using real packed weight/dimensions and an owned address. Customer fees are fixed: free strictly above ₹999, otherwise ₹50; COD adds ₹200. COD additionally requires verified account email. The selected address and signed billing email are frozen into the order.

Staff explicitly create a Shiprocket fulfillment order for eligible live orders. Courier/AWB purchase and pickup booking are completed in Shiprocket; they are not automatically purchased by the app. Customer and staff tracking refresh uses the stored shipment ID. Test orders cannot ship.

## Verification and release limits

The deployed database enforces service-only checkout, customer ownership, staff access, stock reservations and exact paise totals. Anonymous/authenticated direct checkout RPCs are denied. Supabase's private-schema RLS summary warning was investigated: both client roles have no private-schema usage or table access. The active-only public catalog function and no-client-policy tables are intentional; see [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security).

Offline provider transport and PostgreSQL tests cover successful checkout, refunds/replays, ownership, stock expiration, invalid payments, test isolation and shipping gates. Public live smoke checks pass. The owner admin session was used for live data/settings and read-only provider checks.

Still required before live selling: fresh inventory/photos/packed dimensions; complete hosted test-mode checkout and signed provider delivery; native development/release builds and device payments/Google OAuth; GST/invoice, return/refund and store policy decisions; final domain DNS/HTTPS cutover. GR Coach remains guided catalog matching, not a conversational AI backend.

References: [Razorpay webhooks](https://razorpay.com/docs/webhooks/validate-test/), [Shiprocket API](https://apidocs.shiprocket.in/), [Firebase custom domains](https://firebase.google.com/docs/hosting/custom-domain).
