import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { pipeline } from 'node:stream/promises';
import { Writable } from 'node:stream';
import { databaseConnectionOptions } from './connection-options';

const MAGIC=Buffer.from('GWBACKUP1');
const HEADER_BYTES=MAGIC.length+12+16;
const MAX_RUN_MS=30*60*1000;

export function recoveryKey() {
  const raw=process.env.EXPORT_ENCRYPTION_KEY??'';
  if(!/^[A-Za-z0-9_-]{43}$/.test(raw)) throw new Error('RECOVERY_KEY_REQUIRED');
  const key=Buffer.from(raw,'base64url');
  if(key.length!==32||key.toString('base64url')!==raw){key.fill(0);throw new Error('RECOVERY_KEY_REQUIRED');}
  return key;
}

export function recoveryPath(value:string|undefined) {
  if(!value||!path.isAbsolute(value)||value.split(path.sep).includes('..')||! /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}\.gwbackup$/.test(path.basename(value))) throw new Error('RECOVERY_PATH_INVALID');
  return value;
}

export function nativeDatabaseName(value:string) {
  const name=decodeURIComponent(new URL(value).pathname.slice(1));
  // libpq treats some dbname strings as a new connection string. Keep this
  // maintenance contract literal so it cannot override the selected host.
  if(!/^[A-Za-z0-9_][A-Za-z0-9_.-]{0,62}$/.test(name)) throw new Error('CONFIGURATION_INVALID');
  return name;
}

export async function exclusiveFile(file:string,data:string|Buffer) {
  const handle=await fsp.open(file,'wx',0o600);
  try{await handle.writeFile(data);await handle.sync();}finally{await handle.close();}
}

async function nativeEnvironment(directory:string) {
  const value=process.env.DATABASE_MIGRATION_URL;
  if(!value) throw new Error('DATABASE_MIGRATION_URL_REQUIRED');
  const options=databaseConnectionOptions(value);
  const url=new URL(value);
  const environment:NodeJS.ProcessEnv={NODE_ENV:process.env.NODE_ENV};
  for(const name of ['PATH','HOME','TMPDIR','TEMP','TMP','SYSTEMROOT','WINDIR','LANG','LC_ALL','HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','NO_PROXY','http_proxy','https_proxy','all_proxy','no_proxy','NODE_EXTRA_CA_CERTS','SSL_CERT_FILE','SSL_CERT_DIR']){
    if(process.env[name]!==undefined)environment[name]=process.env[name];
  }
  environment.PGHOST=url.hostname.replace(/^\[|\]$/g,'');
  environment.PGPORT=url.port||'5432';
  environment.PGUSER=decodeURIComponent(url.username);
  environment.PGPASSWORD=decodeURIComponent(url.password);
  environment.PGDATABASE=nativeDatabaseName(value);
  environment.PGPASSFILE='/dev/null';
  environment.PGCONNECT_TIMEOUT='10';
  environment.PGSSLMODE=options.ssl===false?'disable':'verify-full';
  if(options.ssl!==false) {
    environment.PGSSLROOTCERT='system';
    if(options.ssl.ca) {
      const certificate=path.join(directory,'database-ca.pem');
      await exclusiveFile(certificate,options.ssl.ca);
      environment.PGSSLROOTCERT=certificate;
    }
  }
  if(!environment.PGUSER||!environment.PGDATABASE) throw new Error('CONFIGURATION_INVALID');
  return environment;
}

async function nativeTool(name:'pg_dump'|'pg_restore',args:string[],fn:(child:ReturnType<typeof spawn>)=>Promise<void>) {
  const directory=await fsp.mkdtemp(path.join(os.tmpdir(),'gw-recovery-'));
  let child:ReturnType<typeof spawn>|undefined;
  try {
    child=spawn(name,args,{env:await nativeEnvironment(directory),stdio:['pipe','pipe','pipe']});
    child.stderr?.resume(); // Native errors may contain connection data; never forward them.
    const current=child;
    let escalation:ReturnType<typeof setTimeout>|undefined;let interrupted=false;
    const stop=()=>{
      if(current.exitCode!==null||current.signalCode!==null)return;
      interrupted=true;current.kill('SIGTERM');
      if(!escalation)escalation=setTimeout(()=>{
        if(current.exitCode===null&&current.signalCode===null)current.kill('SIGKILL');
      },2000);
    };
    process.once('SIGTERM',stop);process.once('SIGINT',stop);
    const timer=setTimeout(stop,MAX_RUN_MS);
    const exited=new Promise<void>((resolve,reject)=>{
      current.once('error',()=>reject(new Error('RECOVERY_NATIVE_TOOL_FAILED')));
      current.once('close',code=>code===0?resolve():reject(new Error('RECOVERY_NATIVE_TOOL_FAILED')));
    });
    try {await Promise.all([exited,fn(current)]);if(interrupted)throw new Error('RECOVERY_NATIVE_TOOL_FAILED');}
    catch {stop();await Promise.allSettled([exited]);throw new Error('RECOVERY_NATIVE_TOOL_FAILED');}
    finally {clearTimeout(timer);clearTimeout(escalation);process.removeListener('SIGTERM',stop);process.removeListener('SIGINT',stop);}
  } finally {if(child&&!child.killed) child.kill('SIGTERM');await fsp.rm(directory,{recursive:true,force:true});}
}

export async function encryptedDump(file:string,snapshot:string,key:Buffer) {
  const temporary=file+'.'+crypto.randomUUID()+'.partial';
  const handle=await fsp.open(temporary,'wx',0o600);
  let complete=false;
  try {
    const iv=crypto.randomBytes(12);
    await handle.write(Buffer.concat([MAGIC,iv,Buffer.alloc(16)]),0,HEADER_BYTES,0);
    const cipher=crypto.createCipheriv('aes-256-gcm',key,iv);
    cipher.setAAD(MAGIC);
    await nativeTool('pg_dump',['--format=custom','--compress=0','--no-owner','--schema=public',...['deployment_binding_challenges','operational_diagnostics','signer_dispatch_cursor','database_binding_nonce','auth_sessions','auth_refresh_tokens','auth_flows','rate_limits','wallet_challenges','worker_requests','bot_challenges','bot_token_uses','recovery_view_caps'].map(name=>'--exclude-table-data=public.'+name),'--lock-wait-timeout=5s',`--snapshot=${snapshot}`],async child=>{
      child.stdin?.end();
      await pipeline(child.stdout!,cipher,fs.createWriteStream(temporary,{fd:handle.fd,autoClose:false,start:HEADER_BYTES}));
    });
    await handle.write(cipher.getAuthTag(),0,16,MAGIC.length+12);
    await handle.sync();complete=true;
  } finally {await handle.close();if(!complete) await fsp.unlink(temporary).catch(()=>{});}
  try {await fsp.link(temporary,file);}finally{await fsp.unlink(temporary);}
}

async function decipher(file:string,key:Buffer) {
  const handle=await fsp.open(file,'r');
  const header=Buffer.alloc(HEADER_BYTES);
  try {
    const stats=await handle.stat();
    if(!stats.isFile()||stats.size<=HEADER_BYTES) throw new Error('RECOVERY_ARCHIVE_INVALID');
    const read=await handle.read(header,0,HEADER_BYTES,0);
    if(read.bytesRead!==HEADER_BYTES||!header.subarray(0,MAGIC.length).equals(MAGIC)) throw new Error('RECOVERY_ARCHIVE_INVALID');
  } finally {await handle.close();}
  const cipher=crypto.createDecipheriv('aes-256-gcm',key,header.subarray(MAGIC.length,MAGIC.length+12));
  cipher.setAAD(MAGIC);cipher.setAuthTag(header.subarray(MAGIC.length+12));
  return cipher;
}

export async function authenticateArchive(file:string,key:Buffer) {
  // Authenticate the whole stream before allowing any restore write. A second
  // pass decrypts for pg_restore; plaintext is never persisted on disk.
  try {await pipeline(fs.createReadStream(file,{start:HEADER_BYTES}),await decipher(file,key),new Writable({write(_chunk,_encoding,done){done();}}));}
  catch {throw new Error('RECOVERY_ARCHIVE_INVALID');}
}

export async function authenticatedCopy(file:string,key:Buffer,expected:string) {
  // Copy ciphertext into our private directory before authentication. Restore
  // reads this same copy, so a replaced input path cannot swap in another file.
  const directory=await fsp.mkdtemp(path.join(os.tmpdir(),'gw-restore-input-'));
  const copied=path.join(directory,'snapshot.gwbackup');
  try {
    await fsp.copyFile(file,copied,fs.constants.COPYFILE_EXCL);
    await fsp.chmod(copied,0o600);
    if(await archiveChecksum(copied)!==expected) throw new Error('RECOVERY_ARCHIVE_INVALID');
    await authenticateArchive(copied,key);
    return {file:copied,release:()=>fsp.rm(directory,{recursive:true,force:true})};
  } catch(error) {await fsp.rm(directory,{recursive:true,force:true});throw error;}
}

export async function restoreArchive(file:string,key:Buffer) {
  const directory=await fsp.mkdtemp(path.join(os.tmpdir(),'gw-restore-list-'));
  try {
    let listing='';
    await nativeTool('pg_restore',['--list'],async child=>{
      // --list exits after reading the archive header. Drain/authenticate the
      // remainder without treating that expected closed input as a dump error.
      const sink=new Writable({write(chunk,_encoding,done){
        if(child.stdin!.destroyed) {done();return;}
        child.stdin!.write(chunk,(error)=>done(error&&'code'in error&&error.code==='EPIPE'?undefined:error));
      },final(done){child.stdin!.end();done();}});
      child.stdin!.on('error',error=>{if(!('code'in error)||error.code!=='EPIPE') sink.destroy(error);});
      await Promise.all([
        pipeline(fs.createReadStream(file,{start:HEADER_BYTES}),await decipher(file,key),sink),
        (async()=>{for await(const chunk of child.stdout!) {
          listing+=chunk.toString('utf8');
          if(Buffer.byteLength(listing)>1024*1024) throw new Error('RECOVERY_ARCHIVE_INVALID');
        }})(),
      ]);
    });
    // The dedicated target already has public. The schema-free connection
    // preflight creates no proof table; its schema is retained in the archive.
    // Omit only its CREATE SCHEMA entry; retain schema ACLs and every data,
    // constraint, trigger and policy entry. Never use --clean or drop evidence.
    let omitted=0;
    const selection=listing.split('\n').map(line=>{
      if(/^\d+; \d+ \d+ SCHEMA - public .+$/.test(line)) {omitted++;return ';'+line;}
      return line;
    }).join('\n');
    if(omitted!==1) throw new Error('RECOVERY_ARCHIVE_INVALID');
    const listFile=path.join(directory,'restore.list');
    await exclusiveFile(listFile,selection);
    await nativeTool('pg_restore',['--exit-on-error','--single-transaction','--no-owner','--use-list='+listFile,'--dbname='+nativeDatabaseName(process.env.DATABASE_MIGRATION_URL!)],async child=>{
      child.stdout?.resume();
      await pipeline(fs.createReadStream(file,{start:HEADER_BYTES}),await decipher(file,key),child.stdin!);
    });
  } finally {await fsp.rm(directory,{recursive:true,force:true});}
}

export async function archiveChecksum(file:string) {
  const hash=crypto.createHash('sha256');
  for await(const chunk of fs.createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}
