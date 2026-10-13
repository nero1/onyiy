# Custom bugs fix plan — Gifters World Phase One

Updated: **14 October 2026 at 12:39:39 AM WAT** · Documentation version **v30**

## Complete one-line remediation list

1. **P1-001 — Expired or dismissed native invoices prevent another checkout.** Implemented; local checks passed; high priority; package A.
2. **P1-002 — A successful wallet send followed by a failed submission can prompt a second payment.** Implemented; local checks passed; high priority; package A.
3. **P1-003 — Native TRX status observation rejects its own event index.** Implemented; local checks passed; high priority; package A.
4. **P1-004 — Signer reservations ignore tighter runtime payout limits.** Implemented; local checks passed; high priority; package A.
5. **P1-005 — Recovery binding distinguishes pooler and signer endpoints for the same database.** Open; high priority; package B.
6. **P1-006 — Recovery can journal the same transaction fees more than once.** Open; high priority; package B.
7. **P1-007 — Solana fee attribution treats other transfers as account setup cost.** Open; high priority; package B.
8. **P1-008 — Saved expired Solana or TRON attempts can indefinitely block a recovery scan.** Open; medium priority; package B.
9. **P1-009 — Previous receiving addresses have no complete recovery monitoring inventory.** Open; high priority; package B.
10. **P1-010 — Pausing a plan rejects payments already committed under its frozen terms.** Implemented; local checks passed; high priority; package A.
11. **P1-011 — Accepted bootstrap destinations have no complete liability and payout support.** Implemented; local checks passed; high priority; package A.
12. **P1-012 — The signer's oldest fixed candidate batch can starve later payable work.** Open; medium priority; package C.
13. **P1-013 — Recovery pages have row bounds without a feasible total RPC/time budget.** Open; high priority; package B.
14. **P1-014 — The generic scheduler client signs only simulation and leaves testnet jobs undrained.** Implemented; local checks passed; high priority; package C.
15. **P1-015 — The hosted deploy workflow cannot migrate the selected testnet binding.** Open; medium priority; package C.
16. **P1-016 — Safe cancellation and unallocated-refund recovery are unreachable in the UI.** Implemented; local checks passed; medium priority; package D.
17. **P1-017 — Import and business operations use the generic staff rate policy.** Implemented; local checks passed; medium priority; package D.
18. **P1-018 — Rate budgets fragment across raw resource paths.** Implemented; local checks passed; medium priority; package D.
19. **P1-019 — Public database reads and OAuth callbacks bypass explicit rate budgets.** Open; medium priority; package D.
20. **P1-020 — A combined factor/IP bucket does not bound distributed MFA guesses.** Implemented; local checks passed; medium priority; package D.
21. **P1-021 — Wallet changes lack the PRD's fresh authentication and domain-bound challenge.** Implemented; local checks passed; high priority; package D.
22. **P1-022 — Ordinary API reads can return data from the previous client identity.** Implemented; local checks passed; high priority; package D.
23. **P1-023 — Concurrent browser tabs can revoke a valid refresh family.** Implemented; local checks passed; medium priority; package D.
24. **P1-024 — Secondary portals show login instead of using an available refresh session.** Implemented; local checks passed; medium priority; package D.
25. **P1-025 — Concurrent Google registrations can collide and fallback names violate configured lengths.** Implemented; local checks passed; medium priority; package D.
26. **P1-026 — Account deletion leaves private message content in notifications and job payloads.** Open; medium priority; package E.
27. **P1-027 — Expired authentication and rate records have no bounded cleanup lifecycle.** Open; medium priority; package E.
28. **P1-028 — Declared notification, terminal-job, ledger and audit retention is not implemented.** Open; medium priority; package E.
29. **P1-029 — Pending chain observation ignores poll policy and creates a new durable job each round.** Open; medium priority; package C.
30. **P1-030 — Configured DLQ, backlog, lock-wait and quota alert thresholds have no complete alert path.** Open; medium priority; package C.
31. **P1-031 — Acknowledged or resolved alerts can still send queued reminders.** Open; medium priority; package C.
32. **P1-032 — Old low-priority alert retries can consume the budget before a new critical alert.** Open; medium priority; package C.
33. **P1-033 — A permanent alert delivery key does not bind an immutable payload.** Open; medium priority; package C.
34. **P1-034 — Reopened alert escalation uses lifetime delivery count as the interval index.** Open; low priority; package C.
35. **P1-035 — Request IDs do not correlate API, audit, job and error records.** Open; medium priority; package C.
36. **P1-036 — Expected failures become generic nonretryable errors and raw codes reach users.** Open; medium priority; package D.
37. **P1-037 — The shared JSON byte cap has no elapsed read deadline.** Implemented; local checks passed; medium priority; package C.
38. **P1-038 — Ordinary database work lacks a complete query, queue and request time budget.** Open; medium priority; package C.
39. **P1-039 — Balances and reconciliation repeatedly aggregate full ledger history.** Open; medium priority; package E.
40. **P1-040 — Expired public statistics can create an advisory-lock request herd.** Open; medium priority; package C.
41. **P1-041 — RPC cache misses are not coalesced and throttle waiting is outside the timeout.** Open; medium priority; package C.
42. **P1-042 — Deployment-controlled RPC, alert and cache URLs lack an explicit SSRF destination policy.** Open; medium priority; package D.
43. **P1-043 — Remote cache adapters lack equivalent timeout, response and lifecycle bounds.** Open; medium priority; package C.
44. **P1-044 — Global activity remains visible when feature_activity is disabled.** Implemented; local checks passed; medium priority; package F.
45. **P1-045 — There is no shared visible authenticated snapshot poll.** Open; medium priority; package F.
46. **P1-046 — Notification load-more permanently stops at 100 items.** Implemented; local checks passed; medium priority; package F.
47. **P1-047 — Staff lists hide older users, jobs and recovery cases without search or cursors.** Open; medium priority; package F.
48. **P1-048 — Latest-history caps can omit older active cycles and pending withdrawals.** Open; medium priority; package F.
49. **P1-049 — Public catalog and help lack the Phase One SEO rendering and metadata contract.** Open; medium priority; package G.
50. **P1-050 — Several private portals lack noindex metadata.** Open; low priority; package G.
51. **P1-051 — Stored locale and product copy are not consistently applied across portals.** Open; medium priority; package F.
52. **P1-052 — Dark-mode primary button text fails normal-text contrast.** Implemented; local checks passed; medium priority; package F.
53. **P1-053 — Mobile navigation and the testnet home omit required product surfaces.** Open; medium priority; package F.
54. **P1-054 — The native wallet summary omits held and withdrawn/net-income totals.** Open; medium priority; package F.
55. **P1-055 — Closed historical exceptions can prevent plan editing forever.** Implemented; local checks passed; medium priority; package A.
56. **P1-056 — Native activation ignores the configured fixed-token pricing mode.** Implemented; local checks passed; medium priority; package A.
57. **P1-057 — Accepted provider and finality selectors have no matching implementation.** Implemented; local checks passed; medium priority; package C.
58. **P1-058 — Advertised single-request archive uploads exceed the Vercel function body limit.** Open; medium priority; package H.
59. **P1-059 — Filesystem archive staging is not durable or consistently reachable across serverless instances.** Open; medium priority; package H.
60. **P1-060 — Archive stream creation precedes the final session fence and permits a file-lifecycle race.** Open; low priority; package H.
61. **P1-061 — Failed staging files consume quota without a complete failure inventory.** Open; medium priority; package H.
62. **P1-062 — Paged own-data exports are not a single point-in-time snapshot.** Open; low priority; package H.
63. **P1-063 — Drizzle table coverage does not describe all deployed constraints and defaults.** Open; medium priority; package E.
64. **P1-064 — Large tightly coupled services and untyped UI contracts make changes fragile.** Open; low priority; package I.
65. **P1-065 — Help search lacks the specified locale full-text and trigram ranking.** Open; medium priority; package G.
66. **P1-066 — Published help cache does not remove withdrawn or renamed saved articles.** Open; low priority; package G.
67. **P1-067 — Solana custody reconciliation requires identical live response slots.** Open; medium priority; package B.
68. **P1-068 — Production dependencies include unresolved security advisories.** Implemented; local checks passed; high priority; package E.
69. **P1-069 — Native quote expiry and cooldown use the web clock instead of database time.** Implemented; local checks passed; medium priority; package A.

70. **P1-070 — A valid multi-asset plan catalog fails after 100 active versions.** Implemented; local checks passed; medium priority; package F.

## Approval boundary and execution rule

**This is a plan only. All 70 findings are open; zero application fixes have been applied. The owner explicitly said “DO NOT FIX THE BUGS YET UNTIL I REVIEW THE PLAN!!!”** Next action is owner review of this concrete plan. A documentation-only PR/merge does not approve financial or application changes.

After the owner reviews/authorizes fixes, execute substantial coherent batches without stopping for M1/M2 milestone acceptance. Resolve routine choices using the recommendations here. Read the current PRD/status/setup/how-it-works/AGENTS and relevant installed Next guides first. Do not begin Phase Two while this remediation round is open.

Priority means potential impact: fifteen High findings need early closure, but not all represent active externally exploitable vulnerabilities. Forty-nine Medium and six Low items must also be implemented or explicitly dispositioned with evidence and an owner-accepted requirement amendment. A hardening recommendation is not retroactively labelled an exploited bug.

## Recommended work packages and dependencies

Group these into as few reviewable, verified PRs as practical. Package letters are work boundaries, not extra acceptance gates and not a mandated number of sessions/PRs. Handle the compatible security dependency update first, then money/recovery/private-state risks, then operational/storage/hosting and product completeness. Interleave small typed extractions with the code they clarify.

### Package A: Payment and economic invariants

**Finding IDs:** P1-001, P1-002, P1-003, P1-004, P1-010, P1-011, P1-055, P1-056, P1-069.

**Dependencies/order:** Start after plan approval. Land the dependency security subset of E before relying on changed chain/database libraries; coordinate B's shared fee schema.

**Work:** Fix native quote lifecycle/send-versus-submit, canonical TRX observation, independently intersected signer caps, pre-pause admission, complete bootstrap liability purposes, drained-plan checks, native pricing mode and database-authoritative quote time.

**Preservation boundary:** Do not enable sending to exercise these paths. Use isolated generated fixtures and restricted databases; any historical accounting correction is a new compensating journal. Never rebuild a signed transfer merely because an HTTP call failed.

### Package B: Recovery scope, transaction fees and resumable evidence

**Finding IDs:** P1-005, P1-006, P1-007, P1-008, P1-009, P1-013, P1-067.

**Dependencies/order:** Implement alongside A's accounting contract, then verify as one financial integration before closing either package.

**Work:** Define an approved web/signer database identity that rejects clones; make fees transaction-scoped; separate Solana principal/rent; reconcile positive expiry; persist previous treasury exposure; add within-block cursors and a jointly evidenced Solana cutoff.

**Preservation boundary:** Apply forward migrations with same-migration grants/revokes/RLS. Preserve all signed attempts and positive evidence, beneficiary holds, prior receiving addresses and failed scans. A partial scan cannot report clean.

### Package D: Identity, private state and abuse controls

**Finding IDs:** P1-016, P1-017, P1-018, P1-019, P1-020, P1-021, P1-022, P1-023, P1-024, P1-025, P1-036, P1-042.

**Dependencies/order:** Address P1-021/P1-022 early with A/B; finish the remaining transport/session fixes before shared polling in F.

**Work:** Centralize safe session bootstrap and response fencing, coordinate cross-tab refresh, enforce wallet step-up/domain proofs, map canonical route budgets and independent guessing limits, expose safe recovery controls and localize complete typed errors.

**Preservation boundary:** Keep replay detection and current DB role/account checks. Avoid account enumeration and unbounded limiter database writes. Do not log cookies, proof signatures, factor secrets or raw private responses.

### Package C: Operational dispatch, deadlines and monitoring

**Finding IDs:** P1-012, P1-014, P1-015, P1-029, P1-030, P1-031, P1-032, P1-033, P1-034, P1-035, P1-037, P1-038, P1-040, P1-041, P1-043, P1-057.

**Dependencies/order:** Follow corrected financial/session contracts; integrate E's cleanup and H's stream handling as needed.

**Work:** Make scheduler environment/work dispatch correct, support non-signing testnet deployment, eliminate candidate starvation, persist observation deadlines, complete operational alerts and immutable delivery payloads, add correlation and bounded DB/RPC/cache budgets, validate selector capabilities.

**Preservation boundary:** Ignore CRON frequency. Keep the shared outbound alert attempt cap, permanent business keys and lease generation checks. Backoff must not abandon accrued rights or turn unknown sends into failed sends.

### Package E: Dependency security, schema congruence, privacy and retention

**Finding IDs:** P1-026, P1-027, P1-028, P1-039, P1-063, P1-068.

**Dependencies/order:** Resolve P1-068 first after approval; remaining work follows typed financial/correlation contracts and supplies C's cleanup.

**Work:** Patch compatible resolved dependency trees, map deliberate SQL-only schema contracts, redact nonfinancial private copies, drain expired auth/rate data, introduce verified archive/compaction and exact transactional counters.

**Preservation boundary:** No blind npm audit --force. No applied migration checksum edits, destructive database resets or removal of money/signing/replay evidence. Cleanup honors holds and owner-reviewed retention; financial archive verification precedes hot-data reclamation.

### Package H: Portability and hosting-compatible artifact lifecycle

**Finding IDs:** P1-058, P1-059, P1-060, P1-061, P1-062.

**Dependencies/order:** Use D's current-session fence and C's total deadlines; isolate web staging from the owner restore authority.

**Work:** Match advertised limits to the actual host, define private durable retrieval or explicit CLI-only hosting, close streams on rejection/cancel, inventory failed staging, and define export cutoff consistency.

**Preservation boundary:** Upload remains encrypted/unverified. Restore only into an empty inactive owner target with signed inventory and authentication; it cannot publish or start workers. Preserve failed evidence until a reviewed retention decision.

### Package F: Member/staff usability, pagination, preferences and accessibility

**Finding IDs:** P1-044, P1-045, P1-046, P1-047, P1-048, P1-051, P1-052, P1-053, P1-054, P1-070.

**Dependencies/order:** Build on D's private response fence and C's bounded polling contract; keep public rendering in G separate from private DTOs.

**Work:** Share feature-aware visible polling, honor public feature revisions, continue notification/staff/history cursors, keep actionable old states visible, apply locale/theme consistently, fix contrast and responsive navigation, and expose complete native wallet totals.

**Preservation boundary:** Use exact money DTOs; never authorize a spend from display cache. Hidden/offline pages stop private polling and queued financial writes remain prohibited. Retain lazy wallet imports and build budgets.

### Package G: Public SEO, help search and public cache consistency

**Finding IDs:** P1-049, P1-050, P1-065, P1-066.

**Dependencies/order:** Use E's schema/index inventory and F's locale/public manifest rules.

**Work:** Implement server-safe localized public catalog/help, canonical origin/alternates/public sitemap/legal/mechanics, HTTP permanent slug redirects, private noindex, published-only full-text/trigram search and saved-help reconciliation.

**Preservation boundary:** SEO data is a closed public projection with accurate visible content. Staff/member identity, wallet receipts and admin data never enter the sitemap, public cache or structured data.

### Package I: Incremental modularity and typed contracts

**Finding IDs:** P1-064.

**Dependencies/order:** Apply through touched modules during all packages; finish remaining extraction after invariant checks pass.

**Work:** Extract transport/error/DTO boundaries and small service modules, format touched code and explicitly enforce package layering.

**Preservation boundary:** Retain established transaction ownership and financial algorithms. Avoid an unrelated architecture rewrite, provider replacement or large new framework dependency.

## Per-finding tasks and acceptance

Every item below is **[ ] Open — awaiting plan review**. Paths are repository-relative. The report provides trigger/evidence/severity; this plan provides the full fix plus its bounded acceptance check. Checks are named manual/provider-contract procedures, not instructions to add an automated test suite or fix test-only issues.

### 1: BUG P1-001: Expired or dismissed native invoices prevent another checkout

**FILES:** `server/crypto-incoming.ts`, `packages/db/src/schema.ts`, `components/native-portal.tsx`

**FIX:** Atomically expire or explicitly cancel positively unsubmitted quotes, recover the existing usable quote, and retain late-payment monitoring and immutable invoice economics.

**ACCEPTANCE:** An expired/dismissed unpaid quote permits a fresh quote; submitted/late funds retain one recoverable invoice.

**STATUS:** [x] Implemented and locally verified in v30; package A; High priority.

### 2: BUG P1-002: A successful wallet send followed by a failed submission can prompt a second payment

**FILES:** `components/native-portal.tsx`, `lib/native-wallet.ts`, `server/crypto-incoming.ts`

**FIX:** Retain a nonsecret submission receipt scoped to the original invoice/account, distinguish sending from submitting, retry only hash submission, and provide explicit recovery without automatically sending again.

**ACCEPTANCE:** Force submission failure after one successful wallet send: retry submits the same hash and sends no second payment.

**STATUS:** [x] Implemented and locally verified in v30; package A; High priority.

### 3: BUG P1-003: Native TRX status observation rejects its own event index

**FILES:** `packages/chains/src/tron.ts`, `server/crypto-expiry.ts`, `workers/signer/run.ts`

**FIX:** Use the canonical native index and preserve token event discovery; check pending, executed failure, settlement and expiry with the same saved transaction.

**ACCEPTANCE:** A saved native TRX transaction traverses pending, confirmed, failed and positive-expiry cases using the canonical index.

**STATUS:** [x] Implemented and locally verified in v30; package A; High priority.

### 4: BUG P1-004: Signer reservations ignore tighter runtime payout limits

**FILES:** `workers/signer/store.ts`, `server/unallocated-refunds.ts`, `server/financial-config.ts`

**FIX:** Enforce the minimum of deployment ceilings and freshly validated runtime limits in the signer transaction for every obligation kind, keeping independently reserved daily principal and gas.

**ACCEPTANCE:** Lower each live cap below the hard cap: all obligation kinds stop at the lower value under concurrent claims.

**STATUS:** [x] Implemented and locally verified in v30; package A; High priority.

### 5: BUG P1-005: Recovery binding distinguishes pooler and signer endpoints for the same database

**FILES:** `packages/db/src/binding-fingerprint.ts`, `packages/db/src/context.ts`, `workers/signer/store.ts`, `server/chain-recovery.ts`

**FIX:** Introduce an authenticated shared deployment/database binding that works across approved connection modes and cannot be inherited by a restored clone. Preserve clone rejection and require fresh recovery proof where existing identity is ambiguous.

**ACCEPTANCE:** The same database's approved web/signer endpoints agree; a restored clone still cannot use the source checkpoint.

**STATUS:** [ ] Open; package B; High priority.

### 6: BUG P1-006: Recovery can journal the same transaction fees more than once

**FILES:** `server/chain-recovery.ts`, `server/crypto-settlement.ts`, `packages/db/src/schema.ts`

**FIX:** Claim chain transaction fees once using a canonical environment/chain/hash key shared by settlement and recovery; keep per-transfer principal losses separate and reconcile existing duplicates with compensating journals.

**ACCEPTANCE:** Resolve two events/assets from one hash and a mixed known/unknown hash: principal is per event, gas/setup are once.

**STATUS:** [ ] Open; package B; High priority.

### 7: BUG P1-007: Solana fee attribution treats other transfers as account setup cost

**FILES:** `packages/chains/src/solana.ts`, `server/chain-recovery.ts`

**FIX:** Derive rent/account creation from validated instructions and account balance evidence, subtract every supported principal movement, and send ambiguous multi-instruction transactions to review without inventing setup fees.

**ACCEPTANCE:** A two-transfer SOL transaction books both principals, one network fee and only positively identified rent.

**STATUS:** [ ] Open; package B; High priority.

### 8: BUG P1-008: Saved expired Solana or TRON attempts can indefinitely block a recovery scan

**FILES:** `server/chain-recovery.ts`, `server/crypto-expiry.ts`, `packages/chains/src/solana.ts`, `packages/chains/src/tron.ts`

**FIX:** Reconcile retained positive expiry/failure evidence in the scan and expose the required audited closure. Do not release holds or manufacture failure from an absent hash.

**ACCEPTANCE:** A positively expired saved attempt progresses through audited closure; an unknown hash retains its hold.

**STATUS:** [ ] Open; package B; Medium priority.

### 9: BUG P1-009: Previous receiving addresses have no complete recovery monitoring inventory

**FILES:** `server/financial-config.ts`, `server/chain-recovery.ts`, `workers/signer/store.ts`, `docs/PRD.md`

**FIX:** Persist versioned receiving-address exposure and checkpoints, scan each retained address, and retire monitoring only after positive invoice/liability closure.

**ACCEPTANCE:** An old receiving address with an unresolved invoice/unmatched inflow remains monitored after rotation.

**STATUS:** [ ] Open; package B; High priority.

### 10: BUG P1-010: Pausing a plan rejects payments already committed under its frozen terms

**FILES:** `server/core.ts`, `server/incoming.ts`, `server/crypto-incoming.ts`, `server/plans.ts`

**FIX:** Separate new-checkout eligibility from admission of an eligible pre-pause payment; validate its immutable snapshot and submission deadline while preserving safety pauses and beneficiary rights.

**ACCEPTANCE:** Submit before pause, confirm afterward: frozen eligible terms are honored; new checkout remains blocked.

**STATUS:** [x] Implemented and locally verified in v30; package A; High priority.

### 11: BUG P1-011: Accepted bootstrap destinations have no complete liability and payout support

**FILES:** `packages/config/src/policies.ts`, `server/core.ts`, `server/crypto-business.ts`, `server/treasury-sweeps.ts`, `server/chain-recovery.ts`, `workers/signer/store.ts`

**FIX:** Use one authoritative liability-purpose registry throughout allocation, reconciliation, sweeps and signing. Implement each permitted destination or fail configuration validation before it can accept allocations.

**ACCEPTANCE:** Every accepted bootstrap purpose is payable and excluded from sweep surplus; unsupported choices fail before allocation.

**STATUS:** [x] Implemented and locally verified in v30; package A; High priority.

### 12: BUG P1-012: The signer's oldest fixed candidate batch can starve later payable work

**FILES:** `workers/signer/store.ts`, `workers/signer/run.ts`

**FIX:** Add bounded eligible-work selection or a fair durable cursor and next-attempt deadlines, with separate recovery scheduling that never loses signed lineage.

**ACCEPTANCE:** Twenty blocked old obligations do not prevent a later eligible obligation from being considered.

**STATUS:** [ ] Open; package C; Medium priority.

### 13: BUG P1-013: Recovery pages have row bounds without a feasible total RPC/time budget

**FILES:** `server/chain-recovery.ts`, `packages/chains/src/tron.ts`, `packages/chains/src/rpc.ts`, `app/api/v1/admin/crypto/scans/page/route.ts`

**FIX:** Persist per-block/event/transaction progress, apply an overall elapsed/RPC budget, and return resumable partial pages without prematurely declaring an asset reconciled.

**ACCEPTANCE:** An oversized busy block progresses across bounded calls without lost events, duplicate fees or a false clean scan.

**STATUS:** [ ] Open; package B; High priority.

### 14: BUG P1-014: The generic scheduler client signs only simulation and leaves testnet jobs undrained

**FILES:** `scripts/scheduler-tick.mjs`, `server/scheduler.ts`, `server/jobs.ts`, `server/financial-operations.ts`, `.github/workflows/scheduler.yml`

**FIX:** Sign the explicitly configured environment, validate it on both sides, and run the generic bounded job dispatcher for testnet as well as simulation. Keep external scheduling and all send gates independent.

**ACCEPTANCE:** A signed testnet generic tick processes notification/export/observation work; wrong-environment signatures reject.

**STATUS:** [x] Implemented and locally verified in v30; package C; High priority.

### 15: BUG P1-015: The hosted deploy workflow cannot migrate the selected testnet binding

**FILES:** `.github/workflows/ci-vercel.yml`, `scripts/validate-deployment.ts`, `packages/db/src/seed.ts`

**FIX:** Use the validated hosted environment for binding checks and migrations, split simulation fixtures from shared/native metadata, and retain explicit release gates and empty owner-provided native registries.

**ACCEPTANCE:** A non-signing testnet database migrates in the hosted workflow without inserting simulation identities or enabling sends.

**STATUS:** [ ] Open; package C; Medium priority.

### 16: BUG P1-016: Safe cancellation and unallocated-refund recovery are unreachable in the UI

**FILES:** `components/native-portal.tsx`, `components/native-admin.tsx`, `server/crypto-payouts.ts`, `server/crypto-operational-recovery.ts`

**FIX:** Expose each safe recovery capability independently from permission to create a send, include unallocated-refund recovery, and derive controls from authoritative obligation state.

**ACCEPTANCE:** With execution disabled, eligible unsigned cancellation and unallocated-refund recovery remain reachable.

**STATUS:** [x] Implemented and locally verified in v30; package D; Medium priority.

### 17: BUG P1-017: Import and business operations use the generic staff rate policy

**FILES:** `server/api.ts`, `server/rate-limits.ts`, `packages/config/src/policies.ts`, `xmanifest.json`

**FIX:** Define explicit method/route-family mappings with sensitive families taking precedence; preserve replay-aware exceptions only where they are justified.

**ACCEPTANCE:** Staging and business routes select their specific budgets; ordinary staff requests keep the staff policy.

**STATUS:** [x] Implemented and locally verified in v30; package D; Medium priority.

### 18: BUG P1-018: Rate budgets fragment across raw resource paths

**FILES:** `server/rate-limits.ts`, `next.config.ts`, `server/api.ts`

**FIX:** Pass a canonical route template or operation identifier to the limiter and independently enforce user/IP budgets across resources.

**ACCEPTANCE:** Different resource IDs share the same operation budget while distinct operation families remain independent.

**STATUS:** [x] Implemented and locally verified in v30; package D; Medium priority.

### 19: BUG P1-019: Public database reads and OAuth callbacks bypass explicit rate budgets

**FILES:** `server/api.ts`, `server/auth-api.ts`, `server/google-auth.ts`, `server/public-reads.ts`

**FIX:** Use CDN/public-cache controls and bounded IP admission for expensive misses/authentication callbacks; avoid a database write for every cached anonymous hit and retain public-read availability during limiter failure.

**ACCEPTANCE:** Public cache hits stay inexpensive; repeated authentication/miss traffic is bounded before costly external exchange.

**STATUS:** [ ] Open; package D; Medium priority.

### 20: BUG P1-020: A combined factor/IP bucket does not bound distributed MFA guesses

**FILES:** `server/rate-limits.ts`, `server/auth.ts`, `server/auth-api.ts`, `packages/config/src/policies.ts`

**FIX:** Enforce independent factor/account and IP budgets across verification routes with temporary backoff and recovery-safe behavior; do not permanently lock accounts or expose factor existence.

**ACCEPTANCE:** Changing client IP does not reset the account/factor guessing allowance; legitimate recovery stays possible.

**STATUS:** [x] Implemented and locally verified in v30; package D; Medium priority.

### 21: BUG P1-021: Wallet changes lack the PRD's fresh authentication and domain-bound challenge

**FILES:** `server/api.ts`, `server/crypto-wallets.ts`, `packages/db/src/context.ts`, `docs/PRD.md`

**FIX:** Require fresh authentication at challenge and commit, bind proof to origin, operation, session and wallet revision, and preserve the cooling period and already-broadcast destinations.

**ACCEPTANCE:** Old authentication cannot change a wallet; wrong-domain or stale revision proof rejects without touching broadcast destinations.

**STATUS:** [x] Implemented and locally verified in v30; package D; High priority.

### 22: BUG P1-022: Ordinary API reads can return data from the previous client identity

**FILES:** `lib/api-client.ts`, `components/notification-inbox.tsx`, `components/dashboard-app.tsx`, `components/admin-panel.tsx`

**FIX:** Capture and fence request scope on every private response/error, abort obsolete reads, and reset or key private child state by owner plus generation.

**ACCEPTANCE:** Delay private reads across owner/generation changes: old success/error responses cannot repopulate current UI.

**STATUS:** [x] Implemented and locally verified in v30; package D; High priority.

### 23: BUG P1-023: Concurrent browser tabs can revoke a valid refresh family

**FILES:** `lib/api-client.ts`, `server/auth.ts`, `components/dashboard-app.tsx`

**FIX:** Coordinate browser refresh with Web Locks/BroadcastChannel and recheck shared cookies/session state after waiting. Preserve server token rotation and actual reuse detection.

**ACCEPTANCE:** Two tabs refreshing together preserve one valid family; actual refresh-token reuse still revokes it.

**STATUS:** [x] Implemented and locally verified in v30; package D; Medium priority.

### 24: BUG P1-024: Secondary portals show login instead of using an available refresh session

**FILES:** `components/native-portal.tsx`, `components/member-portal.tsx`, `components/account-portal.tsx`, `lib/auth-client.ts`, `components/dashboard-app.tsx`

**FIX:** Centralize session bootstrap and safe refresh for every portal, including cross-tab scope handling and pre-auth/MFA restrictions.

**ACCEPTANCE:** Open each portal after access expiry with valid refresh: it resumes the session without skipping required MFA.

**STATUS:** [x] Implemented and locally verified in v30; package D; Medium priority.

### 25: BUG P1-025: Concurrent Google registrations can collide and fallback names violate configured lengths

**FILES:** `server/google-auth.ts`, `server/auth.ts`, `packages/config/src/policies.ts`

**FIX:** Use bounded conflict-aware insertion retries and a policy-compliant fallback inside transaction-safe savepoints; keep provider identity unique.

**ACCEPTANCE:** Different Google subjects with the same stem both receive unique names under short and long valid policies.

**STATUS:** [x] Implemented and locally verified in v30; package D; Medium priority.

### 26: BUG P1-026: Account deletion leaves private message content in notifications and job payloads

**FILES:** `server/moderation.ts`, `server/jobs.ts`, `packages/db/src/schema.ts`, `packages/db/src/migrations/011_durable_notification_jobs.sql`

**FIX:** Define and implement nonfinancial-content erasure across delivery copies using a narrowly scoped forward migration/redaction capability; retain financial UUIDs, mandatory audit evidence and permanent deduplication keys.

**ACCEPTANCE:** Delete a user with a free-text admin message: permitted private copies are redacted and money/replay records remain intact.

**STATUS:** [ ] Open; package E; Medium priority.

### 27: BUG P1-027: Expired authentication and rate records have no bounded cleanup lifecycle

**FILES:** `server/maintenance.ts`, `server/financial-cleanup.ts`, `server/auth.ts`, `server/google-auth.ts`, `packages/db/src/schema.ts`

**FIX:** Add indexed bounded cleanup jobs with explicit retention and holds, retaining replay records through their full acceptance windows and active family dependencies.

**ACCEPTANCE:** Expired flows/families/rate/replay rows drain in bounded batches; active dependencies and acceptance windows remain.

**STATUS:** [ ] Open; package E; Medium priority.

### 28: BUG P1-028: Declared notification, terminal-job, ledger and audit retention is not implemented

**FILES:** `server/maintenance.ts`, `server/jobs.ts`, `server/notifications.ts`, `packages/config/src/policies.ts`, `packages/db/src/migrations`

**FIX:** Archive verified immutable financial/audit partitions and compact expendable delivery bodies in resumable batches; preserve permanent business keys and recoverable evidence, and honor retention holds.

**ACCEPTANCE:** Archive/compaction respects holds and permanent keys, verifies checksums and can restore/reconcile retained financial evidence.

**STATUS:** [ ] Open; package E; Medium priority.

### 29: BUG P1-029: Pending chain observation ignores poll policy and creates a new durable job each round

**FILES:** `server/crypto-observer.ts`, `server/jobs.ts`, `packages/config/src/policies.ts`

**FIX:** Use durable next-observation deadlines and bounded adaptive backoff/jitter, with compact attempt state and permanent deposit idempotency. This concerns processing policy, not external CRON frequency.

**ACCEPTANCE:** Normal pending observations honor persisted deadlines/backoff without spawning an immediate durable-job chain.

**STATUS:** [ ] Open; package C; Medium priority.

### 30: BUG P1-030: Configured DLQ, backlog, lock-wait and quota alert thresholds have no complete alert path

**FILES:** `server/financial-monitor.ts`, `server/financial-operations.ts`, `server/jobs.ts`, `packages/config/src/policies.ts`, `app/api/health/route.ts`

**FIX:** Implement indexed backlog/dead-letter and age measurements, quota/lock diagnostics and priority-aware deduplicated alerts; keep public health aggregate-only and cheap.

**ACCEPTANCE:** Cross a DLQ/backlog/age threshold: one bounded redacted alert and staff diagnostic appear without public identifiers.

**STATUS:** [ ] Open; package C; Medium priority.

### 31: BUG P1-031: Acknowledged or resolved alerts can still send queued reminders

**FILES:** `server/financial-alerts.ts`, `server/financial-operations.ts`

**FIX:** Fence reminder claims against the current alert occurrence/status and stop obsolete reminder retries after acknowledgement/resolution, retaining attempted-delivery evidence.

**ACCEPTANCE:** Acknowledge/resolve before a queued reminder claim: it cannot dispatch an obsolete reminder.

**STATUS:** [ ] Open; package C; Medium priority.

### 32: BUG P1-032: Old low-priority alert retries can consume the budget before a new critical alert

**FILES:** `server/financial-alerts.ts`, `server/financial-monitor.ts`

**FIX:** Prioritize fresh critical conditions within the existing global cap, use fair per-condition retry deadlines/coalescing, and expose suppressed/backlogged alerts to staff.

**ACCEPTANCE:** With older failing P2 work, a new P1 receives eligible budget priority without exceeding the shared cap.

**STATUS:** [ ] Open; package C; Medium priority.

### 33: BUG P1-033: A permanent alert delivery key does not bind an immutable payload

**FILES:** `server/financial-alerts.ts`, `packages/db/src/schema.ts`

**FIX:** Persist the canonical payload/hash and occurrence revision with each delivery, retry exactly those bytes, and create a new permanent ordinal for changed content.

**ACCEPTANCE:** Retry after an ACK loss and condition reopen: the old key retains exactly its original payload hash.

**STATUS:** [ ] Open; package C; Medium priority.

### 34: BUG P1-034: Reopened alert escalation uses lifetime delivery count as the interval index

**FILES:** `server/financial-alerts.ts`, `server/financial-operations.ts`

**FIX:** Keep a never-reused delivery ordinal separate from the current occurrence's escalation step and daily attempt budget.

**ACCEPTANCE:** Reopen an escalated condition: fresh escalation starts at step zero while delivery ordinals never repeat.

**STATUS:** [ ] Open; package C; Low priority.

### 35: BUG P1-035: Request IDs do not correlate API, audit, job and error records

**FILES:** `server/api.ts`, `server/auth.ts`, `server/jobs.ts`, `server/scheduler.ts`, `server/worker-auth.ts`

**FIX:** Create one bounded request correlation context, propagate causation to asynchronous work and safe logs, and return the same ID in response metadata/header without logging secrets or financial payloads.

**ACCEPTANCE:** One reported request ID joins response metadata/header to safe logs, audit causation and downstream job records.

**STATUS:** [ ] Open; package C; Medium priority.

### 36: BUG P1-036: Expected failures become generic nonretryable errors and raw codes reach users

**FILES:** `server/api.ts`, `lib/api-client.ts`, `lib/i18n.ts`, `components/native-portal.tsx`, `components/account-portal.tsx`, `server/crypto-prices.ts`

**FIX:** Use a complete typed error registry with accurate statuses, localized message/help keys and safe retry guidance. Automatic retries must remain restricted to replay-safe reads/submissions.

**ACCEPTANCE:** Each thrown domain error maps to a localized actionable status; transient retries never resend money.

**STATUS:** [ ] Open; package D; Medium priority.

### 37: BUG P1-037: The shared JSON byte cap has no elapsed read deadline

**FILES:** `server/request-body.ts`, `server/api.ts`, `server/auth-api.ts`

**FIX:** Add a bounded total read deadline and AbortSignal handling, cancel/release the reader on all exits and avoid duplicate body parsing.

**ACCEPTANCE:** A silent/aborted/oversized body ends within the total read budget and releases its reader.

**STATUS:** [x] Implemented and locally verified in v30; package C; Medium priority.

### 38: BUG P1-038: Ordinary database work lacks a complete query, queue and request time budget

**FILES:** `packages/db/src/connection-options.ts`, `packages/db/src/context.ts`, `packages/db/src/index.ts`, `workers/signer/run.ts`

**FIX:** Set workload-specific transaction/query/lock budgets and bounded admission, memoize only immutable capability checks with revocation-safe invalidation, add safe transient DB backoff/circuit health and drain resources on shutdown.

**ACCEPTANCE:** Lock contention and exhausted pool admission return within workload budgets; shutdown drains without unbounded waits.

**STATUS:** [ ] Open; package C; Medium priority.

### 39: BUG P1-039: Balances and reconciliation repeatedly aggregate full ledger history

**FILES:** `server/core.ts`, `server/reconcile.ts`, `server/crypto-reads.ts`, `server/public-statistics.ts`, `packages/db/src/migrations/007_scoped_runtime_access.sql`, `packages/db/src/migrations/005_ledger_integrity.sql`

**FIX:** Maintain transactional per-account counters and bounded reconciliation checkpoints with exact integer arithmetic, verify them against journals and introduce measured archival/index improvements.

**ACCEPTANCE:** Incremental balances match sealed postings after concurrent credit/debit, compensating correction and bounded reconciliation.

**STATUS:** [ ] Open; package E; Medium priority.

### 40: BUG P1-040: Expired public statistics can create an advisory-lock request herd

**FILES:** `server/public-statistics.ts`, `server/public-reads.ts`, `packages/db/src/context.ts`

**FIX:** Serve an age-labelled stale safe projection while one bounded refresh owns a try-lock/job, retain environment separation and use CDN/process single-flight.

**ACCEPTANCE:** A concurrent cold statistics burst yields one refresh and bounded stale reads, with no environment mixing.

**STATUS:** [ ] Open; package C; Medium priority.

### 41: BUG P1-041: RPC cache misses are not coalesced and throttle waiting is outside the timeout

**FILES:** `packages/chains/src/rpc.ts`, `packages/chains/src/evm.ts`, `packages/chains/src/solana.ts`, `packages/chains/src/tron.ts`

**FIX:** Coalesce safe reads by immutable scope, include queue time in an overall cancellation budget and use bounded jitter/backoff/circuit state. Never substitute cached evidence for live financial confirmation.

**ACCEPTANCE:** Simultaneous safe RPC misses coalesce; queued requests honor one overall timeout including throttle wait.

**STATUS:** [ ] Open; package C; Medium priority.

### 42: BUG P1-042: Deployment-controlled RPC, alert and cache URLs lack an explicit SSRF destination policy

**FILES:** `packages/chains/src/rpc.ts`, `server/financial-alerts.ts`, `packages/cache/src/index.ts`, `packages/config/src/index.ts`

**FIX:** Validate approved hosts and resolved destinations with rebinding-aware network enforcement, fail closed on redirects, and retain narrowly scoped isolated loopback fixtures.

**ACCEPTANCE:** Unapproved private/link-local/DNS-rebound destinations reject; explicitly scoped isolated fixtures still work.

**STATUS:** [ ] Open; package D; Medium priority.

### 43: BUG P1-043: Remote cache adapters lack equivalent timeout, response and lifecycle bounds

**FILES:** `packages/cache/src/index.ts`, `packages/config/src/index.ts`

**FIX:** Add total I/O/size limits, strict endpoint/response validation and an explicit disposal contract; fail open only for public display caching and never use cache availability as financial authority.

**ACCEPTANCE:** A hung/oversized/redirecting cache endpoint fails within bounds; cache disposal closes owned resources.

**STATUS:** [ ] Open; package C; Medium priority.

### 44: BUG P1-044: Global activity remains visible when feature_activity is disabled

**FILES:** `components/public-information.tsx`, `packages/config/src/policies.ts`, `app/layout.tsx`

**FIX:** Honor both activity/statistics flags with a manifest revision/epoch fence, abort stale loads and share the public manifest fetch.

**ACCEPTANCE:** Disable activity/statistics while a prior fetch is delayed: stale content cannot reappear.

**STATUS:** [x] Implemented and locally verified in v30; package F; Medium priority.

### 45: BUG P1-045: There is no shared visible authenticated snapshot poll

**FILES:** `components/dashboard-app.tsx`, `components/native-portal.tsx`, `components/member-portal.tsx`, `components/public-information.tsx`, `packages/config/src/policies.ts`

**FIX:** Introduce one account/generation-scoped visible online poll with jitter, abort and backoff; share notification/status updates and stop work when irrelevant or hidden.

**ACCEPTANCE:** External financial updates become visible through one scoped poll; hidden/offline pages perform no repeated private poll.

**STATUS:** [ ] Open; package F; Medium priority.

### 46: BUG P1-046: Notification load-more permanently stops at 100 items

**FILES:** `components/notification-inbox.tsx`, `server/notifications.ts`

**FIX:** Use a sliding retained window or paginated replacement while preserving next_cursor, stable deduplication and account-generation fences.

**ACCEPTANCE:** Read beyond the 100th notification without losing continuation, unread state or identity isolation.

**STATUS:** [x] Implemented and locally verified in v30; package F; Medium priority.

### 47: BUG P1-047: Staff lists hide older users, jobs and recovery cases without search or cursors

**FILES:** `server/moderation.ts`, `server/financial-operations.ts`, `server/chain-recovery.ts`, `components/account-portal.tsx`, `components/admin-panel.tsx`, `components/chain-recovery-admin.tsx`

**FIX:** Add indexed exact email/username/UUID staff lookup and stable filter-bound keyset cursors for every capped staff list, with dedicated unresolved-work views.

**ACCEPTANCE:** Find a member/case/job beyond the initial cap using exact staff search and cursor paging with current authorization.

**STATUS:** [ ] Open; package F; Medium priority.

### 48: BUG P1-048: Latest-history caps can omit older active cycles and pending withdrawals

**FILES:** `server/api.ts`, `server/crypto-reads.ts`, `components/dashboard-app.tsx`, `components/native-portal.tsx`

**FIX:** Fetch actionable current states independently from paginated history and expose every active/held item through bounded continuation rather than treating the latest window as complete.

**ACCEPTANCE:** An old active cycle/long-held payout remains visible despite more than 30 newer completed records.

**STATUS:** [ ] Open; package F; Medium priority.

### 49: BUG P1-049: Public catalog and help lack the Phase One SEO rendering and metadata contract

**FILES:** `app/page.tsx`, `app/gifts/page.tsx`, `app/help/page.tsx`, `app/layout.tsx`, `components/help-browser.tsx`, `next.config.ts`

**FIX:** Render safe cached public catalog/help per locale, add accurate metadata and published legal/mechanics pages, and use validated permanent slug redirects without exposing private content.

**ACCEPTANCE:** Initial public HTML contains accurate localized content/canonicals; legal/mechanics pages and permanent redirects work.

**STATUS:** [ ] Open; package G; Medium priority.

### 50: BUG P1-050: Several private portals lack noindex metadata

**FILES:** `app/points/page.tsx`, `app/referrals/page.tsx`, `app/notifications/page.tsx`, `app/share/page.tsx`, `app/settings/account/page.tsx`, `app/settings/data/page.tsx`, `app/moderation/page.tsx`

**FIX:** Apply consistent noindex/noarchive private-layout metadata and keep those routes out of the public sitemap.

**ACCEPTANCE:** Every private/settings/moderation route emits noindex and is omitted from the public sitemap.

**STATUS:** [ ] Open; package G; Low priority.

### 51: BUG P1-051: Stored locale and product copy are not consistently applied across portals

**FILES:** `components/native-portal.tsx`, `components/member-portal.tsx`, `components/account-portal.tsx`, `components/notification-inbox.tsx`, `lib/i18n.ts`, `app/layout.tsx`

**FIX:** Use a shared preference/locale provider and complete typed EN/FR message mappings, including notification/status/error text and configured public product content.

**ACCEPTANCE:** Stored French/theme preferences persist across all portals; notifications/errors and configured product copy agree.

**STATUS:** [ ] Open; package F; Medium priority.

### 52: BUG P1-052: Dark-mode primary button text fails normal-text contrast

**FILES:** `app/globals.css`

**FIX:** Adjust foreground/background tokens and verify actual enabled, disabled, hover and focus states in both themes.

**ACCEPTANCE:** Both themes' normal primary text reaches at least 4.5:1, with visible focus and readable disabled states.

**STATUS:** [x] Implemented and locally verified in v30; package F; Medium priority.

### 53: BUG P1-053: Mobile navigation and the testnet home omit required product surfaces

**FILES:** `components/native-portal.tsx`, `components/dashboard-app.tsx`, `app/globals.css`, `app/page.tsx`, `app/manifest.ts`

**FIX:** Build shared responsive navigation and public plan/mechanics presentation for both environments, keep wallets lazy and honor feature flags without introducing Phase Two transparency changes.

**ACCEPTANCE:** At narrow width, feature-aware bottom navigation and anonymous testnet plans/mechanics remain operable with safe areas.

**STATUS:** [ ] Open; package F; Medium priority.

### 54: BUG P1-054: The native wallet summary omits held and withdrawn/net-income totals

**FILES:** `components/native-portal.tsx`, `server/crypto-reads.ts`, `docs/PRD.md`

**FIX:** Expose exact per-asset available, held, settled and net-income DTOs and localized labels derived from journals, keeping incoming/refundable value distinct.

**ACCEPTANCE:** Available, held, settled and net-income values exactly match per-asset journals and remain visibly distinct.

**STATUS:** [ ] Open; package F; Medium priority.

### 55: BUG P1-055: Closed historical exceptions can prevent plan editing forever

**FILES:** `server/plans.ts`, `server/incoming.ts`, `server/crypto-refunds.ts`

**FIX:** Check remaining economic rights and open refund/admission obligations instead of exception history alone; preserve historical status and block edits whenever genuine liabilities remain.

**ACCEPTANCE:** A fully refunded historical exception does not block editing; any remaining economic right still does.

**STATUS:** [x] Implemented and locally verified in v30; package A; Medium priority.

### 56: BUG P1-056: Native activation ignores the configured fixed-token pricing mode

**FILES:** `server/crypto-provisioning.ts`, `server/plans.ts`, `packages/config/src/index.ts`

**FIX:** Either implement per-asset fixed-token activation with exact validated base units and immutable snapshots or reject incompatible configuration before activation; preserve existing versions and frozen prices.

**ACCEPTANCE:** Configured native fixed-token base units determine activation or are explicitly rejected before any version is made.

**STATUS:** [x] Implemented and locally verified in v30; package A; Medium priority.

### 57: BUG P1-057: Accepted provider and finality selectors have no matching implementation

**FILES:** `packages/config/src/index.ts`, `packages/chains/src/registry.ts`, `packages/chains/src/evm.ts`, `server/crypto-prices.ts`

**FIX:** Validate supported provider/chain/finality combinations explicitly and expose required adapter capabilities; implement additional providers only if necessary for the approved Phase One contract.

**ACCEPTANCE:** Unsupported price-provider/finality combinations fail validation; accepted settings select the implemented behavior.

**STATUS:** [x] Implemented and locally verified in v30; package C; Medium priority.

### 58: BUG P1-058: Advertised single-request archive uploads exceed the Vercel function body limit

**FILES:** `server/portability.ts`, `components/native-admin.tsx`, `packages/config/src/policies.ts`, `docs/SETUP.md`

**FIX:** Cap and explain the hosted portal limit or implement an explicitly authorized durable chunked path; retain the owner CLI route for larger encrypted archives and never decrypt/restore through upload.

**ACCEPTANCE:** A hosted upload above the actual body cap gets preflight guidance/CLI routing; valid smaller artifacts stay unverified.

**STATUS:** [ ] Open; package H; Medium priority.

### 59: BUG P1-059: Filesystem archive staging is not durable or consistently reachable across serverless instances

**FILES:** `server/portability.ts`, `docs/SETUP.md`, `docs/HOW-IT-WORKS.md`

**FIX:** Define a private durable adapter or explicitly constrain web staging to an operator-managed persistent host, with authenticated inventory/retrieval and owner CLI verification. Keep restores inactive.

**ACCEPTANCE:** An artifact staged on one instance remains privately retrievable on another supported host/adapter or the UI declares CLI-only mode.

**STATUS:** [ ] Open; package H; Medium priority.

### 60: BUG P1-060: Archive stream creation precedes the final session fence and permits a file-lifecycle race

**FILES:** `server/portability.ts`, `server/api.ts`, `packages/db/src/context.ts`

**FIX:** Close opened resources on failed completion, construct the stream after authorization commits where appropriate and serve immutable verified artifacts with cancellation cleanup.

**ACCEPTANCE:** Final-session-fence failure and download cancellation close descriptors; immutable bytes match the verified checksum.

**STATUS:** [ ] Open; package H; Low priority.

### 61: BUG P1-061: Failed staging files consume quota without a complete failure inventory

**FILES:** `server/portability.ts`, `packages/config/src/policies.ts`, `docs/SETUP.md`

**FIX:** Record bounded failure metadata and quarantine inventory, expose staff diagnostics and an owner-reviewed retention/pruning procedure. Do not automatically erase failed evidence or attempt restore.

**ACCEPTANCE:** Failed upload metadata and retained partial files are visible in quarantine inventory and obey reviewed quotas.

**STATUS:** [ ] Open; package H; Medium priority.

### 62: BUG P1-062: Paged own-data exports are not a single point-in-time snapshot

**FILES:** `server/own-data.ts`, `server/jobs.ts`, `packages/db/src/schema.ts`

**FIX:** Define the temporal guarantee explicitly; materialize bounded snapshot values or use revisioned state at a cutoff, and record that cutoff/revision in every part without holding a long serverless transaction.

**ACCEPTANCE:** Concurrent export state changes obey the declared temporal guarantee and every part carries its cutoff/revision.

**STATUS:** [ ] Open; package H; Low priority.

### 63: BUG P1-063: Drizzle table coverage does not describe all deployed constraints and defaults

**FILES:** `packages/db/src/schema.ts`, `packages/db/src/migrations`, `packages/db/drizzle`, `scripts/check-drizzle-coverage.mjs`

**FIX:** Reconcile representable DDL in Drizzle, document necessary trigger/RLS/infrastructure SQL exceptions and review generated changes against the deployed schema without rewriting applied checksums.

**ACCEPTANCE:** Schema definitions cover representable constraints/indexes/defaults; deliberate SQL-only contracts have a documented inventory.

**STATUS:** [ ] Open; package E; Medium priority.

### 64: BUG P1-064: Large tightly coupled services and untyped UI contracts make changes fragile

**FILES:** `server/api.ts`, `server/core.ts`, `server/jobs.ts`, `components/dashboard-app.tsx`, `components/native-portal.tsx`, `lib/api-client.ts`, `scripts/lint.mjs`

**FIX:** Extract typed transport/service contracts and small operation modules incrementally, add explicit package import boundaries and format touched code. Preserve transaction ownership and money algorithms rather than undertaking a broad rewrite.

**ACCEPTANCE:** Typed DTOs replace critical any boundaries, services retain transaction ownership, and imports obey explicit layering.

**STATUS:** [ ] Open; package I; Low priority.

### 65: BUG P1-065: Help search lacks the specified locale full-text and trigram ranking

**FILES:** `components/help-browser.tsx`, `server/api.ts`, `packages/db/src/schema.ts`, `packages/db/src/migrations`, `docs/PRD.md`

**FIX:** Add bounded public published-only search with locale indexes/ranking and retain cheap offline search of explicitly labelled saved articles.

**ACCEPTANCE:** Published EN/FR help search ranks exact title then full-text/trigram results and never exposes drafts.

**STATUS:** [ ] Open; package G; Medium priority.

### 66: BUG P1-066: Published help cache does not remove withdrawn or renamed saved articles

**FILES:** `components/help-browser.tsx`, `lib/public-data-cache.ts`

**FIX:** Reconcile the saved public article inventory after a complete successful locale fetch, retain TTL/size limits and label offline content with version/observation time.

**ACCEPTANCE:** After a successful complete online help refresh, withdrawn/renamed saved slugs are not shown as current offline content.

**STATUS:** [ ] Open; package G; Low priority.

### 67: BUG P1-067: Solana custody reconciliation requires identical live response slots

**FILES:** `packages/chains/src/solana.ts`, `server/chain-recovery.ts`

**FIX:** Define a provable common accounting cutoff or advance/reconcile scan bounds to a jointly observed finalized point; accept only matching scope/evidence and keep pausing on actual contradiction.

**ACCEPTANCE:** Different healthy finalized SOL response slots cannot be mislabeled as one historical cutoff; true disagreement remains paused.

**STATUS:** [ ] Open; package B; Medium priority.

### 68: BUG P1-068: Production dependencies include unresolved security advisories

**FILES:** `package.json`, `package-lock.json`, `packages/chains/package.json`, `packages/db/package.json`

**FIX:** Review advisory reachability and update compatible patched dependency trees, especially Drizzle's fix at 0.45.2+, checking chain serialization/signatures and bundle bounds. Do not run a blind force-upgrade or remove safety checks.

**ACCEPTANCE:** Production dependency audit has no unresolved reachable high advisory; reviewed exceptions list reachability and compensating limits.

**STATUS:** [x] Implemented and locally verified in v30; package E; High priority.

### 69: BUG P1-069: Native quote expiry and cooldown use the web clock instead of database time

**FILES:** `server/crypto-incoming.ts`, `server/crypto-checkout.ts`, `docs/PRD.md`

**FIX:** Read one database timestamp in the quoting transaction for expiry and cooldown, and keep provider block times limited to their explicitly defined chain-evidence role.

**ACCEPTANCE:** Injected web/DB clock skew does not change database-authoritative native quote expiry or cooldown eligibility.

**STATUS:** [x] Implemented and locally verified in v30; package A; Medium priority.

### 70: BUG P1-070: A valid multi-asset plan catalog fails after 100 active versions

**FILES:** `server/crypto-reads.ts`, `server/plans.ts`, `components/native-portal.tsx`

**FIX:** Paginate or group the catalog by plan and asset with stable bounded queries, or validate an explicit consistent aggregate version limit before activation; do not accept configuration that later makes public reads fail.

**ACCEPTANCE:** A valid catalog with more than 100 active plan/asset versions remains publicly readable through bounded continuation, or activation rejects an explicit consistent limit before state changes.

**STATUS:** [x] Implemented and locally verified in v30; package F; Medium priority.

## Verification and release discipline

For each implementation batch: inspect the final diff, run the repository's required static/security/build/schema/grant/bundle checks appropriate to touched files, and complete the listed bounded manual negative/replay/concurrency checks on fresh isolated data. Follow the existing no-broad-test-suite directive and exclude test-only concerns/CRON frequency. Record actual results, retained failures and unrun hosted checks; don't repeat completed checks without a new change or unresolved concern.

Every new table gets explicit least-privilege grants/revokes and RLS in its creating forward migration, including a deliberate Supabase Data API classification. Do not copy blanket anon/authenticated/service_role grants into financial/signing tables. Applied migrations stay checksum-immutable. Drizzle remains the application table interface; PostgreSQL infrastructure/trigger/lock exceptions stay explicit.

Before each merge, BOTH **push CI and pull-request CI must succeed for the exact final head SHA**. A successful older head or only one event is insufficient. Never push directly to main. Update current status/handover after each coherent iteration, with linked evidence and finding dispositions.

Keep web/signer readiness gates false and mainnet prohibited. The earlier automatic-review rejection of enabling gates is a preserved decision, not a bug to bypass. Fixing disabled financial paths does not grant approval to broadcast. Owner registry/address/key/fingerprint/live-ACK inputs and actual hosted release acceptance remain separate.

No measured throughput/cost promise accompanies this plan. After code fixes, document the selected hosting limits and run only separately authorized hosted measurements when needed. A capacity claim needs evidence; tighter budgets and more efficient queries alone do not establish thousands of concurrent users or guaranteed free operation.

## Three bug-finding/fixing rounds and Phase Two exit

- **Round 1 (current):** three complementary analysis passes complete; 70 open findings documented; plan awaits owner review. After approval, implement the packages and verify/disposition every ID. Update both reports with resolved/reopened evidence.
- **Round 2:** after Round 1 fixes, re-audit the full Phase One repository and changed cross-service contracts. Record a fresh dated report/plan, identify new/reopened defects and fix them within the approved scope. Do not count the current three analysis passes as three fixing rounds.
- **Round 3:** repeat the full audit after Round 2 remediation if new bugs continue. Complete all newly found/reopened work and final cross-contract verification. If a round finds no new bugs and all previous in-scope work is resolved, the owner permits an early end to the three-round sequence.

**Phase Two entry:** no unresolved Phase One defects/requirement gaps; recommendations have an implemented or evidence-backed explicitly accepted disposition; no new bugs in the closing review, or the prescribed rounds completed with remaining issues actually resolved. “No new bugs” never excuses a previously open bug. Record any genuine blocker instead of assuming it resolved.

Then execute the entire Phase Two milestone sequence without waiting for milestone acceptance, as directed. The one initial bug-plan review hold is explicit; routine milestone acceptance is not. Phase Two implementation authorization does not authorize mainnet, live sends, release-gate bypass, secret disclosure or erasure of retained history.

## Fixing-LLM handover

Read [LLM-HANDOVER_v30.md](LLM-HANDOVER_v30.md), then the mandatory project docs and [custom-bugs-report_v30.md](custom-bugs-report_v30.md). The owner has authorized this plan. Continue without further approval pauses; prioritize remaining P1-068 plus packages A/B and the High identity issues P1-021/P1-022; preserve the complete 70-ID tracker and all release boundaries. Do not reinterpret historical v28 “100%” as current audit completion.


## Current v30 remediation ledger

The owner approved all Round One fixes, autonomous Rounds Two/Three and continued remediation, every Phase Two milestone, and final bug fixes before deferred testing. Continue without plan or milestone acceptance pauses. Use best recommendations, complete substantial verified batches, and merge only after BOTH push and pull-request CI succeed for the exact final head. Both financial readiness gates remain false; mainnet remains prohibited. CRON frequency and test-only issues remain excluded.

26 of 70 Round One items implemented and locally verified; 44 remain open. This is item accounting, not a weighted Phase One completion percentage. Phase Two has not started. P1-019 and P1-036 have partial improvements but remain open. No bug-free or hosted acceptance claim is made.

Implemented: P1-001, P1-002, P1-003, P1-004, P1-010, P1-011, P1-014, P1-016, P1-017, P1-018, P1-020, P1-021, P1-022, P1-023, P1-024, P1-025, P1-037, P1-044, P1-046, P1-052, P1-055, P1-056, P1-057, P1-068, P1-069, P1-070.

Open: P1-005, P1-006, P1-007, P1-008, P1-009, P1-012, P1-013, P1-015, P1-019, P1-026, P1-027, P1-028, P1-029, P1-030, P1-031, P1-032, P1-033, P1-034, P1-035, P1-036, P1-038, P1-039, P1-040, P1-041, P1-042, P1-043, P1-045, P1-047, P1-048, P1-049, P1-050, P1-051, P1-053, P1-054, P1-058, P1-059, P1-060, P1-061, P1-062, P1-063, P1-064, P1-065, P1-066, P1-067.

Local verification: required check:all; production build and bundle budget checks; production npm audit now zero advisories. Named isolated manual-contracts, manual-money and manual-quotes-r5 passed. The last validates quote cancellation/expiry/payload replay/DB clock, late-fund refunds, frozen pre-pause admission, custom bootstrap destination, positively refunded plan edit, and independent lower live per-transaction/daily signer caps without reservations or signed bytes. Initial quote-probe failures (invalid price TTL, missing scoped fixture binding, missing operational gas asset) remain retained and were corrected only in fresh r2/r3/r5 databases. No external RPC or broadcast occurred.

Bug reports and fix plans must use the same _vN filename version as current status/handover; earlier versions are retained in Git history.

---

Prepared by Codex — Round One remediation v30.
Signed: **14 October 2026 at 12:39:39 AM WAT**
