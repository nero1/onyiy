import { clearActiveUserScope,activeSessionGeneration } from './storage';
const BASE='/api/v1';
export class ApiError extends Error{constructor(public code:string,message?:string){super(message??code);}}
let refreshing:Promise<{user:{username:string}|null}>|undefined;
function csrf(){try{const values=document.cookie.split(';').map(v=>v.trim()).filter(v=>v.startsWith('gw_csrf='));return values.length===1?decodeURIComponent(values[0].slice(8)):''}catch{return ''}}
async function request(path:string,username:string,init:RequestInit){const headers=new Headers(init.headers);headers.set('Content-Type','application/json');if(username){headers.set('X-Client-Account',username);const generation=activeSessionGeneration(username);if(generation)headers.set('X-Client-Session',generation);}if((init.method??'GET').toUpperCase()!=='GET')headers.set('X-CSRF-Token',csrf());return fetch(BASE+path,{...init,headers,credentials:'same-origin',cache:'no-store'});}
export async function api<T>(path:string,username:string,init:RequestInit={}){
 let response=await request(path,username,init);
 if(response.status===401&&!path.startsWith('/auth/')){
  if(!refreshing){refreshing=(async()=>{const r=await request('/auth/refresh','',{method:'POST',body:'{}'});const body=await r.json().catch(()=>null);if(!r.ok)throw new ApiError(body?.error?.code??'UNAUTHENTICATED');return body.data;})();const current=refreshing;void current.finally(()=>{if(refreshing===current)refreshing=undefined}).catch(()=>{});}
  try{const refreshed=await refreshing;if(username&&refreshed.user?.username!==username)throw new ApiError('VERSION_CONFLICT');response=await request(path,username,init);}catch(error){if(username)clearActiveUserScope(username);throw error;}
 }
 if(response.status===401&&username)clearActiveUserScope(username);const body=await response.json().catch(()=>null);if(!response.ok)throw new ApiError(body?.error?.code??(response.status===401?'UNAUTHENTICATED':'INTERNAL_ERROR'));if(!body)throw new ApiError('INTERNAL_ERROR');return body.data as T;
}
export function mutation<T>(path:string,username:string,body:unknown,method='POST'){return api<T>(path,username,{method,headers:{'Idempotency-Key':crypto.randomUUID()},body:JSON.stringify(body)});}
