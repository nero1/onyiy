import type {Sql} from 'postgres';
import {sql} from 'drizzle-orm';
import type {DbExecutor} from './index';
const roles=['gw_read','gw_service','gw_signer','gw_preview'] as const;
export async function recoveryRoleContract(database:DbExecutor){
 const rows=await database.execute<{name:string;login:boolean;inherit:boolean;superuser:boolean;bypass_rls:boolean;create_database:boolean;create_role:boolean;replication:boolean;member_of:string[]}>(sql`select r.rolname as name,r.rolcanlogin as login,r.rolinherit as inherit,r.rolsuper as superuser,r.rolbypassrls as bypass_rls,r.rolcreatedb as create_database,r.rolcreaterole as create_role,r.rolreplication as replication,coalesce((select array_agg(p.rolname::text order by p.rolname collate "C") from pg_auth_members m join pg_roles p on p.oid=m.roleid where m.member=r.oid),'{}'::text[]) as member_of from pg_roles r where r.rolname in ('gw_read','gw_service','gw_signer','gw_preview') order by r.rolname collate "C"`);
 if(rows.length!==roles.length||rows.some(row=>row.login||row.inherit||row.superuser||row.bypass_rls||row.create_database||row.create_role||row.replication||row.member_of.length))throw new Error('RECOVERY_ROLE_UNSAFE');
 return [...rows];
}
/** Restore only these closed, non-login permission groups. Login users, their
 * credentials and memberships are provisioned separately; never copy them. */
export async function provisionRecoveryRoles(owner:Sql){
 await owner.begin(async tx=>{
  const existing=await tx<{rolname:string;unsafe:boolean}[]>`select r.rolname,(r.rolcanlogin or r.rolinherit or r.rolsuper or r.rolbypassrls or r.rolcreatedb or r.rolcreaterole or r.rolreplication or exists(select 1 from pg_auth_members m where m.member=r.oid)) as unsafe from pg_roles r where r.rolname in ('gw_read','gw_service','gw_signer','gw_preview')`;
  if(existing.some(role=>role.unsafe))throw new Error('RECOVERY_ROLE_UNSAFE');
  for(const role of roles)if(!existing.some(value=>value.rolname===role)){
   // Identifier is from the static closed list above, never packet/request data.
   await tx.unsafe('CREATE ROLE '+role+' NOLOGIN NOINHERIT NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION');
  }
 });
}
