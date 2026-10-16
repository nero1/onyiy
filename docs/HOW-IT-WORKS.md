# How Gifters World works

For installation, use [SETUP](SETUP.md). Requirements live in [PRD](PRD.md); progress belongs in [current status](PROJECT-STATUS_v49.md).

## Main parts

| Part | Job | Location |
|---|---|---|
| Next.js / React | Pages, PWA and server API handlers | `app/`, `components/`, `lib/` |
| Application services | Check permissions and coordinate transactions | `server/` |
| Domain rules | Exact amounts, splits and business rules | `packages/domain/` |
| Configuration | Validate settings and provider choices | `packages/config/` |
| PostgreSQL / Drizzle | Durable application and financial records | `packages/db/` |
| Cache adapters | Bound repeated public reads; never authorize money | `packages/cache/` |
| Chain adapters | Validate wallets/transfers and read network evidence | `packages/chains/` |
| Separate workers | Scheduled processing and isolated signer | `workers/` |
| GitHub Actions | Checks and controlled Vercel deployment | `.github/workflows/` |

Supabase hosts PostgreSQL; the app does not depend on Supabase Auth, Storage, Realtime or browser Data API access. Vercel never receives signer decryption keys. PostgreSQL/Redis/Node-compatible alternatives remain behind provider boundaries.

## Database and access

- The fresh installer is [000_initial_schema.sql](../packages/db/src/migrations/000_initial_schema.sql). It creates final objects directly: **92 tables, 848 columns, 274 CHECK constraints and 105 standalone indexes**, plus views, functions, triggers, row security and grants.
- The file installs atomically and records its checksum. It rejects a nonempty application schema. Keep it unchanged after installation; use forward migrations for later changes.
- Application queries use Drizzle. PostgreSQL-specific locking, security, counters, schema work and recovery use reviewed SQL.
- `gw_runtime` is a restricted login. Within each transaction it uses `gw_read` for allowed reads or `gw_service` for authorized writes. Actor, environment, role and search path reset when the transaction ends.
- Row-level security restricts user-owned records. Staff privileges are checked against the current database, not a token's old role. Browser/Data API roles receive no application-table access.
- Every new public table needs explicit grant/revoke classification in the same migration. Never fix permission errors by granting all tables to `anon`, `authenticated` or `service_role`.
- The owner connection stays outside Vercel. Binding checks use two fresh owner-held transaction locks observed through the runtime connection; no bootstrap table or permanent proof is created. Copied database IDs cannot satisfy the fresh check.
- Hosted connections verify TLS certificates and hostnames. The app uses a small transaction-pooler connection; owner administration uses direct/session connections.
- [The reviewed schema contract](../packages/db/schema-contract_v48.json) pins declaration/migration hashes and inventories 22 SQL-only constraint triggers and two deferred-FK timing differences. Moving the file does not change its evidence or hashes.

## Settings and API responses

- `xmanifest.json` supplies starting defaults. Seeding adds missing values and preserves existing edits. The database is the authority for later writes.
- Settings have public, private or staff scope. A scope is not a secret store: keys, private addresses and credentials stay in provider secret settings.
- Invalid financial/security settings stop affected actions. Safe public defaults may keep informational pages available during a database outage; they cannot approve a transaction.
- `/manifest` and public catalog/help return only allowed public fields. Public cache freshness, ETags and invalidation are bounded; old requests cannot replace newer state. Private responses use `no-store`.
- Financial JSON uses exact amount strings and explicit date/null forms. Client code cannot import executable server, DB, chain or signer modules.
- Errors use safe bilingual messages and request IDs. Raw credentials, factors, signed bytes and private responses never belong in logs.

## Identity and browser data

- Simulation accounts are demo identities. Google verifies real sign-in; app-issued sessions still enforce consent, account status and permissions.
- Session refresh is coordinated across tabs. Responses from an old account/session are discarded.
- Sensitive actions require fresh authentication; staff settings and protected actions also require current two-factor verification. One-use recovery codes and TOTP replay steps are retained securely.
- Wallet ownership proofs bind the domain, account, address, network, environment, purpose, nonce and expiry. A deposit is not permission to change a payout address.
- Browser caches separate public data from account/session data. Logout and identity changes clear private cached state. Tokens, factors, private keys and pending financial submissions are never stored there.
- Visible online member screens share polling and coalesce requests. Leaving a route or signing out releases listeners and timers.

## Gifts, queues and priority

1. A simulated member consents and receives **5,000 GIV once**. GIV cannot be redeemed on a blockchain.
2. Checkout freezes the plan, price, asset, network, sender and receiving terms in an invoice.
3. The server verifies the payment independently. A wallet popup or client success flag is insufficient.
4. Admission, balanced journal entries, allocations and durable jobs commit together. Repeating the same operation cannot create a second benefit.
5. The receiver share credits its beneficiary's balance. Other shares follow the configured split. **Allocated, available, sent and settled are different states.**
6. An eligible member can withdraw their own asset after accepting its exact fee quote. Rejection or uncertain sending preserves recoverable liabilities.

Each queue partitions its own ordering. Sparse counters compute ranks without renumbering every entry. Admission serializes inside the partition; high traffic still needs measured capacity.

Phase One keeps display order separate from actual serving order. Administrative bumps affect serving priority while preserving joining/display sequence and an internal audit. Bootstrap positions are platform-controlled. Their allocations are business liabilities, never fabricated member payments. See PRD §9 for the current behavior and §32 for the **unimplemented** transparent replacement.

## Ledger and incoming-payment safety

- Amounts are integers in the asset's smallest unit. Every journal balances; posted financial history is immutable.
- Unique operation keys prevent duplicate grants, credits, fees, payouts and refunds. Corrections require new compensating entries.
- Protected derived counters update atomically with source journals. Bounded bootstrap/replay handling prevents double counting; unsealed/invalid evidence cannot report clean reconciliation.
- Unmatched, late, underpaid, overpaid or invalid transfers retain their own custody/refund state. They do not silently grant a cycle or disappear.
- Refunds prove the original sender; they do not grant account access or allow a new arbitrary destination.
- Missing wallets, suspended users, failed sends and account deletion do not erase beneficiary liabilities.
- Reorg handling needs positive canonical replacement evidence and preserves previous anchors and resulting review records.

## Native chains and signed attempts

Native flows are staged behind **disabled web and signer financial-readiness gates**. Mainnet is prohibited. Simulation success is not live-chain acceptance.

- Asset registries pin network, contract/mint, decimals, address versions, finality and fee/gas policy. Two approved RPC sources must agree where required.
- The signer is isolated from web requests. It checks approved obligation, destination, environment, per-send/daily caps, custody and gas before signing.
- Persist signed bytes before broadcast. After an uncertain broadcast, resolve that hash before constructing another transfer.
- EVM replacements keep nonce and intent. Solana/TRON rebuilding needs positive expiry/nonsettlement evidence. All attempts retain their lineage.
- Actual network fees, account-creation costs, reserve contributions, refunds and company losses have separate once-only accounting.
- Recovery pauses the asset, binds a checkpoint to the actual database, scans bounded pages and reconciles saved attempts and beneficiary custody.
- SOL/TRON balance witnesses freeze a common finalized cutoff. A later balance cannot prove that earlier cutoff; contradictory/unknown evidence remains held for review.
- **Still open:** complete monitoring of historical receiving addresses (P1-009).

## Jobs, cache and operational limits

- Durable notification, observation and payout jobs use leases, retries and replay protection. One long-lived observation retains its identity rather than creating endless jobs.
- Scheduler requests bind body, environment, timestamp and nonce to a private authentication key. Replays, stale requests and wrong environments are rejected.
- Alerts retain immutable occurrence payloads and retry/escalation order. Critical alerts get priority within a shared daily attempt budget.
- Database queues, statements, requests and outbound RPC/cache calls have explicit deadlines and byte/row limits. Recovery and diagnostics cannot hide unbounded history scans behind a small page size.
- Redis is a bounded cache, not the financial source of truth. Unknown/missing provider configuration fails explicitly. Selected hosted adapters need their own expiry, increment, outage and error-response observations.
- Expired session/rate records have bounded cleanup. Account deletion redacts private message content while preserving required financial/audit history.
- **Still open:** complete notification/job and financial/audit retention/archival (P1-028). Existing cleanup is not full retention compliance.

## Help, exports and recovery

- Published help uses locale-specific title/body full-text search and title-typo fallback. Results are capped and drafts excluded. Offline search is clearly limited to saved articles.
- Public pages carry locale/canonical metadata; private routes are excluded from indexing. English/French text and accessibility checks remain required.
- Member JSON/CSV exports fix a creation cutoff. Later records are excluded, but mutable values are captured during bounded parts: **this is not one global point-in-time snapshot**. Export metadata discloses the capture interval; spreadsheet-leading values are escaped.
- Full application archives encrypt native PostgreSQL dumps with AES-256-GCM and authenticate their inventory separately. Dump and row inventory share one consistent read snapshot.
- Archives retain financial/work history, protected counters, provider identities, encrypted factors and replay evidence. Session/refresh/login-flow/rate/binding-challenge rows are excluded; their schema/security still enter fingerprints.
- Restore verifies signatures, checksums, compatible versions, approved extensions and exact rows/schema/security. It requires a fresh empty inactive simulation target, disabled signing and absent scheduler keys; it never merges into an occupied database or automatically resumes jobs.
- Closed extension dependencies allow `pgcrypto` 1.3 and optional `pg_trgm` 1.6 in their approved schemas. Unknown names, versions, duplicates or incompatible installed extensions are rejected.
- Vercel full-site archive transfer is operator-only; its UI does not offer a complete upload/download/restore path. Optional persistent-host staging is separate, bounded and encrypted. Failed/quarantined evidence is retained for review.
- Keep MFA and archive keys separately. Old 99-migration archives require release `e6f7888034afae01d0c7803965f1c17889783171`; the fresh installer does not convert their signed histories.

## Verification and documentation

- CI checks types, lint/import boundaries, translations, settings, schema/grants, documentation, secrets, builds and bundle budgets. It does not claim hosted acceptance.
- Relevant named manual checks cover rollback/replay, concurrent admission, missing-wallet liabilities, rejected withdrawals, account isolation, cache expiry/outage, signing recovery and exact restore. Use isolated data and preserve failed evidence. Never reset a shared source to repeat a check.
- Hosted Google, Upstash, RPC, alerts, mobile performance and release readiness require observations on the selected services. Health/compilation alone do not satisfy them.
- Keep **five core docs** plus the two explicitly requested bug trackers. Use clear lists/tables and short explanations; update current facts instead of appending repeated history. Only add a document when explicitly requested or essential. Prior versions remain in Git.
- All application work remains paused. [LLM handover](LLM-HANDOVER_v49.md) records the exact continuation boundary.
