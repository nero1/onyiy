import {runtimeProviders} from '@gifters/config';
import crypto from 'node:crypto';
import { and,eq,sql } from 'drizzle-orm';
import { z } from 'zod';
import { authFlows,userIdentities,users,readManifest,withContext } from '@gifters/db';
import { authResponse,cookie,databaseNow,issueSession,normalizeUsername,origin,setCookie,validateUsername } from './auth';
import { equalText,hash,randomToken,seal,unseal } from './auth-crypto';
import { enforceRate } from './rate-limits';
function configuration(request:Request){if(runtimeProviders().AUTH_PROVIDER!=='google')throw new Error('FEATURE_DISABLED');const client=process.env.GOOGLE_CLIENT_ID??'',secret=process.env.GOOGLE_CLIENT_SECRET??'';if(!client||client.length>300||!secret||secret.length>300)throw new Error('PROVIDER_UNAVAILABLE');return {client,secret,redirect:origin(request)+'/api/v1/auth/google/callback'};}
async function boundedJson(response:Response){if(!response.ok||!response.body)throw new Error('PROVIDER_UNAVAILABLE');const reader=response.body.getReader();let size=0;const chunks:Uint8Array[]=[];try{while(true){const row=await reader.read();if(row.done)break;size+=row.value.length;if(size>65536)throw new Error('PROVIDER_UNAVAILABLE');chunks.push(row.value)}return JSON.parse(Buffer.concat(chunks).toString('utf8'));}finally{await reader.cancel().catch(()=>{})}}
let jwks: {expires:number;keys:JsonWebKey[]}|undefined;let loading:Promise<JsonWebKey[]>|undefined;
async function googleKeys(){if(jwks&&jwks.expires>Date.now())return jwks.keys;if(!loading){loading=(async()=>{const value=await boundedJson(await fetch('https://www.googleapis.com/oauth2/v3/certs',{signal:AbortSignal.timeout(5000),redirect:'error',cache:'no-store'}));if(!Array.isArray(value.keys)||value.keys.length<1||value.keys.length>16)throw new Error('PROVIDER_UNAVAILABLE');jwks={keys:value.keys,expires:Date.now()+300000};return jwks.keys;})();void loading.finally(()=>{loading=undefined}).catch(()=>{});}return loading;}
export function verifyGoogleIdentity(token:string,client:string,nonceHash:string,keys:JsonWebKey[]){
 try{if(token.length>8192)throw Error();const parts=token.split('.');if(parts.length!==3||!parts.every(p=>/^[A-Za-z0-9_-]+$/.test(p)))throw Error();const header=JSON.parse(Buffer.from(parts[0],'base64url').toString());if(header.alg!=='RS256'||typeof header.kid!=='string')throw Error();const key=keys.find((candidate:any)=>candidate.kid===header.kid&&candidate.kty==='RSA'&&(!candidate.use||candidate.use==='sig')&&(!candidate.alg||candidate.alg==='RS256'));if(!key||!crypto.verify('RSA-SHA256',Buffer.from(parts[0]+'.'+parts[1]),crypto.createPublicKey({key:key as crypto.JsonWebKey,format:'jwk'}),Buffer.from(parts[2],'base64url')))throw Error();
  const value=z.object({iss:z.enum(['https://accounts.google.com','accounts.google.com']),aud:z.string(),sub:z.string().min(1).max(255),exp:z.number().int(),iat:z.number().int(),nonce:z.string().max(100),email:z.string().email().max(254),email_verified:z.literal(true),name:z.string().max(200).optional(),locale:z.string().max(20).optional(),azp:z.string().optional()}).passthrough().parse(JSON.parse(Buffer.from(parts[1],'base64url').toString()));const now=Math.floor(Date.now()/1000);if(value.aud!==client||(value.azp&&value.azp!==client)||value.exp<=now||value.iat>now+30||value.exp<=value.iat||value.exp-value.iat>7200||hash(value.nonce)!==nonceHash)throw Error();return value;
 }catch{throw new Error('INVALID_PROOF')}
}
export async function startGoogle(request:Request){const config=configuration(request);await enforceRate(request,'auth','google');const state=randomToken(),nonce=randomToken(),verifier=randomToken();await withContext({access:'service'},async tx=>{const now=await databaseNow(tx);await tx.insert(authFlows).values({stateHash:hash(state),nonceHash:hash(nonce),verifierCipher:seal(verifier,'AUTH_ACCESS_KEY','flow:'+hash(state)),expiresAt:new Date(now.getTime()+(await readManifest(tx)).auth_session_policy.preauth_minutes*60000)});});const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');for(const [key,value]of Object.entries({client_id:config.client,redirect_uri:config.redirect,response_type:'code',scope:'openid email profile',state,nonce,code_challenge:hashBase64(verifier),code_challenge_method:'S256',prompt:'select_account'}))url.searchParams.set(key,value);const response=new Response(null,{status:302,headers:{Location:url.toString(),'Cache-Control':'private, no-store'}});setCookie(response,request,'gw_oauth_state',state,'/api/v1/auth/google',300);return response;}
const hashBase64=(value:string)=>crypto.createHash('sha256').update(value).digest('base64url');
export async function finishGoogle(request:Request){
 await enforceRate(request,'auth','google-callback');
 const config=configuration(request);const params=new URL(request.url).searchParams;let response:Response;
 try{const state=params.get('state')??'',code=params.get('code')??'';if(!/^[A-Za-z0-9_-]{43}$/.test(state)||!equalText(state,cookie(request,'gw_oauth_state'))||code.length<1||code.length>2048||params.getAll('state').length!==1||params.getAll('code').length!==1)throw new Error('INVALID_PROOF');
  const flow=await withContext({access:'service'},async tx=>{const [row]=await tx.select().from(authFlows).where(eq(authFlows.stateHash,hash(state))).limit(1);if(!row||row.usedAt||row.expiresAt<=await databaseNow(tx))throw new Error('INVALID_PROOF');return row;});
  const verifier=unseal(flow.verifierCipher,'AUTH_ACCESS_KEY','flow:'+flow.stateHash);const tokens=await boundedJson(await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:config.client,client_secret:config.secret,code,redirect_uri:config.redirect,grant_type:'authorization_code',code_verifier:verifier}),signal:AbortSignal.timeout(5000),redirect:'error',cache:'no-store'}));const identity=verifyGoogleIdentity(tokens.id_token,config.client,flow.nonceHash,await googleKeys());
  const user=await withContext({access:'service'},async tx=>{const [locked]=await tx.select().from(authFlows).where(eq(authFlows.stateHash,flow.stateHash)).limit(1).for('update');if(locked.usedAt||locked.expiresAt<=await databaseNow(tx))throw new Error('INVALID_PROOF');await tx.update(authFlows).set({usedAt:await databaseNow(tx)}).where(eq(authFlows.stateHash,flow.stateHash));await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${"google:"+identity.sub},0))`);const [existing]=await tx.select({user:users}).from(userIdentities).innerJoin(users,eq(users.id,userIdentities.userId)).where(and(eq(userIdentities.provider,'google'),eq(userIdentities.subject,identity.sub))).limit(1);if(existing)return existing.user;
   const policy=(await readManifest(tx)).identity_policy;
   const stem=normalizeUsername(identity.name??identity.email.split('@')[0]).slice(0,policy.username_max);
   let created:typeof users.$inferSelect|undefined;
   for(let attempt=0;attempt<policy.collision_attempts;attempt++){
    const suffix=attempt?crypto.randomBytes(32).toString('hex').slice(0,Math.min(12,policy.username_max)):'';
    const base=attempt>Math.floor(policy.collision_attempts/2)?'u':stem||'u';
    const username=(base.slice(0,Math.max(0,policy.username_max-suffix.length))+suffix).padEnd(policy.username_min,'0').slice(0,policy.username_max);
    try{await validateUsername(tx,username)}catch{continue}
    [created]=await tx.insert(users).values({username,email:identity.email.toLowerCase(),locale:identity.locale?.startsWith('fr')?'fr':'en'}).onConflictDoNothing({target:users.username}).returning();
    if(created)break;
   }
   if(!created)throw new Error('VERSION_CONFLICT');
   await tx.insert(userIdentities).values({userId:created.id,provider:'google',subject:identity.sub});return created;
  });
  response=await issueSession(request,user.id);response=new Response(null,{status:302,headers:response.headers});response.headers.set('Location',origin(request)+'/');
 }catch{response=new Response(null,{status:302,headers:{Location:origin(request)+'/?auth_error=1','Cache-Control':'private, no-store'}});}
 setCookie(response,request,'gw_oauth_state','','/api/v1/auth/google',0);return response;
}
