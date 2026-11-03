// Verify deployed bytes, not just a 200 response: the SPA fallback can hide missing assets.
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const base = process.env.STORE_WEBSITE_URL ?? 'https://grnutritions.web.app';
assert.equal(new URL(base).protocol, 'https:');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
for (const route of ['/', '/account', '/product/isolate-elite-whey']) {
  const response = await fetch(new URL(route, base), { signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200, route);
  assert.match(response.headers.get('content-type') ?? '', /text\/html/);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.match(await response.text(), /id="root"/);
}
const fonts = (await readdir('dist', { recursive: true })).filter(path => path.endsWith('.ttf'));
assert.ok(fonts.length >= 6, 'Export must include all brand font faces');
for (const path of fonts) {
  const response = await fetch(new URL('/' + path, base), { signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200, path);
  assert.doesNotMatch(response.headers.get('content-type') ?? '', /text\/html/, 'Font must not resolve to SPA HTML');
  assert.equal(digest(new Uint8Array(await response.arrayBuffer())), digest(await readFile('dist/' + path)), path);
}
console.log(`PASS: HTTPS routes, security headers and ${fonts.length} matching brand font files`);
