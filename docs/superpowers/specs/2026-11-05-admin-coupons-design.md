# Admin-managed coupons

The owner requested checkout coupons created and configured only by admin, including expiry, a total customer-use limit, and one use per signed-in customer. This extends the existing server-priced Razorpay/COD checkout. The owner has already opted out of repeated questions; the following implementation choices are agent decisions, not additional user requirements.

## Behavior

- Admin can create a code, choose percentage or fixed-rupee discount, set a minimum merchandise spend, optional percentage-discount cap, start/expiry dates, total use limit, and enabled status. Admin can search and edit coupons and see usage. Codes are case-insensitive, normalized uppercase, and unique. Disabled coupons remain available in admin for history; no destructive deletion is needed.
- Customers enter/apply/remove one coupon in checkout. A successful server quote shows the code, discount, subtotal, shipping/COD fees and final amount. Invalid, expired, inactive, exhausted or previously used codes receive clear messages. Cart, address, payment-method or coupon changes invalidate the quote.
- Each signed-in Firebase UID may successfully redeem a given coupon once. Global usage includes successful uses and active unpaid reservations so simultaneous checkouts cannot exceed the limit. Expired or failed unpaid reservations release capacity. Retrying one order is idempotent and cannot consume a second use. Refunds do not automatically grant another use.
- Discounts apply only to merchandise, before shipping and COD fees. Shipping's free-over-₹999 threshold is evaluated on discounted merchandise. No stacking. Discount never exceeds merchandise minus ₹1, preserving a positive payable amount and avoiding unsupported free Razorpay orders. Show this constraint in admin.
- The server recomputes eligibility and totals at quote and order creation; it revalidates coupon settings/expiry/usage before accepting the order. Coupon edits invalidate stale quotes if the order price would change. Stored order snapshots and provider order amounts must agree. Shiprocket's invoice discount must match the final order.
- Existing orders without coupons keep their existing behavior and totals. Customer and admin order views show coupon and discount where present. No coupon is created, enabled, or shared automatically during deployment.

## Approach and constraints

Use the existing private Postgres checkout transaction and staff membership checks. This is preferred over browser-only discounts (which cannot enforce spending limits) or provider-only promotions (which would diverge from COD and shipment totals). Coupon definitions/redemptions are private, RLS protected and inaccessible to browser roles. API validation is repeated by the database. Never trust a client-supplied discount or usage count.

Test expiry/timezone boundaries, total and per-customer limits, reservation release, retry idempotency, admin authorization, stale quotes, discounted shipping boundaries, exact paise arithmetic, existing checkout regression, and provider amount/invoice agreement. Use the current schema and migrations; do not rewrite remote migration history. Review before applying the migration and deploying.
