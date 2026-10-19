import {performance} from 'node:perf_hooks';
import {setTimeout as pause} from 'node:timers/promises';
type Outcome={published:number;skipped?:string};
type Dependencies={now?:()=>number;wait?:(milliseconds:number,signal?:AbortSignal)=>Promise<void>;signal?:AbortSignal;report?:(result:Outcome|{error:string})=>void};
/** Bridge the five-minute scheduler interval without extending quote freshness.
 * Five bounded passes, at least one minute between starts; never catch up in a burst. */
export async function refreshWindow(refresh:()=>Promise<Outcome>,dependencies:Dependencies={}){
 const now=dependencies.now??(()=>performance.now()),wait=dependencies.wait??(async(ms,signal)=>{await pause(ms,undefined,{signal})}),start=now();
 let next=start,attempts=0,failures=0;
 while(attempts<5){
  if(dependencies.signal?.aborted||now()-start>=300000)break;
  if(next>now())await wait(next-now(),dependencies.signal);
  if(dependencies.signal?.aborted||now()-start>=300000)break;
  const began=now();attempts++;
  try{const result=await refresh();dependencies.report?.(result);}
  catch(error){failures++;const code=error instanceof Error&&/^[A-Z_]{1,80}$/.test(error.message)?error.message:'PROVIDER_UNAVAILABLE';dependencies.report?.({error:code});}
  next=began+60000;
 }
 return {attempts,failures};
}
