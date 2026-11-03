import { z } from 'zod';

const maxBytes=256*1024;
const events=new Set(['payment.captured','payment.failed','order.paid','refund.processed']);
const reference=z.string().regex(/^[a-zA-Z0-9_-]{1,150}$/);
const money=z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const schema=z.object({
  account_id:reference,
  event:z.string().min(1).max(100),
  payload:z.object({
    payment:z.object({entity:z.object({id:reference,order_id:reference.nullable().optional(),amount:money,
      currency:z.literal('INR'),status:z.string().max(40)})}).optional(),
    order:z.object({entity:z.object({id:reference,amount:money,currency:z.literal('INR'),status:z.string().max(40)})}).optional(),
    refund:z.object({entity:z.object({id:reference,payment_id:reference,amount:money,currency:z.literal('INR'),status:z.string().max(40)})}).optional(),
  }),
});
const hex=(buffer)=>Array.from(new Uint8Array(buffer),v=>v.toString(16).padStart(2,'0')).join('');

export function createRazorpayWebhook({mode,secret,record,reconcile}) {
  if(!['test','live'].includes(mode)) throw new Error('Invalid webhook mode');
  return async request=>{
    const respond=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
    if(request.method==='GET') return respond({service:'razorpay-webhook',mode,configured:Boolean(secret)});
    if(request.method!=='POST') return respond({error:'Use POST'},405);
    if(!secret) return respond({error:'Webhook secret is not configured'},503);
    const signature=request.headers.get('x-razorpay-signature')??'';
    if(!/^[a-fA-F0-9]{64}$/.test(signature)) return respond({error:'Invalid signature'},401);
    if(Number(request.headers.get('content-length'))>maxBytes) return respond({error:'Payload too large'},413);
    // Bound streamed input too; an untrusted Content-Length alone is insufficient.
    const chunks=[];let length=0;
    try {
      const reader=request.body?.getReader();
      if(!reader) return respond({error:'Invalid notification'},400);
      while(true){
        const {done,value}=await reader.read();
        if(done) break;
        length+=value.byteLength;
        if(length>maxBytes){await reader.cancel();return respond({error:'Payload too large'},413);}
        chunks.push(value);
      }
    } catch {return respond({error:'Invalid notification'},400);}
    const body=new Uint8Array(length);let offset=0;
    for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.byteLength;}
    const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
    const signatureBytes=new Uint8Array(signature.match(/../g).map(value=>Number.parseInt(value,16)));
    if(!await crypto.subtle.verify('HMAC',key,signatureBytes,body)) return respond({error:'Invalid signature'},401);
    let receipt;
    try {
      const eventId=reference.parse(request.headers.get('x-razorpay-event-id'));
      const event=schema.parse(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(body)));
      if(!events.has(event.event)) return respond({received:true,ignored:true});
      const p=event.payload.payment?.entity,o=event.payload.order?.entity,r=event.payload.refund?.entity;
      const entity=event.event==='order.paid'?o:event.event==='refund.processed'?r:p;
      if(!entity) return respond({error:'Invalid notification'},400);
      const expectedStatus={'payment.captured':'captured','payment.failed':'failed','order.paid':'paid','refund.processed':'processed'}[event.event];
      if(entity.status!==expectedStatus) return respond({error:'Invalid event status'},400);
      receipt={mode,eventId,accountId:event.account_id,eventType:event.event,
        paymentId:p?.id??r?.payment_id??null,orderId:o?.id??p?.order_id??null,refundId:r?.id??null,
        amountPaise:entity.amount,currency:entity.currency,status:entity.status,
        bodySha256:hex(await crypto.subtle.digest('SHA-256',body)),
      };
    } catch {return respond({error:'Invalid notification'},400);}
    try {
      await record(receipt);
      // Replayed receipts reconcile again after durable ingest, recovering transient failure.
      if(reconcile) await reconcile(receipt);
      return respond({received:true});
    } catch {return respond({error:'Notification could not be saved. Please retry.'},503);}
  };
}
