# How Gifters World Works — Technical Summary

## Hosted architecture

Gifters World is a TypeScript application built on Next.js 16 App Router, React, native Next.js Route Handlers, Drizzle ORM, and PostgreSQL.

Primary hosted stack:

- **Vercel** — Next.js web/PWA and Node.js Route Handlers
- **Supabase PostgreSQL** — primary database
- **Upstash Redis REST** — default cache/coordination provider, used sparingly
- **GitHub Actions** — checks and Vercel deployments
- **separate scheduled signer workload** — required later for real-chain signing; signer secrets do not belong in Vercel

Provider boundaries remain portable: compatible PostgreSQL databases and compatible Redis providers can be supported without changing domain logic.

## Database and Drizzle

Supabase is used primarily as PostgreSQL. Runtime Vercel Functions use the Supabase transaction pooler; migrations/admin work use an appropriate migration connection.

Application table access is Drizzle-first, targeting effectively 100% coverage. Raw SQL is reserved for PostgreSQL-specific operations such as DDL, GRANT/RLS, explicit locking, transaction-local security context, bounded PostgreSQL rank counters/functions, and specialized reconciliation/recovery.

Every migration that creates a new `public` table must include an explicit Supabase GRANT classification. Sensitive financial, identity, ledger, admin, queue, payout, and audit tables must not be broadly exposed to `anon` or `authenticated` merely to satisfy the Data API.

## Manifest authority and safety

`xmanifest.json` contains validated bootstrap defaults. Seeding inserts missing settings in one transaction and preserves existing database values, asset enablement and plan edits. The database is runtime authority: financial services reload validated configuration in their transaction. Schema-declared policies for future services do not implement those services.

The Phase One registry validates 67 static settings and typed plan/asset/risk keys, with explicit public/private/staff scopes and closed nested fields. Unknown legacy database keys are quarantined from outputs. Credentials, platform-address configuration and secret-bearing URLs are rejected; public token registry fields are a distinct permitted class. Invalid financial settings or deployment ceilings block mutations with a redacted configuration error.

`/manifest` projects only registered public fields, uses a weak ETag and bounded CDN TTL, and may serve validated public seed defaults during database failure. This fallback never authorizes a mutation. Simulation, finance, auth and operational policies do not enter the public DTO.

Runtime, migration and health connections enforce verified certificate trust and hostname for remote PostgreSQL. URL SSL options cannot weaken verification; bounded connection/pool settings reject invalid values. Optional deployment CA certificates remain server-only. Plaintext is limited to loopback simulation tooling outside Vercel.

Health coalesces simultaneous requests into one separate database probe, reads validated database configuration, and closes timed-out work without cancelling application transactions. The bootstrap `health_timeout_ms` is its cold-start ceiling; database policy may tighten successful readiness. Outages return a redacted 503; no Redis command, treasury diagnostic or secret is exposed. Health alone does not prove financial acceptance.

Application queries run in a transaction-local role/actor/environment context. `gw_read` has read-only own-row policies and scoped balance/rank views; `gw_service` supplies minimum financial-service writes behind domain authorization. The login cannot own tables or bypass RLS, and staff reads recheck current DB role/status. Context and role reset on commit/rollback. All current tables enable RLS; browser/Data API roles have no application access. Migration/seed/reset use a separate owner connection. An internal namespace ID lets deployment prove that runtime and owner URLs reach the same database.

Migration files each execute in a PostgreSQL transaction. Seeds also execute atomically. The reset CLI requires an explicit simulation environment, database-name confirmation and an enabled database policy; production or non-simulation assets are rejected. Locks serialize its inspection and truncation. No public reset endpoint exists.

Authoritative conversion parses decimal strings into integer base units; it does not multiply JavaScript floating-point money. Queue economics retain immutable plan-version snapshots. New seed versions and point rules read database settings without rewriting used economics.

## Cache and browser persistence

PostgreSQL is authoritative. Redis must never be required for financial correctness.

Upstash is the hosted default, but Redis calls are intentionally minimized. Safe public data and approved user-scoped display snapshots can be retained in browser storage to reduce repeated network/cache calls. User-scoped keys must include the active user/session scope and must be cleared on logout, account switch, or authentication failure so data cannot leak between users sharing a device.

Browser-stored financial data is display-only and never authorizes a mutation. Auth tokens, signing material, private keys, secrets, and pending financial writes are not stored there.

## Phase One simulation

The current hosted Phase One profile uses internal GIV simulation. Consent activates a test account and grants 5,000 GIV once. GIV cannot be redeemed or exported on-chain.

Seeded plans begin disabled. Admin activation creates the simulation plan/queue. The default bootstrap creates ten system receiver positions; each receiver requires two allocations. An incoming gift serves the currently selected prior receiver and then admits the payer behind existing entries. A payer never receives their own incoming allocation.

Displayed queue order and actual serving order remain separate concepts.

## Ledger and withdrawals

Authoritative asset amounts use integer base units. Money movement is represented by append-only journals and balanced debit/credit postings. Corrections use compensating entries rather than rewriting historical postings.

Default incoming split:

- receiver 85%
- marketing 4%
- eligible referrer 4%
- developer 6%
- reserve 1%

If no eligible referrer exists, the referral share falls back to reserve.

Cycle completion and withdrawal are separate. The current simulator supports a dummy GIV destination and a zero-network-fee quote → hold → settle flow. Real-chain withdrawal verification/signing/broadcast belongs to later milestones.

Queue ranks use sparse Fenwick counters for display, FIFO and priority lanes over the fixed 40-bit ticket space. PostgreSQL triggers update at most 41 nodes per affected lane under the partition lock, atomically with admission, completion/removal and priority changes. Prefix reads use bounded indexed lookups; no queue-wide scan or renumbering occurs in admission/rank reads. The scoped view/function shows display rank only for waiting entries; dashboards invoke it for known own entry IDs. Staff alone can read serving rank, and disabling priority restores FIFO. Admission tickets/history cannot be rewritten and sequences cannot rewind.

The admin queue read is capped by `pagination_policy`; `limit` must stay within its maximum. Cursor reads require `partition_id` and `after_ticket` together to avoid mixing version-local ticket sequences. IDs and serving positions are staff-only DTO fields. This read contract does not implement the later priority-edit UI/API.

## GIV integrity controls

Outgoing gifts and withdrawals acquire the same user row lock, reload eligibility, and validate the configured asset. Distinct quotes cannot spend the same balance concurrently. UUID request keys are case-insensitive and bind gift/admin/quote inputs; retries return recorded results, while changed inputs conflict. Wallet replay keeps its original verification timestamp. A completed no-wallet receiver keeps available earnings without an automatic withdrawal.

Plan versions retain their USD snapshot; displayed potential receipts use their actual base-unit split and receipt target. Point awards use durable events with sorted transaction advisory locks and UTC daily caps. Empty queues honor block-checkout or the configured business role; the payer is admitted only after recipient selection. New bootstrap allocations use a separate business category, preserving old journal history.

Database guards forbid journal/posting edits and reassignment of used accounts, seal journal lines after their creating transaction, and enforce deferred balanced single-asset postings. Financial owner deletion is restricted. Correct through new journals; never disable these controls for ordinary application work. GIV per-send/daily limits are enforced from immutable hold journals under an asset/day lock. Real signing, approval orchestration, business reservations and recovery remain later work.

Each new GIV receiver allocation captures its source operation/cycle, payer, receiver entry/slot or business role, beneficiary, asset/environment/network, exact amount and credit journal in the same transaction. Deferred database validation checks the funded incoming journal, snapshot economics and destination; unique source/slot keys prevent duplicate attribution. Allocation and operation records are append-only, and withdrawal quote economics/destinations cannot be edited.

Migration 010 links only verifiable legacy GIV evidence. Unknown historical slot order stays null and is marked `legacy_linked`; journals are never rewritten. Staff reconciliation uses a read-only repeatable-read snapshot, caps diagnostic samples and checks journal balance, negative user liabilities, clearing residue, allocation coverage and queue counts. `balanced`, `consistent` and `lineage_complete` are separate results; a balanced ledger can still contain an invalid negative balance or incomplete history. Scheduling/chunking this diagnostic remains subsequent work.

The UI requests a quote, shows gross/fee/net/destination, then requires a separate confirmation. Quote state stays in memory and is discarded on edits, offline state or account changes. Stale responses cannot replace the current identity's dashboard. Notification DTOs expose snake-case UI fields while retaining legacy aliases.

## Durable notification work

Gift and GIV withdrawal transactions insert bounded notification payloads into an immutable outbox. Dispatch creates one job per permanent business key; pending work remains in PostgreSQL. Claims use `FOR UPDATE SKIP LOCKED`, database time, a random lease token and monotonic generation. Effect insertion and completion commit together, with a unique notification delivery key and fresh lease checks. Stale workers cannot commit; expired claims resume under a newer generation. Transient database failures use configured exponential backoff/jitter; permanent/schema failures enter the dead-letter queue. Explicit staff replay preserves job identity and cumulative attempts, adds an audited retry budget and is idempotent; malformed payloads cannot be replayed unchanged.

The signed `/api/v1/internal/tick` endpoint has a separate workload identity. HMAC covers method, path, environment, key ID, timestamp, UUID nonce and body hash. Accepted nonces and five-minute run windows are durable PostgreSQL records; stale/replayed/changed requests are rejected. Current/previous keys support rotation. One tick processes at most 100 jobs within a 15-second claim budget, with bounded statement timeouts; no work continues after its response. These short notification jobs do not require a long-worker heartbeat. A cancelled request stops new claims; unfinished claims recover by lease. This implements no signer, payment confirmation, daily reconciliation/settlement, backup or long-running worker.

Staff job diagnostics expose capped rows and status counts without payloads or lease tokens. Notifications may appear after a later tick; they do not authorize financial transitions. Scheduler setup lives in SETUP.md; no Redis commands are used for delivery or replay protection.

## Deployment flow

GitHub Actions is the deployment authority for the Next.js application:

1. validate/check the repository,
2. migrate/seed the hosted Supabase database when required,
3. build through Vercel CLI,
4. deploy preview or production with `vercel deploy --prebuilt`.

Vercel's native Git auto-deployment should be disabled when this CI path is active to avoid duplicate deployments.

The workflow always runs credential-free checks. Deployment is enabled only by the repository variable `ENABLE_VERCEL_DEPLOYMENTS=true`: same-repository PRs target the protected preview environment; `main` pushes target production; forks receive checks only. Each deployment retrieves and validates its Vercel settings and migrates/seeds its corresponding simulation database before the prebuilt deployment. Setup instructions live only in `SETUP.md`.

The current runtime rejects non-simulation environments and unsupported provider selectors rather than treating a configured live provider as implemented. Mainnet and real signer execution remain disabled until the PRD's later gates are satisfied.

Static API folders preserve parameterized public URLs through rewrites. Resource IDs are validated as UUIDs; handlers resolve the public URL path first because a rewritten Route Handler can retain its original URL. A query parameter cannot override an ID already present in a public resource path.

## Manual M1 acceptance procedure

Use a fresh, isolated **hosted simulation** database migrated and seeded through the deployment workflow. Run `APP_BASE_URL=<the verified HTTPS deployment origin> npm run scenario:m1` with Node 22. It accepts the 21 seeded members, activates Bronze, sends 21 gifts, and checks ten fulfilled bootstrap positions, one credit for `member_01`, and balanced journals, consistent balances/allocations and complete captured lineage. Inspect the returned queue and reconciliation data; do not count health alone as financial acceptance. The scenario changes simulation state and is not repeatable on a used queue without a separately authorized reset of that isolated simulation database. Never reset a shared or real-money database. Record results only in the current project status.

Provider contract acceptance additionally requires documented observations of Upstash expiry/increment/outage behavior, PostgreSQL transaction rollback and duplicate/concurrent admission, missing-wallet liability preservation, and rejected simulated withdrawals. These gates remain separate from compilation and the 21-gift happy path.


## Iteration handover

Implementation state and completion percentages live in the current `docs/PROJECT-STATUS_vN.md`. The self-contained prompt for the next implementation LLM lives in the current `docs/LLM-HANDOVER_vN.md`. The `_vN` filename suffix is the visible iteration version. The baseline pair is `_v0`; each completed iteration normally renames/replaces the pair with `_v1`, `_v2`, and so on.

For additional manual M1 acceptance, immediately after the 21-gift scenario on fresh isolated simulation data, run `APP_BASE_URL=<verified origin> M1_INTEGRITY_CONFIRM=isolated-simulation npm run scenario:m1:integrity`. It exercises grant/wallet replay, changed quote inputs, simultaneous spending and admission, ownership, no-wallet completion, exact small amounts and reconciliation. It changes data, does not reset it, and is never part of CI.

After fresh 21-gift/integrity acceptance, an operator may run `M1_JOBS_CONFIRM=isolated-simulation APP_BASE_URL=<verified origin> npm run scenario:m1:jobs` with both scheduler keys securely bound. It delivers pending notifications and checks signed/rotated-key requests, replay/skew/body/environment rejection, duplicate-run fencing and reconciliation. It is not CI and does not reset data.
