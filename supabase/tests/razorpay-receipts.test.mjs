import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
let db;
const receipt={mode:'test',accountId:'acc_fixture',eventId:'evt_fixture',eventType:'payment.captured',
  paymentId:'pay_fixture',orderId:'order_fixture',refundId:null,amountPaise:199900,currency:'INR',status:'captured',bodySha256:'a'.repeat(64)};
const ingest=async value=>(await db.query('select public.ingest_razorpay_receipt($1::jsonb) as result',[JSON.stringify(value)])).rows[0].result;
before(async()=>{
  db=new PGlite();
  await db.exec('create role anon;create role authenticated;create role service_role;');
  await db.exec(await readFile(new URL('../migrations/20261102172202_razorpay_webhook_receipts.sql',import.meta.url),'utf8'));
});
after(async()=>{await db?.close();});
test('deduplicates provider events while keeping test and live receipts separate',async()=>{
  assert.deepEqual(await ingest(receipt),{duplicate:false});
  assert.deepEqual(await ingest(receipt),{duplicate:true});
  assert.deepEqual(await ingest({...receipt,mode:'live'}),{duplicate:false});
  assert.equal((await db.query('select count(*)::int as count from private.payment_webhook_receipts')).rows[0].count,2);
  await assert.rejects(ingest({...receipt,bodySha256:'b'.repeat(64)}),/Event ID conflicts/);
});
test('clients cannot inject or read payment notifications',async()=>{
  for(const role of ['anon','authenticated']) {
    await db.exec(`set role ${role}`);
    try {
      await assert.rejects(ingest(receipt),/permission denied/);
      await assert.rejects(db.query('select * from private.payment_webhook_receipts'),/permission denied/);
    } finally {await db.exec('reset role');}
  }
  await db.exec('set role service_role');
  try {assert.deepEqual(await ingest({...receipt,eventId:'evt_service'}),{duplicate:false});}
  finally {await db.exec('reset role');}
});
test('stored notifications remain pending reconciliation and never create store orders',async()=>{
  const saved=(await db.query("select * from private.payment_webhook_receipts where event_id='evt_fixture' and mode='test'")).rows[0];
  assert.equal(saved.processing_state,'pending_reconciliation');
  assert.equal(saved.amount_paise,199900);
  assert.equal('payload' in saved,false);
  await assert.rejects(ingest({...receipt,eventId:'evt_negative',amountPaise:-1}),/check constraint/);
});
