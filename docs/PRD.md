# Gifters World — MVP Product Requirements Document

Date: 13 October 2026 · Scope: Phase One test iteration and Phase Two transparency specification

> **IMPORTANT — TEST ITERATION NOTICE**
> Phase One uses ordinary-looking bootstrap positions, displayed joining order independent of administrative serving priority, and rotating illustrative activity statements for test iterations. It does not specify those elements as acceptable deceptive behaviour for a public real-money service: system-controlled positions, actual payment priority, and illustrative payout activity require an accurate public presentation before live use. This is one document-level notice, not an instruction to add frontend badges, repeated warnings, presentation-approval endpoints, or extra runtime release gates to the test build.

Source requirements: `GIVERSIFTERS Lite MVP REQUIREMENTS.txt`. Specification structure: `LLLMprdguide.txt`. The public product name is **Gifters World**; the attachment filename does not change the brand.

## §1. Product summary

Gifters World shall be a mobile-first browser application and installable PWA in which a member sends a cryptocurrency payment for a selected gift plan, enters that plan's receiver queue, and becomes eligible for receiver allocations from subsequent payments. A cycle shall close after the configured number of confirmed gift allocations has been credited to its receiver balance. Withdrawing that balance is a separate user-requested operation. The platform shall provide referrals, points, wallet linking, transaction history, in-app notifications, and administration. No physical goods shall be shipped. No platform smart contract shall be deployed.

### §1.1 Audience and economics

Default audience: adults using mobile browsers, initially English- and French-speaking users, with Nigeria as the initial usability and bandwidth assumption. Language and bandwidth defaults shall not restrict test access. Enabling a chain shall require its verified token registry, configured wallets, required credentials, and gas funding.

Default incoming-payment allocation: receiver 85%, marketing 4%, eligible referrer 4%, developer 6%, gas reserve 1%. Two receiver payments of 85% equal **170% of the original payment**, not 200%. A $200-equivalent gift produces two $170-equivalent confirmed balance credits, or $340 gross total, if both subsequent payments occur and confirm. The $140 gross difference excludes incoming and withdrawal fees and token-price changes. Marketing and developer allocations are revenue streams; the gas allocation is a reserve, not available profit.

Payments depend on subsequent participants. With two receipts required and one receiver allocation created per incoming gift, each incoming gift creates one new cycle requiring two allocations but supplies only one allocation. The outstanding slot count therefore grows by one per gift after bootstrap, unless other funding is introduced. Repeated participation does not remove this imbalance. Future conditional receipts shall not be recorded as funded money or current balances.

GIV shall be an internal test currency, with no redemption or on-chain export. Technical environments shall remain isolated as specified in §30.

### §1.2 Phase One frontend content

Phase One shall use the specified copy without adding per-account bootstrap labels, priority-change notices, or demo labels beside activity statements. Phase Two shall use the controls and presentation in §32. Phase One requirements remain the default until the Phase Two implementation is accepted and its profile is explicitly selected.

Tagline: **Give and you shall receive.**

Short description: **Give and you shall receive almost double what you gave.**

Longer description: **Send a gift and receive two of that same gift. Give and you shall receive almost double what you gave.**

Four-step promotion:

1. Choose a gift.
2. Send its monetary value using your wallet.
3. Join the queue and advance as others send gifts.
4. Receive gifts from two gifters to complete your cycle.

Short How It Works: “Choose a gift and send its monetary value using a supported cryptocurrency. After payment confirmation, you join that gift’s receiver queue. As subsequent members send the same gift, you advance through the queue and receive the configured share from two gifters. Your cycle completes when both gift allocations are confirmed and credited to your balance. You then request a withdrawal and approve its network fee.”

Long How It Works, paragraph one: “Gifts represent monetary value rather than physical items. Connect your wallet, choose a gift, and approve the payment. Once the payment is confirmed, you join the gift’s queue on a first-come-first-served basis, subject to the queue mechanisms specified in §9. You can participate in multiple different gift plans concurrently.”

Long How It Works, paragraph two: “Under the default distribution, 85% of each gift payment goes to its assigned receiver, 4% to marketing, 4% to an eligible referrer, 6% to development, and 1% remains for gas reserves. For a $200 gift, the receiver allocation is $170. Receiving two such allocations credits $340 to your balance. A requested withdrawal deducts its approved network cost, so the amount reaching your wallet is lower. Withdrawals use the original currency and network; displayed USD equivalents for volatile assets are estimates.”

### §1.3 Scope precedence and invariants

Specific MVP requirements take precedence over generic examples in the writing directive. Therefore: gifts are cycles, not time-based subscriptions; receiver/referrer withdrawals require a user request and user-approved network charge; marketing/developer settlement is admin-triggered or daily; automated test suites are excluded from MVP; direct wallet approval is permitted through a client adapter; no AI, NFT, social messaging, or SMS subsystem shall be added.

The following invariants apply throughout this document:

| ID | Invariant |
|---|---|
| I1 | The server shall enforce identity, permission, eligibility, prices, queue order, and every money transition. Client checks are UX only. |
| I2 | Money shall use integer asset base units; every movement shall have balanced, append-only ledger postings. |
| I3 | Every mutation shall be idempotent; retries shall never create a second gift, slot, commission, or transfer. |
| I4 | Environment, network, token, plan version, and recipient shall be explicit. No cross-network funding or automatic conversion shall occur. |
| I5 | An unfunded future receipt is conditional; a confirmed allocation is a liability; a settled transfer is a payout. These shall never be conflated. |
| I6 | Internally distinguish member/system positions, actual serving order, and fixture/verified events. Frontend presentation shall follow §1.2 in Phase One and §32 in Phase Two. |
| I7 | Configuration shall be typed and versioned. Secrets shall remain outside the manifest and client. |
| I8 | All timestamps shall use UTC `timestamptz`. Sensitive client caches shall be user-scoped and cleared on identity change. |
| I9 | Provider SDKs shall remain within adapters. Business modules shall depend on interfaces only. |

## §2. Users, plans, entitlements

### §2.1 Roles and account eligibility

Role hierarchy: `member < moderator < admin`, with explicit permissions rather than inherited financial powers. Moderator shall review users, reports, and appeals and impose or lift temporary suspensions. Only admin shall manage moderators, ban/delete accounts, edit economics, configure wallets, adjust priority, export site data, or operate financial exceptions. Staff roles shall not create queue priority automatically.

Pending onboarding accounts shall have access only to consent, identity settings, logout, and help. Consent shall include the terms version, timestamp, and affirmative acceptance. Pending accounts shall not count as registered members, earn referral points, or receive the initial GIV grant. A pending email shall not be treated as permission to send marketing.

### §2.1a Account-status contract

| Status | Sign in / help | New gifts / referral credits | Existing receiver credits | New withdrawals | Existing obligations |
|---|---|---|---|---|---|
| Active | Yes | Eligible | Continue | Eligible | Process normally |
| Deactivated | Yes, recovery/history | Block gifts and new commissions | Continue | Eligible after normal reauthentication | Preserve and settle |
| Suspended | Restricted account/help | Block | Continue | Block new confirmation; unsent requests reviewed | Preserve holds and accrued rights |
| Banned | Block normal sign-in; support recovery available | Block | Preserve accrued queue rights under financial review | Admin-reviewed recovery, no forfeiture | Resolve through financial exception handling |
| Deleted / anonymized | No normal sign-in | Block | Financial references retained | Verified liability-recovery path | Never delete unpaid entitlement |

Reactivation restores eligibility prospectively; it does not recreate credits or erase cooldowns. Suspension/ban revokes active sessions. Ineligible-referrer shares shall follow the reserve allocation rule in §8.1. Financial recovery must work when ordinary account access is blocked. Staff permissions remain independent of member participation.

### §2.2 Seed plans

Seed exactly twelve paid gift templates per asset. Free is an account status, not a paid template or queue.

| Template | USD reference cost | Default receipts |
|---|---:|---:|
| Bronze | 5 | 2 |
| Silver | 10 | 2 |
| Gold | 20 | 2 |
| Diamond | 30 | 2 |
| Platinum | 50 | 2 |
| Super | 70 | 2 |
| Mega | 100 | 2 |
| Giga | 150 | 2 |
| Ultra | 250 | 2 |
| Stellar | 500 | 2 |
| Royal | 1,000 | 2 |
| Mythic | 2,500 | 2 |

Manifest `plan_templates` shall own these seed values. Each plan shall have a manifest-backed configuration under `plan_config_<plan_uuid>` (§19). All seeded and newly created plans shall start disabled. Admin shall explicitly activate simulation plans; real assets shall require §30 release gates.

### §2.3 Entitlement matrix

Paid tiers shall differ by gift price only. They shall not create unrelated feature privileges.

| Entitlement | Pending | Free, consented | Any paid template, active cycle | Control |
|---|---|---|---|---|
| Browse public plans/help | Yes | Yes | Yes | `feature_gifts`, `feature_help` |
| Dashboard, history, linked wallets | No | Yes | Yes | `entitlements_member` |
| Referral link and eligible commissions | No | Yes | Yes | `feature_referrals` |
| Send an enabled, eligible gift | No | Yes | Yes | `entitlements_member`, plan config |
| Receive queue allocations | No | No active cycle | Own admitted cycle only | `entitlements_member` |
| Simultaneous cycles | 0 | Up to enabled plans | Up to enabled plans | `cycle_max_concurrent` |
| Duplicate active cycle for the same plan/asset | No | No | No | Schema constraint; not overrideable |
| Rejoin completed plan/asset | No | After cooldown | After cooldown | `cycle_rejoin_cooldown_hours` |
| Public profile or member interaction | No | No | No | Out of scope |

`cycle_max_concurrent = 0` shall mean no additional cap beyond one active cycle per plan/asset. A user may join a different eligible plan immediately. The same plan/asset shall become eligible again after its own completion cooldown; there shall be no permanent “last completed plan” ban.

## §3. Feature inventory

All features below inherit I1–I9. “Admin controls” refer to §19. All disabled feature navigation shall disappear for members and moderators; feature routes shall return 404. Admin shall retain a read-only preview with a disabled banner. The exception shall never enable a financial mutation.

| Feature / flag / route | Purpose and eligibility | States and transitions | Failure UX | Controls and specific invariant |
|---|---|---|---|---|
| Gifts / `feature_gifts` / `/gifts` | Consented members select eligible enabled plans | Invoice → confirmation → active cycle → credited completion | Show exact payment/cycle status; no optimistic admission | Plan CRUD, prices, launch dates; one incoming gift funds at most one receiver slot |
| Wallets / `feature_wallets` / `/wallet` | Members prove wallet ownership, inspect balances/history, and request withdrawals | Linked wallet; available balance → quoted withdrawal → held → sent → settled or released | Invalid network/fee rejected; failed withdrawal preserves recoverable balance | Fee/withdrawal controls; no automatic withdrawal upon credit or wallet linking |
| Referrals / `feature_referrals` / `/referrals` | Members share opaque links and earn eligible commission | Attributed at signup; immutable after consent; commission credited → requested withdrawal → payout | Invalid code ignored with generic notice; no commission on signup | Split, enable switch; one immutable referrer, no self-reference |
| Points / `feature_points` / `/points` | Members view non-monetary engagement totals | Event → deduplicated award → compensating reversal | No duplicate award on retries; reconciled total shown | Award values/caps; points never cash or queue priority |
| Notifications / `feature_notifications` / `/notifications` | Members see financial events and admin messages | Created → viewed-list → individually read | Retry fetching; financial state remains visible on wallet | Direct/bulk messaging; list-seen marker differs from read state |
| Shares / `feature_shares` / `/share` | Members create receipt image after confirmed payout | Settled payout → preview → local download/share | Download fallback if native share unavailable | Branding; confirmed payout in the selected environment; receipt shows actual asset and network |
| Help / `feature_help` / `/help` | Anyone understands mechanics and errors | Published version → revised version | Search-empty guidance; stable links | English/French text, active-asset instructions; mechanics and percentage examples as specified |
| PWA / `feature_pwa` / install affordance | Browser users install shell | Available → installed → updated | Offline banner, no payment writes | Enable switch; never cache authenticated API responses in service worker |
| Activity / `feature_activity` / homepage component | Viewers see the supplied rotating statements | Configured statement → displayed → next statement → loop | Missing fixture list hides ticker; no per-statement demo label | Fixture content, rotation, counters; fixtures cannot create financial records |
| Bootstrap / `feature_bootstrap` / admin queues | Admin creates initial system receiver slots | Unallocated → partially allocated → fulfilled; unallocated deletion allowed | Removal blocked where it would erase money | Plan count/destination; system type visible to admin only |
| Priority / `feature_priority` / admin queues | Admin changes actual serving priority with reason | FIFO → priority lane → served or revoked | Conflicting revision returns 409 | Enable/revoke; display order remains independent of priority serving order |
| Administration / `feature_admin` / `/admin` | Admin configures plans, users, finance, messages | Draft → validated → committed/audited | Invalid writes rejected; stale version conflict | Full settings; no bypass of ledger or eligibility |
| Moderation / `feature_moderation` / `/moderation` | Moderator/admin resolve account issues | Report → action → appeal → resolution | Duplicate reports merged; held funds remain visible to owner | Permission flags; suspension does not confiscate accrued funds |
| Portability / `feature_portability` / `/settings/data` | Members export own data; admin exports/imports site | Requested → building → available → expired | Failed job exposes retry; failed import leaves site unchanged | Selected export fields; imports do not replay payouts |
| Simulation / `feature_simulation` / admin simulator | Admin creates isolated GIV/testnet data and failure scenarios | Seeded → simulated → reconciled → reset | Identify simulation internally and in admin diagnostics; prohibit real sends | Batch sizes and reset; no mainnet contamination |

Out of scope for Phase One MVP (Phase Two adds only the explicitly authorized scope in §32): Android/iOS binaries (web/PWA first); deployed smart contracts (server-managed mechanics); peer messaging/public profiles (not requested); browser push/SMS (in-app only); subscriptions/proration (cycles are event-based); AI services (no product use); NFTs/swaps/bridges (no conversion); uploaded avatars/media (self-contained visuals); admin impersonation (read-only diagnostic view sufficient); arbitrary custom token onboarding (only the named registry); automated test suites (explicit budget constraint); claims of production capacity for millions (requires separate paid-infrastructure benchmarks).

## §4. Data model

### §4.1 Canonical enums

Define these once in shared schema; reject unknown values.

| Enum | Values |
|---|---|
| Role | `member`, `moderator`, `admin` |
| AccountStatus | `pending_consent`, `active`, `suspended`, `banned`, `deactivated`, `deleted` |
| Environment | `simulation`, `testnet`, `mainnet` |
| DeploymentProfile | `test_iteration`, `transparent` |
| ReadinessStatus | `not_reviewed`, `approved`, `rejected` |
| PlatformDestinationRole | `developer`, `marketing`, `platform`, `custom_bootstrap` |
| BootstrapPresentation | `legacy`, `labelled`, `disabled` |
| PriorityPresentation | `legacy`, `disclosed`, `disabled` |
| ActivityPresentation | `fixtures`, `verified`, `labelled_demo`, `disabled` |
| PlanStatus | `disabled`, `scheduled`, `active`, `paused`, `retired` |
| InvoiceStatus | `quoted`, `submitted`, `confirming`, `credited`, `expired`, `failed`, `exception` |
| CycleStatus | `active`, `completed`, `exception` |
| WithdrawalStatus | `quoted`, `held`, `awaiting_requote`, `approved`, `sending`, `settled`, `cancelled`, `exception` |
| QueueEntryStatus | `waiting`, `fully_allocated`, `fulfilled`, `removed` |
| QueueEntryKind | `member`, `bootstrap` |
| PayoutStatus | `pending_wallet`, `held_review`, `ready`, `signing`, `broadcast`, `confirming`, `settled`, `retry_wait`, `exception` |
| JobStatus | `pending`, `running`, `done`, `retry_wait`, `dead_letter` |
| LedgerType | `GIV_GRANT`, `GIV_INCOMING_HOLD`, `GIV_INCOMING_ACCEPT`, `GIFT_IN`, `RECEIVER_ALLOCATE`, `REFERRAL_ALLOCATE`, `MARKETING_ALLOCATE`, `DEV_ALLOCATE`, `RESERVE_ALLOCATE`, `REFERRAL_FALLBACK_ALLOCATE`, `PAYOUT_HOLD`, `PAYOUT_SETTLE`, `HOLD_RELEASE`, `WITHDRAWAL_FEE_CHARGE`, `WITHDRAWAL_FEE_REFUND`, `GAS_VARIANCE`, `BUSINESS_SETTLEMENT_HOLD`, `BUSINESS_SETTLEMENT_SETTLE`, `BUSINESS_FEE_CHARGE`, `GAS_OUT`, `SURPLUS_HOLD`, `REFUND_HOLD`, `REFUND_SETTLE`, `REORG_COMPENSATE`, `ADMIN_ADJUST`, `TREASURY_SWEEP` |
| ReportStatus | `open`, `reviewing`, `resolved`, `dismissed`, `appealed` |
| AlertLevel | `P1`, `P2`, `P3`, `INFO` |

### §4.2 Tables, keys, and relations

Use UUID primary keys for domain records. Use transactionally allocated bigint sequence numbers only for queue ordering. Use randomly generated UUID referral codes independent of user IDs. Public help/plan slugs shall be lowercase normalized text; public receipt shares shall not have a public server URL in MVP.

| Tables | Required fields and constraints | Deletion / FK behavior |
|---|---|---|
| `users`, `user_identities` | Role/status, verified email, username, consent version/date, locale/TZ, referrer; identity unique by provider+subject | PII erased at deletion; identity rows cascade; financial user tombstone retained |
| `deleted_users` | Tombstone user UUID, deletion time/reason; no copied plaintext email or profile | Preserve tombstone references; do not create a second PII archive |
| `sessions`, `totp_factors`, `auth_challenges` | Hashed refresh token, session version, expiry, encrypted TOTP secret; challenge nonce unique/consumed | User deletion cascades secrets/session data |
| `wallet_links` | User, environment, chain, address, proof, version, cooling-until | Versioned; historical payout snapshots restricted from deletion |
| `assets` | Environment, chain ID, native/token kind, contract/mint, decimals, verification source/date | Registry versions immutable once used; restrict referenced deletion |
| `plans`, `plan_versions` | Asset, slug, economics snapshot, fixed base-unit amount, receipt target, status, launch time, precomputed potential total | Archive used plans; restrict referenced deletion |
| `queue_partitions` | Plan version+asset+environment unique, next ticket, head metadata, revision, backlog | Restrict deletion while referenced |
| `queue_entries`, `queue_rank_nodes` | Partition, ticket unique, kind, cycle/beneficiary, priority ticket, required/credited counts; withdrawal attribution remains separate history | Used entries retained; rank nodes transactionally maintained |
| `cycles`, `gift_invoices` | User, plan/asset/environment, payment/economics snapshots, timestamps/status, idempotency key | Partial unique index prevents duplicate active cycle; invoices reserve eligibility |
| `chain_transactions`, `receipt_allocations`, `withdrawal_quotes`, `withdrawals`, `business_settlements`, `payouts` | Chain+environment+hash; transfer event index; invoice/receiver-slot uniqueness; quote expiry/fee/rate/destination version; gross/net/fee; business settled balance watermark; exact amount, recipient snapshot, attempt linkage | Restrict cascade; preserve evidence and state |
| `ledger_accounts`, `ledger_journals`, `ledger_postings` | Asset/environment/owner/purpose; journal type/key; positive integer debit/credit lines; journal sums equal | Append-only; no cascade/delete for money |
| `referral_codes`, `point_events`, `user_stats` | Unique code; action-keyed signed points; materialized counts/amounts by asset | Remove exposed code/profile at deletion; retain anonymized financial aggregates |
| `notifications`, `announcements`, `notification_views` | Recipient or audience, localized body, creation/read time; user's list-seen cutoff | Nonfinancial private content purged on deletion; money evidence remains in money tables |
| `reports`, `appeals`, `audit_events`, `alerts` | Actor/target, action, reason, request ID, before/after, status | Restrict financial audit; redact PII in export/archive |
| `jobs`, `outbox`, `operation_keys` | Job key unique, lease token/expiry, attempts, due time, bounded payload; committed result per operation key | Terminal records expire by retention; pending work never silently discarded |
| `export_jobs`, `import_jobs`, `help_articles`, `slug_redirects`, `x_manifest` | Schema version, checksums, progress; localized help; slug redirects; typed settings | Expire downloadable exports; configuration/help use versioned soft deletion |

All tables shall have creation/update timestamps where mutable; append-only rows shall have creation timestamp only. Money and queue FKs shall use `RESTRICT`. Owned nonfinancial preferences/challenges shall use `CASCADE`. Optional deleted actor links shall use `SET NULL` plus audit actor tombstone. Referral cycles shall be prevented by immutable attribution at first signup and self-referral rejection.

JSONB shall be limited to validated manifest values, bounded provider metadata, job payloads, and audit snapshots. Frequently filtered attributes shall be columns with indexes. Do not add blanket JSON indexes; add a named expression index for each required JSON query. Store RPC payload hashes and selected evidence, not unbounded raw responses.

### §4.3 Indexes, counters, and scale

Required indexes: pending invoice expiry, jobs `(status,due_at)`, payouts `(status,next_attempt_at)`, queue `(partition_id,lane,order_ticket)` for waiting entries, user cycles `(user_id,status)`, notifications `(user_id,created_at,id)`, and chain transfer uniqueness `(environment,chain_id,tx_hash,event_index,asset_id)`. Partial uniqueness shall cover open checkout reservations and active/exception cycles for user+plan+asset+environment. Add unique consumed-quote linkage, user withdrawal operation keys, active business settlement holds, and per-transaction fee journal keys. Reserve the same balance using `SELECT FOR UPDATE`; quotations alone do not reserve funds.

Assign order under a partition row lock. Do not rewrite every remaining queue position when a member joins, completes, or is bumped. Use a sparse Fenwick counter index over ticket space (`QUEUE_TICKET_BITS` in §19) for exact counts ahead. FIFO/display and priority-serving indexes shall remain distinct. The user-visible rank shall use display order; internal serving rank shall include priority entries first. Writes and prefix-count reads shall take logarithmic bounded work. Queue admission shall serialize only within its partition; a popular partition remains a throughput bottleneck and shall expose lock-wait metrics. Number of users is not evidence of payment throughput.

Materialize membership count, credited counts and withdrawn amounts, per-asset earnings, and public totals in the committing transaction or aggregate job. Nightly reconciliation shall compare these with source records; discrepancies shall alert before repair. Partition append-only ledger, chain event, and audit tables monthly; archive after `retention_policy.financial_archive_after_days` without breaking global idempotency. Maintain a small unpartitioned unique operation registry because PostgreSQL partition-local uniqueness alone shall not deduplicate across months.

Migrations shall be forward-only, idempotent, and transactional where supported. Column replacement shall use add nullable → backfill → constrain → switch reader → remove old in a later schema release. Emergency migration rollback shall restore a backup and reconcile chain history before signer restart. The MVP database engine shall be PostgreSQL. Supabase PostgreSQL is the primary hosted deployment, while local PostgreSQL, Neon PostgreSQL, and other compatible PostgreSQL hosts shall remain supported through the database adapter. Application/domain code shall use standard PostgreSQL semantics and the `Database` interface rather than Supabase-specific data APIs, Auth, Realtime, Storage, Edge Functions, or provider-only SQL assumptions. Vercel/serverless connections to Supabase shall use the supported pooled PostgreSQL connection mode for short-lived functions; migrations, backup/restore, and administrative database operations shall use the appropriate direct or session connection. Any future non-PostgreSQL adapter must preserve the required transaction, row-lock, uniqueness, numeric, timestamp, and isolation semantics before it can be considered supported.

## §5. Time, dates, and time zones

Store UTC timestamps; display client-side in user locale/TZ, default `Africa/Lagos`. Admin display shall default `Africa/Lagos`, configurable by `admin_timezone`. Cooldowns shall be elapsed hours from confirmed completion, unaffected by DST or changing display zone. Launch times shall be absolute UTC instants.

Daily limits/reconciliation shall anchor at UTC midnight; weekly summaries at Monday UTC midnight; month partitions at the first day UTC midnight. Display-zone DST shall not change these anchors or double-run a reset. There are no streaks or seasonal resets. Age eligibility shall use full birth date at consent, with `eligibility_min_age`; age declaration is not identity verification. Use database/server time for eligibility, leases, expiry, and rate windows; monotonic process time for local timeout measurement.

## §6. Authentication, sessions, and identity

### §6.1 Signup and consent

Default authentication shall be Google OAuth behind `AuthProvider`. It avoids password storage and prepopulates verified email, name, locale, and avatar URL. OAuth subject shall identify the account; email alone shall not automatically merge different identities. Use state, nonce, PKCE, an allowlisted redirect, and server callback verification. Do not fetch remote avatar URLs server-side; MVP avatar rendering shall use local initials.

Generate username by lowercase NFKD folding, diacritic removal, whitespace-to-underscore, allowed `[a-z0-9_]`, and truncation under §19 constants. Reject reserved/profane names. Resolve collision with numbered suffixes within the named attempt bound, then random suffix and unique-index retry. Prefill onboarding; reserve the name immediately; require server-validated confirmation. Username changes after consent are out of scope.

Show versioned editable terms and an unchecked acceptance box before enabling Continue. On consent, activate the account, issue a referral code, record attribution and eligible signup point event, and grant GIV only to isolated test users. Retain pending-consent accounts until explicit admin deletion, exportable separately; `pending_consent_retention_days=0` shall mean no automatic expiry. Material terms changes shall require renewed consent before new gifts, without blocking payout of accrued liabilities.

### §6.2 Tokens, revocation, and recovery

Use platform-issued signed JWT access tokens and rotating opaque refresh tokens. Store both in Secure HttpOnly SameSite=Lax cookies with narrow paths; store refresh hashes in DB. CSRF protection shall combine origin checks and a session-bound token for mutations. Access TTL, absolute/idle session bounds, and refresh reuse revocation shall follow §19. A reused refresh token shall revoke its token family.

Ordinary authenticated reads may validate the signed access token locally. Every money, wallet, export, or staff request shall check current session and account status in DB. Suspend, ban, delete, or role change shall increment session version and revoke all refresh tokens. Cross-instance revocation notification is an optimization; DB enforcement shall remain sufficient for sensitive actions. A global 401 handler shall clear sensitive caches and navigate to login, excluding the auth-refresh call from recursion.

TOTP shall be mandatory for admin and moderator, optional for members. Staff enrollment shall be required before any staff mutation; JWT role alone cannot bypass enrollment. Member withdrawal confirmation shall require a fresh session/re-authentication, and enrolled members shall also confirm TOTP. Stored TOTP secrets use authenticated encryption with `MFA_ENCRYPTION_KEY`; replay records store accepted time steps, not plaintext reusable secrets. Codes shall be replay-protected by a durable unique `(factor_id,time_step)` record, covering the accepted time window. A `pre_auth` token shall authorize only `/api/v1/auth/2fa/verify`; all other endpoints shall reject it. Recovery codes shall be one-use hashed records. Lost Google access with no linked recovery identity shall mean the account cannot be self-recovered; wallet possession alone shall not reassign the account. Password/magic-link/passkey/Telegram/Apple login and PIN are explicitly out of scope, rather than silently enabled.

Privilege elevation, payout destination changes, and private/staff manifest changes shall require fresh authentication; staff shall require TOTP within `staff_reauth_minutes`. Pending financial obligations shall survive loss of access. Auth failures shall clear transient callback cookies. User lookup/recovery responses shall be enumeration-safe.

## §7. Authorization and row-level security

| Resource/action | Member | Moderator | Admin |
|---|---|---|---|
| Public plans/help | Read | Read | Read/edit |
| Wallets, cycles, transactions | Own only | Redacted case view | Audited financial view |
| New gifts / wallet links / withdrawal requests | Own eligible account | Own eligible account | Own eligible account; no bypass |
| Marketing/developer settlement triggers | No | No | Fresh TOTP for manual trigger; scheduled workload identity for daily runs |
| Suspensions and appeals | Own appeal | Review; reversible suspension | Review; suspension/ban/delete |
| Plan economics, priority, bootstrap, signer caps | No | No | Fresh TOTP required |
| User-field CSV export | Own data | No | Selected fields, audited |
| Site import/export/reset | No | No | Fresh TOTP and operation confirmation |
| Messaging | No peer messaging | Case notification only | Direct/bulk notifications |
| Role assignment / manifest | No | No | Fresh TOTP for sensitive keys |

RLS shall protect user-owned wallet, cycle, invoice, payout, notification, referral, export, and stats views. Ledger base tables shall deny direct browser access; expose scoped views through the service. Audit/configuration tables shall deny nonstaff access. The server shall set user context transaction-locally, reset it with connection return, and never expose DB credentials. A privileged worker shall operate only through constrained services. Authorization checks shall remain mandatory alongside RLS. Admin permission shall be read from DB, not trusted from JWT role alone. Runtime logins shall be NOINHERIT, nonowner and unable to bypass RLS; transaction-local read/service roles receive only required privileges. Migration credentials stay outside Vercel, and deployment shall verify that runtime and owner connections target the same environment namespace.

The wallet ownership challenge shall bind domain, user, exact address/network/environment, nonce, purpose, and expiry; consume once server-side. A deposit proves the configured invoice transfer, not authority to change another member’s payout address. Client shall disable predictable forbidden actions: incomplete consent, wrong role, suspended account, missing/invalid wallet, active same-plan cycle, cooldown, disabled plan/asset, stale quote, insufficient displayed balance, and incompatible environment configuration. Server shall recheck all relevant conditions inside the write transaction (§1 I1).

## §8. Money, ledger, and payments

### §8.1 Accounting and split

Each asset/environment shall have its own balanced double-entry accounts: treasury asset, user or system available payable, held payable, gas reserve equity, fee-recovery equity, fee-variance expense, developer/marketing payable, surplus/refund payable, and chain-loss exception account. No aggregate USD balance shall be spendable. Store asset amounts as `numeric(78,0)` and serialize decimal strings. Decimal arithmetic shall be used for quotes/percentages; never JavaScript floating-point money.

For payment amount A and split basis points B, compute receiver, marketing, referral, and developer amounts as integer floor `A×B/10000`. Assign the exact residual to gas reserve. Validate basis points sum to `BASIS_POINTS_TOTAL`. When there is no eligible referrer, allocate the referral share to reserve with `REFERRAL_FALLBACK_ALLOCATE`; do not invent a referrer or change the receiver share. Snapshot split and fee policy on the invoice. The split shall not change during confirmation or payout.

Book incoming funds with `GIFT_IN`; subsequent allocation journals shall reclassify treasury-backed liability/equity accounts, not record a second inflow. Reserve totals shall exclude unpaid beneficiary liabilities. Every listed LedgerType shall have documented balanced posting templates in the implementation; refunds/reorgs/admin adjustments shall use compensating entries only. An admin adjustment shall require an evidence reference and cannot create treasury assets without a verified external inflow.

### §8.2 Invoice and confirmation contract

Server shall create one invoice for an eligible user+plan+asset with exact asset amount, treasury address, network, expiry, plan version, and economics snapshot. A client wallet adapter shall request the user's explicit approval for this transfer; it shall neither silently charge the user nor request unlimited token allowance. Incoming gas shall be paid by the sender and displayed separately. User rejection shall not admit a cycle.

Client shall submit the resulting transaction hash. Server shall independently verify the successful transfer event, expected asset contract/mint, exact destination, sender ownership binding, amount, environment, canonical block, and required finality. Never accept a wallet popup, client success flag, balance increase, or amount-only match as payment proof. A transfer event shall fund one invoice only. Wallets unable to produce an attributable supported transfer shall be rejected with guidance rather than guessed.

Underpayment shall enter exception with no cycle; hold the verified amount as refundable liability. Overpayment shall credit only the invoice amount and hold surplus for admin-assisted refund. Late payments shall not be silently ignored. Persist server-observed submission/first-seen times; blockchain inclusion time alone does not prove when an unconfirmed transfer was broadcast. Honor a submitted pre-expiry valid transfer after eventual finality. If reliable pre-expiry evidence is unavailable, record an exception/refundable liability rather than guessing or losing the funds. Confirmation may finish after quote expiry. Duplicate hashes/events shall return the existing result. Unmatched incoming funds shall remain unallocated until resolved.

On accepted confirmation, a single DB transaction shall lock the invoice/user eligibility and partition, journal funds, select and reserve one recipient slot or apply the configured empty-queue business allocation, credit receiver/referrer/business ledger balances without creating an outgoing member transfer, create the payer's cycle and queue entry, award points, update counters, and insert outbox jobs. The new payer shall never receive their own incoming allocation. If no previous receiver exists, allocate the receiver share to the configured system-business role under `empty_queue_policy`, then admit the payer behind that allocation. Default role is developer; marketing is the permitted alternative. This creates no fictitious member receipt or completed receiver cycle. The business amount remains payable until manual/daily settlement, including when its destination secret is missing. An admin may select `block_checkout` instead; a race that empties a blocked queue after payment goes to refund exception. Never allocate the payer their own incoming gift.

### §8.3 Earnings, withdrawal, and business settlement contract

**Receiver and referrer.** Credit the configured shares to their internal available balance on accepted incoming confirmation. Do not send automatically, create an automatic withdrawal, or withdraw when they link a wallet. A member shall explicitly select asset/network and gross amount, request a fee quote, inspect gross/fee/net/destination, and confirm the withdrawal. Creating a quote or draft request moves no money; confirmation consumes its quote and reserves funds once. State transitions: quoted → held → approved → sending → settled; unsent invalid/expired quotes move to awaiting_requote, and a positively unbroadcast cancellation moves to cancelled. Resolved financial failures use exception with explicit hold release/fee postings. The withdrawal state references its payout attempt state rather than guessing from a UI flag. No automatic currency conversion or USDT-only conversion shall occur. Signup creates no commission; confirmed paid gifts do.

Balances shall be separate by asset/environment. Show available, held, and withdrawn totals. With no proven wallet, display available earnings with “Pending — No wallet” and a link to active-network help; linking enables the withdrawal controls but moves no money. Snapshot verified destination/version on quote and request; fresh authentication and the configured wallet-change cooling period shall apply. Already-broadcast transfers retain their original destination.

**User-paid withdrawal cost.** The treasury signs and pays native network fees on-chain. The user reimburses the quoted cost through a deduction from the requested gross balance. Confirm `{gross,network_charge,account_setup_charge,net,asset,network,destination,wallet_version,fee_policy_version,rate_snapshot,expires_at}`. Net equals gross minus the separately disclosed charges. For a token withdrawal, convert the estimated native fee into withdrawal-asset units using a pinned rate for accounting only; do not perform a token swap. Native-asset withdrawals need no conversion. Stale/missing conversion rates block token fee quotation, not earnings credits.

On confirmed request, atomically lock available balance, recheck eligibility/quote/wallet version and amount, move gross from available to held with `PAYOUT_HOLD`, create one withdrawal/payout, and enqueue preparation. Each quote is single-use and bound to user/session, gross amount, verified destination/version, asset/environment, and fee-policy revision; reusing it with different inputs returns a conflict. No arbitrary fixed minimum shall apply. Net must be positive and comply with network dust rules; otherwise retain the balance and show why this request cannot proceed. Users may accumulate earnings and withdraw any viable amount within configured signer limits. Multiple simultaneous requests cannot reserve the same balance.

Fee conversion shall use decimal arithmetic and round required charges upward to withdrawal-asset base units; refunds shall equal approved charge minus actual attributable cost rounded upward to the same units, bounded between zero and the approved charge. If a fresh quote replaces an expired quote after a failed execution, its confirmation must show costs already incurred; no attempt fee can be charged twice. The quoted user charge and net shall be binding for that attempt. Approved variance policy: the platform covers estimated fee increases up to 25% of the approved network-fee quote, subject to available operating reserve and native-gas funding. Above that tolerance, obtain a new user-approved quote before signing. Once signed/broadcast, actual cost above the approved charge is a platform expense even if it exceeds the tolerance; it cannot justify a retroactive user debit. Before signing, compare fresh estimated cost against the permitted variance budget. Above tolerance or after quote expiry, remain held in `awaiting_requote`; offer a replacement breakdown or a safe pre-sign cancellation returning the held amount. Never increase user charges or reduce approved net without renewed consent. Reserve a conservative native-fee budget for concurrent queued sends under the signer/treasury lock, separate from beneficiary asset holds; enforce native transaction fee caps before signing. Do not merely check the same unreserved gas balance for every send. Once broadcast, resolve the existing hash even if the quote expires; never issue a competing transfer merely because time elapsed.

At confirmed settlement, debit held gross, reduce treasury assets by net transferred, and allocate the approved charge to a fee-recovery account with `WITHDRAWAL_FEE_CHARGE`. Example posting split within one DB transaction: `PAYOUT_SETTLE` debits held payable by net and credits treasury asset by net; `WITHDRAWAL_FEE_CHARGE` debits held payable by approved charge and credits fee-recovery equity in the withdrawal asset. Together they release the held gross. `GAS_OUT` independently debits fee expense/reserve and credits treasury asset in the native fee asset. Cross-asset value comparisons create no fictitious token movements; `GAS_VARIANCE` records measured valuation/expense attribution without deducting native gas twice. Record actual native fee separately as `GAS_OUT`, including each confirmed failed/replacement attempt. Save gross/quoted charges/net/actual native cost/rate/cost variance with the withdrawal. If total attributable actual cost is below the approved charge at the pinned rate, credit the difference back to the member's available balance once via `WITHDRAWAL_FEE_REFUND`. If actual cost exceeds it, the platform absorbs the difference with `GAS_VARIANCE`; never silently debit another user balance. Network-account setup funding shall be a separate line and posting purpose, not mistaken for burned gas or treasury-owned recoverable rent when the new account belongs to the recipient.

Cancellation may release a hold only before signing starts and only when no persisted signed attempt exists, under the same withdrawal/worker locks. After signing or possible broadcast, reject immediate cancellation and reconcile the known attempt; a signed but apparently unbroadcast transfer must not be followed by a released balance that another worker can spend. For a definitively failed withdrawal with no remaining valid signed attempt, or a safe pre-sign cancellation, restore the undelivered principal entitlement to available balance; do not post an unsuccessful transfer as a principal payout. The held gross includes a separately approved fee budget: release gross less only verified, consented consumed fees, with those fees posted separately. If on-chain execution incurred fees, charge only actual attributable fees up to the user's approved charge under the displayed failure-fee policy, and release the rest. A wallet prompt rejection or failure before network execution carries no network charge. An ambiguous broadcast retains its hold until resolved; the same known failed attempt shall not be charged or refunded twice. Confirmation UI shall state that executed failed attempts can incur network fees.

**Marketing and developer.** Record their full gross shares as distinct payable ledger balances; leave assets in treasury until settlement. Admin may trigger settlement manually, and/or enable one daily trigger. Default `business_settlement_policy` enables both manual and daily settlement, with daily at UTC midnight; admin display timezone does not move the daily anchor. Aggregate each business role's available balance per asset/network/environment into one payment, never one payment per incoming gift. Bootstrap/system beneficiary earnings shall follow the same business settlement path, with a separate accounting category even when sharing the developer destination.

Manual/daily settlement shall call the same service, lock the same balance rows, and atomically move only currently unheld balances to a uniquely keyed settlement hold. The daily date key deduplicates schedule retries; manual requests have their own operation UUID. Concurrent triggers cannot hold or pay the same balance twice. Earnings credited after the held watermark remain available for the next settlement. Do not net business balances against user liabilities.

Business amounts exceeding signer-per-transaction limits shall use deterministic nonoverlapping legs under a single settlement, with each leg’s principal/fee and hash separately accounted for. A partially settled business batch shall not release or resend its settled legs. Approved business fee policy: platform pays outgoing marketing/developer and system-business settlement fees from the 1% operating reserve, with actual native gas supplied by its prefunded native-gas balance; no silent deduction from the stated marketing/developer percentages. Record actual cost and reserve impact. If insufficient, keep business amounts pending and alert admin; do not spend member liabilities or repeatedly broadcast doomed transfers. Manual-only, daily-only, both, or disabled scheduling shall be configuration choices; disabling sending preserves the balance.

Sign approved member withdrawal and business-settlement batches under worker/chain leases. Persist signed bytes/hash and reserved nonce before broadcast. Recover/rebroadcast the same attempt after ambiguity; do not rebuild a new transfer just because a request timed out. Settlement journals shall be append-only and balanced. Reorg/exception handling inherits §8.4. GIV shall use the same quote/hold/settle state machine with zero actual network charge unless admin explicitly chooses a simulation scenario; it never signs on a real network.

### §8.4 Idempotency and financial failure handling

| Operation | Permanent unique business key |
|---|---|
| Invoice creation | `invoice:<user>:<client_uuid>` plus active eligibility reservation |
| Inbound acceptance | `in:<environment>:<chain>:<hash>:<event_index>:<asset>` |
| Receiver slot | `slot:<cycle_or_bootstrap>:<slot_number>` |
| Share obligation | `allocation:<invoice>:<share_type>:<beneficiary>` |
| Withdrawal quote / request | `withdrawal-quote:<user>:<request_uuid>` / `withdrawal:<user>:<request_uuid>` |
| Payout leg | `payout:<withdrawal_or_business_settlement>:<leg>` |
| Fee charge / refund | `fee:<withdrawal>:charge` / `fee:<withdrawal>:refund:<cost_revision>` |
| Business daily / manual settlement | `business-daily:<environment>:<asset>:<role>:<utc_date>` / `business-manual:<admin>:<request_uuid>:<asset>:<role>` |
| Points | `points:<source_event>:<award_type>:<beneficiary>` |
| GIV grant | `giv-grant:<environment>:<test_user>` |
| Reorg / refund | `reorg:<inbound_event>:<revision>` / `refund:<exception>:<leg>` |
| Administrative action | `admin:<actor>:<operation_uuid>` |

Reorg shall create compensating entries and put affected partitions into exception review. If a beneficiary was already paid, record the resulting treasury loss separately; do not debit an unrelated member or pretend the chain transfer can be undone. Unwithdrawn credits and affected unsent holds shall be frozen/reversed with linked compensating postings; a reorg shall also put affected completed cycles/cooldowns and later dependent admissions into explicit exception review. Never silently leave invalidated credit counted as valid cycle funding or confiscate an unrelated valid earning. A completed withdrawal remains an external transfer and any resulting shortage is a separately recorded loss. Refunds shall return verified refundable amounts to a proven original sender; no automatic refund shall be promised after allocation/settlement. A policy amendment shall apply only prospectively.

### §8.5 Flagged remaining dependency: native-gas prefunding and precise fee accounting

> **FLAG — STILL REQUIRED:** User-paid withdrawals and accumulated business settlement reduce gas exposure, but they do not remove the need for **native-gas prefunding and precise fee accounting**. The treasury must have spendable ETH, BNB, SOL, or TRX/resources for the relevant chain before broadcasting. Collecting a fee in USDT or JAGA does not automatically replenish that native balance.

Treat the 1% gift share as an operating reserve, distinct from member balances and fee recoveries. Maintain native-asset balance/reserved-fee/low-watermark metrics per network and environment. Before reserving/signing a send, cover worst-case authorized fee and any account creation funding without consuming recipient principal or another asset's liability. Missing gas blocks sending, not crediting an already-confirmed gift; show awaiting gas and notify admin.

No auto-swap is introduced. Owner shall fund native currency externally and define how fee recoveries/reserve receipts finance future top-ups. Native top-ups shall have verified inflow journals; moving reserve funds externally shall have audited outflow evidence and cannot reduce assets below liabilities. Fee receipts in another token remain that token until an explicitly accounted external exchange/top-up occurs. This operational funding decision remains flagged for iteration.

Persist actual chain fees from verified receipts, not quoted values; account for failed attempts, replacement lineage, rate snapshots, undercharge/refund, and business fees separately. Never count network fees as recipient receipts or platform revenue twice. Exact gross/charge/refund/net reconciliation shall be observable in the admin dashboard and simulator.

## §9. Entitlement lifecycle and receiver queues

### §9.1 Formal lifecycle

Account starts free. Invoice confirmation creates an active cycle. Each accepted subsequent gift atomically reserves and credits one receiver slot. When the configured number of confirmed receiver credits is reached, remove the entry from serving selection and complete the cycle, start its cooldown, and preserve its withdrawable earnings. External withdrawal is not a condition of queue advancement, cycle completion, free-status downgrade, or rejoining eligibility. An unlinked wallet or deferred withdrawal cannot trap a funded cycle in active status.

When the last active/exception cycle completes, display free account status. Suspensions block new gifts/new referral commissions and new withdrawal confirmation, preserve existing credits/queue rights, and hold unsent withdrawals for review. Existing receiver slots may be credited; never divert their earnings because of suspension. Bans/deletion route accrued balances to financial review, not deletion. Already-broadcast withdrawals still reconcile independently of account status.

Time-based purchase expiry, grace periods, subscription cancellation, renewal, and proration are not applicable: cycles have no time expiry. Membership data shall not be purged because a queue stops advancing.

### §9.2 Queue algorithm

Partition key shall be environment+network+asset+plan version. Admission order shall be the sequence assigned when verified inbound acceptance commits, not client click time, unconfirmed transaction time, or a user-editable timestamp. Resolve ties by the unique admission sequence.

Within the partition transaction: select the first waiting priority entry, otherwise first waiting FIFO entry; lock it; reserve its next unallocated slot; create an immutable receipt allocation. When confirmed credited count equals target, remove its waiting-rank contribution, mark its queue entry fulfilled and its cycle completed in the same transaction, and advance head selection. `fully_allocated` is a transitional in-transaction reservation state, never a wait for withdrawal. Enqueue the new member only after selecting the prior recipient. A receiver requires no third slot once its target is reserved. Each confirmed receiver credit increments credited count once and can complete the cycle; a later withdrawal updates withdrawal history only. Both operations are idempotent.

Bootstrap default shall be ten system positions per newly activated queue if the feature is enabled. They shall appear as ordinary queue positions to regular users, with no bootstrap badge, account-type label, or frontend destination disclosure. Admin shall see the true system type, beneficiary wallet, allocation count, and settlement count. At target two, twenty incoming gifts are required to allocate those ten positions fully. The first external participant shall initially appear at position eleven. Bootstrap allocations shall credit the developer/system business balance; settlement uses the selected environment-secret destination role. Bootstrap insertion shall occur before opening the queue to ordinary entrants. Admin may remove entries individually or in bulk; allocated obligations shall remain preserved even if unallocated slots are removed.

Maintain separate display-order and serving-order indexes. Display order shall follow admission sequence and normal removals, while serving order shall select administrative-priority entries first. Bumping shall not alter the displayed sequence or show a priority-change notice. Internal administrative records shall retain actual serving order, displayed position, actor, reason, and timestamps. Consequently, displayed position shall not be used as a payment-selection input. Admin may create a system-owned entry and assign its priority, or bump an existing receiver; admin-created unpaid entries shall not be booked as paid gifts. Monetary allocations and cycle settlement shall still obey §8.

### §9.3 Economic edits and empty queues

Empty-queue startup follows §8.2 and `empty_queue_policy`: a first payer can join with bootstrap disabled; their receiver share credits the selected system-business account, and subsequent gifts serve the waiting payer. This applies in both presentation phases. Exclude this business allocation from member-received/payout totals and verified activity. Do not create a system queue entry merely to implement this fallback.

Plan amount, asset, target, and split shall be immutable while its partition contains waiting entries or open invoices. Editing creates a disabled proposed version; activation shall wait until those queue/invoice rights drain. Existing available earnings, held withdrawals, and business balances retain their immutable source records and amounts but do not block a new plan version merely because withdrawal is deferred. Changing the global split shall change defaults for proposed/new versions only; incoming gifts to an existing queue shall retain that queue version's split. Do not fork an active plan into a fresh queue and strand older participants. Pause/retire shall block new checkout but continue monitoring and settlement. Warn that blocking later participation can prevent existing cycles from completing; allow transparent reactivation while obligations remain.

For native tokens, calculate a base-unit price at activation and freeze it for that queue version. USD equivalents shall update for display only. Do not reprice each entrant to a different token amount while claiming they send and receive the same gift. Admin may choose explicit fixed token price instead of USD-derived activation pricing. Potential total shall be precomputed in asset units on version creation; live USD display may be estimated from a cached rate.

## §10. Anti-abuse, moderation, and trust

CAPTCHA shall default to an available bot-check adapter on consent and suspicious checkout. Enforce only when both provider selector and surface setting are enabled; production shall fail closed on a required challenge outage. Simulation may use the dummy adapter. Suspicious signals shall include repeated payment-proof failures, referral loops, rapid linked-wallet reuse across accounts, and excessive creation attempts. Store private flags for review; do not silently confiscate funds or auto-prioritize accounts from a score.

Points: a consented referred signup earns referrer 1; a confirmed gift below the USD threshold earns sender 25/referrer 5; a gift at or above threshold earns sender 50/referrer 10. Use invoice USD reference snapshot; threshold is $100. Exactly $100 shall use the upper band. Only real verified events shall award production points. Enforce `points_daily_cap`; points shall not be money, transferable, redeemable, or priority. Reversed financial events shall create point reversals. Disabled/suspended referrers shall earn no new commission or points; previously accrued amounts remain owed.

Reports shall deduplicate actor+target+reason within `report_dedupe_hours`. No count of reports alone shall automatically quarantine financial rights. Appeals shall require a signed-in account and one-use case token. Moderator actions shall require reason, audit record, and a reversible status transition. Public-content silent filters are not applicable because there are no member public posts or messages.

### §10.1 Rate limits

All limits below are manifest entries in `rate_policies`; windows use server UTC time. Apply IP limits through the trusted ingress address, not arbitrary forwarded headers. Unknown mutating routes shall inherit the general mutation policy.

| Route family | Default allowance/window | Key | Failure policy |
|---|---|---|---|
| OAuth begin/callback, refresh | 20 / 60 seconds | IP+route; refresh also session | Closed |
| TOTP/challenge verification | 5 / 300 seconds | User/factor+IP+route | Closed |
| Consent/profile preferences | 20 / 60 seconds | User+route | Closed |
| Create gift invoice | 5 / 60 seconds | User+asset+route | Closed |
| Submit payment hash | 20 / 60 seconds | User+route | Closed; duplicate result still retrievable |
| Wallet challenge/link/change | 5 / 300 seconds | User+route | Closed |
| Withdrawal quote/request/confirm/cancel | 5 / 60 seconds | User+route | Closed |
| Business manual settlement | 5 / 300 seconds | Admin+route | Closed |
| Notifications seen/read | 60 / 60 seconds | User+route | DB fallback; closed if unavailable |
| Reports/appeals | 5 / 3,600 seconds | User+route | Closed |
| Own export/deletion request | 2 / 86,400 seconds | User+route | Closed |
| Staff mutations, messages | 30 / 60 seconds | Actor+route | Closed |
| Import/reset/signer config | 2 / 3,600 seconds | Admin+route | Closed |
| General mutation fallback | 30 / 60 seconds | User-or-IP+route | Closed |
| Authenticated reads / public help | 120 / 60 seconds | User-or-IP+route | Open only for cached public data |

Scheduler endpoints shall use a separate signed workload identity, per-window run key, and a DB lease rather than member rate limits. Redis failure shall use durable DB counters for closed routes; DB failure shall reject mutations with a retryable service error. Rate value zero shall disable only a policy explicitly marked disableable; money/auth policies cannot be disabled in mainnet.

## §11. Background jobs, queues, and cron

UUID mutation keys shall be case-insensitive identities with payload binding. Chain transaction hashes and addresses shall use adapter-specific canonicalization, never generic case folding.

Use Postgres job/outbox tables, at-least-once delivery, unique business keys, row claims using `FOR UPDATE SKIP LOCKED`, and fencing lease tokens. Commit outbox insertion with domain writes. A worker that loses its lease shall not commit or broadcast new work. Signer shall also enforce a per-chain/treasury lease and spend caps.

| Job class | Trigger / cadence | Retry and completion contract |
|---|---|---|
| Payment confirmation | Submitted hash; incremental monitor | Reschedule until finality or monitor window; late resolver continues accounting |
| Member withdrawal preparation/sending/confirmation | Explicit member-confirmed request; scheduled signer batches | No allocation-triggered send; persist attempt before broadcast; uncertainty resolves existing hash |
| Business settlement | Admin manual action and/or UTC daily aggregator | Role/asset balances locked and held; daily key plus business balance watermark prevents double settlement |
| Plan launches | Tick compares absolute launch instant | One activation revision; failed validation remains disabled with alert |
| Notifications and bulk audience fanout | Outbox/admin action | Unique recipient+announcement; bounded chunks |
| Public stats/point/counter reconciliation | Daily aggregator | Recompute once per named date; snapshot revisions |
| Financial reconciliation and late inflows | Daily aggregator plus tick exceptions | Asset-level liability/treasury comparison; retain unresolved funds |
| Export/import | Explicit request | Resumable chunk/checksum; import publishes only complete staging |
| Cleanup / weekly digest / backup | Daily aggregator decides due work | Never delete unresolved money; one run per anchor |

Use generic retry policy in §19: exponential backoff plus jitter; retry timeout, 429, and transient 5xx only. Do not retry bad credentials, invalid addresses, schema errors, or definitive insufficient funds without changed conditions. DLQ replay shall keep the same operation key. Worker SIGTERM shall stop claims, drain within `worker_shutdown_seconds`, and leave resumable jobs.

Authenticated `/api/v1/internal/tick` shall service bounded non-signing work; the scheduled signer shall run separately with secrets unavailable to web requests. HTTP APIs may advance submitted-hash verification within their budget, never keep a timer alive after returning. Free scheduled runners do not guarantee prompt execution; display “Queued for sending” rather than instant payout. Delayed schedules shall catch up using database due times, not enqueue a duplicate for every missed tick.

`/api/health` shall return bounded reachability within `health_timeout_ms`; expose detailed provider/treasury diagnostics only to staff. Alert on job backlog, DLQ depth, missed signer heartbeat, and lock wait (§20). A new daily job shall join the aggregator unless different cadence is required for monetary confirmation.

### §11.1 Operational schedule and lease recovery

Deployment schedule defaults are release configuration constants, overrideable through validated deployment configuration. Default deployment schedule: authenticated non-signing tick every five minutes; signer every fifteen minutes; daily business aggregation and daily maintenance anchored at 00:00 UTC. Late jobs catch up on the next successful tick/run. These are desired cadences, not provider delivery guarantees. Use an adapter-compatible external scheduler if the host cannot provide them; do not introduce a mandatory new scheduler vendor. Daily settlement remains once per day, plus manual triggers.

Generic transient retries: maximum six attempts, base delay five seconds, exponential doubling capped at five minutes, with 20% jitter; provider quota/retry-after overrides may slow attempts. Finality polling and a long-lived financial obligation are not limited to six observations. A definitively reverted send is not automatically retried after its funds are released: require a new held, approved request. DLQ/recovery preserves outstanding holds and attempt lineage.

Job lease default is 120 seconds, heartbeat every 30 seconds; increment a monotonic fencing generation on takeover. All completion writes compare the current claim generation. After a signer lease expires, recovery reconciles persisted signed attempts before permitting new signing; an HTTP timeout or lease expiry cannot prove nonbroadcast. Signed payload recovery follows §8.3/§30.3. The lease is a coordination control, not a mechanism for revoking an already signed transaction.

## §12. Realtime and notifications

Default realtime transport shall be none. Use one shared authenticated snapshot poll only while a relevant page is visible, at `client_poll_seconds`; pause on hidden/offline and apply jitter. Do not open per-plan connections or perform notification polling on every component. Public ticker shall rotate already-fetched records locally.

Notification bell shall initially load `notification_page_size` recent items and cursor-load more. Red dot shall mean an item was created after the last dropdown-open cutoff. Opening shall update cutoff only through the newest loaded item; individually unread items shall remain styled unread until explicitly opened/read. Long messages shall expand inline, not navigate to another page. Use text/sanitized Markdown, not raw HTML. Admin direct/bulk messages shall be in-app only. No browser push, APNs, FCM, or noisy channel subscriptions shall be implemented.

## §13. Offline-first and client cache

PWA shall cache the public application shell, fonts/icons, localized help, offline page, public manifest/catalog data, and other explicitly safe read-only assets needed for useful offline browsing. Private API responses and signing material shall be excluded from service-worker and CDN caches. Offline money, wallet, consent, moderation, and admin writes shall be unavailable and shall never be queued for later silent replay. A reconnect shall revalidate invoice/status before user confirmation.

Heavily leverage browser local persistence to reduce network/database/cache-provider calls and make the application useful on weak or intermittent connections. `localStorage` shall be the default small-cache store for nonsensitive preferences, public catalog/manifest snapshots, navigation state, dismissed notices, last selections, and compact user-scoped read-only view models that have been explicitly classified as safe for local persistence. IndexedDB may hold larger versioned public/help data and larger approved user-scoped read snapshots. Persisted financial snapshots are display-only stale copies: they shall never authorize a mutation, prove a balance, or replace a fresh server read before any money or wallet action.

Every persisted user-scoped key shall be namespaced by application schema version plus authenticated user/account identifier and session generation, for example `gw:v1:user:<user_id>:<session_generation>:<key>`. Each value shall carry owner ID, schema version, creation/expiry metadata, and the client shall reject a value whose owner/session namespace does not match the current identity. Purge the previous user's namespace on logout, user switch, session-family change, 401, account deletion, or explicit cache reset. Shared-device use must never allow one signed-in user to read another user's cached dashboard, notifications, referral data, or preferences. Public caches shall use a separate `gw:v1:public:*` namespace.

Never store access/refresh tokens, session cookies, TOTP/recovery material, private keys/seed phrases, wallet signing proofs, signer payloads, unmasked secret configuration, raw platform credentials, pending financial mutation bodies, or reusable idempotency secrets in localStorage/IndexedDB. Highly sensitive transaction evidence remains server-side. Enforce cache entry/byte/TTL caps from §19 with least-recently-used eviction, invalidate relevant keys after successful writes, unsubscribe on route exit, and use one timer per shared poll owner. Every route shall have a scoped error boundary and retry action. Reduced-motion users shall receive static equivalents.

## §14. Request economy and serverless cost

Dashboard shall use one `/api/v1/me/dashboard` response combining identity, active/completed cycles, relevant plan summaries, notifications badge, and earnings totals. Wallet and referral pages shall use their own batch endpoints. Public manifest/plan catalog/help shall use ETags and CDN TTL; private responses shall use `Cache-Control: private, no-store` on the wire, with explicitly scoped memory caching.

Cache identity/catalog for their named TTLs; invalidate after writes, logout, 401, or explicit refresh. Do not refetch on window focus. Prefetch only on intentional hover/touch and never signing/export actions. Disabled-feature batch fields shall return cacheable public empty data or private empty fields, while dedicated disabled feature routes return 404 (§3). Coalesce matching in-flight reads; do not monkey-patch unrelated application requests when a central fetch wrapper suffices.

Zero-cost means no paid infrastructure subscription within measured quotas. Domain registration, gas, liquidity, over-quota usage, and production backup/custody costs are excluded. No million-user or instant-payout claim shall be made for this profile. Before adding a provider, record current quota, permitted commercial use, card requirement, throttling, and exit route in deployment documentation.

## §15. Redis and cache discipline

Default `CACHE_PROVIDER=upstash`; Upstash Redis REST is the default hosted Redis implementation because it fits serverless/Vercel execution, while `ioredis` and other compatible Redis implementations shall remain available behind the cache adapter. Redis usage shall be deliberately minimal because the default operating assumption is a low-limit free plan. The application shall remain fully correct when Redis is unavailable: durable counters, replay protection, revocation, financial idempotency, authoritative rate-limit fallback, and worker leases shall remain in PostgreSQL unless a later measured requirement justifies moving a specific operation. Bounded tooling may select `postgres_memory`; hosted deployments use Upstash unless another configured Redis adapter is selected.

When Redis is enabled, do not use it as a per-component, per-render, or ordinary per-user read-through cache. Prefer browser local persistence (§13), CDN/public caching, in-process L1 single-flight caching, batched API responses, and PostgreSQL before spending Redis commands. Redis calls shall be reserved for high-value bounded operations where it materially reduces contention or latency; batch/pipeline compatible calls, use coarse keys and sensible TTLs, coalesce duplicate work, and track command/quota consumption. Pipelining reduces network latency, not command quota, so it shall not be treated as a free-call multiplier.

In-process L1 shall cache nonfinancial manifest/catalog reads with single-flight recompute. It shall never replace live authorization or authoritative balances. Explicit version invalidation shall be supplemented by TTL; transactional economic writes shall reload the selected DB version regardless of L1. Rate/replay/lease operations shall be atomic durable operations rather than cached guesses. CDN shall serve global safe values; persisted per-user browser caches shall use the identity scoping and purge rules in §13 and shall never share keys across users.

## §16. Provider abstraction map and module boundaries

Provider names appear here as adapter choices, not domain dependencies. Selectors shall be environment variables. Unsupported selectors shall fail deployment validation; disabled interfaces shall lazy-load no SDK.

| Interface | Selector | Implementations / default | Load rule / manual contract scenario |
|---|---|---|---|
| Database | `DB_PROVIDER` | PostgreSQL: Supabase default; Neon / local / generic PostgreSQL supported | Server/worker only; provider adapter must preserve transactions, row locks, constraints, migrations, backup and restore; no domain dependency on Supabase-specific services |
| Cache | `CACHE_PROVIDER` | Upstash Redis REST default; `ioredis`, compatible Redis, and bounded process-memory fallback supported | Only selected adapter; minimize Redis calls; PostgreSQL remains durable authority; expiry, atomic increment, outage fallback |
| AuthProvider | `AUTH_PROVIDER` | Google default; local simulator only in simulation | On auth route; callback/state/subject/consent |
| WalletConnector | `WALLET_PROVIDER` | Injected EVM / TronLink / Solana wallet-standard / dummy | Lazy by selected chain; reject, sign proof, transfer hash |
| PaymentVerifier | `PAYMENT_PROVIDER` | Chain RPC default; GIV simulation | Per asset; duplicate/wrong network/fake token/reorg |
| ChainRpc | `RPC_PROVIDER_<chain>` | EVM: QuickNode/Ankr; SOL: Helius/QuickNode; TRON: TronGrid/independent compatible endpoint | Only active chain; primary/secondary mismatch and failover |
| PriceFeed | `PRICE_PROVIDER` | CoinMarketCap adapter default; signed admin rates fallback | Server quote/catalog aggregation; stale/missing price disables derived activation |
| Signer | `SIGNER_PROVIDER` | Encrypted scheduled signer default for testnet/approved launch; manual-wallet alpha; KMS overlay deferred | Worker only; cap/nonce/ambiguous broadcast/restart |
| CAPTCHA | `CAPTCHA_PROVIDER` | Turnstile default; none/dummy for simulation | Surface enabled plus provider; timeout and replay rejection |
| Realtime | `REALTIME_PROVIDER` | None default; shared HTTP poll | No socket SDK; hidden tab stops requests |
| ExportStorage | `STORAGE_PROVIDER` | Encrypted local export chunks/DB-job stream default; object-store overlay deferred | Export only; access ownership/expiry/checksum |
| AlertDelivery | `ALERT_PROVIDER` | Authenticated external HTTPS webhook default; none only simulation | Worker; redaction, dedupe, delivery acknowledgement |
| Email / SMS / AI | `EMAIL_PROVIDER` / `SMS_PROVIDER` / `AI_PROVIDER` | None only | No load; not applicable to MVP |

**Database access standard.** Drizzle ORM/query builder shall be the canonical application data-access layer and shall target effectively 100% coverage of application queries, inserts, updates, deletes, joins, aggregates, and transactions. Domain/service modules shall not import a database vendor SDK or issue ad-hoc `postgres` tagged-template queries directly. Raw SQL is permitted only where PostgreSQL itself is the required feature and Drizzle cannot safely express the operation, including migration DDL, explicit `GRANT`/RLS statements, specialized row/advisory locks or isolation clauses, backup/restore tooling, and narrowly documented reconciliation/administrative primitives. Each application raw-SQL exception shall be small, parameterized, commented with its reason, and recorded in `/docs/PROJECT-STATUS_vN.md` until an ORM equivalent is practical. Drizzle schema definitions shall cover every application table and remain synchronized with migrations.

Each adapter shall have a documented executable simulator action or repeatable manual checklist in `/docs/HOW-IT-WORKS.md`, with execution results, failures, and milestone status recorded only in `/docs/PROJECT-STATUS_vN.md`; these are acceptance procedures, not automated test suites (§24). Extra live implementations beyond the selected deployment shall remain deferred unless needed for mandated RPC failover.

Module map: identity owns users/sessions; catalog owns plan versions; queue owns positions/slots; ledger owns journals/accounts; payments owns invoices/chain verification; payouts owns obligations and signer requests; referrals owns attribution; engagement owns points/shares; notifications owns inbox; administration owns manifests/import orchestration; moderation owns cases; infrastructure owns adapters/jobs. Cross-module access shall use exported service interfaces, never another module's internal tables from client code. A lint import-boundary rule shall reject domain imports of vendor SDKs and client imports of signer/server modules.

## §17. API conventions and error taxonomy

Use `/api/v1`, JSON schema validation, amount strings, UTC ISO timestamps, and a propagated/generated `x-request-id`. Success: `{data,meta:{request_id,next_cursor,has_more}}`; errors: `{error:{code,message_key,help_slug,retryable},meta:{request_id}}` with meaningful non-2xx HTTP status. Cursor shall be opaque, signed, filter-bound `(sort_value,id)`; page size/cap follow §19. Changing filters shall invalidate the cursor. Sorting/filter fields shall be allowlisted per endpoint; never accept SQL identifiers directly.

Canonical error codes: `UNAUTHENTICATED` (401); `FORBIDDEN`, `ACCOUNT_RESTRICTED`, `CONSENT_REQUIRED`, `STEP_UP_REQUIRED` (403); `NOT_FOUND`, `FEATURE_DISABLED` (404); `INVALID_INPUT`, `WRONG_NETWORK`, `INVALID_ADDRESS`, `INVALID_PROOF` (400); `ACTIVE_CYCLE_EXISTS`, `COOLDOWN_ACTIVE`, `PLAN_UNAVAILABLE`, `QUOTE_EXPIRED`, `VERSION_CONFLICT`, `PAYMENT_ALREADY_CLAIMED`, `NO_RECEIVER_AVAILABLE`, `INSUFFICIENT_BALANCE`, `FEE_EXCEEDS_AMOUNT`, `REQUOTE_REQUIRED`, `DESTINATION_CHANGED` (409); `RATE_LIMITED` (429); `PROVIDER_UNAVAILABLE`, `FINANCIAL_SAFETY_PAUSE`, `GAS_UNAVAILABLE` (503); `INTERNAL_ERROR` (500). Every user-facing code shall resolve to a localized help article. Authentication errors shall not be used for business validation.

Core endpoints: auth start/callback/refresh/logout/2FA; `/me/consent`; `/me/dashboard`; `/plans`; `/gifts/invoices`; `/gifts/invoices/:id/transaction`; `/me/cycles`; `/me/wallet/challenges`, `/me/wallets`, `/me/wallet`, `/me/withdrawals/quotes`, `/me/withdrawals`, `/me/withdrawals/:id/confirm`, `/me/withdrawals/:id/cancel`; `/me/referrals`; `/me/points`; `/me/notifications`, `/seen`, `/:id/read`; `/me/data/export`, `/me/deletion-request`; `/reports`, `/appeals`; `/manifest`; `/admin/business-settlements/preview`, `/admin/business-settlements`, `/admin/*`; `/internal/tick`; `/api/health`. Every mutating endpoint shall require `Idempotency-Key` or its documented single-use nonce/version; request-key reuse with a different body shall return 409. Keep financial business keys permanently even when HTTP replay responses expire.

Use additive API evolution. Breaking change shall require `/v2`; retain previous compatible wire schema through `api_deprecation_days`. Web/PWA service workers shall detect incompatible build manifest and require reload before mutation. Native-client compatibility is not applicable to MVP.

## §18. Multi-client strategy and UI

One responsive Next.js App Router codebase shall serve browser/PWA and the lightweight server API through native Route Handlers; shared server services and the public manifest determine feature availability. Keep wallet-specific code in lazy adapters. Mobile layout shall use fixed bottom navigation: Gifts, Wallet, Referrals, Settings, Help; admin has an additional Admin entry, moderator a Moderation entry. Desktop shall show the same destinations in a readable primary menu. Hide flagged-off entries consistently.

Dashboard order: header/notices/ticker → clickable summary card → How It Works → currency selector → gift tiles → detailed gift cards → currency reminder/selector → footer. Display three gift tiles per mobile row, with gift icon, prominent cost, and smaller **Expected: $xx** amount. Tapping shall scroll to its dedicated card; a return-up control shall restore tile focus. Use compact spacing, legible contrast, local SVG/emoji assets, and default 🎁. Avoid remote asset-upload dependencies.

Unjoined card: name, exact token cost, USD estimate where available, precomputed Expected amount, and Send this gift. Active card: current displayed queue position, gifts credited (`0/2`, `1/2`, `2/2` at default target), withdrawable balance, and withdrawal status. Completed tab shall show Cycle complete, receipts, completion time, and cooldown countdown. Total queue size shall follow `ui_show_queue_total`.

Support light/dark themes. Gentle tap animation shall respect reduced motion. Currency tabs shall rotate automatically only in an idle browsing preview, never while focused, actively interacted with, signing, or viewing an active cycle; stop on manual selection. Only enabled currencies shall appear. Wallet help shall offer explicit “Use the same verified address for this network” for same-network assets; never copy across incompatible networks silently.

## §19. Admin, manifest, and feature flags

### §19.1 Configuration model

`x_manifest` shall have `key`, `value jsonb`, `type`, `scope`, `description`, `updated_at`, `updated_by`, `version`, `deprecated_at`. `xmanifest.json` shall be the import/export/bootstrap representation; DB shall be runtime authority. Editing the file shall require an explicit validated apply command/admin import; it shall not silently overwrite DB changes on every boot. Seeds shall use `ON CONFLICT DO NOTHING`.

Scope: public = safe browser configuration; private = server only; staff = administration/operational settings. No keys/passwords/RPC credentials, platform address values, auth tokens, identity documents, or user PII shall enter any manifest scope; private/staff scope is not a secret store. Invalid presentation configuration shall fall back to last-known-good/seed with alert; invalid financial/security configuration shall disable affected mutations, not silently use another split/address. DB outage shall allow public defaults but stop financial/staff mutations. Private/staff writes shall require fresh TOTP, expected version, validated staging, audit diff, and invalidation.

Endpoints shall include public GET `/manifest` with ETag; staff GET `/admin/xmanifest`; single/bulk PATCH with expected versions; per-key POST reset. Values shall be staged and atomically committed. Plan economic settings shall require contextual validation against §9.3. Platform-owned addresses shall have no manifest or admin-editable address field; their configuration source is environment secrets (§19.3). Admin frontend gift-card menu shall expose Edit, Pause, Deactivate; destructive/economic changes shall show impact before commit. Used plans/accounts shall archive rather than hard-delete financial references.

### §19.2 Manifest key inventory

This is the Phase One runtime-configurable inventory. Phase Two additions are defined in §32.2 and shall use the same validation, seeding, scopes, versioning, and admin interface. Structured objects shall be schema-validated; their listed fields are part of their key, not undocumented settings. Group is also the admin edit location. Defaults shall be defined once in seed data. Financial/safety edits outside valid ranges shall be rejected.

| Key | Type / scope | Default | Group / validation and purpose |
|---|---|---|---|
| `feature_<name>` | boolean / public | true for all §3 features | Features; exact names are those in §3; admin read-only exception, no moderator exception |
| `product_content` | json / public | Brand/copy in §1.2, domain `https://giftersworld.org` | Content; English/French translation-keyed values |
| `terms_content` | json / public | Version `draft-1`, editable generic terms | Consent; admin edits and publishes versioned terms |
| `eligibility_min_age` | number / public | 18 | Consent; positive whole years, owner-reviewed jurisdiction policy |
| `mainnet_enabled` | boolean / public | false | Crypto; environment selector, independent of presentation; testnet/GIV remain available |
| `admin_timezone` | string / staff | `Africa/Lagos` | Admin; valid IANA zone |
| `supported_locales` | json / public | `[en,fr]` | Localization; both complete packs required |
| `default_locale` | enum / public | `en` | Localization; must belong to supported locales |
| `entitlements_member` | json / public | `{dashboard:true,history:true,wallet_link:true,send_enabled_gifts:true,receive_own_cycles:true}` | Entitlements; pending consent still gates member capabilities |
| `cycle_max_concurrent` | number / public | 0 | Gifts; zero = no extra cap |
| `cycle_rejoin_cooldown_hours` | number / public | 24 | Gifts; elapsed-time, prospective only |
| `plan_templates` | json / staff | Twelve price/target rows in §2.2 | Plans; seed catalog only, not edits to active economics |
| `plan_config_<plan_uuid>` | json / public | Disabled; `price_usd` from template, `pricing_mode:usd_at_activation`, `amount_base_units` absent until activation, `receipts_required:2`, `icon:gift`, `launch_at` absent, `countdown:true`, `countdown_lead_days:7`, `bootstrap_enabled:true`, `bootstrap_count:10` | Plans; immutable used economics, safe public fields only |
| `payment_split_bps` | json / public | `{receiver:8500,marketing:400,referral:400,developer:600,reserve:100}` | Finance; sum must equal basis-point total |
| `asset_config_<asset_id>` | json / public | Disabled; asset registry fields in §30; `display_unit:usd`, `confirmation_policy` from registry | Crypto; contract/decimals required for tokens, native amount always visible |
| `quote_ttl_minutes` | number / public | 15 | Payments; positive bounded window |
| `price_max_age_minutes` | number / private | 15 | Payments; stale feed blocks derived activation |
| `native_price_display_decimals` | number / public | 8 | Payments; display only, never round token transfer to two decimals |
| `fiat_display_decimals` | number / public | 2 | Payments; display only |
| `wallet_change_cooloff_hours` | number / public | 24 | Wallets; new outgoing destination only |
| `wallet_reminder_hours` | number / public | 24 | Wallets; dismissible notice TTL |
| `empty_queue_policy` | json / staff | `{mode:business_credit,destination_role:developer}` | Queue startup; mode `business_credit` or `block_checkout`; destination role `developer` or `marketing`; role only, never an address |
| `payout_limits` | json / staff | `{auto_approve_usd:100,signer_per_tx_usd:5000,daily_per_asset_usd:10000,batch_size:25,interval_minutes:15}` | Finance; native fee value uses conservative cached rate; absent rate pauses real sends |
| `withdrawal_fee_policy` | json / public | `{quote_ttl_minutes:30,max_rate_age_minutes:15,platform_variance_pct:25,failure_fee_mode:actual_up_to_approved_quote,fixed_minimum:0}` | Withdrawals; net positive/network-feasible; fresh consent for larger quote; no arbitrary minimum; secret prices/credentials are excluded |
| `business_settlement_policy` | json / staff | `{manual_enabled:true,daily_enabled:true,daily_anchor:utc_midnight,fee_payer:platform_reserve}` | Finance; aggregate separately by role/asset/network/environment; zero balance skips without a transfer |
| `bootstrap_destination_role` | enum / staff | `developer` | Finance; PlatformDestinationRole (§4.1) selects an environment-secret destination; no address value in manifest |
| `crypto_risk_<asset_id>` | json / staff | `{hot_wallet_cap_usd:1000,gas_low_usd:20,reorg_buffer_blocks:64,dust_base_units:0}` | Finance; deployment shall replace chain-specific dust/buffer values from verified registry; zero dust does not override network minimum |
| `crypto_monitor_policy` | json / private | `{first_poll_seconds:15,later_poll_seconds:60,active_poll_minutes:120,exception_age_hours:48,stuck_blocks:30,replacement_attempts:3,rpc_rps:10,rpc_timeout_ms:5000}` | Crypto; exhausted monitor enters exception, not proof of failure |
| `points_rules` | json / public | `{signup:1,usd_threshold:100,sender_low:25,sender_high:50,referrer_low:5,referrer_high:10}` | Engagement; threshold equality uses high |
| `points_daily_cap` | number / private | 1000 | Engagement; UTC per beneficiary, zero disables awards |
| `ui_show_queue_total` | boolean / public | true | UI; actual rank remains visible |
| `ui_rotation_policy` | json / public | `{activity_seconds:10,currency_seconds:10,launch_reshow_days:3,launch_dismiss_hours:24}` | UI; no auto-rotation during interaction |
| `public_stats_policy` | json / public | `{enabled:false,refresh_hours:24,include_system:false}` | Activity; settled real payouts only |
| `activity_policy` | json / private | `{source:fixtures,max_records:50}` | Activity; financial/statistical records remain independent |
| `activity_statements` | json / public | Ordered source statements listed in Appendix A | Activity; admin-editable array, maximum fifty items |
| `notification_page_size` | number / public | 15 | Notifications; bounded by pagination cap |
| `captcha_surfaces` | json / public | `{consent:true,suspicious_checkout:true}` | Abuse; provider selector also required |
| `rate_policies` | json / private | Named route policies in §10.1 | Abuse; all windows/keys/fail behavior stored here |
| `report_dedupe_hours` | number / private | 24 | Moderation; signed-in reporter only |
| `moderator_permissions` | json / staff | `{review:true,suspend:true,restore_suspension:true,ban:false,delete:false,finance:false,bulk_export:false}` | Moderation; cannot override immutable admin-only powers |
| `auth_session_policy` | json / private | `{access_minutes:60,absolute_days:30,idle_days:7,preauth_minutes:5,totp_step_seconds:30,totp_window_steps:1,replay_retention_seconds:90}` | Identity; fresh sensitive DB validation still required |
| `identity_policy` | json / staff | `{username_min:3,username_max:24,collision_attempts:8,reserved:[admin,administrator,moderator,support,system,root,gifters,official],blocked_words:[fuck,shit,merde,putain]}` | Identity; closed lowercase username rules, bounded collision fallback; no credentials |
| `staff_reauth_minutes` | number / staff | 15 | Identity; positive bound |
| `pending_consent_retention_days` | number / private | 0 | Identity; zero means retain until explicit deletion, as specified |
| `job_policy` | json / private | `{max_attempts:6,base_delay_seconds:5,max_delay_seconds:300,jitter_fraction:0.2,lease_seconds:120,chunk_size:100}` | Jobs; payout ambiguity overrides generic resend |
| `scheduler_auth_policy` | json / private | `{max_clock_skew_seconds:300,replay_ttl_seconds:600}` | Jobs; HMAC key is environment-secret only; nonce unique during accepted window |
| `worker_shutdown_seconds` | number / private | 20 | Jobs; leases make unfinished jobs recoverable |
| `health_timeout_ms` | number / private | 2000 | Monitoring; bounded component calls |
| `cache_policy` | json / public | `{manifest_server_seconds:60,manifest_public_seconds:300,catalog_seconds:300,identity_seconds:60,private_snapshot_seconds:30,client_poll_seconds:60,max_memory_entries:100,max_memory_mb:5,max_public_help_mb:10}` | Cache; sensitive live checks excluded |
| `pagination_policy` | json / public | `{default_size:20,max_size:100}` | API; notification default comes only from `notification_page_size` |
| `retention_policy` | json / staff | `{financial_archive_after_days:365,financial_keep_years:7,audit_hot_days:90,job_terminal_days:30,http_replay_days:7,export_hours:24,notification_days:90}` | Data; legal hold overrides deletion; permanent business dedupe retained |
| `backup_policy` | json / staff | `{interval_hours:24,keep_days:30,restore_check_days:30,rpo_hours:24,rto_hours:24}` | Backup; measured simulation targets, real funds require stronger recovery |
| `alert_policy` | json / staff | `{backlog:500,dlq:1,signer_stale_minutes:45,lock_wait_ms:1000,quota_warning_fraction:0.8,public_rpc_minutes:15,remind_minutes:[5,15,60],daily_limit:3}` | Monitoring; dedupe by category+asset+condition |
| `simulation_policy` | json / staff | `{giv_grant:5000,giv_decimals:2,max_seed_batch:100,allow_reset:true}` | Simulation; reset prohibited against production data |
| `export_import_limits` | json / staff | `{upload_mb:50,chunk_rows:1000,max_message_chars:5000,max_provider_metadata_kb:16}` | Admin; oversized import requires CLI streaming, never request buffering |
| `api_deprecation_days` | number / public | 90 | API; additive schema preferred |

Code constants, not runtime knobs: `BASIS_POINTS_TOTAL=10000`; `QUEUE_TICKET_BITS=40`; UUID/referral cryptographic generation; `USERNAME_MIN=3`, `USERNAME_MAX=20`, `USERNAME_COLLISION_ATTEMPTS=100`, `USERNAME_RANDOM_CHARS=6`; `MIN_TOUCH_TARGET_PX=44`; `CONTRAST_TEXT=4.5`, `CONTRAST_LARGE=3`; performance/CI budgets in §25. These protect schema/protocol/UI contracts; altering them requires a release and re-verification.

Environment variables: all platform-owned address secrets in §19.3, provider selectors in §16, DB connection/roles, JWT signing keys, `MFA_ENCRYPTION_KEY`, `EXPORT_ENCRYPTION_KEY`, worker-only signed-payload encryption key, OAuth client secret, RPC primary/secondary URLs and keys, signer ciphertext reference and separate decryption secret, scheduler credential, alert webhook credentials, deployment origin, and asset-registry file path. Missing required secret shall disable its adapter and fail production deployment validation. Signing-key decryption secrets and signed-payload encryption keys shall exist only in the signer workload secret scope, never the web/API deployment. OAuth/MFA/session secrets shall be available only to the required server modules; no secret uses a client-public build-variable prefix. Financial addresses shall never be guessed from an environment name.

### §19.3 Platform-owned addresses: environment secrets only

All receiving, developer, marketing, bootstrap/custom beneficiary, native-gas funding, sweep, and other platform-owned addresses shall be configured exclusively through server/worker environment-secret storage. Never store them as runtime configuration in `x_manifest`, `xmanifest.json`, seed files, source code, browser bundles, or exported manifest/site configuration. The admin UI may show masked diagnostic fingerprints and configured/missing status but shall not save or replace these addresses. Actual user-linked wallets and public token contract/mint registries are separate data classes and remain in their existing stores.

| Environment-secret name pattern | Purpose / default |
|---|---|
| `PLATFORM_RECEIVING_ADDRESS_<CHAIN>_<ENV>` | Incoming treasury; unset disables that chain/environment checkout |
| `PLATFORM_DEV_ADDRESS_<CHAIN>_<ENV>` | Developer settlement; unset keeps its balance pending |
| `PLATFORM_MARKETING_ADDRESS_<CHAIN>_<ENV>` | Marketing settlement; unset keeps its balance pending |
| `PLATFORM_BOOTSTRAP_ADDRESS_<CHAIN>_<ENV>` | Custom bootstrap destination; only required when role selects `custom_bootstrap`; default role uses developer secret |
| `PLATFORM_GAS_FUNDING_ADDRESS_<CHAIN>_<ENV>` | Optional separate gas-funding wallet; absent uses the treasury secret; funds must actually reach the signer fee payer |
| `PLATFORM_SWEEP_ADDRESS_<CHAIN>_<ENV>` | Optional audited reserve/sweep destination; unset disables sweep |

Use the registered uppercase chain/environment suffixes, including separate testnet/mainnet entries. Simulation shall use internal ledger accounts, not fake on-chain secrets. Do not infer or fall back across environments. Signer identity and network-normalized receiving address must match where required; invalid configured addresses disable the relevant function and raise a redacted alert.

Only deployment-secret administration may change address values. Such a change shall require controlled reload/redeployment, validation, configuration fingerprint audit, and a rotation procedure. Keep old receiving addresses monitored for unresolved invoices/late deposits using secured versioned environment-secret entries (`PLATFORM_RECEIVING_ADDRESS_<CHAIN>_<ENV>_PREVIOUS_<VERSION>`), until their exposure is resolved. Revalidate business settlements against the active secret version before signing; stale unsent preparations require refresh/review, while broadcast transactions retain immutable evidence.

Environment secrets are the configuration source, not a claim that blockchain addresses themselves are private. A checkout invoice must expose its exact treasury destination to the paying user/wallet for approval. Historical invoice/transaction/payout records shall retain required immutable address snapshots as financial evidence; do not treat them as editable configuration. General logs/manifest/exported settings shall omit raw platform address values; an explicitly authorized financial-history export may contain historical transaction evidence. Fresh-site restore must re-provision address secrets separately and validate pending work before sending.

### §19.4 Manifest secret-exclusion enforcement

**Public-repository requirement.** All xmanifest variants, committed seeds, example settings, fixtures, documentation, build artifacts, and repository history shall contain no real credentials, private keys/seed phrases, platform-address configuration, personal data, or confidential operational values. Commit only placeholder variable names in `.env.example`; ignore real `.env` files, credential files, wallet/key files, exports, and database backups. Provision real values through deployment secrets. Before publication, scan tracked files, generated client bundles, and Git history for sensitive values; a detected credential requires rotation and history remediation, not merely `.gitignore`. Manifest scope `private` or `staff` is an access rule, never permission to commit a secret. Repository inspection shall be recorded in implementation acceptance evidence.

Maintain a closed allowlist of manifest keys and nested object fields from §19.2/§32.2. Reject unknown keys, extra fields, credential/address-shaped additions, and invalid scopes at every seed, admin PATCH, file import, and site restore path. Do not add an arbitrary `secrets`, `wallet`, `provider_options`, or `metadata` object to bypass schemas. A schema-approved public object shall still pass a field-by-field public projection; never serialize the full DB manifest cache.

A content string may contain an intentional public URL, but secret-bearing URL credentials/query parameters, webhook authentication values, token strings, and platform address configuration shall be rejected. Validate before logging audit diffs; rejected secret-like payloads shall be redacted and not copied into logs/errors/audits. Existing legacy manifest address or credential keys shall be quarantined from all outputs, transferred to deployment-secret provisioning by an authorized operator, then removed/redacted from configuration history where possible. An actual leaked credential shall be rotated, not merely deleted from the current manifest.

Public/static builds and `/manifest` shall be inspected with dummy canary credentials/addresses in environment secrets to demonstrate no leakage. Authenticated admin exports shall omit runtime secrets; diagnostic endpoints report status/fingerprints only. A financial-history export may contain historical address evidence as §19.3 allows; it shall be access-controlled and never automatically embedded in manifest or frontend content.

### §19.5 Deployment-controlled security ceilings

Environment configuration establishes hard limits independently checked by API and signer. Runtime manifest settings may tighten these limits but cannot relax them. Keep real deployment values outside committed configuration; `.env.example` contains variable names and placeholders only.

| Variable | Code default | Enforcement |
|---|---:|---|
| `SIGNER_HARD_AUTO_APPROVE_USD` | 100 | Maximum manifest automatic-approval threshold |
| `SIGNER_HARD_PER_TX_USD` | 5000 | Maximum signed principal per transaction |
| `SIGNER_HARD_DAILY_PER_ASSET_USD` | 10000 | Aggregate principal reservations across withdrawals, business settlements and manual sweeps, per treasury/asset/UTC day |
| `AUTH_HARD_ACCESS_MINUTES` | 60 | Maximum access-token lifetime |
| `AUTH_HARD_ABSOLUTE_DAYS` | 30 | Maximum absolute session lifetime |
| `AUTH_HARD_IDLE_DAYS` | 7 | Maximum idle lifetime |
| `STAFF_HARD_REAUTH_MINUTES` | 15 | Maximum sensitive-action reauthentication age |

Invalid manifest values are rejected; invalid deployment limits disable affected financial operations. Mainnet/testnet permission, signer enablement, staff-MFA requirement, and secret access scopes are deployment controls: runtime flags cannot override a denied environment. Staff MFA remains mandatory; impersonation remains out of scope. A redeployment changes ceilings and writes a safe configuration fingerprint audit. No automatic vendor choice or production launch is introduced.

App and signer independently compute a canonical fingerprint from environment, chain, configured address roles/versions and effective hard limits. Before signing, compare through an authenticated internal diagnostic contract against a fresh app-approved configuration revision; mismatch or unavailable validation pauses new signing and raises P1. Do not expose raw configuration or fingerprints on public health routes. Existing broadcast attempts remain under recovery even during mismatch. Rotation retains old-address monitoring until unresolved invoice exposure is closed, with no fixed 48-hour cutoff.

Deployment workflows shall use protected signer/production environments, least-privilege workflow permissions, pinned external actions, and production approval controls appropriate to the owner's deployment setup. Pull-request/fork builds and untrusted branches never receive signer or production secrets. A public source repository does not make signer workflows safe without this separation.

## §20. Observability and alerts

Use structured logs, DB health/job metrics, and an admin dashboard rather than a paid APM dependency. Include request ID, job/operation ID, environment, chain/asset, state transition, duration, and safe error category. Never log cookies, tokens, private keys, raw signature proofs, decrypted secrets, or full PII. Monitor accepted/exception inflows, payout liabilities/settlements, gas balances, bootstrap payouts, real-member receipts, queued jobs/DLQ, lock waits, RPC failures, cache hits, and free-tier quota estimates.

| Level | Severity/color | Audience and delivery | Escalation |
|---|---|---|---|
| P1 | Critical/red | Admin only; in-app plus external webhook | Immediate and named reminder schedule until acknowledged; bounded daily reminders until resolved |
| P2 | High/amber | Finance/infra: admin; moderation: admin+moderator | Immediate plus daily reminder until resolved |
| P3 | Advisory/blue | Admin; moderation-only cases also moderator | Weekly digest; no paging loop |
| INFO | Routine/gray | Admin activity log | No escalation |

P1: chain send inconsistent with ledger, signer credential compromise, unexplained treasury deficit. P2: low gas, stale signer heartbeat, DLQ threshold, both RPCs unavailable, missed reconciliation, long-held payouts. P3: unmatched inflow, rejected fake token, reorg review without deficit, gas variance. Routine retries and successful reconciliation shall be INFO. External alert delivery shall be proven before real sends. Dedupe by environment+asset+category+condition fingerprint; acknowledgement stops repeated escalation but not unresolved status. Dashboard uses private snapshot TTL; manual refresh bypasses it. AI-call logging is not applicable.

## §21. Security controls and threat requirements

Mandatory runtime/build controls:

- Nonce-based CSP with `strict-dynamic`; nonce-trusted scripts shall load dynamic scripts. Maintain explicit `connect-src`, `img-src`, `frame-src`, and auth/provider allowlists; never treat script host lists as protection under `strict-dynamic`.
- Validate every JSON body, upload basename, redirect, chain address, asset identifier, sort/filter field, and outbound destination. Prevent path traversal with server-selected destinations and an allowlisted basename, never concatenated user paths.
- Use parameterized SQL, strict permissions, TLS, HttpOnly auth cookies, CSRF checks, durable replay guards, secret scanning, and no browser DB/service keys. Financial/member rows shall be addressed by authenticated ownership and scoped IDs; arbitrary user IDs in request bodies do not authorize access. Validate both source and destination records during privileged actions, and prevent role/status/money fields from mass assignment. Scheduler shall authenticate independently with HMAC workload signature, server timestamp within `scheduler_auth_policy.max_clock_skew_seconds`, consumed nonce retained for `scheduler_auth_policy.replay_ttl_seconds`, and rotation-safe environment secrets; rejected/replayed signatures shall not enqueue work. Cron retries use fresh authenticated requests but the same durable job idempotency key.
- Keep signer isolated from API runtime; decrypt in memory per run. Do not permit web/API modules to read the worker decryption secret or raw signed payloads; encrypt persisted signed bytes at rest and restrict access to the signer/recovery service. A stolen raw signed transaction can be broadcast, so never expose it in admin JSON, public logs, client state, or exports. No user private keys/seed phrases shall ever be requested. Hot-wallet caps, signer limits, and treasury sweeps shall apply independently of admin UI approval.
- Re-evaluate consent, plan version, reservation, cooldown, role/status, and split inside the transaction; use row locks for queue/ledger counters and unique keys for operation replay. Enforce balance availability under lock before payout reservation.
- Coalesce cache misses and apply scheduled jitter; bound all payloads/caches/job chunks. Reset listeners/timers on unmount/logout; handle SIGTERM with resumable leases.
- Keep bounded financial/audit archives and FK-based orphan cleanup. Never cascade-remove monetary records after deleting a user.
- Report route error-boundary failures without sensitive state. Retry only safe operations; ambiguous broadcasts resolve hashes before any new send.

Outbound RPC/price/alert requests shall use deployment-owned HTTPS allowlisted endpoints, reject user-submitted URLs and private/link-local destinations, and revalidate redirects. Credential-bearing URLs shall remain environment secrets and be redacted in errors. User-field CSV exports shall escape spreadsheet-formula-leading values as data, and imported files shall enforce size/schema/checksum constraints before staging. Never trust an import to grant admin roles, enable signer secrets, or replay payment jobs without privileged restore validation.

Named enforcement: transaction assertions for I1–I5; unique DB constraints for replay/slot claims; server schema validation and SSRF/path allowlists; lint boundaries and secret-scan build gates; simulator/manual scenarios for TOTP replay, concurrent invoices, reorgs, signer restart, unauthorized row access, and partial imports. AI prompt injection/model-string controls are not applicable: no AI provider runs in the product.

## §22. Internationalization, search, media, SEO

Ship complete English and French language packs. UI text shall reference translation keys; format numbers/dates with locale-aware utilities and explicit English/French plural rules. Retain RTL-ready logical CSS; actual RTL language packs are out of scope. Language switch shall update UI without changing financial values, chain names, or wallet addresses. CI shall check key parity, not translate text automatically.

Help search shall use PostgreSQL full-text indexing with locale configuration and trigram fallback; rank exact title match, full-text relevance, then slug. User/admin search shall allow exact email/username/UUID only to permitted staff, paginated. No global member search shall exist.

Media uploads are not applicable. Generate receipt images locally from SVG/canvas using confirmed payout metadata, redacted username/address, currency/network, receipt time, and branding. Receipt previews, downloads, and user-initiated external sharing shall be available in simulation and testnet as well as for verified real payments. Show the actual asset and network on every receipt: GIV receipts show GIV, and testnet receipts identify their test network. Do not substitute dollar-denominated real-money receipt claims for simulated balances. Sharing shall be user initiated; never automatically post to another service. Do not count a rendered image as a paid receipt.

SEO: render homepage and plan catalog using server-safe cached public data; help and How It Works shall be pre-rendered per locale; legal pages shall render published version. Use canonical origin from product configuration, language alternates, sitemap inclusion for those public routes, `WebSite`/`FAQPage` structured data only for visible accurate content. Login and authenticated/admin routes shall be `noindex` and excluded from sitemap. Plan/help slugs shall be unique; reserve route words; renames shall use a permanent redirect map. No public profiles or publicly indexed wallet receipts shall exist.

The ticker shall rotate the exact ordered statements in Appendix A from first to last, one line every `ui_rotation_policy.activity_seconds`, then return to the first. Convert their specified USDT text to dollar formatting. Show the ticker near the top of every screen, including logged-out screens. Do not add per-statement demo labels or replace the source list with a live-event feed in the specified implementation. Fixture statements shall never increment member counts, paid totals, points, ledger balances, or notification payment records.

Public-stat controls shall display total consented members and settled member gift/referral payments in USD. Pending registrations shall remain a separate count. Refresh snapshots on the configured cadence rather than each page load. Internally separate bootstrap, simulated, and real payments so the selected environment’s statistics can be inspected without rewriting the ledger.


## §23. Accessibility

Target WCAG 2.2 AA. Require named touch/contrast constants in §19, visible keyboard focus, screen-reader labels, keyboard-operable navigation, modal focus trapping/restoration, accessible form errors, and reduced-motion mode. At narrow width, three tiles shall remain operable without shrinking text to illegibility. State shall not rely on color, animation, or emoji alone. Pause controls shall exist for activity/currency rotation; automatic changes shall not steal focus. Do not ship with keyboard-inaccessible checkout, unlabeled wallet confirmation, insufficient contrast, clipped safe-area bottom nav, or an inaccessible How It Works explanation.

## §24. Testing and CI

No automated unit, E2E, load, financial regression, or penetration test suite shall be written for MVP, as requested. Do not interpret that constraint as permission to omit verification. Use product simulation mode, named manual provider contracts (§16), runtime assertions, reconciliation, and recorded milestone acceptance checklists (§31).

CI shall run lint, typecheck, translation parity, import-boundary checks, secret scan, dependency/lockfile consistency, deployment config validation, and bundle-budget reporting on pushes and PRs without hosted credentials. Hosted checks may remain blocked during coding iterations, but their unrun status shall be recorded; passing compilation does not satisfy hosted milestone acceptance. Manual acceptance shall cover: concurrent same-plan attempts, duplicate proofs, duplicate workers, missing-wallet payments, sender rejection, late/under/overpayment, wrong asset/network, RPC outage, confirmed credit-based cycle completion, withdrawal fee reconciliation, manual/daily business trigger races, missing address secrets, reorg, nonce replacement, partial import rollback, deletion with liability, priority/bootstraps, and test isolation.

Pin lockfile and supported runtime in repository configuration. Regenerate lockfile only with deliberate dependency updates. A mismatched runtime, absent selected adapter, leaked key, translation mismatch, or oversized bundle shall fail the build. Do not repeatedly rerun unchanged scenarios; repeat after relevant changes/failures. The absence of automated regression coverage shall be recorded with manual acceptance results.

## §25. Performance budgets

Release constants/targets: `INITIAL_ROUTE_JS_KB=200` compressed excluding lazily loaded wallet adapters; `API_BUNDLE_MB=3` compressed for the free edge profile; `WALLET_ADAPTER_BUNDLE_MB=2` per lazy adapter; `LCP_3G_SECONDS=4` on representative mobile; `PUBLIC_API_P95_MS=500`, `PRIVATE_READ_P95_MS=800`, `MUTATION_ACK_P95_MS=1500` excluding chain confirmation; `COLD_START_TARGET_MS=1500`; `BUNDLE_REGRESSION_PERCENT=10`. These are acceptance targets, not measurements already achieved.

Queue admission and rank read shall not scan or renumber the entire queue. Paginated collections shall stay within §19 caps. Financial confirmation shall execute asynchronously and expose stage timestamps, not hide chain latency in API response time. The free-profile API must fit host CPU limits in a measured deployment; if wallet verification/JWT/DB response processing exceeds them, the exit criterion fails and a compatible execution profile is required. Million-entry queue storage/rank efficiency shall be a design target; a production throughput claim requires a separate benchmark and budget.

## §26. Disaster recovery, backups, and provider exit

Simulation defaults shall target the backup RPO/RTO in §19. Export encrypted database snapshot plus manifest/asset-registry/schema version daily, excluding live credentials. Keep checksums and backup inventory. Restore monthly into an isolated environment with signer/mainnet off; compare counts, journal totals, and outstanding liabilities. Do not restore then automatically resend old payout jobs. Before resuming real sending, scan chains from a trusted checkpoint to reconcile transfers after the snapshot; recovered signed attempts shall be matched to their hashes.

Recovery shall preserve the permanent operation registry, transaction history, and signed-send records. Record observed recovery limitations under the selected zero-cost profile; never resume sends before reconciling transfers after the backup checkpoint.

Provider outages: DB down stops mutations/signing; auth down preserves valid sessions but prevents new login; RPC down stops confirmation/sending and keeps states pending; price feed down permits display of dated cached estimates but blocks stale derived-price activation and USD-capped sends; signer down preserves obligations; CAPTCHA down blocks required protected surfaces; alert channel down blocks initial financial activation and raises a dashboard error. Regional recovery shall deploy the same repository, import verified backup, rotate access secrets, reconcile chains, then re-enable sends.

### §26.1 Portability and deletion

Member exports use a creation cutoff fixed at the request: later-created records are excluded, while mutable values are read during each bounded part capture. Parts are immutable after capture and are not one global point-in-time snapshot. JSON and CSV shall include the temporal contract version, creation cutoff and capture interval, including empty parts. Member export shall include profile/preferences/consent, linked public addresses, cycles/gifts, points/referral stats, own notifications, and own ledger/payout history as JSON+CSV through an authenticated, expiring async download. Admin shall export selected user fields or a full encrypted site snapshot. Financial/audit retention shall survive account deletion in anonymized/tombstoned form; social preferences, profiles, auth secrets, and exposed referral codes shall be erased. Do not promise erasure of public blockchain history.

Fresh-site import shall use staging DB/schema, validation, checksums, preserved UUIDs, and a single publish switch. Reject import into a nonempty financial database; merge imports are out of scope. Preserve business keys, counters, transaction hashes, payout state, and sequence high-water marks; invalidate sessions and refresh credentials. Seed default configuration only where absent. Failed import shall leave the running site unchanged. Full reset shall require typed operation confirmation and simulation namespace; production reset shall be prohibited. Provide a CLI streaming path above the UI upload cap.

Estimated adapter exit effort, subject to deployment details: compatible Postgres host change: 1–2 development days; cache provider: 1 day; RPC provider: 1–2 days per chain; price/alert adapter: 1–2 days each; web/API host: 2–4 days; signer execution platform: 3–5 days plus full manual money-path re-verification. These are planning estimates, not service guarantees.

## §27. Documentation deliverables

All human-readable project documentation shall live under `/docs`. Do not scatter progress notes, build notes, decisions, API notes, ledger notes, testnet notes, acceptance logs, handoff prompts, or similar Markdown files across the repository. Documentation shall remain concise except for the setup guide, which shall be detailed enough for a developer with limited deployment experience to follow safely.

The following five files are the core project documentation and should remain the primary handoff set:

- `/docs/PRD.md`: the authoritative product and engineering requirements. It is a living specification and shall be kept internally coherent rather than accumulating change-history commentary.
- `/docs/SETUP.md`: the only intentionally comprehensive document. It shall provide step-by-step prerequisites, Supabase PostgreSQL setup, portable PostgreSQL configuration, migrations/seeds, environment variables, Vercel project setup, GitHub Actions CI/CD, preview/production deployment, auth, scheduler, signer isolation, chain/token verification, gas funding, key rotation, backup/restore, troubleshooting, and quota/plan checks needed to get the hosted site running. It shall be understandable to a developer new to the project.
- `/docs/HOW-IT-WORKS.md`: concise technical explanation of system architecture, module boundaries, API conventions, data model, manifest/configuration, ledger posting model, queue/priority/bootstrap mechanics, identity/security model, jobs, payout lifecycle, provider adapters, simulation/testnet behavior, and operational contracts. Do not duplicate setup steps or progress reporting here.
- `/docs/PROJECT-STATUS_vN.md`: the primary source for implementation progress and repository state. The visible `_vN` filename suffix is the primary iteration version. It shall contain completed/incomplete work, known defects, repository/build/deployment issues, validation actually performed and results, blockers, intentional deferrals, the weighted M0–M8 Phase One progress calculation, overall completion percentage, percentage remaining to 100%, and the exact recommended next work. The baseline is `_v0`; each completed iteration normally advances the current filename to `_v1`, `_v2`, and so on.
- `/docs/LLM-HANDOVER_vN.md`: the self-contained prompt for the next implementation LLM. Its visible `_vN` filename suffix is the primary iteration version. At the end of every completed development iteration its contents shall be replaced with a new self-contained prompt reflecting the exact current repository state and next work, and the filename normally advances to the next `_vN`. Matching the status/handover suffixes is preferred for easy pairing, but a mismatch must not block CI or deployment.

Avoid adding other project Markdown documents unless they materially improve the project. Generated API/schema references should normally be generated on demand or represented as sections in `HOW-IT-WORKS.md`. Additional Markdown files, nested documentation, or root-level Markdown should produce guidance/warnings rather than CI failure. Repository configuration, licenses, machine-readable manifests, workflows, and source-code files are not considered project documentation for this rule.

Every developer or LLM working on the repository should preserve these five core documents as the primary handoff structure. When implementation work changes behavior, update the PRD only when requirements change, update `HOW-IT-WORKS.md` when technical behavior changes, update `SETUP.md` when developer/deployment steps change, always update `PROJECT-STATUS_vN.md` with verified state/progress, and always replace `LLM-HANDOVER_vN.md` with the next self-contained continuation prompt before handing off. Extra documentation may be added when genuinely useful and must not fail CI solely because it exists.

In-app searchable help shall cover every exposed error and enabled asset. Disabled currency-specific navigation shall be hidden; historical transaction help remains reachable via a general archived-asset explanation.

## §28. Project-specific anti-patterns

Never derive actual payment selection from displayed position when priority applies. Never match a payment by amount alone, trust a client success result, share liquidity between asset ledgers, or include GIV/testnet in production totals. Never grant queue rights before accepted confirmation, allocate a receiver beyond its target, or remove unpaid liabilities during cycle/account deletion. Never count allocated funds as received gifts. Never lose the internal audit trail of queue adjustments or reprice an active queue. Never read/renumber millions of queue rows per payment. Never retry an ambiguous send with a fresh transaction. Never deploy signer secrets in browser/API code, use floats for money, request unlimited allowances, or assume the 1% reserve can pay every network fee. Never label free infrastructure as zero gas cost or proven million-user capacity.

## §29. Open questions with binding defaults

These defaults shall unblock implementation; missing provider credentials disable only their associated integrations.

| Question | Default assumed / override | Revisit trigger |
|---|---|---|
| Product name versus filename? | Gifters World; `product_content` | Owner changes branding |
| Primary geography? | Nigeria for usability/bandwidth assumptions; English/French supported; no test-country restriction | Owner supplies a different target market |
| What does Expected calculate? | Receipt target × receiver share of the plan amount; future receipts are not spendable balances | Changes to price, split, or target |
| What happens without an eligible referrer? | Referral share to reserve; split snapshot | Before owner changes prospective economics |
| Withdrawal asset? | Receiver/referrer request original-asset/network withdrawals and approve fees; no automatic USDT conversion | Owner separately authorizes conversion scope |
| Does most recently completed plan stay prohibited? | Only its elapsed cooldown applies | Owner changes prospective cooldown policy |
| Exactly $100 points band? | Upper band | `points_rules` change |
| How are native asset prices handled? | Freeze activation price until queue drains | New pricing model with explicit receipt rules |
| Which JAGA token? | Disabled until owner supplies verified BNB-chain contract/decimals | Registry verification milestone |
| What if gas exceeds reserve? | Pause affected checkout/sending; preserve liabilities | Gas prefunding and fee-policy review |
| What happens if participation stops? | Existing cycles wait without guaranteed completion | Owner redesigns funding source/model |
| Can zero-cost support the configured workload? | Use the specified free profile and measure quotas, execution time, signer runs, and recovery | Observed host limits or unmet performance budgets |

## §30. Crypto and blockchain

### §30.1 Scope and registry

In scope: wallet-approved incoming transfers, independent confirmation, custody-backed outgoing allocations, chain monitoring, refunds/exceptions, and admin manual treasury sweeps. Out of scope: platform smart-contract deployment, NFTs, trading, bridging, swaps, user token allowance collection, or automatic multi-chain conversion. Every operation inherits §8 ledger/idempotency and §11 job rules.

| Asset key | Mainnet chain | Kind / base-unit decimals | Gas asset / initial confirmation policy |
|---|---|---|---|
| `eth` | Ethereum, chain ID 1 | Native / 18 | ETH / finalized-block signal |
| `usdt_tron` | TRON mainnet | Contract token / verified registry decimals | TRX / solidified transaction plus success/event verification |
| `bnb` | BNB Smart Chain, chain ID 56 | Native / 18 | BNB / finalized signal if supported, otherwise verified registry depth |
| `sol` | Solana mainnet-beta | Native / 9 | SOL / finalized commitment |
| `usdt_bnb` | BNB Smart Chain, chain ID 56 | Contract token / verified registry decimals | BNB / same finality policy as chain |
| `usdt_sol` | Solana mainnet-beta | SPL token / verified mint decimals | SOL / finalized commitment and mint/account validation |
| `jaga_bnb` | BNB Smart Chain, chain ID 56 | Owner-supplied contract / verified decimals | BNB / same finality policy as chain |
| `giv` | Simulation namespace | Internal units / 2 | None / transactional simulator confirmation |

USDT-labelled assets on different chains shall remain distinct registry entries; bridge/issuer provenance shall be shown in help after verification. Do not infer authenticity from ticker/symbol. Native-token precision above is a protocol property; token contract/mint, decimals, dust behavior, issuer provenance, testnet chain IDs, and fallback finality depth shall be verified against official network/token sources at setup and pinned with source/date in the deployment registry. Until verified, asset enablement shall fail closed. No dummy contract shall be used on mainnet.

Alpha shall use GIV simulation first, then one verified testnet chain with manual outgoing-wallet confirmation. Beta shall use testnets and scheduled signer, require `BETA_STABLE_DAYS=14` consecutive days with no unexplained ledger differences, no unresolved stuck transfers, and proven external alerts. Technical acceptance shall include recovery (§26) and configured signing caps; extended monitoring shall use `MAINNET_OBSERVATION_DAYS=14` at initial caps. These duration constants are release policy, not a requirement that coding wait fourteen days before simulation works. 

### §30.2 Adapter, RPC, and matching

Chain adapter shall implement `validateAddress`, `normalizeAddress`, `verifyOwnershipProof`, `getBalance`, `verifyTransfer`, `estimateFee`, `buildTransfer`, `broadcastSigned`, `getTransactionStatus`, `getFinality`, and `currentBlockHeight`. Contract/mint matching shall be server registry-driven; store chain+environment+hash+transfer index. Derive watched treasury addresses from configured verified wallets, not arbitrary client addresses. Never use balances as sole transfer proof.

Each live chain shall have two independently configured RPC endpoints. Failover shall occur on timeout/transient error; contradictory observations shall hold finality pending, not select the convenient answer. Cache block height/confirmation reads using `RPC_HEIGHT_CACHE_SECONDS=5`, balance reads with `RPC_BALANCE_CACHE_SECONDS=30`. These release constants govern adapter batching. Server throttle/timeout shall follow `crypto_monitor_policy`, lowered to a provider's documented quota at setup. Public RPC shall be last resort, warning in logs and alert after the named public-RPC window. Use HTTP polling; no blockchain WebSocket subscriptions in MVP.

### §30.3 Signing, gas, and transaction recovery

Scheduled signer shall run outside API request paths. Passphrase-encrypted key material shall be stored separately from its decryption secret; decrypt only in the signer process. For managed production, owner shall provision stronger custody if the free profile cannot meet the required isolation/recovery. Every signer shall verify environment, approved obligation, destination snapshot, maximum per-send/daily limits (daily spend reservations keyed to the UTC signing date and treasury/asset), available asset balance, and native gas reserve. Signer shall refuse mainnet when simulation/testnet mode is active.

EVM nonce shall use a DB-locked counter reconciled on startup; persist signed payload before broadcast. After named stuck-block window, replace with the same nonce and intent at a higher bounded fee, preserving attempt lineage. Solana expiry shall require on-chain success/expiry resolution before a new blockhash transfer; TRON expiry shall likewise require verified nonsettlement before rebuilding. A resend shall never create a second entitlement. After replacement-attempt cap, retain held obligation and alert exception. No swaps or value-extraction-sensitive transactions exist; public mempool is default, and specialized MEV routing is out of scope.

Display validated network addresses in monospace with chain-appropriate checksum; abbreviate no more than first six/last four characters and provide full copy/confirmation view. Link chain explorer from an allowlisted registry. Manual sweeps shall never reduce treasury below beneficiary liabilities and required native gas; above-cap balance shall alert admin, not automatically move customer funds into a developer wallet.

### §30.4 Testnet guide requirements

Provide separate DB/registry namespaces and treasury wallets for simulation, testnet, and mainnet. Use Ethereum Sepolia, BNB testnet, Solana devnet, and a verified supported TRON test network with separate registry entries. A mainnet USDT/JAGA contract shall not be copied into a testnet registry. Where official token deployments are unavailable, admin shall configure an existing documented test token or a clearly labelled mock token; mock deployment is optional tooling outside the production app, not a mandatory platform contract.

Every simulated test account shall receive 5,000 GIV once after simulated consent via `GIV_GRANT`; display no redemption/export-to-chain action. Seed bulk accounts within batch cap. Simulator shall expose successful/failed/duplicate/late/reorg incoming events, missing wallets, rejected/stuck payout, scheduler delay, and concurrent admission. Admin diagnostics and internal records shall identify the simulation environment; ordinary prototype cards and fixture ticker shall receive no additional per-item demo labels. Simulated receipts may be previewed, downloaded, and shared using the same controls, with their actual asset and network shown. Real networks shall still require native gas even for token transfers; faucets shall be documented with current official links at setup.

### §30.5 Deployment profile, Vercel CI/CD, and bounded-cost evidence

Default stack: TypeScript domain/services, a responsive Next.js App Router web/PWA using React, native Next.js Node.js Route Handlers on Vercel for the web/API runtime, Supabase PostgreSQL as the primary hosted database, and a separately isolated scheduled signer/monitor workload. The application shall remain portable to compatible PostgreSQL hosts and compatible Node/container execution. Vercel functions shall never receive signer decryption secrets or perform a large signing batch.

GitHub Actions shall be the authoritative CI/CD path for Vercel deployment. Pull requests and non-production branches shall run validation before any preview deployment. Production deployment shall occur from the approved production branch only after required checks pass. The workflow shall use Vercel's supported CLI/build-output flow or equivalent official API: retrieve the linked project configuration with protected credentials, build in CI, and deploy the prebuilt output. Vercel's automatic Git deployment shall not create a second independent production path; configure the project so the GitHub Actions workflow is the controlled deployment route. Deployment credentials such as `VERCEL_TOKEN`, project ID, and organization/team ID shall be GitHub/Vercel secrets and shall never enter repository files or client bundles. Deployments shall remain off until the repository variable `ENABLE_VERCEL_DEPLOYMENTS=true` and the protected `preview`/`production` environments are configured. Enabled same-repository PRs may deploy previews after checks and environment review; forks run checks only. Approved `main` pushes deploy production. Preview databases shall remain simulation-only and separate from real-money data.

Deployment binding shall verify a fresh owner-written challenge through the restricted runtime connection; backup-cloned namespace IDs alone shall not prove that the two URLs reach the same database.

Supabase is used as PostgreSQL hosting, not as an architectural requirement for application services. The primary runtime connection from Vercel/serverless functions shall use Supabase's supported transaction-pooler connection for short-lived serverless workloads. Prepared statements/session features incompatible with transaction pooling shall be disabled or avoided on that path. Migrations, `pg_dump`/restore, and administrative database operations shall use the appropriate direct or session connection. The same Drizzle-backed database module shall support Supabase, Neon, local PostgreSQL, and generic compatible PostgreSQL by configuration without changing domain code. Supabase Auth, Realtime, Storage, Edge Functions, and Data API shall remain unused unless separately specified by a product requirement.

**Supabase public-schema GRANT requirement.** Every migration that creates a table in `public` shall include the required role grants in that same migration. Supabase's current Data API behavior requires a new public table to receive an explicit `GRANT` before the Data API can access it; a missing grant returns permission denied and identifies the required statement. Grants shall follow least privilege and shall never be broader than the table's RLS/data-exposure policy. A typical role form is:

```sql
grant select
on public.your_table
to anon;

grant select, insert, update, delete
on public.your_table
to authenticated;

grant select, insert, update, delete
on public.your_table
to service_role;
```

Do not mechanically grant `anon` or `authenticated` access to financial, identity, audit, manifest-private, signer, or administrative tables. Public catalog/help tables may receive the minimum public read grants. Sensitive application tables shall normally grant only the server role until RLS and an intentional Data API contract exist. To preserve compatibility with non-Supabase PostgreSQL hosts, migrations shall conditionally apply Supabase-specific grants only when the relevant roles exist; absence of those roles on local, Neon, or generic PostgreSQL shall not make the migration fail. Creating a table without its required grant classification is a migration-review failure.

| Component | Prototype default | Failure/override path |
|---|---|---|
| Web/PWA and lightweight API | Vercel deployment produced by GitHub Actions CI | If runtime, bundle, plan, or commercial-use constraints are unsuitable, use a compatible Node/container host without changing domain modules |
| Database | Supabase PostgreSQL | Neon, local PostgreSQL, or another compatible PostgreSQL host through `DB_PROVIDER` |
| Database connection from Vercel | Supabase shared transaction pooler using standard PostgreSQL client | Direct/session connection only where the workload requires it; preserve portability and serverless connection limits |
| Redis/cache | Upstash Redis REST, used sparingly | `ioredis` or compatible Redis through `CACHE_PROVIDER`; bounded tooling may use process memory; PostgreSQL remains authoritative |
| CI/CD | GitHub Actions validates, builds, and deploys to Vercel | Failed checks block deployment; manual emergency deployment requires recorded owner authorization and later reconciliation in `PROJECT-STATUS_vN.md` |
| Signer/periodic monitor | Separate scheduled GitHub Actions workflow with encrypted key and separate secret scope | Delays and quotas accepted visibly; heartbeat alerts; move to a paid isolated worker when required |
| RPC | Verified free tier per §16 and secondary endpoint | Server throttle; no provider reliability/volume guarantee |
| Rates | PriceFeed adapter with qualified access; manual signed rates for simulation | Verify terms/key/quota before enabling derived mainnet pricing |
| Alerts | Owner-configured external HTTPS endpoint | Must deliver a test alert before real sends |

Official infrastructure reference points checked on 11 October 2026: Vercel documents GitHub Actions as a supported custom CI/CD path using `vercel build` and `vercel deploy --prebuilt`; Vercel Hobby is a free plan subject to plan and usage terms and is not a blanket commercial-production guarantee; Supabase documents a Free plan with two free projects and a 500 MB database-size quota per project, and recommends transaction pooling for serverless connections; GitHub documents that scheduled workflows can be delayed and that inactive public-repository schedules can be disabled. These facts justify a bounded test/prototype profile only. Recheck current plan limits, commercial-use terms, card requirements, throttling, region availability, and exit route before each hosted release.

Sources: [Vercel GitHub deployment](https://vercel.com/docs/git/vercel-for-github), [Vercel CLI deployment](https://vercel.com/docs/cli/deploy), [Vercel Terms](https://vercel.com/legal/terms), [Supabase billing](https://supabase.com/docs/guides/platform/billing-on-supabase), [Supabase PostgreSQL connections](https://supabase.com/docs/guides/database/connecting-to-postgres), [GitHub workflow scheduling](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

At `payout_limits.interval_minutes=15`, one signer schedule requests 96 runs/day. At an assumed `SIGNER_ESTIMATED_RUN_MINUTES=2`, that is approximately 5,760 runner minutes per 30-day month, before other workflows. This is a planning calculation, not measured runtime or a statement that free/private quotas cover it. Monitor polling across several chains also keeps database compute active; measure combined demand before enabling them. Do not describe delayed batch sends as immediate.

## §31. Development process and build sequence

### §31.1 Principles

1. Build financial accounting and queue admission against GIV before presentation or live-provider integrations.
2. Load typed configuration from the first milestone; do not replace seed values with inline defaults.
3. Add one verified chain at a time behind interfaces.
4. Treat payout allocation, broadcast, and settlement as separate facts.
5. Owner directive (12 October 2026): continue implementing M0–M8 irrespective of M1/M2 or other prior milestone acceptance. Do not wait for acceptance or deferred hosted credentials before building later modules against explicit simulation/provider contracts. Prioritize missing functionality and finish Phase One implementation in as few substantial, verified iterations as practical.
6. Keep GIV simulation usable without owner credentials; require correct credentials and network configuration only for the selected live adapter.
7. Continue implementation toward 100% Phase One feature coverage, then diagnose and fix remaining defects. Track implementation completion separately from acceptance and release readiness; unrun hosted/live-provider checks must stay explicit and must never be reported as passed. Choose reasonable recommendations for routine unanswered questions; never invent credentials or acceptance evidence. Finish each iteration with updated status/handover documents, a pull request, and its merge after required checks pass. Record concrete blockers without claiming completion.

### §31.2 Milestones and gates

| Milestone / scope | Deliverable and observable exit criteria | Risk / gate |
|---|---|---|
| M0 — schema/config/runtime (§4–5, §16, §19, §21) | Hosted configuration validation and validated seeds succeed; Supabase and generic PostgreSQL configuration validate without domain-code changes; Drizzle schema covers every application table and application data access is ORM-first with documented raw-SQL exceptions only; Supabase table grants are migration-local and portable; Upstash is the default Redis adapter with `ioredis`/compatible alternatives and a bounded process-memory fallback; browser persistence is identity-scoped and purged on identity change; disabled mainnet shown; invalid split rejected; secret scan/typecheck/lint pass; DB rollback leaves no partial record | Medium: foundation affects all subsequent work. Acceptance remains a release dependency. |
| M1 — GIV money and queues (§8–11, §30.4) | Every test user gets one grant; first twenty gifts fill ten bootstrap entries without member-facing labels; gift 21 goes to first member; replay/concurrent attempts do not duplicate cycles/slots; journals balance; rejected sends preserve liabilities | High: accounting/order correctness. Its unaccepted checks do not block later implementation. |
| M2 — identity/permissions (§2, §6–7, §10) | Google or isolated dummy signup records pending consent; consent unlocks member features; duplicate attribution grants no second points; member cannot read another wallet; TOTP replay/stale step-up rejected; suspension preserves owed money | High: identity and privilege boundaries. Its unaccepted checks do not block later implementation. |
| M3 — first live testnet adapter (§8, §16, §30) | One chain completes verified inflow → internal credit → user-approved withdrawal → outgoing settlement/fee reconciliation; manual/daily business settlement cannot duplicate; wrong token/network/hash reuse rejected; user rejection admits nothing; signer crash resolves the same hash; external alert received | High: irreversible external transfers. Adapter activation still requires its own verified safety checks. |
| M4 — responsive product (§3, §12–14, §18, §22–23) | Mobile/desktop English/French flows work; themes and offline banner work; no offline money write; specified displayed queue positions and accurate available/held/withdrawn amounts shown; notification red-dot/read distinctions work; reduced motion and keyboard checkout pass | Medium: financial UX clarity. Implement now against current simulation APIs; record identity/financial acceptance separately. |
| M5 — admin/portability/recovery (§19–20, §26–27) | Admin edits audited/versioned; used economics edits blocked; priority updates internal serving order without changing displayed order; staging import failure leaves site unchanged; restored backup reconciles without replaying transfers; production reset is rejected | High: destructive/recovery controls. Acceptance remains required for release. |
| M6 — remaining supported adapters (§16, §30) | For each named asset/network, manual contract passes or asset remains disabled with explicit reason; token registry verified; all enabled assets handle missing wallets/gas; GIV remains isolated | High: differing network/token behavior. Implement adapters without waiting for prior acceptance; keep unverified assets disabled. |
| M7 — bounded prototype release (§24–25, §30.5) | Deployment meets measured quota/CPU/bundle budgets; acceptance checklist and setup docs complete; simulation installable and usable; source fixture ticker and specified copy appear; selected environment and adapter settings work | Medium: free-profile constraints. Release measurements and M8 acceptance remain separately tracked. |
| M8 — financial adapter acceptance (§8, §20–21, §26, §30) | Required credentials supplied; testnet monitoring evidence recorded; restored state reconciles committed sends; external alerts and signer isolation verified; configured caps enforced; no unresolved financial discrepancy | High: custody and recovery correctness. Failed adapter checks block that adapter’s acceptance, not GIV iterations. |

Verification shall use simulator actions, DB reconciliation output, UI observations, chain-explorer/RPC evidence, and recorded manual checklists; reading source code shall not be an exit criterion. Build automation shall provide compilation/lint/config checks only as specified in §24.

### §31.3 Owner inputs

Request inputs at the milestone that consumes them, not before simulation work can begin.

| Input | Needed at | What it blocks / safe default |
|---|---|---|
| Vercel project, Supabase PostgreSQL project, GitHub repository/Actions secrets, and deployment origin | M0/M7 hosted | Hosted deployment requires linked Vercel/Supabase configuration; compatible PostgreSQL portability remains an implementation contract |
| Upstash Redis project/REST credentials (or selected compatible Redis provider) | M0 hosted/M7 | Redis acceleration; PostgreSQL fallback keeps correctness if Redis is absent |
| Google OAuth client and approved callback origin | M2 | Real login; isolated simulator auth remains available |
| Platform/developer/marketing/bootstrap addresses in environment-secret storage by chain/environment | M3 | Affected testnet transfers/settlements; GIV uses internal accounts |
| RPC primary/secondary credentials and verified token registry | M3/M6 | Activation of affected asset |
| Encrypted signer material, separate decryption secret, gas funding | M3 | Automatic testnet sends; manual alpha can verify obligations |
| External alert destination | M3 | External alert acceptance |
| JAGA contract address, decimals, provenance, suitable test token | M6 | JAGA remains disabled |
| Price-feed credential/terms and approved fixed-price policy | M6/M7 | Derived-price activation; signed simulation rates default |
| Branding/theme revisions and French copy approval | M4/M7 | Seed content works; no effect on ledger |
| Selected recovery/custody configuration and operating budget | M8 | Verifying the chosen financial adapter and documenting free-profile limits |

Implementation priority follows M0 → M1 → M2 → M3 where technically useful, but acceptance is not a prerequisite for starting or continuing any M0–M8 implementation. Build product, administration, portability and remaining adapters without waiting for M1/M2 acceptance. Use fewer, larger iterations covering related missing requirements; avoid small progress-only passes. Preserve observable checks, immutable financial history, credential-free CI and per-iteration checked PR/merge. Hosted/live-chain evidence and actual adapter activation remain separate: never invent credentials/results or enable unsafe sends to raise completion. No parallel-agent work is required.

### §31.4 Completion criteria for MVP

The MVP is complete when a consented test member can connect or simulate a wallet, send a configured gift, see the specified queue display, receive and distinguish confirmed payouts, earn correct referral commission/points, request a quoted withdrawal, view notifications and history, and repeat an eligible cycle after cooldown; admin can operate plans/settings/moderation, reconcile liabilities, inspect exceptions, and export/restore without duplicating transactions. Every shipped feature shall be documented, localized, access-controlled, and observable.


## §32. Phase Two — transparent presentation and transition controls

### §32.1 Purpose, precedence, and limits

Phase Two shall add a transparent presentation profile without replacing the Phase One test iteration. It shall let admin publicly identify or disable platform-controlled receiver positions, publicly explain or disable administrative priority, and replace illustrative activity with verified events or turn activity off. Selecting the profile shall not reset accounts, wallets, plan prices, cycles, queue tickets, liabilities, or payout history.

When `deployment_profile=transparent`, this section shall override Phase One requirements concerning public copy (§1.2), bootstrap/priority frontend presentation (§3, §9.2, §18), activity statements and sharing (§22), and their configuration. All underlying financial invariants, user-requested same-asset withdrawals, business settlement, cooldowns, and points remain unchanged. Transparent-profile selection shall not enable mainnet, change custody, or certify the business model.

### §32.2 Configuration inventory and safe profile defaults

Introduce these keys only with the Phase Two implementation. Group is the corresponding admin settings location. The new enum values shall use §4.1. Admin shall stage changes, preview their impact, and commit with expected manifest version and fresh TOTP. The transparent preset shall be a single action; users shall not have to edit independent flags to obtain a coherent profile.

| Key | Type / scope | Phase One preserved default | Transparent preset | Group / enforcement |
|---|---|---|---|---|
| `feature_transparency` | boolean / public | false | true | Features; member navigation uses existing screens; admin controls visible with disabled indicator when off; dedicated nonadmin preview route returns 404; admin read-only preview exception |
| `deployment_profile` | enum / public | `test_iteration` | `transparent` | Release profiles; profile is independent of payment environment |
| `bootstrap_presentation` | enum / public | `legacy` | `labelled` | Queues; transparent permits only labelled/disabled |
| `priority_presentation` | enum / public | `legacy` | `disabled` | Queues; transparent permits only disclosed/disabled |
| `activity_presentation` | enum / public | `fixtures` | `verified` | Activity; transparent permits verified/labelled_demo/disabled; labelled_demo is excluded from a mainnet production surface |
| `transparency_content` | json / public | English/French defaults from §32.5 | Same defaults enabled | Content; copy, system-label text, risk explanation, fee explanation, and examples versioned as a set |
| `verified_activity_policy` | json / private | `{require_opt_in:true,max_records:50,max_age_hours:24,exclude_system:true,exclude_test:true}` | Same | Activity; event-time limit, consent, masking, and record cap; live financial activity requires final settlement |
| `queue_disclosure_policy` | json / public | `{show_system_ahead:true,show_priority_ahead:true,show_snapshot_time:true}` | Same | Queues; transparent mode shall not permit hiding an enabled exception or materially misleading rank |
| `public_receipt_policy` | json / public | `{show_asset:true,show_network:true,show_time:true,mask_identity:true,show_environment:true}` | Same | Shares; actual asset/network/environment cannot be disabled in transparent mode |
| `transparency_snapshot_policy` | json / private | `{preview_ttl_minutes:15,client_poll_seconds:60}` | Same | Release profiles; staged preview expiry and version propagation; checkout always uses authoritative DB version |
| `financial_readiness_record` | json / staff | `{status:not_reviewed,evidence_refs:[]}` | Unchanged | Release readiness; status uses ReadinessStatus (§4.1); references are safe document IDs only; confidential review documents, PII, credentials, and signed download links stay outside manifest |

`feature_bootstrap` and `feature_priority` shall continue to control feature availability. In transparent mode, turning either feature off shall produce the same transactional serving behaviour as its `disabled` presentation setting. An admin preview exception shall not bypass disabling, and a moderator shall have no exception. Generic `feature_activity=false` shall hide the activity component regardless of selected source. Batch APIs shall return empty activity; a dedicated disabled route shall return 404.

Invalid transparent configuration shall be rejected, not silently switched back to legacy. Turning off `feature_transparency` while the transparent profile is active shall be rejected. The transparent preset shall write the entire validated key set in one transaction; a partial failure leaves the prior profile intact. Mainnet configuration shall require the transparent profile, no fixture/demo activity source, and a reviewed financial-readiness record. This is a Phase Two acceptance rule, not an additional Phase One implementation requirement.

### §32.3 Bootstrap: publicly label or disable

**Labelled option.** Keep the existing allocation-to-balance mechanics and environment-secret settlement destination. Add “Platform-controlled position” wherever a queue entry is shown. If there is no individual-entry list, show aggregate disclosure in the gift card, checkout confirmation, active-cycle card, and How It Works. Explain the recipient category: developer/platform-designated wallet; do not imply these accounts paid to enter or represent ordinary participants. Do not expose private identities or configuration-secret values; use recipient role labels. Payment confirmation still shows its exact receiving address as transaction data (§19.3).

Example prepayment card: “This queue includes 10 platform-controlled receiver positions. Their allocations go to the developer/platform-designated wallet. Each needs two allocations.” Example active card: “10 receivers ahead, including 10 platform-controlled positions.” Show the actual remaining uncredited slot count when available; ten positions requiring two gifts each represent twenty allocations, not ten payments.

**Disabled option.** Stop creation of new bootstrap positions and stop assigning new slots to existing bootstrap entries. Preview counts of untouched positions, partly allocated positions, already-created obligations, and affected queue size. Remove unallocated positions from serving order in the committing transaction. For partly allocated entries, cancel only their unallocated slots; preserve assigned business balances and valid already-held settlement obligations; no automatic member payout is introduced. Add cancelled-slot accounting metadata instead of editing the historical allocation target or inventing receipts. Completed entries and historical payouts remain auditable and shall not be relabelled as member payments.

Disabling bootstrap shall not redirect an already-assigned payout or retroactively reduce a member liability. New plans shall follow the selected disabled setting instead of the Phase One bootstrap seed. When bootstrap is disabled and the queue is empty, `empty_queue_policy` governs startup under §8.2: business-credit mode assigns the first incoming receiver share to the disclosed developer/marketing role and admits the payer; block-checkout mode prevents admission. Transparent How It Works and checkout shall disclose the first-payment business allocation before wallet approval. It is not a member payout and shall not enter member social-proof totals.

### §32.4 Administrative priority: disclose or disable

**Disclosed option.** Keep the priority-serving lane. The primary frontend number shall be the actual serving rank. The immutable joining ticket may appear separately as “Joining number,” not “Current queue position.” Show “Administrative priority applies to this queue” on the prepayment card and checkout; include counts of priority positions ahead when relevant. Mark affected entries in a queue-detail view, if provided. Notify existing affected participants through an in-app queue-adjustment notification; full identities and private case reasons shall remain staff-only.

Example: “Joining number: 25. Current receiving position: 9. One administrative-priority receiver is ahead.” Snapshot date/revision shall accompany a cached position. A global “FIFO” statement shall be qualified wherever exceptions are enabled. Audit every change and show a user-safe explanation that order was adjusted, without presenting private staff notes publicly.

**Disabled option.** Disable new bump/create-priority actions server-side and remove unsatisfied priority overrides transactionally. Existing members return to serving order by their original admission ticket; do not assign new joining numbers. Preserve payouts already allocated/broadcast; do not claw back a settled payment or erase its record. Continue ordinary progression and retain historical audit evidence. Notify affected participants that subsequent allocations will follow admission order. Actual serving rank shall remain the displayed rank in transparent mode even when priority is disabled.

### §32.5 Accurate financial copy and receipts

Transparent content shall use: “Send a crypto gift, join its receiver queue, and become eligible for allocations from later participants.” Replace unconditional near-doubling language with a conditional example and the exact configured ratio. The brand/tagline can remain, accompanied in promotion/checkout by “Receipts depend on later participants and are not guaranteed. You may receive less than you send.”

Replace `Expected: $xx` with “Potential receipts: [asset amount] ([estimated USD]) — not guaranteed.” The calculation shall use the immutable plan amount, receiver split, and receipt target. At default settings, a $200-equivalent gift can earn two $170-equivalent internal credits, totalling $340 gross if both incoming gifts confirm; any requested withdrawal deducts its approved charges. Do not present $340 as the guaranteed net amount reaching an external wallet. Display sender-paid incoming gas, user-approved withdrawal costs, platform-reserve-paid business settlement fees, all allocation shares, and any account setup charge before approval; do not represent the potential difference as assured profit.

Show separate paid-to-platform, credited-to-receiver, available balance, held withdrawal, settled on-chain withdrawal, and outstanding conditional-slot totals. Do not imply that money for every future receipt is already held. Transaction links shall identify environment/network. Completed-cycle badges shall depend on the required confirmed internal receiver credits; external withdrawals remain independent. Clearly distinguish credited earnings from money already transferred to a wallet.

Receipt preview/download/sharing shall remain enabled. Show actual asset, network, timestamp, and environment; GIV and testnet receipts shall carry a clear non-real-money identifier within the image so they retain context outside the app. Production receipt shares shall use confirmed real transfers only, exclude refunds/purchases from earnings celebrations, and redact personal information. User-controlled sharing shall never publish automatically.

### §32.6 Activity: verified events, labelled examples, or disabled

**Verified option.** Generate entries from immutable eligible events: consented real signup/referral events, final incoming gift confirmation, receiver/referral earnings credits explicitly labelled as internal credits, and final receiver/referral withdrawal settlement. A submitted transaction is not a paid gift; an internal credit is not an on-chain payout. Exclude test/GIV, bootstrap, developer, marketing, and internal-transfer activity from member payout stories. Require member opt-in, mask identity, and offer withdrawal of publication consent. Removing a public activity entry shall not delete its financial evidence.

Format historical event value using its saved rate snapshot; if no trustworthy historical USD value exists, display asset amount or omit the event. Use elapsed time/date; do not endlessly replay old events as “just happened.” Fetch a bounded cached list; rotate locally, offer Pause, and honour reduced motion. A delayed or empty feed shall show no false substitute: hide it or show a neutral informational state. Preserve Appendix A for test-profile use only; never use its strings as a fallback verified source.

**Labelled-demo option.** In a simulation/testnet preview, retain the source examples under a persistent adjacent “Example activity — simulated” label. Downloadable demo material shall retain its environment context. This option shall not be permitted on a mainnet production surface.

**Disabled option.** Hide the ticker and stop its polls/timers. Do not replace it with invented counts or notifications. Real financial records and member histories continue normally.

Public social-proof counters shall be opt-in admin display controls using settled real-member gift/referral payouts, real consented accounts, historical exchange snapshots, and visible snapshot time. Exclude fixtures, bootstrap/system payouts, tests, pending accounts, duplicated transfers, and business revenue allocations. Reversals/reorgs shall produce corresponding aggregate corrections. Admin shall preview recomputed totals before publishing the first transparent snapshot.

### §32.7 Admin controls and public surfaces

Add Admin → Release profiles → Phase Two transparency. Show preset selection, each permitted alternative, a public-screen preview, current versus proposed config, data impact, and acceptance state. Public screens shall read one profile-versioned presentation DTO instead of independently interpreting uncoordinated flags. Existing plan cards, checkout, active-cycle dashboard, How It Works, wallet/receipt preview, and ticker shall all use that DTO in both languages.

Export manifest shall include profile and transparency settings. No credentials, platform-owned address values, PII, private thresholds, or staff evidence enter the public DTO. Admin-only record type, genuine serving rank, fixture source, cancelled bootstrap slots, and publication-consent status shall be preserved from Phase One data. Add nullable fields/backfill/constraints using §4 migration rules; label historical system entries according to their stored kind, not inferred usernames. If a legacy row cannot be classified reliably, exclude it from public activity/stats and send it to admin review.

### §32.8 Switching from the test iteration

1. Install Phase Two migrations/adapters and seed missing controls without overwriting current settings. Keep `deployment_profile=test_iteration` and all existing test behaviour unchanged.
2. Build a staged transparent preset. Admin chooses labelled/disabled bootstrap, disclosed/disabled priority, and verified/disabled production activity. Preview every affected public screen and financial/queue impact.
3. Preserve queue tickets, receipt allocations, payout attempts, permanent operation keys, wallet proofs, referrals, and user data. Reconcile source counters and resolve unknown system entries. Test records remain in their original environments; do not promote GIV/testnet balances to mainnet.
4. Pause new invoice creation during commit; continue confirming submitted transfers and settling valid accrued obligations. Mark unsubmitted old-profile invoices expired and require a fresh quote. Submitted invoices retain their original amounts/rights and obtain accurate updated presentation.
5. In a DB transaction, lock affected partitions/configuration, apply the selected settings and any unallocated-slot/priority cancellation, increment profile revision, and append audit/outbox notifications. Runtime failure or stale revision rolls back the entire switch.
6. Publish the new public manifest/DTO revision, invalidate old CDN/catalog caches, and refresh clients. Checkout shall load the authoritative profile/configuration revision; stale clients must refresh before creating/submitting a new payment. Serve updated localized terms and capture consent for material financial disclosure changes without withholding accrued payouts.
7. Verify actual serving rank, bootstrap disclosures or absence, correct activity source, accurate aggregates, and receipt environment labels. Reopen checkout for the configured environment after its relevant acceptance checks pass.

Switching a production mainnet deployment back to `test_iteration` shall be rejected server-side. Continue Phase One tests through a separate simulation/testnet deployment. A rollback of Phase Two software shall retain its safe settings and visible disclosures; if the old build cannot render them, pause new checkout and continue valid payout processing rather than restore misleading presentation. Disabling a public UI feature shall never cancel accrued monetary obligations.

### §32.9 Build sequence and observable acceptance

| Phase Two milestone | Scope / exit criteria | Risk / gate |
|---|---|---|
| P2.0 — settings/profile infrastructure | §32.2/§32.7: seeded controls preserve Phase One; staged preview works; invalid transparent combinations rejected; import/export retains settings | Medium; blocks P2.1 |
| P2.1 — bootstrap/priority options | §32.3–4: label/disable combinations work; displayed rank equals actual serving order; existing obligations retained; cancelled unallocated slots audited | High: affects receiver selection; blocks public-profile acceptance |
| P2.2 — copy/activity/sharing | §32.5–6: English/French screens agree; no fixtures in verified feed; empty feed honest; public totals exclude system/test data; share images retain network/environment | Medium; may follow P2.0 alongside P2.1 |
| P2.3 — transition/recovery | §32.8: one switch preserves IDs/balances; duplicate switch no-op; stale clients cannot create old-profile invoices; partially failed switch leaves original configuration intact; restore does not duplicate sends | High: money/state migration; requires P2.1–2 |
| P2.4 — readiness assessment | §32.10: technical/security/custody, business-model and jurisdiction evidence recorded; unresolved risks named; no automatic inference that transparent UI authorizes live operation | High: business and financial viability; requires P2.3 |

Use Phase One manual simulator/provider-contract procedures with added cases for all option combinations, partial allocations, pending wallets, in-flight invoices, cache propagation, client refresh, missing publication consent, and software rollback. No automated test suite becomes mandatory through this addition; meaningful financial regression automation is a recommended separately budgeted step before public real-money use. The no-tests instruction remains binding until the owner explicitly changes it.

### §32.10 Remaining live-readiness recommendations

The transparent profile resolves misleading presentation only when all public surfaces and historical data use it correctly. It does not fix the economic imbalance in §1.1: each paid gift introduces two conditional receipt slots while providing one receiver allocation. Removing bootstrap positions reduces initial system extraction; disabling priority restores normal order; neither makes all future receipts fundable. Do not guarantee 170% merely because the example calculation is correct.

Require a documented business-model assessment covering funding sources, participation stopping, incomplete cycles, refund/closure policy, platform revenue, and user loss exposure. A model whose receipts depend on continuing entrant payments may require redesign before public operation; labelling the mechanics is not proof of permissibility. Obtain jurisdiction-specific review for the intended countries and applicable financial, consumer, custody, and privacy requirements. Default financial-readiness status is `not_reviewed`; evidence, not a presentation switch, determines readiness.

Relevant regulator references: the [FTC’s explanation of chain-letter gifting games](https://consumer.ftc.gov/consumer-alerts/2020/05/game-chain-letter-scam) describes participant-funded receipt chains and the effects of recruitment stopping; [Investor.gov’s pyramid-scheme guidance](https://www.investor.gov/protect-your-investments/fraud/types-fraud/pyramid-schemes) identifies payment/recruitment-driven compensation risks. These are general US regulator guidance, not a determination of this product’s legal status in Nigeria or another jurisdiction.

Technical recommendations: verified asset registry and two RPCs per enabled chain; isolated signer and controlled custody; independently enforced per-send/daily limits; prefunded native gas; reconciliation and external alerts; durable backups of signed-send/idempotency records; restore evidence; incident/closure controls that stop new intake without erasing valid liabilities; measured capacity/cost limits. Review the Phase One operational defaults for real workload rather than assuming free infrastructure meets production needs.

Owner inputs at P2.4: target countries and review evidence; approved financial copy/terms; funding/refund/closure model; custody and recovery configuration; real operating/gas budget. The readiness record shall state rejected or unresolved cases and the associated disabled integration. Passing presentation acceptance shall be recorded separately from financial/legal readiness so neither can be mistaken for the other.


## Appendix A. Ordered activity statements

These are the supplied frontend activity fixtures. Store them as `activity_statements`; preserve their order and masking.

```text
ra*********lt just referred a new member
bo**z3 just received a gift worth $430
sk***********ue just sent a gift worth $95
mi****ol just received $4.5 referral commission
za******un just sent a gift worth $23
ja**lt just referred a new member
no***up just received a gift worth $65
lu*******ar just received $25 referral commission
de**********ng just sent a gift worth $140
ki***ar just received $43 referral commission
ac**ry just referred a new member
to****9k just received a gift worth $7
re*******79 just sent a gift worth $80
fo***o7 just received $7 referral commission
el****9m just referred a new member
ma**o9 just received a gift worth $37
ni*********8x just sent a gift worth $45
be*****zx just received $8 referral commission
gu**x9 just referred a new member
sa*******77 just received a gift worth $250
cr***99 just sent a gift worth $430
iv****7z just received $14 referral commission
an**********8x just referred a new member
da***zk just received a gift worth $8
to*********ax just sent a gift worth $23
le**xz just received $9.5 referral commission
ka****n8 just referred a new member
mi***24 just received a gift worth $95
al*******hn just sent a gift worth $65
ja*****5z just received $6.5 referral commission
ph***********2k just referred a new member
ow****r7 just received a gift worth $80
ty*******9p just sent a gift worth $250
qe**5m just received $3.7 referral commission
xo****ls just referred a new member
wy*****8n just received a gift worth $430
nb**********ck just sent a gift worth $7
rj***4t just received $8 referral commission
vm****6w just referred a new member
zk*******q2 just received a gift worth $45
ht***pu just sent a gift worth $37
gd**********x5 just received $14 referral commission
fl****3e just referred a new member
cy*****o4 just received a gift worth $23
sx**lv just sent a gift worth $95
wq*******r8 just received $43 referral commission
ep****2z just referred a new member
bm***9j just received a gift worth $140
dn**********k6 just sent a gift worth $65
uj*****p3 just received $9.5 referral commission
```

## §33. Phase One delivery and release boundary

Implement all M0–M8 irrespective of M1/M2 or earlier acceptance until100%, in as few substantial verified iterations as practical. Preserve this directive in every LLM handover. Implementation completion and hosted/live release acceptance are separate. Missing owner credentials, live wallet/provider checks and monitoring durations shall not stop independent coding. Never invent live evidence or enable external sends merely to meet a percentage.

The native contracts shall preserve immutable registry/sender/economic snapshots, canonical transfer membership, custody and beneficiary liabilities, durable signed bytes before broadcast, bounded same-nonce replacements and independently proved expiry. Failed/unknown sends shall preserve holds until positive resolution. Actual network/setup costs, refunds, contributed operating reserve, company sweeps and losses shall have separate, once-only journals. Reorg requires positive finalized block replacement; reconfirmed anchors become authoritative. A reviewed loss shall never debit an unrelated member or erase history.

Recovery shall register a dual-provider finalized checkpoint and immediately pause that asset. Scan bounded pages, distinguish unallocated custody from accepted gifts, reconcile all saved signed attempts and require agreeing finalized provider balances and sufficient beneficiary custody. A copied checkpoint cannot authorize another database binding. Unmatched refunds require original-sender wallet proof, preserve full principal and grant no account access or new destination. Unknown outflows require explicit audited company-loss review and a fresh reconciliation before resuming.

Idle signer health shall require a correctly scoped encrypted key and pinned RPC without allocating a nonce. Monitoring shall cover stale prices/heartbeat, custody/gas shortages, long holds and stuck attempts. Recurring conditions preserve delivery ordinals; initial, repeated and retried outbound alerts obey a shared daily attempt budget. Scheduled observations shall use one asset per bounded invocation.

Public statistics shall be cached, environment-specific and exclude system payments; GIV/testnet totals shall never become production totals. Activity rotation shall appear throughout the product, support pause, respect reduced motion and preserve the specified source statements. Staff portability requires current MFA, explicit selected fields, private encrypted full snapshots and bounded unverified staging; only the owner maintenance path may validate/restore into an empty inactive target. Neither upload nor restore starts workers or publishes a site.

CI shall enforce initial JavaScript, API trace and lazy-wallet bounds plus a deliberate10% regression baseline. Local trace bounds are not hosted artifact sizes, provider latency, mobile LCP or production capacity evidence. Record those unrun acceptance items separately.

The web and signer readiness gates remain disabled. Automatic approval review rejected changing them to true because it could enable real testnet operations. Keep that decision visible in status/handover; enabling them requires explicit approval of that concrete change in addition to owner registry, address/key, configuration fingerprint and authenticated alert-ACK release inputs. Mainnet remains prohibited.


## §34. Phase One bug audit, remediation and Phase Two continuation

Owner directive recorded **13 October 2026 at 09:31:02 PM UTC**: analyze the full Phase One codebase in three complementary passes, deliver docs/custom-bugs-report_v48.md and docs/custom-bugs-fix-plan_v48.md with a complete initial one-line numbered list followed by affected files and recommended fixes, qualitative current/projected ratings, and current date/time in 12-hour format in custom report headers/footers. Include defects, missing Phase One requirements and evidenced suboptimal code; distinguish confirmed source failures from conditional hardening. Exclude CRON frequency and test-only issues.

**Historical initial review boundary, satisfied by §34.1 approval:** “DO NOT FIX THE BUGS YET UNTIL I REVIEW THE PLAN!!!” This was the initial audit boundary. The owner subsequently authorized all fixes and autonomous continuation in §34.1; no further plan-review or milestone acceptance hold remains.

Round1 audit v29 identifies70 open findings (15 High,49 Medium,6 Low;43 defects,14 requirement gaps,10 hardening recommendations,3 maintenance issues); zero fixes applied. The prior v28 checklist of100% implementation is historical feature coverage, not current bug-free/100% PRD acceptance. Do not assign invented remediation percentages or silently retain an unconditional completion claim.

After plan approval, execute all in-scope fixes in substantial verified batches without waiting for M1/M2 or other completed-milestone acceptance. Preserve exact financial arithmetic, immutable evidence, globally bound idempotency, signed-send recovery and beneficiary rights. Resolve ordinary choices using the recommended plan; maintain a complete numbered tracker with actual verification and unresolved limitations.

Perform up to three bug-finding/fixing rounds. The three present analysis passes are one audit round. Re-audit after fixes for rounds2/3 if new bugs continue; a closing round with no new bugs may end early only when prior in-scope work is resolved. Never count a planned fix as completed or use “no new bugs” to excuse an old unresolved defect.

After this Phase One remediation exit, implement the whole §32 Phase Two sequence without waiting for milestone acceptance. Technical dependencies remain; no mainnet/live financial operation, gate bypass or secret/retained-history deletion is authorized by that continuation. Existing readiness approval decisions and hosted release evidence requirements remain binding.

Supabase's explicit Data API grant policy shall be addressed in the same creating migration for every new public table. Use deliberate least-privilege GRANT/REVOKE/RLS by resource classification; do not apply blanket anon/authenticated/service_role access to financial/signing data. Application access remains Drizzle/PostgreSQL, not an implied switch to browser Data API use.

Each implementation/documentation iteration remains a PR with BOTH exact-final-head push and pull-request CI success before merge; never direct-push main. Current status/handover are docs/PROJECT-STATUS_v48.md and docs/LLM-HANDOVER_v48.md.


### §34.1 Approved autonomous continuation — 13 October 2026 at 11:17:35 PM WAT

On 14 October 2026, after reviewing the specific P1-065 published-search/optional-pg_trgm recovery proposal and its restore compatibility risk, the owner explicitly instructed: **"approve this change and any other necessary change. dont stop, keep going."** Implement that approved proposal and other necessary remediation without repeating plan or milestone approval requests. Preserve archive authentication, original migration checksums, immutable financial evidence, and existing disabled financial/mainnet gates.

The owner has reviewed and approved the complete Round One plan. Fix all70 findings, perform the same full-codebase audit/plan/fix process for Rounds Two and Three, and continue further remediation if new/reopened bugs remain. Then implement every Phase Two milestone to complete technical implementation and perform final bug fixes before the deferred test phase. Do not wait for new plan or completed-milestone approval. Resolve routine questions using best recommendations; maximize useful verified scope per iteration. Maintain reports, plans, status and handovers. Create/merge each coherent PR after BOTH exact-final-head push and PR CI success. This approval supersedes the initial §34 plan-review hold, but preserves explicit financial readiness/mainnet restrictions and honest separately unrun hosted acceptance. Current status/handover filenames are PROJECT-STATUS_v48.md and LLM-HANDOVER_v48.md.


Bug reports and fix plans shall also have matching versioned filenames for every current iteration (initial remediation: custom-bugs-report_v48.md and custom-bugs-fix-plan_v48.md). Update status/handover/cross-links together; retain earlier evidence in Git history and do not leave stale current-file references.

## §34.2. Current remediation tracking

As of **14 October 2026 at 03:24:53 AM WAT**, v30/PR29 is merged after both exact-head CI events succeeded. V31 fixes recovery identity, transaction fee ownership, SOL fee attribution, positive expiry closure, fair signer dispatch and selected testnet deployment/seeding. One newly discovered backup-version defect, P1-071, is added to the complete tracker and fixed by checking applied migration names/checksums. Current accounting is33/71 implemented and locally verified;38 remain open. This is item accounting, not a weighted completion percentage. Phase Two remains pending. Keep all new/reopened findings in the versioned report/plan and continue without approval waits. Current documentation filenames are_v31; prior versions/evidence remain in Git history.

## §34.3. V32 operational/privacy remediation

As of **14 October 2026 at 04:33:09 AM WAT**, PR30 is merged after exact-head dual CI. V32 closes P1-026/027/029/030/031/032/033/034/035/036: bounded deletion-time message redaction and auth cleanup; one deadline-driven observation job; redacted operational metrics and fresh owner-measured provider quotas; immutable occurrence-bound alert bytes with critical priority and separate escalation step; request correlation and typed bilingual failure handling. Tracker:43/71 locally implemented/verified,28 open; all status/handover/bug report/plan filenames use_v32. Configured prototype diagnostics bound backlog/DLQ/daily alert sample thresholds to10000 and web lock thresholds to60000ms; measured vendor quotas remain owner-provided with24-hour freshness and current database binding. Missing hosted measurements never imply capacity. Financial gates remain disabled; Phase Two pending.

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

## §34.16 V45 common-cutoff recovery and transport contracts — 14 October 2026 at 02:58:13 PM WAT

New SOL/TRON recovery starts treat the requested through height as a minimum, capture a jointly observed finalized balance before scanning, and disclose/persist the actual immutable scan upper bound. Equal balances at different cutoffs are not proof. Re-verify the captured canonical block at completion and use its stored balance; do not sample a later live state. Retained runs without a witness require exact-cutoff evidence or remain held/unknown. Immutable evidence, restored-clone identity fences and disabled financial/mainnet gates remain mandatory. Critical JSON DTOs preserve exact amount strings and transaction ownership; client executable imports of server/DB/chain/signer services are prohibited. Current Round One accounting70/74 locally verified,4 open. Continue remaining remediation, fresh Rounds Two/Three and every Phase Two milestone without acceptance pauses.

## §34.17 V46 execution budgets — 14 October 2026 at 03:28:02 PM WAT

Runtime API requests have a50-second total work budget; ordinary transactions have a30-second callback budget that inherits request cancellation/time remaining. Deadline expiry rolls back through the standard driver transaction and blocks late SQL dispatch without destroying shared pools. Already-dispatched SQL remains under bounded statement/lock deadlines. Isolated signer runs stop claims/broadcasts at45 seconds or termination, cancel outbound work and drain child transactions/store resources under the configured shutdown budget. Preserve persisted signed intent and ambiguous-send recovery. Financial/mainnet gates remain disabled. Current Round One accounting71/74 locally verified,3 open; continue remaining remediation, fresh Rounds Two/Three, every Phase Two milestone and final fixes without approval waits.

## §34.18 Owner stop boundary — 14 October 2026 at 04:17:08 PM WAT

The owner supersedes continuous continuation beyond Round One: **finish every pending Round One finding, complete necessary documentation, create/merge verified PRs, report completion and halt.** Round Two bugfinding/fixing and Phase Two must await an explicit subsequent go-ahead while the owner refills credits. Continue the remaining Round One fixes without approval pauses. Preserve existing exact-head dual CI, archive/history and disabled financial/mainnet restrictions.


## 34.19 Transactional counters and first-round stop boundary

Updated: **14 October 2026 at 04:41:01 PM WAT**. PR45 is merged after both exact-head CI events succeeded. P1-039 is implemented in this batch: six protected derived tables maintain exact account/asset-purpose totals, native refund/settled-payout buckets and per-journal integrity evidence. A captured source high-water range and transactional new-write markers support at most100 source rows per maintenance transaction, prevent bootstrap overlap from double-counting and compact markers after sealing. Reads use exact source sums only while coverage is legitimately incomplete; invalid retained journal evidence pauses reads/diagnostics rather than silently repairing history. New writes update counters and audits atomically. Existing per-journal deferred validation, negative-user-payable/unallocated-source guards, source immutability, permanent business keys, signing/restore fences and both disabled financial gates remain intact.

Hot wallet/payout balances use protected account counters; signer custody and recovery balance comparisons use bounded asset/purpose counters. Native income/refund-hold summaries use immutable journal classifications. Reconciliation uses sealed journal evidence and account counters, retains independent queue/invoice/withdrawal/refund/reorg/recovery checks and its shared8-second/per-query1-second ceiling, and denies clean diagnostics before bootstrap completion. Independent primary-record checks and the cached public-statistics refresh retain their explicit deadlines; they are not replaced by self-comparisons of derived totals. No primary financial record, failed source, signed evidence or older archive was rewritten/deleted. An explicitly authorized fresh simulation reset would clear derived state together with source data; no retained source was reset.

Named isolated checks passed exact70-digit arithmetic,1-row overlapping low-ID backfill, replay, post-seal hold/settlement buckets, atomic rollback, original negative/unbalanced commit guards, service tamper denial and member ownership. Three concurrent writers committed36 balanced journals with36 inert replays while1-row backfill ran; every counter matched independent source sums, with zero retryable aborts. Earlier race fixtures are preserved: their manual240-step cap was too low because new UUID rows inside the captured range also consume bounded pages; the500-step procedure passed. Incomplete diagnostics and generated invalid derived evidence failed closed and rolled back. The retained isolated source sealed in bounded service steps and actual reconciliation reported complete/balanced/consistent/lineage-complete. Owner/model catalogs match848 columns, all checks and standalone indexes; the same22 SQL-only constraint triggers and2 deferred-FK timing differences remain explicitly inventoried. Archive/restore, required checks/build/budgets and both exact-head CI events must be recorded before merge.

Current Round One accounting after local verification:72/74 implemented,2 open: P1-009/P1-028. Round Two, Round Three and Phase Two have not started. Finish those two findings and all necessary verified PR merges, then report completion and HALT. Resume Round Two/Phase Two only after the owner's explicit go-ahead; this latest credit-refill stop directive overrides earlier autonomous continuation beyond Round One.


V47 final verification (14 October 2026 at 05:00:53 PM WAT): migrations096/097 applied forward-only in fresh gw_v47_final; migration097 gives deferred commit guards a private, ungranted account helper so temporary native/read scope restoration cannot reject a valid journal. Member/public read helpers still enforce ownership/environment; native portfolio/payout/recovery explicitly enter testnet read scope. Actual native summaries passed available5/held2/settled-net3/income10. A labelled synthetic asset/unapproved quoted refund passed available5/held6/income-held2/refund-held4/settled-net3/income10 with all generated entities/journals rolled back. The preserved original SOL source's restored-asset intake fence rejected a copied new obligation; that failed procedure/clone are retained, no gate or fence was bypassed and no original source was changed. Final-code concurrency proof passed36 committed journals/36 inert replays during1-row backfill with exact independent source congruence and zero retryable aborts. Final owner/model comparison matches92 tables/848 columns/274 checks/105 indexes and the same SQL-only exceptions;98 migrations. Signed encrypted counters-final_v47-r2.gwbackup includes79 retained inventories. All72 prior retained inventories match v45 exactly, except additive schema_migrations. Fresh exact restore targets gw_v47_restore_r2 and remains inactive/unpublished. Required check:all/build/bundle pass evidence is in the private v47 directory; local bounds homepage180.35KiB,API1.447MiB,clients0.661MiB. Exact-final-head push/PR CI and merge remain required. Finish P1-009/P1-028 next, then HALT at Round One completion for the owner's credit refill; do not begin Round Two/Phase Two.


V47 isolated signer capability correction (14 October 2026 at 05:04:25 PM WAT): migration098 exposes a read-only gw_signer/testnet aggregate for the closed beneficiary-liability purpose set. The isolated signer does not acquire service/read membership, direct counter access or write privileges. Actual wrapper/role checks match independent source sums and deny service/private helpers, unsupported purposes and service-role use of the signer capability. Source includes99 migrations; tables/columns/checks/indexes remain92/848/274/105. Final archive is counters-final_v47-r3.gwbackup with79 retained inventories, restored to inactive gw_v47_restore_r3; earlier intermediate archives/clones/procedure failures are preserved. Required final check:all, build, bundle bounds and exact-head dual CI must pass before merge. Round One still stops after P1-009/P1-028 and necessary PR merges; no Round Two or Phase Two work is authorized until the owner resumes.


## 34.20 Latest credit-refill stop boundary

The owner's latest credit-refill directive (14 October 2026 at 05:15:19 PM WAT) is to merge only the current P1-039 ledger-counter PR, then report its result and HALT. Do not start P1-009, P1-028, Round Two or Phase Two until the owner explicitly resumes. This supersedes the earlier request to finish every Round One finding before stopping. P1-009 (historical receiving-address monitoring) and P1-028 (retention/archival) remain OPEN. Round One is72/74 locally verified, with P1-039 awaiting the current exact-head dual CI and merge; Phase Two has not started.


## 34.21 Fresh-install migration consolidation

Updated: **15 October 2026 at 12:27:07 PM WAT**. The owner confirmed no migrations have been applied to the intended installation and requested one final-state migration. The99 active SQL files have been replaced by packages/db/src/migrations/000_initial_schema.sql. It creates the final schema directly, not concatenated upgrades, and records one validated body-checksum receipt. Direct SQL runs atomically; db:migrate uses the same receipt in its own transaction and skips matching history. Unknown/legacy histories and nonempty application schemas are rejected before installation. Do not apply this fresh-install baseline to a populated database or rewrite it after deployment; later changes need new forward migrations.

A new empty PostgreSQL reference applied all99 historical migrations solely to derive/verify final definitions. Baseline/direct/runner catalogs match all3523 schema/security entries, including column grants;92 tables/848 columns/274 checks/105 standalone indexes, the same final views/functions/triggers/policies and deferred timing. An independent target with broad browser/unknown-role default privileges matches the same final ACLs. The schema-free128-bit owner/runtime advisory-lock challenge replaces the deleted014 bootstrap dependency and retains restricted-runtime/ownership checks; empty/post-install checks pass, wrong database and owner-runtime checks fail, and no schema/locks remain after preflight. Mandatory initialization creates fresh identity rows and seals only the known-empty ledger; published test privacy notices remain. Application seeding is separate.

Named isolated verification covers direct/runner checksum parity and rerun, edited body/footer denial, nonempty-schema preservation, late-DDL rollback, legacy-history refusal, seed/runtime verification and encrypted79-inventory backup/exact restore. Existing failed fixtures, financial sources, archive packets/keys and signed evidence remain untouched. Older99-migration archives require their matching historical release (e6f7888034afae01d0c7803965f1c17889783171); the version guard is retained, not bypassed or re-signed. Required source checks/build/bundle and both exact-head CI events must pass before merge. Current evidence is private under /workspace/work/schema-consolidation-v48.

PR46 is merged at e6f7888034afae01d0c7803965f1c17889783171 after exact-head push38596587666 and pull_request38596599068 both succeeded for1f2ab151bca8c5f587e0fa73ed7718a29ebd7e36. Round One remains72/74; P1-009/P1-028 are OPEN. This task authorizes migration consolidation only. Finish its documentation and verified PR, then halt; do not resume those bugs, Round Two or Phase Two without the owner's explicit go-ahead. Both financial readiness gates remain false; no signing, broadcast, reset or broad deferred suite ran.


## V48 final isolated verification — 15 October 2026 at 12:42:45 PM WAT

The active migration directory contains exactly one405718-byte final-state SQL file. Final direct/runner/default-grant targets match all3523 reference schema/security entries and column grants. A fresh installation seeds and verifies through the restricted runtime. The final baseline passes actual60-digit journal/replay/counter reads, negative-commit rejection and runtime counter-tamper denial, with every generated financial row rolled back. Body/footer tampering, nonempty schemas, unknown histories, wrong databases and unsafe owner runtimes are rejected. Late DDL failure leaves no partial schema/history. All fresh advisory challenges leave no table or lock behind.

Encrypted initial-schema_v48-r2.gwbackup includes79 retained inventories. Exact restore passed into fresh inactive gw_v48_release_restore and gw_v48_release_restore_final, preserving schema/RLS/grants/financial/work history. Exports now retain deployment_binding_challenges schema while excluding only its ephemeral rows; preflight no longer creates that table. Restore rejects even an existing proof table as RECOVERY_TARGET_NOT_EMPTY. Initial intermediate failures/archives remain private and preserved; none is treated as final acceptance. The repository secret scan remains unchanged: the public checksum receipt uses two32-character SQL literals instead of weakening the generic64-hex secret heuristic.

Required check:all and production build passed; local bounds homepage180.35KiB/200,API1.394MiB/3,clients0.661MiB/2. Final exact-head push/PR CI and merge remain required. Hosted provider acceptance and broad deferred tests are unrun. This consolidation adds no bugfix-round or Phase Two progress: Round One72/74, P1-009/P1-028 open, financial gates false. Current branch feat/consolidated-initial-schema; finish this PR and halt.
