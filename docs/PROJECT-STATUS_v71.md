# Project status v71

**Phase One/Two is incomplete.** Mainnet execution is now implemented behind protected configuration, policy, registry and signed-alert checks. Local procedures pass; no real chain transaction, owner-hosted acceptance or observation period is claimed. Continue without milestone approval pauses. Owner launch details remain deferred to final testing.

## Remaining work

| ID | Work | Current evidence / remaining work |
|---|---|---|
| C001 | Mainnet runtime | Four networks/eight protocols prepare, sign and submit exact bytes to isolated endpoints; configuration/authentication/backend/UI select mainnet. Verify the full lifecycle matrix and live setup. |
| C002 | Shared database/preview | Promotion fences and public-only Preview pass local SQL/API/390px EN/FR checks. Finish owner-hosted acceptance. |
| C003 | Custody/signer | Four-key encrypted bundle, private installation/map and browser-operated isolated worker implemented. Actual worker→separate web settlement passes locally. Verify owner custody/host operation. |
| C004 | Payment/recovery matrix | Mainnet funding, wallet proof, exact/underpayment, failed-refund rights and worker settlement pass. Finish all enabled assets, business/withdrawal/sweep, reorg, replacement/expiry/restart cases. |
| C005 | Asset/RPC provenance | Owner must verify actual token contracts/mints/decimals and two independent providers per network. Generated contracts are not evidence. Keep JAGA/unverified assets disabled. |
| C006 | Pricing | Exact fixed-token activation/replay/resume pass locally; complete full asset/lifecycle acceptance. |
| C007 | UI/wallets | Mainnet EVM/SOL/TRON connections and canonical wallet sends pass isolated logic procedures; accurate environment labels/history wired. Finish actual browser/device/wallet and EN/FR acceptance. |
| C008 | Backup/recovery | Mainnet encrypted backup/restore/exact verification pass locally, preserving original v55 archive compatibility. Protected browser backup/restore/verify is implemented, with matching-release selection and database-bound approvals. Finish full chain reconciliation/no-resend and hosted acceptance. |
| C009 | Hosted identity/access | Verify actual Google/MFA, roles, rate limits, CAPTCHA and account/financial recovery. |
| C010 | Complete product | Audit every requirement/flag in §§1–29, queues/cooldowns/referrals/points/admin/export/delete/PWA/a11y and build/reload behavior. One-paste final-state installer is merged. |
| C011 | Operations | Signer workflow added; browser recovery is implemented; finish actual external alerts/schedulers, backup cadence and incident/closure acceptance. |
| C012 | Capacity/cost | Measure mobile/latency/quota targets and compliant hosting. Public standard GitHub runners are currently free; this does not prove production capacity. |
| C013 | Observation periods | Actual14-day beta plus14-day initial-cap mainnet observation required; no elapsed evidence recorded. |
| C014 | Owner launch review | Countries/terms, funding/refund/closure, custody and budget remain owner-deferred. Record real review/evidence at setup. |
| C015 | Age eligibility | Server-date DOB eligibility without retaining DOB passes local API checks; hosted browser acceptance remains. |
| C016 | Preferences | Timezones/DST pass locally; saved account language now restores on login, with explicit/manual language choices preserved; production-browser checks pass locally. |
| C017 | Scheduling/navigation | Currency rotation/navigation pass390px EN/FR. Currency-specific native schedules, current approval/price checks, countdown and early-checkout denial are implemented and locally verified. Continue broader layout/device acceptance. |

## Current delivery

- Branch `feat/managed-recovery-and-client-compatibility`, based on PR69 merge `5405258bf111f924af4ec90099d9e4e2651d33c3`. Exact PR69 head2ca64f6 passed push39068469201 / PR39068485562 before merge.
- Mainnet execution, four-key custody/workflow, wallet/environment integration, saved language and native scheduling are implemented behind their protected gates. Owner-hosted/live acceptance remains open.
- New `.github/workflows/financial-recovery.yml` provides protected browser-operated backup, empty-target restore and independent exact verification. Only owner/runtime/CA/archive-key credentials enter recovery; signer/web/scheduler credentials are rejected. PostgreSQL17 is installed from its verified signed repository before credentials attach.
- Short-term artifacts expire after one day. For longer retention, owners can keep the encrypted ZIP in a dedicated GitHub recovery release. Restore requires a verified successful run or an owner-selected original commit from trusted main history; the archive cannot choose executable code. No automatic schema upgrade, deployment or worker restart.
- Financial hashes now include the actual database identity, shared across web/signer connections. Restored acknowledgements/approvals cannot enable the new target. Existing pre-change hashes are retained; upgrade/restore needs new reviewed hashes and acknowledgements, with old attempts reconciled rather than rewritten.
- No DDL, migration receipt or retained-history rewrite. Five core guides and two versioned trackers remain.

## Cycle history and preview fixes

- Paginated cycle records used legacy joining/display order even in the transparent profile. They now use the actual public serving position; legacy mode retains its original rule.
- Completed cycles lacked completion/cooldown fields and a dedicated view. Add a history-entitled Completed filter, recorded completion time, saved-zone formatting and live EN/FR cooldown; retain original payment currency/network.
- Thirty recent completed cycles could hide an older active cycle and wrongly restart automatic currency rotation. A bounded, user/environment-scoped existence query now controls preview safety independently of that window. Missing compatibility fields fail closed.
- Unresolved native chain reviews remain visible in current cycle records. Member-facing cycle/payout status labels are localized rather than raw enum codes. No financial writes or DDL.
- These findings are addressed locally in v71 below; hosted acceptance remains open. Automatic backup cadence, full lifecycle matrix and hosted acceptance remain open.

`/workspace/work/cycle-history-v70/records-and-preview-r4` reproduces old position1 versus correct transparent position2, constructs35 declared synthetic historical rows around a retained real fixture cycle, verifies the active flag outside the30-row window, exact completion/cooldown, Completed filter, member isolation and unchanged ledger counts/totals. r1 failed at CJS re-export import before fixture creation; r2 used the wrong read role instead of the actual API’s restricted service role. Corrected fresh r3/r4 targets pass; preserve all originals. `browser-cycles-r1` passes actual production Chromium390px EN/FR, position2, Completed view/live cooldown and12.5-second rotation suppression with two currencies. `browser-cycles-r2` repeats on the final source and verifies localized states; required checks, production build and bundle limits pass. These are read/display fixtures, not financial lifecycle acceptance.

## Earlier recovery evidence

`/workspace/work/browser-recovery-v69`:

- `archive-seven-migrations-r1`: actual encrypted mainnet backup, restore and independent exact verification on current seven-file lineage. Original packets/keys remain untouched.
- `bound-financial-r1`: actual restricted-role funding/wallet/incoming/refund lineage and encrypted worker→separate web settlement pass with database-bound hashes. Transport uses named isolated endpoints; no public sends/funds.
- `workflow-and-binding-r2`: actual controller backup/restore/verify, permanent-release input, occupied-target denial and pre-DDL release/confirmation/secret denials. Restored signed acknowledgement remains, while the target’s changed hash rejects source approval. Generated GitHub metadata is a local harness, not hosted Actions acceptance.
- Bounded ZIP extraction accepts original bytes and rejects traversal, symlinks and extra/key files. YAML, shell and embedded Node/Python syntax pass. Official PostgreSQL signing-key fingerprint was verified. Required checks/build/bundle evidence is recorded with the PR; no hosted credentials were configured here.
- PR67 evidence remains in `/workspace/work/native-launch-v68`: `native-schedules-r7`, `simulation-schedule-r2`, `browser-language-r4` and `browser-scheduling-r3`. Actual390px EN/FR passes include preference precedence, countdown, early-checkout denial and narrow catalogue layout.

## Earlier local evidence

All under `/workspace/work/mainnet-runtime-v67`:

- `mainnet-protocols-r1` and `mainnet-wallets-r2`: eight protocol cases, real cryptographic signatures, exact-byte fixture submission; seven member currencies plus operating-only TRX. No public provider/funds/provenance acceptance.
- `financial-mainnet-r7`: real restricted database roles, generated reviewed policy and actual signed HTTP acknowledgement; funding, wallet proof, incoming/excess/failed-refund lineage; actual isolated worker followed by authenticated settlement in a separate web process without signer/owner credentials. One signature and one final principal settlement.
- `configuration-guards-r1`:32 denials, four approval hashes, issuer/audience separation and accurate labels. `key-package-r1`:18 package/scope checks plus tamper/secret/mapping/nonempty-target denials.
- Preserve r1/r2 actorless profile fixtures and r4's missing child transport map; r3 financial proof passes. No failed target was reset. Original keys, archives, logs and records remain. The r6 repeat used a nonexistent template suffix and failed before creating a database; the corrected fresh r7 includes SQL006 and passes.

## Delivery rules

Keep five core guides plus two versioned trackers. Both CI events must pass the exact final head before merge. Preserve original/failed financial fixtures, signed archives and keys; no resets to manufacture success. Named isolated procedures and required checks are authorized; broad automated suite remains deferred. Owner-hosted settings and acceptance are not verified here. Continue the full list after each merge; never claim100% or fabricate elapsed observation periods.

Admin setup fix: the alert-probe response was previously discarded. Native payment administration now shows its asset, alert ID and selectable configuration hash, with acknowledgement guidance. This makes the documented multi-network approval setup actionable.

SQL/browser review: SQL006 resolves the ambiguous public queue `version` parameter. `mainnet-runtime-v67/queue-migration-r2` reproduces42702, verifies the corrected read-only mainnet result and retired-asset null result, preserves all95 non-receipt root-table hashes and function privileges, and proves late-failure rollback. `compare-schema-r1` matches4222 schema/security entries between seven-migration reference and the direct final-state installer. The first migration-state comparator failure was a result-array prototype mismatch; original targets/logs remain.

`browser-mainnet-r4` passes the actual local production build in Chromium390px EN/FR, genuine signed-session/MFA procedures and the selectable alert configuration hash (HTTP200), without response interception. Earlier browser targets remain: r1 exposed SQL42702; r2/r3 targeted another nested Reason field in the procedure. Source queues, financial records and original archives were not reset.

Contract4 packets created before SQL006 require their matching pre-006 release (PR65 `0ea4cf5e62a0ef7e7f83c26c1a512d6935775ac3` for the current six-file lineage), then a separately reviewed forward upgrade. Keep original packets/keys; never re-sign or rewrite them.

Follow-up UI acceptance: identify the background request/cancellation path that logged a bounded database deadline around MFA/reload. The selected alert-probe request returned200 and its hash displayed correctly; do not treat this as completed whole-app reliability acceptance.

## Managed recovery and client compatibility (v71)

- Recovery now permits only known Supabase client roles that are idle, outside a transaction and accompanied by both provider schemas. Active/open-transaction/unknown sessions or hidden metadata still block; no session is terminated. Foreign tables also make a target occupied.
- API responses declare wire compatibility; clients send their supported range. Incompatible writes fail before processing, and the browser blocks subsequent mutations before sending. Legacy clients remain supported; additive deployments do not force reloads. Worker authentication and logout retain their existing paths.
- Native and simulation routes share PWA controls. The worker observes public manifest headers only; private reads and all writes bypass it. EN/FR reload notices wait for wallet interaction and offer to copy an existing returned hash. No automatic resend or stored pending request body.
- Local evidence: `managed-recovery-v71/provider-sessions-r1` passes idle-provider restore/exact verification and active/transaction/unknown/missing-marker denials; `foreign-target-r2` rejects a handlerless foreign table without modifying it. Preserve the old-guard baseline and failed unavailable-extension r1 fixtures. `financial-regression-r1` passes actual encrypted worker→separate web settlement through authenticated callbacks using generated isolated endpoints.
- `client-compatibility-v71/protocol-and-api-r2`, `client-lock-r2` and `worker-protocol-r2` pass API range validation, pre-fetch mutation lock, logout/401 handling, memory-only owner/invoice receipt scoping and public-only worker observation. Future peer messages are explicit fixtures, not hosted upgrade acceptance.
- Final production build, required checks and actual390px Chromium EN/FR pass (`browser-compatibility-r2`): native PWA registration, real manifest metadata, stale worker tuple ignored, explicit future-peer banner, pre-POST mutation lock, unchanged saved locale and manual reload. The earlier r1 browser run also passes; fresh r2 verifies the final legacy0/server1 range.
- Still open: hosted provider metadata/restore, all-asset reconciliation, full product audit, automatic backup cadence/external alerts, device/provider acceptance and real observation periods. No schema, receipt or financial-history rewrite.

v71
