import crypto from 'node:crypto';
const origin=process.env.FINANCIAL_API_ORIGIN,raw=process.env.FINANCIAL_WORKER_AUTH_KEY;
if(!origin||new URL(origin).origin!==origin||new URL(origin).protocol!=='https:'||!raw||!/^[A-Za-z0-9_-]{43}$/.test(raw))throw Error('Financial worker bindings are required');
const key=Buffer.from(raw,'base64url');if(key.length!==32||key.toString('base64url')!==raw)throw Error('Invalid workload key binding');
const path='/api/v1/internal/financial',url=new URL(path,origin);let failures=0;
async function run(input){const body=JSON.stringify(input),timestamp=String(Math.floor(Date.now()/1000)),nonce=crypto.randomUUID(),signature=crypto.createHmac('sha256',key).update(['v1','testnet','financial','POST',path,timestamp,nonce,crypto.createHash('sha256').update(body).digest('hex')].join('\n')).digest('base64url');const response=await fetch(url,{method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json','x-worker-environment':'testnet','x-worker-timestamp':timestamp,'x-worker-nonce':nonce,'x-worker-signature':signature},body});if(!response.ok)throw Error('Workload rejected');return (await response.json()).data}
try{
 let assets=[];try{const inventory=await run({action:'monitor_inventory'});if(!Array.isArray(inventory.asset_keys)||inventory.asset_keys.length>8||inventory.asset_keys.some(key=>!['eth','bnb','sol','usdt_bnb','usdt_sol','usdt_tron','jaga_bnb','trx'].includes(key)))throw Error('Invalid inventory');assets=[...new Set(inventory.asset_keys)]}catch{failures++;console.error('Financial inventory failed; inspect protected diagnostics')}
 // One asset per HTTP invocation. At most13 requests ×15 seconds keeps the
 // authenticated, non-signing tick inside its four-minute workflow budget.
 for(const input of [...assets.map(asset_key=>({action:'monitor',asset_key})),...['reminders','business_daily','alerts','cleanup'].map(action=>({action}))]){
  try{await run(input);console.log(`Financial tick ${input.action}: accepted`)}catch{failures++;console.error(`Financial tick ${input.action}: failed; inspect protected diagnostics`)}
 }
}finally{key.fill(0)}if(failures)process.exitCode=1;
