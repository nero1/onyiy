import {and,asc,eq,inArray,isNull,sql} from 'drizzle-orm';
import {users,notifications,outbox,jobs,auditEvents,type DbExecutor} from '@gifters/db';
import {validateRuntimeEnv} from '@gifters/config';

/** Erase expendable admin-message copies, preserving UUIDs, permanent keys,
 * digests and all financial/audit facts. Each call changes at most300 rows. */
export async function redactDeletedUserContent(tx:DbExecutor,userId:string){
 const [user]=await tx.select({status:users.status}).from(users).where(eq(users.id,userId)).limit(1);
 if(user?.status!=='deleted')throw new Error('FORBIDDEN');
 let changed=0,more=false;
 const notificationFilter=and(eq(notifications.userId,userId),eq(notifications.titleKey,'admin_message'),isNull(notifications.redactedAt));
 const rows=await tx.select({id:notifications.id}).from(notifications).where(notificationFilter).orderBy(asc(notifications.id)).limit(100).for('update',{skipLocked:true});
 if(rows.length)changed+=(await tx.update(notifications).set({body:'[redacted]',redactedAt:sql`clock_timestamp()`,redactedBodyHash:sql`encode(sha256(convert_to(${notifications.body},'UTF8')),'hex')`}).where(inArray(notifications.id,rows.map(row=>row.id))).returning({id:notifications.id})).length;
 for(const table of [outbox,jobs]){
  const filter=and(eq(table.kind,'notification'),isNull(table.redactedAt),sql`${table.payload}->>'user_id'=${userId} and ${table.payload}->>'title_key'='admin_message'`);
  const batch=await tx.select({id:table.id}).from(table).where(filter).orderBy(asc(table.id)).limit(100).for('update',{skipLocked:true});
  if(batch.length)changed+=(await tx.update(table).set({payload:sql`jsonb_set(${table.payload},'{body}','"[redacted]"'::jsonb)`,redactedAt:sql`clock_timestamp()`,redactedPayloadHash:sql`encode(sha256(convert_to(${table.payload}::text,'UTF8')),'hex')`}).where(inArray(table.id,batch.map(row=>row.id))).returning({id:table.id})).length;
  more=more||(await tx.select({id:table.id}).from(table).where(filter).limit(1)).length>0;
 }
 more=more||(await tx.select({id:notifications.id}).from(notifications).where(notificationFilter).limit(1)).length>0;
 if(changed)await tx.insert(auditEvents).values({action:'privacy.delivery_redaction',targetType:'user',targetId:userId,reason:'Deleted account admin-message copies redacted; financial identities and permanent replay digests retained',afterState:{rows:changed,more_possible:more}});
 return {changed,more_possible:more};
}
export async function enqueuePrivacyRedaction(tx:DbExecutor,userId:string,page=0){
 await tx.insert(outbox).values({businessKey:`privacy-redaction:${userId}:${page}`,environment:validateRuntimeEnv().appEnv,kind:'privacy_redaction',payload:{user_id:userId,page}}).onConflictDoNothing({target:outbox.businessKey});
}
