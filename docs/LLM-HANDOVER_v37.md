# Gifters World — autonomous remediation handover v37

Updated: **14 October 2026 at 06:57:57 AM WAT**.

Read in order: docs/PRD.md, docs/PROJECT-STATUS_v37.md, docs/SETUP.md, docs/HOW-IT-WORKS.md, AGENTS.md, docs/custom-bugs-report_v37.md, docs/custom-bugs-fix-plan_v37.md. Read relevant installed Next guides before code changes.

The owner approved all Round One fixes, autonomous Rounds Two/Three and continued remediation, every Phase Two milestone and final bug fixes before deferred tests. Continue without plan or milestone acceptance pauses. Use best recommendations and substantial verified batches. Merge only after BOTH push and pull-request CI succeed for the exact final head. No delegation requested. CRON frequency and test-only issues remain excluded.

Round One: **56/72 tracked findings implemented and locally verified;16 open**. The original audit had70 findings; P1-071/P1-072 were discovered and fixed during remediation. This is item accounting, not a weighted Phase One percentage. Phase One remediation is incomplete; Phase Two has not started.

PR35 merged atf99e2d2 after push38514924520 and pull_request38514930961 both succeeded for exact head5d7cf5b45a860c2d912ce86b51f296e75946b0a9. Current branch feat/phase-one-remediation-round1h is based on that main commit and awaits its own final-head dual CI/PR merge. Never direct-push main.

Read [custom-bugs-report_v37.md](custom-bugs-report_v37.md) and [custom-bugs-fix-plan_v37.md](custom-bugs-fix-plan_v37.md) for every finding and acceptance. All four current filenames match_v37; earlier versions remain in Git history. Rename all four together in the next batch and update cross-links, WAT12-hour headers/footers and mirrored markers.

Implemented: P1-001, P1-002, P1-003, P1-004, P1-005, P1-006, P1-007, P1-008, P1-010, P1-011, P1-012, P1-013, P1-014, P1-015, P1-016, P1-017, P1-018, P1-020, P1-021, P1-022, P1-023, P1-024, P1-025, P1-026, P1-027, P1-029, P1-030, P1-031, P1-032, P1-033, P1-034, P1-035, P1-036, P1-037, P1-040, P1-041, P1-042, P1-043, P1-044, P1-046, P1-050, P1-052, P1-054, P1-055, P1-056, P1-057, P1-058, P1-059, P1-060, P1-061, P1-066, P1-068, P1-069, P1-070, P1-071, P1-072.

Open: P1-009, P1-019, P1-028, P1-038, P1-039, P1-045, P1-047, P1-048, P1-049, P1-051, P1-053, P1-062, P1-063, P1-064, P1-065, P1-067.

## V37 changes

New P1-072: two independent EVM provider contracts confirmed native/ERC20 self-transfers as positive principal, although sender=recipient produces no incoming asset movement. Native invoice creation and funding/deposit accounting previously lacked that equality fence. SDK transfer validation, fee estimation and payload construction now reject same-address participants across EVM/SOL/TRON; invoice/payout quotes and settlement also fence this path. English/French errors explain that another verified wallet is required. Existing records, holds and signed histories remain unchanged and require review if inconsistent; no automatic financial correction is inferred.

Native wallet summaries now expose exact per-asset available, total held, income-held, refundable principal, refund-held, settled net payouts and net income. Immutable journal/obligation identity separates refund holds from income holds; refund capital never enters net income. Native portfolio reads use a repeatable snapshot with the current-session completion fence. Disabled currencies with historical net payouts remain visible. Labels and the income definition are bilingual; the private summary is lazy-loaded to preserve the homepage budget.

## Verification and boundaries

Named manual-self-transfer-probe-r2 reproduced positive native/ERC20 self-transfer evidence using generated independent providers, without crediting a ledger. Manual-self-transfer-fix passed EVM/SOL/TRON validation, fee estimation and construction rejection before any network request. Manual-wallet-totals-r4 matched exact available6500000/held4000000/income-held1000000/refund-held3000000/net-paid1000000/net-income8500000 in a rollback-only generated journal scenario, excluded another user and preserved the original expired/closed signed source. The earlier cloned fixture omitted its unique business key; that harness failure rolled back and is retained. Distinct-party native/ERC20 contracts retained exact principal and canonical proof after the fence. No broadcast or broad automated suite ran.

Required check:all/build/bundle pass (homepage199.27KiB/200; maximum API1.420MiB/3; client aggregate0.645MiB). Evidence is under /workspace/work/remediation-v37. All four documentation filenames advance together to_v37. No schema/migration changes:86 tables/90 migrations/73 retained inventories. The exact v36 signed archive and inactive gw_v36_restore remain valid for this unchanged schema. Both financial gates remain false. External funding/OAuth/wallet/ACK/mobile/hosted capacity measurements remain unrun.

Both financial readiness gates remain false. Automatic approval review previously rejected enabling them because broad completion approval did not authorize real testnet operations. Do not retry or bypass. Mainnet remains prohibited. Hosted OAuth/CAPTCHA, real wallets/broadcast/funding, external ACK, mobile installation/LCP, vendor quotas/latency/capacity and sustained monitoring remain unrun; generated procedures do not substitute for those inputs.

## Next work

Continue the16 remaining IDs, with historical address inventory/SOL cutoff and storage/retention work still open. Complete fresh full-codebase Rounds Two and Three, fix new or reopened findings, then implement every PRD §32 P2.0–P2.4 milestone and final bug fixes before deferred tests. No acceptance pause remains.

Node22.23.3 at /workspace/work/tooling/node-v22.23.3-linux-x64/bin; npm cache /workspace/work/npm-cache. Verified TLS PG17 port55433 and CA /workspace/work/v20-tls/root.pem. Network/listener/tsx need network permission; Git metadata writes need /workspace/onyiy/.git. Never print secrets/cookies/signed bytes/raw driver parameters. Preserve immutable migration checksums and financial histories, positive evidence/holds and original-sender refunds. Corrections append compensating journals.

Signed: **14 October 2026 at 06:57:57 AM WAT**

v37
