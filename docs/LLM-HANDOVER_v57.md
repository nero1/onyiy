# LLM handover v57

## Current owner instruction

Complete the entire Phase One/Two product, including verified real-money mainnet and every missing feature. Do not stop at transparency implementation or a partial checklist. Continue code work without acceptance pauses; require actual evidence and owner-provisioned details for external activation. Read [PRD](PRD.md) §§29–33 and the complete [gap list](PROJECT-STATUS_v57.md) first.

## Active work

- Repository `nero1/onyiy`, branch `feat/signer-environment-fence` based on PR55 merge6b567dd8fa548c40fecc1bc44d1503a1a745a3d0.
- Private scratch `/workspace/work/production-v55` contains295 extracted requirement-bearing PRD lines and source research. Review every section; do not treat extraction or source reading as verified acceptance.
- Uncommitted first foundation: `FinancialEnvironment`, mainnet/testnet closed network bindings, environment-specific RPC/address suffixes and fingerprints. Registry parsing can stage mainnet records, but active adapters/runtime still deny mainnet until the complete financial release. Initial typecheck passed.
- C001–C017 in status/report/plan track the entire product; C006/C015/C016 now have locally verified implementations. Production recovery accepts no mainnet, many SQL/service/signer paths are testnet-specific, both readiness gates are false, and shared preview isolation is unfinished.
- The owner explicitly deferred ALL launch details to final testing: make code configurable, document every protected setting in SETUP, and continue without asking again. No hosted credentials are configured. Never ask for recovery phrases/private keys in chat.
- PRD requires14-day beta stability and14-day initial-cap observation; never invent elapsed monitoring. Record owner/external readiness separately from code, but do not use that distinction to call the overall product complete.

## Binding workflow

Use substantial related batches; exact-final-head push and pull_request CI must pass before merge; no direct main pushes. Keep five core docs plus two versioned trackers, renamed together. Concise beginner docs; SETUP uses researched browser clicks/manual whole-file SQL paste. Same provider accounts/resources preferred. No broad automated tests; named isolated manual procedures and mandatory checks remain authorized. Preserve failed fixtures/original financial sources and signed archives/keys. Do not activate sending before its implemented gates and real evidence pass.

## Prior verified work and tooling

PR51 completed Round One; PR52 later named rounds; PR53 Phase Two transparency and eight review fixes. Details remain in Git and trackers. PR53 head1fea99aeee7f68cbbf5c262ca8523204bd766322 passed push38989539011/PR38989542415. SQL000–004 must stay immutable after installation. Schema contractv54:96 tables/892 columns/298 checks/119 standalone indexes. Recovery inventory contract3 preserves timestamp microseconds; older archives require matching historical code, never re-signing.

Owned PostgreSQL cluster: `/workspace/work/shared-hosting-v50/pgdata`, TLS port55450; matching socket/certificate under that directory. Node22: `/workspace/work/tooling/node-v22.23.3-linux-x64/bin`; PostgreSQL tools: `/workspace/work/tooling/pg-tls/bin`. Stop/restart only the exact owned cluster with its port/socket/TLS arguments. Original failed `gw_v27_native_refund_isolated` must remain untouched.

## Latest implementation/evidence

- SQL005 is an unreleased draft built by `/workspace/work/production-v55/build-migration.py`. Current immutable fixture is `gw_v55_simulation_r5`; r1–r4 and all failed targets remain preserved. Existing SQL000–004 are unchanged. Never overwrite an installed receipt with modified bytes.
- Generated/model comparison passes:96 tables/897 columns/301 checks/119 standalone indexes, including normalized foreign keys/defaults. `schema-contract_v55.json` pins current source/migration hashes.
- SQL adds environment checks, target-aware helpers, active-mode RLS/write fences, safe promotion locks and least-privilege `gw_preview`. Actual retired-mode isolation and preview denial probes pass; preview application wiring is unfinished.
- Fixed-token pricing binds exact asset amount and source rate, stores actual USD reference and immutable mode, and supports unchanged-price resume. `fixed-price-r2-r5.mts` passed rollback-only service checks; no network/signing/funds.
- DOB eligibility uses server date, stores verification time/minimum only and preserves accrued-rights access. `birth-date-r1.mts` and actual `consent-api-r2.mts` pass; exact starter grant count is one.
- User preferences use self-only permanent replay keys and revision conflicts. Default Africa/Lagos, user/admin display zones and explicit UTC launch inputs are wired. `time-zone-r1.mts` and actual `preferences-api-r1.mts` pass, including DST ambiguity and unchanged balances.
- Binding metadata probes are service-only/actor-free/read-only, using endpoint scope and two actual fresh lock challenges. They never initialize the excluded copied nonce; ordinary contexts still initialize their own nonce when allowed.
- Recovery inventory is now contract4: contract3 timestamp precision plus permission-group attributes/membership. `production-foundation-v55-r1.gwbackup` and its key remain preserved. Fresh cross-cluster restore/verify passed with different logins on port55456; first failed target on55455 is retained. `role-drift-r1.mts` and `login-scopes-r2.mts` reject dangerous inheritance, extra roles and ADMIN memberships.
- New owned restore clusters under scratch `cross-host-r1`/`cross-host-r2` use ports55455/55456. Stop only those exact owned instances when finished; retain data. Source55450 remains in use. Certificate path is under shared-hosting-v50; never print its key.
- Mandatory check:all r2 passed. Original v3 packet rejection before target DDL passed (`old-packet-r1.mts`); source packet/key untouched. Earlier build/bundle r1 passed (homepage182.19KiB/200, API1.441MiB/3); final build r3 and bundle passed (homepage182.18KiB, API1.441MiB). Local evidence is not hosted acceptance.
- Automatic approval review rejected a broad environment replacement; it never ran. Do not retry/split that rejected edit to evade review. Proceed with safer targeted work after isolation/key proofs, keeping unfinished execution gates closed.
- Continue all C001–C017 work immediately after this foundation PR/merge. Audit translation keys, build compatibility/reload and browser-only recovery operations as part of C010/C011. Mainnet runtime, environment-bound key envelope, workers, preview app, UI and recovery remain unfinished. Owner inputs are deferred, not an excuse to pause coding or claim completion.


## Current v56 continuation

- PR54 is merged. Exact head934686ab388ad2da581f7ebaa16cb1760add4e7a passed push39012602186/PR39012617199; merge4757acf6aaa7de7b6d5080a6a37da7a28c6d46af. Do not reopen its source changes unnecessarily.
- Scratch `/workspace/work/custody-v56`: key-envelope-r1 passed eight closed network/environment cases, tamper/wrong-secret rejection, legacy compatibility/mainnet relabelling denial, private-buffer cleanup and symlink/public-mode rejection. This is packaging only; runtime execution gates remain unchanged.
- New key-envelope.ts version2 binds explicit environment/network/family/address under AEAD. Existing v1 files are accepted for testnet only. Offline sealing still obeys the original testnet-only scope. No mainnet worker/adapter was activated.
- Native currency preview uses a pure idle policy plus visibility/focus/reduced-motion/interactions and manual pause. Enabled assets only; invoice/withdrawal/active-cycle state stops rotation. Tiles navigate to cards and return focus. New currencyCopy literal keys join CI parity checks.
- currency-policy-r1 failed on CJS/ESM harness import; r2 fixes the harness and passes. Browser-r1–r4 failed due harness database mode/missing record-page data; r5 passed UI checks but falsely counted bot challenges as financial writes. r6 fixes those harness contracts and passes actual Chromium390px EN/FR rotation/focus/manual-choice/reduced-motion/existing-invoice/active-cycle/tile-return checks. Generated intercepted UI data is not financial/provider acceptance. Original attempts are preserved.
- Activity feed memo now includes display zone, fixing stale formatted dates after a zone change.
- Required check:all r2 passed; production build/bundle passed (homepage182.19KiB, API1.441MiB, all clients0.678MiB). Final exact-head dual CI/PR merge remain pending. Continue missing mainnet runtime/signing/workers/preview/recovery and complete every C-item after merging; owner inputs remain deferred.


- Browser-r6 passed actual production390px EN/FR currency selection, idle rotation, focus, reduced motion, existing-invoice and active-cycle guards, and tile/card keyboard return. Only bot-challenge requests occurred; no financial call, signing or broadcast. Data was generated/intercepted.
- Actual offline sealing tool passed five testnet bindings: v2 round-trip, private modes, retained input and existing-output refusal. This does not enable mainnet signing.


## Current v57 continuation

- PR55 merged: exact head7faa3ea1390f01bd4e6f4c6abdd013cfea2d7b64, push39013318377/PR39013331702; merge6b567dd8fa548c40fecc1bc44d1503a1a745a3d0.
- `fenceWorkerEnvironment` in deployment-mode.ts takes shared profile→mode locks before signer domain access, checks installed guard and active namespace. SignerStore captures assertIsolated's current environment and binds asset configuration/attempt persistence to it. assertIsolated STILL permits testnet only; both financial readiness flags remain false. No broad runtime enablement was attempted.
- Scratch `/workspace/work/signer-v57`: worker-fence-r1/r2 failed on intentionally guarded/invalid fixture profile edits; preserve them. Fresh r3/r4 use the existing fixture profile guard and a valid transparent configuration, prove inherited repeatable-read defaults are overridden, unsafe snapshots rejected, promotion lock contention, retired signer rejection and unchanged retained financial/work hashes. Its mainnet metadata fence is not actual mainnet runtime acceptance.
- New prepare-custody workflow is manual/trusted-main only, scoped to custody-testnet/custody-mainnet environment secrets. Generator accepts no DB, RPC or existing key; outputs four encrypted v2 files/public inventory, no plaintext key. One-day artifact retention requires owner backup. key-package-r1 passed actual generation in both environments, address/checksum/private-mode/overwrite/mixed-secret checks. Clean npm ci --ignore-scripts and the exact generation command passed on fresh copy r2 with a scratch cache. First copy failed because the sandbox forbids the default home npm cache; it remains preserved.
- Official current GitHub workflow/artifact/environment-secret UI documentation was fetched into scratch before updating SETUP. Five core docs plus two trackers remain the limit. Add final browser recovery and restore operations before considering setup complete.
- Both newly owned cross-host restore clusters (55455/55456) were stopped cleanly after successful evidence; their data/archive/key remain preserved. Source55450 remains running/in use.
- Required checks and build/bundle for v57 passed: homepage182.19KiB, API1.441MiB, all clients0.678MiB. Exact-head dual CI/PR merge remain pending. Continue mainnet worker/API selectors, custody/provider matrix, safe preview, recovery, full product audit and final single-state installer after this batch; do not stop at a merge.


- Clean install with lifecycle scripts disabled and the actual workflow generation command passed; actual GitHub hosted execution awaits protected setup secrets. Required checks/build/bundle passed locally.

v57
