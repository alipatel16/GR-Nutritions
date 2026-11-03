import { z } from 'zod';

import { auth } from '@/lib/firebase-auth';

export type CoachTurn = { role: 'user' | 'assistant'; content: string };

const coachReplySchema = z.object({
  reply: z.string(),
  productIds: z.array(z.string()),
  followUps: z.array(z.string()),
});
export type CoachReply = z.infer<typeof coachReplySchema>;

export class CoachUnavailableError extends Error {
  constructor(public status: number, message: string) { super(message); this.name = 'CoachUnavailableError'; }
}

// Sends the visible conversation to the GR Coach edge function. The function owns the
// model, the API key, the catalogue context and the rate limit; the app only sends text.
export async function askCoach(messages: CoachTurn[], productSlug?: string): Promise<CoachReply> {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new CoachUnavailableError(0, 'GR Coach is not configured.');
  let token: string | undefined;
  try { token = await auth.currentUser?.getIdToken(); } catch { token = undefined; }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);
  let response: Response;
  try {
    response = await fetch(`${url}/functions/v1/coach`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: key, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ messages: messages.slice(-20), ...(productSlug ? { productSlug } : {}) }),
      signal: controller.signal,
    });
  } catch {
    throw new CoachUnavailableError(0, 'Could not reach GR Coach. Please check your connection.');
  } finally { clearTimeout(timeout); }
  let body: { data?: unknown; error?: unknown } | undefined;
  try { body = await response.json(); } catch { body = undefined; }
  if (!response.ok || !body) {
    const message = typeof body?.error === 'string' && body.error.length < 200 ? body.error : 'GR Coach is unavailable right now. Please try again shortly.';
    throw new CoachUnavailableError(response.status, message);
  }
  return coachReplySchema.parse(body.data);
}
