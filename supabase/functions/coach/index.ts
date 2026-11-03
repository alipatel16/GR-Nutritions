import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { createCoachHandler } from '../_shared/coach.mjs';

const secretKeys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')??'{}');
const db=createClient(Deno.env.get('SUPABASE_URL')!,secretKeys.default??Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{
  auth:{persistSession:false,autoRefreshToken:false},
});
const allowedOrigins=(Deno.env.get('STORE_ALLOWED_ORIGINS')??'http://localhost:8083,http://localhost:8082,http://localhost:8081,https://grnutritions.web.app,https://grnutritions.firebaseapp.com').split(',').map(s=>s.trim()).filter(Boolean);
// ANTHROPIC_API_KEY is a Supabase function secret; it never reaches the app.
const anthropic=new Anthropic({apiKey:Deno.env.get('ANTHROPIC_API_KEY'),timeout:60_000});

Deno.serve(createCoachHandler({
  db,
  allowedOrigins,
  // Server-side fallbacks retry a safety-declined request on Anthropic's recommended model.
  createMessage:params=>anthropic.beta.messages.create({
    ...params,
    betas:['server-side-fallback-2026-07-01'],
    fallbacks:'default',
  }),
}));
