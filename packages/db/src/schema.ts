import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  pgView,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull().unique(),
  email: text('email').unique(),
  role: text('role').notNull().default('member'),
  status: text('status').notNull().default('pending_consent'),
  locale: text('locale').notNull().default('en'),
  consentVersion: text('consent_version'),
  consentedAt: timestamp('consented_at', { withTimezone: true }),
  referrerUserId: uuid('referrer_user_id').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
  createdAt: createdAt(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check('users_role_check', sql`${t.role} in ('member','moderator','admin')`),
  check('users_status_check', sql`${t.status} in ('pending_consent','active','suspended','banned','deactivated','deleted')`),
]).enableRLS();

export const referralCodes = pgTable('referral_codes', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  code: uuid('code').notNull().defaultRandom().unique(),
  createdAt: createdAt(),
}).enableRLS();

export const assets = pgTable('assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  symbol: text('symbol').notNull(),
  environment: text('environment').notNull(),
  chainId: text('chain_id').notNull(),
  decimals: integer('decimals').notNull(),
  enabled: boolean('enabled').notNull().default(false),
  createdAt: createdAt(),
}, (t) => [
  unique('assets_symbol_environment_chain_id_unique').on(t.symbol, t.environment, t.chainId),
  check('assets_environment_check', sql`${t.environment} in ('simulation','testnet','mainnet')`),
]).enableRLS();

export const plans = pgTable('plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  usdReference: numeric('usd_reference', { precision: 18, scale: 2 }).notNull(),
  receiptsRequired: integer('receipts_required').notNull().default(2),
  status: text('status').notNull().default('disabled'),
  bootstrapEnabled: boolean('bootstrap_enabled').notNull().default(true),
  bootstrapCount: integer('bootstrap_count').notNull().default(10),
  createdAt: createdAt(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [check('plans_status_check', sql`${t.status} in ('disabled','scheduled','active','paused','retired')`)]).enableRLS();

export const planVersions = pgTable('plan_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  planId: uuid('plan_id').notNull().references(() => plans.id, { onDelete: 'restrict' }),
  assetId: uuid('asset_id').notNull().references(() => assets.id, { onDelete: 'restrict' }),
  version: integer('version').notNull(),
  amountBaseUnits: numeric('amount_base_units', { precision: 78, scale: 0 }).notNull(),
  usdReference: numeric('usd_reference', { precision: 20, scale: 2 }).notNull(),
  receiverBps: integer('receiver_bps').notNull(),
  marketingBps: integer('marketing_bps').notNull(),
  referralBps: integer('referral_bps').notNull(),
  developerBps: integer('developer_bps').notNull(),
  reserveBps: integer('reserve_bps').notNull(),
  receiptsRequired: integer('receipts_required').notNull(),
  active: boolean('active').notNull().default(false),
  createdAt: createdAt(),
}, (t) => [unique('plan_versions_plan_asset_version_unique').on(t.planId, t.assetId, t.version)]).enableRLS();

export const queuePartitions = pgTable('queue_partitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  planVersionId: uuid('plan_version_id').notNull().unique().references(() => planVersions.id, { onDelete: 'restrict' }),
  nextTicket: bigint('next_ticket', { mode: 'number' }).notNull().default(1),
  nextPriorityTicket: bigint('next_priority_ticket', {mode:'number'}).notNull().default(1),
  revision: bigint('revision', { mode: 'number' }).notNull().default(0),
  createdAt: createdAt(),
},(t) => [check('queue_partition_ticket_bounds',sql`${t.nextTicket} between 1 and 1099511627776 and ${t.nextPriorityTicket} between 1 and 1099511627776`)]).enableRLS();

export const cycles = pgTable('cycles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  planVersionId: uuid('plan_version_id').notNull().references(() => planVersions.id, { onDelete: 'restrict' }),
  status: text('status').notNull().default('active'),
  creditedCount: integer('credited_count').notNull().default(0),
  receiptsRequired: integer('receipts_required').notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: createdAt(),
}, (t) => [
  check('cycles_status_check', sql`${t.status} in ('active','completed','exception')`),
  uniqueIndex('uniq_active_cycle_per_user_plan').on(t.userId, t.planVersionId).where(sql`${t.status} in ('active','exception')`),
]).enableRLS();

export const queueEntries = pgTable('queue_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  partitionId: uuid('partition_id').notNull().references(() => queuePartitions.id, { onDelete: 'restrict' }),
  ticket: bigint('ticket', { mode: 'number' }).notNull(),
  kind: text('kind').notNull(),
  cycleId: uuid('cycle_id').references(() => cycles.id, { onDelete: 'restrict' }),
  beneficiaryUserId: uuid('beneficiary_user_id').references(() => users.id, { onDelete: 'restrict' }),
  platformRole: text('platform_role'),
  priorityTicket: bigint('priority_ticket', { mode: 'number' }),
  requiredCount: integer('required_count').notNull(),
  creditedCount: integer('credited_count').notNull().default(0),
  status: text('status').notNull().default('waiting'),
  createdAt: createdAt(),
}, (t) => [
  unique('queue_entries_partition_ticket_unique').on(t.partitionId, t.ticket),
  index('queue_waiting_order_idx').on(t.partitionId, t.priorityTicket, t.ticket).where(sql`${t.status} = 'waiting'`),
  uniqueIndex('queue_priority_ticket_unique').on(t.partitionId,t.priorityTicket).where(sql`${t.priorityTicket} is not null and ${t.status}='waiting'`),
  uniqueIndex('queue_cycle_entry_unique').on(t.cycleId).where(sql`${t.cycleId} is not null`),
  index('queue_waiting_display_idx').on(t.partitionId,t.ticket).where(sql`${t.status}='waiting'`),
  index('queue_waiting_priority_idx').on(t.partitionId,t.priorityTicket,t.ticket).where(sql`${t.status}='waiting' and ${t.priorityTicket} is not null`),
  index('queue_waiting_fifo_idx').on(t.partitionId,t.ticket).where(sql`${t.status}='waiting' and ${t.priorityTicket} is null`),
  check('queue_entry_ticket_bounds',sql`${t.ticket} between 1 and 1099511627775 and (${t.priorityTicket} is null or ${t.priorityTicket} between 1 and 1099511627775)`),
  check('queue_entries_kind_check', sql`${t.kind} in ('member','bootstrap')`),
  check('queue_entries_status_check', sql`${t.status} in ('waiting','fully_allocated','fulfilled','removed')`),
]).enableRLS();

export const ledgerAccounts = pgTable('ledger_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  assetId: uuid('asset_id').notNull().references(() => assets.id, { onDelete: 'restrict' }),
  ownerType: text('owner_type').notNull(),
  ownerId: uuid('owner_id').references(() => users.id, {onDelete:'restrict'}),
  purpose: text('purpose').notNull(),
  normalSide: text('normal_side').notNull(),
  createdAt: createdAt(),
}, (t) => [
  check('ledger_accounts_owner_type_check', sql`${t.ownerType} in ('user','platform','system')`),
  check('ledger_accounts_normal_side_check', sql`${t.normalSide} in ('debit','credit')`),
  uniqueIndex('ledger_accounts_owner_unique').on(t.assetId,t.ownerType,sql`coalesce(${t.ownerId},'00000000-0000-0000-0000-000000000000'::uuid)`,t.purpose),
]).enableRLS();

export const ledgerJournals = pgTable('ledger_journals', {
  id: uuid('id').primaryKey().defaultRandom(),
  ledgerType: text('ledger_type').notNull(),
  businessKey: text('business_key').notNull().unique(),
  createdTxid: bigint('created_txid', { mode:'bigint' }).notNull().default(sql`txid_current()`),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: createdAt(),
}).enableRLS();

export const ledgerPostings = pgTable('ledger_postings', {
  id: uuid('id').primaryKey().defaultRandom(),
  journalId: uuid('journal_id').notNull().references(() => ledgerJournals.id, { onDelete: 'restrict' }),
  accountId: uuid('account_id').notNull().references(() => ledgerAccounts.id, { onDelete: 'restrict' }),
  direction: text('direction').notNull(),
  amountBaseUnits: numeric('amount_base_units', { precision: 78, scale: 0 }).notNull(),
  createdAt: createdAt(),
}, (t) => [
  check('ledger_postings_direction_check', sql`${t.direction} in ('debit','credit')`),
  check('ledger_postings_amount_positive', sql`${t.amountBaseUnits} > 0`),
]).enableRLS();

export const operationKeys = pgTable('operation_keys', {
  businessKey: text('business_key').primaryKey(),
  requestHash: text('request_hash').notNull(),
  result: jsonb('result').$type<Record<string, unknown> | null>(),
  createdAt: createdAt(),
}).enableRLS();

export const pointEvents = pgTable('point_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  sourceKey: text('source_key').notNull(),
  awardType: text('award_type').notNull(),
  points: integer('points').notNull(),
  createdAt: createdAt(),
}, (t) => [unique('point_events_user_source_award_unique').on(t.userId, t.sourceKey, t.awardType)]).enableRLS();

export const walletLinks = pgTable('wallet_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  environment: text('environment').notNull(),
  chainId: text('chain_id').notNull(),
  address: text('address').notNull(),
  verifiedAt: timestamp('verified_at', { withTimezone: true }).notNull().defaultNow(),
  coolingUntil: timestamp('cooling_until', { withTimezone: true }),
  createdAt: createdAt(),
}, (t) => [unique('wallet_links_user_environment_chain_unique').on(t.userId, t.environment, t.chainId)]).enableRLS();

export const withdrawals = pgTable('withdrawals', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  assetId: uuid('asset_id').notNull().references(() => assets.id, { onDelete: 'restrict' }),
  grossBaseUnits: numeric('gross_base_units', { precision: 78, scale: 0 }).notNull(),
  feeBaseUnits: numeric('fee_base_units', { precision: 78, scale: 0 }).notNull().default('0'),
  netBaseUnits: numeric('net_base_units', { precision: 78, scale: 0 }).notNull(),
  destination: text('destination').notNull(),
  status: text('status').notNull(),
  quoteExpiresAt: timestamp('quote_expires_at', { withTimezone: true }).notNull(),
  settledAt: timestamp('settled_at', { withTimezone: true }),
  requestKey: text('request_key').notNull().unique(),
  createdAt: createdAt(),
}, (t) => [check('withdrawals_status_check', sql`${t.status} in ('quoted','held','awaiting_requote','approved','sending','settled','cancelled','exception')`)]).enableRLS();

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  titleKey: text('title_key').notNull(),
  body: text('body').notNull(),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: createdAt(),
}).enableRLS();

export const xManifest = pgTable('x_manifest', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  type: text('type').notNull(),
  scope: text('scope').notNull(),
  description: text('description').notNull().default(''),
  version: integer('version').notNull().default(1),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  deprecatedAt: timestamp('deprecated_at', { withTimezone: true }),
}, (t) => [check('x_manifest_scope_check', sql`${t.scope} in ('public','private','staff')`)]).enableRLS();

export const auditEvents = pgTable('audit_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id'),
  reason: text('reason'),
  beforeState: jsonb('before_state'),
  afterState: jsonb('after_state'),
  createdAt: createdAt(),
}).enableRLS();

export const userAccountBalances = pgView('gw_user_account_balances', {
  userId: uuid('user_id'), assetId: uuid('asset_id'), purpose: text('purpose'),
  balance: numeric('balance',{precision:78,scale:0}),
}).existing();
export const environmentInstances = pgTable('environment_instances', {
  environment:text('environment').primaryKey(), instanceId:uuid('instance_id').notNull().unique().defaultRandom(), createdAt:createdAt(),
},(t) => [check('environment_instances_environment_check',sql`${t.environment} in ('simulation','testnet','mainnet')`)]).enableRLS();
export const queueRankNodes = pgTable('queue_rank_nodes', {
  partitionId:uuid('partition_id').notNull().references(()=>queuePartitions.id,{onDelete:'restrict'}),
  lane:text('lane').notNull(), nodeIndex:bigint('node_index',{mode:'bigint'}).notNull(), waitingCount:bigint('waiting_count',{mode:'bigint'}).notNull(),
},(t) => [primaryKey({columns:[t.partitionId,t.lane,t.nodeIndex]}),
  check('queue_rank_nodes_lane_check',sql`${t.lane} in ('display','fifo','priority')`),
  check('queue_rank_nodes_node_index_check',sql`${t.nodeIndex} between 1 and 1099511627776`),
  check('queue_rank_nodes_waiting_count_check',sql`${t.waitingCount} between 0 and 1099511627775`),
]).enableRLS();
export const queuePositions = pgView('gw_queue_positions', {
  entryId: uuid('entry_id'), displayPosition: bigint('display_position',{mode:'number'}),
}).existing();
export const simulationAccounts = pgView('gw_sim_accounts', {
  id: uuid('id'), username: text('username'), role: text('role'), status: text('status'), locale: text('locale'),
}).existing();

export const schema = {
  environmentInstances,
  queueRankNodes,
  userAccountBalances, queuePositions, simulationAccounts,
  users,
  referralCodes,
  assets,
  plans,
  planVersions,
  queuePartitions,
  cycles,
  queueEntries,
  ledgerAccounts,
  ledgerJournals,
  ledgerPostings,
  operationKeys,
  pointEvents,
  walletLinks,
  withdrawals,
  notifications,
  xManifest,
  auditEvents,
};
