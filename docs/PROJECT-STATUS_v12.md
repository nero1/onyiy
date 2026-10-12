# Project Status — Phase One

Updated: 12 October 2026. **33.85% complete / 66.15% remaining.** This is a weighted implementation estimate, not release permission. No milestone gate is newly declared complete.

| Milestone | Weight | Completion | Contribution | Verified evidence / remaining gate |
|---|---:|---:|---:|---|
| M0 — schema/config/runtime | 10% | 90% | 9.00% | Node 22, lockfile, clean install, typecheck/build and configuration checks pass; restricted runtime roles and RLS pass in tooling; hosted/security and remaining foundations remain. |
| M1 — GIV money/queues | 15% | 98% | 14.70% | Public-route happy path, replay/concurrency and rejected-spend protection pass in tooling; hosted/recovery/job acceptance remains. |
| M2 — identity/permissions | 15% | 15% | 2.25% | Own-row RLS and fresh staff role/status checks pass in tooling; OAuth/session/CSRF/TOTP/full status/rate-limit gates remain. |
| M3 — first testnet adapter | 15% | 0% | 0.00% | No accepted real-chain financial path. |
| M4 — responsive product | 15% | 39% | 5.85% | EN/FR review and identity flows verified; full product/offline/a11y acceptance remains. |
| M5 — admin/portability/recovery | 10% | 10% | 1.00% | Limited simulation administration; settings, priority, import/export and recovery gates remain. |
| M6 — remaining adapters | 8% | 0% | 0.00% | No additional accepted chain adapters. |
| M7 — bounded prototype release | 7% | 15% | 1.05% | Build and homepage JS budget pass; deployment, mobile measurements and provider quotas remain. |
| M8 — financial acceptance | 5% | 0% | 0.00% | Signer/alerts/caps/monitoring/restore evidence absent. |
| **Total** | **100%** | | **33.85%** | **66.15% remaining.** |

M0 rises to 90% after binding/reset/cache contract fixes; M4 to 39% for observed authentication/storage fallback behavior. Other estimates remain unchanged. No hosted/full milestone gate is accepted.

## Completed this iteration

- Scheduled-reconciliation PR #10 merged after final-head push/PR checks passed; main checks passed. Deployment remains disabled by owner choice.
- Added migration 014 and canonical Drizzle proof schema. CI proves a fresh owner-write/runtime-read binding before financial migrations, then repeats role/configuration/binding validation after seed. Stored/cloned IDs alone cannot pass; proof rows are cleaned and runtime writes denied.
- Pinned transaction-local schema search paths to canonical public relations ahead of temporary shadows. The isolated reset explicitly clears every durable work/report/scheduler/proof resource alongside financial state.
- Browser v2 snapshots consume configured public/private TTLs, enforce age during offline reads, invalidate legacy envelopes and avoid stale-owner writes. Old authentication failures purge only their request owner; current failure removes private display state while account/retry controls remain usable. Blocked storage/cache failures cannot fail a financial operation.

## Checks actually executed

- `check:all`, build, bundle/secrets, Drizzle and workflow syntax checks passed: 53 EN/FR keys, 28/28 current tables, 176.52 KiB gzip homepage. No dependencies changed.
- Fresh infrastructure binding succeeded before any application table existed. Fresh/repeated migrations 001–014, seed and restricted runtime checks passed in disposable PostgreSQL. Public 21-gift/integrity/jobs/recovery scenarios passed on final-build fresh data.
- The previously passing cloned-ID mismatch now failed the fresh challenge check with no proof residue and no financial migration. Correct target checks passed. Runtime proof writes were denied; a temporary x_manifest shadow did not replace canonical configuration.
- A newly created isolated fixture was populated with outbox/jobs/results/scheduler/proof rows. Guarded reset cleared all of them and users, then seed/binding checks passed. No shared/hosted or original failing financial database was reset.
- Chromium observations passed configured 30-second private lifetime, legacy cache invalidation, delayed old-401 isolation, overlong offline expiry, malformed current-401 purge/retry and live operation with storage blocked. The first reload fixture forced the old account again; preserving the selected account corrected the locator and the full observation passed.
- Earlier money/lineage/lease/timeout/snapshot/TLS/RLS/rank evidence remains in the handover. Hosted Supabase/Upstash/Vercel, real chains, HTTPS scheduler delivery, external alerts and load/mobile-performance acceptance remain unrun.

## Remaining defects and blockers

- The owner confirms Supabase, Upstash and Vercel are not configured and defers their testing. CI checks can run now; deployment must remain disabled. See `SETUP.md` for enabling PR previews later.
- Existing simulation authentication trusts `x-sim-user`; it is not production identity. Sessions, CSRF, staff MFA, complete account-state handling and durable rate limiting remain incomplete. RLS covers only currently implemented tables/views; future resources need their own policies. Only simulation is supported.
- M0 binding/reset/cache defects above are fixed and verified in tooling; hosted provider/security acceptance still remains. RLS/provider portability is not yet verified on Supabase. M1 still needs hosted and incoming exception/reorg/full-restore contracts. Business/digest/cleanup aggregation, external alerts, retention and long-worker heartbeat remain incomplete. Legacy slot attribution may stay unverifiable and must remain reported; larger-dataset capacity remains unmeasured.

- No live verifier, isolated signer, native-gas accounting, real withdrawal/business settlement, or accepted extra chain adapter exists. Full product/admin/recovery features remain incomplete.
- PostgreSQL-specific exceptions include transaction-local role/context and permission metadata, parameterized locks/server clock, migration DDL/policies/grants and guarded maintenance locks/TRUNCATE. Application table/view queries remain Drizzle-first. Bounded rank maintenance/read functions are an additional narrow PostgreSQL-specific exception; application queries still use Drizzle. Migration 009 rebuilds derived counters under maintenance locks.
- GitHub access works with existing authentication. Prior PRs #1–#10 are merged; this iteration must also pass its PR checks before merging. Hosted credentials remain deferred by the owner.

## Exact next development pass

1. Finish this iteration's verified PR/merge, then continue unresolved M0/M1 incoming simulation exception/reorg and isolated restore/provider contracts. Preserve immutable financial/work history and retained failure evidence; never invent attribution or real-chain nonbroadcast proof.
2. Complete remaining bounded maintenance/retention and cache-budget contracts where needed; retain pending obligations. Use named manual acceptance and reconciliation. Hosted tests remain owner-deferred, so dependent gates cannot be claimed complete.

3. M2 identity/security and later real testnet adapters follow their prerequisite gates. No real signer, native gas, external alert or live provider acceptance exists yet.
4. When owner settings arrive, follow SETUP.md for hosted validation. The owner asks for continued iterations and best-recommendation decisions without routine questions, not fabricated credentials/results.

Each verified iteration updates this table and the self-contained prompt, advances both filenames and gets a merged PR. A stopped/usage-limited session requires a future session to resume; automatic resumption is not promised.

v12
