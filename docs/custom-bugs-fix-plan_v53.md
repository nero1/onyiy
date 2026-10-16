# Bug fix plan — Rounds One/Two/Three v53

Updated: **17 October 2026 at 12:58:03 AM WAT**.

**Resumed by the owner on 16 October 2026.** Round One: **74 of 74 findings implemented, locally verified and merged**. Round Two found and locally verified fixes for R2-004–006; local release checks passed; exact-head CI/merge pending. Round Three also fixed R3-001; Phase Two follows the checked merge. These counts are not a completion percentage or hosted acceptance.

Historical numbered migration paths below identify the original fixes in Git history. Fresh installations use `000_initial_schema.sql` then the forward files `001`, `002` and `003` in filename order; do not run removed historical files.

PR51 completed Round One and incidental R2-001–003. This v53 batch fixes the three fresh Round Two findings below; The same batch includes the Round Three recovery fix below; Phase Two follows its verified merge.

## Complete task list

1. **P1-001 — Expired or dismissed native invoices prevent another checkout.** Implemented; local checks passed; high priority; package A.
2. **P1-002 — A successful wallet send followed by a failed submission can prompt a second payment.** Implemented; local checks passed; high priority; package A.
3. **P1-003 — Native TRX status observation rejects its own event index.** Implemented; local checks passed; high priority; package A.
4. **P1-004 — Signer reservations ignore tighter runtime payout limits.** Implemented; local checks passed; high priority; package A.
5. **P1-005 — Recovery binding distinguishes pooler and signer endpoints for the same database.** Implemented; local checks passed; high priority; package B.
6. **P1-006 — Recovery can journal the same transaction fees more than once.** Implemented; local checks passed; high priority; package B.
7. **P1-007 — Solana fee attribution treats other transfers as account setup cost.** Implemented; local checks passed; high priority; package B.
8. **P1-008 — Saved expired Solana or TRON attempts can indefinitely block a recovery scan.** Implemented; local checks passed; medium priority; package B.
9. **P1-009 — Previous receiving addresses have no complete recovery monitoring inventory.** Implemented; local checks passed; high priority; package B.
10. **P1-010 — Pausing a plan rejects payments already committed under its frozen terms.** Implemented; local checks passed; high priority; package A.
11. **P1-011 — Accepted bootstrap destinations have no complete liability and payout support.** Implemented; local checks passed; high priority; package A.
12. **P1-012 — The signer's oldest fixed candidate batch can starve later payable work.** Implemented; local checks passed; medium priority; package C.
13. **P1-013 — Recovery pages have row bounds without a feasible total RPC/time budget.** Implemented and locally verified in v36; high priority; package B.
14. **P1-014 — The generic scheduler client signs only simulation and leaves testnet jobs undrained.** Implemented; local checks passed; high priority; package C.
15. **P1-015 — The hosted deploy workflow cannot migrate the selected testnet binding.** Implemented; local checks passed; medium priority; package C.
16. **P1-016 — Safe cancellation and unallocated-refund recovery are unreachable in the UI.** Implemented; local checks passed; medium priority; package D.
17. **P1-017 — Import and business operations use the generic staff rate policy.** Implemented; local checks passed; medium priority; package D.
18. **P1-018 — Rate budgets fragment across raw resource paths.** Implemented; local checks passed; medium priority; package D.
19. **P1-019 — Public database reads and OAuth callbacks bypass explicit rate budgets.** Implemented and locally verified in v38; medium priority; package D.
20. **P1-020 — A combined factor/IP bucket does not bound distributed MFA guesses.** Implemented; local checks passed; medium priority; package D.
21. **P1-021 — Wallet changes lack the PRD's fresh authentication and domain-bound challenge.** Implemented; local checks passed; high priority; package D.
22. **P1-022 — Ordinary API reads can return data from the previous client identity.** Implemented; local checks passed; high priority; package D.
23. **P1-023 — Concurrent browser tabs can revoke a valid refresh family.** Implemented; local checks passed; medium priority; package D.
24. **P1-024 — Secondary portals show login instead of using an available refresh session.** Implemented; local checks passed; medium priority; package D.
25. **P1-025 — Concurrent Google registrations can collide and fallback names violate configured lengths.** Implemented; local checks passed; medium priority; package D.
26. **P1-026 — Account deletion leaves private message content in notifications and job payloads.** Implemented; local checks passed; medium priority; package E.
27. **P1-027 — Expired authentication and rate records have no bounded cleanup lifecycle.** Implemented; local checks passed; medium priority; package E.
28. **P1-028 — Declared notification, terminal-job, ledger and audit retention is not implemented.** Implemented; local checks passed; package E.
29. **P1-029 — Pending chain observation ignores poll policy and creates a new durable job each round.** Implemented; local checks passed; medium priority; package C.
30. **P1-030 — Configured DLQ, backlog, lock-wait and quota alert thresholds have no complete alert path.** Implemented; local checks passed; medium priority; package C.
31. **P1-031 — Acknowledged or resolved alerts can still send queued reminders.** Implemented; local checks passed; medium priority; package C.
32. **P1-032 — Old low-priority alert retries can consume the budget before a new critical alert.** Implemented; local checks passed; medium priority; package C.
33. **P1-033 — A permanent alert delivery key does not bind an immutable payload.** Implemented; local checks passed; medium priority; package C.
34. **P1-034 — Reopened alert escalation uses lifetime delivery count as the interval index.** Implemented; local checks passed; low priority; package C.
35. **P1-035 — Request IDs do not correlate API, audit, job and error records.** Implemented; local checks passed; medium priority; package C.
36. **P1-036 — Expected failures become generic nonretryable errors and raw codes reach users.** Implemented; local checks passed; medium priority; package D.
37. **P1-037 — The shared JSON byte cap has no elapsed read deadline.** Implemented; local checks passed; medium priority; package C.
38. **P1-038 — Ordinary database work lacks a complete query, queue and request time budget.** Implemented/locally verified in v46; medium priority; package C.
39. **P1-039 — Balances and reconciliation repeatedly aggregate full ledger history.** Implemented and locally verified in v47; medium priority; package E.
40. **P1-040 — Expired public statistics can create an advisory-lock request herd.** Implemented and locally verified in v33; medium priority; package C.
41. **P1-041 — RPC cache misses are not coalesced and throttle waiting is outside the timeout.** Implemented and locally verified in v33; medium priority; package C.
42. **P1-042 — Deployment-controlled RPC, alert and cache URLs lack an explicit SSRF destination policy.** Implemented and locally verified in v35; medium priority; package D.
43. **P1-043 — Remote cache adapters lack equivalent timeout, response and lifecycle bounds.** Implemented and locally verified in v33; medium priority; package C.
44. **P1-044 — Global activity remains visible when feature_activity is disabled.** Implemented; local checks passed; medium priority; package F.
45. **P1-045 — There is no shared visible authenticated snapshot poll.** Implemented and locally verified in v41; medium priority; package F.
46. **P1-046 — Notification load-more permanently stops at 100 items.** Implemented; local checks passed; medium priority; package F.
47. **P1-047 — Staff lists hide older users, jobs and recovery cases without search or cursors.** Implemented and locally verified in v40; medium priority; package F.
48. **P1-048 — Latest-history caps can omit older active cycles and pending withdrawals.** Implemented and locally verified in v39; medium priority; package F.
49. **P1-049 — Public catalog and help lack the Phase One SEO rendering and metadata contract.** Implemented and locally verified in v43.
50. **P1-050 — Several private portals lack noindex metadata.** Implemented and locally verified in v33; low priority; package G.
51. **P1-051 — Stored locale and product copy are not consistently applied across portals.** Implemented and locally verified in v43.
52. **P1-052 — Dark-mode primary button text fails normal-text contrast.** Implemented; local checks passed; medium priority; package F.
53. **P1-053 — Mobile navigation and the testnet home omit required product surfaces.** Implemented and locally verified in v43.
54. **P1-054 — The native wallet summary omits held and withdrawn/net-income totals.** Implemented and locally verified in v37; medium priority; package F.
55. **P1-055 — Closed historical exceptions can prevent plan editing forever.** Implemented; local checks passed; medium priority; package A.
56. **P1-056 — Native activation ignores the configured fixed-token pricing mode.** Implemented; local checks passed; medium priority; package A.
57. **P1-057 — Accepted provider and finality selectors have no matching implementation.** Implemented; local checks passed; medium priority; package C.
58. **P1-058 — Advertised single-request archive uploads exceed the Vercel function body limit.** Implemented and locally verified in v35; medium priority; package H.
59. **P1-059 — Filesystem archive staging is not durable or consistently reachable across serverless instances.** Implemented and locally verified in v35; medium priority; package H.
60. **P1-060 — Archive stream creation precedes the final session fence and permits a file-lifecycle race.** Implemented and locally verified in v35; low priority; package H.
61. **P1-061 — Failed staging files consume quota without a complete failure inventory.** Implemented and locally verified in v35; medium priority; package H.
62. **P1-062 — Paged own-data exports are not a single point-in-time snapshot.** Implemented and locally verified in v43.
63. **P1-063 — Drizzle table coverage does not describe all deployed constraints and defaults.** Implemented/locally verified in v44; medium priority; package E.
64. **P1-064 — Large tightly coupled services and untyped UI contracts make changes fragile.** Implemented/locally verified in v45; low priority; package I.
65. **P1-065 — Help search lacks the specified locale full-text and trigram ranking.** Implemented/locally verified in v44; medium priority; package G.
66. **P1-066 — Published help cache does not remove withdrawn or renamed saved articles.** Implemented and locally verified in v33; low priority; package G.
67. **P1-067 — Solana custody reconciliation requires identical live response slots.** Implemented/locally verified in v45; medium priority; package B.
68. **P1-068 — Production dependencies include unresolved security advisories.** Implemented; local checks passed; high priority; package E.
69. **P1-069 — Native quote expiry and cooldown use the web clock instead of database time.** Implemented; local checks passed; medium priority; package A.
70. **P1-070 — A valid multi-asset plan catalog fails after 100 active versions.** Implemented; local checks passed; medium priority; package F.
71. **P1-071 — Financial archives can claim the current migration version while source migrations are pending.** Implemented; local checks passed; medium priority; package B.
72. **P1-072 — Same-address native/token transfers can manufacture incoming principal.** (High; defect) — Implemented; local checks passed.
73. **P1-073 — Testnet identity and rate infrastructure remains simulation-only.** (High; requirement gap) — Implemented and locally verified in v43.
74. **P1-074 — TRON reconciliation accepts live balances beyond the declared scan cutoff.** (Medium; defect) — Implemented and locally verified in v45.

## Current implementation order

1. **P1-009 — implemented/locally verified:** permanent inventory/backfill/capture, staff pagination, historical checkpoints, rotating monitoring and common-cutoff custody with an all-address service/signer fence. Preserve these checks during retention work.
2. **P1-028 — implemented/locally verified:** bounded payload compaction, holds, permanent keys, monthly online archives, checksum passes and actual encrypted restore verification.
3. PR51 merged after push38983188930 and PR38983219042 succeeded at exact head3884e51fa1c34d384726b7e5bac01eb67b1dc9eb. Complete the fresh Round Two batch next.
4. Continuation is authorized: repeat full-codebase bug finding/fixing for Rounds Two and Three, then implement PRD §32 milestones P2.0–P2.4 and final bug fixes. A clean round does not excuse an older unresolved finding.

## Fix and acceptance reference

These are named manual checks, not instructions to add an automated test suite. Completed entries retain their intended fix and acceptance for future review. Files and original failures are in [the report](custom-bugs-report_v53.md).

### 1: BUG P1-001: Expired or dismissed native invoices prevent another checkout

- **Fix:** Atomically expire or explicitly cancel positively unsubmitted quotes, recover the existing usable quote, and retain late-payment monitoring and immutable invoice economics.
- **Accept when:** An expired/dismissed unpaid quote permits a fresh quote; submitted/late funds retain one recoverable invoice.

### 2: BUG P1-002: A successful wallet send followed by a failed submission can prompt a second payment

- **Fix:** Retain a nonsecret submission receipt scoped to the original invoice/account, distinguish sending from submitting, retry only hash submission, and provide explicit recovery without automatically sending again.
- **Accept when:** Force submission failure after one successful wallet send: retry submits the same hash and sends no second payment.

### 3: BUG P1-003: Native TRX status observation rejects its own event index

- **Fix:** Use the canonical native index and preserve token event discovery; check pending, executed failure, settlement and expiry with the same saved transaction.
- **Accept when:** A saved native TRX transaction traverses pending, confirmed, failed and positive-expiry cases using the canonical index.

### 4: BUG P1-004: Signer reservations ignore tighter runtime payout limits

- **Fix:** Enforce the minimum of deployment ceilings and freshly validated runtime limits in the signer transaction for every obligation kind, keeping independently reserved daily principal and gas.
- **Accept when:** Lower each live cap below the hard cap: all obligation kinds stop at the lower value under concurrent claims.

### 5: BUG P1-005: Recovery binding distinguishes pooler and signer endpoints for the same database

- **Fix:** Introduce an authenticated shared deployment/database binding that works across approved connection modes and cannot be inherited by a restored clone. Preserve clone rejection and require fresh recovery proof where existing identity is ambiguous.
- **Accept when:** The same database's approved web/signer endpoints agree; a restored clone still cannot use the source checkpoint.

### 6: BUG P1-006: Recovery can journal the same transaction fees more than once

- **Fix:** Claim chain transaction fees once using a canonical environment/chain/hash key shared by settlement and recovery; keep per-transfer principal losses separate and reconcile existing duplicates with compensating journals.
- **Accept when:** Resolve two events/assets from one hash and a mixed known/unknown hash: principal is per event, gas/setup are once.

### 7: BUG P1-007: Solana fee attribution treats other transfers as account setup cost

- **Fix:** Derive rent/account creation from validated instructions and account balance evidence, subtract every supported principal movement, and send ambiguous multi-instruction transactions to review without inventing setup fees.
- **Accept when:** A two-transfer SOL transaction books both principals, one network fee and only positively identified rent.

### 8: BUG P1-008: Saved expired Solana or TRON attempts can indefinitely block a recovery scan

- **Fix:** Reconcile retained positive expiry/failure evidence in the scan and expose the required audited closure. Do not release holds or manufacture failure from an absent hash.
- **Accept when:** A positively expired saved attempt progresses through audited closure; an unknown hash retains its hold.

### 9: BUG P1-009: Previous receiving addresses have no complete recovery monitoring inventory

- **Fix:** Persist versioned receiving-address exposure and checkpoints, scan each retained address, and retire monitoring only after positive invoice/liability closure.
- **Accept when:** An old receiving address with an unresolved invoice/unmatched inflow remains monitored after rotation.

### 10: BUG P1-010: Pausing a plan rejects payments already committed under its frozen terms

- **Fix:** Separate new-checkout eligibility from admission of an eligible pre-pause payment; validate its immutable snapshot and submission deadline while preserving safety pauses and beneficiary rights.
- **Accept when:** Submit before pause, confirm afterward: frozen eligible terms are honored; new checkout remains blocked.

### 11: BUG P1-011: Accepted bootstrap destinations have no complete liability and payout support

- **Fix:** Use one authoritative liability-purpose registry throughout allocation, reconciliation, sweeps and signing. Implement each permitted destination or fail configuration validation before it can accept allocations.
- **Accept when:** Every accepted bootstrap purpose is payable and excluded from sweep surplus; unsupported choices fail before allocation.

### 12: BUG P1-012: The signer's oldest fixed candidate batch can starve later payable work

- **Fix:** Add bounded eligible-work selection or a fair durable cursor and next-attempt deadlines, with separate recovery scheduling that never loses signed lineage.
- **Accept when:** Twenty blocked old obligations do not prevent a later eligible obligation from being considered.

### 13: BUG P1-013: Recovery pages have row bounds without a feasible total RPC/time budget

- **Fix:** Persist per-block/event/transaction progress, apply an overall elapsed/RPC budget, and return resumable partial pages without prematurely declaring an asset reconciled.
- **Accept when:** An oversized busy block progresses across bounded calls without lost events, duplicate fees or a false clean scan.

### 14: BUG P1-014: The generic scheduler client signs only simulation and leaves testnet jobs undrained

- **Fix:** Sign the explicitly configured environment, validate it on both sides, and run the generic bounded job dispatcher for testnet as well as simulation. Keep external scheduling and all send gates independent.
- **Accept when:** A signed testnet generic tick processes notification/export/observation work; wrong-environment signatures reject.

### 15: BUG P1-015: The hosted deploy workflow cannot migrate the selected testnet binding

- **Fix:** Use the validated hosted environment for binding checks and migrations, split simulation fixtures from shared/native metadata, and retain explicit release gates and empty owner-provided native registries.
- **Accept when:** A non-signing testnet database migrates in the hosted workflow without inserting simulation identities or enabling sends.

### 16: BUG P1-016: Safe cancellation and unallocated-refund recovery are unreachable in the UI

- **Fix:** Expose each safe recovery capability independently from permission to create a send, include unallocated-refund recovery, and derive controls from authoritative obligation state.
- **Accept when:** With execution disabled, eligible unsigned cancellation and unallocated-refund recovery remain reachable.

### 17: BUG P1-017: Import and business operations use the generic staff rate policy

- **Fix:** Define explicit method/route-family mappings with sensitive families taking precedence; preserve replay-aware exceptions only where they are justified.
- **Accept when:** Staging and business routes select their specific budgets; ordinary staff requests keep the staff policy.

### 18: BUG P1-018: Rate budgets fragment across raw resource paths

- **Fix:** Pass a canonical route template or operation identifier to the limiter and independently enforce user/IP budgets across resources.
- **Accept when:** Different resource IDs share the same operation budget while distinct operation families remain independent.

### 19: BUG P1-019: Public database reads and OAuth callbacks bypass explicit rate budgets

- **Fix:** Use CDN/public-cache controls and bounded IP admission for expensive misses/authentication callbacks; avoid a database write for every cached anonymous hit and retain public-read availability during limiter failure.
- **Accept when:** Public cache hits stay inexpensive; repeated authentication/miss traffic is bounded before costly external exchange.

### 20: BUG P1-020: A combined factor/IP bucket does not bound distributed MFA guesses

- **Fix:** Enforce independent factor/account and IP budgets across verification routes with temporary backoff and recovery-safe behavior; do not permanently lock accounts or expose factor existence.
- **Accept when:** Changing client IP does not reset the account/factor guessing allowance; legitimate recovery stays possible.

### 21: BUG P1-021: Wallet changes lack the PRD's fresh authentication and domain-bound challenge

- **Fix:** Require fresh authentication at challenge and commit, bind proof to origin, operation, session and wallet revision, and preserve the cooling period and already-broadcast destinations.
- **Accept when:** Old authentication cannot change a wallet; wrong-domain or stale revision proof rejects without touching broadcast destinations.

### 22: BUG P1-022: Ordinary API reads can return data from the previous client identity

- **Fix:** Capture and fence request scope on every private response/error, abort obsolete reads, and reset or key private child state by owner plus generation.
- **Accept when:** Delay private reads across owner/generation changes: old success/error responses cannot repopulate current UI.

### 23: BUG P1-023: Concurrent browser tabs can revoke a valid refresh family

- **Fix:** Coordinate browser refresh with Web Locks/BroadcastChannel and recheck shared cookies/session state after waiting. Preserve server token rotation and actual reuse detection.
- **Accept when:** Two tabs refreshing together preserve one valid family; actual refresh-token reuse still revokes it.

### 24: BUG P1-024: Secondary portals show login instead of using an available refresh session

- **Fix:** Centralize session bootstrap and safe refresh for every portal, including cross-tab scope handling and pre-auth/MFA restrictions.
- **Accept when:** Open each portal after access expiry with valid refresh: it resumes the session without skipping required MFA.

### 25: BUG P1-025: Concurrent Google registrations can collide and fallback names violate configured lengths

- **Fix:** Use bounded conflict-aware insertion retries and a policy-compliant fallback inside transaction-safe savepoints; keep provider identity unique.
- **Accept when:** Different Google subjects with the same stem both receive unique names under short and long valid policies.

### 26: BUG P1-026: Account deletion leaves private message content in notifications and job payloads

- **Fix:** Define and implement nonfinancial-content erasure across delivery copies using a narrowly scoped forward migration/redaction capability; retain financial UUIDs, mandatory audit evidence and permanent deduplication keys.
- **Accept when:** Delete a user with a free-text admin message: permitted private copies are redacted and money/replay records remain intact.

### 27: BUG P1-027: Expired authentication and rate records have no bounded cleanup lifecycle

- **Fix:** Add indexed bounded cleanup jobs with explicit retention and holds, retaining replay records through their full acceptance windows and active family dependencies.
- **Accept when:** Expired flows/families/rate/replay rows drain in bounded batches; active dependencies and acceptance windows remain.

### 28: BUG P1-028: Declared notification, terminal-job, ledger and audit retention is not implemented

- **Fix:** Archive verified immutable financial/audit partitions and compact expendable delivery bodies in resumable batches; preserve permanent business keys and recoverable evidence, and honor retention holds.
- **Accept when:** Archive/compaction respects holds and permanent keys, verifies checksums and can restore/reconcile retained financial evidence.

### 29: BUG P1-029: Pending chain observation ignores poll policy and creates a new durable job each round

- **Fix:** Use durable next-observation deadlines and bounded adaptive backoff/jitter, with compact attempt state and permanent deposit idempotency. This concerns processing policy, not external CRON frequency.
- **Accept when:** Normal pending observations honor persisted deadlines/backoff without spawning an immediate durable-job chain.

### 30: BUG P1-030: Configured DLQ, backlog, lock-wait and quota alert thresholds have no complete alert path

- **Fix:** Implement indexed backlog/dead-letter and age measurements, quota/lock diagnostics and priority-aware deduplicated alerts; keep public health aggregate-only and cheap.
- **Accept when:** Cross a DLQ/backlog/age threshold: one bounded redacted alert and staff diagnostic appear without public identifiers.

### 31: BUG P1-031: Acknowledged or resolved alerts can still send queued reminders

- **Fix:** Fence reminder claims against the current alert occurrence/status and stop obsolete reminder retries after acknowledgement/resolution, retaining attempted-delivery evidence.
- **Accept when:** Acknowledge/resolve before a queued reminder claim: it cannot dispatch an obsolete reminder.

### 32: BUG P1-032: Old low-priority alert retries can consume the budget before a new critical alert

- **Fix:** Prioritize fresh critical conditions within the existing global cap, use fair per-condition retry deadlines/coalescing, and expose suppressed/backlogged alerts to staff.
- **Accept when:** With older failing P2 work, a new P1 receives eligible budget priority without exceeding the shared cap.

### 33: BUG P1-033: A permanent alert delivery key does not bind an immutable payload

- **Fix:** Persist the canonical payload/hash and occurrence revision with each delivery, retry exactly those bytes, and create a new permanent ordinal for changed content.
- **Accept when:** Retry after an ACK loss and condition reopen: the old key retains exactly its original payload hash.

### 34: BUG P1-034: Reopened alert escalation uses lifetime delivery count as the interval index

- **Fix:** Keep a never-reused delivery ordinal separate from the current occurrence's escalation step and daily attempt budget.
- **Accept when:** Reopen an escalated condition: fresh escalation starts at step zero while delivery ordinals never repeat.

### 35: BUG P1-035: Request IDs do not correlate API, audit, job and error records

- **Fix:** Create one bounded request correlation context, propagate causation to asynchronous work and safe logs, and return the same ID in response metadata/header without logging secrets or financial payloads.
- **Accept when:** One reported request ID joins response metadata/header to safe logs, audit causation and downstream job records.

### 36: BUG P1-036: Expected failures become generic nonretryable errors and raw codes reach users

- **Fix:** Use a complete typed error registry with accurate statuses, localized message/help keys and safe retry guidance. Automatic retries must remain restricted to replay-safe reads/submissions.
- **Accept when:** Each thrown domain error maps to a localized actionable status; transient retries never resend money.

### 37: BUG P1-037: The shared JSON byte cap has no elapsed read deadline

- **Fix:** Add a bounded total read deadline and AbortSignal handling, cancel/release the reader on all exits and avoid duplicate body parsing.
- **Accept when:** A silent/aborted/oversized body ends within the total read budget and releases its reader.

### 38: BUG P1-038: Ordinary database work lacks a complete query, queue and request time budget

- **Fix:** Set workload-specific transaction/query/lock budgets and bounded admission, memoize only immutable capability checks with revocation-safe invalidation, add safe transient DB backoff/circuit health and drain resources on shutdown.
- **Accept when:** Lock contention and exhausted pool admission return within workload budgets; shutdown drains without unbounded waits.

### 39: BUG P1-039: Balances and reconciliation repeatedly aggregate full ledger history

- **Fix:** Maintain transactional per-account counters and bounded reconciliation checkpoints with exact integer arithmetic, verify them against journals and introduce measured archival/index improvements.
- **Accept when:** Incremental balances match sealed postings after concurrent credit/debit, compensating correction and bounded reconciliation.

### 40: BUG P1-040: Expired public statistics can create an advisory-lock request herd

- **Fix:** Serve an age-labelled stale safe projection while one bounded refresh owns a try-lock/job, retain environment separation and use CDN/process single-flight.
- **Accept when:** A concurrent cold statistics burst yields one refresh and bounded stale reads, with no environment mixing.

### 41: BUG P1-041: RPC cache misses are not coalesced and throttle waiting is outside the timeout

- **Fix:** Coalesce safe reads by immutable scope, include queue time in an overall cancellation budget and use bounded jitter/backoff/circuit state. Never substitute cached evidence for live financial confirmation.
- **Accept when:** Simultaneous safe RPC misses coalesce; queued requests honor one overall timeout including throttle wait.

### 42: BUG P1-042: Deployment-controlled RPC, alert and cache URLs lack an explicit SSRF destination policy

- **Fix:** Validate approved hosts and resolved destinations with rebinding-aware network enforcement, fail closed on redirects, and retain narrowly scoped isolated loopback fixtures.
- **Accept when:** Unapproved private/link-local/DNS-rebound destinations reject; explicitly scoped isolated fixtures still work.

### 43: BUG P1-043: Remote cache adapters lack equivalent timeout, response and lifecycle bounds

- **Fix:** Add total I/O/size limits, strict endpoint/response validation and an explicit disposal contract; fail open only for public display caching and never use cache availability as financial authority.
- **Accept when:** A hung/oversized/redirecting cache endpoint fails within bounds; cache disposal closes owned resources.

### 44: BUG P1-044: Global activity remains visible when feature_activity is disabled

- **Fix:** Honor both activity/statistics flags with a manifest revision/epoch fence, abort stale loads and share the public manifest fetch.
- **Accept when:** Disable activity/statistics while a prior fetch is delayed: stale content cannot reappear.

### 45: BUG P1-045: There is no shared visible authenticated snapshot poll

- **Fix:** Introduce one account/generation-scoped visible online poll with jitter, abort and backoff; share notification/status updates and stop work when irrelevant or hidden.
- **Accept when:** External financial updates become visible through one scoped poll; hidden/offline pages perform no repeated private poll.

### 46: BUG P1-046: Notification load-more permanently stops at 100 items

- **Fix:** Use a sliding retained window or paginated replacement while preserving next_cursor, stable deduplication and account-generation fences.
- **Accept when:** Read beyond the 100th notification without losing continuation, unread state or identity isolation.

### 47: BUG P1-047: Staff lists hide older users, jobs and recovery cases without search or cursors

- **Fix:** Add indexed exact email/username/UUID staff lookup and stable filter-bound keyset cursors for every capped staff list, with dedicated unresolved-work views.
- **Accept when:** Find a member/case/job beyond the initial cap using exact staff search and cursor paging with current authorization.

### 48: BUG P1-048: Latest-history caps can omit older active cycles and pending withdrawals

- **Fix:** Fetch actionable current states independently from paginated history and expose every active/held item through bounded continuation rather than treating the latest window as complete.
- **Accept when:** An old active cycle/long-held payout remains visible despite more than 30 newer completed records.

### 49: BUG P1-049: Public catalog and help lack the Phase One SEO rendering and metadata contract

- **Fix:** Render safe cached public catalog/help per locale, add accurate metadata and published legal/mechanics pages, and use validated permanent slug redirects without exposing private content.
- **Accept when:** Initial public HTML contains accurate localized content/canonicals; legal/mechanics pages and permanent redirects work.

### 50: BUG P1-050: Several private portals lack noindex metadata

- **Fix:** Apply consistent noindex/noarchive private-layout metadata and keep those routes out of the public sitemap.
- **Accept when:** Every private/settings/moderation route emits noindex and is omitted from the public sitemap.

### 51: BUG P1-051: Stored locale and product copy are not consistently applied across portals

- **Fix:** Use a shared preference/locale provider and complete typed EN/FR message mappings, including notification/status/error text and configured public product content.
- **Accept when:** Stored French/theme preferences persist across all portals; notifications/errors and configured product copy agree.

### 52: BUG P1-052: Dark-mode primary button text fails normal-text contrast

- **Fix:** Adjust foreground/background tokens and verify actual enabled, disabled, hover and focus states in both themes.
- **Accept when:** Both themes' normal primary text reaches at least 4.5:1, with visible focus and readable disabled states.

### 53: BUG P1-053: Mobile navigation and the testnet home omit required product surfaces

- **Fix:** Build shared responsive navigation and public plan/mechanics presentation for both environments, keep wallets lazy and honor feature flags without introducing Phase Two transparency changes.
- **Accept when:** At narrow width, feature-aware bottom navigation and anonymous testnet plans/mechanics remain operable with safe areas.

### 54: BUG P1-054: The native wallet summary omits held and withdrawn/net-income totals

- **Fix:** Expose exact per-asset available, held, settled and net-income DTOs and localized labels derived from journals, keeping incoming/refundable value distinct.
- **Accept when:** Available, held, settled and net-income values exactly match per-asset journals and remain visibly distinct.

### 55: BUG P1-055: Closed historical exceptions can prevent plan editing forever

- **Fix:** Check remaining economic rights and open refund/admission obligations instead of exception history alone; preserve historical status and block edits whenever genuine liabilities remain.
- **Accept when:** A fully refunded historical exception does not block editing; any remaining economic right still does.

### 56: BUG P1-056: Native activation ignores the configured fixed-token pricing mode

- **Fix:** Either implement per-asset fixed-token activation with exact validated base units and immutable snapshots or reject incompatible configuration before activation; preserve existing versions and frozen prices.
- **Accept when:** Configured native fixed-token base units determine activation or are explicitly rejected before any version is made.

### 57: BUG P1-057: Accepted provider and finality selectors have no matching implementation

- **Fix:** Validate supported provider/chain/finality combinations explicitly and expose required adapter capabilities; implement additional providers only if necessary for the approved Phase One contract.
- **Accept when:** Unsupported price-provider/finality combinations fail validation; accepted settings select the implemented behavior.

### 58: BUG P1-058: Advertised single-request archive uploads exceed the Vercel function body limit

- **Fix:** Cap and explain the hosted portal limit or implement an explicitly authorized durable chunked path; retain the owner CLI route for larger encrypted archives and never decrypt/restore through upload.
- **Accept when:** A hosted upload above the actual body cap gets preflight guidance/CLI routing; valid smaller artifacts stay unverified.

### 59: BUG P1-059: Filesystem archive staging is not durable or consistently reachable across serverless instances

- **Fix:** Define a private durable adapter or explicitly constrain web staging to an operator-managed persistent host, with authenticated inventory/retrieval and owner CLI verification. Keep restores inactive.
- **Accept when:** An artifact staged on one instance remains privately retrievable on another supported host/adapter or the UI declares CLI-only mode.

### 60: BUG P1-060: Archive stream creation precedes the final session fence and permits a file-lifecycle race

- **Fix:** Close opened resources on failed completion, construct the stream after authorization commits where appropriate and serve immutable verified artifacts with cancellation cleanup.
- **Accept when:** Final-session-fence failure and download cancellation close descriptors; immutable bytes match the verified checksum.

### 61: BUG P1-061: Failed staging files consume quota without a complete failure inventory

- **Fix:** Record bounded failure metadata and quarantine inventory, expose staff diagnostics and an owner-reviewed retention/pruning procedure. Do not automatically erase failed evidence or attempt restore.
- **Accept when:** Failed upload metadata and retained partial files are visible in quarantine inventory and obey reviewed quotas.

### 62: BUG P1-062: Paged own-data exports are not a single point-in-time snapshot

- **Fix:** Define the temporal guarantee explicitly; materialize bounded snapshot values or use revisioned state at a cutoff, and record that cutoff/revision in every part without holding a long serverless transaction.
- **Accept when:** Concurrent export state changes obey the declared temporal guarantee and every part carries its cutoff/revision.

### 63: BUG P1-063: Drizzle table coverage does not describe all deployed constraints and defaults

- **Fix:** Reconcile representable DDL in Drizzle, document necessary trigger/RLS/infrastructure SQL exceptions and review generated changes against the deployed schema without rewriting applied checksums.
- **Accept when:** Schema definitions cover representable constraints/indexes/defaults; deliberate SQL-only contracts have a documented inventory.

### 64: BUG P1-064: Large tightly coupled services and untyped UI contracts make changes fragile

- **Fix:** Extract typed transport/service contracts and small operation modules incrementally, add explicit package import boundaries and format touched code. Preserve transaction ownership and money algorithms rather than undertaking a broad rewrite.
- **Accept when:** Typed DTOs replace critical any boundaries, services retain transaction ownership, and imports obey explicit layering.

### 65: BUG P1-065: Help search lacks the specified locale full-text and trigram ranking

- **Fix:** Add bounded public published-only search with locale indexes/ranking and retain cheap offline search of explicitly labelled saved articles.
- **Accept when:** Published EN/FR help search ranks exact title then full-text/trigram results and never exposes drafts.

### 66: BUG P1-066: Published help cache does not remove withdrawn or renamed saved articles

- **Fix:** Reconcile the saved public article inventory after a complete successful locale fetch, retain TTL/size limits and label offline content with version/observation time.
- **Accept when:** After a successful complete online help refresh, withdrawn/renamed saved slugs are not shown as current offline content.

### 67: BUG P1-067: Solana custody reconciliation requires identical live response slots

- **Fix:** Define a provable common accounting cutoff or advance/reconcile scan bounds to a jointly observed finalized point; accept only matching scope/evidence and keep pausing on actual contradiction.
- **Accept when:** Different healthy finalized SOL response slots cannot be mislabeled as one historical cutoff; true disagreement remains paused.

### 68: BUG P1-068: Production dependencies include unresolved security advisories

- **Fix:** Review advisory reachability and update compatible patched dependency trees, especially Drizzle's fix at 0.45.2+, checking chain serialization/signatures and bundle bounds. Do not run a blind force-upgrade or remove safety checks.
- **Accept when:** Production dependency audit has no unresolved reachable high advisory; reviewed exceptions list reachability and compensating limits.

### 69: BUG P1-069: Native quote expiry and cooldown use the web clock instead of database time

- **Fix:** Read one database timestamp in the quoting transaction for expiry and cooldown, and keep provider block times limited to their explicitly defined chain-evidence role.
- **Accept when:** Injected web/DB clock skew does not change database-authoritative native quote expiry or cooldown eligibility.

### 70: BUG P1-070: A valid multi-asset plan catalog fails after 100 active versions

- **Fix:** Paginate or group the catalog by plan and asset with stable bounded queries, or validate an explicit consistent aggregate version limit before activation; do not accept configuration that later makes public reads fail.
- **Accept when:** A valid catalog with more than 100 active plan/asset versions remains publicly readable through bounded continuation, or activation rejects an explicit consistent limit before state changes.

### 71: BUG P1-071: Financial archives can claim the current migration version while source migrations are pending

- **Fix:** Compare the complete applied migration name/checksum inventory against the current immutable SQL files before capturing or restoring financial records. Reject missing, extra or changed migrations.
- **Accept when:** A source with pending migrations rejects backup before creating an archive; forward-migrated source and exact restored target validate.

### 72: BUG P1-072: Same-address native/token transfers can manufacture incoming principal

- **Fix:** Reject equal normalized sending/receiving participants in transfer proof, quoting and payload construction. Preserve historical records and require explicit review rather than infer a principal credit, payout or correction from a self-transfer.
- **Accept when:** Native/ERC20 self-transfer receipts cannot create incoming principal; all families reject self-transfer proof/fee/build before network dispatch and quote/settlement fences remain effective. Normal distinct-party transfers retain their exact amount and canonical checks.

### 73: BUG P1-073: Testnet identity and rate infrastructure remains simulation-only

- **Fix:** Forward093 permits only the service context under gw_service in the two supported environments, simulation/testnet. Preserve grants, browser-role exclusions, immutable applied checksums, financial policies and readiness gates.
- **Accept when:** Actual testnet identity/session/refresh/OAuth/rate operations succeed; mainnet/member contexts and gw_read remain denied; anonymous native catalog loads.

### 74: BUG P1-074: TRON reconciliation accepts live balances beyond the declared scan cutoff

- **Fix:** Capture and retain a jointly observed stable solidified balance before scanning, bind the scan to that exact cutoff, and reject later live responses for retained legacy runs.
- **Accept when:** Only exact common-cutoff evidence can authorize reconciliation; different slots/tips remain unknown even when amounts match, contradictory common-cutoff evidence is rejected, and retry/recovery preserves the original witness.

## Rules for the next implementation batch

- Continue through remaining Round One work, Rounds Two/Three, Phase Two and final fixes without milestone-acceptance pauses.
- Use substantial, related batches; avoid progress-only iterations. Routine choices use best recommendations.
- Preserve exact integer money, atomic writes, immutable evidence, unique operation keys, beneficiary holds, positive expiry proof and signed-send lineage. Never enable financial/mainnet gates for verification.
- Use fresh isolated fixtures and rollback-only generated records where possible. Keep original financial sources, failed fixtures, signed bytes, archives and keys.
- Run relevant verification and required checks; record what actually ran. Both exact-final-head **push** and **pull_request** CI must succeed before merge. No direct pushes to main.
- Keep five core docs plus these two requested trackers. Rename status, handover, report and plan together. Fold decisions into existing files; keep old versions in Git.
- See [current status](PROJECT-STATUS_v53.md) for release evidence and [handover](LLM-HANDOVER_v53.md) for the exact stop boundary.

Signed: **16 October 2026 at 09:21:01 PM WAT**.

## Retention and follow-up findings

- **P1-028 implemented/local checks passed:** notifications expire; only old completed expendable job/outbox payloads compact. Permanent keys, unresolved work and financial payloads remain. Same-database monthly partitions freeze ledger postings, network scan pages and audit events; bounded checksum and independent verification passes precede archived status. Journals/events remain global identity registries. No financial deletion; archives still consume database quota.
- **R2-001 fixed/local checks passed:** column grants and partition bounds/indexes enter the security fingerprint. Signed schema contract v2 rejects older packets before touching the target. Existing signatures are never rewritten.
- **R2-002 fixed/local checks passed:** real PostgreSQL lock timeout `55P03` is transient, preserving retry eligibility instead of marking work permanently failed.
- **R2-003 fixed/local checks passed:** a real timeout opens admission cooldown; failure recording now waits once (at most two seconds), respects the remaining execution budget and rechecks job/run leases before retrying. Immediate durable retry passed on a fresh fixture.

Evidence and remaining release checks: [current status](PROJECT-STATUS_v53.md). Original finding descriptions and acceptance conditions remain above.

## Fresh Round Two findings (v53)

| ID | Finding | Fix and local evidence |
|---|---|---|
| R2-004 | Oversized bodies can hang while cancellation never settles; worker/scheduler readers also lack a body deadline | One bounded UTF-8 reader preserves exact signed bytes and enforces byte/time/abort limits. Cancellation never extends the deadline. Applied to worker/scheduler authentication, Google/Turnstile responses and alert acknowledgements; binary staging retains streaming with nonblocking cancellation. Oversize, invalid UTF-8, abort, exact HMAC and nonce replay procedures passed. |
| R2-005 | Application-level temporary database/provider errors become permanent job failures | Use the same retry classification as HTTP errors, retaining wrapped broken-pipe handling and bounded cause traversal. Generated capacity/circuit/temporary failures now remain retry_wait; original probes demonstrated dead letters. |
| R2-006 | Database outage re-enables seeded public features and demo activity | Public API/SSR fallbacks disable every feature and statistics/activity, return neutral EN/FR unavailable copy and expire within five seconds. An empty-database probe changed from enabled gifts/50 demo statements to disabled gifts/no statements. |

These are locally verified code fixes, not hosted acceptance. Private named procedures: `/workspace/work/round-two-v53`. Required checks/build/bundle and exact-head dual CI remain necessary before merge. Preserve the original source/failure fixtures. No broad automated suite was added.

## Round Three recovery finding

**R3-001 — Native backup/restore can wait indefinitely after cancellation.** The tool runner sent SIGTERM and awaited exit even if the owned subprocess ignored it. It now allows two seconds to stop, then sends SIGKILL only to that exact child. Any interrupted operation rejects even if the tool exits0; no archive is published. Generated ignoring/graceful tools passed, and a real encrypted backup, empty-target restore and independent verify still passed. Private evidence: `/workspace/work/round-three-v54`. Financial data, archive formats, migration receipts and readiness gates are unchanged.

Fresh review covered request/worker admission, public configuration/cache boundaries, authentication cleanup, export/privacy handling, financial call sites and native recovery. The named findings are fixed locally; this is not a claim that every possible bug is absent or that hosted behavior was accepted.

v53
