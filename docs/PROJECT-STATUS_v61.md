# Project status v61

**Phase One/Two is incomplete. Mainnet sending is disabled.** The owner requires the full real-money product, all missing features and actual verification. Continue without milestone approval pauses; defer owner setup details to final testing.

## Remaining work

| ID | Work | Current evidence / remaining work |
|---|---|---|
| C001 | Mainnet registry/configuration | Closed network registry and read-only mainnet observer verified locally; payment runtime/configuration still testnet-only. |
| C002 | Shared database and preview isolation | SQL mode/promotion fences and restricted preview role are locally verified. Restricted preview transaction/public projection pass locally; application wiring and full production promotion remain open. |
| C003 | Signer and custody | Version2 environment-bound key envelopes pass local checks; legacy keys remain testnet-only. Actual mainnet signer/store/worker activation remains open. |
| C004 | Payment/fee/recovery matrix | Every enabled asset needs inflow, withdrawal, business/refund/operating settlement, reorg, replacement/expiry and restart evidence. |
| C005 | Asset and RPC provenance | Verify all §30 assets/networks, two independent RPCs, token decimals/contracts/mints; JAGA needs owner input. |
| C006 | Pricing modes | Exact fixed-token activation, saved USD/rate reference, replay and unchanged-price resume pass locally. Full asset/lifecycle acceptance remains open. |
| C007 | Production UI and wallet support | Wallet domain/network/session proof binding and change audits verified. Complete mainnet catalog/history, EN/FR and real wallet acceptance. |
| C008 | Mainnet backup and recovery | Recovery currently accepts simulation/testnet only; verify exact production restore, chain reconciliation and no resend. |
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

- Branch `feat/public-preview-boundary`, based on PR59 merge `7e15ff1155720e43516e733927dd88411f5603a0`.
- A separate preview-only login now runs bounded, read-only snapshots. Checks reject unsafe memberships, ownership and private table/column/function grants before domain reads.
- Public configuration parses independently and rejects private/staff settings. Restricted-login procedures prove projection parity, simulation/mainnet public scopes, private-data/write/escalation denial and permission-drift rejection.
- Preview routes, deployment settings and browser acceptance remain open. This foundation does not enable mainnet payments.

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

v61
