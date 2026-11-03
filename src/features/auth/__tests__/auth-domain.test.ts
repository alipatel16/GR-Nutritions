import { safeReturnPath, parseAuthCallback } from '../auth-domain';
it.each([
  'https://evil.test',
  '//evil.test',
  '/admin',
  '/auth/callback',
  '/checkout?next=//evil',
])('rejects an untrusted return path %s', (path) =>
  expect(safeReturnPath(path)).toBe('/account'),
);
it('preserves the checkout destination', () =>
  expect(safeReturnPath('/checkout')).toBe('/checkout'));
it('extracts PKCE code or explicit OAuth error without logging tokens', () => {
  expect(parseAuthCallback('grnutritions://auth/callback?code=abc')).toEqual({
    code: 'abc',
    error: null,
  });
  expect(
    parseAuthCallback(
      'https://example.com/auth/callback?error_description=Access+denied',
    ),
  ).toEqual({ code: null, error: 'Access denied' });
});
