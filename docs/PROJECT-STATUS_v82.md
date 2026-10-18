# Project status v82

**Phase One/Two remains incomplete.** Four mainnets/eight asset protocols are implemented. Seven member assets pass local incoming/refund/withdrawal/company/sweep procedures. Public RPC identities match; hosted payments and observation periods are unverified. Continue without milestone approval pauses. Owner launch inputs remain deferred to final testing.

## Remaining work

| ID | Area | Current evidence and remaining work |
|---|---|---|
| C001 | Mainnet | Seven-asset local lifecycles and Solana v1 read fix pass. Finish remaining edge cases and actual configured-provider acceptance. |
| C002 | Shared hosting | One active financial mode and public-only Preview work locally. Verify hosted promotion/permissions. |
| C003 | Custody | Encrypted four-key package and worker→separate web settlement work. Verify the protected host/keys. |
| C004 | Payment variants | Company/sweeps on seven assets; SOL/SPL/TRC20 refund expiry; ETH/BNB-token replacement/restart; SPL ATA rent; ETH post-withdrawal reorg pass locally. Complete other family/asset failure/reorg/restart variants. |
| C005 | Provenance/RPCs | Public network IDs match. Real contracts/mints/decimals and independent configured RPCs require verification; generated JAGA is not provenance. Unverified assets stay disabled. |
| C006 | Pricing | Activation/frozen prices, replay and signed-price checks work locally. Finish full price-change variants and actual feed operation. |
| C007 | UI/wallets | Eight protocol preparations/seven wallet sends, narrow EN/FR, preferences and wallet-safe reload pass locally. Shared receipt/history/error/offline-language fixes pass locally; finish physical devices/wallets/accessibility. |
| C008 | Recovery | Exact encrypted restore, matching releases and database-bound approvals work. Retained pending ETH/SOL/SPL/TRC20 hashes recover locally. Finish wider cases, unknown post-backup reconciliation and hosted drills. |
| C009 | Identity | Mainnet session/TOTP/recovery/refresh/logout, closed MFA limit and ingress checks pass locally. Finish actual Google/CAPTCHA, physical authenticator and broader permissions/rate/hosted acceptance. |
| C010 | Product audit | Six current simulation procedures and several native/public surfaces pass locally. Complete the full current-PRD audit; the392-row keyword checklist is an aid, not acceptance. |
| C011 | Operations | Protected signing/scheduling and opt-in policy-bound automatic encrypted backups exist. Verify real alert receiver, schedule/storage monitoring and incidents/closure. |
| C012 | Capacity/cost | Local build/bundle budgets pass. Measure hosted/mobile latency, quotas and operating costs. |
| C013 | Observation | Actual14-day beta plus14-day initial-cap mainnet observation; none is recorded as elapsed acceptance. |
| C014 | Owner review | Countries/terms, funding/refund/closure model, custody and budget remain deferred. |
| C015 | Age | Server-date eligibility without retained DOB passes locally; hosted acceptance remains. |
| C016 | Preferences | Saved language, explicit EN/FR choice and timezones/DST pass locally; device/hosted acceptance remains. |
| C017 | Schedules/navigation | Native per-currency launch, fresh approvals/prices and database-time countdown/early denial work locally. Finish wider device/operation cases. |

## Current delivery

Branch `feat/recovery-earnings-projections`, base PR80 merge `30ab691c0ce666e6998117d93fa16d72da353c0b`. PR80 headb1f7498 passed push39105876065 / PR39105882828 before merge. PR79 receipt/history/offline-language fixes are also merged.

**P1-080:** confirmed admin-reviewed earnings recovery now appears in own receipts and verified activity/statistics. Only settled withdrawal/recovery from `available_payable` qualifies; existing consent, real-account, canonical settlement and reorg checks remain. Refunds and company transfers do not become member earnings. No financial records or schema are changed.

## Current verification

`product-audit-v81/eth-support-r1` completes the actual ETH lifecycle with an admin-reviewed original-wallet recovery instead of the final normal withdrawal: reviewed quote, wallet signature, encrypted signer and separate authenticated settlement. It reproduces missing receipt/totals before the read fix and also completes company/sweep checks. `recovery-earnings-reads-r1` then passes the corrected exact receipt/hash, once-only USD1.65 historical totals and opt-in/revocation reads with unchanged event/obligation/attempt/ledger hashes. All use generated isolated keys/providers; hosted/live acceptance remains open.

The preceding v81 activity eligibility/exclusion audit passed through restricted service queries on generated mainnet data with a validated policy supplied directly (stored activity stayed off): gifts/internal credits/withdrawals, opaque IDs, actual amounts/network, cap, disabled reads, test exclusion and mainnet demo denial. The suspected member-count alias issue was ruled out by independent SQL. Preserve failed setup/r1 logs and every original financial fixture.

PR79 production Chromium checks cover EN/FR390px receipts/PNG/history and offline locale/error recovery; its current read procedures retain exact values, page bounds and financial hashes. See Git history for the named earlier evidence. Required checks, production build, bundle budgets and the ordinary six-section history regression pass locally. The recovery reads were repeated after company/sweep completion with unchanged financial hashes.

## Financial evidence

All financial sends below use generated contracts/endpoints/keys. No public funds or provider/provenance approval is inferred.

| Asset | Basic procedure in `native-lifecycle-v73` | Company/sweep in `native-lifecycle-v74` |
|---|---|---|
| ETH | `eth-native-r4` | `eth-operations-r1` |
| BNB | `bnb-native-r2` | `bnb-operations-r2` |
| USDT BNB18 | `usdt-bnb18-r2` | `usdt_bnb-operations-r2` |
| JAGA BNB18 | `jaga-bnb18-r1` | `jaga_bnb-operations-r2` |
| SOL | `sol-native-r3` | `sol-operations-r2` |
| USDT SOL | `usdt-sol-r1` | `usdt_sol-operations-r2` |
| USDT TRON | `usdt-tron-r1` | `usdt_tron-operations-r2` |

Common coverage: native gas funding, ownership proof, exact/underpaid incoming, original-sender refunds despite ban, failed-receipt gas/full-principal preservation, quote/hold/cancel replay, wrong-generation/body-conflict denial, encrypted worker/separate authenticated settlement, unused-fee return, staff/surplus guards. Independent matrix reads verify three attempts/gas journals per basic case and five per company/sweep case, with settled obligations and balanced journals.

Additional retained procedures:

- `native-lifecycle-v74/restore-pending-{eth-r4,sol-r1,spl-r1,tron-r1}`: actual pending encrypted archives, empty-target restore/exact verify, source approval/authentication denial, missing-index hold preservation and later once-only settlement without custody/new signature/broadcast. `recovery-integrity-r1` checks all source/target pairs. Missing custody correctly causes preflight pauses; unknown post-backup activity is not reconstructed by these cases.
- `native-lifecycle-v74/{sol,spl,tron}-expiry-r1` plus `expiry-integrity-r1`: missing hashes before deadline preserve principal; positive dual-provider expiry permits once-only full refund-liability recovery with no extra gas/send/signature.
- `native-lifecycle-v74/eth-replacement-r2`, `bnb-replacement-r3`, `eth-restart-r3`, `bnb-restart-r1` plus `replacement-integrity-r1`: exact same-nonce intent, encrypted linked replacement and fresh-process settlement. One failed/superseded/confirmed attempt each, two gas journals, one settled refund and balanced ledgers. `eth-reorg-r2` verifies post-withdrawal invalidation/reconfirmation, immutable allocations and once-only cash/point restoration.
- `product-audit-v78/spl-setup-r2` verifies an ATA closed after deposit:2039280 lamports rent,2044280 total company cost, full sender refund. `spl-v1-reads-r1` and `sol-expiry-v1-r1` repeat financial paths while rejecting receipt/block reads without integer maximum1.
- `native-lifecycle-v74/mainnet-auth-r2` verifies genuine generated sessions, TOTP/recovery/replay, refresh-family revocation/logout, closed sixth MFA attempt and ingress spoof checks without money changes. Real Google/device acceptance remains open.
- `product-audit-v78/simulation-r3`: fresh single installer/actual seed/current production build passes all six existing bootstrap, integrity/concurrent-spend, scheduler, withdrawal recovery, incoming failure and reorg procedures. Earlier stale manual DTO failures remain preserved.

Public read-only evidence in `public-network-v79`: four expected network identities match. Actual Solana v1 reads reproduce old -32015; `recorded-v1-scan-r2` verifies old-code failure and fixed bounded progress using unchanged recorded transaction/block data on two declared local endpoints. Direct pinned transport was unavailable in this executor; a public secondary returned403/Cloudflare1010. No live dual-provider acceptance is claimed. See [Solana guidance](https://solana.com/docs/core/transactions/versioned-transactions).

## Release and preservation rules

- Fresh install: paste only `packages/db/fresh-install.sql`. Seven receipts; immutable SQL000–005; SQL006 queue fix. `schema-contract_v67.json`:96 tables/897 columns/301 checks/119 standalone indexes. No DDL in this batch.
- Recovery contract4 checks exact schema/security/data and migration fingerprints. Old packets need matching original releases, then reviewed upgrades; never edit/re-sign packets. [SETUP](SETUP.md) and [handover](LLM-HANDOVER_v82.md) retain references/key-handling rules.
- Hashes bind actual database identity. Keep historical obligation/attempt snapshots. Rotate request/auth keys on restore, retain original MFA/custody/payload keys, reconcile chains and obtain fresh approvals/alert acknowledgements before publication.
- Preserve all failed/successful financial fixtures, archives and keys. Corrections use fresh targets. SPL’s inherited console captions contain an old amount typo; integer assertions/rows are authoritative. Prior failed harness/transport/index/cache attempts remain in their original roots.
- Five core guides plus two requested versioned trackers. Keep current facts concise; history is in Git. Both CI events must pass the exact final head before merge. Named manual procedures/required checks are authorized; broad automated suite remains deferred. Continue without approval pauses; do not claim100%.

v82
