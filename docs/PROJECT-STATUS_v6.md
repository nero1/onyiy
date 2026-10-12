# Project Status — Phase One

Updated: 12 October 2026. **29.55% complete / 70.45% remaining.** This is a weighted implementation estimate, not release permission. No milestone gate is newly declared complete.

| Milestone | Weight | Completion | Contribution | Verified evidence / remaining gate |
|---|---:|---:|---:|---|
| M0 — schema/config/runtime | 10% | 85% | 8.50% | Node 22, lockfile, clean install, typecheck/build and configuration checks pass; restricted runtime roles and RLS pass in tooling; hosted/security and remaining foundations remain. |
| M1 — GIV money/queues | 15% | 80% | 12.00% | Public-route happy path, replay/concurrency and rejected-spend protection pass in tooling; hosted/recovery/job acceptance remains. |
| M2 — identity/permissions | 15% | 15% | 2.25% | Own-row RLS and fresh staff role/status checks pass in tooling; OAuth/session/CSRF/TOTP/full status/rate-limit gates remain. |
| M3 — first testnet adapter | 15% | 0% | 0.00% | No accepted real-chain financial path. |
| M4 — responsive product | 15% | 35% | 5.25% | EN/FR review and identity flows verified; full product/offline/a11y acceptance remains. |
| M5 — admin/portability/recovery | 10% | 5% | 0.50% | Limited simulation administration; settings, priority, import/export and recovery gates remain. |
| M6 — remaining adapters | 8% | 0% | 0.00% | No additional accepted chain adapters. |
| M7 — bounded prototype release | 7% | 15% | 1.05% | Build and homepage JS budget pass; deployment, mobile measurements and provider quotas remain. |
| M8 — financial acceptance | 5% | 0% | 0.00% | Signer/alerts/caps/monitoring/restore evidence absent. |
| **Total** | **100%** | | **29.55%** | **70.45% remaining.** |

M2 rises from 8% to 15% for verified own-row reads and transaction-bound staff role/status enforcement. This foundation work does not complete M2 authentication or waive M0/M1 prerequisite gates. Other estimates remain unchanged.

## Completed this iteration

- Verified and merged TLS/health PR #4 after its push/PR checks passed; its main run also passed. Deployment remains disabled.
- Enabled RLS on all 19 current tables. Native API reads use a transaction-local read role, actor and environment; member wallets/cycles/withdrawals/notifications/referrals/points and balance/rank views remain scoped. Staff reads recheck current DB role/status. Context resets at transaction end.
- Restricted runtime logins cannot own application objects or bypass RLS. Separate financial service permissions allow required domain writes but no deletion/truncation or ledger edits. Browser/Data API roles have no application access. The simulation chooser exposes only synthetic display fields.
- Migration/seed/reset use separate owner credentials. Added internal environment identity and `db:check:runtime`; deployment validates matching runtime/owner namespaces and identical Vercel/GitHub runtime binding. Migration credentials are prohibited in Vercel runtime. Documented secure role/CA provisioning and updated the living PRD security contract.

## Checks actually executed

- `check:all`, production build, bundle/secret and workflow syntax checks passed: 48 EN/FR keys, 19/19 current Drizzle tables, 175.76 KiB gzip homepage.
- Migrations 001–008, repeated forward migration and seed succeeded in fresh disposable PostgreSQL. Runtime namespace/role verification passed using a NOINHERIT/NOBYPASSRLS, nonowner login. A different valid namespace and a missing-migration target were refused with redacted diagnostics.
- The public-route 21-gift and integrity scenarios passed using that restricted login: bootstrap/first-member allocation, replay/concurrent gift/spend admission, no-wallet completion, exact withdrawal and balanced journals. No broad automated suite was added.
- Own-row reads passed for users, wallets, cycles, withdrawals, notifications, points, referrals, queue entries and balances. Unscoped reads, member writes, ledger/config reads and member staff access were denied. Admin reads worked; committed staff suspension and role removal blocked the next privileged transaction. Context cleared after commit and rollback.
- Cross-environment asset/wallet fixtures stayed hidden. Scoped rank matched the authoritative display count. All 19 current tables report RLS; member write/ledger access, service ledger edits and TRUNCATE are denied. A bypass-enabled read role was refused and restored safely in tooling.
- Prior TLS trust/hostname and bounded health evidence remains valid; this pass routes health through restricted service context. Hosted Supabase role/pooler connectivity, Upstash, Vercel and real chains remain unrun.

## Remaining defects and blockers

- The owner confirms Supabase, Upstash and Vercel are not configured and defers their testing. CI checks can run now; deployment must remain disabled. See `SETUP.md` for enabling PR previews later.
- Existing simulation authentication trusts `x-sim-user`; it is not production identity. Sessions, CSRF, staff MFA, complete account-state handling and durable rate limiting remain incomplete. RLS covers only currently implemented tables/views; future resources need their own policies. Only simulation is supported.
- M0 still needs hosted provider/security acceptance and remaining foundations. RLS/provider portability is verified only in tooling, not Supabase. Typed future policies are not proof their services exist. M1 still needs hosted and exception/reorg/job acceptance. The reproduced spend/replay defects are fixed; asynchronous jobs, receipt-allocation lineage, reorg/recovery and queue rank scale remain incomplete.
- No live verifier, isolated signer, native-gas accounting, real withdrawal/business settlement, or accepted extra chain adapter exists. Full product/admin/recovery features remain incomplete.
- PostgreSQL-specific exceptions include transaction-local role/context and permission metadata, parameterized locks, migration DDL/policies/grants and guarded maintenance locks/TRUNCATE. Application table/view queries remain Drizzle-first. Queue rank still counts preceding entries; the bounded Fenwick implementation is next.
- GitHub access works with existing authentication. Prior PRs #1–#4 are merged; this iteration must also pass its PR checks before merging. Hosted credentials remain deferred by the owner.

## Exact next development pass

1. Finish this iteration's verified PR/merge, then implement bounded queue display/serving rank using the PRD sparse Fenwick index. Preserve own-row views, immutable admission order, partition locks and separate priority serving order; no million-user throughput claim.
2. Continue remaining M0/M1 jobs/receipt-allocation lineage and recovery work with named manual acceptance and reconciliation. Do not claim gates passed while hosted acceptance remains deferred.
3. M2 identity/security and later real testnet adapters follow their prerequisite gates. No real signer, native gas, external alert or live provider acceptance exists yet.
4. When owner settings arrive, follow SETUP.md for hosted validation. The owner asks for continued iterations and best-recommendation decisions without routine questions, not fabricated credentials/results.

Each verified iteration updates this table and the self-contained prompt, advances both filenames and gets a merged PR. A stopped/usage-limited session requires a future session to resume; automatic resumption is not promised.

v6
