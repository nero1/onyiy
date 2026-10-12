# Project Status — Phase One

Updated: 12 October 2026. **34.65% complete / 65.35% remaining.** This is a weighted implementation estimate, not release permission. No milestone gate is newly declared complete.

| Milestone | Weight | Completion | Contribution | Verified evidence / remaining gate |
|---|---:|---:|---:|---|
| M0 — schema/config/runtime | 10% | 90% | 9.00% | Node 22, lockfile, clean install, typecheck/build and configuration checks pass; restricted runtime roles and RLS pass in tooling; hosted/security and remaining foundations remain. |
| M1 — GIV money/queues | 15% | 99% | 14.85% | Public-route happy path, replay/concurrency and rejected-spend protection pass in tooling; hosted/recovery/job acceptance remains. |
| M2 — identity/permissions | 15% | 15% | 2.25% | Own-row RLS and fresh staff role/status checks pass in tooling; OAuth/session/CSRF/TOTP/full status/rate-limit gates remain. |
| M3 — first testnet adapter | 15% | 0% | 0.00% | No accepted real-chain financial path. |
| M4 — responsive product | 15% | 42% | 6.30% | EN/FR review and identity flows verified; full product/offline/a11y acceptance remains. |
| M5 — admin/portability/recovery | 10% | 12% | 1.20% | Limited simulation administration; settings, priority, import/export and recovery gates remain. |
| M6 — remaining adapters | 8% | 0% | 0.00% | No additional accepted chain adapters. |
| M7 — bounded prototype release | 7% | 15% | 1.05% | Build and homepage JS budget pass; deployment, mobile measurements and provider quotas remain. |
| M8 — financial acceptance | 5% | 0% | 0.00% | Signer/alerts/caps/monitoring/restore evidence absent. |
| **Total** | **100%** | | **34.65%** | **65.35% remaining.** |

M1 rises to 99% for verified GIV reorg/referral contracts; hosted/full-restore gates remain. M4 rises to 42% for observed EN/FR financial-review behavior; M5 to 12% for immutable reviewed recovery. M0 remains 90%. No full milestone gate is accepted. Weighted total: 9 + 14.85 + 2.25 + 0 + 6.30 + 1.20 + 0 + 1.05 + 0 = 34.65.

## Completed this iteration

- PR #13 merged after final-head checks; merged-main checks passed.
- Added immutable GIV reorg review/resolution revisions, linked principal/loss and point corrections. Invalidations pause partition admissions and affected user/asset spends while preserving beneficiary liabilities, settled withdrawals, original allocations/tickets/cycle dates and permanent operation keys. Positive GIV reconfirmation appends inverse corrections without duplicate rights.
- Own scoped views expose invalidated valid-credit counts, completed-cycle/cooldown and later-admission review. Historical counts remain separate; earlier unrelated completion stays intact. EN/FR mobile notices are reachable and frozen withdrawal controls disable correctly.
- Added commit-time available/held/business-spend and admission guards, capped staff history and indexed source/own queries. Sorted participant locks cover direct gifts, invoice/referral and staff/reorg paths. Reconciliation reports unresolved reviews explicitly; safe GIV hold/refund recovery remains available.
- Fixed an existing referred-consent permission failure by locking only the joined referrer user, without broadening grants. Replaced the i18n regex with TypeScript property parsing after a reproduced colon-in-text false key; missing/duplicate keys still fail.

## Checks actually executed

- Node 22.23.3 `check:all`, build/bundle/secret checks passed: 63 EN/FR keys, 34/34 current tables, 177.73 KiB gzip homepage. Clean `npm ci` and final checks passed; no dependency changed.
- Fresh binding, migrations 001–016, seed and restricted runtime checks passed in disposable PG17.5. The full fresh public M1 → integrity → jobs → recovery → incoming → reorg sequence passed on the final referral-corrected build. Populated repeat migration/seed/binding checks passed with immutable history and an intentionally retained open review.
- Reorg procedure passed concurrent/case/input-bound replay, subsequent revision, source principal/point correction, valid-versus-historical receipts, completed/cooldown/later-dependency review, paused partition/spends, preserved settled/held liabilities, safe cancellation, exact reconfirmation and clean reconciliation after reviewed reconfirmation.
- Direct owner-role probes could not rewrite review/resolution history, spend frozen available, settle frozen held funds, admit into the paused partition or commit wrong compensation. Member/browser raw evidence and view privacy checks passed. A separate pending review remains deliberately open; fresh reconciliation reports it inconsistent, not an unexplained clean result.
- Real referral attribution on four new isolated users passed receiver/referrer overlap, exact point reversal/restoration and concurrent gift/reorg (the racing gift committed before the pause). The unrelated referral ancestor remained unfrozen. The first attempt reproduced `referral_codes` lock permission denial; it was retained and corrected before the complete fresh repeat.
- Chromium 390px EN/FR review/exception notices, frozen withdrawal controls and no header/horizontal clipping passed on the final build. Missing/duplicate language keys were rejected in named scratch observations; translated punctuation no longer creates false keys.
- No financial journal was edited or retained fixture reset. Prior stopped incoming/referral and earlier spend-race/negative-balance evidence remains intact. Hosted providers, real chains/signing, actual treasury loss/finality, external alerts, full restore and large-dataset/hosted capacity remain unrun.

## Remaining defects and blockers

- The owner confirms Supabase, Upstash and Vercel are not configured and defers their testing. CI checks can run now; deployment must remain disabled. See `SETUP.md` for enabling PR previews later.
- Existing simulation authentication trusts `x-sim-user`; it is not production identity. Sessions, CSRF, staff MFA, complete account-state handling and durable rate limiting remain incomplete. RLS covers only currently implemented tables/views; future resources need their own policies. Only simulation is supported.
- M0 binding/reset/cache defects above are fixed and verified in tooling; hosted provider/security acceptance still remains. RLS/provider portability is not yet verified on Supabase. M1 still needs hosted and full-restore/provider contracts. Compact browser/memory budgets and compatible Redis contracts passed; larger public/help budgets, business/digest/cleanup aggregation, external alerts, retention and long-worker heartbeat remain incomplete. Legacy slot attribution may stay unverifiable and must remain reported; larger-dataset capacity remains unmeasured.

- No live verifier, isolated signer, native-gas accounting, real withdrawal/business settlement, or accepted extra chain adapter exists. Full product/admin/recovery features remain incomplete.
- PostgreSQL-specific exceptions include transaction-local role/context and permission metadata, parameterized locks/server clock, migration DDL/policies/grants and guarded maintenance locks/TRUNCATE. Application table/view queries remain Drizzle-first. Bounded rank maintenance/read functions are an additional narrow PostgreSQL-specific exception; application queries still use Drizzle. Migration 009 rebuilds derived counters under maintenance locks.
- GitHub access works with existing authentication. Prior PRs #1–#13 are merged; this iteration must pass final-head checks before merging. Hosted credentials remain deferred by the owner.

## Exact next development pass

1. Finish this iteration's verified PR/merge, then continue unresolved M0/M1 isolated restore/provider contracts and safe maintenance. Preserve immutable financial/work history and retained failure evidence; never invent attribution or real-chain nonbroadcast proof.
2. Complete remaining bounded maintenance/retention and larger public/help cache contracts where needed; retain pending obligations. Use named manual acceptance and reconciliation. Hosted tests remain owner-deferred, so dependent gates cannot be claimed complete.

3. M2 identity/security and later real testnet adapters follow their prerequisite gates. No real signer, native gas, external alert or live provider acceptance exists yet.
4. When owner settings arrive, follow SETUP.md for hosted validation. The owner asks for continued iterations and best-recommendation decisions without routine questions, not fabricated credentials/results.

Each verified iteration updates this table and the self-contained prompt, advances both filenames and gets a merged PR. A stopped/usage-limited session requires a future session to resume; automatic resumption is not promised.

v15
