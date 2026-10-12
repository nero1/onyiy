# Project Status — Phase One

Updated: 12 October 2026. **35.45% complete / 64.55% remaining.** This is a weighted implementation estimate, not release permission. No milestone gate is newly declared complete.

| Milestone | Weight | Completion | Contribution | Verified evidence / remaining gate |
|---|---:|---:|---:|---|
| M0 — schema/config/runtime | 10% | 92% | 9.20% | Node 22, lockfile, clean install, typecheck/build and configuration checks pass; restricted runtime roles and RLS pass in tooling; hosted/security and remaining foundations remain. |
| M1 — GIV money/queues | 15% | 99% | 14.85% | Public-route happy path, replay/concurrency and rejected-spend protection pass in tooling; hosted/recovery/job acceptance remains. |
| M2 — identity/permissions | 15% | 15% | 2.25% | Own-row RLS and fresh staff role/status checks pass in tooling; OAuth/session/CSRF/TOTP/full status/rate-limit gates remain. |
| M3 — first testnet adapter | 15% | 0% | 0.00% | No accepted real-chain financial path. |
| M4 — responsive product | 15% | 42% | 6.30% | EN/FR review and identity flows verified; full product/offline/a11y acceptance remains. |
| M5 — admin/portability/recovery | 10% | 18% | 1.80% | Isolated encrypted GIV restore and bounded maintenance pass in tooling; hosted/live recovery, settings/priority and product portability remain. |
| M6 — remaining adapters | 8% | 0% | 0.00% | No additional accepted chain adapters. |
| M7 — bounded prototype release | 7% | 15% | 1.05% | Build and homepage JS budget pass; deployment, mobile measurements and provider quotas remain. |
| M8 — financial acceptance | 5% | 0% | 0.00% | Signer/alerts/caps/monitoring/full release-recovery evidence absent. |
| **Total** | **100%** | | **35.45%** | **64.55% remaining.** |

M0 rises to 92% for verified bounded public server L1 and single-flight contracts; M1–M8 remain unchanged. No full gate is accepted. Weighted total: 9.20 + 14.85 + 2.25 + 0 + 6.30 + 1.80 + 0 + 1.05 + 0 = 35.45.

## Completed this iteration

- Confirmed PR #17 merged after both exact-head checks; continued from actual main.
- Public manifest/catalog now share one process L1 loader per resource, with only projected public DTOs in validated entry/byte budgets. Fixed L1 expiry and aged outward CDN TTL prevent a warm hit from restarting old freshness. Catalog reads cap at 1,000 rows and fail closed above the ceiling.
- Committed activation invalidates both DTOs. Generation/promise fencing prevents old completion from repopulating or deleting a newer flight. Failed catalog loads are evicted; public manifest seed fallback lasts at most five seconds in L1. Data-query statements use five-second timeouts. Money/status/staff queries remain live; no Redis or financial cache was introduced.
- Conditional public requests now accept ETag lists, strong/weak equivalents and wildcard validators. Process-local invalidation is explicitly separate from unverified hosted/CDN propagation.

## Checks actually executed

- Node 22.23.3 clean install, `check:all`, build, bundle/secrets/grants/docs and scratch Drizzle checks passed: 63 EN/FR keys, 35/35 current tables and 179.24 KiB gzip homepage. No dependency/schema/migration changed.
- Actual isolated PG source locks proved 100 simultaneous cold manifest requests and 100 cold catalogs each shared one waiting loader. One hundred warm manifest reads completed while the source stayed locked. Outputs contained no private/staff policy. Invalidation during an older blocked catalog admitted a newer flight; old completion could not replace its 11-second display policy.
- Named clock observations proved outward TTL aged from 11 to 9 seconds and an expired L1 reloaded. Invalid source policy rejected all catalog callers; failed-flight cleanup allowed repaired data to reload without explicit invalidation. Manifest fallback stayed public. Actual five-second PG source timeout rejected 30 coalesced callers, preserved failure/recovery observations and allowed recovery; seed fallback expired from L1 after five seconds.
- A separate authenticated restored namespace passed 100 HTTP catalog reads, ETag/304 variants and private/no-store headers. Warm public feature data did not authorize a gift after live DB disable; warm DTOs did not bypass banned staff status. Committed Diamond activation refreshed both DTOs/ETag. Exact ledger/receipt/invoice/withdrawal/points/work/notification fingerprints stayed unchanged; reconciliation retained balanced history, complete lineage and an open inconsistent review.
- Initial scratch module loading and a wrong outbox table name were corrected before acceptance. Financial fixtures and failure observations remain retained; no journals or retained money/work were rewritten. The full fresh financial sequence is historical v16 evidence, not newly rerun in this public-read pass. No broad automated suite was added.
- Hosted Supabase/Upstash/Vercel/CDN multi-instance propagation, native remote TLS, real chains/signing/finality, complete help/PWA and large-dataset capacity remain unrun.

## Remaining defects and blockers

- The owner confirms Supabase, Upstash and Vercel are not configured and defers their testing. CI checks can run now; deployment must remain disabled. See `SETUP.md` for enabling PR previews later.
- Existing simulation authentication trusts `x-sim-user`; it is not production identity. Sessions, CSRF, staff MFA, complete account-state handling and durable rate limiting remain incomplete. RLS covers only currently implemented tables/views; future resources need their own policies. Only simulation is supported.
- M0 binding/reset/cache contracts are fixed and verified in tooling; hosted provider/security acceptance still remains. RLS/provider portability is not yet verified on Supabase. M1 still needs hosted/provider and live recovery contracts; current isolated GIV restore passes in tooling. Compact browser/memory budgets and compatible Redis contracts passed; full help/PWA, hosted cache propagation, business/digest aggregation, financial/notification/terminal-job archival, external alerts and long-worker heartbeat remain incomplete; bounded scheduler retention now passes in tooling. Legacy slot attribution may stay unverifiable and must remain reported; larger-dataset capacity remains unmeasured.

- No live verifier, isolated signer, native-gas accounting, real withdrawal/business settlement, or accepted extra chain adapter exists. Full product/admin/recovery features remain incomplete.
- PostgreSQL-specific exceptions include transaction-local role/context and permission metadata, parameterized locks/server clock, migration DDL/policies/grants, guarded maintenance locks/TRUNCATE, native backup/restore, exported snapshots and catalog fingerprints. Application table/view queries remain Drizzle-first. Bounded rank maintenance/read functions are an additional narrow PostgreSQL-specific exception; application queries still use Drizzle. Migration 009 rebuilds derived counters under maintenance locks.
- GitHub access works with existing authentication. Prior PRs #1–#17 are merged; this iteration must pass final-head checks before merging. Hosted credentials remain deferred by the owner.

## Exact next development pass

1. Finish this iteration's verified PR/merge, then continue unresolved M0/M1 provider and safe maintenance contracts. Preserve immutable financial/work history and retained failure evidence; never invent attribution or real-chain nonbroadcast proof.
2. Continue public help/product contracts and remaining provider recovery contracts; further archival needs verified preservation/hold semantics; retain pending obligations. Use named manual acceptance and reconciliation. Hosted tests remain owner-deferred, so dependent gates cannot be claimed complete.

3. M2 identity/security and later real testnet adapters follow their prerequisite gates. No real signer, native gas, external alert or live provider acceptance exists yet.
4. When owner settings arrive, follow SETUP.md for hosted validation. The owner asks for continued iterations and best-recommendation decisions without routine questions, not fabricated credentials/results.

Each verified iteration updates this table and the self-contained prompt, advances both filenames and gets a merged PR. A stopped/usage-limited session requires a future session to resume; automatic resumption is not promised.

v19
