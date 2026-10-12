# Project Status — Phase One

Updated: 12 October 2026. **32.70% complete / 67.30% remaining.** This is a weighted implementation estimate, not release permission. No milestone gate is newly declared complete.

| Milestone | Weight | Completion | Contribution | Verified evidence / remaining gate |
|---|---:|---:|---:|---|
| M0 — schema/config/runtime | 10% | 80% | 8.00% | Node 22, lockfile, clean install, typecheck/build and configuration checks pass; restricted runtime roles and RLS pass in tooling; hosted/security and remaining foundations remain. |
| M1 — GIV money/queues | 15% | 98% | 14.70% | Public-route happy path, replay/concurrency and rejected-spend protection pass in tooling; hosted/recovery/job acceptance remains. |
| M2 — identity/permissions | 15% | 15% | 2.25% | Own-row RLS and fresh staff role/status checks pass in tooling; OAuth/session/CSRF/TOTP/full status/rate-limit gates remain. |
| M3 — first testnet adapter | 15% | 0% | 0.00% | No accepted real-chain financial path. |
| M4 — responsive product | 15% | 38% | 5.70% | EN/FR review and identity flows verified; full product/offline/a11y acceptance remains. |
| M5 — admin/portability/recovery | 10% | 10% | 1.00% | Limited simulation administration; settings, priority, import/export and recovery gates remain. |
| M6 — remaining adapters | 8% | 0% | 0.00% | No additional accepted chain adapters. |
| M7 — bounded prototype release | 7% | 15% | 1.05% | Build and homepage JS budget pass; deployment, mobile measurements and provider quotas remain. |
| M8 — financial acceptance | 5% | 0% | 0.00% | Signer/alerts/caps/monitoring/restore evidence absent. |
| **Total** | **100%** | | **32.70%** | **67.30% remaining.** |

M1 rises to 98%, M4 to 38% and M5 to 10% for executed daily diagnostics and corrected review UI. M0 falls to 80% after reproducing binding/reset defects. Net progress remains **32.70%**; no hosted/full milestone gate is accepted.

## Completed this iteration

- GIV recovery PR #9 merged after final-head push/PR checks passed; main checks passed. Deployment remains disabled.
- Added migration 013/Drizzle immutable reconciliation results. Signed ticks queue one UTC-day job; repeatable-read diagnostics and fenced job completion commit together. History summaries are capped; selected details are staff-only.
- Reconciliation has a shared eight-second budget with one-second statement ceilings. Timeout produces an explicit retryable failure and no false success result. Discrepancies are retained without automatic repair or financial-history changes.
- Admin success now requires balance, consistency and complete lineage. EN/FR error/timeout review is handled; a reproduced mobile notice overlap was fixed with a measured header offset, preserving access to language controls.

## Checks actually executed

- `check:all`, production build, bundle/secret and Drizzle checks passed: 53 EN/FR keys, 27/27 current tables, 176.12 KiB gzip homepage. No dependencies changed.
- Fresh/repeated migrations 001–013, seed and restricted-runtime checks passed in disposable PostgreSQL. Public 21-gift/integrity/jobs/recovery scenarios passed, including one durable daily result and staff report denial for members.
- Real ledger-table lock timeout produced no report, entered backoff and recovered into one immutable result; stale fencing, zero-budget failure and anonymous denial passed. A repeatable-read diagnostic stayed coherent while an independent gift committed; the later count advanced outside its snapshot.
- Scheduled diagnostics recorded balanced journals but a negative-balance discrepancy in the retained disposable copy. Original failing evidence stayed untouched, with no fabricated repair.
- Chromium mobile observations passed live success and EN/FR review for inconsistent/timeout responses without unhandled errors after fixing the notice that blocked the language button. Injected UI responses were presentation checks, not financial acceptance evidence.
- Two additional M0 contracts failed as reproduced: different databases with a copied namespace ID incorrectly passed `db:check:runtime`; a reset of a newly created isolated fixture removed users but retained its outbox row. Neither test touched a shared/hosted database. The next pass must fix these before hosted enablement.
- Hosted providers, real chains, HTTPS scheduler delivery, external alerts and load/mobile-performance acceptance remain unrun.

## Remaining defects and blockers

- The owner confirms Supabase, Upstash and Vercel are not configured and defers their testing. CI checks can run now; deployment must remain disabled. See `SETUP.md` for enabling PR previews later.
- Existing simulation authentication trusts `x-sim-user`; it is not production identity. Sessions, CSRF, staff MFA, complete account-state handling and durable rate limiting remain incomplete. RLS covers only currently implemented tables/views; future resources need their own policies. Only simulation is supported.
- M0 has confirmed clone-ID binding and reset-work cleanup defects; browser private-snapshot TTL is also hardcoded to 30 minutes instead of consuming its configured policy (verify/fix next). M0 still needs hosted provider/security acceptance. RLS/provider portability is verified only in tooling, not Supabase. Typed future policies are not proof their services exist. M1 still needs hosted and financial exception/reorg/job acceptance. The reproduced spend/replay defects are fixed; notification jobs are verified in tooling, while incoming exception/reorg and full restore recovery, business/digest/cleanup aggregation, alerts and long-worker heartbeat/retention remain incomplete. Legacy slot attribution may remain unverifiable; reconciliation must report it. Rank work is bounded; hosted scale/performance is unmeasured.
- No live verifier, isolated signer, native-gas accounting, real withdrawal/business settlement, or accepted extra chain adapter exists. Full product/admin/recovery features remain incomplete.
- PostgreSQL-specific exceptions include transaction-local role/context and permission metadata, parameterized locks/server clock, migration DDL/policies/grants and guarded maintenance locks/TRUNCATE. Application table/view queries remain Drizzle-first. Bounded rank maintenance/read functions are an additional narrow PostgreSQL-specific exception; application queries still use Drizzle. Migration 009 rebuilds derived counters under maintenance locks.
- GitHub access works with existing authentication. Prior PRs #1–#9 are merged; this iteration must also pass its PR checks before merging. Hosted credentials remain deferred by the owner.

## Exact next development pass

1. Finish this iteration's verified PR/merge, then fix M0 binding with a fresh owner-written/runtime-read challenge and clear all durable work/scheduler/reports during authorized isolated resets. Re-run cloned-ID and reset contracts; never touch original failing financial evidence. Preserve permanent operation/allocation/work history and report legacy uncertainty; never adapt notification jobs into a signer.
2. Verify/fix configured browser cache TTLs and stale authentication-response scope clearing, then continue unresolved M0/M1 incoming exception/reorg and restore scenarios using named manual acceptance. GIV unsent-withdrawal recovery is verified; real-chain ambiguity remains later work. Do not claim gates passed while hosted acceptance remains deferred.
3. M2 identity/security and later real testnet adapters follow their prerequisite gates. No real signer, native gas, external alert or live provider acceptance exists yet.
4. When owner settings arrive, follow SETUP.md for hosted validation. The owner asks for continued iterations and best-recommendation decisions without routine questions, not fabricated credentials/results.

Each verified iteration updates this table and the self-contained prompt, advances both filenames and gets a merged PR. A stopped/usage-limited session requires a future session to resume; automatic resumption is not promised.

v11
