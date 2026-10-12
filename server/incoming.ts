import crypto from 'node:crypto';
import {and,desc,eq,inArray,lte,sql} from 'drizzle-orm';
import {auditEvents,cycles,giftInvoices,ledgerJournals,operationKeys,plans,planVersions,readManifest,simulationIncomingControls,simulationIncomingEvents,simulationIncomingRefunds,users,type DbExecutor} from '@gifters/db';
import {account,availableBalance,lockUser,postJournal,sendGift,simulationAsset} from './core';
import {enqueueNotification} from './jobs';
type Invoice=typeof giftInvoices.$inferSelect;
type Outcome='reject'|'under'|'over'|'late'|'delay';
async function clock(tx:DbExecutor){const rows=await tx.execute<{now:Date}>(sql`select clock_timestamp() as now`);return new Date(rows[0].now)}
function dto(item:Invoice){return {id:item.id,plan_version_id:item.planVersionId,expected_base_units:item.expectedBaseUnits,actual_base_units:item.actualBaseUnits,refundable_base_units:item.refundableBaseUnits,status:item.status,expires_at:item.quoteExpiresAt,submitted_at:item.submittedAt}}
async function invoice(tx:DbExecutor,id:string,owner?:string){
 const [item]=await tx.select().from(giftInvoices).where(owner?and(eq(giftInvoices.id,id),eq(giftInvoices.userId,owner)):eq(giftInvoices.id,id)).limit(1).for('update');
 if(!item)throw new Error('NOT_FOUND');return item;
}
async function staff(tx:DbExecutor,id:string){const actor=await lockUser(tx,id);if(actor.role!=='admin' || actor.status!=='active')throw new Error('FORBIDDEN');return actor}
async function replay(tx:DbExecutor,key:string,input:unknown){
 const hash=crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex');
 const [prior]=await tx.select().from(operationKeys).where(eq(operationKeys.businessKey,key)).limit(1);
 if(prior && prior.requestHash!==hash)throw new Error('VERSION_CONFLICT');return {hash,result:prior?.result};
}
export async function quoteIncoming(tx:DbExecutor,userId:string,planId:string,key:string){
 const user=await lockUser(tx,userId);const policy=await readManifest(tx);const asset=await simulationAsset(tx,policy);
 if(!policy.feature_gifts)throw new Error('FEATURE_DISABLED');
 if(user.status!=='active')throw new Error(user.status==='pending_consent'?'CONSENT_REQUIRED':'ACCOUNT_RESTRICTED');
 if(!user.consentedAt || user.consentVersion!==policy.terms_content.version)throw new Error('CONSENT_REQUIRED');
 const [prior]=await tx.select().from(giftInvoices).where(and(eq(giftInvoices.userId,userId),eq(giftInvoices.requestKey,key))).limit(1);
 if(prior){const [version]=await tx.select().from(planVersions).where(eq(planVersions.id,prior.planVersionId)).limit(1);if(version.planId!==planId)throw new Error('VERSION_CONFLICT');return dto(prior)}
 const [version]=await tx.select({version:planVersions,status:plans.status}).from(planVersions).innerJoin(plans,eq(plans.id,planVersions.planId)).where(and(eq(plans.id,planId),eq(planVersions.assetId,asset.id),eq(planVersions.active,true))).limit(1);
 if(!version || version.status!=='active')throw new Error('PLAN_UNAVAILABLE');
 const [active]=await tx.select({id:cycles.id}).from(cycles).where(and(eq(cycles.userId,userId),eq(cycles.planVersionId,version.version.id),inArray(cycles.status,['active','exception']))).limit(1);
 if(active)throw new Error('ACTIVE_CYCLE_EXISTS');
 const now=await clock(tx);
 await tx.update(giftInvoices).set({status:'expired'}).where(and(eq(giftInvoices.userId,userId),eq(giftInvoices.status,'quoted'),lte(giftInvoices.quoteExpiresAt,now)));
 const [open]=await tx.select({id:giftInvoices.id}).from(giftInvoices).where(and(eq(giftInvoices.userId,userId),eq(giftInvoices.planVersionId,version.version.id),inArray(giftInvoices.status,['quoted','submitted']))).limit(1);
 if(open)throw new Error('ACTIVE_INVOICE_EXISTS');
 if(await availableBalance(tx,userId,asset.id)<BigInt(version.version.amountBaseUnits))throw new Error('INSUFFICIENT_BALANCE');
 const [created]=await tx.insert(giftInvoices).values({userId,planVersionId:version.version.id,assetId:asset.id,requestKey:key,expectedBaseUnits:version.version.amountBaseUnits,quoteExpiresAt:new Date(now.getTime()+policy.quote_ttl_minutes*60000)}).returning();return dto(created);
}
export async function controlIncoming(tx:DbExecutor,actorId:string,id:string,outcome:Outcome,reason:string,key:string,actual?:string){
 await staff(tx,actorId);const manifest=await readManifest(tx);if(!manifest.feature_simulation || !manifest.feature_admin)throw new Error('FEATURE_DISABLED');
 const op=`admin-incoming-control:${actorId}:${key}`;const prior=await replay(tx,op,{id,outcome,reason,actual:actual??null});if(prior.result)return prior.result;
 const item=await invoice(tx,id);const [existing]=await tx.select().from(simulationIncomingControls).where(eq(simulationIncomingControls.invoiceId,id)).limit(1);
 if(item.status!=='quoted' || existing || item.quoteExpiresAt<=await clock(tx))throw new Error('VERSION_CONFLICT');
 const expected=BigInt(item.expectedBaseUnits);const amount=actual!==undefined?BigInt(actual):outcome==='reject'?0n:outcome==='under'?expected-1n:outcome==='over'?expected+1n:expected;
 if((outcome==='reject' && amount!==0n) || (outcome==='under' && (amount<=0n || amount>=expected)) || (outcome==='over' && amount<=expected) || (['late','delay'].includes(outcome) && amount!==expected))throw new Error('INVALID_INPUT');
 const result={invoice_id:id,outcome,actual_base_units:amount.toString()};await tx.insert(operationKeys).values({businessKey:op,requestHash:prior.hash,result});
 await tx.insert(simulationIncomingControls).values({invoiceId:id,actorUserId:actorId,operationKey:op,outcome,actualBaseUnits:amount.toString(),reason});
 await tx.insert(auditEvents).values({actorUserId:actorId,action:'simulation.incoming.control',targetType:'gift_invoice',targetId:id,reason,afterState:result});return result;
}
async function finish(tx:DbExecutor,item:Invoice,outcome:'exact'|'reject'|'under'|'over'|'late'|'review_reject'){
 const actual=BigInt(item.actualBaseUnits??'0');const expected=BigInt(item.expectedBaseUnits);let giftKey:string|null=null;let acceptId:string|null=null;let refundId:string|null=null;
 const from=await account(tx,item.assetId,'user',item.userId,'incoming_payable','credit');const available=await account(tx,item.assetId,'user',item.userId,'available_payable','credit');
 const [hold]=await tx.select({id:simulationIncomingEvents.holdJournalId}).from(simulationIncomingEvents).where(eq(simulationIncomingEvents.invoiceId,item.id)).limit(1);
 if(hold)throw new Error('VERSION_CONFLICT');
 const holdRows=await tx.select({id:ledgerJournals.id}).from(ledgerJournals).where(eq(ledgerJournals.businessKey,`incoming-hold:${item.id}`)).limit(1);
 const holdId=holdRows[0]?.id??null;
 const accepted=['exact','over'].includes(outcome);
 if(accepted){
  acceptId=await postJournal(tx,'GIV_INCOMING_ACCEPT',`incoming-accept:${item.id}`,[{accountId:from.id,direction:'debit',amount:expected},{accountId:available.id,direction:'credit',amount:expected}],{invoice_id:item.id});
  const [user]=await tx.select().from(users).where(eq(users.id,item.userId)).limit(1);const [version]=await tx.select().from(planVersions).where(eq(planVersions.id,item.planVersionId)).limit(1);
  await sendGift(tx,user,version.planId,item.id,item.planVersionId);giftKey=`gift:${item.userId}:${item.id}`;
 }
 const refundable=accepted?actual-expected:actual;
 if(refundable>0n){const refund=await account(tx,item.assetId,'user',item.userId,'refund_payable','credit');refundId=await postJournal(tx,'REFUND_HOLD',`incoming-refund-hold:${item.id}`,[{accountId:from.id,direction:'debit',amount:refundable},{accountId:refund.id,direction:'credit',amount:refundable}],{invoice_id:item.id});}
 await tx.insert(simulationIncomingEvents).values({invoiceId:item.id,outcome,giftOperationKey:giftKey,holdJournalId:holdId,acceptJournalId:acceptId,refundJournalId:refundId});
 const status=accepted?'credited':outcome==='reject'?'failed':'exception';
 const [updated]=await tx.update(giftInvoices).set({status,refundableBaseUnits:refundable.toString()}).where(eq(giftInvoices.id,item.id)).returning();
 if(refundable>0n)await enqueueNotification(tx,`incoming:${item.id}:exception`,{user_id:item.userId,title_key:'incoming_exception',body:'Your GIV payment has a refundable amount awaiting simulation review. No extra queue right was created.'});return dto(updated);
}
export async function submitIncoming(tx:DbExecutor,userId:string,id:string){
 const user=await lockUser(tx,userId);let item=await invoice(tx,id,userId);if(item.status!=='quoted')return dto(item);
 const manifest=await readManifest(tx);await simulationAsset(tx,manifest);if(!manifest.feature_gifts)throw new Error('FEATURE_DISABLED');
 if(user.status!=='active' || user.consentVersion!==manifest.terms_content.version)throw new Error('ACCOUNT_RESTRICTED');
 const now=await clock(tx);const [control]=await tx.select().from(simulationIncomingControls).where(eq(simulationIncomingControls.invoiceId,id)).limit(1);
 const outcome=control?.outcome==='reject'?'reject':now>=item.quoteExpiresAt?'late':control?.outcome??'exact';const actual=outcome==='reject'?0n:BigInt(control?.actualBaseUnits??item.expectedBaseUnits);
 if(await availableBalance(tx,userId,item.assetId)<actual)throw new Error('INSUFFICIENT_BALANCE');
 if(actual>0n){const available=await account(tx,item.assetId,'user',userId,'available_payable','credit');const incoming=await account(tx,item.assetId,'user',userId,'incoming_payable','credit');await postJournal(tx,'GIV_INCOMING_HOLD',`incoming-hold:${id}`,[{accountId:available.id,direction:'debit',amount:actual},{accountId:incoming.id,direction:'credit',amount:actual}],{invoice_id:id});}
 [item]=await tx.update(giftInvoices).set({status:'submitted',submittedAt:now,actualBaseUnits:actual.toString()}).where(eq(giftInvoices.id,id)).returning();
 return outcome==='delay'?dto(item):finish(tx,item,outcome as 'exact'|'reject'|'under'|'over'|'late'|'review_reject');
}
export async function cancelIncomingQuote(tx:DbExecutor,userId:string,id:string){
 await lockUser(tx,userId);const item=await invoice(tx,id,userId);
 if(item.status==='expired')return dto(item);
 if(item.status!=='quoted')throw new Error('VERSION_CONFLICT');
 const [updated]=await tx.update(giftInvoices).set({status:'expired'}).where(eq(giftInvoices.id,id)).returning();return dto(updated);
}
export async function resolveIncoming(tx:DbExecutor,actorId:string,id:string,action:'confirm'|'refund'|'cancel',reason:string,key:string){
 // Sorted owner/actor locks avoid crossed administrative recovery deadlocks.
 const [target]=await tx.select({userId:giftInvoices.userId}).from(giftInvoices).where(eq(giftInvoices.id,id)).limit(1);if(!target)throw new Error('NOT_FOUND');
 for(const owner of [...new Set([actorId,target.userId])].sort())await lockUser(tx,owner);
 await staff(tx,actorId);const op=`admin-incoming-${action}:${actorId}:${key}`;const prior=await replay(tx,op,{id,action,reason});if(prior.result)return prior.result;
 const item=await invoice(tx,id);let result:Record<string,unknown>;
 if(action==='cancel'){
  if(item.status==='submitted')result=await finish(tx,item,'review_reject');else if(item.status==='exception')result=dto(item);else throw new Error('VERSION_CONFLICT');
 }else if(action==='confirm'){
  if(item.status==='submitted'){
   if(!item.submittedAt || item.submittedAt>=item.quoteExpiresAt)throw new Error('VERSION_CONFLICT');
   result=await finish(tx,item,'exact');
  }else if(item.status==='credited')result=dto(item);else throw new Error('VERSION_CONFLICT');
 }else{
  const [priorRefund]=await tx.select().from(simulationIncomingRefunds).where(eq(simulationIncomingRefunds.invoiceId,id)).limit(1);
  if(priorRefund)result={invoice_id:id,refunded_base_units:priorRefund.amountBaseUnits};
  else{
   const amount=BigInt(item.refundableBaseUnits);if(amount<=0n || !['credited','exception'].includes(item.status))throw new Error('VERSION_CONFLICT');
   const from=await account(tx,item.assetId,'user',item.userId,'refund_payable','credit');const to=await account(tx,item.assetId,'user',item.userId,'available_payable','credit');
   const journal=await postJournal(tx,'REFUND_SETTLE',`incoming-refund:${id}`,[{accountId:from.id,direction:'debit',amount},{accountId:to.id,direction:'credit',amount}],{invoice_id:id});if(!journal)throw new Error('FINANCIAL_SAFETY_PAUSE');
   result={invoice_id:id,refunded_base_units:amount.toString()};await tx.insert(operationKeys).values({businessKey:op,requestHash:prior.hash,result});
   await tx.insert(simulationIncomingRefunds).values({invoiceId:id,actorUserId:actorId,operationKey:op,journalId:journal,amountBaseUnits:amount.toString(),reason});
   await tx.insert(auditEvents).values({actorUserId:actorId,action:'simulation.incoming.refund',targetType:'gift_invoice',targetId:id,reason,afterState:result});return result;
  }
 }
 await tx.insert(operationKeys).values({businessKey:op,requestHash:prior.hash,result});await tx.insert(auditEvents).values({actorUserId:actorId,action:`simulation.incoming.${action}`,targetType:'gift_invoice',targetId:id,reason,afterState:result});return result;
}
export async function ownInvoices(tx:DbExecutor,userId:string){const cap=(await readManifest(tx)).pagination_policy.max_size;return (await tx.select({invoice:giftInvoices,refunded:simulationIncomingRefunds.amountBaseUnits}).from(giftInvoices).leftJoin(simulationIncomingRefunds,eq(simulationIncomingRefunds.invoiceId,giftInvoices.id)).where(eq(giftInvoices.userId,userId)).orderBy(desc(giftInvoices.createdAt),desc(giftInvoices.id)).limit(cap)).map(row=>({...dto(row.invoice),refunded_base_units:row.refunded??'0'}))}
