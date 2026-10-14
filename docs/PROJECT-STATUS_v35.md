# Gifters World — implementation and bug remediation status v35

Updated: **14 October 2026 at 05:14:19 AM WAT**.

The owner approved all Round One fixes, autonomous Rounds Two/Three and continued remediation, every Phase Two milestone and final bug fixes before deferred tests. Continue without plan or milestone acceptance pauses. Use best recommendations and substantial verified batches. Merge only after BOTH push and pull-request CI succeed for the exact final head. No delegation requested. CRON frequency and test-only issues remain excluded.

Round One: **53/71 tracked findings implemented and locally verified;18 open**. The original audit had70 findings; P1-071 was discovered and fixed during remediation. This is item accounting, not a weighted Phase One percentage. Phase One remediation is incomplete; Phase Two has not started.

PR33 merged at26f3904 after push38509715971 and pull_request38509721196 both succeeded for exact headf50d456a1ebaa0dbb31fc190fdc351bf555eebb5. Current branch feat/phase-one-remediation-round1f is based on that main commit and awaits its own final-head dual CI/PR merge. Never direct-push main.

Read [custom-bugs-report_v35.md](custom-bugs-report_v35.md) and [custom-bugs-fix-plan_v35.md](custom-bugs-fix-plan_v35.md) for every finding and acceptance. All four current filenames match_v35; earlier versions remain in Git history. Rename all four together in the next batch and update cross-links, WAT12-hour headers/footers and mirrored markers.

Implemented: P1-001, P1-002, P1-003, P1-004, P1-005, P1-006, P1-007, P1-008, P1-010, P1-011, P1-012, P1-014, P1-015, P1-016, P1-017, P1-018, P1-020, P1-021, P1-022, P1-023, P1-024, P1-025, P1-026, P1-027, P1-029, P1-030, P1-031, P1-032, P1-033, P1-034, P1-035, P1-036, P1-037, P1-040, P1-041, P1-042, P1-043, P1-044, P1-046, P1-050, P1-052, P1-055, P1-056, P1-057, P1-058, P1-059, P1-060, P1-061, P1-066, P1-068, P1-069, P1-070, P1-071.

Open: P1-009, P1-013, P1-019, P1-028, P1-038, P1-039, P1-045, P1-047, P1-048, P1-049, P1-051, P1-053, P1-054, P1-062, P1-063, P1-064, P1-065, P1-067.

## V35 changes

RPC, signed alert POSTs and REST cache traffic now use one server-only transport. Exact hostnames must appear in OUTBOUND_ALLOWED_HOSTS. Every resolved address must be public; mixed private/public DNS results reject, as do redirects and unsafe IP ranges. The socket receives the already validated address through a pinned lookup, with the original hostname retained for TLS identity verification and certificate checks explicitly enabled. DNS and sockets share caller deadlines and bounded admission.

Owned Redis connections require rediss, validate database/path/query shape, resolve and approve the destination once, connect directly to that pinned IP with original-host TLS SNI, and disable reconnect loops. Injected Redis clients remain caller-owned trusted transports; no app URL creates those sockets. Display caching grants no financial authority.

Narrow loopback fixtures require explicit fixture mode in simulation outside Vercel; fixture flags cannot bypass policy in testnet. Default host allowlist is empty and fails closed until the operator supplies each RPC/provider/webhook/cache hostname. No wildcard or IP-literal allowlists are accepted. Existing real hosted destinations must be explicitly configured before use.

## Verification and boundaries

Named manual-destinations passed private/link-local/mapped/tunnel/documentation IP rejection, exact-host admission, mixed DNS rejection, generated DNS rebinding with one validated socket address and TLS identity checks, real isolated loopback POST, redirect rejection and forbidden testnet fixture bypass. Manual-rpc-cache passed again through the pinned transport: safe-read coalescing, fresh financial bypass, queue deadlines, hung/redirecting/oversized REST bounds and cache lifecycle. Generated DNS/socket evidence is explicitly labelled; no external provider was contacted.

Required check:all, production build and bundle checks pass (homepage198.96KiB/200; API1.452MiB/3; clients0.643MiB). Evidence is recorded in /workspace/work/remediation-v35. No schema/migration changes:86 tables,88 migrations (001–087 plus053a),73 retained archive inventories. Existing exact archives/signed histories/failed sources remain untouched. Both financial gates remain false and no broad automated test suite or live send ran.

Both financial readiness gates remain false. Automatic approval review previously rejected enabling them because broad completion approval did not authorize real testnet operations. Do not retry or bypass. Mainnet remains prohibited. Hosted OAuth/CAPTCHA, real wallets/broadcast/funding, external ACK, mobile installation/LCP, vendor quotas/latency/capacity and sustained monitoring remain unrun; generated procedures do not substitute for those inputs.

## Next work

Continue the18 remaining IDs, with historical address inventory/resumable recovery/SOL cutoff and storage/retention work still open. Complete fresh full-codebase Rounds Two and Three, fix new or reopened findings, then implement every PRD §32 P2.0–P2.4 milestone and final bug fixes before deferred tests. No acceptance pause remains.

Node22.23.3 at /workspace/work/tooling/node-v22.23.3-linux-x64/bin; npm cache /workspace/work/npm-cache. Verified TLS PG17 port55433 and CA /workspace/work/v20-tls/root.pem. Network/listener/tsx need network permission; Git metadata writes need /workspace/onyiy/.git. Never print secrets/cookies/signed bytes/raw driver parameters. Preserve immutable migration checksums and financial histories, positive evidence/holds and original-sender refunds. Corrections append compensating journals.

Signed: **14 October 2026 at 05:14:19 AM WAT**

v35
