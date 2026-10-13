import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getTableColumns, is, sql } from 'drizzle-orm';
import { getTableConfig, PgTable } from 'drizzle-orm/pg-core';
import { manifestDefinition } from '@gifters/config';
import { readManifest, schema, type DbExecutor } from './index';

export function canonical(value:unknown):string {
  if (value===null || typeof value!=='object') return JSON.stringify(typeof value==='bigint'?value.toString():value);
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return '['+value.map(canonical).join(',')+']';
  return '{'+Object.entries(value).sort(([a],[b])=>a.localeCompare(b,'en')).map(([key,item])=>JSON.stringify(key)+':'+canonical(item)).join(',')+'}';
}
export const digest=(value:unknown)=>crypto.createHash('sha256').update(canonical(value)).digest('hex');

export async function migrationFingerprint() {
  const directory=path.join(process.cwd(),'packages/db/src/migrations');
  const files=(await fs.readdir(directory)).filter(name=>name.endsWith('.sql')).sort();
  return digest(await Promise.all(files.map(async name=>({name,sha256:crypto.createHash('sha256').update(await fs.readFile(path.join(directory,name))).digest('hex')}))));
}

export async function recoveryInventory(database:DbExecutor) {
  const manifest=await readManifest(database);
  const tables=Object.values(schema).filter(value=>is(value,PgTable)).sort((a,b)=>getTableConfig(a).name.localeCompare(getTableConfig(b).name,'en'));
  // PostgreSQL catalog inspection is a narrow backup/restore exception. Reject
  // unclassified resources instead of silently omitting future application data.
  const actual=await database.execute<{name:string}>(sql`select c.relname as name from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p') order by c.relname collate "C"`);
  if(canonical(actual.map(row=>row.name).sort())!==canonical(tables.map(table=>getTableConfig(table).name).sort())) throw new Error('RECOVERY_SCHEMA_UNCLASSIFIED');
  const keys=await database.select({key:schema.xManifest.key}).from(schema.xManifest);
  if(keys.some(row=>!manifestDefinition(row.key))) throw new Error('RECOVERY_CONFIG_UNCLASSIFIED');
  const assets=await database.select({environment:schema.assets.environment}).from(schema.assets);
  const environment=process.env.APP_ENV??'simulation';if(!['simulation','testnet'].includes(environment)||assets.some(row=>row.environment!=='simulation'&&(environment!=='testnet'||row.environment!=='testnet'))) throw new Error('RECOVERY_ENVIRONMENT_INVALID');
  const extensions=await database.execute<{name:string;schema:string;version:string}>(sql`select e.extname::text as name,n.nspname::text as schema,e.extversion::text as version from pg_extension e join pg_namespace n on n.oid=e.extnamespace where e.extname='pgcrypto' order by e.extname`);
  if(extensions.length!==1||!['public','extensions'].includes(extensions[0].schema)||extensions[0].version!=='1.3') throw new Error('RECOVERY_SCHEMA_UNCLASSIFIED');
  const records:Record<string,{rows:number;sha256:string}>={};
  for(const table of tables) {
    const config=getTableConfig(table);
    if(['deployment_binding_challenges','auth_sessions','auth_refresh_tokens','auth_flows','rate_limits','wallet_challenges','worker_requests'].includes(config.name)) continue; // Ephemeral connection challenges are never transferable proof.
    const primary=config.primaryKeys.flatMap(key=>key.columns);
    const order=primary.length?primary:config.columns.filter(column=>column.primary);
    if(!order.length) throw new Error('RECOVERY_SCHEMA_UNCLASSIFIED');
    const columns=Object.entries(getTableColumns(table));
    const keys=order.map(column=>columns.find(([,value])=>value.name===column.name)?.[0]);
    if(keys.some(key=>!key)) throw new Error('RECOVERY_SCHEMA_UNCLASSIFIED');
    const hash=crypto.createHash('sha256');let rows=0;let last:Record<string,unknown>|undefined;
    // Indexed keyset pages stay in the same read-only snapshot. Row comparison
    // is a small PostgreSQL expression; all table access remains Drizzle-first.
    while(true) {
      const after=last?sql`(${sql.join(order.map(column=>sql`${column}`),sql`,`)}) > (${sql.join(keys.map(key=>sql`${last![key!]}`),sql`,`)})`:undefined;
      const batch=await database.select().from(table).where(after).orderBy(...order).limit(manifest.export_import_limits.chunk_rows);
      if(!batch.length) break;
      for(const row of batch) {hash.update(canonical(row)+'\n');rows++;}
      last=batch[batch.length-1];
    }
    records[config.name]={rows,sha256:hash.digest('hex')};
  }
  // Names/definitions/ACLs are hashed, not exported as private metadata. Object
  // ownership is normalized so a separately provisioned owner can restore.
  const metadata=await database.execute(sql`select kind,name,definition from (
    select 'relation' as kind,c.relname::text as name,jsonb_build_object('kind',c.relkind,'rls',c.relrowsecurity,'force',c.relforcerowsecurity,'options',c.reloptions) as definition from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p','v')
    union all select 'column',c.relname||'.'||a.attname,jsonb_build_object('type',format_type(a.atttypid,a.atttypmod),'nullable',not a.attnotnull,'default',pg_get_expr(d.adbin,d.adrelid)) from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace left join pg_attrdef d on d.adrelid=c.oid and d.adnum=a.attnum where n.nspname='public' and c.relkind in ('r','p') and a.attnum>0 and not a.attisdropped
    union all select 'constraint',c.relname||'.'||k.conname,to_jsonb(pg_get_constraintdef(k.oid,true)) from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'
    union all select 'index',c.relname,to_jsonb(pg_get_indexdef(c.oid)) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='i'
    union all select 'trigger',c.relname||'.'||t.tgname,to_jsonb(pg_get_triggerdef(t.oid,true)) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and not t.tgisinternal
    union all select 'policy',c.relname||'.'||p.polname,jsonb_build_object('command',p.polcmd,'permissive',p.polpermissive,'roles',(select jsonb_agg(case when r=0 then 'PUBLIC' else pg_get_userbyid(r) end order by (case when r=0 then 'PUBLIC' else pg_get_userbyid(r) end) collate "C") from unnest(p.polroles) r),'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'
    union all select 'function',p.oid::regprocedure::text,to_jsonb(pg_get_functiondef(p.oid)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind='f'
    union all select 'view',c.relname,to_jsonb(pg_get_viewdef(c.oid,true)) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='v'
    union all select 'grant',c.relname||'.'||case when a.grantee=0 then 'PUBLIC' when a.grantee=c.relowner then 'OWNER' else pg_get_userbyid(a.grantee) end||'.'||a.privilege_type,to_jsonb(a.is_grantable) from pg_class c join pg_namespace n on n.oid=c.relnamespace cross join lateral aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a where n.nspname='public' and c.relkind in ('r','p','v')
    union all select 'function_grant',p.oid::regprocedure::text||'.'||case when a.grantee=0 then 'PUBLIC' when a.grantee=p.proowner then 'OWNER' else pg_get_userbyid(a.grantee) end||'.'||a.privilege_type,to_jsonb(a.is_grantable) from pg_proc p join pg_namespace n on n.oid=p.pronamespace cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where n.nspname='public' and p.prokind='f'
    union all select 'schema_grant',n.nspname||'.'||case when a.grantee=0 then 'PUBLIC' when a.grantee=n.nspowner then 'OWNER' else pg_get_userbyid(a.grantee) end||'.'||a.privilege_type,to_jsonb(a.is_grantable) from pg_namespace n cross join lateral aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) a where n.nspname='public'
  ) evidence order by kind collate "C",name collate "C"`);
  return {records,extensions:[...extensions],schema_sha256:digest(metadata),migrations_sha256:await migrationFingerprint()};
}
