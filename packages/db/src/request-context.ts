import {AsyncLocalStorage} from 'node:async_hooks';
import crypto from 'node:crypto';
const contexts=new AsyncLocalStorage<{requestId:string}>();
export function activeRequestId(){return contexts.getStore()?.requestId;}
export function currentRequestId(){return activeRequestId()??crypto.randomUUID();}
/** Generated at HTTP admission or restored from trusted persisted job origin;
 * client-provided correlation headers never grant or determine authority. */
export function withRequestContext<T>(fn:()=>T,origin?:string|null){
 const requestId=origin&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(origin)?origin:crypto.randomUUID();
 return contexts.run({requestId},fn);
}
