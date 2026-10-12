import { sql, eq } from 'drizzle-orm';
import { validateRuntimeEnv } from '@gifters/config';
import { db, type Database, type DbExecutor } from './index';
import { users } from './schema';

export type DatabaseContext = { access: 'public' | 'member' | 'staff' | 'service'; actorId?: string; requireAdmin?: boolean; snapshot?: boolean };

export async function scopedTransaction<T>(database: Database, context: DatabaseContext, fn: (tx: DbExecutor) => Promise<T>) {
  if (context.actorId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(context.actorId)) throw new Error('INVALID_INPUT');
  if ((['member','staff'].includes(context.access) || context.requireAdmin) && !context.actorId) throw new Error('UNAUTHENTICATED');
  const config = validateRuntimeEnv();
  return database.transaction(async (tx) => {
    // PostgreSQL metadata and transaction-local security context are deliberate
    // infrastructure exceptions. Domain queries continue to use Drizzle.
    const role = await tx.execute<{safe:boolean}>(sql`
      select not (r.rolsuper or r.rolbypassrls or r.rolcreatedb or r.rolcreaterole or r.rolinherit)
        and not exists (select 1 from pg_roles g where g.rolname in ('gw_read','gw_service') and (g.rolcanlogin or g.rolinherit or g.rolsuper or g.rolcreatedb or g.rolcreaterole or g.rolbypassrls))
        and not exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_roles owner on owner.oid=c.relowner where n.nspname='public' and owner.rolname in (session_user,'gw_read','gw_service'))
        and not exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_roles owner on owner.oid=p.proowner where n.nspname='public' and owner.rolname in (session_user,'gw_read','gw_service'))
        and not exists (select 1 from pg_database d join pg_roles owner on owner.oid=d.datdba where d.datname=current_database() and owner.rolname in (session_user,'gw_read','gw_service'))
        and not exists (select 1 from pg_namespace n join pg_roles owner on owner.oid=n.nspowner where n.nspname='public' and owner.rolname in (session_user,'gw_read','gw_service'))
        as safe from pg_roles r where r.rolname=session_user
    `);
    if (!role[0]?.safe) throw new Error('CONFIGURATION_INVALID');
    await tx.execute(context.access === 'service' ? sql.raw('SET LOCAL ROLE gw_service') : sql.raw('SET LOCAL ROLE gw_read'));
    await tx.execute(sql`select set_config('gw.actor_id',${context.actorId ?? ''},true), set_config('gw.access',${context.access},true), set_config('gw.environment',${config.appEnv},true)`);
    if (context.access === 'staff' || context.requireAdmin) {
      const actor = (await tx.select({role:users.role,status:users.status}).from(users).where(eq(users.id,context.actorId!)).limit(1))[0];
      if (actor?.role !== 'admin' || actor.status !== 'active') throw new Error('FORBIDDEN');
    }
    return fn(tx);
  },context.snapshot ? {isolationLevel:'repeatable read',accessMode:'read only'} : undefined);
}

export function withContext<T>(context: DatabaseContext, fn: (tx: DbExecutor) => Promise<T>) {
  return scopedTransaction(db(),context,fn);
}
