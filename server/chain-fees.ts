import {financialEnvironmentIn} from './financial-config';
import { and, eq, inArray, sql } from 'drizzle-orm';
import type { AssetRegistry } from '@gifters/chains';
import { chainFeeClaims, ledgerJournals, ledgerPostings, ledgerAccounts, recoveryOutflowResolutions, type DbExecutor } from '@gifters/db';
import { account, postJournal } from './core';

/** One transaction pays one network/setup bill, even when its principals are
 * recognized by different assets or by both settlement and recovery. */
export async function bookChainFees(tx: DbExecutor, input: {
 registry: AssetRegistry; hash: string; nativeAssetId: string;
 networkFee: bigint; setup: bigint; recovery?: boolean;
 metadata: Record<string, unknown>;
}) {
 const {registry,hash,nativeAssetId,networkFee,setup}=input;
 if(networkFee<0n||setup<0n)throw new Error('INVALID_PROOF');
 const environment=await financialEnvironmentIn(tx);
 if(registry.environment!==environment)throw new Error("FINANCIAL_ENVIRONMENT_DENIED");
 const scope=`${environment}:${registry.chain}:${registry.network}:${hash}`;
 await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${'chain-fees:'+scope},0))`);
 const [existing]=await tx.select().from(chainFeeClaims).where(and(eq(chainFeeClaims.environment,environment),eq(chainFeeClaims.chain,registry.chain),eq(chainFeeClaims.network,registry.network),eq(chainFeeClaims.txHash,hash))).limit(1);
 if(existing){
  if(existing.nativeAssetId!==nativeAssetId||BigInt(existing.networkFeeBaseUnits)!==networkFee||BigInt(existing.accountSetupBaseUnits)!==setup)throw new Error('CHAIN_FEE_EVIDENCE_CONFLICT');
  return {...existing,created:false};
 }
 // Recognize retained pre-upgrade fees without booking them again. Every old
 // posting must match the positively observed amount and native asset. Multiple
 // old bills are corrected with immutable compensating journals, never edits.
 const historical=await tx.select().from(recoveryOutflowResolutions).where(and(eq(recoveryOutflowResolutions.nativeAssetId,nativeAssetId),eq(recoveryOutflowResolutions.txHash,hash))).limit(101);
 if(historical.length>100)throw new Error('CHAIN_FEE_HISTORY_REVIEW_REQUIRED');
 const metadata={...input.metadata,environment:environment,chain:registry.chain,network:registry.network,tx_hash:hash};
 async function component(amount:bigint,purpose:string,label:'network'|'setup',legacyKey:string){
  const ids=new Set(historical.map(row=>label==='network'?row.gasJournalId:row.setupJournalId).filter((id):id is string=>!!id));
  const keys=await tx.select({id:ledgerJournals.id}).from(ledgerJournals).where(eq(ledgerJournals.businessKey,legacyKey)).limit(1);for(const row of keys)ids.add(row.id);
  const cash=await account(tx,nativeAssetId,'system',null,'treasury_asset','debit'),expense=await account(tx,nativeAssetId,'platform',null,purpose,'debit');
  let journalId:string|null=null;
  if(ids.size){
   const journals=await tx.select().from(ledgerJournals).where(inArray(ledgerJournals.id,[...ids])).orderBy(ledgerJournals.createdAt,ledgerJournals.id).limit(101);
   for(const journal of journals){
    const rows=await tx.select({accountId:ledgerPostings.accountId,direction:ledgerPostings.direction,amount:ledgerPostings.amountBaseUnits}).from(ledgerPostings).innerJoin(ledgerAccounts,eq(ledgerAccounts.id,ledgerPostings.accountId)).where(eq(ledgerPostings.journalId,journal.id)).limit(3);
    if(amount===0n||rows.length!==2||!rows.every(row=>BigInt(row.amount)===amount&&(row.accountId===cash.id&&row.direction==='credit'||row.accountId===expense.id&&row.direction==='debit')))throw new Error('CHAIN_FEE_HISTORY_REVIEW_REQUIRED');
    if(!journalId){journalId=journal.id;continue;}
    await postJournal(tx,'CHAIN_FEE_DUPLICATE_REVERSAL',`chain-fee-reversal:${journal.id}`,[{accountId:cash.id,direction:'debit',amount},{accountId:expense.id,direction:'credit',amount}],{...metadata,original_journal_id:journal.id});
   }
  }else if(amount>0n){
   journalId=await postJournal(tx,label==='network'?(input.recovery?'RECOVERY_OUTFLOW_GAS':'GAS_OUT'):(input.recovery?'RECOVERY_OUTFLOW_SETUP':'ACCOUNT_SETUP_OUT'),`chain-fee:${scope}:${label}`,[{accountId:expense.id,direction:'debit',amount},{accountId:cash.id,direction:'credit',amount}],metadata);
   if(!journalId)throw new Error('CHAIN_FEE_EVIDENCE_CONFLICT');
  }
  return journalId;
 }
 const gasJournalId=await component(networkFee,'network_fee_expense','network',`gas:${environment}:${registry.chain}:${hash}`),setupJournalId=await component(setup,'recipient_account_setup_expense','setup',`account-setup:${registry.chain}:${hash}`);
 const [row]=await tx.insert(chainFeeClaims).values({environment:environment,chain:registry.chain,network:registry.network,txHash:hash,nativeAssetId,networkFeeBaseUnits:networkFee.toString(),accountSetupBaseUnits:setup.toString(),gasJournalId,setupJournalId}).returning();
 return {...row,created:true};
}
