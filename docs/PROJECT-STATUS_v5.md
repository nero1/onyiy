# Project Status — Phase One

Updated: 12 October 2026. **28.50% complete / 71.50% remaining.** This is a weighted implementation estimate, not release permission. No milestone gate is newly declared complete.

| Milestone | Weight | Completion | Contribution | Verified evidence / remaining gate |
|---|---:|---:|---:|---|
| M0 — schema/config/runtime | 10% | 85% | 8.50% | Node 22, lockfile, clean install, typecheck/build and configuration checks pass; hosted providers, hosted acceptance, RLS/security and remaining foundation gates remain. |
| M1 — GIV money/queues | 15% | 80% | 12.00% | Public-route happy path, replay/concurrency and rejected-spend protection pass in tooling; hosted/recovery/job acceptance remains. |
| M2 — identity/permissions | 15% | 8% | 1.20% | Simulation identity/consent baseline; OAuth/session/CSRF/TOTP/RLS/status/rate-limit gates remain. |
| M3 — first testnet adapter | 15% | 0% | 0.00% | No accepted real-chain financial path. |
| M4 — responsive product | 15% | 35% | 5.25% | EN/FR review and identity flows verified; full product/offline/a11y acceptance remains. |
| M5 — admin/portability/recovery | 10% | 5% | 0.50% | Limited simulation administration; settings, priority, import/export and recovery gates remain. |
| M6 — remaining adapters | 8% | 0% | 0.00% | No additional accepted chain adapters. |
| M7 — bounded prototype release | 7% | 15% | 1.05% | Build and homepage JS budget pass; deployment, mobile measurements and provider quotas remain. |
| M8 — financial acceptance | 5% | 0% | 0.00% | Signer/alerts/caps/monitoring/restore evidence absent. |
| **Total** | **100%** | | **28.50%** | **71.50% remaining.** |

The estimate remains 28.50%: verified TLS/health strengthen M0, but remaining RLS/security, schema and hosted gates prevent a new milestone completion claim.

## Completed this iteration

- Verified and merged spending/ledger PR #3 after both GitHub checks passed; its main push also passed. Deployment stayed disabled.
- Remote runtime, migration and health PostgreSQL connections now verify certificate trust and hostname, including `sslmode=require`. TLS bypasses, unsupported URL settings and invalid pool/timeouts fail closed. Optional public CA chains stay in server settings.
- Health now probes validated DB configuration through an independent bounded connection, coalesces concurrent calls and terminates timed-out work. It returns redacted 503 responses instead of reporting healthy solely from environment presence. Credential-free builds remain supported.

## Checks actually executed

- `check:all`, production build, bundle and post-build secret checks passed; 48 translation keys, 18/18 current Drizzle tables, 175.76 KiB gzip homepage budget. No dependency/schema change required another migration or fresh install in this pass.
- A disposable PG TLS-protocol fixture accepted a trusted hostname and refused untrusted/incorrect-host certificates. Invalid protocol, TLS disable/bypass, duplicate SSL settings, malformed CA and invalid numeric settings were refused. These checks are not hosted Supabase acceptance.
- Existing disposable PostgreSQL returned healthy with simultaneous callers sharing one promise. A blocked configuration table returned unavailable in 2,032 ms; a nonresponsive server returned unavailable in 2,007 ms with one connection for 20 callers. Refused connection returned unavailable in 8 ms. Health recovered after the lock released.
- Public production-build health returned 200 with no-store and dashboard reads remained functional. Direct Route Handler outage/unsafe-TLS checks returned redacted 503. No secrets or internal connection URL appeared in the response.
- Prior iteration's fresh migrations 001–006, 21-gift/integrity, policy/ledger rejection and mobile/French browser evidence is retained; these full money scenarios were not repeated for this connection-only change. Hosted providers and real chains remain unrun.

## Remaining defects and blockers

- The owner confirms Supabase, Upstash and Vercel are not configured and defers their testing. CI checks can run now; deployment must remain disabled. See `SETUP.md` for enabling PR previews later.
- Existing simulation authentication trusts `x-sim-user`; it is not production identity. Sessions, CSRF, staff MFA, RLS, account-state handling and durable rate limiting remain incomplete. Only simulation is supported.
- M0 still needs hosted provider/security/RLS acceptance and remaining schema/configuration foundations. Typed future policies are not proof their services exist. M1 still needs hosted and exception/reorg/job acceptance. The reproduced spend/replay defects are fixed; asynchronous jobs, receipt-allocation lineage, reorg/recovery and queue rank scale remain incomplete.
- No live verifier, isolated signer, native-gas accounting, real withdrawal/business settlement, or accepted extra chain adapter exists. Full product/admin/recovery features remain incomplete.
- Raw-SQL exceptions currently include parameterized row locks in `server/core.ts`, SQL migration DDL/GRANTs, and simulation-only maintenance locks/TRUNCATE tooling. Drizzle SQL expressions implement aggregates/order/counters; no new raw application SQL is added here. Keep exceptions narrow and document/refactor them as M0 hardening proceeds.
- GitHub access works with existing authentication. Prior PRs #1–#3 are merged; this iteration must also pass its PR checks before merging. Hosted credentials remain deferred by the owner.

## Exact next development pass

1. Finish this iteration's verified PR/merge, then establish M0 least-privilege runtime roles, transaction-local actor context and user-owned RLS foundations. Keep public financial/audit tables closed and enforce server authorization alongside RLS; current simulation auth is not production identity.
2. Continue remaining M0/M1 jobs/receipt/reorg/rank work with named manual acceptance and reconciliation. Do not claim gates passed while hosted acceptance remains deferred.
3. M2 identity/security and later real testnet adapters follow their prerequisite gates. No real signer, native gas, external alert or live provider acceptance exists yet.
4. When owner settings arrive, follow SETUP.md for hosted validation. The owner asks for continued iterations and best-recommendation decisions without routine questions, not fabricated credentials/results.

Each verified iteration updates this table and the self-contained prompt, advances both filenames and gets a merged PR. A stopped/usage-limited session requires a future session to resume; automatic resumption is not promised.

v5
