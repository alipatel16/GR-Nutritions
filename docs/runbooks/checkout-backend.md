# Checkout backend

## Boundary and fees

The commerce Edge Function verifies the existing Firebase token and uses its signed UID, email and strict boolean email-verification claim. Customer SQL tables remain unavailable to browser roles. New checkout RPCs are service-only; staff authority comes from `private.staff_memberships`. The old implementation entrypoints were renamed and revoked from every client/service role, with the new wrappers retaining catalog/address behavior.

All money is integer INR paise. Merchandise subtotal **strictly above 99900** has free delivery; otherwise delivery is 5000. COD adds a separate 20000; Razorpay adds no COD fee. Provider courier prices do not change these customer fees.

`STORE_PAYMENT_MODE` defaults to `test`; invalid values fail closed. Caller mode, prices, payment status, warehouse, tracking IDs and totals are ignored or rejected. Test orders are explicitly tagged and never reserve/decrement live inventory or create shipments. A Razorpay key must have the matching `rzp_test_`/`rzp_live_` prefix.

## Server configuration

Existing names are preserved:

- `RAZOR_PAY_TEST_API_KEY`, `RAZOR_PAY_TEST_SECRET_KEY`, `RAZOR_PAY_TEST_WEBHOOK_SECRET`
- `RAZOR_PAY_LIVE_API_KEY`, `RAZOR_PAY_LIVE_SECRET_KEY`, `RAZOR_PAY_LIVE_WEBHOOK_SECRET`
- `SHIPROCKET_API_EMAIL`, `SHIPROCKET_API_KEY` (API user's password)
- Optional `SHIPROCKET_PICKUP_LOCATION`: exact registered pickup code/name, never an arbitrary address
- `STORE_PAYMENT_MODE=test` until an explicit merchant live switch

Readiness is available to staff through `integration.status`; it returns only mode and booleans. Razorpay booleans mean API credential-pair presence; each webhook's existing GET endpoint separately reports webhook-secret presence. No server secret is sent to a client. Provider requests, customer addresses and credentials are never logged by these modules.

Pickup must already exist in Shiprocket: GR Nutritions, B/4 Shantiniketan Business Hub, Near Gangotri Circle, Nikol, Ahmedabad, Gujarat 382350; phone 7490020905. Automatic matching requires the pincode, exact B/4 unit and Shantiniketan Business Hub, plus either Nikol/Gangotri locality or merchant phone 7490020905 from the registered `phone`/`mobile` field (optional +91 formatting). This matches the verified registered `warehouse` pickup's shorter street address without changing that address. Multiple matches or no match fail clearly. An explicit pickup name still must exist in the active registered list. No fallback warehouse or registration API is used.

Billing email comes only from the signed Firebase identity, never checkout payloads or saved-address fields. Delivery requires a valid signed email address. COD additionally requires `email_verified === true`; online checkout can use a valid signed, unverified email. The quote binds that email into the immutable order address used as Shiprocket `billing_email`. Shipping refuses missing/invalid immutable email before any provider request. The address editor/schema remains unchanged.

Each sellable option needs actual `shipping` measurements: packed `weightGrams` (integer 1–100000), `lengthCm`, `widthCm`, `heightCm` (>0.5 and <=200). Net product weight is separate. Missing measurements refuse checkout. One parcel uses maximum length and width, sum of height × quantity and sum of packed weight × quantity. Total weight <=100kg, stacked height <=200cm and merchandise subtotal <=100000000 paise. Carts outside these limits require store assistance; no dimensions are invented.

## Action contracts

All use the existing signed-in `storeRequest(action,payload)` route:

- `checkout.delivery({addressId,items,paymentMethod})`: owned address, authoritative active products/stock/prices and server Shiprocket serviceability. Returns `quoteId,mode,currency,subtotalPaise,shippingPaise,codFeePaise,totalPaise,expiresAt,items,delivery`. `delivery` is `{courierId,courierName,estimatedDays}`. Quote expires in five minutes and stores immutable address/items/prices/packaging/pickup/mode/method.
- `checkout.create({quoteId,requestKey})`: requestKey 8–100 alphanumeric/underscore/hyphen characters. Returns `{id,status,paymentMethod,mode,amountPaise,currency,razorpayOrderId?,keyId?}`. COD becomes `cod_confirmed`, never `paid`. Razorpay key ID appears only with an attached PSP order that is still payable.
- `checkout.verify({orderId,razorpay_payment_id,razorpay_signature})`: owner-only; HMAC uses the stored PSP order and its mode secret. Independently fetches the payment and checks ID, order, full amount, INR and captured status. Authorized-only stays pending. Returns `{id,status,paymentMethod,mode,totalPaise,tracking?}`.
- `order.status({id})`: owner-only; reconciles captured provider payments when callback is missing. Same compact summary. `orders.list` additionally includes mode/method/fees and tracking.
- `shipment.create({orderId})`: staff-only and live, paid or COD-confirmed/processing with committed inventory. Creates a custom fulfillment order using immutable snapshots and unique `gr-<local UUID>` channel order ID. Returns compact order summary and tracking if attached. No AWB purchase, courier allocation, label purchase or pickup scheduling occurs.
- `shipment.sync({orderId})`: owner or staff; reads only the stored shipment ID. Actual provider movement/delivery advances state; AWB allocation and pickup scheduling do not. Delivered state cannot regress to shipped.
- `integration.status({})`: staff-only `{mode,razorpay:{testConfigured,liveConfigured},shiprocket:{configured}}`.
- `integration.check({})`: staff-only read-only diagnostics, returning `{mode,razorpay:{testConnected,liveConnected},shiprocket:{connected,pickupMatched}}`. It authenticates Razorpay using GET `/v1/orders?count=1` for each mode and discards fetched content; Shiprocket uses login and the existing-pickups GET. Pickup matching uses the same registered-location rules. Failures return false booleans; no raw response, credentials, order data or pickup details are returned. It never creates orders, shipments, AWBs or pickups.

`order.advance` now permits only paid/COD-confirmed live orders to `processing`. Shipped/delivered advancement requires provider tracking sync.

## Inventory and recovery

Live Razorpay orders reserve stock for fifteen minutes. COD commits stock immediately. A shared PostgreSQL transaction advisory lock serializes checkout, release, late capture and staff inventory saves; row locks and unique quote/request/provider identities prevent duplicate order/payment application. Product timestamps change with inventory so stale staff forms cannot restore old stock. Removing an option with a held reservation is rejected.

Expiration runs transactionally on catalog, checkout/order and staff product reads, plus inventory saves, releasing each held reservation once. There is no external scheduler requirement: expired capacity is reclaimed before the next operation that needs stock. A cron job may call `private.expire_reservations()` with privileged access if prompt background cleanup is desired. Expired quotes are retained for order provenance; retention cleanup is not installed.

A late captured payment reacquires all stock atomically or enters `payment_review`, which cannot ship. Repeating a valid callback, order-status reconciliation or webhook never decrements twice. Any provider-confirmed partial/full refund enters `payment_review`, including orders previously paid or processing. Standard refund events are resolved from their payment ID by a mode-bound provider GET, then matched to an exact local PSP order, stored payment identity, amount and INR currency. A persistent `refund_review` flag prevents stale captured callbacks, webhook replays or tracking sync from clearing that review. Existing shipment metadata and committed inventory are retained; no automatic restock, shipment cancellation or new refund request occurs. Unmapped legacy refund events remain unmatched; review and any fulfillment cancellation/restock require explicit merchant action.

Razorpay **automatic capture must be configured**. This integration does not call capture or refunds. An `authorized` payment remains `payment_pending`; it is never reported as paid.

Provider creation is deliberately conservative. Each local order gets one durable creation lease before the outbound POST. No universal Razorpay idempotency header is assumed. Definite input/auth rejection releases a live reservation and marks `payment_failed`. Timeout, network failure, malformed success, process crash or ambiguous provider/database attachment failure stays `creating`/`unknown` and cannot issue another POST on retry. Customers can inspect their saved order. Stock expires safely; later capture can still review/reacquire after verified mapping.

To recover ambiguous payment creation, an authorized operator must inspect Razorpay using the **exact local UUID receipt**, verify merchant mode, amount, currency and source note, then attach that one PSP order via the service-only `checkout_action('','order.attach',...)` with the verified provider values. Fetch and reconcile provider payment afterward. Do not create another Razorpay order to resolve an uncertain POST. If a provider order cannot be identified uniquely, leave the order in review/pending and investigate. The current staff UI does not automate this privileged recovery.

Shiprocket custom order IDs are unique. Definite preflight/creation rejection can retry after correction; uncertain creation never repeats POST automatically. For an uncertain shipment, inspect Shiprocket by exact channel order ID `gr-<local UUID>` and attach the existing `order_id`/`shipment_id` via service-only `shipment.attach` after verification. Do not create another shipment or request AWB/pickup as recovery. The staff UI does not automate this privileged recovery.

Statuses: `payment_pending`, `payment_expired`, `payment_review`, `payment_failed`, `cod_confirmed`, `paid`, `processing`, `shipped`, `delivered`. Legacy `pending`, `cancelled`, `refunded` remain accepted for existing data. Test/live mode always accompanies customer summaries.

## Webhooks and verification

Both existing Razorpay webhook endpoints preserve raw-body HMAC verification and bounded input. They durably ingest the minimal receipt first, then independently fetch provider data and reconcile only an exact stored PSP order + mode mapping. Replays reconcile again to recover transient failures. Unmapped WordPress/account events are `unmatched`; no app sales are imported. Transient provider/DB failures mark failed where possible and return 503 so Razorpay retries. Successful events are `processed`; no webhook creates shipments.

`node --test supabase/tests/*.test.mjs` runs security, provider-transport and real PGlite/PostgreSQL SQL tests, including an entire Edge checkout and signed replayed webhook against SQL state. Provider APIs are substituted at their transport boundary; no provider writes or live credentials are used. PGlite is one database connection, so the oversell test exercises concurrent promises and SQL guards, not separate real Postgres sessions. A deployed concurrency/load test remains desirable before substantial live volume.

Deploy the migration before the new Edge bundles. Existing migration files remain unchanged. The billing-email follow-up is included in the same migration before its first deployment. Root integration owns deployment and read-only provider readiness checks. No provider account writes have been performed by the backend implementation task.

Primary references checked: [Supabase Edge secrets](https://supabase.com/docs/guides/functions/secrets), [Razorpay Orders](https://razorpay.com/docs/api/orders/create/), [payment fetch](https://razorpay.com/docs/api/payments/fetch-with-id/), [order payments](https://razorpay.com/docs/api/payments/fetch-payments-orders/), [read-only orders diagnostics](https://razorpay.com/docs/api/orders/fetch-all/), [Shiprocket API](https://apidocs.shiprocket.in/).

## Deployed alias correction

Migration `20261102181911_fix_admin_order_alias_ambiguity.sql` replaces only the customer/admin wrappers to separate PL/pgSQL row variables from SQL table aliases. The deployed original migration remains immutable. The SQL suite sets `plpgsql.variable_conflict=error` and covers admin/customer order lists, ownership, staff denial and processing transitions; the new wrappers also pin that compile rule explicitly.

## Admin coupons (implemented 2026-11-05; deployed 2026-11-10)

`20261105135303_admin_checkout_coupons.sql` was created with `supabase migration new` and applied in an explicit transaction on 10 November 2026. `commerce`, `razorpay-webhook-test`, `razorpay-webhook-live` and Firebase Hosting were then deployed. Existing remote migration history was not repaired or rewritten. No coupon records or provider transactions were created. The four replaced checkout definitions matched the local pre-coupon definitions immediately before deployment; their existing stock, provider identity, refund review, email and legacy packed-weight behavior is retained.

Staff-only actions use the existing verified Firebase identity and `private.staff_memberships` in both Edge and SQL:

- `coupon.adminList({search?:string})` returns `{coupons:CouponAdmin[]}`. Search matches normalized code text.
- `coupon.save({id?:string,code,type,value,minSpendPaise,maxDiscountPaise,startsAt,expiresAt,usageLimit,enabled})` creates or updates one definition and returns `CouponAdmin`. `type` is `percentage` or `fixed`. `value` is percent or rupees respectively, with at most two decimal places. Percentage is greater than zero and at most 100. Fixed value is greater than zero and at most ₹10,00,000. Codes normalize to uppercase and use 3–32 letters, digits, underscores or hyphens. Spend/discount fields are integer paise from zero to 100000000; an optional discount cap must be positive and applies only to percentage coupons. `startsAt` is nullable; `expiresAt` is required. Both are ISO timestamps with a timezone; start must precede expiry. `usageLimit` is an integer 1–1000000 and cannot drop below existing uses plus reservations. Disable a coupon to stop new uses; deletion is not exposed.
- `CouponAdmin` includes the saved fields plus `id,version,createdAt,updatedAt,usedCount,reservedCount,remainingCount`. Dates return ISO timestamps, including null `startsAt`. Usage counters show live mode. Test checkouts enforce a separate capacity/once-per-customer ledger so testing cannot exhaust a live promotion. Every coupon has a fixed one-use limit per signed-in Firebase UID in each mode.

`checkout.delivery` accepts optional `couponCode` and returns `couponCode,discountPaise,discountedSubtotalPaise` alongside existing quote fields. `checkout.create` still accepts only its quote ID and idempotency key. Coupon definitions, customer identity, discounts and counters are never accepted from customer input. Order list snapshots include coupon fields when present; existing orders without coupons retain their prior summary shape. Shiprocket gets the immutable merchandise subtotal and exact discount separately as `sub_total` and `total_discount`; Razorpay amount validation uses the final discounted payable paise.

Discounts affect merchandise only, round percentage discounts down to a whole paise and leave at least ₹1 merchandise payable. Delivery is free only when **discounted merchandise is strictly above ₹999**; otherwise shipping is ₹50, and COD still adds ₹200. Applying, changing or removing a coupon requires a new server delivery quote. Quote storage and order creation recompute eligibility, prices, time window and capacity. Definition edits that change the computed context reject an old quote. Accepted order money snapshots remain unchanged by subsequent edits, disablement or expiry.

Private coupon and redemption tables have RLS enabled, no browser grants and no direct service-role table grants. Internal helper execution is revoked; only the existing service-only checkout RPC reaches them. The checkout/inventory transaction advisory lock also serializes coupon management, allocation, expiry and captured-payment settlement. A partial unique index prevents concurrent active uses by the same customer and mode. Both pending holds and completed uses count toward capacity; COD consumes its use immediately. Online checkout holds capacity for 15 minutes in either mode. Definite unpaid provider creation failure and expired unpaid holds release capacity exactly once. Ambiguous creation keeps the hold until its normal expiry. Reusing the quote/request key returns the same order without an additional allocation.

Confirmed capture consumes a use once; refunds retain it. A late capture after release reacquires capacity only if the global and customer limits still allow it. Otherwise it enters `payment_review`, cannot ship, and does not silently increase coupon usage. Merchant review/refund decisions remain manual. Expired capacity is reclaimed on the same reads/checkout operations as stock; no scheduler is required.

Verification on 10 November: typecheck, 174 frontend tests, 97 backend/importer tests and the web export passed. Coverage includes staff denial and direct browser-role denial, integer math and percentage caps, timezone expiry, minimum spend and discounted delivery boundary, cross-customer last-use attempts, customer-once enforcement, idempotent retries, failure/expiry release, late capture review/reacquisition, refund retention, immutable snapshots, Edge-to-SQL COD flow and exact provider invoice/amount mapping. The live signed-in admin loaded the empty Coupons list and the create form with code generation, discount, minimum/cap, start/expiry, total limit and enabled controls. The form was cancelled without saving. Live checks confirmed private access denial, both webhook signatures, six hosted font files, and all 21 deployed JavaScript bundles matching the tested export. PGlite serializes a single connection; a separate-session production concurrency/load test was not performed. No live charge, order or shipment was created for verification. See `catalog-coupons-launch-2026-11-10.md` for the catalog release and verification limits.
