import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCommerceHandler } from '../functions/_shared/handler.mjs';

function setup({ admin = false, verify = async () => 'verified-user', allowed = false, withinLimit=true, size=120 } = {}) {
  const calls = [];
  const db = { rpc: async (name,args) => {
    calls.push({name,args});
    if(name==='consume_store_request') return {data:withinLimit};
    if(args.p_action==='role.get') return {data:{isAdmin:admin}};
    if(args.p_action==='media.allowed') return {data:allowed};
    return {data:[]};
  } };
  const storage={createSignedUrl:async path=>({data:{signedUrl:'https://example.com/'+path}}),
    createSignedUploadUrl:async path=>({data:{token:'upload-token',path}}),
    info:async()=>({data:{size,contentType:'image/jpeg'}})};
  return {calls,handle:createCommerceHandler({db,storage,verify,allowedOrigins:['http://localhost:8083']})};
}
const request=(action,payload={},token='valid',origin)=>new Request('https://example.com/commerce',{
  method:'POST',headers:{'content-type':'application/json',...(token?{authorization:`Bearer ${token}`} : {}),...(origin?{origin}: {})},
  body:JSON.stringify({action,payload}),
});
test('private requests require valid identity and never trust body UID/admin',async()=>{
  const {handle,calls}=setup();
  assert.equal((await handle(request('addresses.list',{},null))).status,401);
  assert.equal((await handle(request('addresses.list',{p_uid:'owner',uid:'owner',admin:true}))).status,200);
  const call=calls.find(c=>c.args.p_action==='addresses.list');
  assert.equal(call.args.p_uid,'verified-user');
  assert.deepEqual(call.args.p_payload,{});
  const invalid=setup({verify:async()=>{throw new Error('wrong project');}});
  assert.equal((await invalid.handle(request('role.get'))).status,401);
  assert.equal(invalid.calls.length,0);
});
test('media signing refuses drafts, traversal, and nonstaff uploads',async()=>{
  const {handle,calls}=setup();
  const path='draft/12345678-1234-1234-1234-123456789abc.jpg';
  assert.equal((await handle(request('media.get',{paths:[path]},null))).status,404);
  assert.equal((await handle(request('media.get',{paths:['../secret.jpg']},null))).status,400);
  assert.equal((await handle(request('media.upload',{productId:'protein',mime:'image/jpeg'}))).status,403);
  assert.equal(calls.some(c=>c.args.p_action==='media.register'),false);
});
test('staff uploads use scoped immutable paths and validate storage metadata',async()=>{
  const {handle,calls}=setup({admin:true});
  const upload=await handle(request('media.upload',{productId:'protein',mime:'image/jpeg'}));
  assert.equal(upload.status,200);
  const {data}=await upload.json();
  assert.match(data.path,/^protein\/[a-f0-9-]{36}\.jpg$/);
  assert.equal((await handle(request('media.complete',{productId:'other',path:data.path}))).status,400);
  assert.equal((await handle(request('media.complete',{productId:'protein',path:data.path}))).status,200);
  assert.equal(calls.find(c=>c.args.p_action==='media.register').args.p_payload.size,120);
});
test('browser origins must be explicitly allowed',async()=>{
  const {handle,calls}=setup();
  assert.equal((await handle(request('role.get',{},'valid','https://unknown.example'))).status,403);
  assert.equal(calls.length,0);
  const accepted=await handle(request('role.get',{},'valid','http://localhost:8083'));
  assert.equal(accepted.headers.get('access-control-allow-origin'),'http://localhost:8083');
});
test('rate limits stop private operations before data access',async()=>{
  const {handle,calls}=setup({withinLimit:false});
  assert.equal((await handle(request('addresses.list'))).status,429);
  assert.equal(calls.some(c=>c.name==='customer_action'),false);
});
test('oversized stored images cannot be finalized',async()=>{
  const {handle,calls}=setup({admin:true,size:7*1024*1024});
  const path='protein/12345678-1234-1234-1234-123456789abc.jpg';
  assert.equal((await handle(request('media.complete',{productId:'protein',path}))).status,400);
  assert.equal(calls.some(c=>c.args.p_action==='media.register'),false);
});
test('checkout is identity-bound and rate-limited before provider action',async()=>{
 let invoked;const handle=createCommerceHandler({db:{rpc:async()=>({data:true})},storage:{},verify:async()=> 'verified-user',allowedOrigins:[],checkout:async(uid,action,payload)=>{invoked={uid,action,payload};return {id:'safe-order'};}});
 const response=await handle(request('checkout.create',{quoteId:'q',requestKey:'request_123',uid:'owner',mode:'live'}));assert.equal(response.status,200);assert.equal(invoked.uid,'verified-user');assert.equal(invoked.action,'checkout.create');
 const blocked=createCommerceHandler({db:{rpc:async name=>({data:name!=='consume_checkout_request'})},storage:{},verify:async()=> 'verified-user',allowedOrigins:[],checkout:async()=>{throw new Error('must not run');}});assert.equal((await blocked(request('checkout.create',{}))).status,429);
});
test('checkout receives trusted verified identity separately from spoofable body email',async()=>{
 let received;const identity={uid:'verified-user',email:'signed@example.test',emailVerified:true};const handle=createCommerceHandler({db:{rpc:async()=>({data:true})},storage:{},verify:async()=>identity,allowedOrigins:[],checkout:async(uid,action,payload,trusted)=>{received={uid,trusted};return {};}});
 assert.equal((await handle(request('checkout.delivery',{email:'attacker@example.test',emailVerified:true}))).status,200);assert.deepEqual(received,{uid:'verified-user',trusted:identity});
});
