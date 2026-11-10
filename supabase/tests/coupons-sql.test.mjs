import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
let db;
const items=[{productId:'coupon-product',variantId:'coupon-variant',quantity:1}];
const rpc=async(uid,action,payload={})=>(await db.query('select public.checkout_action($1,$2,$3::jsonb) as r',[uid,action,JSON.stringify(payload)])).rows[0].r;
const definition=(code,extra={})=>({code,type:'percentage',value:10,minSpendPaise:0,maxDiscountPaise:null,startsAt:null,expiresAt:'2099-01-01T00:00:00Z',usageLimit:10,enabled:true,...extra});
const save=(code,extra={})=>rpc('owner','coupon.save',definition(code,extra));
const context=(couponCode,uid='alice',extra={})=>rpc(uid,'context',{addressId:uid,items,mode:'live',paymentMethod:'razorpay',customerEmail:'buyer@example.test',customerEmailVerified:true,...(couponCode?{couponCode}:{}),...extra});
const quote=async(code,uid='alice',extra={})=>rpc(uid,'quote.store',{context:await context(code,uid,extra),delivery:{courierId:1,courierName:'Courier',estimatedDays:'3'},pickupLocation:'GR Nutritions'});
const begin=(q,uid='alice',extra={})=>rpc(uid,'order.begin',{quoteId:q.quoteId,requestKey:crypto.randomUUID(),mode:q.mode,...extra});
const counters=async(code)=>(await rpc('owner','coupon.adminList',{search:code})).coupons.find(c=>c.code===code);
before(async()=>{
 db=new PGlite();await db.exec("create role anon;create role authenticated;create role service_role;set plpgsql.variable_conflict='error';");
 for(const f of (await readdir(new URL('../migrations/',import.meta.url))).filter(f=>f.endsWith('.sql')&&!f.includes('media_bucket')).sort())await db.exec(await readFile(new URL('../migrations/'+f,import.meta.url),'utf8'));
 await db.exec("insert into private.staff_memberships(firebase_uid) values ('owner')");
 for(const uid of ['alice','bob','carol'])await db.query('insert into public.delivery_addresses(id,firebase_uid,payload) values($1,$1,$2)',[uid,JSON.stringify({fullName:'Buyer Person',phone:'9876543210',line1:'Test Street',city:'Pune',state:'Maharashtra',pincode:'411001'})]);
 await db.query("insert into public.store_products(id,slug,status,payload) values ('coupon-product','coupon-product','active',$1)",[JSON.stringify({name:'Protein',variants:[{id:'coupon-variant',shipping:{weightGrams:1200}}]})]);
 await db.exec("insert into public.store_variants values ('coupon-variant','coupon-product','COUPON-SKU',100000,150000,100)");
});
after(async()=>{await db?.close();});
test('coupon management requires real staff membership and private data is inaccessible to browser roles',async()=>{
 await assert.rejects(rpc('alice','coupon.save',definition('FORGED',{isAdmin:true})),/Staff access required/);
 await assert.rejects(rpc('alice','coupon.adminList'),/Staff access required/);
 for(const role of ['anon','authenticated']){
  await db.exec(`set role ${role}`);
  try{await assert.rejects(rpc('owner','coupon.adminList'),/permission denied/);await assert.rejects(db.query('select * from private.coupons'),/permission denied/);await assert.rejects(db.query('select * from private.coupon_redemptions'),/permission denied/);}finally{await db.exec('reset role');}
 }
 const c=await save('  welcome  ');assert.equal(c.code,'WELCOME');assert.equal(c.usedCount,0);assert.equal(c.reservedCount,0);assert.equal(c.remainingCount,10);
 await db.exec('set role service_role');try{assert.equal((await rpc('owner','coupon.adminList')).coupons[0].code,'WELCOME');}finally{await db.exec('reset role');}
 await assert.rejects(save('welcome'),/already exists/);
 for(const invalid of [{value:100.01},{value:1.001},{type:'fixed',value:0},{usageLimit:1.5},{minSpendPaise:-1},{expiresAt:'not-a-date'},{startsAt:'2099-01-02T00:00:00Z'},{maxDiscountPaise:1.1},{enabled:null}])await assert.rejects(save('INVALID',invalid),/Invalid coupon/);
});
test('discount math rounds down exact paise, honors caps and minimum spend, and shipping uses discounted merchandise',async()=>{
 await save('MATH',{value:12.34,maxDiscountPaise:12000,minSpendPaise:99999});
 const c=await context(' math ');assert.equal(c.couponCode,'MATH');assert.equal(c.subtotalPaise,100000);assert.equal(c.discountPaise,12000);assert.equal(c.discountedSubtotalPaise,88000);assert.equal(c.shippingPaise,5000);assert.equal(c.totalPaise,93000);
 await save('FRACTION',{value:1.23});await db.exec("update public.store_variants set price_paise=100099 where id='coupon-variant'");
 assert.equal((await context('FRACTION')).discountPaise,1231);
 await save('FIXED',{type:'fixed',value:1.99});assert.equal((await context('FIXED')).discountPaise,199);
 await save('FLOOR',{value:100});assert.equal((await context('FLOOR')).discountedSubtotalPaise,100);
 await save('MINIMUM',{minSpendPaise:100100});await assert.rejects(context('MINIMUM'),/minimum spend/);
 await db.exec("update public.store_variants set price_paise=100000 where id='coupon-variant'");
 const cod=await context('FIXED','alice',{paymentMethod:'cod'});assert.equal(cod.codFeePaise,20000);assert.equal(cod.totalPaise,124801);
 const plain=await context();assert.equal(plain.totalPaise,100000);assert.equal(plain.discountPaise??0,0);
 await save('BOUNDARY',{type:'fixed',value:1});assert.equal((await context('BOUNDARY')).shippingPaise,5000);
 await db.exec("update public.store_variants set price_paise=100001 where id='coupon-variant'");assert.equal((await context('BOUNDARY')).shippingPaise,0);
 await db.exec("update public.store_variants set price_paise=100000 where id='coupon-variant'");
});
test('disabled, future and expired coupons are rejected at quote and again before order creation',async()=>{
 await save('DISABLED',{enabled:false});await assert.rejects(context('DISABLED'),/not active/);
 await save('FUTURE',{startsAt:'2098-12-31T18:30:00Z'});await assert.rejects(context('FUTURE'),/not active/);
 await save('EXPIRED',{expiresAt:'2020-01-01T00:00:00Z'});await assert.rejects(context('EXPIRED'),/expired/);
 await assert.rejects(context('MISSING'),/not found/);
 const d=await save('EDIT');const q=await quote('EDIT');await save('EDIT',{id:d.id,value:20});await assert.rejects(begin(q),/Cart changed/);
 const q2=await quote('EDIT');await db.query('update private.coupons set expires_at=clock_timestamp() where id=$1',[d.id]);await assert.rejects(begin(q2),/expired/);
 const unchanged=await save('UNCHANGED');const q3=await quote('UNCHANGED');await save('UNCHANGED',{id:unchanged.id,usageLimit:20});assert.equal((await begin(q3)).order.discountPaise,10000);
});
test('last coupon use serializes across customers; retries are idempotent; failure releases only unpaid hold',async()=>{
 await save('LAST',{usageLimit:1});const qa=await quote('LAST'),qb=await quote('LAST','bob');
 const results=await Promise.allSettled([begin(qa),begin(qb,'bob')]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.match(results.find(r=>r.status==='rejected').reason.message,/limit/);
 const winner=results[0].status==='fulfilled'?'alice':'bob';const q=winner==='alice'?qa:qb;const first=results.find(r=>r.status==='fulfilled').value.order;
 const retry=await begin(q,winner);assert.equal(retry.order.id,first.id);assert.equal(retry.performCreate,false);assert.equal((await counters('LAST')).reservedCount,1);
 await rpc('','order.createFailed',{orderId:first.id,ambiguous:true});assert.equal((await counters('LAST')).reservedCount,1);
 await rpc('','order.createFailed',{orderId:first.id,ambiguous:false});await rpc('','order.createFailed',{orderId:first.id,ambiguous:false});assert.equal((await counters('LAST')).remainingCount,1);
 const cod=(await begin(await quote('LAST',winner,{paymentMethod:'cod'}),winner)).order;assert.equal(cod.status,'cod_confirmed');assert.equal(cod.discountPaise,10000);assert.equal((await counters('LAST')).usedCount,1);await assert.rejects(context('LAST',winner),/already used/);
});
test('two different quotes from one customer cannot allocate two simultaneous uses',async()=>{
 await save('CUSTOMER',{usageLimit:3});const qa=await quote('CUSTOMER'),qb=await quote('CUSTOMER');
 const results=await Promise.allSettled([begin(qa),begin(qb)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.match(results.find(r=>r.status==='rejected').reason.message,/already used/);assert.equal((await counters('CUSTOMER')).reservedCount,1);
});
test('expired unpaid holds release customer and total capacity, while late capture cannot over-redeem',async()=>{
 await save('LATE',{usageLimit:1});const old=(await begin(await quote('LATE'))).order;
 await rpc('','order.attach',{orderId:old.id,providerOrderId:'order_couponlate',mode:'live',amountPaise:old.totalPaise,currency:'INR'});
 await db.query("update public.store_orders set reservation_expires_at=clock_timestamp()-interval '1 second' where id=$1",[old.id]);await rpc('alice','order.get',{orderId:old.id});assert.equal((await counters('LATE')).remainingCount,1);
 await begin(await quote('LATE','bob',{paymentMethod:'cod'}),'bob');
 const payment={id:'pay_couponlate',order_id:'order_couponlate',amount:old.totalPaise,currency:'INR',status:'captured',captured:true};
 await assert.rejects(rpc('','payment.settle',{orderId:old.id,mode:'live',payment:{...payment,amount:1}}),/Payment does not match/);
 assert.equal((await rpc('','payment.settle',{orderId:old.id,mode:'live',payment})).status,'payment_review');assert.equal((await counters('LATE')).usedCount,1);assert.equal((await counters('LATE')).reservedCount,0);
 await assert.rejects(rpc('owner','shipment.begin',{orderId:old.id}),/not ready/);
});
test('captured and COD uses remain used after refunds; payment retries never double-count; test usage is isolated',async()=>{
 await save('PAID',{usageLimit:2});const x=(await begin(await quote('PAID'))).order;
 await rpc('','order.attach',{orderId:x.id,providerOrderId:'order_couponpaid',mode:'live',amountPaise:x.totalPaise,currency:'INR'});
 const payment={id:'pay_couponpaid',order_id:'order_couponpaid',amount:x.totalPaise,currency:'INR',status:'captured',captured:true};
 assert.equal((await rpc('','payment.settle',{orderId:x.id,mode:'live',payment})).status,'paid');await rpc('','payment.settle',{orderId:x.id,mode:'live',payment});assert.equal((await counters('PAID')).usedCount,1);
 await rpc('','payment.settle',{orderId:x.id,mode:'live',payment:{...payment,amount_refunded:x.totalPaise}});await assert.rejects(context('PAID'),/already used/);assert.equal((await counters('PAID')).usedCount,1);
 const d=await counters('PAID');await save('PAID',{id:d.id,value:30});assert.equal((await rpc('alice','order.get',{orderId:x.id})).discountPaise,10000);
 await begin(await quote('PAID','alice',{mode:'test',paymentMethod:'cod'}));assert.equal((await counters('PAID')).usedCount,1);
 const list=(await db.query("select public.customer_action('alice','orders.list','{}') as r")).rows[0].r;assert.equal(list.find(o=>o.id===x.id).couponCode,'PAID');
});
test('admin cannot lower a cap below capacity already promised to customers',async()=>{
 const d=await save('CAPEDIT',{usageLimit:3});await begin(await quote('CAPEDIT'));await begin(await quote('CAPEDIT','bob',{paymentMethod:'cod'}),'bob');
 await assert.rejects(save('CAPEDIT',{id:d.id,usageLimit:1}),/below existing/);assert.equal((await counters('CAPEDIT')).usageLimit,3);
});
test('timezone offsets compare as instants and expiry is exclusive at the current boundary',async()=>{
 await db.exec("set timezone='Asia/Kolkata'");
 try{
  const d=await save('ZONES',{startsAt:'2020-01-01T05:30:00+05:30',expiresAt:'2099-01-01T05:30:00+05:30'});assert.equal(new Date(d.startsAt).toISOString(),'2020-01-01T00:00:00.000Z');assert.equal((await context('ZONES')).discountPaise,10000);
  await db.query('update private.coupons set starts_at=null,expires_at=clock_timestamp() where id=$1',[d.id]);await assert.rejects(context('ZONES'),/expired/);
 }finally{await db.exec("set timezone='UTC'");}
});
test('coupon test-mode unpaid expiry releases its own hold without changing live inventory',async()=>{
 await save('TESTEXP',{usageLimit:1});const before=(await db.query("select stock from public.store_variants where id='coupon-variant'")).rows[0].stock;
 const x=(await begin(await quote('TESTEXP','alice',{mode:'test'}))).order;
 await assert.rejects(context('TESTEXP','alice',{mode:'test'}),/already used/);
 await db.query("update public.store_orders set reservation_expires_at=clock_timestamp()-interval '1 second' where id=$1",[x.id]);assert.equal((await rpc('alice','order.get',{orderId:x.id})).status,'payment_expired');assert.equal((await context('TESTEXP','alice',{mode:'test'})).discountPaise,10000);
 assert.equal((await db.query("select stock from public.store_variants where id='coupon-variant'")).rows[0].stock,before);
});
test('late capture reacquires free coupon capacity once and blocks the customer from a second use',async()=>{
 await save('RECLAIM',{usageLimit:1});const x=(await begin(await quote('RECLAIM'))).order;
 await rpc('','order.attach',{orderId:x.id,providerOrderId:'order_reclaim',mode:'live',amountPaise:x.totalPaise,currency:'INR'});
 await db.query("update public.store_orders set reservation_expires_at=clock_timestamp()-interval '1 second' where id=$1",[x.id]);await rpc('alice','order.get',{orderId:x.id});
 const payment={id:'pay_reclaim',order_id:'order_reclaim',amount:x.totalPaise,currency:'INR',status:'captured',captured:true};assert.equal((await rpc('','payment.settle',{orderId:x.id,mode:'live',payment})).status,'paid');
 assert.equal((await counters('RECLAIM')).usedCount,1);await assert.rejects(context('RECLAIM'),/already used/);
});
test('real Edge coupon save, quote and COD create keep canonical SQL amounts and invoice snapshot',async()=>{
 const {createCheckoutService}=await import('../functions/_shared/checkout.mjs');const {createCommerceHandler}=await import('../functions/_shared/handler.mjs');
 const sqlRpc=async(name,args)=>{try{return {data:(await db.query(`select public.${name}(${Object.keys(args).map((_,i)=>'$'+(i+1)).join(',')}) as r`,Object.values(args))).rows[0].r};}catch(error){return {error};}};
 const service=createCheckoutService({env:{STORE_PAYMENT_MODE:'live'},rpc:async(action,payload,uid)=>{const r=await sqlRpc(action==='role.get'?'customer_action':'checkout_action',{p_uid:uid,p_action:action,p_payload:payload});if(r.error)throw r.error;return r.data;},providers:{shiprocketPickups:async()=>[{pickup_location:'GR',pin_code:'382350',address:'B/4 Shantiniketan Business Hub Near Gangotri Circle Nikol'}],shiprocketServiceability:async()=>[{courier_company_id:1,courier_name:'Courier',cod:1}]}});
 const handler=createCommerceHandler({db:{rpc:sqlRpc},storage:{},allowedOrigins:[],verify:async uid=>({uid,email:'signed@example.test',emailVerified:true}),checkout:service});
 const invoke=(uid,action,payload)=>handler(new Request('https://store.test/commerce',{method:'POST',headers:{authorization:`Bearer ${uid}`},body:JSON.stringify({action,payload})}));
 assert.equal((await invoke('alice','coupon.save',definition('EDGE'))).status,403);
 assert.equal((await invoke('owner','coupon.save',definition('EDGE',{type:'fixed',value:123.45}))).status,200);
 const response=await invoke('alice','checkout.delivery',{addressId:'alice',items,paymentMethod:'cod',couponCode:' edge ',discountPaise:99999});assert.equal(response.status,200);const q=(await response.json()).data;assert.equal(q.discountPaise,12345);assert.equal(q.shippingPaise,5000);assert.equal(q.totalPaise,112655);
 const created=await invoke('alice','checkout.create',{quoteId:q.quoteId,requestKey:'coupon-edge-create',amountPaise:1});assert.equal(created.status,200);const o=(await created.json()).data;assert.equal(o.amountPaise,112655);assert.equal(o.status,'cod_confirmed');
 const raw=(await rpc('owner','shipment.begin',{orderId:o.id})).order;assert.equal(raw.discount_paise,12345);assert.equal(raw.total_paise,112655);assert.equal(raw.coupon_code,'EDGE');assert.equal(raw.address.email,'signed@example.test');
 const stale=await save('EDGESTALE');const staleQuote=(await (await invoke('bob','checkout.delivery',{addressId:'bob',items,paymentMethod:'cod',couponCode:'EDGESTALE'})).json()).data;
 await save('EDGESTALE',{id:stale.id,value:20});const before=(await db.query('select count(*)::int as n from public.store_orders')).rows[0].n;
 const rejected=await invoke('bob','checkout.create',{quoteId:staleQuote.quoteId,requestKey:'coupon-stale-create'});assert.equal(rejected.status,400);assert.equal((await rejected.json()).error,'Cart changed. Please check delivery again.');assert.equal((await db.query('select count(*)::int as n from public.store_orders')).rows[0].n,before);
});
