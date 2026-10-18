# LLM handover v104

## Owner direction

Complete every Phase One/Two requirement, including real-money support and bugs. Continue substantial batches without M1/M2 or milestone approval pauses. Owner launch details are deferred to final testing: document protected setup, continue independent work and do not ask again now. **The product is incomplete; never invent hosted/live evidence or elapsed observation periods.** Use the [remaining list](PROJECT-STATUS_v104.md).

- Keep five core guides plus the two explicitly requested bug trackers. Rename the four versioned files together; fold new human guidance into these guides. SETUP stays concise, newbie-friendly, web UI only, with manual SQL paste.
- Reuse existing provider accounts/resources and database names; one financially active mode per shared database. Preview uses public-only credentials.
- Named isolated/manual procedures and mandatory checks are authorized. Broad automated suite is deferred. Preserve every original/failed financial fixture, packet and key; use fresh targets for corrections.
- Create/merge PRs without pauses after **push and pull_request CI both pass the exact final head**. No main pushes. No subagents unless explicitly authorized.

## Repository and tooling

`/workspace/onyiy`, GitHub `nero1/onyiy`, branch `feat/mainnet-outage-fallback`, base PR102 merge `b015147cfca557a53f751d39be522bfddd2dbfff`. PR102 head12141b3 passed push39160280711 / PR39160298965. P1-096–110 are merged.

- Read AGENTS and relevant Next16 documentation before relevant code edits. Node22: `/workspace/work/tooling/node-v22.23.3-linux-x64/bin`; PostgreSQL tools: `/workspace/work/tooling/pg-tls/bin`.
- Owned PostgreSQL:55450, data `/workspace/work/shared-hosting-v50/pgdata`; public CA `server.crt` in that directory. Never read its private TLS key. Owner/runtime roles: `gw_v50_owner` / `gw_v50_runtime`. Preserve original failed `gw_v27_native_refund_isolated`; stopped cross-host55455/55456 retain data.
- Local listeners/tsx/builds need the command's additional network permission. Git writes need `/workspace/onyiy/.git` write permission. Sandbox EPERM can otherwise resemble build/process errors; preserve failed logs and retry with correct scope.
- Injected gh CLI credential expired. Connected GitHub Git Data/PR tools work. Build a remote tree from reviewed public files, assert its SHA equals the local reviewed tree, create commit/ref/PR and verify both exact-head CI events. Public unauthenticated fetch works with credential helpers/extra headers disabled. Align the clean local branch only after identical-tree verification.
- Use `/workspace/work` for scratch. Never print secret JSON/key files. Only generated allowlisted web env is saved0600 for browser procedures; no owner/signer credentials enter the web child. One earlier automatic approval review timed out; its retry passed, with no pending rejection/approval.

## Recovery evidence

All seven member assets pass generated post-backup unknown incoming/outgoing reconciliation and fresh approved resumption, with independent accounting. Exact procedures are in status. `post-backup-v87/eth-missing-intent-r3` additionally proves no inferred withdrawal from a member wallet, reviewed company loss, original-sender liability and intake pause while an approved payout settles. Missing off-chain intent is not reconstructed. Hosted/chosen incident/closure acceptance remains open. Preserve every original/failed source, target, packet and key, including `gw_v87_loss_binding_r1` and the earlier simplified ETH models.

## Capability and constraints

- Four mainnets/eight protocols; seven member currencies, with TRX operating-only. Defaults remain off. Mainnet requires explicit protected enablement, transparent policy, reviewed readiness, verified registry, configuration approvals and recent signed external alert acknowledgement.
- Hash lists: `FINANCIAL_CONFIG_APPROVALS_JSON` / `ALERT_ACCEPTANCE_FINGERPRINTS_JSON`; legacy singular settings cannot be mixed with lists. Web/signer hashes include actual database identity. Changes require new approvals without rewriting old obligation/attempt snapshots.
- Encrypted four-key package/map, private installer, protected bounded GitHub signer, wallet sends, saved locale, per-currency native schedules and countdowns are implemented. Native schedules recheck database time/approvals/prices atomically; failures roll back before fair bounded backoff. No GIV launch control on native routes.
- Client wire1 accepts legacy clients0; current clients require versioned server1. Additive changes do not force reload. API/client block incompatible mutations; worker callbacks/logout retain independent authentication. PWA observes public manifest headers only. All connection/ownership/payment prompts protect manual reload; returned hash stays in owner/invoice-scoped memory, without automatic resend or persistent pending bodies.
- Cycle position uses actual serving order in transparent mode. Completed history/cooldowns/status localization and bounded active-cycle detection are implemented; recent30 rows cannot re-enable idle rotation.
- Protected manual recovery and opt-in automatic backup cadence are implemented. Known idle Supabase roles outside transactions are allowed only with provider markers; unknown/active/hidden metadata/occupied targets still block. No session termination. GitHub timing/storage/restore drills are unverified operational dependencies.

## Recent evidence

Use status's compact audit table for account/privacy/exports/priority/notifications and exact procedure names. Earlier proofs remain in the bug trackers and Git history.

- `notices-v86/simulation-fixed-r2` / `native-fixed-r2`: production390px EN/FR error translation/reconnection and retained operation warnings; financial/point fingerprints unchanged.
- `fee-variance-v86/KEY-r1`: all seven fee-change/requote/confirmation lifecycles and independent `integrity-r1`. Three-family `expiry-KEY-r1` actually waits a configured one-minute quote; `expiry-integrity-r1` and `price-contract-r1` pass. No timestamp rewrites or elapsed launch-period claims.
- Fixtures use generated contracts/keys/providers, including JAGA; they are not real provenance/live approval. Owned PostgreSQL must keep TLS/port55450 on restart; do not reset evidence.

## Archive/schema essentials

- Current direct installer records seven receipts; SQL000–005 bytes are immutable, SQL006 only fixes queue parameter ambiguity. `schema-contract_v67.json`:96 tables/897 columns/301 checks/119 indexes. No DDL in the current audit.
- Recovery contract4 also checks migration fingerprints. Pre-006 contract4 requires matching PR65 `0ea4cf5e62a0ef7e7f83c26c1a512d6935775ac3`, then reviewed forward upgrade. Older v3: PR53 `6c323dc`; v2: `25a507`. Never rewrite/re-sign packets.
- Preserve `production-v55/production-foundation-v55-r1.gwbackup` and `cross-host-r1/archive.key`; `mainnet-recovery-v63/mainnet-isolated-r2.gwbackup` / `.key`; current-seven `browser-recovery-v69/mainnet-seven-migrations-r1.gwbackup` / `.key`. Keys in the last two pairs are raw32 bytes; the original cross-host key is encoded text. New packets/keys stay under their named procedure roots.
- Request replay state is excluded; fresh request/auth keys are needed before publication. Retained MFA/custody/payload encryption keys remain necessary. `archive_record_keys` audit additions are expected; compare exact additions, not a blanket unchanged-table assertion.

## Continue

P1-111 fixes the mainnet informational outage fallback without relaxing live-policy validation. `mainnet-outage-v104/baseline-r1` / `fixed-r1` cover all three modes; production `http-baseline-r1` / final `http-fixed-r3` cover EN/FR Home200, disabled help404 and authoritative native-wallet closure during DB loss. Preserve failed HTTP expectation harnesses. Required/build/bundle checks pass; no DB/financial mutation.

Check this batch's PR state; merge only after both CI events pass the exact head. **Then prioritize the owner's new documentation task before any further product work:** delete `custom-bugs-fix-plan`, retain a concise `custom-bugs-report` stating fixed ranges without histories/how/why/evidence; list only outstanding actionable bugs and brief fix directions. Shorten other guides except PRD. Preserve necessary setup/recovery instructions; put this rule in the handover/relevant guide. Update the docs validator for the single tracker. Merge the cleanup PR, then resume C001–C017 autonomously. Do not claim100% from local evidence. Preserve all source/failed fixtures, packets and keys; Git retains historical detail.

v104
