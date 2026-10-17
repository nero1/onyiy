import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';

// Manual protected GitHub workload. It never receives web, signer or scheduler
// credentials; downloaded archives still pass the CLI's signature/AEAD checks.
async function main(){
 const env=process.env,mode=env.RECOVERY_ACTION,payment=env.RECOVERY_PAYMENT_ENVIRONMENT;
 if(env.GITHUB_ACTIONS!=='true'||env.GITHUB_REPOSITORY!=='nero1/onyiy'||env.GITHUB_REF!=='refs/heads/main'||!['backup','restore','verify'].includes(mode)||!['simulation','testnet','mainnet'].includes(payment))throw Error('RECOVERY_WORKFLOW_INVALID');
 if(!/^[a-f0-9]{40}$/.test(env.GITHUB_SHA??'')||!/^[1-9][0-9]{0,19}$/.test(env.GITHUB_RUN_ID??''))throw Error('RECOVERY_WORKFLOW_INVALID');
 const required=['DATABASE_URL','DATABASE_MIGRATION_URL','EXPORT_ENCRYPTION_KEY'];
 for(const name of required)if(!env[name])throw Error('RECOVERY_BINDING_REQUIRED');
 for(const name of ['AUTH_ACCESS_KEY','GOOGLE_CLIENT_SECRET','MFA_ENCRYPTION_KEY','SIGNER_DATABASE_URL','SIGNER_KEY_FILE','SIGNER_KEY_FILES_JSON','SIGNER_KEY_PACKAGE_JSON','SIGNER_DECRYPTION_SECRET','SIGNED_PAYLOAD_ENCRYPTION_KEY','FINANCIAL_WORKER_AUTH_KEY','SCHEDULER_HMAC_KEY','SCHEDULER_HMAC_PREVIOUS_KEY'])if(env[name])throw Error('RECOVERY_SECRET_SCOPE_INVALID');
 const temporary=env.RUNNER_TEMP;
 if(!temporary||!path.isAbsolute(temporary)||/[\r\n\0]/.test(temporary))throw Error('RECOVERY_WORKFLOW_INVALID');
 const directory=await fs.mkdtemp(path.join(temporary,'gw-financial-recovery-'));await fs.chmod(directory,0o700);
 const file=path.join(directory,'financial.gwbackup');
 const runEnvironment={PATH:env.PATH,LANG:'C.UTF-8',APP_ENV:payment,MAINNET_ENABLED:'false',SIGNER_PROVIDER:'disabled',DB_PROVIDER:'postgres',RECOVERY_CONFIRM:'isolated-'+payment,DATABASE_URL:env.DATABASE_URL,DATABASE_MIGRATION_URL:env.DATABASE_MIGRATION_URL,DATABASE_TLS_CA_PEM:env.DATABASE_TLS_CA_PEM,EXPORT_ENCRYPTION_KEY:env.EXPORT_ENCRYPTION_KEY};
 if(mode!=='backup'){
  const fromRelease=!!env.RECOVERY_ARCHIVE_RELEASE;
  if(fromRelease?(!/^recovery-[a-z0-9][a-z0-9._-]{0,79}$/.test(env.RECOVERY_ARCHIVE_RELEASE)||!!env.RECOVERY_ARCHIVE_RUN_ID):!/^[1-9][0-9]{0,19}$/.test(env.RECOVERY_ARCHIVE_RUN_ID??''))throw Error('RECOVERY_ARCHIVE_SOURCE_INVALID');
  const input=path.join(temporary,'financial-recovery-input'),entries=(await fs.readdir(input)).sort();
  if(JSON.stringify(entries)!==JSON.stringify(['financial.gwbackup','financial.gwbackup.json','release.json']))throw Error('RECOVERY_ARCHIVE_SOURCE_INVALID');
  for(const name of entries){
   const stats=await fs.lstat(path.join(input,name));
   const limit=name==='financial.gwbackup'?2*1024**3:name==='release.json'?4096:262144;
   if(!stats.isFile()||stats.isSymbolicLink()||stats.size<1||stats.size>limit)throw Error('RECOVERY_ARCHIVE_SOURCE_INVALID');
  }
  const release=JSON.parse(await fs.readFile(path.join(input,'release.json'),'utf8'));
  if(!release||Object.keys(release).sort().join(',')!=='commit,environment,format,run_id'||release.format!==1||release.environment!==payment||(!/^[1-9][0-9]{0,19}$/.test(release.run_id??'')||!fromRelease&&release.run_id!==env.RECOVERY_ARCHIVE_RUN_ID)||!/^[a-f0-9]{40}$/.test(release.commit??''))throw Error('RECOVERY_ARCHIVE_SOURCE_INVALID');
  // Pin archives to their recorded release; no automatic old-schema upgrade or
  // code checkout chosen by an unsigned file. The CLI also checks migrations.
  if(release.commit!==env.RECOVERY_ARCHIVE_COMMIT)throw Error('RECOVERY_MATCHING_RELEASE_REQUIRED');
  for(const name of ['financial.gwbackup','financial.gwbackup.json'])await fs.copyFile(path.join(input,name),path.join(directory,name),fs.constants.COPYFILE_EXCL);
  if(mode==='restore'){
   const target=env.RECOVERY_TARGET_DATABASE??'';
   const actual=decodeURIComponent(new URL(env.DATABASE_MIGRATION_URL).pathname.slice(1));
   if(!/^[A-Za-z0-9_][A-Za-z0-9_.-]{0,62}$/.test(target)||target!==actual)throw Error('RECOVERY_TARGET_CONFIRMATION_REQUIRED');
   runEnvironment.RECOVERY_RESTORE_CONFIRM='restore:'+target;
  }
 }
 const status=await new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,['--import','tsx','packages/db/src/recovery-cli.ts',mode,file],{cwd:process.cwd(),env:runEnvironment,stdio:'inherit',shell:false});
  const interrupt=()=>child.kill('SIGTERM');process.once('SIGTERM',interrupt);process.once('SIGINT',interrupt);
  const cleanup=()=>{process.removeListener('SIGTERM',interrupt);process.removeListener('SIGINT',interrupt)};
  child.once('error',()=>{cleanup();reject(Error('RECOVERY_WORKLOAD_FAILED'))});
  child.once('exit',code=>{cleanup();resolve(code)});
 });
 if(status!==0)throw Error('RECOVERY_WORKLOAD_FAILED');
 if(mode==='backup'){
  await fs.writeFile(path.join(directory,'release.json'),JSON.stringify({format:1,environment:payment,commit:env.GITHUB_SHA,run_id:env.GITHUB_RUN_ID})+'\n',{flag:'wx',mode:0o600});
  if(!env.GITHUB_OUTPUT)throw Error('RECOVERY_WORKFLOW_INVALID');
  await fs.appendFile(env.GITHUB_OUTPUT,'archive_directory='+directory+'\n');
  console.log('Archive release commit: '+env.GITHUB_SHA);
 }
 console.log(mode==='backup'?'Encrypted archive, signed inventory and matching-release record are ready for download. Keep the encryption key separately.':'Exact verification passed. The target remains unpublished. Fresh database-bound financial approvals, signed alerts, chain reconciliation and owner review are required before resuming payments.');
}
main().catch(error=>{
 const allowed=new Set(['RECOVERY_WORKFLOW_INVALID','RECOVERY_BINDING_REQUIRED','RECOVERY_SECRET_SCOPE_INVALID','RECOVERY_ARCHIVE_SOURCE_INVALID','RECOVERY_MATCHING_RELEASE_REQUIRED','RECOVERY_TARGET_CONFIRMATION_REQUIRED','RECOVERY_WORKLOAD_FAILED']);
 console.error(allowed.has(error?.message)?error.message:'RECOVERY_WORKFLOW_FAILED');process.exitCode=1;
});
