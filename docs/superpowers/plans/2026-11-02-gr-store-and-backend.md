# GR Store and Supabase Implementation Plan

**Superseded implementation details:** The prior Firebase-backend switch was incorrect. Execute `docs/superpowers/plans/2026-11-02-supabase-correction.md` for Firebase Auth + Supabase store data. Current activation instructions are in `docs/runbooks/supabase-setup.md`. The breakdown below is retained for historical design context; Supabase Auth identity work and Firebase data services are superseded.

> Execute inline using superpowers:executing-plans. The owner approved implementation of the GR Store concept and backend; routine choices do not need another approval.

**Goal:** Implement the approved retail design and secure customer/admin commerce foundation.
**Architecture:** Expo Router features consume typed catalog, auth, address, admin and checkout adapters. Firebase handles identity; Supabase is authoritative for store permissions, stock and totals; unconfigured preview mode remains explicit.
**Tech Stack:** Expo 58, React Native, TypeScript, Lucide, Supabase JS, Postgres, Zustand, Zod, Jest, PGlite SQL integration tests.
**Spec:** docs/superpowers/specs/2026-11-02-gr-store-and-backend-design.md

## Global constraints

- India, INR integer paise, authenticated checkout and customer-owned addresses.
- Google and email/password authentication; no fake sessions.
- No client service-role or AI/payment secrets.
- Approved GR Store design and real icons; no invented ratings.
- Preserve existing cart and schema contracts; test consequential behavior.
- Hosted deployment, Google OAuth and Razorpay remain honestly unverified until owner credentials exist.

## Review focus

- Forged admin metadata cannot grant write access: SQL role isolation tests.
- Cross-user address IDs and order IDs are denied: SQL RLS/checkout tests.
- Changed client prices/stock cannot change order totals: transactional checkout tests.
- Auth redirect parameters are validated and sessions restore before checkout gating: auth adapter and checkout tests.
- Catalog eligibility exclusions and unknown safety fields cannot produce unsafe coach rankings: coach domain tests.

### Task 1: Supabase schema and contracts

Files: supabase/migrations, supabase/tests, supabase/config.toml, scripts/test-database.mjs, src/lib/supabase.ts, src/features/catalog/supabase-catalog-repository.ts.
Interfaces: getSupabase(): SupabaseClient|null; getCatalogRepository(): CatalogRepository; save_product(payload jsonb), prepare_checkout(address_id uuid, items jsonb, request_key uuid).
- [ ] Write database security/commerce tests and catalog brand filter tests; run RED.
- [ ] Implement constrained tables, RLS, staff checks, atomic product/checkout RPCs, storage and repository.
- [ ] Run database and domain tests, type checks; save progress.

### Task 2: Approved visual storefront

Files: src/theme, src/components/navigation, src/features/home, src/features/catalog, assets/images, app/_layout.tsx.
Interfaces: existing HomeScreen/ShopScreen/ProductDetailScreen contracts, CatalogFilters.brand.
- [ ] Install compatible fonts, SVG/Lucide and Supabase dependencies; retain EAS project identity.
- [ ] Implement approved header, hero, goal/brand rails, cards and light shell; filters and image alternatives remain functional.
- [ ] Verify component tests and responsive web rendering.

### Task 3: Authentication, addresses and checkout

Files: src/features/auth, addresses, checkout; app/(store)/account.tsx, checkout.tsx, auth/callback.tsx.
Interfaces: AuthProvider/useAuth; AddressRepository list/save/remove/setDefault; checkout RPC wrapper.
- [ ] Test address validation, safe return routes, missing backend, checkout gating and account state.
- [ ] Implement Supabase email/password/register/reset and Google OAuth exchange/session handling, multiple-address CRUD, checkout selection and server quote.
- [ ] Verify tests; never show payment success without payment integration.

### Task 4: Guided advisor

Files: src/features/advisor, supabase/functions/advisor, app/(store)/advisor.tsx.
Interfaces: recommendProducts(products, preferences): Recommendation[]; local guided mode and optional server conversation.
- [ ] Test budget, goal, diet, stock, caffeine and medical stops.
- [ ] Build conversation UI and explainable eligible product cards, add-to-cart, floating entry; server function validates JWT, limits input, catalog-grounds responses.
- [ ] Verify behavior and safety tests.

### Task 5: Admin and activation

Files: app/admin, src/features/admin, docs/runbooks/supabase-setup.md, README.md.
Interfaces: role-gated admin product save, media upload, orders list and allowed transitions.
- [ ] Implement dashboard, validated variant-aware editor, image uploads, publish/draft, inventory and order status actions.
- [ ] Verify denied access, validation and errors; run complete JS/SQL/type/lint/web build.
- [ ] Inspect desktop/mobile web and native bundle. Document exact owner activation steps, Google callbacks and unresolved live-service verification.
