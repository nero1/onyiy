import crypto from "node:crypto";
import { sql } from 'drizzle-orm';
import type { DbExecutor } from './index';
/** Includes the project suffix used by shared poolers; excludes credentials. */
export function databaseScopeFingerprint(url: string) {
  const value = new URL(url),
    project = value.username.includes(".")
      ? value.username.split(".").at(-1)!
      : "";
  return crypto
    .createHash("sha256")
    .update(
      [
        value.hostname.toLowerCase(),
        value.port || "5432",
        decodeURIComponent(value.pathname),
        project,
      ].join("|"),
    )
    .digest("hex");
}

/** The owner-controlled database nonce is shared by pooler/direct connections.
 * Native archives exclude its data, so restored targets get a fresh identity.
 * The catalog OID also distinguishes a database copied inside the same cluster.
 * The endpoint fallback exists only before the schema is installed; the fresh
 * owner/runtime lock challenge independently proves the actual namespace. */
export async function databaseBinding(tx: DbExecutor, legacyUrl?: string) {
  const [available] = await tx.execute<{present:boolean}>(sql`select to_regprocedure('public.gw_database_binding()') is not null as present`);
  if (!available?.present) {
    if (legacyUrl) return databaseScopeFingerprint(legacyUrl);
    throw new Error('DATABASE_BINDING_UNAVAILABLE');
  }
  const [row] = await tx.execute<{identity:string}>(sql`select public.gw_database_binding() as identity`);
  if (!row || !/^[0-9a-f-]{36}:[^:]{1,100}:\d+$/.test(row.identity)) throw new Error('DATABASE_BINDING_UNAVAILABLE');
  return crypto.createHash('sha256').update('gw-database-binding-v2:'+row.identity).digest('hex');
}

export async function scopedDatabaseBinding(tx: DbExecutor) {
  const [row] = await tx.execute<{binding:string}>(sql`select current_setting('gw.database_binding',true) as binding`);
  if (!row || !/^[0-9a-f]{64}$/.test(row.binding)) throw new Error('DATABASE_BINDING_UNAVAILABLE');
  return row.binding;
}
