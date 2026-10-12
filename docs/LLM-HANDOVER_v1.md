# LLM Handover — Continue Building Gifters World

You are the next implementation LLM for **Gifters World Phase One**. Work directly from this repository and continue the build from its current verified state.

## Authority and reading order

Before changing code, read these files in this order:

1. `docs/PRD.md` — authoritative product and engineering requirements.
2. `docs/PROJECT-STATUS_v1.md` — authoritative implementation progress, known issues, validation results, completion percentage, and current next task for this baseline.
3. `docs/SETUP.md` — authoritative hosted deployment/setup instructions.
4. `docs/HOW-IT-WORKS.md` — concise technical architecture and operational behavior.
5. This file — the continuation instructions for this iteration.

Then inspect the actual repository. Documentation does not prove a feature exists. Never claim something is implemented, tested, deployed, or working unless you verified it.

## Current stack that must be preserved

- **Next.js 16 App Router** for the application and native Route Handlers.
- **Vercel** for the web application and lightweight API runtime.
- **GitHub Actions** as the CI/CD deployment authority for Vercel.
- **Supabase PostgreSQL** as the primary hosted database.
- **Drizzle ORM** as the canonical application data-access layer, targeting effectively 100% application-query coverage.
- Compatible PostgreSQL hosts must remain possible without changing domain logic.
- **Upstash Redis REST** as the default Redis/cache provider, with deliberately low command usage.
- `ioredis` and compatible Redis providers remain supported behind the cache adapter.
- PostgreSQL remains authoritative. Redis must never be required for financial correctness.
- The real signer remains isolated from Vercel/API secrets and is implemented only when the PRD milestone allows it.
- Mainnet remains disabled until all required release gates are satisfied.

Do not reintroduce Vite, Hono, Docker, nginx, a local-first setup flow, Neon as the hosted default, or Cloudflare as the primary deployment target unless the PRD is explicitly changed by the owner.

Keep repository path names GitHub-browser-upload-safe. Do not introduce bracketed Next.js filesystem segments such as `[id]`, `[...path]`, or `[[...slug]]`. Preserve parameterized public URLs through static Route Handler folders plus `next.config.ts` rewrites or another bracket-free approach.

## Non-negotiable engineering invariants

Preserve all PRD invariants, especially:

- The server enforces identity, permissions, eligibility, plan prices, queue order, and every money transition.
- Authoritative money uses integer asset base units; never use JavaScript floating point for money.
- Every value movement uses balanced, append-only ledger postings.
- Corrections use compensating entries; never rewrite financial history.
- Every mutation is idempotent. Retries must not duplicate gifts, slots, commissions, points, holds, payouts, or transfers.
- Simulation, testnet, and mainnet data/configuration remain isolated.
- GIV is simulation-only and cannot be redeemed or exported on-chain.
- Display queue order and actual serving order remain separate concepts.
- A payer must never receive their own incoming allocation.
- Withdrawals remain explicitly user-requested.
- Provider SDKs stay behind adapters; domain modules do not depend on vendor SDKs.
- Platform addresses, credentials, private keys, signer material, auth secrets, and tokens never enter source code, manifests, browser bundles, logs, committed docs, or exports.
- Supabase public-schema migrations must contain explicit, least-privilege GRANT classification in the same migration that creates a table.
- Do not broadly grant financial, ledger, queue, payout, identity, audit, or admin tables to `anon` or `authenticated` merely to satisfy the Supabase Data API.
- Application table access must remain Drizzle-first. Raw SQL is only for narrowly documented PostgreSQL-specific operations allowed by the PRD.
- Keep Upstash calls minimal. Do not add Redis to ordinary component reads when PostgreSQL, safe HTTP/CDN caching, request coalescing, or in-process caching is sufficient.

## Hosted-only development/deployment model

The owner wants the project developed toward the actual hosted system. `docs/SETUP.md` is the only setup guide and must focus on what is necessary to make the site live through:

**GitHub → GitHub Actions → Vercel + Supabase PostgreSQL + Upstash**

Do not add Docker/local-Postgres setup tutorials or parallel setup documents.

## Documentation rules

Use these as the core handoff documents:

- `docs/PRD.md`
- `docs/SETUP.md`
- `docs/HOW-IT-WORKS.md`
- the current `docs/PROJECT-STATUS_vN.md`
- the current `docs/LLM-HANDOVER_vN.md`

Additional Markdown files are allowed when genuinely useful and must not fail CI solely because they exist. Avoid scattering routine progress, build notes, TODOs, acceptance results, or handoff information across new docs; keep that material in the current project-status/handover pair whenever practical.

Use them as follows:

- Update `PRD.md` only when product/engineering requirements themselves change. It is fluid and should read as one current specification, with no change-history commentary.
- Update `SETUP.md` only when hosted setup/deployment instructions change. This is the only document that should be comprehensive and beginner-friendly.
- Update `HOW-IT-WORKS.md` when implemented technical behavior or architecture changes.
- Update the current `PROJECT-STATUS_vN.md` **every iteration** with verified progress, issues, checks, blockers, next work, and the recalculated Phase One percentage.
- Replace the contents of the current `LLM-HANDOVER_vN.md` **every iteration** with the exact self-contained prompt the next LLM should use.

### Filename versioning rule

The filename is the primary visible version indicator.

This repository starts at:

- `docs/PROJECT-STATUS_v1.md`
- `docs/LLM-HANDOVER_v0.md`

At the end of each completed development iteration:

1. Recalculate and update the project-status content.
2. Replace the handover content with the next LLM's self-contained prompt.
3. Rename **both** files to the next suffix: `_v0` → `_v1`, `_v1` → `_v2`, and so on.
4. Update references inside the current docs to point to the new filenames where necessary.
5. Prefer removing the superseded pair so the repository normally contains only the current status/handover pair, unless the owner explicitly asks to retain history.
6. A version mismatch or extra Markdown file may produce a warning but must not by itself fail CI or deployment.

The final line inside each file may mirror the filename version (`v0`, `v1`, etc.) for convenience, but do not require the user to open the file to determine its version.

For this v1 handover, your completed iteration should normally leave `PROJECT-STATUS_v2.md` and `LLM-HANDOVER_v2.md`.

## Phase One progress rule

The current `PROJECT-STATUS_vN.md` contains a weighted M0–M8 progress table whose milestone weights total 100%. At the end of the iteration:

1. reassess each milestone against the PRD's observable exit criteria,
2. update each milestone completion percentage using only verified implementation/acceptance evidence,
3. recompute the weighted overall Phase One percentage,
4. show both **overall complete** and **remaining to 100%**,
5. do not inflate progress for files/scaffolding that have not passed their milestone gate.

The completion percentage is an implementation-progress estimate, not permission to release real money functionality.

When Phase One reaches a verified **100%**, do not invent more Phase One work. Update the current `PROJECT-STATUS_vN.md` to 100% complete / 0% remaining, record the final acceptance evidence, and replace this file with a short completion handover stating that Phase One is complete and that further work requires the owner's next instruction. Still advance the current status/handover filename suffixes for that final iteration.

## What to do in this iteration

Start with the exact **Next development pass** in the current `docs/PROJECT-STATUS_vN.md` (for this baseline, `docs/PROJECT-STATUS_v1.md`). Do not skip ahead to attractive later features while earlier milestone gates remain unresolved.

Current priority order is:

1. Get the repository through a real dependency-resolved install/build in a normal networked environment.
2. Generate and commit `package-lock.json`; switch CI install steps from `npm install` to `npm ci` only after the lockfile exists and succeeds.
3. Configure/verify the hosted Supabase, Upstash, Vercel, and GitHub CI contract from `docs/SETUP.md`.
4. Achieve and verify the first live Vercel Phase One deployment.
5. Run and record the hosted M1 21-gift simulation and reconciliation evidence.
6. Harden M0/M1 until their PRD exit criteria pass.
7. Then complete M2 identity/authorization/security before beginning M3 live testnet financial integration.

If earlier work in the repository has already completed one of these steps, verify it and proceed to the next unresolved item rather than repeating work unnecessarily.

## Required checks during the iteration

Run the repository's available checks after relevant changes. At minimum, when applicable:

- install dependencies,
- `npm run check:all`,
- `npm run build`,
- Drizzle/migration checks,
- Supabase GRANT classification check,
- translation parity,
- import/server-client boundaries,
- secret scan,
- hosted migration/seed verification,
- applicable manual milestone scenarios.

Do not claim a check passed if it was not executed. If tooling/network/provider credentials prevent a check, state that explicitly in the current `PROJECT-STATUS_vN.md` and continue with everything that can be completed safely.

The MVP intentionally does not require a broad automated unit/E2E/load/penetration suite. Follow the PRD's simulator/manual acceptance approach instead of inventing a large test program.

## Supabase and migration requirements

For every new `public` table, classify Data API access explicitly in the same migration. Example syntax may use:

```sql
grant select on public.example to anon;
grant select, insert, update, delete on public.example to authenticated;
grant select, insert, update, delete on public.example to service_role;
```

But these are examples, not defaults. Apply only permissions justified by that table's intended API/RLS contract. Server-only financial tables should remain server-only unless the PRD explicitly exposes them.

Keep migrations forward-only and idempotent where supported. Keep Drizzle schema synchronized with migrations. Preserve transaction/locking semantics required for queue admission, idempotency, balances, withdrawals, and settlement.

## Redis requirements

Upstash is the default hosted Redis provider, but usage must be economical because the expected plan has low command limits.

- Do not move durable replay protection, financial state, ledger state, queue state, or authoritative permissions into Redis.
- Prefer PostgreSQL for durable counters/leases when correctness depends on persistence.
- Coalesce requests and use safe cache TTLs before increasing Redis traffic.
- Keep cache keys namespaced by environment and purpose.
- Never cache secrets or authoritative balances in a way that can bypass PostgreSQL validation.

## Before handing off to the next LLM

You must finish the iteration by doing all of the following:

1. Re-run all checks you can truthfully execute.
2. Update `docs/HOW-IT-WORKS.md` if implemented behavior changed.
3. Update `docs/SETUP.md` if hosted deployment/setup changed.
4. Update `docs/PRD.md` only if the owner changed requirements.
5. Update the current `docs/PROJECT-STATUS_vN.md` with:
   - what was completed,
   - what remains incomplete,
   - checks actually run and results,
   - current defects/blockers,
   - current repo/deployment issues,
   - the weighted M0–M8 progress table,
   - overall Phase One completion percentage,
   - percentage remaining to 100%,
   - exact next development pass.
6. Replace this entire current `docs/LLM-HANDOVER_vN.md` with a fresh self-contained prompt reflecting the new repository state and exact next work.
7. Rename the current status/handover pair to the next `_vN` filename suffix and update the optional final-line markers to match. Version mismatch must not block CI or deployment.
8. Run the documentation check. Extra Markdown files may produce warnings but must not fail CI solely because they exist.
9. Leave the repository in a state that can be zipped/uploaded to GitHub with the three stable core docs plus the current versioned status/handover pair intact.

Your user-facing response at the end should be concise: summarize what you implemented, checks actually run, the new Phase One completion percentage, major remaining blockers, and provide the updated repository artifact when requested. Do not make the user reconstruct the next prompt from chat; the prompt must already be in the current versioned `docs/LLM-HANDOVER_vN.md`.

v1
