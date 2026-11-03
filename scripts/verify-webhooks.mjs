import assert from 'node:assert/strict';
const base=process.env.EXPO_PUBLIC_SUPABASE_URL;
if(!base) throw new Error('Set the public Supabase URL first.');
for(const mode of ['test','live']) {
  const url=`${base}/functions/v1/razorpay-webhook-${mode}`;
  const response=await fetch(url);
  assert.equal(response.status,200);
  const health=await response.json();
  assert.equal(health.mode,mode);
  assert.equal(health.configured,true,`${mode} webhook secret must be configured`);
  const unsigned=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  assert.equal(unsigned.status,401,'Unverified payment notifications must fail');
  console.log(`PASS: ${mode} webhook is configured and rejects unsigned requests`);
}
