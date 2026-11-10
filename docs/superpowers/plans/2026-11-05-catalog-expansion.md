# Requested Brand Catalog Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Independent public catalog collection is delegated under the dispatching-parallel-agents skill.

**Goal:** Add verified products and logos for the fourteen requested brands to the existing live GR Nutritions catalog.

**Architecture:** Reuse the CSV/photo importer, its image validation and existing admin publish operation. Collect independent source datasets, review their prices, product grouping, descriptions and images, then prepare and publish brand batches. Preserve existing products and all store behavior.

**Tech Stack:** Node.js collection scripts, existing CSV importer and Sharp compression, Supabase catalog/media, Firebase Hosting brand assets.

**Spec:** User request in this chat dated 5 November 2026, with the previously approved 100-unit stock and multiple-photo import workflow.

## Global Constraints

- Requested brands: Avvatar, TruNativ, TrueBasics, Anabolic Research, NOW Foods, Kapiva, QNT, Hypertrophy, International Protein, Scitec Nutrition, Pintola, MaaMade, RiteBite Max Protein, Americanz Muscles.
- NOW Foods and Kapiva: wellness only. Pintola: oats and peanut butter. MaaMade: oats. Max Protein: bars and wafers.
- Use real current INR prices for matching sizes; do not convert foreign prices or invent specifications.
- Use genuine, distinct product photos; target 3–4 per product, and report source limitations.
- Use existing approved stock of 100 per imported option. Do not overwrite unrelated existing inventory.
- No duplicate product families or retailer names in customer descriptions. Preserve manufacturer safety information; paraphrase descriptions.
- Use only ordinary public source access, paced per host. Stop at access controls.

## Review Focus

- Foreign-currency or mismatched pack prices must not be interpreted as INR.
- Flavor and size choices belong to their correct product family; bundle promotions must not inflate product counts.
- Oats, peanut butter, bars and wafers remain healthy snacks despite protein in their names.
- Each gallery must show the product being sold, with distinct useful photos and no repeated crops.
- Brand logos, product filters and media must resolve in the deployed store after publishing.

### Task 1: Collect and review source datasets

**Files:** Create brand folders under `catalog-import/`; retain provenance and excluded-product reasons in source manifests.

- [x] Collect official details, galleries, variants and brand logos; use matching India offers where official prices are in foreign currency.
- [x] Check category restrictions, exact variant/pack prices, product duplication, image identity and descriptions before accepting rows.
- [x] Generate `products.csv`, `brand.json`, `sources.json` and downloaded photo folders using the existing import schema.

### Task 2: Prepare and publish catalog batches

**Files:** Existing `scripts/import-catalog.mjs`; generated `catalog-images/<brand>/manifest.json` and brand publish SQL.

- [x] Snapshot live catalog IDs/brands and detect pre-existing matching products.
- [x] Run existing importer tests and per-brand preparation; inspect every validation failure.
- [x] Upload verified photos and apply generated SQL via existing admin validation; leave existing products untouched.
- [x] Query live products, categories, variants, stocks and image counts and compare with the reviewed source manifest.

### Task 3: Add logos and verify the storefront

**Files:** Modify `src/features/catalog/BrandGrid.tsx`; add official logos under `public/catalog/brands-v1/`; add launch report in `docs/runbooks/`.

- [x] Add source-verified logos for each published brand, following the existing image/background treatment.
- [x] Run relevant catalog checks, typecheck, web export and Hosting deployment.
- [x] Verify live catalog counts, representative galleries, brand filtering and hosted logo assets.
- [x] Report exact additions by brand and any source limitations; do not describe unavailable products as published.

Execution continues under the user's existing instruction to carry out catalog imports without asking for repeated confirmation. No new store features are planned.

Completed and deployed on 10 November 2026. See `docs/runbooks/catalog-coupons-launch-2026-11-10.md` for exact additions, deployment evidence and verification limits.
