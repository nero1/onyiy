# Continue Gifters World — Phase One

Before code changes read, in order: `docs/PRD.md`, `docs/PROJECT-STATUS_v8.md`, `docs/SETUP.md`, `docs/HOW-IT-WORKS.md`, then this prompt and actual repository/agent instructions. Documentation alone proves no feature.

## Owner instructions

Continue iterating toward Phase One, then fix bugs; choose sensible recommendations without routine questions. Keep communications/docs concise. Hosted Supabase, Upstash and Vercel remain unconfigured by the owner's choice; keep building and credential-free CI running. Never invent credentials, hosted evidence or automatic usage-reset resumption.

**Every completed iteration must create a pull request and merge it after the final head checks pass.** This is authorized. Do not substitute a direct main push. Record blocked access/checks accurately and complete independent work. PRs #1–#6 are merged; finish any outstanding current PR before the next pass.

## Verified state

Phase One is **31.05% complete / 68.95% remaining**, with no new full milestone gate. Node 22.23.3, lockfile v3, Next.js 16 and Vercel CLI 63.1.2 are pinned. Static/build/bundle/secret checks pass; 48 EN/FR keys, 21/21 current Drizzle tables and 175.76 KiB gzip homepage. This is current-table coverage, not proof every future PRD resource exists.

Configuration is typed/scoped; DB is transaction-time authority, seed preserves edits and public projection is safe. GIV spending uses shared user locks, hash-bound replay, eligibility/flag/asset/cycle/spend checks, immutable USD snapshots and UTC point caps. Append-only/sealed/balanced ledger and owner guards protect history. Quote review requires explicit approval; notification/identity response bugs are fixed. Simulation authentication still trusts x-sim-user and is not production identity.

Runtime/migration/health require trusted remote PG certificates and matching hostnames. Health uses coalesced independent bounded DB probes. Restricted NOINHERIT nonowner read/service roles, transaction-local actor/environment and own-row RLS protect current resources; browser/Data API access stays closed. Staff reads recheck DB role/status. Maintenance credentials stay outside Vercel; db:check:runtime proves matching owner/runtime namespaces. SETUP explains secure role/CA provisioning and PR deployment opt-in.

Sparse display/FIFO/priority Fenwick counters use 40-bit tickets, at most 41 updates per affected lane, partition locks and bounded prefix reads. Admission/history are immutable and sequences monotonic; unique cycle/priority indexes, ticket exhaustion and indexed serving selection enforce rights. Priority changes serving while display stays fixed; disabling it restores FIFO. Completed ranks are absent. Staff queue reads are capped and use partition/ticket cursors. Priority-edit UI/API is still later work.

Fresh/repeated migrations 001–010 and seed, restricted-login public 21-gift/integrity, sparse/backfill/priority/privacy/pagination/capacity and earlier TLS/RLS/browser scenarios passed in disposable tooling. Hosted providers, real chains and million-user/hosted performance remain unrun. Preserve retained failing disposable spend-race evidence; never rewrite financial history.

Immutable receipt allocations capture source funding, receiver slot/business role and credit journal in one GIV transaction with deferred checks and unique source/slot constraints. Operation results and withdrawal quote snapshots are immutable; UUID request-key case is one identity. Verified legacy backfill leaves unknown slots unresolved. Snapshot reconciliation distinguishes balanced journals from consistent money/counters and complete lineage. Fresh 21-gift/integrity, 27-row legacy backfill, tamper/privacy/duplicate-slot/source/economics rejection and retained negative-balance detection passed in disposable tooling. No journals were rewritten.

## Exact next pass

1. Finish the current verified PR/merge, then implement durable transactional outbox/jobs, fencing leases, bounded retries and independently authenticated scheduler work. Preserve immutable history and honest legacy uncertainty.
2. Continue M0/M1 durable outbox/jobs, authenticated bounded scheduler and recovery/reorg cases. Typed policies do not implement these services. Use named simulator/manual acceptance and reconciliation, not a broad automated suite.
3. Complete M2 OAuth or isolated dummy sessions/authorization/CSRF/TOTP/replay/status/rate limits after prerequisite gates, then M3 real testnet integration. Real signer, approval/business orchestration, native gas and external alerts remain unimplemented; never skip their gates.
4. When owner settings arrive, follow SETUP for separate namespaces/protected preview/production, ENABLE_VERCEL_DEPLOYMENTS=true and hosted migration/deployment/M1 evidence. Forks receive checks only. Provider absence must not be disguised as acceptance.

## Preserve contracts

Keep Next.js App Router/native handlers, GitHub Actions → Vercel, Supabase PostgreSQL/Drizzle and economical Upstash REST with compatible PG/Redis adapters. Do not reintroduce Vite, Hono, Docker, nginx, a local-first guide, Neon default or Cloudflare primary. Keep filesystem paths bracket-free and parameterized public URLs intact.

Server enforces identity/permissions/economics/queues/money. Use integer base units, balanced append-only postings, compensating corrections, durable idempotency and environment/asset/network isolation. No self-allocation; display and serving are separate; withdrawals are user-requested. GIV stays simulation-only, mainnet off and signing isolated until its gate. Never expose platform addresses/credentials/private keys/auth/signer material in source, manifests, browser, logs or exports.

All new public tables require migration-local least-privilege grant/revoke classification and synchronized Drizzle schema/RLS. Browser roles never receive financial/identity/admin data. Keep raw SQL to documented narrow PG infrastructure/rank/lock/maintenance exceptions. Redis is never financial authority; avoid per-component calls and purge identity-scoped caches on change.

## Finish each iteration

Run applicable npm ci/check:all/build/bundle/secret/Drizzle/grant/docs checks and manual scenarios; distinguish passed/failed/blocked/unrun. scenario:m1 followed by scenario:m1:integrity requires fresh isolated simulation data (APP_BASE_URL and M1_INTEGRITY_CONFIRM=isolated-simulation). Never reset shared/real-money data.

Update HOW for behavior and SETUP for hosted procedures; change the living PRD only for actual requirements. Recompute weighted M0–M8 completion/remaining from verified gates. Replace this prompt, advance the pair to PROJECT-STATUS_v9.md and LLM-HANDOVER_v9.md, remove the superseded pair, update references/markers, run docs checks, then create/merge the PR. Extra Markdown/version mismatches may warn, never fail alone. At verified 100%, stop Phase One with a completion handover and await the owner's next scope.

v8
