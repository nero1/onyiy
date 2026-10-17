# LLM handover v55

## Current owner instruction

Complete the entire Phase One/Two product, including verified real-money mainnet and every missing feature. Do not stop at transparency implementation or a partial checklist. Continue code work without acceptance pauses; require actual evidence and owner-provisioned details for external activation. Read [PRD](PRD.md) §§29–33 and the complete [gap list](PROJECT-STATUS_v55.md) first.

## Active work

- Repository `nero1/onyiy`, branch `feat/production-completion` based on PR53 merge6c323dc43c45efa1957308e467ce06e7cc0b36c0.
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

v55
