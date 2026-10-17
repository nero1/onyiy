import crypto from 'node:crypto';
import postgres from 'postgres';
import {drizzle} from 'drizzle-orm/postgres-js';
import {sql} from 'drizzle-orm';
import {schema} from './schema';
import type {DbExecutor} from './index';
import {assertRuntimeRole} from './runtime-role';
import {databaseConnectionOptions} from './connection-options';
import {databaseScopeFingerprint} from './binding-fingerprint';
import {fenceApplicationEnvironment} from './deployment-mode';
import {withBoundedTransaction} from './execution-budget';

/** Recovery authority is separate from the web/payment runtime. It never
 * enables an adapter, signer, scheduler or published application deployment. */
export function recoveryEnvironment(env:NodeJS.ProcessEnv=process.env){
 const environment=env.APP_ENV??'';
 if(!['simulation','testnet','mainnet'].includes(environment)||env.MAINNET_ENABLED!=='false'||env.SIGNER_PROVIDER!=='disabled'||env.VERCEL==='1'||env.PUBLIC_PREVIEW_MODE==='read_only'||env.RECOVERY_CONFIRM!==`isolated-${environment}`)throw new Error('RECOVERY_ENVIRONMENT_INVALID');
 if(env.SCHEDULER_HMAC_KEY||env.SCHEDULER_HMAC_PREVIOUS_KEY)throw new Error('RECOVERY_SCHEDULER_MUST_BE_OFF');
 for(const name of ['SIGNER_DECRYPTION_SECRET','SIGNER_KEY_FILE','SIGNED_PAYLOAD_ENCRYPTION_KEY','FINANCIAL_WORKER_AUTH_KEY'])if(env[name])throw new Error('RECOVERY_SIGNER_MUST_BE_OFF');
 return environment as 'simulation'|'testnet'|'mainnet';
}
export function recoveryMaintenance(){
 const environment=recoveryEnvironment(),runtimeUrl=process.env.DATABASE_URL,ownerUrl=process.env.DATABASE_MIGRATION_URL;
 if(!ownerUrl)throw new Error('DATABASE_MIGRATION_URL_REQUIRED');
 if(!runtimeUrl)throw new Error('CONFIGURATION_INVALID');
 const runtimeOptions=databaseConnectionOptions(runtimeUrl),ownerOptions=databaseConnectionOptions(ownerUrl);
 const owner=postgres(ownerUrl,{...ownerOptions,max:1,prepare:false,onnotice:()=>{}}),database=drizzle(owner,{schema});
 let runtime:ReturnType<typeof postgres>|undefined;
 const runtimePids=new Set<number>();
 function assertScope(){if(recoveryEnvironment()!==environment||process.env.DATABASE_URL!==runtimeUrl||process.env.DATABASE_MIGRATION_URL!==ownerUrl)throw new Error('RECOVERY_ENVIRONMENT_INVALID');}
 async function readRuntime<T>(fn:(tx:DbExecutor)=>Promise<T>,probe=false){
  assertScope();runtime??=postgres(runtimeUrl!,{...runtimeOptions,max:1,prepare:false,onnotice:()=>{}});
  return drizzle(runtime,{schema}).transaction(raw=>withBoundedTransaction(raw,async tx=>{
   const [connection]=await tx.execute<{pid:number}>(sql`select pg_backend_pid() as pid`);runtimePids.add(connection.pid);
   await tx.execute(sql`set local search_path=pg_catalog,public,pg_temp`);
   await tx.execute(sql`set local statement_timeout='2000ms'`);
   await tx.execute(sql`set local lock_timeout='1500ms'`);
   await assertRuntimeRole(tx);
   await tx.execute(sql`select pg_advisory_xact_lock_shared(hashtextextended('gw-release-profile',0))`);
   await tx.execute(sql`set local role gw_service`);
   if(!probe)await fenceApplicationEnvironment(tx,environment);
   await tx.execute(sql`set transaction read only`);
   await tx.execute(sql`select set_config('gw.environment',${environment},true),set_config('gw.access','service',true),set_config('gw.actor_id','',true),set_config('gw.database_binding',${databaseScopeFingerprint(runtimeUrl!)},true)`);
   return fn(tx);
  }),{isolationLevel:'repeatable read',accessMode:'read write'});
 }
 async function verifyBinding(){
  assertScope();const challenge=crypto.randomBytes(16),keys=[challenge.readBigInt64BE(0),challenge.readBigInt64BE(8)];if(keys[0]===keys[1])keys[1]=BigInt.asIntN(64,keys[1]+1n);
  const parts=keys.map(key=>{const bits=BigInt.asUintN(64,key);return {high:(bits>>32n).toString(),low:(bits&0xffffffffn).toString()}});
  try{await database.transaction(async tx=>{
   await tx.execute(sql`set local statement_timeout='2000ms'`);
   const [session]=await tx.execute<{pid:number}>(sql`select pg_advisory_xact_lock(${keys[0].toString()}::bigint),pg_advisory_xact_lock(${keys[1].toString()}::bigint),pg_backend_pid() as pid`);
   const matched=await readRuntime(async reader=>{const [row]=await reader.execute<{matched:boolean}>(sql`select exists(select 1 from pg_locks where locktype='advisory' and database=(select oid from pg_database where datname=current_database()) and pid=${session.pid} and classid=${parts[0].high}::oid and objid=${parts[0].low}::oid and objsubid=1 and mode='ExclusiveLock' and granted) and exists(select 1 from pg_locks where locktype='advisory' and database=(select oid from pg_database where datname=current_database()) and pid=${session.pid} and classid=${parts[1].high}::oid and objid=${parts[1].low}::oid and objsubid=1 and mode='ExclusiveLock' and granted) as matched`);return row?.matched},true);
   if(!matched)throw new Error('DATABASE_NAMESPACE_MISMATCH');
  });}finally{challenge.fill(0)}
 }
 async function closeRuntime(){
  if(runtime)await runtime.end({timeout:3});runtime=undefined;
  // Driver shutdown can resolve before the server removes that backend from
  // pg_stat_activity. Wait only for our known proof sessions; never relax the
  // empty-target check or terminate another client's connection.
  const deadline=Date.now()+1500;
  while(runtimePids.size){
   const rows=await owner<{pid:number}[]>`select pid from pg_stat_activity where pid in ${owner([...runtimePids])}`;
   if(!rows.length){runtimePids.clear();return;}
   if(Date.now()>=deadline)throw new Error('RECOVERY_TARGET_ACTIVE');
   await new Promise(resolve=>setTimeout(resolve,25));
  }
 }
 return {owner,database,environment,readRuntime,verifyBinding,closeRuntime,async close(){try{await closeRuntime()}finally{await owner.end({timeout:3})}}};
}
