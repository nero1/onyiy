# LLM handover v67

## Owner direction

Complete all Phase One/Two, including the real-money product, bugs and every unfinished requirement. Keep moving in substantial batches through [status](PROJECT-STATUS_v67.md), without milestone pauses. Owner launch details are deferred to final testing; put protected settings in SETUP and continue independent coding. **The product is incomplete; actual hosted/live acceptance and observation periods remain open.**

## Current branch and capability

- `nero1/onyiy`, branch `feat/mainnet-runtime-integration`, based on merged PR65 `0ea4cf5e62a0ef7e7f83c26c1a512d6935775ac3`. PR64 head8389603 passed push39044213842 / PR39044236038; PR65 head5780ec6 passed push39044887939 / PR39044911887.
- Mainnet config/runtime, authentication issuer, native core credit, checkout/history/labels/wallets and signer now support the closed four-network registry. `nativePaymentExecutionSupported=true` is a capability, not launch acceptance. Defaults remain off. Mainnet requires explicit enablement, transparent non-demo policy, no simulation authority, reviewed readiness, matching configuration approvals and a recent signed alert acknowledgement.
- Multiple network hashes use `FINANCIAL_CONFIG_APPROVALS_JSON` and `ALERT_ACCEPTANCE_FINGERPRINTS_JSON`; legacy singular values remain compatible but cannot be mixed with lists. Policy/readiness/profile changes participate in hashes. Per-currency catalogue readiness controls checkout.
- `SIGNER_KEY_FILES_JSON` selects four environment-bound encrypted files; legacy single-file support remains. `prepare-key-package` emits a single encrypted bundle; installer validates every record before writing a new private directory. `.github/workflows/isolated-signer.yml` is opt-in, main-only, separately protected, bounded and browser-operated. No website/preview credentials or signer material may be mixed.
- Key-validation scopes gate new worker sends before reservations; retained attempts still get observed. Mainnet generation/installation does not prove live custody acceptance. No actual hosted signer was activated by this session.

## Proof and failures

`/workspace/work/mainnet-runtime-v67`:

- `mainnet-protocols-r1` / `mainnet-wallets-r2`: eight actual protocol/signing cases, generated encrypted keys, canonical wallet checks and exact-byte isolated submissions. Transport alone is replaced by named local fixtures; production role/network/configuration/signing gates are real. TRX is operating-only. Generated token addresses are not accepted provenance.
- `financial-mainnet-r7`: restricted-role mainnet funding, wallet proof, exact/underpayment, failed refund and renewed lineage; actual `runSignerOnce` signs/persists/submits, then a separate web process authenticates its report and settles once. Web process rejects signer and migration credentials. No public broadcast/funds.
- `configuration-guards-r1`:32 rejection cases plus four-network approval selection and issuer/label checks. `key-package-r1`:18 package/scope cases plus original-file/tamper/secret/mapping denials.
- Failed r1/r2 generated fixtures lacked the required profile actor; r4 lacked the child web transport mapping. Preserve databases/logs. r3 and final r5 pass; never reset failed fixtures. Generated encrypted custody and separate secret files are retained with private modes; never print them.

## Next work

Finish required checks/build/browser verification and merge the current PR only after both exact-head CI events pass. Then continue C001–C017, especially browser backup/restore with chain reconciliation/no-resend, complete financial lifecycle coverage, saved-language restoration, native scheduling (generic `activateDuePlans` still calls the GIV-only launcher), full product audit and device/i18n/accessibility acceptance. Do not stop after this merge or call the isolated fixture matrix live acceptance.

## Schema and recovery

- SQL006 fixes the public queue parameter ambiguity without changing table shapes, grants or financial records; fresh installations still use one final-state file. Fresh owners paste only `packages/db/fresh-install.sql`; SQL000–005 bytes/receipts remain immutable. `schema-contract_v67.json`:96 root tables/897 columns/301 checks/119 standalone indexes. Refresh/reverify the final-state installer after future DDL.
- Recovery contract4 preserves timestamp microseconds and exact schema/security/data. Mainnet maintenance is separate, read-only at runtime, signing disabled, no scheduler keys; it never sends. New signer map/package fields are also forbidden there.
- Preserve original `/workspace/work/production-v55/production-foundation-v55-r1.gwbackup` and `cross-host-r1/archive.key`; stopped cross-host targets55455/55456 retain their data. Original mainnet packet/key: `mainnet-recovery-v63/mainnet-isolated-r2.gwbackup` / `.key` (raw32-byte key). Old v3 archives need PR53 release6c323dc; v2 need25a507. Never re-sign old archives.
- `worker_requests` is excluded from retained backup rows. New audits add `archive_record_keys`; compare exact expected additions rather than require that table unchanged. Staging restores need fresh scheduler/worker request keys before publication, while retained custody/MFA encryption keys must remain recoverable.

## Workspace and rules

Node22 `/workspace/work/tooling/node-v22.23.3-linux-x64/bin`; PG tools `/workspace/work/tooling/pg-tls/bin`. Owned source cluster55450 is `/workspace/work/shared-hosting-v50/pgdata`, matching socket/certificate there. Restart only exact owned instances; never inspect TLS private keys. Original failed `gw_v27_native_refund_isolated` remains untouched.

Keep seven human documents total, version trackers/status/handover together; use concise beginner browser-only SETUP and manual SQL. Reuse accounts/resources. No direct main pushes; both exact-head CI events before merge. Preserve all original/failed evidence. Broad automated suite remains deferred; named procedures and mandatory checks are allowed. User time is Africa/Lagos. Do not ask again for deferred owner details. GitHub variable-list API returned403; hosted bindings are not verified. Real14-day beta and14-day initial-cap observations cannot be simulated.

Admin setup fix: the alert-probe response was previously discarded. Native payment administration now shows its asset, alert ID and selectable configuration hash, with acknowledgement guidance. This makes the documented multi-network approval setup actionable.

SQL/browser review: SQL006 resolves the ambiguous public queue `version` parameter. `mainnet-runtime-v67/queue-migration-r2` reproduces42702, verifies the corrected read-only mainnet result and retired-asset null result, preserves all95 non-receipt root-table hashes and function privileges, and proves late-failure rollback. `compare-schema-r1` matches4222 schema/security entries between seven-migration reference and the direct final-state installer. The first migration-state comparator failure was a result-array prototype mismatch; original targets/logs remain.

`browser-mainnet-r4` passes the actual local production build in Chromium390px EN/FR, genuine signed-session/MFA procedures and the selectable alert configuration hash (HTTP200), without response interception. Earlier browser targets remain: r1 exposed SQL42702; r2/r3 targeted another nested Reason field in the procedure. Source queues, financial records and original archives were not reset.

Contract4 packets created before SQL006 require their matching pre-006 release (PR65 `0ea4cf5e62a0ef7e7f83c26c1a512d6935775ac3` for the current six-file lineage), then a separately reviewed forward upgrade. Keep original packets/keys; never re-sign or rewrite them.

Follow-up UI acceptance: identify the background request/cancellation path that logged a bounded database deadline around MFA/reload. The selected alert-probe request returned200 and its hash displayed correctly; do not treat this as completed whole-app reliability acceptance.

v67
