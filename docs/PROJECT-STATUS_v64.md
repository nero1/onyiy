# Project status v64

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

- Branch `feat/native-read-scope`, based on PR62 merge `a02f9a542d76ba32e03fd977bff17d0672fd1431`.
- Fixed native plan creation/editing, which previously required a simulation GIV asset hidden by the active native namespace. Native edits now save disabled plan metadata; per-currency prices still require explicit gated activation. Simulation keeps its inactive GIV version behavior.
- Catalogue, portfolio, member records and receipts check the captured transaction environment instead of silently switching it. Registry/receipt filters use that verified scope; mismatches are rejected. Mainnet payment gates remain closed.
- Actual restricted-login procedures reproduce both old bugs and verify native creation/edit/replay/stale/role checks, simulation compatibility, namespace denial, timezone output and unchanged financial/work hashes.
- Remaining discovered work includes saved-language restoration on login and native scheduled launch: its generic launcher still uses simulation activation. Both remain on the list above.

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

v64
