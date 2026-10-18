# Bug fix plan — Rounds One/Two/Three v79

**Full product remains incomplete.** Earlier completion statements below refer to their named bug/transparency batches. Current work is tracked as C001–C017 in [status](PROJECT-STATUS_v79.md).

Updated: **18 October2026 (Africa/Lagos)**.

**Resumed by the owner on 16 October 2026.** Round One: **74 of 74 original findings implemented, locally verified and merged**. Round Two found and locally verified fixes for R2-004–006; local release checks passed; merged in PR52. Round Three also fixed R3-001; Phase Two implementation and eight local review fixes are in [PR53](https://github.com/nero1/onyiy/pull/53); GitHub records final CI/merge state. These counts are not a completion percentage or hosted acceptance.

Historical numbered migration paths below identify the original fixes in Git history. Fresh installations paste only `packages/db/fresh-install.sql`. Historical numbered files remain for installed-release compatibility; do not replay them on a fresh installation.

PR51 completed Round One and incidental R2-001–003. The v53 batch fixes the three fresh Round Two findings below; The same batch includes the Round Three recovery fix below; Phase Two transparency implementation/local review was completed in v54; full-product work remains open.

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

75. **P1-075 — Solana v1 transactions block receipt and recovery reads.** (High; defect) — Implemented; public baseline, recorded-data scanner and local financial regression pass; required checks/build/bundle passed; exact-head CI/merge pending.

## Current implementation order

1. Finish C004 remaining native failure/account-setup/reorg/restart variants and C008 recovery reconciliation.
2. Complete C010 current-PRD coverage, including public/admin/flags/accessibility; local financial procedures are partial evidence.
3. Verify hosted services, custody, identity, provenance, operations/costs and observation periods after the owner supplies deferred launch setup.
4. Keep substantial batches moving; both exact-head CI events must pass before each merge. Current evidence and remaining scope: [status](PROJECT-STATUS_v79.md).

## Fix and acceptance reference

These are named manual checks, not instructions to add an automated test suite. Completed entries retain their intended fix and acceptance for future review. Files and original failures are in [the report](custom-bugs-report_v79.md).

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
- See [current status](PROJECT-STATUS_v79.md) for release evidence and [handover](LLM-HANDOVER_v79.md) for the exact stop boundary.

Signed: **16 October 2026 at 09:21:01 PM WAT**.

## Retention and follow-up findings

- **P1-028 implemented/local checks passed:** notifications expire; only old completed expendable job/outbox payloads compact. Permanent keys, unresolved work and financial payloads remain. Same-database monthly partitions freeze ledger postings, network scan pages and audit events; bounded checksum and independent verification passes precede archived status. Journals/events remain global identity registries. No financial deletion; archives still consume database quota.
- **R2-001 fixed/local checks passed:** column grants and partition bounds/indexes enter the security fingerprint. Signed schema contract v2 rejects older packets before touching the target. Existing signatures are never rewritten.
- **R2-002 fixed/local checks passed:** real PostgreSQL lock timeout `55P03` is transient, preserving retry eligibility instead of marking work permanently failed.
- **R2-003 fixed/local checks passed:** a real timeout opens admission cooldown; failure recording now waits once (at most two seconds), respects the remaining execution budget and rechecks job/run leases before retrying. Immediate durable retry passed on a fresh fixture.

Evidence and remaining release checks: [current status](PROJECT-STATUS_v79.md). Original finding descriptions and acceptance conditions remain above.

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

## Phase Two transition finding (v54)

**P2-B001 — Queue revisions omit administrative entry changes.** Profile preview validation could miss a priority/bootstrap edit because only selected gift paths advanced the partition revision. SQL004 now increments it on every entry insertion/change and bounds it to an exact JavaScript integer. A fresh fixture reproduced stale-priority preview rejection while retaining actual balances/tickets. Phase Two implementation/local verification is complete; exact-head CI/merge is tracked in see [status](PROJECT-STATUS_v79.md).



### Additional Phase Two review fixes

- **P2-B002:** Admin screen preview called an internal rank function without permission. Count the admin-visible waiting priority rows; keep the internal routine private.
- **P2-B003:** Historical-price validation over-escaped the decimal separator. Use an unambiguous SQL decimal pattern, guard numeric casts, and retain asset-only output when no trustworthy historical rate exists.
- **P2-B004:** A cached catalogue could show old plan disclosures beside a newer profile. Hide mismatched rows until refreshed; authoritative payment validation still rejects stale quotes.
- Final review also rejects test/demo profile selection in a future mainnet context and preserves actual paragraph breaks in changed consent text. No mainnet runtime is enabled.

- **P2-B005:** Recovery paging truncated PostgreSQL microseconds through JavaScript dates. Read timestamp fields as exact UTC PostgreSQL strings for both keyset cursors and row fingerprints. Actual encrypted backup, empty-target restore and independent verification passed with83 retained tables. Signed inventory contract3 requires matching historical code for older packets; original signatures stay intact.
- **P2-B006:** A type import preceded the native-wallet client directive. Move the directive to the first statement; production compilation now passes that boundary.

- **P2-B007:** Raw SQL passed to the ORM `exists` helper omitted subquery parentheses in the future real-event path. Use explicit closed `EXISTS(...)` expressions. The rollback-only owner contract now executes every feed query, proves opt-in/withdrawal and anonymous output, and checks historical-price validation without enabling mainnet or sending funds.

- **P2-B008:** Receipt masking depended on a potentially stale/unavailable profile, and changing language during a publication save could leave controls busy. Receipt images always mask identity; publication scope resets controls and prevents an old request from releasing a newer request’s lock.


## Full-product completion audit v55

The new owner directive reopens overall product completion, including mainnet. Earlier completion statements concern their named batches only. Current gaps and dependencies:

- **C001 — Mainnet registry/configuration:** Testnet-only validation and provider assumptions; staged registry foundations in progress.
- **C002 — Shared database and preview isolation:** Mainnet namespace/promotion fence, non-sending preview role, stale-build retirement and production-reset denial need implementation and proof.
- **C003 — Signer and custody:** Both implementation gates remain false; environment-bound keys, scoped worker access and verified activation remain open.
- **C004 — Payment/fee/recovery matrix:** Every enabled asset needs inflow, withdrawal, business/refund/operating settlement, reorg, replacement/expiry and restart evidence.
- **C005 — Asset and RPC provenance:** Verify all §30 assets/networks, two independent RPCs, token decimals/contracts/mints; JAGA needs owner input.
- **C006 — Pricing modes:** Native fixed-token activation is explicitly rejected despite §9.3; amount/asset binding and safe USD reference remain to implement.
- **C007 — Production UI and wallet support:** Remove testnet-only catalog/wallet/history assumptions; verify all EN/FR disclosures, receipts and actual mainnet wallet approval.
- **C008 — Mainnet backup and recovery:** Recovery currently accepts simulation/testnet only; verify exact production restore, chain reconciliation and no resend.
- **C009 — Hosted identity/access:** Actual OAuth/MFA, restrictive roles, rate limits, CAPTCHA and account/financial recovery need hosted evidence.
- **C010 — Complete product acceptance:** Check every feature/flag, queues, cooldowns, referrals/points, admin/moderation, exports/deletion, accessibility/PWA/offline and errors against §§1–29.
- **C011 — Deployment and operations:** Secure hosted setup, external alerts, signer/scheduler heartbeats and incident/closure controls need actual operation evidence.
- **C012 — Capacity and cost:** Measure mobile/latency/quota targets and select commercially permitted hosting within owner budget.
- **C013 — Observation periods:** §30 requires14-day beta stability and14-day initial-cap mainnet observation; no elapsed evidence recorded.
- **C014 — Owner launch decisions:** Launch countries/review, approved financial terms, funding/refund/closure model, custody and budget remain unresolved.

- **C015 — Age eligibility:** Consent currently accepts an adult checkbox; §5 requires full-date-of-birth age calculation using server time.
- **C016 — Display time zones:** User/default Lagos and admin_timezone settings are not wired into the date formatting surfaces.
- **C017 — Product navigation/idle preview:** Verify and finish §18 currency browsing/idle rotation, focus-safe behaviour and all scheduled-plan presentation; current native portal has no currency rotation implementation.

Owner update: all launch details are deferred to final testing. Document the fields in SETUP and continue code without waiting for them. C006 fixed-token pricing is implemented and passed an isolated rollback-only activation/replay/immutability procedure; final release/schema verification remains pending.

## v56 findings and delivery

- **C003 / key custody foundation:** version2 AEAD binds exact environment, network, chain and public address. Legacy files remain testnet-only. Generated eight-network packaging/tamper procedures pass; mainnet execution is still unfinished.
- **C017 / currency browsing:** implemented enabled-only selectors, idle preview pause, focus/reduced-motion/financial-state guards and tile/card keyboard return. Browser acceptance is being checked; scheduled plans and broader dashboard requirements remain open.
- **C016 follow-up:** changing the display zone left verified activity text cached in the old zone. Include the zone in the formatting dependencies.
- **Key-file race:** checking a path and reading it later could read a different file. Inspect/read the same descriptor and reject symlinks, preserving private-file permissions and zeroing buffers.

## v57 findings and delivery

- **C002/C003 — Signer promotion race:** isolated signer transactions lacked the shared profile/mode fence held by web transactions. Add the same lock order before signer data access, bind configuration and saved attempts to the captured environment, and reject retired workers before writes. Fresh actual restricted-login/owner contention and preserved-row checks pass.
- **C003 — Browser custody preparation:** manual trusted-main workflow prepares new independent encrypted keys without any financial/provider credentials. Both-environment generation/address/overwrite/secret-scope checks pass. This is preparation only; full mainnet custody/runtime remains unfinished.
- **C010 final installer:** preserve installed/signed histories, but deliver the owner's requested single final-state fresh installer when schema work is complete. The v60 one-file installer now supplies that final state; regenerate and reverify it after future schema changes.

## v58 findings and delivery

- **C001/C005 — Network observation:** explicit read-only mainnet adapters support closed native network identities without enabling financial execution. Facade and transport prevent construction/broadcast and deny unknown mutation methods before dispatch. Live provider/token provenance remains pending.
- **C004 — Stale adapter execution gate:** transfer build/broadcast previously relied on construction-time validation. Recheck the current execution gate immediately before preparing/sending.
- **C004 — TRON outage misclassification:** when both identity providers failed, WRONG_NETWORK could make a transient outage permanent. Preserve RPC_UNAVAILABLE; actual wrong IDs remain rejected.
- **C001 — Solana devnet literals:** explicit observation used closed mainnet metadata, but constructor/balance checks still required devnet. Bind those reads to the validated registry network; active mainnet sending remains denied.

## Wallet scope and worker binding (v59)

- Fixed a reproduced TRON wallet-proof bug: a Nile challenge could silently create a Shasta link after registry changes. Proofs now recheck the exact original domain, environment, network, account and session; changed destinations receive an atomic audit record.
- Shared the existing v1 worker-signature format across receiver, signer and scheduler. Environment, purpose, route and exact body bytes are authenticated; signer inputs must match the captured worker scope. Mainnet execution remains disabled.
- Named isolated procedures in `/workspace/work/financial-v59`: `wallet-before-fix-r1` reproduces the old bug; fresh `wallet-scope-r2` proves rejection, successful fresh linking, two exact audit/archive identities and unchanged financial hashes; `worker-binding-r2` proves compatibility, byte binding, replay/clock/scope rejection and unchanged financial hashes. Failed r1 harness fixtures are preserved. No RPC transfer or real funds.

## One-paste fresh installation (v60)

- `packages/db/fresh-install.sql` creates the final schema directly. The six historical migration files remain immutable for installed databases and recovery compatibility; new owners paste only the fresh installer. SETUP now says so.
- Fresh unseeded reference and single-file target match all4222 schema/security metadata entries, including column grants. Named `final-installer-v60` procedures prove atomic installation, exact receipts, rerun/nonempty rejection without data loss and complete rollback after a late failure. The unchanged migration runner skips all six receipts; actual seeding and restricted-login verification pass. A second target with broad unknown-role defaults matches all4088 application/security entries; provider extension ACLs are deliberately preserved. The first migration-state comparator failure counted those extension grants and is preserved. Required checks pin the installer checksum and exact historical lineage. Current verified schema contract is `schema-contract_v60.json`; model counts are unchanged.
- PR58 merged at a736083d6425bc22f9e1e973700b796ccea0e1e6 after exact-head push39023906817 and PR39023923825 passed. This installer batch does not complete mainnet execution, preview wiring or overall product acceptance. Continue C001–C017 without milestone pauses.

## Read-only preview foundation (v61)

- Added a bounded, read-only repeatable-snapshot transaction for a separate login holding only `gw_preview`. It rejects owner/service memberships, unsafe roles, ownership, private table/column grants and application-function execution before calling domain code.
- Public configuration is parsed independently. Private/staff values are rejected; no private deployment-file defaults enter preview results. Fresh restricted-login procedures `public-preview-v61/boundary-r4` and `r5` verify public projection parity, simulation/mainnet public scopes, user/write/escalation denial and grant-drift rejection. The r1 harness failure checked wrapped error text instead of PostgreSQL code; its database/log remain preserved.
- PR59 merged at7e15ff1155720e43516e733927dd88411f5603a0 after push39024411492 and PR39024431447 passed for c33abc41f9700f97607b11b441938e525333a327. The one-paste installer is now merged.
- **Preview application routing, deployment settings and browser acceptance remain unfinished.** Mainnet sending remains disabled. Continue the full C001–C017 list without pausing after this foundation.

## Read-only preview app evidence (v62)

`/workspace/work/public-preview-app-v62`: `api-r2` proves actual mainnet public reads,39 private/auth/job route denials, write/signing denial and unchanged retained hashes. `browser-r1` and final `browser-r2` prove actual production Chromium390px EN/FR catalogue/help/search, banner, public-only navigation, unavailable private pages/API and noindex; no response interception. `credential-scope-r1` rejects21 private credential names; `hosted-preflight-r1` accepts the restricted login and rejects owner login/mode mismatch. r1 API harness failure used the unsupported mainnet recovery inventory; preserved, then r2 hashes the unchanged simulation fixture outside request execution. The archive gap from that release is addressed by v63; chain reconciliation remains unfinished. PR60 passed push39024849840 / PR39024875695 before merging.

## Mainnet archive evidence (v63)

`/workspace/work/mainnet-recovery-v63`: `readonly-boundary-r1` verifies binding, read-only scope, write/downgrade denial and unchanged hashes; `archive-r2` backs up/restores/verifies83 retained tables. `testnet-and-final-mainnet-r1` verifies fresh testnet backup/restore plus the original mainnet packet on another fresh target. `legacy-and-guards-r2` restores/verifies the original v55 packet and rejects retired scope, signed environment mismatch and wrong-database binding. Its failed r1 target/logs remain preserved; proof-backend shutdown is now awaited without terminating other clients or weakening target guards. `worker-regression-r1` verifies ordinary worker/context behavior after extracting the unchanged role checks. No RPC, signer, broadcast or real funds.

Original mainnet packet/key: `mainnet-isolated-r2.gwbackup` / `mainnet-isolated-r2.key` (raw32-byte key; its harness encodes it only inside the protected process); original v55 packet/key remain at their handover paths. Browser recovery workflow and mainnet chain reconciliation/no-resend remain open. PR61 merged after push39025742213 and PR39025758110 passed for a7e16c713f9fa3b35f0cfe02dfafd22c6b2e6049. Continue the full product after the next checked merge.

## Native plan and read-scope fixes (v64)

Fixed two reproduced issues: native plan creation required an RLS-hidden GIV asset, and native read models silently rewrote transaction scope. Native metadata now saves disabled without activating prices; simulation retains its GIV version. Captured-scope catalogue/portfolio/records/receipt reads reject mismatches and include saved timezone in the user projection. `/workspace/work/native-read-v64/plan-and-scope-r3.mts` and `simulation-regression-r1.mts` pass actual restricted-login/replay/stale/role/namespace/financial-hash checks; failed r1 registry fixture is preserved. Mainnet activation remains closed. Still pending: native scheduled launch uses the GIV-only generic launcher, and saved server locale needs restoration on login. PR62 merged after push39026765895 / PR39026798890 passed.

## Transaction preparation and signer fixes (v65)

Reproduced historical acceptance of mismatched EVM gas fields, extra Solana account metadata and unapproved SPL account creation. Pure canonical-intent checks now reject these before key access. TRON network verification precedes key-file access and retains RPC failure classification; unsigned builders reject attached assets, permissions, pre-signatures and changed fee limits. SOL rejects increased rent after quotation.

`unsigned-mainnet-v65/preparation-r5`, `signer-validation-r2`, `tron-reference-before-key-r1`, `evm-execution-regression-r1` and `observation-regression-r1` pass isolated procedures. Preserve failed first signer import harness and generated unfunded encrypted key fixtures. Mainnet unsigned preparation covers eight generated protocol cases without custody files or sending authority; token provenance/live acceptance and actual mainnet signing remain pending. PR63 merged after exact-head push39028197593 / PR39028338335 passed. No schema changes.

## Native write and operational namespaces (v66)

Reproduced withdrawal balance reads and recovery scans silently replacing the selected database scope. Native writes now validate it before working; filters, invoices/events/obligations, fee claims, retained keys, reserve-funding statements, sweeps and liability recovery keep captured scope. Signed prices must match it. Alerts, reminders and daily business scheduling use selected scopes rather than testnet literals; registry iteration selects matching assets. Execution gates remain unchanged.

`native-write-v66/scope-and-prices-r5` passes39 restricted-login boundary rejections with unchanged retained hashes, one42-unit fee bill with replay/conflict checks, valid signed-price replay/cross-environment rejection and testnet alert namespace/deduplication. Failed r1 import and r2 argument/order fixtures remain preserved. No schema changes. PR64 merged after push39044213842 / PR39044236038 passed for83896035ab64f43693dfe1c738ef025c0037cca4. Continue actual mainnet runtime/signing and full product acceptance without milestone pauses.

Simulation alert regression: `native-write-v66/simulation-alerts-r1.mts` passes actual restricted-login simulation payload/budget selection, signed local HTTP delivery and acknowledgement, no duplicate dispatch, and a forged acknowledgement retained as failed. Financial hashes remain unchanged. Generated local webhook/key only.

## Mainnet implementation and review fixes (v67)

| Finding | Fix and local evidence |
|---|---|
| Mainnet runtime/authentication/core/UI were testnet-only | Closed mainnet mode, issuer, native credit/checkout/history/wallet paths and accurate labels implemented;32 configuration/policy/approval guards pass. |
| One approval hash could not activate several networks | Reviewed approval/fingerprint lists support distinct network hashes; legacy singular settings remain compatible and cannot be mixed. Actual signed alert receipts remain required. |
| Worker had only one key file | Four-key map, authenticated encrypted bundle, private pre-write-validated installation and opt-in protected GitHub worker added; package/scope/tamper/nonempty-target procedures pass. |
| Client transaction validation omitted setup/attached-token checks | Canonical Solana reconstruction, approved setup cost, exact EVM gas and TRON attached-asset/permission/signature/expiry/energy checks pass wallet procedures. |
| An unavailable catalogue blocked identity restoration | Sign-in/session state can load while the currency catalogue safely remains unavailable. |
| Capability was confused with financial readiness | Catalogue publishes per-currency readiness; protected policy/hash/recent-alert gates still control new sends. Mainnet presentation rejects simulation/demo settings. |

`mainnet-runtime-v67/mainnet-wallets-r2` passes eight protocol cases and seven member-currency wallet sends (TRX operating-only), using generated unfunded addresses and isolated transport. `financial-mainnet-r7` passes actual restricted-role funding, wallet proof, exact/underpayment, failed refund rights and an actual worker→separate web settlement exactly once. Web has no signer/owner credentials. `configuration-guards-r1` and `key-package-r1` pass. Preserve failed r1/r2 profile-actor fixtures and r4 child-transport-map fixture; no reset or real public broadcast occurred.

Mainnet support is implemented, not externally accepted. Full C001–C017, remaining lifecycle/device/product work, hosted provider/custody/recovery checks and real observation periods remain. PR65 merged after exact-head push39044887939 / PR39044911887 passed. SQL006 fixes the discovered public-queue parameter ambiguity; the one-file final-state installer and pinned schema contract are refreshed. Historical SQL000–005 bytes remain unchanged. Continue after each checked merge.

Admin setup fix: the alert-probe response was previously discarded. Native payment administration now shows its asset, alert ID and selectable configuration hash, with acknowledgement guidance. This makes the documented multi-network approval setup actionable.

SQL/browser review: SQL006 resolves the ambiguous public queue `version` parameter. `mainnet-runtime-v67/queue-migration-r2` reproduces42702, verifies the corrected read-only mainnet result and retired-asset null result, preserves all95 non-receipt root-table hashes and function privileges, and proves late-failure rollback. `compare-schema-r1` matches4222 schema/security entries between seven-migration reference and the direct final-state installer. The first migration-state comparator failure was a result-array prototype mismatch; original targets/logs remain.

`browser-mainnet-r4` passes the actual local production build in Chromium390px EN/FR, genuine signed-session/MFA procedures and the selectable alert configuration hash (HTTP200), without response interception. Earlier browser targets remain: r1 exposed SQL42702; r2/r3 targeted another nested Reason field in the procedure. Source queues, financial records and original archives were not reset.

Contract4 packets created before SQL006 require their matching pre-006 release (PR65 `0ea4cf5e62a0ef7e7f83c26c1a512d6935775ac3` for the current six-file lineage), then a separately reviewed forward upgrade. Keep original packets/keys; never re-sign or rewrite them.

Follow-up UI acceptance: identify the background request/cancellation path that logged a bounded database deadline around MFA/reload. The selected alert-probe request returned200 and its hash displayed correctly; do not treat this as completed whole-app reliability acceptance.

## Preference and native schedule fixes (v68)

- C016: saved language was ignored on login; restore it unless the member explicitly selects a language. Keep English explicit across reload/full navigation.
- C017: native schedules incorrectly used GIV activation. Stage per-currency intents, recheck database deadlines/current approvals/fresh prices, release atomically and keep early checkout disabled. Roll back failures before warning/backoff; retain fairness, cancellation and replay fences.
- Public mainnet copy incorrectly claimed payments were unavailable, and catalogue cards overflowed narrow screens. Correct the label and responsive grid.
- Named restricted-role/native/simulation and actual production-browser evidence: [status](PROJECT-STATUS_v79.md). Whole-product/live acceptance remains open; continue after checked merge.

## Browser recovery and restore activation fixes (v69)

- C008/C011: add a protected GitHub browser flow for encrypted backup, empty-target restore and independent exact verification, plus permanent encrypted ZIP release selection after short-term artifacts expire. Run only the selected trusted backup release; reject extra files, wrong confirmation, occupied targets and mixed signer/web credentials.
- Financial approval hashes lacked database identity, so a restored copy could retain apparently valid source approvals/acknowledgements. Bind web/signer hashes to the actual database nonce/name/OID; require fresh approval without modifying retained financial snapshots.
- Exact seven-migration archive roundtrip, full restricted-role worker/web regression, controller denials, copied-ack activation denial and bounded ZIP checks pass locally. [Status](PROJECT-STATUS_v79.md) distinguishes this evidence from hosted acceptance and remaining chain/lifecycle work.

## Cycle history and idle-preview fixes (v70)

- Transparent paginated cycle positions incorrectly used legacy display rank. Select actual serving rank consistently, retaining the legacy profile’s rule.
- Completed history omitted completion/cooldown and a Completed view. Add the entitled filter, original completion time, localized live cooldown and member status labels; preserve financial records.
- A recent30-row window could miss an older active cycle and allow currency rotation. Use a separate bounded scoped existence flag; keep unresolved chain-review cycles in Current.
- Baseline reproduction, restricted-service reads,35 declared synthetic historical rows, user isolation, unchanged ledger totals and actual390px EN/FR browser checks pass locally. Evidence/remaining build-client, managed-recovery and full-product work: [status](PROJECT-STATUS_v79.md).

## Managed recovery and client compatibility (v71)

- Recovery now permits only known Supabase client roles that are idle, outside a transaction and accompanied by both provider schemas. Active/open-transaction/unknown sessions or hidden metadata still block; no session is terminated. Foreign tables also make a target occupied.
- API responses declare wire compatibility; clients send their supported range. Incompatible writes fail before processing, and the browser blocks subsequent mutations before sending. Legacy clients remain supported; additive deployments do not force reloads. Worker authentication and logout retain their existing paths.
- Native and simulation routes share PWA controls. The worker observes public manifest headers only; private reads and all writes bypass it. EN/FR reload notices wait for wallet interaction and offer to copy an existing returned hash. No automatic resend or stored pending request body.
- Local evidence: `managed-recovery-v71/provider-sessions-r1` passes idle-provider restore/exact verification and active/transaction/unknown/missing-marker denials; `foreign-target-r2` rejects a handlerless foreign table without modifying it. Preserve the old-guard baseline and failed unavailable-extension r1 fixtures. `financial-regression-r1` passes actual encrypted worker→separate web settlement through authenticated callbacks using generated isolated endpoints.
- `client-compatibility-v71/protocol-and-api-r2`, `client-lock-r2` and `worker-protocol-r2` pass API range validation, pre-fetch mutation lock, logout/401 handling, memory-only owner/invoice receipt scoping and public-only worker observation. Future peer messages are explicit fixtures, not hosted upgrade acceptance.
- Final production build, required checks and actual390px Chromium EN/FR pass (`browser-compatibility-r2`): native PWA registration, real manifest metadata, stale worker tuple ignored, explicit future-peer banner, pre-POST mutation lock, unchanged saved locale and manual reload. The earlier r1 browser run also passes; fresh r2 verifies the final legacy0/server1 range.
- Still open: hosted provider metadata/restore, all-asset reconciliation, full product audit, automatic backup cadence/external alerts, device/provider acceptance and real observation periods. No schema, receipt or financial-history rewrite.

## Automatic encrypted backups (v72)

- PR70 merged as `f9cef683c35c59dca5d565648aa7476f3420d39d`; exact head4df5402 passed push39070856823 / PR39070866948. New branch: `feat/scheduled-encrypted-backups`.
- Recovery workflow has an opt-in hourly wake-up using the existing protected backup environment. It reads the authoritative policy through the restricted runtime and verifies owner/runtime namespace identity before deciding whether a backup is due. No signing, restoration, deployment or application-table writes.
- Successful checkpoints are bound to the actual database identity. Missing/deleted/expired archives, failed/untrusted runs, short retention or a changed database cannot suppress a backup. A new checkpoint requires the upload’s actual retention to satisfy policy. Unsupported retention above90days or inconsistent interval/RPO/retention fails rather than silently weakening policy.
- Start up to one hour early to allow the hourly wake-up. GitHub can delay or disable schedules: owner monitoring, real restore drills and measured RPO/RTO remain required. Artifact quota/paid storage must be reviewed; a public repository’s retained encrypted backups are downloadable by readers, so keys stay separately protected.
- `scheduled-backup-v72/policy-and-history-r2`: actual restricted database policy/binding plus11 explicit GitHub metadata fixtures. `retention-r1`: actual checkpoint writer accepts adequate retention and rejects5 missing/short/expired/invalid/API cases. YAML and embedded shell syntax pass. These fixtures do not prove hosted scheduling/upload.
- `archive-r1` creates a real encrypted archive/current signed inventory through the schedule-triggered controller with no payment credentials. `selection-r2` accepts trusted scheduled/manual backups and denies foreign events/branches/failed runs using real Git ancestry plus explicit metadata. The r1 selector attempt hit sandbox child-process EPERM; preserve its log. Script typecheck r1 lacked scratch typeRoots; fresh r2 passes. Required checks, production build and bundle budgets pass. Original archives/keys and source financial rows remain untouched.
- Continue external alert receiver setup, the full all-asset lifecycle/product audit, hosted/device acceptance and real observation periods. Automatic backup implementation is separate from operational acceptance.

## Native lifecycle and wallet prompts (v73)

- PR71 merged as `b143dcc938845931c436093b50cd86dc7ba71a88`; exact head187895f passed push39071509866 / PR39071530871. Current branch: `feat/native-lifecycle-verification`.
- Reload protection missed wallet connection and ownership-signature prompts outside payment sends, including logged-out recovery. All native wallet entry points now share a memory-only interaction guard; success/rejection releases its own token without clearing concurrent prompts or an outer payment guard. No signature/transaction storage or automatic resend.
- `native-lifecycle-v73/eth-native-r4`, `bnb-native-r2`, `usdt-bnb18-r2` and `jaga-bnb18-r1` pass actual restricted-role funding, wallet proof, exact/underpaid incoming, original-sender refund despite ban, failed-refund gas/principal preservation and renewed worker→separate web settlement. Receiver allocations also fund a member withdrawal: quote replay/body conflict, wrong-generation denial, hold/cancel replay, encrypted worker signing and authenticated settlement, exact unused-fee return and replay without duplicate gas.
- These are generated, correctly scaled native/18-decimal token procedures with isolated endpoints. They do not verify real contracts, public funds/providers or hosted identity. Failed originals remain: ETH r1/r2 omitted the transport loader and correctly failed outbound policy; USDT18 r1 retained a6-decimal fixture’s insufficient mock token liquidity and paused. Fresh corrected targets pass; no failed database was reset.
- `wallet-flight-r1` covers actual module connection/ownership success/rejection, overlap, outer payment guard and failed-send cleanup. `wallets-r1` repeats all8 protocol/signing cases and7 member canonical-wallet sends, including configuration/intent denials. An accidental original-harness rerun stopped at exclusive-file creation before changing any original key; all evidence is retained.
- Actual production390px EN/FR `browser-wallet-r4` passes: pending connection disables reload, rejection releases it, and explicit reload succeeds without API response interception. Provider/future-peer messages are fixtures. Earlier browser r1 selected a disabled matching button; r2/r3 lacked an active injected provider. Preserve those logs/targets. Required checks, build and bundle budgets pass; final documentation checks run before publication.
- Remaining C004 work includes funded SOL/SPL/TRC20 lifecycle cases, business/sweeps, reorg/replacement/expiry/restart, chain reconciliation after restore and hosted/live-provider acceptance. Keep unverified assets disabled. Continue all C001–C017 and the full product audit without milestone pauses.

## Seven-asset operations and send progress (v75)

- All seven local member-asset procedures now pass incoming/refund/member withdrawal plus company settlement/surplus sweep. Independent retained-database reads verify five attempts/gas journals per full case, settled obligations and zero unbalanced journals. Generated contracts/RPCs are not actual provenance or hosted acceptance.
- A pending signed ETH refund survives encrypted backup/empty-target restore/exact verification. The target rejects source approvals/worker keys, preserves the hold while index evidence is missing, and settles the retained hash once without custody/new signature/broadcast. Original source/packet remain unchanged. Unknown post-backup history remains a separate reconciliation requirement.
- Recorded sends could still display “Preparing signature.” Add `display_status` from durable attempt evidence to recent/paginated reads, keeping raw financial status and action rules. No DDL or historical rewrite. Funded staged/baseline/isolation/read-integrity procedure `send-status-r2` and production390px EN/FR recent/paginated status/hash procedure `send-status-browser-r1` pass. Required checks, production build and bundle budgets pass locally.
- [Status](PROJECT-STATUS_v79.md) and [handover](LLM-HANDOVER_v79.md) now consolidate current evidence/remaining work; detailed history stays in Git. Continue recovery edge cases, the current PRD audit and external acceptance without milestone pauses.

v79

## Recovery families and live transaction hashes (v75)

Pending SOL/SPL/TRC20 refund archive/restore procedures pass locally without new signatures/broadcasts, with source/packet preservation and source approvals/authentication rejected. Prefer live broadcast/signed hashes over earlier failed attempts while keeping confirmed winners first; five actual-helper temporary scenarios pass (`hash-priority-r2`). Details and outstanding work: [status](PROJECT-STATUS_v79.md). Hosted/unknown-history recovery and whole-product completion remain open.

## Mainnet expiry and replacement preparation (v76)

SOL/SPL/TRC20 pending refunds retain principal before expiry and close only after dual-provider positive expiry through actual worker/separate authenticated web. Original-sender liability returns once without additional gas/signature/broadcast; independent retained-database accounting reads pass. ETH post-withdrawal reorg also passes absence/outage denial, retained review/asset fence, immutable allocations and once-only cash/point reconfirmation. Native ETH and18-decimal BNB token replacement preparation preserves exact intent and rejects unsafe fee/evidence changes. This does not establish complete replacement persistence/restart or hosted-chain acceptance. Evidence and remaining work: [status](PROJECT-STATUS_v79.md).

v79

## Durable EVM replacement follow-up (v77)

Actual encrypted worker ETH and18-decimal BNB token replacement persistence/broadcast/settlement pass locally, with exact immutable transfer intent, linked lineage, principal held until the canonical winner and once-only settlement/gas. Failed fixture originals remain intact. Fresh-process continuation passes for ETH and BNB tokens, with independent accounting checks across all four retained databases; results and remaining scope: [status](PROJECT-STATUS_v79.md). No public-chain or hosted acceptance is inferred.

Mainnet identity follow-up: `mainnet-auth-r2` passes actual restricted-role session/TOTP/recovery/refresh/logout methods, closed sixth MFA attempt and ingress-IP spoof checks without changing financial hashes. Generated identity is not actual Google or hosted/physical-authenticator acceptance. See [status](PROJECT-STATUS_v79.md).

## Current product audit and manual tooling repair (v78)

The six existing simulation procedures pass through the current production build on a fresh single-installer/actual-seeder database: bootstrap/queue, integrity/concurrent spending, scheduler/jobs, withdrawal recovery, incoming failures and reorg/reconfirmation. Repair stale manual job-summary/nested-review assertions to use current paginated staff DTOs; retain privacy and once-only settlement/reconciliation checks. Earlier failed financial fixtures remain intact. These tooling defects do not change production financial behavior or establish full-product/live acceptance. Details: [status](PROJECT-STATUS_v79.md).

## P1-075 — Solana v1 read compatibility (v79)

Actual public RPC returns -32015 when v1 records are requested with maximum0. Share integer maximum1 across adapter and bounded-scanner receipt/block/header/event/expiry requests, retaining existing validation and signing formats. Recorded public-data replay reproduces the old scanner failure and verifies corrected bounded progress/observation-only denial; strict maximum1 SPL refund/ATA/withdrawal and SOL expiry regressions pass. Public network identities were read successfully, but hosted dual-provider/token-provenance acceptance remains open. [Status](PROJECT-STATUS_v79.md) records exact procedures and preserved failed diagnostics.

v79
