import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCheckoutService} from '../functions/_shared/checkout.mjs';
import {createCommerceHandler} from '../functions/_shared/handler.mjs';
import {createProviders} from '../functions/_shared/providers.mjs';
const coupon={code:'  SAVE10  ',type:'percentage',value:10.25,minSpendPaise:10000,maxDiscountPaise:20000,startsAt:null,expiresAt:'2099-01-01T00:00:00Z',usageLimit:10,enabled:true};
const env={STORE_PAYMENT_MODE:'test',RAZOR_PAY_TEST_API_KEY:'rzp_test_key',RAZOR_PAY_TEST_SECRET_KEY:'secret'};
test('coupon Edge actions require staff before any mutation and normalize validated settings',async()=>{
 const calls=[];let admin=false;
 const service=createCheckoutService({env,rpc:async(action,payload,uid)=>{calls.push({action,payload,uid});return action==='role.get'?{isAdmin:admin}:payload;},providers:{}});
 await assert.rejects(service('buyer','coupon.save',coupon),/Staff access required/);assert.equal(calls.length,1);
 admin=true;const c=await service('owner','coupon.save',{...coupon,usedCount:999,uid:'forged'});assert.equal(c.code,'SAVE10');assert.equal(c.usedCount,undefined);assert.equal(c.uid,undefined);assert.equal(calls.at(-1).uid,'owner');
 await service('owner','coupon.save',{...coupon,type:'fixed',value:1.1,maxDiscountPaise:null});
 for(const invalid of [{value:1.001},{value:100.01},{expiresAt:'bad'},{minSpendPaise:1.5},{usageLimit:0},{type:'fixed',maxDiscountPaise:100}])await assert.rejects(service('owner','coupon.save',{...coupon,...invalid}));
 assert.deepEqual(await service('owner','coupon.adminList',{search:'save',isAdmin:true}),{search:'save'});
});
test('delivery sends only normalized coupon code with server-owned identity and forwards safe coupon failures',async()=>{
 let received;
 const service=createCheckoutService({env,rpc:async(action,payload)=>{
  if(action==='context'){received=payload;throw new Error('Coupon has expired');}
 },providers:{}});
 const handler=createCommerceHandler({db:{rpc:async()=>({data:true})},storage:{},allowedOrigins:[],verify:async()=>({uid:'alice',email:'alice@example.test',emailVerified:true}),checkout:service});
 const response=await handler(new Request('https://store.test/commerce',{method:'POST',headers:{authorization:'Bearer signed'},body:JSON.stringify({action:'checkout.delivery',payload:{addressId:'a',items:[{productId:'p',variantId:'v',quantity:1}],paymentMethod:'razorpay',couponCode:' save10 ',discountPaise:99999,customerEmail:'spoof@example.test'}})}));
 assert.equal(response.status,400);assert.deepEqual(await response.json(),{error:'Coupon has expired'});assert.equal(received.couponCode,'SAVE10');assert.equal(received.discountPaise,undefined);assert.equal(received.customerEmail,'alice@example.test');assert.equal(received.mode,'test');
});
test('Shiprocket coupon invoice uses exact immutable discount and Razorpay charges the final payable amount',async()=>{
 const sent=[];const providers=createProviders({env:{...env,SHIPROCKET_API_EMAIL:'merchant@example.test',SHIPROCKET_API_KEY:'secret'},fetchImpl:async(url,options)=>{
  const body=options.body?JSON.parse(options.body):{};sent.push({url,body});
  if(url.endsWith('/auth/login'))return Response.json({token:'token'});
  if(url.endsWith('/orders'))return Response.json({id:'order_discount',amount:body.amount,currency:'INR',receipt:body.receipt});
  return Response.json({shipment_id:123,order_id:456});
 }});
 const order={id:'discount-order',totalPaise:112344,total_paise:112344,subtotal_paise:100000,discount_paise:12656,shipping_paise:5000,cod_fee_paise:20000,payment_method:'cod',created_at:'2026-11-05T00:00:00Z',pickup_location:'GR',address:{fullName:'Buyer Person',email:'buyer@example.test',phone:'9876543210',line1:'Street',city:'Pune',pincode:'411001',state:'Maharashtra'},parcel:{weightGrams:1200,lengthCm:10,widthCm:10,heightCm:10},items:[{productName:'Protein',sku:'SKU',quantity:1,unitPricePaise:100000}]};
 await providers.shiprocketCreate(order);const invoice=sent.at(-1).body;assert.equal(invoice.sub_total,1000);assert.equal(invoice.total_discount,126.56);assert.equal(invoice.shipping_charges,50);assert.equal(invoice.transaction_charges,200);assert.equal(invoice.payment_method,'COD');
 await providers.razorpayCreate('test',order);assert.equal(sent.at(-1).body.amount,112344);
 await assert.rejects(providers.shiprocketCreate({...order,total_paise:112345}),/invoice/);
});
test('order status retains the immutable coupon snapshot in its confirmation summary',async()=>{
 const order={id:'coupon-order',status:'cod_confirmed',paymentMethod:'cod',mode:'live',totalPaise:112655,couponCode:'SAVE10',discountPaise:12345,discountedSubtotalPaise:87655};
 const service=createCheckoutService({env,rpc:async()=>({order}),providers:{}});
 const result=await service('alice','order.status',{id:order.id});assert.equal(result.couponCode,'SAVE10');assert.equal(result.discountPaise,12345);assert.equal(result.discountedSubtotalPaise,87655);
});
