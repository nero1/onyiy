# LLM handover v52

Updated: **16 October 2026 at 09:42:48 PM WAT**.

## Authorization and order

The owner explicitly resumed application work through completed Phase Two and final bugs. **Keep going without milestone-acceptance pauses.** Finish P1-028, then fresh bug-finding/fixing Rounds Two/Three, PRD §32 P2.0–P2.4 and final defects. P1-009 is implemented/locally verified and PR50 is merged. Continue the current retention batch without stopping.

Read `AGENTS.md`, [PRD](PRD.md) §§27/30/32/33, [status](PROJECT-STATUS_v52.md), [HOW-IT-WORKS](HOW-IT-WORKS.md), [SETUP](SETUP.md) and the [report](custom-bugs-report_v52.md)/[plan](custom-bugs-fix-plan_v52.md).

## Owner guidelines

- Use substantial related batches and best recommendations. PR creation/merge is authorized; both exact-final-head **push and pull_request** CI must pass. No direct pushes to main.
- Keep five core docs and the two requested versioned trackers; rename status/handover/report/plan together. New non-core docs only if explicitly requested or essential. Keep prior versions in Git.
- Write concise beginner lists/tables with enough detail to act. SETUP uses numbered browser clicks/fields, manual whole-file SQL paste, no terminal/localhost/automatic migration instructions. Research official UI sources before changing platform guidance.
- Prefer one existing Supabase database, Upstash database and Vercel project. Shared previews share test data/configuration/quotas. `APP_ENV=simulation|testnet` is separate from Vercel Preview/Production.
- The owner means **real-money mainnet** by production. It remains unimplemented/denied. Never mark unrun custody, hosting or legal evidence approved merely to report completion.
- No broad automated test suite is authorized. Use relevant named isolated manual procedures and required checks; report actual evidence and limitations.

## Current implementation and evidence

- Repo `nero1/onyiy`, branch `feat/retention-archive-integrity`. Round One 74/74 implemented/local verified; release checks and merge pending. Rounds Two/Three and Phase Two remain ahead. Do not stop after this merge.
- Read [status](PROJECT-STATUS_v52.md) for the exact current behavior/evidence and [trackers](custom-bugs-fix-plan_v52.md) for retained acceptance conditions. Schema contract v52: 95 logical tables/874 columns/288 checks/114 standalone indexes.
- `000`/`001` stay unchanged; new standalone forward `002`/`003` must be pasted manually in order. Preserve installed receipts. `migrationSource` hashes bytes **before** the newline preceding the receipt marker; use it to validate generated footers.
- Retention compacts expendable payloads, keeps permanent keys, freezes online monthly financial/audit partitions and verifies two bounded checksum passes. Financial history is never automatically deleted. Archives still consume the same database quota.
- Recovery signed contract v2 includes column ACLs, partition metadata and partition-root indexes. A raw Date parameter in composite recovery cursors was fixed by explicit ISO serialization. Current encrypted backup/restore/verify passed.
- P1-009 historical treasury inventory/common-cutoff custody fences remain intact. Both financial readiness gates remain false. No mainnet activation, signing, broadcasting or actual hosted acceptance occurred.

## Working fixtures and preservation

- Private work `/workspace/work/retention-v52`: fresh `prepare-r3`, `ephemeral-r3`, `partition-install-r3`, `archive-walk-r3`, `archive-r3`, `security-r2`, `runtime-r4` procedures. Failed earlier fixtures are retained separately.
- PostgreSQL source cluster `/workspace/work/shared-hosting-v50/pgdata`, TLS port55450, socket beneath that work directory. Node22 tools `/workspace/work/tooling/node-v22.23.3-linux-x64/bin`; PostgreSQL tools `/workspace/work/tooling/pg-tls/bin`. Only stop that exact owned cluster. A restart must supply saved port/socket/TLS paths; never bare pg_ctl start.
- Current archive `monthly-retention-v52-r3.gwbackup` and generated fixture key remain private. Do not print secret values. Original sources, signed bytes, failed fixtures and the inconsistent `gw_v27_native_refund_isolated` remain untouched.
- Old99-file archives require `e6f7888034afae01d0c7803965f1c17889783171`. Packets without schema-contract v2 require their exact historical code; the immediate prior release is PR50 merge `922661dbfa88832069f459f42838c8352eff4f59`. Never rewrite/re-sign history to force compatibility.

## Next actions

1. Focused lease/cursor/default-partition transfer/mismatch checks and required checks/build/bundle passed. The full generated model proof is `model-r4.mts` plus `model-proof.py`; never update hashes without catalog verification.
2. Commit/push, create a PR, observe both exact-head push and pull-request CI success, then merge. Update release evidence in the next version; no direct main push.
3. R2-003 is now fixed: failure recording respects the at-most-two-second admission cooldown once, then checks execution budget and job/run leases again. The fresh runtime-r4 fixture called failJob immediately after a real timeout and passed. Preserve lease recovery if budget is insufficient.
4. Perform fresh Round Two and Three reviews/fixes, then all PRD §32 milestones and final bugs. Keep missing hosted/mainnet/external evidence explicit; transparent copy cannot make an unfinished financial implementation ready.

v52
