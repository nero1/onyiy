# Project status v79

**Phase One/Two is incomplete.** Four mainnets/eight protocols are implemented; all seven member-asset procedures now cover incoming payments, refunds, withdrawals, company settlements and sweeps locally. Generated endpoints/contracts are fixtures. Actual providers, custody, hosted operation and observation periods remain unverified. Continue without milestone approval pauses; owner launch inputs are deferred to final testing.

## Remaining work

| ID | Area | Evidence and next work |
|---|---|---|
| C001 | Mainnet | Runtime, wallet/signing and seven-asset local lifecycle work. Finish edge cases and actual launch acceptance. |
| C002 | Shared database/preview | One active financial mode and public-only Preview pass locally. Verify hosted promotion/permissions. |
| C003 | Custody | Encrypted four-key package and isolated worker→separate web settlement work. Verify the actual protected host and keys. |
| C004 | Payment matrix | All seven basic lifecycles, company settlements and sweeps pass. SOL/SPL/TRC20 refund expiry and EVM replacement preparation now pass locally. ETH/BNB-token replacement persistence and fresh-process settlement also pass locally. Finish wider family/asset reorg, restart and failure/account-setup variants. |
| C005 | Provenance | Owner must verify real contracts/mints/decimals and independent RPCs. Generated JAGA is not real provenance; keep unverified assets disabled. |
| C006 | Pricing | Fixed/derived activation, replay and signed-price checks pass locally. Verify actual feed operation and full price-change scenarios. |
| C007 | UI/wallets | Seven canonical sends/eight protocols, saved locale, narrow EN/FR and wallet-safe updates pass locally. Finish devices, actual wallets and accessibility review. |
| C008 | Recovery | Encrypted exact restore, matching releases, managed idle-session guard and database-bound approvals work. Known pending ETH recovery passes locally; known pending SOL/SPL/TRC20 cases now pass too; finish broader restart/expiry/reorg cases, post-backup history reconciliation and hosted drills. |
| C009 | Identity/access | Mainnet session/TOTP/recovery/refresh/logout and closed MFA limit pass locally; finish actual Google/CAPTCHA, physical authenticator, broader permissions/rates and hosted browser acceptance. |
| C010 | Product audit | Complete a current-PRD audit of queues/points/referrals/admin/data controls/flags/PWA/accessibility. Historical295-row checklist is not full current acceptance. |
| C011 | Operations | Protected signer/schedulers and opt-in automatic encrypted backups are implemented. Finish actual external alerts, schedule/storage monitoring and incident/closure acceptance. |
| C012 | Capacity/cost | Local bundle budgets pass. Measure hosted latency, mobile performance, quotas and compliant operating costs. |
| C013 | Observation | Actual14-day beta plus14-day initial-cap mainnet observation; no elapsed acceptance recorded. |
| C014 | Owner review | Countries/terms, funding/refund/closure, custody and budget remain owner-deferred. |
| C015 | Age | Server-date eligibility without retaining DOB passes locally; hosted acceptance remains. |
| C016 | Preferences | Saved language, explicit EN/FR choice, timezones/DST pass locally; finish device/hosted acceptance. |
| C017 | Navigation/schedules | Native per-currency scheduling, fresh approvals/prices, countdown and early-checkout denial pass locally. Finish broader device/operational acceptance. |

## Current delivery

Branch `feat/native-account-setup-audit`, based on PR77 merge `4cd41f419873424c8636b4a1583d124efc68e5e3`. PR77 exact head09f4633 passed push39089620137 / PR39089626136. PR70 added managed restore/client compatibility; PR71 added policy-bound automatic backups; PR72 protected all wallet prompts from reload. Git history retains their detailed evidence.

New read-only correction: an obligation can retain internal `signing` while its durable attempt is signed/broadcast. Recent and paginated member reads add `display_status`; EN/FR displays the recorded progress. Raw financial status, actions, history, wire compatibility and schema remain unchanged. The recorded transaction hash is also shown. `native-lifecycle-v74/send-status-r2` passes funded claim/signed/broadcast progression, old-code baseline, member isolation and unchanged obligation/attempt/ledger hashes. `send-status-browser-r1` passes production Chromium390px EN/FR recent and paginated views with the exact retained hash; no API interception or financial mutations. Required checks, production build and bundle budgets pass locally.

## Financial evidence

All procedures use generated signatures, contract/mint references and isolated transport. No public sends, real funds or provider/provenance acceptance.

| Asset | Basic lifecycle under `native-lifecycle-v73` | Company settlement/sweep under `native-lifecycle-v74` |
|---|---|---|
| ETH | `eth-native-r4` | `eth-operations-r1` |
| BNB | `bnb-native-r2` | `bnb-operations-r2` |
| USDT BNB18 | `usdt-bnb18-r2` | `usdt_bnb-operations-r2` |
| JAGA BNB18 | `jaga-bnb18-r1` | `jaga_bnb-operations-r2` |
| SOL | `sol-native-r3` | `sol-operations-r2` |
| USDT SOL | `usdt-sol-r1` | `usdt_sol-operations-r2` |
| USDT TRON | `usdt-tron-r1` | `usdt_tron-operations-r2` |

Common coverage: contributed gas, ownership proof, exact/underpaid incoming, original-sender refund despite ban, failed-refund gas/full-principal preservation, quote/hold/cancel replay, wrong-generation/body-conflict denial, encrypted worker→authenticated separate web settlement, unused-fee return, staff authorization and surplus protection. Independent `matrix-integrity-r1` reads verify every retained database: three attempts/gas journals per basic case; five per company/sweep case; settled obligations and no unbalanced journals. SPL's inherited final console caption has an incorrect amount; use its integer assertions and retained rows.

`native-lifecycle-v74/restore-pending-eth-r4` archives an actual signed pending refund, restores/verifies an empty target, rejects source financial approvals/worker authentication, and observes without a custody file. Missing index evidence preserves the hold; later canonical proof settles once with no broadcast/new signature. Source and original packet stay unchanged. Missing custody correctly contributes a preflight pause; this is retained-attempt recovery, not healthy new-send readiness or reconstruction of unknown post-backup sends.

Preserve failed originals. Notable fixture corrections: ETH omitted transport loader; USDT18 had insufficient6-decimal mock liquidity; SOL had an impossible payer balance then reused a blockhash/signature; company r1 scripts failed parsing before database work. Pending-restore r1 reused an ESM pool across URL changes; r2/r3 expected zero missing-key pauses/raw `broadcast` instead of preserving the captured internal state. Browser selectors/provider injection were corrected on fresh targets. No failed financial database was reset.

## Schema, recovery and release rules

- Fresh installation: paste only `packages/db/fresh-install.sql`. It directly creates final definitions and seven receipts. SQL000–005 remain immutable; SQL006 fixes queue parameter ambiguity. Contract: `schema-contract_v67.json`,96 root tables/897 columns/301 checks/119 standalone indexes. Future DDL needs a forward upgrade and reverified installer.
- Recovery contract4/current seven-file lineage verifies exact schema/security/data. Pre-006 contract4 needs its original release (PR65 `0ea4cf5e62a0ef7e7f83c26c1a512d6935775ac3` for six files); older v3 uses PR53 `6c323dc`, v2 `25a507`. Never re-sign old packets.
- Financial hashes include actual database identity. Keep old obligation/attempt snapshots; restored approvals cannot activate another target. Rotate request/auth keys, retain original MFA/custody/payload keys and reconcile chains before publication. `worker_requests` is excluded from archives.
- Automatic backups use authoritative policy and retained successful artifacts bound to database identity. Retention is checked after upload. GitHub timing/storage and measured RPO/RTO remain external acceptance; backups never restore/deploy/start payments.
- Five core guides plus two versioned trackers. Both CI events must pass the exact final head before merge. Named isolated procedures/required checks are authorized; broad automated suite remains deferred. Continue after each merge; do not claim100%.


## Recovery follow-up and transaction selection

- `native-lifecycle-v74/restore-pending-sol-r1`, `restore-pending-spl-r1` and `restore-pending-tron-r1` pass the same encrypted pending-refund backup/empty-target restore/exact verification, source approval/authentication denial, missing-index hold preservation and retained-hash settlement with no new signature/broadcast. Source databases/packets remain unchanged. Missing custody causes expected preflight pauses (one SOL asset, two token/native registry entries); this does not establish new-send readiness or unknown-history recovery.
- Transaction display now prefers confirmed, then broadcast/signed attempts, then failed attempts. `hash-priority-r2` executes the actual helper against five temporary-only scenarios and reproduces the old failed-before-broadcast selection. No real financial table is changed. Preserve r1: its harness passed a transaction client to an incompatible Drizzle constructor; r2 compiles through the actual PostgreSQL dialect.
- Independent `recovery-integrity-r1` read-only checks pass across all four source/target pairs: two retained attempts each, pending source with one gas journal versus settled target with two, and zero unbalanced journals.
- Follow-up required checks, production build and bundle budgets pass locally.
- Current PRD scratch audit was refreshed to392 keyword candidates in `native-lifecycle-v74/current-prd-audit-r1.json`. All begin review-pending; extraction is an audit aid, not acceptance.

## Expiry and replacement evidence (v76)

- `native-lifecycle-v74/{sol,spl,tron}-expiry-r1` passes actual encrypted worker→separate authenticated web expiry for a pending original-sender refund. Missing hashes before the deadline preserve held principal; dual-provider positive expiry records one expired attempt without new signature/broadcast/gas. Administrative recovery returns the full original-sender liability once, even while the sender remains banned. SOL uses a declared advanced block height; TRON uses a declared advanced provider block timestamp. These are explicit transport fixtures, not elapsed live-chain evidence.
- Independent `expiry-integrity-r1` reads verify two signed attempts, one expired attempt, one earlier failed-receipt gas journal, full remaining refund principal and zero unbalanced journals in all three databases.
- `replacement-eth-r2` (native) and `replacement-bnb-r1` (18-decimal token) exercise the actual EVM replacement preparation with generated signatures and amounts above safe JavaScript integer precision. They preserve nonce/recipient/principal/calldata/gas limit, wait30 blocks, bump10% within the approved25% budget, and reject changed destination, contradictory/confirmed evidence and excess fees. No broadcast or replacement persistence is claimed. Preserve ETHr1: it exercised generic token intent on Ethereum, not the intended native case.
- ETH post-withdrawal reorg procedure `eth-reorg-r2` passes: absence/provider outage cannot book loss; positively replaced canonical block creates one retained review, freezes spending, preserves allocations and rejects evidence rewrite; reconfirmation restores cash/points once. Preserve r1: it correctly hit the asset safety fence, but the harness expected the wrong error name. Its committed review and original financial database remain unchanged; r2 uses a fresh database.

v79

## Durable EVM replacement follow-up (v77)

`native-lifecycle-v74/eth-replacement-r2` and `bnb-replacement-r3` pass actual encrypted worker replacement persistence, broadcast and separate authenticated web settlement. A same-nonce replacement retains recipient/principal/calldata/gas limit, uses a higher approved fee and records its predecessor before broadcast. The pending refund stays held until one canonical winner settles; replays create no further sends/signatures/postings. Three total attempts include the earlier failed-refund attempt, the replaced attempt and its winner; only the failed receipt and winner consume gas. All transports and contracts remain generated fixtures.

Preserve failed originals: ETHr1 hid the pending hash from the block list but failed to recompute its transaction indexes, correctly preventing contradictory settlement. BNB r1/r2 advanced the fixture height before the real5-second height cache expired, so the worker safely rebroadcast instead of creating an early replacement. BNB r3 waits for that cache normally; no application safety rule was weakened.

Fresh-process continuation passes on `eth-restart-r3` and `bnb-restart-r1`: an asynchronous, newly started actual worker observes and settles the durable replacement through the separate authenticated web without another signature/broadcast. The bootstrap maps declared generated transports only; domain gates and API responses are real. Independent `replacement-integrity-r1` reads pass across both regular and both fresh-process databases: exactly one failed/superseded/confirmed attempt each, one linked replacement, two gas journals, one settled refund and zero unbalanced journals. ETH restart r1 used a synchronous child while its parent hosted RPC fixtures; r2 lacked the child’s declared generated transport initialization. Keep both original financial databases/logs; corrections use fresh targets and an asynchronous child with explicit transport bootstrap.

## Mainnet identity procedure

`native-lifecycle-v74/mainnet-auth-r2` passes actual restricted-role server authentication methods with generated genuine JWT/session state: origin/CSRF/generation denial, encrypted TOTP enrollment, strict pre-auth, TOTP replay denial, hashed one-use recovery, access rotation, refresh-reuse family revocation, logout-all, sixth-attempt MFA rate denial and ingress-IP normalization/spoof checks. Obligation/attempt/ledger hashes remain unchanged. The earlier r1 narrower pass is preserved. Identity is explicitly generated; actual Google, physical authenticators, CAPTCHA and hosted browser acceptance remain open.

## Current product audit (v78)

`product-audit-v78/simulation-r3` creates a fresh empty database by executing the single final-state installer, runs the actual seeder, then exercises the current production build through all six existing named procedures:21-gift bootstrap queues, financial integrity/concurrent spending, signed scheduler/jobs, withdrawal recovery, incoming invoice failures and reorg/reconfirmation. All pass locally. This is isolated GIV evidence, not hosted/mainnet acceptance or a full current-PRD audit.

Two manual procedures still expected pre-pagination staff DTOs. The jobs check now verifies no unfinished current jobs and pages completed history, preserving payload/lease privacy checks and repeated-cursor denial. Reorg verification filters its recorded review in paginated history and checks retained resolution after reconfirmation. No financial endpoint, schema or settlement rule changes. Required checks, script syntax and whitespace checks pass locally; the production application build is unchanged from the previously checked code. Preserve r1 (old jobs summary assertion) and r2 (old nested reorg-history assertion), including all committed financial/scheduler state; r3 uses a new database.

## Solana v1 reads and account setup (v79)

**P1-075:** public mainnet probes reproduced `-32015` for v1 transactions with the old maximum0. Official [Solana guidance](https://solana.com/docs/core/transactions/versioned-transactions) confirms the opt-in. The adapter and bounded scanner now share integer maximum1 for receipt, block/header, event lookup and expiry reads. No SDK/signing format, financial/schema rule or archive contract changes. Required checks, production build, bundle budgets, final documentation/secret checks and whitespace checks pass locally.

- `public-network-v79/recorded-v1-scan-r2` replays the unchanged recorded public v1 transaction and960-signature block through two declared local endpoints. Actual old scanner code fails; corrected adapter advances its bounded cursor, ignores unrelated/zero-self transfers, requests integer1 throughout and retains observation-only send denial. This is recorded-data replay, not two live providers’ acceptance.
- `product-audit-v78/spl-setup-r2` verifies a sender closing its empty ATA after deposit: the refund recreates it, quotes2039280 lamports rent and books2044280 total company cost including5000 network fee, preserving full principal. `spl-v1-reads-r1` repeats the full SPL lifecycle/account-setup case while rejecting every receipt/block request without maximum1. `sol-expiry-v1-r1` passes the native SOL expiry/held-principal procedure with the same strict request check. Inherited SPL console captions still contain the old incorrect amount; integer assertions and rows are authoritative.
- `public-network-v79/identity-r1` makes actual read-only public RPC calls: ETH1, BNB56, Solana mainnet genesis and TRON728126428 match. A queried Solana mint returns standard SPL ownership/six decimals; this is metadata observation, not token provenance/approval. No public funds are sent.
- Live dual-provider adapter acceptance remains open. Direct pinned transport was unavailable in this executor; a public secondary returned403/Cloudflare1010. Preserve those logs rather than weakening network guards. The recorded replay’s two endpoints are explicit fixtures. Initial replay r1 used an invalid100RPS harness setting; r2 uses20. Preserve earlier registry-shape/disabled-entry diagnostic runs too.

v79
