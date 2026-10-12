import crypto from 'node:crypto';
import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import {
  assets,
  auditEvents,
  cycles,
  ledgerAccounts,
  ledgerJournals,
  ledgerPostings,
  notifications,
  operationKeys,
  planVersions,
  plans,
  pointEvents,
  queueEntries,
  queuePartitions,
  referralCodes,
  users,
  walletLinks,
  withdrawals,
  xManifest,
  readManifest,
  type DbExecutor,
} from '@gifters/db';
import { splitAmount, giftPointAward, formatBaseUnits, usdToGivBaseUnits } from '@gifters/domain';

type UserRow = typeof users.$inferSelect;
type Posting = { accountId: string; direction: 'debit' | 'credit'; amount: bigint };

export async function getUser(database: DbExecutor, username: string) {
  return (await database.select().from(users).where(eq(users.username, username)).limit(1))[0];
}

async function account(database: DbExecutor, assetId: string, ownerType: 'user' | 'platform' | 'system', ownerId: string | null, purpose: string, normalSide: 'debit' | 'credit') {
  const ownerFilter = ownerId ? eq(ledgerAccounts.ownerId, ownerId) : isNull(ledgerAccounts.ownerId);
  const existing = await database.select({ id: ledgerAccounts.id, normalSide: ledgerAccounts.normalSide })
    .from(ledgerAccounts)
    .where(and(eq(ledgerAccounts.assetId, assetId), eq(ledgerAccounts.ownerType, ownerType), ownerFilter, eq(ledgerAccounts.purpose, purpose)))
    .limit(1);
  if (existing[0]) return existing[0];

  const created = await database.insert(ledgerAccounts).values({ assetId, ownerType, ownerId, purpose, normalSide })
    .onConflictDoNothing()
    .returning({ id: ledgerAccounts.id, normalSide: ledgerAccounts.normalSide });
  if (created[0]) return created[0];

  const retry = await database.select({ id: ledgerAccounts.id, normalSide: ledgerAccounts.normalSide })
    .from(ledgerAccounts)
    .where(and(eq(ledgerAccounts.assetId, assetId), eq(ledgerAccounts.ownerType, ownerType), ownerFilter, eq(ledgerAccounts.purpose, purpose)))
    .limit(1);
  if (!retry[0]) throw new Error('INTERNAL_ERROR');
  return retry[0];
}

async function postJournal(database: DbExecutor, type: string, businessKey: string, postings: Posting[], metadata: Record<string, unknown> = {}) {
  const debit = postings.filter((p) => p.direction === 'debit').reduce((n, p) => n + p.amount, 0n);
  const credit = postings.filter((p) => p.direction === 'credit').reduce((n, p) => n + p.amount, 0n);
  if (debit !== credit) throw new Error(`unbalanced journal ${businessKey}: ${debit} != ${credit}`);

  const inserted = await database.insert(ledgerJournals).values({ ledgerType: type, businessKey, metadata })
    .onConflictDoNothing({ target: ledgerJournals.businessKey })
    .returning({ id: ledgerJournals.id });
  if (!inserted[0]) return false;

  const lines = postings.filter((p) => p.amount > 0n).map((p) => ({
    journalId: inserted[0].id,
    accountId: p.accountId,
    direction: p.direction,
    amountBaseUnits: p.amount.toString(),
  }));
  if (lines.length) await database.insert(ledgerPostings).values(lines);
  return true;
}

async function balanceForPurpose(database: DbExecutor, userId: string, assetId: string, purpose: string) {
  const rows = await database.select({
    balance: sql<string>`coalesce(sum(case when ${ledgerPostings.direction} = 'credit' then ${ledgerPostings.amountBaseUnits} else -${ledgerPostings.amountBaseUnits} end), 0)::text`,
  }).from(ledgerAccounts)
    .leftJoin(ledgerPostings, eq(ledgerPostings.accountId, ledgerAccounts.id))
    .where(and(
      eq(ledgerAccounts.assetId, assetId),
      eq(ledgerAccounts.ownerType, 'user'),
      eq(ledgerAccounts.ownerId, userId),
      eq(ledgerAccounts.purpose, purpose),
    ));
  return BigInt(rows[0]?.balance ?? '0');
}

export function availableBalance(database: DbExecutor, userId: string, assetId: string) {
  return balanceForPurpose(database, userId, assetId, 'available_payable');
}

export function heldBalance(database: DbExecutor, userId: string, assetId: string) {
  return balanceForPurpose(database, userId, assetId, 'held_payable');
}

export async function consentUser(database: DbExecutor, username: string, referralCode?: string) {
  const manifest = await readManifest(database);
  // Raw SQL is intentionally limited to lock acquisition; all row reads/writes use Drizzle.
  await database.execute(sql`select id from users where username=${username} for update`);
  const user = await getUser(database, username);
  if (!user) throw new Error('NOT_FOUND');
  if (user.status === 'active' && user.consentedAt) return user;
  if (user.status !== 'pending_consent') throw new Error('ACCOUNT_RESTRICTED');

  let referrerId: string | null = null;
  if (referralCode) {
    const refs = await database.select({ id: users.id, status: users.status })
      .from(referralCodes)
      .innerJoin(users, eq(users.id, referralCodes.userId))
      .where(eq(referralCodes.code, referralCode))
      .limit(1);
    if (refs[0]?.id !== user.id && refs[0]?.status === 'active') referrerId = refs[0].id;
  }

  const updated = await database.update(users).set({
    status: 'active', consentVersion: manifest.terms_content.version, consentedAt: new Date(), referrerUserId: referrerId, updatedAt: new Date(),
  }).where(eq(users.id, user.id)).returning();
  await database.insert(referralCodes).values({ userId: user.id }).onConflictDoNothing({ target: referralCodes.userId });

  const asset = (await database.select({ id: assets.id }).from(assets)
    .where(and(eq(assets.symbol, 'GIV'), eq(assets.environment, 'simulation'), eq(assets.enabled, true))).limit(1))[0];
  if (!asset) throw new Error('PLAN_UNAVAILABLE');
  const grant = usdToGivBaseUnits(manifest.simulation_policy.giv_grant);
  const userAvail = await account(database, asset.id, 'user', user.id, 'available_payable', 'credit');
  const grantExpense = await account(database, asset.id, 'system', null, 'simulation_grant_expense', 'debit');
  await postJournal(database, 'GIV_GRANT', `giv-grant:simulation:${user.id}`, [
    { accountId: grantExpense.id, direction: 'debit', amount: grant },
    { accountId: userAvail.id, direction: 'credit', amount: grant },
  ], { user_id: user.id });

  if (referrerId) {
    await database.insert(pointEvents).values({ userId: referrerId, sourceKey: `consent:${user.id}`, awardType: 'signup', points: manifest.points_rules.signup }).onConflictDoNothing();
  }
  return updated[0];
}

export async function activatePlan(database: DbExecutor, planId: string, actorId: string) {
  const manifest = await readManifest(database);
  await database.execute(sql`select id from plans where id=${planId} for update`);
  const plan = (await database.select().from(plans).where(eq(plans.id, planId)).limit(1))[0];
  if (!plan) throw new Error('NOT_FOUND');

  if (plan.status === 'active') return { plan_id:planId, status:'active' };

  const versionRows = await database.select({ version: planVersions, symbol: assets.symbol })
    .from(planVersions)
    .innerJoin(assets, eq(assets.id, planVersions.assetId))
    .where(and(eq(planVersions.planId, planId), eq(assets.environment, 'simulation')))
    .orderBy(desc(planVersions.version)).limit(1);
  const v = versionRows[0]?.version;
  if (!v) throw new Error('NOT_FOUND');
  await database.execute(sql`select id from plan_versions where id=${v.id} for update`);

  await database.update(plans).set({ status: 'active', updatedAt: new Date() }).where(eq(plans.id, planId));
  await database.update(planVersions).set({ active: true }).where(eq(planVersions.id, v.id));
  const configKey = `plan_config_${planId}`;
  const planConfig = manifest[configKey];
  if (!planConfig || typeof planConfig !== 'object' || Array.isArray(planConfig)) throw new Error('CONFIGURATION_INVALID');
  await database.update(xManifest).set({ value:{...planConfig,status:'active',amount_base_units:v.amountBaseUnits}, version:sql`${xManifest.version} + 1`, updatedBy:actorId, updatedAt:new Date() }).where(eq(xManifest.key,configKey));

  await database.execute(sql`select id from queue_partitions where plan_version_id=${v.id} for update`);
  let partition = (await database.select().from(queuePartitions).where(eq(queuePartitions.planVersionId, v.id)).limit(1))[0];
  if (!partition) {
    partition = (await database.insert(queuePartitions).values({ planVersionId: v.id, nextTicket: 1 }).returning())[0];
    if (plan.bootstrapEnabled && plan.bootstrapCount > 0) {
      await database.insert(queueEntries).values(Array.from({ length: plan.bootstrapCount }, (_, i) => ({
        partitionId: partition.id,
        ticket: i + 1,
        kind: 'bootstrap',
        platformRole: 'developer',
        requiredCount: v.receiptsRequired,
        status: 'waiting',
      })));
      await database.update(queuePartitions).set({ nextTicket: plan.bootstrapCount + 1 }).where(eq(queuePartitions.id, partition.id));
    }
  }

  await database.insert(auditEvents).values({
    actorUserId: actorId,
    action: 'plan.activate',
    targetType: 'plan',
    targetId: planId,
    reason: 'simulation activation',
    afterState: { status: 'active' },
  });
  return { plan_id: planId, status: 'active' };
}

export async function sendGift(database: DbExecutor, user: UserRow, planId: string, requestKey: string) {
  const manifest = await readManifest(database);
  if (user.status !== 'active') throw new Error(user.status === 'pending_consent' ? 'CONSENT_REQUIRED' : 'ACCOUNT_RESTRICTED');
  const opKey = `gift:${user.id}:${requestKey}`;
  const requestHash = crypto.createHash('sha256').update(planId).digest('hex');
  const prior = (await database.select().from(operationKeys).where(eq(operationKeys.businessKey, opKey)).limit(1))[0];
  if (prior?.result) {
    if (prior.requestHash !== requestHash) throw new Error('VERSION_CONFLICT');
    return prior.result;
  }

  await database.execute(sql`select pv.id from plan_versions pv join plans p on p.id=pv.plan_id join assets a on a.id=pv.asset_id where p.id=${planId} and pv.active=true and a.environment='simulation' for update of pv,p`);
  const versions = await database.select({
    id: planVersions.id,
    planId: planVersions.planId,
    assetId: planVersions.assetId,
    amountBaseUnits: planVersions.amountBaseUnits,
    receiverBps: planVersions.receiverBps,
    marketingBps: planVersions.marketingBps,
    referralBps: planVersions.referralBps,
    developerBps: planVersions.developerBps,
    reserveBps: planVersions.reserveBps,
    receiptsRequired: planVersions.receiptsRequired,
    name: plans.name,
    slug: plans.slug,
    usdReference: plans.usdReference,
    planStatus: plans.status,
    symbol: assets.symbol,
  }).from(planVersions)
    .innerJoin(plans, eq(plans.id, planVersions.planId))
    .innerJoin(assets, eq(assets.id, planVersions.assetId))
    .where(and(eq(plans.id, planId), eq(planVersions.active, true), eq(assets.environment, 'simulation')))
    .limit(1);
  const v = versions[0];
  if (!v || v.planStatus !== 'active') throw new Error('PLAN_UNAVAILABLE');

  const replayAfterLock = (await database.select().from(operationKeys).where(eq(operationKeys.businessKey, opKey)).limit(1))[0];
  if (replayAfterLock?.result) {
    if (replayAfterLock.requestHash !== requestHash) throw new Error('VERSION_CONFLICT');
    return replayAfterLock.result;
  }

  const active = await database.select({ id: cycles.id }).from(cycles)
    .where(and(eq(cycles.userId, user.id), eq(cycles.planVersionId, v.id), inArray(cycles.status, ['active', 'exception']))).limit(1);
  if (active[0]) throw new Error('ACTIVE_CYCLE_EXISTS');
  const recent = await database.select({ completedAt: cycles.completedAt }).from(cycles)
    .where(and(eq(cycles.userId, user.id), eq(cycles.planVersionId, v.id), eq(cycles.status, 'completed')))
    .orderBy(desc(cycles.completedAt)).limit(1);
  if (recent[0]?.completedAt) {
    const elapsed = Date.now() - recent[0].completedAt.getTime();
    if (elapsed < manifest.cycle_rejoin_cooldown_hours * 3600_000) throw new Error('COOLDOWN_ACTIVE');
  }

  const amount = BigInt(v.amountBaseUnits);
  const available = await availableBalance(database, user.id, v.assetId);
  if (available < amount) throw new Error('INSUFFICIENT_BALANCE');
  const split = splitAmount(amount, {
    receiver: v.receiverBps, marketing: v.marketingBps, referral: v.referralBps, developer: v.developerBps, reserve: v.reserveBps,
  });
  const senderAvail = await account(database, v.assetId, 'user', user.id, 'available_payable', 'credit');
  const clearing = await account(database, v.assetId, 'system', null, 'gift_clearing', 'credit');
  const marketing = await account(database, v.assetId, 'platform', null, 'marketing_payable', 'credit');
  const developer = await account(database, v.assetId, 'platform', null, 'developer_payable', 'credit');
  const reserve = await account(database, v.assetId, 'platform', null, 'reserve_equity', 'credit');

  await database.execute(sql`select id from queue_partitions where plan_version_id=${v.id} for update`);
  const partition = (await database.select().from(queuePartitions).where(eq(queuePartitions.planVersionId, v.id)).limit(1))[0];
  if (!partition) throw new Error('PLAN_UNAVAILABLE');

  const recipients = await database.select().from(queueEntries)
    .where(and(eq(queueEntries.partitionId, partition.id), eq(queueEntries.status, 'waiting')))
    .orderBy(sql`${queueEntries.priorityTicket} is null`, asc(queueEntries.priorityTicket), asc(queueEntries.ticket)).limit(1);
  const recipient = recipients[0];
  if (recipient) await database.execute(sql`select id from queue_entries where id=${recipient.id} for update`);

  await postJournal(database, 'GIFT_IN', `gift-in:${user.id}:${requestKey}`, [
    { accountId: senderAvail.id, direction: 'debit', amount },
    { accountId: clearing.id, direction: 'credit', amount },
  ], { sender: user.id, plan_id: planId });

  let receiverLabel = 'developer';
  let receiverAccount = developer;
  if (recipient?.kind === 'member' && recipient.beneficiaryUserId) {
    receiverAccount = await account(database, v.assetId, 'user', recipient.beneficiaryUserId, 'available_payable', 'credit');
    receiverLabel = recipient.beneficiaryUserId;
  }
  await postJournal(database, 'RECEIVER_ALLOCATE', `allocation:${opKey}:receiver:${receiverLabel}`, [
    { accountId: clearing.id, direction: 'debit', amount: split.receiver },
    { accountId: receiverAccount.id, direction: 'credit', amount: split.receiver },
  ], { plan_id: planId, receiver: receiverLabel });
  await postJournal(database, 'MARKETING_ALLOCATE', `allocation:${opKey}:marketing`, [
    { accountId: clearing.id, direction: 'debit', amount: split.marketing },
    { accountId: marketing.id, direction: 'credit', amount: split.marketing },
  ]);
  await postJournal(database, 'DEV_ALLOCATE', `allocation:${opKey}:developer`, [
    { accountId: clearing.id, direction: 'debit', amount: split.developer },
    { accountId: developer.id, direction: 'credit', amount: split.developer },
  ]);

  const eligibleReferrer = user.referrerUserId
    ? (await database.select({ id: users.id, status: users.status }).from(users).where(eq(users.id, user.referrerUserId)).limit(1))[0]
    : undefined;
  if (eligibleReferrer?.status === 'active') {
    const refAvail = await account(database, v.assetId, 'user', eligibleReferrer.id, 'available_payable', 'credit');
    await postJournal(database, 'REFERRAL_ALLOCATE', `allocation:${opKey}:referral:${eligibleReferrer.id}`, [
      { accountId: clearing.id, direction: 'debit', amount: split.referral },
      { accountId: refAvail.id, direction: 'credit', amount: split.referral },
    ]);
  } else {
    await postJournal(database, 'REFERRAL_FALLBACK_ALLOCATE', `allocation:${opKey}:referral:reserve`, [
      { accountId: clearing.id, direction: 'debit', amount: split.referral },
      { accountId: reserve.id, direction: 'credit', amount: split.referral },
    ]);
  }
  await postJournal(database, 'RESERVE_ALLOCATE', `allocation:${opKey}:reserve`, [
    { accountId: clearing.id, direction: 'debit', amount: split.reserve },
    { accountId: reserve.id, direction: 'credit', amount: split.reserve },
  ]);

  if (recipient) {
    const newCount = recipient.creditedCount + 1;
    const fulfilled = newCount >= recipient.requiredCount;
    await database.update(queueEntries).set({ creditedCount: newCount, status: fulfilled ? 'fulfilled' : 'waiting' }).where(eq(queueEntries.id, recipient.id));
    if (recipient.kind === 'member' && recipient.cycleId && recipient.beneficiaryUserId) {
      await database.update(cycles).set({ creditedCount: newCount, status: fulfilled ? 'completed' : 'active', completedAt: fulfilled ? new Date() : null }).where(eq(cycles.id, recipient.cycleId));
      await database.insert(notifications).values({
        userId: recipient.beneficiaryUserId,
        titleKey: 'gift_received',
        body: `You received ${formatBaseUnits(split.receiver)} GIV from a subsequent gift.${fulfilled ? ' Your cycle is complete.' : ''}`,
      });
    }
  }

  const cycle = (await database.insert(cycles).values({ userId: user.id, planVersionId: v.id, status: 'active', creditedCount: 0, receiptsRequired: v.receiptsRequired }).returning())[0];
  const ticket = partition.nextTicket;
  await database.insert(queueEntries).values({
    partitionId: partition.id, ticket, kind: 'member', cycleId: cycle.id, beneficiaryUserId: user.id, requiredCount: v.receiptsRequired, status: 'waiting',
  });
  await database.update(queuePartitions).set({
    nextTicket: sql`${queuePartitions.nextTicket} + 1`,
    revision: sql`${queuePartitions.revision} + 1`,
  }).where(eq(queuePartitions.id, partition.id));

  const award = giftPointAward(v.usdReference, manifest.points_rules);
  await database.insert(pointEvents).values({ userId: user.id, sourceKey: `gift:${cycle.id}`, awardType: 'gift_sender', points: award.sender }).onConflictDoNothing();
  if (eligibleReferrer?.status === 'active') {
    await database.insert(pointEvents).values({ userId: eligibleReferrer.id, sourceKey: `gift:${cycle.id}`, awardType: 'gift_referrer', points: award.referrer }).onConflictDoNothing();
  }
  await database.insert(notifications).values({ userId: user.id, titleKey: 'gift_sent', body: `${v.name} gift confirmed. You joined the receiver queue.` });

  const result = {
    cycle_id: cycle.id,
    plan_id: planId,
    ticket,
    amount_base_units: amount.toString(),
    amount_giv: formatBaseUnits(amount),
    receiver_allocation_base_units: split.receiver.toString(),
  };
  await database.insert(operationKeys).values({ businessKey: opKey, requestHash, result });
  return result;
}

export async function linkSimulationWallet(database: DbExecutor, user: UserRow) {
  if (user.status !== 'active') throw new Error('ACCOUNT_RESTRICTED');
  const address = `giv:${user.username}`;
  const rows = await database.insert(walletLinks).values({ userId: user.id, environment: 'simulation', chainId: 'giv', address })
    .onConflictDoUpdate({
      target: [walletLinks.userId, walletLinks.environment, walletLinks.chainId],
      set: { address, verifiedAt: new Date() },
    }).returning();
  return rows[0];
}

export async function quoteWithdrawal(database: DbExecutor, user: UserRow, gross: bigint, requestKey: string) {
  const manifest = await readManifest(database);
  if (gross <= 0n) throw new Error('INVALID_INPUT');
  const asset = (await database.select({ id: assets.id }).from(assets).where(and(eq(assets.symbol, 'GIV'), eq(assets.environment, 'simulation'))).limit(1))[0];
  if (!asset) throw new Error('PLAN_UNAVAILABLE');
  const balance = await availableBalance(database, user.id, asset.id);
  if (balance < gross) throw new Error('INSUFFICIENT_BALANCE');
  const wallet = (await database.select().from(walletLinks).where(and(eq(walletLinks.userId, user.id), eq(walletLinks.environment, 'simulation'), eq(walletLinks.chainId, 'giv'))).limit(1))[0];
  if (!wallet) throw new Error('INVALID_ADDRESS');
  const durableKey = `withdrawal-quote:${user.id}:${requestKey}`;
  const rows = await database.insert(withdrawals).values({
    userId: user.id,
    assetId: asset.id,
    grossBaseUnits: gross.toString(),
    feeBaseUnits: '0',
    netBaseUnits: gross.toString(),
    destination: wallet.address,
    status: 'quoted',
    quoteExpiresAt: new Date(Date.now() + manifest.withdrawal_fee_policy.quote_ttl_minutes * 60_000),
    requestKey: durableKey,
  }).onConflictDoUpdate({ target: withdrawals.requestKey, set: { requestKey: durableKey } }).returning();
  return rows[0];
}

export async function confirmWithdrawal(database: DbExecutor, user: UserRow, withdrawalId: string) {
  await database.execute(sql`select id from withdrawals where id=${withdrawalId} and user_id=${user.id} for update`);
  const w = (await database.select().from(withdrawals).where(and(eq(withdrawals.id, withdrawalId), eq(withdrawals.userId, user.id))).limit(1))[0];
  if (!w) throw new Error('NOT_FOUND');
  if (w.status === 'settled') return w;
  if (w.status !== 'quoted') throw new Error('VERSION_CONFLICT');
  if (w.quoteExpiresAt.getTime() < Date.now()) throw new Error('QUOTE_EXPIRED');
  const gross = BigInt(w.grossBaseUnits);
  const available = await availableBalance(database, user.id, w.assetId);
  if (available < gross) throw new Error('INSUFFICIENT_BALANCE');
  const avail = await account(database, w.assetId, 'user', user.id, 'available_payable', 'credit');
  const held = await account(database, w.assetId, 'user', user.id, 'held_payable', 'credit');
  const sink = await account(database, w.assetId, 'system', null, 'simulation_settlement_sink', 'credit');
  await postJournal(database, 'PAYOUT_HOLD', `payout-hold:${w.id}`, [
    { accountId: avail.id, direction: 'debit', amount: gross },
    { accountId: held.id, direction: 'credit', amount: gross },
  ], { withdrawal_id: w.id });
  await database.update(withdrawals).set({ status: 'held' }).where(eq(withdrawals.id, w.id));
  await postJournal(database, 'PAYOUT_SETTLE', `payout-settle:${w.id}`, [
    { accountId: held.id, direction: 'debit', amount: gross },
    { accountId: sink.id, direction: 'credit', amount: gross },
  ], { withdrawal_id: w.id, simulation: true });
  const settled = await database.update(withdrawals).set({ status: 'settled', settledAt: new Date() }).where(eq(withdrawals.id, w.id)).returning();
  await database.insert(notifications).values({
    userId: user.id,
    titleKey: 'withdrawal_settled',
    body: `Simulation withdrawal settled for ${formatBaseUnits(gross)} GIV. No on-chain export occurred.`,
  });
  return settled[0];
}

export async function dashboard(database: DbExecutor, user: UserRow) {
  const manifest = await readManifest(database);
  const asset = (await database.select().from(assets).where(and(eq(assets.symbol, 'GIV'), eq(assets.environment, 'simulation'))).limit(1))[0];
  if (!asset) throw new Error('PLAN_UNAVAILABLE');
  const available = user.status === 'pending_consent' ? 0n : await availableBalance(database, user.id, asset.id);
  const held = user.status === 'pending_consent' ? 0n : await heldBalance(database, user.id, asset.id);

  const userCycles = await database.select({
    id: cycles.id,
    status: cycles.status,
    credited_count: cycles.creditedCount,
    receipts_required: cycles.receiptsRequired,
    completed_at: cycles.completedAt,
    created_at: cycles.createdAt,
    plan_id: plans.id,
    name: plans.name,
    slug: plans.slug,
    ticket: queueEntries.ticket,
    display_position: sql<number>`(select count(*) from queue_entries q2 where q2.partition_id=${queueEntries.partitionId} and q2.status='waiting' and q2.ticket < ${queueEntries.ticket}) + 1`,
  }).from(cycles)
    .innerJoin(planVersions, eq(planVersions.id, cycles.planVersionId))
    .innerJoin(plans, eq(plans.id, planVersions.planId))
    .leftJoin(queueEntries, eq(queueEntries.cycleId, cycles.id))
    .where(eq(cycles.userId, user.id))
    .orderBy(desc(cycles.createdAt)).limit(30);

  const pointRows = await database.select({ total: sql<number>`coalesce(sum(${pointEvents.points}),0)::int` }).from(pointEvents).where(eq(pointEvents.userId, user.id));
  const notices = await database.select().from(notifications).where(eq(notifications.userId, user.id)).orderBy(desc(notifications.createdAt)).limit(manifest.notification_page_size);
  const wallet = (await database.select().from(walletLinks).where(and(eq(walletLinks.userId, user.id), eq(walletLinks.environment, 'simulation'), eq(walletLinks.chainId, 'giv'))).limit(1))[0];
  const withdrawnRows = await database.select({ total: sql<string>`coalesce(sum(${withdrawals.netBaseUnits}),0)::text` }).from(withdrawals)
    .where(and(eq(withdrawals.userId, user.id), eq(withdrawals.assetId, asset.id), eq(withdrawals.status, 'settled')));

  return {
    user: { id: user.id, username: user.username, role: user.role, status: user.status, locale: user.locale },
    asset: { symbol: 'GIV', decimals: 2 },
    balances: { available: available.toString(), held: held.toString(), withdrawn: withdrawnRows[0]?.total ?? '0' },
    points: pointRows[0]?.total ?? 0,
    cycles: userCycles,
    notifications: notices,
    wallet: wallet ?? null,
  };
}
