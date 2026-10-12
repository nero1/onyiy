# Project Status — Phase One

Updated: 12 October 2026. **25% complete / 75% remaining.** This is a weighted implementation estimate, not release permission. No milestone gate is newly declared complete.

| Milestone | Weight | Completion | Contribution | Verified evidence / remaining gate |
|---|---:|---:|---:|---|
| M0 — schema/config/runtime | 10% | 80% | 8.00% | Node 22, lockfile, clean install, typecheck/build and configuration checks pass; hosted providers, full manifest/security and rollback acceptance remain. |
| M1 — GIV money/queues | 15% | 65% | 9.75% | Earlier isolated tooling scenario balanced 21 gifts through direct routes; hosted public-route, replay/concurrency and failure acceptance remain. |
| M2 — identity/permissions | 15% | 8% | 1.20% | Simulation identity/consent baseline; OAuth/session/CSRF/TOTP/RLS/status/rate-limit gates remain. |
| M3 — first testnet adapter | 15% | 0% | 0.00% | No accepted real-chain financial path. |
| M4 — responsive product | 15% | 30% | 4.50% | Existing responsive EN/FR/theme/dashboard baseline; full browser/manual acceptance remains. |
| M5 — admin/portability/recovery | 10% | 5% | 0.50% | Limited simulation administration; settings, priority, import/export and recovery gates remain. |
| M6 — remaining adapters | 8% | 0% | 0.00% | No additional accepted chain adapters. |
| M7 — bounded prototype release | 7% | 15% | 1.05% | Build and homepage JS budget pass; deployment, mobile measurements and provider quotas remain. |
| M8 — financial acceptance | 5% | 0% | 0.00% | Signer/alerts/caps/monitoring/restore evidence absent. |
| **Total** | **100%** | | **25.00%** | **75.00% remaining.** |

M0 increased from 75% for reproducible installation and a verified build; M7 increased from 10% for executable CI and measured initial JS. Other estimates are retained from the baseline, with their incomplete acceptance gates explicit.

## Completed this iteration

- Added `package-lock.json`, pinned Node 22.23.3 and Vercel CLI 63.1.2; switched Vercel/CI to `npm ci` after it succeeded.
- Fixed the `ioredis` adapter type mismatch using the two supported `set` signatures; production type checking stays enabled.
- Added the previously absent `.github/workflows/ci-vercel.yml`. Push/PR/manual checks need no provider credentials. Deployment is off by default; `ENABLE_VERCEL_DEPLOYMENTS=true` enables protected same-repository PR previews and `main` production deployments. Fork PRs get checks only.
- Added configuration/lockfile/path validation and homepage bundle measurement. Runtime rejects unimplemented testnet/mainnet and unsupported simulation provider selectors.
- Preserved bracket-free routes; UUID resolution prefers the public path over a query override, fixing the source of the observed rewrite failure. Hosted scenario verification is still pending.
- Added generated-output/secret-file exclusions; source and browser credential scanning remain active. TypeScript caches no longer trigger false 64-hex findings.
- Updated the living PRD, hosted setup and architecture guide; replaced the handover pair with v2. No automated test suite or additional setup guide was added.

## Checks actually executed

| Check | Result |
|---|---|
| `npm ci --no-audit --no-fund` | Passed with the v2 manifest and lockfile. |
| `npm run check:all` | Passed: route types/TypeScript, import lint, EN/FR parity (42 keys), manifest, Drizzle coverage (18/18), grants, docs, secrets, static deployment configuration. |
| `npm run build` | Passed with production type checking and four page-data workers; also passed with dummy credential/address canaries. |
| `npm run check:bundle` | Passed: homepage 175.23 KiB gzip, seven scripts, 200 KiB budget. Function packaging, LCP, latency and quotas are unmeasured. |
| Available Git history scan | Passed credential-pattern scan across three pre-iteration commits; heuristic coverage is not exhaustive. |
| Browser artifact canary inspection | Passed: both dummy secret/address values absent from client JS and homepage HTML. Does not replace live secret/history review. |
| `npm run check:secrets` after build | Passed for source and generated browser credential patterns. Build hashes excluded from generic 64-hex heuristics. |
| Workflow YAML and `actionlint` 1.7.7 | Passed; official release checksum verified. ShellCheck unavailable. GitHub push and PR checks passed for code commit `255c5ba`; deployment skipped as intended (runs [38188971863](https://github.com/nero1/onyiy/actions/runs/38188971863) and [38188983698](https://github.com/nero1/onyiy/actions/runs/38188983698)). |
| Manual configuration acceptance | Four PostgreSQL selectors accepted; five unimplemented/live settings and an invalid split rejected. No provider connections attempted. |
| `npm run db:check` | Passed using a config-only `.invalid` URL; no connection/migration applied. First attempt without configuration failed as expected. This does not validate SQL migration execution. |
| Hosted configuration preflight | Correctly failed on missing `DATABASE_URL`. Hosted connectivity, migration/seed and 21-gift scenario unrun. |
| Production server without hosted bindings | Homepage HTTP 200; health HTTP 503 (`misconfigured`); public rewritten activation route rejects unauthenticated access with HTTP 401. These are runtime smoke checks, not database acceptance. |

Earlier onboarding evidence: an isolated tooling PostgreSQL migration/seed and direct-route 21-gift run passed (ten fulfilled bootstrap entries, one first-member credit, balanced journals). The original public-route scenario failed on `INVALID_INPUT`. This iteration corrects its ID resolution but does not present that earlier run as hosted acceptance. The owner has requested hosted-first development; no Docker/local-PostgreSQL flow is added to the repository or setup guide.

## Remaining defects and blockers

- The owner confirms Supabase, Upstash and Vercel are not configured and defers their testing. CI checks can run now; deployment must remain disabled. See `SETUP.md` for enabling PR previews later.
- Existing simulation authentication trusts `x-sim-user`; it is not production identity. Sessions, CSRF, staff MFA, RLS, account-state handling and durable rate limiting remain incomplete. Only simulation is supported.
- M0 still lacks the complete DB-authoritative manifest inventory/projection, security ceilings, rollback and hosted provider acceptance. M1 still needs public-route hosted verification, replay/concurrency, rejected-withdrawal and exception/reorg acceptance. Review seed preservation and reset safety before applying them beyond isolated simulation.
- No live verifier, isolated signer, native-gas accounting, real withdrawal/business settlement, or accepted extra chain adapter exists. Full product/admin/recovery features remain incomplete.
- Raw-SQL exceptions currently include parameterized row locks in `server/core.ts`, SQL migration DDL/GRANTs, and simulation-only TRUNCATE tooling. Drizzle SQL expressions implement aggregates/order/counters; no new raw application SQL is added here. Keep exceptions narrow and document/refactor them as M0 hardening proceeds.
- Initial GitHub API calls returned a proxy CONNECT 403. Later requests succeeded with existing authentication: [PR #1](https://github.com/nero1/onyiy/pull/1) was created and its checks passed. No token was requested. The iteration is delivered through that PR, with merge permitted only after the final head checks pass. Hosted credentials are still deferred by the owner.

## Exact next development pass

1. Verify PR #1's delivery/merge state, then use the same pull-request workflow for subsequent changes. The owner explicitly requests a PR and merge each iteration.
2. Continue credential-free M0 hardening: complete manifest authority/public projection, preserve seeded settings, verify deployment ceilings and rollback behavior. Keep simulation usable and hosted acceptance pending; do not advance to M2/M3 while earlier gates remain unresolved.
3. When the owner supplies hosted settings, follow only `SETUP.md`, enable PR previews, record the first real CI/Vercel deployment, then run M1 on a fresh isolated hosted simulation database.
4. Complete M1 replay/concurrency and failure acceptance, then M2 identity/security. Testnet integrations come after those gates.

Every completed iteration must update this estimate, replace the self-contained handover, advance both filenames together, and keep results distinct from unrun checks.

v2
