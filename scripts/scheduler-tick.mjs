import crypto from 'node:crypto';

// Use secure environment bindings; no credential or response payload is logged.
const origin=process.env.SCHEDULER_ORIGIN;
const rawKey=process.env.SCHEDULER_HMAC_KEY;
if (!origin || !rawKey) throw new Error('Scheduler origin and key bindings are required');
const url=new URL('/api/v1/internal/tick',origin);
if (url.protocol!=='https:' || new URL(origin).origin!==origin || url.username || url.password) throw new Error('Scheduler requires an exact HTTPS origin');
if (!/^[A-Za-z0-9_-]{43,128}$/.test(rawKey)) throw new Error('Invalid scheduler key binding');
const key=Buffer.from(rawKey,'base64url');
if (key.length<32 || key.toString('base64url')!==rawKey) throw new Error('Invalid scheduler key binding');
const body='{}';
const timestamp=String(Math.floor(Date.now()/1000));
const nonce=crypto.randomUUID();
const canonical=['v1','POST',url.pathname,'simulation','current',timestamp,nonce,crypto.createHash('sha256').update(body).digest('hex')].join('\n');
const controller=new AbortController();
const shutdown=()=>controller.abort();
process.once('SIGTERM',shutdown);process.once('SIGINT',shutdown);
const timer=setTimeout(shutdown,25000);
try {
  const response=await fetch(url,{method:'POST',redirect:'error',signal:controller.signal,headers:{
    'Content-Type':'application/json','x-scheduler-key-id':'current','x-scheduler-timestamp':timestamp,'x-scheduler-nonce':nonce,
    'x-scheduler-signature':crypto.createHmac('sha256',key).update(canonical).digest('hex'),
  },body});
  if (!response.ok) throw new Error(`Scheduler request failed (${response.status}); inspect staff diagnostics`);
  const result=await response.json();
  if (!['done','already_claimed'].includes(result.data?.status)) throw new Error('Invalid scheduler response');
  console.log(`Scheduler: ${result.data.status}`);
} finally { clearTimeout(timer);process.removeListener('SIGTERM',shutdown);process.removeListener('SIGINT',shutdown); }
