# LLM handover v66

## Owner direction

Complete **all Phase One/Two**, including real-money mainnet and every unfinished feature. Keep working through [the full gap list](PROJECT-STATUS_v66.md) without milestone pauses. Read [PRD](PRD.md) §§29–33. Owner launch details are deferred to final testing; document them in SETUP and continue independent coding. **The product is incomplete; mainnet sending remains disabled.**

## Current work

- Branch `feat/native-write-scope`; PR64 merged at `dfe3c1be435543ccbc04eccec21e6a0fb05f5ec2` after exact-head push39044213842 / PR39044236038 passed.
- Native payment writes, fee accounting, operating funding, treasury sweeps, liability recovery, reorg and recovery scans capture and validate their transaction environment. Withdrawal balances and recovery scans no longer rewrite it. Registry filters, retained keys, statements and records use captured scope.
- Signed prices bind the signed document environment to the selected transaction; a valid cross-environment signature is rejected. Alerts/reminders/daily settlements use their selected namespace and matching registry; simulation alerts retain simulation budgets and payloads.
- `native-write-v66/scope-and-prices-r5.mts`:39 restricted-login scope rejections, unchanged retained hashes after denials,42-unit fee journal exactly once/replay/conflict and signed-price binding. Earlier failed harness/import/order fixtures remain intact. Simulation signed-webhook evidence is tracked below.
- No DDL, installer, execution-flag or owner acceptance changes. Mainnet activation remains unfinished. Continue actual runtime/signer/UI integration and the full C001–C017 list after merge; also complete native scheduling, saved-language restoration and browser recovery operation.


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

v66

## Unsigned preparation and signer checks (v65)

- Mainnet preparation now estimates fees and builds unsigned transfers through a frozen capability with no broadcast method. Private RPC guards block sending even if caller options or public getters change. Ordinary mainnet execution remains disabled.
- Signer validation rejects changed EVM gas fields, extra Solana instructions/account metadata, unapproved associated-account costs, and altered TRON permissions, attached assets, signatures, expiry or energy caps. TRON checks its network reference before opening a key file.
- Local protocol fixtures cover eight asset/network combinations; generated token addresses are not live provenance evidence. Actual encrypted testnet-key signing reproduces historical EVM/Solana bugs and verifies corrected signatures. No real funds or external broadcast.
- Evidence: `unsigned-mainnet-v65/preparation-r5.mts`, `signer-validation-r2.mts`, `tron-reference-before-key-r1.mts`, `evm-execution-regression-r1.mts` and `observation-regression-r1.mts`. Failed first signer harness/import fixture is preserved. No DDL or installer changes.
- Continue directly with actual mainnet runtime/signer integration and C001–C017 after checked merge; this prerequisite does not complete payment support.

Simulation alert regression: `native-write-v66/simulation-alerts-r1.mts` passes actual restricted-login simulation payload/budget selection, signed local HTTP delivery and acknowledgement, no duplicate dispatch, and a forged acknowledgement retained as failed. Financial hashes remain unchanged. Generated local webhook/key only.
