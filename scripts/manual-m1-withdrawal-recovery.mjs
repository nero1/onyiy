// Operator-invoked GIV recovery acceptance, never CI. Uses member_25 after the
// fresh 21-gift/integrity scenarios; preserves every journal and never resets.
if (process.env.M1_RECOVERY_CONFIRM!=='isolated-simulation' || !process.env.APP_BASE_URL) throw new Error('APP_BASE_URL and M1_RECOVERY_CONFIRM=isolated-simulation required');
const BASE=process.env.APP_BASE_URL.replace(/\/$/,'')+'/api/v1';
const user='member_25';
const assert=(value,message)=>{if(!value)throw new Error(message)};
async function req(path,actor=user,body,key=crypto.randomUUID(),status=200) {
  const response=await fetch(BASE+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json','x-sim-user':actor,'Idempotency-Key':key},body:body===undefined?undefined:JSON.stringify(body)});
  const payload=await response.json();assert(response.status===status,`${path}: expected ${status}, got ${response.status} ${payload.error?.code??''}`);return payload.data;
}
await req('/me/consent',user,{accepted:true});await req('/me/wallets/simulate',user,{});
const baseline=(await req('/me/dashboard')).balances;
const quote=()=>req('/me/withdrawals/quotes',user,{gross_base_units:'37'});
const cancel=id=>req(`/me/withdrawals/${id}/cancel`,user,{});
const confirm=id=>req(`/me/withdrawals/${id}/confirm`,user,{});
const control=(id,outcome,key=crypto.randomUUID())=>req(`/admin/simulation/withdrawals/${id}/control`,'sim_admin',{outcome,reason:'Named isolated GIV recovery scenario'},key);
const resolve=(id,action,key=crypto.randomUUID())=>req(`/admin/simulation/withdrawals/${id}/resolve`,'sim_admin',{action,reason:'Named isolated GIV recovery scenario'},key);
const unused=await quote();
await req(`/me/withdrawals/${unused.id}/cancel`,'member_01',{},undefined,404);
const quotedCancelled=await cancel(unused.id);assert(quotedCancelled.status==='cancelled','Quote not cancelled');
assert((await cancel(unused.id)).cancelledAt===quotedCancelled.cancelledAt,'Cancellation timestamp changed');
assert((await confirm(unused.id)).status==='cancelled','Cancelled quote was reactivated');
const rejected=await quote();const nonce=crypto.randomUUID();
await req(`/admin/simulation/withdrawals/${rejected.id}/control`,user,{outcome:'reject',reason:'Named isolated GIV recovery scenario'},undefined,403);
const configured=await control(rejected.id,'reject',nonce);const configuredAgain=await control(rejected.id,'reject',nonce.toUpperCase());assert(configured.withdrawal_id===configuredAgain.withdrawal_id && configured.outcome===configuredAgain.outcome,'Control replay changed');
await req(`/admin/simulation/withdrawals/${rejected.id}/control`,'sim_admin',{outcome:'hold',reason:'Named isolated GIV recovery scenario'},nonce,409);
assert((await confirm(rejected.id)).status==='cancelled','Rejected payout lost cancellation');
assert(JSON.stringify((await req('/me/dashboard')).balances)===JSON.stringify(baseline),'Rejection lost balance');
const delayed=await quote();await control(delayed.id,'hold');
const confirmed=await Promise.all([confirm(delayed.id),confirm(delayed.id)]);assert(confirmed.every(item=>item.status==='held'),'Delayed confirm state');
const held=await req('/me/dashboard');assert(BigInt(held.balances.available)===BigInt(baseline.available)-37n && BigInt(held.balances.held)===BigInt(baseline.held)+37n,'Hold did not reserve once');
assert(held.pending_withdrawals.some(item=>item.id===delayed.id),'Held recovery absent from own DTO');
const cancellations=await Promise.all([cancel(delayed.id),cancel(delayed.id)]);assert(cancellations.every(item=>item.status==='cancelled'),'Duplicate cancel state');
assert(JSON.stringify((await req('/me/dashboard')).balances)===JSON.stringify(baseline),'Cancellation lost funds');
const settled=await quote();await control(settled.id,'hold');await confirm(settled.id);
const resolutionKey=crypto.randomUUID();
const results=await Promise.all([resolve(settled.id,'settle',resolutionKey),resolve(settled.id,'settle',resolutionKey.toUpperCase())]);assert(results.every(item=>item.status==='settled') && results[0].settledAt===results[1].settledAt,'Resolution duplicated');
await req(`/me/withdrawals/${settled.id}/cancel`,user,{},undefined,409);
await req(`/admin/simulation/withdrawals/${settled.id}/resolve`,'sim_admin',{action:'cancel',reason:'Named isolated GIV recovery scenario'},resolutionKey,409);
const final=(await req('/me/dashboard')).balances;assert(BigInt(final.available)===BigInt(baseline.available)-37n && final.held===baseline.held && BigInt(final.withdrawn)===BigInt(baseline.withdrawn)+37n,'Settlement accounting');
const reconciled=await req('/admin/reconcile','sim_admin');assert(reconciled.balanced && reconciled.consistent && reconciled.lineage_complete && !reconciled.held_withdrawal_mismatches.length,'Recovery reconciliation');
console.log('Passed quoted cancellation, rejected hold release, delayed reservation, concurrent confirm/cancel, exact duplicate resolution, ownership/staff denial and held-liability reconciliation.');
