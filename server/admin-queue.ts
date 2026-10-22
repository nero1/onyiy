import {and,asc,eq,gt,or,sql} from 'drizzle-orm';
import {z} from 'zod';
import {queueEntries,queuePartitions,planVersions,plans,assets,users,readManifest,type DbExecutor} from '@gifters/db';
import {encodePrivateCursor,decodePrivateCursor} from './private-cursor';
const ticket=z.number().int().min(0).max(1099511627775);
const position=z.object({partition_id:z.string().uuid(),ticket}).strict();
export const adminQueueInput=z.object({plan_id:z.string().uuid(),partition_id:z.string().uuid().optional(),limit:z.coerce.number().int().min(1).max(100).optional(),after_ticket:z.coerce.number().pipe(ticket).optional(),cursor:z.string().max(1024).optional(),page:z.literal('1').optional()}).strict();
export async function adminQueuePage(tx:DbExecutor,actorId:string,input:z.infer<typeof adminQueueInput>){
 const policy=await readManifest(tx),limit=Math.min(input.limit??policy.pagination_policy.default_size,policy.pagination_policy.max_size,100);
 if(input.after_ticket!==undefined&&!input.partition_id||input.cursor&&input.after_ticket!==undefined)throw new Error('INVALID_INPUT');
 const scope=`admin-queue:${actorId}:${input.plan_id}:${input.partition_id??'all'}:${limit}`;
 const after=input.cursor?position.parse(decodePrivateCursor(scope,input.cursor)):undefined;
 const rows=await tx.select({id:queueEntries.id,plan_id:plans.id,plan_name:plans.name,asset:assets.symbol,network:assets.chainId,environment:assets.environment,version:planVersions.version,
  partition_id:queueEntries.partitionId,partition_revision:queuePartitions.revision,ticket:queueEntries.ticket,kind:queueEntries.kind,status:queueEntries.status,
  credited_count:queueEntries.creditedCount,required_count:queueEntries.requiredCount,beneficiary_user_id:queueEntries.beneficiaryUserId,username:users.username,platform_role:queueEntries.platformRole,
  priority_ticket:queueEntries.priorityTicket,priority_revision:queueEntries.priorityRevision,serving_position:sql<number|null>`public.gw_queue_rank(${queueEntries.id},'serving')`.mapWith(value=>value===null?null:Number(value)),
 }).from(queueEntries).innerJoin(queuePartitions,eq(queuePartitions.id,queueEntries.partitionId)).innerJoin(planVersions,eq(planVersions.id,queuePartitions.planVersionId)).innerJoin(plans,eq(plans.id,planVersions.planId)).innerJoin(assets,eq(assets.id,planVersions.assetId)).leftJoin(users,eq(users.id,queueEntries.beneficiaryUserId))
 .where(and(eq(plans.id,input.plan_id),sql`${assets.environment}=current_setting('gw.environment',true)`,input.partition_id?eq(queueEntries.partitionId,input.partition_id):undefined,input.after_ticket!==undefined?gt(queueEntries.ticket,input.after_ticket):undefined,
  after?or(gt(queueEntries.partitionId,after.partition_id),and(eq(queueEntries.partitionId,after.partition_id),gt(queueEntries.ticket,after.ticket))):undefined))
 .orderBy(asc(queueEntries.partitionId),asc(queueEntries.ticket)).limit(limit+1);
 const page=rows.slice(0,limit),last=page.at(-1);
 const partitions=await tx.select({id:queuePartitions.id,revision:queuePartitions.revision,asset:assets.symbol,network:assets.chainId,version:planVersions.version}).from(queuePartitions).innerJoin(planVersions,eq(planVersions.id,queuePartitions.planVersionId)).innerJoin(assets,eq(assets.id,planVersions.assetId)).where(and(eq(planVersions.planId,input.plan_id),sql`${assets.environment}=current_setting('gw.environment',true)`,eq(planVersions.active,true))).orderBy(asc(assets.symbol)).limit(9);
 if(partitions.length>8)throw new Error('CONFIGURATION_INVALID');
 return {rows:page,partitions,next_cursor:rows.length>limit&&last?encodePrivateCursor(scope,{partition_id:last.partition_id,ticket:last.ticket}):null};
}
