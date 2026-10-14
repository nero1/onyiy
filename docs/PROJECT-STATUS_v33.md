# Gifters World — implementation and bug remediation status v33

Updated: **14 October 2026 at 04:57:52 AM WAT**.

The owner approved all Round One fixes, autonomous Rounds Two/Three and continued remediation, every Phase Two milestone and final bug fixes before deferred tests. Continue without plan or milestone acceptance pauses. Use best recommendations and substantial verified batches. Merge only after BOTH push and pull-request CI succeed for the exact final head. No delegation requested. CRON frequency and test-only issues remain excluded.

Round One: **48/71 tracked findings implemented and locally verified;23 open**. The original audit had70 findings; P1-071 was discovered and fixed during remediation. This is item accounting, not a weighted Phase One percentage. Phase One remediation is incomplete; Phase Two has not started.

PR31 merged at59a8289 after push38507705481 and pull_request38507767963 both succeeded for exact head2ca05c2390fd1aefe516415f83aed15449b509ce. Current branch feat/phase-one-remediation-round1d is based on that main commit and awaits its own final-head dual CI/PR merge. Never direct-push main.

Read [custom-bugs-report_v33.md](custom-bugs-report_v33.md) and [custom-bugs-fix-plan_v33.md](custom-bugs-fix-plan_v33.md) for every finding and acceptance. All four current filenames match_v33; earlier versions remain in Git history. Rename all four together in the next batch and update cross-links, WAT12-hour headers/footers and mirrored markers.

Implemented: P1-001, P1-002, P1-003, P1-004, P1-005, P1-006, P1-007, P1-008, P1-010, P1-011, P1-012, P1-014, P1-015, P1-016, P1-017, P1-018, P1-020, P1-021, P1-022, P1-023, P1-024, P1-025, P1-026, P1-027, P1-029, P1-030, P1-031, P1-032, P1-033, P1-034, P1-035, P1-036, P1-037, P1-040, P1-041, P1-043, P1-044, P1-046, P1-050, P1-052, P1-055, P1-056, P1-057, P1-066, P1-068, P1-069, P1-070, P1-071.

Open: P1-009, P1-013, P1-019, P1-028, P1-038, P1-039, P1-042, P1-045, P1-047, P1-048, P1-049, P1-051, P1-053, P1-054, P1-058, P1-059, P1-060, P1-061, P1-062, P1-063, P1-064, P1-065, P1-067.

## V33 changes

Public statistics use an environment-specific nonblocking transaction try-lock. Contention returns either a safe stale projection labelled with its observation time or an explicit cold pending result; it never queues behind another refresh. The public component hides pending totals and labels older snapshots.

RPC display reads share bounded in-flight work by endpoint/key. Fresh financial evidence bypasses both cache and single-flight. The overall timeout begins before lane admission and includes queue/throttle/fetch/body time; expired work never reaches a provider. Failed dispatched requests impose a bounded jittered cooldown without replaying broadcasts.

Remote caches enforce three-second I/O deadlines, one-MiB bodies, validated response shapes, eight concurrent commands, redirect rejection and disposal. REST disposal aborts owned requests; Redis disposal closes only owned sockets, while unresolved borrowed-client commands continue counting toward the capacity bound. Hosted Redis requires TLS and disables unlimited reconnect/offline queues. Public cache availability grants no financial authority. Full destination/DNS enforcement remains P1-042.

All private portal route families emit noindex/nofollow/noarchive, including nested settings and wallet pages. Recovery's page-level metadata no longer overrides noarchive. A complete successful help locale refresh atomically replaces its public inventory and removes withdrawn/renamed slugs, preserving the other locale. Offline help shows the saved observation time and schema version; malformed mixed-locale inventories cannot delete saved content.

## Verification and boundaries

Named isolated procedures passed RPC safe-read coalescing/fresh bypass/queue deadlines/no dispatch after expiry; REST hangs/redirects/oversize/disposal and Redis borrowed/owned lifecycle; real Chromium IndexedDB help replacement/withdrawal/invalid inventory/locale preservation; fresh inactive gw_v33_statistics clone cold/stale statistics contention and subsequent refresh. Required check:all, production build and bundle checks pass; homepage198.96KiB/200KiB, maximum API1.449MiB/3MiB gzip, clients0.643MiB. All eleven private paths passed production HTML metadata inspection; initial inspection found recovery page overriding noarchive and the fix is included. No broad automated test suite was added or run.

No schema/migration changes in v33:86 Drizzle tables,88 migrations (001–087 plus053a),73 retained archive inventories. Existing v32 exact signed archive/restore remains valid. Original failed sources, archives, GW25 partial factor and signed histories remain untouched. Scratch/private evidence is under /workspace/work/remediation-v33, outside Git. Financial gates were never activated.

Both financial readiness gates remain false. Automatic approval review previously rejected enabling them because broad completion approval did not authorize real testnet operations. Do not retry or bypass. Mainnet remains prohibited. Hosted OAuth/CAPTCHA, real wallets/broadcast/funding, external ACK, mobile installation/LCP, vendor quotas/latency/capacity and sustained monitoring remain unrun; generated procedures do not substitute for those inputs.

## Next work

Continue the23 remaining IDs, with historical address inventory/resumable recovery/SOL cutoff and storage/retention work still open. Complete fresh full-codebase Rounds Two and Three, fix new or reopened findings, then implement every PRD §32 P2.0–P2.4 milestone and final bug fixes before deferred tests. No acceptance pause remains.

Node22.23.3 at /workspace/work/tooling/node-v22.23.3-linux-x64/bin; npm cache /workspace/work/npm-cache. Verified TLS PG17 port55433 and CA /workspace/work/v20-tls/root.pem. Network/listener/tsx need network permission; Git metadata writes need /workspace/onyiy/.git. Never print secrets/cookies/signed bytes/raw driver parameters. Preserve immutable migration checksums and financial histories, positive evidence/holds and original-sender refunds. Corrections append compensating journals.

Signed: **14 October 2026 at 04:57:52 AM WAT**

v33
