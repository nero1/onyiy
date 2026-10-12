# Project Status — Phase One

Updated: 12 October 2026. **31.05% complete / 68.95% remaining.** This is a weighted implementation estimate, not release permission. No milestone gate is newly declared complete.

| Milestone | Weight | Completion | Contribution | Verified evidence / remaining gate |
|---|---:|---:|---:|---|
| M0 — schema/config/runtime | 10% | 85% | 8.50% | Node 22, lockfile, clean install, typecheck/build and configuration checks pass; restricted runtime roles and RLS pass in tooling; hosted/security and remaining foundations remain. |
| M1 — GIV money/queues | 15% | 90% | 13.50% | Public-route happy path, replay/concurrency and rejected-spend protection pass in tooling; hosted/recovery/job acceptance remains. |
| M2 — identity/permissions | 15% | 15% | 2.25% | Own-row RLS and fresh staff role/status checks pass in tooling; OAuth/session/CSRF/TOTP/full status/rate-limit gates remain. |
| M3 — first testnet adapter | 15% | 0% | 0.00% | No accepted real-chain financial path. |
| M4 — responsive product | 15% | 35% | 5.25% | EN/FR review and identity flows verified; full product/offline/a11y acceptance remains. |
| M5 — admin/portability/recovery | 10% | 5% | 0.50% | Limited simulation administration; settings, priority, import/export and recovery gates remain. |
| M6 — remaining adapters | 8% | 0% | 0.00% | No additional accepted chain adapters. |
| M7 — bounded prototype release | 7% | 15% | 1.05% | Build and homepage JS budget pass; deployment, mobile measurements and provider quotas remain. |
| M8 — financial acceptance | 5% | 0% | 0.00% | Signer/alerts/caps/monitoring/restore evidence absent. |
| **Total** | **100%** | | **31.05%** | **68.95% remaining.** |

M1 rises from 85% to 90% for verified allocation lineage and stronger reconciliation. Other estimates remain unchanged; hosted and recovery gates are still unaccepted.

## Completed this iteration

- Queue/rank PR #6 merged after green push/PR checks; its main checks passed. Deployment remains disabled by owner choice.
- Added migration 010 and synchronized Drizzle allocation schema. Each new GIV credit has immutable source operation/cycle, payer, receiver slot/business role, beneficiary, asset/network/environment, exact amount and journal links. Deferred validation proves its incoming funding, snapshot split and destination; unique source/slot/journal constraints prevent duplicate attribution.
- Preserved legacy journals while linking only verifiable historical GIV evidence. Unknown slot sequence stays explicitly unresolved. Operation results and withdrawal quote snapshots now resist edits/deletion. UUID nonce case denotes one identity; chain hashes are untouched.
- Staff reconciliation uses a read-only repeatable-read snapshot and capped diagnostics. It distinguishes balanced journals, consistent balances/clearing/queue allocations and complete lineage.

## Checks actually executed

- `check:all`, production build, bundle/post-build secrets and Drizzle migration check passed: 48 EN/FR keys, 21/21 current tables, 175.76 KiB gzip homepage. No dependencies changed.
- Fresh/repeated migrations 001–010, seed and restricted-runtime namespace checks passed in disposable PostgreSQL. Restricted-login public 21-gift and integrity scenarios passed with complete captured lineage.
- Upper/lower-case UUID gift/admin/quote replay returned the original result; uppercase plan input and empty-queue business credit preserved exact lineage. Source-funding validation accepted a subsequent genuine gift.
- Eight receipt/operation/withdrawal tamper attempts were refused and rolled back. Duplicate receiver slot, missing source funding and wrong snapshot amount were rejected; payer/beneficiary-only reads and anonymous denial passed. Final reconciliation remained consistent with 25 captured allocations and no fixture residue.
- Existing-data backfill linked 27 verified allocations without inventing slot sequence: monetary consistency passed, complete lineage remained false. The initial deferred-FK/DDL migration failure rolled back atomically; flushing backfill constraints fixed it, and repeated migration passed.
- Reconciliation detected the retained −3,000 GIV spend-race discrepancy in a disposable copy of the failing database despite balanced journals. The original evidence stayed unchanged; no compensating repair was fabricated.
- Earlier TLS/RLS/rank/browser evidence remains valid for its tested behavior. Hosted Supabase/Upstash/Vercel, real chains and load acceptance remain unrun.

## Remaining defects and blockers

- The owner confirms Supabase, Upstash and Vercel are not configured and defers their testing. CI checks can run now; deployment must remain disabled. See `SETUP.md` for enabling PR previews later.
- Existing simulation authentication trusts `x-sim-user`; it is not production identity. Sessions, CSRF, staff MFA, complete account-state handling and durable rate limiting remain incomplete. RLS covers only currently implemented tables/views; future resources need their own policies. Only simulation is supported.
- M0 still needs hosted provider/security acceptance and remaining foundations. RLS/provider portability is verified only in tooling, not Supabase. Typed future policies are not proof their services exist. M1 still needs hosted and exception/reorg/job acceptance. The reproduced spend/replay defects are fixed; asynchronous jobs and exception/reorg/recovery remain incomplete. Legacy slot attribution may remain unverifiable; reconciliation must report it. Rank work is bounded; hosted scale/performance is unmeasured.
- No live verifier, isolated signer, native-gas accounting, real withdrawal/business settlement, or accepted extra chain adapter exists. Full product/admin/recovery features remain incomplete.
- PostgreSQL-specific exceptions include transaction-local role/context and permission metadata, parameterized locks, migration DDL/policies/grants and guarded maintenance locks/TRUNCATE. Application table/view queries remain Drizzle-first. Bounded rank maintenance/read functions are an additional narrow PostgreSQL-specific exception; application queries still use Drizzle. Migration 009 rebuilds derived counters under maintenance locks.
- GitHub access works with existing authentication. Prior PRs #1–#6 are merged; this iteration must also pass its PR checks before merging. Hosted credentials remain deferred by the owner.

## Exact next development pass

1. Finish this iteration's verified PR/merge, then implement durable transactional outbox/jobs, fencing leases, bounded retries and authenticated scheduler work. Preserve permanent operation/allocation history and report legacy uncertainty.
2. Continue remaining M0/M1 durable outbox/jobs and recovery work with named manual acceptance and reconciliation. Do not claim gates passed while hosted acceptance remains deferred.
3. M2 identity/security and later real testnet adapters follow their prerequisite gates. No real signer, native gas, external alert or live provider acceptance exists yet.
4. When owner settings arrive, follow SETUP.md for hosted validation. The owner asks for continued iterations and best-recommendation decisions without routine questions, not fabricated credentials/results.

Each verified iteration updates this table and the self-contained prompt, advances both filenames and gets a merged PR. A stopped/usage-limited session requires a future session to resume; automatic resumption is not promised.

v8
