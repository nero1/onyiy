import { ne, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import { assets, migrationClient, schema, readManifest } from './index';

if (process.env.APP_ENV !== 'simulation') throw new Error('Reset requires explicit APP_ENV=simulation');
if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') throw new Error('Production reset is prohibited');
let databaseName: string;
try { databaseName = decodeURIComponent(new URL(process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL ?? '').pathname.slice(1)); }
catch { throw new Error('Invalid reset database configuration'); }
if (!databaseName || process.env.SIMULATION_RESET_CONFIRM !== `reset:${databaseName}`) throw new Error('Explicit confirmation of the isolated target database is required');
const client = migrationClient();
try {
  await drizzle(client,{schema}).transaction(async (transaction) => {
    // PostgreSQL-specific maintenance locks serialize inspection and truncation.
    // No reset endpoint or production reset capability is introduced.
    await transaction.execute(sql.raw('LOCK TABLE x_manifest, assets IN ACCESS EXCLUSIVE MODE'));
    const manifest = await readManifest(transaction);
    if (!manifest.simulation_policy.allow_reset) throw new Error('Simulation reset disabled by database policy');
    if ((await transaction.select({id:assets.id}).from(assets).where(ne(assets.environment,'simulation')).limit(1)).length) throw new Error('Reset refused: non-simulation assets exist');
    await transaction.execute(sql.raw(`TRUNCATE TABLE appeals,reports,slug_redirects,help_articles,notification_views,auth_refresh_tokens,auth_sessions,auth_totp_replays,auth_recovery_codes,auth_factors,auth_flows,user_identities,rate_limits,maintenance_results, simulation_reorg_resolutions, simulation_reorg_reviews, simulation_incoming_refunds, simulation_incoming_events, simulation_incoming_controls, gift_invoices, deployment_binding_challenges, financial_reconciliation_results, jobs, outbox, scheduler_nonces, scheduler_runs, simulation_withdrawal_controls, receipt_allocations, queue_rank_nodes, audit_events, notifications, withdrawals, wallet_links, point_events, operation_keys, ledger_postings, ledger_journals, ledger_accounts, queue_entries, cycles, queue_partitions, plan_versions, plans, assets, referral_codes, users, x_manifest RESTART IDENTITY CASCADE`));
  });
  console.log('Isolated simulation database cleared. Run npm run db:seed.');
} finally { await client.end({timeout:3}); }
