# Project Status — Phase One

Updated: 12 October 2026. **35.25% complete / 64.75% remaining.** This is a weighted implementation estimate, not release permission. No milestone gate is newly declared complete.

| Milestone | Weight | Completion | Contribution | Verified evidence / remaining gate |
|---|---:|---:|---:|---|
| M0 — schema/config/runtime | 10% | 90% | 9.00% | Node 22, lockfile, clean install, typecheck/build and configuration checks pass; restricted runtime roles and RLS pass in tooling; hosted/security and remaining foundations remain. |
| M1 — GIV money/queues | 15% | 99% | 14.85% | Public-route happy path, replay/concurrency and rejected-spend protection pass in tooling; hosted/recovery/job acceptance remains. |
| M2 — identity/permissions | 15% | 15% | 2.25% | Own-row RLS and fresh staff role/status checks pass in tooling; OAuth/session/CSRF/TOTP/full status/rate-limit gates remain. |
| M3 — first testnet adapter | 15% | 0% | 0.00% | No accepted real-chain financial path. |
| M4 — responsive product | 15% | 42% | 6.30% | EN/FR review and identity flows verified; full product/offline/a11y acceptance remains. |
| M5 — admin/portability/recovery | 10% | 18% | 1.80% | Isolated encrypted GIV restore and bounded maintenance pass in tooling; hosted/live recovery, settings/priority and product portability remain. |
| M6 — remaining adapters | 8% | 0% | 0.00% | No additional accepted chain adapters. |
| M7 — bounded prototype release | 7% | 15% | 1.05% | Build and homepage JS budget pass; deployment, mobile measurements and provider quotas remain. |
| M8 — financial acceptance | 5% | 0% | 0.00% | Signer/alerts/caps/monitoring/full release-recovery evidence absent. |
| **Total** | **100%** | | **35.25%** | **64.75% remaining.** |

M5 rises to 18% for verified isolated encrypted simulation backup/restore; M0–M4 and M6–M8 remain unchanged. No full gate is accepted. Weighted total: 9 + 14.85 + 2.25 + 0 + 6.30 + 1.80 + 0 + 1.05 + 0 = 35.25.

## Completed this iteration

- Confirmed PR #15 merged after its exact-head checks; continued from actual main.
- Added operator-only authenticated encrypted GIV backup, isolated native restore and exact verification. A shared snapshot captures Drizzle keyset row hashes and the public-schema dump. Signed inventories contain counts/hashes only. Unknown resources fail closed; provider schemas and ephemeral proof rows are excluded.
- Restore authenticates a private ciphertext copy before bootstrap, freshly proves owner/runtime binding, requires an empty inactive target and preserves public-schema ACLs. Native import is one transaction, with no clean/merge/publish/job path. Exact retained rows, counters/work/history, schema/RLS/grants and pgcrypto version must match; failures remain quarantined.
- Maintenance keys/owner connections stay outside Vercel; confirmations, disabled signer and absent scheduler keys are enforced. Native credentials are environment-only, remote trust follows verified TLS/CA policy, and output/errors are redacted.

## Checks actually executed

- Node 22.23.3 clean install, `check:all`, build, bundle/secrets/grants/docs and scratch Drizzle checks passed: 63 EN/FR keys, 35/35 current tables and 177.73 KiB gzip homepage. No dependency/schema/migration changed.
- Named PG17.5 round trips and repeated exact verification passed for all 34 retained tables, including selected pending/retry/running/DLQ work and permanent delivery/source keys. A final copy includes submitted incoming funds, refundable liability, unsent withdrawal holds and one open reorg review. Five own dashboards match source; reconciliation retains balanced journals, complete lineage and an inconsistent open review. Member staff access and unsigned scheduler ticks are rejected.
- Rejected missing/invalid environment and target confirmations, mainnet/Vercel/signing/scheduler enablement, wrong key, metadata/version/AEAD tamper, populated/active targets, copied-ID connection mismatch, output overwrite and unknown source tables/settings. Invalid authenticated inputs created no target tables. An authenticated, correctly signed corrupt-FK fixture produced a real post-data native failure; its transaction left no financial tables/rows and the fresh proof remained empty. Source verification still matched; no financial history was rewritten.
- A private-schema canary was absent from the decrypted-in-memory native dump; archive/inventory files were mode 600 and no plaintext file was saved. The first schema fingerprint comparison exposed PostgreSQL-name truncation and was corrected with text metadata names. Public-schema import initially conflicted with existing public; restore now skips only its CREATE SCHEMA TOC entry and retains ACL/data/policies. Failed copies/logs remain retained. Native list input draining was corrected before final acceptance.
- The full fresh M1 → integrity → jobs → recovery → incoming → reorg sequence and retention acceptance are historical v16 evidence; financial handlers were unchanged in this pass. No broad automated suite was added. Hosted Supabase/Upstash/Vercel, native remote TLS, real chains/signing/finality, large-dataset and full production recovery remain unrun.

## Remaining defects and blockers

- The owner confirms Supabase, Upstash and Vercel are not configured and defers their testing. CI checks can run now; deployment must remain disabled. See `SETUP.md` for enabling PR previews later.
- Existing simulation authentication trusts `x-sim-user`; it is not production identity. Sessions, CSRF, staff MFA, complete account-state handling and durable rate limiting remain incomplete. RLS covers only currently implemented tables/views; future resources need their own policies. Only simulation is supported.
- M0 binding/reset/cache defects above are fixed and verified in tooling; hosted provider/security acceptance still remains. RLS/provider portability is not yet verified on Supabase. M1 still needs hosted/provider and live recovery contracts; current isolated GIV restore passes in tooling. Compact browser/memory budgets and compatible Redis contracts passed; larger public/help budgets, business/digest aggregation, financial/notification/terminal-job archival, external alerts and long-worker heartbeat remain incomplete; bounded scheduler retention now passes in tooling. Legacy slot attribution may stay unverifiable and must remain reported; larger-dataset capacity remains unmeasured.

- No live verifier, isolated signer, native-gas accounting, real withdrawal/business settlement, or accepted extra chain adapter exists. Full product/admin/recovery features remain incomplete.
- PostgreSQL-specific exceptions include transaction-local role/context and permission metadata, parameterized locks/server clock, migration DDL/policies/grants, guarded maintenance locks/TRUNCATE, native backup/restore, exported snapshots and catalog fingerprints. Application table/view queries remain Drizzle-first. Bounded rank maintenance/read functions are an additional narrow PostgreSQL-specific exception; application queries still use Drizzle. Migration 009 rebuilds derived counters under maintenance locks.
- GitHub access works with existing authentication. Prior PRs #1–#15 are merged; this iteration must pass final-head checks before merging. Hosted credentials remain deferred by the owner.

## Exact next development pass

1. Finish this iteration's verified PR/merge, then continue unresolved M0/M1 provider and safe maintenance contracts. Preserve immutable financial/work history and retained failure evidence; never invent attribution or real-chain nonbroadcast proof.
2. Complete larger public/help cache contracts and remaining provider recovery contracts; further archival needs verified preservation/hold semantics; retain pending obligations. Use named manual acceptance and reconciliation. Hosted tests remain owner-deferred, so dependent gates cannot be claimed complete.

3. M2 identity/security and later real testnet adapters follow their prerequisite gates. No real signer, native gas, external alert or live provider acceptance exists yet.
4. When owner settings arrive, follow SETUP.md for hosted validation. The owner asks for continued iterations and best-recommendation decisions without routine questions, not fabricated credentials/results.

Each verified iteration updates this table and the self-contained prompt, advances both filenames and gets a merged PR. A stopped/usage-limited session requires a future session to resume; automatic resumption is not promised.

v17
