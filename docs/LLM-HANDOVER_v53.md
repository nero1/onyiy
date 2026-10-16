# LLM handover v52

Updated: **17 October 2026 at 12:58:03 AM WAT**.

## Authorization and order

The owner explicitly resumed application work through completed Phase Two and final bugs. **Keep going without milestone-acceptance pauses.** Finish P1-028, then fresh bug-finding/fixing Rounds Two/Three, PRD §32 P2.0–P2.4 and final defects. P1-009 is implemented/locally verified and PR50 is merged. Continue the current retention batch without stopping.

Read `AGENTS.md`, [PRD](PRD.md) §§27/30/32/33, [status](PROJECT-STATUS_v53.md), [HOW-IT-WORKS](HOW-IT-WORKS.md), [SETUP](SETUP.md) and the [report](custom-bugs-report_v53.md)/[plan](custom-bugs-fix-plan_v53.md).

## Owner guidelines

- Use substantial related batches and best recommendations. PR creation/merge is authorized; both exact-final-head **push and pull_request** CI must pass. No direct pushes to main.
- Keep five core docs and the two requested versioned trackers; rename status/handover/report/plan together. New non-core docs only if explicitly requested or essential. Keep prior versions in Git.
- Write concise beginner lists/tables with enough detail to act. SETUP uses numbered browser clicks/fields, manual whole-file SQL paste, no terminal/localhost/automatic migration instructions. Research official UI sources before changing platform guidance.
- Prefer one existing Supabase database, Upstash database and Vercel project. Shared previews share test data/configuration/quotas. `APP_ENV=simulation|testnet` is separate from Vercel Preview/Production.
- The owner means **real-money mainnet** by production. It remains unimplemented/denied. Never mark unrun custody, hosting or legal evidence approved merely to report completion.
- No broad automated test suite is authorized. Use relevant named isolated manual procedures and required checks; report actual evidence and limitations.

## Current implementation and evidence

- Repo `nero1/onyiy`, branch `feat/round-two-request-worker-hardening`. PR51 is merged; Round One74/74 implemented/local verified/merged. Round Two R2-004–006 and Round Three R3-001 fixes are uncommitted; final local release checks passed; exact-head CI/merge pending. Keep going through Phase Two and final fixes without acceptance pauses.
- Read [status](PROJECT-STATUS_v53.md) and [tracker](custom-bugs-fix-plan_v53.md). Current source fixes bounded cancellation/read deadlines, named transient worker errors and seeded public-manifest fallback. No financial schema change; machine contract remains v52.
- PR51 exact head3884e51fa1c34d384726b7e5bac01eb67b1dc9eb passed push38983188930/PR38983219042 and merged as ccd474580bfadb0905c84309e049d822aae5094b. It completed retention and incidental R2-001–003. Both financial readiness gates remain false.

## Fixtures and preservation

- Private current work `/workspace/work/round-two-v53`: body-probe, worker-probe (original failed classification), worker-fixed-r1, public-fallback-probe and readers-r1. Preserve source/failure fixtures; no reset to manufacture passing evidence.
- Prior retention evidence `/workspace/work/retention-v52`: fresh r3 installs/compaction/partition/walk, archive-r3/security-r2/runtime-r4, admin-r1/lease-r1/transfer-r2/mismatch-r1. Source cluster `/workspace/work/shared-hosting-v50/pgdata` runs TLS port55450; socket/cert beneath that work directory. Only stop that exact cluster. A restart must supply its saved port/socket/TLS paths.
- Node22 `/workspace/work/tooling/node-v22.23.3-linux-x64/bin`; PostgreSQL tools `/workspace/work/tooling/pg-tls/bin`. Local networking/listeners need network-enabled execution. Do not print keys or secret files. Generated fixture keys and signed archives remain private.
- Archive contract v2 binds column ACLs, partition bounds/indexes and composite timestamp cursors. Old99-file archives require e6f7888034afae01d0c7803965f1c17889783171. Packets without v2 require their historical code, immediately prior release922661dbfa88832069f459f42838c8352eff4f59. Never alter signed receipts/history for compatibility.
- Original `gw_v27_native_refund_isolated` remains inconsistent and untouched. Retain financial sources/failed fixtures/archives/keys. No real signer, broadcasts or hosted acceptance ran.

## Next actions

1. Finish focused Round Two procedures, review the shared-reader changes, required checks/build/bundle. Commit/push/create PR; observe both exact-final-head push and PR CI success, then merge. No direct main push.
2. Round Three R3-001 is implemented in the same batch: nativeTool uses two-second SIGTERM→SIGKILL escalation on its exact child and rejects interrupted runs even on exit0. `/workspace/work/round-three-v54/native-stop-fixed.mts` passed ignore/graceful cases; archive-r1 passed real encrypted backup/restore/verify. Preserve all original archives/keys and failed fixtures. No financial schema/format/readiness gate changed.
3. Implement PRD §32 P2.0–P2.4 in substantial checked batches: coherent staged profile settings, bootstrap/priority serving transitions, honest EN/FR copy/verified opt-in activity/statistics/receipts, atomic versioned switches and readiness records. Do not interpret missing external evidence as approved or enable mainnet to report completion.

v53
