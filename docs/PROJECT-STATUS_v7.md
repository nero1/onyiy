# Project Status — Phase One

Updated: 12 October 2026. **30.30% complete / 69.70% remaining.** This is a weighted implementation estimate, not release permission. No milestone gate is newly declared complete.

| Milestone | Weight | Completion | Contribution | Verified evidence / remaining gate |
|---|---:|---:|---:|---|
| M0 — schema/config/runtime | 10% | 85% | 8.50% | Node 22, lockfile, clean install, typecheck/build and configuration checks pass; restricted runtime roles and RLS pass in tooling; hosted/security and remaining foundations remain. |
| M1 — GIV money/queues | 15% | 85% | 12.75% | Public-route happy path, replay/concurrency and rejected-spend protection pass in tooling; hosted/recovery/job acceptance remains. |
| M2 — identity/permissions | 15% | 15% | 2.25% | Own-row RLS and fresh staff role/status checks pass in tooling; OAuth/session/CSRF/TOTP/full status/rate-limit gates remain. |
| M3 — first testnet adapter | 15% | 0% | 0.00% | No accepted real-chain financial path. |
| M4 — responsive product | 15% | 35% | 5.25% | EN/FR review and identity flows verified; full product/offline/a11y acceptance remains. |
| M5 — admin/portability/recovery | 10% | 5% | 0.50% | Limited simulation administration; settings, priority, import/export and recovery gates remain. |
| M6 — remaining adapters | 8% | 0% | 0.00% | No additional accepted chain adapters. |
| M7 — bounded prototype release | 7% | 15% | 1.05% | Build and homepage JS budget pass; deployment, mobile measurements and provider quotas remain. |
| M8 — financial acceptance | 5% | 0% | 0.00% | Signer/alerts/caps/monitoring/restore evidence absent. |
| **Total** | **100%** | | **30.30%** | **69.70% remaining.** |

M1 rises from 80% to 85% for bounded rank/admission behavior and verified priority separation. Other estimates remain unchanged; no complete milestone/hosted gate is claimed.

## Completed this iteration

- Verified and merged restricted database/RLS PR #5 after push/PR checks passed; its main run also passed. Deployment remains disabled.
- Added sparse display/FIFO/priority Fenwick counters over the fixed 40-bit ticket space. Partition-locked PostgreSQL triggers maintain at most 41 nodes per affected lane in the money transaction; rank reads perform bounded indexed lookups for known entries.
- Immutable admission/history and monotonic sequence guards, ticket exhaustion checks, unique cycle/priority entries and indexed serving selection protect queue rights. Priority affects serving only; disabling it restores FIFO. Completed cycles no longer show a current rank.
- Staff serving ranks use numeric DTOs. Admin queue reads honor configured page caps and version-safe partition/ticket cursors. The later priority-edit UI/API remains unimplemented; manual priority fixtures are isolated operator actions.

## Checks actually executed

- `check:all`, production build, bundle/post-build secrets passed: 48 EN/FR keys, 20/20 current Drizzle tables, 175.76 KiB gzip homepage. No dependency changes required a fresh install.
- Fresh migrations 001–009, seed and restricted-runtime namespace checks passed in disposable PostgreSQL. Existing-data and repeated migration backfills matched all waiting display ranks without changing financial history.
- The public-route 21-gift and integrity scenarios passed with counters enabled and a restricted login. Sparse tickets near 2^32/2^40 boundaries verified ranks, bounded counter growth, completion/removal and priority separation; the fixture rolled back completely.
- Public Gold fixtures verified a priority recipient got the next allocation while ticket/display rank remained unchanged; disabling priority restored FIFO selection/rank. Journals remained balanced. Initial inspection compared a PostgreSQL bigint string with an API number incorrectly; corrected the locator and explicit staff-rank numeric decoding, then passed.
- Anonymous rank/internal-prefix access and ticket/history/sequence rewrites were refused. Latest-build checks passed numeric staff ranks, capped/cursor pagination, member denial, completed-rank removal and ticket-exhaustion pause preserving balance. Final source-handler inspection confirmed own active/completed rank DTO behavior after the point-lookup change.
- Earlier TLS/health/RLS/concurrency evidence remains recorded in the implementation handoff. Hosted Supabase/Upstash/Vercel and real chains remain unrun; sparse tickets are algorithm evidence, not million-user/load acceptance.

## Remaining defects and blockers

- The owner confirms Supabase, Upstash and Vercel are not configured and defers their testing. CI checks can run now; deployment must remain disabled. See `SETUP.md` for enabling PR previews later.
- Existing simulation authentication trusts `x-sim-user`; it is not production identity. Sessions, CSRF, staff MFA, complete account-state handling and durable rate limiting remain incomplete. RLS covers only currently implemented tables/views; future resources need their own policies. Only simulation is supported.
- M0 still needs hosted provider/security acceptance and remaining foundations. RLS/provider portability is verified only in tooling, not Supabase. Typed future policies are not proof their services exist. M1 still needs hosted and exception/reorg/job acceptance. The reproduced spend/replay defects are fixed; asynchronous jobs, immutable receipt-allocation lineage and reorg/recovery remain incomplete. Rank work is bounded; hosted scale/performance is unmeasured.
- No live verifier, isolated signer, native-gas accounting, real withdrawal/business settlement, or accepted extra chain adapter exists. Full product/admin/recovery features remain incomplete.
- PostgreSQL-specific exceptions include transaction-local role/context and permission metadata, parameterized locks, migration DDL/policies/grants and guarded maintenance locks/TRUNCATE. Application table/view queries remain Drizzle-first. Bounded rank maintenance/read functions are an additional narrow PostgreSQL-specific exception; application queries still use Drizzle. Migration 009 rebuilds derived counters under maintenance locks.
- GitHub access works with existing authentication. Prior PRs #1–#5 are merged; this iteration must also pass its PR checks before merging. Hosted credentials remain deferred by the owner.

## Exact next development pass

1. Finish this iteration's verified PR/merge, then add immutable receipt-allocation lineage with unique receiver-slot/source-operation constraints and matching reconciliation. Backfill only verifiable historical GIV evidence; never rewrite journals or invent missing lineage.
2. Continue remaining M0/M1 durable outbox/jobs and recovery work with named manual acceptance and reconciliation. Do not claim gates passed while hosted acceptance remains deferred.
3. M2 identity/security and later real testnet adapters follow their prerequisite gates. No real signer, native gas, external alert or live provider acceptance exists yet.
4. When owner settings arrive, follow SETUP.md for hosted validation. The owner asks for continued iterations and best-recommendation decisions without routine questions, not fabricated credentials/results.

Each verified iteration updates this table and the self-contained prompt, advances both filenames and gets a merged PR. A stopped/usage-limited session requires a future session to resume; automatic resumption is not promised.

v7
