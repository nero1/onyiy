import {z} from 'zod';
import {hash,seal,unseal} from './auth-crypto';
const position=z.object({after:z.string().uuid(),expires:z.number().int().positive()}).strict();
export const staffCursor=z.string().regex(/^[A-Za-z0-9_-]+$/).max(512).optional();
/** A cursor selects a page; ordinary staff authentication still runs on every
 * request. Its authenticated scope prevents changing filters or account. */
export function staffPageScope(actor:string,collection:string,filter:unknown){return 'staff-page:v1:'+hash(JSON.stringify([process.env.APP_ENV??'simulation',actor,collection,filter]));}
export function staffPageAfter(cursor:string|undefined,scope:string){
 if(!cursor)return undefined;
 try{const parsed=position.parse(JSON.parse(unseal(staffCursor.parse(cursor)!,'AUTH_ACCESS_KEY',scope)));if(parsed.expires<=Date.now())throw new Error();return parsed.after;}catch{throw new Error('INVALID_INPUT');}
}
export function staffPage<T extends {id:string}>(rows:T[],size:number,scope:string){const page=rows.slice(0,size);return {rows:page,next_cursor:rows.length>size?seal(JSON.stringify({after:page.at(-1)!.id,expires:Date.now()+15*60*1000}),'AUTH_ACCESS_KEY',scope):null};}

export function staffPositionAfter<T>(cursor:string|undefined,scope:string,validator:z.ZodType<T>){
 if(!cursor)return undefined;
 try{const parsed=z.object({after:validator,expires:z.number().int().positive()}).strict().parse(JSON.parse(unseal(staffCursor.parse(cursor)!,'AUTH_ACCESS_KEY',scope)));if(parsed.expires<=Date.now())throw new Error();return parsed.after;}catch{throw new Error('INVALID_INPUT');}
}
export function staffPositionCursor(after:unknown,scope:string){
 const content=JSON.stringify({after,expires:Date.now()+15*60*1000});
 if(Buffer.byteLength(content)>256)throw new Error('INVALID_INPUT');
 return seal(content,'AUTH_ACCESS_KEY',scope);
}
