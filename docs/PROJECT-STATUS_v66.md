# Project status v66

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
| C016 | Display time zones | Saved user preferences, default Lagos, admin override and explicit UTC launch inputs implemented. DST/API checks pass; fix saved-language restoration on login and finish browser acceptance. |
| C017 | Product navigation/idle preview | Enabled-currency browsing/idle rotation and keyboard return implemented. Actual390px EN/FR browser checks pass; native scheduled launch still uses the GIV-only launcher; scheduled presentation and remaining dashboard layout need completion. |


## Current batch

- Branch `feat/native-write-scope`; PR64 merged at `dfe3c1be435543ccbc04eccec21e6a0fb05f5ec2` after exact-head push39044213842 / PR39044236038 passed.
- Native payment writes, fee accounting, operating funding, treasury sweeps, liability recovery, reorg and recovery scans capture and validate their transaction environment. Withdrawal balances and recovery scans no longer rewrite it. Registry filters, retained keys, statements and records use captured scope.
- Signed prices bind the signed document environment to the selected transaction; a valid cross-environment signature is rejected. Alerts/reminders/daily settlements use their selected namespace and matching registry; simulation alerts retain simulation budgets and payloads.
- `native-write-v66/scope-and-prices-r5.mts`:39 restricted-login scope rejections, unchanged retained hashes after denials,42-unit fee journal exactly once/replay/conflict and signed-price binding. Earlier failed harness/import/order fixtures remain intact. Simulation signed-webhook evidence is tracked below.
- No DDL, installer, execution-flag or owner acceptance changes. Mainnet activation remains unfinished. Continue actual runtime/signer/UI integration and the full C001–C017 list after merge; also complete native scheduling, saved-language restoration and browser recovery operation.


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


Current proof: `/workspace/work/native-read-v64/plan-and-scope-r3.mts` and `simulation-regression-r1.mts`. Failed r1 generated-registry fixture is preserved. PR62 passed push39026765895 / PR39026798890 before merging. Mainnet archive evidence remains in the v63 Git history and bug trackers.

v66

## Unsigned preparation and signer checks (v65)

- Mainnet preparation now estimates fees and builds unsigned transfers through a frozen capability with no broadcast method. Private RPC guards block sending even if caller options or public getters change. Ordinary mainnet execution remains disabled.
- Signer validation rejects changed EVM gas fields, extra Solana instructions/account metadata, unapproved associated-account costs, and altered TRON permissions, attached assets, signatures, expiry or energy caps. TRON checks its network reference before opening a key file.
- Local protocol fixtures cover eight asset/network combinations; generated token addresses are not live provenance evidence. Actual encrypted testnet-key signing reproduces historical EVM/Solana bugs and verifies corrected signatures. No real funds or external broadcast.
- Evidence: `unsigned-mainnet-v65/preparation-r5.mts`, `signer-validation-r2.mts`, `tron-reference-before-key-r1.mts`, `evm-execution-regression-r1.mts` and `observation-regression-r1.mts`. Failed first signer harness/import fixture is preserved. No DDL or installer changes.
- Continue directly with actual mainnet runtime/signer integration and C001–C017 after checked merge; this prerequisite does not complete payment support.

Simulation alert regression: `native-write-v66/simulation-alerts-r1.mts` passes actual restricted-login simulation payload/budget selection, signed local HTTP delivery and acknowledgement, no duplicate dispatch, and a forged acknowledgement retained as failed. Financial hashes remain unchanged. Generated local webhook/key only.
