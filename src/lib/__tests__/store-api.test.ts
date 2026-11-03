import { auth } from '@/lib/firebase-auth';
import { storeRequest } from '../store-api';
jest.mock('@/lib/supabase', () => ({ requireSupabase: () => ({}) }));
const authState=auth as unknown as {currentUser:{getIdToken:jest.Mock}|null};
const originalFetch=globalThis.fetch;
beforeEach(()=>{
  process.env.EXPO_PUBLIC_SUPABASE_URL='https://store.example';
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY='sb_publishable_fixture';
  authState.currentUser={getIdToken:jest.fn().mockResolvedValue('fixture-token')};
});
afterEach(()=>{globalThis.fetch=originalFetch;});
it('sends the Firebase identity and public key, returning only data',async()=>{
  globalThis.fetch=jest.fn().mockResolvedValue({ok:true,status:200,json:async()=>({data:{isAdmin:false}})});
  expect(await storeRequest('role.get')).toEqual({isAdmin:false});
  expect(globalThis.fetch).toHaveBeenCalledWith('https://store.example/functions/v1/commerce',expect.objectContaining({
    headers:expect.objectContaining({Authorization:'Bearer fixture-token',apikey:'sb_publishable_fixture'}),
  }));
});
it('turns expired login and non-JSON outages into safe typed errors',async()=>{
  globalThis.fetch=jest.fn().mockResolvedValue({ok:false,status:401,json:async()=>({error:'JWT expired internal detail'})});
  await expect(storeRequest('orders.list')).rejects.toMatchObject({name:'StoreRequestError',status:401,message:'Your session has expired. Please sign in again.'});
  globalThis.fetch=jest.fn().mockResolvedValue({ok:false,status:503,json:async()=>{throw new SyntaxError('html');}});
  await expect(storeRequest('orders.list')).rejects.toMatchObject({name:'StoreRequestError',status:503,message:'The store is temporarily unavailable. Please try again.'});
});
it('handles network failures without exposing browser diagnostics',async()=>{
  globalThis.fetch=jest.fn().mockRejectedValue(new TypeError('fetch failed with internal trace'));
  await expect(storeRequest('orders.list')).rejects.toMatchObject({name:'StoreRequestError',status:0,message:'Could not connect. Please check your internet connection and retry.'});
});
