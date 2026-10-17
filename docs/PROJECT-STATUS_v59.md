# Project status v59

## Actual completion objective

The owner requires the full Phase One/Two product, including verified real-money support. PR53 completed transparency/local checks only. **The overall product is incomplete. No mainnet is activated.**

## Open delivery and acceptance list

| ID | Work | Current evidence / remaining work |
|---|---|---|
| C001 | Mainnet registry/configuration | Testnet-only validation and provider assumptions; staged registry foundations in progress. |
| C002 | Shared database and preview isolation | SQL mode/promotion fences and restricted preview role are locally verified. Preview application wiring and full production promotion remain open. |
| C003 | Signer and custody | Version2 environment-bound key envelopes pass local checks; legacy keys remain testnet-only. Actual mainnet signer/store/worker activation remains open. |
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
| C017 | Product navigation/idle preview | Enabled-currency browsing/idle rotation and keyboard return implemented. Actual390px EN/FR browser checks pass; scheduled-plan presentation and remaining dashboard layout still need acceptance. |

## Current work

- Branch `feat/financial-worker-binding`, based on merged PR57 (`4be23e3290ac4503240f692aa2e622d1011a6578`).
- Extracted295 requirement-bearing PRD lines into private scratch for line-by-line audit. This is an inventory, not completed acceptance.
- Implementing environment-bound network registry validation and separate mainnet/testnet RPC/address selection. Type checking passed for the initial foundation. Execution remains blocked until isolation/signing/recovery are complete.
- No configured hosted runtime credentials or outbound identities are available in the current managed environment. The owner deferred all launch details to final testing. Do not ask again during coding; put the required fields in SETUP and continue independent implementation. Keys/passwords must use protected settings.
- Prior Phase Two exact-head CI passed: push38989539011 / PR38989542415, head1fea99aeee7f68cbbf5c262ca8523204bd766322. Its encrypted recovery and local named procedures remain valid for that release.

## Working rules

Keep going through the list without milestone acceptance pauses; create/merge PRs only after both exact-head CI events pass. Preserve original records, failed fixtures, signed archives and keys. No broad automated test suite. No percentage or production-ready claim without actual evidence. Dates/durations cannot be simulated into acceptance.

## Current isolated verification

- SQL005 was merged in PR54; its applied bytes are immutable; fresh r1–r5 fixtures preserve every applied receipt. Never apply changed draft bytes over an existing receipt. Existing000–004 stay unchanged.
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


## Current v56 batch

- PR54 merged after exact head934686ab388ad2da581f7ebaa16cb1760add4e7a passed push39012602186 and pull_request39012617199. It delivered the v55 foundations below; overall completion remains open.
- New encrypted-key format authenticates chain, environment, network and public address. Eight network/environment packaging checks passed, with tamper/wrong-secret/legacy relabelling rejection. Active mainnet signing remains denied; no funds or transactions were used.
- Key readers inspect/read the same private file descriptor and reject symlinks. Callback buffers are cleared. Existing encrypted testnet files remain compatible; original files are never rewritten.
- Native gifts now browse enabled currencies, with paired selectors, tiles, card navigation and explicit rotation pause. Rotation is denied during focus, reduced motion, recent interaction, checkout and active-cycle display. Currency label key parity is checked by CI.
- Corrected verified activity dates remaining in the previous zone after a display-zone change.


- Browser-r6 passed actual production390px EN/FR currency selection, idle rotation, focus, reduced motion, existing-invoice and active-cycle guards, and tile/card keyboard return. Only bot-challenge requests occurred; no financial call, signing or broadcast. Data was generated/intercepted.
- Actual offline sealing tool passed five testnet bindings: v2 round-trip, private modes, retained input and existing-output refusal. This does not enable mainnet signing.


## Current v57 batch

- PR55 merged after exact head7faa3ea1390f01bd4e6f4c6abdd013cfea2d7b64 passed push39013318377/PR39013331702.
- Signer transactions now hold profile/mode promotion locks before domain access. The captured environment binds configuration, key opening, asset reads and saved attempts. Mainnet runtime/signing remains denied.
- Fresh worker-fence-r4 proves promotion waits for a restricted signer transaction, then retired signing is denied before writes. Financial/work record fingerprints remain unchanged. Earlier failed fixtures are preserved.
- Browser-run custody preparation generates four independent unfunded keys into encrypted format2 packages. Actual packaging checks passed for both environments, derived addresses, private modes, checksums, overwrite denial and rejection of live credentials/weak secrets. It does not install keys or activate payments.
- Full dashboard/scheduled-plan acceptance, browser recovery, mainnet payment paths and every remaining C-item are still open. Final setup must also deliver the requested single final-state installer; existing signed histories/installed baselines cannot be rewritten.


- Clean install with lifecycle scripts disabled and the actual workflow generation command passed; actual GitHub hosted execution awaits protected setup secrets. Required checks/build/bundle passed locally.


## Current v58 batch

- PR56 merged after exact head4e8213e14bd64ad36b553539902a8db086743eaf passed push39014074144/PR39014104420.
- Added explicit observation adapters for Ethereum1, BNB56, Solana mainnet-beta and TRON mainnet. The public facade exposes no raw RPC/fee/build/broadcast methods. A closed transport allowlist also rejects mutation and unknown methods before dispatch. Default active mainnet adapters remain denied.
- Fixed remaining hardcoded Solana devnet checks in observation reads. Build/broadcast now recheck execution gates, including after adapter construction.
- Fixed TRON reporting dual-provider failure as wrong network. It now remains a transient RPC outage; actual contradictory network IDs are still rejected.
- Local generated RPC checks pass for four mainnet identities, wrong-network denial and read-only capability boundaries. Existing ETH/BNB fee/sign/exact-byte local broadcast and SOL/TRON common-cutoff checks pass. No external transfer or real funds were used.
- Live read probes remain unverified: corrected configured-provider probes received no usable responses. Official Ethereum/BNB/TRON/Tether pages returned403 here; no token provenance is accepted from those failed fetches. Native network fixtures are not live/provider acceptance.


- Current observation-r2 passes native balances and dual-provider outage classification on all four mainnets using generated local RPC fixtures. Required checks/build/bundle pass; live provider acceptance remains pending.


## Wallet scope and worker binding (v59)

- Fixed a reproduced TRON wallet-proof bug: a Nile challenge could silently create a Shasta link after registry changes. Proofs now recheck the exact original domain, environment, network, account and session; changed destinations receive an atomic audit record.
- Shared the existing v1 worker-signature format across receiver, signer and scheduler. Environment, purpose, route and exact body bytes are authenticated; signer inputs must match the captured worker scope. Mainnet execution remains disabled.
- Named isolated procedures in `/workspace/work/financial-v59`: `wallet-before-fix-r1` reproduces the old bug; fresh `wallet-scope-r2` proves rejection, successful fresh linking, two exact audit/archive identities and unchanged financial hashes; `worker-binding-r2` proves compatibility, byte binding, replay/clock/scope rejection and unchanged financial hashes. Failed r1 harness fixtures are preserved. No RPC transfer or real funds.

v59
