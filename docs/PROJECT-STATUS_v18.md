# Project Status — Phase One

Updated: 12 October 2026. **35.35% complete / 64.65% remaining.** This is a weighted implementation estimate, not release permission. No milestone gate is newly declared complete.

| Milestone | Weight | Completion | Contribution | Verified evidence / remaining gate |
|---|---:|---:|---:|---|
| M0 — schema/config/runtime | 10% | 91% | 9.10% | Node 22, lockfile, clean install, typecheck/build and configuration checks pass; restricted runtime roles and RLS pass in tooling; hosted/security and remaining foundations remain. |
| M1 — GIV money/queues | 15% | 99% | 14.85% | Public-route happy path, replay/concurrency and rejected-spend protection pass in tooling; hosted/recovery/job acceptance remains. |
| M2 — identity/permissions | 15% | 15% | 2.25% | Own-row RLS and fresh staff role/status checks pass in tooling; OAuth/session/CSRF/TOTP/full status/rate-limit gates remain. |
| M3 — first testnet adapter | 15% | 0% | 0.00% | No accepted real-chain financial path. |
| M4 — responsive product | 15% | 42% | 6.30% | EN/FR review and identity flows verified; full product/offline/a11y acceptance remains. |
| M5 — admin/portability/recovery | 10% | 18% | 1.80% | Isolated encrypted GIV restore and bounded maintenance pass in tooling; hosted/live recovery, settings/priority and product portability remain. |
| M6 — remaining adapters | 8% | 0% | 0.00% | No additional accepted chain adapters. |
| M7 — bounded prototype release | 7% | 15% | 1.05% | Build and homepage JS budget pass; deployment, mobile measurements and provider quotas remain. |
| M8 — financial acceptance | 5% | 0% | 0.00% | Signer/alerts/caps/monitoring/full release-recovery evidence absent. |
| **Total** | **100%** | | **35.35%** | **64.65% remaining.** |

M0 rises to 91% for verified separate public-document budgets and catalog integration; M1–M8 remain unchanged. No full gate is accepted. Weighted total: 9.10 + 14.85 + 2.25 + 0 + 6.30 + 1.80 + 0 + 1.05 + 0 = 35.35.

## Completed this iteration

- Confirmed PR #16 merged after both exact-head checks and continued from its actual main commit.
- Added a separate optional versioned public IndexedDB store with database-configured byte/entry ceilings, fixed TTL/caller age, conservative multibyte accounting, pruning and LRU. Read/write transactions serialize across contexts; budget shrink trims existing data. Only projected catalog fields and closed locale/slug text-help DTOs are accepted; private/generic API namespaces are excluded.
- Dashboard catalog restoration keeps the compact fallback and protects fresh network results from delayed disk/older reads. Successful actions still fetch server data; no financial authority or offline mutation enters the cache.
- Public catalog now returns a weak ETag and its configured public CDN TTL; matching requests return 304 with current headers. Private responses remain private/no-store. Full help publishing/search, PWA shell and server L1 single-flight remain incomplete.

## Checks actually executed

- Node 22.23.3 clean install, `check:all`, build, bundle/secrets/grants/docs and scratch Drizzle checks passed: 63 EN/FR keys, 35/35 current tables and 179.24 KiB gzip homepage. No dependency/schema/migration changed.
- Named isolated Chromium observations passed entry eviction/read promotion, one-MiB byte limits, multibyte/oversize rejection, expiry/tighter caller age, budget shrink, invalid policy handling, malformed/future/extra-field/private record pruning, projected fields, EN/FR isolation, private account/session purge and reload persistence. Unavailable storage is a miss; forced quota rejection rolls back the cache write and does not poison later writes. This is not a full disk-capacity measurement.
- Two hundred simultaneous writes passed the eight-entry ceiling both within one context and across two same-origin contexts. Actual 390px application observations passed public-only catalog storage, delayed older disk snapshot versus fresh network response, and disk restoration with public API failure after removing the compact catalog. No browser UI layout changed.
- Public API observations passed ETag/empty 304, temporary DB catalog TTL change to 11 seconds and restored policy, public manifest scope, and private/no-store dashboard headers. Exact v17 restore inventory verification still passed afterward: retained financial/work rows, counters/schema/grants and review/liabilities remained unchanged.
- The initial reload fixture used a mocked future clock and correctly lost its invalid record; it was corrected to the real clock before persistence acceptance. Scratch schema-only Drizzle generation/check used work output; source schema/migrations stayed intact. Original financial failure evidence was not reset. No broad automated suite was added.
- Full fresh financial scenarios are historical v16 evidence; handlers were unchanged in this pass. Hosted Supabase/Upstash/Vercel/CDN/quota, native remote TLS, real chains/signing/finality, complete help/PWA and large-dataset capacity remain unrun.

## Remaining defects and blockers

- The owner confirms Supabase, Upstash and Vercel are not configured and defers their testing. CI checks can run now; deployment must remain disabled. See `SETUP.md` for enabling PR previews later.
- Existing simulation authentication trusts `x-sim-user`; it is not production identity. Sessions, CSRF, staff MFA, complete account-state handling and durable rate limiting remain incomplete. RLS covers only currently implemented tables/views; future resources need their own policies. Only simulation is supported.
- M0 binding/reset/cache contracts are fixed and verified in tooling; hosted provider/security acceptance still remains. RLS/provider portability is not yet verified on Supabase. M1 still needs hosted/provider and live recovery contracts; current isolated GIV restore passes in tooling. Compact browser/memory budgets and compatible Redis contracts passed; full help/PWA, public server L1 coalescing, business/digest aggregation, financial/notification/terminal-job archival, external alerts and long-worker heartbeat remain incomplete; bounded scheduler retention now passes in tooling. Legacy slot attribution may stay unverifiable and must remain reported; larger-dataset capacity remains unmeasured.

- No live verifier, isolated signer, native-gas accounting, real withdrawal/business settlement, or accepted extra chain adapter exists. Full product/admin/recovery features remain incomplete.
- PostgreSQL-specific exceptions include transaction-local role/context and permission metadata, parameterized locks/server clock, migration DDL/policies/grants, guarded maintenance locks/TRUNCATE, native backup/restore, exported snapshots and catalog fingerprints. Application table/view queries remain Drizzle-first. Bounded rank maintenance/read functions are an additional narrow PostgreSQL-specific exception; application queries still use Drizzle. Migration 009 rebuilds derived counters under maintenance locks.
- GitHub access works with existing authentication. Prior PRs #1–#16 are merged; this iteration must pass final-head checks before merging. Hosted credentials remain deferred by the owner.

## Exact next development pass

1. Finish this iteration's verified PR/merge, then continue unresolved M0/M1 provider and safe maintenance contracts. Preserve immutable financial/work history and retained failure evidence; never invent attribution or real-chain nonbroadcast proof.
2. Complete public server L1 coalescing and remaining provider recovery contracts; further archival needs verified preservation/hold semantics; retain pending obligations. Use named manual acceptance and reconciliation. Hosted tests remain owner-deferred, so dependent gates cannot be claimed complete.

3. M2 identity/security and later real testnet adapters follow their prerequisite gates. No real signer, native gas, external alert or live provider acceptance exists yet.
4. When owner settings arrive, follow SETUP.md for hosted validation. The owner asks for continued iterations and best-recommendation decisions without routine questions, not fabricated credentials/results.

Each verified iteration updates this table and the self-contained prompt, advances both filenames and gets a merged PR. A stopped/usage-limited session requires a future session to resume; automatic resumption is not promised.

v18
