# Foundation Storefront Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the first runnable NUTRIVAULT milestone: a polished, responsive Expo application for web, Android, and iOS with a seeded supplement catalog, discovery flows, product detail, and a persistent cart.

**Architecture:** Create one Expo Router application with route files limited to composition and feature code organized under `src/`. A typed catalog repository initially reads deterministic seed data, allowing the storefront to be developed and tested before Supabase credentials exist; the later backend milestone will replace the repository implementation without rewriting screens. Shared design tokens and primitives enforce the visual system on all platforms, while route-level layouts provide web header and mobile bottom navigation.

**Tech Stack:** Expo SDK 58, Expo Router, React Native, TypeScript strict mode, Sora, Manrope, Expo Image, React Native Reanimated, Zustand, Zod, Jest (`jest-expo`), React Native Testing Library, ESLint, Prettier.

**Spec:** `docs/superpowers/specs/2026-11-02-india-supplement-commerce-platform-design.md`

## Global Constraints

- Initial market is India only; display INR and store money as integer paise.
- Use the working name `NUTRIVAULT` only through `src/config/brand.ts` so it is replaced in one place later.
- Use Expo SDK 58 and Expo Router for Android, iOS, and web.
- Use strict TypeScript with no `any` in application code.
- Use Sora for display/price typography and Manrope for interface/body typography.
- Core colors are obsidian `#090B0D`, bone `#F4F0E8`, signal lime `#C7FF3D`, mineral grey `#939A9E`, and advisor violet `#8B5CF6`.
- Respect reduced-motion preferences and never require animation to complete a shopping action.
- Keep route files thin; reusable behavior belongs under `src/features`, `src/components`, or `src/lib`.
- Do not place backend, Razorpay, or OpenAI secrets in Expo public environment variables.
- Generated Expo scaffold/configuration is the only TDD exception in this milestone; all application behavior is test-first.

## Review Focus

- Malformed or missing product/variant identifiers render a clear empty state rather than crash; pinned in Task 5 product-route tests.
- An out-of-stock variant cannot be added to cart; pinned in Task 6 cart-domain tests.
- Cart quantity cannot exceed the selected variant's available stock and totals remain integer paise; pinned in Task 6 cart-domain tests.
- Filters with no matching products preserve the user's selections and offer a reset action; pinned in Task 4 shop-screen tests.
- Navigation and essential purchase actions remain available when reduced motion is enabled and at 320 px width; pinned in Task 7 accessibility/responsive tests.

---

## Planned file structure

```text
app/
  _layout.tsx                    # Root providers, fonts, splash and theme
  (store)/
    _layout.tsx                  # Store navigation by platform
    index.tsx                    # Home composition
    shop.tsx                     # Shop composition
    product/[slug].tsx           # Product detail composition
    advisor.tsx                  # Advisor teaser/coming milestone
    cart.tsx                     # Cart composition
    account.tsx                  # Account teaser/coming milestone
  +not-found.tsx                 # Branded unknown-route state
assets/fonts/                    # Bundled Sora and Manrope font files
src/config/brand.ts              # Replaceable brand identity and contact placeholders
src/theme/                       # Tokens, responsive helpers and motion preferences
src/components/                  # Shared primitives and global navigation
src/features/home/               # Home sections and merchandising composition
src/features/catalog/            # Product types, repository, seeds, cards, filters, PDP
src/features/cart/               # Cart domain, Zustand adapter and cart UI
src/features/search/             # Search field and normalization
src/lib/                         # Currency, IDs and platform helpers
test/                            # Test setup, factories and render helpers
```

### Task 1: Universal application foundation

**Files:**
- Create: `package.json`
- Create: `app.json`
- Create: `tsconfig.json`
- Create: `eslint.config.js`
- Create: `jest.config.js`
- Create: `test/setup.ts`
- Create: `test/smoke/root-layout.test.tsx`
- Create: `app/_layout.tsx`
- Create: `app/(store)/_layout.tsx`
- Create: `app/(store)/index.tsx`
- Create: `app/+not-found.tsx`
- Create: `src/config/brand.ts`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `README.md`

**Interfaces:**
- Produces: `brand: { name: string; shortName: string; tagline: string; locale: 'en-IN'; currency: 'INR' }`
- Produces: a bootable Expo Router app and `npm test`, `npm run typecheck`, `npm run lint` commands.

- [ ] **Step 1: Initialize repository and generate the Expo SDK 58 Router scaffold**

Run `git init`, then scaffold into the current directory using Expo's official SDK 58 default template. Preserve `docs/` and normalize scripts to `start`, `android`, `ios`, `web`, `test`, `typecheck`, and `lint`. Install SDK-compatible `jest-expo`, React Native Testing Library, Zustand, Zod, Expo Image, Reanimated, and font packages through Expo/npm.

- [ ] **Step 2: Write the failing root-layout smoke test**

`test/smoke/root-layout.test.tsx` renders the store index using the shared render helper and asserts that `NUTRIVAULT`, `Shop performance`, and a link with accessible name `Shop all supplements` are present.

- [ ] **Step 3: Run the test and verify RED**

Run: `npm test -- --runInBand test/smoke/root-layout.test.tsx`  
Expected: FAIL because the brand configuration and branded index do not exist.

- [ ] **Step 4: Implement the minimal branded root**

Create `src/config/brand.ts`, root providers, store layout, and index content sufficient for the smoke test. Add font-loading placeholders but do not implement the full visual system yet.

- [ ] **Step 5: Verify the foundation**

Run: `npm test -- --runInBand test/smoke/root-layout.test.tsx && npm run typecheck && npm run lint`  
Expected: all commands exit 0 with no warnings from application code.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "chore: establish universal Expo storefront"
```

### Task 2: Design system and responsive shell

**Files:**
- Create: `src/theme/tokens.ts`
- Create: `src/theme/use-breakpoint.ts`
- Create: `src/theme/use-reduced-motion.ts`
- Create: `src/components/ui/AppText.tsx`
- Create: `src/components/ui/Button.tsx`
- Create: `src/components/ui/Surface.tsx`
- Create: `src/components/ui/Price.tsx`
- Create: `src/components/layout/PageShell.tsx`
- Create: `src/components/navigation/WebHeader.tsx`
- Create: `src/components/navigation/MobileTabs.tsx`
- Create: `src/lib/money.ts`
- Create: `src/lib/__tests__/money.test.ts`
- Create: `src/components/ui/__tests__/Button.test.tsx`
- Modify: `app/_layout.tsx`
- Modify: `app/(store)/_layout.tsx`

**Interfaces:**
- Produces: `formatInr(paise: number): string`
- Produces: `Button` with `variant: 'primary' | 'secondary' | 'ghost'`, disabled/loading states, and accessible labels.
- Produces: tokens for color, type, spacing, radius, elevation, motion, and breakpoints (`mobile < 768`, `tablet 768–1199`, `desktop >= 1200`).

- [ ] **Step 1: Write failing currency and Button behavior tests**

Assert `formatInr(249900) === '₹2,499'`, `formatInr(0) === '₹0'`, and `formatInr(-12500) === '-₹125'`. Render a disabled Button and assert its press handler is not called; render a loading Button and assert its accessible state is busy.

- [ ] **Step 2: Verify RED**

Run: `npm test -- --runInBand src/lib/__tests__/money.test.ts src/components/ui/__tests__/Button.test.tsx`  
Expected: FAIL because the formatter and Button do not exist.

- [ ] **Step 3: Implement tokens, primitives, fonts, and navigation shell**

Implement the documented colors and typography, bundle the selected font weights, add responsive max-width behavior, provide web and native navigation shells, and keep all press targets at least 44×44 points.

- [ ] **Step 4: Verify GREEN and static checks**

Run: `npm test -- --runInBand && npm run typecheck && npm run lint`  
Expected: all tests and checks pass.

- [ ] **Step 5: Commit**

```bash
git add app src assets test package.json package-lock.json
git commit -m "feat: add premium responsive design system"
```

### Task 3: Typed catalog and seeded repository

**Files:**
- Create: `src/features/catalog/types.ts`
- Create: `src/features/catalog/schema.ts`
- Create: `src/features/catalog/catalog-repository.ts`
- Create: `src/features/catalog/local-catalog-repository.ts`
- Create: `src/features/catalog/seed-products.ts`
- Create: `src/features/catalog/__tests__/local-catalog-repository.test.ts`
- Create: `test/factories/product.ts`

**Interfaces:**
- Produces: `Money = { amountPaise: number; currency: 'INR' }`
- Produces: `Product`, `ProductVariant`, `CatalogFilters`, `CatalogSort`, and `CatalogResult` types.
- Produces: `CatalogRepository.list(filters, sort): Promise<CatalogResult>`
- Produces: `CatalogRepository.getBySlug(slug: string): Promise<Product | null>`
- Produces: `localCatalogRepository` backed by at least 12 products spanning protein, pre-workout, post-workout, wellness, energy, vitamins, and healthy snacks.

- [ ] **Step 1: Write failing repository contract tests**

Test active-product-only listing, category and goal filters, case/whitespace-insensitive search, price sorting by the cheapest in-stock variant, deterministic pagination, unknown slug returning `null`, and schema rejection of negative prices or duplicate variant SKUs.

- [ ] **Step 2: Verify RED**

Run: `npm test -- --runInBand src/features/catalog/__tests__/local-catalog-repository.test.ts`  
Expected: FAIL because the repository contract and implementation do not exist.

- [ ] **Step 3: Implement schemas, types, repository, and credible seed catalog**

Each product includes compliant placeholder usage/warning fields, dietary tags, goal tags, ingredients, one to three variants, placeholder media colors, stock, MRP, and selling price. Clearly label data as sample/demo content in source and admin-facing metadata.

- [ ] **Step 4: Verify GREEN and suite**

Run: `npm test -- --runInBand && npm run typecheck && npm run lint`  
Expected: all tests and checks pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/catalog test/factories
git commit -m "feat: add typed supplement catalog repository"
```

### Task 4: Home discovery and shop filtering

**Files:**
- Create: `src/features/catalog/ProductCard.tsx`
- Create: `src/features/catalog/ProductGrid.tsx`
- Create: `src/features/catalog/FilterRail.tsx`
- Create: `src/features/catalog/ActiveFilters.tsx`
- Create: `src/features/catalog/ShopScreen.tsx`
- Create: `src/features/catalog/__tests__/ShopScreen.test.tsx`
- Create: `src/features/home/HomeScreen.tsx`
- Create: `src/features/home/GoalRail.tsx`
- Create: `src/features/home/FeaturedCollection.tsx`
- Create: `src/features/home/AdvisorBanner.tsx`
- Create: `src/features/home/__tests__/HomeScreen.test.tsx`
- Modify: `app/(store)/index.tsx`
- Create: `app/(store)/shop.tsx`

**Interfaces:**
- Consumes: `CatalogRepository.list`, `Product`, `formatInr`, design primitives.
- Produces: `HomeScreen({ repository }: { repository: CatalogRepository })`
- Produces: `ShopScreen({ repository }: { repository: CatalogRepository })`

- [ ] **Step 1: Write failing home and shop behavior tests**

Home test asserts goal navigation, featured products, advisor entry, and product links. Shop tests assert search/filter combination, count updates, URL-compatible filter state, sorting, out-of-stock labeling, and a zero-result state that retains chips and exposes `Clear all filters`.

- [ ] **Step 2: Verify RED**

Run: `npm test -- --runInBand src/features/home/__tests__/HomeScreen.test.tsx src/features/catalog/__tests__/ShopScreen.test.tsx`  
Expected: FAIL because the screens do not exist.

- [ ] **Step 3: Implement Home and Shop**

Use editorial home sections and a dense but calm catalog. On desktop show the filter rail; on mobile use a filter sheet. Keep product title, price, variant summary, goal tags, stock state, and add/view action legible without hover.

- [ ] **Step 4: Verify GREEN and suite**

Run: `npm test -- --runInBand && npm run typecheck && npm run lint`  
Expected: all tests and checks pass.

- [ ] **Step 5: Commit**

```bash
git add app src/features/home src/features/catalog
git commit -m "feat: build product discovery storefront"
```

### Task 5: Product detail and invalid-route handling

**Files:**
- Create: `src/features/catalog/ProductDetailScreen.tsx`
- Create: `src/features/catalog/ProductGallery.tsx`
- Create: `src/features/catalog/VariantPicker.tsx`
- Create: `src/features/catalog/ProductFacts.tsx`
- Create: `src/features/catalog/ProductTrustPanel.tsx`
- Create: `src/features/catalog/__tests__/ProductDetailScreen.test.tsx`
- Create: `app/(store)/product/[slug].tsx`
- Modify: `app/+not-found.tsx`

**Interfaces:**
- Consumes: `CatalogRepository.getBySlug`, `Product`, `ProductVariant`, cart action interface from Task 6 through an optional callback initially.
- Produces: `ProductDetailScreen({ product, onAddToCart }: { product: Product; onAddToCart(variantId: string): void })`

- [ ] **Step 1: Write failing product-detail tests**

Assert default selection of the first in-stock variant, price/MRP update on selection, disabled add action for out-of-stock variants, accessible gallery controls, usage/warnings visibility, and an unknown/missing slug rendering `We couldn't find that product` with a `Back to shop` link.

- [ ] **Step 2: Verify RED**

Run: `npm test -- --runInBand src/features/catalog/__tests__/ProductDetailScreen.test.tsx`  
Expected: FAIL because the product detail components and route do not exist.

- [ ] **Step 3: Implement the product route and detail experience**

On desktop use a sticky purchase panel; on mobile keep the purchase action reachable without covering warnings or native navigation. Render sample content honestly and keep compliance sections visually distinct from marketing benefits.

- [ ] **Step 4: Verify GREEN and suite**

Run: `npm test -- --runInBand && npm run typecheck && npm run lint`  
Expected: all tests and checks pass.

- [ ] **Step 5: Commit**

```bash
git add app src/features/catalog
git commit -m "feat: add conversion-focused product detail"
```

### Task 6: Persistent cart domain and screen

**Files:**
- Create: `src/features/cart/types.ts`
- Create: `src/features/cart/cart-domain.ts`
- Create: `src/features/cart/cart-store.ts`
- Create: `src/features/cart/CartScreen.tsx`
- Create: `src/features/cart/CartLine.tsx`
- Create: `src/features/cart/CartSummary.tsx`
- Create: `src/features/cart/__tests__/cart-domain.test.ts`
- Create: `src/features/cart/__tests__/CartScreen.test.tsx`
- Create: `app/(store)/cart.tsx`
- Modify: `src/features/catalog/ProductDetailScreen.tsx`
- Modify: `src/components/navigation/WebHeader.tsx`
- Modify: `src/components/navigation/MobileTabs.tsx`

**Interfaces:**
- Produces: `CartLine = { variantId: string; productId: string; quantity: number; unitPricePaise: number; stockAvailable: number }`
- Produces: `addLine(cart, variant, quantity): CartResult`, `updateQuantity(cart, variantId, quantity): CartResult`, `removeLine(cart, variantId): Cart`, `cartTotals(cart): { subtotalPaise: number; itemCount: number }`.
- Produces: `useCartStore` persisted locally with a versioned storage shape.

- [ ] **Step 1: Write failing cart-domain tests**

Assert repeated additions merge lines, zero quantity removes a line, quantities above stock are rejected, out-of-stock variants are rejected, negative/decimal quantities are rejected, integer-paise totals are exact, and rehydrating an unknown storage version starts with an empty cart.

- [ ] **Step 2: Verify RED**

Run: `npm test -- --runInBand src/features/cart/__tests__/cart-domain.test.ts`  
Expected: FAIL because the cart domain does not exist.

- [ ] **Step 3: Implement minimal cart domain and persistent adapter**

Keep domain functions pure. Store the product/variant identifiers and display snapshot locally, while documenting that the backend milestone will re-price and re-check stock before checkout.

- [ ] **Step 4: Write failing cart-screen tests**

Assert line rendering, quantity adjustment, removal, subtotal/item count, empty-cart action, checkout teaser, and cart badge updates in navigation.

- [ ] **Step 5: Verify RED, implement UI, then verify GREEN**

Run before UI: `npm test -- --runInBand src/features/cart/__tests__/CartScreen.test.tsx`  
Expected: FAIL because `CartScreen` does not exist.  
Implement the screen and connect product-detail add actions.  
Run after UI: `npm test -- --runInBand && npm run typecheck && npm run lint`  
Expected: all tests and checks pass.

- [ ] **Step 6: Commit**

```bash
git add app src/features/cart src/features/catalog src/components/navigation
git commit -m "feat: add persistent inventory-aware cart"
```

### Task 7: Cross-platform polish, accessibility, and milestone verification

**Files:**
- Create: `app/(store)/advisor.tsx`
- Create: `app/(store)/account.tsx`
- Create: `test/accessibility/storefront.test.tsx`
- Create: `test/responsive/storefront.test.tsx`
- Create: `docs/runbooks/local-development.md`
- Modify: `README.md`
- Modify: responsive or accessibility issues found in `app/` and `src/`

**Interfaces:**
- Consumes: all storefront routes and components.
- Produces: documented local setup and verified web/native entry points.

- [ ] **Step 1: Write failing accessibility and narrow-layout tests**

Assert one primary heading per screen, labeled image alternatives, accessible names/states for interactive controls, focusable web links, a visible focus treatment token, reduced-motion fallbacks, and no essential action hidden at a mocked 320 px viewport.

- [ ] **Step 2: Verify RED**

Run: `npm test -- --runInBand test/accessibility/storefront.test.tsx test/responsive/storefront.test.tsx`  
Expected: FAIL on the concrete missing labels, states, or responsive behavior found by the tests.

- [ ] **Step 3: Fix only the identified storefront issues and add honest milestone placeholders**

Advisor and Account routes explain what arrives in later milestones and route shoppers back to useful current flows. Do not simulate functional authentication or AI.

- [ ] **Step 4: Run complete automated verification**

Run: `npm test -- --runInBand && npm run typecheck && npm run lint && npx expo export --platform web`  
Expected: all commands exit 0; the web export completes without route or bundle errors.

- [ ] **Step 5: Perform visual and interaction QA**

Run the app on web at 320 px, 768 px, 1440 px, and one available iOS or Android simulator/device. Verify Home → Shop → Product → Add to cart → Cart, keyboard navigation on web, reduced motion, long product names, sale/regular prices, empty results, unknown route, and empty cart. Record any unavailable native environment explicitly.

- [ ] **Step 6: Update documentation and commit**

Document prerequisites, install/start/test commands, route map, sample-data status, and the boundary between the local repository and future Supabase data.

```bash
git add .
git commit -m "docs: verify foundation storefront milestone"
```

## Milestone acceptance criteria

- The same repository launches for web, Android, and iOS through Expo.
- Home, Shop, Product, and Cart are real working flows using typed sample data.
- The UI matches the approved visual direction and remains readable at 320 px and desktop widths.
- Search, filters, variants, stock states, prices, and cart calculations have automated behavior tests.
- No production secret or real customer data is required.
- Tests, type checking, linting, and Expo web export pass.
- The next milestone can replace `CatalogRepository` with Supabase without changing screen contracts.
