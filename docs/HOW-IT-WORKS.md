# How Gifters World works

For installation, use [SETUP](SETUP.md). Requirements live in [PRD](PRD.md); progress belongs in [current status](PROJECT-STATUS_v101.md).

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

## Shared hosting and payment modes

- One Supabase project/database, Upstash database and Vercel project can serve the main and trusted preview sites. They share users, configuration, history and quotas; no independent copy is created.
- `APP_ENV=simulation|testnet` chooses payment behavior. `runtimeProviders()` supplies matching defaults, including Google/Turnstile for testnet. Explicit incompatible overrides fail; credentials stay in secret settings.
- Vercel's Preview/Production chooses the website build/domain. It does not activate real money. Health reports both stage and payment mode.
- CI retrieves Preview settings for the actual branch and supplies GitHub branch metadata when uploading prebuilt output, so branch-specific settings/domains are associated correctly. Hosted association remains a provider acceptance check.
- Owner initialization explicitly runs as GitHub tooling (`VERCEL=0` for that step only); real Vercel handlers still reject owner credentials. Hosted initialization checks the manually installed SQL receipts before seeding; it never applies SQL. One deployment queue serializes preview/main initialization.
- Promotion registers the existing testnet namespace. Simulation transactions hold a shared transaction fence; initialization takes its exclusive counterpart. A locked configuration row also rejects a stale repeatable snapshot after promotion, without changing its settings/version. Simulation access, reseeding and reset then fail closed; records are retained.
- Old releases without this guard must lose their old runtime credentials before promotion. Setup includes rotation and terminating only the old runtime sessions. Do not give older code the new password.
- Inline `ASSET_REGISTRY_JSON` accepts the same bounded verified testnet registry as the operator file. Exactly one source is allowed; equivalent content has the same fingerprint.
- Configured mainnet payments use the same restricted financial namespaces and separate signer. Explicit read-only previews read public mainnet configuration/catalogue/help using only `gw_preview`; private/auth/job/payment routes are closed. Local browser checks pass; hosted acceptance remains open. Reusing provider accounts is the deployment preference, not permission to expose real financial mutations through preview.

Native admin plan creation saves disabled metadata without requiring a GIV asset. Currency prices are created separately by gated activation. Native catalogue, portfolio, records and receipts validate the transaction’s payment environment without changing it.

## Database and access

- The fresh installer is [fresh-install.sql](../packages/db/fresh-install.sql): **96 tables, 897 columns, 301 CHECK constraints and 119 standalone indexes**, plus views, functions, triggers, partitions, row security and exact grants. Paste it once into an empty application schema.
- Installation is atomic. It creates final definitions directly and records the unchanged release receipts. Existing migration files remain for initialized databases and matching archive recovery; new installations do not replay them. Later schema changes need reviewed upgrades and a refreshed, verified fresh installer.
- Application queries use Drizzle. PostgreSQL-specific locking, security, counters, schema work and recovery use reviewed SQL.
- `gw_runtime` is a restricted login. Within each transaction it uses `gw_read` for allowed reads or `gw_service` for authorized writes. Actor, environment, role and search path reset when the transaction ends.
- Row-level security restricts user-owned records. Staff privileges are checked against the current database, not a token's old role. Browser/Data API roles receive no application-table access.
- Every new public table needs explicit grant/revoke classification in the same migration. Never fix permission errors by granting all tables to `anon`, `authenticated` or `service_role`.
- The owner connection stays outside Vercel. Binding checks use two fresh owner-held transaction locks observed through the runtime connection; no bootstrap table or permanent proof is created. Copied database IDs cannot satisfy the fresh check.
- Hosted connections verify TLS certificates and hostnames. The app uses a small transaction-pooler connection; owner administration uses direct/session connections.
- [The reviewed schema contract](../packages/db/schema-contract_v67.json) pins declaration/migration hashes and inventories SQL-only triggers and deferred-FK timing differences. The current SQL000–006 total is 96 tables/897 columns/301 checks/119 standalone indexes; the original initial installer stays unchanged.

## Settings and API responses

- `xmanifest.json` supplies starting defaults. Seeding adds missing values and preserves existing edits. The database is the authority for later writes.
- Settings have public, private or staff scope. A scope is not a secret store: keys, private addresses and credentials stay in provider secret settings.
- Invalid financial/security settings stop affected actions. Safe public defaults may keep informational pages available during a database outage; they cannot approve a transaction.
- `/manifest` and public catalog/help return only allowed public fields. Public cache freshness, ETags and invalidation are bounded; old requests cannot replace newer state. Private responses use `no-store`.
- Financial JSON uses exact amount strings and explicit date/null forms. Client code cannot import executable server, DB, chain or signer modules.
- Errors use safe bilingual messages and request IDs. Raw credentials, factors, signed bytes and private responses never belong in logs.

## Identity and browser data

- Simulation accounts are demo identities. Google verifies real sign-in; app-issued sessions still enforce consent, account status and permissions.
- First Google-admin setup uses an owner-only SQL Editor transaction after verified identity and two-factor enrollment. It checks for existing Google admins/prior bootstrap, writes a permanent key and audit, and invalidates old sessions. Later recovery is separate.
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

Phase One keeps display order separate from actual serving order. Administrative bumps affect serving priority while preserving joining/display sequence and an internal audit. Bootstrap positions are platform-controlled. Their allocations are business liabilities, never fabricated member payments. See PRD §9 for legacy behavior and §32 for the implemented, locally verified transparent profile. Hosted acceptance is still pending.

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
- Recovery pauses the asset, binds a checkpoint/loss review to the actual database, scans bounded pages and reconciles saved attempts and beneficiary custody. A later covering clean scan removes a superseded review from Unresolved while preserving history. Unknown incoming funds remain original-sender liabilities; reviewed company loss never reconstructs a missing member payout intent.
- SOL/TRON balance witnesses freeze a common finalized cutoff. A later balance cannot prove that earlier cutoff; contradictory/unknown evidence remains held for review.
- A permanent address inventory is populated atomically from invoices, checkpoints, obligations and unmatched inflows, including expired invoices. Owner-controlled source triggers capture new addresses before future archival; runtime roles cannot add, change or remove address identities. A scoped owner function advances the least-recently-attempted timestamp, so missed ticks and failed RPC calls cannot starve other addresses. Admin can page the complete inventory and scan an old address. Scheduled monitoring rotates through historical addresses and flags retained funds for review.
- Recovery records an address balance at one canonical cutoff and requires the full retained address set before comparing combined custody with the ledger. Missing/mismatched evidence stays pending. The database release fence checks the latest checkpoint/run for every known address; one successful current-address scan cannot clear an older review. The full address set is aggregated in PostgreSQL under its query deadline; no first-page cap can report completion.

## Jobs, cache and operational limits

- Durable notification, observation and payout jobs use leases, retries and replay protection. One long-lived observation retains its identity rather than creating endless jobs.
- Scheduler requests bind body, environment, timestamp and nonce to a private authentication key. Replays, stale requests and wrong environments are rejected.
- Alerts retain immutable occurrence payloads and retry/escalation order. Critical alerts get priority within a shared daily attempt budget.
- Database queues, statements, requests and outbound RPC/cache calls have explicit deadlines and byte/row limits. Body cancellation cannot hold a request open; worker signatures still cover exact received text. Temporary capacity/outage failures retain retry eligibility. Recovery and diagnostics cannot hide unbounded history scans behind a small page size.
- Redis is a bounded cache, not the financial source of truth. Unknown/missing provider configuration fails explicitly. Selected hosted adapters need their own expiry, increment, outage and error-response observations.
- Expired session/rate records have bounded cleanup. Account deletion redacts private message content while preserving required financial/audit history.
- Retention honors the operational hold. Old notification bodies expire; completed expendable task payloads compact while permanent identifiers and retry protection remain. Financial and unresolved work payloads are retained.
- Ledger postings, network scan pages and audit events use monthly online archives with two bounded checksum passes. Journals and financial events retain global identities. Archives remain readable in the same database and still consume its quota; financial records are not automatically deleted. Admin **Operations → Data retention** shows progress and can process one batch.

## Help, exports and recovery

- Published help uses locale-specific title/body full-text search and title-typo fallback. Results are capped and drafts excluded. Offline search is clearly limited to saved articles.
- If the live public configuration is unavailable, fallback pages disable features and demo activity and show an unavailable message; seeded defaults cannot re-enable them.
- Public pages carry locale/canonical metadata; private routes are excluded from indexing. English/French text and accessibility checks remain required.
- Member JSON/CSV exports fix a creation cutoff. Later records are excluded, but mutable values are captured during bounded parts: **this is not one global point-in-time snapshot**. Export metadata discloses the capture interval; spreadsheet-leading values are escaped.
- Full application archives encrypt native PostgreSQL dumps with AES-256-GCM and authenticate their inventory separately. Dump and row inventory share one consistent read snapshot.
- Archives retain financial/work history, protected counters, provider identities, encrypted factors and permanent replay evidence. Session/refresh/login-flow/rate/binding-challenge and short-lived worker nonce rows are excluded; their schema/security still enter fingerprints. Before publishing a restored staging site, issue fresh scheduler/worker request-authentication keys and remove previous-key values, then reconcile the chain. Preserve the custody and MFA encryption keys needed for existing records.
- Restore verifies signatures, checksums, compatible versions, approved extensions and exact rows/schema/security. It supports simulation, testnet and mainnet archives and requires a fresh empty inactive staging target, disabled signing and absent scheduler keys; it never merges into an occupied database or automatically resumes jobs.
- Closed extension dependencies allow `pgcrypto` 1.3 and optional `pg_trgm` 1.6 in their approved schemas. Unknown names, versions, duplicates or incompatible installed extensions are rejected.
- Vercel full-site archive transfer is operator-only; its UI does not offer a complete upload/download/restore path. Optional persistent-host staging is separate, bounded and encrypted. Failed/quarantined evidence is retained for review.
- Current recovery contract4 binds timestamp precision, closed permission groups, column permissions and partition bounds/indexes. Older contracts require their matching historical release; never relabel or re-sign a packet. Recovery maintenance cannot enable the web runtime, signing or scheduling.
- Keep MFA and archive keys separately. Old 99-migration archives require release `e6f7888034afae01d0c7803965f1c17889783171`; the fresh installer does not convert their signed histories.

## Verification and documentation

- CI checks types, lint/import boundaries, translations, settings, schema/grants, documentation, secrets, builds and bundle budgets. It does not claim hosted acceptance.
- Relevant named manual checks cover rollback/replay, concurrent admission, missing-wallet liabilities, rejected withdrawals, account isolation, cache expiry/outage, signing recovery and exact restore. Use isolated data and preserve failed evidence. Never reset a shared source to repeat a check.
- Hosted Google, Upstash, RPC, alerts, mobile performance and release readiness require observations on the selected services. Health/compilation alone do not satisfy them.
- Keep **five core docs** plus the two explicitly requested bug trackers. Use clear lists/tables and short explanations; update current facts instead of appending repeated history. Only add a document when explicitly requested or essential. Prior versions remain in Git.
- Application work has resumed through Phase Two and final fixes. [LLM handover](LLM-HANDOVER_v101.md) records the exact continuation boundary.

- Phase Two recovery uses signed inventory contract4: timestamps retain PostgreSQL microseconds in paging/row checksums, and permission-group attributes/membership are checked. Contract3 archives require release `6c323dc43c45efa1957308e467ce06e7cc0b36c0`. Contract2 archives require their matching release (the preceding release is `25a5073d30974bcf8b02814bc81181e3a147d15c`). Keep original archives, keys and release references.
- In the transparent profile, platform positions and priority exceptions are labelled or disabled. Joining numbers stay fixed; the displayed receiving position reflects actual order. Administrative-priority changes notify waiting members in that queue, without private staff reasons; notices follow the selected language. Potential receipts depend on later confirmed gifts and are never guaranteed. Account publication is optional and revocable; test/simulation records do not become real-payment stories.

## Eligibility, display and pricing

- Consent checks the full birth date against server time; it retains only the verified time and accepted minimum age. This is an age declaration, not identity verification.
- Members save English/French and an IANA time zone in account settings. Africa/Lagos is the default. Admin displays use admin_timezone; plan launch inputs explicitly use UTC. Display changes never change financial timestamps.
- Native plan activation can freeze a USD-derived amount or an exact token amount. Both retain the trusted rate reference; resuming an existing version preserves its amount.

- Encrypted signer key format2 binds its chain, environment, network and public address. Legacy format1 remains testnet-only; packaging a key does not activate mainnet. Private key files are read from a checked descriptor and symlinks are rejected.
- Gift currency selectors show enabled assets only. Idle preview pauses for focus, interaction, reduced motion, active cycles and financial review. A manual choice stops rotation; tile/card navigation restores keyboard focus.

- Isolated signer transactions hold the same profile→payment-mode locks as promotion. After promotion, retired workers fail before further application reads/writes. Signer execution selects testnet or mainnet and refuses a key/network/environment mismatch.
- A manual trusted-main GitHub workflow can generate a new encrypted custody package with no database/RPC access. It creates unfunded keys and does not install them, replace a treasury or activate sending.

- Explicit chain-observation adapters can check mainnet network/asset evidence. They expose no transfer construction/broadcast or raw RPC, and their transport allows only reviewed read methods. This capability does not enable mainnet payments; active financial adapters remain gated.

## Mainnet and the isolated signer

- `APP_ENV` chooses simulation, testnet or mainnet; Vercel Preview/Production chooses the hosting stage. Keep the same database and provider accounts. A mainnet promotion retires earlier financial modes without converting or deleting their records.
- Mainnet supports Ethereum, BNB, Solana and TRON protocols. Enabled tokens need reviewed contracts/mints; TRX pays operating costs rather than member gifts. No verified token deployment is supplied by a generated fixture.
- New payments need transparent settings, an approved readiness record, matching network configuration hashes and a recent signed alert acknowledgement. Missing or changed approval pauses the affected currency. Actual balances, signed attempts and refund rights remain.
- The web app has no private signer material. A separate GitHub protected environment installs a validated encrypted four-key package into a private runner directory, then runs the bounded worker. Database roles and environment-bound envelopes prevent testnet/mainnet substitution.
- Local protocol, wallet, package and database/worker procedures pass. Live provider/custody/hosted recovery tests and the required observation periods still need actual evidence. Follow [SETUP](SETUP.md) for browser-only configuration.

- App updates preserve compatible clients. If a reload is required, finish wallet confirmation and save any displayed transaction hash first; the app blocks new actions and never automatically resends payment. Install/update controls also work on native-payment routes.

- Optional automatic encrypted backups use the existing GitHub recovery environment and database policy. They never restore, deploy or start payments. Keep keys separately and check actual archive age; restore drills and provider scheduling/storage acceptance remain separate.
