import fs from 'node:fs';
import path from 'node:path';
import {sql} from 'drizzle-orm';
import {drizzle} from 'drizzle-orm/postgres-js';
import {migrationClient,schema,migrationHistory} from './index';
import {initialSchemaFile,migrationSource} from './migration-source';
const client=migrationClient({quiet:true}),database=drizzle(client,{schema});
const dir=path.join(process.cwd(),'packages/db/src/migrations');
try {
 // Owner-only metadata/coordination are deliberate PostgreSQL infrastructure exceptions.
 await client`select pg_advisory_lock(hashtextextended('gw-schema-migrations',0))`;
 const migrations=fs.readdirSync(dir).filter(f=>f.endsWith('.sql')).sort().map(name=>migrationSource(name,fs.readFileSync(path.join(dir,name),'utf8')));
 if(migrations[0]?.name!==initialSchemaFile)throw new Error('INITIAL_SCHEMA_MISSING');
 const [history]=await database.execute<{present:boolean}>(sql`select to_regclass('public.schema_migrations') is not null as present`);
 const applied=history.present?await database.select({name:migrationHistory.name,sha256:migrationHistory.sha256}).from(migrationHistory).limit(1001):[];
 if(applied.length>1000||applied.some(row=>!migrations.some(migration=>migration.name===row.name)))throw new Error('MIGRATION_HISTORY_MISMATCH');
 for(const row of applied)if(migrations.find(migration=>migration.name===row.name)!.sha256!==row.sha256)throw new Error('MIGRATION_CHECKSUM_CHANGED');
 for(const migration of migrations){
  if(applied.some(row=>row.name===migration.name))continue;
  process.stdout.write(`Applying ${migration.name}... `);
  await database.transaction(async tx=>{
   await tx.execute(sql.raw(migration.statement));
   // The standalone initial file inserts its own validated receipt.
   if(migration.name!==initialSchemaFile)await tx.insert(migrationHistory).values({name:migration.name,sha256:migration.sha256});
  });console.log('ok');
 }
}finally{await client.end({timeout:3})}
