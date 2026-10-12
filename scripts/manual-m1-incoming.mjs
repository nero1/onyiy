// Named operator acceptance only: no CI, no reset, GIV only.
if(process.env.M1_INCOMING_CONFIRM!=='isolated-simulation')throw new Error('Confirm isolated simulation with M1_INCOMING_CONFIRM');
const origin=process.env.APP_BASE_URL;if(!origin)throw new Error('APP_BASE_URL required');const base=origin.replace(/\/$/,'')+'/api/v1';
function check(value,message){if(!value)throw new Error(message)}
async function req(path,user='member_10',body,key=crypto.randomUUID(),status=200){const response=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json','x-sim-user':user,'Idempotency-Key':key},body:body===undefined?undefined:JSON.stringify(body)});const data=await response.json();check(response.status===status,`${path}: ${data.error?.code??response.status}, expected ${status}`);return data.data}
const plans=await req('/plans','sim_admin');const silver=plans.find(p=>p.slug==='silver');check(silver,'Silver missing');await req(`/admin/plans/${silver.id}/activate`,'sim_admin',{});
const quote=(user,key=crypto.randomUUID())=>req('/gifts/invoices',user,{plan_id:silver.id},key);
const submit=(item,user)=>req(`/gifts/invoices/${item.id}/transaction`,user,{});
const control=(item,outcome,actual)=>req(`/admin/simulation/invoices/${item.id}/control`,'sim_admin',{outcome,reason:`Named incoming ${outcome} observation`,...(actual?{actual_base_units:actual}:{})});
const resolve=(item,action,key=crypto.randomUUID(),reason=`Named incoming ${action} observation`)=>req(`/admin/simulation/invoices/${item.id}/resolve`,'sim_admin',{action,reason},key);
const balance=async user=>(await req('/me/dashboard',user)).balances;
// Recovery/integrity on Bronze is independent of this Silver partition.
const before=await balance('member_10');const key=crypto.randomUUID();let item=await quote('member_10',key);check((await quote('member_10',key.toUpperCase())).id===item.id,'Quote key case identity');
await req('/gifts/invoices','member_10',{plan_id:plans.find(p=>p.slug==='gold').id},key,409);
await control(item,'under');let result=await submit(item,'member_10');check(result.status==='exception' && BigInt(result.refundable_base_units)===BigInt(item.expected_base_units)-1n,'Underpayment preserved');
check((await req('/me/dashboard','member_10')).cycles.every(c=>c.plan_id!==silver.id),'Underpayment admitted a cycle');
check((await balance('member_10')).refundable===result.refundable_base_units,'Refundable liability exposed separately');
check((await submit(item,'member_10')).status==='exception','Duplicate submission changed result');
await req(`/gifts/invoices/${item.id}/transaction`,'member_11',{},crypto.randomUUID(),404);
await req(`/admin/simulation/invoices/${item.id}/resolve`,'member_10',{action:'refund',reason:'Denied member recovery'},crypto.randomUUID(),403);
const refunds=await Promise.all([resolve(item,'refund'),resolve(item,'refund')]);check(refunds.every(row=>row.refunded_base_units===result.refundable_base_units),'Duplicate refund identity');check((await balance('member_10')).available===before.available,'Refund lost original GIV');
item=await quote('member_10');await control(item,'reject');result=await submit(item,'member_10');check(result.status==='failed' && (await balance('member_10')).available===before.available,'Rejection moved money');
item=await quote('member_10');await control(item,'late');result=await submit(item,'member_10');check(result.status==='exception' && result.refundable_base_units===item.expected_base_units,'Late payment lost liability');await resolve(item,'refund');
item=await quote('member_10');await control(item,'delay');result=await submit(item,'member_10');check(result.status==='submitted','Delay missing');check((await balance('member_10')).incoming===item.expected_base_units,'Submitted money not held');
await req('/gifts/invoices','member_10',{plan_id:silver.id},crypto.randomUUID(),409);
await resolve(item,'cancel');await resolve(item,'refund');check((await balance('member_10')).available===before.available,'Delayed recovery lost money');
item=await quote('member_11');await control(item,'over');result=await submit(item,'member_11');check(result.status==='credited' && result.refundable_base_units==='1','Overpayment created wrong principal');await resolve(item,'refund');
check((await req('/me/dashboard','member_11')).cycles.filter(c=>c.plan_id===silver.id).length===1,'Overpayment duplicated admission');
item=await quote('member_12');const submissions=await Promise.all([submit(item,'member_12'),submit(item,'member_12')]);check(submissions.every(row=>row.status==='credited'),'Concurrent normal submission');
item=await quote('member_13');await req(`/gifts/invoices/${item.id}/cancel`,'member_13',{});check((await submit(item,'member_13')).status==='expired','Cancelled quote reopened');
const history=await req('/me/gift-invoices','member_10');check(history.every(row=>!('hold_journal_id'in row) && !('actor_user_id'in row) && !('reason'in row)),'Own DTO leaked staff evidence');
const reconciled=await req('/admin/reconcile','sim_admin');check(reconciled.balanced && reconciled.consistent && reconciled.lineage_complete && !reconciled.incoming_hold_mismatches.length && !reconciled.refundable_mismatches.length,'Incoming reconciliation');
console.log('Passed named GIV under/over/late/reject/delay/refund/cancel, quote/submission/refund replay, ownership/staff denial, concurrent admission and separate held/refundable reconciliation.');
