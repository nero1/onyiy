# Project status v49

Updated: **16 October 2026 at 12:18:29 PM WAT**.

## Current decision

**Documentation work only; halt after its verified PR merge.** P1-009/P1-028, additional bug rounds and Phase Two remain paused until the owner resumes. This replaces all earlier “keep going” directions.

| Work | State |
|---|---|
| Phase One feature checklist | Historical M0–M8 implementation coverage; not current full acceptance |
| Round One remediation | **72/74 implemented and locally verified; 2 open** |
| P1-009 | Old receiving-address inventory/monitoring and multi-address custody reconciliation remain incomplete |
| P1-028 | Notification/job and financial/audit retention/archival remain incomplete |
| Rounds Two and Three | Not started |
| Phase Two P2.0–P2.4 | Not started |
| Hosted/live release acceptance | Incomplete; no new provider acceptance performed in this documentation pass |
| Web/signer financial gates | Both false; mainnet prohibited |

**Completion accounting:** the earlier 100% M0–M8 checklist measured feature coverage before the bug audit reopened gaps. No defensible current weighted completion percentage or percentage remaining is established. 72/74 is an item count, not weighted progress. This pass adds no implementation progress.

## Documentation changes

- Replaced the long SETUP narrative with numbered web-UI steps, exact settings, manual SQL installation and brief troubleshooting; checked official Supabase/Vercel/Upstash/GitHub/Google instructions.
- Refactored requirements, architecture, status, handover and both bug trackers using lists/tables. Removed repeated histories and obsolete instructions; retained requirements, original bug evidence, recommended fixes and acceptance checks.
- `/docs` now contains **five core guides plus two explicitly requested bug trackers**. Folded the separate initial-schema guide and approved search proposal into existing guides.
- Moved unchanged machine evidence to `packages/db/schema-contract_v48.json`; its source/migration hashes and SQL-only exception inventory remain enforced. Updated only its checker's lookup path.
- Recorded the owner's concise, beginner-friendly documentation policy in PRD §27 and handover. Older versions remain in Git history.
- No application code, SQL, worker, credential, provider account or financial gate changed.

## Merged implementation evidence

| Change | Evidence |
|---|---|
| P1-039 transactional ledger counters | [PR46](https://github.com/nero1/onyiy/pull/46), merge `e6f7888034afae01d0c7803965f1c17889783171`; exact-head push 38596587666 and PR 38596599068 succeeded |
| Single final-state fresh schema | [PR47](https://github.com/nero1/onyiy/pull/47), merge `3d53cdaab43b5bcfc77830bd498e384622ca5200`; exact-head push 38729887486 and PR 38729895504 succeeded |

PR47 replaced 99 active migrations with one atomic `000_initial_schema.sql`. Fresh direct/runner/default-grant catalogs matched **3,523 schema/security entries**, including column grants: **92 tables, 848 columns, 274 CHECKs, 105 standalone indexes**. Named checks covered checksum parity/tampering, rerun behavior, late-failure rollback, nonempty/history rejection, owner/runtime binding and restricted-runtime behavior.

The retained encrypted `initial-schema_v48-r2.gwbackup` restored exactly into inactive targets with **79 retained inventories**. Source/failed fixtures, original archives, keys and signed evidence were preserved. Final source checks/build/budget reporting passed: homepage **180.35 KiB / 200**, API **1.394 MiB / 3**, clients **0.661 MiB / 2**. These are local measurements, not hosted capacity evidence.

## Validation for this documentation pass

Passed: all local documentation links, the seven-file layout, matching v49 names, all 74 original finding/file/fix/acceptance records, unchanged machine schema-evidence bytes/hashes, and unchanged Phase Two requirements apart from formatting. Required source checks (`check:all`) passed, including types, lint, translations, configuration, schema/grants, docs, secrets and deployment validation. The docs checker retains its two existing root README/AGENTS warnings.

Merge rule: both exact-final-head push and pull-request CI must succeed. The documentation PR’s GitHub checks are the record of the final build/budget results and merge eligibility. No extra local database verification is needed for this documentation-only change.

Official documentation research verifies published menu paths; it is not a claim of signing into or configuring the owner's hosted accounts. No database migration, signing, broadcast, reset or broad deferred suite ran during this pass.

## Resume only when instructed

1. Finish **P1-009**, then **P1-028**, with relevant isolated verification and reviewed PRs.
2. Re-audit/fix Rounds Two and Three.
3. Implement PRD §32 P2.0–P2.4, then final bug fixes.
4. Record hosted/release gaps separately; never claim bug-free or financial readiness from compilation or a clean audit alone.

[Bug report](custom-bugs-report_v49.md) · [Fix plan](custom-bugs-fix-plan_v49.md) · [Next-LLM instructions](LLM-HANDOVER_v49.md).

v49
