import {spawn} from 'node:child_process';
import {validateRuntimeEnv} from '@gifters/config';
import fs from 'node:fs';
import path from 'node:path';
import {drizzle} from 'drizzle-orm/postgres-js';
import {sql} from 'drizzle-orm';
import {migrationClient, migrationHistory, schema} from '@gifters/db';
import {initialSchemaFile, migrationSource} from '../packages/db/src/migration-source';

// Installation is manual in SQL Editor. Deployments only verify receipts;
// a preview can never apply schema changes to the shared database.
async function verifyInstalledSchema() {
 const directory=path.join(process.cwd(),'packages/db/src/migrations');
 const expected=fs.readdirSync(directory).filter(name=>name.endsWith('.sql')).sort()
  .map(name=>migrationSource(name,fs.readFileSync(path.join(directory,name),'utf8')));
 if(expected[0]?.name!==initialSchemaFile)throw new Error('INITIAL_SCHEMA_MISSING');
 const client=migrationClient({quiet:true});
 try {
  await drizzle(client,{schema}).transaction(async tx=>{
   await tx.execute(sql`select set_config('statement_timeout','5000',true),set_config('lock_timeout','1500',true)`);
   await tx.execute(sql`select pg_advisory_xact_lock_shared(hashtextextended('gw-schema-migrations',0))`);
   const [state]=await tx.execute<{installed:boolean}>(sql`select to_regclass('public.schema_migrations') is not null as installed`);
   if(!state?.installed)throw new Error('MANUAL_SCHEMA_INSTALL_REQUIRED');
   const applied=await tx.select({name:migrationHistory.name,sha256:migrationHistory.sha256}).from(migrationHistory).limit(1001);
   if(applied.length!==expected.length||applied.some(row=>!expected.some(item=>item.name===row.name&&item.sha256===row.sha256)))throw new Error('MANUAL_SCHEMA_RECEIPT_MISMATCH');
  },{accessMode:'read only'});
 } finally {await client.end({timeout:3});}
}


// Loaded with the same protected Vercel environment file used by preflight.
// Migration credentials exist only in this GitHub process, never Vercel output.
async function main(){
const selected=validateRuntimeEnv();
if(!process.env.DATABASE_MIGRATION_URL||selected.providers.SIGNER_PROVIDER!=='disabled'||selected.appEnv!=='mainnet'&&(process.env.MAINNET_ENABLED??'false')!=='false')throw new Error('HOSTED_INITIALIZATION_CONFIGURATION_INVALID');
await verifyInstalledSchema();
for(const command of ['db:check:binding','db:seed','db:check:runtime']){
 await new Promise<void>((resolve,reject)=>{
  const child=spawn('npm',['run',command],{stdio:'inherit',env:process.env,shell:false});
  child.once('error',()=>reject(new Error('HOSTED_INITIALIZATION_FAILED')));
  child.once('exit',code=>code===0?resolve():reject(new Error('HOSTED_INITIALIZATION_FAILED')));
 });
}
}
main().catch((error:unknown)=>{const code=error instanceof Error?error.message:'';console.error(['MANUAL_SCHEMA_INSTALL_REQUIRED','MANUAL_SCHEMA_RECEIPT_MISMATCH','HOSTED_INITIALIZATION_CONFIGURATION_INVALID'].includes(code)?code:'HOSTED_INITIALIZATION_FAILED');process.exitCode=1});
