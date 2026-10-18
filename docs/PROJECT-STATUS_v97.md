# Project status v97

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
| C008 | Recovery | Exact encrypted restore, matching releases and database-bound approvals work. Retained pending ETH/SOL/SPL/TRC20 hashes recover locally. All seven member assets pass generated post-backup unknown-transfer reconciliation and fresh approved resumption. Conservative registered-wallet/no-intent handling and intake-only pause also pass. Chosen incident/closure and hosted drills remain. |
| C009 | Identity | Mainnet session/TOTP/recovery/refresh/logout, closed MFA limit and ingress checks pass locally. Finish actual Google/CAPTCHA, physical authenticator and broader permissions/rate/hosted acceptance. |
| C010 | Product | History, public activity, own-case paging, privacy exports and notification ownership/paging/priority-adjustment checks pass locally. Continue the full current-PRD/public/admin/flags/accessibility audit. |
| C011 | Operations | Protected signing/scheduling and opt-in policy-bound automatic encrypted backups exist. Verify real alert receiver, schedule/storage monitoring and incidents/closure. |
| C012 | Capacity/cost | Local build/bundle budgets pass. Measure hosted/mobile latency, quotas and operating costs. |
| C013 | Observation | Actual14-day beta plus14-day initial-cap mainnet observation; none is recorded as elapsed acceptance. |
| C014 | Owner review | Countries/terms, funding/refund/closure model, custody and budget remain deferred. |
| C015 | Age | Server-date eligibility without retained DOB passes locally; hosted acceptance remains. |
| C016 | Preferences | Saved language, explicit EN/FR choice and timezones/DST pass locally; device/hosted acceptance remains. |
| C017 | Schedules/navigation | Native per-currency launch, fresh approvals/prices and database-time countdown/early denial work locally. Finish wider device/operation cases. |

## Current delivery

Branch `feat/readable-account-notices`, base [PR95](https://github.com/nero1/onyiy/pull/95) merge `6b34d38`. PR95 heade91df14 passed push39151673015 / PR39151693398. P1-100 renders moderation status as readable EN/FR copy; P1-101 translates retained profile-change templates in both directions. Stored messages/API/schema/finances are unchanged.

## Current verification

`account-notices-v97/fixture-r1` generates actual suspend/restore notices through real jobs, restoring active access with unchanged financial fingerprints. `browser-baseline-r2` reproduces English raw action/status JSON; `browser-fixed-r2` verifies readable EN/FR moderation state in production Chromium390px. `profile-baseline-r1` reproduces a French-authored profile notice under English display; `profile-fixed-r2` verifies both selected languages, narrow layout and preservation of authored staff/unknown messages. `integrity-r2` confirms original-source financial hashes and retained raw JSON/French bodies. Preserve baseline r1's fixture mistake: it selected a gift notice rather than the account notice. Required/build/bundle checks pass locally; GitHub records final CI/merge.


`own-data-v96/contract-r1` passes all twelve personal-data sections, genuine-session/CSRF encrypted export/replay, foreign download denial, bounded JSON/CSV capture metadata, suspended access and deleted-account chunk cleanup. Four financial fingerprints remain unchanged.

`priority-baseline-r2` reproduces correct serving-order changes with no member notice. `priority-fixed-r4` passes bump/revoke, no-op/exact retry/changed-body conflict, priority bootstrap creation/removal, transaction rollback and eight EN/FR notices delivered once through actual jobs. Joining numbers stay fixed; private staff reasons stay out. `priority-disabled-r1` queues nothing for disabled priority. `browser-priority-r1` passes actual delivered notices and current-language rendering in production Chromium390px EN/FR. `integrity-r2` compares the original source and seven retained audit copies: all four financial table fingerprints match; eight notices exist exactly once in the final target. Baseline r1 failed only because it requested an ownership-protected rank as admin; fresh r2 uses each real beneficiary's context. All fixtures remain retained. Required/build/bundle checks pass locally; GitHub records final CI/merge.


`account-permissions-v95/contract-r1` reproduces deletion's paired-age constraint failure; fresh `contract-fixed-r1` passes suspension/session revocation, own balances/cases/appeals, ban/restore, moderator restrictions, deactivated-state restoration and private-content deletion with unchanged financial fingerprints. `deleted-support-r3` passes actual original-wallet proof, encrypted-worker/separate-web payout and private receipt for a deleted member without restoring login/public identity; residual unused fees remain owed. Failed fixtures remain retained.

`publication-baseline-r1` reproduces suspended own-consent403 and missing balance metadata. Fresh `publication-fixed-r1` passes opt-out/exact replay, changed-replay conflict, denied opt-in/new money actions and unchanged four financial fingerprints. `browser-fixed-r1` passes production Chromium390px EN/FR exact ETH amount/asset/network display. Required/build/bundle checks pass locally; GitHub records final CI/merge.


`notification-audit-v94/contract-r1` passes actual restricted paging of201 same-microsecond notices, cursor actor/limit/tamper binding, foreign RLS/read/seen denial, idempotent read, inbox-view/read distinction, monotonic seen markers, new red dot and disabled-feature denial. `browser-baseline-r1` reproduces a stale error after successful mark-read; `browser-fixed-r1` verifies actual HTTP200 read/page retries clear recovered errors, EN/FR translation, retained read/history state and390px layout. `integrity-r1` confirms four financial table fingerprints remain identical to the source across contract/baseline/fixed clones. Required/build/bundle/docs/secrets/whitespace checks pass. Preserve original fixtures.


`post-backup-v87/eth-missing-intent-r1` passes an unknown outgoing transfer to an archived registered member wallet: no inferred withdrawal/debit/receipt; explicit company loss preserves member balances/cycles/points; one later freshly approved payout produces exactly one own receipt, excluding the unknown hash. Source/archive remain unchanged. This verifies conservative handling, not reconstruction of a missing request. Fresh `eth-missing-intent-r3` additionally passes normal plan-pause/replay/conflict, unchanged financial rows/configuration hash, blocked new checkout and actual encrypted-worker settlement of the previously approved payout while the plan remains paused. `missing-intent-incident-integrity-r1` independently verifies accounting, one own receipt excluding the unknown hash, preserved raw recovery history/current unresolved separation, original-sender liability and exactly one pause audit. Retain failed r2: a fixture variable shadow stopped its new-intake assertion after the real pause, leaving its payout approved; no reset or application bypass was used.


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
- Recovery contract4 checks exact schema/security/data and migration fingerprints. Old packets need matching original releases, then reviewed upgrades; never edit/re-sign packets. [SETUP](SETUP.md) and [handover](LLM-HANDOVER_v97.md) retain references/key-handling rules.
- Hashes bind actual database identity. Keep historical obligation/attempt snapshots. Rotate request/auth keys on restore, retain original MFA/custody/payload keys, reconcile chains and obtain fresh approvals/alert acknowledgements before publication.
- Preserve all failed/successful financial fixtures, archives and keys. Corrections use fresh targets. SPL’s inherited console captions contain an old amount typo; integer assertions/rows are authoritative. Prior failed harness/transport/index/cache attempts remain in their original roots.
- Five core guides plus two requested versioned trackers. Keep current facts concise; history is in Git. Both CI events must pass the exact final head before merge. Named manual procedures/required checks are authorized; broad automated suite remains deferred. Continue without approval pauses; do not claim100%.

v97
