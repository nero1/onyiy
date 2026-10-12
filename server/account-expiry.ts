import {and,asc,eq,lte,sql} from 'drizzle-orm';
import {users,auditEvents,type DbExecutor} from '@gifters/db';
export async function expireSuspensions(tx:DbExecutor,userId?:string){
 const [clock]=await tx.execute<{now:Date}>(sql`select clock_timestamp() as now`);const now=new Date(clock.now);const rows=await tx.select().from(users).where(and(eq(users.status,'suspended'),lte(users.suspensionUntil,now),userId?eq(users.id,userId):undefined)).orderBy(asc(users.id)).limit(userId?1:100).for('no key update',{skipLocked:true});
 for(const user of rows){const status=user.suspensionPreviousStatus??'active';await tx.update(users).set({status,suspensionUntil:null,suspensionPreviousStatus:null,accountRevision:user.accountRevision+1,updatedAt:now}).where(eq(users.id,user.id));await tx.insert(auditEvents).values({action:'suspension_expired',targetType:'user',targetId:user.id,beforeState:{status:'suspended',revision:user.accountRevision},afterState:{status,revision:user.accountRevision+1}})}return rows.length;
}
