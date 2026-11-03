# GR Nutritions Storefront Redesign

## Intent

Rebuild the GR Nutritions customer storefront into a production-grade supplement shopping experience that feels complete on both web and mobile. The redesign must make product discovery fast, keep the existing Supabase/Firebase commerce behavior intact, and remove the visible inconsistencies between authentication state, cart state, navigation, typography, and responsive layout.

## Why this work is needed

The deployed store currently has a strong campaign image but behaves like a small landing page rather than a mature retailer. It exposes only a few products, has no real carousel experience, repeats the same destination for several discovery actions, hard-codes the account label to “Sign in,” positions the cart count as a detached flex item, and provides too little content hierarchy below the hero. The current workspace is also behind the deployed source: the live brand directory and hosted catalogue assets exist in the previous working copy but not in this folder.

## Goals

- Make the home page feel like a complete multi-brand supplement store on mobile, tablet, and desktop.
- Use one coherent typography, spacing, color, radius, and motion system.
- Provide a rotating campaign hero with manual controls, indicators, accessible labels, and reduced-motion behavior.
- Add rich discovery paths for categories, goals, brands, bestsellers, performance products, wellness products, and new arrivals.
- Keep each category, goal, brand, and search action reflected in the URL and visible catalogue results.
- Show signed-in customer identity in the header and keep the cart badge visually attached to the cart icon.
- Preserve all existing catalogue, cart, checkout, account, order, admin, Razorpay, Firebase Auth, and Supabase behavior.
- Restore source parity with the currently deployed seven-brand catalogue before redesigning.

## Non-goals

- No backend schema migration or change to live product/order data.
- No replacement of Expo Router, React Native Web, Firebase Authentication, or Supabase.
- No invented ratings, testimonials, delivery promises, medical claims, discounts, or authenticity certifications.
- No autoplay motion when the customer requests reduced motion.
- No publication to production until the local export and responsive checks pass.

## Anti-goals

- A homepage made only of decorative banners with no useful product access.
- Desktop-only layouts that collapse awkwardly on phones.
- Heavy animation that slows shopping, shifts layout, or blocks interaction.
- Copying a competitor’s visual identity.
- Hiding navigation state inside component-local state while the URL says something else.

## Constraints

- Expo 58, React Native 0.88, Expo Router 58, TypeScript, and the existing dependency set remain in place.
- Barlow Condensed remains the display family and DM Sans remains the body family; their loading and fallbacks must be reliable on static web export.
- Existing public catalogue images and official brand logos are reused.
- The customer-facing experience must remain usable at 320 px width and at desktop widths of 1200 px and above.
- Every interaction remains keyboard accessible and has a meaningful accessible name.

## Research findings

The strongest current supplement storefronts are dense but organized. Nutrabay leads with search, delivery context, a campaign carousel, trust offers, visual category shortcuts, several filtered product rails, top brands, deals, authenticity messaging, and a full support footer. MuscleBlaze adds product and offer rails, shop-by-level and shop-by-goal discovery, authenticity, and strong category navigation. Myprotein keeps a cleaner visual system but still uses campaign rotation, shortcut categories, product tabs, quick-buy patterns, account state, and a large support/footer layer.

GR should combine those patterns with its own calmer forest/coral identity: premium rather than noisy, but far richer than the current page.

## Approaches considered

### 1. Cosmetic patch

Keep the current page and only adjust fonts, spacing, account text, and the cart badge. This is quick but leaves the small catalogue experience, repeated flows, and missing carousel problem unsolved.

### 2. Home-only redesign

Replace the homepage while leaving header and catalogue state untouched. This improves first impressions but preserves the broken signed-in label and repeated category behavior.

### 3. Modular retail-first rebuild — selected

Restore the latest deployed source, repair shared state/navigation, and rebuild the homepage as reusable campaign, category, brand, product-rail, trust, and advisor components. This is the largest option, but it addresses the customer journey as one system and makes future merchandising changes inexpensive.

## Experience design

### Header

Desktop uses a compact announcement strip, brand mark, large search field, delivery/account/cart actions, and a horizontal category bar. Mobile uses a simplified brand/action row, a full-width search field, horizontally scrollable discovery chips, and the existing bottom navigation. Signed-in customers see their first name or email prefix plus “Account”; signed-out customers see “Sign in.” The cart count sits as an absolute badge on the bag icon and is hidden when zero.

### Hero carousel

Three campaigns rotate every six seconds when reduced motion is off. Each slide has a distinct merchandising objective, concise copy, primary/secondary actions, and a product or lifestyle visual built from existing assets. Previous/next controls and indicator buttons allow manual navigation. Motion is a short fade/translate transition; no layout shift occurs.

### Discovery and merchandising

Below the hero:

1. Trust strip with four store promises grounded in existing behavior.
2. Horizontal category rail with distinct destinations for protein, creatine/recovery, pre-workout, vitamins/wellness, and healthy snacks.
3. Goal cards for muscle gain, energy, recovery, everyday wellness, immunity, and weight management.
4. Bestsellers product carousel.
5. Brand logo rail and full brand directory link.
6. Performance product carousel for pre/post-workout products.
7. GR Coach editorial banner.
8. Everyday wellness product carousel.
9. New arrivals carousel.
10. Rich footer with shopping, account, support, and policy destinations already available in the app.

Product rails must use real catalogue data and remain useful with fewer items. They scroll horizontally on mobile and show responsive multi-card pages on larger screens.

### Catalogue state

The URL is the source of truth for route-provided filters. When category, goal, brand, or search parameters change while the shop screen is already mounted, the visible results must update. Local filter interactions continue to update the URL.

### Motion

Campaign transitions, section reveals, pressed states, and carousel scrolling use restrained motion. Reduced-motion users receive immediate state changes and no autoplay. Motion never gates content or navigation.

## Verification

- Component tests reproduce and lock the account label, cart badge, route-filter synchronization, carousel controls, and homepage discovery sections.
- Responsive tests cover 320 px, tablet, and desktop presentation decisions.
- Full unit suite, backend suite, TypeScript, lint, and static web export must pass.
- The exported site is inspected at mobile and desktop viewports before any deployment.

