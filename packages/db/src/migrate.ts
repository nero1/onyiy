import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {eq,sql} from 'drizzle-orm';
import {drizzle} from 'drizzle-orm/postgres-js';
import {migrationClient,schema,migrationHistory} from './index';
const client=migrationClient({quiet:true}),database=drizzle(client,{schema});
const dir=path.join(process.cwd(),'packages/db/src/migrations');
try {
 // Owner-only metadata/coordination are deliberate PostgreSQL infrastructure exceptions.
 await client`select pg_advisory_lock(hashtextextended('gw-schema-migrations',0))`;
 await client.unsafe(`CREATE TABLE IF NOT EXISTS public.schema_migrations(name text PRIMARY KEY,sha256 text NOT NULL CHECK(length(sha256)=64),applied_at timestamptz NOT NULL DEFAULT clock_timestamp());ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;REVOKE ALL ON public.schema_migrations FROM PUBLIC`);
 for(const file of fs.readdirSync(dir).filter(f=>f.endsWith('.sql')).sort()){
  const statement=fs.readFileSync(path.join(dir,file),'utf8'),digest=crypto.createHash('sha256').update(statement).digest('hex');
  const [applied]=await database.select().from(migrationHistory).where(eq(migrationHistory.name,file)).limit(1);
  if(applied){if(applied.sha256!==digest)throw new Error('MIGRATION_CHECKSUM_CHANGED');continue;}
  process.stdout.write(`Applying ${file}... `);
  await database.transaction(async tx=>{await tx.execute(sql.raw(statement));await tx.insert(migrationHistory).values({name:file,sha256:digest})});console.log('ok');
 }
}finally{await client.end({timeout:3})}
