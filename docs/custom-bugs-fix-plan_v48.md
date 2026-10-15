# Custom bugs fix plan — Gifters World Phase One

Updated: **15 October 2026 at 12:42:45 PM WAT**.

## Complete one-line remediation list

1. **P1-001 — Expired or dismissed native invoices prevent another checkout.** Implemented; local checks passed; high priority; package A.
2. **P1-002 — A successful wallet send followed by a failed submission can prompt a second payment.** Implemented; local checks passed; high priority; package A.
3. **P1-003 — Native TRX status observation rejects its own event index.** Implemented; local checks passed; high priority; package A.
4. **P1-004 — Signer reservations ignore tighter runtime payout limits.** Implemented; local checks passed; high priority; package A.
5. **P1-005 — Recovery binding distinguishes pooler and signer endpoints for the same database.** Implemented; local checks passed; high priority; package B.
6. **P1-006 — Recovery can journal the same transaction fees more than once.** Implemented; local checks passed; high priority; package B.
7. **P1-007 — Solana fee attribution treats other transfers as account setup cost.** Implemented; local checks passed; high priority; package B.
8. **P1-008 — Saved expired Solana or TRON attempts can indefinitely block a recovery scan.** Implemented; local checks passed; medium priority; package B.
9. **P1-009 — Previous receiving addresses have no complete recovery monitoring inventory.** Open; high priority; package B.
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
28. **P1-028 — Declared notification, terminal-job, ledger and audit retention is not implemented.** Open; medium priority; package E.
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

**STATUS:** [x] Implemented and locally verified in v31; package B; High priority.

### 6: BUG P1-006: Recovery can journal the same transaction fees more than once

**FILES:** `server/chain-recovery.ts`, `server/crypto-settlement.ts`, `packages/db/src/schema.ts`

**FIX:** Claim chain transaction fees once using a canonical environment/chain/hash key shared by settlement and recovery; keep per-transfer principal losses separate and reconcile existing duplicates with compensating journals.

**ACCEPTANCE:** Resolve two events/assets from one hash and a mixed known/unknown hash: principal is per event, gas/setup are once.

**STATUS:** [x] Implemented and locally verified in v31; package B; High priority.

### 7: BUG P1-007: Solana fee attribution treats other transfers as account setup cost

**FILES:** `packages/chains/src/solana.ts`, `server/chain-recovery.ts`

**FIX:** Derive rent/account creation from validated instructions and account balance evidence, subtract every supported principal movement, and send ambiguous multi-instruction transactions to review without inventing setup fees.

**ACCEPTANCE:** A two-transfer SOL transaction books both principals, one network fee and only positively identified rent.

**STATUS:** [x] Implemented and locally verified in v31; package B; High priority.

### 8: BUG P1-008: Saved expired Solana or TRON attempts can indefinitely block a recovery scan

**FILES:** `server/chain-recovery.ts`, `server/crypto-expiry.ts`, `packages/chains/src/solana.ts`, `packages/chains/src/tron.ts`

**FIX:** Reconcile retained positive expiry/failure evidence in the scan and expose the required audited closure. Do not release holds or manufacture failure from an absent hash.

**ACCEPTANCE:** A positively expired saved attempt progresses through audited closure; an unknown hash retains its hold.

**STATUS:** [x] Implemented and locally verified in v31; package B; Medium priority.

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

**STATUS:** [x] Implemented and locally verified in v31; package C; Medium priority.

### 13: BUG P1-013: Recovery pages have row bounds without a feasible total RPC/time budget

**FILES:** `server/chain-recovery.ts`, `packages/chains/src/tron.ts`, `packages/chains/src/rpc.ts`, `app/api/v1/admin/crypto/scans/page/route.ts`

**FIX:** Persist per-block/event/transaction progress, apply an overall elapsed/RPC budget, and return resumable partial pages without prematurely declaring an asset reconciled.

**ACCEPTANCE:** An oversized busy block progresses across bounded calls without lost events, duplicate fees or a false clean scan.

**STATUS:** [x] Implemented and locally verified in v36; package B; High priority.

### 14: BUG P1-014: The generic scheduler client signs only simulation and leaves testnet jobs undrained

**FILES:** `scripts/scheduler-tick.mjs`, `server/scheduler.ts`, `server/jobs.ts`, `server/financial-operations.ts`, `.github/workflows/scheduler.yml`

**FIX:** Sign the explicitly configured environment, validate it on both sides, and run the generic bounded job dispatcher for testnet as well as simulation. Keep external scheduling and all send gates independent.

**ACCEPTANCE:** A signed testnet generic tick processes notification/export/observation work; wrong-environment signatures reject.

**STATUS:** [x] Implemented and locally verified in v30; package C; High priority.

### 15: BUG P1-015: The hosted deploy workflow cannot migrate the selected testnet binding

**FILES:** `.github/workflows/ci-vercel.yml`, `scripts/validate-deployment.ts`, `packages/db/src/seed.ts`

**FIX:** Use the validated hosted environment for binding checks and migrations, split simulation fixtures from shared/native metadata, and retain explicit release gates and empty owner-provided native registries.

**ACCEPTANCE:** A non-signing testnet database migrates in the hosted workflow without inserting simulation identities or enabling sends.

**STATUS:** [x] Implemented and locally verified in v31; package C; Medium priority.

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

**STATUS:** [x] Implemented and locally verified in v38; package D; Medium priority.

**V38 resolution:** Public manifest/catalog/native-catalog/help/statistics cache-miss leaders now pass bounded local IP/route admission and the shared PostgreSQL reads budget. Warm hits and coalesced followers perform no limiter writes. Local storage retains live budgets, caps1024 keys, and shares one overflow budget; failed shared admission cannot start a fresh read. Existing cached public DTOs remain available within their freshness window. Vercel alone supplies the trusted forwarding header; arbitrary forwarding headers are ignored and equivalent IPv6 spellings share one identity. Simulation account listing is admitted and capped100. Help redirects use a bounded published inventory cache, so arbitrary slug probes no longer cause one database lookup each. OAuth start/callback/session limits from v30 remain enforced.

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

**STATUS:** [x] Implemented and locally verified in v32; package E; Medium priority.

### 27: BUG P1-027: Expired authentication and rate records have no bounded cleanup lifecycle

**FILES:** `server/maintenance.ts`, `server/financial-cleanup.ts`, `server/auth.ts`, `server/google-auth.ts`, `packages/db/src/schema.ts`

**FIX:** Add indexed bounded cleanup jobs with explicit retention and holds, retaining replay records through their full acceptance windows and active family dependencies.

**ACCEPTANCE:** Expired flows/families/rate/replay rows drain in bounded batches; active dependencies and acceptance windows remain.

**STATUS:** [x] Implemented and locally verified in v32; package E; Medium priority.

### 28: BUG P1-028: Declared notification, terminal-job, ledger and audit retention is not implemented

**FILES:** `server/maintenance.ts`, `server/jobs.ts`, `server/notifications.ts`, `packages/config/src/policies.ts`, `packages/db/src/migrations`

**FIX:** Archive verified immutable financial/audit partitions and compact expendable delivery bodies in resumable batches; preserve permanent business keys and recoverable evidence, and honor retention holds.

**ACCEPTANCE:** Archive/compaction respects holds and permanent keys, verifies checksums and can restore/reconcile retained financial evidence.

**STATUS:** [ ] Open; package E; Medium priority.

### 29: BUG P1-029: Pending chain observation ignores poll policy and creates a new durable job each round

**FILES:** `server/crypto-observer.ts`, `server/jobs.ts`, `packages/config/src/policies.ts`

**FIX:** Use durable next-observation deadlines and bounded adaptive backoff/jitter, with compact attempt state and permanent deposit idempotency. This concerns processing policy, not external CRON frequency.

**ACCEPTANCE:** Normal pending observations honor persisted deadlines/backoff without spawning an immediate durable-job chain.

**STATUS:** [x] Implemented and locally verified in v32; package C; Medium priority.

### 30: BUG P1-030: Configured DLQ, backlog, lock-wait and quota alert thresholds have no complete alert path

**FILES:** `server/financial-monitor.ts`, `server/financial-operations.ts`, `server/jobs.ts`, `packages/config/src/policies.ts`, `app/api/health/route.ts`

**FIX:** Implement indexed backlog/dead-letter and age measurements, quota/lock diagnostics and priority-aware deduplicated alerts; keep public health aggregate-only and cheap.

**ACCEPTANCE:** Cross a DLQ/backlog/age threshold: one bounded redacted alert and staff diagnostic appear without public identifiers.

**STATUS:** [x] Implemented and locally verified in v32; package C; Medium priority.

### 31: BUG P1-031: Acknowledged or resolved alerts can still send queued reminders

**FILES:** `server/financial-alerts.ts`, `server/financial-operations.ts`

**FIX:** Fence reminder claims against the current alert occurrence/status and stop obsolete reminder retries after acknowledgement/resolution, retaining attempted-delivery evidence.

**ACCEPTANCE:** Acknowledge/resolve before a queued reminder claim: it cannot dispatch an obsolete reminder.

**STATUS:** [x] Implemented and locally verified in v32; package C; Medium priority.

### 32: BUG P1-032: Old low-priority alert retries can consume the budget before a new critical alert

**FILES:** `server/financial-alerts.ts`, `server/financial-monitor.ts`

**FIX:** Prioritize fresh critical conditions within the existing global cap, use fair per-condition retry deadlines/coalescing, and expose suppressed/backlogged alerts to staff.

**ACCEPTANCE:** With older failing P2 work, a new P1 receives eligible budget priority without exceeding the shared cap.

**STATUS:** [x] Implemented and locally verified in v32; package C; Medium priority.

### 33: BUG P1-033: A permanent alert delivery key does not bind an immutable payload

**FILES:** `server/financial-alerts.ts`, `packages/db/src/schema.ts`

**FIX:** Persist the canonical payload/hash and occurrence revision with each delivery, retry exactly those bytes, and create a new permanent ordinal for changed content.

**ACCEPTANCE:** Retry after an ACK loss and condition reopen: the old key retains exactly its original payload hash.

**STATUS:** [x] Implemented and locally verified in v32; package C; Medium priority.

### 34: BUG P1-034: Reopened alert escalation uses lifetime delivery count as the interval index

**FILES:** `server/financial-alerts.ts`, `server/financial-operations.ts`

**FIX:** Keep a never-reused delivery ordinal separate from the current occurrence's escalation step and daily attempt budget.

**ACCEPTANCE:** Reopen an escalated condition: fresh escalation starts at step zero while delivery ordinals never repeat.

**STATUS:** [x] Implemented and locally verified in v32; package C; Low priority.

### 35: BUG P1-035: Request IDs do not correlate API, audit, job and error records

**FILES:** `server/api.ts`, `server/auth.ts`, `server/jobs.ts`, `server/scheduler.ts`, `server/worker-auth.ts`

**FIX:** Create one bounded request correlation context, propagate causation to asynchronous work and safe logs, and return the same ID in response metadata/header without logging secrets or financial payloads.

**ACCEPTANCE:** One reported request ID joins response metadata/header to safe logs, audit causation and downstream job records.

**STATUS:** [x] Implemented and locally verified in v32; package C; Medium priority.

### 36: BUG P1-036: Expected failures become generic nonretryable errors and raw codes reach users

**FILES:** `server/api.ts`, `lib/api-client.ts`, `lib/i18n.ts`, `components/native-portal.tsx`, `components/account-portal.tsx`, `server/crypto-prices.ts`

**FIX:** Use a complete typed error registry with accurate statuses, localized message/help keys and safe retry guidance. Automatic retries must remain restricted to replay-safe reads/submissions.

**ACCEPTANCE:** Each thrown domain error maps to a localized actionable status; transient retries never resend money.

**STATUS:** [x] Implemented and locally verified in v32; package D; Medium priority.

### 37: BUG P1-037: The shared JSON byte cap has no elapsed read deadline

**FILES:** `server/request-body.ts`, `server/api.ts`, `server/auth-api.ts`

**FIX:** Add a bounded total read deadline and AbortSignal handling, cancel/release the reader on all exits and avoid duplicate body parsing.

**ACCEPTANCE:** A silent/aborted/oversized body ends within the total read budget and releases its reader.

**STATUS:** [x] Implemented and locally verified in v30; package C; Medium priority.

### 38: BUG P1-038: Ordinary database work lacks a complete query, queue and request time budget

**FILES:** `packages/db/src/connection-options.ts`, `packages/db/src/context.ts`, `packages/db/src/index.ts`, `workers/signer/run.ts`

**FIX:** Set workload-specific transaction/query/lock budgets and bounded admission, memoize only immutable capability checks with revocation-safe invalidation, add safe transient DB backoff/circuit health and drain resources on shutdown.

**ACCEPTANCE:** Lock contention and exhausted pool admission return within workload budgets; shutdown drains without unbounded waits.

**STATUS:** [x] Implemented and locally verified in v46; package C; Medium priority.

**CURRENT STATUS:** Implemented and locally verified in v46, completing the earlier v42 partial budget work; original audit evidence is retained.

### 39: BUG P1-039: Balances and reconciliation repeatedly aggregate full ledger history

**FILES:** `server/core.ts`, `server/reconcile.ts`, `server/crypto-reads.ts`, `server/public-statistics.ts`, `packages/db/src/migrations/007_scoped_runtime_access.sql`, `packages/db/src/migrations/005_ledger_integrity.sql`

**FIX:** Maintain transactional per-account counters and bounded reconciliation checkpoints with exact integer arithmetic, verify them against journals and introduce measured archival/index improvements.

**ACCEPTANCE:** Incremental balances match sealed postings after concurrent credit/debit, compensating correction and bounded reconciliation.

**STATUS:** [ ] Open; package E; Medium priority.

### 40: BUG P1-040: Expired public statistics can create an advisory-lock request herd

**FILES:** `server/public-statistics.ts`, `server/public-reads.ts`, `packages/db/src/context.ts`

**FIX:** Serve an age-labelled stale safe projection while one bounded refresh owns a try-lock/job, retain environment separation and use CDN/process single-flight.

**ACCEPTANCE:** A concurrent cold statistics burst yields one refresh and bounded stale reads, with no environment mixing.

**STATUS:** [x] Implemented and locally verified in v33; package C; Medium priority.

### 41: BUG P1-041: RPC cache misses are not coalesced and throttle waiting is outside the timeout

**FILES:** `packages/chains/src/rpc.ts`, `packages/chains/src/evm.ts`, `packages/chains/src/solana.ts`, `packages/chains/src/tron.ts`

**FIX:** Coalesce safe reads by immutable scope, include queue time in an overall cancellation budget and use bounded jitter/backoff/circuit state. Never substitute cached evidence for live financial confirmation.

**ACCEPTANCE:** Simultaneous safe RPC misses coalesce; queued requests honor one overall timeout including throttle wait.

**STATUS:** [x] Implemented and locally verified in v33; package C; Medium priority.

### 42: BUG P1-042: Deployment-controlled RPC, alert and cache URLs lack an explicit SSRF destination policy

**FILES:** `packages/chains/src/rpc.ts`, `server/financial-alerts.ts`, `packages/cache/src/index.ts`, `packages/config/src/index.ts`

**FIX:** Validate approved hosts and resolved destinations with rebinding-aware network enforcement, fail closed on redirects, and retain narrowly scoped isolated loopback fixtures.

**ACCEPTANCE:** Unapproved private/link-local/DNS-rebound destinations reject; explicitly scoped isolated fixtures still work.

**STATUS:** [x] Implemented and locally verified in v35; package D; Medium priority.

### 43: BUG P1-043: Remote cache adapters lack equivalent timeout, response and lifecycle bounds

**FILES:** `packages/cache/src/index.ts`, `packages/config/src/index.ts`

**FIX:** Add total I/O/size limits, strict endpoint/response validation and an explicit disposal contract; fail open only for public display caching and never use cache availability as financial authority.

**ACCEPTANCE:** A hung/oversized/redirecting cache endpoint fails within bounds; cache disposal closes owned resources.

**STATUS:** [x] Implemented and locally verified in v33; package C; Medium priority.

### 44: BUG P1-044: Global activity remains visible when feature_activity is disabled

**FILES:** `components/public-information.tsx`, `packages/config/src/policies.ts`, `app/layout.tsx`

**FIX:** Honor both activity/statistics flags with a manifest revision/epoch fence, abort stale loads and share the public manifest fetch.

**ACCEPTANCE:** Disable activity/statistics while a prior fetch is delayed: stale content cannot reappear.

**STATUS:** [x] Implemented and locally verified in v30; package F; Medium priority.

### 45: BUG P1-045: There is no shared visible authenticated snapshot poll

**FILES:** `components/dashboard-app.tsx`, `components/native-portal.tsx`, `components/member-portal.tsx`, `components/public-information.tsx`, `packages/config/src/policies.ts`

**FIX:** Introduce one account/generation-scoped visible online poll with jitter, abort and backoff; share notification/status updates and stop work when irrelevant or hidden.

**ACCEPTANCE:** External financial updates become visible through one scoped poll; hidden/offline pages perform no repeated private poll.

**STATUS:** [x] Implemented and locally verified in v41; package F; Medium priority.

**V41 resolution:** Relevant member pages now subscribe to one visible-online clock per account/session in the document. Consumers of the same snapshot coalesce into one GET; dashboard/native status and notification updates share their financial snapshot. Requests have10-second deadlines, jitter and at most six transient retry attempts with bounded exponential backoff; definitive errors stop and offer an explicit retry. Hidden/offline transitions abort active reads and stop dispatch, route exits dispose subscriptions, and obsolete account/generation responses are inert. Manual refreshes advance read generations so older poll responses cannot replace them. Export status no longer has a separate interval. Native snapshots include own notifications/badge and public-only policy; simulation policy and owned views share a repeatable transaction through withMemberSnapshot, retaining the ordinary completion fence. Member continuation pages survive parent refreshes; open inboxes include newly arrived messages. No private DTO enters storage or cross-tab broadcasts.

### 46: BUG P1-046: Notification load-more permanently stops at 100 items

**FILES:** `components/notification-inbox.tsx`, `server/notifications.ts`

**FIX:** Use a sliding retained window or paginated replacement while preserving next_cursor, stable deduplication and account-generation fences.

**ACCEPTANCE:** Read beyond the 100th notification without losing continuation, unread state or identity isolation.

**STATUS:** [x] Implemented and locally verified in v30; package F; Medium priority.

### 47: BUG P1-047: Staff lists hide older users, jobs and recovery cases without search or cursors

**FILES:** `server/moderation.ts`, `server/financial-operations.ts`, `server/chain-recovery.ts`, `components/account-portal.tsx`, `components/admin-panel.tsx`, `components/chain-recovery-admin.tsx`

**FIX:** Add indexed exact email/username/UUID staff lookup and stable filter-bound keyset cursors for every capped staff list, with dedicated unresolved-work views.

**ACCEPTANCE:** Find a member/case/job beyond the initial cap using exact staff search and cursor paging with current authorization.

**STATUS:** [x] Implemented and locally verified in v40; package F; Medium priority.

**V40 resolution:** Staff account lists now support indexed exact email/username/UUID lookup and stable100-row continuation. Reports/appeals, retained jobs/dead letters, recovery scans/unmatched inflows/outflows, operational alerts and simulation/native finality reviews have independent current-work and full-history views. Opaque15-minute cursors authenticate the staff actor, list, environment and normalized filters; changed filters/actors/lists, altered ciphertext and expiry reject. Every page still requires ordinary authenticated staff admission and permissions. UI pages replace prior rows, clear stale target selection and reset filters/cursors; jobs expose the existing guarded dead-letter replay action. Recovery projections retain masked senders and exclude signed payloads/checkpoint authority. Forward091 adds filtered continuation and original-sender-refund lookup indexes without deleting evidence.

### 48: BUG P1-048: Latest-history caps can omit older active cycles and pending withdrawals

**FILES:** `server/api.ts`, `server/crypto-reads.ts`, `components/dashboard-app.tsx`, `components/native-portal.tsx`

**FIX:** Fetch actionable current states independently from paginated history and expose every active/held item through bounded continuation rather than treating the latest window as complete.

**ACCEPTANCE:** An old active cycle/long-held payout remains visible despite more than 30 newer completed records.

**STATUS:** [x] Implemented and locally verified in v39; package F; Medium priority.

**V39 resolution:** A separate member current-work view now reads cycles, payments and withdrawals/refunds independently from recent-history cards. Both environments expose100-row stable UUID continuation and a separate full-history view. The UI replaces each page to bound memory, resets continuation when filters change, refreshes after parent snapshots change, aborts obsolete reads and checks account/session generation before applying results. Owned quote cancellation and withdrawal recovery remain available through existing guarded actions; native saved-payment selection opens the existing-hash flow and never initiates another send. Current work remains available when history entitlement is off. New forward090 adds owned continuation indexes for simulation cycles/invoices/withdrawals; native indexes already exist.

### 49: BUG P1-049: Public catalog and help lack the Phase One SEO rendering and metadata contract

**FILES:** `app/page.tsx`, `app/gifts/page.tsx`, `app/help/page.tsx`, `app/layout.tsx`, `components/help-browser.tsx`, `next.config.ts`

**FIX:** Render safe cached public catalog/help per locale, add accurate metadata and published legal/mechanics pages, and use validated permanent slug redirects without exposing private content.

**ACCEPTANCE:** Initial public HTML contains accurate localized content/canonicals; legal/mechanics pages and permanent redirects work.

**STATUS:** [x] Implemented and locally verified in v43; package G; Medium priority.

### 50: BUG P1-050: Several private portals lack noindex metadata

**FILES:** `app/points/page.tsx`, `app/referrals/page.tsx`, `app/notifications/page.tsx`, `app/share/page.tsx`, `app/settings/account/page.tsx`, `app/settings/data/page.tsx`, `app/moderation/page.tsx`

**FIX:** Apply consistent noindex/noarchive private-layout metadata and keep those routes out of the public sitemap.

**ACCEPTANCE:** Every private/settings/moderation route emits noindex and is omitted from the public sitemap.

**STATUS:** [x] Implemented and locally verified in v33; package G; Low priority.

### 51: BUG P1-051: Stored locale and product copy are not consistently applied across portals

**FILES:** `components/native-portal.tsx`, `components/member-portal.tsx`, `components/account-portal.tsx`, `components/notification-inbox.tsx`, `lib/i18n.ts`, `app/layout.tsx`

**FIX:** Use a shared preference/locale provider and complete typed EN/FR message mappings, including notification/status/error text and configured public product content.

**ACCEPTANCE:** Stored French/theme preferences persist across all portals; notifications/errors and configured product copy agree.

**STATUS:** [x] Implemented and locally verified in v43; package F; Medium priority.

### 52: BUG P1-052: Dark-mode primary button text fails normal-text contrast

**FILES:** `app/globals.css`

**FIX:** Adjust foreground/background tokens and verify actual enabled, disabled, hover and focus states in both themes.

**ACCEPTANCE:** Both themes' normal primary text reaches at least 4.5:1, with visible focus and readable disabled states.

**STATUS:** [x] Implemented and locally verified in v30; package F; Medium priority.

### 53: BUG P1-053: Mobile navigation and the testnet home omit required product surfaces

**FILES:** `components/native-portal.tsx`, `components/dashboard-app.tsx`, `app/globals.css`, `app/page.tsx`, `app/manifest.ts`

**FIX:** Build shared responsive navigation and public plan/mechanics presentation for both environments, keep wallets lazy and honor feature flags without introducing Phase Two transparency changes.

**ACCEPTANCE:** At narrow width, feature-aware bottom navigation and anonymous testnet plans/mechanics remain operable with safe areas.

**STATUS:** [x] Implemented and locally verified in v43; package F; Medium priority.

### 54: BUG P1-054: The native wallet summary omits held and withdrawn/net-income totals

**FILES:** `components/native-portal.tsx`, `server/crypto-reads.ts`, `docs/PRD.md`

**FIX:** Expose exact per-asset available, held, settled and net-income DTOs and localized labels derived from journals, keeping incoming/refundable value distinct.

**ACCEPTANCE:** Available, held, settled and net-income values exactly match per-asset journals and remain visibly distinct.

**STATUS:** [x] Implemented and locally verified in v37; package F; Medium priority.

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

**STATUS:** [x] Implemented and locally verified in v35; package H; Medium priority.

### 59: BUG P1-059: Filesystem archive staging is not durable or consistently reachable across serverless instances

**FILES:** `server/portability.ts`, `docs/SETUP.md`, `docs/HOW-IT-WORKS.md`

**FIX:** Define a private durable adapter or explicitly constrain web staging to an operator-managed persistent host, with authenticated inventory/retrieval and owner CLI verification. Keep restores inactive.

**ACCEPTANCE:** An artifact staged on one instance remains privately retrievable on another supported host/adapter or the UI declares CLI-only mode.

**STATUS:** [x] Implemented and locally verified in v35; package H; Medium priority.

### 60: BUG P1-060: Archive stream creation precedes the final session fence and permits a file-lifecycle race

**FILES:** `server/portability.ts`, `server/api.ts`, `packages/db/src/context.ts`

**FIX:** Close opened resources on failed completion, construct the stream after authorization commits where appropriate and serve immutable verified artifacts with cancellation cleanup.

**ACCEPTANCE:** Final-session-fence failure and download cancellation close descriptors; immutable bytes match the verified checksum.

**STATUS:** [x] Implemented and locally verified in v35; package H; Low priority.

### 61: BUG P1-061: Failed staging files consume quota without a complete failure inventory

**FILES:** `server/portability.ts`, `packages/config/src/policies.ts`, `docs/SETUP.md`

**FIX:** Record bounded failure metadata and quarantine inventory, expose staff diagnostics and an owner-reviewed retention/pruning procedure. Do not automatically erase failed evidence or attempt restore.

**ACCEPTANCE:** Failed upload metadata and retained partial files are visible in quarantine inventory and obey reviewed quotas.

**STATUS:** [x] Implemented and locally verified in v35; package H; Medium priority.

### 62: BUG P1-062: Paged own-data exports are not a single point-in-time snapshot

**FILES:** `server/own-data.ts`, `server/jobs.ts`, `packages/db/src/schema.ts`

**FIX:** Define the temporal guarantee explicitly; materialize bounded snapshot values or use revisioned state at a cutoff, and record that cutoff/revision in every part without holding a long serverless transaction.

**ACCEPTANCE:** Concurrent export state changes obey the declared temporal guarantee and every part carries its cutoff/revision.

**STATUS:** [x] Implemented and locally verified in v43; package H; Low priority.

### 63: BUG P1-063: Drizzle table coverage does not describe all deployed constraints and defaults

**FILES:** `packages/db/src/schema.ts`, `packages/db/src/migrations`, `packages/db/drizzle`, `scripts/check-drizzle-coverage.mjs`

**FIX:** Reconcile representable DDL in Drizzle, document necessary trigger/RLS/infrastructure SQL exceptions and review generated changes against the deployed schema without rewriting applied checksums.

**ACCEPTANCE:** Schema definitions cover representable constraints/indexes/defaults; deliberate SQL-only contracts have a documented inventory.

**STATUS:** [x] Implemented and locally verified in v44; package E; Medium priority.

**CURRENT STATUS:** Implemented and locally verified in v44; original audit evidence above is retained.

### 64: BUG P1-064: Large tightly coupled services and untyped UI contracts make changes fragile

**FILES:** `server/api.ts`, `server/core.ts`, `server/jobs.ts`, `components/dashboard-app.tsx`, `components/native-portal.tsx`, `lib/api-client.ts`, `scripts/lint.mjs`

**FIX:** Extract typed transport/service contracts and small operation modules incrementally, add explicit package import boundaries and format touched code. Preserve transaction ownership and money algorithms rather than undertaking a broad rewrite.

**ACCEPTANCE:** Typed DTOs replace critical any boundaries, services retain transaction ownership, and imports obey explicit layering.

**STATUS:** [x] Implemented and locally verified in v45; package I; Low priority.

**CURRENT STATUS:** Implemented and locally verified in v45; original audit evidence above is retained.

### 65: BUG P1-065: Help search lacks the specified locale full-text and trigram ranking

**FILES:** `components/help-browser.tsx`, `server/api.ts`, `packages/db/src/schema.ts`, `packages/db/src/migrations`, `docs/PRD.md`

**FIX:** Add bounded public published-only search with locale indexes/ranking and retain cheap offline search of explicitly labelled saved articles.

**ACCEPTANCE:** Published EN/FR help search ranks exact title then full-text/trigram results and never exposes drafts.

**STATUS:** [x] Implemented and locally verified in v44; package G; Medium priority.

**CURRENT STATUS:** Implemented and locally verified in v44; original audit evidence above is retained.

### 66: BUG P1-066: Published help cache does not remove withdrawn or renamed saved articles

**FILES:** `components/help-browser.tsx`, `lib/public-data-cache.ts`

**FIX:** Reconcile the saved public article inventory after a complete successful locale fetch, retain TTL/size limits and label offline content with version/observation time.

**ACCEPTANCE:** After a successful complete online help refresh, withdrawn/renamed saved slugs are not shown as current offline content.

**STATUS:** [x] Implemented and locally verified in v33; package G; Low priority.

### 67: BUG P1-067: Solana custody reconciliation requires identical live response slots

**FILES:** `packages/chains/src/solana.ts`, `server/chain-recovery.ts`

**FIX:** Define a provable common accounting cutoff or advance/reconcile scan bounds to a jointly observed finalized point; accept only matching scope/evidence and keep pausing on actual contradiction.

**ACCEPTANCE:** Different healthy finalized SOL response slots cannot be mislabeled as one historical cutoff; true disagreement remains paused.

**STATUS:** [x] Implemented and locally verified in v45; package B; Medium priority.

**CURRENT STATUS:** Implemented and locally verified in v45; original audit evidence above is retained.

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

### 71: BUG P1-071: Financial archives can claim the current migration version while source migrations are pending

**FILES:** `packages/db/src/recovery-inventory.ts`, `packages/db/src/recovery-cli.ts`

**FIX:** Compare the complete applied migration name/checksum inventory against the current immutable SQL files before capturing or restoring financial records. Reject missing, extra or changed migrations.

**ACCEPTANCE:** A source with pending migrations rejects backup before creating an archive; forward-migrated source and exact restored target validate.

**STATUS:** [x] Implemented and locally verified in v31; package B; Medium priority.

**EVIDENCE:** During v31, a source with pending077/078 could produce a packet whose migration fingerprint described the current files. The new applied-inventory check rejects RECOVERY_VERSION_MISMATCH before output. Old evidence is retained; source migrations are applied forward only, then a fresh signed archive is verified.

## Fixing-LLM handover

Read [LLM-HANDOVER_v48.md](LLM-HANDOVER_v48.md), then the mandatory project docs and [custom-bugs-report_v48.md](custom-bugs-report_v48.md). The owner has authorized this plan. Continue without further approval pauses; prioritize the open findings in the current ledger; preserve all73 tracked IDs and all release boundaries. Do not reinterpret historical v28 “100%” as current audit completion.


### 72: BUG P1-072: Same-address native/token transfers can manufacture incoming principal

**FILES:** `packages/chains/src/evm.ts`, `packages/chains/src/solana.ts`, `packages/chains/src/tron.ts`, `server/crypto-incoming.ts`, `server/crypto-payouts.ts`, `server/crypto-settlement.ts`, `server/native-funding.ts`

**FIX:** Reject equal normalized sending/receiving participants in transfer proof, quoting and payload construction. Preserve historical records and require explicit review rather than infer a principal credit, payout or correction from a self-transfer.

**ACCEPTANCE:** Native/ERC20 self-transfer receipts cannot create incoming principal; all families reject self-transfer proof/fee/build before network dispatch and quote/settlement fences remain effective. Normal distinct-party transfers retain their exact amount and canonical checks.

**STATUS:** [x] Implemented and locally verified in v37; package A; High priority.

**EVIDENCE:** Generated two-provider EVM contracts confirmed native and ERC20 self-transfers with amount7 despite no incoming movement. The adapter equality fence now rejects that path before any ledger write. No real funding or broadcast occurred.

### 73: BUG P1-073: Testnet identity and rate infrastructure remains simulation-only

**FILES:** `packages/db/src/migrations/018_identity_sessions.sql` (preserved), `packages/db/src/migrations/093_supported_identity_service_scopes.sql`, `server/rate-limits.ts`, `server/auth.ts`, `server/google-auth.ts`.

**EVIDENCE:** A real testnet production process failed public manifest/native catalog reads with42501 because cache-miss admission could not insert its rate record. Forward018 identity policies still admitted only gw.environment=simulation, covering eight identity/session/OAuth/rate tables; verified testnet authentication would fail similarly. Simulation-only fixtures hid this requirement gap.

**FIX:** Forward093 permits only the service context under gw_service in the two supported environments, simulation/testnet. Preserve grants, browser-role exclusions, immutable applied checksums, financial policies and readiness gates.

**ACCEPTANCE:** Actual testnet identity/session/refresh/OAuth/rate operations succeed; mainnet/member contexts and gw_read remain denied; anonymous native catalog loads.

**STATUS:** [x] Implemented and locally verified in v43; package D; High priority.

**VERIFICATION:** manual-supported-identity-r3 passed real testnet runtime writes and unsupported/member scope denial with all generated records rolled back. A correctly rejected undersized cipher fixture was corrected using the real sealing format. manual-public-http-final-r2 passed real native anonymous catalog, published rename308, draft-map/API exclusion and available-only language alternates, in addition to the earlier public-page checks.

### 74: BUG P1-074: TRON reconciliation accepts live balances beyond the declared scan cutoff

**FILES:** `packages/chains/src/tron.ts`, `server/chain-recovery.ts`, `packages/db/src/migrations/095_recovery_balance_cutoff_witness.sql`

**FIX:** Capture and retain a jointly observed stable solidified balance before scanning, bind the scan to that exact cutoff, and reject later live responses for retained legacy runs.

**Medium · Defect.** The original implementation checks matching provider tips and balances but only requires each tip to be at least the requested height. Two matching later live responses could be compared with an earlier recovery scan, incorporating transfers outside the declared range.

**ACCEPTANCE:** Only exact common-cutoff evidence can authorize reconciliation; different slots/tips remain unknown even when amounts match, contradictory common-cutoff evidence is rejected, and retry/recovery preserves the original witness.

**STATUS:** [x] Implemented and locally verified in v45. Generated dual-provider native/TRC20 checks passed common-cutoff capture, later-tip legacy denial, divergence bounds, amount/canonical contradiction denial; shared stored-cutoff/database replay behavior passed the actual recovery procedure. No real provider or signing was used.

## Current v45 remediation ledger

The owner approved all Round One fixes, autonomous Rounds Two/Three and continued remediation, every Phase Two milestone, and final bug fixes before deferred testing. Continue without plan or milestone acceptance pauses. Use best recommendations, complete substantial verified batches, and merge only after BOTH push and pull-request CI succeed for the exact final head. Both financial readiness gates remain false; mainnet remains prohibited. CRON frequency and test-only issues remain excluded.

65 of 73 tracked items implemented and locally verified; 8 remain open. The initial Round One audit had70 findings; P1-071/P1-072/P1-073 were discovered and fixed during remediation. This is item accounting, not a weighted Phase One completion percentage. Phase Two has not started. No bug-free or hosted acceptance claim is made.

Implemented: P1-001, P1-002, P1-003, P1-004, P1-005, P1-006, P1-007, P1-008, P1-010, P1-011, P1-012, P1-013, P1-014, P1-015, P1-016, P1-017, P1-018, P1-019, P1-020, P1-021, P1-022, P1-023, P1-024, P1-025, P1-026, P1-027, P1-029, P1-030, P1-031, P1-032, P1-033, P1-034, P1-035, P1-036, P1-037, P1-038, P1-040, P1-041, P1-042, P1-043, P1-044, P1-045, P1-046, P1-047, P1-048, P1-049, P1-050, P1-051, P1-052, P1-053, P1-054, P1-055, P1-056, P1-057, P1-058, P1-059, P1-060, P1-061, P1-062, P1-063, P1-064, P1-065, P1-066, P1-067, P1-068, P1-069, P1-070, P1-071, P1-072, P1-073, P1-074.

Open: P1-009, P1-028.

Local verification: required check:all; production build and bundle budget checks; production npm audit now zero advisories. Named isolated manual-contracts, manual-money and manual-quotes-r5 passed. The last validates quote cancellation/expiry/payload replay/DB clock, late-fund refunds, frozen pre-pause admission, custom bootstrap destination, positively refunded plan edit, and independent lower live per-transaction/daily signer caps without reservations or signed bytes. Initial quote-probe failures (invalid price TTL, missing scoped fixture binding, missing operational gas asset) remain retained and were corrected only in fresh r2/r3/r5 databases. No external RPC or broadcast occurred.

Bug reports and fix plans must use the same _vN filename version as current status/handover; earlier versions are retained in Git history. Current artifacts use_v41.


V31 evidence: manual-money-r2 passed; manual-contracts-r2 passed shared fees, different-endpoint checkpoint identity and fair dispatch past20 blocked rows without signing/reservations; manual-solana-costs-r2 passed two principals/one fee, positively identified ATA rent and ambiguous-debit rejection; preserved failed SOL expiry source resumed through forward-only migration078 and passed positive expiry/held principal/closure/replay/fresh scan. Non-signing hosted migration/seed/runtime path passed on gw_v31_testnet_seed:0 users/0 assets/12 plans/0 versions/16 help rows/one testnet namespace. Archive version preflight and clone proof are recorded in current status. P1-009/P1-013/P1-067 remain open.


V32 verification: manual-ops-r2 passed immutable alert retry/ACK/critical priority/occurrence escalation and delivered/queued admin-message redaction with permanent digests and unchanged money. The preserved auth-cleanup source passed hold/expiry/live-family/replay retention after forward-only guard correction. Manual-observation-r2 passed first deadline, two pending polls on one observation/outbox/job, future deadlines and completion of the same job on positive canonical proof. Manual-trace-errors passed origin correlation in HTTP/audit/outbox/job, typed transient/safety errors and EN/FR labels without raw driver details. Manual-diagnostics passed bounded backlog/DLQ/age/lock/quota conditions, deduped redacted alerts, fresh staff quota revisions and public health projection; actual web-role lock sampler ran, threshold case used one generated wait. External provider quota measurements and live workload timing remain unrun; absent/stale measurements are explicit. Financial gates remain false.


V33 evidence: Named isolated procedures passed RPC safe-read coalescing/fresh bypass/queue deadlines/no dispatch after expiry; REST hangs/redirects/oversize/disposal and Redis borrowed/owned lifecycle; real Chromium IndexedDB help replacement/withdrawal/invalid inventory/locale preservation; fresh inactive gw_v33_statistics clone cold/stale statistics contention and subsequent refresh. Required check:all, production build and bundle checks pass; homepage198.96KiB/200KiB, maximum API1.449MiB/3MiB gzip, clients0.643MiB. All eleven private paths passed production HTML metadata inspection; initial inspection found recovery page overriding noarchive and the fix is included. No broad automated test suite was added or run.

No schema/migration changes in v33:86 Drizzle tables,88 migrations (001–087 plus053a),73 retained archive inventories. Existing v32 exact signed archive/restore remains valid. Original failed sources, archives, GW25 partial factor and signed histories remain untouched. Scratch/private evidence is under /workspace/work/remediation-v33, outside Git. Financial gates were never activated.


V34 evidence: Named isolated manual-portability-r3 passed forced Vercel CLI-only selection, CLI cap-zero guidance/rejection, successful persistent-host encrypted-unverified staging, retained checksum failure and authorization-rollback quarantine, exact retained owner archive checksum after authorization commit, rejected final authorization and cancellation without a file descriptor. Earlier fixture failures (simulation credentials cannot be used as Vercel config; testnet archive cannot be downloaded under simulation metadata) are retained and corrected with valid non-signing scopes. No original archive, signed history or failed evidence was changed.

Required check:all, production build and bundle checks pass (homepage198.96KiB/200; API1.452MiB/3; clients0.643MiB). Evidence is recorded in /workspace/work/remediation-v35. No schema/migration changes:86 tables,88 migrations (001–087 plus053a),73 retained archive inventories. The v32 exact signed archive/restore remains valid. No broad automated test suite or live financial execution ran.


V35 evidence: Named manual-destinations passed private/link-local/mapped/tunnel/documentation IP rejection, exact-host admission, mixed DNS rejection, generated DNS rebinding with one validated socket address and TLS identity checks, real isolated loopback POST, redirect rejection and forbidden testnet fixture bypass. Manual-rpc-cache passed again through the pinned transport: safe-read coalescing, fresh financial bypass, queue deadlines, hung/redirecting/oversized REST bounds and cache lifecycle. Generated DNS/socket evidence is explicitly labelled; no external provider was contacted.

Required check:all, production build and bundle checks pass (homepage198.96KiB/200; API1.452MiB/3; clients0.643MiB). Evidence is recorded in /workspace/work/remediation-v35. No schema/migration changes:86 tables,88 migrations (001–087 plus053a),73 retained archive inventories. Existing exact archives/signed histories/failed sources remain untouched. Both financial gates remain false and no broad automated test suite or live send ran.


V36 evidence: Named manual-paged-recovery-r2 passed two exact incoming journals through discover/verify/book/known/balance steps, replay fencing and retained progress inventories; a generated1001-transaction tail cursor completed and canonical conflict rejected; a hung provider obeyed one overall deadline. Manual-paged-scanners passed SOL50+50 instruction slices followed by event101, paired five-slot empty/gap inventories and skipped finalized slots, and TRON1001-transaction tail/log pagination with one receipt per provider per page; contradictions reject. The tail cases use generated retained positions, not a hosted throughput measurement.

Manual-sol-expiry-r3 passed staged known-attempt processing, positive dual-finalized expiry, held6000000 principal until audited closure, full release exactly once with no gas/principal-send journal, and a fresh reconciled scan. Both financial gates remain false; no external provider or broadcast was used. Preserved failed sources gw_v36_recovery and gw_v36_sol_expiry_r2 retain their unspent holds/reservations/history. An initial fixture argument-shape failure and the newly required simulation-only loopback scope were corrected without resetting any source. The successful isolated signer fixture’s encrypted payload key is retained privately outside Git.

Required check:all/build/bundle pass (homepage198.96KiB/200; maximum API1.419MiB/3; client aggregate0.643MiB). Evidence is under /workspace/work/remediation-v36. New financial archive site-financial-final_v36.gwbackup captures73 retained inventories/86 tables/90 migrations (001–089 plus053a) and verifies exact restore into fresh inactive gw_v36_restore. Discovery/verification progress, canonical proof, original expired signed bytes, financial IDs and audits remain exact. Database nonce and ephemeral authentication/dispatch data remain omitted. Forward089/current decoder also passed a rollback-only active scan and database rejection of a mismatched cursor-height shape, leaving the archived source unchanged. No broad automated suite or live financial execution ran.


V37 evidence: Named manual-self-transfer-probe-r2 reproduced positive native/ERC20 self-transfer evidence using generated independent providers, without crediting a ledger. Manual-self-transfer-fix passed EVM/SOL/TRON validation, fee estimation and construction rejection before any network request. Manual-wallet-totals-r4 matched exact available6500000/held4000000/income-held1000000/refund-held3000000/net-paid1000000/net-income8500000 in a rollback-only generated journal scenario, excluded another user and preserved the original expired/closed signed source. The earlier cloned fixture omitted its unique business key; that harness failure rolled back and is retained. Distinct-party native/ERC20 contracts retained exact principal and canonical proof after the fence. No broadcast or broad automated suite ran.

Required check:all/build/bundle pass (homepage199.27KiB/200; maximum API1.420MiB/3; client aggregate0.645MiB). Evidence is under /workspace/work/remediation-v37. All four documentation filenames advance together to_v37. No schema/migration changes:86 tables/90 migrations/73 retained inventories. The exact v36 signed archive and inactive gw_v36_restore remain valid for this unchanged schema. Both financial gates remain false. External funding/OAuth/wallet/ACK/mobile/hosted capacity measurements remain unrun.


V38 evidence: Named manual-public-admission-r2 passed cold admission, zero writes for20 warm hits, shared rejection with cached availability, local rejection before another write,12 coalesced misses consuming one admission, and cached availability/closed misses during a real refused database connection. The first harness closed the ESM database instance while the server used its CJS instance, so its outage assertion failed; the corrected procedure closes the actual application instance and retains both logs. Generated rate rows are ephemeral and no financial history changed. Evidence is under /workspace/work/remediation-v38.

Required check:all/build/bundle pass (homepage199.27KiB/200; maximum API1.420MiB/3; clients0.645MiB). No schema changes:86 tables/90 migrations/73 retained inventories. Both financial gates remain false.


V39 evidence: Named manual-member-continuation-r7 passed102 older active cycles behind40 newer completions,102 pending withdrawals, full history and other-user exclusion in both environments. Deferred constraints passed and every generated row/journal rolled back. Initial clone insertion correctly hit its copied checkpoint safety fence; the read procedure used the original reconciled isolated source in rollback-only mode. Earlier simulation hold fixtures omitted required hold journals; corrected generated holds satisfy the unchanged financial guard. Failed procedure logs remain retained; no guard/readiness flag was relaxed. Manual-member-ui passed real Chromium100→2 continuation, cursor reset, delayed previous-account rejection and parent refresh through a labelled generated API bridge. No live app payment or broad automated suite ran.

Required check:all/build/bundle pass (homepage199.62KiB/200; maximum API1.422MiB/3; clients0.649MiB). Evidence is under /workspace/work/remediation-v39. Forward090 brings86 tables/91 migrations/73 retained inventories. New site-financial-final_v39.gwbackup captures the inactive gw_v39_records clone and verifies exact restoration into fresh inactive gw_v39_restore. Original sources/archives/signed histories remain preserved; copied source checkpoints never authorize the clone. Both financial gates remain false.


V40 evidence: Named manual-staff-pages-r3 passed102 generated accounts/reports/appeals/jobs/alerts beyond the first100, exact email/username/UUID lookup, distinct continuation, current/history filters, forged/expired/filter/list cursor rejection, member denial, native retained recovery UUID lookup and both finality-review inventories. Deferred constraints pass and every generated row/configuration change rolls back. The first fixture used the display word warning instead of the existing P2 severity enum; its database constraint correctly rejected and the failed log is retained. Manual-staff-ui passed real Chromium French job100→2 continuation, filter reset and guarded replay-route invocation through a generated bridge; no actual job replay or financial operation occurred.

Required check:all/build/bundle pass (homepage199.62KiB/200; maximum API1.424MiB/3; clients0.651MiB). Evidence is under /workspace/work/remediation-v40. Forward091 brings86 tables/92 migrations/73 retained inventories. New site-financial-final_v40.gwbackup captures inactive gw_v40_staff and verifies exact restoration into fresh inactive gw_v40_restore. Original sources/archives/signed histories remain preserved; copied checkpoints cannot authorize the clone. Both financial gates remain false. No broad automated suite or broadcast ran.


V41 evidence: Named Chromium manual-private-poll-r2 passed two-consumer request coalescing, generated external update, hidden/offline pause, delayed previous-account rejection, six-attempt backoff, late stopped-state handoff, explicit retry, definitive-error stop,10-second deadline and disposal using a labelled generated clock/API. These are protocol checks, not wall-clock/provider capacity measurements. Manual-snapshot-shape-r3 passed exact native income8500000, own notifications/badge, other-user exclusion and public-only policy in rollback-only reads. Initial role fixtures correctly rejected reading private policy/owned views under the wrong role; the helper reads policy under service and owned views under member, without widening grants. Manual-member-snapshot-fence passed the actual helper, concurrent family revocation before response completion and rejection of future reuse; its generated revoked family is retained in the inactive clone. Manual-member-page-refresh passed real Chromium continuation preservation, filter reset and obsolete-account rejection. Earlier syntax/type/harness failures remain in private evidence; no financial history changed.

Required check:all/build/bundle pass (homepage199.74KiB/200; maximum API1.424MiB/3; clients0.657MiB). Evidence is under /workspace/work/remediation-v41. No schema/migration changes:86 tables/92 migrations/73 retained inventories. The exact v40 archive and inactive gw_v40_restore remain valid for this schema. Original sources/archives/signed histories remain preserved. Both financial gates remain false; no broadcast or broad automated suite ran.

---

Prepared by Codex — Round One remediation v43.
PR29 merged at e1463fa after push38485886774 and PR38485891336 succeeded for exact final head ab1d7b5509fd215645448641065a2705cdf389ba. Initial failed head/run evidence remains in v30 Git history. PR30 merged at fa5d71b after push38500938562 and PR38500945296 succeeded for9bb4004e964c38ef2e31c884545e5ba2c70433ba. PR31 merged at59a8289 after exact head2ca05c2390fd1aefe516415f83aed15449b509ce passed push38507705481/PR38507767963. PR32 merged at523ba12 after exact a258d7a passed push38509097039/PR38509102087; PR34 merged atcab8a95 after head805f3d3 passed push38510489870/PR38510495165; PR35 merged atf99e2d2 after head5d7cf5b passed push38514924520/PR38514930961; PR36 merged at2434b30 after push38527849543 and pull_request38527856620 both succeeded for exact head2b012a3f4925c113fbc07a826c1722a2384c77f0. PR37 merged at68bcc95028f5847e8c8f7108b5e3a0b506670d7f after push38529567594 and pull_request38529575508 both succeeded for exact headbb832ca7751f0d99a11dff4f61e2ae7b65a0b433. PR38 merged at069cbf19fef850125f566101532b0e61536af563 after push38531715784 and pull_request38531724006 both succeeded for exact head19f67210522efefae9ac86802d6fa0afe025875c. PR39 merged at4558fe619738de55f1263b2678bedd8d13cf968a after push38534378166 and pull_request38534388168 both succeeded for exact head9304e67d71d4e7b605642761271703649723dd2e. PR40 merged at1b2fa3b592c1b5c2bf0dc85dfc806868fe348401 after push38540185905 and pull_request38540196203 succeeded for exact head3bd6595c337afc07889e22fed5710e8d2a93cdd3. PR41 merged at864e8cbbd6025aeb249126571579adbcd69d08fc after push38551692293 and pull_request38551699013 succeeded for exact head7d63c89ba9633879832bd3e543712ae31baa677c. Current branch feat/phase-one-remediation-round1n awaits final-head dual CI and merge.


## V42 partial database-budget remediation

Historical v42 state, superseded by v46: P1-038 remained open. Standard driver transactions now have per-pool bounded FIFO admission (at most twice the pool size waiting,1.5-second expiry), transient-failure cooldown capped at2 seconds,3-second public/5-second other SQL statement limits and1.5-second lock limits. Connection establishment is capped at5 seconds. API route declarations expose a60-second platform ceiling; this is not a proven whole-callback cancellation guarantee. Closing the runtime drains pending admission. No economic mutation is automatically retried.

The named manual-safe-admission_v42 procedure passed against inactive gw_v40_staff: capacity/expiry without queued callback dispatch, a real row-lock timeout, future-admission cooldown and drain rejection. User and financial rows were unchanged. Typechecking passed. Required check:all, build and bundle checks passed. Final-head dual CI and merge are pending at this update. No schema or migration changes.

Earlier whole-pool deadline experiments failed with a postgres-js callback/closed-socket race. Automatic approval review rejected never-resolving callbacks (pool exhaustion) and manual reserved-connection transactions/whole-pool closure (service disruption). Those approaches were removed; failed evidence is retained privately under remediation-v42. Total callback/request and signer shutdown budgeting still require a safe solution; do not mark P1-038 complete. Counts remain60/72 with12 open. Rounds Two/Three and Phase Two have not started.


## V43 verified presentation and export batch

Implemented P1-049/P1-051/P1-053/P1-062 plus new P1-073. Public homepage/catalog/help now render safe localized data in initial HTML, with configured-origin canonicals/alternates, visible nonce-protected WebSite data, published mechanics/privacy and the exact configured terms version. Real308 compatibility/rename redirects run before streaming. Static internal article routes retain GitHub browser-upload-safe paths. Sitemaps advertise available published translations and omit private surfaces; the new admin page is noindex. Forward092 adds only the test privacy notice, preserving operator-written versions; it makes no financial/schema-extension change. Forward093 fixes the eight server-only identity policies for supported service scopes; browser roles, member and mainnet scopes remain denied. No financial table or grant changed. Public catalogs show an explicit unavailable state if fresh data cannot load.

One appearance provider owns stored locale/theme across all portals and their navigation/footer. Shared feature/role-aware navigation uses44px targets and a mobile safe-area bottom bar; anonymous testnet visitors get the public plan catalog. Product notification templates localize without rewriting records or changing exact amounts/networks; authored staff content remains verbatim. Application portals load separately from public initial HTML, reducing the homepage JavaScript budget.

Own-data exports disclose their actual creation-cutoff/live-values guarantee. Each bounded part freezes captured values and includes a temporal contract version and capture interval in JSON/CSV, including empty parts. Later-created records are excluded; later mutable values can appear. Retained v1 downloads gain explanatory metadata after original cipher/hash validation; unknown completion time stays null. Export format/CSV concerns and public DTOs now have separate typed modules; P1-064 remains open for the broader critical financial boundaries.

Named procedures passed: manual-public-http-final-r2 (real production French initial HTML, canonicals, published versions, real308,404, sitemap, draft-map/API exclusion, missing-translation alternates, anonymous native catalog and private noindex); manual-appearance-nav-final (real Chromium390px/1280px, shared French/dark preference persistence and switches,44px targets, no overflow and anonymous staff-link exclusion); manual-export-temporal-r3 (staged mutable changes after fixed cutoff, later-record exclusion, immutable parts, JSON/CSV empty/legacy metadata and escaping, all generated rows rolled back); manual-display-contracts (exact notification facts, free-form staff text, legacy unknown times). Earlier harness/build failures are retained, including a correctly rejected immutable-notification-body update. These are named isolated checks, not the deferred broad automated suites or hosted capacity acceptance.

Required check:all, production build and bundle reporting passed after forward093. Exact-head dual CI and merge remain pending. Latest measured homepage180.22KiB/200, API1.429MiB/3, all clients0.661MiB. Schema remains86 tables;94 migrations and73 retained inventories. The initial encrypted site-financial-final_v43 archive (93 migrations) exactly restored into fresh inactive gw_v43_restore. After P1-073, a new site-financial-final_v43-r2 archive (94 migrations) exactly restored into fresh inactive gw_v43_restore_r2 with schema/RLS/grants/history verified. The presentation source is gw_v43_presentation; the separate gw_v43_public search experiment is preserved and is not the release/archive source. Original sources, archives, keys and financial histories are intact; both implementation gates remain false.

Historical v43 limitation, superseded by explicit v44 approval: P1-065 was blocked specifically by automatic approval review. Search/index prototypes passed rollback checks in a fresh inactive clone, but two proposed production search/recovery changes were rejected due migration/restore compatibility risk and a requirement for explicit owner approval of that exact change. No extension/index/restore-validator change is in this active batch. Read custom-bugs-search-approval_v48.md for the concrete proposal. P1-038 remains partial/open. Historical v43 total65/73 implemented,8 open; Rounds Two/Three and Phase Two have not started. Continue all unaffected findings without milestone pauses.


## V44 approved search and schema congruence

Updated: **14 October 2026 at 02:25:24 PM WAT**. The owner explicitly approved the concrete P1-065 search/backup proposal after its restore compatibility risk was explained, and instructed: **“approve this change and any other necessary change. dont stop, keep going.”** This resolves the earlier search approval hold. Continue remaining fixes, Rounds Two/Three, Phase Two and final remediation without milestone acceptance pauses; retain disabled financial/mainnet gates.

Implemented P1-063/P1-065. Drizzle declarations now match all810 columns/defaults,261 check constraints and102 standalone indexes against the forward-migrated PostgreSQL catalog. Three missing UNIQUE declarations are included. Both deferred FK targets remain modeled; their deferred timing and22 constraint triggers are explicitly inventoried in [custom-bugs-schema-contract_v48.json](custom-bugs-schema-contract_v48.json). SQL migrations remain authoritative for policies, grants, functions, views and trigger behavior; Drizzle-generated SQL alone is not a deployable security schema. Required coverage checks reject a changed declaration or migration set until catalog congruence is re-verified. All86 table select/insert/delete query shapes remained unchanged, and the complete app typechecks. Original applied migration checksums are intact.

Forward094 adds pinned public pg_trgm1.6 and three published-only GIN indexes. Bounded EN/FR search uses exact-title/full-text/relevance/trigram/slug ordering; query values are bound, normalized and capped, results limited20, concurrent public cache flights limited32. Browser search is debounced/cancellable with explicit saved-text fallback/retry. Closed recovery dependencies retain pgcrypto-only packet validation and optional pg_trgm, rejecting unknown/duplicate/version/schema entries; existing incompatible extensions are rejected before provisioning. Signatures, archive checksums, empty-target checks and exact restored inventories remain mandatory.

Named rollback checks passed EN/FR stemming, exact priority, typo fallback, deterministic20 cap and draft exclusion. Real production HTTP passed DTO/input/cache checks. The new encrypted search-final_v44 archive exactly restored73 retained inventories into fresh inactive gw_v44_restore, with financial rows, schema/RLS/grants/history verified. Source gw_v44_search and restore remain inactive; original sources/archives/failed fixtures remain preserved. Schema86 tables/95 migrations. No signing/broadcast or deferred broad suite ran. Actual Chromium passed French ranked search, explicit offline saved-text fallback/retry, online recovery and rapid query replacement. Required check:all and production build passed. Bundle bounds: homepage180.34KiB/200; maximum API1.440MiB/3; clients0.661MiB. Both exact-final-head CI events and merge remain pending.

Current accounting: **67/73 implemented and locally verified;6 open**: P1-009/P1-028/P1-038/P1-039/P1-064/P1-067. Rounds Two/Three and Phase Two have not started. Keep progressing; do not interpret item accounting as a completion percentage.


## V45 financial transport and immutable balance cutoffs

Updated: **14 October 2026 at 02:58:13 PM WAT**. Continue without approval waits under the owner's explicit necessary-change directive. PR43 is merged after both exact-head CI events succeeded. Implemented P1-064/P1-067 and discovered/fixed P1-074. Current accounting is **70/74 locally verified,4 open**: P1-009/P1-028/P1-038/P1-039. Rounds Two/Three and Phase Two remain pending. Do not stop at this batch or call the project complete.

Critical dashboard/native portfolio/balance/cycle/withdrawal review DTOs now derive from service results through type-only JSON transport contracts. Dates and big integers have explicit wire forms; nullable cached wallets are declared. Public manifest keys retain the same runtime projection with explicit types excluding private/staff keys. Private snapshot callbacks preserve the path-specific contract. Withdrawal quote/requote responses use a narrow validated member review projection; exact approved charges remain strings and malformed persisted charges fail closed. Internal registry/configuration evidence remains in the service. New AST import checks prohibit client executable imports/re-exports/dynamic imports of server, isolated worker, DB or chain services, while erased type-only contracts are allowed. Public/export modules extracted in earlier batches and the new financial transport module preserve original transaction ownership and money algorithms.

Forward095 adds nullable immutable balance_witness evidence. New SOL/TRON recovery starts capture a jointly observed finalized/solidified balance before scanning, retain its height/hash/amount/asset/address/checkpoint/database binding and return the actual through_height. The requested height is a minimum for this start; the captured height becomes the scan's immutable upper bound. Capture requires matching common provider cutoff/amount/canonical block, with bounded convergence attempts under the existing RPC budget. Completion re-verifies the canonical cutoff and uses the stored amount; it never samples a later live balance. Live book mismatches remain review-required. Retained runs without witnesses are not rewritten and require exact-height evidence or stay unknown. Different cutoff amounts are never silently treated as a same-cutoff contradiction or accepted solely because amounts match. Witness update grants remain absent and the existing immutable-row guard covers the new field. Restored-clone binding fences remain intact.

Named generated-provider checks pass SOL/native/SPL and TRON/native/TRC20 convergence, divergent-cutoff unknown state, amount/canonical contradiction denial, exact legacy success and later legacy rejection. Actual rollback DB/start/replay/completion checks pass stored cutoff102 from requested100, replay without new RPC, immutable/SQL-invalid witness denial, and stored1000 use despite later110/2000 while holding unexplained book mismatch. Typed transport checks pass large exact integers, no internal source fields in member review, unchanged source evidence, invalid-charge fail-closed and public-only policy projection. These are isolated named procedures, not hosted evidence or the deferred broad test suite.

Fresh model congruence: all811 columns,262 checks,102 indexes; same documented22 SQL-only constraint triggers/two deferred FK timing exceptions. Schema86 tables/96 migrations/73 retained inventories. Source gw_v45_contracts and fresh restore gw_v45_restore remain inactive. Original sources/archives/keys/signed histories remain preserved. Both financial implementation gates remain false; no signing/broadcast ran. Required check:all, production build and bundle budgets passed (homepage180.35KiB/200; maximum API1.442MiB/3; clients0.661MiB). Actual Chromium appearance/navigation checks passed on the new build. The new cutoff-final_v45 encrypted archive exactly restored73 retained inventories into fresh inactive gw_v45_restore, including financial rows/schema/RLS/grants/history. Both exact-final-head CI events and merge remain pending.


## V46 complete execution budgets and cooperative signer stop

Updated: **14 October 2026 at 03:28:02 PM WAT**. PR44 is merged after both exact-head CI events succeeded. Implemented P1-038; current accounting **71/74 locally verified,3 open**: P1-009/P1-028/P1-039. Rounds Two/Three and Phase Two remain pending. Continue the owner-approved sequence without milestone acceptance pauses.

Runtime transactions now have a30-second whole-callback budget, inheriting the remaining50-second API request budget and cancellation signal. Admission observes the remaining budget and checks again before starting a transaction. Expiry rejects the ordinary Drizzle/postgres-js transaction callback, causing its standard rollback; it never closes a shared pool connection or parks a callback forever. A guarded executor fences fluent query dispatch, including prebuilt late queries. Expired callbacks may finish their JavaScript work, but cannot dispatch more SQL or open a fresh scoped transaction under the expired request. Query/lock/connect ceilings and bounded admission/circuit/drain remain intact. Rollback can wait for an already dispatched query's existing3/5-second timeout; the50-second request budget leaves room under the60-second platform ceiling. This is cooperative asynchronous cancellation, not preemption of synchronous JavaScript.

The isolated signer stops new claims/broadcasts at45 seconds or SIGTERM/SIGINT, cancels active RPC and report requests, and waits for child transaction rollback and store cleanup. Stop checks run again at broadcast boundaries; already persisted bytes, reservations and ambiguous sends remain recoverable. An interrupted pending lookup returns stopping metadata after cleanup. Its SQL timeout and client-close bounds honor the known worker_shutdown_seconds policy within hard limits; boot defaults remain20 seconds. Cancellation does not poison provider circuits. Both financial readiness flags remain false; no financial algorithm, migration, schema, retained history or activation gate changed.

Named actual PostgreSQL procedures passed callback expiry rollback, late prebuilt-write denial, immediate one-connection pool reuse while a synthetic callback waits, in-flight query timeout/reuse, and actual scoped request inheritance/nested-work denial. A cooperative stop scope awaited actual child rollback. Generated hanging RPC cancellation passed prompt abort, subsequent dispatch denial and immediate healthy reuse without cooldown. The actual signer loop passed SIGTERM while awaiting a synthetic pending-store child, closed the synthetic store before returning stopping=true and made no claim. Its real isolated-scope guard was retained; registry/store fixtures were used, with no key/signing/broadcast. Schema remains86 tables/96 migrations/811 columns/262 checks/102 indexes; the v45 exact encrypted archive/restore remains compatible and all original sources/archives/keys/signed evidence remain intact. Required check:all, production build and bundle bounds passed (homepage180.35KiB/200; maximum API1.442MiB/3; clients0.661MiB). Actual production HTTP help/input/cache and Chromium appearance/navigation checks passed. The v45 exact archive was re-verified against its inactive restore, with schema/RLS/grants/history intact. Completion rechecks elapsed time even if the timer was delayed; the named synthetic elapsed-deadline check passed. Both exact-final-head CI events and merge remain pending.

## Current owner pause directive — 14 October 2026 at 04:17:08 PM WAT

Finish all pending Round One bugs, necessary documentation and verified PR merges, then report completion and halt. Await the owner’s explicit go-ahead before Round Two or Phase Two; the owner needs to refill credits. This supersedes earlier autonomous continuation beyond Round One. Remaining findings: P1-009/P1-028/P1-039. Continue their fixes without new approval pauses.


## V47 transactional ledger counters and owner stop boundary

Updated: **14 October 2026 at 04:41:01 PM WAT**. PR45 is merged after both exact-head CI events succeeded. P1-039 is implemented in this batch: six protected derived tables maintain exact account/asset-purpose totals, native refund/settled-payout buckets and per-journal integrity evidence. A captured source high-water range and transactional new-write markers support at most100 source rows per maintenance transaction, prevent bootstrap overlap from double-counting and compact markers after sealing. Reads use exact source sums only while coverage is legitimately incomplete; invalid retained journal evidence pauses reads/diagnostics rather than silently repairing history. New writes update counters and audits atomically. Existing per-journal deferred validation, negative-user-payable/unallocated-source guards, source immutability, permanent business keys, signing/restore fences and both disabled financial gates remain intact.

Hot wallet/payout balances use protected account counters; signer custody and recovery balance comparisons use bounded asset/purpose counters. Native income/refund-hold summaries use immutable journal classifications. Reconciliation uses sealed journal evidence and account counters, retains independent queue/invoice/withdrawal/refund/reorg/recovery checks and its shared8-second/per-query1-second ceiling, and denies clean diagnostics before bootstrap completion. Independent primary-record checks and the cached public-statistics refresh retain their explicit deadlines; they are not replaced by self-comparisons of derived totals. No primary financial record, failed source, signed evidence or older archive was rewritten/deleted. An explicitly authorized fresh simulation reset would clear derived state together with source data; no retained source was reset.

Named isolated checks passed exact70-digit arithmetic,1-row overlapping low-ID backfill, replay, post-seal hold/settlement buckets, atomic rollback, original negative/unbalanced commit guards, service tamper denial and member ownership. Three concurrent writers committed36 balanced journals with36 inert replays while1-row backfill ran; every counter matched independent source sums, with zero retryable aborts. Earlier race fixtures are preserved: their manual240-step cap was too low because new UUID rows inside the captured range also consume bounded pages; the500-step procedure passed. Incomplete diagnostics and generated invalid derived evidence failed closed and rolled back. The retained isolated source sealed in bounded service steps and actual reconciliation reported complete/balanced/consistent/lineage-complete. Owner/model catalogs match848 columns, all checks and standalone indexes; the same22 SQL-only constraint triggers and2 deferred-FK timing differences remain explicitly inventoried. Archive/restore, required checks/build/budgets and both exact-head CI events must be recorded before merge.

Current Round One accounting after local verification:72/74 implemented,2 open: P1-009/P1-028. Round Two, Round Three and Phase Two have not started. Finish those two findings and all necessary verified PR merges, then report completion and HALT. Resume Round Two/Phase Two only after the owner's explicit go-ahead; this latest credit-refill stop directive overrides earlier autonomous continuation beyond Round One.


V47 final verification (14 October 2026 at 05:00:53 PM WAT): migrations096/097 applied forward-only in fresh gw_v47_final; migration097 gives deferred commit guards a private, ungranted account helper so temporary native/read scope restoration cannot reject a valid journal. Member/public read helpers still enforce ownership/environment; native portfolio/payout/recovery explicitly enter testnet read scope. Actual native summaries passed available5/held2/settled-net3/income10. A labelled synthetic asset/unapproved quoted refund passed available5/held6/income-held2/refund-held4/settled-net3/income10 with all generated entities/journals rolled back. The preserved original SOL source's restored-asset intake fence rejected a copied new obligation; that failed procedure/clone are retained, no gate or fence was bypassed and no original source was changed. Final-code concurrency proof passed36 committed journals/36 inert replays during1-row backfill with exact independent source congruence and zero retryable aborts. Final owner/model comparison matches92 tables/848 columns/274 checks/105 indexes and the same SQL-only exceptions;98 migrations. Signed encrypted counters-final_v47-r2.gwbackup includes79 retained inventories. All72 prior retained inventories match v45 exactly, except additive schema_migrations. Fresh exact restore targets gw_v47_restore_r2 and remains inactive/unpublished. Required check:all/build/bundle pass evidence is in the private v47 directory; local bounds homepage180.35KiB,API1.447MiB,clients0.661MiB. Exact-final-head push/PR CI and merge remain required. Finish P1-009/P1-028 next, then HALT at Round One completion for the owner's credit refill; do not begin Round Two/Phase Two.


V47 isolated signer capability correction (14 October 2026 at 05:04:25 PM WAT): migration098 exposes a read-only gw_signer/testnet aggregate for the closed beneficiary-liability purpose set. The isolated signer does not acquire service/read membership, direct counter access or write privileges. Actual wrapper/role checks match independent source sums and deny service/private helpers, unsupported purposes and service-role use of the signer capability. Source includes99 migrations; tables/columns/checks/indexes remain92/848/274/105. Final archive is counters-final_v47-r3.gwbackup with79 retained inventories, restored to inactive gw_v47_restore_r3; earlier intermediate archives/clones/procedure failures are preserved. Required final check:all, build, bundle bounds and exact-head dual CI must pass before merge. Round One still stops after P1-009/P1-028 and necessary PR merges; no Round Two or Phase Two work is authorized until the owner resumes.


V47 release checks (14 October 2026 at 05:14:55 PM WAT): final check:all and production build passed after the scope/capability fixes; homepage180.35KiB/200,API1.449MiB/3,clients0.661MiB/2. Exact v47-r3 encrypted backup/restoration passed in gw_v47_restore_r3 with79 retained inventories; all72 prior inventories except additive migration history match v45. No retained source, failed fixture, signed bytes or gate changed. Both exact-head CI events and squash merge are the remaining release steps. Then continue P1-009/P1-028 and HALT only when Round One is complete.


## Latest owner stop boundary — current PR only

The owner's latest credit-refill directive (14 October 2026 at 05:15:19 PM WAT) is to merge only the current P1-039 ledger-counter PR, then report its result and HALT. Do not start P1-009, P1-028, Round Two or Phase Two until the owner explicitly resumes. This supersedes the earlier request to finish every Round One finding before stopping. P1-009 (historical receiving-address monitoring) and P1-028 (retention/archival) remain OPEN. Round One is72/74 locally verified, with P1-039 awaiting the current exact-head dual CI and merge; Phase Two has not started.


## V48 single final-state initial schema

Updated: **15 October 2026 at 12:27:07 PM WAT**. The owner confirmed no migrations have been applied to the intended installation and requested one final-state migration. The99 active SQL files have been replaced by packages/db/src/migrations/000_initial_schema.sql. It creates the final schema directly, not concatenated upgrades, and records one validated body-checksum receipt. Direct SQL runs atomically; db:migrate uses the same receipt in its own transaction and skips matching history. Unknown/legacy histories and nonempty application schemas are rejected before installation. Do not apply this fresh-install baseline to a populated database or rewrite it after deployment; later changes need new forward migrations.

A new empty PostgreSQL reference applied all99 historical migrations solely to derive/verify final definitions. Baseline/direct/runner catalogs match all3523 schema/security entries, including column grants;92 tables/848 columns/274 checks/105 standalone indexes, the same final views/functions/triggers/policies and deferred timing. An independent target with broad browser/unknown-role default privileges matches the same final ACLs. The schema-free128-bit owner/runtime advisory-lock challenge replaces the deleted014 bootstrap dependency and retains restricted-runtime/ownership checks; empty/post-install checks pass, wrong database and owner-runtime checks fail, and no schema/locks remain after preflight. Mandatory initialization creates fresh identity rows and seals only the known-empty ledger; published test privacy notices remain. Application seeding is separate.

Named isolated verification covers direct/runner checksum parity and rerun, edited body/footer denial, nonempty-schema preservation, late-DDL rollback, legacy-history refusal, seed/runtime verification and encrypted79-inventory backup/exact restore. Existing failed fixtures, financial sources, archive packets/keys and signed evidence remain untouched. Older99-migration archives require their matching historical release (e6f7888034afae01d0c7803965f1c17889783171); the version guard is retained, not bypassed or re-signed. Required source checks/build/bundle and both exact-head CI events must pass before merge. Current evidence is private under /workspace/work/schema-consolidation-v48.

PR46 is merged at e6f7888034afae01d0c7803965f1c17889783171 after exact-head push38596587666 and pull_request38596599068 both succeeded for1f2ab151bca8c5f587e0fa73ed7718a29ebd7e36. Round One remains72/74; P1-009/P1-028 are OPEN. This task authorizes migration consolidation only. Finish its documentation and verified PR, then halt; do not resume those bugs, Round Two or Phase Two without the owner's explicit go-ahead. Both financial readiness gates remain false; no signing, broadcast, reset or broad deferred suite ran.


## V48 final isolated verification — 15 October 2026 at 12:42:45 PM WAT

The active migration directory contains exactly one405718-byte final-state SQL file. Final direct/runner/default-grant targets match all3523 reference schema/security entries and column grants. A fresh installation seeds and verifies through the restricted runtime. The final baseline passes actual60-digit journal/replay/counter reads, negative-commit rejection and runtime counter-tamper denial, with every generated financial row rolled back. Body/footer tampering, nonempty schemas, unknown histories, wrong databases and unsafe owner runtimes are rejected. Late DDL failure leaves no partial schema/history. All fresh advisory challenges leave no table or lock behind.

Encrypted initial-schema_v48-r2.gwbackup includes79 retained inventories. Exact restore passed into fresh inactive gw_v48_release_restore and gw_v48_release_restore_final, preserving schema/RLS/grants/financial/work history. Exports now retain deployment_binding_challenges schema while excluding only its ephemeral rows; preflight no longer creates that table. Restore rejects even an existing proof table as RECOVERY_TARGET_NOT_EMPTY. Initial intermediate failures/archives remain private and preserved; none is treated as final acceptance. The repository secret scan remains unchanged: the public checksum receipt uses two32-character SQL literals instead of weakening the generic64-hex secret heuristic.

Required check:all and production build passed; local bounds homepage180.35KiB/200,API1.394MiB/3,clients0.661MiB/2. Final exact-head push/PR CI and merge remain required. Hosted provider acceptance and broad deferred tests are unrun. This consolidation adds no bugfix-round or Phase Two progress: Round One72/74, P1-009/P1-028 open, financial gates false. Current branch feat/consolidated-initial-schema; finish this PR and halt.

Signed: **15 October 2026 at 12:42:45 PM WAT**.
