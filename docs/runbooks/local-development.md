# Local development runbook

## What this milestone includes

The foundation storefront runs from one Expo Router codebase on web, iOS, and
Android. It currently includes:

- an editorial Home experience;
- a searchable, filterable Shop backed by 12 typed demo products;
- product details, variants, stock states, usage information, and warnings;
- a versioned, locally persisted cart with integer-paise totals and stock limits;
- guided catalog recommendations, Google/email accounts and saved addresses;
- server-verified Razorpay/COD checkout, customer orders and tracking;
- protected product/inventory/orders administration; and
- accessible navigation and responsive layouts from 320 px upward.

All products, prices, inventory, claims, and artwork are demo content. Nothing
in this milestone should be treated as a live product label or medical advice.

## Prerequisites

- Node.js 22.23.3 (pinned in `.nvmrc`)
- npm 10 or newer
- Xcode and an iOS simulator for iOS development
- Android Studio and an Android emulator for Android development
- A development/release build for native Razorpay; Expo Go is limited to browsing

## Install and start

```bash
nvm use
npm install
npm start
```

From the Expo terminal, press `w` for web, `i` for iOS, or `a` for Android.
The equivalent direct commands are:

```bash
npm run web
npm run ios
npm run android
```

If Expo reports that the port is already occupied, stop the earlier Expo
process or choose another port.

## Route map

| Route | Current behavior |
| --- | --- |
| `/` | Home, goals, featured products, and advisor entry |
| `/shop` | Search, category/goal filters, sorting, and product grid |
| `/product/[slug]` | Gallery, variants, inventory, price, facts, and add to cart |
| `/cart` | Persistent cart and stock-aware quantities |
| `/checkout` | Owned delivery address, shipping check, online payment or COD |
| `/advisor` | Guided catalog recommendations by goal and budget |
| `/account` | Google/email sign-in, verification and saved addresses |
| `/orders` | Owned orders, payment status and shipping tracking |
| `/admin` | Staff product editor, inventory, orders and provider diagnostics |
| any unknown path | Branded recovery state with a link back to Shop |

## Quality checks

Run the full local gate before committing:

```bash
npm test -- --runInBand
npm run typecheck
npm run lint
npx expo export --platform web
```

The tests cover catalog behavior, filters, currency, product variants, invalid
routes, stock-aware cart rules, navigation badges, accessibility, and 320 px
responsive behavior.

## Data and backend boundary

Screens depend on the `CatalogRepository` contract rather than importing demo
products directly. The current `localCatalogRepository` validates and serves
deterministic seed data. The backend milestone will add a Supabase-backed
implementation of the same contract, so Home, Shop, and Product screens do not
need to be rewritten.

The backend milestone will own:

- admin authentication and role-based access;
- product, variant, category, media, inventory, and promotion management;
- customer profiles, addresses, orders, and order events;
- server-authoritative pricing, inventory, tax, and discount checks;
- Razorpay order creation, signature verification, and webhooks; and
- advisor sessions and server-side AI calls with safety guardrails.

Never put Supabase service-role keys, Razorpay secrets, OpenAI keys, or webhook
secrets in Expo public environment variables. Only public client configuration
belongs in the app; privileged operations must run on the server.

## Visual QA record

The foundation milestone was checked on 2 November 2026 at 320 px, 768 px, and
1440 px in the web build, plus an iPhone 18 Pro simulator running iOS 27.0.
The Home → Shop → Product → Add to cart → Cart journey passed on web and iOS.
Keyboard focus, reduced-motion-safe behavior, long names, regular/sale prices,
empty filters, unknown routes, and the empty cart were also checked. No Android
emulator or physical Android device was connected during this pass.
