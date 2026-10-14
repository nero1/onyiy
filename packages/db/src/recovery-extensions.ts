import { z } from 'zod';
import type { Sql } from 'postgres';

/** Existing pgcrypto-only archive packets remain valid. New packets may also
 * declare the pinned public search dependency; arbitrary extensions are denied. */
export const recoveryExtensions = z.array(z.union([
  z.object({ name: z.literal('pgcrypto'), schema: z.enum(['public', 'extensions']), version: z.literal('1.3') }).strict(),
  z.object({ name: z.literal('pg_trgm'), schema: z.literal('public'), version: z.literal('1.6') }).strict(),
])).min(1).max(2).refine(rows => rows.filter(row => row.name === 'pgcrypto').length === 1 && new Set(rows.map(row => row.name)).size === rows.length);

export async function provisionRecoveryExtensions(owner: Sql, input: unknown) {
  const extensions = recoveryExtensions.parse(input);
  // Existing extensions must match before any provisioning occurs. Never move
  // or upgrade an installed dependency to make a restore appear compatible.
  const existing = await owner<{name:string;schema:string;version:string}[]>`select e.extname::text as name,n.nspname::text as schema,e.extversion::text as version from pg_extension e join pg_namespace n on n.oid=e.extnamespace where e.extname in ('pgcrypto','pg_trgm')`;
  for (const installed of existing) {
    const expected = extensions.find(value => value.name === installed.name);
    if (!expected || expected.schema !== installed.schema || expected.version !== installed.version) throw new Error('RECOVERY_SCHEMA_UNCLASSIFIED');
  }
  for (const extension of extensions) {
    if (extension.name === 'pg_trgm') {
      await owner.unsafe("CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public VERSION '1.6'");
    } else {
      if (extension.schema === 'extensions') await owner`create schema if not exists extensions`;
      await owner.unsafe(extension.schema === 'public'
        ? "CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public VERSION '1.3'"
        : "CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions VERSION '1.3'");
    }
  }
}
