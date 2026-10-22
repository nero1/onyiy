import fs from 'node:fs/promises';
import path from 'node:path';
import {boundedResponseText} from '../packages/config/src/response-body.mjs';
async function main(){
 const env=process.env,days=Number(env.BACKUP_RETENTION_DAYS),payment=env.RECOVERY_PAYMENT_ENVIRONMENT,id=env.GITHUB_RUN_ID;
 if(env.GITHUB_ACTIONS!=='true'||env.GITHUB_REPOSITORY!=='nero1/onyiy'||env.GITHUB_REF!=='refs/heads/main'||env.GITHUB_EVENT_NAME!=='schedule'||!['simulation','testnet','mainnet'].includes(payment)||!/^[1-9][0-9]{0,19}$/.test(id??'')||!Number.isInteger(days)||days<1||days>90||!env.GH_TOKEN||!path.isAbsolute(env.RUNNER_TEMP??''))throw Error('BACKUP_RETENTION_BINDING_INVALID');
 const response=await fetch(`https://api.github.com/repos/nero1/onyiy/actions/runs/${id}/artifacts?per_page=100`,{headers:{Authorization:'Bearer '+env.GH_TOKEN,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},redirect:'error',signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error('BACKUP_RETENTION_UNVERIFIED');
 const text=await boundedResponseText(response,1048576);
 const items=JSON.parse(text).artifacts;
 if(!Array.isArray(items)||items.length>100)throw Error('BACKUP_RETENTION_UNVERIFIED');
 const packet=items.find(item=>item.name===`financial-backup-${payment}-${id}`),created=Date.parse(packet?.created_at),expires=Date.parse(packet?.expires_at);
 if(!packet||packet.expired||!Number.isSafeInteger(packet.size_in_bytes)||packet.size_in_bytes<1||!Number.isFinite(created)||!Number.isFinite(expires)||expires-created<days*86400000-60000)throw Error('BACKUP_RETENTION_UNVERIFIED');
 await fs.writeFile(path.join(env.RUNNER_TEMP,'backup-checkpoint.txt'),'Encrypted archive uploaded with the configured retention; restore verification remains separate.\n',{flag:'wx',mode:0o600});
 console.log('Uploaded encrypted archive meets the configured retention.');
}
main().catch(error=>{console.error(/^BACKUP_RETENTION_[A-Z_]+$/.test(error?.message)?error.message:'BACKUP_RETENTION_FAILED');process.exitCode=1});
