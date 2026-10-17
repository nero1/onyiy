# LLM handover v65

## Owner direction

Complete **all Phase One/Two**, including real-money mainnet and every unfinished feature. Keep working through [the full gap list](PROJECT-STATUS_v65.md) without milestone pauses. Read [PRD](PRD.md) §§29–33. Owner launch details are deferred to final testing; document them in SETUP and continue independent coding. **The product is incomplete; mainnet sending remains disabled.**

## Current work

- Repository `nero1/onyiy`; branch `feat/unsigned-mainnet-preparation`, based on PR63 merge `bb9898edbe62571f704e405051e9a82aafd1210e`.
- Native plan metadata creation/editing no longer requires a GIV simulation asset. Native saves remain disabled with no asset price version until gated per-currency activation. Simulation still creates its inactive GIV version.
- Native catalogue/portfolio/member-record/receipt reads validate the transaction environment and never rewrite it. Wrong scopes are rejected; receipt/registry filters use captured scope. Portfolio user output includes saved timezone.
- Named `/workspace/work/native-read-v64/plan-and-scope-r3.mts` reproduces both old bugs and passes real restricted-login plan/replay/stale/role/scope checks with unchanged financial hashes; `simulation-regression-r1.mts` preserves exact GIV pricing/audit identity. Failed r1 used an invalid generated finality mode and is preserved.
- **Next:** finish actual mainnet signing/execution and all C-items. Also fix saved server locale not applied on login, native scheduled launch (generic `activateDuePlans` calls GIV-only `activatePlan`), scheduled native catalogue visibility and remaining dashboard layout. Do not mistake plan metadata CRUD for completed native scheduling.
- Read-only Preview application is merged (PR60–61): Preview-only `PUBLIC_PREVIEW_MODE=read_only`, separate `gw_preview` login, no private credentials. Public catalogue/configuration/help/search and noindex are locally verified in actual production Chromium390px EN/FR. Private/auth/job/write paths are closed before handlers. Protected workflow skips owner initialization; hosted acceptance remains open.

## Financial boundaries and pending implementation

- `runtimeProviders` accepts mainnet only in explicit public read-only preview; `nativePaymentEnvironment` still denies mainnet execution. `financialImplementationComplete` and signer `implementationComplete` remain false. Do not flip flags to claim completion.
- `assertIsolated`, signer EVM ID allowlist, many financial APIs/UI paths and chain recovery still need mainnet implementation. Mainnet encrypted archive/restore now pass locally through the separate maintenance boundary. Read-only observation is separate from payment support.
- Automatic approval previously rejected a broad mainnet replacement before isolation/signing/recovery evidence. Do not replay or split that rejected edit to evade review. Continue targeted changes with proved prerequisites and unchanged execution gates.
- Registry has closed network bindings; explicit observer facades cannot build/broadcast. DualRpc authenticates exact serialized read requests. Live public-provider probes failed; no live acceptance or invented token contracts. JAGA provenance remains owner-deferred.
- Key envelopes v2 bind chain/environment/network/address; v1 remains testnet-only. Private files use same-descriptor reads, no symlinks and mode0600. The manual custody package workflow generates new unfunded keys offline; final host installation/import/operation still needs completion.
- Worker signatures retain exact v1 byte format across receiver/signer/tick. Wallet proofs recheck the canonical domain/environment/network/account/session message; changed destinations receive atomic audits.

## Schema and recovery

- Fresh owners paste only `packages/db/fresh-install.sql` via SQL Editor. It creates final definitions directly and records all six original receipts. Existing SQL000–005 bytes must remain immutable. The unchanged migration runner skips matching receipts.
- `schema-contract_v60.json`:96 root tables/897 columns/301 checks/119 standalone indexes. Installer and declaration hashes are pinned. Reverify catalog equivalence and refresh the installer after future DDL.
- Recovery inventory contract4 preserves timestamp microseconds and closed role attributes/membership. Old v3 archives need PR53 release `6c323dc43c45efa1957308e467ce06e7cc0b36c0`; v2 needs `25a507` release. Never re-sign old archives.
- Preserve `/workspace/work/production-v55/production-foundation-v55-r1.gwbackup` and `cross-host-r1/archive.key`. Failed target55455 and successful restored/verified target55456 are stopped with data retained. Different owner/runtime login recovery passed.
- `worker_requests` is excluded from retained backup rows. New audits add `archive_record_keys`; verify exact expected audit identities rather than falsely requiring that table unchanged.

## Workspace and verification

- Node22: `/workspace/work/tooling/node-v22.23.3-linux-x64/bin`; PG tools: `/workspace/work/tooling/pg-tls/bin`.
- Owned source cluster55450: `/workspace/work/shared-hosting-v50/pgdata`, matching socket/certificate there. Restart only this exact owned instance with its port/socket/TLS arguments. Never read private TLS keys.
- Current verified foundation fixture `gw_v55_simulation_r5`; all failed r1–r4 and original `gw_v27_native_refund_isolated` remain untouched. Single-installer fixtures are under `/workspace/work/final-installer-v60`.
- PR58 exact head0205508 passed push39023906817 / PR39023923825. PR59 headc33abc4 passed push39024411492 / PR39024431447. Do not stop after the next merge.
- Use scratch npm caches; local ports/tsx IPC need network permission. Git writes need the repo `.git` write grant. No hosted credentials/runtime variables are configured.

## Working rules

Both exact-head CI events must pass before merge; no direct main pushes. Keep five core docs plus two trackers, versioned together; concise beginner browser-only SETUP/manual SQL. Prefer the same provider accounts/resources. Preserve sources, failed fixtures and signed evidence. No broad automated suite yet. User times default to Africa/Lagos. Required14-day observation periods cannot be simulated into acceptance.


## Latest recovery evidence

PR62 merged after push39026765895 / PR39026798890 passed. Recovery has a separate maintenance boundary and read-only runtime checks; ordinary web mainnet execution is still denied. Mainnet backup/restore/independent verification preserves83 retained tables. Testnet and the unchanged original v55 signed archive pass, including retired-mode/wrong-packet/wrong-database denials. Original source, failed first compatibility target and all packets/keys remain under `/workspace/work/mainnet-recovery-v63`. Mainnet packet/key `mainnet-isolated-r2.gwbackup` / `mainnet-isolated-r2.key` (raw32 bytes; harness encodes privately). Browser recovery workflow and chain reconciliation/no-resend remain open.

v65

## Unsigned preparation and signer checks (v65)

- Mainnet preparation now estimates fees and builds unsigned transfers through a frozen capability with no broadcast method. Private RPC guards block sending even if caller options or public getters change. Ordinary mainnet execution remains disabled.
- Signer validation rejects changed EVM gas fields, extra Solana instructions/account metadata, unapproved associated-account costs, and altered TRON permissions, attached assets, signatures, expiry or energy caps. TRON checks its network reference before opening a key file.
- Local protocol fixtures cover eight asset/network combinations; generated token addresses are not live provenance evidence. Actual encrypted testnet-key signing reproduces historical EVM/Solana bugs and verifies corrected signatures. No real funds or external broadcast.
- Evidence: `unsigned-mainnet-v65/preparation-r5.mts`, `signer-validation-r2.mts`, `tron-reference-before-key-r1.mts`, `evm-execution-regression-r1.mts` and `observation-regression-r1.mts`. Failed first signer harness/import fixture is preserved. No DDL or installer changes.
- Continue directly with actual mainnet runtime/signer integration and C001–C017 after checked merge; this prerequisite does not complete payment support.
