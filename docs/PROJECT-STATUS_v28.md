# Phase One implementation status

Updated:13 October2026. **100% implementation /0% remaining coding.** This records feature contracts and local verification, not hosted/live release acceptance. Local verification is complete; the final PR must pass exact-head push and PR CI before merge.

**Owner directive:** implement all M0–M8 irrespective of M1/M2 or earlier acceptance until100%, in as few substantial verified iterations as practical. Missing owner credentials and hosted acceptance shall not stop independent work. Never fabricate custody or enable sends to meet a percentage.

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

## Final implementation

M1 administration includes audited enable/revoke of a waiting user's priority, permanent payload-bound replay, partition/entry locks, serving/display separation and FIFO restoration. It is merged and has no known remaining coding task. Earlier exact GIV scenarios passed on fresh isolated data:21-gift/bootstrap, integrity/concurrent spend, jobs/HMAC, withdrawal recovery, incoming exceptions and reorg/reconfirmation.

Native adapters pin providers/networks, verify canonical transfer membership/finality and exact costs, preserve immutable economic/registry/treasury snapshots and require durable isolated signing before broadcast. Prior checked replacement/expiry/reorg/sweep/refund/last-admin/CAPTCHA/history/export/receipt contracts remain. New checkpoints immediately pause an asset, use five-block/slot pages, globally claim each event once and retain evidence. Saved signed lineage is reconciled in bounded pages; missing/unknown hashes preserve holds. Finalized provider balances must agree with book cash and cover beneficiary liabilities. Database clones cannot reuse another binding's clean checkpoint.

Unmatched inflows create system custody/liability without membership, cycles or points. Full-principal returns require original-wallet proof and audited staff review; no identity/new destination is granted. Each retry has a distinct hold and positively closed parent. Verified unknown outgoing value requires typed company-loss review with separate principal/network/setup journals and a fresh scan; unrelated beneficiary rights remain.

Idle heartbeats validate encrypted-key scope and pinned RPC without allocating nonce state. Monitoring covers price/heartbeat/gas/custody/hot-wallet conditions, long holds and stuck attempts. The scheduler processes one asset per HTTP invocation. Recurring alerts retain ordinals; initial/repeated/retried outbound HTTP attempts share the daily budget.

Public statistics are cached and environment-separated, exclude system payments and expose consented/pending counts and settled member USD. Global rotation supports pause/reduced motion; private history continues beyond its500-row retained window. Staff selected-field JSON/CSV exports omit unselected/auth/signing data. Optional owner-produced encrypted site downloads and bounded private staging never decrypt, import, publish or start workers; CLI authentication and empty inactive target restore remain mandatory.

Build tooling enforces200KiB initial JavaScript,3MiB API trace compression, a conservative2MiB per-wallet bound and10% measured baseline regression. These are local build bounds, not hosted artifacts or production capacity claims. Shared JSON input is bounded64KiB; staging has size/time/storage bounds.

## Verified local evidence

Passed named procedures: v28-cold-recovery-r5 (checkpoint binding/pause;700000 unallocated custody once; original-wallet wrong proof; hold/replay/unsigned cancellation/linked retry; restricted persisted signed refund; missing saved hash then positive settlement;100000000000000000 company loss and21000000000000 unknown-outflow gas once; strict finalized balance rescan), v28-scanners-r2 (SOL/TRON native and token paths, skipped slots, self-transfer neutrality, replay equality, caps, wrong network/lag/outage/disagreement and contradictory balances), v28-idle-heartbeat (restricted encrypted key/RPC health, no nonce/state mutation; missing key/outage cannot refresh).

v28-operations-portability-r4 passed selected-field JSON/CSV, cached environment statistics, recurrence without ordinal reuse,3/day HTTP attempts,64KiB request bounds and reconciliation. v28-archive-portal passed actual encrypted private download/checksum/staging; malformed upload stayed unverified and never affected financial rows. Native full restore verifies70 retained inventories/80 schema tables/73 migrations into fresh inactive gw_v28_cold_restore_r2; forward migrations skip unchanged checksums. No worker starts. Drizzle incremental0003 and static80/80 grant/resource classification pass.

Final local check:all, production build, Drizzle generation/check, grant/secret scans and bundle checks pass. Homepage194.91KiB/9scripts; maximum API trace1.422MiB gzip/5.923MiB raw/241files; all client chunks0.687MiB gzip. Actual390px EN/FR staff browser passed fresh dummy MFA, recovery controls, selected-field JSON and exact encrypted-site download, real unverified checksum upload, keyboard focus/pause/reduced-motion and no clipping/auth persistence. Anonymous enabled statistics and authenticated inventory/one-asset workload passed; original policy restored through staff MFA. Sixteen local public read samples measured33.08ms p95; ten staff reads63.30ms. These are sequential local observations, not hosted latency/capacity. No automated regression/load suite was added.

## Preserved failures and limits

Earlier inconsistent gw_v27_native_refund_isolated remains inactive with its known negative held/phantom retry; no history was reset or concealed. New probe failures are retained: first immutable-row FOR UPDATE permission mismatch corrected with per-inflow advisory serialization; seed-only statistics toggle and read-only view misuse corrected with audited setting edits/direct aggregate; first recurrence scheduling issue corrected with permanent next ordinal and shared HTTP budget. Initial backup invocation omitted its explicit path and restore target had not yet been created; corrected commands/empty targets passed. All old archives remain bound to their own fingerprints. Browser scratch initially used the old configured origin; corrected WEB_ORIGIN passed without resetting any factor. Latency scratch first had a top-level-await error, then lacked an isolated workload key; corrected private bindings passed and the public flag was restored. A public statistics route authorization omission was found and fixed; anonymous access exposes only the closed aggregate DTO. Failed attempts/sources/logs remain retained.

**Financial release remains disabled.** Automatic approval review rejected changing web/signer readiness gates to true because it could enable real testnet operations. Both remain false; mainnet remains prohibited. Coding completion does not override that decision. Explicit approval of a concrete gate change, owner registry/address/key/configuration inputs and independently authenticated alert acceptance are required before release.

Hosted OAuth/Turnstile/RPC, actual wallet popups/broadcast/custody/native funding, live external ACK, mobile installation/LCP, quota/latency/capacity and required observation durations remain unrun owner/hosted acceptance. The generated RPC/wallet/database evidence proves contracts only.

## Repository completion

PR26 merged at3c070bce812700d2cd8f048ce95c78a712f91f34. Current completion branch:feat/phase-one-completion. Open the final PR and merge only after BOTH exact final-head push and PR CI succeed; never direct-push main. No remaining independent Phase One coding is intentionally deferred. Keep release gates disabled until separately authorized.

v28
