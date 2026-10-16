# LLM handover v51

Updated: **16 October 2026 at 09:21:01 PM WAT**.

## Authorization and order

The owner explicitly resumed application work through completed Phase Two and final bugs. **Keep going without milestone-acceptance pauses.** Finish P1-028, then fresh bug-finding/fixing Rounds Two/Three, PRD §32 P2.0–P2.4 and final defects. P1-009 is implemented/locally verified; finish its PR/checks/merge first if still pending.

Read `AGENTS.md`, [PRD](PRD.md) §§27/30/32/33, [status](PROJECT-STATUS_v51.md), [HOW-IT-WORKS](HOW-IT-WORKS.md), [SETUP](SETUP.md) and the [report](custom-bugs-report_v51.md)/[plan](custom-bugs-fix-plan_v51.md).

## Owner guidelines

- Use substantial related batches and best recommendations. PR creation/merge is authorized; both exact-final-head **push and pull_request** CI must pass. No direct pushes to main.
- Keep five core docs and the two requested versioned trackers; rename status/handover/report/plan together. New non-core docs only if explicitly requested or essential. Keep prior versions in Git.
- Write concise beginner lists/tables with enough detail to act. SETUP uses numbered browser clicks/fields, manual whole-file SQL paste, no terminal/localhost/automatic migration instructions. Research official UI sources before changing platform guidance.
- Prefer one existing Supabase database, Upstash database and Vercel project. Shared previews share test data/configuration/quotas. `APP_ENV=simulation|testnet` is separate from Vercel Preview/Production.
- The owner means **real-money mainnet** by production. It remains unimplemented/denied. Never mark unrun custody, hosting or legal evidence approved merely to report completion.
- No broad automated test suite is authorized. Use relevant named isolated manual procedures and required checks; report actual evidence and limitations.

## Current implementation

- Repo `nero1/onyiy`, branch `feat/historical-treasury-monitoring`. Round One **73/74 implemented/locally verified**; P1-028 open. Later rounds/Phase Two not started.
- P1-009 now uses immutable `treasury_addresses` populated by an atomic backfill and owner-only source triggers. Runtime has SELECT only; an authorized owner function advances the monitoring-attempt timestamp. Address identities cannot be changed or removed, including after expiry/zero balance. Future archival must retain this inventory.
- Staff inventory pages and historical checkpoint registration bind exact normalized address provenance/confirmation. Monitoring rotates across all old addresses without scanning invoice history or changing the schedule.
- Recovery stores per-address witnesses at one canonical cutoff and aggregates the full address set in PostgreSQL under query bounds. Missing evidence stays pending. Latest historical reviews block the service/signer database fence. EVM cutoff verification needs the explicit bounded 32-request/18-second budget.
- `000_initial_schema.sql` remains byte-identical. New `001_historical_treasury_fence.sql` must be manually pasted afterward. Its validated standalone footer is supported by `migrationSource` and the owner runner; hosted initialization applies no SQL.
- Verified current schema: **93 tables/852 columns/275 checks/107 standalone indexes**, machine contract `packages/db/schema-contract_v51.json`. Original tables/grants are preserved; new table/capture/index/fence are reviewed additions.
- Both `server/financial-config.ts` and `workers/signer/run.ts` readiness gates remain false; no mainnet/signing/broadcast activation.
- PR49 merged as `5205bd25e50c32ea9eeac62cf58767938cd36884`. Pure provider defaults, shared-database promotion fencing, branch-specific preview settings/metadata, first-Google-admin SQL, manual receipt verification and inline registry remain intact.
- Before shared testnet promotion, rotate runtime credentials and terminate only old runtime sessions as SETUP states; pre-v50 releases must not receive the new credentials. Promotion retains records and retires simulation access/seed/reset.

## Evidence and preservation

- Current private procedures/logs: `/workspace/work/treasury-v51`. Fresh clones/generated rows only. Source cluster `/workspace/work/shared-hosting-v50/pgdata` runs TLS on **55450**, socket under that work directory. Stop only that exact owned cluster when done. Do not use bare pg_ctl start: supply the saved port/socket/TLS paths.
- Final inventory procedures include `verify-inventory-r6.log`, `model-r3.log`, `backfill-r2.log`, `evm-release.log`, encrypted `treasury-inventory-v51-r2.gwbackup`, independent restore/verify and all80 retained inventories. Earlier draft failures/fixtures remain separately retained; they are not acceptance.
- Preserve original financial sources, failed fixtures, signed bytes, permanent keys, beneficiary holds, archives and keys. The inconsistent `gw_v27_native_refund_isolated` source remains untouched. Never reset shared/original data to repeat verification.
- Archives from before `001` require their matching historical release; old99-file packets specifically require `e6f7888034afae01d0c7803965f1c17889783171`. Do not bypass checksums/signatures or reinterpret signed history.
- Actual hosted Google/Turnstile/RPC/Upstash/domain/capacity acceptance remains unrun. Generated provider/identity fixtures are local contract evidence only.

## Next steps

Finish this PR’s required checks/build/bundle and both exact-head CI events, merge, then **continue P1-028 without stopping**. Also confirm/fix R2-001: archive schema fingerprints currently omit per-column ACLs; see the tracker follow-up. Version the seven docs together on the next completed batch. Continue later bug rounds and all §32 milestones; readiness records must keep missing owner/external evidence explicit.

v51
