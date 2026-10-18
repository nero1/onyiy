# LLM handover v85

## Owner direction

Complete every Phase One/Two requirement, including real-money support and bugs. Continue substantial batches without M1/M2 or milestone approval pauses. Owner launch details are deferred to final testing: document protected setup, continue independent work and do not ask again now. **The product is incomplete; never invent hosted/live evidence or elapsed observation periods.** Use the [remaining list](PROJECT-STATUS_v85.md).

- Keep five core guides plus the two explicitly requested bug trackers. Rename the four versioned files together; fold new human guidance into these guides. SETUP stays concise, newbie-friendly, web UI only, with manual SQL paste.
- Reuse existing provider accounts/resources and database names; one financially active mode per shared database. Preview uses public-only credentials.
- Named isolated/manual procedures and mandatory checks are authorized. Broad automated suite is deferred. Preserve every original/failed financial fixture, packet and key; use fresh targets for corrections.
- Create/merge PRs without pauses after **push and pull_request CI both pass the exact final head**. No main pushes. No subagents unless explicitly authorized.

## Repository and tooling

`/workspace/onyiy`, GitHub `nero1/onyiy`, branch `feat/member-case-pagination`, base PR83 merge `c606f4cc6c94a7aca2c290c8b499989d91c3e1f6`. PR72 exact headf92f96e passed push39072511492 / PR39072520501. PR70/71/72 are merged; implementation/evidence summaries are in status and Git history.

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

PR79–83 are merged after both exact-head CI events. Latest PR83 merge `c606f4c`, head0f50536: push39107336149 / PR39107344071. P1-080/081 restore settled support-recovery earnings to receipts/activity/statistics/recent wallet; seven-asset actual isolated recovery and independent journal/receipt/total checks pass. P1-082 clears transient OAuth state on failed302/429/503 paths without changing session/error status. P1-083 uses shared CAPTCHA defaults, fixing mainnet consent when overrides are unset. Generated settings/local checks are not real Google/Cloudflare/provider acceptance.

Current P1-084 adds own report/appeal pagination to fix newest100-only access. `ownCasesInput` is parsed on `/me/reports`; explicit own predicates remain; cursors use existing authenticated cursor utilities with separate own-collection scopes and exact timestamp/ID positions. Full microsecond cursor values are kept internal, not emitted in rows. Account UI pages collections independently and guards stale failures. No schema/financial change.

`member-cases-v85/baseline-r1` reproduces inaccessible older reports. `pagination-r1` verifies101 reports; `pagination-r3` verifies101 reports/101 appeals at tied microsecond timestamps, cursor account/collection/filter isolation, foreign-case exclusion and older-case token access. Failed r2 correctly hit immutable-case creation-time protection; retain it and all source fixtures. Fresh r3 inserts intended generated rows rather than rewriting old timestamps. The initial browser attempts exposed action quotas on GETs; retain their logs. The first error-language baseline did not reach its assertion; corrected `browser-language-baseline-r2` reproduced P1-086. Account errors now translate at render time, clear on identity changes and reject stale bootstrap/page/action results while preserving public bootstrap data. P1-085 classifies nonstaff GETs as reads before mutation categories. `read-quota-baseline-r1` reproduces sixth-read429 and `read-quota-fixed-r1` passes six reads while the sixth CSRF-protected report POST remains429. `browser-r2` passes EN/FR390px pagination/privacy and `integrity-r1` verifies unchanged financial hashes across all case/rate fixtures. Final `browser-language-fixed-r1` passes pagination plus offline error translation/data preservation and completed reconnection refresh. `check-all-r4`, `build-r4` and `bundle-r4` pass. Finish docs/secrets/whitespace checks, publish and require both exact-head CI events before merge. Relevant Next16 client/route guides have been read.

Owned PostgreSQL is running with TLS on55450 after environment restart; restarting must explicitly retain port/TLS options. All generated financial databases/packets/keys remain intact. See status/Git history for earlier named browser, archive, lifecycle and auth evidence; no public funds were sent.

## Archive/schema essentials

- Current direct installer records seven receipts; SQL000–005 bytes are immutable, SQL006 only fixes queue parameter ambiguity. `schema-contract_v67.json`:96 tables/897 columns/301 checks/119 indexes. No DDL is needed for the current display fix.
- Recovery contract4 also checks migration fingerprints. Pre-006 contract4 requires matching PR65 `0ea4cf5e62a0ef7e7f83c26c1a512d6935775ac3`, then reviewed forward upgrade. Older v3: PR53 `6c323dc`; v2: `25a507`. Never rewrite/re-sign packets.
- Preserve `production-v55/production-foundation-v55-r1.gwbackup` and `cross-host-r1/archive.key`; `mainnet-recovery-v63/mainnet-isolated-r2.gwbackup` / `.key`; current-seven `browser-recovery-v69/mainnet-seven-migrations-r1.gwbackup` / `.key`. Keys in the last two pairs are raw32 bytes; the original cross-host key is encoded text. New packets/keys stay under their named procedure roots.
- Request replay state is excluded; fresh request/auth keys are needed before publication. Retained MFA/custody/payload encryption keys remain necessary. `archive_record_keys` audit additions are expected; compare exact additions, not a blanket unchanged-table assertion.

PR79 merged (`f1af8d7`) after exact head28058bf passed push39092977355 / PR39092983203. The current activity eligibility/exclusion audit passes; see status for limits. Generated clone `gw_v81_activity_r3` retains consent/epoch evidence; original fixtures and financial hashes are unchanged. `gw_v81_activity_r1` failed fixture consent setup and r2 is an earlier retained clone. The suspected signup/member-count alias issue was ruled out by independent SQL; do not invent a fix. PostgreSQL was recovered after environment restart and is running with TLS on55450; restart must explicitly retain port/TLS options.

P1-080 adds settled `recovery` earnings to receipt/activity/statistic reads, restricted to `available_payable`. The actual ETH support flow in `product-audit-v81/eth-support-r1` passes, reproduces the old omission, and leaves its generated database/keys intact. Corrected `recovery-earnings-reads-r1` passes exact receipt/hash, USD1.65 totals and opt-in/revocation with unchanged financial hashes. PR80 merged after both exact-head events passed. Required check-allr1, buildr1, bundler2, repeated recovery reads r2 and ordinary-history-regressionr1 pass. Finish docs/secrets/whitespace checks, publish and require both exact-head CI events before merge.

## Continue

Finish the member-case browser/required/build/bundle/docs checks, publish the fix and merge after both exact-head CI events. Then continue C004/C008 remaining variants and C010 full current-PRD/public/admin/flags/accessibility audit. The historical295-row and current392-keyword scratch files are not whole-product acceptance.

Owner inputs remain deferred. Continue independent work without asking again; actual provider/custody/Google/CAPTCHA/devices/alerts/hosting/costs/post-backup reconciliation and14+14-day observation remain unverified. Do not stop after a checked merge or claim production100%.

v85
