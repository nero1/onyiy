import crypto from 'node:crypto';

// Operator-invoked acceptance, never CI. Run after the fresh 21-gift/integrity
// scenarios; it consumes one scheduler window and delivers pending notices.
if (process.env.M1_JOBS_CONFIRM!=='isolated-simulation') throw new Error('Confirm isolated simulation with M1_JOBS_CONFIRM');
const origin=process.env.APP_BASE_URL;
const current=process.env.SCHEDULER_HMAC_KEY;
const previous=process.env.SCHEDULER_HMAC_PREVIOUS_KEY;
if (!origin || !current || !previous) throw new Error('APP_BASE_URL and both secure scheduler key bindings required');
const PATH='/api/v1/internal/tick';
function signed({keyId='current',timestamp=String(Math.floor(Date.now()/1000)),nonce=crypto.randomUUID(),body='{}',environment='simulation'}={}) {
  const canonical=['v1','POST',PATH,environment,keyId,timestamp,nonce,crypto.createHash('sha256').update(body).digest('hex')].join('\n');
  return {method:'POST',headers:{'Content-Type':'application/json','x-scheduler-key-id':keyId,'x-scheduler-timestamp':timestamp,'x-scheduler-nonce':nonce,'x-scheduler-signature':crypto.createHmac('sha256',Buffer.from(keyId==='current'?current:previous,'base64url')).update(canonical).digest('hex')},body};
}
async function expect(request,status) {
  const response=await fetch(origin+PATH,request);
  if (response.status!==status) throw new Error(`Scheduler acceptance expected ${status}, got ${response.status}`);
  return (await response.json()).data;
}
await expect({method:'POST',headers:{'Content-Type':'application/json'},body:'{}'},401);
await expect(signed({timestamp:String(Math.floor(Date.now()/1000)-301)}),401);
await expect(signed({timestamp:String(Math.floor(Date.now()/1000)+302)}),401);
await expect(signed({environment:'testnet'}),401);
const tampered=signed();tampered.body='{"changed":true}';await expect(tampered,401);
await expect(signed({body:'{"extra":true}'}),400);
const first=signed();const other=signed({keyId:'previous'});
const result=await Promise.all([expect(first,200),expect(other,200)]);
if (result.filter(item=>item.status==='done').length!==1 || result.filter(item=>item.status==='already_claimed').length!==1) throw new Error('Duplicate worker window was not fenced');
await expect(first,409);
const denied=await fetch(origin+'/api/v1/admin/jobs',{headers:{'x-sim-user':'member_01'}});
if (denied.status!==403) throw new Error('Member read staff jobs');
const staff=await fetch(origin+'/api/v1/admin/jobs',{headers:{'x-sim-user':'sim_admin'}});
if (!staff.ok) throw new Error('Staff jobs unavailable');
const jobs=(await staff.json()).data;
if (!jobs.counts.some(item=>item.status==='done' && BigInt(item.count)>0n) || jobs.counts.some(item=>item.status!=='done')) throw new Error('Expected all fresh notification jobs done');
if (jobs.rows.some(row=>Object.hasOwn(row,'payload') || Object.hasOwn(row,'lease_token'))) throw new Error('Staff DTO exposed payload/lease credential');
const own=await fetch(origin+'/api/v1/me/dashboard',{headers:{'x-sim-user':'member_01'}});
const dashboard=(await own.json()).data;
if (!dashboard.notifications.some(item=>item.title_key==='gift_sent') || !dashboard.notifications.some(item=>item.title_key==='gift_received')) throw new Error('Expected materialized own gift notifications');
const rec=await fetch(origin+'/api/v1/admin/reconcile',{headers:{'x-sim-user':'sim_admin'}});
const reconciled=(await rec.json()).data;
if (!reconciled.balanced || !reconciled.consistent || !reconciled.lineage_complete) throw new Error('Financial reconciliation failed');
const historyResponse=await fetch(origin+'/api/v1/admin/reconcile/reports',{headers:{'x-sim-user':'sim_admin'}});
if (!historyResponse.ok) throw new Error('Reconciliation history unavailable');
const reports=(await historyResponse.json()).data;
if (reports.length!==1 || !reports[0].balanced || !reports[0].consistent || !reports[0].lineage_complete) throw new Error('Daily snapshot was not committed exactly once');
const reportResponse=await fetch(origin+'/api/v1/admin/reconcile/reports/'+reports[0].id,{headers:{'x-sim-user':'sim_admin'}});
if (!reportResponse.ok || !(await reportResponse.json()).data.result.consistent) throw new Error('Daily snapshot detail unavailable');
const deniedReport=await fetch(origin+'/api/v1/admin/reconcile/reports/'+reports[0].id,{headers:{'x-sim-user':'member_01'}});
if (deniedReport.status!==403) throw new Error('Member read staff report');
console.log('Passed signed/rotated-key tick, timestamp/body/environment/replay rejection, duplicate-run fencing, staff privacy, delivered notices and one durable daily reconciliation snapshot.');
