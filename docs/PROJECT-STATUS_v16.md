# Project Status — Phase One

Updated: 12 October 2026. **34.75% complete / 65.25% remaining.** This is a weighted implementation estimate, not release permission. No milestone gate is newly declared complete.

| Milestone | Weight | Completion | Contribution | Verified evidence / remaining gate |
|---|---:|---:|---:|---|
| M0 — schema/config/runtime | 10% | 90% | 9.00% | Node 22, lockfile, clean install, typecheck/build and configuration checks pass; restricted runtime roles and RLS pass in tooling; hosted/security and remaining foundations remain. |
| M1 — GIV money/queues | 15% | 99% | 14.85% | Public-route happy path, replay/concurrency and rejected-spend protection pass in tooling; hosted/recovery/job acceptance remains. |
| M2 — identity/permissions | 15% | 15% | 2.25% | Own-row RLS and fresh staff role/status checks pass in tooling; OAuth/session/CSRF/TOTP/full status/rate-limit gates remain. |
| M3 — first testnet adapter | 15% | 0% | 0.00% | No accepted real-chain financial path. |
| M4 — responsive product | 15% | 42% | 6.30% | EN/FR review and identity flows verified; full product/offline/a11y acceptance remains. |
| M5 — admin/portability/recovery | 10% | 13% | 1.30% | Limited simulation administration; settings, priority, import/export and recovery gates remain. |
| M6 — remaining adapters | 8% | 0% | 0.00% | No additional accepted chain adapters. |
| M7 — bounded prototype release | 7% | 15% | 1.05% | Build and homepage JS budget pass; deployment, mobile measurements and provider quotas remain. |
| M8 — financial acceptance | 5% | 0% | 0.00% | Signer/alerts/caps/monitoring/restore evidence absent. |
| **Total** | **100%** | | **34.75%** | **65.25% remaining.** |

M5 rises to 13% for verified bounded operational retention; M0–M4 and M6–M8 remain unchanged. No full gate is accepted. Weighted total: 9 + 14.85 + 2.25 + 0 + 6.30 + 1.30 + 0 + 1.05 + 0 = 34.75.

## Completed this iteration

- Confirmed PR #14 already merged and no outstanding PR existed; continued from its actual v15 main commit.
- Signed ticks now enqueue one UTC-day operational-cleanup root. Indexed, locked pages remove at most 100 eligible nonces/completed scheduler windows per resource and preserve unfinished/other-environment records. Backlog, including skipped locks, queues permanent continuation keys for later ticks.
- Cleanup/report/continuation/fenced completion commit atomically. Immutable, capped staff-only reports record counts, holds and backlog. A validated deployment retention hold suppresses all routine pruning.
- PostgreSQL guards retain timestamp/skew windows and reject early deletion, identity rebinding and completed-window reopening. All financial/audit/report/work/delivery keys and pending/retry/running/DLQ jobs remain retained. Reset includes the new report table.
- Fixed replay of migration 013 after reproducing its narrower job-kind constraint rejecting populated maintenance rows. No durable source or financial history was erased to pass it.

## Checks actually executed

- Clean Node 22.23.3 `npm ci`, `check:all`, production build, bundle/secrets/grants/docs and scratch schema-only Drizzle generation/check passed: 63 EN/FR keys, 35/35 current tables and 177.73 KiB gzip homepage. No dependency changed.
- Fresh owner/runtime binding, migrations 001–017, seed/runtime validation and the final second-fresh public M1 → integrity → jobs → recovery → incoming → reorg plus maintenance/timeout probes passed in disposable PG17.5. Populated repeat migrations/seed/binding passed after the migration-013 compatibility fix.
- Named maintenance observations passed 250 eligible rows per resource over 100/100/50 pages; permanent continuation; one UTC root; recent/unfinished/other-environment retention; hold/malformed-hold rejection; rollback-only cleanup; skipped-lock backlog; duplicate/stale effect rejection; report immutability and member/browser privacy. Exact snapshots of financial history and selected pending/retry/running/DLQ jobs were unchanged; fresh reconciliation remained balanced, consistent and complete.
- Actual PostgreSQL statement timeout created no deletion/report. Transient retry retained job identity/attempts, rejected the old generation and committed exactly one result with the new generation.
- Initial disposable provisioning lacked pgcrypto; installing the genuine PG17.5 extension corrected setup before application acceptance. The scratch loader mismatch was corrected before probes; the migration replay failure log is retained. A separately created seeded clone with a populated maintenance report passed guarded reset (reports/jobs/users became zero), reseed and binding. No shared fixture or original retained financial evidence was reset.
- Hosted Supabase/Upstash/Vercel, real chains/signer/finality/nonbroadcast, financial archives, large-dataset capacity and full restore remain unrun. No browser UI changed in this pass; the prior EN/FR observations are historical evidence, not newly rerun acceptance.

## Remaining defects and blockers

- The owner confirms Supabase, Upstash and Vercel are not configured and defers their testing. CI checks can run now; deployment must remain disabled. See `SETUP.md` for enabling PR previews later.
- Existing simulation authentication trusts `x-sim-user`; it is not production identity. Sessions, CSRF, staff MFA, complete account-state handling and durable rate limiting remain incomplete. RLS covers only currently implemented tables/views; future resources need their own policies. Only simulation is supported.
- M0 binding/reset/cache defects above are fixed and verified in tooling; hosted provider/security acceptance still remains. RLS/provider portability is not yet verified on Supabase. M1 still needs hosted and full-restore/provider contracts. Compact browser/memory budgets and compatible Redis contracts passed; larger public/help budgets, business/digest aggregation, financial/notification/terminal-job archival, external alerts and long-worker heartbeat remain incomplete; bounded scheduler retention now passes in tooling. Legacy slot attribution may stay unverifiable and must remain reported; larger-dataset capacity remains unmeasured.

- No live verifier, isolated signer, native-gas accounting, real withdrawal/business settlement, or accepted extra chain adapter exists. Full product/admin/recovery features remain incomplete.
- PostgreSQL-specific exceptions include transaction-local role/context and permission metadata, parameterized locks/server clock, migration DDL/policies/grants and guarded maintenance locks/TRUNCATE. Application table/view queries remain Drizzle-first. Bounded rank maintenance/read functions are an additional narrow PostgreSQL-specific exception; application queries still use Drizzle. Migration 009 rebuilds derived counters under maintenance locks.
- GitHub access works with existing authentication. Prior PRs #1–#14 are merged; this iteration must pass final-head checks before merging. Hosted credentials remain deferred by the owner.

## Exact next development pass

1. Finish this iteration's verified PR/merge, then continue unresolved M0/M1 isolated restore/provider contracts and safe maintenance. Preserve immutable financial/work history and retained failure evidence; never invent attribution or real-chain nonbroadcast proof.
2. Complete isolated restore/provider and larger public/help cache contracts; further archival needs verified preservation/hold semantics; retain pending obligations. Use named manual acceptance and reconciliation. Hosted tests remain owner-deferred, so dependent gates cannot be claimed complete.

3. M2 identity/security and later real testnet adapters follow their prerequisite gates. No real signer, native gas, external alert or live provider acceptance exists yet.
4. When owner settings arrive, follow SETUP.md for hosted validation. The owner asks for continued iterations and best-recommendation decisions without routine questions, not fabricated credentials/results.

Each verified iteration updates this table and the self-contained prompt, advances both filenames and gets a merged PR. A stopped/usage-limited session requires a future session to resume; automatic resumption is not promised.

v16
