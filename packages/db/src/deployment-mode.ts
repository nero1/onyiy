import {eq,ne,sql} from 'drizzle-orm';
import type {DbExecutor} from './index';
import {environmentInstances,xManifest} from './schema';
const modeLock='gw:shared-database:payment-mode:v1';

export async function fenceApplicationEnvironment(tx:DbExecutor,environment:string){
 const [state]=await tx.execute<{installed:boolean;guarded:boolean}>(sql`select pg_advisory_xact_lock_shared(hashtextextended(${modeLock},0)),to_regclass('public.environment_instances') is not null as installed,to_regprocedure('public.gw_runtime_environment_allowed()') is not null as guarded`);
 if(!state?.installed)return; // Owner/runtime binding proof before a fresh installation.
 if(!state.guarded)throw new Error('DATABASE_SCHEMA_MISMATCH');
 await tx.execute(sql`select set_config('gw.environment',${environment},true)`);
 // Detect a promotion committed after a repeatable snapshot began. Promotion
 // updates this row under the same profile→mode lock order without changing copy.
 await tx.select({key:xManifest.key}).from(xManifest).where(eq(xManifest.key,'deployment_profile')).for('share');
 const [active]=await tx.execute<{allowed:boolean}>(sql`select public.gw_runtime_environment_allowed() as allowed`);
 if(!active?.allowed)throw new Error('FINANCIAL_ENVIRONMENT_DENIED');
}
export async function fenceSimulationDatabase(tx:DbExecutor){return fenceApplicationEnvironment(tx,'simulation');}

export async function fenceOwnerInitialization(tx:DbExecutor,environment:string){
 await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended('gw-release-profile',0))`);
 await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${modeLock},0))`);
 if(environment==='simulation'){
  if((await tx.select({id:environmentInstances.instanceId}).from(environmentInstances).where(ne(environmentInstances.environment,'simulation')).limit(1)).length)throw new Error('FINANCIAL_ENVIRONMENT_DENIED');
 }else{
  if(environment!=='testnet'&&environment!=='mainnet')throw new Error('FINANCIAL_ENVIRONMENT_DENIED');
  if(environment==='testnet'&&(await tx.select({id:environmentInstances.instanceId}).from(environmentInstances).where(eq(environmentInstances.environment,'mainnet')).limit(1)).length)throw new Error('FINANCIAL_ENVIRONMENT_DENIED');
  const [profile]=await tx.select({value:xManifest.value}).from(xManifest).where(eq(xManifest.key,'deployment_profile')).limit(1);
  if(environment==='mainnet'&&profile?.value!=='transparent')throw new Error('TRANSPARENCY_REQUIRED');
  await tx.update(xManifest).set({value:sql`${xManifest.value}`}).where(eq(xManifest.key,'deployment_profile'));
 }
}
