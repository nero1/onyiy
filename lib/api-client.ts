import {APP_WIRE_VERSION} from '@gifters/domain';
import {clientVersionHeaders,observeServerVersion,clientUpdateRequired,requireClientUpdate} from './client-update';
import { clearActiveUserScope,activeSessionGeneration } from './storage';
import {withRefreshLock} from './refresh-lock';
const BASE='/api/v1';
export class ApiError extends Error{constructor(public code:string,message?:string,public metadata:{retryable?:boolean;messageKey?:string;requestId?:string}={}){super(message??code);}}
function responseError(body:any,fallback='INTERNAL_ERROR'){if(body?.error?.code==='CLIENT_UPDATE_REQUIRED')requireClientUpdate();const code=/^[A-Z_]{1,100}$/.test(body?.error?.code??'')?body.error.code:fallback;return new ApiError(code,undefined,{retryable:body?.error?.retryable===true,messageKey:typeof body?.error?.message_key==='string'?body.error.message_key:undefined,requestId:/^[0-9a-f-]{36}$/i.test(body?.meta?.request_id??'')?body.meta.request_id:undefined});}
let refreshing:Promise<{user:{username:string}|null;generation?:string}>|undefined;
let clientScope:{owner:string;generation:string}|null=null;
let scopeRevision=0;
export function setClientSession(owner:string,generation:string){if(clientScope?.owner!==(generation?owner:undefined)||clientScope?.generation!==(generation?generation:undefined))scopeRevision++;clientScope=generation?{owner,generation}:null;}
export function clientSessionMatches(owner:string,generation?:string){return clientScope?clientScope.owner===owner&&clientScope.generation===(generation??''):!owner&&!generation;}
function currentGeneration(owner:string){return clientScope?.owner===owner?clientScope.generation:activeSessionGeneration(owner);}
function csrf(){try{const values=document.cookie.split(';').map(v=>v.trim()).filter(v=>v.startsWith('gw_csrf='));return values.length===1?decodeURIComponent(values[0].slice(8)):''}catch{return ''}}
async function request(path:string,username:string,init:RequestInit){
 const mutating=!['GET','HEAD','OPTIONS'].includes((init.method??'GET').toUpperCase());
 if(mutating&&path!=='/auth/logout'&&clientUpdateRequired())throw new ApiError('CLIENT_UPDATE_REQUIRED');
 const headers=new Headers(init.headers);clientVersionHeaders(headers);
 if(!headers.has('Content-Type'))headers.set('Content-Type','application/json');
 if(username){headers.set('X-Client-Account',username);const generation=currentGeneration(username);if(generation&&!headers.has('X-Client-Session'))headers.set('X-Client-Session',generation);}
 if(mutating)headers.set('X-CSRF-Token',csrf());
 // Separate current public responses from older unversioned CDN entries.
 const target=new URL(BASE+path,'https://gw.invalid');
 if((init.method??'GET').toUpperCase()==='GET'&&['/manifest','/plans','/crypto/catalog','/activity','/statistics','/transparency','/help'].includes(path.split('?')[0]))target.searchParams.set('_gw_wire',String(APP_WIRE_VERSION));
 const response=await fetch(target.pathname+target.search,{...init,headers,credentials:'same-origin',cache:'no-store'});
 if(!observeServerVersion(response.headers)&&response.status!==401&&path!=='/auth/logout'){await response.body?.cancel();throw new ApiError('CLIENT_UPDATE_REQUIRED');}
 return response;
}
async function coordinatedRefresh(){
 if(!refreshing){refreshing=withRefreshLock(async()=>{
  const signal=AbortSignal.timeout(8000),present=await request('/auth/session','',{signal});
  const snapshot=await present.json().catch(()=>null);
  if(present.ok&&snapshot?.data?.user&&!snapshot.data.requires_mfa)return snapshot.data;
  const r=await request('/auth/refresh','',{method:'POST',body:'{}',signal});const body=await r.json().catch(()=>null);
  if(!r.ok)throw responseError(body,'UNAUTHENTICATED');return body.data;
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
 assertScope();if(response.status===401&&username)clearActiveUserScope(username,generation??undefined);const body=await response.json().catch(()=>null);assertScope();if(!response.ok)throw responseError(body,response.status===401?'UNAUTHENTICATED':'INTERNAL_ERROR');if(!body)throw new ApiError('INTERNAL_ERROR');return body.data as T;
}
export function mutation<T>(path:string,username:string,body:unknown,method='POST'){return api<T>(path,username,{method,headers:{'Idempotency-Key':crypto.randomUUID()},body:JSON.stringify(body)});}

/** Explicit scoped binary transfers never refresh/replay an upload. */
export async function privateTransfer(path:string,username:string,init:RequestInit){
 const generation=currentGeneration(username),revision=scopeRevision;
 const check=()=>{if(revision!==scopeRevision||!clientSessionMatches(username,generation??undefined))throw new ApiError('VERSION_CONFLICT');};
 check();const response=await request(path,username,init);
 try{check()}catch(error){await response.body?.cancel();throw error;}
 if(!response.ok){const body=await response.json().catch(()=>null);check();throw responseError(body);}
 const body=response.body?.pipeThrough(new TransformStream<Uint8Array,Uint8Array>({transform(chunk,controller){check();controller.enqueue(chunk)},flush(){check()}}));
 return new Response(body??null,{status:response.status,statusText:response.statusText,headers:response.headers});
}
