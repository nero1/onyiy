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

M0 remains 90% and M4 remains 39%. Cache budget/provider tooling closes specific foundation defects without satisfying another full gate; all weighted contributions remain unchanged (9 + 14.70 + 2.25 + 0 + 5.85 + 1 + 0 + 1.05 + 0 = 33.85). No hosted/full milestone gate is accepted.

## Completed this iteration

- Confirmed PR #11 already merged; its final-head push/PR checks and merged-main checks succeeded. No current PR was outstanding.
- Added browser v3 compact-snapshot entry/byte budgets from public policy, malformed/expired pruning, least-recently-read eviction and oversize rejection. Account/session changes clear all old generations; legacy v1/v2 envelopes are discarded. Storage failures remain optional.
- Bounded process-memory cache entries/UTF-8 bytes with LRU eviction; concurrent increments no longer lose updates or extend windows. Redis adapters atomically increment/establish expiry using Lua and repair nonexpiring legacy keys. REST command errors fail even on HTTP 200; unknown selectors/missing selected Redis configuration fail explicitly.
- Existing immutable ledger/work/history and financial database code were unchanged. No new schema, requirement, dependency or hosted deployment was introduced.

## Checks actually executed

- Clean `npm ci` ran with Node 22.23.3. Production build and bundle passed (176.99 KiB gzip; 53 EN/FR keys and 28/28 current tables remain). `check:all` passed typecheck, lint, manifest, Drizzle coverage, migration grants, docs, source/client secrets and credential-free deployment validation. Schema-only `db:check` passed with a nonconnecting loopback URL; no DB acceptance is inferred.
- Named isolated Chromium observations passed entry LRU, combined byte limit, oversized-write preservation, session-generation cleanup/stale-generation write rejection, stale-owner 401 cleanup isolation, expiry, legacy/malformed pruning, unrelated-storage preservation, quota failure and blocked storage.
- Disposable Redis 7.2.6 plus an isolated local REST bridge passed JSON set/get/delete, 200 simultaneous increments per adapter, fixed expiry without extension, legacy missing-expiry repair and expiry. Memory simultaneous increments, byte/entry LRU, oversized writes and invalid TTL/config passed. REST HTTP-200 command errors and ioredis outage rejected explicitly. These prove compatible tooling contracts, not hosted Upstash or provider billing.
- Initial check execution hit sandbox-denied tsx IPC; permitted execution passed those checks. Third-party disposable Redis source inside the repository tripped the secret heuristic; tooling was moved outside the repository, without weakening the scanner. An initial scratch observation used CommonJS with top-level await; ESM corrected the tooling launch. Initial Drizzle Kit check required configuration; schema-only validation passed using a nonconnecting loopback URL.
- Earlier migrations 001–014, fresh binding/reset, TLS/RLS/ranks/lineage, 21-gift/integrity/jobs/recovery and negative-balance/failure evidence remain prior-iteration observations, not rerun claims. No financial service changed, so fresh money scenarios were not repeated. No financial database or retained failure evidence was reset.
- Hosted Supabase/Upstash/Vercel, scheduler HTTPS delivery, real chains, restore/reorg and load/mobile-performance acceptance remain unrun by owner choice.

## Remaining defects and blockers

- The owner confirms Supabase, Upstash and Vercel are not configured and defers their testing. CI checks can run now; deployment must remain disabled. See `SETUP.md` for enabling PR previews later.
- Existing simulation authentication trusts `x-sim-user`; it is not production identity. Sessions, CSRF, staff MFA, complete account-state handling and durable rate limiting remain incomplete. RLS covers only currently implemented tables/views; future resources need their own policies. Only simulation is supported.
- M0 binding/reset/cache defects above are fixed and verified in tooling; hosted provider/security acceptance still remains. RLS/provider portability is not yet verified on Supabase. M1 still needs hosted and incoming exception/reorg/full-restore contracts. Compact browser/memory budgets and compatible Redis contracts passed; larger public/help budgets, business/digest/cleanup aggregation, external alerts, retention and long-worker heartbeat remain incomplete. Legacy slot attribution may stay unverifiable and must remain reported; larger-dataset capacity remains unmeasured.

- No live verifier, isolated signer, native-gas accounting, real withdrawal/business settlement, or accepted extra chain adapter exists. Full product/admin/recovery features remain incomplete.
- PostgreSQL-specific exceptions include transaction-local role/context and permission metadata, parameterized locks/server clock, migration DDL/policies/grants and guarded maintenance locks/TRUNCATE. Application table/view queries remain Drizzle-first. Bounded rank maintenance/read functions are an additional narrow PostgreSQL-specific exception; application queries still use Drizzle. Migration 009 rebuilds derived counters under maintenance locks.
- GitHub access works with existing authentication. Prior PRs #1–#11 are merged; this iteration must pass final-head checks before merging. Hosted credentials remain deferred by the owner.

## Exact next development pass

1. Finish this iteration's verified PR/merge, then continue unresolved M0/M1 incoming simulation exception/reorg and isolated restore/provider contracts. Preserve immutable financial/work history and retained failure evidence; never invent attribution or real-chain nonbroadcast proof.
2. Complete remaining bounded maintenance/retention and larger public/help cache contracts where needed; retain pending obligations. Use named manual acceptance and reconciliation. Hosted tests remain owner-deferred, so dependent gates cannot be claimed complete.

3. M2 identity/security and later real testnet adapters follow their prerequisite gates. No real signer, native gas, external alert or live provider acceptance exists yet.
4. When owner settings arrive, follow SETUP.md for hosted validation. The owner asks for continued iterations and best-recommendation decisions without routine questions, not fabricated credentials/results.

Each verified iteration updates this table and the self-contained prompt, advances both filenames and gets a merged PR. A stopped/usage-limited session requires a future session to resume; automatic resumption is not promised.

v13
