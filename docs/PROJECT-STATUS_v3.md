# Project Status — Phase One

Updated: 12 October 2026. **26.25% complete / 73.75% remaining.** This is a weighted implementation estimate, not release permission. No milestone gate is newly declared complete.

| Milestone | Weight | Completion | Contribution | Verified evidence / remaining gate |
|---|---:|---:|---:|---|
| M0 — schema/config/runtime | 10% | 85% | 8.50% | Node 22, lockfile, clean install, typecheck/build and configuration checks pass; hosted providers, hosted acceptance, RLS/security and remaining foundation gates remain. |
| M1 — GIV money/queues | 15% | 70% | 10.50% | Public-route 21-gift scenario passes in isolated tooling; hosted, replay/concurrency and failure acceptance remain. |
| M2 — identity/permissions | 15% | 8% | 1.20% | Simulation identity/consent baseline; OAuth/session/CSRF/TOTP/RLS/status/rate-limit gates remain. |
| M3 — first testnet adapter | 15% | 0% | 0.00% | No accepted real-chain financial path. |
| M4 — responsive product | 15% | 30% | 4.50% | Existing responsive EN/FR/theme/dashboard baseline; full browser/manual acceptance remains. |
| M5 — admin/portability/recovery | 10% | 5% | 0.50% | Limited simulation administration; settings, priority, import/export and recovery gates remain. |
| M6 — remaining adapters | 8% | 0% | 0.00% | No additional accepted chain adapters. |
| M7 — bounded prototype release | 7% | 15% | 1.05% | Build and homepage JS budget pass; deployment, mobile measurements and provider quotas remain. |
| M8 — financial acceptance | 5% | 0% | 0.00% | Signer/alerts/caps/monitoring/restore evidence absent. |
| **Total** | **100%** | | **26.25%** | **73.75% remaining.** |

M0 increases to 85% for configuration authority and observed rollback/preservation; M1 increases to 70% for the corrected public-route scenario. No gate is declared complete. Other milestone estimates are retained.

## Completed this iteration

- Added the closed Phase One settings registry: 67 static keys plus typed plan/asset/risk keys. Canonical scopes exclude simulation, auth, finance and operational policies from public output; nested extras, secret URLs and platform-address content are rejected.
- Financial services reload validated database configuration inside their transaction. Public manifest uses a safe projection, ETag/CDN TTL and public seed fallback; that fallback cannot authorize writes. Unknown legacy keys are quarantined.
- Seeds now execute atomically and preserve disabled assets, plan edits and database settings. Prices/templates/splits/terms/point rules use their configured sources. Metadata migration 002 corrects legacy simulation scope without changing values.
- Each migration file runs transactionally. Reset now requires an explicit simulation environment, target confirmation and enabled policy, and rejects production/non-simulation data under maintenance locks.
- Decimal conversion uses integer parsing, including values beyond JavaScript's safe integer range. Active plan configuration is synchronized on activation; repeated activation is a no-op.
- Updated architecture/setup and reconciled the PRD job retry default to the six attempts already required by §11.1. The owner authorizes continued iterations with routine decisions made autonomously.

## Checks actually executed

- `check:all`, dependency-resolved production build, post-build secret scan and bundle check passed; homepage JavaScript is **175.30 KiB gzip** against 200 KiB. No new dependency or automated test suite was added.
- Existing PostgreSQL tooling was used in a separately created disposable database; no new Docker/service/setup flow was introduced. Migrations 001/002 succeeded. An intentionally failing migration rolled back its preceding policy write.
- A seed rejected by a tighter deployment ceiling left zero manifest rows. Repeated seeds preserved a disabled asset, an edited plan and a 48-hour DB cooldown. The runtime validated 81 settings (67 static + 14 dynamic); an unknown legacy row was excluded.
- Manual schema/configuration checks rejected extra nested fields, wrong scopes, credential-bearing URLs, relaxed/invalid hard ceilings and excess money precision. Exact `0.29`, values above JS safe integer range, negative formatting and the $100 points boundary passed.
- `/manifest` used the DB's 48-hour cooldown, excluded staff/private/legacy settings and returned 304 for its ETag. The original public-route M1 scenario passed against fresh disposable PostgreSQL: 21 gifts, ten fulfilled bootstrap positions, one first-member credit and balanced journals. Active plan DTO reflected the real activation and amount.
- Reset refused missing environment/confirmation, production context, disabled DB policy and a non-simulation asset; refused resets preserved ledger rows. A explicitly confirmed reset succeeded only in the disposable simulation database.
- Earlier reproducible install/Actions/bundle/canary checks remain recorded in PR #1, which was verified merged. Hosted Supabase/Upstash/Vercel acceptance remains **unrun**, not replaced by tooling validation.

## Remaining defects and blockers

- The owner confirms Supabase, Upstash and Vercel are not configured and defers their testing. CI checks can run now; deployment must remain disabled. See `SETUP.md` for enabling PR previews later.
- Existing simulation authentication trusts `x-sim-user`; it is not production identity. Sessions, CSRF, staff MFA, RLS, account-state handling and durable rate limiting remain incomplete. Only simulation is supported.
- M0 still needs hosted provider/security/RLS acceptance. Typed future policies are not proof their services exist. M1 still needs replay/concurrency, rejected-withdrawal and exception/reorg acceptance. The current withdrawal confirmation does not serialize a user’s balance across different quotes; quote retries also do not reject changed inputs. These are the next concrete bugs to fix.
- No live verifier, isolated signer, native-gas accounting, real withdrawal/business settlement, or accepted extra chain adapter exists. Full product/admin/recovery features remain incomplete.
- Raw-SQL exceptions currently include parameterized row locks in `server/core.ts`, SQL migration DDL/GRANTs, and simulation-only maintenance locks/TRUNCATE tooling. Drizzle SQL expressions implement aggregates/order/counters; no new raw application SQL is added here. Keep exceptions narrow and document/refactor them as M0 hardening proceeds.
- Initial GitHub API calls returned a proxy CONNECT 403. Later requests succeeded with existing authentication: [PR #1](https://github.com/nero1/onyiy/pull/1) was created and its checks passed. No token was requested. The iteration is delivered through that PR, with merge permitted only after the final head checks pass. Hosted credentials are still deferred by the owner.

## Exact next development pass

1. Finish this iteration's verified PR/merge, then continue M1 hardening: transaction-bound account/asset/feature eligibility, serialized balance reservation across quotes, request-key/body conflict detection and concurrent cycle limits.
2. Run named manual replay/concurrency/withdrawal scenarios in a disposable simulation database. Fix diagnosed defects and update evidence; do not add a broad automated test program.
3. Continue remaining M0/M1 work before M2 identity/security. Hosted acceptance remains a prerequisite to claiming the gates passed; real provider settings are deferred by the owner.
4. When settings arrive, follow SETUP.md for the first hosted deployment and isolated hosted M1 acceptance. Do not enable mainnet or implement real signing ahead of its milestone.

Continue toward Phase One completion and then defect fixing, choosing reasonable recommendations without asking routine questions. Never invent credentials or results. Each verified iteration gets its updated versioned pair and a merged PR. Runtime/usage interruption requires a future session to resume from the handover; automatic resumption is not promised.

v3
