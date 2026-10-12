# Project Status — Phase One

Updated: 12 October 2026. **45.50% implemented / 54.50% remaining.** Weighted implementation estimate, separate from acceptance/release permission. No hosted/live financial gate is declared passed.

**Owner directive:** implement all M0–M8 irrespective of M1/M2 or earlier acceptance. Move toward 100% Phase One in as few substantial verified iterations as practical; do not wait for deferred acceptance to implement later milestones. Record unrun evidence separately and keep unverified live sending disabled. This direction is also in PRD §31.

| Milestone | Weight | Implementation | Contribution | Verified / remaining |
|---|---:|---:|---:|---|
| M0 — schema/config/runtime | 10% | 94% | 9.40% | 43 current tables/RLS/grants; native certificate/hostname checks; bounded caches/config. Hosted provider/capacity acceptance remains. |
| M1 — GIV money/queues | 15% | 99% | 14.85% | Fresh full 21-gift/integrity/jobs/recovery/incoming/reorg sequence passes; real-provider contracts remain. |
| M2 — identity/permissions | 15% | 75% | 11.25% | Cookie families, consent/CSRF, refresh/reuse, TOTP/recovery/step-up, rates/status/fences and OIDC verification implemented. Live Google, CAPTCHA, moderation/deletion and recovery administration remain. |
| M3 — first testnet adapter | 15% | 0% | 0.00% | Verifier/signer/gas/business settlement implementation remains. |
| M4 — responsive product | 15% | 47% | 7.05% | Actual EN/FR mobile onboarding/security and existing GIV review flows pass; full navigation/help/PWA/notifications/accessibility remain. |
| M5 — admin/portability/recovery | 10% | 19% | 1.90% | Encrypted restore retains sealed identity records but cannot resume sessions; full audited settings/priority/moderation/product portability remain. |
| M6 — remaining adapters | 8% | 0% | 0.00% | Named additional chain adapters remain. |
| M7 — bounded prototype release | 7% | 15% | 1.05% | Production JS budget/build pass; installable shell, deployment/mobile/provider measurements remain. |
| M8 — financial acceptance tooling | 5% | 0% | 0.00% | Isolated signer/alerts/caps/live recovery/monitoring acceptance implementation and evidence remain. |
| **Total** | **100%** | | **45.50%** | **54.50% implementation remains.** |

Calculation: 9.40 + 14.85 + 11.25 + 0 + 7.05 + 1.90 + 0 + 1.05 + 0 = 45.50. Hosted absence is not an implementation blocker; it remains an explicit acceptance dependency.

## Completed this iteration

- Continued from merged PR #18. Updated PRD and handover with the owner's faster, acceptance-independent execution direction and named identity-policy constants.
- Added migration 018/eight identity resources, native auth routes, signed cookie families, opaque refresh hashes/rotation and committed reuse revocation. Username headers alone have no authority. Separate operator fixture credentials are restricted to isolated simulation and prohibited on Vercel.
- Added Google state/nonce/PKCE, fixed HTTPS token/JWKS verification, provider+subject identity, closed username rules and pending signup. Browser consent requires current terms, unchecked age attestation and confirmed username; permanent grant/referral/points replay contracts stay intact.
- Added AES-GCM TOTP factors, pre-auth-only verification, durable monotonic/unique replay steps, ten hashed one-use recovery codes and live staff/withdrawal proof checks. Status/role changes revoke families and advance versions. Account/generation intent rejects delayed writes; financial completion fences preserve sorted participant locks and roll back revoked requests.
- Added durable atomic PostgreSQL rate counters, private-cache generation binding, cookie refresh/retry and EN/FR security/onboarding UI. Secrets/codes remain component-only, never storage. Anonymous users retain safe public plan browsing. Dynamic HTML receives fresh nonce CSP, strict-dynamic and closed provider/content policies; public API caches remain separate.
- Recovery now excludes session/refresh/PKCE/rate data, retains sealed factors/hashed recovery/replay/provider identities, and fingerprints all schema/RLS/grants. Existing version-bound archives remain untouched.

## Verification actually performed

- Named fresh identity HTTP probes passed: anonymous bootstrap, username spoof/cross-origin/CSRF rejection, pending denial, explicit consent/age, own access/member staff denial, account/generation mismatches, cookie gift/business-key replay, access rotation/reused-refresh family revocation, logout-all, TOTP replay/pre-auth isolation/recovery reuse, live staff expiry, ban/version changes and concurrent failed-attempt allowance.
- Generated RSA Google vectors passed issuer/audience/azp/nonce/email/signature/algorithm/expiry checks. This is not real Google consent/callback evidence.
- A real held-user-lock gift race with family revocation returned 401 and committed no journal/cycle/admission/request result. Restricted reader role could not read session/factor/recovery/identity tables. Live DB access/idle/absolute expiry rejected otherwise signed credentials; role change changed no financial journal.
- Fresh restricted-runtime full M1 sequence passed all six named scenarios: 21 gifts, integrity, jobs, withdrawal recovery, incoming exceptions and reorg/reconfirmation. Operator key is explicit; these financial fixture probes are separate from cookie identity evidence.
- Actual 390px Chromium EN/FR login/unchecked consent, enrollment/one-time code display, secrets absent from storage, logout purge, pre-auth reload, recovery login, account switch and bounded French layout passed. CSP/header/hydration verification is recorded with the final current build.
- Genuine SSL-enabled PostgreSQL/native dump/restore completed an exact encrypted round trip, observed pg_stat_ssl and rejected wrong CA, wrong hostname, untrusted system root, verification weakening and TLS-disable bypass. The correct CA/hostname succeeded despite ambient libpq variables. This is isolated native TLS evidence, not hosted Supabase/system-root positive acceptance.
- New encrypted identity restore verified 38 retained row inventories across 43 current schemas; four ephemeral auth tables were empty afterward, and retained factors decrypted only using the separate MFA key. Existing archives/failures/source money and open review were preserved.
- Final Node 22 clean-install/static/build/bundle/secret/Drizzle/grant/docs checks use the pinned lockfile; no dependency changed. 81 EN/FR keys, 43/43 current tables and 181.73 KiB gzip measured from actual production HTML. No broad automated suite was added.
- Initial missing signup grant, fixture Origin, scratch import, revocation date encoding and scratch browser account/label errors were fixed. Every failed fixture/log/archive remains retained; no financial evidence was rewritten.

## Remaining work and acceptance dependencies

Supabase/Upstash/Vercel and real Google credentials remain owner-deferred; deployments stay disabled. No real-chain verifier/signer/gas/business settlement or external alert exists yet. Full help/PWA/navigation, notification semantics, settings/priority/moderation/deletion, export/import and bounded identity cleanup remain implementation work. Provider absence must not stop their implementation or be reported as a passed check. Non-Vercel IP limits use a conservative shared fixture bucket; portable trusted-proxy integration and hosted HTTPS/cookies/CSP/IP verification remain unrun.

Recovery private keys stay outside backups; old revision archives require their matching code before reviewed upgrades. Authentication resources/archives are never product user exports. Read-only data and ledger/history remain separate from authority; retained failures, permanent business keys and pending liabilities are not cleanup targets.

## Exact next pass

Finish this iteration's exact-head push and PR checks, then merge. Continue immediately with a substantial M4/M5 pass: public help/search and PWA shell, product navigation/notification semantics, audited settings/priority controls and moderation/portability services. Then implement the required chain/verifier/signer/alert contracts while leaving unverified assets disabled. Do not wait for M1/M2 acceptance. Update the status/handover pair together to v21 and merge each completed checked iteration.

v20
