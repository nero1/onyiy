import crypto from 'node:crypto';
import {and,desc,eq,gte,inArray,isNull,like,sql} from 'drizzle-orm';
import {auditEvents,cycles,ledgerAccounts,ledgerJournals,ledgerPostings,operationKeys,pointEvents,planVersions,queueEntries,queuePartitions,readManifest,receiptAllocations,simulationReorgReviews,simulationReorgResolutions,users,withdrawals,type DbExecutor} from '@gifters/db';
import {account,availableBalance,lockUser,postJournal,simulationAsset} from './core';
import {enqueueNotification} from './jobs';
type Review=typeof simulationReorgReviews.$inferSelect;
async function request(tx:DbExecutor,key:string,input:unknown){const hash=crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex');const [prior]=await tx.select().from(operationKeys).where(eq(operationKeys.businessKey,key)).limit(1);if(prior && prior.requestHash!==hash)throw Error('VERSION_CONFLICT');return {hash,result:prior?.result}}
async function staff(tx:DbExecutor,id:string){const [actor]=await tx.select().from(users).where(eq(users.id,id)).limit(1);if(actor?.role!=='admin' || actor.status!=='active')throw Error('FORBIDDEN')}
function dto(review:Review){return {review_id:review.id,revision:review.revision,amount_base_units:review.amountBaseUnits,state:'review'}}
async function lockSource(tx:DbExecutor,versionId:string,partitionId:string){await tx.select({id:planVersions.id}).from(planVersions).where(eq(planVersions.id,versionId)).limit(1).for('update');await tx.select({id:queuePartitions.id}).from(queuePartitions).where(eq(queuePartitions.id,partitionId)).limit(1).for('update')}
export async function recordReorg(tx:DbExecutor,actorId:string,allocationId:string,reason:string,key:string){
 await staff(tx,actorId);const manifest=await readManifest(tx);if(!manifest.feature_admin || !manifest.feature_simulation)throw Error('FEATURE_DISABLED');const asset=await simulationAsset(tx,manifest);
 const op=`admin-reorg:${actorId}:${key}`;const prior=await request(tx,op,{allocationId,reason});if(prior.result)return prior.result;
 const [source]=await tx.select({allocation:receiptAllocations,cycle:cycles,entry:queueEntries}).from(receiptAllocations).innerJoin(cycles,eq(cycles.id,receiptAllocations.sourceCycleId)).innerJoin(queueEntries,eq(queueEntries.cycleId,cycles.id)).where(eq(receiptAllocations.id,allocationId)).limit(1);
 if(!source || source.allocation.assetId!==asset.id || source.allocation.lineageStatus!=='captured')throw Error('NOT_FOUND');
 const credits=await tx.select({ownerId:ledgerAccounts.ownerId}).from(ledgerJournals).innerJoin(ledgerPostings,eq(ledgerPostings.journalId,ledgerJournals.id)).innerJoin(ledgerAccounts,eq(ledgerAccounts.id,ledgerPostings.accountId)).where(and(like(ledgerJournals.businessKey,`allocation:${source.allocation.sourceOperationKey}:%`),eq(ledgerPostings.direction,'credit'),eq(ledgerAccounts.ownerType,'user'))).limit(5);
 const awards=await tx.select().from(pointEvents).where(eq(pointEvents.sourceKey,`gift:${source.cycle.id}`));
 const affected=[...new Set([source.allocation.payerUserId,...credits.map(row=>row.ownerId!).filter(Boolean),...awards.map(row=>row.userId)])].sort();if(affected.length>3)throw Error('FINANCIAL_SAFETY_PAUSE');
 for(const id of [...new Set([...affected,actorId])].sort())await lockUser(tx,id);await staff(tx,actorId);
 await lockSource(tx,source.cycle.planVersionId,source.entry.partitionId);
 const lockedReplay=await request(tx,op,{allocationId,reason});if(lockedReplay.result)return lockedReplay.result;
 const [open]=await tx.select({review:simulationReorgReviews}).from(simulationReorgReviews).leftJoin(simulationReorgResolutions,eq(simulationReorgResolutions.reviewId,simulationReorgReviews.id)).where(and(eq(simulationReorgReviews.sourceAllocationId,allocationId),isNull(simulationReorgResolutions.id))).limit(1);
 if(open){const result=dto(open.review);await tx.insert(operationKeys).values({businessKey:op,requestHash:prior.hash,result});return result}
 const [original]=await tx.select().from(operationKeys).where(eq(operationKeys.businessKey,source.allocation.sourceOperationKey)).limit(1);
 const amount=BigInt(String(original?.result?.amount_base_units??'0'));if(amount<=0n)throw Error('FINANCIAL_SAFETY_PAUSE');
 const [last]=await tx.select({revision:simulationReorgReviews.revision}).from(simulationReorgReviews).where(eq(simulationReorgReviews.sourceAllocationId,allocationId)).orderBy(desc(simulationReorgReviews.revision)).limit(1);const revision=(last?.revision??0)+1;if(revision>1_000_000)throw Error('FINANCIAL_SAFETY_PAUSE');
 const id=crypto.randomUUID();const loss=await account(tx,asset.id,'system',null,'simulation_chain_loss','debit');const payer=await account(tx,asset.id,'user',source.allocation.payerUserId,'available_payable','credit');
 const lossJournal=await postJournal(tx,'REORG_COMPENSATE',`reorg:${id}:invalidate`,[{accountId:loss.id,direction:'debit',amount},{accountId:payer.id,direction:'credit',amount}],{review_id:id,source_operation_key:source.allocation.sourceOperationKey,action:'invalidate'});if(!lossJournal)throw Error('FINANCIAL_SAFETY_PAUSE');
 // Exposure is all known settled GIV outflow after the source, not attribution
 // of a particular commingled credit to a particular withdrawal.
 const [outflow]=await tx.select({amount:sql<string>`coalesce(sum(${withdrawals.netBaseUnits}),0)::text`}).from(withdrawals).where(and(inArray(withdrawals.userId,affected),eq(withdrawals.assetId,asset.id),eq(withdrawals.status,'settled'),gte(withdrawals.settledAt,source.cycle.createdAt)));
 const result={review_id:id,revision,amount_base_units:amount.toString(),state:'review'};await tx.insert(operationKeys).values({businessKey:op,requestHash:prior.hash,result});
 await tx.insert(simulationReorgReviews).values({id,sourceAllocationId:allocationId,sourceOperationKey:source.allocation.sourceOperationKey,revision,sourceCycleId:source.cycle.id,sourceTicket:source.entry.ticket,partitionId:source.entry.partitionId,receiverEntryId:source.allocation.receiverEntryId,assetId:asset.id,payerUserId:source.allocation.payerUserId,affectedUserIds:affected,amountBaseUnits:amount.toString(),settledOutgoingExposure:outflow.amount,lossJournalId:lossJournal,actorUserId:actorId,operationKey:op,reason});
 for(const award of awards)await tx.insert(pointEvents).values({userId:award.userId,sourceKey:`reorg:${id}:invalidate`,awardType:`gift_reorg_${award.awardType}`,points:-award.points});
 await tx.insert(auditEvents).values({actorUserId:actorId,action:'simulation.reorg.invalidate',targetType:'reorg_review',targetId:id,reason,afterState:result});
 for(const user of affected)await enqueueNotification(tx,`reorg:${id}:review:${user}`,{user_id:user,title_key:'financial_review',body:'An incoming GIV event was invalidated. Affected activity is paused for review; balances, holds and historical withdrawals are preserved.'});return result;
}
export async function reconfirmReorg(tx:DbExecutor,actorId:string,id:string,reason:string,key:string){
 await staff(tx,actorId);const manifest=await readManifest(tx);if(!manifest.feature_admin || !manifest.feature_simulation)throw Error('FEATURE_DISABLED');const asset=await simulationAsset(tx,manifest);const op=`admin-reorg-reconfirm:${actorId}:${key}`;const prior=await request(tx,op,{id,reason});if(prior.result)return prior.result;
 const [review]=await tx.select().from(simulationReorgReviews).where(eq(simulationReorgReviews.id,id)).limit(1);if(!review || review.assetId!==asset.id)throw Error('NOT_FOUND');
 for(const user of [...new Set([...review.affectedUserIds,actorId])].sort())await lockUser(tx,user);await staff(tx,actorId);
 const [cycle]=await tx.select().from(cycles).where(eq(cycles.id,review.sourceCycleId)).limit(1);await lockSource(tx,cycle.planVersionId,review.partitionId);const lockedReplay=await request(tx,op,{id,reason});if(lockedReplay.result)return lockedReplay.result;
 const [existing]=await tx.select().from(simulationReorgResolutions).where(eq(simulationReorgResolutions.reviewId,id)).limit(1);
 const result={review_id:id,revision:review.revision,state:'reconfirmed'};
 if(!existing){const amount=BigInt(review.amountBaseUnits);if(await availableBalance(tx,review.payerUserId,asset.id)<amount)throw Error('INSUFFICIENT_BALANCE');const payer=await account(tx,asset.id,'user',review.payerUserId,'available_payable','credit');const loss=await account(tx,asset.id,'system',null,'simulation_chain_loss','debit');
  const journal=await postJournal(tx,'REORG_COMPENSATE',`reorg:${id}:reconfirm`,[{accountId:payer.id,direction:'debit',amount},{accountId:loss.id,direction:'credit',amount}],{review_id:id,source_operation_key:review.sourceOperationKey,action:'reconfirm'});if(!journal)throw Error('FINANCIAL_SAFETY_PAUSE');
  await tx.insert(operationKeys).values({businessKey:op,requestHash:prior.hash,result});await tx.insert(simulationReorgResolutions).values({reviewId:id,journalId:journal,actorUserId:actorId,operationKey:op,reason});
  const reversed=await tx.select().from(pointEvents).where(eq(pointEvents.sourceKey,`reorg:${id}:invalidate`));for(const award of reversed)await tx.insert(pointEvents).values({userId:award.userId,sourceKey:`reorg:${id}:reconfirm`,awardType:'gift_reorg_reconfirm',points:-award.points});
  await tx.insert(auditEvents).values({actorUserId:actorId,action:'simulation.reorg.reconfirm',targetType:'reorg_review',targetId:id,reason,afterState:result});return result;
 }
 await tx.insert(operationKeys).values({businessKey:op,requestHash:prior.hash,result});return result;
}
export async function reorgHistory(tx:DbExecutor){const cap=(await readManifest(tx)).pagination_policy.max_size;return tx.select({review:simulationReorgReviews,reconfirmedAt:simulationReorgResolutions.createdAt}).from(simulationReorgReviews).leftJoin(simulationReorgResolutions,eq(simulationReorgResolutions.reviewId,simulationReorgReviews.id)).orderBy(desc(simulationReorgReviews.createdAt),desc(simulationReorgReviews.id)).limit(cap)}
