# LLM handover v54

Updated: **17 October 2026 at 01:06:45 UTC**.

## Authorization and order

The owner explicitly resumed application work through completed Phase Two and final bugs. **Keep going without milestone-acceptance pauses.** Round One and the later named bug rounds are merged. Finish PRD §32 P2.0–P2.4 and final defects without stopping at intermediate milestones.

Read `AGENTS.md`, [PRD](PRD.md) §§27/30/32/33, [status](PROJECT-STATUS_v54.md), [HOW-IT-WORKS](HOW-IT-WORKS.md), [SETUP](SETUP.md) and the [report](custom-bugs-report_v54.md)/[plan](custom-bugs-fix-plan_v54.md).

## Owner guidelines

- Use substantial related batches and best recommendations. PR creation/merge is authorized; both exact-final-head **push and pull_request** CI must pass. No direct pushes to main.
- Keep five core docs and the two requested versioned trackers; rename status/handover/report/plan together. New non-core docs only if explicitly requested or essential. Keep prior versions in Git.
- Write concise beginner lists/tables with enough detail to act. SETUP uses numbered browser clicks/fields, manual whole-file SQL paste, no terminal/localhost/automatic migration instructions. Research official UI sources before changing platform guidance.
- Prefer one existing Supabase database, Upstash database and Vercel project. Shared previews share test data/configuration/quotas. `APP_ENV=simulation|testnet` is separate from Vercel Preview/Production.
- The owner means **real-money mainnet** by production. It remains unimplemented/denied. Never mark unrun custody, hosting or legal evidence approved merely to report completion.
- No broad automated test suite is authorized. Use relevant named isolated manual procedures and required checks; report actual evidence and limitations.

## Current implementation

- Repository `nero1/onyiy`, branch `feat/phase-two-transparency`. PR51 completed Round One; PR52 merged the later named bug rounds as `25a5073d30974bcf8b02814bc81181e3a147d15c`. P2.0–P2.4 implementation/local verification and eight final review fixes are complete; final checks/PR merge remain pending.
- P2.0–P2.3: validated defaults/presets, fresh-MFA admin preview/stage/commit, immutable staged proposals, atomic shared/exclusive profile fencing, queue revisions/cancelled slots, preserved submitted payments, EN/FR disclosure DTO/screens, optional publication consent, verified activity/stats and labelled receipt preview/download. Keep test defaults unchanged.
- SQL004 is a forward migration; never rewrite installed000–003. Its unreleased source/footer generator is private `work/phase-two-v54/build-migration.py`. Changed SQL requires a fresh suffix/database, never replacing an installed fixture receipt. A final comment-only grant-classification addition produced the current r6 fixture.
- Lock order: profile fence BEFORE simulation-promotion/actor/financial locks. Only service+active-admin `profileSwitch:true` contexts take the exclusive lock. Exact no-op manifest updates remain compatible with owner promotion fencing.
- Every queue change increments its partition revision. Disabled bootstrap removes only waiting unallocated slots; original required/credited counts, allocations and liabilities stay. Invoice revisions reject stale new intake; previously submitted invoices retain original rights even after material terms change.
- Publication uses explicit self consent with compare-and-swap revision. Only owner review can change account classification to real; unknown/test/system accounts are excluded. Durable private activity epoch invalidates cached public activity after withdrawal across instances. Current simulation/testnet verified activity and totals are honestly empty.
- P2.4 assessment is `not_reviewed`: unsupported mainnet execution/registry, custody/signing, funding/refund/closure model, target countries/review, approved financial copy/terms, operating/gas budget and hosted capacity/alert/restore evidence remain missing. Both financial readiness gates stay false.

## Verification and review findings

Private scratch: `/workspace/work/phase-two-v54`; do not commit fixtures/keys/logs.

- Fresh current SQL000–004 installation/owner seeder and `profile-procedure-r6.mts` passed on `gw_v54_simulation_r6`: partial allocation, stale preview rejection, full rollback, atomic switch/replay, unchanged balances,19 cancelled unallocated slots, preserved joining11/serving1, expired unused quote and completed prior submitted payment.
- `privacy-matrix-r1.mts` and `fences-r1.mts` passed against earlier semantically identical r5 SQL: twelve preset previews, mandatory disclosures, admin authorization, consent/CAS/revocation, service classification denial, durable epoch changes, excluded simulation/testnet records, actual shared/exclusive lock serialization, owner no-op compatibility and retention-hold cleanup.
- Fresh generated model/catalog proof r2 matches96 logical tables/892 columns/298 checks/119 standalone indexes, including exact column defaults and normalized constraints/indexes. `schema-contract_v54.json` records current migration hashes; partitions/deferred guards remain separately classified.
- Recovery found P2-B005: JS dates truncated PostgreSQL microseconds, causing a composite-key page to repeat. Recovery now projects timestamp strings at full precision for cursors and row fingerprints. Signed inventory contract3 rejects older packets before target changes; older archives require matching historical code, never re-signing.
- `archive-r2.mts` passed actual encrypted backup, empty-target restore and independent verify with83 retained tables. `security-r1.mts` proved one-microsecond row fingerprint changes, column ACL drift detection, unknown-table rejection and refusal of a preserved contract2 packet before target DDL.
- Other findings: P2-B001 queue revision gaps; B002 forbidden internal rank call in admin preview; B003 decimal-rate regex; B004 mixed catalogue/profile revisions; B006 misplaced client directive; B007 raw EXISTS parentheses; B008 stale receipt masking/publication language-change state. Trackers preserve details. Final review corrected consent paragraph breaks, future-mainnet test/demo rejection, stage-specific preview refresh and browser-upload-safe review route rewrite.
- Built HTTP EN/FR/no-store/admin-denial and rollback-only future read-model consent/privacy/rate procedures passed. Required checks r4 and build r3 passed before the final SQL-expression fix; rerun final checks/build/bundle and use exact final head for both push and PR CI. Local bounds: homepage181.65KiB/200; API1.430MiB/3; clients0.672MiB/2. These are not hosted capacity claims.

## Continue to completion

1. Complete final named HTTP/copy/receipt/read-model checks and required checks/build/bundle. Keep all failed fixtures, original sources and signed archives/keys intact.
2. Update status/trackers with actual evidence, open the Phase Two PR, wait for both exact-head CI events, then merge. Continue final bug review without acceptance pauses.
3. Report implementation completion separately from missing external/owner readiness evidence. Do not invent production execution, approvals or provider measurements.

Shared owned PostgreSQL cluster: `/workspace/work/shared-hosting-v50/pgdata`, TLS port55450, matching socket/certificate beneath that directory. Node22: `/workspace/work/tooling/node-v22.23.3-linux-x64/bin`; PostgreSQL tools: `/workspace/work/tooling/pg-tls/bin`. Network-enabled execution is needed for local connections. Stop only this owned cluster; restart with its saved port/socket/TLS arguments. Never reset original failed financial sources, especially `gw_v27_native_refund_isolated`.
