# GR Nutritions

India-first supplement store for web, iOS and Android. Expo Router 58, React Native, Firebase Authentication, Supabase PostgreSQL/Storage/Edge Functions, Lucide, Barlow Condensed and DM Sans.

The approved GR Store design is implemented in the application. Home, category/brand discovery, product variants, cart, guided GR Coach, Google/email account, multiple delivery addresses, authenticated checkout, customer orders and a protected admin workspace are included.

```sh
nvm use
npm install
cp .env.example .env.local
npm start
```

Press `w`, `i` or `a` for web, iOS or Android. Existing EAS project: `942940ef-fa36-470d-8201-38f84207637b`. Firebase project: `grnutritions`.

## Verify

```sh
npm test -- --runInBand
npm run typecheck
npm run lint
npm run test:backend
npx expo export --platform web
node scripts/verify-hosting.mjs
```

Backend tests use an isolated PostgreSQL engine (PGlite), signed test tokens and mocked provider boundaries. They never touch customer accounts or a hosted database.

## Activation

The website is hosted at https://grnutritions.web.app on Firebase Hosting; Supabase project `wfibeisijbftvldgjgdb` in Mumbai runs the store database, media and protected API. Firebase supplies sign-in and static hosting; no Firebase Cloud Functions are used. Read `docs/runbooks/provider-setup.md` for deployment/domain status and `docs/runbooks/checkout-backend.md` for checkout operations.

The sample catalog is explicitly labeled. Set `EXPO_PUBLIC_CATALOG_MODE=live` only after adding real active products and packed shipping measurements. Online Razorpay/COD checkout, stock reservations, verified callbacks/webhooks, delivery checks, owner shipment creation and customer tracking are implemented. Delivery is ₹50 through ₹999 and free strictly above ₹999; COD adds ₹200. Checkout defaults to test mode. A successful provider authentication check does not replace a complete test-mode purchase.

Native Google login needs platform OAuth registration and device verification. Native Razorpay requires an installed development/release build; Expo Go cannot open the payment SDK. GR Coach uses deterministic catalog matching; conversational AI, GST/invoices, refund operations and store policies still require launch work. The GoDaddy domain continues serving WordPress until the planned DNS cutover.

Never put service account credentials, Razorpay secrets or AI keys in client environment variables or source control.

Inventory will be entered fresh; no WordPress data import is planned. Both Razorpay modes and Shiprocket authenticated successfully in staff-only read checks. See the provider runbook for what is deployed, tested and still pending.
