import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COLUMNS, gramsFromSize, parseCsv, rowsToProducts, toCsv, validatePayload } from '../catalog-import-lib.mjs';

const sheet = (rows) => parseCsv(toCsv([COLUMNS, ...rows.map((row) => COLUMNS.map((c) => row[c] ?? ''))]));
const whey = { product_key: 'biozyme-whey', name: 'Biozyme Whey', category: 'protein', goals: 'muscle-gain; Recovery', diet: 'veg',
  description: 'Line one,\n"quoted" line two', nutrition: 'Protein=25 g; BCAA=5.5 g', flavour: 'Chocolate', size: '1 kg', mrp: '₹3,299', price: '2499' };

test('csv round-trips quotes, commas, newlines and a BOM', () => {
  const rows = parseCsv('﻿' + toCsv([['a', 'b'], ['x, y', 'he said "hi"\nbye']]));
  assert.deepEqual(rows, [['a', 'b'], ['x, y', 'he said "hi"\nbye']]);
});

test('rows sharing a product_key become one product with options and brand-prefixed ids', () => {
  const { products, errors } = rowsToProducts(sheet([
    whey,
    { product_key: 'biozyme-whey', flavour: 'Vanilla', size: '2 kg', mrp: '5999', price: '4599', default: 'yes', stock: '12' },
    { product_key: 'example-ignored', name: 'x', category: 'protein', flavour: 'a', size: 'b', mrp: '1', price: '1' },
  ]), 'MuscleBlaze');
  assert.deepEqual(errors, []);
  assert.equal(products.length, 1);
  const p = products[0].payload;
  assert.equal(p.id, 'muscleblaze-biozyme-whey');
  assert.deepEqual(p.goals, ['muscle-gain', 'recovery']);
  assert.deepEqual(p.dietaryTags, ['vegetarian']);
  assert.equal(p.description, 'Line one,\n"quoted" line two');
  assert.deepEqual(p.ingredients[0], { name: 'Protein', amount: '25 g', note: 'per serving' });
  assert.equal(p.variants.length, 2);
  assert.equal(p.variants[0].mrp.amountPaise, 329900);
  assert.deepEqual(p.variants.map((v) => v.isDefault), [false, true]);
  assert.equal(p.variants[1].stockAvailable, 12);
  assert.equal(p.variants[0].stockAvailable, 100);
  // Placeholder protein box; net weight from the size column.
  assert.deepEqual(p.variants[1].shipping, { weightGrams: 2200, lengthCm: 20, widthCm: 20, heightCm: 30 });
  assert.equal(validatePayload({ ...p, media: [] }), null);
});

test('invalid rows are reported with row numbers and left out', () => {
  const { products, errors } = rowsToProducts(sheet([
    { ...whey, product_key: 'bad-category', category: 'gummies' },
    { ...whey, product_key: 'too-expensive', price: '4000' },
    { ...whey, product_key: 'odd-goal', goals: 'flying' },
    { ...whey, product_key: 'fine' },
  ]), 'MuscleBlaze');
  assert.deepEqual(products.map((p) => p.key), ['fine']);
  assert.match(errors.join('\n'), /bad-category.*rows 2.*category must be/);
  assert.match(errors.join('\n'), /row 3: price ₹4000 is above MRP/);
  assert.match(errors.join('\n'), /unknown goal "flying"/);
});

test('missing required columns stop the import', () => {
  const { errors } = rowsToProducts([['product_key', 'name']], 'MuscleBlaze');
  assert.match(errors[0], /Missing columns: category, flavour, size, mrp, price/);
});

test('sizes convert to grams', () => {
  assert.equal(gramsFromSize('4.4 lb'), 1996);
  assert.equal(gramsFromSize('250 g'), 250);
  assert.equal(gramsFromSize('60 tablets'), null);
});
