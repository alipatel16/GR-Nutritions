// Provider transport is server-only. Never log request bodies, credentials or responses.
import {isValidCustomerEmail} from './email.mjs';
export class ProviderError extends Error {
  constructor(message='Provider is temporarily unavailable',ambiguous=true){super(message);this.name='ProviderError';this.ambiguous=ambiguous;}
}
const id=(value,pattern)=>typeof value==='string'&&pattern.test(value);
export function createProviders({env,fetchImpl=fetch,timeoutMs=12000}) {
 let token='',tokenExpires=0;
 async function request(url,{method='GET',headers={},body}={}) {
  let response;
  try{response=await fetchImpl(url,{method,headers:{'Content-Type':'application/json',...headers},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(timeoutMs),redirect:'error'});}
  catch{throw new ProviderError();}
  if(!response.ok) {
   // Only definite input/auth rejection permits automatic reservation release.
   throw new ProviderError('Provider rejected this request',![400,401,403,404,422].includes(response.status));
  }
  try {
   const reader=response.body?.getReader();if(!reader)throw new Error();let length=0;const chunks=[];
   while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>2*1024*1024){await reader.cancel();throw new Error();}chunks.push(value);}
   const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
   return JSON.parse(new TextDecoder().decode(bytes));
  }catch{throw new ProviderError('Provider returned an invalid response');}
 }
 function credentials(mode){if(!['test','live'].includes(mode))throw new Error('Invalid merchant mode');const stem=mode==='live'?'LIVE':'TEST';const key=env[`RAZOR_PAY_${stem}_API_KEY`],secret=env[`RAZOR_PAY_${stem}_SECRET_KEY`];if(!key||!secret||!key.startsWith(`rzp_${mode}_`))throw new ProviderError('Payments are not configured for this mode',false);return {Authorization:`Basic ${btoa(`${key}:${secret}`)}`};}
 async function shiprocket(path,options={}) {
  if(!env.SHIPROCKET_API_EMAIL||!env.SHIPROCKET_API_KEY)throw new Error('Delivery is not configured. Please contact the store.');
  if(!token||Date.now()>=tokenExpires){
   const login=await request('https://apiv2.shiprocket.in/v1/external/auth/login',{method:'POST',body:{email:env.SHIPROCKET_API_EMAIL,password:env.SHIPROCKET_API_KEY}});
   if(typeof login.token!=='string'||!login.token)throw new ProviderError('Delivery authentication failed',false);token=login.token;tokenExpires=Date.now()+60*60*1000;
  }
  try{return await request('https://apiv2.shiprocket.in/v1/external/'+path,{...options,headers:{Authorization:`Bearer ${token}`}});}catch(error){if(error instanceof ProviderError&&!error.ambiguous){token='';tokenExpires=0;}throw error;}
 }
 return {
  async razorpayCheck(mode){
   // Authentication/read permission check only. Never return fetched order/customer data.
   await request('https://api.razorpay.com/v1/orders?count=1',{headers:credentials(mode)});
   return true;
  },
  async razorpayCreate(mode,order){
   const r=await request('https://api.razorpay.com/v1/orders',{method:'POST',headers:credentials(mode),body:{amount:order.totalPaise,currency:'INR',receipt:order.id,partial_payment:false,notes:{source:'gr_store_v2',mode}}});
   if(!id(r.id,/^order_[a-zA-Z0-9]+$/)||r.amount!==order.totalPaise||r.currency!=='INR'||r.receipt!==order.id)throw new ProviderError('Provider order could not be confirmed');return r;
  },
  async razorpayPayment(mode,paymentId){if(!id(paymentId,/^pay_[a-zA-Z0-9]+$/))throw new Error('Invalid payment reference');return request(`https://api.razorpay.com/v1/payments/${paymentId}`,{headers:credentials(mode)});},
  async razorpayPayments(mode,orderId){if(!id(orderId,/^order_[a-zA-Z0-9]+$/))throw new Error('Invalid order reference');const r=await request(`https://api.razorpay.com/v1/orders/${orderId}/payments`,{headers:credentials(mode)});if(!Array.isArray(r.items))throw new ProviderError();return r.items;},
  async shiprocketPickups(){const r=await shiprocket('settings/company/pickup?isActive=1&is_order_creation=true');const rows=r.data?.shipping_address;if(!Array.isArray(rows))throw new ProviderError('Pickup locations could not be checked');return rows;},
  async shiprocketServiceability(context){
   const p=context.parcel;const query=new URLSearchParams({pickup_postcode:'382350',delivery_postcode:context.address.pincode,cod:context.paymentMethod==='cod'?'1':'0',weight:String(p.weightGrams/1000),declared_value:String(context.totalPaise/100)});
   const r=await shiprocket(`courier/serviceability/?${query}`);if(!Array.isArray(r.data?.available_courier_companies))throw new ProviderError('Delivery availability could not be checked');return r.data.available_courier_companies;
  },
  async shiprocketCreate(order){
   const a=order.address,p=order.parcel;
   if(!isValidCustomerEmail(a?.email))throw new ProviderError('This order needs a valid billing email before creating a shipment',false);
   const discount=order.discount_paise??0;
   if(discount!==0&&(!Number.isSafeInteger(discount)||discount<0||discount>order.subtotal_paise-100||order.subtotal_paise-discount+order.shipping_paise+order.cod_fee_paise!==order.total_paise))throw new ProviderError('Order invoice totals do not match',false);
   // Staff measure the packed parcel. Other values come from the saved order.
   return shiprocket('orders/create/adhoc',{method:'POST',body:{order_id:`gr-${order.id}`,order_date:new Date(order.created_at).toISOString().replace('T',' ').slice(0,16),pickup_location:order.pickup_location,
    billing_customer_name:a.fullName,billing_last_name:'',billing_address:a.line1,billing_address_2:a.line2??'',billing_city:a.city,billing_pincode:a.pincode,billing_state:a.state,billing_country:'India',billing_email:a.email,billing_phone:a.phone,shipping_is_billing:true,
    order_items:order.items.map(i=>({name:i.productName,sku:i.sku,units:i.quantity,selling_price:i.unitPricePaise/100})),payment_method:order.payment_method==='cod'?'COD':'Prepaid',
    shipping_charges:order.shipping_paise/100,transaction_charges:order.cod_fee_paise/100,sub_total:order.subtotal_paise/100,total_discount:discount/100,length:p.lengthCm,breadth:p.widthCm,height:p.heightCm,weight:p.weightGrams/1000}});
  },
  async shiprocketTrack(shipmentId){if(!Number.isSafeInteger(shipmentId)||shipmentId<1)throw new Error('Invalid shipment');return shiprocket(`courier/track/shipment/${shipmentId}`);},
 };
}
