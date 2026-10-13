import crypto from 'node:crypto';
const origin=process.env.FINANCIAL_API_ORIGIN,raw=process.env.FINANCIAL_WORKER_AUTH_KEY;
if(!origin||new URL(origin).origin!==origin||new URL(origin).protocol!=='https:'||!raw||!/^[A-Za-z0-9_-]{43}$/.test(raw))throw Error('Financial worker bindings are required');
const key=Buffer.from(raw,'base64url');if(key.length!==32||key.toString('base64url')!==raw)throw Error('Invalid workload key binding');
const path='/api/v1/internal/financial',url=new URL(path,origin);let failures=0;
try {for(const action of ['monitor','reminders','business_daily','alerts','cleanup']) {
 const body=JSON.stringify({action}),timestamp=String(Math.floor(Date.now()/1000)),nonce=crypto.randomUUID(),signature=crypto.createHmac('sha256',key).update(['v1','testnet','financial','POST',path,timestamp,nonce,crypto.createHash('sha256').update(body).digest('hex')].join('\n')).digest('base64url');
 try {const response=await fetch(url,{method:'POST',redirect:'error',signal:AbortSignal.timeout(30000),headers:{'Content-Type':'application/json','x-worker-environment':'testnet','x-worker-timestamp':timestamp,'x-worker-nonce':nonce,'x-worker-signature':signature},body});if(!response.ok)throw Error('Workload rejected');console.log(`Financial tick ${action}: accepted`);}catch{failures++;console.error(`Financial tick ${action}: failed; inspect protected diagnostics`);}
}}finally{key.fill(0);}if(failures)process.exitCode=1;
