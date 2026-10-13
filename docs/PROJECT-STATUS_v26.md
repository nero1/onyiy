# Phase One implementation status

Updated: 13 October 2026. **88.55% implemented / 11.45% remaining.** Weighted implementation estimate; hosted/live acceptance and release authorization remain separate.

**Owner directive:** continue all M0–M8 irrespective of M1/M2 or earlier acceptance, toward 100% in as few substantial verified iterations as practical. Do not pause after this batch or enable unverified external sending.

| Milestone | Weight | Implementation | Contribution | Remaining implementation |
|---|---:|---:|---:|---|
| M0 schema/config/runtime | 10% | 98% | 9.80% | Final scale/archive coverage |
| M1 GIV money/queues | 15% | 99% | 14.85% | Final consolidated checklist |
| M2 identity/permissions | 15% | 98% | 14.70% | Final recovery/provider procedure review |
| M3 first testnet adapter | 15% | 84% | 12.60% | Reorg/checkpoint reconciliation, unmatched inflow, sweeps/hot caps |
| M4 responsive product | 15% | 94% | 14.10% | Native paginated history/receipts, complete staff/browser accessibility |
| M5 administration/portability/recovery | 10% | 89% | 8.90% | Selected-user/site portability UI and cold reconciliation |
| M6 remaining adapters | 8% | 85% | 6.80% | Operational TRX and complete recovery/provider contracts |
| M7 bounded prototype | 7% | 40% | 2.80% | Implementation budget/capacity tooling; hosted measurements deferred |
| M8 financial acceptance tooling | 5% | 80% | 4.00% | Reorg/checkpoints/sweeps and final operational checklist |

## v26 verified behavior

Signer claiming and persistence recheck live account, consent, original wallet/revision/cooling, quote expiry, immutable sender, current policy/configuration, beneficiary custody and conservative native gas reserve. Confirmed reviewed recovery may pay a banned/deleted financial UUID only to its retained original verified wallet. Signer gets a boolean owner fence, no identity or authentication-factor reads.

EVM replacement preserves sender/network/nonce/recipient/principal/calldata/gas limit. It waits the configured block interval, requires a 10% bump, obeys approved variance/attempt/daily/custody limits and persists one successor under concurrent workers. Nonce advances only for initial persistence. Workers observe every known hash before rebroadcast/replacement; one canonical winner supersedes competing same-nonce attempts with zero expense. Historical outgoing proofs use the immutable original treasury sender after configuration rotation.

SOL/TRON expiry requires positive absence from both independently pinned providers and finalized height/time beyond immutable validity. Outage, contradiction, observed transaction or insufficient finality preserves holds. The application independently records permanent expiry proof before restricted signer metadata can close. Full held funds return once with zero fee when every attempt is positively expired; a new consented quote is required. Actual gas is booked once; excess approved-variance expense is reclassified without a second cash debit or extra member charge.

CAPTCHA challenges bind environment/account/family/surface and expire in five minutes. Dummy is simulation-only; Turnstile uses bounded HTTPS verification with hostname/action/challenge binding. Hash-only one-use proof allows only the identical business request replay. Consent supports pending accounts; checkout challenges follow private deduplicated abuse signals without changing money, eligibility or priority. Provider UI/SDK loads lazily and proof stays in component memory. Real Turnstile credentials remain deferred.

Last-admin maintenance requires owner binding/authority, disabled workers, reviewed external identity case, typed confirmation and permanent payload-bound replay. It resets factors/revokes families without assigning a new identity/role. Verified original-wallet liability recovery has fresh staff MFA routes, exact immutable statement/costs, signature-hash confirmation, once-only hold/settlement, safe unsigned cancellation and retained deletion tombstone. Temporary statement links are token-hashed, expiry-bound, excluded from archives and reveal only a closed statement projection; confirmation/cancellation closes reads. Claimant UI removes the URL fragment, signs ownership only and persists no approval.

## Actual evidence and limitations

Named work probes passed: v26-evm-replacement; replacement-store; expiry-r3; sol-expiry-resume; gas-variance; bot; bot-browser-r2; last-admin-isolated-r5; liability-recovery-final; recovery-caps-r2; recovery-browser-r2. Generated local RPC and keys demonstrate contracts, not actual custody, chain broadcast, hosted login or external claimant identity review. Browser recovery uses a named intercepted statement projection; backend capability permissions/expiry/closure are checked independently. Preserve all stopped fixtures and first failures.

Auto-review rejected resetting account security on existing gw_v25_native. That action was not retried: last-admin verification passed in fresh gw_v26_staff_recovery_isolated with generated accounts only. Existing partially prepared MFA evidence remains preserved. Early liability fixtures lacking a provisioned gas asset retain their approved unsigned holds. Fresh final fixture includes independently verified generated native reserve and original-wallet settlement. Cap probe's first assertion assumed lowercase rather than checksummed destination; the source was retained and a fresh corrected probe passed.

Current 69 Drizzle tables/migrations001–052 have migration-local RLS/grants; 59 retained tables are in work/backups/v26-native.gwbackup. Exact inactive gw_v26_native_restore matches rows/schema/RLS/grants and skips all applied migrations. Earlier v25 archive remains bound to its original revision; restore matching code then migrate forward. Sources, signed attempts, failed fixtures and prior archives remain intact. Authentication sessions/challenges/capabilities do not transfer.

check:all, production build, generated Drizzle check, grants/secrets and bundle reporting pass. Homepage193.91 KiB gzip/9scripts;109 EN/FR keys. Final-head push and PR CI both must pass before merge. No broad automated suite, actual wallet popup/provider deployment, hosted capacity, mobile installation or live acceptance is claimed.

## Continue immediately

Both web and signer implementation code gates remain false. Complete native reorg/checkpoint/cold-resume reconciliation, unmatched inflow recovery, protected sweeps/hot caps, operational TRX, native history/receipts/export, selected-user/site portability, public metrics/accessibility and final operational acceptance tooling. Finish these without waiting for milestone acceptance; update docs, PR/check/merge each substantial batch and keep going until 100%. Owner-deferred credentials remain independent release inputs.

v26
