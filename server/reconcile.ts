import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { ledgerAccounts, ledgerJournals, ledgerPostings, operationKeys, queueEntries, receiptAllocations, readManifest, withdrawals, type DbExecutor } from '@gifters/db';

// Staff-only diagnostics. Counts are exact integer strings; examples are capped.
// Each query observes a shared deadline; failure never becomes a clean result.
export async function reconcile(database: DbExecutor, budgetMs=8000) {
  const deadline=performance.now()+Math.min(8000,Math.max(0,budgetMs));
  async function bounded<T>(query:()=>PromiseLike<T>):Promise<T> {
    const remaining=Math.floor(deadline-performance.now());
    if (remaining<=0) throw Object.assign(new Error('RECONCILIATION_TIMEOUT'),{code:'57014'});
    // PostgreSQL transaction-local statement budgets are an infrastructure
    // exception; table/aggregate queries remain Drizzle-first.
    await database.execute(sql`select set_config('statement_timeout',${`${Math.min(remaining,1000)}ms`},true)`);
    let result:T;
    try { result=await query(); }
    catch(error) {
      let cause:unknown=error;
      for (let depth=0;depth<5 && cause && typeof cause==='object';depth++) {
        if ('code' in cause && cause.code==='57014') throw Object.assign(new Error('RECONCILIATION_TIMEOUT'),{code:'57014'});
        cause='cause' in cause?cause.cause:undefined;
      }
      throw error;
    }
    if (performance.now()>deadline) throw Object.assign(new Error('RECONCILIATION_TIMEOUT'),{code:'57014'});
    return result;
  }
  const manifest = await bounded(()=>readManifest(database));
  const limit = manifest.pagination_policy.max_size;
  const journalNet = sql`sum(case when ${ledgerPostings.direction}='debit' then ${ledgerPostings.amountBaseUnits} else -${ledgerPostings.amountBaseUnits} end)`;
  const debitTotal = sql`coalesce(sum(case when ${ledgerPostings.direction}='debit' then ${ledgerPostings.amountBaseUnits} else 0 end),0)`;
  const bad = await bounded(()=>database.select({id:ledgerJournals.id,business_key:ledgerJournals.businessKey,imbalance:sql<string>`coalesce(${journalNet},0)::text`,debit_total:sql<string>`${debitTotal}::text`,line_count:sql<string>`count(${ledgerPostings.id})::text`,asset_count:sql<string>`count(distinct ${ledgerAccounts.assetId})::text`})
    .from(ledgerJournals).leftJoin(ledgerPostings,eq(ledgerPostings.journalId,ledgerJournals.id)).leftJoin(ledgerAccounts,eq(ledgerAccounts.id,ledgerPostings.accountId))
    .groupBy(ledgerJournals.id,ledgerJournals.businessKey).having(sql`${journalNet}<>0 or ${debitTotal}<=0 or count(${ledgerPostings.id})<2 or count(distinct ${ledgerAccounts.assetId})<>1`).limit(limit));
  const accountNet = sql`coalesce(sum(case when ${ledgerPostings.direction}='credit' then ${ledgerPostings.amountBaseUnits} else -${ledgerPostings.amountBaseUnits} end),0)`;
  const negative = await bounded(()=>database.select({account_id:ledgerAccounts.id,asset_id:ledgerAccounts.assetId,balance:sql<string>`${accountNet}::text`})
    .from(ledgerAccounts).leftJoin(ledgerPostings,eq(ledgerPostings.accountId,ledgerAccounts.id))
    .where(and(eq(ledgerAccounts.ownerType,'user'),inArray(ledgerAccounts.purpose,['available_payable','held_payable'])))
    .groupBy(ledgerAccounts.id,ledgerAccounts.assetId).having(sql`${accountNet}<0`).limit(limit));
  const clearing = await bounded(()=>database.select({account_id:ledgerAccounts.id,asset_id:ledgerAccounts.assetId,balance:sql<string>`${accountNet}::text`})
    .from(ledgerAccounts).leftJoin(ledgerPostings,eq(ledgerPostings.accountId,ledgerAccounts.id))
    .where(and(eq(ledgerAccounts.ownerType,'system'),eq(ledgerAccounts.purpose,'gift_clearing')))
    .groupBy(ledgerAccounts.id,ledgerAccounts.assetId).having(sql`${accountNet}<>0`).limit(limit));
  const mismatch = await bounded(()=>database.select({entry_id:queueEntries.id,credited_count:queueEntries.creditedCount,allocation_count:sql<string>`count(${receiptAllocations.id})::text`})
    .from(queueEntries).leftJoin(receiptAllocations,eq(receiptAllocations.receiverEntryId,queueEntries.id))
    .groupBy(queueEntries.id,queueEntries.creditedCount).having(sql`count(${receiptAllocations.id})<>${queueEntries.creditedCount}`).limit(limit));
  const missingJournals = (await bounded(()=>database.select({count:sql<string>`count(*)::text`}).from(ledgerJournals)
    .leftJoin(receiptAllocations,eq(receiptAllocations.creditJournalId,ledgerJournals.id))
    .where(and(eq(ledgerJournals.ledgerType,'RECEIVER_ALLOCATE'),isNull(receiptAllocations.id)))))[0].count;
  const missingOperations = (await bounded(()=>database.select({count:sql<string>`count(*)::text`}).from(operationKeys)
    .leftJoin(receiptAllocations,eq(receiptAllocations.sourceOperationKey,operationKeys.businessKey))
    .where(and(sql`${operationKeys.businessKey} like 'gift:%'`,isNull(receiptAllocations.id)))))[0].count;
  const legacy = (await bounded(()=>database.select({count:sql<string>`count(*)::text`}).from(receiptAllocations).where(eq(receiptAllocations.lineageStatus,'legacy_linked'))))[0].count;
  const captured = (await bounded(()=>database.select({count:sql<string>`count(*)::text`}).from(receiptAllocations).where(eq(receiptAllocations.lineageStatus,'captured'))))[0].count;
  const outstanding=database.select({userId:withdrawals.userId,assetId:withdrawals.assetId,gross:sql<string>`sum(${withdrawals.grossBaseUnits})`.as('gross')}).from(withdrawals).where(eq(withdrawals.status,'held')).groupBy(withdrawals.userId,withdrawals.assetId).as('outstanding');
  const heldAccounts=database.select({userId:ledgerAccounts.ownerId,assetId:ledgerAccounts.assetId,net:sql<string>`${accountNet}`.as('net')}).from(ledgerAccounts).leftJoin(ledgerPostings,eq(ledgerPostings.accountId,ledgerAccounts.id)).where(and(eq(ledgerAccounts.ownerType,'user'),eq(ledgerAccounts.purpose,'held_payable'))).groupBy(ledgerAccounts.ownerId,ledgerAccounts.assetId).as('held_accounts');
  const heldMismatch=await bounded(()=>database.select({user_id:sql<string>`coalesce(${outstanding.userId},${heldAccounts.userId})`,asset_id:sql<string>`coalesce(${outstanding.assetId},${heldAccounts.assetId})`,held_balance:sql<string>`coalesce(${heldAccounts.net},0)::text`,withdrawal_total:sql<string>`coalesce(${outstanding.gross},0)::text`}).from(outstanding).fullJoin(heldAccounts,and(eq(outstanding.userId,heldAccounts.userId),eq(outstanding.assetId,heldAccounts.assetId))).where(sql`coalesce(${outstanding.gross},0)<>coalesce(${heldAccounts.net},0)`).limit(limit));
  const balanced = bad.length===0;
  return {
    balanced,consistent:balanced && !heldMismatch.length && !negative.length && !clearing.length && !mismatch.length && missingJournals==='0' && missingOperations==='0',
    lineage_complete:missingJournals==='0' && missingOperations==='0' && legacy==='0',
    imbalanced_journals:bad,held_withdrawal_mismatches:heldMismatch,negative_user_balances:negative,nonzero_gift_clearing:clearing,queue_credit_mismatches:mismatch,
    unlinked_journal_count:missingJournals,unlinked_operation_count:missingOperations,legacy_unsequenced_count:legacy,captured_allocation_count:captured,
    diagnostic_sample_limit:limit,
  };
}
