# Continue Gifters World — Phase One

Work directly in the current repository. Before changing code, read in order:

1. `docs/PRD.md` — living product/engineering authority.
2. `docs/PROJECT-STATUS_v2.md` — verified progress, limitations and exact next pass.
3. `docs/SETUP.md` — sole hosted setup guide.
4. `docs/HOW-IT-WORKS.md` — architecture and manual acceptance procedures.
5. This prompt, then actual repository files and applicable agent instructions.

Inspect implementation; documentation alone proves nothing. Use the existing cloud checkout, without creating a worktree unless requested.

## Owner decisions and current state

The owner wants continued coding without hosted credentials for now and will test after further iterations. Supabase, Upstash and Vercel are not configured. Always keep communication concise. Update the PRD when requirements change, keeping it one current specification.

**At the end of each completed iteration, create a pull request and merge it after required checks pass.** This is explicitly authorized. Do not push directly to `main` as a substitute. Report an access/check blocker truthfully and complete independent work first.

The current estimate is **25% complete / 75% remaining**. No M0/M1 gate is newly complete. The v2 iteration verified a dependency-resolved build and credential-free CI prerequisites; hosted deployment and hosted M1 acceptance remain unrun.

Node 22.23.3, npm lockfile v3 and Vercel CLI 63.1.2 are pinned. `npm ci`, `check:all`, `build`, secret/client canary scans and the 200 KiB homepage JS check passed (175.23 KiB gzip). Workflow `actionlint` passed; GitHub-hosted Actions execution has not been observed. Drizzle coverage is 18/18 current tables. `db:check` was a config-only check, not an applied hosted migration. See status for exact evidence.

The Redis adapter type mismatch is fixed without bypassing TypeScript. Bracket-free parameterized Route Handlers resolve/validate the original path ID before query parameters, addressing the earlier rewritten URL failure; the hosted scenario still needs verification. Runtime rejects testnet/mainnet and unsupported provider selectors because only simulation is implemented.

GitHub Git reads work. API calls currently encounter a proxy CONNECT 403 for `api.github.com`; a cloud draft domain allowance does not prove runtime access. Use available injected authentication, never request a token merely because a CLI prompts, and do not print credentials. Recheck access after a meaningful runtime change. Do not claim a PR, merge, CI run or deployment occurred without evidence.

## Next work, in order

1. Inspect repository/remote state and finish any outstanding PR/merge; verify Actions checks when access permits.
2. Follow the exact status next pass: credential-free M0 manifest authority/public projection, seed preservation, security ceilings and rollback hardening. Preserve earlier gates; do not jump to attractive later features.
3. Hosted setup is deferred, not waived. Once provided, follow `SETUP.md`: protected `preview`/`production` environments and the repository variable `ENABLE_VERCEL_DEPLOYMENTS=true`. Same-repository PRs can deploy previews after checks/environment review; forks get checks only. `main` pushes deploy production. Vercel native Git deployment remains disabled.
4. Record a real hosted migration/seed and deployment, then run `scenario:m1` on a fresh isolated hosted simulation database. Finish replay/concurrency and failure acceptance before M2 identity/security; M3 testnet follows M2.

## Preserve these contracts

- Next.js 16 App Router/native Route Handlers; GitHub Actions → Vercel; Supabase PostgreSQL; Drizzle-first application access; economical Upstash REST default with compatible Redis adapters. Keep PostgreSQL/provider portability.
- Do not add Vite, Hono, Docker, nginx, a local-first setup guide, Neon as hosted default or Cloudflare as primary deployment. `SETUP.md` is the only comprehensive guide. Keep filesystem paths bracket-free; preserve public parameterized URLs.
- Server-authoritative identity/permissions/economics/queue/money; integer asset base units; balanced append-only ledger; compensating corrections; permanent idempotency; explicit asset/network/environment isolation. The payer cannot receive their own allocation; display and serving order remain separate; withdrawals are user-requested.
- GIV is simulation-only. Mainnet stays off, and real signing remains isolated and unimplemented until its milestone. No platform addresses, credentials, private keys, auth material or signer payloads enter source, manifests, client bundles, logs or exports.
- New public-schema tables require migration-local least-privilege Supabase grant classification and synchronized Drizzle schema. Never broadly expose financial/identity/admin tables. Raw SQL stays narrow, parameterized and documented for PostgreSQL-specific needs.
- Redis is not a financial authority. Avoid per-component Redis reads; use safe browser/in-process/HTTP caching and PostgreSQL. User caches remain identity/session scoped and purge on identity changes.

## Verification and handoff

Run applicable `npm ci`, `npm run check:all`, `npm run build`, `npm run check:bundle`, secret/client checks, Drizzle coverage and grant checks. Execute hosted migrations/scenarios only with real authorized settings; distinguish passed, failed, blocked and unrun results. Do not invent credentials, mock a successful deployment, reset shared databases or weaken assertions/type checking. The PRD forbids broad automated test suites; use existing manual simulator/provider contracts and reconciliation.

Keep the five core docs primary. Update HOW-IT-WORKS for implemented behavior and SETUP for hosted procedure changes. Always recompute the weighted M0–M8 table (weights total 100%), show complete/remaining, and avoid awarding scaffold-only gates. Replace this prompt with a self-contained next prompt, rename the pair to `PROJECT-STATUS_v3.md` and `LLM-HANDOVER_v3.md`, update references/markers, remove the superseded pair, run the docs check, then create/merge the PR. Extra Markdown/version mismatch may warn but must not alone fail CI. At verified 100%, stop Phase One and request the owner's next instruction.

v2
