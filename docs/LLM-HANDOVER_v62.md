# LLM handover v62

## Owner direction

Complete **all Phase One/Two**, including real-money mainnet and every unfinished feature. Keep working through [the full gap list](PROJECT-STATUS_v62.md) without milestone pauses. Read [PRD](PRD.md) §§29–33. Owner launch details are deferred to final testing; document them in SETUP and continue independent coding. **The product is incomplete; mainnet sending remains disabled.**

## Current work

- Repository `nero1/onyiy`; branch `feat/public-preview-app`, following PR60 merge `4061eec22d7c927588ecc94ef918bd38af2254fb`.
- New `publicPreviewTransaction` requires a separate login holding only `gw_preview`, uses bounded read-only repeatable snapshots and rejects unsafe role/ownership/table/column/function drift before callbacks. `publicPreviewManifest` parses only public settings; no private defaults.
- Named `/workspace/work/public-preview-v61/boundary-r4.mts` and `r5` pass actual restricted-login projection parity, simulation/mainnet scopes, user/write/escalation denial and privilege drift. r1 failed on wrapped-error text; all fixtures/logs are preserved. Budget/admission integration passes r3 onward.
- **Preview app is now wired locally:** `PUBLIC_PREVIEW_MODE=read_only`, only Preview hosting, separate `gw_preview` login, no private credentials. Public catalogue/configuration/help/search work; authentication/private/jobs/writes are closed before handlers. Homepage/gifts omit auth/payment portals, navigation is public-only, private pages are denied, noindex is set. Protected workflow skips owner initialization and verifies the restricted login. Continue actual mainnet execution/recovery/provider and product work; hosted acceptance is still open.

## Financial boundaries and pending implementation

- `runtimeProviders` accepts mainnet only in explicit public read-only preview; `nativePaymentEnvironment` still denies mainnet execution. `financialImplementationComplete` and signer `implementationComplete` remain false. Do not flip flags to claim completion.
- `assertIsolated`, signer EVM ID allowlist, Solana transfer preparation, many financial APIs/UI paths and recovery still need mainnet implementation. Read-only observation is separate from payment support.
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


## Read-only preview app evidence (v62)

`/workspace/work/public-preview-app-v62`: `api-r2` proves actual mainnet public reads,39 private/auth/job route denials, write/signing denial and unchanged retained hashes. `browser-r1` and final `browser-r2` prove actual production Chromium390px EN/FR catalogue/help/search, banner, public-only navigation, unavailable private pages/API and noindex; no response interception. `credential-scope-r1` rejects21 private credential names; `hosted-preflight-r1` accepts the restricted login and rejects owner login/mode mismatch. r1 API harness failure used the unsupported mainnet recovery inventory; preserved, then r2 hashes the unchanged simulation fixture outside request execution. Mainnet recovery itself remains unfinished. PR60 passed push39024849840 / PR39024875695 before merging.

v62
