import crypto from 'node:crypto';
import {z} from 'zod';
import {eq,sql} from 'drizzle-orm';
import {users,operationKeys,auditEvents,type DbExecutor} from '@gifters/db';
import {databaseNow} from './auth';
const zone=z.string().min(1).max(100).refine(value=>{try{new Intl.DateTimeFormat('en',{timeZone:value});return true}catch{return false}});
export const preferencesInput=z.object({time_zone:zone,locale:z.enum(['en','fr']),revision:z.number().int().positive()}).strict();
export async function ownPreferences(tx:DbExecutor,userId:string,input?:z.infer<typeof preferencesInput>,requestKey?:string){
 const [scope]=await tx.execute<{actor:string}>(sql`select current_setting('gw.actor_id',true) as actor`);
 if(scope.actor!==userId)throw new Error('FORBIDDEN');
 const [user]=await tx.select().from(users).where(eq(users.id,userId)).for('no key update');if(!user)throw new Error('NOT_FOUND');
 const project=(row:typeof user)=>({time_zone:row.timeZone,locale:row.locale,revision:row.preferencesRevision});
 if(!input)return project(user);
 if(!requestKey)throw new Error('INVALID_INPUT');
 const key=`preferences:${userId}:${requestKey}`,digest=crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex');
 const [prior]=await tx.select().from(operationKeys).where(eq(operationKeys.businessKey,key)).limit(1);
 if(prior){if(prior.requestHash!==digest)throw new Error('VERSION_CONFLICT');return prior.result as ReturnType<typeof project>;}
 if(input.revision!==user.preferencesRevision)throw new Error('VERSION_CONFLICT');
 const [updated]=await tx.update(users).set({timeZone:input.time_zone,locale:input.locale,preferencesRevision:user.preferencesRevision+1,updatedAt:await databaseNow(tx)}).where(eq(users.id,user.id)).returning();
 const result=project(updated);await tx.insert(operationKeys).values({businessKey:key,requestHash:digest,result});
 await tx.insert(auditEvents).values({actorUserId:user.id,action:'account.preferences',targetType:'user',targetId:user.id,beforeState:project(user),afterState:result});return result;
}
