# Project Status — Phase One

Updated: 12 October 2026. **52.55% implemented / 47.45% remaining.** Weighted implementation estimate, separate from acceptance/release permission. No hosted/live financial gate is declared passed.

**Owner directive:** implement all M0–M8 irrespective of M1/M2 or earlier acceptance. Move toward 100% Phase One in as few substantial verified iterations as practical; do not wait for deferred acceptance to implement later milestones. Record unrun evidence separately and keep unverified live sending disabled. This direction is also in PRD §31.

| Milestone | Weight | Implementation | Contribution | Verified / remaining |
|---|---:|---:|---:|---|
| M0 — schema/config/runtime | 10% | 95% | 9.50% | 46 schema resources/RLS/grants; strict TLS and bounded config/caches. Hosted acceptance remains. |
| M1 — GIV money/queues | 15% | 99% | 14.85% | Fresh six financial scenarios pass; provider contracts remain. |
| M2 — identity/permissions | 15% | 80% | 12.00% | Cookie/MFA/security plus live renewal, entitlement and cross-tab fences. Moderation/deletion, CAPTCHA and live Google remain. |
| M3 — first testnet adapter | 15% | 0% | 0.00% | Verifier/signer/gas/business settlement implementation remains. |
| M4 — responsive product | 15% | 65% | 9.75% | EN/FR help/search, installable public offline shell, inbox, responsive admin and account switching verified. Full routes/history/referrals/receipts/accessibility remain. |
| M5 — admin/portability/recovery | 10% | 40% | 4.00% | Audited typed settings, help publication and queue priority; encrypted 41-table retained restore. Moderation and product portability remain. |
| M6 — remaining adapters | 8% | 0% | 0.00% | Named additional chain adapters remain. |
| M7 — bounded prototype release | 7% | 35% | 2.45% | Closed public PWA shell, budget/build pass. Deployment/mobile/provider measurements remain. |
| M8 — financial acceptance tooling | 5% | 0% | 0.00% | Isolated signer/alerts/caps/live recovery/monitoring implementation and evidence remain. |
| **Total** | **100%** | | **52.55%** | **47.45% implementation remains.** |

Calculation: 9.50 + 14.85 + 12.00 + 0 + 9.75 + 4.00 + 0 + 2.45 + 0 = 52.55. Hosted absence is not an implementation blocker; it remains an explicit acceptance dependency.

## Completed this iteration

- Continued from merged PR #19. Owner direction remains in PRD §31 and every handover: continue every milestone irrespective of earlier acceptance.
- Migration 019 adds help/redirect/view resources and priority revisions. Help is published plain EN/FR text with local accent-folded search, permanent ID-backed slug redirects, draft privacy, editor CAS, audit reasons and permanent payload-bound replay. Public queries cap 100 articles per locale, 20,000 characters per body, 3 MiB and five seconds; admin lists omit bodies and fetch one editor body lazily.
- Added a closed five-asset public service-worker shell, install/update controls and offline public catalog/help from bounded IndexedDB. Authenticated HTML/API responses, tokens, balances and mutations never enter the worker cache; offline writes fail and are not queued.
- Added own signed-keyset notification pagination, exact PostgreSQL microsecond ordering, list-seen badge independent of individual read state and a bounded mobile inbox. Cross-owner and cursor tamper attempts fail.
- Added audited revisioned typed settings with whole-policy/security-ceiling validation; direct dynamic asset/plan editing remains excluded. Priority enable/revoke takes partition/entry locks and keeps display tickets and money unchanged. Disabled admin is read-only; other new feature routes disappear/404.
- Added live terms/age renewal projection and gift blocking; disabled dashboard/wallet-link/gift entitlements fail before financial effects. First consent on a seeded active staff account now receives its single permanent grant. Browser loading cannot discard newly displayed enrollment secrets/codes.
- Cross-tab account changes purge earlier private views; same-family bootstrap keeps other tabs valid. Delayed 401 retry retains the captured family generation and cannot retry under a fresh same-account login or purge its snapshot.

## Verification actually performed

- All six named financial scenarios passed on fresh isolated migration-019 data, without a reset. Cookie product API probes passed published EN/FR/ETag privacy, audited settings replay/conflicts/invalidation, help rename/draft/replay, own inbox/cursor/read/seen and priority rank/revision/revoke/reconciliation.
- Separate exact-microsecond fixtures passed cursor and seen-marker ordering within the same millisecond. Disabled help/notifications/PWA/priority/admin behavior passed; policies restored and reconciliation unchanged.
- Actual 390px Chromium passed EN/FR search, five-asset cache inventory, public-only offline navigation after a real fixture transport outage, failed unqueued writes, inbox geometry/seen/read and staff consent/MFA/admin editors. Two actual tabs passed same-family bootstrap then staff-to-member private-view purge. A named browser client-library delayed-401 fixture rejected changed-family retry and retained the newer snapshot.
- Live cookie terms renewal rejected the old version, accepted the exact current text/age, added no grant/journal and retained balances. Disabled member dashboard/wallet/gift permissions rejected before financial effects. Original policies were restored.
- Encrypted roundtrip verified 41 retained inventories and 46 schema fingerprints with ephemeral authentication state excluded; earlier archives/logs/failed fixtures and monetary evidence remain untouched.
- Node22 checks/build/actual-HTML bundle pass: 107 matching EN/FR keys, 46/46 Drizzle schemas, 190.19 KiB gzip across nine homepage scripts. Final pinned clean install and grant/secret/docs checks recorded with this commit. No dependencies or broad automated suite were added.
- Corrected observed defects: member-context manifest access for inbox, PostgreSQL prepared timestamp rounding, mobile inbox overflow, enrollment during transient loading, new-tab scope purge and late response family switching. Scratch probe errors and failed attempts remain preserved.

## Remaining work and acceptance dependencies

Supabase/Upstash/Vercel and real Google remain owner-deferred; deployments and real sending remain disabled. Chain verifier/signer/gas/business settlement/alerts are implementation work. Moderation/status/deletion/recovery administration, product exports/imports, plan CRUD/bootstrap, complete routes/referrals/history/receipts, CAPTCHA and bounded identity cleanup also remain. No hosted/live financial gate is passed; simulation and browser contract evidence is not provider acceptance.

Recovery private keys stay outside backups; old revision archives require matching code before reviewed upgrades. Authentication resources/archives are not product exports. Retained failures, permanent business keys and pending liabilities are never cleanup targets.

## Continue immediately

Complete this iteration's exact-head push and PR checks and merge. Proceed with substantial moderation/portability/full product and chain/verifier/signer/alert contracts without waiting for M1/M2 acceptance. Advance both docs to v22 after the next verified iteration, preserve this directive and merge every completed iteration.

v21
