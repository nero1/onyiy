import {sqlClient} from './index';
/** Metadata only: observe this web login's waits, never other role SQL/IDs. */
export async function workloadLockHealth(thresholdMs:number){
 if(!Number.isInteger(thresholdMs)||thresholdMs<1||thresholdMs>60000)throw new Error('CONFIGURATION_INVALID');
 const [row]=await sqlClient()<{waiting:string}[]>`select count(*)::text as waiting from pg_stat_activity where datname=current_database() and usesysid=(select oid from pg_roles where rolname=session_user) and wait_event_type='Lock' and state_change<clock_timestamp()-${thresholdMs}*interval '1 millisecond'`;
 return {waiting:Number(row.waiting),scope:'web_role' as const};
}
