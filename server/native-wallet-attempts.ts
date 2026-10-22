import crypto from 'node:crypto';
import {eq,inArray,sql,type SQLWrapper} from 'drizzle-orm';
import {operationKeys,type DbExecutor} from '@gifters/db';
/** Twenty exact primary-key lookups bound retained send attempts per invoice. */
export function walletSendPending(invoice:string|SQLWrapper){return sql<boolean>`exists(select 1 from generate_series(0,19) n join public.operation_keys a on a.business_key='native-send:'||${invoice}::text||':'||n::text where not exists(select 1 from public.operation_keys r where r.business_key='native-send-rejected:'||${invoice}::text||':'||(a.result->>'attempt_id')))`;}
export async function claimWalletSend(tx:DbExecutor,invoiceId:string,attemptId:string){
 const keys=Array.from({length:20},(_,i)=>`native-send:${invoiceId}:${i}`),rows=await tx.select().from(operationKeys).where(inArray(operationKeys.businessKey,keys));
 const [state]=await tx.execute<{pending:boolean}>(sql`select ${walletSendPending(invoiceId)} as pending`);
 const rejected=`native-send-rejected:${invoiceId}:${attemptId}`;
 const [tombstone]=await tx.select({key:operationKeys.businessKey}).from(operationKeys).where(eq(operationKeys.businessKey,rejected)).limit(1);
 if(state.pending||tombstone||rows.some(row=>(row.result as {attempt_id?:string})?.attempt_id===attemptId))throw new Error('BROADCAST_AMBIGUOUS');
 const key=keys.find(value=>!rows.some(row=>row.businessKey===value));if(!key)throw new Error('FINANCIAL_SAFETY_PAUSE');
 await tx.insert(operationKeys).values({businessKey:key,requestHash:crypto.createHash('sha256').update(attemptId).digest('hex'),result:{attempt_id:attemptId}});
}
/** Only a definite user rejection, or a client that never dispatched, can clear
 * an attempt. A provider timeout/malformed response is never rejection proof. */
export async function rejectWalletSend(tx:DbExecutor,invoiceId:string,attemptId:string){
 const keys=Array.from({length:20},(_,i)=>`native-send:${invoiceId}:${i}`);
 const claims=await tx.select({result:operationKeys.result}).from(operationKeys).where(inArray(operationKeys.businessKey,keys));
 if(!claims.some(row=>(row.result as {attempt_id?:string})?.attempt_id===attemptId))return;
 const key=`native-send-rejected:${invoiceId}:${attemptId}`;
 await tx.insert(operationKeys).values({businessKey:key,requestHash:crypto.createHash('sha256').update(attemptId).digest('hex'),result:{attempt_id:attemptId,status:'rejected'}}).onConflictDoNothing({target:operationKeys.businessKey});
}
