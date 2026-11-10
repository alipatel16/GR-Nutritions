# Catalog and coupon release — 10 November 2026

Published to Supabase project `wfibeisijbftvldgjgdb` and Firebase Hosting site `grnutritions` from `/Users/alipatel/Documents/ChatGPT/GR Nutritions`.

## Catalog additions

| Brand | Products | Size/flavour options | Photos |
| --- | ---: | ---: | ---: |
| Avvatar | 14 | 98 | 56 |
| TrueBasics | 20 | 44 | 80 |
| Kapiva | 25 | 62 | 100 |
| QNT | 24 | 81 | 76 |
| Anabolic Research | 20 | 38 | 63 |
| Americanz Muscles | 7 | 36 | 28 |
| NOW Foods | 25 | 28 | 77 |
| International Protein | 4 | 15 | 13 |
| Scitec Nutrition | 2 | 7 | 7 |
| TruNativ | 1 | 1 | 4 |
| Hypertrophy | 5 | 5 | 19 |
| Pintola | 11 | 56 | 44 |
| MaaMade | 1 | 1 | 2 |
| RiteBite Max Protein | 4 | 5 | 16 |
| **Total added** | **163** | **477** | **585** |

Before publishing: 272 product records, of which 271 were active. After publishing: 435 records and **434 active products**. All 477 imported options had the owner-approved stock of 100 at verification. The import stopped on any existing product ID; no existing product IDs or variants collided. Photos were uploaded previously; all 585 storage paths and byte sizes were checked before publishing. The import used the existing `admin_action` media registration and product validation inside one explicit transaction. Do not rerun the full import on existing products to refresh copy: it carries the original stock values.

All fourteen brand logos were added. Live HTTPS responses for each logo and one representative photo per brand matched the prepared files byte for byte. The signed-in browser showed the new brand directory and Avvatar filtering returned fourteen products.

## Source scope and limitations

Provenance, source URLs, exclusions and image hashes are retained in each `catalog-import/<brand>/sources.json`. Source collection began on 5 November; publication was completed on 10 November. Imported offers are snapshots, not an ongoing price or supplier-stock synchronization.

- NOW Foods and Kapiva additions are wellness items. Pintola additions are oats/peanut butter, MaaMade is oats, and RiteBite Max Protein is bars/wafers.
- Galleries use genuine source assets. Most have three or four images; MaaMade's oats source supplied only two. Some images are nutrition/ingredient panels, pack variants or brand size-reference graphics rather than different camera angles.
- NOW Foods uses its authentic sun brand icon, with the NOW Foods caption below it.
- Where documented official MRP was the available reliable price, it is also the selling price, without a claimed markdown. Foreign prices were not converted into invented INR offers.
- Nonstandard steroid/prohormone/SARM listings were excluded from Hypertrophy. Americanz Super Burn and a conflicting Freak Gainz flavour were also held out; see source notes.
- A duplicate supplier SKU was replaced with distinct internal NOW Foods SKUs. Default Pintola textures/pack sizes and International Protein's amino flavour were aligned with their first gallery photos.
- Avvatar's Creatine feature tile described pack weight, not a serving amount, so it was removed from nutrition facts. Its Mass Gainer webpage gave inconsistent serving figures; the photographed Belgian Chocolate back label was used instead: 13.5 g protein, 38 g carbohydrate and 218 kcal per 60 g in water. The two copy corrections went through `admin_action` with current authoritative stock/prices and a transaction assertion that inventory remained unchanged. Their final public descriptions were verified.

## Coupons

Admin → Coupons provides searchable definitions, generated or manually entered codes, percentage/fixed discounts, minimum spend, an optional percentage discount cap, start/expiry in India time, aggregate use limits and enable/disable. Customers apply/remove a code at checkout and see the server-returned discount.

Each coupon can be redeemed once per signed-in customer. Completed uses and pending payment holds count toward its total limit. Definite failed or expired unpaid reservations release capacity; successful payments and COD consume it. Refunds retain the use. Test usage is separate from live usage. Discounts apply to merchandise and leave at least ₹1 merchandise payable. See `checkout-backend.md` for lifecycle and recovery details.

The coupon migration was applied in an explicit transaction without changing prior migration history. Commerce and both payment webhook functions were deployed before the website. **Zero promotional coupons were created or activated.** Only admin chooses promotions.

## Verification

- Typecheck passed; 39 frontend suites / 174 tests passed; 97 backend/importer tests passed; web export succeeded.
- Independent coupon review reported no critical or important findings before deployment.
- Live public catalog returned all 163 new product IDs, their expected option counts and all expected gallery storage paths; database totals matched the table above.
- Live coupon tables had RLS enabled. Anonymous/authenticated roles were denied the checkout RPC; service-only execution remained allowed. Existing direct private-table and identity-spoofing smoke checks passed.
- Both test/live Razorpay webhook endpoints reported configured and rejected unsigned requests. No real payment or shipment was created.
- HTTPS routes/security headers, all six font files, all fourteen new logos and all 21 JavaScript bundles matched the tested export.
- Signed-in live admin displayed the new Coupons tab, an empty coupon list and the create form. The form was cancelled. Native browser automation later timed out during additional product/customer-checkout inspection; customer coupon interaction is covered by automated tests, not a completed manual live payment test.
- Security advisors added only the two intentional private-table “RLS enabled, no policy” information notices. The pre-existing public active-only catalog RPC warnings remained unchanged; no new warning/error-level finding was introduced.

PGlite tests use one serialized database connection. Independent production sessions were not load-tested; do not describe the capacity rules as production stress-tested. No live sample coupon, order, charge or shipment was created for this release.
