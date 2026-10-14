# Gifters World — implementation and bug remediation status v36

Updated: **14 October 2026 at 05:50:09 AM WAT**.

The owner approved all Round One fixes, autonomous Rounds Two/Three and continued remediation, every Phase Two milestone and final bug fixes before deferred tests. Continue without plan or milestone acceptance pauses. Use best recommendations and substantial verified batches. Merge only after BOTH push and pull-request CI succeed for the exact final head. No delegation requested. CRON frequency and test-only issues remain excluded.

Round One: **54/71 tracked findings implemented and locally verified;17 open**. The original audit had70 findings; P1-071 was discovered and fixed during remediation. This is item accounting, not a weighted Phase One percentage. Phase One remediation is incomplete; Phase Two has not started.

PR34 merged atcab8a95 after push38510489870 and pull_request38510495165 both succeeded for exact head805f3d313387fada44c6d8c99ac15db428633f5d. Current branch feat/phase-one-remediation-round1g is based on that main commit and awaits its own final-head dual CI/PR merge. Never direct-push main.

Read [custom-bugs-report_v36.md](custom-bugs-report_v36.md) and [custom-bugs-fix-plan_v36.md](custom-bugs-fix-plan_v36.md) for every finding and acceptance. All four current filenames match_v36; earlier versions remain in Git history. Rename all four together in the next batch and update cross-links, WAT12-hour headers/footers and mirrored markers.

Implemented: P1-001, P1-002, P1-003, P1-004, P1-005, P1-006, P1-007, P1-008, P1-010, P1-011, P1-012, P1-013, P1-014, P1-015, P1-016, P1-017, P1-018, P1-020, P1-021, P1-022, P1-023, P1-024, P1-025, P1-026, P1-027, P1-029, P1-030, P1-031, P1-032, P1-033, P1-034, P1-035, P1-036, P1-037, P1-040, P1-041, P1-042, P1-043, P1-044, P1-046, P1-050, P1-052, P1-055, P1-056, P1-057, P1-058, P1-059, P1-060, P1-061, P1-066, P1-068, P1-069, P1-070, P1-071.

Open: P1-009, P1-019, P1-028, P1-038, P1-039, P1-045, P1-047, P1-048, P1-049, P1-051, P1-053, P1-054, P1-062, P1-063, P1-064, P1-065, P1-067.

## V36 changes

Recovery scans retain a within-block transaction/event cursor and explicit discovery, verification, booking, known-attempt index/settlement/expiry and final custody-comparison stages. Every committed step appends immutable progress evidence. Incoming and outgoing booking remain exact-once; confirmed evidence is reused only after identity/amount checks and a fresh canonical block check. Failed evidence also requires the matching canonical block/height. Unknown funds/outflows retain their existing rights and review fences.

Each discovery step covers one transaction and at most50 event/instruction slots per provider. EVM uses block hash lists, SOL signature lists and one selected transaction, and TRON reads only one selected receipt per provider. A busy block no longer requires100 verifications or1000 receipts in one HTTP invocation. Cursor advancement denotes a completed block only after every transaction/event is covered. Both providers must agree, including skipped SOL finalized slots; changed canonical hashes reject.

All nested RPC requests share an18-second/24-request budget for a recovery step, including throttle/queue/body time. Known signed attempts are processed individually across committed stages; positive expiry still requires both independent finalized providers and audited closure, never releasing a hold on absence alone. Staff recovery records display translated stage labels and within-block positions. Forward088 adds persisted progress/history, forward089 strengthens the JSON shape and cursor-height checks without rewriting applied checksums.

## Verification and boundaries

Named manual-paged-recovery-r2 passed two exact incoming journals through discover/verify/book/known/balance steps, replay fencing and retained progress inventories; a generated1001-transaction tail cursor completed and canonical conflict rejected; a hung provider obeyed one overall deadline. Manual-paged-scanners passed SOL50+50 instruction slices followed by event101, paired five-slot empty/gap inventories and skipped finalized slots, and TRON1001-transaction tail/log pagination with one receipt per provider per page; contradictions reject. The tail cases use generated retained positions, not a hosted throughput measurement.

Manual-sol-expiry-r3 passed staged known-attempt processing, positive dual-finalized expiry, held6000000 principal until audited closure, full release exactly once with no gas/principal-send journal, and a fresh reconciled scan. Both financial gates remain false; no external provider or broadcast was used. Preserved failed sources gw_v36_recovery and gw_v36_sol_expiry_r2 retain their unspent holds/reservations/history. An initial fixture argument-shape failure and the newly required simulation-only loopback scope were corrected without resetting any source. The successful isolated signer fixture’s encrypted payload key is retained privately outside Git.

Required check:all/build/bundle pass (homepage198.96KiB/200; maximum API1.419MiB/3; client aggregate0.643MiB). Evidence is under /workspace/work/remediation-v36. New financial archive site-financial-final_v36.gwbackup captures73 retained inventories/86 tables/90 migrations (001–089 plus053a) and verifies exact restore into fresh inactive gw_v36_restore. Discovery/verification progress, canonical proof, original expired signed bytes, financial IDs and audits remain exact. Database nonce and ephemeral authentication/dispatch data remain omitted. Forward089/current decoder also passed a rollback-only active scan and database rejection of a mismatched cursor-height shape, leaving the archived source unchanged. No broad automated suite or live financial execution ran.

Both financial readiness gates remain false. Automatic approval review previously rejected enabling them because broad completion approval did not authorize real testnet operations. Do not retry or bypass. Mainnet remains prohibited. Hosted OAuth/CAPTCHA, real wallets/broadcast/funding, external ACK, mobile installation/LCP, vendor quotas/latency/capacity and sustained monitoring remain unrun; generated procedures do not substitute for those inputs.

## Next work

Continue the17 remaining IDs, with historical address inventory/SOL cutoff and storage/retention work still open. Complete fresh full-codebase Rounds Two and Three, fix new or reopened findings, then implement every PRD §32 P2.0–P2.4 milestone and final bug fixes before deferred tests. No acceptance pause remains.

Node22.23.3 at /workspace/work/tooling/node-v22.23.3-linux-x64/bin; npm cache /workspace/work/npm-cache. Verified TLS PG17 port55433 and CA /workspace/work/v20-tls/root.pem. Network/listener/tsx need network permission; Git metadata writes need /workspace/onyiy/.git. Never print secrets/cookies/signed bytes/raw driver parameters. Preserve immutable migration checksums and financial histories, positive evidence/holds and original-sender refunds. Corrections append compensating journals.

Signed: **14 October 2026 at 05:50:09 AM WAT**

v36
