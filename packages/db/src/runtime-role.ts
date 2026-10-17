import {sql} from 'drizzle-orm';
import type {DbExecutor} from './index';

/** Shared metadata checks; this grants no role or application capability. */
export async function assertRuntimeRole(tx:DbExecutor){
 const role = await tx.execute<{safe:boolean}>(sql`
      select not (r.rolsuper or r.rolbypassrls or r.rolcreatedb or r.rolcreaterole or r.rolinherit or r.rolreplication)
        and not exists(select 1 from pg_auth_members m join pg_roles parent on parent.oid=m.roleid where m.member=r.oid and (m.admin_option or coalesce((to_jsonb(m)->>'inherit_option')::boolean,false) or parent.rolname not in ('gw_read','gw_service')))
        and not exists(select 1 from pg_auth_members m join pg_roles child on child.oid=m.member where child.rolname in ('gw_read','gw_service'))
        and not exists (select 1 from pg_roles g where g.rolname in ('gw_read','gw_service') and (g.rolcanlogin or g.rolinherit or g.rolsuper or g.rolcreatedb or g.rolcreaterole or g.rolbypassrls or g.rolreplication))
        and not exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_roles owner on owner.oid=c.relowner where n.nspname='public' and owner.rolname in (session_user,'gw_read','gw_service'))
        and not exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_roles owner on owner.oid=p.proowner where n.nspname='public' and owner.rolname in (session_user,'gw_read','gw_service'))
        and not exists (select 1 from pg_database d join pg_roles owner on owner.oid=d.datdba where d.datname=current_database() and owner.rolname in (session_user,'gw_read','gw_service'))
        and not exists (select 1 from pg_namespace n join pg_roles owner on owner.oid=n.nspowner where n.nspname='public' and owner.rolname in (session_user,'gw_read','gw_service'))
        as safe from pg_roles r where r.rolname=session_user
    `);
    if (!role[0]?.safe) throw new Error('CONFIGURATION_INVALID');
}
