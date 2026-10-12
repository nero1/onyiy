# Continue Gifters World — Phase One

Before code changes read, in order: `docs/PRD.md`, `docs/PROJECT-STATUS_v12.md`, `docs/SETUP.md`, `docs/HOW-IT-WORKS.md`, then this prompt and actual repository/agent instructions. Documentation alone proves no feature.

## Owner instructions

Continue iterating toward Phase One, then fix bugs; choose sensible recommendations without routine questions. Keep communications/docs concise. Hosted Supabase, Upstash and Vercel remain unconfigured by the owner's choice; keep building and credential-free CI running. Never invent credentials, hosted evidence or automatic usage-reset resumption.

**Every completed iteration must create a pull request and merge it after the final head checks pass.** This is authorized. Do not substitute a direct main push. Record blocked access/checks accurately and complete independent work. PRs #1–#10 are merged; finish any outstanding current PR before the next pass.

## Verified state

Phase One is **33.85% complete / 66.15% remaining**, with no new full milestone gate. Node 22.23.3, lockfile v3, Next.js 16 and Vercel CLI 63.1.2 are pinned. Static/build/bundle/secret checks pass; 53 EN/FR keys, 28/28 current Drizzle tables and 176.52 KiB gzip homepage. This is current-table coverage, not proof every future PRD resource exists.

Configuration is typed/scoped; DB is transaction-time authority, seed preserves edits and public projection is safe. GIV spending uses shared user locks, hash-bound replay, eligibility/flag/asset/cycle/spend checks, immutable USD snapshots and UTC point caps. Append-only/sealed/balanced ledger and owner guards protect history. Quote review requires explicit approval; notification/identity response bugs are fixed. Simulation authentication still trusts x-sim-user and is not production identity.

Runtime/migration/health require trusted remote PG certificates and matching hostnames. Health uses coalesced independent bounded DB probes. Restricted NOINHERIT nonowner read/service roles, transaction-local actor/environment and own-row RLS protect current resources; browser/Data API access stays closed. Staff reads recheck DB role/status. Maintenance credentials stay outside Vercel; db:check:binding now proves a fresh owner-write/runtime-read challenge before financial migrations; db:check:runtime repeats proof and role/config checks afterward. Copied namespace IDs cannot pass alone. SETUP explains secure role/CA provisioning and PR deployment opt-in.

Sparse display/FIFO/priority Fenwick counters use 40-bit tickets, at most 41 updates per affected lane, partition locks and bounded prefix reads. Admission/history are immutable and sequences monotonic; unique cycle/priority indexes, ticket exhaustion and indexed serving selection enforce rights. Priority changes serving while display stays fixed; disabling it restores FIFO. Completed ranks are absent. Staff queue reads are capped and use partition/ticket cursors. Priority-edit UI/API is still later work.

Fresh/repeated migrations 001–014 and seed, restricted-login public 21-gift/integrity, sparse/backfill/priority/privacy/pagination/capacity and earlier TLS/RLS/browser scenarios passed in disposable tooling. Hosted providers, real chains and million-user/hosted performance remain unrun. Preserve retained failing disposable spend-race evidence; never rewrite financial history.

Immutable receipt allocations capture source funding, receiver slot/business role and credit journal in one GIV transaction with deferred checks and unique source/slot constraints. Operation results and withdrawal quote snapshots are immutable; UUID request-key case is one identity. Verified legacy backfill leaves unknown slots unresolved. Snapshot reconciliation distinguishes balanced journals from consistent money/counters and complete lineage. Fresh 21-gift/integrity, 27-row legacy backfill, tamper/privacy/duplicate-slot/source/economics rejection and retained negative-balance detection passed in disposable tooling. No journals were rewritten.

Durable notification outbox/jobs now commit with gifts/withdrawals. PostgreSQL claims use SKIP LOCKED, tokens/generations, due times and atomic deduplicated effects; transient backoff, expired takeover, DLQ and audited idempotent replay preserve identity/attempts. Immutable work/source guards reject rebinding. A signed bounded non-signing tick uses DB nonce/run leases, key rotation and five-minute windows. GitHub scheduler is opt-in; setup explains secure keys/origins and delayed notifications. Final 21-gift/integrity/jobs and manual lease/retry/rollback/privacy/lock-timeout probes passed in disposable tooling. This includes no signer, business settlement, long-worker heartbeat, external alert or hosted scheduler acceptance.

GIV withdrawal recovery now has immutable staff rejection/delay controls, member quote/unsent-hold cancellation and audited staff settlement/release. Deferred guards prove exact journal/owner/asset/amount/destination/state; terminal history cannot reopen. Sorted user locks prevent crossed recovery deadlocks. Reconciliation detects held-liability mismatches. Capped own DTOs and EN/FR cancellation UI exclude destinations/pending work from browser snapshots. Named recovery, rejected proofs, rollback-only orphan hold, banned-account recovery, crossed staff and mobile-viewport browser observations passed. This never proves nonbroadcast or reorg recovery for a real chain; conservative GIV daily limits still count original holds.

Daily reconciliation now uses signed ticks, one UTC-day key, repeatable-read result/completion, immutable capped reports and eight-second/one-second query budgets. Timeout/retry recovery, coherent concurrent-gift snapshots, negative-discrepancy persistence and staff privacy passed in tooling. EN/FR review UI handles inconsistent/timeout results; mobile notice overlap is fixed. No automatic repair, external alert, large-dataset or hosted scheduler acceptance exists.

M0 is now 90% after fixing the reproduced clone-ID binding and reset-work cleanup defects. Proof bootstrap uses owner-only migration 014 before application DDL; runtime cannot write it. Canonical schema paths defeat temporary shadows. Populated isolated reset clears all work/reports/scheduler/proof resources. Browser v2 caches consume configured TTLs, reject overlong age, isolate old authentication responses and tolerate blocked storage; current 401 clears private state and retains retry/account selection. Contracts and final fresh M1 scenarios passed in tooling. Overall is 33.85%; hosted gates remain unaccepted.

## Exact next pass

1. Finish the current verified PR/merge, then continue unresolved M0/M1 incoming GIV exception/reorg and isolated restore/provider contracts. Preserve permanent evidence/history and never infer live-chain nonbroadcast from GIV controls.
2. Finish necessary bounded maintenance/retention and cache-budget contracts, retaining pending work and liabilities. Business/digest aggregation, external alerts, full restore and long-worker heartbeat remain incomplete. Use named manual acceptance and reconciliation, not a broad automated suite.

3. Complete M2 OAuth or isolated dummy sessions/authorization/CSRF/TOTP/replay/status/rate limits after prerequisite gates, then M3 real testnet integration. Real signer, approval/business orchestration, native gas and external alerts remain unimplemented; never skip their gates.
4. When owner settings arrive, follow SETUP for separate namespaces/protected preview/production, ENABLE_VERCEL_DEPLOYMENTS=true and hosted migration/deployment/M1 evidence. Forks receive checks only. Provider absence must not be disguised as acceptance.

## Preserve contracts

Keep Next.js App Router/native handlers, GitHub Actions → Vercel, Supabase PostgreSQL/Drizzle and economical Upstash REST with compatible PG/Redis adapters. Do not reintroduce Vite, Hono, Docker, nginx, a local-first guide, Neon default or Cloudflare primary. Keep filesystem paths bracket-free and parameterized public URLs intact.

Server enforces identity/permissions/economics/queues/money. Use integer base units, balanced append-only postings, compensating corrections, durable idempotency and environment/asset/network isolation. No self-allocation; display and serving are separate; withdrawals are user-requested. GIV stays simulation-only, mainnet off and signing isolated until its gate. Never expose platform addresses/credentials/private keys/auth/signer material in source, manifests, browser, logs or exports.

All new public tables require migration-local least-privilege grant/revoke classification and synchronized Drizzle schema/RLS. Browser roles never receive financial/identity/admin data. Keep raw SQL to documented narrow PG infrastructure/rank/lock/maintenance exceptions. Redis is never financial authority; avoid per-component calls and purge identity-scoped caches on change.

## Finish each iteration

Run applicable npm ci/check:all/build/bundle/secret/Drizzle/grant/docs checks and manual scenarios; distinguish passed/failed/blocked/unrun. scenario:m1 followed by scenario:m1:integrity, scenario:m1:jobs and scenario:m1:recovery requires fresh isolated simulation data (APP_BASE_URL, M1_INTEGRITY_CONFIRM/M1_JOBS_CONFIRM/M1_RECOVERY_CONFIRM=isolated-simulation and secure scheduler keys for the jobs scenario). Never reset shared/real-money data.

Update HOW for behavior and SETUP for hosted procedures; change the living PRD only for actual requirements. Recompute weighted M0–M8 completion/remaining from verified gates. Replace this prompt, advance the pair to PROJECT-STATUS_v13.md and LLM-HANDOVER_v13.md, remove the superseded pair, update references/markers, run docs checks, then create/merge the PR. Extra Markdown/version mismatches may warn, never fail alone. At verified 100%, issue a completion handover; fix known bugs under the current authorization and await owner instruction for additional scope.

v12
