# Project Status

## Phase One progress

**Overall Phase One completion: 24%**  
**Remaining to 100%: 76%**

This is a weighted implementation-progress estimate against the PRD's M0–M8 observable exit criteria. It is not a release-readiness score and does not authorize real-money operation. Scaffolding without acceptance evidence receives only partial credit.

| Milestone | Weight | Current completion | Weighted contribution | Evidence summary |
|---|---:|---:|---:|---|
| M0 — schema/config/runtime | 10% | 75% | 7.50% | Next.js/Supabase/Drizzle foundation, migrations, config checks and CI structure exist; lockfile, dependency-resolved hosted build, fuller manifest/security/RLS/backup acceptance remain. |
| M1 — GIV money and queues | 15% | 65% | 9.75% | Core GIV grant, bootstrap queue, allocation, ledger, points and simulated withdrawal exist; hosted 21-gift/concurrency/idempotency/reorg acceptance remains. |
| M2 — identity/permissions | 15% | 8% | 1.20% | Simulation identity/consent basics exist; production OAuth/session/CSRF/TOTP/RLS/account-state/rate-limit controls are largely unimplemented. |
| M3 — first live testnet adapter | 15% | 0% | 0.00% | No accepted live testnet inflow→credit→withdrawal→settlement path yet. |
| M4 — responsive product | 15% | 30% | 4.50% | Responsive Next.js shell, EN/FR basics, themes and dashboard exist; full verified member flows, notification semantics, accessibility and remaining screens are incomplete. |
| M5 — admin/portability/recovery | 10% | 5% | 0.50% | Limited simulation/admin foundations exist; audited settings, imports/exports, recovery, priority operations and restore acceptance are incomplete. |
| M6 — remaining supported adapters | 8% | 0% | 0.00% | No additional accepted chain adapters. |
| M7 — bounded prototype release | 7% | 10% | 0.70% | Vercel/Supabase/Upstash deployment structure and docs exist; first verified live deployment, measured budgets and acceptance evidence remain. |
| M8 — financial adapter acceptance | 5% | 0% | 0.00% | Not started; depends on prior live adapter/release gates. |
| **Total** | **100%** |  | **24.15% → 24%** | **76% remains.** |

Recalculate this table after every development iteration using verified evidence only.

## Current state

Phase One is an early hosted simulation build, not a completed real-money release.

Current target stack:

- GitHub Actions → Vercel
- Supabase PostgreSQL
- Drizzle ORM
- Upstash Redis REST with deliberately low command usage
- browser persistence for safe public/user-scoped read snapshots
- mainnet and real signer disabled

## Implemented

- Next.js 16 App Router application with React client UI and native Next.js Route Handlers.
- Vercel/Next.js configuration and GitHub Actions preview/production deployment workflow, with native Vercel Git auto-deploy disabled.
- PostgreSQL schema/migrations/seeds with Supabase-aware GRANT classification.
- Drizzle schema covering all currently implemented application tables; application DB access is Drizzle-first.
- Simulation users, consent, one-time 5,000 GIV grant, referral code/points basics.
- Twelve seeded plans; admin activation; ten bootstrap entries; FIFO allocation; active/completed cycles.
- Integer-base-unit, append-only balanced ledger model and reconciliation endpoint.
- Simulation gift split, referral fallback, dummy GIV wallet, withdrawal quote/hold/settle.
- EN/FR responsive shell, themes, web manifest, and user-scoped browser persistence safeguards.
- Upstash REST cache adapter plus `ioredis`/compatible Redis support behind the cache interface.
- GitHub-upload-safe Next.js API filesystem layout: static Route Handler folders only, with public parameterized URLs preserved by rewrites.

## Incomplete / deferred

### M0

- `package-lock.json` is still missing because npm registry access timed out in the environment that produced the handoff.
- A dependency-installed `next build` has not yet been verified in this environment; GitHub/Vercel CI is the first full dependency-resolved build gate.
- The production workflow now runs Supabase migrations and Phase One seed data before the Vercel production build.
- `vercel.json` now disables Vercel native Git auto-deploy so GitHub Actions remains the deployment authority.
- Full manifest inventory, deployment security ceilings, RLS, backup/restore evidence and hosted acceptance remain incomplete.

### M1

Core GIV/queue behavior exists, but the 21-gift scenario still needs to be executed against the hosted Phase One Supabase environment and the observed results recorded here. More simulation exception/reorg/concurrency acceptance actions remain.

### M2

Google OAuth, signed access tokens, rotating refresh tokens, CSRF, TOTP/replay protection, recovery codes, session revocation, PostgreSQL RLS, full account-status behavior, moderation/appeals and durable route rate limits remain incomplete.

### M3+

No live/testnet payment verifier, chain RPC integration, isolated signer, native-gas accounting, real withdrawal broadcast, or business-settlement broadcast is implemented. Remaining UI/admin/export/help/share/recovery features are also incomplete.

## Validation already performed

Source-level checks passed for the current handoff:

- import-boundary/lint check,
- English/French key parity,
- manifest validation,
- secret scan,
- Drizzle table coverage: 18/18 current migrated application tables,
- Supabase migration GRANT classification,
- documentation checker regression: extra Markdown and version mismatch warn without failing,
- GitHub-upload filesystem scan: no repository path contains `[` or `]`,
- static rewrite-target verification for the three parameterized public API routes,
- TypeScript/TSX syntax transpile across 32 source/config files,
- JSON parse and relative-import existence checks.

A dependency-resolved build was not claimed because `npm install` timed out in the creation environment.

## Current repository/deployment issues

1. **No lockfile yet.** Keep `npm install --no-audit --no-fund` until `package-lock.json` is generated and committed, then switch CI/Vercel to `npm ci`.
2. **First hosted build still needs real provider secrets.** GitHub/Vercel must be configured exactly as `docs/SETUP.md` describes before the production workflow can migrate Supabase or deploy successfully.
3. **Supabase GRANT discipline remains mandatory.** Every new public-schema table migration needs an explicit least-privilege grant classification.
4. **Redis free-tier discipline remains mandatory.** Do not add Upstash calls to ordinary component/read paths without a measured reason. PostgreSQL remains authoritative and safe browser/in-process caching should absorb routine reads.

5. **GitHub web-upload compatibility fixed.** The previous Next.js catch-all filesystem route `app/api/v1/[...path]/` caused GitHub's browser uploader to reject the bracketed folder. The repository now contains only static route folders. Public dynamic API URLs are preserved through `next.config.ts` rewrites into static internal Route Handlers. There are no `[` or `]` characters in repository path names.

## Next development pass

1. Configure Supabase, Upstash, Vercel, and GitHub secrets exactly as `docs/SETUP.md` describes.
2. Push `main` and obtain the first successful live Next.js/Vercel deployment.
3. Generate and commit `package-lock.json`, then switch install steps to `npm ci`.
4. Record the live deployment/build result here.
5. Run the M1 21-gift simulation against an isolated hosted Phase One environment and record the result.
6. Finish M0 hardening, then M1 concurrency/idempotency acceptance, then M2 identity/security.

## Documentation rule

Keep these as the core handoff documents:

- `docs/PRD.md`
- `docs/SETUP.md`
- `docs/HOW-IT-WORKS.md`
- the current `docs/PROJECT-STATUS_vN.md`
- the current `docs/LLM-HANDOVER_vN.md`

The version is intentionally visible in the filenames. This iteration uses `_v1`. Keep progress, known issues, validation results, blockers, deviations, completion percentages, and the exact next task in the current project-status file whenever practical. Additional Markdown files are allowed when useful and must not fail CI solely because they exist.

The current handover file contains the self-contained prompt for the next LLM. At the end of a completed development iteration, replace its contents with the next self-contained prompt **and rename both current handoff files to the next version suffix**. For example, this baseline pair:

- `PROJECT-STATUS_v1.md`
- `LLM-HANDOVER_v1.md`

The next completed iteration becomes:

- `PROJECT-STATUS_v2.md`
- `LLM-HANDOVER_v2.md`

Prefer keeping only the current pair unless the owner explicitly asks to preserve historical versions. Version mismatch or extra Markdown files must not fail CI/deployment.

## Continuation rule for developers/LLMs

Treat `docs/PRD.md` as the product authority and the highest/current `docs/PROJECT-STATUS_vN.md` as the implementation-state authority. Use the matching/current `docs/LLM-HANDOVER_vN.md` as the self-contained continuation prompt. Inspect the repository before claiming a feature exists. Preserve integer money, balanced append-only accounting, idempotency, server-authoritative queueing, simulation/testnet/mainnet isolation, Drizzle-first data access, provider portability, isolated signer secrets, user-requested withdrawals, and least-privilege Supabase access.

At the end of every completed iteration, recalculate the weighted Phase One percentage, update the status file, replace the handover prompt, and advance the filename suffix from `_vN` to `_v(N+1)`. The final line inside each file may mirror the same `vN` for convenience, but the filename is the primary visible version indicator.

v1
