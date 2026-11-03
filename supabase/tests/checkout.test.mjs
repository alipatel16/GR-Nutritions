import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCheckoutService, paymentSignatureValid, selectPickup, shipmentTracking} from '../functions/_shared/checkout.mjs';
import {createProviders, ProviderError} from '../functions/_shared/providers.mjs';
const env={STORE_PAYMENT_MODE:'test',RAZOR_PAY_TEST_API_KEY:'rzp_test_public',RAZOR_PAY_TEST_SECRET_KEY:'test-secret',SHIPROCKET_API_EMAIL:'api@example.test',SHIPROCKET_API_KEY:'password'};
const order={id:'12345678-1234-1234-1234-123456789abc',status:'payment_pending',paymentMethod:'razorpay',mode:'test',totalPaise:104900,currency:'INR'};
function fixture({row=order,provider={},rpcOverride}={}) {const calls=[];let creates=0;const rpc=async(action,payload,uid)=>{calls.push({action,payload,uid});if(rpcOverride)return rpcOverride(action,payload,uid);if(action==='order.begin')return {order:row,performCreate:++creates===1};if(action==='order.provider')return {order:row,providerOrderId:'order_stored'};if(action==='order.get'||action==='payment.settle')return row;return {};};return {calls,service:createCheckoutService({rpc,env,providers:{razorpayCreate:async()=>({id:'order_created',amount:104900,currency:'INR',receipt:row.id}),razorpayPayment:async()=>({id:'pay_valid',order_id:'order_stored',amount:104900,currency:'INR',status:'captured',captured:true}),razorpayPayments:async()=>[],...provider}})};}
test('merchant mode comes from server; order create exposes only public matching key and ignores forged amounts',async()=>{
 const f=fixture();const r=await f.service('alice','checkout.create',{quoteId:'quote_123',requestKey:'request_123',mode:'live',amountPaise:1});assert.equal(r.mode,'test');assert.equal(r.amountPaise,104900);assert.equal(r.keyId,'rzp_test_public');assert.equal(r.razorpayOrderId,'order_created');assert.equal(f.calls[0].payload.mode,'test');assert.equal(JSON.stringify(r).includes('secret'),false);
});
test('ambiguous provider creation is durable and retry never posts another order',async()=>{
 let calls=0;const f=fixture({provider:{razorpayCreate:async()=>{calls++;throw new ProviderError('Provider unavailable',true);}}});await assert.rejects(f.service('alice','checkout.create',{quoteId:'quote_123',requestKey:'request_123'}),/confirmation is pending/);assert.equal(f.calls.find(x=>x.action==='order.createFailed').payload.ambiguous,true);const r=await f.service('alice','checkout.create',{quoteId:'quote_123',requestKey:'request_123'});assert.equal(calls,1);assert.equal(r.razorpayOrderId,undefined);
});
test('forged callback cannot fetch or mark payment; signature uses stored server order and mode secret',async()=>{
 const f=fixture();await assert.rejects(f.service('alice','checkout.verify',{orderId:order.id,razorpay_payment_id:'pay_valid',razorpay_signature:'0'.repeat(64),razorpay_order_id:'order_forged'}),/Payment signature is invalid/);assert.equal(f.calls.some(x=>x.action==='payment.settle'),false);
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode('test-secret'),{name:'HMAC',hash:'SHA-256'},false,['sign']);const signature=Buffer.from(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode('order_stored|pay_valid'))).toString('hex');assert.equal(await paymentSignatureValid('order_stored','pay_valid',signature,'test-secret'),true);assert.equal(await paymentSignatureValid('order_forged','pay_valid',signature,'test-secret'),false);
 await f.service('alice','checkout.verify',{orderId:order.id,razorpay_payment_id:'pay_valid',razorpay_signature:signature});assert.equal(f.calls.find(x=>x.action==='payment.settle').payload.mode,'test');
});
test('provider mismatches and authorized payments cannot become paid',async()=>{
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode('test-secret'),{name:'HMAC',hash:'SHA-256'},false,['sign']);const sig=Buffer.from(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode('order_stored|pay_valid'))).toString('hex');
 const f=fixture({provider:{razorpayPayment:async()=>({id:'pay_wrong',order_id:'order_forged',amount:1,currency:'USD',status:'captured',captured:true})}});await assert.rejects(f.service('alice','checkout.verify',{orderId:order.id,razorpay_payment_id:'pay_valid',razorpay_signature:sig}),/Payment does not match/);assert.equal(f.calls.some(x=>x.action==='payment.settle'),false);
 const authorized=fixture({provider:{razorpayPayment:async()=>({id:'pay_valid',order_id:'order_stored',amount:104900,currency:'INR',status:'authorized',captured:false})}});const result=await authorized.service('alice','checkout.verify',{orderId:order.id,razorpay_payment_id:'pay_valid',razorpay_signature:sig});assert.equal(result.status,'payment_pending');assert.equal(authorized.calls.some(x=>x.action==='payment.settle'),false);
});
test('pickup must be registered at merchant location or explicitly named; never guess first warehouse',()=>{
 const locations=[{pickup_location:'Wrong',pin_code:'110001',address:'Elsewhere'},{pickup_location:'GR Registered',pin_code:'382350',address:'B/4 Shantiniketan Business Hub Near Gangotri Circle Nikol'}];assert.equal(selectPickup(locations).pickup_location,'GR Registered');assert.throws(()=>selectPickup([locations[0]]),/pickup location/);assert.throws(()=>selectPickup(locations,'Missing'),/pickup location/);assert.equal(selectPickup(locations,'GR Registered').pickup_location,'GR Registered');
});
test('tracking derives fulfillment only from actual carrier movement/delivery, never AWB assignment',()=>{
 assert.equal(shipmentTracking({tracking_data:{shipment_status:1,shipment_track:[{awb_code:'123',courier_name:'X',current_status:'AWB Assigned'}]}},123).fulfillmentStatus,undefined);
 assert.equal(shipmentTracking({tracking_data:{shipment_status:6,shipment_track:[{awb_code:'123',courier_name:'X',current_status:'Shipped'}]}},123).fulfillmentStatus,'shipped');
 assert.equal(shipmentTracking({tracking_data:{shipment_status:7,shipment_track:[{awb_code:'123',current_status:'Delivered'}]}},123).fulfillmentStatus,'delivered');
});
test('integration readiness returns booleans only and requires staff role',async()=>{
 let staff=false;const f=fixture({rpcOverride:async action=>action==='role.get'?{isAdmin:staff}:{}});await assert.rejects(f.service('alice','integration.status',{}),/Staff access required/);staff=true;assert.deepEqual(await f.service('owner','integration.status',{}),{mode:'test',razorpay:{testConfigured:true,liveConfigured:false},shiprocket:{configured:true}});
});
test('providers use bounded server calls, distinguish ambiguous timeout from definite rejection, and send no fictitious idempotency header',async()=>{
 let request;const p=createProviders({env,fetchImpl:async(url,options)=>{request={url,options};return new Response(JSON.stringify({id:'order_created',amount:104900,currency:'INR',receipt:order.id}),{status:200});}});await p.razorpayCreate('test',{id:order.id,totalPaise:104900});assert.equal(JSON.parse(request.options.body).amount,104900);assert.equal('Idempotency-Key' in request.options.headers,false);
 const reject=createProviders({env,fetchImpl:async()=>new Response('{}',{status:400})});await assert.rejects(reject.razorpayCreate('test',order),e=>e instanceof ProviderError&&!e.ambiguous);
 const timeout=createProviders({env,fetchImpl:async()=>{throw new Error('timeout');}});await assert.rejects(timeout.razorpayCreate('test',order),e=>e instanceof ProviderError&&e.ambiguous);
});
test('legacy account events stay unmatched and captured callbacks fetch provider before reconciliation',async()=>{
 let matched=false,fail=false;const records=[];const s=createCheckoutService({env,providers:{razorpayPayment:async()=>{if(fail)throw new Error('offline');return {id:'pay_valid',order_id:'order_stored',amount:104900,currency:'INR',status:'captured',captured:true};}},rpc:async(action,p)=>{records.push({action,p});if(action==='receipt.lookup')return matched?{id:order.id,mode:'test',providerOrderId:'order_stored',totalPaise:104900}:null;return order;}});
 const receipt={mode:'test',accountId:'acc_legacy',eventId:'evt_legacy',orderId:'order_stored',paymentId:'pay_valid',eventType:'payment.captured'};
 await s.reconcileReceipt(receipt);assert.equal(records.at(-1).p.state,'unmatched');assert.equal(records.some(x=>x.action==='payment.settle'),false);
 matched=true;await s.reconcileReceipt(receipt);assert.equal(records.at(-1).p.state,'processed');assert.equal(records.some(x=>x.action==='payment.settle'),true);
 fail=true;await assert.rejects(s.reconcileReceipt(receipt),/offline/);assert.equal(records.at(-1).p.state,'failed');
});
test('backend product schema preserves actual packed shipping measurements',async()=>{
 const {productInputSchema}=await import('../functions/_shared/commerce.mjs');
 // Use the schema's variant shape through a complete minimal product fixture.
 const p={id:'p',slug:'p',name:'Protein',brand:'GR',category:'protein',status:'draft',summary:'Pack',description:'Pack details',featuredRank:0,createdAt:'2026-11-02T00:00:00.000Z',goals:[],dietaryTags:[],ingredients:[],media:[],variants:[{id:'v',sku:'V',label:'1kg',flavour:'Plain',size:'1kg',weightGrams:1000,shipping:{weightGrams:1200,lengthCm:15,widthCm:12,heightCm:20},price:{amountPaise:99900,currency:'INR'},mrp:{amountPaise:99900,currency:'INR'},stockAvailable:1,isDefault:true}],usage:'See pack',warnings:['Contains milk'],demoContent:false};
 assert.deepEqual(productInputSchema.parse(p).variants[0].shipping,p.variants[0].shipping);
});
test('merchant mode cannot use a live Razorpay key in test mode',async()=>{
 let called=false;const p=createProviders({env:{...env,RAZOR_PAY_TEST_API_KEY:'rzp_live_wrong'},fetchImpl:async()=>{called=true;return new Response('{}');}});await assert.rejects(p.razorpayCreate('test',order),/configured for this mode/);assert.equal(called,false);
});
test('delivery email comes only from verified identity; missing email and unverified COD fail before provider calls',async()=>{
 const calls=[];let providerCalls=0;const service=createCheckoutService({env,rpc:async(action,payload)=>{calls.push({action,payload});if(action==='context')return {address:{pincode:'411001'},parcel:{},...payload};return payload;},providers:{shiprocketPickups:async()=>{providerCalls++;return [{pickup_location:'GR Registered',pin_code:'382350',address:'B/4 Shantiniketan Business Hub Near Gangotri Circle Nikol'}];},shiprocketServiceability:async()=>[{courier_company_id:1,courier_name:'Courier',cod:1}]}});
 const p={addressId:'address',items:[{productId:'p',variantId:'v',quantity:1}],paymentMethod:'razorpay',customerEmail:'spoof@example.test',email:'spoof@example.test',emailVerified:true};
 await assert.rejects(service('alice','checkout.delivery',p,{uid:'alice',emailVerified:true}),/valid email address/);assert.equal(providerCalls,0);
 await assert.rejects(service('alice','checkout.delivery',{...p,paymentMethod:'cod'},{uid:'alice',email:'signed@example.test',emailVerified:false}),/Verify your email/);assert.equal(providerCalls,0);
 await service('alice','checkout.delivery',p,{uid:'alice',email:'signed@example.test',emailVerified:false});assert.equal(calls.find(x=>x.action==='context').payload.customerEmail,'signed@example.test');assert.equal(calls.find(x=>x.action==='context').payload.customerEmailVerified,false);
 await service('alice','checkout.delivery',{...p,paymentMethod:'cod'},{uid:'alice',email:'signed@example.test',emailVerified:true});assert.equal(calls.at(-2).payload.customerEmail,'signed@example.test');
});
test('Shiprocket sends immutable validated billing email and refuses invalid email before any POST',async()=>{
 const calls=[];const providers=createProviders({env,fetchImpl:async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify(url.endsWith('/auth/login')?{token:'fixture-token'}:{order_id:1,shipment_id:2}));}});
 const stored={id:order.id,created_at:'2026-11-02T00:00:00.000Z',address:{fullName:'Buyer',phone:'9876543210',line1:'123 Test Street',city:'Pune',state:'Maharashtra',pincode:'411001'},parcel:{weightGrams:1200,lengthCm:15,widthCm:12,heightCm:20},items:[],pickup_location:'Registered',payment_method:'cod',shipping_paise:0,cod_fee_paise:20000,subtotal_paise:100000};
 await assert.rejects(providers.shiprocketCreate(stored),/valid billing email/);assert.equal(calls.length,0);
 await providers.shiprocketCreate({...stored,address:{...stored.address,email:'immutable@example.test'}});const payload=JSON.parse(calls.at(-1).options.body);assert.equal(payload.billing_email,'immutable@example.test');
});
test('refund mapping ignores supplied order ID, uses receipt mode and exact fetched payment, and retries unconfirmed refunds',async()=>{
 const calls=[];let payment={id:'pay_refund',order_id:'order_actual',amount:104900,currency:'INR',status:'refunded',captured:true,amount_refunded:104900,refund_status:'full'};let matched=true;
 const service=createCheckoutService({env,providers:{razorpayPayment:async(mode,id)=>{calls.push({fetch:{mode,id}});return payment;}},rpc:async(action,payload)=>{calls.push({action,payload});if(action==='receipt.lookup')return matched?{id:order.id,mode:'live',providerOrderId:'order_actual',totalPaise:104900}:null;return order;}});
 const receipt={mode:'live',accountId:'acc_refund',eventId:'evt_refund',eventType:'refund.processed',orderId:'order_forged',paymentId:'pay_refund'};
 await service.reconcileReceipt(receipt);assert.deepEqual(calls[0],{fetch:{mode:'live',id:'pay_refund'}});assert.equal(calls.find(x=>x.action==='receipt.lookup').payload.providerOrderId,'order_actual');assert.equal(calls.find(x=>x.action==='payment.settle').payload.mode,'live');assert.equal(calls.at(-1).payload.state,'processed');
 matched=false;calls.length=0;await service.reconcileReceipt(receipt);assert.equal(calls.some(x=>x.action==='payment.settle'),false);assert.equal(calls.at(-1).payload.state,'unmatched');
 matched=true;calls.length=0;payment={...payment,id:'pay_wrong'};await assert.rejects(service.reconcileReceipt(receipt));assert.equal(calls.some(x=>x.action==='payment.settle'),false);assert.equal(calls.at(-1).payload.state,'failed');
 payment={...payment,id:'pay_refund',amount_refunded:0,refund_status:null,status:'captured'};calls.length=0;await assert.rejects(service.reconcileReceipt(receipt),/Refund is not confirmed/);assert.equal(calls.at(-1).payload.state,'failed');
});
test('read-only integration diagnostics gate staff before calls and return only connection/pickup booleans',async()=>{
 let staff=false;const calls=[];const service=createCheckoutService({env,rpc:async action=>action==='role.get'?{isAdmin:staff}:{},providers:{razorpayCheck:async mode=>{calls.push(mode);if(mode==='live')throw new Error('sensitive provider detail');return true;},shiprocketPickups:async()=>{calls.push('shiprocket');return [{pickup_location:'GR Registered',pin_code:'382350',address:'B/4 Shantiniketan Business Hub Near Gangotri Circle Nikol'}];}}});
 await assert.rejects(service('buyer','integration.check',{}),/Staff access required/);assert.deepEqual(calls,[]);staff=true;const result=await service('owner','integration.check',{});assert.deepEqual(result,{mode:'test',razorpay:{testConnected:true,liveConnected:false},shiprocket:{connected:true,pickupMatched:true}});assert.equal(JSON.stringify(result).includes('sensitive'),false);
 const unmatched=createCheckoutService({env,rpc:async()=>({isAdmin:true}),providers:{razorpayCheck:async()=>false,shiprocketPickups:async()=>[{pickup_location:'Elsewhere',pin_code:'110001',address:'Unknown'}]}});assert.deepEqual((await unmatched('owner','integration.check',{})).shiprocket,{connected:true,pickupMatched:false});
 const offline=createCheckoutService({env,rpc:async()=>({isAdmin:true}),providers:{razorpayCheck:async()=>{throw new Error('offline');},shiprocketPickups:async()=>{throw new Error('secret');}}});assert.deepEqual(await offline('owner','integration.check',{}),{mode:'test',razorpay:{testConnected:false,liveConnected:false},shiprocket:{connected:false,pickupMatched:false}});
});
test('Razorpay diagnostics performs GET count=1 and discards provider content',async()=>{
 let call;const providers=createProviders({env,fetchImpl:async(url,options)=>{call={url,options};return new Response(JSON.stringify({items:[{email:'private@example.test',amount:999}],count:1}));}});assert.equal(await providers.razorpayCheck('test'),true);assert.equal(call.url,'https://api.razorpay.com/v1/orders?count=1');assert.equal(call.options.method,'GET');assert.equal(call.options.body,undefined);
});
test('registered short pickup address matches exact merchant phone with strong building and pincode checks',()=>{
 const warehouse={pickup_location:'warehouse',pin_code:'382350',address:'Ground Floor B/4 Shantiniketan Business Hub',city:'Ahmedabad',state:'Gujarat',country:'India',phone:'7490020905',status:2};
 assert.equal(selectPickup([warehouse]).pickup_location,'warehouse');
 assert.equal(selectPickup([{...warehouse,phone:undefined,mobile:7490020905}]).pickup_location,'warehouse');
 assert.equal(selectPickup([{...warehouse,phone:'+91 7490020905'}]).pickup_location,'warehouse');
 assert.throws(()=>selectPickup([{...warehouse,phone:'9876543210'}]),/pickup location/);assert.throws(()=>selectPickup([{...warehouse,phone:undefined}]),/pickup location/);
 assert.throws(()=>selectPickup([{...warehouse,pin_code:'110001'}]),/pickup location/);assert.throws(()=>selectPickup([{...warehouse,address:'Ground Floor B/5 Shantiniketan Business Hub'}]),/pickup location/);assert.throws(()=>selectPickup([{...warehouse,address:'Ground Floor B/40 Shantiniketan Business Hub'}]),/pickup location/);assert.throws(()=>selectPickup([{...warehouse,address:'Ground Floor B/4 Another Business Hub'}]),/pickup location/);
});
