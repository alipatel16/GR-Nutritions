# India Supplement Commerce Platform — Product and Technical Design

**Date:** 2026-11-02  
**Status:** Proposed, with product and technical defaults chosen by the implementer at the owner's request  
**Working product name:** NUTRIVAULT (temporary and replaceable through one brand configuration file)

## Intent

Build a premium India-first supplement commerce business that feels closer to a modern performance brand than a generic marketplace. Customers should be able to discover, understand, compare, and buy products quickly on the web, Android, and iOS. The owner should be able to operate the catalog, inventory, promotions, and orders without editing code.

The interface must be visually distinctive, fast, accessible, and easy to shop. Motion should create energy and hierarchy, never delay purchasing. A guided product advisor should help customers narrow the catalog using stated goals, diet, budget, sensitivities, and preferences without diagnosing medical conditions or presenting supplements as treatment.

## Goals

- One TypeScript product codebase for web, Android, and iOS using Expo Router.
- A polished responsive storefront with strong typography, restrained high-quality motion, search, filters, product comparison, cart, checkout, accounts, wishlists, bundles, coupons, and order tracking.
- An owner-friendly web admin for products, variants, images, inventory, orders, promotions, customers, homepage merchandising, and advisor rules.
- India-first pricing in INR, GST/FSSAI-aware product data, Indian addresses, and Razorpay checkout.
- A secure managed backend with database migrations, role-based access, storage, server functions, audit trails, and backups.
- A catalog-grounded AI advisor that returns explainable recommendations at multiple budgets and refuses unsafe medical guidance.
- SEO-ready product/category pages on web, universal links on mobile, and a deployment path for the owner's existing domain.

## Non-goals for the first release

- International currencies, taxes, shipping, or payment methods.
- A multi-vendor marketplace.
- Manufacturing, formulation, or medical diagnosis features.
- A custom warehouse management system; fulfillment providers will be integrated through an adapter.
- Storing card or UPI credentials in our database.
- Fully autonomous AI recommendations without catalog, policy, and safety constraints.

## Anti-goals

- A visually noisy storefront where animation competes with product information.
- A chatbot that invents health claims, recommends treatment, or hides why a product was suggested.
- Trusting client-side prices, stock, discounts, payment success, or administrator claims.
- Requiring the owner to use SQL or redeploy the app to change normal store content.
- Copying the visual identity of another supplement store.

## Users

### Shopper

Browses by goal or product type, searches and filters, compares variants, receives optional guided recommendations, checks delivery availability, pays, and tracks an order.

### Store operator

Creates and schedules products, uploads media, maintains variants and stock, manages orders and refunds, creates promotions, edits homepage collections, and reviews low-stock and payment exceptions.

### Administrator

Manages staff access, configuration, audit logs, integrations, compliance fields, and high-risk actions.

## Experience direction

### Visual system

- **Mood:** performance laboratory meets premium wellness editorial.
- **Palette:** obsidian `#090B0D`, warm bone `#F4F0E8`, signal lime `#C7FF3D`, mineral grey `#939A9E`, and restrained violet `#8B5CF6` for advisor moments.
- **Typography:** Sora for display and product numerals; Manrope for interface and long-form copy. Use tabular numerals for prices and inventory.
- **Shape:** large editorial type, sharp product cards with small-radius corners, thin technical rules, circular ingredient badges, and generous whitespace.
- **Motion:** 160–280 ms interface transitions, staggered product reveals, subtle product-image depth, and reduced-motion equivalents. No scroll hijacking or animation-gated checkout.
- **Photography:** cut-out product packs on purposeful color fields, macro ingredient textures, and real lifestyle imagery. Product information remains readable without imagery.

### Storefront information architecture

- Home: campaign hero, shop-by-goal, trending products, bundles, advisor entry, education, trust markers.
- Shop: categories, goals, dietary preferences, ingredients, price, rating, availability, and sort controls.
- Product: gallery, variant selection, price/MRP, stock, benefits, ingredients, nutrition, usage, warnings, authenticity, reviews, delivery estimate, comparison, and related products.
- Advisor: conversational intake plus selectable answers, recommendation cards, explanation, warnings, comparison, and add-to-cart.
- Cart and checkout: address, delivery, coupon, order summary, Razorpay, confirmation.
- Account: profile, addresses, orders, returns/refunds status, wishlist, and advisor history.
- Editorial: ingredient guides and goal-based education with explicit review metadata.

### Responsive behavior

- Mobile uses bottom navigation for Home, Shop, Advisor, Cart, and Account.
- Web uses a persistent header, mega-menu, command-style search, hover previews, and a wider comparison layout.
- Admin is web-first and remains usable on tablets; destructive or high-density workflows are not optimized for phone screens in the first release.

## Architecture

### Client

- Expo SDK 58 with Expo Router and strict TypeScript.
- Shared domain and design-system packages inside one app repository; platform-specific implementations only where payments, navigation, or input behavior requires them.
- TanStack Query for server state and cached catalog reads.
- Zustand for ephemeral cart/UI state, with the authoritative cart re-priced on the server before payment.
- React Hook Form and Zod for forms and shared validation contracts.
- Reanimated for native-safe motion; CSS transitions/animations for web where appropriate.
- `expo-image` for responsive caching and `expo-font` with bundled Sora/Manrope assets.

### Backend

- Supabase Postgres as the source of truth.
- Supabase Auth for customer and staff identity.
- Supabase Storage for product and editorial media.
- Supabase Edge Functions for privileged commerce operations, Razorpay, advisor calls, webhooks, and integrations.
- Row Level Security on every exposed table. Service-role access is restricted to server functions and scheduled jobs.
- SQL migrations and seed data live in the repository; production is reproducible from source control.

### Payments

- Razorpay Orders API is called only from a server function.
- Native apps use the official React Native Standard Checkout development build; web uses Razorpay Standard Checkout.
- Amount, currency, stock, discount, and final totals are calculated server-side.
- Callback signatures are verified server-side. Fulfillment begins only after captured payment is confirmed.
- Webhook signatures are verified against the raw body. Event IDs are persisted for deduplication, and handlers are state-aware and idempotent.
- API secrets, webhook secrets, and OpenAI keys are never placed in the Expo bundle.

### Product advisor

- OpenAI Responses API with function calling for server-side catalog lookup and Structured Outputs for a validated recommendation payload.
- The model can only recommend active, in-stock products returned by the catalog tool.
- Deterministic eligibility filters run before ranking: age, pregnancy/breastfeeding, allergies, stimulant sensitivity, diet, contraindication flags, and inventory.
- High-risk answers stop product ranking and recommend speaking with an appropriate qualified professional.
- Every recommendation includes a plain-language reason, budget tier, key considerations, and a non-medical disclaimer.
- Conversations store minimal structured preferences by default; sensitive free text is not retained unless the customer explicitly saves the plan.

## Core data model

### Catalog

- `brands`, `categories`, `goals`, `ingredients`
- `products`: slug, status, title, description, brand, category, tax class, HSN, FSSAI licence/food category fields, usage, warnings, claims-review status, SEO, publish windows
- `product_variants`: SKU, flavour, size, weight, MRP, selling price, cost, GST rate, barcode, stock policy
- `product_media`, `product_ingredients`, `product_goals`, `product_dietary_tags`
- `inventory_locations`, `inventory_levels`, `inventory_movements`
- `collections`, `collection_products`, `homepage_sections`

### Commerce

- `carts`, `cart_items`, `wishlists`
- `addresses` with Indian state and postal-code validation
- `orders`, `order_items`, `order_status_history`
- `payments`, `payment_events`, `refunds`
- `promotions`, `promotion_rules`, `promotion_redemptions`
- `shipments`, `shipment_events`, `returns`

### Identity and operations

- `profiles`, `staff_roles`, `staff_memberships`
- `reviews`, `review_media`, `review_votes`
- `advisor_sessions`, `advisor_recommendations`
- `audit_events`, `integration_events`, `store_settings`

## Product entry and admin workflow

The product editor is a guided multi-section form:

1. Basics and category
2. Variants, SKUs, price, MRP, GST, and inventory
3. Images and media with drag-to-reorder
4. Ingredients, nutrition, dietary flags, usage, and warnings
5. FSSAI/label declarations and claims-review checklist
6. Search/SEO preview
7. Related products, bundles, and advisor eligibility
8. Draft preview, validation, schedule, and publish

Bulk CSV import/export and image upload arrive after the single-product workflow is proven. Each publish action records the staff member and the changed fields.

## Security and privacy

- RLS defaults to deny; policies grant only the minimum required access.
- Staff authorization is checked in Postgres/server functions, not only hidden in the UI.
- Admin changes and payment/order state transitions are audited.
- Rate limits apply to login, search, coupons, checkout, and advisor endpoints.
- Personally identifiable information is minimized, encrypted in transit, excluded from analytics payloads, and removed from logs.
- Payment webhooks use raw-body signature verification, replay protection, and durable event recording.
- Production secrets are stored in Supabase/Vercel/EAS secret stores.

## India-specific commerce and compliance defaults

- INR only; money is stored as integer paise.
- MRP, selling price, discount, and GST treatment are explicit per variant.
- Orders snapshot product name, tax, price, quantity, and compliance text so later catalog edits do not rewrite history.
- Product records support veg/non-veg status, target group, recommended usage, warnings, allergens, and “not for medicinal use” presentation where applicable.
- Product claims require an explicit reviewed state before publication; the advisor must not extend claims beyond approved catalog copy.
- Legal review remains required before launch. The software supports compliance workflows but does not replace an FSSAI/GST/privacy professional.

## Reliability and performance

- Web pages target good Core Web Vitals; product/category pages are statically rendered or cached where possible.
- Catalog reads remain usable during brief backend disruption through cached data; checkout requires live validation.
- Payment events and stock movements use database constraints to prevent duplicate processing.
- Images are resized and delivered in responsive formats.
- Error monitoring, structured logs, backup verification, and synthetic checkout checks are required before launch.

## Delivery sequence

1. **Foundation storefront:** universal Expo app, design system, seeded catalog, home/shop/product/cart, responsive web and mobile navigation.
2. **Backend and admin:** Supabase schema/RLS/storage, authentication, product editor, variants, media, inventory, collections.
3. **Checkout and orders:** addresses, server pricing, Razorpay, webhooks, order lifecycle, customer orders.
4. **Operations:** fulfillment adapter, shipping updates, refunds/returns, coupons, notifications, reviews.
5. **Advisor:** safe intake, catalog tools, structured recommendations, saved plans, admin rules and evaluation suite.
6. **Launch hardening:** analytics/consent, SEO, accessibility, performance, security review, monitoring, domain, EAS builds, Play Store and App Store release assets.

Each milestone must be runnable and independently testable. Live credentials and the production domain are only needed when the corresponding integration milestone begins.

## Approaches considered

### 1. Universal Expo app + Supabase (selected)

Best balance for an owner who is strong on frontend but does not want to operate servers. It maximizes shared code across mobile and web while retaining Postgres, secure server functions, migrations, and an accessible admin path. The main trade-off is that complex native payment support requires Expo development builds rather than Expo Go.

### 2. Expo mobile + separate Next.js storefront/admin + Supabase

Potentially stronger web-only rendering flexibility and easier desktop admin composition, but creates two UI applications and more duplicated behavior. This is a viable later split if web requirements outgrow Expo Router, but it is unnecessary cost for the first release.

### 3. Expo clients + custom Node/NestJS backend

Maximum backend control, but adds server operations, deployment, authentication plumbing, file storage, backups, and more maintenance. It works against the owner's stated backend constraint and is not justified until scale or integrations exceed managed functions.

## Decisions left to implementation

- Exact working copy and product photography until the owner supplies brand assets and real catalog data.
- Shipping provider; implement behind an adapter and begin with manual shipment entry.
- Transactional email/SMS provider; choose after volume and sender-registration needs are known.
- Production hosting region, retention periods, and legal copy after owner/account details are available.
- Final app/store name, package identifiers, domain, support contacts, GST/FSSAI identifiers, and return policy.

## Source notes

- Expo Router is the official universal file-based router and supports deep links, web static rendering, and shared navigation: https://docs.expo.dev/router/introduction/
- Supabase's current Expo guidance uses the publishable key in the client, environment variables, and RLS for exposed data: https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native
- Supabase recommends user-scoped clients for authenticated Edge Functions and warns that admin clients bypass RLS: https://supabase.com/docs/guides/functions/auth
- Razorpay's security checklist requires secrets to stay out of apps, server-side signature verification, trusted order IDs, and signed webhooks: https://razorpay.com/security/checklist
- OpenAI recommends function calling when connecting a model to application data and Structured Outputs when returning schema-bound UI data: https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses
- FSSAI maintains specific standards for health supplements and nutraceuticals and prohibits disease-treatment positioning in the referenced regulatory framework: https://www.fssai.gov.in/standards/health-supplements
