import {runtimeProviders} from '@gifters/config';
import {boundedJson} from './request-body';
import {recoveryStatementView} from './liability-recovery';
import { and,eq,sql } from 'drizzle-orm';
import { z } from 'zod';
import { users,authSessions,authFactors,readManifest,withContext } from '@gifters/db';
import { authenticate,authResponse,clearCookies,cookie,csrf,databaseNow,issueSession,logout,origin,refreshSession,setCookie,setupFactor,userDto,validateUsername,verifyFactor } from './auth';
import { randomToken,hash } from './auth-crypto';
import { enforceRate } from './rate-limits';
import { startGoogle,finishGoogle } from './google-auth';
async function body(request:Request){return boundedJson(request)}
export async function handleAuthRequest(method:string,path:string,request:Request):Promise<Response>{
 if(method==='GET'&&path==='/auth/session'){
  await enforceRate(request,'auth','session-bootstrap');
  origin(request);let identity;try{identity=await authenticate(request)}catch{/* An anonymous bootstrap has no authority. */}
  const response=authResponse(identity?{user:userDto(identity.user),generation:identity.session?.generation??'tool',requires_mfa:false,provider:runtimeProviders().AUTH_PROVIDER}:{user:null,requires_mfa:!!cookie(request,'gw_pre_auth'),provider:runtimeProviders().AUTH_PROVIDER,can_refresh:!!cookie(request,'gw_refresh')});
  if(!identity&&!cookie(request,'gw_csrf'))setCookie(response,request,'gw_csrf',randomToken(),'/',300,false);
  return response;
 }
 if(method==='GET'&&path==='/auth/2fa/status'){const identity=await authenticate(request);const [factor]=await withContext({access:'service'},tx=>tx.select({active:authFactors.active}).from(authFactors).where(eq(authFactors.userId,identity.user.id)).limit(1));return authResponse({enrolled:!!factor?.active,step_up_at:identity.session?.stepUpAt??null});}
 if(method==='GET'&&path==='/auth/google/start')return startGoogle(request);
 if(method==='GET'&&path==='/auth/google/callback')return finishGoogle(request);
 if(method!=='POST')throw new Error('NOT_FOUND');
 if(path==='/auth/recovery/statement'){csrf(request);const input=z.object({recovery_id:z.string().uuid(),token:z.string().regex(/^[A-Za-z0-9_-]{43}$/)}).strict().parse(await body(request));await enforceRate(request,'auth',hash(input.token));return authResponse(await withContext({access:'service'},tx=>recoveryStatementView(tx,input.recovery_id,input.token)));}
 if(path==='/auth/cancel'){csrf(request);const response=authResponse({user:null,provider:runtimeProviders().AUTH_PROVIDER});setCookie(response,request,'gw_pre_auth','','/api/v1/auth',0);return response;}
 if(path==='/auth/refresh'){await enforceRate(request,'auth',hash(cookie(request,'gw_refresh')));return refreshSession(request);}
 if(path==='/auth/simulation/session'||path==='/auth/simulation/signup'){
  if((runtimeProviders().AUTH_PROVIDER)!=='simulation'||process.env.APP_ENV!=='simulation')throw new Error('FEATURE_DISABLED');csrf(request);await enforceRate(request,'auth','simulation');
  const input=z.object({username:z.string().min(1).max(64),locale:z.enum(['en','fr']).optional()}).strict().parse(await body(request));
  const user=await withContext({access:'service'},async tx=>{
   if(path.endsWith('/signup')){await validateUsername(tx,input.username);const [existing]=await tx.select({id:users.id}).from(users).where(eq(users.username,input.username)).limit(1);if(existing)throw new Error('VERSION_CONFLICT');return (await tx.insert(users).values({username:input.username,email:input.username+'@example.invalid',locale:input.locale??'en'}).returning())[0];}
   return (await tx.select().from(users).where(eq(users.username,input.username)).limit(1))[0];
  });if(!user)throw new Error('UNAUTHENTICATED');
  // Account switches revoke the old family before issuing the selected identity.
  let old;try{old=await authenticate(request)}catch{/* First login. */}if(old?.session)await withContext({access:'service'},async tx=>{const now=await databaseNow(tx);await tx.update(authSessions).set({revokedAt:sql`coalesce(${authSessions.revokedAt},${now.toISOString()}::timestamptz)`}).where(eq(authSessions.id,old.session!.id));});
  return issueSession(request,user.id);
 }
 if(path==='/auth/2fa/verify'){
  const input=z.object({code:z.string().min(6).max(100),recovery:z.boolean().optional()}).strict().parse(await body(request));return verifyFactor(request,input.code,input.recovery??false);
 }
 if(path==='/auth/2fa/setup'){const identity=await authenticate(request);z.object({}).strict().parse(await body(request));return setupFactor(request,identity);}
 if(path==='/auth/logout'||path==='/auth/logout-all'){z.object({}).strict().parse(await body(request));return logout(request,path.endsWith('-all'));}
 throw new Error('NOT_FOUND');
}
