import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
let db;
const rpc=async(uid,action,payload={})=>(await db.query('select public.checkout_action($1,$2,$3::jsonb) as r',[uid,action,JSON.stringify({...(action==='context'?{customerEmail:'buyer@example.test',customerEmailVerified:true}:{}),...payload})])).rows[0].r;
const address={fullName:'Buyer Person',phone:'9876543210',line1:'123 Test Street',city:'Pune',state:'Maharashtra',pincode:'411001'};
const items=[{productId:'p',variantId:'v',quantity:1}];
const callCustomer=async(uid,action,payload={})=>(await db.query('select public.customer_action($1,$2,$3::jsonb) as r',[uid,action,JSON.stringify(payload)])).rows[0].r;
async function quote(uid='alice',mode='live',method='razorpay') {const context=await rpc(uid,'context',{addressId:'a',items,paymentMethod:method,mode});return rpc(uid,'quote.store',{context,delivery:{courierId:1,courierName:'Courier',estimatedDays:'3'},pickupLocation:'GR Nutritions'});}
async function create(uid='alice',mode='live',method='razorpay',key=crypto.randomUUID()){const q=await quote(uid,mode,method);return rpc(uid,'order.begin',{quoteId:q.quoteId,requestKey:key,mode});}
before(async()=>{
 db=new PGlite();await db.exec('create role anon;create role authenticated;create role service_role;');
 await db.exec("set plpgsql.variable_conflict='error'");
 for(const file of (await readdir(new URL('../migrations/',import.meta.url))).filter(f=>f.endsWith('.sql')&&!f.includes('media_bucket')).sort()) await db.exec(await readFile(new URL('../migrations/'+file,import.meta.url),'utf8'));
 await db.exec("insert into private.staff_memberships(firebase_uid) values ('owner')");
 await db.query('insert into public.delivery_addresses(id,firebase_uid,payload) values ($1,$2,$3)', ['a','alice',JSON.stringify(address)]);
 await db.query("insert into public.store_products(id,slug,status,payload) values ('p','p','active',$1)",[JSON.stringify({name:'Protein',variants:[{id:'v',shipping:{weightGrams:1200,lengthCm:15,widthCm:12,heightCm:20}}]})]);
 await db.exec("insert into public.store_variants values ('v','p','SKU',99900,199900,100)");
});
after(async()=>{await db?.close();});
test('service-only checkout RPC and owner scoped snapshots ignore forged totals',async()=>{
 for(const role of ['anon','authenticated']){await db.exec(`set role ${role}`);try{await assert.rejects(rpc('alice','context',{}),/permission denied/);}finally{await db.exec('reset role');}}
 await assert.rejects(rpc('bob','context',{addressId:'a',items,mode:'test',paymentMethod:'razorpay'}),/Address not found/);
 const c=await rpc('alice','context',{addressId:'a',items:[{...items[0],unitPricePaise:1}],mode:'test',paymentMethod:'razorpay'});assert.equal(c.subtotalPaise,99900);assert.equal(c.shippingPaise,5000);assert.equal(c.totalPaise,104900);
 await assert.rejects(rpc('alice','quote.store',{context:{...c,totalPaise:1},delivery:{},pickupLocation:'GR'}),/Cart changed/);
});
test('strict free delivery boundary and separate COD surcharge use integer paise',async()=>{
 const c=await rpc('alice','context',{addressId:'a',items,mode:'test',paymentMethod:'cod'});assert.equal(c.shippingPaise,5000);assert.equal(c.codFeePaise,20000);assert.equal(c.totalPaise,124900);
 await db.exec("update public.store_variants set price_paise=100000 where id='v'");
 const c2=await rpc('alice','context',{addressId:'a',items,mode:'test',paymentMethod:'razorpay'});assert.equal(c2.shippingPaise,0);assert.equal(c2.codFeePaise,0);assert.equal(c2.totalPaise,100000);
});
test('immutable quote owner, expiry, mode and price are checked before order creation',async()=>{
 const q=await quote();await assert.rejects(rpc('bob','order.begin',{quoteId:q.quoteId,requestKey:'cross-user',mode:'live'}),/Quote not found/);
 await assert.rejects(rpc('alice','order.begin',{quoteId:q.quoteId,requestKey:'mode-change',mode:'test'}),/Payment mode changed/);
 await db.query('update private.checkout_quotes set expires_at=now()-interval \'1 second\' where id=$1',[q.quoteId]);await assert.rejects(rpc('alice','order.begin',{quoteId:q.quoteId,requestKey:'expired-key',mode:'live'}),/Quote expired/);
 const changed=await quote();await db.exec("update public.store_variants set price_paise=100100 where id='v'");await assert.rejects(rpc('alice','order.begin',{quoteId:changed.quoteId,requestKey:'price-change',mode:'live'}),/Cart changed/);
});
test('test orders and COD never claim prepaid payment or touch live stock',async()=>{
 const before=(await db.query("select stock from public.store_variants where id='v'")).rows[0].stock;
 const online=await create('alice','test');const cod=await create('alice','test','cod');assert.equal(cod.order.status,'cod_confirmed');assert.equal(cod.order.mode,'test');assert.equal(online.order.status,'payment_pending');
 assert.equal((await db.query("select stock from public.store_variants where id='v'")).rows[0].stock,before);
 await assert.rejects(rpc('owner','shipment.begin',{orderId:cod.order.id}),/Test orders cannot ship/);
 await assert.rejects(rpc('bob','order.get',{orderId:cod.order.id}),/Order not found/);
});
test('one quote and idempotency key create exactly one order and reserve once',async()=>{
 const q=await quote();const p={quoteId:q.quoteId,requestKey:'same-request',mode:'live'};const a=await rpc('alice','order.begin',p);const b=await rpc('alice','order.begin',p);assert.equal(a.order.id,b.order.id);assert.equal(a.performCreate,true);assert.equal(b.performCreate,false);
 const c=await rpc('alice','order.begin',{...p,requestKey:'different-request'});assert.equal(c.order.id,a.order.id);assert.equal(c.performCreate,false);
 await assert.rejects(rpc('bob','order.get',{orderId:a.order.id}),/Order not found/);
});
test('oversell guard serializes creates; explicit failure and expiry release once',async()=>{
 await db.exec("update public.store_variants set stock=1 where id='v'");const qa=await quote(),qb=await quote();
 const results=await Promise.allSettled([rpc('alice','order.begin',{quoteId:qa.quoteId,requestKey:'race-a-key',mode:'live'}),rpc('alice','order.begin',{quoteId:qb.quoteId,requestKey:'race-b-key',mode:'live'})]);assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
 const order=results.find(x=>x.status==='fulfilled').value.order;
 await rpc('','order.createFailed',{orderId:order.id,ambiguous:false});await rpc('','order.createFailed',{orderId:order.id,ambiguous:false});assert.equal((await db.query("select stock from public.store_variants where id='v'")).rows[0].stock,1);
 const pending=await create();await db.query("update public.store_orders set reservation_expires_at=now()-interval '1 second' where id=$1",[pending.order.id]);await rpc('alice','order.get',{orderId:pending.order.id});await rpc('alice','order.get',{orderId:pending.order.id});assert.equal((await db.query("select stock from public.store_variants where id='v'")).rows[0].stock,1);
});
test('captured provider identity and totals are exact; repeats never double decrement; late capture reacquires or reviews',async()=>{
 const x=await create();await rpc('','order.attach',{orderId:x.order.id,providerOrderId:'order_exact',mode:'live',amountPaise:x.order.totalPaise,currency:'INR'});
 const payment={id:'pay_exact',order_id:'order_exact',amount:x.order.totalPaise,currency:'INR',status:'captured',captured:true};
 await assert.rejects(rpc('','payment.settle',{orderId:x.order.id,payment:{...payment,amount:1},mode:'live'}),/Payment does not match/);
 await assert.rejects(rpc('','payment.settle',{orderId:x.order.id,payment:{...payment,order_id:'order_forged'},mode:'live'}),/Payment does not match/);
 assert.equal((await rpc('','payment.settle',{orderId:x.order.id,payment:{...payment,status:'authorized',captured:false},mode:'live'})).status,'payment_pending');
 await db.query("update public.store_orders set reservation_expires_at=now()-interval '1 second' where id=$1",[x.order.id]);await rpc('alice','order.get',{orderId:x.order.id});await db.exec("update public.store_variants set stock=0 where id='v'");
 assert.equal((await rpc('','payment.settle',{orderId:x.order.id,payment,mode:'live'})).status,'payment_review');
 await db.exec("update public.store_variants set stock=1 where id='v'");assert.equal((await rpc('','payment.settle',{orderId:x.order.id,payment,mode:'live'})).status,'paid');assert.equal((await rpc('','payment.settle',{orderId:x.order.id,payment,mode:'live'})).status,'paid');assert.equal((await db.query("select stock from public.store_variants where id='v'")).rows[0].stock,0);
});
test('shipment actions require staff, real live eligibility and provider tracking before shipped',async()=>{
 await db.exec("update public.store_variants set stock=1 where id='v'");const x=await create('alice','live','cod');
 await assert.rejects(rpc('alice','shipment.begin',{orderId:x.order.id}),/Staff access required/);const first=await rpc('owner','shipment.begin',{orderId:x.order.id});const repeat=await rpc('owner','shipment.begin',{orderId:x.order.id});assert.equal(first.performCreate,true);assert.equal(repeat.performCreate,false);
 await assert.rejects(db.query("select public.admin_action('owner','order.advance',$1)",[JSON.stringify({id:x.order.id,status:'shipped'})]),/Invalid order transition/);
 await rpc('','shipment.attach',{orderId:x.order.id,shipmentId:123,shiprocketOrderId:456});const summary=await rpc('alice','order.get',{orderId:x.order.id});assert.equal(summary.tracking.shipmentId,123);assert.equal(summary.status,'cod_confirmed');
 await assert.rejects(rpc('bob','shipment.get',{orderId:x.order.id}),/Order not found/);
 assert.equal((await callCustomer('alice','orders.list')).some(o=>o.id===x.order.id&&o.mode==='live'&&o.codFeePaise===20000),true);
});
test('checkout uses bounded packed weight without requiring dimensions',async()=>{
 await db.exec("update public.store_variants set stock=100 where id='v'");const q=await quote('alice','test');assert.equal(q.mode,'test');
 await db.exec("update public.store_products set payload=jsonb_set(payload,'{variants,0,shipping}','{\"weightGrams\":1200}') where id='p'");
 const context=await rpc('alice','context',{addressId:'a',items,mode:'test',paymentMethod:'cod'});
 assert.deepEqual(context.parcel,{weightGrams:1200});
 await db.exec("update public.store_products set payload=jsonb_set(payload,'{variants,0,shipping,weightGrams}','0') where id='p'");
 await assert.rejects(quote('alice','test'),/Packed shipping weight is invalid/);
 await db.exec("update public.store_products set payload=jsonb_set(payload,'{variants,0,shipping,weightGrams}','1200') where id='p'");
 await assert.rejects(rpc('alice','context',{addressId:'a',items:[{...items[0],quantity:99}],mode:'test',paymentMethod:'cod'}),/stock|exceeds one parcel/);
});
test('expired reservations cannot be broken by removing their catalog variant',async()=>{
 await db.exec("update public.store_variants set stock=2 where id='v'");const o=await create();
 const p=(await db.query("select private.product_document(p) as p from public.store_products p where id='p'")).rows[0].p;
 await assert.rejects(db.query("select public.admin_action('owner','product.save',$1)",[JSON.stringify({...p,id:'p',slug:'p',status:'active',media:[],variants:[{...p.variants[0],id:'replacement',sku:'REPLACEMENT'}]})]),/reserved by a pending order/);
 await db.query("update public.store_orders set reservation_expires_at=now()-interval '1 second' where id=$1",[o.order.id]);await rpc('alice','order.get',{orderId:o.order.id});
});

test('legacy net weight supports delivery without a separate shipping record or dimensions', async () => {
 await db.exec("update public.store_variants set stock=100 where id='v'");
 await db.exec("update public.store_products set payload=jsonb_set(payload,'{variants,0}',((payload#>'{variants,0}')-'shipping')||'{\"weightGrams\":1000}'::jsonb) where id='p'");
 const context=await rpc('alice','context',{addressId:'a',items,mode:'test',paymentMethod:'razorpay'});
 assert.deepEqual(context.parcel,{weightGrams:1200});
 await db.exec("update public.store_products set payload=jsonb_set(payload,'{variants,0,shipping}','{\"weightGrams\":1200}') where id='p'");
});

test('catalog repair preserves stock and replaces retailer boilerplate with the correct option', async () => {
 const payload={name:'Correct Whey 500 g',brand:'Atlas',category:'protein',summary:'Buy 5 kg at HealthKart.com',
  description:'Buy 5 kg at HealthKart.com',usage:'Follow label',warnings:['Read label'],
  variants:[{id:'clean-variant',label:'Vanilla • 500 g',weightGrams:500}]};
 await db.query("insert into public.store_products(id,slug,status,payload) values ('clean-copy','clean-copy','draft',$1)",[JSON.stringify(payload)]);
 await db.exec("insert into public.store_variants values ('clean-variant','clean-copy','CLEAN-SKU',10000,10000,13)");
 await db.exec(await readFile(new URL('../migrations/20261104041554_legacy_delivery_and_catalog_copy.sql',import.meta.url),'utf8'));
 const stored=(await db.query("select payload from public.store_products where id='clean-copy'")).rows[0].payload;
 assert.deepEqual(stored.variants[0].shipping,{weightGrams:650});
 assert.match(stored.description,/Vanilla • 500 g/);
 assert.doesNotMatch(JSON.stringify(stored),/healthkart|5 kg/i);
 assert.equal((await db.query("select stock from public.store_variants where id='clean-variant'")).rows[0].stock,13);
});
test('already refunded captured payment enters review rather than becoming shippable',async()=>{
 const x=await create();await rpc('','order.attach',{orderId:x.order.id,providerOrderId:'order_refunded',mode:'live',amountPaise:x.order.totalPaise,currency:'INR'});
 const paid=await rpc('','payment.settle',{orderId:x.order.id,mode:'live',payment:{id:'pay_refunded',order_id:'order_refunded',amount:x.order.totalPaise,currency:'INR',status:'captured',captured:true,amount_refunded:100}});assert.equal(paid.status,'payment_review');
 await assert.rejects(rpc('owner','shipment.begin',{orderId:x.order.id}),/not ready for shipment/);
});
test('complete Edge checkout and replayed signed webhook use real SQL state and isolate test inventory',async()=>{
 const {createCheckoutService}=await import('../functions/_shared/checkout.mjs');const {createCommerceHandler}=await import('../functions/_shared/handler.mjs');const {createRazorpayWebhook}=await import('../functions/_shared/razorpay-webhook.mjs');const {createHmac}=await import('node:crypto');
 await db.exec("update public.store_variants set stock=5 where id='v'");let providerCreates=0;
 const env={STORE_PAYMENT_MODE:'test',RAZOR_PAY_TEST_API_KEY:'rzp_test_public',RAZOR_PAY_TEST_SECRET_KEY:'test-secret'};
 const payment={id:'pay_integrated',order_id:'order_integrated',amount:100100,currency:'INR',status:'captured',captured:true};
 const sqlRpc=async(name,args)=>{try{return {data:(await db.query(`select public.${name}(${Object.keys(args).map((_,i)=>'$'+(i+1)).join(',')}) as r`,Object.values(args))).rows[0].r};}catch(error){return {error};}};
 const service=createCheckoutService({env,rpc:async(action,payload,uid)=>{const r=await sqlRpc(action==='role.get'?'customer_action':'checkout_action',{p_uid:uid,p_action:action,p_payload:payload});if(r.error)throw r.error;return r.data;},providers:{shiprocketPickups:async()=>[{pickup_location:'GR Registered',pin_code:'382350',address:'B/4 Shantiniketan Business Hub Near Gangotri Circle Nikol'}],shiprocketServiceability:async()=>[{courier_company_id:1,courier_name:'Courier',estimated_delivery_days:'3',rate:45,cod:1}],razorpayCreate:async(mode,o)=>{providerCreates++;return {id:'order_integrated',amount:o.totalPaise,currency:'INR',receipt:o.id};},razorpayPayment:async()=>payment,razorpayPayments:async()=>[payment]}});
 const handler=createCommerceHandler({db:{rpc:sqlRpc},storage:{},verify:async token=>({uid:token==='alice-token'?'alice':'bob',email:'signed@example.test',emailVerified:true}),allowedOrigins:[],checkout:service});
 const invoke=async(action,payload,token='alice-token')=>handler(new Request('https://store.test/commerce',{method:'POST',headers:{authorization:`Bearer ${token}`},body:JSON.stringify({action,payload})}));
 const quoteResponse=await invoke('checkout.delivery',{addressId:'a',items,paymentMethod:'razorpay',mode:'live',price:1});assert.equal(quoteResponse.status,200);const q=(await quoteResponse.json()).data;assert.equal(q.mode,'test');assert.equal(q.totalPaise,100100);
 const payload={quoteId:q.quoteId,requestKey:'integrated-key',mode:'live',amountPaise:1};const session=(await (await invoke('checkout.create',payload)).json()).data;assert.equal(session.mode,'test');assert.equal(session.keyId,'rzp_test_public');assert.equal(session.amountPaise,100100);
 const repeat=(await (await invoke('checkout.create',payload)).json()).data;assert.equal(repeat.id,session.id);assert.equal(providerCreates,1);
 const signature=createHmac('sha256','test-secret').update('order_integrated|pay_integrated').digest('hex');const callback={orderId:session.id,razorpay_payment_id:'pay_integrated',razorpay_signature:signature};assert.equal((await invoke('checkout.verify',callback,'bob-token')).status,400);
 const verified=(await (await invoke('checkout.verify',callback)).json()).data;assert.equal(verified.status,'paid');assert.equal(verified.mode,'test');
 const webhook=createRazorpayWebhook({mode:'test',secret:'webhook-secret',record:async receipt=>{const r=await sqlRpc('ingest_razorpay_receipt',{p_receipt:receipt});if(r.error)throw r.error;return r.data;},reconcile:service.reconcileReceipt});
 const body=JSON.stringify({account_id:'acc_integrated',event:'payment.captured',payload:{payment:{entity:payment}}});const signed=()=>new Request('https://store.test/webhook',{method:'POST',headers:{'x-razorpay-event-id':'evt_integrated','x-razorpay-signature':createHmac('sha256','webhook-secret').update(body).digest('hex')},body});
 assert.equal((await webhook(signed())).status,200);assert.equal((await webhook(signed())).status,200);assert.equal((await db.query("select processing_state from private.payment_webhook_receipts where event_id='evt_integrated'")).rows[0].processing_state,'processed');assert.equal((await db.query("select stock from public.store_variants where id='v'")).rows[0].stock,5);
});
test('tracking sync is monotonic: an older shipped response cannot undo delivery',async()=>{
 await db.exec("update public.store_variants set stock=5 where id='v'");const x=await create('alice','live','cod');await rpc('owner','shipment.begin',{orderId:x.order.id});await rpc('','shipment.attach',{orderId:x.order.id,shipmentId:234,shiprocketOrderId:567});
 await rpc('','shipment.sync',{orderId:x.order.id,shipmentId:234,tracking:{status:'Delivered',awb:'AWB',fulfillmentStatus:'delivered'}});
 const old=await rpc('','shipment.sync',{orderId:x.order.id,shipmentId:234,tracking:{status:'Shipped',awb:'AWB',fulfillmentStatus:'shipped'}});assert.equal(old.status,'delivered');assert.equal(old.tracking.status,'Delivered');
});
test('staff reload sees expired stock released before preparing a fresh product save',async()=>{
 await db.exec("update public.store_variants set stock=5 where id='v'");const x=await create();await db.query("update public.store_orders set reservation_expires_at=now()-interval '1 second' where id=$1",[x.order.id]);
 const products=(await db.query("select public.admin_action('owner','products.list','{}') as p")).rows[0].p;assert.equal(products[0].variants[0].stockAvailable,5);
});
test('public catalog releases expired holds so a sold-out button cannot strand available stock',async()=>{
 await db.exec("update public.store_variants set stock=1 where id='v'");const x=await create();await db.query("update public.store_orders set reservation_expires_at=now()-interval '1 second' where id=$1",[x.order.id]);
 await db.exec('set role anon');try{const p=(await db.query('select public.catalog_products() as p')).rows[0].p;assert.equal(p[0].variants[0].stockAvailable,1);}finally{await db.exec('reset role');}
});
test('checkout context binds trusted email into immutable address and COD requires verified email',async()=>{
 await db.exec("update public.store_variants set stock=10 where id='v'");
 await db.query("update public.delivery_addresses set payload=payload||$1::jsonb where id='a'",[JSON.stringify({email:'address-spoof@example.test'})]);
 await assert.rejects(rpc('alice','context',{addressId:'a',items,mode:'test',paymentMethod:'razorpay',customerEmail:null}),/valid email/);
 await assert.rejects(rpc('alice','context',{addressId:'a',items,mode:'test',paymentMethod:'cod',customerEmail:'signed@example.test',customerEmailVerified:false}),/Verify your email/);
 const c=await rpc('alice','context',{addressId:'a',items,mode:'test',paymentMethod:'razorpay',customerEmail:'signed@example.test',customerEmailVerified:false});assert.equal(c.customerEmail,'signed@example.test');assert.equal(c.address.email,'signed@example.test');
 const q=await rpc('alice','quote.store',{context:c,delivery:{courierId:1,courierName:'Courier',estimatedDays:'3'},pickupLocation:'GR'});const o=await rpc('alice','order.begin',{quoteId:q.quoteId,requestKey:'signed-email-request',mode:'test'});
 const stored=(await db.query('select address from public.store_orders where id=$1',[o.order.id])).rows[0].address;assert.equal(stored.email,'signed@example.test');
 await db.query("update public.delivery_addresses set payload=payload||$1::jsonb where id='a'",[JSON.stringify({email:'changed-later@example.test'})]);assert.equal((await db.query('select address from public.store_orders where id=$1',[o.order.id])).rows[0].address.email,'signed@example.test');
});
test('post-paid partial/full refunds latch review without restock or allowing shipment, including stale capture replay',async()=>{
 await db.exec("update public.store_variants set stock=10 where id='v'");
 for(const [suffix,refund] of [['partial',{status:'captured',captured:true,amount_refunded:10000,refund_status:'partial'}],['full',{status:'refunded',captured:true,amount_refunded:100100,refund_status:'full'}]]){
  const x=await create();const payment={id:'pay_post'+suffix,order_id:'order_post'+suffix,amount:x.order.totalPaise,currency:'INR',status:'captured',captured:true,amount_refunded:0,refund_status:null};
  await rpc('','order.attach',{orderId:x.order.id,providerOrderId:payment.order_id,mode:'live',amountPaise:payment.amount,currency:'INR'});assert.equal((await rpc('','payment.settle',{orderId:x.order.id,mode:'live',payment})).status,'paid');
  const stock=(await db.query("select stock from public.store_variants where id='v'")).rows[0].stock;
  const reviewed=await rpc('','payment.settle',{orderId:x.order.id,mode:'live',payment:{...payment,...refund}});assert.equal(reviewed.status,'payment_review');
  assert.equal((await rpc('','payment.settle',{orderId:x.order.id,mode:'live',payment:{...payment,...refund}})).status,'payment_review');
  assert.equal((await rpc('','payment.settle',{orderId:x.order.id,mode:'live',payment})).status,'payment_review','stale captured response must not clear refund review');
  await assert.rejects(rpc('owner','shipment.begin',{orderId:x.order.id}),/not ready for shipment/);assert.equal((await db.query("select stock from public.store_variants where id='v'")).rows[0].stock,stock);
  assert.equal((await db.query('select reservation_state from public.store_orders where id=$1',[x.order.id])).rows[0].reservation_state,'committed');
 }
});
test('standard signed refund payload resolves exact provider payment mapping, survives replay, and blocks shipment',async()=>{
 const {createCheckoutService}=await import('../functions/_shared/checkout.mjs');const {createRazorpayWebhook}=await import('../functions/_shared/razorpay-webhook.mjs');const {createHmac}=await import('node:crypto');
 const x=await create();let payment={id:'pay_standardrefund',order_id:'order_standardrefund',amount:x.order.totalPaise,currency:'INR',status:'captured',captured:true,amount_refunded:0};
 await rpc('','order.attach',{orderId:x.order.id,providerOrderId:payment.order_id,mode:'live',amountPaise:payment.amount,currency:'INR'});await rpc('','payment.settle',{orderId:x.order.id,mode:'live',payment});const stock=(await db.query("select stock from public.store_variants where id='v'")).rows[0].stock;
 payment={...payment,amount_refunded:10000,refund_status:'partial'};const fetched=[];const service=createCheckoutService({env:{STORE_PAYMENT_MODE:'test'},rpc:(action,payload,uid)=>rpc(uid,action,payload),providers:{razorpayPayment:async(mode,id)=>{fetched.push({mode,id});return payment;}}});
 const hook=createRazorpayWebhook({mode:'live',secret:'refund-fixture',record:async receipt=>(await db.query('select public.ingest_razorpay_receipt($1::jsonb) as r',[JSON.stringify(receipt)])).rows[0].r,reconcile:service.reconcileReceipt});
 const raw=JSON.stringify({account_id:'acc_refund',event:'refund.processed',payload:{refund:{entity:{id:'rfnd_standard',payment_id:payment.id,amount:10000,currency:'INR',status:'processed'}}}});const request=()=>new Request('https://store.test/webhook',{method:'POST',headers:{'x-razorpay-event-id':'evt_standardrefund','x-razorpay-signature':createHmac('sha256','refund-fixture').update(raw).digest('hex')},body:raw});
 assert.equal((await hook(request())).status,200);assert.equal((await rpc('alice','order.get',{orderId:x.order.id})).status,'payment_review');assert.equal((await hook(request())).status,200);assert.deepEqual(fetched,[{mode:'live',id:payment.id},{mode:'live',id:payment.id}]);
 assert.equal((await db.query("select processing_state from private.payment_webhook_receipts where event_id='evt_standardrefund'")).rows[0].processing_state,'processed');await assert.rejects(rpc('owner','shipment.begin',{orderId:x.order.id}),/not ready for shipment/);assert.equal((await db.query("select stock from public.store_variants where id='v'")).rows[0].stock,stock);
});
test('refund review preserves an existing shipment and cannot be cleared by later tracking sync',async()=>{
 const x=await create();const payment={id:'pay_existingrefund',order_id:'order_existingrefund',amount:x.order.totalPaise,currency:'INR',status:'captured',captured:true};await rpc('','order.attach',{orderId:x.order.id,providerOrderId:payment.order_id,mode:'live',amountPaise:payment.amount,currency:'INR'});await rpc('','payment.settle',{orderId:x.order.id,mode:'live',payment});
 await rpc('owner','shipment.begin',{orderId:x.order.id});await rpc('','shipment.attach',{orderId:x.order.id,shipmentId:345,shiprocketOrderId:678});await db.query("select public.admin_action('owner','order.advance',$1)",[JSON.stringify({id:x.order.id,status:'processing'})]);
 await rpc('','payment.settle',{orderId:x.order.id,mode:'live',payment:{...payment,amount_refunded:10000,refund_status:'partial'}});const sync=await rpc('','shipment.sync',{orderId:x.order.id,shipmentId:345,tracking:{status:'Shipped',awb:'REALAWB',fulfillmentStatus:'shipped'}});assert.equal(sync.status,'payment_review');assert.equal(sync.tracking.shipmentId,345);assert.equal(sync.tracking.awb,'REALAWB');await assert.rejects(rpc('owner','shipment.begin',{orderId:x.order.id}),/not ready for shipment/);
});

test('admin and customer order wrappers compile under production variable-conflict rules and retain role/processing gates',async()=>{
 assert.equal((await db.query('show plpgsql.variable_conflict')).rows[0]['plpgsql.variable_conflict'],'error');
 await db.exec("update public.store_variants set stock=10 where id='v'");const x=await create('alice','live','cod');
 const listed=(await db.query("select public.admin_action('owner','orders.list','{}') as orders")).rows[0].orders;
 const found=listed.find(o=>o.id===x.order.id);assert.equal(found.userId,'alice');assert.equal(found.paymentMethod,'cod');assert.equal(found.status,'cod_confirmed');assert.equal(found.address.email,'buyer@example.test');
 const customer=await callCustomer('alice','orders.list');assert.equal(customer.some(o=>o.id===x.order.id),true);assert.equal(customer.find(o=>o.id===x.order.id).address,undefined);
 assert.deepEqual(await callCustomer('bob','orders.list'),[]);await assert.rejects(db.query("select public.admin_action('bob','orders.list','{}')"),/Staff access required/);
 const advanced=(await db.query("select public.admin_action('owner','order.advance',$1) as result",[JSON.stringify({id:x.order.id,status:'processing'})])).rows[0].result;assert.equal(advanced.status,'processing');
 assert.equal((await rpc('alice','order.get',{orderId:x.order.id})).status,'processing');
 await assert.rejects(db.query("select public.admin_action('owner','order.advance',$1)",[JSON.stringify({id:x.order.id,status:'shipped'})]),/Invalid order transition/);
});
