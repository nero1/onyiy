import {presentationFromManifest,type QueueDisclosure} from './presentation';
import {publicManifest} from '@gifters/config';
import {activeRequestId} from '@gifters/db';
import {notificationBadge} from './notifications';
import crypto from 'node:crypto';
import { and, asc, desc, eq, inArray, isNull, isNotNull, gte, lt, sql } from 'drizzle-orm';
import {
  assets,
  giftInvoices,
  userFinancialReviews,
  cycleFinancialReviews,
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
  userAccountBalances,
  receiptAllocations,
  simulationWithdrawalControls,
  readManifest,
  type DbExecutor,
} from '@gifters/db';
import { splitAmount, giftPointAward, formatBaseUnits, usdToGivBaseUnits, QUEUE_TICKET_CEILING } from '@gifters/domain';
import type { Manifest } from '@gifters/config';
import { enqueueNotification } from './jobs';
import {assertUnfrozen,assertPartitionReady} from './financial-review';

type UserRow = typeof users.$inferSelect;
type Posting = { accountId: string; direction: 'debit' | 'credit'; amount: bigint };

// All debits from a user's available balance take this same lock. NO KEY
// UPDATE permits unrelated incoming credits/FK checks while serializing spend.
export async function lockUser(database: DbExecutor, id: string) {
  const user = (await database.select().from(users).where(eq(users.id,id)).limit(1).for('no key update'))[0];
  if (!user) throw new Error('UNAUTHENTICATED');
  return user;
}

export async function lockGiftParticipants(database:DbExecutor,userId:string,manifest:Manifest,extraIds:string[]=[]){
 const [candidate]=await database.select().from(users).where(eq(users.id,userId)).limit(1);if(!candidate)throw new Error('UNAUTHENTICATED');
 const ids=[...new Set([userId,...extraIds,...(manifest.feature_referrals && candidate.referrerUserId?[candidate.referrerUserId]:[])])].sort();
 const participants=new Map<string,UserRow>();for(const id of ids)participants.set(id,await lockUser(database,id));
 const user=participants.get(userId)!;if(user.referrerUserId!==candidate.referrerUserId)throw new Error('VERSION_CONFLICT');return {user,participants};
}

function eligibleWithdrawal(user: UserRow) {
  if (!['active','deactivated'].includes(user.status) || !user.consentedAt) throw new Error('ACCOUNT_RESTRICTED');
}

export async function simulationAsset(database: DbExecutor, manifest: Manifest & Record<string,unknown>) {
  if((process.env.APP_ENV??'simulation')!=='simulation')throw new Error('FEATURE_DISABLED');
  const asset = (await database.select().from(assets).where(and(eq(assets.symbol,'GIV'),eq(assets.environment,'simulation'),eq(assets.chainId,'giv'))).limit(1))[0];
  if (!asset?.enabled) throw new Error('PLAN_UNAVAILABLE');
  const config = manifest[`asset_config_${asset.id}`] as {enabled:boolean;environment:string;chain_id:string;decimals:number} | undefined;
  if (!config || config.environment !== asset.environment || config.chain_id !== asset.chainId || config.decimals !== asset.decimals) throw new Error('CONFIGURATION_INVALID');
  if (!config.enabled) throw new Error('PLAN_UNAVAILABLE');
  return asset;
}

type PointAward = {userId:string;sourceKey:string;awardType:string;points:number};
async function awardPoints(database: DbExecutor, manifest: Manifest, awards: PointAward[]) {
  if (!manifest.feature_points || manifest.points_daily_cap === 0 || !awards.length) return;
  const [clock] = await database.select({day:sql<string>`(current_timestamp at time zone 'UTC')::date::text`}).from(users).where(eq(users.id,awards[0].userId)).limit(1);
  // PostgreSQL-specific transaction advisory locks protect durable daily counts.
  // Sorted keys prevent crossed sender/referrer awards from deadlocking.
  for (const id of [...new Set(awards.map((award) => award.userId))].sort()) {
    await database.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`gw:points:${id}:${clock.day}`},0))`);
  }
  const start = sql`date_trunc('day', current_timestamp at time zone 'UTC') at time zone 'UTC'`;
  for (const award of awards) {
    if (award.points <= 0) continue;
    const prior = await database.select({id:pointEvents.id}).from(pointEvents).where(and(eq(pointEvents.userId,award.userId),eq(pointEvents.sourceKey,award.sourceKey),eq(pointEvents.awardType,award.awardType))).limit(1);
    if (prior.length) continue;
    const [total] = await database.select({points:sql<number>`coalesce(sum(greatest(${pointEvents.points},0)),0)::int`}).from(pointEvents).where(and(eq(pointEvents.userId,award.userId),gte(pointEvents.createdAt,start),lt(pointEvents.createdAt,sql`${start} + interval '1 day'`),sql`${pointEvents.awardType}<>'gift_reorg_reconfirm'`));
    const allowed = Math.min(award.points,Math.max(0,manifest.points_daily_cap - total.points));
    if (allowed > 0) await database.insert(pointEvents).values({...award,points:allowed}).onConflictDoNothing();
  }
}

export async function getUser(database: DbExecutor, username: string) {
  return (await database.select().from(users).where(eq(users.username, username)).limit(1))[0];
}

export async function account(database: DbExecutor, assetId: string, ownerType: 'user' | 'platform' | 'system', ownerId: string | null, purpose: string, normalSide: 'debit' | 'credit') {
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

export async function postJournal(database: DbExecutor, type: string, businessKey: string, postings: Posting[], metadata: Record<string, unknown> = {}) {
  const debit = postings.filter((p) => p.direction === 'debit').reduce((n, p) => n + p.amount, 0n);
  const credit = postings.filter((p) => p.direction === 'credit').reduce((n, p) => n + p.amount, 0n);
  if (debit !== credit) throw new Error(`unbalanced journal ${businessKey}: ${debit} != ${credit}`);
  if (debit === 0n) return null;

  const inserted = await database.insert(ledgerJournals).values({ ledgerType: type, businessKey, metadata: {...metadata,...(activeRequestId()?{request_id:activeRequestId()}: {})} })
    .onConflictDoNothing({ target: ledgerJournals.businessKey })
    .returning({ id: ledgerJournals.id });
  if (!inserted[0]) return null;

  const lines = postings.filter((p) => p.amount > 0n).map((p) => ({
    journalId: inserted[0].id,
    accountId: p.accountId,
    direction: p.direction,
    amountBaseUnits: p.amount.toString(),
  }));
  if (lines.length) await database.insert(ledgerPostings).values(lines);
  return inserted[0].id;
}

async function balanceForPurpose(database: DbExecutor, userId: string, assetId: string, purpose: string) {
  const rows = await database.select({
    balance: sql<string>`coalesce(sum(public.gw_account_balance(${ledgerAccounts.id})),0)::text`,
  }).from(ledgerAccounts)
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
  const user = (await database.select().from(users).where(eq(users.username,username)).limit(1).for('no key update'))[0];
  if (!user) throw new Error('NOT_FOUND');
  if (user.status === 'active' && user.consentedAt) {
    if (user.consentVersion === manifest.terms_content.version) return user;
    return (await database.update(users).set({consentVersion:manifest.terms_content.version,consentedAt:new Date(),updatedAt:new Date()}).where(eq(users.id,user.id)).returning())[0];
  }
  if (!['pending_consent','active'].includes(user.status)) throw new Error('ACCOUNT_RESTRICTED');

  let referrerId: string | null = null;
  if (referralCode) {
    const refs = await database.select({ id: users.id, status: users.status })
      .from(referralCodes)
      .innerJoin(users, eq(users.id, referralCodes.userId))
      .where(eq(referralCodes.code, referralCode))
      .limit(1).for('no key update',{of:users});
    if (refs[0]?.id !== user.id && refs[0]?.status === 'active') referrerId = refs[0].id;
  }

  const updated = await database.update(users).set({
    status: 'active', consentVersion: manifest.terms_content.version, consentedAt: new Date(), referrerUserId: referrerId, updatedAt: new Date(),
  }).where(eq(users.id, user.id)).returning();
  await database.insert(referralCodes).values({ userId: user.id }).onConflictDoNothing({ target: referralCodes.userId });

  if((process.env.APP_ENV??'simulation')==='simulation'){
  const asset = await simulationAsset(database,manifest);
  const grant = usdToGivBaseUnits(manifest.simulation_policy.giv_grant);
  const userAvail = await account(database, asset.id, 'user', user.id, 'available_payable', 'credit');
  const grantExpense = await account(database, asset.id, 'system', null, 'simulation_grant_expense', 'debit');
  await postJournal(database, 'GIV_GRANT', `giv-grant:simulation:${user.id}`, [
    { accountId: grantExpense.id, direction: 'debit', amount: grant },
    { accountId: userAvail.id, direction: 'credit', amount: grant },
  ], { user_id: user.id });

  }
  if (referrerId && manifest.feature_referrals) {
    await awardPoints(database,manifest,[{userId:referrerId,sourceKey:`consent:${user.id}`,awardType:'signup',points:manifest.points_rules.signup}]);
  }
  return updated[0];
}

export async function activatePlan(database: DbExecutor, planId: string, actorId: string, requestKey: string,scheduledVersion?:number) {
  requestKey=requestKey.toLowerCase();
  const manifest = await readManifest(database);
  if (!manifest.feature_admin || !manifest.feature_gifts) throw new Error('FEATURE_DISABLED');
  const actor = await lockUser(database,actorId);
  if (actor.role !== 'admin' || actor.status !== 'active') throw new Error('FORBIDDEN');
  await simulationAsset(database,manifest);
  const operationKey = `admin-activate:${actorId}:${requestKey}`;
  const requestHash = crypto.createHash('sha256').update(planId).digest('hex');
  const prior = (await database.select().from(operationKeys).where(eq(sql<string>`lower(${operationKeys.businessKey})`,operationKey)).limit(1))[0];
  if (prior?.result) {
    if (prior.requestHash !== requestHash) throw new Error('VERSION_CONFLICT');
    return prior.result;
  }
  const result = {plan_id:planId,status:'active'};
  const save = async () => { await database.insert(operationKeys).values({businessKey:operationKey,requestHash,result}); return result; };
  await database.execute(sql`select id from plans where id=${planId} for update`);
  const plan = (await database.select().from(plans).where(eq(plans.id, planId)).limit(1))[0];
  if (!plan) throw new Error('NOT_FOUND');

  if(plan.status==='retired')throw new Error('PLAN_UNAVAILABLE');
  if(scheduledVersion!==undefined){const [config]=await database.select().from(xManifest).where(eq(xManifest.key,`plan_config_${plan.id}`)).for('update');const value=config?.value as {launch_at?:string;status?:string}|undefined;const [clock]=await database.execute<{now:Date}>(sql`select clock_timestamp() as now`);if(plan.status!=='scheduled'||config?.version!==scheduledVersion||value?.status!=='scheduled'||!value.launch_at||new Date(value.launch_at)>new Date(clock.now))throw new Error('VERSION_CONFLICT');}
  if (plan.status === 'active') return save();

  const versionRows = await database.select({ version: planVersions, symbol: assets.symbol })
    .from(planVersions)
    .innerJoin(assets, eq(assets.id, planVersions.assetId))
    .where(and(eq(planVersions.planId, planId), eq(assets.environment, 'simulation')))
    .orderBy(desc(planVersions.version)).limit(1);
  const v = versionRows[0]?.version;
  if (!v) throw new Error('NOT_FOUND');
  if (BigInt(v.amountBaseUnits) <= 0n || v.receiptsRequired <= 0 || splitAmount(BigInt(v.amountBaseUnits),{receiver:v.receiverBps,marketing:v.marketingBps,referral:v.referralBps,developer:v.developerBps,reserve:v.reserveBps}).receiver <= 0n) throw new Error('CONFIGURATION_INVALID');
  await database.execute(sql`select id from plan_versions where id=${v.id} for update`);

  await database.update(plans).set({ status: 'active',revision:sql`${plans.revision}+1`, updatedAt: new Date() }).where(eq(plans.id, planId));
  await database.update(planVersions).set({ active: true }).where(eq(planVersions.id, v.id));
  const configKey = `plan_config_${planId}`;
  const planConfig = manifest[configKey];
  if (!planConfig || typeof planConfig !== 'object' || Array.isArray(planConfig)) throw new Error('CONFIGURATION_INVALID');
  const bootstrapEnabled = manifest.feature_bootstrap && plan.bootstrapEnabled;
  await database.update(xManifest).set({ value:{...planConfig,status:'active',amount_base_units:v.amountBaseUnits,bootstrap_enabled:bootstrapEnabled,bootstrap_count:bootstrapEnabled ? plan.bootstrapCount : 0}, version:sql`${xManifest.version} + 1`, updatedBy:actorId, updatedAt:new Date() }).where(eq(xManifest.key,configKey));

  await database.execute(sql`select id from queue_partitions where plan_version_id=${v.id} for update`);
  let partition = (await database.select().from(queuePartitions).where(eq(queuePartitions.planVersionId, v.id)).limit(1))[0];
  if (!partition) {
    partition = (await database.insert(queuePartitions).values({ planVersionId: v.id, nextTicket: 1 }).returning())[0];
    if (manifest.feature_bootstrap && plan.bootstrapEnabled && plan.bootstrapCount > 0) {
      await database.insert(queueEntries).values(Array.from({ length: plan.bootstrapCount }, (_, i) => ({
        partitionId: partition.id,
        ticket: i + 1,
        kind: 'bootstrap',
        platformRole: manifest.bootstrap_destination_role,
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
  return save();
}

export async function sendGift(database: DbExecutor, user: UserRow, planId: string, requestKey: string, expectedVersionId?: string,verifiedAsset?:typeof assets.$inferSelect,historicalConsent=false) {
  requestKey=requestKey.toLowerCase();
  const manifest = await readManifest(database);
  if (!manifest.feature_gifts||!manifest.entitlements_member.send_enabled_gifts) throw new Error('FEATURE_DISABLED');
  const locked=await lockGiftParticipants(database,user.id,manifest);user=locked.user;const participants=locked.participants;
  if (user.status !== 'active') throw new Error(user.status === 'pending_consent' ? 'CONSENT_REQUIRED' : 'ACCOUNT_RESTRICTED');
  if (user.consentVersion !== manifest.terms_content.version&&!historicalConsent) throw new Error('CONSENT_REQUIRED');
  const asset=verifiedAsset??await simulationAsset(database,manifest);if(verifiedAsset&&(verifiedAsset.environment!=='testnet'||!verifiedAsset.enabled))throw new Error('PLAN_UNAVAILABLE');
  const opKey = `gift:${user.id}:${requestKey}`;
  const requestHash = crypto.createHash('sha256').update(expectedVersionId?JSON.stringify({planId,invoiceVersion:expectedVersionId}):planId).digest('hex');
  const prior = (await database.select().from(operationKeys).where(eq(sql<string>`lower(${operationKeys.businessKey})`,opKey)).limit(1))[0];
  if (prior?.result) {
    if (prior.requestHash !== requestHash) throw new Error('VERSION_CONFLICT');
    return prior.result;
  }

  // Match the later version lock order without a shared-to-exclusive upgrade.
  await database.select({id:plans.id}).from(plans).where(eq(plans.id,planId)).for('update');
  const eligibleReferrer = manifest.feature_referrals && user.referrerUserId
    ? participants.get(user.referrerUserId)
    : undefined;

  await database.execute(sql`select pv.id from plan_versions pv join plans p on p.id=pv.plan_id join assets a on a.id=pv.asset_id where p.id=${planId} and pv.active=true and a.environment=${asset.environment} and a.id=${asset.id} for update of pv,p`);
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
    usdReference: planVersions.usdReference,
    planStatus: plans.status,
    symbol: assets.symbol,
  }).from(planVersions)
    .innerJoin(plans, eq(plans.id, planVersions.planId))
    .innerJoin(assets, eq(assets.id, planVersions.assetId))
    .where(and(eq(plans.id, planId), eq(planVersions.active, true), eq(assets.environment,asset.environment),eq(assets.id,asset.id)))
    .limit(1);
  const v = versions[0];
  if (!v || (!expectedVersionId&&v.planStatus !== 'active') || (expectedVersionId && v.id!==expectedVersionId)) throw new Error('PLAN_UNAVAILABLE');
  if (v.assetId !== asset.id) throw new Error('PLAN_UNAVAILABLE');

  const replayAfterLock = (await database.select().from(operationKeys).where(eq(sql<string>`lower(${operationKeys.businessKey})`,opKey)).limit(1))[0];
  if (replayAfterLock?.result) {
    if (replayAfterLock.requestHash !== requestHash) throw new Error('VERSION_CONFLICT');
    return replayAfterLock.result;
  }

  await assertUnfrozen(database,user.id,asset.id);
  const samePlanAsset = and(eq(planVersions.planId,v.planId),eq(planVersions.assetId,v.assetId));
  const active = await database.select({ id: cycles.id }).from(cycles)
    .innerJoin(planVersions,eq(planVersions.id,cycles.planVersionId))
    .where(and(eq(cycles.userId, user.id),samePlanAsset,inArray(cycles.status, ['active', 'exception']))).limit(1);
  if (active[0]) throw new Error('ACTIVE_CYCLE_EXISTS');
  if (manifest.cycle_max_concurrent > 0) {
    const [open] = await database.select({count:sql<string>`count(*)::text`}).from(cycles).where(and(eq(cycles.userId,user.id),inArray(cycles.status,['active','exception'])));
    if (BigInt(open.count) >= BigInt(manifest.cycle_max_concurrent)) throw new Error('CYCLE_LIMIT_REACHED');
  }
  const recent = await database.select({ completedAt: cycles.completedAt }).from(cycles)
    .innerJoin(planVersions,eq(planVersions.id,cycles.planVersionId))
    .where(and(eq(cycles.userId, user.id),samePlanAsset,eq(cycles.status, 'completed')))
    .orderBy(desc(cycles.completedAt)).limit(1);
  if (recent[0]?.completedAt) {
    const elapsed = Date.now() - recent[0].completedAt.getTime();
    if (elapsed < manifest.cycle_rejoin_cooldown_hours * 3600_000) throw new Error('COOLDOWN_ACTIVE');
  }

  const amount = BigInt(v.amountBaseUnits);
  if (amount <= 0n || !Number.isInteger(v.receiptsRequired) || v.receiptsRequired <= 0) throw new Error('CONFIGURATION_INVALID');
  const available = await availableBalance(database, user.id, v.assetId);
  if (available < amount) throw new Error('INSUFFICIENT_BALANCE');
  const split = splitAmount(amount, {
    receiver: v.receiverBps, marketing: v.marketingBps, referral: v.referralBps, developer: v.developerBps, reserve: v.reserveBps,
  });
  if (split.receiver <= 0n) throw new Error('CONFIGURATION_INVALID');
  const senderAvail = await account(database, v.assetId, 'user', user.id, 'available_payable', 'credit');
  const clearing = await account(database, v.assetId, 'system', null, 'gift_clearing', 'credit');
  const marketing = await account(database, v.assetId, 'platform', null, 'marketing_payable', 'credit');
  const developer = await account(database, v.assetId, 'platform', null, 'developer_payable', 'credit');
  const reserve = await account(database, v.assetId, 'platform', null, 'reserve_equity', 'credit');

  await database.execute(sql`select id from queue_partitions where plan_version_id=${v.id} for update`);
  const partition = (await database.select().from(queuePartitions).where(eq(queuePartitions.planVersionId, v.id)).limit(1))[0];
  if (!partition) throw new Error('PLAN_UNAVAILABLE');
  await assertPartitionReady(database,partition.id);
  if (partition.nextTicket >= QUEUE_TICKET_CEILING) throw new Error('FINANCIAL_SAFETY_PAUSE');

  const waiting = and(eq(queueEntries.partitionId,partition.id),eq(queueEntries.status,'waiting'));
  const priority = manifest.feature_priority ? (await database.select().from(queueEntries)
    .where(and(waiting,isNotNull(queueEntries.priorityTicket))).orderBy(asc(queueEntries.priorityTicket),asc(queueEntries.ticket)).limit(1))[0] : undefined;
  const recipient = priority ?? (await database.select().from(queueEntries)
    .where(manifest.feature_priority ? and(waiting,isNull(queueEntries.priorityTicket)) : waiting)
    .orderBy(asc(queueEntries.ticket)).limit(1))[0];
  if (recipient) await database.execute(sql`select id from queue_entries where id=${recipient.id} for update`);
  if (recipient?.beneficiaryUserId === user.id) throw new Error('NO_RECEIVER_AVAILABLE');
  if (!recipient && manifest.empty_queue_policy.mode === 'block_checkout') throw new Error('NO_RECEIVER_AVAILABLE');

  await postJournal(database, 'GIFT_IN', `gift-in:${user.id}:${requestKey}`, [
    { accountId: senderAvail.id, direction: 'debit', amount },
    { accountId: clearing.id, direction: 'credit', amount },
  ], { sender: user.id, plan_id: v.planId });

  let receiverLabel: string = manifest.empty_queue_policy.destination_role;
  let receiverAccount = receiverLabel === 'marketing' ? marketing : developer;
  if (recipient?.kind === 'bootstrap') {
    const role = recipient.platformRole ?? 'developer';
    if (!['developer','marketing','platform','custom_bootstrap'].includes(role)) throw new Error('CONFIGURATION_INVALID');
    receiverAccount = await account(database,v.assetId,'platform',null,`bootstrap_${role}_payable`,'credit');
    receiverLabel = role;
  }
  if (recipient?.kind === 'member' && recipient.beneficiaryUserId) {
    receiverAccount = await account(database, v.assetId, 'user', recipient.beneficiaryUserId, 'available_payable', 'credit');
    receiverLabel = recipient.beneficiaryUserId;
  }
  const slotIndex = recipient ? recipient.creditedCount+1 : null;
  const receiverJournalId = await postJournal(database, 'RECEIVER_ALLOCATE', `allocation:${opKey}:receiver:${receiverLabel}`, [
    { accountId: clearing.id, direction: 'debit', amount: split.receiver },
    { accountId: receiverAccount.id, direction: 'credit', amount: split.receiver },
  ], { plan_id: v.planId, receiver: receiverLabel, receiver_kind:recipient?.kind ?? 'empty_queue_business', queue_entry_id:recipient?.id ?? null,slot_index:slotIndex });
  if (!receiverJournalId) throw new Error('FINANCIAL_SAFETY_PAUSE');
  await postJournal(database, 'MARKETING_ALLOCATE', `allocation:${opKey}:marketing`, [
    { accountId: clearing.id, direction: 'debit', amount: split.marketing },
    { accountId: marketing.id, direction: 'credit', amount: split.marketing },
  ]);
  await postJournal(database, 'DEV_ALLOCATE', `allocation:${opKey}:developer`, [
    { accountId: clearing.id, direction: 'debit', amount: split.developer },
    { accountId: developer.id, direction: 'credit', amount: split.developer },
  ]);

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
      await enqueueNotification(database, `notice:${opKey}:received`, {
        user_id: recipient.beneficiaryUserId,
        title_key: 'gift_received',
        body: `You received ${formatBaseUnits(split.receiver,asset.decimals)} ${asset.symbol}${asset.environment==='testnet'?' ('+asset.chainId+' testnet)':''} from a subsequent gift.${fulfilled ? ' Your cycle is complete.' : ''}`,
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
  const allocation = (await database.insert(receiptAllocations).values({
    sourceOperationKey:opKey,sourceCycleId:cycle.id,payerUserId:user.id,
    receiverEntryId:recipient?.id ?? null,beneficiaryUserId:recipient?.kind==='member' ? recipient.beneficiaryUserId : null,
    receiverKind:recipient?.kind ?? 'empty_queue_business',recipientRole:recipient?.kind==='member' ? null : receiverLabel,slotIndex,
    receiverAccountId:receiverAccount.id,creditJournalId:receiverJournalId,assetId:v.assetId,
    environment:asset.environment,chainId:asset.chainId,amountBaseUnits:split.receiver.toString(),lineageStatus:'captured',
  }).returning({id:receiptAllocations.id}))[0];

  const award = giftPointAward(v.usdReference, manifest.points_rules);
  await awardPoints(database,manifest,[
    {userId:user.id,sourceKey:`gift:${cycle.id}`,awardType:'gift_sender',points:award.sender},
    ...(eligibleReferrer?.status === 'active' ? [{userId:eligibleReferrer.id,sourceKey:`gift:${cycle.id}`,awardType:'gift_referrer',points:award.referrer}] : []),
  ]);
  await enqueueNotification(database, `notice:${opKey}:sent`, { user_id: user.id, title_key: 'gift_sent', body: `${v.name} gift confirmed. You joined the receiver queue.` });

  const result = {
    cycle_id: cycle.id,
    allocation_id:allocation.id,
    plan_id: v.planId,
    ticket,
    amount_base_units: amount.toString(),
    amount_giv:asset.environment==='simulation'?formatBaseUnits(amount):undefined,
    asset:asset.symbol,network:asset.chainId,environment:asset.environment,
    receiver_allocation_base_units: split.receiver.toString(),
  };
  await database.insert(operationKeys).values({ businessKey: opKey, requestHash, result });
  return result;
}

export async function linkSimulationWallet(database: DbExecutor, user: UserRow) {
  const manifest = await readManifest(database);
  if (!manifest.feature_wallets) throw new Error('FEATURE_DISABLED');
  user = await lockUser(database,user.id);
  if (user.status !== 'active') throw new Error('ACCOUNT_RESTRICTED');
  if(!manifest.entitlements_member.wallet_link)throw new Error('FEATURE_DISABLED');
  const address = `giv:${user.username}`;
  const rows = await database.insert(walletLinks).values({ userId: user.id, environment: 'simulation', chainId: 'giv', address })
    .onConflictDoNothing().returning();
  return rows[0] ?? (await database.select().from(walletLinks).where(and(eq(walletLinks.userId,user.id),eq(walletLinks.environment,'simulation'),eq(walletLinks.chainId,'giv'))).limit(1))[0];
}

export async function quoteWithdrawal(database: DbExecutor, user: UserRow, gross: bigint, requestKey: string) {
  requestKey=requestKey.toLowerCase();
  const manifest = await readManifest(database);
  if (!manifest.feature_wallets) throw new Error('FEATURE_DISABLED');
  user = await lockUser(database,user.id);
  eligibleWithdrawal(user);
  if (gross <= 0n) throw new Error('INVALID_INPUT');
  if (gross > usdToGivBaseUnits(manifest.payout_limits.signer_per_tx_usd)) throw new Error('FINANCIAL_SAFETY_PAUSE');
  const asset = await simulationAsset(database,manifest);
  const durableKey = `withdrawal-quote:${user.id}:${requestKey}`;
  const prior = (await database.select().from(withdrawals).where(eq(sql<string>`lower(${withdrawals.requestKey})`,durableKey)).limit(1))[0];
  if (prior) {
    if (BigInt(prior.grossBaseUnits) !== gross || prior.assetId !== asset.id) throw new Error('VERSION_CONFLICT');
    return prior;
  }
  await assertUnfrozen(database,user.id,asset.id);
  const balance = await availableBalance(database, user.id, asset.id);
  if (balance < gross) throw new Error('INSUFFICIENT_BALANCE');
  const wallet = (await database.select().from(walletLinks).where(and(eq(walletLinks.userId, user.id), eq(walletLinks.environment, 'simulation'), eq(walletLinks.chainId, 'giv'))).limit(1))[0];
  if (!wallet) throw new Error('INVALID_ADDRESS');
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
  }).returning();
  return rows[0];
}

export async function confirmWithdrawal(database: DbExecutor, user: UserRow, withdrawalId: string) {
  const manifest = await readManifest(database);
  if (!manifest.feature_wallets) throw new Error('FEATURE_DISABLED');
  user = await lockUser(database,user.id);
  eligibleWithdrawal(user);
  const w = (await database.select().from(withdrawals).where(and(eq(withdrawals.id, withdrawalId), eq(withdrawals.userId, user.id))).limit(1).for('update'))[0];
  if (!w) throw new Error('NOT_FOUND');
  const asset = await simulationAsset(database,manifest);
  if (w.assetId !== asset.id) throw new Error('PLAN_UNAVAILABLE');
  if (['settled','cancelled','held'].includes(w.status)) return w;
  await assertUnfrozen(database,user.id,asset.id);
  const wallet = (await database.select().from(walletLinks).where(and(eq(walletLinks.userId,user.id),eq(walletLinks.environment,'simulation'),eq(walletLinks.chainId,'giv'))).limit(1))[0];
  if (!wallet || wallet.address !== w.destination) throw new Error('DESTINATION_CHANGED');
  if (w.status !== 'quoted') throw new Error('VERSION_CONFLICT');
  if (w.quoteExpiresAt.getTime() < Date.now()) throw new Error('QUOTE_EXPIRED');
  const gross = BigInt(w.grossBaseUnits);
  if (gross > usdToGivBaseUnits(manifest.payout_limits.signer_per_tx_usd)) throw new Error('FINANCIAL_SAFETY_PAUSE');
  const available = await availableBalance(database, user.id, w.assetId);
  if (available < gross) throw new Error('INSUFFICIENT_BALANCE');
  const [clock] = await database.select({day:sql<string>`(current_timestamp at time zone 'UTC')::date::text`}).from(users).where(eq(users.id,user.id)).limit(1);
  // GIV settles atomically with zero gas. A per-asset transaction lock serializes
  // its durable UTC-day totals; real signer reservations are a later adapter.
  await database.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`gw:giv-spend:${w.assetId}:${clock.day}`},0))`);
  const [spent] = await database.select({amount:sql<string>`coalesce(sum(${ledgerPostings.amountBaseUnits}),0)::text`}).from(ledgerJournals)
    .innerJoin(ledgerPostings,eq(ledgerPostings.journalId,ledgerJournals.id)).innerJoin(ledgerAccounts,eq(ledgerAccounts.id,ledgerPostings.accountId))
    .where(and(eq(ledgerJournals.ledgerType,'PAYOUT_HOLD'),eq(ledgerPostings.direction,'debit'),eq(ledgerAccounts.purpose,'available_payable'),eq(ledgerAccounts.assetId,w.assetId),gte(ledgerJournals.createdAt,sql`date_trunc('day',current_timestamp at time zone 'UTC') at time zone 'UTC'`)));
  if (BigInt(spent.amount) + gross > usdToGivBaseUnits(manifest.payout_limits.daily_per_asset_usd)) throw new Error('FINANCIAL_SAFETY_PAUSE');
  const avail = await account(database, w.assetId, 'user', user.id, 'available_payable', 'credit');
  const held = await account(database, w.assetId, 'user', user.id, 'held_payable', 'credit');
  const holdJournal=await postJournal(database, 'PAYOUT_HOLD', `payout-hold:${w.id}`, [
    { accountId: avail.id, direction: 'debit', amount: gross },
    { accountId: held.id, direction: 'credit', amount: gross },
  ], { withdrawal_id: w.id });
  if (!holdJournal) throw new Error('FINANCIAL_SAFETY_PAUSE');
  const [heldWithdrawal]=await database.update(withdrawals).set({status:'held'}).where(eq(withdrawals.id,w.id)).returning();
  const [control]=await database.select().from(simulationWithdrawalControls).where(eq(simulationWithdrawalControls.withdrawalId,w.id)).limit(1);
  if (control?.outcome==='hold') return heldWithdrawal;
  return finishGivWithdrawal(database,heldWithdrawal,control?.outcome==='reject'?'cancel':'settle');
}

type WithdrawalRow=typeof withdrawals.$inferSelect;
async function finishGivWithdrawal(database:DbExecutor,w:WithdrawalRow,action:'cancel'|'settle') {
  if (w.status!=='held') throw new Error('VERSION_CONFLICT');
  if(action==='settle')await assertUnfrozen(database,w.userId,w.assetId);
  const gross=BigInt(w.grossBaseUnits);
  if (await balanceForPurpose(database,w.userId,w.assetId,'held_payable')<gross) throw new Error('FINANCIAL_SAFETY_PAUSE');
  const held=await account(database,w.assetId,'user',w.userId,'held_payable','credit');
  const destination=action==='cancel'?await account(database,w.assetId,'user',w.userId,'available_payable','credit'):await account(database,w.assetId,'system',null,'simulation_settlement_sink','credit');
  const journal=await postJournal(database,action==='cancel'?'HOLD_RELEASE':'PAYOUT_SETTLE',`${action==='cancel'?'hold-release':'payout-settle'}:${w.id}`,[
    {accountId:held.id,direction:'debit',amount:gross},{accountId:destination.id,direction:'credit',amount:gross},
  ],{withdrawal_id:w.id,simulation:true});
  if (!journal) throw new Error('FINANCIAL_SAFETY_PAUSE');
  const [result]=await database.update(withdrawals).set(action==='cancel'?{status:'cancelled',cancelledAt:sql`current_timestamp`}:{status:'settled',settledAt:sql`current_timestamp`}).where(eq(withdrawals.id,w.id)).returning();
  if (action==='settle') await enqueueNotification(database,`notice:withdrawal:${w.id}:settled`,{
    user_id:w.userId,title_key:'withdrawal_settled',body:`Simulation withdrawal settled for ${formatBaseUnits(gross)} GIV. No on-chain export occurred.`,
  });
  return result;
}

export async function cancelWithdrawal(database:DbExecutor,user:UserRow,withdrawalId:string) {
  const manifest=await readManifest(database);
  if (!manifest.feature_wallets) throw new Error('FEATURE_DISABLED');
  user=await lockUser(database,user.id);eligibleWithdrawal(user);
  const [w]=await database.select().from(withdrawals).where(and(eq(withdrawals.id,withdrawalId),eq(withdrawals.userId,user.id))).limit(1).for('update');
  if (!w) throw new Error('NOT_FOUND');
  const asset=await simulationAsset(database,manifest);
  if (w.assetId!==asset.id) throw new Error('PLAN_UNAVAILABLE');
  if (w.status==='cancelled') return w;
  if (!['quoted','held'].includes(w.status)) throw new Error('VERSION_CONFLICT');
  // GIV cannot broadcast; this is positive simulation-only evidence of an
  // unsent hold. Never apply this rule to a real payout or ambiguous attempt.
  const result=w.status==='quoted'?(await database.update(withdrawals).set({status:'cancelled',cancelledAt:sql`current_timestamp`}).where(eq(withdrawals.id,w.id)).returning())[0]:await finishGivWithdrawal(database,w,'cancel');
  await database.insert(auditEvents).values({actorUserId:user.id,action:'withdrawal_cancel',targetType:'withdrawal',targetId:w.id,reason:'Explicit cancellation of unsent GIV withdrawal',beforeState:{status:w.status},afterState:{status:'cancelled'}});
  return result;
}

export async function controlSimulationWithdrawal(database:DbExecutor,actorId:string,withdrawalId:string,outcome:'hold'|'reject',reason:string,nonce:string) {
  const manifest=await readManifest(database);
  if (!manifest.feature_simulation || !manifest.feature_admin) throw new Error('FEATURE_DISABLED');
  const actor=await lockUser(database,actorId);
  if (actor.role!=='admin' || actor.status!=='active') throw new Error('FORBIDDEN');
  const asset=await simulationAsset(database,manifest);
  const key=`admin-sim-withdrawal:${actorId}:${nonce.toLowerCase()}`;
  const requestHash=crypto.createHash('sha256').update(JSON.stringify({withdrawalId:withdrawalId.toLowerCase(),outcome,reason})).digest('hex');
  const [prior]=await database.select().from(operationKeys).where(eq(operationKeys.businessKey,key)).limit(1);
  if (prior) {if (prior.requestHash!==requestHash) throw new Error('VERSION_CONFLICT');return prior.result;}
  const [w]=await database.select().from(withdrawals).where(eq(withdrawals.id,withdrawalId)).limit(1).for('update');
  if (!w || w.assetId!==asset.id) throw new Error('NOT_FOUND');
  if (w.status!=='quoted') throw new Error('VERSION_CONFLICT');
  const [existing]=await database.select().from(simulationWithdrawalControls).where(eq(simulationWithdrawalControls.withdrawalId,w.id)).limit(1);
  if (existing) throw new Error('VERSION_CONFLICT');
  await database.insert(simulationWithdrawalControls).values({withdrawalId:w.id,outcome,reason,actorUserId:actorId,operationKey:key});
  const result={withdrawal_id:w.id,outcome};
  await database.insert(auditEvents).values({actorUserId:actorId,action:'simulation_withdrawal_control',targetType:'withdrawal',targetId:w.id,reason,afterState:result});
  await database.insert(operationKeys).values({businessKey:key,requestHash,result});
  return result;
}

export async function resolveSimulationWithdrawal(database:DbExecutor,actorId:string,withdrawalId:string,action:'cancel'|'settle',reason:string,nonce:string) {
  const manifest=await readManifest(database);
  if (!manifest.feature_simulation || !manifest.feature_admin) throw new Error('FEATURE_DISABLED');
  const [lookup]=await database.select({userId:withdrawals.userId}).from(withdrawals).where(eq(withdrawals.id,withdrawalId)).limit(1);
  if (!lookup) throw new Error('NOT_FOUND');
  let actor:UserRow|undefined;
  for (const id of [...new Set([actorId,lookup.userId])].sort()) {
    const locked=await lockUser(database,id);
    if (id===actorId) actor=locked;
  }
  if (actor?.role!=='admin' || actor.status!=='active') throw new Error('FORBIDDEN');
  const asset=await simulationAsset(database,manifest);
  const key=`admin-resolve-withdrawal:${actorId}:${nonce.toLowerCase()}`;
  const requestHash=crypto.createHash('sha256').update(JSON.stringify({withdrawalId:withdrawalId.toLowerCase(),action,reason})).digest('hex');
  const [prior]=await database.select().from(operationKeys).where(eq(operationKeys.businessKey,key)).limit(1);
  if (prior) {if (prior.requestHash!==requestHash) throw new Error('VERSION_CONFLICT');return prior.result;}
  // Sorted user locks precede the withdrawal lock, including crossed staff recovery.
  const [w]=await database.select().from(withdrawals).where(eq(withdrawals.id,withdrawalId)).limit(1).for('update');
  if (w.assetId!==asset.id) throw new Error('NOT_FOUND');
  let result:WithdrawalRow;
  if (w.status===(action==='cancel'?'cancelled':'settled')) result=w;
  else result=await finishGivWithdrawal(database,w,action);
  await database.insert(auditEvents).values({actorUserId:actorId,action:'simulation_withdrawal_resolution',targetType:'withdrawal',targetId:w.id,reason,beforeState:{status:w.status},afterState:{status:result.status}});
  await database.insert(operationKeys).values({businessKey:key,requestHash,result});
  return result;
}

export async function dashboard(database: DbExecutor, user: UserRow, manifest: Manifest) {
  const freshUser = await getUser(database,user.username);
  if (!freshUser) throw new Error('UNAUTHENTICATED');
  user = freshUser;
  const asset = (await database.select().from(assets).where(and(eq(assets.symbol, 'GIV'), eq(assets.environment, 'simulation'))).limit(1))[0];
  if (!asset) throw new Error('PLAN_UNAVAILABLE');
  const balances = await database.select().from(userAccountBalances).where(and(eq(userAccountBalances.userId,user.id),eq(userAccountBalances.assetId,asset.id)));
  const available = user.status === 'pending_consent' ? 0n : BigInt(balances.find((row) => row.purpose === 'available_payable')?.balance ?? '0');
  const held = user.status === 'pending_consent' ? 0n : BigInt(balances.find((row) => row.purpose === 'held_payable')?.balance ?? '0');

  const userCycles = await database.select({
    id: cycles.id,
    status: cycles.status,
    credited_count: sql<number>`greatest(${cycles.creditedCount}-coalesce(${cycleFinancialReviews.invalidCreditCount},0),0)::int`,
    historical_credited_count:cycles.creditedCount,
    financial_review:cycleFinancialReviews.underReview,
    queue_paused:cycleFinancialReviews.queuePaused,
    receipts_required: cycles.receiptsRequired,
    completed_at: cycles.completedAt,
    created_at: cycles.createdAt,
    plan_id: plans.id,
    name: plans.name,
    slug: plans.slug,
    ticket: queueEntries.ticket,
    queue_disclosure:sql<QueueDisclosure|null>`public.gw_queue_disclosure(${queueEntries.id})`,
    display_position: sql<number>`public.gw_queue_rank(${queueEntries.id},${manifest.deployment_profile==='transparent'?'public_serving':'display'})`.mapWith((value) => value === null ? null : Number(value)),
  }).from(cycles)
    .innerJoin(planVersions, eq(planVersions.id, cycles.planVersionId))
    .innerJoin(plans, eq(plans.id, planVersions.planId))
    .leftJoin(queueEntries, eq(queueEntries.cycleId, cycles.id))
    .leftJoin(cycleFinancialReviews,eq(cycleFinancialReviews.cycleId,cycles.id))
    .where(eq(cycles.userId, user.id))
    .orderBy(desc(cycles.createdAt)).limit(30);

  const pendingInvoices=await database.select({id:giftInvoices.id,profile_revision:giftInvoices.profileRevision,plan_id:planVersions.planId,expected_base_units:giftInvoices.expectedBaseUnits,expires_at:giftInvoices.quoteExpiresAt,status:giftInvoices.status}).from(giftInvoices).innerJoin(planVersions,eq(planVersions.id,giftInvoices.planVersionId)).where(and(eq(giftInvoices.userId,user.id),inArray(giftInvoices.status,['quoted','submitted']))).orderBy(desc(giftInvoices.createdAt),desc(giftInvoices.id)).limit(manifest.pagination_policy.max_size);
  const [financialReview]=await database.select().from(userFinancialReviews).where(and(eq(userFinancialReviews.userId,user.id),eq(userFinancialReviews.assetId,asset.id))).limit(1);
  const pointRows = await database.select({ total: sql<number>`coalesce(sum(${pointEvents.points}),0)::int` }).from(pointEvents).where(eq(pointEvents.userId, user.id));
  // Retain the original camelCase aliases while adding the documented UI DTO.
  const pendingWithdrawals=await database.select({id:withdrawals.id,status:withdrawals.status,gross_base_units:withdrawals.grossBaseUnits}).from(withdrawals).where(and(eq(withdrawals.userId,user.id),eq(withdrawals.assetId,asset.id),eq(withdrawals.status,'held'))).orderBy(desc(withdrawals.createdAt),desc(withdrawals.id)).limit(manifest.pagination_policy.max_size);
  const notices = manifest.feature_notifications?await database.select({id:notifications.id,userId:notifications.userId,titleKey:notifications.titleKey,createdAt:notifications.createdAt,readAt:notifications.readAt,title_key:notifications.titleKey,body:notifications.body,created_at:notifications.createdAt,read_at:notifications.readAt}).from(notifications).where(eq(notifications.userId, user.id)).orderBy(desc(notifications.createdAt),desc(notifications.id)).limit(manifest.notification_page_size):[];
  const wallet = (await database.select().from(walletLinks).where(and(eq(walletLinks.userId, user.id), eq(walletLinks.environment, 'simulation'), eq(walletLinks.chainId, 'giv'))).limit(1))[0];
  const withdrawnRows = await database.select({ total: sql<string>`coalesce(sum(${withdrawals.netBaseUnits}),0)::text` }).from(withdrawals)
    .where(and(eq(withdrawals.userId, user.id), eq(withdrawals.assetId, asset.id), eq(withdrawals.status, 'settled')));

  return {
    user: { id: user.id, username: user.username, role: user.role, status: user.status, locale: user.locale,time_zone:user.timeZone,consent_version:user.consentVersion,age_confirmed:!!user.ageDobVerifiedAt,age_minimum_accepted:user.ageMinimumAccepted },
    manifest:{...publicManifest(manifest),presentation:presentationFromManifest(manifest),configuration_available:true},
    consent:{required:user.consentVersion!==manifest.terms_content.version||!user.ageConfirmedAt||!user.ageDobVerifiedAt||user.ageMinimumAccepted===null||user.ageMinimumAccepted<manifest.eligibility_min_age,terms_content:manifest.terms_content,minimum_age:manifest.eligibility_min_age},
    asset: { symbol: 'GIV', decimals: 2 },
    balances: { available: available.toString(), held: held.toString(), incoming:balances.find(row=>row.purpose==='incoming_payable')?.balance??'0',refundable:balances.find(row=>row.purpose==='refund_payable')?.balance??'0', withdrawn: withdrawnRows[0]?.total ?? '0' },
    points: pointRows[0]?.total ?? 0,
    financial_review:!!financialReview,
    cycles: userCycles.map(cycle=>({...cycle,status:cycle.financial_review?'exception':cycle.status})),
    notifications: notices,
    notification_badge:manifest.feature_notifications?await notificationBadge(database,user.id):{has_new:false,seen_at:null},
    pending_invoices:pendingInvoices,
    pending_withdrawals:pendingWithdrawals,
    wallet: wallet ?? null,
  };
}
