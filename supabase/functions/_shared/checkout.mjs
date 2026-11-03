import {z} from 'zod';
import {checkoutItemsSchema} from './commerce.mjs';
import {createProviders,ProviderError} from './providers.mjs';
import {isValidCustomerEmail} from './email.mjs';
const reference=z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
const paymentReference=z.string().regex(/^pay_[a-zA-Z0-9]{1,100}$/);
export const checkoutActions=new Set(['checkout.delivery','checkout.create','checkout.verify','order.status','shipment.create','shipment.sync','integration.status','integration.check']);
export class CheckoutError extends Error {constructor(message,status=400){super(message);this.status=status;}}
export async function paymentSignatureValid(orderId,paymentId,signature,secret){
 if(!secret||!/^[a-fA-F0-9]{64}$/.test(signature))return false;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 return crypto.subtle.verify('HMAC',key,new Uint8Array(signature.match(/../g).map(v=>Number.parseInt(v,16))),new TextEncoder().encode(`${orderId}|${paymentId}`));
}
export function selectPickup(locations,explicitName){
 const normalize=v=>String(v??'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const merchantPhone=value=>{
  const digits=String(value??'').replace(/\D/g,'');
  return (digits.length===12&&digits.startsWith('91')?digits.slice(2):digits)==='7490020905';
 };
 const active=locations.filter(x=>x.pickup_location&&![0,'0',false].includes(x.is_active)&&![0,'0',false].includes(x.status));
 const matches=active.filter(x=>{
  if(explicitName)return x.pickup_location===explicitName;
  const rawAddress=[x.address,x.address_2,x.address2].join(' ');
  const address=normalize(rawAddress);
  const unit=/(?:^|[^a-z0-9])b[\s/-]*4(?:$|[^a-z0-9])/i.test(rawAddress);
  const locality=/nikol|gangotri/.test(normalize([x.address,x.address_2,x.address2,x.city].join(' ')));
  const phone=merchantPhone(x.phone)||merchantPhone(x.mobile);
  return String(x.pin_code??x.pincode)==='382350'&&unit&&address.includes('shantiniketanbusinesshub')&&(locality||phone);
 });
 if(matches.length!==1)throw new CheckoutError('The GR Nutritions pickup location is not uniquely registered in Shiprocket. Please contact the store.',503);
 return matches[0];
}
export function shipmentTracking(response,shipmentId){
 const data=Array.isArray(response)?response[0]?.tracking_data:response?.tracking_data;
 if(!data||typeof data!=='object')throw new ProviderError('Tracking is temporarily unavailable');
 const record=data.shipment_track?.[0]??{};const status=Number(data.shipment_status);
 const result={shipmentId,status:String(record.current_status??data.current_status??'Awaiting carrier update').slice(0,160)};
 if(record.awb_code)result.awb=String(record.awb_code).slice(0,100);
 if(record.courier_name)result.courierName=String(record.courier_name).slice(0,150);
 const url=data.track_url;if(typeof url==='string'){try{const u=new URL(url);if(u.protocol==='https:')result.url=u.href;}catch{/* Omit invalid provider URL. */}}
 // AWB allocation / pickup scheduling alone is never proof of dispatch.
 if(status===7)result.fulfillmentStatus='delivered';
 else if([6,17,18,38,42,49,50,51,54,57].includes(status))result.fulfillmentStatus='shipped';
 return result;
}
const summary=o=>({id:o.id,status:o.status,paymentMethod:o.paymentMethod,mode:o.mode,totalPaise:o.totalPaise,...(o.tracking?{tracking:o.tracking}:{})});
function paymentMatches(payment,order,providerOrderId,paymentId){return payment&&payment.id===paymentId&&payment.order_id===providerOrderId&&payment.amount===order.totalPaise&&payment.currency==='INR';}
const paymentHasRefund=payment=>Number.isSafeInteger(payment?.amount_refunded)&&payment.amount_refunded>0||['partial','full'].includes(payment?.refund_status);
export function createCheckoutService({rpc,env,providers=createProviders({env})}) {
 const mode=env.STORE_PAYMENT_MODE??'test';
 function modeCredentials(m){const stem=m==='live'?'LIVE':'TEST';return {keyId:env[`RAZOR_PAY_${stem}_API_KEY`],secret:env[`RAZOR_PAY_${stem}_SECRET_KEY`]};}
 async function staff(uid){const role=await rpc('role.get',{},uid);if(!role?.isAdmin)throw new CheckoutError('Staff access required',403);}
 async function reconcile(row){
  const {order,providerOrderId}=row;if(order.paymentMethod!=='razorpay'||!providerOrderId||!['payment_pending','payment_expired','payment_review'].includes(order.status))return order;
  const payments=await providers.razorpayPayments(order.mode,providerOrderId);
  for(const pay of payments){if(paymentMatches(pay,order,providerOrderId,pay.id)&&(paymentHasRefund(pay)||pay.status==='captured'&&pay.captured===true))return rpc('payment.settle',{orderId:order.id,mode:order.mode,payment:pay},'');}
  return order;
 }
 const service=async(uid,action,input={},identity)=>{
  if(!['test','live'].includes(mode))throw new CheckoutError('The store payment mode is not configured correctly.',503);
  if(action==='integration.status'){
   await staff(uid);return {mode,razorpay:{testConfigured:Boolean(modeCredentials('test').keyId&&modeCredentials('test').secret),liveConfigured:Boolean(modeCredentials('live').keyId&&modeCredentials('live').secret)},shiprocket:{configured:Boolean(env.SHIPROCKET_API_EMAIL&&env.SHIPROCKET_API_KEY)}};
  }
  if(action==='integration.check'){
   await staff(uid);
   const [test,live,shipping]=await Promise.allSettled([providers.razorpayCheck('test'),providers.razorpayCheck('live'),providers.shiprocketPickups()]);
   let pickupMatched=false;
   if(shipping.status==='fulfilled'){try{selectPickup(shipping.value,env.SHIPROCKET_PICKUP_LOCATION);pickupMatched=true;}catch{/* Return readiness booleans only. */}}
   return {mode,razorpay:{testConnected:test.status==='fulfilled'&&test.value===true,liveConnected:live.status==='fulfilled'&&live.value===true},shiprocket:{connected:shipping.status==='fulfilled',pickupMatched}};
  }
  if(action==='checkout.delivery'){
   const payload=z.object({addressId:reference,items:checkoutItemsSchema,paymentMethod:z.enum(['razorpay','cod'])}).parse(input);
   if(identity?.uid!==uid||!isValidCustomerEmail(identity.email))throw new CheckoutError('Your signed-in account needs a valid email address to check delivery. Please sign in with an email account.');
   if(payload.paymentMethod==='cod'&&identity.emailVerified!==true)throw new CheckoutError('Verify your email address before choosing cash on delivery.');
   if(payload.paymentMethod==='razorpay'&&(!modeCredentials(mode).keyId||!modeCredentials(mode).secret))throw new CheckoutError('Payments are not configured for this mode',503);
   const context=await rpc('context',{...payload,mode,customerEmail:identity.email,customerEmailVerified:identity.emailVerified===true},uid);
   const pickup=selectPickup(await providers.shiprocketPickups(),env.SHIPROCKET_PICKUP_LOCATION);
   const couriers=await providers.shiprocketServiceability(context);
   const eligible=couriers.filter(c=>Number.isSafeInteger(c.courier_company_id)&&c.courier_company_id>0&&typeof c.courier_name==='string'&&c.courier_name.length>0&&(payload.paymentMethod!=='cod'||c.cod===1||c.cod===true||c.cod==='1')).sort((a,b)=>Number(a.rate??Infinity)-Number(b.rate??Infinity));
   const courier=eligible[0];if(!courier)throw new CheckoutError('Delivery is unavailable at this address. Please try another address.');
   return rpc('quote.store',{context,pickupLocation:pickup.pickup_location,delivery:{courierId:courier.courier_company_id,courierName:courier.courier_name.slice(0,150),estimatedDays:String(courier.estimated_delivery_days??courier.etd??'Estimate unavailable').slice(0,100)}},uid);
  }
  if(action==='checkout.create'){
   const payload=z.object({quoteId:reference,requestKey:z.string().regex(/^[a-zA-Z0-9_-]{8,100}$/)}).parse(input);
   const {order,providerOrderId,performCreate}=await rpc('order.begin',{...payload,mode},uid);
   const result={id:order.id,status:order.status,paymentMethod:order.paymentMethod,mode:order.mode,amountPaise:order.totalPaise,currency:'INR'};
   if(order.paymentMethod==='cod')return result;
   let attached=providerOrderId;
   if(performCreate){
    let created;
    try{created=await providers.razorpayCreate(order.mode,order);}
    catch(error){const ambiguous=!(error instanceof ProviderError)||error.ambiguous;await rpc('order.createFailed',{orderId:order.id,ambiguous},'');throw new CheckoutError(ambiguous?'Payment confirmation is pending. Check your orders before trying another payment.':'The payment could not be started. Check delivery again before retrying.',503);}
    // A database attach failure must not mark creation failed or repeat provider POST.
    await rpc('order.attach',{orderId:order.id,providerOrderId:created.id,mode:order.mode,amountPaise:created.amount,currency:created.currency},'');attached=created.id;
   }
   if(attached&&order.status==='payment_pending'){result.razorpayOrderId=attached;result.keyId=modeCredentials(order.mode).keyId;}
   return result;
  }
  if(action==='checkout.verify'){
   const p=z.object({orderId:reference,razorpay_payment_id:paymentReference,razorpay_signature:z.string().regex(/^[a-fA-F0-9]{64}$/)}).parse(input);
   const row=await rpc('order.provider',{orderId:p.orderId},uid);const {order,providerOrderId}=row;
   if(order.paymentMethod!=='razorpay'||!providerOrderId||!await paymentSignatureValid(providerOrderId,p.razorpay_payment_id,p.razorpay_signature,modeCredentials(order.mode).secret))throw new CheckoutError('Payment signature is invalid');
   const payment=await providers.razorpayPayment(order.mode,p.razorpay_payment_id);
   if(!paymentMatches(payment,order,providerOrderId,p.razorpay_payment_id))throw new CheckoutError('Payment does not match this order');
   // Capture is intentionally provider-managed; authorized is never treated as paid.
   if(!paymentHasRefund(payment)&&(payment.status!=='captured'||payment.captured!==true))return summary(order);
   return summary(await rpc('payment.settle',{orderId:order.id,mode:order.mode,payment},''));
  }
  if(action==='order.status'){
   const p=z.object({id:reference}).parse(input);const row=await rpc('order.provider',{orderId:p.id},uid);return summary(await reconcile(row));
  }
  if(action==='shipment.create'){
   const p=z.object({orderId:reference}).parse(input);await staff(uid);
   const row=await rpc('shipment.begin',p,uid);
   if(!row.performCreate&&row.order.shipment_state!=='created')throw new CheckoutError('Shipment confirmation is pending. Review this order in Shiprocket before retrying.',503);
   if(row.performCreate){
    if(!isValidCustomerEmail(row.order.address?.email)){
     await rpc('shipment.failed',{orderId:p.orderId,ambiguous:false},'');
     throw new CheckoutError('This order needs a valid billing email before creating a shipment.');
    }
    // Revalidate that the immutable pickup code still exists before dispatch creation.
    try{selectPickup(await providers.shiprocketPickups(),row.order.pickup_location);}
    catch(error){await rpc('shipment.failed',{orderId:p.orderId,ambiguous:false},'');throw error;}
    let shipment;
    try{shipment=await providers.shiprocketCreate(row.order);if(!Number.isSafeInteger(shipment.shipment_id)||shipment.shipment_id<1||!Number.isSafeInteger(shipment.order_id)||shipment.order_id<1)throw new ProviderError('Shipment confirmation is pending');}
    catch(error){await rpc('shipment.failed',{orderId:p.orderId,ambiguous:!(error instanceof ProviderError)||error.ambiguous},'');throw new CheckoutError('Shipment confirmation is pending. Review this order in Shiprocket before retrying.',503);}
    await rpc('shipment.attach',{orderId:p.orderId,shipmentId:shipment.shipment_id,shiprocketOrderId:shipment.order_id},'');
   }
   return summary(await rpc('order.get',{orderId:p.orderId},uid));
  }
  if(action==='shipment.sync'){
   const p=z.object({orderId:reference}).parse(input);const row=await rpc('shipment.get',p,uid);
   if(!row.shipmentId)return summary(row.order);
   const tracking=shipmentTracking(await providers.shiprocketTrack(row.shipmentId),row.shipmentId);
   return summary(await rpc('shipment.sync',{orderId:p.orderId,shipmentId:row.shipmentId,tracking},''));
  }
  throw new CheckoutError('Unknown checkout action');
 };
 service.reconcileReceipt=async receipt=>{
  const mark=state=>rpc('receipt.mark',{mode:receipt.mode,accountId:receipt.accountId,eventId:receipt.eventId,state},'');
  try{
   if(receipt.eventType==='refund.processed'){
    // Standard refund events have only payment_id. Resolve the provider payment
    // with the receipt's mode, then match its exact server-created local order.
    const payment=await providers.razorpayPayment(receipt.mode,receipt.paymentId);
    if(payment?.id!==receipt.paymentId||typeof payment.order_id!=='string')throw new ProviderError('Refund payment could not be confirmed');
    const row=await rpc('receipt.lookup',{mode:receipt.mode,providerOrderId:payment.order_id},'');
    if(!row){await mark('unmatched');return;}
    if(!paymentMatches(payment,row,row.providerOrderId,receipt.paymentId))throw new ProviderError('Refund payment does not match order');
    if(!paymentHasRefund(payment))throw new ProviderError('Refund is not confirmed');
    await rpc('payment.settle',{orderId:row.id,mode:row.mode,payment},'');
    await mark('processed');return;
   }
   // Old WordPress/account traffic has no local PSP mapping. Never create a sale.
   if(!receipt.orderId){await mark('unmatched');return;}
   const row=await rpc('receipt.lookup',{mode:receipt.mode,providerOrderId:receipt.orderId},'');
   if(!row){await mark('unmatched');return;}
   if(receipt.eventType==='order.paid'){
    const payments=await providers.razorpayPayments(row.mode,row.providerOrderId);
    let captured=false;
    for(const payment of payments){if(paymentMatches(payment,row,row.providerOrderId,payment.id)&&(paymentHasRefund(payment)||payment.status==='captured'&&payment.captured===true)){await rpc('payment.settle',{orderId:row.id,mode:row.mode,payment},'');captured=true;break;}}
    if(!captured)throw new ProviderError('Payment capture not confirmed');
   }else if(receipt.eventType==='payment.captured'){
    const payment=await providers.razorpayPayment(row.mode,receipt.paymentId);
    if(!paymentMatches(payment,row,row.providerOrderId,receipt.paymentId)||!paymentHasRefund(payment)&&(payment.status!=='captured'||payment.captured!==true))throw new ProviderError('Payment capture not confirmed');
    await rpc('payment.settle',{orderId:row.id,mode:row.mode,payment},'');
   }
   // A failed attempt does not cancel a potentially retryable order.
   await mark('processed');
  }catch(error){try{await mark('failed');}catch{/* A non-2xx response asks the provider to retry durable receipts. */}throw error;}
 };
 return service;
}
