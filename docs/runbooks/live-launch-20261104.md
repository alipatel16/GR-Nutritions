# Live launch — 4 November 2026

This supersedes the payment-mode and domain status in `provider-setup.md` dated 2 November.

## Applied

- Owner confirmed `grnutritionsnikol.com` and requested domain cutover, live payments and shipment tracking.
- Changed registrar delegation from `pixel.dns-parking.com` / `byte.dns-parking.com` to GoDaddy's assigned `ns75.domaincontrol.com` / `ns76.domaincontrol.com`.
- Root A is exclusively `199.36.158.100`; removed the conflicting GoDaddy WebsiteBuilder record.
- `www` CNAME is `grnutritions.web.app`. Existing Firebase mapping redirects www to the root domain.
- Added Firebase ownership TXT and both provider-supplied ACME verification TXT records.
- Preserved Hostinger MX, SPF, three DKIM CNAMEs, autoconfig and autodiscover. GoDaddy's existing DMARC quarantine record remains; it differs from the previous Hostinger `p=none` record.
- Added root and www to Firebase Auth authorized domains without removing existing domains.
- Set backend `STORE_ALLOWED_ORIGINS` to include both custom HTTPS origins, both Firebase origins, existing Expo preview and localhost ports 8081/8082/8083/4173.
- Set server `STORE_PAYMENT_MODE=live`. Existing orders retain their original payment mode.
- Updated the public business website reference and deployed Firebase Hosting.

## Verified

- Registry delegation and both new authoritative nameservers respond with the prepared records.
- Custom-domain backend requests return HTTP 200 and the exact allowed origin.
- Staff connection checks: Razorpay test and live connections working; Shiprocket connection working; existing warehouse pickup matched.
- Razorpay live dashboard: new Supabase webhook Enabled; automatic capture configured (bank authorization within 12 minutes).
- Both payment webhook endpoints report configured and reject unsigned POSTs with HTTP 401.
- Admin confirms **Live checkout is active** after the server setting changed.
- Hosted customer checkout returns a Shiprocket courier quote, current prices and an enabled payment button without the test-mode label. No payment was submitted.
- Public backend checks pass: active-only catalog, private data and privileged operations protected, invalid identity rejected, allowed development origin accepted.
- Information-page tests: 2 passed; web export and Hosting deployment succeeded.

## Remaining external verification

At the last check, Firebase still reports ownership DNS unreachable / certificate validating. New authoritative DNS is correct, but recursive resolver results are mixed (some still return Hostinger CDN addresses). HTTPS must pass normal certificate validation before the custom domain is declared ready. Do not bypass certificate warnings. The existing `https://grnutritions.web.app` address remains available with live checkout during propagation.

Recheck:

```sh
dig grnutritionsnikol.com NS +short
dig @ns75.domaincontrol.com grnutritionsnikol.com A +short
dig @ns76.domaincontrol.com grnutritionsnikol.com TXT +short
curl -I https://grnutritionsnikol.com/
STORE_WEBSITE_URL=https://grnutritionsnikol.com node scripts/verify-hosting.mjs
```

No real charge, refund, shipment purchase or pickup booking was performed. A completed paid order and actual carrier scan have not been verified end to end in this launch.

## Shipment tracking operation

The existing integration is active with valid Shiprocket credentials and the matched pickup. Checkout checks courier availability using weight alone. For an eligible live order, staff enter the actual packed dimensions and create the shipment from admin, then assign the courier/AWB and arrange pickup in Shiprocket. Customers and staff can refresh tracking from the stored shipment ID. This is on-demand tracking; no automatic Shiprocket webhook or background tracking schedule is configured. Test orders cannot be shipped.

## Backups and rollback

- `domain-dns-before-cutover-20261104.json`: observed public Hostinger records, not a complete zone export.
- `godaddy-dns-before-cutover-20261104.txt`: exported GoDaddy zone before cutover.
- `godaddy-firebase-additions-20261104.txt`: imported ownership, certificate and preserved mail records.

For a requested rollback, restore registrar nameservers to the recorded Hostinger nameservers. Propagation also applies to rollback. Do not substitute snapshot Hostinger CDN IPs, which change. Restore `STORE_PAYMENT_MODE=test` only as a deliberate operational change; existing live orders must still be reconciled using their recorded mode. Keep the WordPress Razorpay webhook until older payments have been accounted for; do not delete it as part of DNS propagation troubleshooting.
