# Phase One implementation status

Updated: 13 October 2026. **93.17% implemented / 6.83% remaining.** Weighted implementation estimate; hosted/live acceptance and release authorization remain separate.

**Owner directive:** continue all M0–M8 irrespective of M1/M2 or earlier acceptance until100%, in as few substantial verified iterations as practical. Do not pause after this batch or enable unverified external sending.

| Milestone | Weight | Implementation | Contribution | Remaining implementation |
|---|---:|---:|---:|---|
| M0 schema/config/runtime | 10% | 99% | 9.90% | Final resource/budget closure |
| M1 GIV money/queues | 15% | 100% | 15.00% | Implementation verified; hosted acceptance deferred |
| M2 identity/permissions | 15% | 98% | 14.70% | Final recovery/permission procedure consolidation |
| M3 first testnet adapter | 15% | 92% | 13.80% | Trusted checkpoint/cold reconciliation, unmatched inflow discovery/recovery |
| M4 responsive product | 15% | 97% | 14.55% | Remaining metrics/accessibility/complete pagination |
| M5 administration/portability/recovery | 10% | 95% | 9.50% | Selected-user/site portability interface |
| M6 remaining adapters | 8% | 94% | 7.52% | Full checkpoint/scan contracts across supported networks |
| M7 bounded prototype | 7% | 55% | 3.85% | Remaining packaging/capacity tooling; hosted measurements deferred |
| M8 financial acceptance tooling | 5% | 87% | 4.35% | Cold checkpoint/unmatched scanner, idle/stuck/recurring operational conditions |

## v27 verified behavior

EVM receipts now require exact canonical height, transaction position/membership, status0/1, bounded gas/price and matching nonremoved token log. Contradictory/malformed evidence stays pending. All three adapters provide a finalized block reference only when both independently pinned providers agree. Native reorg review requires positive replacement of the original/current finalized anchor; absence or outage alone creates no loss. A compensating cash loss preserves original beneficiary balances, allocations, tickets and paid history. New activity in that currency pauses. Exact transfer reconfirmation restores cash and points once. The latest reconfirmed height/hash becomes the next anchor; a stale first block cannot charge a second loss.

Native TRX remains operational gas only. It builds/signs exact TransferContract intent, separates bandwidth/recipient activation costs and checks both testnet block references again before signing. Native/token TRON builders reject altered recipient, memo, oversized serialization, stale/wrong reference and unsupported permission. No actual broadcast or physical custody is claimed.

Staff reserve sweeps use only the environment-configured destination and recorded surplus, preserving beneficiary liabilities, reserved gas and the approved gas floor. Quotes move no money; fresh MFA confirmation holds once. Restricted signing supports operational native assets without enabling their gift plans. Successful settlement moves company cash into a reserve asset once. Unsigned or independently proved failed/expired recovery returns full company principal while retaining actual gas expense. Unresolved signed lineage cannot release. Business/original-sender refund recovery similarly preserves full principal, proves every attempt and pins closed-parent retry lineage; no identity restoration or new refund destination is granted.

Own history/export includes native invoices/events/payouts in twelve encrypted bounded sections. Native withdrawal receipts report actual member fee after the committed refund and the canonical journal-linked hash. Staff has a private paginated request list with masked destinations and recovery/reorg/sweep controls. Actual390px EN/FR member and staff browser checks passed with real private backend rows; staff used fresh isolated dummy TOTP enrollment/step-up, no interception.

Reconciliation now combines native and GIV holds/refunds and reports unresolved native reorgs. Refund legs require an exact obligation-bound hold. Commit-time nonnegative guards cover available, held, incoming and refund user payables, with transaction locks serializing their postings. Static resource/grant checks now recognize CREATE TABLE with and without IF NOT EXISTS.

## Actual evidence and failures retained

Passed named work procedures: v27-evm-membership; canonical-blocks; native-reorg; reorg-anchor-resume; native-export-receipts; sweep-resume-r2; business-unsigned-resume; native-refund-r2; payable-guard-r2; native-reconcile/common, held-source and sweep-source; history-browser-r6; admin-browser-r2; trx-r3. Source gw_v27_m1_final passed all six ordered GIV procedures:21-gift/bootstrap, integrity/concurrent spending, jobs/HMAC, withdrawal recovery, incoming exceptions and reorg/reconfirmation. No broad automated suite was added.

Preserve stopped sources and failures. Forward053a permits only owner-only one-time backfill from exact original anchor evidence before054, retaining prior checksums. Forward058 fixes the reproduced sweep closure mismatch with the old withdrawal-specific guard. Forward060 qualifies a PL/pgSQL variable in operational recovery.

The first refund retry fixture gw_v27_native_refund_isolated remains **inconsistent and inactive**: a reused hold key produced a phantom retry and negative held balance. No journals were rewritten or source reset to conceal it. Per-obligation hold keys and forward061/062 prevent recurrence; fresh gw_v27_native_refund_isolated_r2 verifies500000 refunded liability,0 held after failed/retried cancellation and45000000000000 company gas once. The first negative-payable probe failed its assertion matcher while the actual guard correctly rejected the transaction; corrected matcher passed. Browser scratch failures included blank-tab context, an early dropdown selector, and an invalid simulation provider selector; preserved logs are not hosted failures.

Current71 Drizzle tables/migrations001–062 plus053a have explicit RLS/grants. Encrypted work/backups/v27-native.gwbackup retains61 inventories from gw_v27_treasury_sweep_isolated_r2, including reorg and signing/sweep/recovery history. Exact fresh gw_v27_treasury_restore matches rows/schema/RLS/grants and skips all applied migrations; it remains inactive. Its snapshot preceded the fresh staff UI enrollment. Older archives remain bound to their original code revisions and are never overwritten.

Local check:all, production build, generated Drizzle check, grants/secrets and bundle reporting pass. Homepage194.02KiB gzip/9scripts stays within200KiB. Final-head push and PR CI both must pass before merge. Generated local RPCs, wallet keys and dummy identity demonstrate contracts; hosted OAuth/Turnstile/RPC, external ACK, actual wallet popup/broadcast/custody, mobile installation and production capacity remain unrun.

## Continue immediately

Both web and signer implementation code gates remain false. Complete trusted cold checkpoints, unmatched inflow scans/refunds, idle signer heartbeat and stuck/recurring operational conditions, selected-user/site portability, metrics/accessibility/pagination and packaging/capacity tooling. Keep moving through all M0–M8 until100%; do not finalize at93.17%. Deferred owner credentials are separate release inputs.

v27
