import crypto from 'node:crypto';
import {environmentKey,equalText} from './auth-crypto';
function signature(scope:string,value:string){const key=environmentKey('AUTH_ACCESS_KEY');try{return crypto.createHmac('sha256',key).update('private-cursor-v1:'+scope+':'+value).digest('base64url')}finally{key.fill(0)}}
export function encodePrivateCursor(scope:string,value:unknown){const body=Buffer.from(JSON.stringify({value,expires:Math.floor(Date.now()/1000)+3600})).toString('base64url');return body+'.'+signature(scope,body);}
export function decodePrivateCursor(scope:string,cursor:string):unknown{
 try{if(cursor.length>1024)throw Error();const [body,mac,...rest]=cursor.split('.');if(rest.length||!body||!mac||!equalText(mac,signature(scope,body)))throw Error();const parsed=JSON.parse(Buffer.from(body,'base64url').toString());if(!Number.isSafeInteger(parsed.expires)||parsed.expires<=Date.now()/1000)throw Error();return parsed.value;}catch{throw new Error('INVALID_INPUT');}
}
