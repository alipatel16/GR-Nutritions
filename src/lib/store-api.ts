import { auth } from './firebase-auth';
import { requireSupabase } from './supabase';

export class StoreRequestError extends Error {
  constructor(public status: number, message: string) { super(message); this.name = 'StoreRequestError'; }
}

export async function storeRequest(action: string, payload: Record<string, unknown> = {}): Promise<unknown> {
  requireSupabase();
  let token: string | undefined;
  try { token = await auth.currentUser?.getIdToken(); }
  catch { throw new StoreRequestError(401, 'Your session has expired. Please sign in again.'); }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  let response: Response;
  try { response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/commerce`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json',
      apikey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ action, payload }),
    signal: controller.signal,
  }); } catch {
    throw new StoreRequestError(0, 'Could not connect. Please check your internet connection and retry.');
  } finally { clearTimeout(timeout); }
  if (response.status === 401) throw new StoreRequestError(401, 'Your session has expired. Please sign in again.');
  let result;
  try { result = await response.json(); }
  catch { throw new StoreRequestError(response.status, 'The store is temporarily unavailable. Please try again.'); }
  if (!response.ok) throw new StoreRequestError(response.status, typeof result.error === 'string' && result.error.length < 350 ? result.error : 'The store is temporarily unavailable. Please try again.');
  return result.data;
}

// Product photos live in the public product-media bucket, so every image has a
// stable, CDN-cacheable URL and listing pages need no per-image signing calls.
export function productMediaUrl(storagePath: string): string {
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL;
  return `${base}/storage/v1/object/public/product-media/${storagePath.split('/').map(encodeURIComponent).join('/')}`;
}

export async function resolveProductMedia<T extends { media: { storagePath?: string; uri?: string }[] }>(products: T[]): Promise<T[]> {
  return products.map(p => ({ ...p, media: p.media.map(m => ({ ...m, ...(m.storagePath ? { uri: productMediaUrl(m.storagePath) } : {}) })) }));
}
