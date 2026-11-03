// Pure helpers for scripts/import-catalog.mjs: CSV parsing and turning
// spreadsheet rows into product payloads the admin_action product.save accepts.
import { productInputSchema } from '../supabase/functions/_shared/commerce.mjs';

export const COLUMNS = [
  'product_key', 'name', 'category', 'goals', 'diet', 'summary', 'description', 'usage', 'warnings', 'nutrition',
  'flavour', 'size', 'mrp', 'price', 'stock', 'default', 'status', 'sku',
  'weight_g', 'ship_weight_g', 'ship_length_cm', 'ship_width_cm', 'ship_height_cm',
];

export const CATEGORIES = ['protein', 'pre-workout', 'post-workout', 'wellness', 'energy', 'vitamins', 'healthy-snacks'];
const GOALS = ['muscle-gain', 'recovery', 'energy', 'endurance', 'weight-management', 'everyday-wellness', 'immunity', 'sleep'];
const DIETS = ['vegetarian', 'vegan', 'gluten-free', 'sugar-free', 'lactose-free'];

// Placeholder packed sizes per category until real measurements are entered.
export const SHIPPING_BOXES = {
  protein: { lengthCm: 20, widthCm: 20, heightCm: 30, extraGrams: 200 },
  'pre-workout': { lengthCm: 12, widthCm: 12, heightCm: 16, extraGrams: 100 },
  'post-workout': { lengthCm: 12, widthCm: 12, heightCm: 16, extraGrams: 100 },
  energy: { lengthCm: 12, widthCm: 12, heightCm: 16, extraGrams: 100 },
  wellness: { lengthCm: 10, widthCm: 10, heightCm: 14, extraGrams: 80 },
  vitamins: { lengthCm: 10, widthCm: 10, heightCm: 14, extraGrams: 80 },
  'healthy-snacks': { lengthCm: 12, widthCm: 12, heightCm: 15, extraGrams: 100 },
};
const DEFAULT_NET_GRAMS = { protein: 1000, 'pre-workout': 300, 'post-workout': 250, energy: 300, wellness: 150, vitamins: 150, 'healthy-snacks': 500 };
export const DEFAULT_WARNINGS = [
  'Read the full label before use and do not exceed the recommended serving.',
  'Not for use by children, pregnant or breastfeeding women. Consult a doctor if you have a medical condition or take medication.',
];

// RFC 4180 CSV (quoted fields, embedded commas/newlines, "" escapes); tolerates a BOM and CRLF.
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const input = text.replace(/^﻿/, '');
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(field); field = ''; }
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && input[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += char;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

export function toCsv(rows) {
  return rows.map((row) => row.map((cell) => {
    const text = String(cell ?? '');
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }).join(',')).join('\r\n') + '\r\n';
}

export const slugify = (value) =>
  String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const list = (value) => String(value ?? '').split(/[;|\n]/).map((item) => item.trim()).filter(Boolean);

function rupeesToPaise(value) {
  const number = Number(String(value ?? '').replace(/[₹,\s]/g, ''));
  return Number.isFinite(number) && number > 0 ? Math.round(number * 100) : NaN;
}

export function gramsFromSize(size) {
  const match = String(size ?? '').match(/([\d.]+)\s*(kg|g|gm|grams?|lbs?)\b/i);
  if (!match) return null;
  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (unit === 'kg') return Math.round(value * 1000);
  if (unit.startsWith('lb')) return Math.round(value * 453.592);
  return Math.round(value);
}

// "Protein=25 g; BCAA=5.5 g" → [{ name: 'Protein', amount: '25 g', note: 'per serving' }]
function nutrition(value) {
  return list(value).map((item) => {
    const [name, ...amount] = item.split('=');
    return { name: name.trim(), ...(amount.length ? { amount: amount.join('=').trim() } : {}), note: 'per serving' };
  }).filter((item) => item.name);
}

const yes = (value) => /^(y|yes|true|1)$/i.test(String(value ?? '').trim());

// Groups option rows by product_key. Product-level cells come from the first row
// that fills them, so the team only has to type them once per product.
export function rowsToProducts(rows, brandName) {
  const [header, ...data] = rows;
  const columns = header.map((name) => name.trim().toLowerCase());
  const missing = ['product_key', 'name', 'category', 'flavour', 'size', 'mrp', 'price'].filter((c) => !columns.includes(c));
  if (missing.length) return { products: [], errors: [`Missing columns: ${missing.join(', ')}`] };

  const errors = [];
  const groups = new Map();
  data.forEach((cells, index) => {
    const line = index + 2;
    const row = Object.fromEntries(columns.map((name, i) => [name, String(cells[i] ?? '').trim()]));
    if (!row.product_key || row.product_key.startsWith('example-')) return;
    if (!groups.has(row.product_key)) groups.set(row.product_key, []);
    groups.get(row.product_key).push({ line, row });
  });

  const brandSlug = slugify(brandName);
  const products = [];
  for (const [key, entries] of groups) {
    const pick = (column) => entries.map((e) => e.row[column]).find(Boolean) ?? '';
    const keySlug = slugify(key);
    const id = (keySlug.startsWith(`${brandSlug}-`) ? keySlug : `${brandSlug}-${keySlug}`).slice(0, 80).replace(/-+$/, '');
    const category = pick('category').toLowerCase();
    const where = `product "${key}" (rows ${entries.map((e) => e.line).join(', ')})`;
    if (!CATEGORIES.includes(category)) { errors.push(`${where}: category must be one of ${CATEGORIES.join(', ')}`); continue; }
    const goals = list(pick('goals')).map((g) => slugify(g));
    const badGoal = goals.find((g) => !GOALS.includes(g));
    if (badGoal) { errors.push(`${where}: unknown goal "${badGoal}" (use ${GOALS.join(', ')})`); continue; }
    const diet = list(pick('diet')).map((d) => slugify(d) === 'veg' ? 'vegetarian' : slugify(d));
    const badDiet = diet.find((d) => !DIETS.includes(d));
    if (badDiet) { errors.push(`${where}: unknown diet "${badDiet}" (use ${DIETS.join(', ')})`); continue; }

    const box = SHIPPING_BOXES[category];
    const variants = [];
    const rowErrors = [];
    for (const { line, row } of entries) {
      const mrp = rupeesToPaise(row.mrp);
      const price = rupeesToPaise(row.price);
      if (!row.flavour || !row.size) { rowErrors.push(`row ${line}: flavour and size are required`); continue; }
      if (Number.isNaN(mrp) || Number.isNaN(price)) { rowErrors.push(`row ${line}: mrp and price must be rupee amounts`); continue; }
      if (price > mrp) { rowErrors.push(`row ${line}: price ₹${row.price} is above MRP ₹${row.mrp}`); continue; }
      const netGrams = Number(row.weight_g) > 0 ? Math.round(Number(row.weight_g)) : gramsFromSize(row.size) ?? DEFAULT_NET_GRAMS[category];
      const variantId = `${id}-${slugify(`${row.flavour}-${row.size}`)}`.slice(0, 100).replace(/-+$/, '');
      variants.push({
        id: variantId,
        sku: (row.sku || variantId).toUpperCase().slice(0, 100),
        label: `${row.flavour} • ${row.size}`,
        flavour: row.flavour,
        size: row.size,
        weightGrams: netGrams,
        shipping: {
          weightGrams: Number(row.ship_weight_g) > 0 ? Math.round(Number(row.ship_weight_g)) : netGrams + box.extraGrams,
          lengthCm: Number(row.ship_length_cm) > 0.5 ? Number(row.ship_length_cm) : box.lengthCm,
          widthCm: Number(row.ship_width_cm) > 0.5 ? Number(row.ship_width_cm) : box.widthCm,
          heightCm: Number(row.ship_height_cm) > 0.5 ? Number(row.ship_height_cm) : box.heightCm,
        },
        price: { amountPaise: price, currency: 'INR' },
        mrp: { amountPaise: mrp, currency: 'INR' },
        stockAvailable: row.stock === '' ? 100 : Math.max(0, Math.round(Number(row.stock) || 0)),
        isDefault: yes(row.default),
      });
    }
    if (rowErrors.length) { errors.push(...rowErrors.map((e) => `${where}: ${e}`)); continue; }
    // Exactly one default option: the first row marked default, else the first row.
    const defaultIndex = Math.max(0, variants.findIndex((v) => v.isDefault));
    variants.forEach((v, i) => { v.isDefault = i === defaultIndex; });

    const status = (pick('status') || 'active').toLowerCase();
    const name = pick('name');
    products.push({
      key,
      id,
      lines: entries.map((e) => e.line),
      payload: {
        id,
        slug: id,
        name,
        brand: brandName,
        category,
        status: ['active', 'draft'].includes(status) ? status : 'active',
        summary: pick('summary') || name,
        description: pick('description') || pick('summary') || name,
        featuredRank: 0,
        createdAt: new Date().toISOString(),
        goals: goals.length ? goals : [{ protein: 'muscle-gain', 'pre-workout': 'energy', 'post-workout': 'recovery', energy: 'energy' }[category] ?? 'everyday-wellness'],
        dietaryTags: [...new Set(diet)],
        ingredients: nutrition(pick('nutrition')),
        media: [],
        variants,
        usage: pick('usage') || 'Follow the serving directions on the product label.',
        warnings: list(pick('warnings')).length ? list(pick('warnings')) : DEFAULT_WARNINGS,
        demoContent: false,
      },
    });
  }
  return { products, errors };
}

// Final check with the same schema the commerce function applies to admin saves.
export function validatePayload(payload) {
  const result = productInputSchema.safeParse(payload);
  return result.success ? null : result.error.issues.map((issue) => `${issue.path.join('.') || 'product'}: ${issue.message}`).join('; ');
}
