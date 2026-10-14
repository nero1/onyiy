import {performance} from 'node:perf_hooks';
type Waiter={resolve:(release:()=>void)=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>;deadline:number};
export class DatabaseAdmission {
 private active=0;private queue:Waiter[]=[];private stopped=false;private failures=0;private until=0;
 constructor(private readonly maximum:number){if(!Number.isSafeInteger(maximum)||maximum<1||maximum>20)throw new Error('CONFIGURATION_INVALID');}
 snapshot(){return {active:this.active,queued:this.queue.length,maximum:this.maximum,draining:this.stopped,cooldown_ms:Math.max(0,Math.ceil(this.until-performance.now()))};}
 private enter(){this.active++;let released=false;return()=>{if(released)return;released=true;this.active--;this.next();};}
 private next(){while(this.queue.length&&this.active<this.maximum){const waiter=this.queue.shift()!;clearTimeout(waiter.timer);if(waiter.deadline<=performance.now())waiter.reject(new Error('DB_DEADLINE_EXCEEDED'));else if(this.stopped)waiter.reject(new Error('DB_DRAINING'));else if(this.until>performance.now())waiter.reject(new Error('DB_CIRCUIT_OPEN'));else waiter.resolve(this.enter());}}
 acquire(deadline:number):Promise<()=>void>{
  if(this.stopped)return Promise.reject(new Error('DB_DRAINING'));
  if(deadline<=performance.now())return Promise.reject(new Error('DB_DEADLINE_EXCEEDED'));
  if(this.until>performance.now())return Promise.reject(new Error('DB_CIRCUIT_OPEN'));
  if(this.active<this.maximum)return Promise.resolve(this.enter());
  if(this.queue.length>=this.maximum*2)return Promise.reject(new Error('DB_CAPACITY_EXCEEDED'));
  return new Promise((resolve,reject)=>{const waiter:Waiter={resolve,reject,deadline,timer:setTimeout(()=>{const index=this.queue.indexOf(waiter);if(index>=0)this.queue.splice(index,1);reject(new Error('DB_CAPACITY_EXCEEDED'));},Math.min(1500,Math.max(1,deadline-performance.now())))};this.queue.push(waiter);});
 }
 async run<T>(deadline:number,fn:()=>Promise<T>){const release=await this.acquire(deadline);try{const result=await fn();this.failures=0;this.until=0;return result;}catch(error){let cause:any=error;for(let n=0;n<3&&cause;n++,cause=cause.cause){if(typeof cause.code==='string'&&(/^08/.test(cause.code)||['40001','40P01','55P03','57014','25P03','25P04','53300','57P01','57P02','57P03','CONNECTION_CLOSED','CONNECTION_ENDED','CONNECT_TIMEOUT','ECONNRESET','ETIMEDOUT'].includes(cause.code))){this.failures=Math.min(6,this.failures+1);this.until=performance.now()+Math.min(2000,100*2**(this.failures-1));break;}}throw error;}finally{release();}}
 drain(){this.stopped=true;for(const waiter of this.queue.splice(0)){clearTimeout(waiter.timer);waiter.reject(new Error('DB_DRAINING'));}}
}

import type { Database } from './index';
const admissions=new WeakMap<Database,DatabaseAdmission>();
export function admissionFor(database:Database,maximum:number){
 let admission=admissions.get(database);
 if(!admission){admission=new DatabaseAdmission(maximum);admissions.set(database,admission);}
 return admission;
}
export function drainAdmission(database:Database){admissions.get(database)?.drain();}
