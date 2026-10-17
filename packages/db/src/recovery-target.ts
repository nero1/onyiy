import type {Sql} from 'postgres';

/** An empty, unpublished application namespace is required. Supabase keeps
 * provider-owned connection pools open even in a new project. Ignore only
 * their known idle clients with no transaction, identified by both provider
 * schemas. Unknown clients, open transactions and active clients still block;
 * never terminate another session or infer safety from application_name. */
export async function ensureRecoveryTargetEmpty(owner:Sql){
 const tables=await owner<{name:string}[]>`select c.relname as name from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p','v','m','S','f') limit 1`;
 const functions=await owner`select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and not exists(select 1 from pg_depend d where d.objid=p.oid and d.classid='pg_proc'::regclass and d.deptype='e') limit 1`;
 if(tables.length||functions.length)throw new Error('RECOVERY_TARGET_NOT_EMPTY');
 const clients=await owner`select pid from pg_stat_activity where datname=current_database() and pid<>pg_backend_pid() and (
   backend_type='client backend' and usename in ('authenticator','supabase_auth_admin','supabase_storage_admin','supabase_admin')
   and state='idle' and xact_start is null
   and to_regnamespace('auth') is not null and to_regnamespace('storage') is not null
 ) is not true limit 1`;
 if(clients.length)throw new Error('RECOVERY_TARGET_ACTIVE');
}
