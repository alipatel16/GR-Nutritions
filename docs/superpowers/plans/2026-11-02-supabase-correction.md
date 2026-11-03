# Supabase Correction Implementation Plan

**Goal:** Restore Supabase/PostgreSQL for the approved store while retaining Firebase Google/email authentication.
**Spec:** docs/superpowers/specs/2026-11-02-supabase-correction-design.md
**Execution:** Inline; owner instructed development to start. Keep the existing feature workspace and preserve the approved visual implementation.

## Shared contracts

`storeRequest(action,payload): Promise<unknown>` verifies Firebase identity through the Supabase Edge Function. SQL `customer_action(text,text,jsonb)` and `admin_action(text,text,jsonb)` are executable only by service_role. `catalog_products()` exposes active Product payloads. `Product.updatedAt` detects concurrent edits. All UIDs are text, not Supabase-auth UUIDs.

## Tasks

1. Write SQL security, catalog/quote and JWT verification tests; verify RED. Implement Postgres migration and Firebase verifier; verify GREEN.
2. Implement the verified commerce Edge endpoint and private Storage adapter. Reject unauthenticated requests, forged staff rights and access to unpublished media. Keep URL/key validation and CORS explicit.
3. Replace catalog, account/address, admin, media, orders and checkout adapters. Resolve staff role from PostgreSQL. Test consequential integration behavior and remove Firebase data-service imports/configuration.
4. Verify app/backend tests, SQL and JWT tests, lint, web/native exports and the visual shopping flow. Record missing live access accurately and finish documentation/source handoff.

## Review focus

- Tokens for another Firebase project, expired tokens, unsigned tokens and spoofed caller UIDs must fail.
- Anonymous/customer roles cannot call the privileged RPCs or read private tables.
- Customers cannot select or change another customer's address/order.
- Stale admin saves cannot overwrite updated inventory; duplicate URL/SKU changes roll back.
- Media uploads remain private and customer-requested paths cannot expose drafts.
