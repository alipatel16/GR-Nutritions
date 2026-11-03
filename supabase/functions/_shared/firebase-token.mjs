import { createRemoteJWKSet, jwtVerify } from 'jose';

const googleKeys = createRemoteJWKSet(new URL(
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',
));
// The optional resolver is for offline tests; HTTP callers cannot override it.
export async function verifyFirebaseIdentity(token, keyResolver = googleKeys) {
  const { payload } = await jwtVerify(token, keyResolver, {
    algorithms: ['RS256'],
    issuer: 'https://securetoken.google.com/grnutritions',
    audience: 'grnutritions',
    requiredClaims: ['sub', 'exp', 'iat', 'auth_time'],
  });
  if (!payload.sub || payload.sub.length > 128 || !Number.isInteger(payload.iat) || payload.iat > Date.now() / 1000
    || !Number.isInteger(payload.auth_time) || payload.auth_time > Date.now() / 1000)
    throw new Error('Invalid Firebase identity');
  return {uid:payload.sub,email:typeof payload.email==='string'?payload.email:undefined,emailVerified:payload.email_verified===true};
}
// Keep the original UID-only API for callers that do not need signed account claims.
export async function verifyFirebaseToken(token, keyResolver = googleKeys) {
  return (await verifyFirebaseIdentity(token,keyResolver)).uid;
}
