# How Gifters World Works — Technical Summary

## Hosted architecture

Gifters World is a TypeScript application built on Next.js 16 App Router, React, native Next.js Route Handlers, Drizzle ORM, and PostgreSQL.

Primary hosted stack:

- **Vercel** — Next.js web/PWA and Node.js Route Handlers
- **Supabase PostgreSQL** — primary database
- **Upstash Redis REST** — default cache/coordination provider, used sparingly
- **GitHub Actions** — checks and Vercel deployments
- **separate scheduled signer workload** — staged encrypted-key worker for testnet contracts; external execution stays disabled and signer secrets do not belong in Vercel

Provider boundaries remain portable: compatible PostgreSQL databases and compatible Redis providers can be supported without changing domain logic.

## Database and Drizzle

Supabase is used primarily as PostgreSQL. Runtime Vercel Functions use the Supabase transaction pooler; migrations/admin work use an appropriate migration connection.

Application table access is Drizzle-first, targeting effectively 100% coverage. Raw SQL is reserved for PostgreSQL-specific operations such as DDL, GRANT/RLS, explicit locking, transaction-local security context, bounded PostgreSQL rank counters/functions, and specialized reconciliation/recovery. Native backup infrastructure additionally uses catalog fingerprints and an exported snapshot; application row inventories use Drizzle keyset pages.

Every migration that creates a new `public` table must include an explicit Supabase GRANT classification. Sensitive financial, identity, ledger, admin, queue, payout, and audit tables must not be broadly exposed to `anon` or `authenticated` merely to satisfy the Data API.

## Isolated simulation recovery

An operator-only CLI streams an application-public-schema native dump into AES-256-GCM, with a separately HMAC-signed counts/hash inventory. Drizzle row hashes and the dump share one read-only repeatable snapshot. All current financial/work/history/counter tables, provider identities, sealed factors, one-use recovery hashes and TOTP replay steps are retained. Session/refresh/PKCE-flow/rate-counter data, fresh binding challenges and unrelated provider schemas are excluded; restoring cannot resume a source session. Their schema/RLS/grants still enter the exact fingerprint. Unknown tables/settings and non-simulation assets fail closed. No plaintext archive or secret is logged; the maintenance key and owner connection stay outside Vercel.

Restore requires explicit simulation/target confirmations, disabled signing, absent scheduler keys, an empty dedicated target and fresh owner/runtime binding. Full authentication/version checks precede bootstrap; a private ciphertext copy prevents input swapping. Only the signed pgcrypto dependency is provisioned separately. Native import preserves the existing public schema and ACLs, runs in one transaction and never cleans, merges or publishes. Exact rows, schema/RLS/grants, extension version and runtime configuration are verified afterward. Failed staging remains quarantined; there is no automatic repair or job resumption. SETUP section 20 describes private files, native tools, role/TLS provisioning and named acceptance. The verified GIV round trip preserves liabilities, pending work and open review; hosted/live-chain recovery and product portability remain incomplete.

## Manifest authority and safety

`xmanifest.json` contains validated bootstrap defaults. Seeding inserts missing settings in one transaction and preserves existing database values, asset enablement and plan edits. The database is runtime authority: financial services reload validated configuration in their transaction. Schema-declared policies for future services do not implement those services.

The Phase One registry validates 68 static settings and typed plan/asset/risk keys, with explicit public/private/staff scopes and closed nested fields. Unknown legacy database keys are quarantined from outputs. Credentials, platform-address configuration and secret-bearing URLs are rejected; public token registry fields are a distinct permitted class. Invalid financial settings or deployment ceilings block mutations with a redacted configuration error.

`/manifest` projects only registered public fields, uses a weak ETag and bounded CDN TTL, and may serve validated public seed defaults during database failure. This fallback never authorizes a mutation. The public catalog also uses a weak ETag and its database-configured CDN TTL; matching requests return an empty 304, accepting lists, strong/weak equivalents and wildcard validators. Public manifest/catalog misses now share one bounded process L1 loader per resource; only projected DTOs enter its entry/byte budget. L1 age reduces outward CDN freshness rather than restarting it. Committed plan activation invalidates both local DTOs with a generation fence; older in-flight completion cannot repopulate or remove a newer flight. Other instances and out-of-band changes remain TTL-bounded. Money, identity/status and staff permission reads stay live. Failed catalog loads are not cached; public manifest seed fallback has at most a five-second L1 lifetime. No Redis command or financial cache is introduced. Private responses remain private/no-store. Simulation, finance, auth and operational policies do not enter the public DTO.

Runtime, migration and health connections enforce verified certificate trust and hostname for remote PostgreSQL. URL SSL options cannot weaken verification; bounded connection/pool settings reject invalid values. Optional deployment CA certificates remain server-only. Plaintext is limited to loopback simulation tooling outside Vercel.

Health coalesces simultaneous requests into one separate database probe, reads validated database configuration, and closes timed-out work without cancelling application transactions. The bootstrap `health_timeout_ms` is its cold-start ceiling; database policy may tighten successful readiness. Outages return a redacted 503; no Redis command, treasury diagnostic or secret is exposed. Health alone does not prove financial acceptance.

Application queries run in a transaction-local role/actor/environment context. `gw_read` has read-only own-row policies and scoped balance/rank views; `gw_service` supplies minimum financial-service writes behind domain authorization. The login cannot own tables or bypass RLS, and staff reads recheck current DB role/status. Context and role reset on commit/rollback. All current tables enable RLS; browser/Data API roles have no application access. Migration/seed/reset use a separate owner connection. Before application migrations, a small owner-only infrastructure bootstrap commits a fresh challenge that the restricted runtime must read. The proof row is cleaned afterward; cloned namespace IDs cannot substitute for this round trip. Post-seed checks repeat binding and validate configuration/roles. Transaction-local search paths pin canonical public tables ahead of temporary shadows.

Migration files each execute in a PostgreSQL transaction. Seeds also execute atomically. The reset CLI requires an explicit simulation environment, database-name confirmation and an enabled database policy; production or non-simulation assets are rejected. Locks serialize its inspection and truncation. Reset also truncates durable outbox/jobs/reports/scheduler/proof records so old work cannot target newly seeded accounts. No public reset endpoint exists.

Authoritative conversion parses decimal strings into integer base units; it does not multiply JavaScript floating-point money. Queue economics retain immutable plan-version snapshots. New seed versions and point rules read database settings without rewriting used economics.

## Cache and browser persistence

PostgreSQL is authoritative. Redis must never be required for financial correctness.

Upstash is the hosted default, but Redis calls are intentionally minimized. Safe public data and approved user-scoped display snapshots can be retained in browser storage to reduce repeated network/cache calls. User-scoped keys must include the active user/session scope and must be cleared on logout, account switch, or authentication failure so data cannot leak between users sharing a device.

Browser v3 snapshots consume public manifest TTL policy and enforce its age at read time. The v3 envelope discards prior envelopes and older overlong caches, writes only for the active owner and treats unavailable/quota-limited storage as optional. An authentication failure purges its request owner; an old response cannot clear a newly selected identity. Current failures remove the dashboard and retain account/retry controls. Browser-stored financial data is display-only and never authorizes a mutation. Auth tokens, signing material, private keys, secrets, and pending financial writes are not stored there. Compact public/private snapshots share the manifest entry/byte budgets, conservatively measured as UTF-16 key/value storage. Expired/malformed records are pruned, least-recently-read records are evicted, and oversized writes are skipped. Account changes purge all prior session generations; blocked storage remains optional. A separate versioned IndexedDB public-document store now applies `max_public_help_mb` and the smaller of `max_memory_entries`/1,000 entries. It stores projected simulation catalog fields and closed EN/FR text-help DTOs, never generic API responses or private namespaces. UTF-8/UTF-16 accounting plus metadata allowance, fixed expiry, caller age, malformed pruning and LRU eviction are enforced in serialized read/write transactions across contexts. Budget changes trim existing records; oversize/quota/unavailable/blocked storage remains optional. Compact storage is still independently bounded. Help publishing/search and full offline shell remain incomplete.

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

For server L1 acceptance, lock an isolated source table, launch 100 cold public requests and observe one waiting loader; release and compare the responses. Warm reads should complete while the source is locked. Invalidate during an older blocked load, change a display policy and confirm a newer flight/response survives. Observe aged outward TTL, expiry, actual statement timeout, failed-flight recovery and safe public fallback. Warm public data then disable gifts/restrict staff in the DB: money/staff routes must still reject. Commit isolated plan activation and verify both public DTOs/ETag refresh without changing existing money/work fingerprints.

The dashboard keeps the compact catalog fallback and asynchronously restores the public disk catalog. A request generation prevents delayed disk/old network reads from replacing a fresher catalog. Successful actions still re-fetch authoritative server data and update both display stores. Public cache data never changes authorization, quotes, balances or writes.

Named cache contract procedure: use isolated keys to set/get/delete JSON, increment concurrently, verify a later increment cannot extend the first expiry, repair a legacy nonexpiring counter, then verify expiry and an unavailable adapter fails explicitly. Observe browser entry/byte eviction, oversized writes, malformed/expired envelopes, account/session switching and blocked storage. For the separate public store, observe EN/FR key isolation, tightened TTL/budgets, multibyte/oversize rejection, reload persistence, simultaneous writes from two same-origin contexts, a forced quota abort followed by a successful write, and rejection/pruning of private/extra-field records. Remove the compact catalog and fail public API reads to verify disk restoration; delay database opening while serving fresh plans to verify stale results never replace them. Check catalog ETag/304/DB TTL and private no-store headers. Exercise the selected hosted provider separately; a compatible Redis/local REST bridge does not prove hosted Upstash or quota acceptance.

Provider contract acceptance additionally requires documented observations of Upstash expiry/increment/outage behavior, PostgreSQL transaction rollback and duplicate/concurrent admission, missing-wallet liability preservation, and rejected simulated withdrawals. These gates remain separate from compilation and the 21-gift happy path.


## Iteration handover

Implementation state and completion percentages live in the current `docs/PROJECT-STATUS_vN.md`. The self-contained prompt for the next implementation LLM lives in the current `docs/LLM-HANDOVER_vN.md`. The `_vN` filename suffix is the visible iteration version. The baseline pair is `_v0`; each completed iteration normally renames/replaces the pair with `_v1`, `_v2`, and so on.

For additional manual M1 acceptance, immediately after the 21-gift scenario on fresh isolated simulation data, run `APP_BASE_URL=<verified origin> M1_INTEGRITY_CONFIRM=isolated-simulation npm run scenario:m1:integrity`. It exercises grant/wallet replay, changed quote inputs, simultaneous spending and admission, ownership, no-wallet completion, exact small amounts and reconciliation. It changes data, does not reset it, and is never part of CI.

After fresh 21-gift/integrity acceptance, an operator may run `M1_JOBS_CONFIRM=isolated-simulation APP_BASE_URL=<verified origin> npm run scenario:m1:jobs` with both scheduler keys securely bound. It delivers pending notifications and checks signed/rotated-key requests, replay/skew/body/environment rejection, duplicate-run fencing and reconciliation. It is not CI and does not reset data.

For GIV withdrawal recovery, run `M1_RECOVERY_CONFIRM=isolated-simulation APP_BASE_URL=<verified origin> npm run scenario:m1:recovery` after the fresh M1 scenarios. It records cancelled/rejected/delayed withdrawals and verifies concurrent confirmation/cancellation, duplicate staff resolution and held-liability reconciliation. It never resets data or contacts a blockchain.

The admin reconciliation notice requires balanced journals, consistent liabilities/counters and complete lineage to report success. Timeout/discrepancy/incomplete legacy evidence asks for review. Notices remain below the measured sticky header so wrapped mobile controls remain reachable.


## Identity and request security

The default isolated simulation chooser now issues real platform sessions; a username header is never a credential. Native auth routes support simulation signup/login or configured Google OIDC. Google uses fixed HTTPS endpoints, state/nonce/PKCE, RS256/JWKS verification, exact approved callback origin and provider+subject identity. Email never merges accounts automatically. Verified local initials replace remote avatar fetching. Real Google login remains unrun without owner credentials.

JWT access and opaque rotating refresh credentials live only in narrow-path HttpOnly SameSite=Lax cookies, Secure on HTTPS. Separate server-only keys sign access and AES-GCM-seal TOTP secrets. Database families bind user, generation, version, access/CSRF hashes and absolute/idle/access expiries. Access includes an unpredictable per-issue identifier. Refresh reuse commits family revocation before returning 401. Every private handler checks current DB state; status/role changes revoke all families and increment the version. Private writes require exact Origin plus a session-bound double-submit CSRF token. Account/generation intent headers cannot authorize anything; they reject delayed requests from a prior account. Logout revokes records; stale logout/401 responses never clear a newer account's cookies.

Consent requires explicit current terms, age attestation and confirmed validated username. Initial GIV grant/referral/points remain permanent-keyed; renewal grants nothing twice. Optional member MFA and mandatory staff step-up use encrypted factors, durable monotonic/unique TOTP steps and ten hashed one-use recovery codes. The setup secret and new codes appear once in component memory and never browser persistence. Typed short pre-auth credentials authorize only MFA verification. Staff routes and withdrawal confirmation recheck live proof freshness; financial transactions check the family both before domain work and before commit. Sorted participant locks remain unchanged. A revoked/rotated family rolls back money and the permanent request result.

PostgreSQL counters enforce current typed rate policies, including failed attempts, with one atomic increment transaction before domain work. Vercel's forwarded client IP supplies IP policies; a non-Vercel isolated fixture uses one conservative shared IP bucket. No Redis outage can bypass a closed policy. Auth counters/replay records currently remain retained; bounded cleanup is future work, never an excuse to delete business identities.

A fresh random nonce and strict-dynamic CSP protect dynamically rendered HTML. Next receives the same nonce policy as the browser. Browser connections are same-origin; images allow local/data/blob receipts; frames/objects/base changes are closed. Production has no unsafe-eval or unsafe-inline. HTTPS enables HSTS/upgrade-insecure-requests. Public API caching stays separate; private APIs/HTML remain no-store. Homepage bundle measurement renders the actual production HTML without provider credentials.

Named identity procedure: use an isolated database and browser; observe unchecked EN/FR terms/age, pending private-route denial, own-row access, spoofed header/cross-origin/CSRF rejection and permanent grant/gift replay. Rotate refresh twice, replay the used token and verify both access/refresh fail. Enroll TOTP, repeat the same step, log in through pre-auth, consume/reuse recovery, expire staff proof and ban/role-change the account while checking unchanged liabilities. Observe idle/absolute/database access expiry and a genuine user-lock race with concurrent family revocation: no gift journal/cycle/request result may commit. On a 390px browser verify setup/codes never enter localStorage/IndexedDB, recovery survives pre-auth reload, logout/switch purges prior snapshots, and CSP blocks an untrusted inline event handler while nonce-bearing Next hydration works. Generated RSA proof vectors are separate from real Google callback acceptance. Repeat live Google/HTTPS/provider checks only when configured.

## Public help, inbox and audited administration

Published help has English/French plain-text bodies, local accent-folded search and permanent article-ID slug redirects. Drafts remain staff-only. Editor bodies are fetched individually; public loads cap100 articles/locale,20,000 characters/body,3MiB and five seconds. Versioned settings validate the complete typed policy/security ceilings; help/settings/priority require an audit reason and permanent payload-bound request key. Direct plan/asset edits require their dedicated domain operations. Priority edits lock partition then entry, update revision and serving lane only, preserving display ticket and money. Disabled admin allows read-only preview; other disabled new features404.

Notification cursor HMAC binds owner/page size/expiry. Exact PostgreSQL six-digit timestamps plus ID order every page and monotonic seen marker. Opening a list marks its newest item seen; expanding an individual message marks it read. Neither changes money. Cross-owner/cursor-tamper attempts fail. Mobile inbox stays within the viewport.

The installable service worker caches only offline.html, pwa-shell.js/css and two local icons. Private HTML/API, credentials and mutations are excluded. Offline navigation renders bounded public catalog/help from IndexedDB; writes fail without a retry queue. Installing an update requires explicit reload. Disabling PWA removes its owned cache/worker. Dynamic HTML retains nonce CSP; offline static HTML uses external same-origin script/style.

Validated account/family scope coordinates tabs using storage events/BroadcastChannel metadata, never authority. A different scope clears earlier private views; a same-family new-tab bootstrap leaves valid views intact. API retries freeze their original family generation and cannot adopt a fresh login or purge its snapshot. The live dashboard supplies current terms/age renewal text; renewed consent grants no second GIV allocation. Dashboard/wallet-link/send entitlements are checked server-side.

Named product procedure: in an isolated namespace verify published/draft EN/FR search/ETag, help rename aliases, stale editors and exact replay; settings invalid-policy rejection and priority serving/display separation with unchanged reconciliation. Observe own cursor tamper/cross-owner rejection and sub-millisecond seen/read ordering. On390px inspect inbox bounds, staff MFA editors, two-tab identity changes, real public-only offline navigation and failed unqueued writes. Change terms/entitlements and verify live rejection/no duplicate grant, then restore policies. Provider/mobile install acceptance remains separate.

## Account moderation and appeals

Staff moderation has independent live permissions and mandatory MFA. Actor/target user locks are sorted; edits require revision, reason and permanent payload-bound key. Moderators suspend/restore member accounts only, never ban/delete/roles/finance. Self and admin targets are protected. Ban/deletion block normal login but retain financial references. Confirmed deletion removes profile/email/exposed referral/auth secrets, redacts case prose and creates an immutable tombstone; historical wallet/financial evidence remains. Verified lost-factor reset requires admin proof reference, removes old factor/recovery state and revokes every family; it never restores a banned account automatically.

Suspended sign-in is limited to account/case/help/security. New financial operations fail; existing receiver credits continue. Own deactivation/reactivation revokes credentials and requires new sign-in. Temporary suspension is capped30 days, records the prior active/deactivated status, and restores that status with an audit using DB time at sign-in or a bounded100-row scheduler page. No report count triggers financial confiscation.

Reports dedupe actor/target/normalized reason within current hours. Reviewed cases offer15-minute family-bound one-use tokens. Appeals consume the token atomically and preserve permanent replay; a different login/restore cannot reuse proof. Staff resolves cases with revision/reason/audit. Portals store private data only in component memory and discard late responses on scope changes. Admin direct/selected-recipient notice batches cap100 recipients/2000 characters, dedupe via durable outbox and carry no moderator bulk permission.

Named procedure: use an isolated fresh namespace, run the six financial scenarios, then observe cookie member/moderator/admin denial and mandatory MFA; suspend/replay/stale edit, old-family revocation/restricted access, own report/token/replay/cross-owner/new-family rejection, resolution/restore, deactivation, expiry, ban and verified deletion/reset. Compare exact posting fingerprints for administration-only actions and verify suspended receivers still credit normally. Observe390px EN/FR forms and queue deduped notices, then reconcile. Reviewed original-wallet liability and owner-only last-admin recovery follow the procedure below.

## Own portability, member routes and plan lifecycle

Own exports are authenticated async JSON/CSV file sets built by existing bounded outbox jobs. Nine closed sections cover profile/consent, public wallet links, cycles/invoices, points, notices, own ledger/payout history and referral totals; no auth tokens/factors/credentials or private journal metadata are exported. Pages contain at most100 rows/1MiB; each request caps50MiB/10000 pages and two active builds. Current creation allowance is two/day. Reads and exact replays use read/fallback limits without another creation. Each page records capture time and a creation cutoff; it is a personal data export, not the native whole-site monetary snapshot. Authenticated paged reads can be consumed incrementally above browser artifact limits.

Independent server-only DATA_EXPORT_KEY seals owner/export/part-bound chunks and content hashes. Own authenticated downloads expire under retention_policy.export_hours and use no-store attachments, with CSV formula escaping. Worker completion/failure is fenced by lease; immutable chunks reject updates and premature removal. Expired/deleted-owner chunks purge in100-row maintenance pages; verified profile deletion removes copied artifacts under owner locks. Request/work/business histories remain. New continuation pages dispatch on a later tick; nine small sections may take nine scheduler ticks. Product pages keep artifact data in memory and never queue offline writes.

History, points and referrals use closed own projections. Opaque referral links prefill explicit consent; prior grants/attribution remain permanent. Settled-only payout receipts show precise original asset/network/net/fee and produce local PNG; native share has a download fallback. PNG/CSV never authorize money or imports.

Typed staff plan edits create disabled drafts and new immutable economics versions. Public catalog selects latest version per plan/asset. Outstanding cycles/invoices/queue positions block economics replacement; pause/disable/retire preserve existing money/rights. Shared plan locks fence intake against lifecycle changes. Manual creation caps100 plans/100 initial system positions; bootstrap add pages cap100 and keep40-bit counters. Only wholly unallocated bootstrap entries can become removed; funded history cannot be erased. Scheduling is an audited approval with current revision/deadline/author checks; at most one due launch runs per tick. Retirement cannot be bypassed through legacy activation.

The owner-only migration ledger stores filenames/checksums atomically with each application. Unchanged files skip; edited applied bodies fail. Use forward migration files for fixes and retain the provenance in native snapshots. Never overwrite old financial data/archives or bypass checksums.

Named procedure: on isolated fresh current schemas run the six financial scenarios. Independently request/replay/build/download own JSON/CSV, inspect closed/encrypted fields, tamper owner/section, repeat reads beyond creation allowance, observe immutable/early-delete/expiry/privacy guards and compare posting fingerprints. Exercise disabled draft/new immutable version/latest catalog, stale edits, outstanding-rights refusal, bootstrap add/remove/funded refusal, retirement and due launch. Observe390px EN/FR member files/points/referrals/history/settled PNG and staff MFA/editor. Preserve failures, verify encrypted native roundtrip plus post-restore migration skip, and reconcile. Native OS share/hosted wallet/provider behavior are separate unrun observations.

## Staged testnet financial contracts

The native chain workspace supports Sepolia, BNB testnet, SOL devnet/SPL and TRON Nile/Shasta TRC20 through independently configured RPCs. Registry defaults empty and requires owner-verified asset identities; no guessed contract/mint enables a currency. Asset IDs bind network/decimals/contract/mint. Historic invoices and obligations retain their verified registry snapshot. GIV remains simulation-only.

Wallet proof uses a five-minute one-use message bound to account/family/network/address; linking moves no money. Changes increment the destination revision and apply cooling. Incoming quotes pin plan version/asset/treasury/sender/expiry. Authenticated submission records first-seen time; a server workload verifies canonical transfer/event/finality independently. Conflicting RPC evidence waits. Under/late/ineligible/extra payments remain refundable. Verified custody is booked before cycle admission; savepoint/immediate constraint validation preserves the full refundable liability when admission changes after payment. Accepted surplus is held separately. These are local/generated provider contracts so far, not live-chain acceptance.

Owner-signed Ed25519 rate documents pin exact asset/native USD strings, source and five-minute validity. Web stores only the public verification key. Withdrawal quoting moves no money; confirmation binds current wallet revision/family and reserves gross once. Native fees convert upward into the withdrawal asset without a swap; net remains binding. Verified settlement separates principal, native expense, approved recovery charge and attributable refund. Known executed failure retains its hold until every saved attempt is positively failed and independently reverified. Closing charges attributable actual fees up to the approved amount and returns the unspent balance once. A fresh quote links the closed request and requires renewed confirmation; same-nonce replacement and independently verified expiry follow the procedure below; native reorg remains required.

Business manual/daily services share a source-account lock and permanent UUID/UTC-date keys, including empty results. They aggregate role earnings into deterministic capped legs; fees are platform-paid. Admin-assisted refund holds target the proven original sender and do not silently deduct principal. The independent signer checks live configuration, per-send/day caps and reserved native gas outside beneficiary liabilities. Claims lease a nonce without consuming it; encrypted signed bytes and nonce advance commit together. Only persisted bytes can broadcast, ambiguity retries the same bytes, and post-ledger worker status repair is supported. A received signal stops new work without releasing an ambiguous hold.

Workload HMAC binds method/path/environment/body/time/one-use nonce. Challenges/nonces expire in guarded bounded pages and obey retention holds. External alert acceptance requires an authenticated ACK echoing delivery key and body hash, with bounded response/time, retained retry and lease-fenced results. Monitors project gas/heartbeat/custody observations without signing bytes or lease tokens. Reminders/admin controls and complete operational recovery remain outstanding.

**External native execution remains hard-disabled in both web and signer code while implementation closure is incomplete.** Environment approval strings cannot override it. Generated RPC/signing fixtures and balanced journals do not establish actual native funding/custody. No real broadcast, contract acceptance, external alert endpoint or release gate is claimed.

Encrypted native recovery now supports simulation and testnet envelopes and56 retained inventories across63 schema/RLS/grant definitions. It preserves encrypted attempts, monetary/registry snapshots and outstanding holds. Auth sessions/refresh/PKCE/rate data, wallet challenges, worker nonces and binding challenges do not transfer. Private backup/signing/payload/MFA/export/workload/alert keys stay outside archives and native child environments. Restore requires an empty inactive bound target, verifies hashes/schema/rows atomically and starts no worker. Labeled GIV fixtures in the isolated testnet-format acceptance source remain nonredeemable simulation records. Mainnet records are rejected. Cold recovery still requires trusted chain checkpoint reconciliation before any future resume.

## Native product and operations continuation

The testnet profile uses native home/gifts/wallet views. Linking proves ownership without transferring funds. Incoming review shows exact asset/network/destination and sender-paid network/setup charges; only explicit wallet approval requests a transfer. The server prepares frozen exact transfer data, never an allowance approval. Private drafts clear on identity changes; lazy wallet SDKs do not load for passive browsing. All native execution remains disabled pending implementation closure and independent owner/live release gates.

A wallet hash can be staged before its receipt index is known. A durable bounded job discovers one unique event, then independently verifies canonical finality. Pending waits for a later scheduler tick; confirmations and retries book money once using permanent canonical event keys. Explicit native reserve contributions use ownership proof plus independently verified receipt and give no member balance. SOL recipient account setup is quoted/posted separately from network gas.

Native admin stages verified currencies, activates immutable plan snapshots, prepares platform-paid business settlements, approves held obligations and controls alerts. Reminder ticks use a daily cap/permanent ordinals; acknowledgement stops new reminders and resolution is audited. The separate opt-in financial scheduler performs observation/operations only and has no signing key. Complete replacement/reorg/checkpoint/sweep and remaining admin acceptance still follow.

## Replacement, expiry, challenge and recovery procedures

EVM workers observe every known hash first, preserve exact principal/recipient/nonce/calldata/gas limit and persist a bounded successor before broadcasting. A canonical winner closes competing same-nonce attempts without duplicate gas. SOL/TRON expiry needs both pinned providers to prove finalized absence beyond the saved validity; independent application proof authorizes zero-fee hold release once. Gas variance reclassifies platform expense and never debits treasury or member twice.

Consent/flagged checkout requests obtain a scoped five-minute CAPTCHA challenge. Submit proof with the same business request; another request cannot reuse it. Dummy runs only in simulation; Turnstile requires site key/secret and bound hostname/action/challenge. Browser tokens stay in memory; reviewed abuse signals neither confiscate funds nor change queue priority.

For a reviewed banned/deleted claimant, staff with fresh MFA prepares exact costs and the original linked destination, creates a temporary claimant link and reviews the returned original-wallet statement signature. The claimant page removes its URL fragment and asks for message approval only. Confirmation holds once; unsigned cancellation returns held funds once. It cannot restore login or select a new address. Signed attempts must be reconciled before another action. Owner-only last-admin maintenance follows SETUP, with external identity review and workers disabled.

Repeat named provider/ledger/browser procedures in isolated generated namespaces; wrong wallet/token/family/network, changed replay, provider outage and insufficient finality must leave money unchanged. Record actual results in status. Current native archive retains59 tables/69 schema resources; challenge/session/view capability data is excluded. Restore remains inactive pending trusted checkpoint reconciliation.

## Native reorg, reserve and operational recovery

Staff opens a native review only after both pinned providers prove the current finalized anchor was replaced. Missing data alone moves nothing. Cash loss preserves original balances/allocations/tickets; new currency activity pauses. Reconfirmation of the exact transfer restores cash/points once and saves the new anchor. Subsequent review checks that anchor.

Staff reviews a reserve sweep quote against recorded/physical surplus, all beneficiary obligations and reserved gas/floor. The server chooses the environment-only destination. Confirmation holds company principal; successful signing/settlement moves it into reserve custody without member changes. Unsigned or positively failed/expired recovery returns principal once and retains gas. No automatic above-cap sweep occurs.

Business and original-sender refunds use the same positive recovery rule. A renewed request links its closed parent and creates a new exact hold; missing hashes never prove nonbroadcast. Refunds preserve the original sender despite ban/deletion. Actor MFA and current scope are mandatory. Native/GIV reconciliation compares both families of holds/refunds and reports native review/negative balances.

Own history/export includes native invoices/events/payout requests; twelve bounded encrypted sections preserve the original cutoff and exclude auth/signer/config secrets. Native settled withdrawal receipts identify the canonical journal-linked hash and actual member cost after refund. Staff lists are privately paginated and mask destinations.

Repeat named procedures on isolated sources, preserve first failures, then compare journals/rights and current71-resource/61-retained encrypted inactive roundtrip. A known inconsistent fixture is evidence of the reproduced failure, never a clean restore/release source. Trusted cold scanning remains required before live resume.

## Checkpoint recovery, monitoring and portability

Staff registers an exact finalized block verified by both pinned providers. Registration pauses the asset even if an older scan was clean. Five-block/slot pages verify transfers before booking, retain page hashes and use the permanent event registry. Unknown incoming value becomes system unallocated liability, without membership/points. Original-sender signature and staff review create a full-principal refund with platform-paid fees; cancellation/retry requires exact independent holds and positively closed lineage.

Terminal recovery pages also reconcile bounded saved-attempt pages. Missing/ambiguous hashes keep the run scanning. Clean completion requires agreeing finalized balances, exact book cash and sufficient beneficiary custody. Copied database bindings cannot authorize recovery. Verified unknown outgoing value stays in review until an explicit company principal/network/setup loss is audited; a new scan is still required. Historical review rows remain immutable.

Idle signer heartbeats validate the encrypted key scope and pinned RPC, and never create nonce state. The workload inventory returns only enabled asset keys; the scheduler observes one asset per request. Stale price/heartbeat, gas/custody/hot-wallet conditions, long-held liabilities and stuck attempts feed deduplicated alerts. Resolved recurring conditions reopen with the next permanent ordinal. The HTTP dispatcher reserves a shared daily attempt slot before any initial/repeated/retried send.

Public statistics keep separate cached simulation/testnet snapshots and include settled member payments only. Global fixture rotation supports pause/reduced motion without announcing every automatic change. History retains a bounded500-row window while continuing to fetch later cursors.

Staff selected-user JSON/CSV exports use a closed field allowlist and audit reason; CSV protects formula-leading strings. Optional owner-produced encrypted site artifacts are checked against deployment checksum, environment and migration fingerprint and streamed privately. Uploads are size/time/storage bounded and remain explicitly unverified. No web route reads owner DB credentials, decrypts a site snapshot, restores financial data or starts workers. CLI validation/empty-target restore and separate deployment publication remain required.

Build reports bound every API trace below3MiB compressed and conservatively bound each lazy wallet by all client chunks below2MiB. Baseline regression is10%; hosted measurements remain separate. The financial readiness gates stay disabled pending explicit approval and independent release inputs.


## Current v37 remediation and continuation

The owner approved all fixes and autonomous audit/plan/fix rounds through Phase Two and final bug fixes. Round One has 56 implemented and locally verified findings, with 16 still open. See [custom-bugs-report_v39.md](custom-bugs-report_v39.md), [custom-bugs-fix-plan_v39.md](custom-bugs-fix-plan_v39.md), [PROJECT-STATUS_v39.md](PROJECT-STATUS_v39.md) and [LLM-HANDOVER_v39.md](LLM-HANDOVER_v39.md). All four current filenames use matching versions; maintain cross-links together. Continue substantial batches without milestone acceptance waits, merge only after both exact-head CI events pass, retain financial gates disabled and tests deferred. Historical v29 review holds are satisfied. Phase One remediation and Phase Two are incomplete.

V33 adds bounded RPC queue/cache lifecycle, nonblocking age-labelled public statistics, private-route noindex/noarchive and atomic saved-help inventory replacement. Round One now48/71 locally verified;23 open. Financial gates remain false and Phase Two has not started.

V34 portability contract: Full encrypted-site archives default to owner CLI mode. Vercel always uses CLI-only mode, regardless of filesystem settings, reports upload cap zero, and declines web staging/download. Selected-field staff exports remain available. Optional web staging requires explicit SITE_PORTABILITY_MODE=persistent_host on an operator-managed private persistent volume; its configured file cap remains separate from serverless body limits.

Failed staged files remain in the private folder with bounded metadata sidecars. Staff inventory includes byte counts, failure category and observation time; missing metadata and transaction/session-completion rollbacks are visible as quarantine. No failed evidence is automatically removed. Physical files and sidecars count toward the shared quota and entry ceiling; the owner must review retention before moving or deleting evidence.

Downloads capture bounded encrypted bytes, verify their checksum, append the export audit and close the file descriptor within the transaction. The response is constructed only after the final session/authorization fence commits. Later filesystem mutation cannot change the captured bytes; rejected fences create no response, and cancelled responses own no descriptor. Web upload remains encrypted_unverified and never decrypts, restores, publishes or starts financial work.

Round One now52/71 locally verified;19 open. Financial gates remain false; Phase Two not started.

V35 outbound destination contract: RPC, signed alert POSTs and REST cache traffic now use one server-only transport. Exact hostnames must appear in OUTBOUND_ALLOWED_HOSTS. Every resolved address must be public; mixed private/public DNS results reject, as do redirects and unsafe IP ranges. The socket receives the already validated address through a pinned lookup, with the original hostname retained for TLS identity verification and certificate checks explicitly enabled. DNS and sockets share caller deadlines and bounded admission.

Owned Redis connections require rediss, validate database/path/query shape, resolve and approve the destination once, connect directly to that pinned IP with original-host TLS SNI, and disable reconnect loops. Injected Redis clients remain caller-owned trusted transports; no app URL creates those sockets. Display caching grants no financial authority.

Narrow loopback fixtures require explicit fixture mode in simulation outside Vercel; fixture flags cannot bypass policy in testnet. Default host allowlist is empty and fails closed until the operator supplies each RPC/provider/webhook/cache hostname. No wildcard or IP-literal allowlists are accepted. Existing real hosted destinations must be explicitly configured before use.

Round One now53/71 locally verified;18 open. Financial gates remain false; Phase Two not started.

V36 recovery contract: Recovery scans retain a within-block transaction/event cursor and explicit discovery, verification, booking, known-attempt index/settlement/expiry and final custody-comparison stages. Every committed step appends immutable progress evidence. Incoming and outgoing booking remain exact-once; confirmed evidence is reused only after identity/amount checks and a fresh canonical block check. Failed evidence also requires the matching canonical block/height. Unknown funds/outflows retain their existing rights and review fences.

Each discovery step covers one transaction and at most50 event/instruction slots per provider. EVM uses block hash lists, SOL signature lists and one selected transaction, and TRON reads only one selected receipt per provider. A busy block no longer requires100 verifications or1000 receipts in one HTTP invocation. Cursor advancement denotes a completed block only after every transaction/event is covered. Both providers must agree, including skipped SOL finalized slots; changed canonical hashes reject.

All nested RPC requests share an18-second/24-request budget for a recovery step, including throttle/queue/body time. Known signed attempts are processed individually across committed stages; positive expiry still requires both independent finalized providers and audited closure, never releasing a hold on absence alone. Staff recovery records display translated stage labels and within-block positions. Forward088 adds persisted progress/history, forward089 strengthens the JSON shape and cursor-height checks without rewriting applied checksums.

Round One now54/71 locally verified;17 open. P1-009 historical treasury inventory and P1-067 SOL cutoff remain open. Financial gates remain false; Phase Two not started.

V37 native-accounting contract: New P1-072: two independent EVM provider contracts confirmed native/ERC20 self-transfers as positive principal, although sender=recipient produces no incoming asset movement. Native invoice creation and funding/deposit accounting previously lacked that equality fence. SDK transfer validation, fee estimation and payload construction now reject same-address participants across EVM/SOL/TRON; invoice/payout quotes and settlement also fence this path. English/French errors explain that another verified wallet is required. Existing records, holds and signed histories remain unchanged and require review if inconsistent; no automatic financial correction is inferred.

Native wallet summaries now expose exact per-asset available, total held, income-held, refundable principal, refund-held, settled net payouts and net income. Immutable journal/obligation identity separates refund holds from income holds; refund capital never enters net income. Native portfolio reads use a repeatable snapshot with the current-session completion fence. Disabled currencies with historical net payouts remain visible. Labels and the income definition are bilingual; the private summary is lazy-loaded to preserve the homepage budget.

Round One now56/72 locally verified;16 open. Newly discovered P1-072 is addressed. Phase One remediation and Phase Two remain incomplete; financial gates remain false.
