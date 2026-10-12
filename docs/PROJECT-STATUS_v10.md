# Project Status — Phase One

Updated: 12 October 2026. **32.70% complete / 67.30% remaining.** This is a weighted implementation estimate, not release permission. No milestone gate is newly declared complete.

| Milestone | Weight | Completion | Contribution | Verified evidence / remaining gate |
|---|---:|---:|---:|---|
| M0 — schema/config/runtime | 10% | 85% | 8.50% | Node 22, lockfile, clean install, typecheck/build and configuration checks pass; restricted runtime roles and RLS pass in tooling; hosted/security and remaining foundations remain. |
| M1 — GIV money/queues | 15% | 97% | 14.55% | Public-route happy path, replay/concurrency and rejected-spend protection pass in tooling; hosted/recovery/job acceptance remains. |
| M2 — identity/permissions | 15% | 15% | 2.25% | Own-row RLS and fresh staff role/status checks pass in tooling; OAuth/session/CSRF/TOTP/full status/rate-limit gates remain. |
| M3 — first testnet adapter | 15% | 0% | 0.00% | No accepted real-chain financial path. |
| M4 — responsive product | 15% | 37% | 5.55% | EN/FR review and identity flows verified; full product/offline/a11y acceptance remains. |
| M5 — admin/portability/recovery | 10% | 8% | 0.80% | Limited simulation administration; settings, priority, import/export and recovery gates remain. |
| M6 — remaining adapters | 8% | 0% | 0.00% | No additional accepted chain adapters. |
| M7 — bounded prototype release | 7% | 15% | 1.05% | Build and homepage JS budget pass; deployment, mobile measurements and provider quotas remain. |
| M8 — financial acceptance | 5% | 0% | 0.00% | Signer/alerts/caps/monitoring/restore evidence absent. |
| **Total** | **100%** | | **32.70%** | **67.30% remaining.** |

M1 rises to 97% for executed GIV cancellation/recovery; M4 to 37% for observed EN/FR held-withdrawal controls; M5 to 8% for audited simulation exception resolution. Other estimates remain unchanged. No hosted/full milestone gate is accepted.

## Completed this iteration

- Durable-jobs PR #8 merged after final-head push/PR checks passed; main checks passed. A manually dispatched scheduler run correctly skipped without enablement/settings.
- Added migration 012, synchronized Drizzle controls and exact deferred GIV withdrawal-state/journal guards. Staff can immutably configure rejected/delayed quotes before confirmation. Rejection releases the hold through balanced append-only postings; delayed confirmations preserve funds until explicit cancellation/settlement.
- Member quote/unsent-hold cancellation and audited staff GIV resolution are idempotent. Sorted user locks precede withdrawal locks; terminal states cannot reopen. Fresh staff checks permit reviewed recovery of restricted-account liabilities without allowing new member spending.
- Added held-liability reconciliation and capped own pending-withdrawal DTOs. EN/FR cancellation controls omit destination data, clear across identities/offline snapshots and never persist pending work in browser storage. The normal GIV immediate-settlement path remains available.
- No live nonbroadcast inference, signer, fee/gas refund or reorg capability is claimed by these simulation controls. The conservative daily GIV budget still counts original hold journals through the UTC day.

## Checks actually executed

- `check:all`, production build, bundle/secret scans and Drizzle check passed: 51 EN/FR keys, 26/26 current tables, 175.89 KiB gzip homepage. No dependencies changed.
- Fresh/repeated migrations 001–012, seeds and restricted-runtime namespace checks passed in disposable PostgreSQL. Final-build 21-gift/integrity/jobs/recovery scenarios passed, including quote cancellation, rejected releases, delayed reservation, concurrent confirm/cancel, replayed staff resolution and held-liability reconciliation.
- Deferred status/amount/wrong-destination settlement proofs and immutable controls were rejected. A balanced rollback-only orphan hold was detected by reconciliation. Banned-account liability recovery and crossed staff resolution passed without deadlock or financial-history edits; temporary fixture roles/status were restored.
- Chromium mobile-viewport observations passed EN/FR controls, offline action prevention, cancellation restoring the exact balance, cache exclusion and identity clearing without rendering errors. This is not full mobile performance/a11y acceptance.
- Inspection corrections: JSONB property order is not result inequality; offline snapshot fallback hides pending controls; a raw postgres-js transaction cannot directly initialize Drizzle. Corrected these manual locators/adapters, closed only their known holds through cancellation and reran successfully. No reset or history rewrite was used.
- Earlier negative-balance/lineage, lease/timeout, TLS/RLS/rank evidence remains in the handover. Hosted providers, real chains, external alerts, HTTPS scheduler delivery and load acceptance remain unrun.

## Remaining defects and blockers

- The owner confirms Supabase, Upstash and Vercel are not configured and defers their testing. CI checks can run now; deployment must remain disabled. See `SETUP.md` for enabling PR previews later.
- Existing simulation authentication trusts `x-sim-user`; it is not production identity. Sessions, CSRF, staff MFA, complete account-state handling and durable rate limiting remain incomplete. RLS covers only currently implemented tables/views; future resources need their own policies. Only simulation is supported.
- M0 still needs hosted provider/security acceptance and remaining foundations. RLS/provider portability is verified only in tooling, not Supabase. Typed future policies are not proof their services exist. M1 still needs hosted and financial exception/reorg/job acceptance. The reproduced spend/replay defects are fixed; notification jobs are verified in tooling, while incoming exception/reorg and full restore recovery, daily aggregation, alerts and long-worker heartbeat/retention remain incomplete. Legacy slot attribution may remain unverifiable; reconciliation must report it. Rank work is bounded; hosted scale/performance is unmeasured.
- No live verifier, isolated signer, native-gas accounting, real withdrawal/business settlement, or accepted extra chain adapter exists. Full product/admin/recovery features remain incomplete.
- PostgreSQL-specific exceptions include transaction-local role/context and permission metadata, parameterized locks/server clock, migration DDL/policies/grants and guarded maintenance locks/TRUNCATE. Application table/view queries remain Drizzle-first. Bounded rank maintenance/read functions are an additional narrow PostgreSQL-specific exception; application queries still use Drizzle. Migration 009 rebuilds derived counters under maintenance locks.
- GitHub access works with existing authentication. Prior PRs #1–#8 are merged; this iteration must also pass its PR checks before merging. Hosted credentials remain deferred by the owner.

## Exact next development pass

1. Finish this iteration's verified PR/merge, then add bounded scheduled reconciliation with durable results and honest timeout/failure reporting. Preserve permanent operation/allocation/work history and report legacy uncertainty; never adapt notification jobs into a signer.
2. Continue unresolved M0/M1 incoming exception/reorg and restore scenarios using named manual acceptance and reconciliation. GIV unsent-withdrawal recovery is verified; real-chain ambiguity remains later work. Do not claim gates passed while hosted acceptance remains deferred.
3. M2 identity/security and later real testnet adapters follow their prerequisite gates. No real signer, native gas, external alert or live provider acceptance exists yet.
4. When owner settings arrive, follow SETUP.md for hosted validation. The owner asks for continued iterations and best-recommendation decisions without routine questions, not fabricated credentials/results.

Each verified iteration updates this table and the self-contained prompt, advances both filenames and gets a merged PR. A stopped/usage-limited session requires a future session to resume; automatic resumption is not promised.

v10
