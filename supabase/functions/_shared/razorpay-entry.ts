import { createClient } from '@supabase/supabase-js';
import { createRazorpayWebhook } from './razorpay-webhook.mjs';
import { createCheckoutService } from './checkout.mjs';

export function serveRazorpayWebhook(mode:'test'|'live') {
  const keys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')??'{}');
  const db=createClient(Deno.env.get('SUPABASE_URL')!,keys.default??Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{
    auth:{persistSession:false,autoRefreshToken:false},
  });
  const secret=Deno.env.get(mode==='test'?'RAZOR_PAY_TEST_WEBHOOK_SECRET':'RAZOR_PAY_LIVE_WEBHOOK_SECRET');
  const checkout=createCheckoutService({env:Deno.env.toObject(),rpc:async(action:string,payload:Record<string,unknown>,uid:string)=>{
    const {data,error}=await db.rpc('checkout_action',{p_uid:uid,p_action:action,p_payload:payload});
    if(error) throw new Error('Payment reconciliation persistence failed');
    return data;
  }});
  Deno.serve(createRazorpayWebhook({mode,secret,record:async(receipt:Record<string,unknown>)=>{
    const {error}=await db.rpc('ingest_razorpay_receipt',{p_receipt:receipt});
    if(error) throw new Error('Receipt persistence failed');
  },reconcile:checkout.reconcileReceipt}));
}
