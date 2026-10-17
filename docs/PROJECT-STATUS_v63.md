# Project status v63

**Phase One/Two is incomplete. Mainnet sending is disabled.** The owner requires the full real-money product, all missing features and actual verification. Continue without milestone approval pauses; defer owner setup details to final testing.

## Remaining work

| ID | Work | Current evidence / remaining work |
|---|---|---|
| C001 | Mainnet registry/configuration | Closed network registry and read-only mainnet observer verified locally; payment runtime/configuration still testnet-only. |
| C002 | Shared database and preview isolation | SQL mode/promotion fences and restricted preview role are locally verified. Restricted preview transaction/public projection pass locally; Application wiring passes local API/browser checks; hosted acceptance and full production promotion remain open. |
| C003 | Signer and custody | Version2 environment-bound key envelopes pass local checks; legacy keys remain testnet-only. Actual mainnet signer/store/worker activation remains open. |
| C004 | Payment/fee/recovery matrix | Every enabled asset needs inflow, withdrawal, business/refund/operating settlement, reorg, replacement/expiry and restart evidence. |
| C005 | Asset and RPC provenance | Verify all §30 assets/networks, two independent RPCs, token decimals/contracts/mints; JAGA needs owner input. |
| C006 | Pricing modes | Exact fixed-token activation, saved USD/rate reference, replay and unchanged-price resume pass locally. Full asset/lifecycle acceptance remains open. |
| C007 | Production UI and wallet support | Wallet domain/network/session proof binding and change audits verified. Complete mainnet catalog/history, EN/FR and real wallet acceptance. |
| C008 | Mainnet backup and recovery | Mainnet encrypted backup/restore/exact verification pass locally, including original v55 archive compatibility. Complete browser operation, chain reconciliation, no-resend and hosted acceptance. |
| C009 | Hosted identity/access | Actual OAuth/MFA, restrictive roles, rate limits, CAPTCHA and account/financial recovery need hosted evidence. |
| C010 | Complete product acceptance | One-paste final-state installer verified and merged. Check every feature/flag, queues, cooldowns, referrals/points, admin/moderation, exports/deletion, accessibility/PWA/offline and errors against §§1–29. |
| C011 | Deployment and operations | Secure hosted setup, external alerts, signer/scheduler heartbeats and incident/closure controls need actual operation evidence. |
| C012 | Capacity and cost | Measure mobile/latency/quota targets and select commercially permitted hosting within owner budget. |
| C013 | Observation periods | §30 requires14-day beta stability and14-day initial-cap mainnet observation; no elapsed evidence recorded. |
| C014 | Owner launch decisions | Launch countries/review, approved financial terms, funding/refund/closure model, custody and budget remain unresolved. |
| C015 | Age eligibility | Implemented server-date DOB eligibility without retaining DOB; actual cookie/CSRF API checks pass. Hosted browser acceptance remains open. |
| C016 | Display time zones | Saved user preferences, default Lagos, admin override and explicit UTC launch inputs implemented. DST/API checks pass; browser acceptance remains open. |
| C017 | Product navigation/idle preview | Enabled-currency browsing/idle rotation and keyboard return implemented. Actual390px EN/FR browser checks pass; scheduled-plan presentation and remaining dashboard layout still need acceptance. |


## Current batch

- Branch `feat/mainnet-recovery-boundary`, based on PR61 merge `cfac359822890544c963426a9b70bc54893f8c8c`.
- Recovery uses a separate maintenance boundary with disabled signing/scheduling, fresh owner/runtime binding proofs and read-only runtime checks. Web mainnet execution remains disabled.
- Encrypted mainnet backup/restore/independent verification pass for all83 retained tables. Fresh testnet backup/restore and the original v55 signed simulation archive also pass without rewriting packets or keys.
- Inventory now checks initialized environments as well as assets, rejecting retired/mismatched modes before backup. Wrong packet environment and wrong database binding are denied before target DDL.
- Recovery waits for its own closing proof sessions before the unchanged empty/inactive-target guard. The first failed compatibility target is preserved. Cleanup zeroes the archive key before attempting all releases.
- Browser-based owner recovery workflow, hosted restore, chain reconciliation/no-resend and the remaining payment/product work stay open.

## Recent verified deliveries

| Delivery | Evidence |
|---|---|
| PR54–57: environment fences, DOB/preferences, fixed-token pricing, custody envelopes/workflow, signer promotion fencing and read-only mainnet observation | Named isolated procedures and exact-head CI; details retained in Git history |
| PR58: wallet proof/audits and exact-byte worker envelopes | Historical bug reproduced; fresh restricted-login checks pass; push39023906817 / PR39023923825 |
| PR59: one-paste final-state installer |4222 reference entries match;4088 application entries match under broad defaults; atomic rollback, nonempty/rerun protection, seeding/runtime checks pass; push39024411492 / PR39024431447 |
| Current preview foundation | `/workspace/work/public-preview-v61/boundary-r4.mts` and `boundary-r5.mts`; failed r1 harness fixture preserved |

## Delivery rules

- Keep five core guides plus the two versioned bug trackers. Update current facts concisely; retain old versions in Git.
- Both push and pull-request CI must pass for the exact final head before merge. No direct main pushes.
- Preserve original financial records, failed fixtures, signed archives and keys. Never reset a failed fixture to manufacture success.
- Named isolated procedures and mandatory checks are authorized; the broad automated suite remains deferred.
- No hosted credentials are configured here. Document protected settings in SETUP; do not ask again during independent coding or invent hosted/live acceptance.
- §30 requires14-day beta stability and14-day initial-cap observation. Do not fabricate elapsed evidence or claim a completion percentage.


## Read-only preview app evidence (v62)

`/workspace/work/public-preview-app-v62`: `api-r2` proves actual mainnet public reads,39 private/auth/job route denials, write/signing denial and unchanged retained hashes. `browser-r1` and final `browser-r2` prove actual production Chromium390px EN/FR catalogue/help/search, banner, public-only navigation, unavailable private pages/API and noindex; no response interception. `credential-scope-r1` rejects21 private credential names; `hosted-preflight-r1` accepts the restricted login and rejects owner login/mode mismatch. r1 API harness failure used the unsupported mainnet recovery inventory; preserved, then r2 hashes the unchanged simulation fixture outside request execution. The archive gap from that release is addressed by v63; chain reconciliation remains unfinished. PR60 passed push39024849840 / PR39024875695 before merging.


## Mainnet archive evidence (v63)

`/workspace/work/mainnet-recovery-v63`: `readonly-boundary-r1` verifies binding, read-only scope, write/downgrade denial and unchanged hashes; `archive-r2` backs up/restores/verifies83 retained tables. `testnet-and-final-mainnet-r1` verifies fresh testnet backup/restore plus the original mainnet packet on another fresh target. `legacy-and-guards-r2` restores/verifies the original v55 packet and rejects retired scope, signed environment mismatch and wrong-database binding. Its failed r1 target/logs remain preserved; proof-backend shutdown is now awaited without terminating other clients or weakening target guards. `worker-regression-r1` verifies ordinary worker/context behavior after extracting the unchanged role checks. No RPC, signer, broadcast or real funds.

Original mainnet packet/key: `mainnet-isolated-r2.gwbackup` / `mainnet-isolated-r2.key` (raw32-byte key; its harness encodes it only inside the protected process); original v55 packet/key remain at their handover paths. Browser recovery workflow and mainnet chain reconciliation/no-resend remain open. PR61 merged after push39025742213 and PR39025758110 passed for a7e16c713f9fa3b35f0cfe02dfafd22c6b2e6049. Continue the full product after the next checked merge.

v63
