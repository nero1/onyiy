# Project status v55

## Actual completion objective

The owner requires the full Phase One/Two product, including verified real-money support. PR53 completed transparency/local checks only. **The overall product is incomplete. No mainnet is activated.**

## Open delivery and acceptance list

| ID | Work | Current evidence / remaining work |
|---|---|---|
| C001 | Mainnet registry/configuration | Testnet-only validation and provider assumptions; staged registry foundations in progress. |
| C002 | Shared database and preview isolation | SQL mode/promotion fences and restricted preview role are locally verified. Preview application wiring and full production promotion remain open. |
| C003 | Signer and custody | Both implementation gates remain false; environment-bound keys, scoped worker access and verified activation remain open. |
| C004 | Payment/fee/recovery matrix | Every enabled asset needs inflow, withdrawal, business/refund/operating settlement, reorg, replacement/expiry and restart evidence. |
| C005 | Asset and RPC provenance | Verify all §30 assets/networks, two independent RPCs, token decimals/contracts/mints; JAGA needs owner input. |
| C006 | Pricing modes | Exact fixed-token activation, saved USD/rate reference, replay and unchanged-price resume pass locally. Full asset/lifecycle acceptance remains open. |
| C007 | Production UI and wallet support | Remove testnet-only catalog/wallet/history assumptions; verify all EN/FR disclosures, receipts and actual mainnet wallet approval. |
| C008 | Mainnet backup and recovery | Recovery currently accepts simulation/testnet only; verify exact production restore, chain reconciliation and no resend. |
| C009 | Hosted identity/access | Actual OAuth/MFA, restrictive roles, rate limits, CAPTCHA and account/financial recovery need hosted evidence. |
| C010 | Complete product acceptance | Check every feature/flag, queues, cooldowns, referrals/points, admin/moderation, exports/deletion, accessibility/PWA/offline and errors against §§1–29. |
| C011 | Deployment and operations | Secure hosted setup, external alerts, signer/scheduler heartbeats and incident/closure controls need actual operation evidence. |
| C012 | Capacity and cost | Measure mobile/latency/quota targets and select commercially permitted hosting within owner budget. |
| C013 | Observation periods | §30 requires14-day beta stability and14-day initial-cap mainnet observation; no elapsed evidence recorded. |
| C014 | Owner launch decisions | Launch countries/review, approved financial terms, funding/refund/closure model, custody and budget remain unresolved. |
| C015 | Age eligibility | Implemented server-date DOB eligibility without retaining DOB; actual cookie/CSRF API checks pass. Hosted browser acceptance remains open. |
| C016 | Display time zones | Saved user preferences, default Lagos, admin override and explicit UTC launch inputs implemented. DST/API checks pass; browser acceptance remains open. |
| C017 | Product navigation/idle preview | Verify and finish §18 currency browsing/idle rotation, focus-safe behaviour and all scheduled-plan presentation; current native portal has no currency rotation implementation. |

## Current work

- Branch `feat/production-completion`, based on merged PR53 (`6c323dc43c45efa1957308e467ce06e7cc0b36c0`).
- Extracted295 requirement-bearing PRD lines into private scratch for line-by-line audit. This is an inventory, not completed acceptance.
- Implementing environment-bound network registry validation and separate mainnet/testnet RPC/address selection. Type checking passed for the initial foundation. Execution remains blocked until isolation/signing/recovery are complete.
- No configured hosted runtime credentials or outbound identities are available in the current managed environment. The owner deferred all launch details to final testing. Do not ask again during coding; put the required fields in SETUP and continue independent implementation. Keys/passwords must use protected settings.
- Prior Phase Two exact-head CI passed: push38989539011 / PR38989542415, head1fea99aeee7f68cbbf5c262ca8523204bd766322. Its encrypted recovery and local named procedures remain valid for that release.

## Working rules

Keep going through the list without milestone acceptance pauses; create/merge PRs only after both exact-head CI events pass. Preserve original records, failed fixtures, signed archives and keys. No broad automated test suite. No percentage or production-ready claim without actual evidence. Dates/durations cannot be simulated into acceptance.

## Current isolated verification

- SQL005 is an unreleased draft; fresh r1–r5 fixtures preserve every applied receipt. Never apply changed draft bytes over an existing receipt. Existing000–004 stay unchanged.
- Eight native environment/network registry contracts passed; mainnet execution still explicitly denied.
- Fresh SQL000–005 install and actual owner seeder passed. Current simulation snapshots are read-only after acquiring the promotion fence. Promotion tests proved retired simulation cannot read users and retired testnet cannot write after mainnet initialization.
- Restricted preview SQL role can read public configuration/catalogue only; private users/ledger/signing tables and signer routines are closed. Application preview wiring is still pending.
- C006 fixed-token activation passed a rollback-only actual service procedure: exact1.5BNB, saved$300 reference/source rate, replay, mismatched input rejection and immutable pricing. No RPC call, signing, transfer or real funds were involved.
- Binding probe now has a narrowly scoped, actor-free, read-only path. Actual two-connection pre-seed binding passed; writes/actor scopes and mismatched owner/runtime databases were rejected.
- A broad automatic environment replacement was rejected by approval review and never applied. Continue targeted audited changes after prerequisite isolation/key proofs. Do not retry the rejected broad edit or turn readiness flags on to bypass unfinished work.

- Current generated-model comparison passes: **96 tables /897 columns /301 checks /119 standalone indexes**, matching SQL000–005.
- Recovery contract4 binds permission-group attributes/membership. A preserved encrypted archive restored and independently verified on another PostgreSQL cluster with different owner/runtime logins. Unsafe role inheritance/membership was rejected in rollback-only probes; the earlier failed restore target is retained.
- User preference API checks cover exact replay, stale/conflicting saves, invalid zones and self-only access; balances remain unchanged. DOB checks cover birthdays, leap days and minimum-age changes; the actual consent API grants starter GIV only once.

- An original contract3 signed archive is rejected before any target bootstrap/DDL/data under contract4. The new empty target and original archive/key are retained.

- Mandatory checks and final build/bundle passed: homepage182.18KiB gzip (limit200), API1.441MiB (limit3), all client chunks0.675MiB (limit2).

v55
