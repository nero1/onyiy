# Project status v74

**Phase One/Two is incomplete.** Four mainnets/eight protocols are implemented; all seven member-asset procedures now cover incoming payments, refunds, withdrawals, company settlements and sweeps locally. Generated endpoints/contracts are fixtures. Actual providers, custody, hosted operation and observation periods remain unverified. Continue without milestone approval pauses; owner launch inputs are deferred to final testing.

## Remaining work

| ID | Area | Evidence and next work |
|---|---|---|
| C001 | Mainnet | Runtime, wallet/signing and seven-asset local lifecycle work. Finish edge cases and actual launch acceptance. |
| C002 | Shared database/preview | One active financial mode and public-only Preview pass locally. Verify hosted promotion/permissions. |
| C003 | Custody | Encrypted four-key package and isolated worker→separate web settlement work. Verify the actual protected host and keys. |
| C004 | Payment matrix | All seven basic lifecycles, company settlements and sweeps pass. Finish replacement/expiry/reorg/restart and remaining failure/account-setup variants. |
| C005 | Provenance | Owner must verify real contracts/mints/decimals and independent RPCs. Generated JAGA is not real provenance; keep unverified assets disabled. |
| C006 | Pricing | Fixed/derived activation, replay and signed-price checks pass locally. Verify actual feed operation and full price-change scenarios. |
| C007 | UI/wallets | Seven canonical sends/eight protocols, saved locale, narrow EN/FR and wallet-safe updates pass locally. Finish devices, actual wallets and accessibility review. |
| C008 | Recovery | Encrypted exact restore, matching releases, managed idle-session guard and database-bound approvals work. Known pending ETH recovery passes locally; finish other families, post-backup history reconciliation and hosted drills. |
| C009 | Identity/access | Verify real Google/MFA/CAPTCHA, permissions, rate limits and recovery end to end. |
| C010 | Product audit | Complete a current-PRD audit of queues/points/referrals/admin/data controls/flags/PWA/accessibility. Historical295-row checklist is not full current acceptance. |
| C011 | Operations | Protected signer/schedulers and opt-in automatic encrypted backups are implemented. Finish actual external alerts, schedule/storage monitoring and incident/closure acceptance. |
| C012 | Capacity/cost | Local bundle budgets pass. Measure hosted latency, mobile performance, quotas and compliant operating costs. |
| C013 | Observation | Actual14-day beta plus14-day initial-cap mainnet observation; no elapsed acceptance recorded. |
| C014 | Owner review | Countries/terms, funding/refund/closure, custody and budget remain owner-deferred. |
| C015 | Age | Server-date eligibility without retaining DOB passes locally; hosted acceptance remains. |
| C016 | Preferences | Saved language, explicit EN/FR choice, timezones/DST pass locally; finish device/hosted acceptance. |
| C017 | Navigation/schedules | Native per-currency scheduling, fresh approvals/prices, countdown and early-checkout denial pass locally. Finish broader device/operational acceptance. |

## Current delivery

Branch `feat/solana-tron-lifecycle`, based on PR72 merge `e9988f7ffc50b2babf356e078c4c08c1b15af169`. Its exact headf92f96e passed push39072511492 / PR39072520501. PR70 added managed restore/client compatibility; PR71 added policy-bound automatic backups; PR72 protected all wallet prompts from reload. Git history retains their detailed evidence.

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

v74
