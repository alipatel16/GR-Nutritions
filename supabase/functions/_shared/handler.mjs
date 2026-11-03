import { z } from 'zod';
import { verifyFirebaseIdentity } from './firebase-token.mjs';
import { productInputSchema, checkoutItemsSchema } from './commerce.mjs';
import { addressSchema } from './address.mjs';
import { checkoutActions, CheckoutError } from './checkout.mjs';
import { ProviderError } from './providers.mjs';

const id = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
const pathSchema = z.string().regex(/^[a-zA-Z0-9_-]{1,100}\/[a-f0-9-]{36}\.(jpg|png|webp)$/);
const customerActions = new Set(['role.get','addresses.list','address.save','address.remove','address.default','orders.list','checkout.quote']);
const adminActions = new Set(['products.list','product.save','orders.adminList','order.advance']);
const mediaActions = new Set(['media.upload','media.complete']);

// Dependencies are server-owned. Tests inject a verifier and storage/RPC adapter.
export function createCommerceHandler({ db, storage, allowedOrigins, checkout, verify = verifyFirebaseIdentity }) {
  return async (request) => {
    const origin = request.headers.get('origin');
    const headers = { 'Content-Type':'application/json', 'Cache-Control':'no-store', 'Vary':'Origin',
      'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info', 'Access-Control-Allow-Methods':'POST, OPTIONS' };
    if (origin && !allowedOrigins.includes(origin)) return new Response(JSON.stringify({ error:'Origin is not allowed' }), {status:403, headers});
    if (origin) headers['Access-Control-Allow-Origin'] = origin;
    const respond = (body, status=200) => new Response(JSON.stringify(body), { status, headers });
    if (request.method==='OPTIONS') return new Response(null,{status:204,headers});
    if (request.method!=='POST') return respond({error:'Use POST'},405);
    try {
      const raw = await request.text();
      if (raw.length>150000) return respond({error:'Request too large'},413);
      const { action, payload={} } = z.object({action:z.string().max(40),payload:z.record(z.string(),z.unknown()).optional()}).parse(JSON.parse(raw));
      const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1];
      let uid = '';let identity;
      if (token) {
        try {
          const verified=await verify(token);
          // UID strings are supported for existing offline adapters; production uses signed claims.
          identity=typeof verified==='string'?{uid:verified,email:undefined,emailVerified:false}:verified;
          uid=identity?.uid;
          if(typeof uid!=='string'||!uid||uid.length>128)throw new Error('Invalid identity');
        } catch { return respond({error:'Please sign in again'},401); }
      }
      if (action!=='media.get' && !uid) return respond({error:'Sign in to continue'},401);
      // The database receives only the verified UID. Body fields can never change the caller.
      if (uid && !(await rpc('consume_store_request',{p_uid:uid}))) return respond({error:'Too many requests. Please try again shortly.'},429);
      if (checkoutActions.has(action)) {
        if (!checkout) throw new Error('Checkout is not configured');
        if (!(await rpc('consume_checkout_request',{p_uid:uid}))) return respond({error:'Too many checkout requests. Please try again shortly.'},429);
        return respond({data:await checkout(uid,action,payload,identity)});
      }
      if (action==='media.get') {
        const paths = z.array(pathSchema).max(60).parse(payload.paths);
        const result = {};
        for (const path of new Set(paths)) {
          const permitted = await rpc('customer_action',{p_uid:uid,p_action:'media.allowed',p_payload:{path}});
          if (!permitted) return respond({error:'Image is unavailable'},404);
          const { data, error } = await storage.createSignedUrl(path,900);
          if (error) throw error;
          result[path]=data.signedUrl;
        }
        return respond({data:result});
      }
      if (mediaActions.has(action)) {
        const role=await rpc('customer_action',{p_uid:uid,p_action:'role.get',p_payload:{}});
        if (!role.isAdmin) return respond({error:'Staff access required'},403);
        const productId=id.parse(payload.productId);
        if (action==='media.upload') {
          const mime=z.enum(['image/jpeg','image/png','image/webp']).parse(payload.mime);
          const ext={ 'image/jpeg':'jpg','image/png':'png','image/webp':'webp' }[mime];
          const path=`${productId}/${crypto.randomUUID()}.${ext}`;
          const { data,error }=await storage.createSignedUploadUrl(path,{upsert:false});
          if (error) throw error;
          return respond({data:{path,token:data.token}});
        }
        const path=pathSchema.parse(payload.path);
        if (!path.startsWith(productId+'/')) return respond({error:'Image does not belong to this product'},400);
        const { data,error }=await storage.info(path);
        if (error || !data) return respond({error:'Uploaded image was not found'},400);
        const mime=z.enum(['image/jpeg','image/png','image/webp']).parse(data.contentType);
        const size=z.number().int().positive().max(6291456).parse(data.size);
        await rpc('admin_action',{p_uid:uid,p_action:'media.register',p_payload:{path,productId,mime,size}});
        const signed=await storage.createSignedUrl(path,900);
        if (signed.error) throw signed.error;
        return respond({data:{path,uri:signed.data.signedUrl}});
      }
      let clean = {};
      if (action==='address.save') clean={id:payload.id===undefined?undefined:id.parse(payload.id),address:addressSchema.parse(payload.address)};
      if (action==='address.remove'||action==='address.default') clean={id:id.parse(payload.id)};
      if (action==='checkout.quote') clean={addressId:id.parse(payload.addressId),items:checkoutItemsSchema.parse(payload.items)};
      if (action==='product.save') clean=productInputSchema.parse(payload);
      if (action==='order.advance') clean={id:id.parse(payload.id),status:z.enum(['processing','shipped','delivered']).parse(payload.status)};
      if (!customerActions.has(action)&&!adminActions.has(action)) return respond({error:'Unknown action'},400);
      const isAdmin=adminActions.has(action);
      const result=await rpc(isAdmin?'admin_action':'customer_action',{
        p_uid:uid,p_action:action==='orders.adminList'?'orders.list':action,p_payload:clean,
      });
      return respond({data:result});
    } catch (error) {
      if (error instanceof z.ZodError || error instanceof SyntaxError) return respond({error:'Please check the information entered.'},400);
      if (error instanceof CheckoutError) return respond({error:error.message},error.status);
      if (error instanceof ProviderError) return respond({error:'The payment or delivery provider is temporarily unavailable. Please retry shortly.'},503);
      const message=String(error?.message??'');
      if (message==='Staff access required') return respond({error:message},403);
      const safe=['Address not found','A product is unavailable','Duplicate product option','Invalid quantity',
        'Maximum 20 saved addresses','Product changed since you opened it. Reload before saving.',
        'Product no longer exists','Invalid order transition','Order not found','Product image must be uploaded and verified first',
        'Quote not found','Quote expired. Please check delivery again.','Cart changed. Please check delivery again.',
        'Payment mode changed. Please check delivery again.','Shipping measurements are missing. Please contact the store.',
        'Shipping measurements are invalid. Please contact the store.','This cart exceeds one parcel. Please contact the store.',
        'Test orders cannot ship','Order is not ready for shipment','Checkout request is already used',
        'This variant is reserved by a pending order. Please retry after its payment expires.',
        'This order needs a valid billing email before creating a shipment.',
        'Your signed-in account needs a valid email address to check delivery.',
        'Verify your email address before choosing cash on delivery.'];
      const known=safe.find(s=>message.startsWith(s));
      if (known) return respond({error:known},400);
      if (message.includes('unique constraint')) return respond({error:'That product URL or SKU is already in use.'},409);
      // Never return SQL, personal data, credentials or raw provider errors to the client.
      return respond({error:'The store could not complete this request. Please retry.'},503);
    }
    async function rpc(name,args) {
      const { data,error }=await db.rpc(name,args);
      if (error) throw error;
      return data;
    }
  };
}
