import {sql} from 'drizzle-orm';
import {performance} from 'node:perf_hooks';
import {parsePublicManifest,validateRuntimeEnv} from '@gifters/config';
import {admissionFor} from './work-budget';
import {databaseConnectionOptions} from './connection-options';
import type {Database,DbExecutor} from './index';
import {xManifest} from './schema';
import {withBoundedTransaction,remainingExecutionTime} from './execution-budget';

/** Public preview uses a separate login with only gw_preview membership.
 * This primitive grants no authentication, financial or mutation capability. */
export async function publicPreviewTransaction<T>(database:Database,environment:'simulation'|'testnet'|'mainnet',fn:(tx:DbExecutor)=>Promise<T>){
 if(!['simulation','testnet','mainnet'].includes(environment))throw new Error('CONFIGURATION_INVALID');
 const config=validateRuntimeEnv();
 return admissionFor(database,databaseConnectionOptions(config.databaseUrl).max).run(performance.now()+Math.min(1500,remainingExecutionTime()),()=>database.transaction(raw=>withBoundedTransaction(raw,async tx=>{
  await tx.execute(sql`set local search_path=pg_catalog,public,pg_temp`);
  await tx.execute(sql`set local statement_timeout='3000ms'`);
  await tx.execute(sql`set local lock_timeout='1500ms'`);
  const [role]=await tx.execute<{safe:boolean}>(sql`
   select not(r.rolsuper or r.rolbypassrls or r.rolcreatedb or r.rolcreaterole or r.rolinherit or r.rolreplication)
   and exists(select 1 from pg_auth_members m join pg_roles p on p.oid=m.roleid where m.member=r.oid and p.rolname='gw_preview')
   and not exists(select 1 from pg_auth_members m join pg_roles p on p.oid=m.roleid where m.member=r.oid and (p.rolname<>'gw_preview' or m.admin_option or coalesce((to_jsonb(m)->>'inherit_option')::boolean,false)))
   and not exists(select 1 from pg_roles p where p.rolname='gw_preview' and (p.rolcanlogin or p.rolinherit or p.rolsuper or p.rolcreatedb or p.rolcreaterole or p.rolbypassrls or p.rolreplication))
   and not exists(select 1 from pg_auth_members m join pg_roles p on p.oid=m.member where p.rolname='gw_preview')
   and not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_roles p on p.oid=c.relowner where n.nspname='public' and p.rolname in(session_user,'gw_preview'))
   and not exists(select 1 from pg_proc f join pg_namespace n on n.oid=f.pronamespace join pg_roles p on p.oid=f.proowner where n.nspname='public' and p.rolname in(session_user,'gw_preview'))
   and not exists(select 1 from pg_database d join pg_roles p on p.oid=d.datdba where d.datname=current_database() and p.rolname in(session_user,'gw_preview'))
   and not exists(select 1 from pg_namespace n join pg_roles p on p.oid=n.nspowner where n.nspname='public' and p.rolname in(session_user,'gw_preview'))
   and not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace cross join (values(session_user::text),('gw_preview'::text)) identities(name) where n.nspname='public' and c.relkind in('r','p','v','m','f') and (has_table_privilege(identities.name,c.oid,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') or has_any_column_privilege(identities.name,c.oid,'INSERT,UPDATE,REFERENCES') or (c.relname not in('x_manifest','plans','assets','plan_versions','help_articles','slug_redirects') and (has_table_privilege(identities.name,c.oid,'SELECT') or has_any_column_privilege(identities.name,c.oid,'SELECT')))))
   and not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace cross join (values(session_user::text),('gw_preview'::text)) identities(name) where n.nspname='public' and not exists(select 1 from pg_depend d where d.classid='pg_proc'::regclass and d.objid=p.oid and d.deptype='e') and has_function_privilege(identities.name,p.oid,'EXECUTE'))
   as safe from pg_roles r where r.rolname=session_user`);
  if(!role?.safe)throw new Error('PREVIEW_DATABASE_ROLE_DENIED');
  await tx.execute(sql`set local role gw_preview`);
  await tx.execute(sql`select set_config('gw.environment',${environment},true),set_config('gw.access','public',true),set_config('gw.actor_id','',true)`);
  return fn(tx);
 }),{isolationLevel:'repeatable read',accessMode:'read only'}));
}

export async function publicPreviewManifest(tx:DbExecutor){
 const rows=await tx.select({key:xManifest.key,value:xManifest.value,scope:xManifest.scope}).from(xManifest);
 if(rows.some(row=>row.scope!=='public'))throw new Error('PREVIEW_DATABASE_ROLE_DENIED');
 return parsePublicManifest(Object.fromEntries(rows.map(row=>[row.key,row.value])));
}
