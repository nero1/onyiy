# Gifters World — implementation and bug remediation status v32

Updated: **14 October 2026 at 04:41:31 AM WAT**.

The owner approved all Round One fixes, autonomous Rounds Two/Three and continued remediation, every Phase Two milestone and final bug fixes before deferred tests. Continue without plan or milestone acceptance pauses. Use best recommendations, complete substantial verified batches, and merge only after BOTH push and pull-request CI succeed for the exact final head. Financial readiness gates remain false; mainnet remains prohibited. CRON frequency and test-only issues remain excluded.

Round One: **43/71 tracked findings implemented and locally verified;28 remain open**. The initial audit had70 findings; P1-071 was discovered and fixed during remediation. This is item accounting, not a weighted Phase One percentage. Phase One remediation is incomplete; Phase Two has not started. Historical v28 feature coverage does not establish current audit completion.

Current branch feat/phase-one-remediation-round1c is based on PR30/main fa5d71bd47c0ed51c7f74c758500769218334064. V32 awaits its own exact-head dual CI and PR merge. PR29 merged after push38485886774/PR38485891336 succeeded forab1d7b5509fd215645448641065a2705cdf389ba; PR30 after push38500938562/PR38500945296 succeeded for9bb4004e964c38ef2e31c884545e5ba2c70433ba.

Read [custom-bugs-report_v32.md](custom-bugs-report_v32.md) and [custom-bugs-fix-plan_v32.md](custom-bugs-fix-plan_v32.md) for every finding, affected files, fixes, acceptance and current tracker. All four current filenames match_v32; earlier versions remain in Git history and the docs check enforces matching versions.

Implemented: P1-001, P1-002, P1-003, P1-004, P1-005, P1-006, P1-007, P1-008, P1-010, P1-011, P1-012, P1-014, P1-015, P1-016, P1-017, P1-018, P1-020, P1-021, P1-022, P1-023, P1-024, P1-025, P1-026, P1-027, P1-029, P1-030, P1-031, P1-032, P1-033, P1-034, P1-035, P1-036, P1-037, P1-044, P1-046, P1-052, P1-055, P1-056, P1-057, P1-068, P1-069, P1-070, P1-071.

Open: P1-009, P1-013, P1-019, P1-028, P1-038, P1-039, P1-040, P1-041, P1-042, P1-043, P1-045, P1-047, P1-048, P1-049, P1-050, P1-051, P1-053, P1-054, P1-058, P1-059, P1-060, P1-061, P1-062, P1-063, P1-064, P1-065, P1-066, P1-067.

## V32 changes

Account deletion erases expendable admin-message bodies across notifications/outbox/jobs, preserves original digests and permanent identities, and continues in bounded pages when needed. Authentication cleanup honors holds, expiry/replay windows and active dependencies. Chain observation keeps one persisted deadline-driven job per submitted deposit with bounded backoff and a review limit.

Alert keys bind immutable bytes/hash and occurrence; obsolete deliveries retire after acknowledgement/resolution, fresh critical work precedes warning retries within the common HTTP cap, and reopened occurrences reset escalation without reusing ordinals. Request origins correlate HTTP/audit/journal/job/error records. Expected failures use typed status/retry categories, English/French labels and safe support references.

Operational diagnostics sample indexed backlog/DLQ/age, self-role lock waits, current alert HTTP budget and fresh owner-measured provider quotas. Staff can record a measured quota with proof reference/revision; public health returns bounded aggregate counters/flags without actors, proof references or capacities. Unsupported diagnostic thresholds reject rather than silently truncate semantics.

## Verification and preserved evidence

Named local procedures passed: immutable alert ACK-loss retry/acknowledgement fence/critical priority/occurrence reset; delivered and queued admin-message redaction retaining digests and all money; expiry/hold/live-family/TOTP/rate cleanup; one durable chain observation across pending deadlines and final confirmation; request origin in HTTP/audit/outbox/job and typed EN/FR failures; bounded operational backlog/DLQ/age/lock/quota diagnostics and public redaction. The lock threshold case used one generated observation, while the actual self-role sampler ran without extra privileges. Provider quota measurements require fresh audited owner evidence for the current DB/origin/project; real vendor measurements and workload timing remain unrun.

Final local check:all/build/bundle pass; homepage198.73KiB/200KiB, maximum API1.449MiB/3MiB gzip, aggregate clients0.642MiB gzip. Updated archive site-financial-final_v32.gwbackup verifies73 retained inventories/86 tables/88 migrations into fresh inactive gw_v32_restore. Ephemeral diagnostics/auth/session/nonce/cursor data are omitted. Financial IDs, redacted original digests, audit/history and replay keys remain exact. No worker/send was activated. No broad automated test suite was added or run.

Retained failures: legacy attempted alert bodies cannot be reconstructed, so uncertain retries are retired without inventing snapshots. Privacy dispatch exposed microsecond-to-JavaScript timestamp compatibility; forward084 fixes the comparison. Expiry cleanup exposed a trigger record-shape issue; forward085 fixes it. Immutable TOTP replay rows remain without UPDATE privileges; exact retired-key deletion does not use FOR UPDATE. Generated fixture cipher/Date parser errors were corrected without resetting data and are not application findings. Intermediate bundles200.43/200.07KiB failed; private auth/inbox deferral restored budget. All original v27/v28 failed sources, GW25 partial factor, prior archives and signed histories remain untouched.

Hosted OAuth/CAPTCHA, real wallets/broadcast/funding, external ACK, mobile installation/LCP, hosted quota/latency/capacity and sustained monitoring remain unrun. Generated contracts do not substitute for them. Automatic approval review previously rejected enabling financial readiness because broad completion approval did not authorize real testnet operations; both gates remain false. Do not retry or bypass that decision. Mainnet remains prohibited.

## Next work

Merge v32 after both exact-final-head CI events pass, then continue the28 remaining IDs, prioritizing historical treasury inventory, resumable recovery budgets and SOL accounting cutoff; retention/portability/schema and remaining product/i18n/SEO/help surfaces follow. Complete fresh full-codebase Rounds Two and Three, fix any new/reopened findings, then implement P2.0–P2.4 and final bug fixes before deferred tests. No acceptance pause remains.

Signed: **14 October 2026 at 04:41:31 AM WAT**

v32
