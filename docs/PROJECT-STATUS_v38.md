# Gifters World — implementation and bug remediation status v38

Updated: **14 October 2026 at 08:33:35 AM WAT**.

The owner approved all Round One fixes, autonomous Rounds Two/Three and continued remediation, every Phase Two milestone and final bug fixes before deferred tests. Continue without plan or milestone acceptance pauses. Use best recommendations and substantial verified batches. Merge only after BOTH push and pull-request CI succeed for the exact final head. No delegation requested. CRON frequency and test-only issues remain excluded.

Round One: **57/72 tracked findings implemented and locally verified;15 open**. The original audit had70 findings; P1-071/P1-072 were discovered and fixed during remediation. This is item accounting, not a weighted Phase One percentage. Phase One remediation is incomplete; Phase Two has not started.

PR36 merged at2434b30 after push38527849543 and pull_request38527856620 both succeeded for exact head2b012a3f4925c113fbc07a826c1722a2384c77f0. Current branch feat/phase-one-remediation-round1i awaits its own final-head dual CI/PR merge.

Read [custom-bugs-report_v38.md](custom-bugs-report_v38.md) and [custom-bugs-fix-plan_v38.md](custom-bugs-fix-plan_v38.md) for every finding and acceptance. All four current filenames match_v38; earlier versions remain in Git history. Rename all four together in the next batch and update cross-links, WAT12-hour headers/footers and mirrored markers.

Implemented: P1-001, P1-002, P1-003, P1-004, P1-005, P1-006, P1-007, P1-008, P1-010, P1-011, P1-012, P1-013, P1-014, P1-015, P1-016, P1-017, P1-018, P1-019, P1-020, P1-021, P1-022, P1-023, P1-024, P1-025, P1-026, P1-027, P1-029, P1-030, P1-031, P1-032, P1-033, P1-034, P1-035, P1-036, P1-037, P1-040, P1-041, P1-042, P1-043, P1-044, P1-046, P1-050, P1-052, P1-054, P1-055, P1-056, P1-057, P1-058, P1-059, P1-060, P1-061, P1-066, P1-068, P1-069, P1-070, P1-071, P1-072.

Open: P1-009, P1-028, P1-038, P1-039, P1-045, P1-047, P1-048, P1-049, P1-051, P1-053, P1-062, P1-063, P1-064, P1-065, P1-067.

## V38 changes

Public manifest/catalog/native-catalog/help/statistics cache-miss leaders now pass bounded local IP/route admission and the shared PostgreSQL reads budget. Warm hits and coalesced followers perform no limiter writes. Local storage retains live budgets, caps1024 keys, and shares one overflow budget; failed shared admission cannot start a fresh read. Existing cached public DTOs remain available within their freshness window. Vercel alone supplies the trusted forwarding header; arbitrary forwarding headers are ignored and equivalent IPv6 spellings share one identity. Simulation account listing is admitted and capped100. Help redirects use a bounded published inventory cache, so arbitrary slug probes no longer cause one database lookup each. OAuth start/callback/session limits from v30 remain enforced.

## Verification and boundaries

Named manual-public-admission-r2 passed cold admission, zero writes for20 warm hits, shared rejection with cached availability, local rejection before another write,12 coalesced misses consuming one admission, and cached availability/closed misses during a real refused database connection. The first harness closed the ESM database instance while the server used its CJS instance, so its outage assertion failed; the corrected procedure closes the actual application instance and retains both logs. Generated rate rows are ephemeral and no financial history changed. Evidence is under /workspace/work/remediation-v38.

Required check:all/build/bundle pass (homepage199.27KiB/200; maximum API1.420MiB/3; clients0.645MiB). No schema changes:86 tables/90 migrations/73 retained inventories. Both financial gates remain false; no live send or broad automated suite ran. Existing archives and failed/signed sources remain preserved.

## Next work

Continue the15 remaining IDs, with historical address inventory/SOL cutoff and storage/retention work still open. Complete fresh full-codebase Rounds Two and Three, fix new or reopened findings, then implement every PRD §32 P2.0–P2.4 milestone and final bug fixes before deferred tests. No acceptance pause remains.

Node22.23.3 at /workspace/work/tooling/node-v22.23.3-linux-x64/bin; npm cache /workspace/work/npm-cache. Verified TLS PG17 port55433 and CA /workspace/work/v20-tls/root.pem. Network/listener/tsx need network permission; Git metadata writes need /workspace/onyiy/.git. Never print secrets/cookies/signed bytes/raw driver parameters. Preserve immutable migration checksums and financial histories, positive evidence/holds and original-sender refunds. Corrections append compensating journals.

Signed: **14 October 2026 at 08:33:35 AM WAT**

v38
