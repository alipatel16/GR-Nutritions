# Provider setup implementation plan

> **For agentic workers:** Use superpowers:executing-plans for inline execution with a fresh final review.

**Goal:** Provide real, secure Razorpay webhook URLs and concrete Shiprocket/GoDaddy setup instructions.
**Architecture:** Supabase Edge functions verify raw HMAC and persist minimal mode-scoped receipts using a service-only SQL RPC. Existing Firebase/Supabase store architecture remains intact.
**Tech Stack:** Deno, Web Crypto, PostgreSQL, PGlite, Node test runner.
**Spec:** docs/superpowers/specs/2026-11-02-provider-setup-design.md

## Global constraints

- Fresh inventory; no WordPress data import or customer/payment migration.
- Keep the owner's existing secret names, never retrieve/print secret values.
- Separate immutable test/live entrypoints and webhook secrets.
- No paid-order simulation, real shipment purchases or premature root/www DNS changes.

## Review focus

- Retried/simultaneous webhook deliveries produce one receipt and preserve mode isolation.
- Changed bytes fail HMAC before JSON parsing or any database access.
- Database outage returns a retryable failure rather than losing payment notifications.
- Receipts store only payment/order references and totals, not raw customer PII.
- A webhook receipt does not confirm an unrelated WordPress order or trigger shipment.

## Task 1: verified webhook receipts

- [x] Write Node handler and PGlite grant/deduplication tests; run and observe RED.
- [x] Create migration with the Supabase CLI. Add private receipt table and public service-only ingest RPC.
- [x] Implement shared raw HMAC handler and test/live entrypoints. Verify GREEN with backend/app suites and Deno check.
- [x] Apply migration, deploy both functions and verify configuration state without creating customer orders. Initially missing secrets failed closed; after owner saved both secrets, both report configured:true and unsigned POST returns401. Real signed deliveries wait for Razorpay dashboard setup.

## Task 2: guided provider/domain setup

- [x] Document exact test/live URLs, matching secret names and subscriptions; clearly state remaining reconciliation work.
- [x] Inspect Shiprocket API user and GoDaddy DNS without revealing credentials or changing active domain routing.
- [x] Record fresh-inventory decision and supplied pickup information; ask only for the missing API identity/credential type and shipping policy.
- [x] Fresh security review, verify changes, commit and refresh source archive. No Important/Critical findings; deferred provider-event fixture and simultaneous-session test coverage recorded in runbook.
