import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { generateKeyPair, SignJWT } from 'jose';
import { verifyFirebaseToken } from '../functions/_shared/firebase-token.mjs';
import { productInputSchema } from '../functions/_shared/commerce.mjs';

let db;
const call = async (fn, uid, action, payload = {}) => (await db.query(
  `select public.${fn}($1,$2,$3::jsonb) as result`, [uid, action, JSON.stringify(payload)],
)).rows[0].result;
const customer = (uid, action, payload) => call('customer_action', uid, action, payload);
const admin = (action, payload) => call('admin_action', 'owner', action, payload);
const product = (id = 'protein', status = 'active') => ({
  id, slug: id, name: 'Test Protein', brand: 'Test', category: 'protein', status,
  summary: 'Protein', description: 'Test description', featuredRank: 1,
  createdAt: '2026-11-02T00:00:00.000Z', goals: ['muscle-gain'], dietaryTags: ['vegetarian'],
  ingredients: [{ name: 'Whey' }], media: [], usage: 'See pack', warnings: ['Contains milk'], demoContent: false,
  variants: [{ id: `${id}-v`, sku: `${id}-sku`, label: '1 kg', flavour: 'Vanilla', size: '1 kg',
    weightGrams: 1000, price: { currency: 'INR', amountPaise: 199900 },
    mrp: { currency: 'INR', amountPaise: 249900 }, stockAvailable: 8, isDefault: true }],
});
const address = { label: 'Home', fullName: 'Test Person', phone: '9876543210', line1: '123 Test Street',
  line2: '', city: 'Pune', state: 'Maharashtra', pincode: '411001', isDefault: true };
before(async () => {
  db = new PGlite();
  await db.exec('create role anon; create role authenticated; create role service_role;');
  await db.exec(await readFile(new URL('../migrations/202611020001_store.sql', import.meta.url), 'utf8'));
  await db.exec("insert into private.staff_memberships(firebase_uid) values ('owner')");
});
after(async () => { await db?.close(); });

test('private RPCs and tables are denied to anonymous and authenticated roles', async () => {
  for (const role of ['anon', 'authenticated']) {
    await db.exec(`set role ${role}`);
    try {
      await assert.rejects(customer('owner', 'role.get'), /permission denied/);
      await assert.rejects(db.query('select * from public.delivery_addresses'), /permission denied/);
      await assert.rejects(db.query('select * from private.staff_memberships'), /permission denied/);
    } finally { await db.exec('reset role'); }
  }
});
test('staff authority comes from PostgreSQL, never a customer payload', async () => {
  assert.deepEqual(await customer('buyer', 'role.get', { admin: true, userId: 'owner' }), { isAdmin: false });
  await assert.rejects(call('admin_action', 'buyer', 'products.list', { admin: true }), /Staff access required/);
});
test('catalog hides drafts and stale saves cannot overwrite newer stock', async () => {
  let p = await admin('product.save', product());
  await admin('product.save', product('unpublished', 'draft'));
  await db.exec('set role anon');
  try {
    const rows = (await db.query('select public.catalog_products() as result')).rows[0].result;
    assert.equal(rows.length, 1);
    assert.equal(rows[0].id, p.id);
  } finally { await db.exec('reset role'); }
  const changed = await admin('product.save', { ...p, variants: p.variants.map(v => ({ ...v, stockAvailable: 3 })) });
  assert.notEqual(changed.updatedAt, p.updatedAt);
  await assert.rejects(admin('product.save', p), /changed since you opened/);
  const clash = product('clash'); clash.slug = 'protein';
  await assert.rejects(admin('product.save', clash), /unique constraint/);
  clash.slug = 'clash'; clash.variants[0].sku = 'PROTEIN-SKU';
  await assert.rejects(admin('product.save', clash), /unique constraint/);
  const all = await admin('products.list');
  assert.equal(all.some(x => x.id === 'clash'), false, 'failed variant write rolls back whole product');
});
test('address ownership and one default are enforced atomically', async () => {
  const a = await customer('alice', 'address.save', { address });
  const b = await customer('alice', 'address.save', { address: { ...address, label: 'Work' } });
  assert.equal((await customer('alice', 'addresses.list')).filter(x => x.isDefault).length, 1);
  assert.equal((await customer('alice', 'addresses.list')).find(x => x.isDefault).id, b.id);
  await assert.rejects(customer('bob', 'address.save', { id: a.id, address }), /Address not found/);
  await assert.rejects(customer('bob', 'address.default', { id: a.id }), /Address not found/);
  await assert.rejects(customer('bob', 'address.remove', { id: a.id }), /Address not found/);
  assert.deepEqual(await customer('bob', 'addresses.list', { uid: 'alice' }), []);
  await customer('alice', 'address.remove', { id: b.id });
  assert.equal((await customer('alice', 'addresses.list')).find(x => x.isDefault).id, a.id);
});
test('quotes use live paise and stock, owned addresses; cannot create paid orders', async () => {
  const a = (await customer('alice', 'addresses.list'))[0];
  const payload = { addressId: a.id, items: [{ productId: 'protein', variantId: 'protein-v', quantity: 2, unitPricePaise: 1 }] };
  const quote = await customer('alice', 'checkout.quote', payload);
  assert.equal(quote.totalPaise, 399800);
  assert.ok(Date.parse(quote.expiresAt) > Date.now());
  assert.ok(Date.parse(quote.expiresAt) <= Date.now()+301000);
  await assert.rejects(customer('bob', 'checkout.quote', payload), /Address not found/);
  await assert.rejects(customer('alice', 'checkout.quote', { ...payload, items: [payload.items[0], payload.items[0]] }), /Duplicate/);
  await assert.rejects(customer('alice', 'checkout.quote', { ...payload, items: [{ ...payload.items[0], quantity: 4 }] }), /stock/);
  await assert.rejects(customer('alice', 'order.create', { status: 'paid' }), /Unknown action/);
});
test('orders are owner scoped and staff cannot skip fulfillment transitions', async () => {
  await db.query(`insert into public.store_orders(id,firebase_uid,status,total_paise,items,address) values ('order1','alice','paid',199900,'[]','{}')`);
  assert.equal((await customer('alice', 'orders.list')).length, 1);
  assert.deepEqual(await customer('bob', 'orders.list'), []);
  await assert.rejects(admin('order.advance', { id: 'order1', status: 'delivered' }), /Invalid order transition/);
  assert.equal((await admin('order.advance', { id: 'order1', status: 'processing' })).status, 'processing');
});
test('media access only permits active product references or staff', async () => {
  assert.equal(await customer('alice', 'media.allowed', { path: 'draft/secret.jpg' }), false);
  assert.equal(await customer('owner', 'media.allowed', { path: 'draft/secret.jpg' }), true);
  const path = 'media-test/12345678-1234-1234-1234-123456789abc.jpg';
  await admin('media.register', { path, productId:'media-test', mime:'image/jpeg',size:100 });
  const input = product('media-test','draft');
  input.media = [{ id:'pack', alt:'Test pack', backgroundColor:'#fff',sortOrder:0,storagePath:path,uri:'https://example.com/expired-preview' }];
  const saved = productInputSchema.parse(await admin('product.save',input));
  assert.equal(saved.media[0].uri, undefined, 'expiring URLs must never persist');
  assert.equal(await customer('', 'media.allowed', { path }), false);
  await admin('product.save', { ...saved, status:'active' });
  assert.equal(await customer('', 'media.allowed', { path }), true);
});
test('Firebase verifier rejects another project, expired and unsigned tokens', async () => {
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const issue = (audience, expiry = '5m') => new SignJWT({ auth_time: Math.floor(Date.now()/1000) }).setProtectedHeader({ alg: 'RS256' })
    .setSubject('firebase-uid-not-a-uuid').setIssuer('https://securetoken.google.com/grnutritions')
    .setAudience(audience).setIssuedAt().setExpirationTime(expiry).sign(privateKey);
  assert.equal(await verifyFirebaseToken(await issue('grnutritions'), publicKey), 'firebase-uid-not-a-uuid');
  await assert.rejects(verifyFirebaseToken(await issue('another-project'), publicKey));
  await assert.rejects(verifyFirebaseToken(await issue('grnutritions', '0s'), publicKey));
  await assert.rejects(verifyFirebaseToken('eyJhbGciOiJub25lIn0.eyJzdWIiOiJvd25lciJ9.', publicKey));
  const wrongIssuer = await new SignJWT({ auth_time: Math.floor(Date.now()/1000) })
    .setProtectedHeader({ alg:'RS256' }).setSubject('owner').setIssuedAt().setExpirationTime('5m')
    .setAudience('grnutritions').setIssuer('https://securetoken.google.com/another-project').sign(privateKey);
  await assert.rejects(verifyFirebaseToken(wrongIssuer,publicKey));
});
test('verified Firebase identity exposes only signed email claims while legacy UID API is preserved',async()=>{
 const {verifyFirebaseIdentity}=await import('../functions/_shared/firebase-token.mjs');const {privateKey,publicKey}=await generateKeyPair('RS256');
 const token=await new SignJWT({auth_time:Math.floor(Date.now()/1000),email:'signed@example.test',email_verified:true}).setProtectedHeader({alg:'RS256'}).setSubject('signed-buyer').setIssuer('https://securetoken.google.com/grnutritions').setAudience('grnutritions').setIssuedAt().setExpirationTime('5m').sign(privateKey);
 assert.deepEqual(await verifyFirebaseIdentity(token,publicKey),{uid:'signed-buyer',email:'signed@example.test',emailVerified:true});assert.equal(await verifyFirebaseToken(token,publicKey),'signed-buyer');
 await assert.rejects(verifyFirebaseIdentity(token+'tampered',publicKey));
});
