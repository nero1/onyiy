# Project Status — Phase One

Updated: 12 October 2026. **31.80% complete / 68.20% remaining.** This is a weighted implementation estimate, not release permission. No milestone gate is newly declared complete.

| Milestone | Weight | Completion | Contribution | Verified evidence / remaining gate |
|---|---:|---:|---:|---|
| M0 — schema/config/runtime | 10% | 85% | 8.50% | Node 22, lockfile, clean install, typecheck/build and configuration checks pass; restricted runtime roles and RLS pass in tooling; hosted/security and remaining foundations remain. |
| M1 — GIV money/queues | 15% | 95% | 14.25% | Public-route happy path, replay/concurrency and rejected-spend protection pass in tooling; hosted/recovery/job acceptance remains. |
| M2 — identity/permissions | 15% | 15% | 2.25% | Own-row RLS and fresh staff role/status checks pass in tooling; OAuth/session/CSRF/TOTP/full status/rate-limit gates remain. |
| M3 — first testnet adapter | 15% | 0% | 0.00% | No accepted real-chain financial path. |
| M4 — responsive product | 15% | 35% | 5.25% | EN/FR review and identity flows verified; full product/offline/a11y acceptance remains. |
| M5 — admin/portability/recovery | 10% | 5% | 0.50% | Limited simulation administration; settings, priority, import/export and recovery gates remain. |
| M6 — remaining adapters | 8% | 0% | 0.00% | No additional accepted chain adapters. |
| M7 — bounded prototype release | 7% | 15% | 1.05% | Build and homepage JS budget pass; deployment, mobile measurements and provider quotas remain. |
| M8 — financial acceptance | 5% | 0% | 0.00% | Signer/alerts/caps/monitoring/restore evidence absent. |
| **Total** | **100%** | | **31.80%** | **68.20% remaining.** |

M1 rises from 90% to 95% for executed durable notification/recovery scenarios. Other estimates stay unchanged. No hosted or full milestone gate is claimed.

## Completed this iteration

- Allocation-lineage PR #7 merged after final-head push/PR checks passed; main checks passed. CI remains credential-free and deployment skipped.
- Added migration 011 and Drizzle outbox/jobs/scheduler schema. Gifts and GIV withdrawals commit bounded notification work with financial state. Dispatch/claims use PostgreSQL locks, due times, tokens and monotonic generations; notification effect and completion are atomic and permanently deduplicated.
- Added transient backoff/jitter, expired-lease recovery, dead-letter status and audited, idempotent staff replay preserving identity/attempts. Invalid payloads cannot be replayed unchanged; immutable source/payload guards protect work.
- Added signed non-signing tick with bounded payload/batches/runtime, database nonce replay protection and five-minute run leases. Current/previous keys permit rotation. Staff diagnostics omit payloads/tokens. Notifications may wait while scheduling is disabled.
- Added opt-in GitHub scheduler and secure setup/rotation instructions. No signer, financial sends, daily aggregation or long-running worker is implemented by this notification path. Cloud startup draft now includes restricted-login/namespace instructions; saving is not publication or snapshot validation.

## Checks actually executed

- `check:all`, production build, bundle/post-build secret scan and Drizzle check passed: 48 EN/FR keys, 25/25 current tables, 175.76 KiB gzip homepage. Workflow syntax/actionlint and scheduler script syntax passed; no dependencies changed.
- Fresh, repeated and existing-data migrations 001–011, seed and restricted-runtime namespace verification passed in disposable PostgreSQL. Final-build 21-gift/integrity/jobs scenarios passed with captured lineage and delivered own notifications.
- Signed current/previous-key requests, body/environment/timestamp/nonce rejection, duplicate scheduler windows, staff-only diagnostics and reconciliation passed. Hosting and the HTTPS GitHub scheduler delivery itself remain unrun.
- Manual disposable recovery probes passed outbox rollback, duplicate claims, stale token/generation rejection, takeover, one-effect completion, transient backoff, permanent invalid-payload dead letters and explicit replay without resetting cumulative attempts. The first anonymous-read locator expected zero rows; access was denied outright, and the corrected permission assertion passed.
- Final-source replay authorization, body/path/nonce binding and malformed-job refusal passed. Missing scheduler keys returned 503 without consuming a nonce.
- Real PostgreSQL notification-table lock contention timed out and rolled back within the bounded budget; retry/backoff and subsequent one-effect recovery passed. Payload rebinding, outbox edits, mismatched job sources and stale scheduler fences were rejected. No financial history was rewritten.
- Earlier allocation/negative-balance, TLS/RLS/rank/browser evidence remains recorded in the handover. Hosted Supabase/Upstash/Vercel, real chains, external alerts and load acceptance remain unrun.

## Remaining defects and blockers

- The owner confirms Supabase, Upstash and Vercel are not configured and defers their testing. CI checks can run now; deployment must remain disabled. See `SETUP.md` for enabling PR previews later.
- Existing simulation authentication trusts `x-sim-user`; it is not production identity. Sessions, CSRF, staff MFA, complete account-state handling and durable rate limiting remain incomplete. RLS covers only currently implemented tables/views; future resources need their own policies. Only simulation is supported.
- M0 still needs hosted provider/security acceptance and remaining foundations. RLS/provider portability is verified only in tooling, not Supabase. Typed future policies are not proof their services exist. M1 still needs hosted and financial exception/reorg/job acceptance. The reproduced spend/replay defects are fixed; notification jobs are verified in tooling, while financial exception/reorg/recovery, daily aggregation, alerts and long-worker heartbeat/retention remain incomplete. Legacy slot attribution may remain unverifiable; reconciliation must report it. Rank work is bounded; hosted scale/performance is unmeasured.
- No live verifier, isolated signer, native-gas accounting, real withdrawal/business settlement, or accepted extra chain adapter exists. Full product/admin/recovery features remain incomplete.
- PostgreSQL-specific exceptions include transaction-local role/context and permission metadata, parameterized locks/server clock, migration DDL/policies/grants and guarded maintenance locks/TRUNCATE. Application table/view queries remain Drizzle-first. Bounded rank maintenance/read functions are an additional narrow PostgreSQL-specific exception; application queries still use Drizzle. Migration 009 rebuilds derived counters under maintenance locks.
- GitHub access works with existing authentication. Prior PRs #1–#7 are merged; this iteration must also pass its PR checks before merging. Hosted credentials remain deferred by the owner.

## Exact next development pass

1. Finish this iteration's verified PR/merge, then address remaining M0/M1 GIV exception/recovery and bounded scheduled reconciliation. Preserve permanent operation/allocation/work history and report legacy uncertainty; never adapt notification jobs into a signer.
2. Verify cancellation/compensating-entry scenarios, interrupted work and recovery using named manual acceptance and reconciliation. Do not claim gates passed while hosted acceptance remains deferred.
3. M2 identity/security and later real testnet adapters follow their prerequisite gates. No real signer, native gas, external alert or live provider acceptance exists yet.
4. When owner settings arrive, follow SETUP.md for hosted validation. The owner asks for continued iterations and best-recommendation decisions without routine questions, not fabricated credentials/results.

Each verified iteration updates this table and the self-contained prompt, advances both filenames and gets a merged PR. A stopped/usage-limited session requires a future session to resume; automatic resumption is not promised.

v9
