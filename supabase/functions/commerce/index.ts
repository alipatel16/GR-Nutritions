import { createClient } from '@supabase/supabase-js';
import { createCommerceHandler } from '../_shared/handler.mjs';
import { createCheckoutService } from '../_shared/checkout.mjs';

const secretKeys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')??'{}');
const db=createClient(Deno.env.get('SUPABASE_URL')!,secretKeys.default??Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{
  auth:{persistSession:false,autoRefreshToken:false},
});
const allowedOrigins=(Deno.env.get('STORE_ALLOWED_ORIGINS')??'http://localhost:8083,http://localhost:8081,https://grnutritionsnikol--review.expo.app,https://grnutritions.web.app,https://grnutritions.firebaseapp.com').split(',').map(s=>s.trim()).filter(Boolean);
const checkout=createCheckoutService({env:Deno.env.toObject(),rpc:async(action:string,payload:Record<string,unknown>,uid:string)=>{
  const {data,error}=await db.rpc(action==='role.get'?'customer_action':'checkout_action',{p_uid:uid,p_action:action,p_payload:payload});
  if(error) throw error;
  return data;
}});
Deno.serve(createCommerceHandler({db,storage:db.storage.from('product-media'),allowedOrigins,checkout}));
