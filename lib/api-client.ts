import { clearActiveUserScope,activeSessionGeneration } from './storage';
import {withRefreshLock} from './refresh-lock';
const BASE='/api/v1';
export class ApiError extends Error{constructor(public code:string,message?:string){super(message??code);}}
let refreshing:Promise<{user:{username:string}|null;generation?:string}>|undefined;
let clientScope:{owner:string;generation:string}|null=null;
let scopeRevision=0;
export function setClientSession(owner:string,generation:string){if(clientScope?.owner!==(generation?owner:undefined)||clientScope?.generation!==(generation?generation:undefined))scopeRevision++;clientScope=generation?{owner,generation}:null;}
export function clientSessionMatches(owner:string,generation?:string){return clientScope?clientScope.owner===owner&&clientScope.generation===(generation??''):!owner&&!generation;}
function currentGeneration(owner:string){return clientScope?.owner===owner?clientScope.generation:activeSessionGeneration(owner);}
function csrf(){try{const values=document.cookie.split(';').map(v=>v.trim()).filter(v=>v.startsWith('gw_csrf='));return values.length===1?decodeURIComponent(values[0].slice(8)):''}catch{return ''}}
async function request(path:string,username:string,init:RequestInit){const headers=new Headers(init.headers);if(!headers.has('Content-Type'))headers.set('Content-Type','application/json');if(username){headers.set('X-Client-Account',username);const generation=currentGeneration(username);if(generation&&!headers.has('X-Client-Session'))headers.set('X-Client-Session',generation);}if((init.method??'GET').toUpperCase()!=='GET')headers.set('X-CSRF-Token',csrf());return fetch(BASE+path,{...init,headers,credentials:'same-origin',cache:'no-store'});}
async function coordinatedRefresh(){
 if(!refreshing){refreshing=withRefreshLock(async()=>{
  const signal=AbortSignal.timeout(8000),present=await request('/auth/session','',{signal});
  const snapshot=await present.json().catch(()=>null);
  if(present.ok&&snapshot?.data?.user&&!snapshot.data.requires_mfa)return snapshot.data;
  const r=await request('/auth/refresh','',{method:'POST',body:'{}',signal});const body=await r.json().catch(()=>null);
  if(!r.ok)throw new ApiError(body?.error?.code??'UNAUTHENTICATED');return body.data;
 });const current=refreshing;void current.finally(()=>{if(refreshing===current)refreshing=undefined}).catch(()=>{});}
 return refreshing;
}
export async function api<T>(path:string,username:string,init:RequestInit={}){
 if(path==='/auth/refresh'&&(init.method??'GET').toUpperCase()==='POST')return await coordinatedRefresh() as T;
 const generation=username?currentGeneration(username):null,revision=scopeRevision;
 const assertScope=()=>{if(((username||path==='/auth/session')&&revision!==scopeRevision)||(username&&(currentGeneration(username)!==generation||(clientScope&&clientScope.owner!==username))))throw new ApiError('VERSION_CONFLICT');};
 assertScope();const headers=new Headers(init.headers);if(generation)headers.set('X-Client-Session',generation);init={...init,headers};
 let response=await request(path,username,init);
 try{assertScope()}catch(error){await response.body?.cancel();throw error;}
 if(response.status===401&&!path.startsWith('/auth/')){
  try{const refreshed=await coordinatedRefresh();assertScope();if(username&&(refreshed.user?.username!==username||(generation&&refreshed.generation!==generation)))throw new ApiError('VERSION_CONFLICT');response=await request(path,username,init);}catch(error){if(username&&revision===scopeRevision)clearActiveUserScope(username,generation??undefined);throw error;}
 }
 assertScope();if(response.status===401&&username)clearActiveUserScope(username,generation??undefined);const body=await response.json().catch(()=>null);assertScope();if(!response.ok)throw new ApiError(body?.error?.code??(response.status===401?'UNAUTHENTICATED':'INTERNAL_ERROR'));if(!body)throw new ApiError('INTERNAL_ERROR');return body.data as T;
}
export function mutation<T>(path:string,username:string,body:unknown,method='POST'){return api<T>(path,username,{method,headers:{'Idempotency-Key':crypto.randomUUID()},body:JSON.stringify(body)});}

/** Explicit scoped binary transfers never refresh/replay an upload. */
export async function privateTransfer(path:string,username:string,init:RequestInit){
 const generation=currentGeneration(username),revision=scopeRevision;
 const check=()=>{if(revision!==scopeRevision||!clientSessionMatches(username,generation??undefined))throw new ApiError('VERSION_CONFLICT');};
 check();const response=await request(path,username,init);
 try{check()}catch(error){await response.body?.cancel();throw error;}
 if(!response.ok){const body=await response.json().catch(()=>null);check();throw new ApiError(body?.error?.code??'INTERNAL_ERROR');}
 const body=response.body?.pipeThrough(new TransformStream<Uint8Array,Uint8Array>({transform(chunk,controller){check();controller.enqueue(chunk)},flush(){check()}}));
 return new Response(body??null,{status:response.status,statusText:response.statusText,headers:response.headers});
}
