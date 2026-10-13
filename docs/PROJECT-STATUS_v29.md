# Phase One audit and remediation status — v29

Updated: **13 October 2026 at 09:31:02 PM UTC**.

**Current state: Round 1 audit complete; 70 findings open; 0 application fixes applied; awaiting owner review of the fix plan.** Findings: 15 High, 49 Medium, 6 Low; 43 defects, 14 Phase One requirement gaps, 10 hardening recommendations, 3 maintenance issues. No application, migration, dependency or runtime-gate change was made in v29.

The v28 milestone checklist below historically recorded 100% feature implementation and passed named local procedures. The new audit reopens concrete bugs and missing requirements; **Phase One remediation is not complete, and current bug-free/100% PRD completion is not claimed.** No invented revised percentage is assigned to unequal audit items. Phase Two has not begun.

Read [custom-bugs-report.md](custom-bugs-report.md) and [custom-bugs-fix-plan.md](custom-bugs-fix-plan.md). Three complementary analysis passes completed: repository/PRD architecture inventory, cross-file money/security/hosting contracts, adversarial failure/concurrency evidence review. Four bounded synthetic reproductions and one body-reader observation passed; read-only production dependency audit found 15 affected package nodes (8 high, 7 moderate, no critical). These are not live wallet/custody, load or penetration evidence. CRON frequency and test-only issues are excluded.

**New owner directive:** do not fix application bugs until the owner reviews the plan. After approval, implement substantial coherent batches without M1/M2 acceptance waits; complete up to three audit/fix rounds unless a closing round finds no new bugs and no prior work remains open. Then implement all Phase Two milestones without waiting for milestone acceptance. The current three analysis passes are one audit round, not three fixing rounds.

**Owner directive:** implement all M0–M8 irrespective of M1/M2 or earlier acceptance until100%, in as few substantial verified iterations as practical. Missing owner credentials and hosted acceptance shall not stop independent work. Never fabricate custody or enable sends to meet a percentage.

Historical v28 feature-coverage checklist (not current remediation/acceptance percentages):

| Milestone | Weight | Implementation | Contribution |
|---|---:|---:|---:|
| M0 schema/config/runtime |10%|100%|10%|
| M1 GIV money/queues |15%|100%|15%|
| M2 identity/permissions |15%|100%|15%|
| M3 first testnet adapter |15%|100%|15%|
| M4 responsive product |15%|100%|15%|
| M5 administration/portability/recovery |10%|100%|10%|
| M6 remaining adapters |8%|100%|8%|
| M7 bounded prototype/tooling |7%|100%|7%|
| M8 financial acceptance tooling |5%|100%|5%|

## Historical merged feature contracts

M1 administration includes audited enable/revoke of a waiting user's priority, permanent payload-bound replay, partition/entry locks, serving/display separation and FIFO restoration. It is merged; this audit found no additional priority/bump-specific defect. Other Phase One findings remain open. Earlier exact GIV scenarios passed on fresh isolated data:21-gift/bootstrap, integrity/concurrent spend, jobs/HMAC, withdrawal recovery, incoming exceptions and reorg/reconfirmation.

Native adapters pin providers/networks, verify canonical transfer membership/finality and exact costs, preserve immutable economic/registry/treasury snapshots and require durable isolated signing before broadcast. Prior checked replacement/expiry/reorg/sweep/refund/last-admin/CAPTCHA/history/export/receipt contracts remain. New checkpoints immediately pause an asset, use five-block/slot pages, globally claim each event once and retain evidence. Saved signed lineage is reconciled in bounded pages; missing/unknown hashes preserve holds. Finalized provider balances must agree with book cash and cover beneficiary liabilities. Database clones cannot reuse another binding's clean checkpoint.

Unmatched inflows create system custody/liability without membership, cycles or points. Full-principal returns require original-wallet proof and audited staff review; no identity/new destination is granted. Each retry has a distinct hold and positively closed parent. Verified unknown outgoing value requires typed company-loss review with separate principal/network/setup journals and a fresh scan; unrelated beneficiary rights remain.

Idle heartbeats validate encrypted-key scope and pinned RPC without allocating nonce state. Monitoring covers price/heartbeat/gas/custody/hot-wallet conditions, long holds and stuck attempts. The scheduler processes one asset per HTTP invocation. Recurring alerts retain ordinals; initial/repeated/retried outbound HTTP attempts share the daily budget.

Public statistics are cached and environment-separated, exclude system payments and expose consented/pending counts and settled member USD. Global rotation supports pause/reduced motion; private history continues beyond its500-row retained window. Staff selected-field JSON/CSV exports omit unselected/auth/signing data. Optional owner-produced encrypted site downloads and bounded private staging never decrypt, import, publish or start workers; CLI authentication and empty inactive target restore remain mandatory.

Build tooling enforces200KiB initial JavaScript,3MiB API trace compression, a conservative2MiB per-wallet bound and10% measured baseline regression. These are local build bounds, not hosted artifacts or production capacity claims. Shared JSON input is bounded64KiB; staging has size/time/storage bounds.

## Retained v28 local verification evidence

Passed named procedures: v28-cold-recovery-r5 (checkpoint binding/pause;700000 unallocated custody once; original-wallet wrong proof; hold/replay/unsigned cancellation/linked retry; restricted persisted signed refund; missing saved hash then positive settlement;100000000000000000 company loss and21000000000000 unknown-outflow gas once; strict finalized balance rescan), v28-scanners-r2 (SOL/TRON native and token paths, skipped slots, self-transfer neutrality, replay equality, caps, wrong network/lag/outage/disagreement and contradictory balances), v28-idle-heartbeat (restricted encrypted key/RPC health, no nonce/state mutation; missing key/outage cannot refresh).

v28-operations-portability-r4 passed selected-field JSON/CSV, cached environment statistics, recurrence without ordinal reuse,3/day HTTP attempts,64KiB request bounds and reconciliation. v28-archive-portal passed actual encrypted private download/checksum/staging; malformed upload stayed unverified and never affected financial rows. Native full restore verifies70 retained inventories/80 schema tables/73 migrations into fresh inactive gw_v28_cold_restore_r2; forward migrations skip unchanged checksums. No worker starts. Drizzle incremental0003 and static80/80 grant/resource classification pass.

Final local check:all, production build, Drizzle generation/check, grant/secret scans and bundle checks pass. Homepage194.91KiB/9scripts; maximum API trace1.422MiB gzip/5.923MiB raw/241files; all client chunks0.687MiB gzip. Actual390px EN/FR staff browser passed fresh dummy MFA, recovery controls, selected-field JSON and exact encrypted-site download, real unverified checksum upload, keyboard focus/pause/reduced-motion and no clipping/auth persistence. Anonymous enabled statistics and authenticated inventory/one-asset workload passed; original policy restored through staff MFA. Sixteen local public read samples measured33.08ms p95; ten staff reads63.30ms. These are sequential local observations, not hosted latency/capacity. No automated regression/load suite was added.

## Preserved failures and limits

Earlier inconsistent gw_v27_native_refund_isolated remains inactive with its known negative held/phantom retry; no history was reset or concealed. New probe failures are retained: first immutable-row FOR UPDATE permission mismatch corrected with per-inflow advisory serialization; seed-only statistics toggle and read-only view misuse corrected with audited setting edits/direct aggregate; first recurrence scheduling issue corrected with permanent next ordinal and shared HTTP budget. Initial backup invocation omitted its explicit path and restore target had not yet been created; corrected commands/empty targets passed. All old archives remain bound to their own fingerprints. Browser scratch initially used the old configured origin; corrected WEB_ORIGIN passed without resetting any factor. Latency scratch first had a top-level-await error, then lacked an isolated workload key; corrected private bindings passed and the public flag was restored. A public statistics route authorization omission was found and fixed; anonymous access exposes only the closed aggregate DTO. Failed attempts/sources/logs remain retained.

**Financial release remains disabled.** Automatic approval review rejected changing web/signer readiness gates to true because it could enable real testnet operations. Both remain false; mainnet remains prohibited. Coding completion does not override that decision. Explicit approval of a concrete gate change, owner registry/address/key/configuration inputs and independently authenticated alert acceptance are required before release.

Hosted OAuth/Turnstile/RPC, actual wallet popups/broadcast/custody/native funding, live external ACK, mobile installation/LCP, quota/latency/capacity and required observation durations remain unrun owner/hosted acceptance. The generated RPC/wallet/database evidence proves contracts only.

## Repository and next action

PR27 merged at main commit ee50068 after BOTH exact-head push run38437406457 and PR run38437476871 succeeded for final feature head8938b22. Earlier PR26 merged at3c070bc. The final implementation PR is no longer pending.

v29 is documentation-only on docs/phase-one-bug-audit-v29. Its PR must meet the same exact-final-head push and PR CI requirements; never direct-push main. No review/merge of these docs implies approval to implement fixes or enable sending.

**Next action: owner review of the complete 70-item fix plan.** Until then, application fixes remain on hold. After approval, begin the security dependency update and packages A/B plus High private-state/wallet findings, verify each coherent batch and keep the tracker current. Hosted release inputs remain separate; keep all financial readiness gates false.

Signed: **13 October 2026 at 09:31:02 PM UTC**

v29
