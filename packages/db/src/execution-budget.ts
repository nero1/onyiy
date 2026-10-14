import {AsyncLocalStorage} from 'node:async_hooks';
import {performance} from 'node:perf_hooks';
import type {DbExecutor} from './index';
const activeWork=new AsyncLocalStorage<ExecutionBudget>();
/** Cooperative work deadline plus a database dispatch fence. Expiry rejects
 * the standard transaction callback so postgres-js rolls back normally. It
 * never destroys a pooled connection or parks a transaction callback. */
export class ExecutionBudget {
 private closed=false;
 readonly deadline:number;
 private readonly cancellation=new AbortController();
 readonly signal:AbortSignal;
 constructor(milliseconds:number,private readonly parent?:ExecutionBudget,signal?:AbortSignal){
  if(!Number.isSafeInteger(milliseconds)||milliseconds<1||milliseconds>300000)throw new Error('CONFIGURATION_INVALID');
  this.signal=AbortSignal.any([this.cancellation.signal,...(parent?[parent.signal]:[]),...(signal?[signal]:[])]);
  this.deadline=Math.min(performance.now()+milliseconds,parent?.deadline??Infinity);
 }
 remaining(){this.check();return Math.max(1,Math.floor(this.deadline-performance.now()));}
 check(){if(this.closed||this.signal?.aborted||performance.now()>=this.deadline)throw new Error('DB_DEADLINE_EXCEEDED');this.parent?.check();}
 async run<T>(fn:()=>Promise<T>):Promise<T>{
  this.check();let timer:ReturnType<typeof setTimeout>|undefined;let abort:()=>void=()=>{};
  const expired=new Promise<never>((_,reject)=>{
   abort=()=>{if(this.closed)return;this.closed=true;this.cancellation.abort();reject(new Error('DB_DEADLINE_EXCEEDED'))};
   timer=setTimeout(abort,this.remaining());this.signal?.addEventListener('abort',abort,{once:true});
  });
  try{return await activeWork.run(this,()=>Promise.race([Promise.resolve().then(async()=>{this.check();const result=await fn();this.check();return result;}),expired]));}
  finally{this.closed=true;this.cancellation.abort();clearTimeout(timer);this.signal?.removeEventListener('abort',abort);}
 }
 async scope<T>(fn:()=>Promise<T>):Promise<T>{
  this.check();const timer=setTimeout(()=>this.cancellation.abort(),this.remaining());
  // Workers await cooperative cleanup before returning. Child transactions
  // and outbound RPC receive cancellation; no callback or pool is destroyed.
  try{return await activeWork.run(this,fn);}
  finally{this.closed=true;this.cancellation.abort();clearTimeout(timer);}
 }
 executor(tx:DbExecutor):DbExecutor{
  const seen=new WeakMap<object,object>();const budget=this;
  const wrap=(value:unknown):unknown=>{
   if(value===null||typeof value!=='object')return value;
   // Native promise continuations must always settle/catch normally. Drizzle
   // query builders themselves are fenced before their then/execute dispatch.
   if(value instanceof Promise)return value;
   const prior=seen.get(value);if(prior)return prior;
   const proxy=new Proxy(value,{get(target,key){
    const member=Reflect.get(target,key,target);
    if(typeof member!=='function')return member;
    return (...args:unknown[])=>{budget.check();return wrap(Reflect.apply(member,target,args))};
   }});seen.set(value,proxy);return proxy;
  };
  return wrap(tx) as DbExecutor;
 }
}
export function withExecutionBudget<T>(milliseconds:number,fn:()=>Promise<T>,signal?:AbortSignal){return new ExecutionBudget(milliseconds,activeWork.getStore(),signal).run(fn);}
export function withBoundedTransaction<T>(tx:DbExecutor,fn:(guarded:DbExecutor)=>Promise<T>,milliseconds=30000){const budget=new ExecutionBudget(milliseconds,activeWork.getStore());return budget.run(()=>fn(budget.executor(tx)));}
export function remainingExecutionTime(){const work=activeWork.getStore();return work?work.remaining():30000;}

export function withExecutionScope<T>(milliseconds:number,fn:()=>Promise<T>,signal?:AbortSignal){return new ExecutionBudget(milliseconds,activeWork.getStore(),signal).scope(fn);}
