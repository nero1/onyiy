import { sql } from 'drizzle-orm';
import { db, closeDb } from './index';

if ((process.env.APP_ENV ?? 'simulation') !== 'simulation') throw new Error('simulation reset refused outside simulation');
await db().execute(sql.raw(`TRUNCATE TABLE audit_events, notifications, withdrawals, wallet_links, point_events, operation_keys, ledger_postings, ledger_journals, ledger_accounts, queue_entries, cycles, queue_partitions, plan_versions, plans, assets, referral_codes, users, x_manifest RESTART IDENTITY CASCADE`));
console.log('Simulation database cleared. Run npm run db:seed.');
await closeDb();
