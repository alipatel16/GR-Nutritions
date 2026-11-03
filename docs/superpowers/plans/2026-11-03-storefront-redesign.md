# GR Nutritions Storefront Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a responsive, production-grade GR Nutritions storefront with reliable navigation, authenticated header state, attached cart badge, campaign carousel, richer merchandising, and restrained motion.

**Architecture:** Restore the deployed catalogue source as the baseline, then separate shared navigation state, carousel behavior, and homepage merchandising into focused components. Route parameters remain the source of truth for the catalogue; product rails derive their content from the existing repository without backend changes.

**Tech Stack:** Expo 58, React Native 0.88, Expo Router, TypeScript, Expo Image, Firebase Auth, Supabase, Jest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-03-storefront-redesign-design.md`

## Global Constraints

- Preserve the existing backend schema, live product/order data, checkout, admin, Razorpay, Firebase Auth, and Supabase behavior.
- Keep Barlow Condensed for display text and DM Sans for body text.
- Support 320 px mobile through desktop widths of 1200 px and above.
- Respect reduced-motion preferences and keep every control keyboard/screen-reader accessible.
- Use only existing catalogue/product/brand assets; do not invent reviews, certifications, prices, or medical claims.
- This workspace has no Git metadata, so commit steps are intentionally omitted.

## Review Focus

- A route parameter change on an already-mounted shop screen must replace the visible filter instead of retaining stale state.
- A delayed Firebase auth callback must never show a signed-in customer as “Sign in.”
- Cart counts of zero, one, and multiple items must keep the badge attached to the icon without changing header spacing.
- Carousels with zero, one, or fewer-than-a-page items must render without empty controls or crashes.
- Reduced-motion mode must disable autoplay and transition animations while preserving manual controls.

---

### Task 1: Restore deployed-source parity

**Files:**
- Create: `app/(store)/brands.tsx`
- Create: `src/features/catalog/BrandGrid.tsx`
- Create: `public/catalog/**`
- Modify: `src/components/navigation/WebHeader.tsx`
- Modify: `src/features/catalog/ProductDetailScreen.tsx`
- Modify: `src/features/catalog/ShopScreen.tsx`
- Modify: `src/features/catalog/supabase-catalog-repository.ts`
- Modify: `src/features/home/HomeScreen.tsx`
- Modify: `firebase.json`

**Interfaces:**
- Consumes: the previous working copy at `/Users/alipatel/Documents/Codex/2026-11-02/so-bro-i-want-to-develop-2`.
- Produces: a current workspace that exports the same seven-brand catalogue and hosted assets as the live site.

- [ ] Copy the known deployed text changes and catalogue assets into this workspace without copying secrets, caches, build output, or unrelated logs.
- [ ] Run `npm run typecheck` and the existing focused home/catalog tests.
- [ ] Run a static web export and confirm every referenced `/catalog/**` asset exists in `dist`.

### Task 2: Repair shared header and catalogue behavior with TDD

**Files:**
- Create: `src/components/navigation/__tests__/WebHeader.test.tsx`
- Modify: `src/components/navigation/WebHeader.tsx`
- Modify: `src/features/catalog/__tests__/ShopScreen.test.tsx`
- Modify: `src/features/catalog/ShopScreen.tsx`
- Modify: `app/(store)/shop.tsx`

**Interfaces:**
- Consumes: `useAuth()`, `useCartStore()`, and `CatalogFilters`.
- Produces: `accountLabel(user)` behavior, an icon-anchored cart badge, and prop-to-filter synchronization for mounted catalogue screens.

- [ ] Write failing header tests for signed-out label, signed-in label, zero badge, and non-zero attached badge.
- [ ] Run the header tests and confirm they fail for the current hard-coded label/layout.
- [ ] Implement the minimum header state/layout changes and rerun the tests.
- [ ] Write a failing shop test that rerenders with a new `initialFilters` category and expects the result set to change.
- [ ] Run the shop test and confirm stale results reproduce.
- [ ] Synchronize serialized route filters into `ShopScreen` without causing URL feedback loops, then rerun focused tests.

### Task 3: Build accessible carousel primitives with TDD

**Files:**
- Create: `src/components/commerce/Carousel.tsx`
- Create: `src/components/commerce/__tests__/Carousel.test.tsx`
- Create: `src/components/motion/Reveal.tsx`

**Interfaces:**
- Produces: `Carousel<T>` with `items`, `renderItem`, `itemWidth`, `accessibilityLabel`, `autoAdvanceMs?`, and `testID?`; `Reveal` respects `useReducedMotion()`.

- [ ] Write failing tests for previous/next controls, indicator state, one-item control suppression, and reduced-motion autoplay suppression.
- [ ] Run the carousel tests and verify the missing component is the failure.
- [ ] Implement manual paging and accessible indicators.
- [ ] Add autoplay only when there is more than one item and reduced motion is disabled.
- [ ] Implement `Reveal` as a non-blocking opacity/translate entrance with an immediate reduced-motion path.
- [ ] Rerun the focused component tests.

### Task 4: Rebuild the responsive header shell

**Files:**
- Modify: `src/components/navigation/WebHeader.tsx`
- Modify: `src/components/navigation/MobileTabs.tsx`
- Modify: `app/(store)/_layout.tsx`
- Modify: `src/theme/tokens.ts`
- Modify: `test/responsive/storefront.test.tsx`

**Interfaces:**
- Consumes: repaired header state and existing breakpoint hooks.
- Produces: desktop, tablet, and mobile header compositions using one navigation model.

- [ ] Add failing responsive assertions for desktop search/navigation and mobile search/chips/bottom navigation.
- [ ] Run the responsive tests and confirm the current layout fails the new expectations.
- [ ] Implement the responsive header/search/discovery layout and attached floating coach behavior.
- [ ] Rerun the responsive and header tests.

### Task 5: Build the campaign hero and discovery rails

**Files:**
- Create: `src/features/home/HeroCarousel.tsx`
- Create: `src/features/home/CategoryRail.tsx`
- Modify: `src/features/home/GoalRail.tsx`
- Create: `src/features/home/__tests__/HeroCarousel.test.tsx`
- Modify: `src/features/home/__tests__/HomeScreen.test.tsx`

**Interfaces:**
- Consumes: `Carousel`, existing campaign/product assets, Expo Router links, and breakpoint/reduced-motion hooks.
- Produces: three campaign slides plus distinct category and goal destinations.

- [ ] Write failing tests for three campaigns, unique category destinations, manual slide controls, and reduced-motion behavior.
- [ ] Run the tests and verify the missing experience is the failure.
- [ ] Implement the campaign and discovery components using existing assets and brand copy.
- [ ] Rerun the focused home tests.

### Task 6: Build catalogue-driven merchandising rails

**Files:**
- Create: `src/features/home/ProductRail.tsx`
- Modify: `src/features/home/FeaturedCollection.tsx`
- Modify: `src/features/home/AdvisorBanner.tsx`
- Modify: `src/features/home/HomeScreen.tsx`
- Modify: `src/features/home/__tests__/HomeScreen.test.tsx`

**Interfaces:**
- Consumes: the complete `Product[]` returned by `CatalogRepository.list`.
- Produces: deterministic bestsellers, performance, wellness, and new-arrival rails with graceful empty/small states.

- [ ] Write failing tests for all merchandising section headings, distinct products, the brand directory, and a small-catalogue fallback.
- [ ] Run the tests and confirm the current four-product homepage fails.
- [ ] Implement product selection helpers and horizontal responsive rails.
- [ ] Compose the full homepage in the order defined by the spec and add restrained section reveals.
- [ ] Rerun home, catalogue, accessibility, and responsive tests.

### Task 7: Complete typography, footer, and visual polish

**Files:**
- Modify: `app/_layout.tsx`
- Create: `app/+html.tsx`
- Modify: `src/components/ui/AppText.tsx`
- Create: `src/components/layout/StoreFooter.tsx`
- Modify: `src/features/catalog/ProductCard.tsx`
- Modify: `src/features/home/HomeScreen.tsx`

**Interfaces:**
- Produces: stable web font fallbacks, consistent heading/body scales, richer product cards, and a complete responsive footer.

- [ ] Add failing assertions for the footer navigation and product-card merchandising metadata that already exists in product data.
- [ ] Implement font preload/fallback behavior and the footer without inventing unsupported claims.
- [ ] Polish product-card hierarchy, focus/pressed states, spacing, and mobile density.
- [ ] Rerun focused and accessibility tests.

### Task 8: Full verification and deployment readiness

**Files:**
- Modify only files required by failures discovered during verification.

**Interfaces:**
- Produces: a verified static export and visual evidence at mobile and desktop sizes.

- [ ] Run `npm run typecheck`.
- [ ] Run `npm run lint`.
- [ ] Run `npm test -- --runInBand`.
- [ ] Run `npm run test:backend`.
- [ ] Export the web app with live-catalogue configuration and verify hosted asset parity.
- [ ] Inspect the exported app at 390×844, 768×1024, and 1440×1000.
- [ ] Verify account label, cart badge, category transitions, carousel controls, product rails, and reduced-motion behavior.
- [ ] Deploy only after every required check passes and the source being deployed matches this workspace.

