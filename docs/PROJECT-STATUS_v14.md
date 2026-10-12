# Project Status — Phase One

Updated: 12 October 2026. **34.25% complete / 65.75% remaining.** This is a weighted implementation estimate, not release permission. No milestone gate is newly declared complete.

| Milestone | Weight | Completion | Contribution | Verified evidence / remaining gate |
|---|---:|---:|---:|---|
| M0 — schema/config/runtime | 10% | 90% | 9.00% | Node 22, lockfile, clean install, typecheck/build and configuration checks pass; restricted runtime roles and RLS pass in tooling; hosted/security and remaining foundations remain. |
| M1 — GIV money/queues | 15% | 98% | 14.70% | Public-route happy path, replay/concurrency and rejected-spend protection pass in tooling; hosted/recovery/job acceptance remains. |
| M2 — identity/permissions | 15% | 15% | 2.25% | Own-row RLS and fresh staff role/status checks pass in tooling; OAuth/session/CSRF/TOTP/full status/rate-limit gates remain. |
| M3 — first testnet adapter | 15% | 0% | 0.00% | No accepted real-chain financial path. |
| M4 — responsive product | 15% | 41% | 6.15% | EN/FR review and identity flows verified; full product/offline/a11y acceptance remains. |
| M5 — admin/portability/recovery | 10% | 11% | 1.10% | Limited simulation administration; settings, priority, import/export and recovery gates remain. |
| M6 — remaining adapters | 8% | 0% | 0.00% | No additional accepted chain adapters. |
| M7 — bounded prototype release | 7% | 15% | 1.05% | Build and homepage JS budget pass; deployment, mobile measurements and provider quotas remain. |
| M8 — financial acceptance | 5% | 0% | 0.00% | Signer/alerts/caps/monitoring/restore evidence absent. |
| **Total** | **100%** | | **34.25%** | **65.75% remaining.** |

M4 rises to 41% for observed EN/FR invoice review and separate incoming/refundable balances; M5 to 11% for verified immutable incoming controls/refunds. M0 stays 90% and M1 98%; no hosted/full gate is accepted. Weighted total: 9 + 14.70 + 2.25 + 0 + 6.15 + 1.10 + 0 + 1.05 + 0 = 34.25.

## Completed this iteration

- Confirmed PR #12 merged with final-head and merged-main checks passing.
- Added immutable GIV invoice economics, PostgreSQL-observed submission times and delayed incoming holds. Normal UI requires separate amount review/confirmation; unused quotes can be cancelled and recovered after reload through the dashboard batch.
- Added immutable staff reject/under/over/late/delay controls, original-sender refundable liabilities and audited idempotent cancellation/refund recovery. Under/late payments admit no cycle; surplus never creates another right. Valid pre-expiry submission may confirm after expiry. Deferred guards prove state/source/amount/owner/asset/journals; terminal/history/version economics cannot be rewritten.
- Reconciliation checks incoming/refundable liabilities separately; EN/FR displays those balances. Pending invoices stay outside browser snapshots. Guarded reset includes all new resources. No real-chain transfer, refund or reorg is implemented by these controls.

## Checks actually executed

- Node 22.23.3 static/type/manifest/Drizzle/grant/docs/secret/deployment checks and production build passed: 61 EN/FR keys, 32/32 current tables, 177.52 KiB gzip homepage. Clean `npm ci`, final `check:all`, build/bundle/secret checks passed; no dependency changed.
- Fresh owner/runtime binding, migrations 001–015, seed and restricted runtime verification passed in disposable PostgreSQL 17.5. Full fresh public 21-gift → integrity → signed jobs → withdrawal recovery → incoming scenarios passed on the corrected build. Repeated populated migrations/seed/binding checks passed.
- Incoming scenarios passed quote-key case/body binding, rejected no-money outcome, under/late no-admission liability preservation, delayed held recovery, exact overpayment principal with one-unit surplus, duplicate submission/refund, concurrent normal admission, own/staff denial and reconciliation.
- Named manual probes rejected invoice/control/event tampering, terminal reopening, wrong refund amount/beneficiary and browser access; own-row RLS hid another invoice. A balanced orphan refundable liability was detected inside a rollback. Banned-account refund preserved entitlement. A submitted-before-expiry delayed hold confirmed after its original expiry.
- Chromium at 390px passed EN review/cancel/explicit funded admission, FR underpayment notice/balance/no-admission, no horizontal overflow and no persisted pending invoice/withdrawal state. An initial browser locator assumed a username heading; using the actual dashboard corrected the tooling observation.
- Initial integrity acceptance stopped on its old exact balance DTO expectation; it now asserts both added zero fields. Incoming acceptance then reproduced a raw timestamp-binding failure. A typed Drizzle comparison fixed it; the first disposable fixture was retained and the full sequence repeated on a new fresh database. No journals or retained failure evidence were rewritten/reset. Initial PostgreSQL tooling lacked pgcrypto; the official extension was built/installed before application migration acceptance.
- Hosted Supabase/Upstash/Vercel, real transfers, signer/native gas, reorg/restore, external alerts, hosted scheduler and large-dataset/mobile-performance acceptance remain unrun. Earlier cache/TLS/rank/lineage/negative-balance evidence remains prior-iteration evidence.

## Remaining defects and blockers

- The owner confirms Supabase, Upstash and Vercel are not configured and defers their testing. CI checks can run now; deployment must remain disabled. See `SETUP.md` for enabling PR previews later.
- Existing simulation authentication trusts `x-sim-user`; it is not production identity. Sessions, CSRF, staff MFA, complete account-state handling and durable rate limiting remain incomplete. RLS covers only currently implemented tables/views; future resources need their own policies. Only simulation is supported.
- M0 binding/reset/cache defects above are fixed and verified in tooling; hosted provider/security acceptance still remains. RLS/provider portability is not yet verified on Supabase. M1 still needs hosted and incoming reorg/full-restore contracts. Compact browser/memory budgets and compatible Redis contracts passed; larger public/help budgets, business/digest/cleanup aggregation, external alerts, retention and long-worker heartbeat remain incomplete. Legacy slot attribution may stay unverifiable and must remain reported; larger-dataset capacity remains unmeasured.

- No live verifier, isolated signer, native-gas accounting, real withdrawal/business settlement, or accepted extra chain adapter exists. Full product/admin/recovery features remain incomplete.
- PostgreSQL-specific exceptions include transaction-local role/context and permission metadata, parameterized locks/server clock, migration DDL/policies/grants and guarded maintenance locks/TRUNCATE. Application table/view queries remain Drizzle-first. Bounded rank maintenance/read functions are an additional narrow PostgreSQL-specific exception; application queries still use Drizzle. Migration 009 rebuilds derived counters under maintenance locks.
- GitHub access works with existing authentication. Prior PRs #1–#12 are merged; this iteration must pass final-head checks before merging. Hosted credentials remain deferred by the owner.

## Exact next development pass

1. Finish this iteration's verified PR/merge, then continue unresolved M0/M1 incoming simulation reorg and isolated restore/provider contracts. Preserve immutable financial/work history and retained failure evidence; never invent attribution or real-chain nonbroadcast proof.
2. Complete remaining bounded maintenance/retention and larger public/help cache contracts where needed; retain pending obligations. Use named manual acceptance and reconciliation. Hosted tests remain owner-deferred, so dependent gates cannot be claimed complete.

3. M2 identity/security and later real testnet adapters follow their prerequisite gates. No real signer, native gas, external alert or live provider acceptance exists yet.
4. When owner settings arrive, follow SETUP.md for hosted validation. The owner asks for continued iterations and best-recommendation decisions without routine questions, not fabricated credentials/results.

Each verified iteration updates this table and the self-contained prompt, advances both filenames and gets a merged PR. A stopped/usage-limited session requires a future session to resume; automatic resumption is not promised.

v14
