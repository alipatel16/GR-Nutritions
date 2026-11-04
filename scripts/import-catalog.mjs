#!/usr/bin/env node
// Spreadsheet + photo-folder catalogue importer. See catalog-import/README.md.
//
//   npm run catalog:template -- <brand> "<Brand Name>"   create catalog-import/<brand>/
//   npm run catalog:prepare  -- <brand>                  check rows, compress photos
//   npm run catalog:publish  -- <brand>                  upload photos, write publish.sql
//
// publish.sql is applied separately (it changes the live store):
//   npx supabase db query --remote -f catalog-import/<brand>/publish.sql
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';

import { COLUMNS, parseCsv, rowsToProducts, slugify, storageUploadTargets, toCsv, validatePayload } from './catalog-import-lib.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const IMAGE_MAX_PX = 1200;
const IMAGE_QUALITY = 80;
const MAX_IMAGES = 8;
const PHOTO_TYPES = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tif', '.tiff', '.gif']);

const brandDir = (brand) => join(root, 'catalog-import', brand);
const outputDir = (brand) => join(root, 'catalog-images', brand);
const rel = (path) => relative(root, path);

function readConfig(brand) {
  const file = join(brandDir(brand), 'brand.json');
  if (!existsSync(file)) throw new Error(`Missing ${rel(file)}. Run: npm run catalog:template -- ${brand} "<Brand Name>"`);
  return JSON.parse(readFileSync(file, 'utf8'));
}

function template(brand, brandName) {
  if (!brand || !brandName) throw new Error('Usage: npm run catalog:template -- <brand-folder> "<Brand Name>"');
  const dir = brandDir(slugify(brand));
  mkdirSync(join(dir, 'photos'), { recursive: true });
  const csv = join(dir, 'products.csv');
  if (!existsSync(csv)) {
    const example = {
      product_key: 'example-biozyme-whey', name: 'Biozyme Performance Whey', category: 'protein',
      goals: 'muscle-gain; recovery', diet: 'vegetarian', summary: '25 g protein and 5.5 g BCAA per serving.',
      description: 'Paste the product description here.', usage: 'Mix 1 scoop (33 g) in 200 ml water or milk.',
      warnings: 'Contains milk.; Not for children.', nutrition: 'Protein=25 g; BCAA=5.5 g; EAA=11.9 g',
      flavour: 'Rich Chocolate', size: '1 kg', mrp: '3299', price: '2499', stock: '100', default: 'yes', status: 'active',
    };
    writeFileSync(csv, toCsv([COLUMNS, COLUMNS.map((c) => example[c] ?? '')]));
  }
  const config = join(dir, 'brand.json');
  if (!existsSync(config)) writeFileSync(config, JSON.stringify({ name: brandName, archive: [] }, null, 2) + '\n');
  console.log(`Ready: ${rel(dir)}/\n  products.csv  one row per flavour/size option\n  photos/<product_key>/  that product's photos (01.jpg, 02.jpg …)\n  brand.json    brand name and product IDs to archive after publishing`);
}

async function prepare(brand) {
  const config = readConfig(brand);
  const dir = brandDir(brand);
  const { products, errors } = rowsToProducts(parseCsv(readFileSync(join(dir, 'products.csv'), 'utf8')), config.name);
  const out = outputDir(brand);
  const manifestFile = join(out, 'manifest.json');
  const previous = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, 'utf8')) : { products: [] };
  // Re-running keeps each photo's storage path, so publishing twice never duplicates uploads.
  const knownPaths = new Map(previous.products.flatMap((p) => p.media.map((m) => [`${p.id}:${m.source}`, m.storagePath])));

  const ready = [];
  for (const product of products) {
    const photoDir = join(dir, 'photos', product.key);
    const photos = existsSync(photoDir)
      ? readdirSync(photoDir).filter((f) => PHOTO_TYPES.has(extname(f).toLowerCase())).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).slice(0, MAX_IMAGES)
      : [];
    if (!photos.length) { errors.push(`product "${product.key}": no photos in ${rel(photoDir)}/`); continue; }

    const media = [];
    for (const [index, photo] of photos.entries()) {
      const source = join(photoDir, photo);
      const target = join(out, product.id, `${String(index + 1).padStart(2, '0')}.webp`);
      mkdirSync(dirname(target), { recursive: true });
      const info = await sharp(source)
        .rotate()
        .resize({ width: IMAGE_MAX_PX, height: IMAGE_MAX_PX, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: IMAGE_QUALITY, effort: 5, smartSubsample: true })
        .toFile(target);
      media.push({
        source: photo,
        file: rel(target),
        originalBytes: readFileSync(source).length,
        bytes: info.size,
        storagePath: knownPaths.get(`${product.id}:${photo}`) ?? `${product.id}/${randomUUID()}.webp`,
      });
    }
    const payload = {
      ...product.payload,
      media: media.map((m, index) => ({
        id: `${product.id}-img-${index + 1}`,
        alt: `${product.payload.name} - image ${index + 1}`,
        backgroundColor: '#FFFFFF',
        storagePath: m.storagePath,
        sortOrder: index,
      })),
    };
    const problem = validatePayload(payload);
    if (problem) { errors.push(`product "${product.key}": ${problem}`); continue; }
    ready.push({ key: product.key, id: product.id, payload, media });
  }

  mkdirSync(out, { recursive: true });
  writeFileSync(manifestFile, JSON.stringify({ brand: config.name, preparedAt: new Date().toISOString(), products: ready }, null, 2));
  const images = ready.flatMap((p) => p.media);
  const mb = (bytes) => (bytes / 1048576).toFixed(1);
  console.log(`${ready.length} products ready (${ready.reduce((s, p) => s + p.payload.variants.length, 0)} options, ${images.length} photos).`);
  console.log(`Photos: ${mb(images.reduce((s, m) => s + m.originalBytes, 0))} MB original → ${mb(images.reduce((s, m) => s + m.bytes, 0))} MB WebP. Copies: ${rel(out)}/`);
  if (errors.length) {
    console.log(`\n${errors.length} problem(s) to fix in products.csv / photos (these products were left out):`);
    for (const error of errors) console.log(`  - ${error}`);
    process.exitCode = 2;
  }
}

const sqlText = (value) => `'${String(value).replace(/'/g, "''")}'`;
const sqlJson = (value) => `${sqlText(JSON.stringify(value))}::jsonb`;

async function publish(brand, { upload = true } = {}) {
  const config = readConfig(brand);
  const manifestFile = join(outputDir(brand), 'manifest.json');
  if (!existsSync(manifestFile)) throw new Error(`Run npm run catalog:prepare -- ${brand} first.`);
  const { products } = JSON.parse(readFileSync(manifestFile, 'utf8'));
  if (!products.length) throw new Error('Nothing to publish: the manifest has no ready products.');

  if (upload) await uploadPhotos(brand, products);
  else console.log('--sql-only: photos were not uploaded.');
  writePublishSql(brand, config, products);
}

async function uploadPhotos(brand, products) {
  const stage = join(outputDir(brand), '.upload');
  rmSync(stage, { recursive: true, force: true });
  for (const product of products) {
    for (const m of product.media) {
      const target = join(stage, m.storagePath);
      mkdirSync(dirname(target), { recursive: true });
      copyFileSync(join(root, m.file), target);
    }
  }
  console.log(`Uploading ${products.reduce((s, p) => s + p.media.length, 0)} photos to Supabase Storage (product-media)…`);
  const execute = promisify(execFile);
  const prefix = brand.replaceAll("'", "''");
  const existing = await execute('npx', ['supabase', 'db', 'query', '--remote', '--read-only', '--output-format', 'json',
    `select name from storage.objects where bucket_id='product-media' and name like '${prefix}-%'`], { cwd: root });
  const uploaded = new Set(JSON.parse(existing.stdout).rows.map((row) => `ss:///product-media/${row.name}`));
  const targets = storageUploadTargets(stage, products).filter((target) => !uploaded.has(target.destination));
  console.log(`${targets.length} photos remaining after checking live storage`);
  const keyResult = await execute('npx', ['supabase', 'projects', 'api-keys', '--reveal', '--output', 'json'], { cwd: root });
  const keys = JSON.parse(keyResult.stdout);
  const secret = keys.find((key) => key.type === 'secret') ?? keys.find((key) => key.name === 'service_role');
  if (!secret?.api_key) throw new Error('Storage upload authorization is unavailable');
  const projectRef = readFileSync(join(root, 'supabase', '.temp', 'project-ref'), 'utf8').trim();
  const storage = createClient(`https://${projectRef}.supabase.co`, secret.api_key,
    { auth: { persistSession: false, autoRefreshToken: false } }).storage.from('product-media');
  let completed = 0;
  const workers = Array.from({ length: 6 }, async () => {
    while (targets.length) {
      const { source, destination } = targets.shift();
      for (let attempt = 0; ; attempt += 1) {
        try {
          const storagePath = destination.replace('ss:///product-media/', '');
          const { error } = await storage.upload(storagePath, readFileSync(source),
            { contentType: 'image/webp', cacheControl: '31536000', upsert: false });
          if (error) throw new Error(`Image upload failed (${error.statusCode ?? error.name})`);
          break;
        } catch (error) {
          if (attempt >= 2) throw new Error(`${error.message}\n${error.stdout ?? ''}`);
          await new Promise((resolve) => setTimeout(resolve, 5000 * (attempt + 1)));
        }
      }
      completed += 1;
      if (completed % 20 === 0) console.log(`Uploaded ${completed} photos`);
    }
  });
  const results = await Promise.allSettled(workers);
  const failed = results.find((result) => result.status === 'rejected');
  if (failed) throw failed.reason;
  rmSync(stage, { recursive: true, force: true });
}

function writePublishSql(brand, config, products) {
  // Every write goes through public.admin_action as the store owner: the same
  // validation, media verification, stock rows and audit log as the admin screen.
  const lines = [
    '-- Generated by scripts/import-catalog.mjs.',
    'do $$',
    'declare',
    '  staff text := (select firebase_uid from private.staff_memberships order by created_at limit 1);',
    '  stamp timestamptz;',
    'begin',
    "  if staff is null then raise exception 'No staff account found'; end if;",
  ];
  for (const product of products) {
    for (const m of product.media) {
      lines.push(`  perform public.admin_action(staff,'media.register',${sqlJson({ path: m.storagePath, productId: product.id, mime: 'image/webp', size: m.bytes })});`);
    }
  }
  products.forEach((product, index) => {
    const payload = { ...product.payload, featuredRank: 100 + index };
    lines.push(`  stamp := (select updated_at from public.store_products where id=${sqlText(product.id)});`);
    lines.push(`  perform public.admin_action(staff,'product.save',${sqlJson(payload)} || case when stamp is null then '{}'::jsonb else jsonb_build_object('updatedAt',stamp) end);`);
  });
  for (const oldId of config.archive ?? []) {
    lines.push(`  perform public.admin_action(staff,'product.save',p.payload || jsonb_build_object('status','archived','updatedAt',p.updated_at)) from public.store_products p where p.id=${sqlText(oldId)} and p.status<>'archived';`);
  }
  lines.push('end $$;');
  const sqlFile = join(brandDir(brand), 'publish.sql');
  writeFileSync(sqlFile, lines.join('\n') + '\n');
  console.log(`\nWrote ${rel(sqlFile)} for ${products.length} products${config.archive?.length ? ` (archives ${config.archive.length} old)` : ''}.`);
  console.log(`To put them live: npx supabase db query --remote -f ${rel(sqlFile)}`);
}

const [command, brand, ...rest] = process.argv.slice(2);
try {
  if (command === 'template') template(brand, rest.join(' '));
  else if (command === 'prepare') await prepare(brand);
  else if (command === 'publish') await publish(brand, { upload: !rest.includes('--sql-only') });
  else throw new Error('Usage: node scripts/import-catalog.mjs <template|prepare|publish> <brand> [Brand Name]');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
