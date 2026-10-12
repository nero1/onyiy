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

M1 increases to 80% for observed replay/concurrency and financial protections; M4 increases to 35% for working browser approval/identity flows. Other estimates remain unchanged. No full milestone gate is declared complete.

## Completed this iteration

- Reproduced a real concurrent-spending defect in disposable data: two 4,000 GIV confirmations both succeeded against 5,000 GIV, leaving −3,000. The failing fixture is retained separately; historical journals were not rewritten.
- Serialized all outgoing spend through a user lock, reloaded transaction-bound eligibility, validated asset/feature status, and bound replay keys to inputs. Added cross-version plan/asset cooldown and active-cycle checks, concurrent-cycle limits and stable wallet replay.
- Added immutable USD version snapshots, configured potential-receipt calculation, durable UTC point caps and GIV spend limits. Empty queues honor policy without self-allocation; new bootstrap earnings have a distinct business account category.
- Added database append-only/sealing/balance/owner protections. ORM declares the existing null-safe account uniqueness index. Migrations remain forward/idempotent and introduce no new Data API permissions.
- Added the operator-invoked M1 integrity scenario (excluded from CI). Fixed the notification field-name crash and kept legacy API aliases. Quote review now requires explicit confirmation; late identity responses are rejected and amounts parse exactly. EN/FR controls include accessible labels.

## Checks actually executed

- `check:all`, production build, post-build secret scan, Drizzle Kit consistency and workflow syntax checks passed. Drizzle Kit first refused missing environment settings, then passed with the disposable database URL. Bundle budget passed. EN/FR parity is **48 keys**; homepage JavaScript is **175.76 KiB gzip** / 200 KiB. Drizzle coverage remains **18/18 current tables**.
- Migrations 001–006 and seed succeeded on fresh disposable PostgreSQL. The 21-gift and integrity scenarios passed through public routes with all DB guards enabled: one grant, stable wallet, replay/body conflicts, one successful concurrent withdrawal, one concurrent cycle, ownership protection, exact 0.29 GIV, no-wallet completion and balanced journals.
- Additional manual cases passed: admin replay/conflict, immutable USD after a display-price edit, truncated/concurrent point caps, cycle cap, disabled flags/table/config assets, suspension, destination change, quote expiry, blocked empty queue and marketing startup without self-credit. Rejected operations preserved balances.
- Ledger UPDATE/DELETE, used-account reassignment, financial-owner deletion, empty/unbalanced and mixed-asset journals, and extra lines on sealed journals were rejected. The mixed-asset transaction rolled back all fixture rows. Positive withdrawals still succeeded. An initial unframed SQL probe did not reliably report both deferred errors; no invalid writes persisted, and explicit transactions matching the app contract confirmed both rejections.
- Chromium inspection found the real notification DTO crash, then passed mobile quote→review→explicit confirmation, identity switching and a delayed response. French desktop review/cancel also passed after correcting a locator assumption (the language control is a toggle). No page errors remained in these flows; this is not full accessibility/performance acceptance.
- GitHub PR #2 was verified merged after its push/PR checks passed. Hosted Supabase/Upstash/Vercel and real-chain acceptance remain **unrun**. No automated test suite or new local service/setup flow was added.

## Remaining defects and blockers

- The owner confirms Supabase, Upstash and Vercel are not configured and defers their testing. CI checks can run now; deployment must remain disabled. See `SETUP.md` for enabling PR previews later.
- Existing simulation authentication trusts `x-sim-user`; it is not production identity. Sessions, CSRF, staff MFA, RLS, account-state handling and durable rate limiting remain incomplete. Only simulation is supported.
- M0 still needs hosted provider/security/RLS acceptance. Typed future policies are not proof their services exist. M1 still needs hosted and exception/reorg/job acceptance. The reproduced spend/replay defects are fixed; asynchronous jobs, receipt-allocation lineage, reorg/recovery and queue rank scale remain incomplete.
- No live verifier, isolated signer, native-gas accounting, real withdrawal/business settlement, or accepted extra chain adapter exists. Full product/admin/recovery features remain incomplete.
- Raw-SQL exceptions currently include parameterized row locks in `server/core.ts`, SQL migration DDL/GRANTs, and simulation-only maintenance locks/TRUNCATE tooling. Drizzle SQL expressions implement aggregates/order/counters; no new raw application SQL is added here. Keep exceptions narrow and document/refactor them as M0 hardening proceeds.
- GitHub access works with existing authentication. Prior PRs #1 and #2 are merged; this iteration must also pass its PR checks before merging. Hosted credentials remain deferred by the owner.

## Exact next development pass

1. Merge this verified iteration's PR, then close remaining M0 runtime gaps: verified TLS for remote PostgreSQL, bounded real database health and RLS foundations. Runtime security must not be weakened to unblock deployment.
2. Continue remaining M0/M1 jobs/receipt/reorg/rank work with named manual acceptance and reconciliation. Do not claim gates passed while hosted acceptance remains deferred.
3. M2 identity/security and later real testnet adapters follow their prerequisite gates. No real signer, native gas, external alert or live provider acceptance exists yet.
4. When owner settings arrive, follow SETUP.md for hosted validation. The owner asks for continued iterations and best-recommendation decisions without routine questions, not fabricated credentials/results.

Each verified iteration updates this table and the self-contained prompt, advances both filenames and gets a merged PR. A stopped/usage-limited session requires a future session to resume; automatic resumption is not promised.

v4
