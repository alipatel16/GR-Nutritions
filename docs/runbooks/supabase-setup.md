# GR Nutritions backend setup

## Architecture and current state

Firebase project `grnutritions` handles email/password and Google sign-in plus static website hosting. Supabase holds store data in PostgreSQL, product images in private Storage and the protected commerce API. Razorpay and Shiprocket are integrated through server-only adapters; see `checkout-backend.md`.

Project `wfibeisijbftvldgjgdb` (GR Nutritions) is deployed in Mumbai (`ap-south-1`) under the owner-selected organization on its Free plan. Foundation, media, webhook, secure-checkout and admin-alias-fix migrations are applied; commerce and both Razorpay webhook functions are ACTIVE. `.env.local` contains public settings only and is ignored by Git. Live smoke checks pass for catalog access, denied private reads/RPCs, invalid login rejection and hosted/local CORS. The signed-in owner admin reads, invalid form prevention and provider authentication/pickup diagnostics were verified. Full hosted purchases, uploads and native Google/payment flows still need release testing. The previously created empty Firestore database is unused. No billing plan was changed.

## Connect and deploy

The Supabase plugin is connected. This project was created after the owner selected their organization/Mumbai and Supabase quoted a $0 project cost. Future deployments can use the same connector or an owner-controlled CLI session. Do not create a duplicate project.

Using the official Supabase CLI:

```sh
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase secrets set STORE_ALLOWED_ORIGINS=https://YOUR_DOMAIN,http://localhost:8083
supabase functions deploy commerce
```

Replace the example project and domain. Use exact origins without trailing slashes; include `www` separately if needed. The source defaults include localhost ports8083/8081 and the exact Firebase/Expo review hosts; a `STORE_ALLOWED_ORIGINS` value replaces that entire list. Add final custom-domain origins at cutover. Supabase provides its URL and server key environment variables; the entrypoint prefers `SUPABASE_SECRET_KEYS` with a legacy service-role fallback. Never expose server keys to Expo. Gateway JWT verification is disabled because commerce itself verifies Firebase identity and each webhook independently checks its mode-specific raw-body HMAC. Do not remove these internal checks.

Copy `.env.example` to `.env.local` locally and enter only the public Supabase project URL and publishable key. Never paste service role, database passwords, payment secrets or service accounts into chat. Restart Expo after changing environment variables.

The example file already contains this project's public URL/key; copying it connects another local checkout to the same backend. It contains no server credentials. The designated owner `alipatel05@gmail.com` was matched to an existing verified, enabled Firebase user and granted staff membership in PostgreSQL. Sign out/in once if role visibility was cached. The hosted database confirms `isAdmin: true` for that account; its signed-in browser/upload workflow still needs device/user verification.

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
EXPO_PUBLIC_CATALOG_MODE=sample
```

## Owner access

Create the owner's Firebase login first. Obtain its exact UID from Firebase Authentication → Users. With the Supabase project owner account, insert that UID using the SQL editor:

```sql
insert into private.staff_memberships(firebase_uid)
values ('REPLACE_WITH_OWNER_FIREBASE_UID')
on conflict do nothing;
```

Only do this for the explicitly designated store owner/staff. Membership controls product edits, inventory, upload URLs and fulfillment. Firebase custom claims do not grant store access. Sign out and sign in after changing membership; the API checks the database on every staff action even if a screen has cached its role.

## Catalog and administration

Open `/admin` after sign-in. Add actual brands/products, flavours, sizes, MRP, price, stock, ingredients, warnings and product photos. Upload JPEG, PNG or WebP images smaller than 6 MB. Uploads stay private. After upload, the API checks storage metadata before accepting the image into a product. Signed image previews last 15 minutes; catalog reloads refresh them. Abandoned draft uploads are retained pending a future cleanup workflow.

Save as draft while preparing content. Publish active only after checking the sale label and inventory. The sample products/concept imagery are not sale labels or proof of supplier affiliation. Once real products exist, switch `EXPO_PUBLIC_CATALOG_MODE=live` and restart/rebuild. Live failures never silently substitute sample stock.

Products use optimistic concurrency: an old edit cannot overwrite newer stock/product edits. Reload and reapply the edit after a conflict. Duplicate product URLs and SKUs roll back the entire product save. Checkout reads live price/stock in paise and checks the signed-in customer's address; quotes expire after five minutes and neither reserve stock nor take payment. Failed revalidation clears the previous quote.

## Sign-in

Firebase email/password and Google providers were enabled by the owner. Web Google login needs `localhost` and the production domain in Firebase Authentication's authorized domains, with matching OAuth settings.

Native Google login also requires Android/iOS OAuth client registrations, correct bundle/package identifiers, Android signing fingerprints and development-build verification. Set `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` and `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` after those registrations. The Firebase web app ID is not a native Google client ID. Test sign-in, cancellation, refresh and relaunch on both devices before release.

## Security model

- Edge verifies RS256 Firebase signatures, exact project issuer/audience, expiry and UID before using a privileged SQL RPC. Body UIDs and admin flags are ignored.
- Customer/staff RPCs are granted only to `service_role`; anonymous and authenticated Data API roles cannot execute them or access private store tables.
- Only active catalog documents are exposed through `catalog_products()`. Staff membership, media registry, request limits and audit records live in a non-exposed private schema.
- Address mutations serialize per customer and preserve one default address. Cross-customer reads and writes fail. Orders can only be read by the customer or staff.
- The API does not accept customer-created paid orders. Staff fulfillment transitions require an already paid order and cannot skip stages.
- Media download signing requires an active product reference or staff identity. Upload paths are server-generated and non-overwriting; the bucket is private.
- Signed-in requests have a database-backed limit of 60 per minute. Production abuse protection, monitoring and capacity testing still need launch configuration.

## Verification and launch work

The Supabase security advisor reports intentional public execution of the active-only catalog function and RLS-without-client-policies on four public tables. Private operations use service-only RPCs. A separate table summary warns generically about private-schema RLS being off; live privilege checks confirm both client roles lack private-schema usage and the anonymous role lacks staff-table SELECT and customer-RPC EXECUTE. The schema is not exposed. See Supabase's [RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security) and [function advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable). Do not grant client access to quiet an advisor. New-project unused-index notices are expected before customer traffic.

```sh
npm run test:backend
npm test -- --runInBand
npm run typecheck
npm run lint
npx expo export --platform web
npx expo export --platform ios --platform android --output-dir work/native-export
node --env-file=.env.local scripts/verify-live-backend.mjs
```

After deployment, verify with two customer accounts and one owner account: Google/email login, separate addresses/defaults/orders, unauthorized admin rejection, draft visibility, image upload/publication, stock conflicts and live quote totals. Do not call offline test results evidence of hosted deployment.

The checkout follow-up now implements server-created Razorpay orders, verified callbacks/webhooks, inventory reservation/expiry, idempotency, COD and Shiprocket serviceability/fulfillment/tracking. See `checkout-backend.md` and `provider-setup.md` for current deployment and test evidence. Still required for launch: full hosted test-mode purchase with real catalog content, native-device checks, tax/invoice policy, operational returns/refunds, production email checks, conversational AI configuration and store policy pages. No payment success is simulated.
