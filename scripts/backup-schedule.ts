import fs from 'node:fs/promises';
import {scheduledBackupPolicy} from '../packages/db/src/backup-schedule';

async function main(){
 const env=process.env,payment=env.RECOVERY_PAYMENT_ENVIRONMENT;
 if(env.GITHUB_ACTIONS!=='true'||env.GITHUB_REPOSITORY!=='nero1/onyiy'||env.GITHUB_REF!=='refs/heads/main'||!['schedule','workflow_dispatch'].includes(env.GITHUB_EVENT_NAME??'')||!['simulation','testnet','mainnet'].includes(payment??'')||!env.GH_TOKEN||!env.GITHUB_OUTPUT)throw Error('BACKUP_SCHEDULE_BINDING_INVALID');
 for(const key of ['AUTH_ACCESS_KEY','GOOGLE_CLIENT_SECRET','MFA_ENCRYPTION_KEY','EXPORT_ENCRYPTION_KEY','SIGNER_DATABASE_URL','SIGNER_KEY_FILE','SIGNER_KEY_FILES_JSON','SIGNER_KEY_PACKAGE_JSON','SIGNER_DECRYPTION_SECRET','SIGNED_PAYLOAD_ENCRYPTION_KEY','FINANCIAL_WORKER_AUTH_KEY','SCHEDULER_HMAC_KEY','SCHEDULER_HMAC_PREVIOUS_KEY'])if(env[key])throw Error('BACKUP_SCHEDULE_SECRET_SCOPE_INVALID');
 const policy=await scheduledBackupPolicy(),name=`financial-backup-state-${payment}-${policy.binding}`;
 async function api(path:string){
  const response=await fetch('https://api.github.com/repos/nero1/onyiy/'+path,{headers:{Authorization:'Bearer '+env.GH_TOKEN,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},redirect:'error',signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error('BACKUP_SCHEDULE_HISTORY_UNAVAILABLE');
  const text=await response.text();if(Buffer.byteLength(text)>1048576)throw Error('BACKUP_SCHEDULE_HISTORY_UNAVAILABLE');return JSON.parse(text);
 }
 const history=await api('actions/artifacts?per_page=100&name='+encodeURIComponent(name));
 if(!Array.isArray(history.artifacts)||history.artifacts.length>100)throw Error('BACKUP_SCHEDULE_HISTORY_UNAVAILABLE');
 let latest=0,checked=0;
 for(const artifact of history.artifacts){
  if(artifact.name!==name||artifact.expired)continue;
  if(++checked>20)throw Error('BACKUP_SCHEDULE_HISTORY_UNAVAILABLE');
  const id=String(artifact.workflow_run?.id??'');if(!/^[1-9][0-9]{0,19}$/.test(id))throw Error('BACKUP_SCHEDULE_HISTORY_UNAVAILABLE');
  const run=await api('actions/runs/'+id);
  if(run.path!=='.github/workflows/financial-recovery.yml'||run.head_branch!=='main'||run.conclusion!=='success'||!['schedule','workflow_dispatch'].includes(run.event))continue;
  const packets=await api('actions/runs/'+id+'/artifacts?per_page=100');
  if(!Array.isArray(packets.artifacts)||packets.artifacts.length>100)throw Error('BACKUP_SCHEDULE_HISTORY_UNAVAILABLE');
  if(!packets.artifacts.some((item:any)=>item.name===`financial-backup-${payment}-${id}`&&!item.expired&&Number.isSafeInteger(item.size_in_bytes)&&item.size_in_bytes>0&&Number.isFinite(Date.parse(item.created_at))&&Date.parse(item.expires_at)-Date.parse(item.created_at)>=policy.keep_days*86400000-60000))continue;
  const created=Date.parse(artifact.created_at),now=Date.now();if(!Number.isFinite(created)||created>now)throw Error('BACKUP_SCHEDULE_HISTORY_UNAVAILABLE');
  latest=created;break;
 }
 const due=!latest||Date.now()-latest>=Math.max(0,policy.interval_hours-1)*3600000;
 await fs.appendFile(env.GITHUB_OUTPUT,`due=${due}\nretention_days=${policy.keep_days}\nstate_name=${name}\n`);
 console.log(due?'Encrypted backup is due.':'A retained successful backup for this database is still within the configured interval.');
}
main().catch(error=>{console.error(/^BACKUP_SCHEDULE_[A-Z_]+$/.test(error?.message)?error.message:'BACKUP_SCHEDULE_FAILED');process.exitCode=1});
