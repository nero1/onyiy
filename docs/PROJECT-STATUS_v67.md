# Project status v67

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
| C008 | Backup/recovery | Mainnet encrypted backup/restore/exact verification pass locally, preserving original v55 archive compatibility. Browser operation, chain reconciliation/no-resend and hosted acceptance remain. |
| C009 | Hosted identity/access | Verify actual Google/MFA, roles, rate limits, CAPTCHA and account/financial recovery. |
| C010 | Complete product | Audit every requirement/flag in §§1–29, queues/cooldowns/referrals/points/admin/export/delete/PWA/a11y and build/reload behavior. One-paste final-state installer is merged. |
| C011 | Operations | Signer workflow added; finish browser recovery operation, actual external alerts/schedulers and incident/closure acceptance. |
| C012 | Capacity/cost | Measure mobile/latency/quota targets and compliant hosting. Public standard GitHub runners are currently free; this does not prove production capacity. |
| C013 | Observation periods | Actual14-day beta plus14-day initial-cap mainnet observation required; no elapsed evidence recorded. |
| C014 | Owner launch review | Countries/terms, funding/refund/closure, custody and budget remain owner-deferred. Record real review/evidence at setup. |
| C015 | Age eligibility | Server-date DOB eligibility without retaining DOB passes local API checks; hosted browser acceptance remains. |
| C016 | Preferences | Timezones/DST pass locally; saved server language restoration on login remains to fix. |
| C017 | Scheduling/navigation | Currency rotation/navigation pass390px EN/FR. Native scheduled launch still uses the GIV-only launcher; complete asset-aware scheduling/presentation and remaining layout. |

## Current delivery

- Branch `feat/mainnet-runtime-integration`, based on PR65 merge `0ea4cf5e62a0ef7e7f83c26c1a512d6935775ac3`. PR64 and PR65 both passed their exact-head push and pull-request checks before merging.
- Removed the hardcoded unsupported-mainnet path. Shared execution capability is implemented; repository defaults remain disabled. Actual sends require selected mode, explicit enablement, transparent non-demo settings, approved readiness, approved hashes and recent signed acknowledgement.
- Fixed one-hash activation across several networks, one-file custody limitations, client transaction validation and testnet-only identity/record/label assumptions. Preview/web reject signer material. SQL006 corrects an ambiguous queue parameter; the final-state installer is refreshed and the original SQL000–005 bytes remain unchanged.
- SETUP now has mainnet and isolated-signer browser steps. Remaining provider/owner details belong there; do not request them again while independent coding can continue.

## Local evidence

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

v67
