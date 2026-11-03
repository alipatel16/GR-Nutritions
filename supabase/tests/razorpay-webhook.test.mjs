import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createRazorpayWebhook } from '../functions/_shared/razorpay-webhook.mjs';

const secret='fixture-only-test-secret';
const event={entity:'event',account_id:'acc_fixture',event:'payment.captured',payload:{payment:{entity:{
  id:'pay_fixture',order_id:'order_fixture',amount:199900,currency:'INR',status:'captured',email:'private@example.com',contact:'9999999999',
}}}};
const raw=JSON.stringify(event);
function request(body=raw,key=secret,extras={}) {
  return new Request('https://example.com/razorpay-webhook-test',{method:'POST',headers:{
    'content-type':'application/json','x-razorpay-event-id':'evt_fixture',
    'x-razorpay-signature':createHmac('sha256',key).update(body).digest('hex'),...extras,
  },body});
}
test('verifies raw signature and stores only minimal payment references',async()=>{
  let saved;
  const handle=createRazorpayWebhook({mode:'test',secret,record:async value=>{saved=value;}});
  assert.equal((await handle(request())).status,200);
  assert.equal(saved.mode,'test');
  assert.equal(saved.paymentId,'pay_fixture');
  assert.equal(saved.orderId,'order_fixture');
  assert.equal(saved.amountPaise,199900);
  assert.equal(JSON.stringify(saved).includes('private@example.com'),false);
  assert.equal(JSON.stringify(saved).includes('9999999999'),false);
});
test('rejects tampered bodies and wrong mode secret before touching storage',async()=>{
  let touched=false;
  const handle=createRazorpayWebhook({mode:'live',secret:'different-live-secret',record:async()=>{touched=true;}});
  assert.equal((await handle(request())).status,401);
  const unsigned=new Request('https://example.com',{method:'POST',body:raw});
  assert.equal((await handle(unsigned)).status,401);
  const proper=createRazorpayWebhook({mode:'test',secret,record:async()=>{touched=true;}});
  const tampered=request(raw+' '); tampered.headers.set('x-razorpay-signature',createHmac('sha256',secret).update(raw).digest('hex'));
  assert.equal((await proper(tampered)).status,401);
  assert.equal(touched,false);
});
test('missing configuration and database failures are not acknowledged',async()=>{
  const absent=createRazorpayWebhook({mode:'test',secret:undefined,record:async()=>{}});
  assert.equal((await absent(request())).status,503);
  const failing=createRazorpayWebhook({mode:'test',secret,record:async()=>{throw new Error('database failure');}});
  assert.equal((await failing(request())).status,503);
});
test('rejects malformed events, missing event ID and oversized bodies',async()=>{
  const handle=createRazorpayWebhook({mode:'test',secret,record:async()=>{}});
  assert.equal((await handle(request('{'))).status,400);
  assert.equal((await handle(request(raw,secret,{'x-razorpay-event-id':''}))).status,400);
  assert.equal((await handle(request('x'.repeat(262145)))).status,413);
  assert.equal((await handle(request(JSON.stringify({...event,payload:{}})))).status,400);
});
test('does not pretend unsupported notifications create paid store orders',async()=>{
  let touched=false;
  const handle=createRazorpayWebhook({mode:'test',secret,record:async()=>{touched=true;}});
  const response=await handle(request(JSON.stringify({...event,event:'subscription.charged'})));
  assert.equal(response.status,200);
  assert.equal(touched,false);
});
test('durably saves before reconciliation and retries failed reconciliation even for replay',async()=>{
 const sequence=[];let fail=true;const handle=createRazorpayWebhook({mode:'test',secret,record:async()=>{sequence.push('record');return {duplicate:true};},reconcile:async receipt=>{sequence.push('reconcile');assert.equal(receipt.orderId,'order_fixture');if(fail)throw new Error('transient');}});
 assert.equal((await handle(request())).status,503);assert.deepEqual(sequence,['record','reconcile']);fail=false;assert.equal((await handle(request())).status,200);assert.deepEqual(sequence,['record','reconcile','record','reconcile']);
});
