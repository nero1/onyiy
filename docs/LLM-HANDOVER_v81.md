# LLM handover v81

## Owner direction

Complete every Phase One/Two requirement, including real-money support and bugs. Continue substantial batches without M1/M2 or milestone approval pauses. Owner launch details are deferred to final testing: document protected setup, continue independent work and do not ask again now. **The product is incomplete; never invent hosted/live evidence or elapsed observation periods.** Use the [remaining list](PROJECT-STATUS_v81.md).

- Keep five core guides plus the two explicitly requested bug trackers. Rename the four versioned files together; fold new human guidance into these guides. SETUP stays concise, newbie-friendly, web UI only, with manual SQL paste.
- Reuse existing provider accounts/resources and database names; one financially active mode per shared database. Preview uses public-only credentials.
- Named isolated/manual procedures and mandatory checks are authorized. Broad automated suite is deferred. Preserve every original/failed financial fixture, packet and key; use fresh targets for corrections.
- Create/merge PRs without pauses after **push and pull_request CI both pass the exact final head**. No main pushes. No subagents unless explicitly authorized.

## Repository and tooling

`/workspace/onyiy`, GitHub `nero1/onyiy`, branch `feat/phase-two-acceptance-audit`, base PR79 merge `f1af8d7`. PR72 exact headf92f96e passed push39072511492 / PR39072520501. PR70/71/72 are merged; implementation/evidence summaries are in status and Git history.

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

Use [status](PROJECT-STATUS_v81.md) for the concise current evidence matrix and C001–C017 remaining list. Detailed historical delivery is in Git, not repeated here.

PR78 merged at head4a9fb86 after push39090744721 / PR39090751758 passed. Solana v1 reads now share maximum1 across network/adapter/bounded scanner; recorded-public-data and local financial regressions pass. Actual public network identities match; public-secondary403/executor direct transport failures are not hosted acceptance.

Current P1-076–079 changes: default receipt mode from authenticated metadata; bounded history display enrichment without portable-export changes; exact currency/network amounts, native terminology, recorded progress/hash; render-time localized errors with identity/read guards. Next16 use-client documentation was read before component edits. Offline locale navigation also uses the native History API so it cannot discard a loaded page when a server navigation fails. The Next16 linking/navigation guide was read before editing this. Source is frozen after successful `member-history-build-r5`.

Under `product-audit-v78`, old production-browser baselines reproduce mode/units/labels and stale error language. ETH `member-history-reads-r2`, GIV `simulation-history-reads-r1` and `history-pending-r3` pass read-only checks, including existing joined views and unchanged financial hashes. Browser r1 passed all happy-path EN/FR390px/PNG checks. Final `member-history-browser-r5` passes network failure, an offline locale change that preserves the loaded page/translated error, and recovery. Required check-allr2/buildr5/bundle pass. Preserve prior failed browser scripts/logs and the pending r1 correlation failure; do not alter financial fixtures to satisfy an assertion. Final docs/secrets/whitespace checks run before publication.

## Archive/schema essentials

- Current direct installer records seven receipts; SQL000–005 bytes are immutable, SQL006 only fixes queue parameter ambiguity. `schema-contract_v67.json`:96 tables/897 columns/301 checks/119 indexes. No DDL is needed for the current display fix.
- Recovery contract4 also checks migration fingerprints. Pre-006 contract4 requires matching PR65 `0ea4cf5e62a0ef7e7f83c26c1a512d6935775ac3`, then reviewed forward upgrade. Older v3: PR53 `6c323dc`; v2: `25a507`. Never rewrite/re-sign packets.
- Preserve `production-v55/production-foundation-v55-r1.gwbackup` and `cross-host-r1/archive.key`; `mainnet-recovery-v63/mainnet-isolated-r2.gwbackup` / `.key`; current-seven `browser-recovery-v69/mainnet-seven-migrations-r1.gwbackup` / `.key`. Keys in the last two pairs are raw32 bytes; the original cross-host key is encoded text. New packets/keys stay under their named procedure roots.
- Request replay state is excluded; fresh request/auth keys are needed before publication. Retained MFA/custody/payload encryption keys remain necessary. `archive_record_keys` audit additions are expected; compare exact additions, not a blanket unchanged-table assertion.

PR79 merged (`f1af8d7`) after exact head28058bf passed push39092977355 / PR39092983203. The current activity eligibility/exclusion audit passes; see status for limits. Generated clone `gw_v81_activity_r3` retains consent/epoch evidence; original fixtures and financial hashes are unchanged. `gw_v81_activity_r1` failed fixture consent setup and r2 is an earlier retained clone. The suspected signup/member-count alias issue was ruled out by independent SQL; do not invent a fix. PostgreSQL was recovered after environment restart and is running with TLS on55450; restart must explicitly retain port/TLS options.

## Continue

Publish the current concise evidence update after docs/secrets/whitespace checks and both exact-head CI events. Then continue C004/C008 remaining variants and C010 full current-PRD/public/admin/flags/accessibility audit. The historical295-row and current392-keyword scratch files are not whole-product acceptance.

Owner inputs remain deferred. Continue independent work without asking again; actual provider/custody/Google/CAPTCHA/devices/alerts/hosting/costs/post-backup reconciliation and14+14-day observation remain unverified. Do not stop after a checked merge or claim production100%.

v81
