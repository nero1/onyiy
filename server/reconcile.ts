import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { treasuryAddresses,ledgerCounterState,ledgerAccountTotals,ledgerJournalAudits,chainCheckpoints,chainRecoveryRuns,unallocatedInflows,cryptoObligations,cryptoEvents,cryptoInvoices,cryptoReorgReviews,cryptoReorgResolutions,giftInvoices, simulationIncomingRefunds, simulationReorgReviews, simulationReorgResolutions, ledgerAccounts, ledgerJournals, operationKeys, queueEntries, receiptAllocations, readManifest, withdrawals, type DbExecutor } from '@gifters/db';

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
  const [coverage]=await bounded(()=>database.select().from(ledgerCounterState).where(eq(ledgerCounterState.id,'global')).limit(1));
  if(!coverage||coverage.reasonCode)throw new Error('FINANCIAL_SAFETY_PAUSE');
  // Never report clean reconciliation from partially rebuilt counters. The
  // maintenance job advances at most100 source rows per transaction.
  if(!coverage.complete)throw new Error('LEDGER_COUNTERS_BACKFILLING');
  const bad=await bounded(()=>database.select({id:ledgerJournals.id,business_key:ledgerJournals.businessKey,
    imbalance:sql<string>`(${ledgerJournalAudits.debitTotal}-${ledgerJournalAudits.creditTotal})::text`,debit_total:sql<string>`${ledgerJournalAudits.debitTotal}::text`,
    line_count:sql<string>`${ledgerJournalAudits.lineCount}::text`,asset_count:sql<string>`cardinality(${ledgerJournalAudits.assetIds})::text`})
    .from(ledgerJournalAudits).innerJoin(ledgerJournals,eq(ledgerJournals.id,ledgerJournalAudits.journalId)).where(eq(ledgerJournalAudits.valid,false)).limit(limit));
  const negative=await bounded(()=>database.select({account_id:ledgerAccountTotals.accountId,asset_id:ledgerAccountTotals.assetId,balance:sql<string>`${ledgerAccountTotals.balance}::text`})
    .from(ledgerAccountTotals).where(and(eq(ledgerAccountTotals.ownerType,'user'),inArray(ledgerAccountTotals.purpose,['available_payable','held_payable','incoming_payable','refund_payable']),sql`${ledgerAccountTotals.balance}<0`)).limit(limit));
  const clearing=await bounded(()=>database.select({account_id:ledgerAccountTotals.accountId,asset_id:ledgerAccountTotals.assetId,balance:sql<string>`${ledgerAccountTotals.balance}::text`})
    .from(ledgerAccountTotals).where(and(eq(ledgerAccountTotals.ownerType,'system'),eq(ledgerAccountTotals.purpose,'gift_clearing'),sql`${ledgerAccountTotals.balance}<>0`)).limit(limit));
  const accountNet=sql`coalesce(sum(${ledgerAccountTotals.balance}),0)`;
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
  const nativeOutstanding=database.select({userId:sql<string>`${cryptoObligations.userId}`.as('user_id'),assetId:cryptoObligations.assetId,gross:sql<string>`sum(${cryptoObligations.grossBaseUnits})`.as('gross')}).from(cryptoObligations).where(and(sql`${cryptoObligations.userId} is not null`,inArray(cryptoObligations.status,['held','approved','signing','broadcast','awaiting_requote','exception']),isNull(cryptoObligations.completedAt))).groupBy(cryptoObligations.userId,cryptoObligations.assetId);
  const outstandingRows=database.select({userId:withdrawals.userId,assetId:withdrawals.assetId,gross:sql<string>`sum(${withdrawals.grossBaseUnits})`.as('gross')}).from(withdrawals).where(eq(withdrawals.status,'held')).groupBy(withdrawals.userId,withdrawals.assetId).unionAll(nativeOutstanding).as('outstanding_rows');
  const outstanding=database.select({userId:outstandingRows.userId,assetId:outstandingRows.assetId,gross:sql<string>`sum(${outstandingRows.gross})`.as('gross')}).from(outstandingRows).groupBy(outstandingRows.userId,outstandingRows.assetId).as('outstanding');
  const heldAccounts=database.select({userId:ledgerAccounts.ownerId,assetId:ledgerAccounts.assetId,net:sql<string>`${accountNet}`.as('net')}).from(ledgerAccounts).leftJoin(ledgerAccountTotals,eq(ledgerAccountTotals.accountId,ledgerAccounts.id)).where(and(eq(ledgerAccounts.ownerType,'user'),eq(ledgerAccounts.purpose,'held_payable'))).groupBy(ledgerAccounts.ownerId,ledgerAccounts.assetId).as('held_accounts');
  const heldMismatch=await bounded(()=>database.select({user_id:sql<string>`coalesce(${outstanding.userId},${heldAccounts.userId})`,asset_id:sql<string>`coalesce(${outstanding.assetId},${heldAccounts.assetId})`,held_balance:sql<string>`coalesce(${heldAccounts.net},0)::text`,withdrawal_total:sql<string>`coalesce(${outstanding.gross},0)::text`}).from(outstanding).fullJoin(heldAccounts,and(eq(outstanding.userId,heldAccounts.userId),eq(outstanding.assetId,heldAccounts.assetId))).where(sql`coalesce(${outstanding.gross},0)<>coalesce(${heldAccounts.net},0)`).limit(limit));
  const incomingExpected=database.select({userId:giftInvoices.userId,assetId:giftInvoices.assetId,total:sql<string>`sum(${giftInvoices.actualBaseUnits})`.as('total')}).from(giftInvoices).where(eq(giftInvoices.status,'submitted')).groupBy(giftInvoices.userId,giftInvoices.assetId).as('incoming_expected');
  const paidOrHeldNativeRefund=sql`coalesce((select sum(o.gross_base_units) from ${cryptoObligations} o where o.kind='refund' and o.business_key like 'refund:'||${cryptoEvents.id}::text||':leg:%' and o.asset_id=${cryptoEvents.assetId} and o.user_id=${cryptoInvoices.userId} and o.status in ('held','approved','signing','broadcast','settled','awaiting_requote','exception') and (o.status<>'exception' or o.completed_at is null)),0)`;
  const nativeRefundExpected=database.select({userId:cryptoInvoices.userId,assetId:cryptoEvents.assetId,total:sql<string>`sum(case when ${cryptoEvents.status}='exception' then ${cryptoEvents.amountBaseUnits} else greatest(${cryptoEvents.amountBaseUnits}-${cryptoInvoices.expectedBaseUnits},0) end-${paidOrHeldNativeRefund})`.as('total')}).from(cryptoEvents).innerJoin(cryptoInvoices,eq(cryptoInvoices.id,cryptoEvents.invoiceId)).where(inArray(cryptoEvents.status,['credited','exception'])).groupBy(cryptoInvoices.userId,cryptoEvents.assetId);
  const refundRows=database.select({userId:giftInvoices.userId,assetId:giftInvoices.assetId,total:sql<string>`sum(${giftInvoices.refundableBaseUnits}-coalesce(${simulationIncomingRefunds.amountBaseUnits},0))`.as('total')}).from(giftInvoices).leftJoin(simulationIncomingRefunds,eq(simulationIncomingRefunds.invoiceId,giftInvoices.id)).where(inArray(giftInvoices.status,['credited','exception'])).groupBy(giftInvoices.userId,giftInvoices.assetId).unionAll(nativeRefundExpected).as('refund_rows');
  const refundExpected=database.select({userId:refundRows.userId,assetId:refundRows.assetId,total:sql<string>`sum(${refundRows.total})`.as('total')}).from(refundRows).groupBy(refundRows.userId,refundRows.assetId).as('refund_expected');
  const incomingAccounts=database.select({userId:ledgerAccounts.ownerId,assetId:ledgerAccounts.assetId,net:sql<string>`${accountNet}`.as('net')}).from(ledgerAccounts).leftJoin(ledgerAccountTotals,eq(ledgerAccountTotals.accountId,ledgerAccounts.id)).where(and(eq(ledgerAccounts.ownerType,'user'),eq(ledgerAccounts.purpose,'incoming_payable'))).groupBy(ledgerAccounts.ownerId,ledgerAccounts.assetId).as('incoming_accounts');
  const refundAccounts=database.select({userId:ledgerAccounts.ownerId,assetId:ledgerAccounts.assetId,net:sql<string>`${accountNet}`.as('net')}).from(ledgerAccounts).leftJoin(ledgerAccountTotals,eq(ledgerAccountTotals.accountId,ledgerAccounts.id)).where(and(eq(ledgerAccounts.ownerType,'user'),eq(ledgerAccounts.purpose,'refund_payable'))).groupBy(ledgerAccounts.ownerId,ledgerAccounts.assetId).as('refund_accounts');
  const incomingMismatch=await bounded(()=>database.select({user_id:sql<string>`coalesce(${incomingExpected.userId},${incomingAccounts.userId})`,asset_id:sql<string>`coalesce(${incomingExpected.assetId},${incomingAccounts.assetId})`,held_balance:sql<string>`coalesce(${incomingAccounts.net},0)::text`,invoice_total:sql<string>`coalesce(${incomingExpected.total},0)::text`}).from(incomingExpected).fullJoin(incomingAccounts,and(eq(incomingExpected.userId,incomingAccounts.userId),eq(incomingExpected.assetId,incomingAccounts.assetId))).where(sql`coalesce(${incomingExpected.total},0)<>coalesce(${incomingAccounts.net},0)`).limit(limit));
  const refundMismatch=await bounded(()=>database.select({user_id:sql<string>`coalesce(${refundExpected.userId},${refundAccounts.userId})`,asset_id:sql<string>`coalesce(${refundExpected.assetId},${refundAccounts.assetId})`,refundable_balance:sql<string>`coalesce(${refundAccounts.net},0)::text`,invoice_total:sql<string>`coalesce(${refundExpected.total},0)::text`}).from(refundExpected).fullJoin(refundAccounts,and(eq(refundExpected.userId,refundAccounts.userId),eq(refundExpected.assetId,refundAccounts.assetId))).where(sql`coalesce(${refundExpected.total},0)<>coalesce(${refundAccounts.net},0)`).limit(limit));
  const openReorgs=await bounded(()=>database.select({review_id:simulationReorgReviews.id,source_operation_key:simulationReorgReviews.sourceOperationKey,amount_base_units:simulationReorgReviews.amountBaseUnits,settled_outgoing_exposure:simulationReorgReviews.settledOutgoingExposure}).from(simulationReorgReviews).leftJoin(simulationReorgResolutions,eq(simulationReorgResolutions.reviewId,simulationReorgReviews.id)).where(isNull(simulationReorgResolutions.id)).limit(limit));
  const nativeReviews=await bounded(()=>database.select({review_id:cryptoReorgReviews.id,asset_id:cryptoReorgReviews.assetId,event_id:cryptoReorgReviews.eventId,amount_base_units:cryptoReorgReviews.amountBaseUnits}).from(cryptoReorgReviews).leftJoin(cryptoReorgResolutions,eq(cryptoReorgResolutions.reviewId,cryptoReorgReviews.id)).where(isNull(cryptoReorgResolutions.reviewId)).limit(limit));
  const blockedCustodyAssets=database.select({assetId:treasuryAddresses.assetId}).from(treasuryAddresses)
    .groupBy(treasuryAddresses.assetId).having(sql`not public.gw_native_asset_fence(${treasuryAddresses.assetId})`);
  const recoveryExceptions=await bounded(()=>database.select({checkpoint_id:chainCheckpoints.id,asset_id:treasuryAddresses.assetId,
    treasury_address:sql<string>`left(${treasuryAddresses.address},6)||'…'||right(${treasuryAddresses.address},4)`,
    run_id:chainRecoveryRuns.id,state:chainRecoveryRuns.state}).from(treasuryAddresses)
    .leftJoin(chainCheckpoints,sql`${chainCheckpoints.id}=(select c.id from ${chainCheckpoints} c where c.asset_id=${treasuryAddresses.assetId} and c.treasury_sender=${treasuryAddresses.address} order by c.created_at desc,c.id desc limit 1)`)
    .leftJoin(chainRecoveryRuns,sql`${chainRecoveryRuns.id}=(select r.id from ${chainRecoveryRuns} r where r.checkpoint_id=${chainCheckpoints.id} order by r.created_at desc,r.id desc limit 1)`)
    .where(inArray(treasuryAddresses.assetId,blockedCustodyAssets)).limit(limit));
  const unmatchedMismatch=await bounded(()=>database.select({asset_id:ledgerAccounts.assetId,balance:sql<string>`${accountNet}::text`}).from(ledgerAccounts).leftJoin(ledgerAccountTotals,eq(ledgerAccountTotals.accountId,ledgerAccounts.id)).where(and(eq(ledgerAccounts.ownerType,'system'),eq(ledgerAccounts.purpose,'unallocated_payable'))).groupBy(ledgerAccounts.id,ledgerAccounts.assetId).having(sql`${accountNet}<>(select coalesce(sum(i.amount_base_units),0) from ${unallocatedInflows} i where i.asset_id=${ledgerAccounts.assetId})-(select coalesce(sum(o.gross_base_units),0) from ${cryptoObligations} o where o.asset_id=${ledgerAccounts.assetId} and o.kind='unallocated_refund' and (o.status='settled' or o.completed_at is null and o.status in ('approved','signing','broadcast','exception','awaiting_requote')))` ).limit(limit));
  const balanced = bad.length===0;
  return {
    balanced,consistent:balanced && !recoveryExceptions.length && !unmatchedMismatch.length && !nativeReviews.length && !openReorgs.length && !incomingMismatch.length && !refundMismatch.length && !heldMismatch.length && !negative.length && !clearing.length && !mismatch.length && missingJournals==='0' && missingOperations==='0',
    lineage_complete:missingJournals==='0' && missingOperations==='0' && legacy==='0',
    chain_recovery_exceptions:recoveryExceptions,unallocated_liability_mismatches:unmatchedMismatch,open_native_reorg_reviews:nativeReviews,open_reorg_reviews:openReorgs,incoming_hold_mismatches:incomingMismatch,refundable_mismatches:refundMismatch,imbalanced_journals:bad,held_withdrawal_mismatches:heldMismatch,negative_user_balances:negative,nonzero_gift_clearing:clearing,queue_credit_mismatches:mismatch,
    unlinked_journal_count:missingJournals,unlinked_operation_count:missingOperations,legacy_unsequenced_count:legacy,captured_allocation_count:captured,
    diagnostic_sample_limit:limit,ledger_counter_coverage:{complete:true,sealed_at:coverage.sealedAt},
  };
}
