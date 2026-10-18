# Project status v92

**Phase One/Two remains incomplete.** Four mainnets/eight asset protocols are implemented. Seven member assets pass local incoming/refund/withdrawal/company/sweep procedures. Public RPC identities match; hosted payments and observation periods are unverified. Continue without milestone approval pauses. Owner launch inputs remain deferred to final testing.

## Remaining work

| ID | Area | Current evidence and remaining work |
|---|---|---|
| C001 | Mainnet | Seven-asset local lifecycles and Solana v1 read fix pass. Finish remaining edge cases and actual configured-provider acceptance. |
| C002 | Shared hosting | One active financial mode and public-only Preview work locally. Verify hosted promotion/permissions. |
| C003 | Custody | Encrypted four-key package and worker→separate web settlement work. Verify the protected host/keys. |
| C004 | Payment variants | Seven-asset support and fee-variance flows pass, with family-specific expiry/replacement/reorg/ATA cases. Finish wider failure/account-setup and recovery cases. |
| C005 | Provenance/RPCs | Public network IDs match. Real contracts/mints/decimals and independent configured RPCs require verification; generated JAGA is not provenance. Unverified assets stay disabled. |
| C006 | Prices/fees | Signed-feed rejection/replay, seven-asset gas changes and three-family quote expiry pass locally. Actual feed and wider price/cost variants remain. |
| C007 | UI/wallets | Eight protocol preparations/seven wallet sends, narrow EN/FR, preferences and wallet-safe reload pass locally. Shared receipt/history/error/offline-language fixes pass locally; finish physical devices/wallets/accessibility. |
| C008 | Recovery | Exact encrypted restore, matching releases and database-bound approvals work. Retained pending ETH/SOL/SPL/TRC20 hashes recover locally. All seven member assets pass generated post-backup unknown-transfer reconciliation and fresh approved resumption. Missing off-chain intent cases, wider incidents and hosted drills remain. |
| C009 | Identity | Mainnet session/TOTP/recovery/refresh/logout, closed MFA limit and ingress checks pass locally. Finish actual Google/CAPTCHA, physical authenticator and broader permissions/rate/hosted acceptance. |
| C010 | Product | History, public activity and own-case pagination/read quotas pass locally. Continue the full current-PRD/public/admin/flags/accessibility audit. |
| C011 | Operations | Protected signing/scheduling and opt-in policy-bound automatic encrypted backups exist. Verify real alert receiver, schedule/storage monitoring and incidents/closure. |
| C012 | Capacity/cost | Local build/bundle budgets pass. Measure hosted/mobile latency, quotas and operating costs. |
| C013 | Observation | Actual14-day beta plus14-day initial-cap mainnet observation; none is recorded as elapsed acceptance. |
| C014 | Owner review | Countries/terms, funding/refund/closure model, custody and budget remain deferred. |
| C015 | Age | Server-date eligibility without retained DOB passes locally; hosted acceptance remains. |
| C016 | Preferences | Saved language, explicit EN/FR choice and timezones/DST pass locally; device/hosted acceptance remains. |
| C017 | Schedules/navigation | Native per-currency launch, fresh approvals/prices and database-time countdown/early denial work locally. Finish wider device/operation cases. |

## Current delivery

Branch `feat/remaining-phase-two-audit`, base PR90 merge `9c804c6ca2cb12eb74a35dc46f77180f022e1e78`. PR90 head0b0d4c0 passed push39129344339 / PR39129353472 before merge. P1-089–094 are merged. Current work extends post-backup recovery evidence; it does not imply hosted acceptance.

## Current verification

All procedures below use generated keys/contracts/providers, actual restricted PostgreSQL roles, SDK signatures, encrypted archives and worker→separate web settlement. They do not establish live provider/custody/provenance acceptance.

| Member asset | Full post-backup procedure under `post-backup-v87` | Independent integrity |
|---|---|---|
| ETH | `eth-unknown-r4` | `integrity-r4` |
| BNB | `bnb-unknown-r3` | `bnb-integrity-r3` |
| USDT BNB18 | `usdt-bnb-unknown-r2` | `usdt_bnb-integrity-check-r1` |
| Generated JAGA BNB18 | `jaga-bnb-unknown-r1` | `jaga_bnb-integrity-check-r1` |
| SOL | `sol-unknown-r2` | `sol-integrity-r2` |
| USDT SOL | `spl-unknown-r1` | `spl-integrity-r1` |
| USDT TRON | `tron-unknown-r1` | `tron-integrity-r1` |

**All seven pass:** pending encrypted-refund archive, fresh empty-target restore/exact verification, changed database/source-approval and old worker-key denial, unavailable-custody/missing-index holds, once-only saved-hash settlement without rebroadcast, unknown outgoing/incoming review, invalid confirmation/missing proof without accounting entries, typed company loss, full custody reconciliation, retained original-sender liability and one newly confirmed payout only after fresh target approvals/alert/price/custody. Source/archive remain unchanged. Independent reads verify attempts, gas, one loss/resolution, incoming liability and balanced journals; token cases also verify separate native-fee and token cash balances. Missing off-chain member intents are not reconstructed or marked paid.

- BNB/token models: archive tip128, new events129, depth15 cutoff146/tip160; fresh payout nonce3. Failed BNB r2 reproduces the old cutoff defect; r3 passes without resetting it.
- SOL/SPL: archive tip112, new signed events113, common finalized balance witness125; new payout126/finalized138. Existing ATAs are used for SPL; separate ATA creation/rent evidence remains below.
- TRC20: archive latest112/solid100, saved refund113, new events114, common solid witness125; fresh payout127/solid138, with valid earlier reference blocks.
- `sol-balance-boundaries-r1` passes13 SOL/SPL witness cases; `tron-balance-boundaries-r1` passes15 TRX/TRC20 cases. Sending stays disabled. Cases cover common newer cutoffs, differing heights/slots/balances/hashes, stale context, movement during TRON reads, malformed token balances and SPL decimals. A later balance cannot impersonate an earlier legacy cutoff.
- Retain every failed/weaker source and packet. Sol r1 was rejected on an occupied source name before mutation; USDT BNB r1 incorrectly expected one heartbeat pause instead of two registered assets. Corrected runs use fresh databases. Harness mistakes are not application defects.

PR90 required/build/bundle and production browser checks passed before merge. Earlier fee-variance, quote-expiry, signed-price, support-recovery and UI evidence remains in the [merged v91 status](https://github.com/nero1/onyiy/blob/9c804c6ca2cb12eb74a35dc46f77180f022e1e78/docs/PROJECT-STATUS_v91.md). This evidence-only batch needs docs/secrets/whitespace checks and both exact-head CI events before merge.

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
- Recovery contract4 checks exact schema/security/data and migration fingerprints. Old packets need matching original releases, then reviewed upgrades; never edit/re-sign packets. [SETUP](SETUP.md) and [handover](LLM-HANDOVER_v92.md) retain references/key-handling rules.
- Hashes bind actual database identity. Keep historical obligation/attempt snapshots. Rotate request/auth keys on restore, retain original MFA/custody/payload keys, reconcile chains and obtain fresh approvals/alert acknowledgements before publication.
- Preserve all failed/successful financial fixtures, archives and keys. Corrections use fresh targets. SPL’s inherited console captions contain an old amount typo; integer assertions/rows are authoritative. Prior failed harness/transport/index/cache attempts remain in their original roots.
- Five core guides plus two requested versioned trackers. Keep current facts concise; history is in Git. Both CI events must pass the exact final head before merge. Named manual procedures/required checks are authorized; broad automated suite remains deferred. Continue without approval pauses; do not claim100%.

v92
