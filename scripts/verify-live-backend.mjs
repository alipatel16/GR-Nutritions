// Read-only smoke checks. No customer login, store writes or service credentials.
import assert from 'node:assert/strict';
const url=process.env.EXPO_PUBLIC_SUPABASE_URL;
const key=process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if(!url||!key) throw new Error('Set the public Supabase URL/key in .env.local first.');
const post=async(path,body,headers={})=>fetch(url+path,{
  method:'POST',headers:{apikey:key,'Content-Type':'application/json',...headers},body:JSON.stringify(body),
});
const catalog=await post('/rest/v1/rpc/catalog_products',{});
assert.equal(catalog.status,200,'Public catalog RPC must be available');
const products=await catalog.json();
assert.ok(Array.isArray(products));
assert.ok(products.every(p=>p.status==='active'),'Drafts must not be public');
console.log('PASS: active-only catalog endpoint');
const privateRead=await fetch(url+'/rest/v1/delivery_addresses?select=id&limit=1',{headers:{apikey:key}});
assert.ok(!privateRead.ok,'Anonymous direct address access must fail');
const spoofed=await post('/rest/v1/rpc/customer_action',{p_uid:'owner',p_action:'role.get',p_payload:{}});
assert.ok(!spoofed.ok,'Anonymous privileged RPC must fail');
console.log('PASS: private tables and privileged RPC are denied');
const missing=await post('/functions/v1/commerce',{action:'role.get',payload:{uid:'owner',admin:true}});
assert.equal(missing.status,401,'Private API must require Firebase authentication');
const invalid=await post('/functions/v1/commerce',{action:'role.get'}, {Authorization:'Bearer invalid-token'});
assert.equal(invalid.status,401,'Invalid Firebase identity must fail');
console.log('PASS: missing/invalid login and body identity spoofing rejected');
const media=await post('/functions/v1/commerce',{action:'media.get',payload:{paths:[]}}, {Origin:'http://localhost:8083'});
assert.equal(media.status,200,'Known local origin must be enabled');
assert.equal(media.headers.get('access-control-allow-origin'),'http://localhost:8083');
console.log('PASS: deployed Edge runtime and explicit development CORS');
