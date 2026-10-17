# Project status v73

**Phase One/Two is incomplete.** Mainnet execution is now implemented behind protected configuration, policy, registry and signed-alert checks. Local procedures pass; no real chain transaction, owner-hosted acceptance or observation period is claimed. Continue without milestone approval pauses. Owner launch details remain deferred to final testing.

## Remaining work

| ID | Work | Current evidence / remaining work |
|---|---|---|
| C001 | Mainnet runtime | Four networks/eight protocols prepare, sign and submit exact bytes to isolated endpoints; configuration/authentication/backend/UI select mainnet. Verify the full lifecycle matrix and live setup. |
| C002 | Shared database/preview | Promotion fences and public-only Preview pass local SQL/API/390px EN/FR checks. Finish owner-hosted acceptance. |
| C003 | Custody/signer | Four-key encrypted bundle, private installation/map and browser-operated isolated worker implemented. Actual worker→separate web settlement passes locally. Verify owner custody/host operation. |
| C004 | Payment/recovery matrix | Native ETH/BNB and generated18-decimal USDT/JAGA BNB funding/incoming/refund/member-withdrawal procedures pass, including exact unused-fee return and replay. Finish SOL/SPL/TRC20, all business/sweeps, reorg/replacement/expiry/restart and hosted/live acceptance. JAGA provenance remains unverified for actual launch. |
| C005 | Asset/RPC provenance | Owner must verify actual token contracts/mints/decimals and two independent providers per network. Generated contracts are not evidence. Keep JAGA/unverified assets disabled. |
| C006 | Pricing | Exact fixed-token activation/replay/resume pass locally; complete full asset/lifecycle acceptance. |
| C007 | UI/wallets | Mainnet EVM/SOL/TRON connections and canonical wallet sends pass isolated logic procedures; accurate environment labels/history wired. Finish actual browser/device/wallet and EN/FR acceptance. |
| C008 | Backup/recovery | Mainnet encrypted backup/restore/exact verification pass locally, preserving original v55 archive compatibility. Protected browser backup/restore/verify is implemented, with matching-release selection and database-bound approvals. Finish full chain reconciliation/no-resend and hosted acceptance. |
| C009 | Hosted identity/access | Verify actual Google/MFA, roles, rate limits, CAPTCHA and account/financial recovery. |
| C010 | Complete product | Audit every requirement/flag in §§1–29, queues/cooldowns/referrals/points/admin/export/delete/PWA/a11y and build/reload behavior. One-paste final-state installer is merged. |
| C011 | Operations | Signer workflow added; browser recovery is implemented; automatic encrypted cadence is implemented; finish actual external alerts/schedulers, hosted backup operation and incident/closure acceptance. |
| C012 | Capacity/cost | Measure mobile/latency/quota targets and compliant hosting. Public standard GitHub runners are currently free; this does not prove production capacity. |
| C013 | Observation periods | Actual14-day beta plus14-day initial-cap mainnet observation required; no elapsed evidence recorded. |
| C014 | Owner launch review | Countries/terms, funding/refund/closure, custody and budget remain owner-deferred. Record real review/evidence at setup. |
| C015 | Age eligibility | Server-date DOB eligibility without retaining DOB passes local API checks; hosted browser acceptance remains. |
| C016 | Preferences | Timezones/DST pass locally; saved account language now restores on login, with explicit/manual language choices preserved; production-browser checks pass locally. |
| C017 | Scheduling/navigation | Currency rotation/navigation pass390px EN/FR. Currency-specific native schedules, current approval/price checks, countdown and early-checkout denial are implemented and locally verified. Continue broader layout/device acceptance. |

## Current delivery

- Branch `feat/native-lifecycle-verification`, based on PR71 merge `b143dcc938845931c436093b50cd86dc7ba71a88`. Exact PR71 head187895f passed push39071509866 / PR39071530871 before merge.
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

## Automatic encrypted backups (v72)

- PR70 merged as `f9cef683c35c59dca5d565648aa7476f3420d39d`; exact head4df5402 passed push39070856823 / PR39070866948. New branch: `feat/scheduled-encrypted-backups`.
- Recovery workflow has an opt-in hourly wake-up using the existing protected backup environment. It reads the authoritative policy through the restricted runtime and verifies owner/runtime namespace identity before deciding whether a backup is due. No signing, restoration, deployment or application-table writes.
- Successful checkpoints are bound to the actual database identity. Missing/deleted/expired archives, failed/untrusted runs, short retention or a changed database cannot suppress a backup. A new checkpoint requires the upload’s actual retention to satisfy policy. Unsupported retention above90days or inconsistent interval/RPO/retention fails rather than silently weakening policy.
- Start up to one hour early to allow the hourly wake-up. GitHub can delay or disable schedules: owner monitoring, real restore drills and measured RPO/RTO remain required. Artifact quota/paid storage must be reviewed; a public repository’s retained encrypted backups are downloadable by readers, so keys stay separately protected.
- `scheduled-backup-v72/policy-and-history-r2`: actual restricted database policy/binding plus11 explicit GitHub metadata fixtures. `retention-r1`: actual checkpoint writer accepts adequate retention and rejects5 missing/short/expired/invalid/API cases. YAML and embedded shell syntax pass. These fixtures do not prove hosted scheduling/upload.
- `archive-r1` creates a real encrypted archive/current signed inventory through the schedule-triggered controller with no payment credentials. `selection-r2` accepts trusted scheduled/manual backups and denies foreign events/branches/failed runs using real Git ancestry plus explicit metadata. The r1 selector attempt hit sandbox child-process EPERM; preserve its log. Script typecheck r1 lacked scratch typeRoots; fresh r2 passes. Required checks, production build and bundle budgets pass. Original archives/keys and source financial rows remain untouched.
- Continue external alert receiver setup, the full all-asset lifecycle/product audit, hosted/device acceptance and real observation periods. Automatic backup implementation is separate from operational acceptance.

## Native lifecycle and wallet prompts (v73)

- PR71 merged as `b143dcc938845931c436093b50cd86dc7ba71a88`; exact head187895f passed push39071509866 / PR39071530871. Current branch: `feat/native-lifecycle-verification`.
- Reload protection missed wallet connection and ownership-signature prompts outside payment sends, including logged-out recovery. All native wallet entry points now share a memory-only interaction guard; success/rejection releases its own token without clearing concurrent prompts or an outer payment guard. No signature/transaction storage or automatic resend.
- `native-lifecycle-v73/eth-native-r4`, `bnb-native-r2`, `usdt-bnb18-r2` and `jaga-bnb18-r1` pass actual restricted-role funding, wallet proof, exact/underpaid incoming, original-sender refund despite ban, failed-refund gas/principal preservation and renewed worker→separate web settlement. Receiver allocations also fund a member withdrawal: quote replay/body conflict, wrong-generation denial, hold/cancel replay, encrypted worker signing and authenticated settlement, exact unused-fee return and replay without duplicate gas.
- These are generated, correctly scaled native/18-decimal token procedures with isolated endpoints. They do not verify real contracts, public funds/providers or hosted identity. Failed originals remain: ETH r1/r2 omitted the transport loader and correctly failed outbound policy; USDT18 r1 retained a6-decimal fixture’s insufficient mock token liquidity and paused. Fresh corrected targets pass; no failed database was reset.
- `wallet-flight-r1` covers actual module connection/ownership success/rejection, overlap, outer payment guard and failed-send cleanup. `wallets-r1` repeats all8 protocol/signing cases and7 member canonical-wallet sends, including configuration/intent denials. An accidental original-harness rerun stopped at exclusive-file creation before changing any original key; all evidence is retained.
- Actual production390px EN/FR `browser-wallet-r4` passes: pending connection disables reload, rejection releases it, and explicit reload succeeds without API response interception. Provider/future-peer messages are fixtures. Earlier browser r1 selected a disabled matching button; r2/r3 lacked an active injected provider. Preserve those logs/targets. Required checks, build and bundle budgets pass; final documentation checks run before publication.
- Remaining C004 work includes funded SOL/SPL/TRC20 lifecycle cases, business/sweeps, reorg/replacement/expiry/restart, chain reconciliation after restore and hosted/live-provider acceptance. Keep unverified assets disabled. Continue all C001–C017 and the full product audit without milestone pauses.

v73
