# Catalogue import (spreadsheet + photos)

Add many products at once without typing them into admin. Fill in a spreadsheet and drop each product's photos in a folder; the importer checks every row, compresses the photos, uploads them and publishes the products through the same checks as the admin screen.

## 1. Set up a brand (once)

```sh
npm run catalog:template -- muscleblaze "MuscleBlaze"
```

This creates `catalog-import/muscleblaze/`:

| File | What it is |
| --- | --- |
| `products.csv` | One row per flavour/size option. Open and save it in Excel or Google Sheets as **CSV UTF-8**. |
| `photos/<product_key>/` | That product's photos, in the order you want them shown (`01.jpg`, `02.jpg`, …). JPG, PNG, WebP or AVIF; up to 8. |
| `brand.json` | The brand name, plus old product IDs to archive after publishing. |

## 2. Fill in `products.csv`

Rows that share a `product_key` become one product with several options. You only need to type the product details (name, category, description…) on the first row of each product; leave them blank on its other rows. The example row (key starting `example-`) is ignored, so you can keep it for reference.

| Column | Required | Notes |
| --- | --- | --- |
| `product_key` | yes | Short name, also the photo folder name, e.g. `biozyme-performance-whey` |
| `name` | yes | Shown on the store |
| `category` | yes | `protein`, `pre-workout`, `post-workout`, `energy`, `vitamins`, `wellness` or `healthy-snacks` |
| `goals` | | `muscle-gain`, `recovery`, `energy`, `endurance`, `weight-management`, `everyday-wellness`, `immunity`, `sleep` (separate with `;`) |
| `diet` | | `vegetarian` (or `veg`), `vegan`, `gluten-free`, `sugar-free`, `lactose-free` (separate with `;`) |
| `summary` | | One line under the name |
| `description` | | Full description; line breaks are fine inside the cell |
| `usage` | | How to use (defaults to "Follow the serving directions on the product label.") |
| `warnings` | | Separate with `;` (a standard safety note is used when blank) |
| `nutrition` | | Per serving, e.g. `Protein=25 g; BCAA=5.5 g` |
| `flavour`, `size` | yes | Per option, e.g. `Rich Chocolate`, `1 kg` |
| `mrp`, `price` | yes | Rupees, e.g. `3299` and `2499`; price can't be above MRP |
| `stock` | | Units available (default 100) |
| `default` | | `yes` on the option to show first |
| `status` | | `active` (default) or `draft` |
| `sku` | | Your SKU; generated when blank |
| `weight_g`, `ship_weight_g`, `ship_length_cm`, `ship_width_cm`, `ship_height_cm` | | Real packed measurements. When blank, the net weight comes from `size` and a placeholder box is used per category. |

Use photos and text you have the right to use, such as the brand's or your distributor's official pack shots, or your own photos.

## 3. Check and compress

```sh
npm run catalog:prepare -- muscleblaze
```

Every row is validated. Any product with a problem is listed with its row number and left out until it's fixed; the rest are ready. Photos are resized to at most 1200 px and saved as WebP (quality 80), typically 40–150 KB each. Compressed copies are kept brand-wise in `catalog-images/muscleblaze/<product-id>/`. Run it again after fixing anything; nothing is uploaded at this step.

## 4. Publish

```sh
npm run catalog:publish -- muscleblaze
npx supabase db query --remote -f catalog-import/muscleblaze/publish.sql
```

The first command uploads the compressed photos to Supabase Storage and writes `publish.sql`. The second puts the products live: it registers the photos, saves each product as the store owner, and archives the IDs listed in `brand.json`. Re-publishing the same products updates them in place without duplicating photos.

Photo folders, compressed copies and `publish.sql` are kept on this machine and are not committed to git.
