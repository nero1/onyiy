import { performance } from 'node:perf_hooks';
import {isReadOnlyPreview, loadManifest } from '@gifters/config';
import { canonicalRateRoute,enforceRate,rateClientIp } from './rate-limits';
import { hash } from './auth-crypto';

const ceiling=loadManifest().rate_policies.reads;
const buckets=new Map<string,{until:number;used:number}>();
const overflow={until:0,used:0};
/** Only the leader of a public cache miss calls this. Local rejection limits
 * limiter writes; PostgreSQL enforces the policy across application instances.
 * Full local storage uses one overflow budget rather than evicting live limits. */
export async function admitPublicMiss(request:Request){
 const now=performance.now();
 for(const [key,bucket] of buckets)if(bucket.until<=now)buckets.delete(key);
 const key=hash(`${canonicalRateRoute(request)}|${rateClientIp(request)}`);
 let bucket=buckets.get(key);
 if(!bucket){
  if(buckets.size>=1024)bucket=overflow;
  else {bucket={until:0,used:0};buckets.set(key,bucket);}
 }
 if(bucket.until<=now){bucket.until=now+ceiling.window_seconds*1000;bucket.used=0;}
 if(bucket.used>=ceiling.allowance)throw new Error('RATE_LIMITED');
 bucket.used++;
 // A failed limiter admits no fresh database load. Existing cached DTOs never
 // call the limiter and remain available through the ordinary freshness bound.
 if(!isReadOnlyPreview())await enforceRate(request,'reads','public',true);
}
