# LLM handover v49

Updated: **16 October 2026 at 12:18:29 PM WAT**.

## Stop boundary

**The owner authorized documentation cleanup only. Complete its verified PR merge, report, then halt.** Do not work on P1-009/P1-028, Round Two/Three or Phase Two until the owner explicitly resumes. Documentation instructions do not reopen application work. Earlier autonomous-continuation requests are superseded by this pause.

## Read first

1. `AGENTS.md`, then [PRD](PRD.md), especially §§27, 32 and 33.
2. [Current status](PROJECT-STATUS_v49.md).
3. [Bug report](custom-bugs-report_v49.md) and [fix plan](custom-bugs-fix-plan_v49.md).
4. [HOW-IT-WORKS](HOW-IT-WORKS.md) and [SETUP](SETUP.md) when relevant.

## Current facts

- Repository: **nero1/onyiy**. Documentation branch: `docs/browser-setup-consolidation`.
- Round One: **72/74 implemented and locally verified**. Open: **P1-009** (historical receiving addresses/custody), **P1-028** (retention/archival). Later audit rounds and Phase Two have not started.
- [PR46](https://github.com/nero1/onyiy/pull/46) and [PR47](https://github.com/nero1/onyiy/pull/47) are merged after exact-head push and PR CI. Do not treat their stale historical “awaiting merge” text as current.
- Only active migration: `packages/db/src/migrations/000_initial_schema.sql`, a final-state fresh installer. Owner confirmed no migrations were applied to the intended installation. It installs 92 tables/848 columns/274 CHECKs/105 standalone indexes and all final security objects.
- The user pastes the **entire SQL file manually into Supabase SQL Editor**. SETUP contains no terminal/localhost or automated-migration procedure. Existing hosted deployment initialization is explained honestly; do not invent a seed/restore dashboard button.
- Binding preflight uses fresh transaction-held advisory locks, **no proof-table bootstrap**. The runtime login stays restricted; owner credentials stay outside Vercel.
- Both financial readiness gates remain false. Mainnet, real signing/broadcast and gate activation are not authorized by documentation cleanup.
- P1-065 search/closed optional pg_trgm archive dependency was explicitly approved and implemented. No search approval remains pending. Old 99-file archives still require their matching historical release.

## Documentation policy

- Keep **five core files**: PRD, SETUP, HOW-IT-WORKS, current PROJECT-STATUS and current LLM-HANDOVER.
- Keep the two owner-requested, versioned custom-bugs report/plan as approved exceptions. Version status/handover/report/plan together; keep prior versions in Git.
- Create other non-core files only if explicitly requested or essential. Fold other material into the appropriate existing guide. Machine schema evidence now lives at `packages/db/schema-contract_v48.json`, unchanged and checked by `scripts/check-drizzle-coverage.mjs`.
- Use plain language for a high-school developer. Prefer short numbered actions, lists and compact tables. Be concise without hiding required values, conditions, limitations or evidence.
- Research current official UI labels for setup changes. Web UI only; manual SQL paste. Keep optional later operations separate from first deployment.
- Update current sections; do not append repeated diaries, duplicate decisions or contradictory stop instructions. Progress belongs in status, mechanics in HOW-IT-WORKS, requirements in PRD.

## Verification and preservation

- Run relevant checks. Both **push and pull_request CI must succeed for the exact final head** before merging. No direct push to main. Standing owner authorization permits coherent PR creation/merge.
- Documentation cleanup must preserve all 74 findings, original source evidence, fix intent and acceptance checks. Counts are not a weighted completion percentage.
- Preserve immutable financial records, signed bytes, permanent operation keys, beneficiary holds, failed fixtures, archive packets and keys. Never reset shared sources to repeat verification.
- The original `gw_v27_native_refund_isolated` source is inconsistent and remains preserved. Do not repair/reset it. Private evidence and tools are under `/workspace/work/`; they are not new project documents or committed secrets.
- Latest schema evidence: private `/workspace/work/schema-consolidation-v48`, encrypted `initial-schema_v48-r2.gwbackup`, exact inactive restores, 79 inventories. Documentation scratch: `/workspace/work/docs-simplification-v49`.
- Keep hosted Google/Upstash/RPC/alert/mobile/load acceptance explicitly unrun until observed. No broad automated test suite is authorized; use relevant named manual checks when application work resumes.

## Next action

If this documentation PR is already merged, **remain halted and wait for the owner**. Otherwise complete only its outstanding checks/PR/merge. When the owner resumes application work, follow the order and acceptance checks in the current fix plan; do not start Phase Two while known Round One work is unresolved.

v49
