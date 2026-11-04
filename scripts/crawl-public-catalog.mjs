#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

import { COLUMNS, gramsFromSize, slugify, toCsv } from './catalog-import-lib.mjs';

const root = new URL('../', import.meta.url);
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const sources = [
  { kind: 'shopify', folder: 'wellbeing-nutrition', brand: 'Wellbeing Nutrition', target: 117,
    url: 'https://wellbeingnutrition.com', feed: '/collections/shop-all-1/products.json?limit=250' },
  { kind: 'shopify', folder: 'c9-nutrition', brand: 'C9 Nutrition', target: 9, url: 'https://c9nutrition.com' },
  { kind: 'shopify', folder: 'gnc', brand: 'GNC', target: 15, url: 'https://www.guardian.in',
    exclude: /shaker|\(copy\)|virtual|test product|free shipping|\+/i },
  { kind: 'healthkart', folder: 'muscletech', brand: 'MuscleTech', target: 10,
    url: 'https://www.healthkart.com/brand/muscletech?navKey=BR-502' },
  { kind: 'healthkart', folder: 'dymatize', brand: 'Dymatize', target: 2,
    url: 'https://www.healthkart.com/brand/dymatize?navKey=BR-497', families: [/iso.?100/i, /elite.*whey/i] },
  {
    kind: 'healthkart',
    folder: 'muscleblaze',
    brand: 'MuscleBlaze',
    target: 25,
    url: 'https://www.healthkart.com/brand/muscleblaze?navKey=BR-539',
  },
  {
    kind: 'healthkart',
    folder: 'rule-one',
    brand: 'Rule One Proteins',
    target: 19,
    url: 'https://www.healthkart.com/brand/rule-one?navKey=BR-2347',
  },
  {
    kind: 'healthkart',
    folder: 'one-science',
    brand: 'One Science Nutrition',
    target: 20,
    url: 'https://www.healthkart.com/brand/one-science?navKey=BR-2797',
  },
  {
    kind: 'shopify',
    folder: 'transformium',
    brand: 'Transformium Nutrition',
    target: 15,
    url: 'https://transformium.co',
  },
  {
    kind: 'shopify',
    folder: 'optimum-nutrition',
    brand: 'Optimum Nutrition',
    target: 21,
    url: 'https://www.optimumnutrition.co.in',
  },
];

async function fetchText(url) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
        'accept-language': 'en-IN,en;q=0.9',
        'user-agent': 'GR-Nutritions-Catalog-Importer/1.0 (+https://grnutritions.web.app)',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(30_000),
    });
    if (response.ok) return response.text();
    if (response.status !== 429 || attempt === 3) throw new Error(`${response.status} ${url}`);
    const retrySeconds = Math.min(30, Number(response.headers.get('retry-after')) || 8 * (attempt + 1));
    console.log(`Rate limited. Retrying ${url} in ${retrySeconds}s`);
    await delay(retrySeconds * 1000);
  }
  throw new Error(`Could not load ${url}`);
}

function cleanText(value) {
  return String(value ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function categoryFor(name) {
  const value = name.toLowerCase();
  if (/whey|protein|gainer|mass gain|collagen/.test(value)) return 'protein';
  if (/pre.?workout|pre lift|pump|hazard|ass buster/.test(value)) return 'pre-workout';
  if (/creatine|bcaa|eaa|amino|glutamine|recovery/.test(value)) return 'post-workout';
  if (/energy|carnitine/.test(value)) return 'energy';
  if (/vitamin|multi|omega|fish oil|zma|mineral/.test(value)) return 'vitamins';
  if (/oat|peanut|snack|bar/.test(value)) return 'healthy-snacks';
  return 'wellness';
}

function goalsFor(category) {
  if (category === 'protein') return 'muscle-gain; recovery';
  if (category === 'pre-workout') return 'energy; endurance';
  if (category === 'post-workout') return 'recovery; muscle-gain';
  if (category === 'energy') return 'energy; endurance';
  if (category === 'vitamins') return 'everyday-wellness; immunity';
  if (category === 'healthy-snacks') return 'weight-management; everyday-wellness';
  return 'everyday-wellness';
}

function sizeAndFlavour(name, variantTitle = '') {
  const unitPattern = /\b\d+(?:\.\d+)?\s*(?:kg|g|gm|lb|lbs|ml|tablets?|capsules?|caps|softgels?|servings?)\b/gi;
  const combined = variantTitle.match(unitPattern) ? variantTitle : name;
  const sizes = [...combined.matchAll(unitPattern)]
    .map((match) => match[0]);
  sizes.sort((a, b) => (gramsFromSize(b) ?? 0) - (gramsFromSize(a) ?? 0));
  const size = sizes[0] ?? '1 unit';
  const title = variantTitle && !/^default title$/i.test(variantTitle) ? variantTitle : name;
  let flavour = title
    .replace(size, '')
    .replace(/\b(?:pack of \d+|\d+ servings?)\b/gi, '')
    .split(/\s[-–|]\s|,/) 
    .at(-1)
    ?.trim() ?? '';
  if (!flavour || flavour.length > 80 || flavour === title) flavour = /unflavou?red/i.test(title) ? 'Unflavoured' : 'Standard';
  return { size, flavour };
}

function rowFor({ key, name, description, price, mrp, sku, variantTitle }) {
  const category = categoryFor(name);
  const { size, flavour } = sizeAndFlavour(name, variantTitle);
  const summary = cleanText(description).slice(0, 220) || `${name} from the official brand catalogue.`;
  return {
    product_key: key,
    name,
    category,
    goals: goalsFor(category),
    diet: '',
    summary,
    description: cleanText(description).slice(0, 1800) || summary,
    usage: 'Follow the serving directions on the product label.',
    warnings: 'Read the full product label, including age-specific directions, ingredients, allergens and warnings before use.',
    nutrition: '',
    flavour,
    size,
    mrp: String(Math.max(Number(mrp) || Number(price), Number(price))),
    price: String(Number(price)),
    stock: '100',
    default: 'yes',
    status: 'active',
    sku: String(sku || key).toUpperCase().slice(0, 100),
    weight_g: '',
    ship_weight_g: '',
    ship_length_cm: '',
    ship_width_cm: '',
    ship_height_cm: '',
  };
}

function productJsonLd(html) {
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(match[1]);
      const entries = Array.isArray(parsed) ? parsed : [parsed];
      const product = entries.find((entry) => {
        const type = entry?.['@type'];
        return type === 'Product' || (Array.isArray(type) && type.includes('Product'));
      });
      if (product) return product;
    } catch {}
  }
  return null;
}

function healthkartGallery(html, primary) {
  const primaryUrl = Array.isArray(primary) ? primary[0] : primary;
  if (!primaryUrl) return [];
  const basename = new URL(primaryUrl).pathname.split('/').at(-1) ?? '';
  const marker = basename.replace(/^prd_\d+-/, '').replace(/_(?:o|c_[a-z]+)\.[^.]+$/i, '');
  const candidates = [...html.matchAll(/"o_link":"(https:[^"]+)"/g)].map((match) => match[1].replaceAll('\\u0026', '&'));
  return [...new Set([primaryUrl, ...candidates.filter((url) => url.includes(marker))])].filter((url) => /_o\.(?:jpe?g|png|webp)(?:\?|$)/i.test(url)).slice(0, 4);
}

async function healthkartProducts(source) {
  const listing = await fetchText(source.url);
  const links = [...new Set([...listing.matchAll(/https:\/\/www\.healthkart\.com\/sv\/[^"< ]+/g)].map((match) => match[0].replaceAll('&amp;', '&')))];
  const products = [];
  for (const url of links) {
    if (products.length >= source.target) break;
    try {
      const html = await fetchText(url);
      const data = productJsonLd(html);
      const images = data ? healthkartGallery(html, data.image) : [];
      const price = Number(data?.offers?.price);
      if (!data?.name || !Number.isFinite(price) || images.length < 3) continue;
      if (source.families && !source.families.some((pattern) => pattern.test(data.name)
        && !products.some((product) => pattern.test(product.row.name)))) continue;
      const sku = data.sku || new URL(url).searchParams.get('navKey') || slugify(data.name);
      products.push({
        row: rowFor({
          key: `${slugify(data.name)}-${slugify(sku)}`,
          name: data.name,
          description: data.description,
          price,
          mrp: price,
          sku,
        }),
        images,
        sourceUrl: url,
      });
      process.stdout.write(`${source.brand}: ${products.length}/${source.target}\r`);
    } catch (error) {
      process.stderr.write(`\nSkipped ${url}: ${error.message}\n`);
    }
    await delay(1200);
  }
  process.stdout.write('\n');
  return products;
}

async function shopifyProducts(source) {
  const data = JSON.parse(await fetchText(`${source.url}${source.feed ?? '/products.json?limit=250'}`));
  const products = [];
  for (const product of data.products ?? []) {
    if (products.length >= source.target) break;
    if (source.folder !== 'wellbeing-nutrition' && /shaker|t-?shirt|cap\b|gym bag|accessor/i.test(product.title)) continue;
    if (source.exclude?.test(product.title)) continue;
    const variant = product.variants?.find((item) => Number(item.price) > 0) ?? product.variants?.[0];
    const images = [...new Set((product.images ?? []).map((image) => image.src))].slice(0, 4);
    if (!variant || Number(variant.price) <= 0 || images.length < 3) {
      console.log(`Excluded ${product.title}: price=${variant?.price}, images=${images.length}`);
      continue;
    }
    const price = Number(variant.price);
    const mrp = Number(variant.compare_at_price) || price;
    products.push({
      row: rowFor({
        key: product.handle,
        name: product.title,
        description: product.body_html,
        price,
        mrp,
        sku: variant.sku || `${source.folder}-${variant.id}`,
        variantTitle: variant.title,
      }),
      images,
      sourceUrl: `${source.url}/products/${product.handle}`,
    });
  }
  return products;
}

async function download(url, destination) {
  const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  await writeFile(destination, Buffer.from(await response.arrayBuffer()));
}

async function saveSource(source, products) {
  if (products.length < source.target) throw new Error(`${source.brand}: only ${products.length}/${source.target} products have at least three photos`);
  const directory = new URL(`catalog-import/${source.folder}/`, root);
  await mkdir(new URL('photos/', directory), { recursive: true });
  let existing = { name: source.brand, archive: [] };
  try { existing = JSON.parse(await readFile(new URL('brand.json', directory), 'utf8')); } catch {}
  await writeFile(new URL('brand.json', directory), `${JSON.stringify({ ...existing, name: source.brand }, null, 2)}\n`);
  const rows = [COLUMNS, ...products.map(({ row }) => COLUMNS.map((column) => row[column] ?? ''))];
  await writeFile(new URL('products.csv', directory), toCsv(rows));
  const sourceIndex = [];
  for (const [productIndex, product] of products.entries()) {
    const photoDirectory = new URL(`photos/${product.row.product_key}/`, directory);
    await mkdir(photoDirectory, { recursive: true });
    for (const [imageIndex, imageUrl] of product.images.entries()) {
      const extension = ['.jpg', '.jpeg', '.png', '.webp', '.avif'].includes(extname(new URL(imageUrl).pathname).toLowerCase())
        ? extname(new URL(imageUrl).pathname).toLowerCase()
        : '.jpg';
      await download(imageUrl, new URL(`${String(imageIndex + 1).padStart(2, '0')}${extension}`, photoDirectory));
    }
    sourceIndex.push({ productKey: product.row.product_key, sourceUrl: product.sourceUrl, images: product.images });
    process.stdout.write(`${source.brand} photos: ${productIndex + 1}/${products.length}\r`);
  }
  process.stdout.write('\n');
  await writeFile(new URL('sources.json', directory), `${JSON.stringify(sourceIndex, null, 2)}\n`);
}

const requestedFolders = new Set(process.argv.slice(2));
const activeSources = requestedFolders.size
  ? sources.filter((source) => requestedFolders.has(source.folder))
  : sources;

for (const source of activeSources) {
  const products = source.kind === 'healthkart' ? await healthkartProducts(source) : await shopifyProducts(source);
  await saveSource(source, products);
}

console.log(`Prepared ${activeSources.reduce((total, source) => total + source.target, 0)} products with 3–4 photos each.`);
