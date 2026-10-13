# Phase One implementation status

Updated: 13 October 2026. **84.20% implemented / 15.80% remaining.** Weighted implementation estimate; hosted/live acceptance and release permission remain separate.

**Owner directive:** implement all M0–M8 irrespective of acceptance of M1, M2 or earlier milestones. Continue toward 100% Phase One in as few substantial verified iterations as practical. Do not wait for deferred acceptance or enable unverified external sending.

| Milestone | Weight | Implementation | Contribution | Verified / remaining |
|---|---:|---:|---:|---|
| M0 — schema/config/runtime | 10% | 98% | 9.80% | 64 Drizzle resources, migrations001–041, restricted roles, native inventory. Archive/scale closure remains. |
| M1 — GIV money/queues | 15% | 99% | 14.85% | Inherited v24 six scenarios and same-plan concurrency; no new GIV-money changes. |
| M2 — identity/permissions | 15% | 92% | 13.80% | Environment-bound identity and financial/browser scope fences. CAPTCHA and blocked-account/last-admin recovery remain. |
| M3 — first testnet adapter | 15% | 75% | 11.25% | Verified provisioning, wallet-approved incoming preparation, autonomous unknown-index observation, reserve funding, failed-fee closure/requote. Replacement/expiry/reorg/checkpoint/sweep closure remains. |
| M4 — responsive product | 15% | 92% | 13.80% | Actual390px EN/FR native ownership/payment browser observations; profile routes and explicit fee review. Complete native history/receipts/admin UX/accessibility remains. |
| M5 — admin/portability/recovery | 10% | 84% | 8.40% | Updated native archive57 retained/64 schemas and exact inactive restore. Selected-user/site UI and recovery closure remain. |
| M6 — remaining adapters | 8% | 75% | 6.00% | Generated EVM/SPL/TRC20 wallet sends, SPL setup separation/refund and canonical adapter evidence. Full operational TRX/expiry/replacement/provider closure remains. |
| M7 — bounded prototype release | 7% | 40% | 2.80% | Homepage193.51KiB/9scripts within200KiB; PWA inherited. Hosted/mobile/provider/capacity evidence unrun. |
| M8 — financial acceptance tooling | 5% | 70% | 3.50% | Native funding/observer/failed closure/reminder probes; isolated signer and non-signing financial scheduler. Replacement, checkpoints, sweeps, operational recovery remain. |

## v25 verified batch

Native asset identities are provisioned from the owner-verified server registry, with independent network/decimals validation, disabled staging and immutable binding. Native plan activation pins signed rate/base units and versions; resume/replay do not duplicate bootstrap positions. Native TRX is operational gas only and cannot enable a gift plan. No real contract/mint or platform address was invented.

The native portal links an injected wallet by explicit ownership proof; linking transfers nothing. Incoming review prepares only the frozen exact transfer, displays network/account-setup fees paid by the sender, and requires a separate wallet approval. EVM sends use transfer data rather than approvals, the wallet chooses its nonce; SPL permits only the exact transferChecked/ATA instructions; TRON verifies protobuf intent and testnet endpoint. Private drafts stay in component memory and clear immediately on identity change. Client callbacks check scope again before signing/sending. Home/gifts/wallet choose the native portal under the testnet profile; native wallet layout is dynamic to preserve nonce-CSP hydration. Deferred SDKs keep homepage budget bounded.

Authenticated submissions can stage a hash with event_index=-1 before a receipt exists. Durable bounded observation jobs discover one unique matching index and independently verify canonical finality; ambiguous/missing evidence cannot book money. Pending schedules a later tick; final confirmation and repeated ticks credit once. Hashes are canonical before permanent replay and cross-purpose event claims. A first-seen submission preserves its original time across later finality.

Generated verified native funding records debit treasury and credit contributed reserve equity, with an explicit funder ownership statement and independent receipt proof. They grant no member balance and do not book the funder's gas as company expense. Mixed-case replay is permanent and a changed sender conflicts. This is an implemented funding contract exercised through local RPC; no real physical funding/custody is claimed.

SOL network gas and recipient account setup are separate quote lines and posting purposes. The generated example uses5000 network/2039280 setup, with750/305892 USDT charges and693358 net; unused setup returns305892. Worker variance applies only to approved network gas; setup cannot silently increase. Live settings edits hold the exclusive financial-policy lock while signing/confirmation checks hold its shared lock.

A known executed failed withdrawal keeps gross held until all saved attempts are positively failed and independently reverified. The retained EVM fixture proves45000000000000 native gas,600000 held,13500 attributable approved charge,586500 returned,zero principal payout and one closure. Contradictory providers preserve the hold. Replay books nothing twice; a new quote links the previous immutable obligation and does not reserve/send automatically. Unresolved/expired attempts cannot use this release path. Forward041 fixes the reproduced metadata-view capability error; the failed fixture/history were retained.

Reminder ticks use a global daily-cap lock, permanent ordinal delivery keys, bounded pages and audited staff acknowledge/resolve. Concurrent ticks obey the cap. UTC business scheduling dispatches one asset/role per invocation and uses the existing manual/daily account locks and date keys. Its authenticated scheduler is opt-in; real scheduler/endpoint acceptance is unrun. Native admin controls are implemented, but their complete browser acceptance remains outstanding.

## Evidence and limits

Named work probes: manual-v25-provision-r3; manual-v25-native-funding; manual-v25-observer-index; manual-v25-spl-setup; manual-v25-hash-replay; manual-v25-wallet-send-r2; manual-v25-failed-recovery-resume; manual-v25-reminders; manual-v25-payment-browser-r4. Preserve all first failures/logs. The actual browser payment probe intercepted the catalog button gate solely in the named isolated fixture; product code gates remained false. Generated wallet keys stayed in Node, no real external broadcast occurred.

Source gw_v25_native uses verified TLS55433. It preserves staged/submitted hashes, contributed reserve, credited gifts, failed signing lineage/expense/closure and work. Encrypted native archive work/backups/v25-native.gwbackup has57 retained inventories/64 schema definitions; gw_v25_native_restore verifies exact rows/schema/RLS/grants and remains inactive. Earlier v24 sources/archives remain unchanged. Source fixture is simulation with isolated chain mode; archive format is explicitly testnet and retains labeled GIV fixtures. Never interpret it as physical custody or live recovery.

Local check:all/build/bundle/grants/secrets passed;109 EN/FR keys and193.51KiB homepage gzip/9scripts. Exact-head push/PR CI must both pass before merge. No broad automated suite, hosted providers, real browser wallet popup, live RPC, external ACK channel, mobile installation or production scale evidence is claimed.

## Continue immediately

Both web financialImplementationComplete and signer implementationComplete remain false. Close unsigned re-quote state, signed replacement/expiry lineage, native reorg/checkpoint reconciliation, unallocated incoming recovery, protected sweeps/hot caps, complete liability/blocked-account recovery, CAPTCHA, selected-user/site portability UI, native paginated history/receipts/product/admin acceptance, public metrics/accessibility/archive/retention. Continue M0–M8 irrespective of acceptance toward100%; do not finalize at84.20%.

v25
