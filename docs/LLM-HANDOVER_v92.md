# LLM handover v92

## Owner direction

Complete every Phase One/Two requirement, including real-money support and bugs. Continue substantial batches without M1/M2 or milestone approval pauses. Owner launch details are deferred to final testing: document protected setup, continue independent work and do not ask again now. **The product is incomplete; never invent hosted/live evidence or elapsed observation periods.** Use the [remaining list](PROJECT-STATUS_v92.md).

- Keep five core guides plus the two explicitly requested bug trackers. Rename the four versioned files together; fold new human guidance into these guides. SETUP stays concise, newbie-friendly, web UI only, with manual SQL paste.
- Reuse existing provider accounts/resources and database names; one financially active mode per shared database. Preview uses public-only credentials.
- Named isolated/manual procedures and mandatory checks are authorized. Broad automated suite is deferred. Preserve every original/failed financial fixture, packet and key; use fresh targets for corrections.
- Create/merge PRs without pauses after **push and pull_request CI both pass the exact final head**. No main pushes. No subagents unless explicitly authorized.

## Repository and tooling

`/workspace/onyiy`, GitHub `nero1/onyiy`, branch `feat/remaining-phase-two-audit`, base PR90 merge `9c804c6ca2cb12eb74a35dc46f77180f022e1e78`. PR90 head0b0d4c0 passed push39129344339 / PR39129353472 before merge.

- Read AGENTS and relevant Next16 documentation before relevant code edits. Node22: `/workspace/work/tooling/node-v22.23.3-linux-x64/bin`; PostgreSQL tools: `/workspace/work/tooling/pg-tls/bin`.
- Owned PostgreSQL:55450, data `/workspace/work/shared-hosting-v50/pgdata`; public CA `server.crt` in that directory. Never read its private TLS key. Owner/runtime roles: `gw_v50_owner` / `gw_v50_runtime`. Preserve original failed `gw_v27_native_refund_isolated`; stopped cross-host55455/55456 retain data.
- Local listeners/tsx/builds need the command's additional network permission. Git writes need `/workspace/onyiy/.git` write permission. Sandbox EPERM can otherwise resemble build/process errors; preserve failed logs and retry with correct scope.
- Injected gh CLI credential expired. Connected GitHub Git Data/PR tools work. Build a remote tree from reviewed public files, assert its SHA equals the local reviewed tree, create commit/ref/PR and verify both exact-head CI events. Public unauthenticated fetch works with credential helpers/extra headers disabled. Align the clean local branch only after identical-tree verification.
- Use `/workspace/work` for scratch. Never print secret JSON/key files. Only generated allowlisted web env is saved0600 for browser procedures; no owner/signer credentials enter the web child. One earlier automatic approval review timed out; its retry passed, with no pending rejection/approval.

## Current recovery audit

P1-089 merged in PR86 after both exact-head CI events passed. P1-090, merged in PR87, adds the same database-target fence to loss resolution before replay/provider access, plus checkpoint/run consistency. Baseline/fixed/original-target replay and independent integrity evidence remain under `post-backup-v87`; cloned `gw_v87_loss_binding_r1` is retained.


`post-backup-v87/eth-unknown-r2` passes coherent post-backup unknown ETH incoming/outgoing, typed loss review, full custody reconciliation and a new withdrawal after fresh target approvals/alert/price/custody. Preserve both r1 and stronger r2 sources/targets/packets/keys; r1 had a simplified timeline/nonce model. Restricted-role current/history proof reproduces then fixes P1-089. Other families, missing off-chain intents and hosted drills remain open; do not infer complete disaster recovery.

## Capability and constraints

- Four mainnets/eight protocols; seven member currencies, with TRX operating-only. Defaults remain off. Mainnet requires explicit protected enablement, transparent policy, reviewed readiness, verified registry, configuration approvals and recent signed external alert acknowledgement.
- Hash lists: `FINANCIAL_CONFIG_APPROVALS_JSON` / `ALERT_ACCEPTANCE_FINGERPRINTS_JSON`; legacy singular settings cannot be mixed with lists. Web/signer hashes include actual database identity. Changes require new approvals without rewriting old obligation/attempt snapshots.
- Encrypted four-key package/map, private installer, protected bounded GitHub signer, wallet sends, saved locale, per-currency native schedules and countdowns are implemented. Native schedules recheck database time/approvals/prices atomically; failures roll back before fair bounded backoff. No GIV launch control on native routes.
- Client wire1 accepts legacy clients0; current clients require versioned server1. Additive changes do not force reload. API/client block incompatible mutations; worker callbacks/logout retain independent authentication. PWA observes public manifest headers only. All connection/ownership/payment prompts protect manual reload; returned hash stays in owner/invoice-scoped memory, without automatic resend or persistent pending bodies.
- Cycle position uses actual serving order in transparent mode. Completed history/cooldowns/status localization and bounded active-cycle detection are implemented; recent30 rows cannot re-enable idle rotation.
- Protected manual recovery and opt-in automatic backup cadence are implemented. Known idle Supabase roles outside transactions are allowed only with provider markers; unknown/active/hidden metadata/occupied targets still block. No session termination. GitHub timing/storage/restore drills are unverified operational dependencies.

## Current work/evidence

PR79–84 are merged after both exact-head events. Latest PR84 merge `30efd43`, head1405aed: push39108470457 / PR39108477898. P1-080–086 recovery displays, CAPTCHA default/callback cleanup and own-case pagination/read quotas/error language are merged. Earlier named evidence is in status/Git; actual hosted/provider/device acceptance remains open.

Current P1-087 introduces `useLocalizedNotice` in15 components and render-time dashboard exception/notice keys, fixing frozen-language errors. Native proof/payment copy follows locale too. P1-088 separates native read errors from operation notices so successful owned reads clear recovered read errors without erasing payment warnings. Source requests, mutation guards and financial rules are unchanged. Read relevant Next16 client docs before further component edits.

`notices-v86/native-baseline-r1` reproduces stale native error language. Final `simulation-fixed-r2` passes production Chromium390px translation/reconnection and unchanged financial/point fingerprints. `native-fixed-r2` observes actual successful portfolio responses, verifies read-error recovery/translation and operation-warning retention, and rejects malformed payment input without a send. `financial-integrity-r1` checks unchanged native financial hashes against retained copies. The first native procedure/deadline logs remain intact. Final check-allr4/buildr4/bundler4 pass; finish docs/secrets/whitespace checks, publish and require both exact-head CI events before merge.

`fee-variance-v86/KEY-r1` passes all seven assets: above-tolerance fee change pauses unsigned holds without changing old amounts or signing; fresh linked quotes require confirmation, then actual worker/separate web settle once. `integrity-r1` independently checks five attempts/gas journals, one old release/new hold and balanced ledgers. `expiry-{eth,usdt_sol,usdt_tron}-r1` actually waits a configured one-minute quote, refreshes signed prices and proves held pause/requote; `expiry-integrity-r1` verifies renewal after expiry with preserved costs/net. No timestamp rewrites or elapsed launch-period claims. `price-contract-r1` verifies signed-feed denials/exact replay with unchanged financial fingerprints. All contracts/keys/providers are generated, including JAGA; not real provenance/live approval.

Owned PostgreSQL runs with TLS on55450; restart must explicitly retain port/TLS options. Preserve every generated source/failed fixture/packet/key. Never reset financial evidence. Current code/schema does not need new DDL.

## Archive/schema essentials

- Current direct installer records seven receipts; SQL000–005 bytes are immutable, SQL006 only fixes queue parameter ambiguity. `schema-contract_v67.json`:96 tables/897 columns/301 checks/119 indexes. No DDL in the current audit.
- Recovery contract4 also checks migration fingerprints. Pre-006 contract4 requires matching PR65 `0ea4cf5e62a0ef7e7f83c26c1a512d6935775ac3`, then reviewed forward upgrade. Older v3: PR53 `6c323dc`; v2: `25a507`. Never rewrite/re-sign packets.
- Preserve `production-v55/production-foundation-v55-r1.gwbackup` and `cross-host-r1/archive.key`; `mainnet-recovery-v63/mainnet-isolated-r2.gwbackup` / `.key`; current-seven `browser-recovery-v69/mainnet-seven-migrations-r1.gwbackup` / `.key`. Keys in the last two pairs are raw32 bytes; the original cross-host key is encoded text. New packets/keys stay under their named procedure roots.
- Request replay state is excluded; fresh request/auth keys are needed before publication. Retained MFA/custody/payload encryption keys remain necessary. `archive_record_keys` audit additions are expected; compare exact additions, not a blanket unchanged-table assertion.

## Continue

P1-089–094 are merged through PR90 after both exact-head CI events. All seven full post-backup procedures and independent integrity checks now pass under `post-backup-v87`; use the compact matrix in status for exact names. Token checks separately verify native gas and token cash. Thirteen SOL/SPL and15 TRX/TRC20 read-only balance-witness boundaries pass. Keep every original/failed source, packet, key and log; Sol r1 source-name and token r1 pause-count errors are retained harness mistakes, with fresh corrected fixtures.

Publish this evidence-only v92 batch after docs/secrets/whitespace checks and both exact-head CI events. Then continue missing off-chain intent/incident handling and the full current-PRD/public/admin/flags/accessibility audit. No owner/provider/device/hosting acceptance or elapsed observation follows from generated fixtures. The historical295-row/current392-keyword scratch files are not whole-product acceptance.

Owner inputs remain deferred. Continue independent work without asking again; actual provider/custody/Google/CAPTCHA/devices/alerts/hosting/costs and wider post-backup recovery and14+14-day observation remain unverified. Do not stop after a checked merge or claim production100%.

v92
