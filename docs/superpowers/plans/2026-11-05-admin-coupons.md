# Admin Coupons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. The backend and UI may be implemented independently under dispatching-parallel-agents with a shared API contract.

**Goal:** Add admin-configured, server-enforced single-use customer coupons to existing checkout.

**Architecture:** Private coupon/redemption records extend the existing atomic checkout operations. The commerce endpoint exposes staff coupon management and accepts only a coupon code from customers. Checkout and order views render server-returned discount snapshots.

**Tech Stack:** Existing Postgres migrations/PGlite tests, Supabase Edge JavaScript, React Native/Expo, Zod and current admin components.

**Spec:** `docs/superpowers/specs/2026-11-05-admin-coupons-design.md`.

## Global Constraints

- Preserve all existing checkout protections, stock reservations, mode isolation and exact paise amounts.
- Admin-only definitions/settings; one successful use per Firebase UID; capped aggregate usage including active reservations.
- Percentage/fixed discounts, min spend, optional percentage cap, time window and enabled flag.
- Revalidate expiry/settings/limits before order creation; no client-calculated discounts.
- Apply discount to merchandise; free-delivery threshold uses discounted merchandise; keep at least ₹1 merchandise payable.
- Existing orders remain valid. Do not create any live discount code automatically.

## Review Focus

- Concurrent last-use attempts and double-click retries cannot over-redeem.
- Expired holds and late provider confirmations cannot silently bypass usage limits.
- A coupon changed after quoting must not create a differently priced payment than shown.
- Browser roles cannot edit/read private definitions or spoof identity/discount amounts.
- Decimal percentage discounts, shipping thresholds and COD invoices remain exact in paise.

### Task 1: Backend coupon management and atomic checkout

**Files:** New CLI-created migration; `supabase/functions/_shared/checkout.mjs`, provider invoice mapping and relevant backend tests.

- [x] Agree exact JSON contract for coupon management, delivery quotes and order snapshots with the UI implementer before changes.
- [x] Add failing tests for authorization, validation, percentage/fixed math, expiry/usage, per-customer use, holds/retries and stale quotes.
- [x] Implement private schema, service-only operations and coupon-aware checkout; preserve current invoice/payment protections.
- [x] Verify new tests and existing backend tests. Deliver the unapplied migration and deployment notes for root review.

### Task 2: Admin and customer UI

**Files:** New coupon admin panel/repository; `AdminScreen.tsx`, checkout service/hook/screen and order displays.

- [x] Add meaningful tests for staff editing and customer apply/remove/error/quote invalidation behavior.
- [x] Add searchable coupon admin controls with usage, status and expiry; no browser discount authority.
- [x] Add coupon input and server discount line to checkout and applicable order summaries.
- [x] Run focused tests and typecheck; preserve empty-coupon backward compatibility.

### Task 3: Review and deploy

- [x] Review the complete backend/UI contract, security and lifecycle behavior; resolve material findings.
- [x] Apply only the new migration through the existing authorized database deployment flow; never repair old migration history.
- [x] Deploy affected Edge functions and web build, then verify API access controls, existing checkout and deployed coupon controls without making a real charge or activating a sample promotion.
- [x] Record tests, deployed changes and operational limits in the runbook.

Completed and deployed on 10 November 2026. See `docs/runbooks/catalog-coupons-launch-2026-11-10.md` for exact additions, deployment evidence and verification limits.
