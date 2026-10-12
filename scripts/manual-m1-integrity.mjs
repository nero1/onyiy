import assert from 'node:assert/strict';

const origin = process.env.APP_BASE_URL;
if (!origin || process.env.M1_INTEGRITY_CONFIRM !== 'isolated-simulation') throw new Error('Set APP_BASE_URL and M1_INTEGRITY_CONFIRM=isolated-simulation for a fresh isolated simulation database after scenario:m1.');
const base = `${origin.replace(/\/$/,'')}/api/v1`;
const health = await (await fetch(`${origin.replace(/\/$/,'')}/api/health`)).json();
assert.equal(health.environment,'simulation');
assert.equal(health.mainnet,false);
assert.equal(health.signer,'disabled');

async function request(path,user,body,key = crypto.randomUUID()) {
  const response = await fetch(base+path,{method:body === undefined ? 'GET' : 'POST',headers:{'Content-Type':'application/json','x-sim-user':user,'Idempotency-Key':key},body:body === undefined ? undefined : JSON.stringify(body)});
  return {status:response.status,...await response.json()};
}
async function accepted(path,user,body,key) {
  const response = await request(path,user,body,key);
  assert.equal(response.status,200,`${path}: ${response.error?.code}`);
  return response.data;
}
console.log('Manual M1 integrity acceptance; this changes isolated GIV state and never resets it.');
await accepted('/me/consent','member_22',{accepted:true});
await accepted('/me/consent','member_22',{accepted:true});
assert.equal((await accepted('/me/dashboard','member_22')).balances.available,'500000');
const wallet = await accepted('/me/wallets/simulate','member_22',{});
const retryWallet = await accepted('/me/wallets/simulate','member_22',{});
assert.equal(retryWallet.id,wallet.id);
assert.equal(retryWallet.verifiedAt,wallet.verifiedAt);

const key = crypto.randomUUID();
const quote = await accepted('/me/withdrawals/quotes','member_22',{gross_base_units:'400000'},key);
assert.equal((await accepted('/me/withdrawals/quotes','member_22',{gross_base_units:'400000'},key)).id,quote.id);
assert.equal((await request('/me/withdrawals/quotes','member_22',{gross_base_units:'399999'},key)).error?.code,'VERSION_CONFLICT');
const second = await accepted('/me/withdrawals/quotes','member_22',{gross_base_units:'400000'});
const confirmations = await Promise.all([quote,second].map((q) => request(`/me/withdrawals/${q.id}/confirm`,'member_22',{})));
assert.deepEqual(confirmations.map((r) => r.status).sort(),[200,409]);
assert.equal(confirmations.find((r) => r.status === 409).error.code,'INSUFFICIENT_BALANCE');
const settled = confirmations.find((r) => r.status === 200).data;
await accepted(`/me/withdrawals/${settled.id}/confirm`,'member_22',{});
const balances = (await accepted('/me/dashboard','member_22')).balances;
assert.deepEqual(balances,{available:'100000',held:'0',withdrawn:'400000'});

await accepted('/me/consent','member_23',{accepted:true});
assert.equal((await request(`/me/withdrawals/${settled.id}/confirm`,'member_23',{})).status,404);
const plans = await accepted('/plans','member_23');
const bronze = plans.find((p) => p.slug === 'bronze');
const silver = plans.find((p) => p.slug === 'silver');
assert.ok(bronze && silver);
const giftKey = crypto.randomUUID();
const gifts = await Promise.all([1,2].map(() => accepted('/gifts/simulate','member_23',{plan_id:bronze.id},giftKey)));
assert.equal(gifts[0].cycle_id,gifts[1].cycle_id);
const firstReceiver = await accepted('/me/dashboard','member_01');
assert.equal(firstReceiver.wallet,null);
assert.equal(firstReceiver.cycles.find((cycle) => cycle.plan_id === bronze.id).status,'completed');
assert.equal(firstReceiver.balances.withdrawn,'0');
assert.equal(firstReceiver.balances.available,'500350');
assert.equal((await request('/gifts/simulate','member_23',{plan_id:silver.id},giftKey)).error?.code,'VERSION_CONFLICT');
await accepted('/me/consent','member_24',{accepted:true});
const attempts = await Promise.all([1,2].map(() => request('/gifts/simulate','member_24',{plan_id:bronze.id})));
assert.deepEqual(attempts.map((r) => r.status).sort(),[200,409]);
assert.equal(attempts.find((r) => r.status === 409).error.code,'ACTIVE_CYCLE_EXISTS');
assert.equal((await request('/gifts/simulate','member_24',{plan_id:bronze.id},'invalid-nonce')).status,400);

await accepted('/me/wallets/simulate','member_23',{});
const small = await accepted('/me/withdrawals/quotes','member_23',{gross_base_units:'29'});
await accepted(`/me/withdrawals/${small.id}/confirm`,'member_23',{});
assert.equal((await accepted('/me/dashboard','member_23')).balances.available,'499471');
assert.equal((await accepted('/admin/reconcile','sim_admin')).balanced,true);
console.log('Passed: one grant, stable wallet replay, quote conflicts, concurrent spending, settlement replay, ownership, gift replay/admission, nonce validation, exact 0.29 GIV and balanced journals.');
