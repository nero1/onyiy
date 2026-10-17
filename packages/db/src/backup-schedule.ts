import {readManifest} from './index';
import {databaseBinding} from './binding-fingerprint';
import {recoveryMaintenance} from './recovery-maintenance';

/** Read the authoritative policy without enabling payment/runtime authority. */
export async function scheduledBackupPolicy(){
 const maintenance=recoveryMaintenance();
 try{
  await maintenance.verifyBinding();
  return await maintenance.readRuntime(async tx=>{
   const policy=(await readManifest(tx)).backup_policy;
   // GitHub's public artifact retention is bounded. Never silently shorten the
   // owner's policy or claim a schedule finer than the hourly wake-up.
   if(policy.keep_days>90||policy.interval_hours>policy.rpo_hours||policy.interval_hours>policy.keep_days*24)throw Error('BACKUP_SCHEDULE_POLICY_UNSUPPORTED');
   return {interval_hours:policy.interval_hours,keep_days:policy.keep_days,binding:await databaseBinding(tx)};
  });
 }finally{await maintenance.close()}
}
