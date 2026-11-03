import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSystemPrompt, catalogDigest, createCoachHandler } from '../functions/_shared/coach.mjs';

const product = (id, extra = {}) => ({
  id, slug: id, name: `Product ${id}`, brand: 'Atlas', category: 'protein', status: 'active',
  summary: 'Fast-digesting whey.', usage: 'One scoop daily.', warnings: ['Contains milk.'],
  goals: ['muscle-gain'], dietaryTags: ['vegetarian'], ingredients: [{ name: 'Whey isolate', amount: '25 g' }],
  variants: [{ label: 'Cocoa • 1 kg', price: { amountPaise: 249900 }, mrp: { amountPaise: 299900 }, stockAvailable: 4 }],
  ...extra,
});

function setup({ reply, stop = 'end_turn', allowed = true, verify = async () => ({ uid: 'shopper' }) } = {}) {
  const calls = [];
  const sent = [];
  const db = { rpc: async (name, args) => {
    calls.push({ name, args });
    if (name === 'consume_coach_request') return { data: allowed };
    if (name === 'catalog_products') return { data: [product('whey'), product('draft', { status: 'draft' })] };
    return { data: null };
  } };
  const createMessage = async (params) => {
    sent.push(params);
    return { stop_reason: stop, content: [{ type: 'text', text: JSON.stringify(reply ?? { reply: 'Try this.', productIds: ['whey'], followUps: [] }) }] };
  };
  return { calls, sent, handle: createCoachHandler({ db, allowedOrigins: ['http://localhost:8082'], createMessage, verify, hash: async () => 'hashed-ip' }) };
}
const ask = (body, { token, origin } = {}) => new Request('https://example.com/coach', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.9', ...(token ? { authorization: `Bearer ${token}` } : {}), ...(origin ? { origin } : {}) },
  body: JSON.stringify(body),
});
const chat = { messages: [{ role: 'user', content: 'Best whey for a vegetarian?' }] };

test('digest lists only active products with prices and stock', () => {
  const digest = catalogDigest([product('whey'), product('draft', { status: 'draft' })]);
  assert.match(digest, /id: whey/);
  assert.match(digest, /₹2,499 \(MRP ₹2,999\), in stock/);
  assert.doesNotMatch(digest, /id: draft/);
  assert.match(buildSystemPrompt(digest), /CATALOGUE[\s\S]*id: whey/);
});

test('guests are rate limited by hashed IP and receive validated recommendations', async () => {
  const { handle, calls, sent } = setup({ reply: { reply: 'Here you go.', productIds: ['whey', 'invented', 'draft', 'whey'], followUps: ['Cheaper?'] } });
  const response = await handle(ask(chat));
  assert.equal(response.status, 200);
  const { data } = await response.json();
  assert.deepEqual(data.productIds, ['whey']);
  assert.equal(calls[0].args.p_key, 'ip:hashed-ip');
  assert.equal(sent[0].model, 'claude-opus-5-5');
  assert.equal(sent[0].output_config.format.type, 'json_schema');
  assert.equal(sent[0].system[0].cache_control.type, 'ephemeral');
});

test('signed-in shoppers are limited by verified UID; bad tokens are rejected', async () => {
  const ok = setup();
  await ok.handle(ask(chat, { token: 'valid' }));
  assert.equal(ok.calls[0].args.p_key, 'u:shopper');
  const bad = setup({ verify: async () => { throw new Error('expired'); } });
  assert.equal((await bad.handle(ask(chat, { token: 'expired' }))).status, 401);
  assert.equal(bad.calls.length, 0);
});

test('rate limits stop the model call', async () => {
  const { handle, sent } = setup({ allowed: false });
  assert.equal((await handle(ask(chat))).status, 429);
  assert.equal(sent.length, 0);
});

test('malformed conversations and unknown origins are refused before any work', async () => {
  const { handle, calls } = setup();
  assert.equal((await handle(ask({ messages: [{ role: 'assistant', content: 'hi' }] }))).status, 400);
  assert.equal((await handle(ask({ messages: [{ role: 'user', content: 'x'.repeat(2001) }] }))).status, 400);
  assert.equal((await handle(ask(chat, { origin: 'https://evil.example' }))).status, 403);
  assert.equal(calls.length, 0);
});

test('product context is appended after the history as a system note', async () => {
  const { handle, sent } = setup();
  await handle(ask({ ...chat, productSlug: 'whey' }));
  assert.deepEqual(sent[0].messages.at(-1).role, 'system');
  assert.match(sent[0].messages.at(-1).content, /Product whey/);
});

test('refusals and truncated replies degrade to safe messages', async () => {
  const refused = setup({ stop: 'refusal' });
  const r = await (await refused.handle(ask(chat))).json();
  assert.deepEqual(r.data.productIds, []);
  const cut = setup({ stop: 'max_tokens' });
  assert.equal((await cut.handle(ask(chat))).status, 503);
});

test('coach budget allows 8 messages a minute per shopper and is separate from store limits', async () => {
  const { PGlite } = await import('@electric-sql/pglite');
  const { readFile, readdir } = await import('node:fs/promises');
  const pg = new PGlite();
  await pg.exec('create role anon;create role authenticated;create role service_role;');
  for (const file of (await readdir(new URL('../migrations/', import.meta.url))).filter(f => f.endsWith('.sql') && !f.includes('media_bucket')).sort())
    await pg.exec(await readFile(new URL('../migrations/' + file, import.meta.url), 'utf8'));
  const consume = async key => (await pg.query('select public.consume_coach_request($1) as ok', [key])).rows[0].ok;
  const results = [];
  for (let i = 0; i < 9; i++) results.push(await consume('u:alice'));
  assert.deepEqual(results, [...Array(8).fill(true), false]);
  assert.equal(await consume('u:bob'), true);
  assert.equal((await pg.query("select public.consume_store_request('u:alice') as ok")).rows[0].ok, true);
  await assert.rejects(consume(''));
});
