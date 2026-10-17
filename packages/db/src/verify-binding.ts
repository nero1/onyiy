import crypto from 'node:crypto';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrationClient, schema, withContext } from './index';

// Two fresh64-bit owner transaction locks prove the runtime reaches this actual
// database. Database-scoped locks are not copied by backup/clone and require no
// pre-migration table, grant, data write, or second migration. Runtime role and
// namespace ownership checks still run through the ordinary restricted context.
export async function verifyDatabaseBinding(_bootstrap=false,quiet=false) {
  if (!process.env.DATABASE_MIGRATION_URL) throw new Error('DATABASE_MIGRATION_URL_REQUIRED');
  const owner=migrationClient({quiet}),database=drizzle(owner,{schema});
  const challenge=crypto.randomBytes(16),keys=[challenge.readBigInt64BE(0),challenge.readBigInt64BE(8)];
  if(keys[0]===keys[1])keys[1]=BigInt.asIntN(64,keys[1]+1n);
  const parts=keys.map(key=>{const bits=BigInt.asUintN(64,key);return {high:(bits>>32n).toString(),low:(bits&0xffffffffn).toString()}});
  try {
    await database.transaction(async transaction=>{
      await transaction.execute(sql`set local statement_timeout='2000ms'`);
      const [ownerSession]=await transaction.execute<{pid:number}>(sql`select pg_advisory_xact_lock(${keys[0].toString()}::bigint),pg_advisory_xact_lock(${keys[1].toString()}::bigint),pg_backend_pid() as pid`);
      const matched=await withContext({access:'service',bindingProbe:true},async tx=>{
        await tx.execute(sql`set local statement_timeout='2000ms'`);
        const [row]=await tx.execute<{matched:boolean}>(sql`select
          exists(select 1 from pg_locks where locktype='advisory' and database=(select oid from pg_database where datname=current_database()) and pid=${ownerSession.pid} and classid=${parts[0].high}::oid and objid=${parts[0].low}::oid and objsubid=1 and mode='ExclusiveLock' and granted)
          and exists(select 1 from pg_locks where locktype='advisory' and database=(select oid from pg_database where datname=current_database()) and pid=${ownerSession.pid} and classid=${parts[1].high}::oid and objid=${parts[1].low}::oid and objsubid=1 and mode='ExclusiveLock' and granted) as matched`);
        return row?.matched;
      });
      if(!matched)throw new Error('DATABASE_NAMESPACE_MISMATCH');
    });
  } catch {
    throw new Error('Database binding failed; verify restricted runtime and owner targets without exposing credentials');
  } finally { challenge.fill(0);await owner.end({timeout:3}); }
}
