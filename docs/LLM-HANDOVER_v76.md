# LLM handover v76

## Owner direction

Complete every Phase One/Two requirement, including real-money support and bugs. Continue substantial batches without M1/M2 or milestone approval pauses. Owner launch details are deferred to final testing: document protected setup, continue independent work and do not ask again now. **The product is incomplete; never invent hosted/live evidence or elapsed observation periods.** Use the [remaining list](PROJECT-STATUS_v76.md).

- Keep five core guides plus the two explicitly requested bug trackers. Rename the four versioned files together; fold new human guidance into these guides. SETUP stays concise, newbie-friendly, web UI only, with manual SQL paste.
- Reuse existing provider accounts/resources and database names; one financially active mode per shared database. Preview uses public-only credentials.
- Named isolated/manual procedures and mandatory checks are authorized. Broad automated suite is deferred. Preserve every original/failed financial fixture, packet and key; use fresh targets for corrections.
- Create/merge PRs without pauses after **push and pull_request CI both pass the exact final head**. No main pushes. No subagents unless explicitly authorized.

## Repository and tooling

`/workspace/onyiy`, GitHub `nero1/onyiy`, branch `feat/mainnet-expiry-replacement`, base PR74 merge `15588830f57b7d13572082c7d748b7905132d527`. PR72 exact headf92f96e passed push39072511492 / PR39072520501. PR70/71/72 are merged; implementation/evidence summaries are in status and Git history.

- Read AGENTS and relevant Next16 documentation before relevant code edits. Node22: `/workspace/work/tooling/node-v22.23.3-linux-x64/bin`; PostgreSQL tools: `/workspace/work/tooling/pg-tls/bin`.
- Owned PostgreSQL:55450, data `/workspace/work/shared-hosting-v50/pgdata`; public CA `server.crt` in that directory. Never read its private TLS key. Owner/runtime roles: `gw_v50_owner` / `gw_v50_runtime`. Preserve original failed `gw_v27_native_refund_isolated`; stopped cross-host55455/55456 retain data.
- Local listeners/tsx/builds need the command's additional network permission. Git writes need `/workspace/onyiy/.git` write permission. Sandbox EPERM can otherwise resemble build/process errors; preserve failed logs and retry with correct scope.
- Injected gh CLI credential expired. Connected GitHub Git Data/PR tools work. Build a remote tree from reviewed public files, assert its SHA equals the local reviewed tree, create commit/ref/PR and verify both exact-head CI events. Public unauthenticated fetch works with credential helpers/extra headers disabled. Align the clean local branch only after identical-tree verification.
- Use `/workspace/work` for scratch. Never print secret JSON/key files. Only generated allowlisted web env is saved0600 for browser procedures; no owner/signer credentials enter the web child. One earlier automatic approval review timed out; its retry passed, with no pending rejection/approval.

## Capability and constraints

- Four mainnets/eight protocols; seven member currencies, with TRX operating-only. Defaults remain off. Mainnet requires explicit protected enablement, transparent policy, reviewed readiness, verified registry, configuration approvals and recent signed external alert acknowledgement.
- Hash lists: `FINANCIAL_CONFIG_APPROVALS_JSON` / `ALERT_ACCEPTANCE_FINGERPRINTS_JSON`; legacy singular settings cannot be mixed with lists. Web/signer hashes include actual database identity. Changes require new approvals without rewriting old obligation/attempt snapshots.
- Encrypted four-key package/map, private installer, protected bounded GitHub signer, wallet sends, saved locale, per-currency native schedules and countdowns are implemented. Native schedules recheck database time/approvals/prices atomically; failures roll back before fair bounded backoff. No GIV launch control on native routes.
- Client wire1 accepts legacy clients0; current clients require versioned server1. Additive changes do not force reload. API/client block incompatible mutations; worker callbacks/logout retain independent authentication. PWA observes public manifest headers only. All connection/ownership/payment prompts protect manual reload; returned hash stays in owner/invoice-scoped memory, without automatic resend or persistent pending bodies.
- Cycle position uses actual serving order in transparent mode. Completed history/cooldowns/status localization and bounded active-cycle detection are implemented; recent30 rows cannot re-enable idle rotation.
- Protected manual recovery and opt-in automatic backup cadence are implemented. Known idle Supabase roles outside transactions are allowed only with provider markers; unknown/active/hidden metadata/occupied targets still block. No session termination. GitHub timing/storage/restore drills are unverified operational dependencies.

## Current work/evidence

[Status](PROJECT-STATUS_v76.md) contains the seven-asset fixture matrix. `native-lifecycle-v73` covers all basic incoming/refund/member withdrawals; `native-lifecycle-v74` covers company settlements/sweeps on all seven. Actual cryptographic signing, restricted roles, separate authenticated web settlement, idempotency, unchanged member balances, staff/surplus denials and independent balanced-ledger checks pass locally. All endpoints/contracts are declared generated fixtures. JAGA remains unverified for actual launch.

Pending ETH archive recovery passes in `native-lifecycle-v74/restore-pending-eth-r4`: exact backup/restore/verify, actual target identity, source approval/key denial, missing-index hold preservation, retained-hash settlement without custody/new signature/broadcast and unchanged source/packet. It does **not** reconstruct unknown post-backup activity. Missing custody emits an expected preflight pause while known attempts can still be observed.

New code: `server/native-send-state.ts` adds a read-only `display_status` based on durable signed/broadcast attempts. Raw obligation status can legitimately remain `signing`; actions/history/financial records remain untouched. Recent and paginated member views use the additive field with older-server fallback. `send-status-r2` passes funded staged progression, old-code baseline, isolation and unchanged financial hashes. `send-status-browser-r1` passes production Chromium390px EN/FR recent/paginated status and exact recorded transaction hash. Required checks, production build and bundle budgets pass locally.

Preserve failed runs listed in status. In particular, pending restore r1 switched URL while retaining an ESM pool; close both imported/CJS pools and assert `current_database()` when a harness deliberately switches databases. r2/r3 had incorrect expectations about missing-custody pause counts/internal raw state. Company r1 parse errors occurred before database creation. No source financial history was reset.

## Archive/schema essentials

- Current direct installer records seven receipts; SQL000–005 bytes are immutable, SQL006 only fixes queue parameter ambiguity. `schema-contract_v67.json`:96 tables/897 columns/301 checks/119 indexes. No DDL is needed for the current display fix.
- Recovery contract4 also checks migration fingerprints. Pre-006 contract4 requires matching PR65 `0ea4cf5e62a0ef7e7f83c26c1a512d6935775ac3`, then reviewed forward upgrade. Older v3: PR53 `6c323dc`; v2: `25a507`. Never rewrite/re-sign packets.
- Preserve `production-v55/production-foundation-v55-r1.gwbackup` and `cross-host-r1/archive.key`; `mainnet-recovery-v63/mainnet-isolated-r2.gwbackup` / `.key`; current-seven `browser-recovery-v69/mainnet-seven-migrations-r1.gwbackup` / `.key`. Keys in the last two pairs are raw32 bytes; the original cross-host key is encoded text. New packets/keys stay under their named procedure roots.
- Request replay state is excluded; fresh request/auth keys are needed before publication. Retained MFA/custody/payload encryption keys remain necessary. `archive_record_keys` audit additions are expected; compare exact additions, not a blanket unchanged-table assertion.

## Continue

PR73 merged after exact-head push39087811247 / PR39087821984 success. Pending SOL/SPL/TRC20 archive procedures under `native-lifecycle-v74/restore-pending-{sol,spl,tron}-r1` also pass. Follow-up hash-priority fix prefers live attempts over earlier failures; `hash-priority-r2` passes five temporary-only actual-helper cases. PR74 also merged after exact-head push39088138512 / PR39088144256 success. SOL/SPL/TRC20 refund expiry now passes actual worker/separate-web procedures and independent accounting reads; EVM native ETH/token BNB replacement preparation passes (not full replacement persistence). ETH post-withdrawal reorg `eth-reorg-r2` also passes once-only loss/reconfirmation, asset fence and immutable allocation/evidence checks. Preserve r1 with its wrong error-name assertion and retained open review. See status for paths and limits. Continue this batch documentation/CI/merge, then keep going on C004/C008 recovery edge cases and C010 current-PRD audit. Current scratch PRD audit has392 keyword candidates, all review-pending; do not infer acceptance from extraction. Actual Google/devices/provider provenance, external alert receiver, hosting/costs, post-backup chain reconciliation and14+14-day observation remain open. Do not stop after this PR or label local generated evidence production100%.

v76
