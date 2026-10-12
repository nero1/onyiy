# Continue Gifters World — Phase One

Work directly in the current repository. Before changing code, read in order:

1. `docs/PRD.md` — living product/engineering authority.
2. `docs/PROJECT-STATUS_v3.md` — verified progress, limitations and exact next pass.
3. `docs/SETUP.md` — sole hosted setup guide.
4. `docs/HOW-IT-WORKS.md` — architecture and manual acceptance procedures.
5. This prompt, then actual repository files and applicable agent instructions.

Inspect implementation; documentation alone proves nothing. Use the existing cloud checkout, without creating a worktree unless requested.

## Owner decisions and current state

The owner wants continued coding without hosted credentials for now and will test after further iterations. Supabase, Upstash and Vercel are not configured. Always keep communication concise. Update the PRD when requirements change, keeping it one current specification.

**At the end of each completed iteration, create a pull request and merge it after required checks pass.** This is explicitly authorized. Do not push directly to `main` as a substitute. Report an access/check blocker truthfully and complete independent work first.

The current estimate is **26.25% complete / 73.75% remaining**. No M0/M1 gate is newly complete. The v2 iteration verified a dependency-resolved build and credential-free CI prerequisites; hosted deployment and hosted M1 acceptance remain unrun.

Node 22.23.3, npm lockfile v3 and Vercel CLI 63.1.2 remain pinned. This iteration adds 67 closed static manifest schemas plus dynamic plan/asset/risk schemas, canonical scopes, public projection/ETags, transaction-bound DB configuration, atomic preservation-only seeds/migrations, reset guards and exact integer decimal conversion. DB validation, rollback, preservation, reset refusal, public manifest/ETag and the original 21-gift public-route scenario passed in a separate disposable tooling database. Build/checks pass; homepage is 175.30 KiB gzip. This is not hosted acceptance. The v2 PR #1 is merged; inspect GitHub for this iteration’s final delivery and current checks.

The owner asks you to keep iterating toward all Phase One gates, then fix remaining defects; make routine decisions using your best recommendation without waiting for replies. Do not pretend a stopped session or exhausted usage resumes automatically. Record the exact next work here so a later session can resume.

## Next work, in order

1. Finish any outstanding verified PR/merge, then harden M1. Current bugs: different withdrawal quotes can spend the same user balance concurrently; quote request-key reuse does not validate changed input; user/status/asset checks must occur inside the money transaction; cycle limits and disabled features need server enforcement.
2. Use named manual replay/concurrency/withdrawal acceptance and reconciliation in a fresh disposable simulation namespace; no new Docker/service/local-first setup is authorized. Do not reset shared databases. Existing tooling validation is separate from the owner’s deferred Supabase/Vercel tests.
3. Finish remaining M0/M1 gates before M2 identity/security and M3 live testnet integration. Typed policies for future services do not imply implementation. Real hosted settings remain prerequisites; never invent them.
4. Once settings arrive, use only SETUP.md: protected preview/production environments and ENABLE_VERCEL_DEPLOYMENTS=true. PR previews and main production deployments remain opt-in; forks get checks only. Run and record real hosted migration/seed, first deployment and hosted M1 acceptance.

## Preserve these contracts

- Next.js 16 App Router/native Route Handlers; GitHub Actions → Vercel; Supabase PostgreSQL; Drizzle-first application access; economical Upstash REST default with compatible Redis adapters. Keep PostgreSQL/provider portability.
- Do not add Vite, Hono, Docker, nginx, a local-first setup guide, Neon as hosted default or Cloudflare as primary deployment. `SETUP.md` is the only comprehensive guide. Keep filesystem paths bracket-free; preserve public parameterized URLs.
- Server-authoritative identity/permissions/economics/queue/money; integer asset base units; balanced append-only ledger; compensating corrections; permanent idempotency; explicit asset/network/environment isolation. The payer cannot receive their own allocation; display and serving order remain separate; withdrawals are user-requested.
- GIV is simulation-only. Mainnet stays off, and real signing remains isolated and unimplemented until its milestone. No platform addresses, credentials, private keys, auth material or signer payloads enter source, manifests, client bundles, logs or exports.
- New public-schema tables require migration-local least-privilege Supabase grant classification and synchronized Drizzle schema. Never broadly expose financial/identity/admin tables. Raw SQL stays narrow, parameterized and documented for PostgreSQL-specific needs.
- Redis is not a financial authority. Avoid per-component Redis reads; use safe browser/in-process/HTTP caching and PostgreSQL. User caches remain identity/session scoped and purge on identity changes.

## Verification and handoff

Run applicable `npm ci`, `npm run check:all`, `npm run build`, `npm run check:bundle`, secret/client checks, Drizzle coverage and grant checks. Execute hosted migrations/scenarios only with real authorized settings; distinguish passed, failed, blocked and unrun results. Do not invent credentials, mock a successful deployment, reset shared databases or weaken assertions/type checking. The PRD forbids broad automated test suites; use existing manual simulator/provider contracts and reconciliation.

Keep the five core docs primary. Update HOW-IT-WORKS for implemented behavior and SETUP for hosted procedure changes. Always recompute the weighted M0–M8 table (weights total 100%), show complete/remaining, and avoid awarding scaffold-only gates. Replace this prompt with a self-contained next prompt, rename the pair to `PROJECT-STATUS_v4.md` and `LLM-HANDOVER_v4.md`, update references/markers, remove the superseded pair, run the docs check, then create/merge the PR. Extra Markdown/version mismatch may warn but must not alone fail CI. At verified 100%, stop Phase One and request the owner's next instruction.

v3
