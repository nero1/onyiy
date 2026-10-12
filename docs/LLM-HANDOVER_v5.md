# Continue Gifters World — Phase One

Work directly in the current repository. Before changing code, read in order:

1. `docs/PRD.md` — living product/engineering authority.
2. `docs/PROJECT-STATUS_v5.md` — verified progress, limitations and exact next pass.
3. `docs/SETUP.md` — sole hosted setup guide.
4. `docs/HOW-IT-WORKS.md` — architecture and manual acceptance procedures.
5. This prompt, then actual repository files and applicable agent instructions.

Inspect implementation; documentation alone proves nothing. Use the existing cloud checkout, without creating a worktree unless requested.

## Owner decisions and current state

The owner wants continued coding without hosted credentials for now and will test after further iterations. Supabase, Upstash and Vercel are not configured. Always keep communication concise. Update the PRD when requirements change, keeping it one current specification.

**At the end of each completed iteration, create a pull request and merge it after required checks pass.** This is explicitly authorized. Do not push directly to `main` as a substitute. Report an access/check blocker truthfully and complete independent work first.

The current estimate is **28.50% complete / 71.50% remaining**. No M0/M1 gate is newly complete. The v2 iteration verified a dependency-resolved build and credential-free CI prerequisites; hosted deployment and hosted M1 acceptance remain unrun.

Node 22.23.3, lockfile v3 and Vercel CLI 63.1.2 remain pinned. PRs #1–#3, including the configuration and money-integrity passes, are merged. The v4 pass fixes a reproduced −3,000 GIV race using shared user locks; validates replay inputs, assets/status/flags/cycle limits; adds immutable USD snapshots, UTC point/spend caps, separate bootstrap accounting and database ledger/owner protections. Quote review requires explicit confirmation, notifications no longer crash the page, and stale identity responses are ignored.

`check:all`, build, bundle (175.76 KiB gzip), 48-key parity and secret checks pass. Fresh isolated PostgreSQL passed migrations 001–006, original 21-gift acceptance and the new operator-only integrity scenario; manual policy/ledger rejection and mobile/French browser flows passed. No full milestone gate, hosted provider check, broad test suite or real-chain path is claimed. Preserve the retained failing disposable fixture; do not rewrite historical financial journals.

The v5 pass enforces remote PostgreSQL certificate/hostname trust across runtime/migration/health, with optional provider-issued public CA PEM. Health reads validated database configuration on a separate connection, coalesces concurrent callers, bounds stalled/locked work and returns redacted 503. Static/build checks, real TLS protocol rejection/acceptance, outage/recovery/coalescing and public health/dashboard checks passed in tooling; hosted acceptance remains deferred. Progress stays 28.50%.

The owner asks you to keep iterating toward Phase One and then fix remaining defects, choosing sensible recommendations without routine questions. Never invent external credentials, evidence or automatic usage-reset resumption. Record exact next work for a later session if interrupted.

## Next work, in order

1. Finish any outstanding verified PR/merge. Next establish M0 least-privilege roles, transaction-local actor context and user-owned RLS foundations. Keep financial/audit tables closed and enforce server authorization alongside RLS. TLS and bounded real database health are now implemented; preserve certificate/hostname checks and independent probe cancellation.
2. Continue remaining M0/M1 jobs, receipt-allocation lineage, reorg/recovery and bounded queue rank work. The operator-only `scenario:m1:integrity` follows `scenario:m1` on fresh isolated simulation data; requires APP_BASE_URL and M1_INTEGRITY_CONFIRM=isolated-simulation. Never reset shared data or add a broad automated test program.
3. M2 identity/security and M3 testnet follow prerequisite gates. Simulation still trusts x-sim-user; it is not production auth. Signer/approval orchestration, native-gas accounting and business-send reservations remain unimplemented. Typed policies are not evidence of service implementation.
4. Hosted providers are deferred by the owner. Once supplied, follow SETUP.md, protected preview/production environments and ENABLE_VERCEL_DEPLOYMENTS=true. Forks get checks only. Record real migration/deployment and hosted M1 results; do not fabricate values or mark unrun checks passed.

## Preserve these contracts

- Next.js 16 App Router/native Route Handlers; GitHub Actions → Vercel; Supabase PostgreSQL; Drizzle-first application access; economical Upstash REST default with compatible Redis adapters. Keep PostgreSQL/provider portability.
- Do not add Vite, Hono, Docker, nginx, a local-first setup guide, Neon as hosted default or Cloudflare as primary deployment. `SETUP.md` is the only comprehensive guide. Keep filesystem paths bracket-free; preserve public parameterized URLs.
- Server-authoritative identity/permissions/economics/queue/money; integer asset base units; balanced append-only ledger; compensating corrections; permanent idempotency; explicit asset/network/environment isolation. The payer cannot receive their own allocation; display and serving order remain separate; withdrawals are user-requested.
- GIV is simulation-only. Mainnet stays off, and real signing remains isolated and unimplemented until its milestone. No platform addresses, credentials, private keys, auth material or signer payloads enter source, manifests, client bundles, logs or exports.
- New public-schema tables require migration-local least-privilege Supabase grant classification and synchronized Drizzle schema. Never broadly expose financial/identity/admin tables. Raw SQL stays narrow, parameterized and documented for PostgreSQL-specific needs.
- Redis is not a financial authority. Avoid per-component Redis reads; use safe browser/in-process/HTTP caching and PostgreSQL. User caches remain identity/session scoped and purge on identity changes.

## Verification and handoff

Run applicable `npm ci`, `npm run check:all`, `npm run build`, `npm run check:bundle`, secret/client checks, Drizzle coverage and grant checks. Execute hosted migrations/scenarios only with real authorized settings; distinguish passed, failed, blocked and unrun results. Do not invent credentials, mock a successful deployment, reset shared databases or weaken assertions/type checking. The PRD forbids broad automated test suites; use existing manual simulator/provider contracts and reconciliation.

Keep the five core docs primary. Update HOW-IT-WORKS for implemented behavior and SETUP for hosted procedure changes. Always recompute the weighted M0–M8 table (weights total 100%), show complete/remaining, and avoid awarding scaffold-only gates. Replace this prompt with a self-contained next prompt, rename the pair to `PROJECT-STATUS_v6.md` and `LLM-HANDOVER_v6.md`, update references/markers, remove the superseded pair, run the docs check, then create/merge the PR. Extra Markdown/version mismatch may warn but must not alone fail CI. At verified 100%, stop Phase One and request the owner's next instruction.

v5
