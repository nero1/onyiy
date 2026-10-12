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

Application queries run in a transaction-local role/actor/environment context. `gw_read` has read-only own-row policies and scoped balance/rank views; `gw_service` supplies minimum financial-service writes behind domain authorization. The login cannot own tables or bypass RLS, and staff reads recheck current DB role/status. Context and role reset on commit/rollback. All current tables enable RLS; browser/Data API roles have no application access. Migration/seed/reset use a separate owner connection. Before application migrations, a small owner-only infrastructure bootstrap commits a fresh challenge that the restricted runtime must read. The proof row is cleaned afterward; cloned namespace IDs cannot substitute for this round trip. Post-seed checks repeat binding and validate configuration/roles. Transaction-local search paths pin canonical public tables ahead of temporary shadows.

Migration files each execute in a PostgreSQL transaction. Seeds also execute atomically. The reset CLI requires an explicit simulation environment, database-name confirmation and an enabled database policy; production or non-simulation assets are rejected. Locks serialize its inspection and truncation. Reset also truncates durable outbox/jobs/reports/scheduler/proof records so old work cannot target newly seeded accounts. No public reset endpoint exists.

Authoritative conversion parses decimal strings into integer base units; it does not multiply JavaScript floating-point money. Queue economics retain immutable plan-version snapshots. New seed versions and point rules read database settings without rewriting used economics.

## Cache and browser persistence

PostgreSQL is authoritative. Redis must never be required for financial correctness.

Upstash is the hosted default, but Redis calls are intentionally minimized. Safe public data and approved user-scoped display snapshots can be retained in browser storage to reduce repeated network/cache calls. User-scoped keys must include the active user/session scope and must be cleared on logout, account switch, or authentication failure so data cannot leak between users sharing a device.

Browser v3 snapshots consume public manifest TTL policy and enforce its age at read time. The v3 envelope discards prior envelopes and older overlong caches, writes only for the active owner and treats unavailable/quota-limited storage as optional. An authentication failure purges its request owner; an old response cannot clear a newly selected identity. Current failures remove the dashboard and retain account/retry controls. Browser-stored financial data is display-only and never authorizes a mutation. Auth tokens, signing material, private keys, secrets, and pending financial writes are not stored there. Compact public/private snapshots share the manifest entry/byte budgets, conservatively measured as UTF-16 key/value storage. Expired/malformed records are pruned, least-recently-read records are evicted, and oversized writes are skipped. Account changes purge all prior session generations; blocked storage remains optional. Future larger public/help storage still needs its separate budget contract.

The process-memory adapter has configurable entry/UTF-8 byte limits and LRU eviction, with conservative bootstrap defaults. Concurrent increments are synchronous and keep the original expiry. Redis adapters use one atomic Lua invocation to increment and establish expiry, preserving an existing window and repairing legacy counters with no expiry. REST command errors fail explicitly even on HTTP 200; unsupported selectors and missing explicitly selected Redis configuration fail. Cache counters are expendable display/acceleration state, never durable rate limits or financial authority. One HTTP invocation is not a claim about provider command billing.

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

Cycle completion and withdrawal are separate. The simulator supports a dummy GIV destination and zero-network-fee quote → hold → settle flow. Before a quote is consumed, staff may immutably configure a named GIV `hold` or `reject` outcome with a reason. Held confirmations reserve once and wait; rejection appends `HOLD_RELEASE` and cancels without losing the available balance. A member may cancel an unused quote or a positively unsent GIV hold; staff may explicitly settle/release a delayed hold, including reviewed account-restriction recovery. Settled/cancelled states cannot reopen. These controls are GIV-only and cannot establish nonbroadcast for a live chain. Deferred GIV guards validate exact hold/settle/release owner, asset, amount, journal type and destination before commit; held-balance reconciliation compares outstanding withdrawals with postings. Real-chain withdrawal verification/signing/broadcast belongs to later milestones.

Queue ranks use sparse Fenwick counters for display, FIFO and priority lanes over the fixed 40-bit ticket space. PostgreSQL triggers update at most 41 nodes per affected lane under the partition lock, atomically with admission, completion/removal and priority changes. Prefix reads use bounded indexed lookups; no queue-wide scan or renumbering occurs in admission/rank reads. The scoped view/function shows display rank only for waiting entries; dashboards invoke it for known own entry IDs. Staff alone can read serving rank, and disabling priority restores FIFO. Admission tickets/history cannot be rewritten and sequences cannot rewind.

The admin queue read is capped by `pagination_policy`; `limit` must stay within its maximum. Cursor reads require `partition_id` and `after_ticket` together to avoid mixing version-local ticket sequences. IDs and serving positions are staff-only DTO fields. This read contract does not implement the later priority-edit UI/API.

## Incoming GIV invoices and refundable liabilities

The normal gift UI first requests `POST /api/v1/gifts/invoices`, reviews its immutable amount/expiry, then explicitly submits an empty body to `/gifts/invoices/<id>/transaction`. The server-issued invoice ID is a single-use GIV event identity; it does not establish a blockchain transfer. Unused quotes can be cancelled at `/gifts/invoices/<id>/cancel`, creating no money movement. Quotes move no funds and reserve no queue position. Own capped history is `/me/gift-invoices`; pending quotes also arrive in the dashboard batch and never enter browser snapshots.

Submission uses PostgreSQL time and a common user spend lock. `GIV_INCOMING_HOLD` debits available and credits `incoming_payable`; delayed confirmation keeps that amount unavailable. Acceptance debits incoming and credits available with `GIV_INCOMING_ACCEPT`, then the existing `GIFT_IN` and allocations consume the exact frozen principal in the same transaction. This is internal GIV movement, not a second external inflow. A valid pre-expiry submission can confirm after expiry. Confirmation still rechecks eligibility/economics; an unresolved held simulation payment can be cancelled by reviewed staff recovery.

Named staff controls provide rejection, underpayment, overpayment, late payment and delayed confirmation. Rejection moves no money. Under/late payments create no cycle and reclassify the exact held amount into `refund_payable` with `REFUND_HOLD`. Overpayment admits only the frozen gift amount and retains surplus there. Audited GIV refunds debit refundable and credit the original sender's available balance with `REFUND_SETTLE`; they neither sign nor prove a live-chain refund. Banned-account liabilities remain recoverable. No automatic refund is promised after allocations.

Deferred guards bind state, source operation, amount, owner, asset, plan snapshot, journals and immutable event/control/refund history. Terminal invoices cannot reopen, and invoice-used version economics cannot change. Replay spans quote UUID case, submissions, concurrent confirmations and refunds; direct gift and invoice keys have distinct input hashes. Reconciliation compares submitted and refundable liabilities with their journals separately from withdrawal holds.

Named operator procedure: after the fresh M1/integrity/jobs/recovery order, invoke `scenario:m1:incoming` with `M1_INCOMING_CONFIRM=isolated-simulation`. It uses Silver independently of Bronze and exercises rejection, under/over/late/delayed holds, cancellation/refund replay, ownership and reconciliation. Also observe pre-expiry submission confirmed after expiry, tamper rejection, original-sender refund proof, restricted-account recovery and EN/FR review at mobile width. This is GIV acceptance only; reorgs, wallet-signed transfers and real-chain finality remain separate contracts.

## GIV integrity controls

Outgoing gifts and withdrawals acquire the same user row lock, reload eligibility, and validate the configured asset. Distinct quotes cannot spend the same balance concurrently. UUID request keys are case-insensitive and bind gift/admin/quote inputs; retries return recorded results, while changed inputs conflict. Wallet replay keeps its original verification timestamp. A completed no-wallet receiver keeps available earnings without an automatic withdrawal.

Plan versions retain their USD snapshot; displayed potential receipts use their actual base-unit split and receipt target. Point awards use durable events with sorted transaction advisory locks and UTC daily caps. Empty queues honor block-checkout or the configured business role; the payer is admitted only after recipient selection. New bootstrap allocations use a separate business category, preserving old journal history.

Database guards forbid journal/posting edits and reassignment of used accounts, seal journal lines after their creating transaction, and enforce deferred balanced single-asset postings. Financial owner deletion is restricted. Correct through new journals; never disable these controls for ordinary application work. GIV per-send/daily limits are enforced from immutable hold journals under an asset/day lock. Real signing, approval orchestration, business reservations and recovery remain later work.

Each new GIV receiver allocation captures its source operation/cycle, payer, receiver entry/slot or business role, beneficiary, asset/environment/network, exact amount and credit journal in the same transaction. Deferred database validation checks the funded incoming journal, snapshot economics and destination; unique source/slot keys prevent duplicate attribution. Allocation and operation records are append-only, and withdrawal quote economics/destinations cannot be edited.

Migration 010 links only verifiable legacy GIV evidence. Unknown historical slot order stays null and is marked `legacy_linked`; journals are never rewritten. Staff reconciliation uses a read-only repeatable-read snapshot, caps diagnostic samples and checks journal balance, negative user liabilities, clearing residue, allocation coverage and queue counts. `balanced`, `consistent` and `lineage_complete` are separate results; a balanced ledger can still contain an invalid negative balance or incomplete history. Each aggregate shares an eight-second deadline and at most a one-second statement budget. A timeout fails explicitly. Signed ticks enqueue one reconciliation job per UTC date; its repeatable-read snapshot, capped immutable result and job completion commit atomically. Summary/detail report endpoints remain staff-only; discrepancies are recorded without repair. This is bounded execution, not proven large-dataset chunking or external-alert acceptance.

Own held-withdrawal DTOs are capped and omit destinations; the EN/FR UI exposes explicit cancellation. They are excluded from browser snapshots and disappear on identity change/offline snapshot fallback. The conservative GIV daily budget still counts immutable hold journals, including subsequently released holds, until its UTC-day window advances.

The UI requests a quote, shows gross/fee/net/destination, then requires a separate confirmation. Quote state stays in memory and is discarded on edits, offline state or account changes. Stale responses cannot replace the current identity's dashboard. Notification DTOs expose snake-case UI fields while retaining legacy aliases.

## GIV incoming reorg review

An explicit staff simulation action invalidates a captured incoming allocation. Each revision appends immutable review/loss/point records, returns the original payer's internal GIV principal through `REORG_COMPENSATE` (debit simulation-chain-loss expense, credit payer available), pauses its partition, and freezes affected user/asset spends. Beneficiary balances and settled withdrawals are preserved; known post-source settled outflow is an exposure snapshot, not proof which commingled credit funded which withdrawal. No unrelated balance is debited or transfer history undone.

Own scoped views expose current review without rewriting original tickets/counters/cycle timestamps. Primary valid receipt counts exclude open invalidations; the receiver, source cycle and later dependent admissions show exception review, including completed cycles/cooldowns. Historical receipt counts remain separate. Earlier unrelated completed cycles remain completed. Available/held debits, settlements and admissions have commit-time guards in addition to API checks; positive GIV cancellation/refund recovery remains available. Financial participant locks use sorted user IDs, including invoice/referral/staff paths.

Only explicit positive GIV reconfirmation appends the inverse compensation (debit payer available, credit the same loss account), linked immutable resolution and point restoration. No second gift/slot/payout is created; review clears only when its source has that resolution. Original daily spend/point budgets remain conservative; restoring reversed points does not consume a second daily award allowance. These are simulation controls, never real-chain finality, nonbroadcast or treasury-loss proof. A persistently invalid source remains in review rather than receiving automatic repair.

Named operator procedure: after the fresh M1/integrity/jobs/recovery/incoming sequence, run `scenario:m1:reorg` with `M1_REORG_CONFIRM=isolated-simulation`. Observe already-settled history, unsent holds, repeated revisions, input-bound replay, invalid receipt counts, dependency/cooldown review, paused mutations and reconciliation before/after reconfirmation. Also exercise direct database bypass/tamper rejection, receiver/referrer overlap and concurrent gift/reorg. Raw review history is capped and staff-only; own views expose no other user's review or private evidence.

## Durable notification work

Gift and GIV withdrawal transactions insert bounded notification payloads into an immutable outbox. The signed tick also inserts the current UTC-day reconciliation key; delayed pending work catches up without duplicating that key. Dispatch creates one job per permanent business key; pending work remains in PostgreSQL. Claims use `FOR UPDATE SKIP LOCKED`, database time, a random lease token and monotonic generation. Effect insertion and completion commit together, with a unique notification delivery key and fresh lease checks. Stale workers cannot commit; expired claims resume under a newer generation. Transient database failures use configured exponential backoff/jitter; permanent/schema failures enter the dead-letter queue. Explicit staff replay preserves job identity and cumulative attempts, adds an audited retry budget and is idempotent; malformed payloads cannot be replayed unchanged.

The signed `/api/v1/internal/tick` endpoint has a separate workload identity. HMAC covers method, path, environment, key ID, timestamp, UUID nonce and body hash. Accepted nonces and five-minute run windows are durable PostgreSQL records; stale/replayed/changed requests are rejected. Current/previous keys support rotation. One tick processes at most 100 non-signing jobs within a 15-second claim budget, with bounded statement timeouts; no work continues after its response. These short notification jobs do not require a long-worker heartbeat. A cancelled request stops new claims; unfinished claims recover by lease. Daily financial diagnostics now publish bounded results. This implements no signer, payment confirmation, business settlement, backup, external alert or long-running worker.

Staff job diagnostics expose capped rows and status counts without payloads or lease tokens. Notifications may appear after a later tick; they do not authorize financial transitions. Scheduler setup lives in SETUP.md; no Redis commands are used for delivery or replay protection.

## Bounded operational retention

The signed tick enqueues one UTC-day `operational_cleanup` root. Each claimed page removes at most `min(job_policy.chunk_size,100)` expired nonces and old completed scheduler runs in its environment, using indexed reads and `SKIP LOCKED`. Nonces retain at least the full ten-minute timestamp/skew window. Runs must have an expired lease, an old creation/completion time and a numeric five-minute window older than `retention_policy.http_replay_days`; unfinished runs are retained. PostgreSQL guards reject early deletion and identity changes, including attempts to reopen completed windows.

Deletion, an immutable `maintenance_results` record and fenced job completion commit together. Remaining eligible rows, including skipped locks, enqueue a permanent next-page key for a later tick. There is no request-time drain loop. Invalid work goes to DLQ; timeouts roll back deletions and use normal retry. `OPERATIONAL_RETENTION_HOLD=true` suppresses both daily and request-time nonce pruning; invalid values fail closed. Staff-only `GET /api/v1/admin/maintenance/reports` returns capped counts/hold/backlog observations without payloads or leases.

This retains all jobs/outbox/delivery keys, reconciliation reports, audit history, notifications and financial records regardless of age. It implements no financial archive, export expiry, notification deletion or terminal-job payload compaction. A report with `more_possible=true` describes a bounded page, not completed cleanup. Held pages resume through a later daily root when the deployment hold is removed.

Named operator procedure: on fresh isolated simulation data, run the existing M1 → integrity → jobs → recovery → incoming → reorg sequence. Then create isolated old/recent/unfinished/other-environment scheduler fixtures. Observe page limits, continuation, concurrent skipped locks, hold, duplicate job identity, timeout rollback/retry, early-delete/identity/immutable-report rejection and member/browser privacy. Compare financial history and pending/DLQ work before/after, then reconcile. Never age or reset shared records to manufacture acceptance.

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

Named cache contract procedure: use isolated keys to set/get/delete JSON, increment concurrently, verify a later increment cannot extend the first expiry, repair a legacy nonexpiring counter, then verify expiry and an unavailable adapter fails explicitly. Observe browser entry/byte eviction, oversized writes, malformed/expired envelopes, account/session switching and blocked storage. Exercise the selected hosted provider separately; a compatible Redis/local REST bridge does not prove hosted Upstash or quota acceptance.

Provider contract acceptance additionally requires documented observations of Upstash expiry/increment/outage behavior, PostgreSQL transaction rollback and duplicate/concurrent admission, missing-wallet liability preservation, and rejected simulated withdrawals. These gates remain separate from compilation and the 21-gift happy path.


## Iteration handover

Implementation state and completion percentages live in the current `docs/PROJECT-STATUS_vN.md`. The self-contained prompt for the next implementation LLM lives in the current `docs/LLM-HANDOVER_vN.md`. The `_vN` filename suffix is the visible iteration version. The baseline pair is `_v0`; each completed iteration normally renames/replaces the pair with `_v1`, `_v2`, and so on.

For additional manual M1 acceptance, immediately after the 21-gift scenario on fresh isolated simulation data, run `APP_BASE_URL=<verified origin> M1_INTEGRITY_CONFIRM=isolated-simulation npm run scenario:m1:integrity`. It exercises grant/wallet replay, changed quote inputs, simultaneous spending and admission, ownership, no-wallet completion, exact small amounts and reconciliation. It changes data, does not reset it, and is never part of CI.

After fresh 21-gift/integrity acceptance, an operator may run `M1_JOBS_CONFIRM=isolated-simulation APP_BASE_URL=<verified origin> npm run scenario:m1:jobs` with both scheduler keys securely bound. It delivers pending notifications and checks signed/rotated-key requests, replay/skew/body/environment rejection, duplicate-run fencing and reconciliation. It is not CI and does not reset data.

For GIV withdrawal recovery, run `M1_RECOVERY_CONFIRM=isolated-simulation APP_BASE_URL=<verified origin> npm run scenario:m1:recovery` after the fresh M1 scenarios. It records cancelled/rejected/delayed withdrawals and verifies concurrent confirmation/cancellation, duplicate staff resolution and held-liability reconciliation. It never resets data or contacts a blockchain.

The admin reconciliation notice requires balanced journals, consistent liabilities/counters and complete lineage to report success. Timeout/discrepancy/incomplete legacy evidence asks for review. Notices remain below the measured sticky header so wrapped mobile controls remain reachable.
