# Custom bugs report — Gifters World Phase One

Updated: **14 October 2026 at 02:25:24 PM WAT**.

## Complete one-line findings list

1. **P1-001 — Expired or dismissed native invoices prevent another checkout.** (High; defect) — Implemented; local checks passed.
2. **P1-002 — A successful wallet send followed by a failed submission can prompt a second payment.** (High; defect) — Implemented; local checks passed.
3. **P1-003 — Native TRX status observation rejects its own event index.** (High; defect) — Implemented; local checks passed.
4. **P1-004 — Signer reservations ignore tighter runtime payout limits.** (High; defect) — Implemented; local checks passed.
5. **P1-005 — Recovery binding distinguishes pooler and signer endpoints for the same database.** (High; defect) — Implemented; local checks passed.
6. **P1-006 — Recovery can journal the same transaction fees more than once.** (High; defect) — Implemented; local checks passed.
7. **P1-007 — Solana fee attribution treats other transfers as account setup cost.** (High; defect) — Implemented; local checks passed.
8. **P1-008 — Saved expired Solana or TRON attempts can indefinitely block a recovery scan.** (Medium; defect) — Implemented; local checks passed.
9. **P1-009 — Previous receiving addresses have no complete recovery monitoring inventory.** (High; requirement gap) — Open.
10. **P1-010 — Pausing a plan rejects payments already committed under its frozen terms.** (High; defect) — Implemented; local checks passed.
11. **P1-011 — Accepted bootstrap destinations have no complete liability and payout support.** (High; defect) — Implemented; local checks passed.
12. **P1-012 — The signer's oldest fixed candidate batch can starve later payable work.** (Medium; defect) — Implemented; local checks passed.
13. **P1-013 — Recovery pages have row bounds without a feasible total RPC/time budget.** (High; defect) — Implemented; local checks passed.
14. **P1-014 — The generic scheduler client signs only simulation and leaves testnet jobs undrained.** (High; defect) — Implemented; local checks passed.
15. **P1-015 — The hosted deploy workflow cannot migrate the selected testnet binding.** (Medium; requirement gap) — Implemented; local checks passed.
16. **P1-016 — Safe cancellation and unallocated-refund recovery are unreachable in the UI.** (Medium; defect) — Implemented; local checks passed.
17. **P1-017 — Import and business operations use the generic staff rate policy.** (Medium; defect) — Implemented; local checks passed.
18. **P1-018 — Rate budgets fragment across raw resource paths.** (Medium; defect) — Implemented; local checks passed.
19. **P1-019 — Public database reads and OAuth callbacks bypass explicit rate budgets.** (Medium; hardening) — Implemented and locally verified in v38.
20. **P1-020 — A combined factor/IP bucket does not bound distributed MFA guesses.** (Medium; hardening) — Implemented; local checks passed.
21. **P1-021 — Wallet changes lack the PRD's fresh authentication and domain-bound challenge.** (High; defect) — Implemented; local checks passed.
22. **P1-022 — Ordinary API reads can return data from the previous client identity.** (High; defect) — Implemented; local checks passed.
23. **P1-023 — Concurrent browser tabs can revoke a valid refresh family.** (Medium; defect) — Implemented; local checks passed.
24. **P1-024 — Secondary portals show login instead of using an available refresh session.** (Medium; defect) — Implemented; local checks passed.
25. **P1-025 — Concurrent Google registrations can collide and fallback names violate configured lengths.** (Medium; defect) — Implemented; local checks passed.
26. **P1-026 — Account deletion leaves private message content in notifications and job payloads.** (Medium; defect) — Implemented; local checks passed.
27. **P1-027 — Expired authentication and rate records have no bounded cleanup lifecycle.** (Medium; defect) — Implemented; local checks passed.
28. **P1-028 — Declared notification, terminal-job, ledger and audit retention is not implemented.** (Medium; requirement gap) — Open.
29. **P1-029 — Pending chain observation ignores poll policy and creates a new durable job each round.** (Medium; defect) — Implemented; local checks passed.
30. **P1-030 — Configured DLQ, backlog, lock-wait and quota alert thresholds have no complete alert path.** (Medium; requirement gap) — Implemented; local checks passed.
31. **P1-031 — Acknowledged or resolved alerts can still send queued reminders.** (Medium; defect) — Implemented; local checks passed.
32. **P1-032 — Old low-priority alert retries can consume the budget before a new critical alert.** (Medium; defect) — Implemented; local checks passed.
33. **P1-033 — A permanent alert delivery key does not bind an immutable payload.** (Medium; defect) — Implemented; local checks passed.
34. **P1-034 — Reopened alert escalation uses lifetime delivery count as the interval index.** (Low; defect) — Implemented; local checks passed.
35. **P1-035 — Request IDs do not correlate API, audit, job and error records.** (Medium; requirement gap) — Implemented; local checks passed.
36. **P1-036 — Expected failures become generic nonretryable errors and raw codes reach users.** (Medium; defect) — Implemented; local checks passed.
37. **P1-037 — The shared JSON byte cap has no elapsed read deadline.** (Medium; hardening) — Implemented; local checks passed.
38. **P1-038 — Ordinary database work lacks a complete query, queue and request time budget.** (Medium; hardening) — Open.
39. **P1-039 — Balances and reconciliation repeatedly aggregate full ledger history.** (Medium; requirement gap) — Open.
40. **P1-040 — Expired public statistics can create an advisory-lock request herd.** (Medium; hardening) — Implemented; local checks passed.
41. **P1-041 — RPC cache misses are not coalesced and throttle waiting is outside the timeout.** (Medium; hardening) — Implemented; local checks passed.
42. **P1-042 — Deployment-controlled RPC, alert and cache URLs lack an explicit SSRF destination policy.** (Medium; hardening) — Implemented; local checks passed.
43. **P1-043 — Remote cache adapters lack equivalent timeout, response and lifecycle bounds.** (Medium; hardening) — Implemented; local checks passed.
44. **P1-044 — Global activity remains visible when feature_activity is disabled.** (Medium; defect) — Implemented; local checks passed.
45. **P1-045 — There is no shared visible authenticated snapshot poll.** (Medium; requirement gap) — Implemented and locally verified in v41.
46. **P1-046 — Notification load-more permanently stops at 100 items.** (Medium; defect) — Implemented; local checks passed.
47. **P1-047 — Staff lists hide older users, jobs and recovery cases without search or cursors.** (Medium; requirement gap) — Implemented and locally verified in v40.
48. **P1-048 — Latest-history caps can omit older active cycles and pending withdrawals.** (Medium; defect) — Implemented and locally verified in v39.
49. **P1-049 — Public catalog and help lack the Phase One SEO rendering and metadata contract.** (Medium; requirement gap) — Implemented and locally verified in v43.
50. **P1-050 — Several private portals lack noindex metadata.** (Low; requirement gap) — Implemented; local checks passed.
51. **P1-051 — Stored locale and product copy are not consistently applied across portals.** (Medium; defect) — Implemented and locally verified in v43.
52. **P1-052 — Dark-mode primary button text fails normal-text contrast.** (Medium; defect) — Implemented; local checks passed.
53. **P1-053 — Mobile navigation and the testnet home omit required product surfaces.** (Medium; requirement gap) — Implemented and locally verified in v43.
54. **P1-054 — The native wallet summary omits held and withdrawn/net-income totals.** (Medium; requirement gap) — Implemented; local checks passed.
55. **P1-055 — Closed historical exceptions can prevent plan editing forever.** (Medium; defect) — Implemented; local checks passed.
56. **P1-056 — Native activation ignores the configured fixed-token pricing mode.** (Medium; defect) — Implemented; local checks passed.
57. **P1-057 — Accepted provider and finality selectors have no matching implementation.** (Medium; defect) — Implemented; local checks passed.
58. **P1-058 — Advertised single-request archive uploads exceed the Vercel function body limit.** (Medium; defect) — Implemented; local checks passed.
59. **P1-059 — Filesystem archive staging is not durable or consistently reachable across serverless instances.** (Medium; requirement gap) — Implemented; local checks passed.
60. **P1-060 — Archive stream creation precedes the final session fence and permits a file-lifecycle race.** (Low; hardening) — Implemented; local checks passed.
61. **P1-061 — Failed staging files consume quota without a complete failure inventory.** (Medium; defect) — Implemented; local checks passed.
62. **P1-062 — Paged own-data exports are not a single point-in-time snapshot.** (Low; hardening) — Implemented and locally verified in v43.
63. **P1-063 — Drizzle table coverage does not describe all deployed constraints and defaults.** (Medium; maintenance) — Implemented and locally verified in v44.
64. **P1-064 — Large tightly coupled services and untyped UI contracts make changes fragile.** (Low; maintenance) — Open.
65. **P1-065 — Help search lacks the specified locale full-text and trigram ranking.** (Medium; requirement gap) — Implemented and locally verified in v44.
66. **P1-066 — Published help cache does not remove withdrawn or renamed saved articles.** (Low; defect) — Implemented; local checks passed.
67. **P1-067 — Solana custody reconciliation requires identical live response slots.** (Medium; defect) — Open.
68. **P1-068 — Production dependencies include unresolved security advisories.** (High; maintenance) — Implemented; local checks passed.
69. **P1-069 — Native quote expiry and cooldown use the web clock instead of database time.** (Medium; defect) — Implemented; local checks passed.

70. **P1-070 — A valid multi-asset plan catalog fails after 100 active versions.** (Medium; defect) — Implemented; local checks passed.
71. **P1-071 — Financial archives can claim the current migration version while source migrations are pending.** (Medium; defect) — Implemented; local checks passed.
72. **P1-072 — Same-address native/token transfers can manufacture incoming principal.** (High; defect) — Implemented; local checks passed.
73. **P1-073 — Testnet identity and rate infrastructure remains simulation-only.** (High; requirement gap) — Implemented and locally verified in v43.

## Review, scope and evidence

**Round 1; three analysis passes completed. No application bug fixes have been applied. All 70 findings remain open pending the owner's plan review.** Severity: 15 High, 49 Medium, 6 Low. Classification: 43 defects, 14 Phase One requirement gaps, 10 hardening recommendations, 3 maintenance issues. Severity describes potential impact when the affected path is used, rather than claiming every finding is currently exploitable.

Baseline: main commit `ee50068`, merged [PR27](https://github.com/nero1/onyiy/pull/27). Scope is the Phase One PRD, not Phase Two presentation changes. Inventory: 382 tracked files; Next16 App Router/Route Handlers, Node22, Drizzle/PostgreSQL, 80 application tables, 73 forward SQL migrations, isolated chain adapters/signer, browser/PWA, operational scripts and workflows. Generated snapshots/lockfile, static assets, route wrappers and docs were classified alongside executable services. Test-only concerns and CRON frequency are excluded as requested; generic scheduler HMAC/work dispatch, deadlines and backoff remain in scope.

The passes were: (1) architecture, repository inventory and requirement tracing; (2) cross-file money, session, permission, schema and hosting contracts; (3) adversarial state transitions, failures, concurrency and evidence verification, including rejection of false positives. These are three complementary repo-wide analysis passes, not a claim that every generated/binary artifact was manually reread line-by-line three times.

Four bounded synthetic reproductions confirmed native TRX index rejection, same-database endpoint fingerprint mismatch, a former-owner API response after identity change, and 2.90:1 dark-button contrast. A fifth observation confirmed the body parser supplies no elapsed deadline. These probes used generated transactions/strings, no private key, no broadcast and no real RPC. The first scratch run failed on TS module interop; corrected imports produced the five recorded observations. Dependency audit was read-only. Other findings are static source/requirement evidence or clearly labelled conditional recommendations; financial gates stayed false throughout.

No broad automated test suite, load test, live penetration exercise, hosted OAuth/wallet/custody send or production benchmark was performed. The retained local verification from v28 remains useful but does not disprove these findings. This report cannot guarantee that no further bugs exist.

## Rating and brief review

**Current overall engineering assessment: 6/10. Projected after all fixes and successful verification: approximately 8/10.** These are review judgments, not measured capacity or security certifications.

- Financial/recovery correctness: **5/10 → 8/10**. Integer/base-unit arithmetic, balanced append-only journals, durable signing and positive-failure holds are strong foundations; checkout retry, fee attribution, liability completeness and recovery-scope defects materially weaken confidence.
- Security/session/privacy: **6.5/10 → 8.5/10**. Current database role checks, RLS, CSRF, TOTP replay controls and isolation are substantial. Fresh wallet authentication, stale private responses, abuse budgets, erasure and dependency exposure need remediation.
- Performance/cheap-hosting suitability: **5/10 → 8/10**. Lazy wallet code and bounded caches/build traces help; history aggregation, request/RPC budgets, duplicate polling, retention and local-file staging need work. Thousands of concurrent users and zero-cost operation are **unproven**, before and after code changes until measured on the selected host.
- Structure/maintainability: **6/10 → 8/10**. Domain/infrastructure packages exist, but tightly coupled services, dense modules and weak DTO typing make invariant changes difficult.
- Product completeness/accessibility/SEO: **6/10 → 8/10**. Simulation flows and local EN/FR checks exist; testnet product surfaces, private pagination, consistent preferences, contrast and public server rendering remain incomplete.

The previous “100% implementation” milestone checklist is historical feature-coverage evidence. This audit reopens requirement gaps and defects; it is not a current claim of bug-free Phase One or readiness for Phase Two/live release.

## Detailed findings

Paths below are relative to repository root `/workspace/onyiy`. “Defect” means a concrete source/contract failure; “requirement gap” means missing Phase One behavior; “hardening” means a conditional defensive improvement; “maintenance” means dependency/schema/structure risk. Native operational defects remain latent while the deliberately disabled financial gates prevent normal external sending.

### 1: BUG P1-001: Expired or dismissed native invoices prevent another checkout

**FILES:** `server/crypto-incoming.ts`, `packages/db/src/schema.ts`, `components/native-portal.tsx`

**FIX:** Atomically expire or explicitly cancel positively unsubmitted quotes, recover the existing usable quote, and retain late-payment monitoring and immutable invoice economics.

**High · Defect.** quoteCryptoInvoice inserts a new quote without closing an earlier quoted invoice. crypto_invoice_open_idx permits only one quoted/submitted invoice per member/version; neither expiration nor dismissing the review screen changes that row. A new request key therefore encounters a uniqueness failure, and a quote tied to an old session cannot simply be prepared again.

### 2: BUG P1-002: A successful wallet send followed by a failed submission can prompt a second payment

**FILES:** `components/native-portal.tsx`, `lib/native-wallet.ts`, `server/crypto-incoming.ts`

**FIX:** Retain a nonsecret submission receipt scoped to the original invoice/account, distinguish sending from submitting, retry only hash submission, and provide explicit recovery without automatically sending again.

**High · Defect.** pay keeps the transaction hash only in a local variable and clears the payment only after /gifts/crypto/transaction succeeds. A transport/server failure leaves the approval action available; another click invokes the wallet transfer again. An identity change after the wallet returns also discards the hash.

### 3: BUG P1-003: Native TRX status observation rejects its own event index

**FILES:** `packages/chains/src/tron.ts`, `server/crypto-expiry.ts`, `workers/signer/run.ts`

**FIX:** Use the canonical native index and preserve token event discovery; check pending, executed failure, settlement and expiry with the same saved transaction.

**High · Defect.** getTransactionStatus calls observe with index -1; the native TransferContract verifier requires index 0. A generated valid native transaction confirmed through verifyTransfer(index 0), while getTransactionStatus threw TRANSFER_NOT_FOUND. This blocks successful native TRX recovery/status paths.

### 4: BUG P1-004: Signer reservations ignore tighter runtime payout limits

**FILES:** `workers/signer/store.ts`, `server/unallocated-refunds.ts`, `server/financial-config.ts`

**FIX:** Enforce the minimum of deployment ceilings and freshly validated runtime limits in the signer transaction for every obligation kind, keeping independently reserved daily principal and gas.

**High · Defect.** SignerStore.claim reads SIGNER_HARD_PER_TX_USD and SIGNER_HARD_DAILY_PER_ASSET_USD for its reservations, rather than intersecting them with the live payout_limits policy. Web prechecks do not independently enforce every obligation kind, notably unallocated refunds; the daily runtime limit is not enforced by this signer calculation.

### 5: BUG P1-005: Recovery binding distinguishes pooler and signer endpoints for the same database

**FILES:** `packages/db/src/binding-fingerprint.ts`, `packages/db/src/context.ts`, `workers/signer/store.ts`, `server/chain-recovery.ts`

**FIX:** Introduce an authenticated shared deployment/database binding that works across approved connection modes and cannot be inherited by a restored clone. Preserve clone rejection and require fresh recovery proof where existing identity is ambiguous.

**High · Defect.** The scope fingerprint includes connection host and port. Web and signer derive it from different URL bindings; transaction pooler port 6543 and session port 5432 generate different identities even for the same project/database. The synthetic comparison reproduced the mismatch. A valid web checkpoint can therefore fail the signer resume fence.

### 6: BUG P1-006: Recovery can journal the same transaction fees more than once

**FILES:** `server/chain-recovery.ts`, `server/crypto-settlement.ts`, `packages/db/src/schema.ts`

**FIX:** Claim chain transaction fees once using a canonical environment/chain/hash key shared by settlement and recovery; keep per-transfer principal losses separate and reconcile existing duplicates with compensating journals.

**High · Defect.** Outflow resolution is unique by asset/hash/event, but network/setup journals use the resolution UUID. Several recovered events or asset views of one transaction can each post the full transaction fee; a known attempt and an additional unknown event can also overlap normal settlement gas accounting.

### 7: BUG P1-007: Solana fee attribution treats other transfers as account setup cost

**FILES:** `packages/chains/src/solana.ts`, `server/chain-recovery.ts`

**FIX:** Derive rent/account creation from validated instructions and account balance evidence, subtract every supported principal movement, and send ambiguous multi-instruction transactions to review without inventing setup fees.

**High · Defect.** observe calculates total payer balance decrease minus the selected transfer amount, then calls everything above meta.fee accountSetupCost. For a transaction containing multiple native transfers, another recipient's principal becomes setup expense. Arbitrary recovered transactions are not restricted to the worker's single-transfer shape.

### 8: BUG P1-008: Saved expired Solana or TRON attempts can indefinitely block a recovery scan

**FILES:** `server/chain-recovery.ts`, `server/crypto-expiry.ts`, `packages/chains/src/solana.ts`, `packages/chains/src/tron.ts`

**FIX:** Reconcile retained positive expiry/failure evidence in the scan and expose the required audited closure. Do not release holds or manufacture failure from an absent hash.

**Medium · Defect.** The saved-lineage loop tries findTransferIndex and settleCryptoAttempt but does not invoke positive signed-expiry verification or select retained expiry evidence. An absent, positively expired transaction remains KNOWN_ATTEMPT_PENDING until a separate closure path is discovered and completed.

### 9: BUG P1-009: Previous receiving addresses have no complete recovery monitoring inventory

**FILES:** `server/financial-config.ts`, `server/chain-recovery.ts`, `workers/signer/store.ts`, `docs/PRD.md`

**FIX:** Persist versioned receiving-address exposure and checkpoints, scan each retained address, and retire monitoring only after positive invoice/liability closure.

**High · Requirement gap.** Address roles and scans use the active receiving treasury. The PRD requires monitoring prior versions until unresolved invoice exposure closes. Submitted old invoices have their own observation path, but unmatched funds at a previous receiving address are outside the active checkpoint scan.

### 10: BUG P1-010: Pausing a plan rejects payments already committed under its frozen terms

**FILES:** `server/core.ts`, `server/incoming.ts`, `server/crypto-incoming.ts`, `server/plans.ts`

**FIX:** Separate new-checkout eligibility from admission of an eligible pre-pause payment; validate its immutable snapshot and submission deadline while preserving safety pauses and beneficiary rights.

**High · Defect.** Delayed admission ultimately calls sendGift, which requires the current plan to be active. A pause or retirement between submission and confirmation prevents the GIV admission and routes native funds into exception/refund handling instead of honoring an otherwise valid frozen invoice.

### 11: BUG P1-011: Accepted bootstrap destinations have no complete liability and payout support

**FILES:** `packages/config/src/policies.ts`, `server/core.ts`, `server/crypto-business.ts`, `server/treasury-sweeps.ts`, `server/chain-recovery.ts`, `workers/signer/store.ts`

**FIX:** Use one authoritative liability-purpose registry throughout allocation, reconciliation, sweeps and signing. Implement each permitted destination or fail configuration validation before it can accept allocations.

**High · Defect.** Configuration accepts platform/custom_bootstrap destinations and allocation creates bootstrap_<role>_payable balances. Business settlement supports developer/marketing purposes; signer, sweep and custody liability lists omit the additional bootstrap purposes. Accepted money can become payable without a valid settlement path or adequate surplus exclusion.

### 12: BUG P1-012: The signer's oldest fixed candidate batch can starve later payable work

**FILES:** `workers/signer/store.ts`, `workers/signer/run.ts`

**FIX:** Add bounded eligible-work selection or a fair durable cursor and next-attempt deadlines, with separate recovery scheduling that never loses signed lineage.

**Medium · Defect.** Candidate queries order by age and take 20 before per-item eligibility/recovery decisions. Twenty paused, mismatched, invalid-destination or still-pending items can repeatedly occupy the whole window, leaving later eligible obligations unseen.

### 13: BUG P1-013: Recovery pages have row bounds without a feasible total RPC/time budget

**FILES:** `server/chain-recovery.ts`, `packages/chains/src/tron.ts`, `packages/chains/src/rpc.ts`, `app/api/v1/admin/crypto/scans/page/route.ts`

**FIX:** Persist per-block/event/transaction progress, apply an overall elapsed/RPC budget, and return resumable partial pages without prematurely declaring an asset reconciled.

**High · Defect.** A five-block page can individually verify 100 events; TRON token scanning may inspect up to 1,000 unrelated transactions per block. At the configured RPC throttle, the page can exceed its HTTP/transaction budget. There is no durable within-block/event cursor to make an oversized page progress.

**CURRENT STATUS:** Implemented and locally verified in v36; original audit evidence above is retained.

### 14: BUG P1-014: The generic scheduler client signs only simulation and leaves testnet jobs undrained

**FILES:** `scripts/scheduler-tick.mjs`, `server/scheduler.ts`, `server/jobs.ts`, `server/financial-operations.ts`, `.github/workflows/scheduler.yml`

**FIX:** Sign the explicitly configured environment, validate it on both sides, and run the generic bounded job dispatcher for testnet as well as simulation. Keep external scheduling and all send gates independent.

**High · Defect.** scheduler-tick hardcodes simulation in its HMAC canonical string, while the server validates the configured environment. The financial tick handles monitoring/business/alerts/cleanup but does not dispatch generic notification, export or chain-observation jobs. The supplied generic client therefore cannot provide this work on testnet.

### 15: BUG P1-015: The hosted deploy workflow cannot migrate the selected testnet binding

**FILES:** `.github/workflows/ci-vercel.yml`, `scripts/validate-deployment.ts`, `packages/db/src/seed.ts`

**FIX:** Use the validated hosted environment for binding checks and migrations, split simulation fixtures from shared/native metadata, and retain explicit release gates and empty owner-provided native registries.

**Medium · Requirement gap.** Hosted validation supports a selected testnet environment, but the migration/seed step forces APP_ENV=simulation, disabled signing and GIV payment settings. It conflicts with a database already bound to testnet and has no defined non-signing testnet migration/seed path.

### 16: BUG P1-016: Safe cancellation and unallocated-refund recovery are unreachable in the UI

**FILES:** `components/native-portal.tsx`, `components/native-admin.tsx`, `server/crypto-payouts.ts`, `server/crypto-operational-recovery.ts`

**FIX:** Expose each safe recovery capability independently from permission to create a send, include unallocated-refund recovery, and derive controls from authoritative obligation state.

**Medium · Defect.** NativePortal routes cancellation through financial(), which returns when execution_enabled is false, even though safe unsigned cancellation has a server path. NativeAdmin offers operational recovery for business/refund kinds but omits unallocated_refund.

### 17: BUG P1-017: Import and business operations use the generic staff rate policy

**FILES:** `server/api.ts`, `server/rate-limits.ts`, `packages/config/src/policies.ts`, `xmanifest.json`

**FIX:** Define explicit method/route-family mappings with sensitive families taking precedence; preserve replay-aware exceptions only where they are justified.

**Medium · Defect.** All /admin routes select staff before more specific operation families. The declared import_reset and business_settlement budgets are never selected, so expensive staging and settlement attempts receive the broader staff allowance.

### 18: BUG P1-018: Rate budgets fragment across raw resource paths

**FILES:** `server/rate-limits.ts`, `next.config.ts`, `server/api.ts`

**FIX:** Pass a canonical route template or operation identifier to the limiter and independently enforce user/IP budgets across resources.

**Medium · Defect.** The limiter hashes Request.url.pathname directly, including resource IDs where the incoming URL retains them. Equivalent confirmation/cancellation/proof operations on different resource URLs get different counters instead of the intended user/IP operation budget, and produce extra database keys.

### 19: BUG P1-019: Public database reads and OAuth callbacks bypass explicit rate budgets

**FILES:** `server/api.ts`, `server/auth-api.ts`, `server/google-auth.ts`, `server/public-reads.ts`

**FIX:** Use CDN/public-cache controls and bounded IP admission for expensive misses/authentication callbacks; avoid a database write for every cached anonymous hit and retain public-read availability during limiter failure.

**Medium · Hardening.** Public routes dispatch before enforceRate, auth/session has no equivalent throttle, and finishGoogle can reach provider exchange without callback-specific rate enforcement. Cached public reads reduce work but misses and authentication reads still reach the database; this is an abuse/cost exposure, not a demonstrated account compromise.

**V38 resolution:** Public manifest/catalog/native-catalog/help/statistics cache-miss leaders now pass bounded local IP/route admission and the shared PostgreSQL reads budget. Warm hits and coalesced followers perform no limiter writes. Local storage retains live budgets, caps1024 keys, and shares one overflow budget; failed shared admission cannot start a fresh read. Existing cached public DTOs remain available within their freshness window. Vercel alone supplies the trusted forwarding header; arbitrary forwarding headers are ignored and equivalent IPv6 spellings share one identity. Simulation account listing is admitted and capped100. Help redirects use a bounded published inventory cache, so arbitrary slug probes no longer cause one database lookup each. OAuth start/callback/session limits from v30 remain enforced.

### 20: BUG P1-020: A combined factor/IP bucket does not bound distributed MFA guesses

**FILES:** `server/rate-limits.ts`, `server/auth.ts`, `server/auth-api.ts`, `packages/config/src/policies.ts`

**FIX:** Enforce independent factor/account and IP budgets across verification routes with temporary backoff and recovery-safe behavior; do not permanently lock accounts or expose factor existence.

**Medium · Hardening.** factor_ip_route produces one hash combining subject, IP and route. Attackers changing IP obtain separate allowances against the same factor/account. TOTP replay protection prevents reuse of a successful step but does not impose a shared guessing budget.

### 21: BUG P1-021: Wallet changes lack the PRD's fresh authentication and domain-bound challenge

**FILES:** `server/api.ts`, `server/crypto-wallets.ts`, `packages/db/src/context.ts`, `docs/PRD.md`

**FIX:** Require fresh authentication at challenge and commit, bind proof to origin, operation, session and wallet revision, and preserve the cooling period and already-broadcast destinations.

**High · Defect.** Sensitive session/account checks and wallet ownership proof exist, but requiresWithdrawalProof is set only for withdrawal confirmations. Wallet challenge/proof can change a destination without fresh authentication, and the signed ownership statement lacks the configured web origin/domain.

### 22: BUG P1-022: Ordinary API reads can return data from the previous client identity

**FILES:** `lib/api-client.ts`, `components/notification-inbox.tsx`, `components/dashboard-app.tsx`, `components/admin-panel.tsx`

**FIX:** Capture and fence request scope on every private response/error, abort obsolete reads, and reset or key private child state by owner plus generation.

**High · Defect.** api() does not reject a response when client owner/generation changes while fetch is in flight. A synthetic deferred response returned the former owner's private fixture after setClientSession switched accounts. Several child read handlers have no independent epoch check, allowing stale state to repopulate after clearing.

### 23: BUG P1-023: Concurrent browser tabs can revoke a valid refresh family

**FILES:** `lib/api-client.ts`, `server/auth.ts`, `components/dashboard-app.tsx`

**FIX:** Coordinate browser refresh with Web Locks/BroadcastChannel and recheck shared cookies/session state after waiting. Preserve server token rotation and actual reuse detection.

**Medium · Defect.** Refresh single-flight is module-local. Two tabs can submit the same current refresh cookie concurrently; the second observes a used refresh token and triggers the intended family-reuse revocation. This converts ordinary cross-tab concurrency into a security logout.

### 24: BUG P1-024: Secondary portals show login instead of using an available refresh session

**FILES:** `components/native-portal.tsx`, `components/member-portal.tsx`, `components/account-portal.tsx`, `lib/auth-client.ts`, `components/dashboard-app.tsx`

**FIX:** Centralize session bootstrap and safe refresh for every portal, including cross-tab scope handling and pre-auth/MFA restrictions.

**Medium · Defect.** Dashboard bootstrap handles auth/session.can_refresh, but native/member/account bootstrap simply accepts user:null. With an expired short access cookie and a valid refresh cookie, these pages present an unnecessary login.

### 25: BUG P1-025: Concurrent Google registrations can collide and fallback names violate configured lengths

**FILES:** `server/google-auth.ts`, `server/auth.ts`, `packages/config/src/policies.ts`

**FIX:** Use bounded conflict-aware insertion retries and a policy-compliant fallback inside transaction-safe savepoints; keep provider identity unique.

**Medium · Defect.** Username allocation checks availability then inserts under a lock keyed by Google subject, not the chosen username. Different subjects with the same stem can race into a unique violation. The fallback member_ plus 12 hex characters is always 19 characters and can fail valid shorter/longer username policies.

### 26: BUG P1-026: Account deletion leaves private message content in notifications and job payloads

**FILES:** `server/moderation.ts`, `server/jobs.ts`, `packages/db/src/schema.ts`, `packages/db/src/migrations/011_durable_notification_jobs.sql`

**FIX:** Define and implement nonfinancial-content erasure across delivery copies using a narrowly scoped forward migration/redaction capability; retain financial UUIDs, mandatory audit evidence and permanent deduplication keys.

**Medium · Defect.** Deletion erases identity/factors and redacts reports/appeals, but does not redact delivered notification bodies or their immutable outbox/job copies. Free-text administrator messages can contain personal information indefinitely after deletion.

### 27: BUG P1-027: Expired authentication and rate records have no bounded cleanup lifecycle

**FILES:** `server/maintenance.ts`, `server/financial-cleanup.ts`, `server/auth.ts`, `server/google-auth.ts`, `packages/db/src/schema.ts`

**FIX:** Add indexed bounded cleanup jobs with explicit retention and holds, retaining replay records through their full acceptance windows and active family dependencies.

**Medium · Defect.** Current cleanup covers scheduler records and selected financial challenges, not expired OAuth flows, old refresh families/tokens, rate keys or retained TOTP replay rows. Routine logins and changing resources/IPs can grow these stores indefinitely.

### 28: BUG P1-028: Declared notification, terminal-job, ledger and audit retention is not implemented

**FILES:** `server/maintenance.ts`, `server/jobs.ts`, `server/notifications.ts`, `packages/config/src/policies.ts`, `packages/db/src/migrations`

**FIX:** Archive verified immutable financial/audit partitions and compact expendable delivery bodies in resumable batches; preserve permanent business keys and recoverable evidence, and honor retention holds.

**Medium · Requirement gap.** Only selected ephemeral records are cleaned; job_terminal_days, notification_days, audit_hot_days and financial_archive_after_days have no corresponding complete archival process. Terminal jobs/outbox and full hot financial history accumulate despite the cheap-hosting retention contract.

### 29: BUG P1-029: Pending chain observation ignores poll policy and creates a new durable job each round

**FILES:** `server/crypto-observer.ts`, `server/jobs.ts`, `packages/config/src/policies.ts`

**FIX:** Use durable next-observation deadlines and bounded adaptive backoff/jitter, with compact attempt state and permanent deposit idempotency. This concerns processing policy, not external CRON frequency.

**Medium · Defect.** Each pending observation enqueues a new round-specific outbox/job, up to the 2,880-round bound, without the configured first/later poll delay. Normal pending results are not failures, so failure backoff does not address this work and storage amplification.

### 30: BUG P1-030: Configured DLQ, backlog, lock-wait and quota alert thresholds have no complete alert path

**FILES:** `server/financial-monitor.ts`, `server/financial-operations.ts`, `server/jobs.ts`, `packages/config/src/policies.ts`, `app/api/health/route.ts`

**FIX:** Implement indexed backlog/dead-letter and age measurements, quota/lock diagnostics and priority-aware deduplicated alerts; keep public health aggregate-only and cheap.

**Medium · Requirement gap.** Financial monitors cover several custody/signer conditions, and staff can read job counts. alert_policy backlog/dlq/lock_wait/quota/public-RPC controls are not wired into equivalent external alert conditions or a bounded operational health projection.

### 31: BUG P1-031: Acknowledged or resolved alerts can still send queued reminders

**FILES:** `server/financial-alerts.ts`, `server/financial-operations.ts`

**FIX:** Fence reminder claims against the current alert occurrence/status and stop obsolete reminder retries after acknowledgement/resolution, retaining attempted-delivery evidence.

**Medium · Defect.** deliverFinancialAlert selects pending/failed/sending deliveries without filtering the parent alert status. A reminder queued before acknowledgement/resolution can still be retried and consume the shared daily HTTP budget.

### 32: BUG P1-032: Old low-priority alert retries can consume the budget before a new critical alert

**FILES:** `server/financial-alerts.ts`, `server/financial-monitor.ts`

**FIX:** Prioritize fresh critical conditions within the existing global cap, use fair per-condition retry deadlines/coalescing, and expose suppressed/backlogged alerts to staff.

**Medium · Defect.** Delivery selection orders only by creation time. With the default small shared daily attempt budget, an older failing P2 delivery can take repeated slots while a fresh P1 condition waits behind it.

### 33: BUG P1-033: A permanent alert delivery key does not bind an immutable payload

**FILES:** `server/financial-alerts.ts`, `packages/db/src/schema.ts`

**FIX:** Persist the canonical payload/hash and occurrence revision with each delivery, retry exactly those bytes, and create a new permanent ordinal for changed content.

**Medium · Defect.** Delivery rows retain the business key but dispatch reads the parent's current severity/safeDetails. Reopening the same condition can change those fields while an older failed/uncertain delivery remains. The same delivery key can then identify a different signed body, breaking receiver deduplication/ACK consistency.

### 34: BUG P1-034: Reopened alert escalation uses lifetime delivery count as the interval index

**FILES:** `server/financial-alerts.ts`, `server/financial-operations.ts`

**FIX:** Keep a never-reused delivery ordinal separate from the current occurrence's escalation step and daily attempt budget.

**Low · Defect.** Reopening correctly advances the permanent ordinal and schedules the first reminder interval, but enqueueFinancialReminders indexes subsequent intervals using the lifetime reminders count. A previously escalated condition therefore skips the early escalation steps on later occurrences.

### 35: BUG P1-035: Request IDs do not correlate API, audit, job and error records

**FILES:** `server/api.ts`, `server/auth.ts`, `server/jobs.ts`, `server/scheduler.ts`, `server/worker-auth.ts`

**FIX:** Create one bounded request correlation context, propagate causation to asynchronous work and safe logs, and return the same ID in response metadata/header without logging secrets or financial payloads.

**Medium · Requirement gap.** Responses generate new UUIDs but there is no shared validated request context/response header and no consistent propagation into jobs/audit or redacted failure logs. Catch blocks often discard the underlying operational context, making a reported private reference difficult to trace.

### 36: BUG P1-036: Expected failures become generic nonretryable errors and raw codes reach users

**FILES:** `server/api.ts`, `lib/api-client.ts`, `lib/i18n.ts`, `components/native-portal.tsx`, `components/account-portal.tsx`, `server/crypto-prices.ts`

**FIX:** Use a complete typed error registry with accurate statuses, localized message/help keys and safe retry guidance. Automatic retries must remain restricted to replay-safe reads/submissions.

**Medium · Defect.** The error map omits several thrown domain codes, including withdrawal viability/price/fee cases; retryable is set only for RECONCILIATION_TIMEOUT. Portals often render ApiError.code instead of translated guidance. Provider/transient and permanent user errors are consequently indistinguishable.

### 37: BUG P1-037: The shared JSON byte cap has no elapsed read deadline

**FILES:** `server/request-body.ts`, `server/api.ts`, `server/auth-api.ts`

**FIX:** Add a bounded total read deadline and AbortSignal handling, cancel/release the reader on all exits and avoid duplicate body parsing.

**Medium · Hardening.** boundedJson enforces 64 KiB but waits indefinitely for reader.read and does not race a request-abort/read deadline. A synthetic silent stream stayed unsettled until supplied with data. Hosting may buffer or impose its own limits; the parser itself supplies none.

### 38: BUG P1-038: Ordinary database work lacks a complete query, queue and request time budget

**FILES:** `packages/db/src/connection-options.ts`, `packages/db/src/context.ts`, `packages/db/src/index.ts`, `workers/signer/run.ts`

**FIX:** Set workload-specific transaction/query/lock budgets and bounded admission, memoize only immutable capability checks with revocation-safe invalidation, add safe transient DB backoff/circuit health and drain resources on shutdown.

**Medium · Hardening.** The connection helper bounds connection establishment and pool size, but ordinary contexts do not set a universal statement/lock/transaction deadline or bounded pool admission. Metadata safety scans execute on every context; specialized reconciliation bounds do not cover other routes.

### 39: BUG P1-039: Balances and reconciliation repeatedly aggregate full ledger history

**FILES:** `server/core.ts`, `server/reconcile.ts`, `server/crypto-reads.ts`, `server/public-statistics.ts`, `packages/db/src/migrations/007_scoped_runtime_access.sql`, `packages/db/src/migrations/005_ledger_integrity.sql`

**FIX:** Maintain transactional per-account counters and bounded reconciliation checkpoints with exact integer arithmetic, verify them against journals and introduce measured archival/index improvements.

**Medium · Requirement gap.** Balance views/helpers and several deferred integrity/reconciliation checks sum accumulated postings rather than maintain the PRD's sealed incremental counters. The existing full-query timeout fails safely, but larger histories can make ordinary reads and completion checks expensive or repeatedly time out.

### 40: BUG P1-040: Expired public statistics can create an advisory-lock request herd

**FILES:** `server/public-statistics.ts`, `server/public-reads.ts`, `packages/db/src/context.ts`

**FIX:** Serve an age-labelled stale safe projection while one bounded refresh owns a try-lock/job, retain environment separation and use CDN/process single-flight.

**Medium · Hardening.** After cache expiry callers enter the database and wait on pg_advisory_xact_lock before rechecking the cached aggregate. Recalculation is serialized, but waiters still occupy connections/transactions; a cold burst need not be one inexpensive refresh.

**CURRENT STATUS:** Implemented and locally verified in v33; original audit evidence above is retained.

### 41: BUG P1-041: RPC cache misses are not coalesced and throttle waiting is outside the timeout

**FILES:** `packages/chains/src/rpc.ts`, `packages/chains/src/evm.ts`, `packages/chains/src/solana.ts`, `packages/chains/src/tron.ts`

**FIX:** Coalesce safe reads by immutable scope, include queue time in an overall cancellation budget and use bounded jitter/backoff/circuit state. Never substitute cached evidence for live financial confirmation.

**Medium · Hardening.** DualRpc.cached loads each simultaneous miss independently, while throttled requests wait before the fetch timer begins. At 3 requests/second a full 100-entry lane can add about 33 seconds before network timeout, and repeated network-identity checks add calls.

**CURRENT STATUS:** Implemented and locally verified in v33; original audit evidence above is retained.

### 42: BUG P1-042: Deployment-controlled RPC, alert and cache URLs lack an explicit SSRF destination policy

**FILES:** `packages/chains/src/rpc.ts`, `server/financial-alerts.ts`, `packages/cache/src/index.ts`, `packages/config/src/index.ts`

**FIX:** Validate approved hosts and resolved destinations with rebinding-aware network enforcement, fail closed on redirects, and retain narrowly scoped isolated loopback fixtures.

**Medium · Hardening.** HTTPS and credential checks exist for RPC/alerts, but private/link-local destination resolution and an approved-host policy are absent. These are deployment-owned URLs, not a demonstrated unauthenticated user-controlled SSRF entry point; configuration mistakes or compromised settings can still reach internal services.

**CURRENT STATUS:** Implemented and locally verified in v35; original audit evidence above is retained.

### 43: BUG P1-043: Remote cache adapters lack equivalent timeout, response and lifecycle bounds

**FILES:** `packages/cache/src/index.ts`, `packages/config/src/index.ts`

**FIX:** Add total I/O/size limits, strict endpoint/response validation and an explicit disposal contract; fail open only for public display caching and never use cache availability as financial authority.

**Medium · Hardening.** UpstashRestCache.command uses fetch with no AbortSignal, redirect:error or bounded response reader. The injected Redis interface also lacks an explicit close/drain contract. A slow or oversized response can consume resources when this optional provider is enabled.

**CURRENT STATUS:** Implemented and locally verified in v33; original audit evidence above is retained.

### 44: BUG P1-044: Global activity remains visible when feature_activity is disabled

**FILES:** `components/public-information.tsx`, `packages/config/src/policies.ts`, `app/layout.tsx`

**FIX:** Honor both activity/statistics flags with a manifest revision/epoch fence, abort stale loads and share the public manifest fetch.

**Medium · Defect.** PublicInformation sets statements from activity_statements without checking feature_activity. It can render/rotate fixtures after staff disables the feature. Concurrent statistics requests can also repopulate a prior enabled snapshot after a later disabled manifest response.

### 45: BUG P1-045: There is no shared visible authenticated snapshot poll

**FILES:** `components/dashboard-app.tsx`, `components/native-portal.tsx`, `components/member-portal.tsx`, `components/public-information.tsx`, `packages/config/src/policies.ts`

**FIX:** Introduce one account/generation-scoped visible online poll with jitter, abort and backoff; share notification/status updates and stop work when irrelevant or hidden.

**Medium · Requirement gap.** Dashboard/native state refreshes on local actions or manual refresh, not the required shared client_poll_seconds policy. Gifts received from other users and worker confirmations can remain stale. Export polling continues every 15 seconds without hidden/offline suspension; independent public loads are not single-flight/jittered.

**V41 resolution:** Relevant member pages now subscribe to one visible-online clock per account/session in the document. Consumers of the same snapshot coalesce into one GET; dashboard/native status and notification updates share their financial snapshot. Requests have10-second deadlines, jitter and at most six transient retry attempts with bounded exponential backoff; definitive errors stop and offer an explicit retry. Hidden/offline transitions abort active reads and stop dispatch, route exits dispose subscriptions, and obsolete account/generation responses are inert. Manual refreshes advance read generations so older poll responses cannot replace them. Export status no longer has a separate interval. Native snapshots include own notifications/badge and public-only policy; simulation policy and owned views share a repeatable transaction through withMemberSnapshot, retaining the ordinary completion fence. Member continuation pages survive parent refreshes; open inboxes include newly arrived messages. No private DTO enters storage or cross-tab broadcasts.

### 46: BUG P1-046: Notification load-more permanently stops at 100 items

**FILES:** `components/notification-inbox.tsx`, `server/notifications.ts`

**FIX:** Use a sliding retained window or paginated replacement while preserving next_cursor, stable deduplication and account-generation fences.

**Medium · Defect.** The inbox truncates merged rows to the first 100 and renders Load more only while rows.length<100. Server cursors may still identify older notifications, but the UI cannot reach them.

### 47: BUG P1-047: Staff lists hide older users, jobs and recovery cases without search or cursors

**FILES:** `server/moderation.ts`, `server/financial-operations.ts`, `server/chain-recovery.ts`, `components/account-portal.tsx`, `components/admin-panel.tsx`, `components/chain-recovery-admin.tsx`

**FIX:** Add indexed exact email/username/UUID staff lookup and stable filter-bound keyset cursors for every capped staff list, with dedicated unresolved-work views.

**Medium · Requirement gap.** Staff user/case and recovery lists take fixed first/latest windows; the admin job UI displays its initial page without a complete continuation flow. Older unresolved cases or a member beyond the initial user cap can become unreachable even though the records remain valid. Native obligation list continuation already exists; this finding concerns the other capped lists.

**V40 resolution:** Staff account lists now support indexed exact email/username/UUID lookup and stable100-row continuation. Reports/appeals, retained jobs/dead letters, recovery scans/unmatched inflows/outflows, operational alerts and simulation/native finality reviews have independent current-work and full-history views. Opaque15-minute cursors authenticate the staff actor, list, environment and normalized filters; changed filters/actors/lists, altered ciphertext and expiry reject. Every page still requires ordinary authenticated staff admission and permissions. UI pages replace prior rows, clear stale target selection and reset filters/cursors; jobs expose the existing guarded dead-letter replay action. Recovery projections retain masked senders and exclude signed payloads/checkpoint authority. Forward091 adds filtered continuation and original-sender-refund lookup indexes without deleting evidence.

### 48: BUG P1-048: Latest-history caps can omit older active cycles and pending withdrawals

**FILES:** `server/api.ts`, `server/crypto-reads.ts`, `components/dashboard-app.tsx`, `components/native-portal.tsx`

**FIX:** Fetch actionable current states independently from paginated history and expose every active/held item through bounded continuation rather than treating the latest window as complete.

**Medium · Defect.** Dashboard/native queries take recent cycles/withdrawals across statuses with small fixed windows. Newer completed history can push an older active cycle or long-held obligation out of the operational screen, although some historical pages can still find it.

**V39 resolution:** A separate member current-work view now reads cycles, payments and withdrawals/refunds independently from recent-history cards. Both environments expose100-row stable UUID continuation and a separate full-history view. The UI replaces each page to bound memory, resets continuation when filters change, refreshes after parent snapshots change, aborts obsolete reads and checks account/session generation before applying results. Owned quote cancellation and withdrawal recovery remain available through existing guarded actions; native saved-payment selection opens the existing-hash flow and never initiates another send. Current work remains available when history entitlement is off. New forward090 adds owned continuation indexes for simulation cycles/invoices/withdrawals; native indexes already exist.

### 49: BUG P1-049: Public catalog and help lack the Phase One SEO rendering and metadata contract

**FILES:** `app/page.tsx`, `app/gifts/page.tsx`, `app/help/page.tsx`, `app/layout.tsx`, `components/help-browser.tsx`, `next.config.ts`

**FIX:** Render safe cached public catalog/help per locale, add accurate metadata and published legal/mechanics pages, and use validated permanent slug redirects without exposing private content.

**Medium · Requirement gap.** Public content is loaded mainly in client components, leaving initial HTML without the meaningful plan/help article body. Canonical configured origin, locale alternates, sitemap/robots, legal/How It Works routes and actual permanent help redirects are incomplete; client history replacement is not HTTP 308.

### 50: BUG P1-050: Several private portals lack noindex metadata

**FILES:** `app/points/page.tsx`, `app/referrals/page.tsx`, `app/notifications/page.tsx`, `app/share/page.tsx`, `app/settings/account/page.tsx`, `app/settings/data/page.tsx`, `app/moderation/page.tsx`

**FIX:** Apply consistent noindex/noarchive private-layout metadata and keep those routes out of the public sitemap.

**Low · Requirement gap.** Wallet/recovery pages have noindex handling, but several member/settings/moderation routes inherit public root metadata. Anonymous login shells can be indexed contrary to the PRD; this is not evidence that authenticated private data was indexed.

**CURRENT STATUS:** Implemented and locally verified in v33; original audit evidence above is retained.

### 51: BUG P1-051: Stored locale and product copy are not consistently applied across portals

**FILES:** `components/native-portal.tsx`, `components/member-portal.tsx`, `components/account-portal.tsx`, `components/notification-inbox.tsx`, `lib/i18n.ts`, `app/layout.tsx`

**FIX:** Use a shared preference/locale provider and complete typed EN/FR message mappings, including notification/status/error text and configured public product content.

**Medium · Defect.** Secondary portals initialize English instead of applying the stored user/default locale/theme consistently. Notification titles replace underscores in English keys and raw errors remain untranslated; configured product copy/domain/tagline do not consistently drive headings and metadata.

### 52: BUG P1-052: Dark-mode primary button text fails normal-text contrast

**FILES:** `app/globals.css`

**FIX:** Adjust foreground/background tokens and verify actual enabled, disabled, hover and focus states in both themes.

**Medium · Defect.** White text on the dark accent #9b86ff measures 2.90:1, below WCAG AA's 4.5:1 normal-text requirement. Existing keyboard focus and reduced-motion controls do not correct this contrast failure.

### 53: BUG P1-053: Mobile navigation and the testnet home omit required product surfaces

**FILES:** `components/native-portal.tsx`, `components/dashboard-app.tsx`, `app/globals.css`, `app/page.tsx`, `app/manifest.ts`

**FIX:** Build shared responsive navigation and public plan/mechanics presentation for both environments, keep wallets lazy and honor feature flags without introducing Phase Two transparency changes.

**Medium · Requirement gap.** Navigation remains a wrapping top menu instead of the PRD's fixed mobile bottom destinations with staff entries and safe areas. Testnet home selects NativePortal, whose payment-oriented authenticated view does not provide the complete anonymous three-plan/mechanics presentation and integrated member navigation offered by the simulation product.

### 54: BUG P1-054: The native wallet summary omits held and withdrawn/net-income totals

**FILES:** `components/native-portal.tsx`, `server/crypto-reads.ts`, `docs/PRD.md`

**FIX:** Expose exact per-asset available, held, settled and net-income DTOs and localized labels derived from journals, keeping incoming/refundable value distinct.

**Medium · Requirement gap.** The native portal emphasizes available value but does not render the full required available/held/withdrawn separation and net-income summary, even where the DTO already provides held value. Users must infer reserved value from individual requests.

**CURRENT STATUS:** Implemented and locally verified in v37; original audit evidence above is retained.

### 55: BUG P1-055: Closed historical exceptions can prevent plan editing forever

**FILES:** `server/plans.ts`, `server/incoming.ts`, `server/crypto-refunds.ts`

**FIX:** Check remaining economic rights and open refund/admission obligations instead of exception history alone; preserve historical status and block edits whenever genuine liabilities remain.

**Medium · Defect.** noOutstanding treats every exception invoice as an outstanding obligation. Refund closure can leave the immutable invoice classified exception even after refundable value is exhausted and linked liabilities are terminal, so a drained plan remains uneditable.

### 56: BUG P1-056: Native activation ignores the configured fixed-token pricing mode

**FILES:** `server/crypto-provisioning.ts`, `server/plans.ts`, `packages/config/src/index.ts`

**FIX:** Either implement per-asset fixed-token activation with exact validated base units and immutable snapshots or reject incompatible configuration before activation; preserve existing versions and frozen prices.

**Medium · Defect.** Native activation always finds a fresh price and converts the plan's USD reference into base units, without honoring plan_config.pricing_mode=fixed_token and amount_base_units. Configuration accepts a pricing choice that does not determine activated native economics.

### 57: BUG P1-057: Accepted provider and finality selectors have no matching implementation

**FILES:** `packages/config/src/index.ts`, `packages/chains/src/registry.ts`, `packages/chains/src/evm.ts`, `server/crypto-prices.ts`

**FIX:** Validate supported provider/chain/finality combinations explicitly and expose required adapter capabilities; implement additional providers only if necessary for the approved Phase One contract.

**Medium · Defect.** Configuration accepts coinmarketcap although the implemented price ingress is manual_signed; registry finality can accept solidified for an EVM asset while the EVM adapter treats the non-depth branch as finalized. Valid-looking settings can therefore select unavailable or different behavior.

### 58: BUG P1-058: Advertised single-request archive uploads exceed the Vercel function body limit

**FILES:** `server/portability.ts`, `components/native-admin.tsx`, `packages/config/src/policies.ts`, `docs/SETUP.md`

**FIX:** Cap and explain the hosted portal limit or implement an explicitly authorized durable chunked path; retain the owner CLI route for larger encrypted archives and never decrypt/restore through upload.

**Medium · Defect.** The portal accepts/configures uploads up to 50 MiB through one function request, whereas Vercel's documented function request-body limit is 4.5 MB. Requests above the platform cap never reach the application's otherwise bounded staging reader.

**CURRENT STATUS:** Implemented and locally verified in v35; original audit evidence above is retained.

### 59: BUG P1-059: Filesystem archive staging is not durable or consistently reachable across serverless instances

**FILES:** `server/portability.ts`, `docs/SETUP.md`, `docs/HOW-IT-WORKS.md`

**FIX:** Define a private durable adapter or explicitly constrain web staging to an operator-managed persistent host, with authenticated inventory/retrieval and owner CLI verification. Keep restores inactive.

**Medium · Requirement gap.** SITE_BACKUP_FILE and staging files are local filesystem paths. On Vercel, writable temporary files are instance-local and ephemeral; a staging_id does not provide a durable owner retrieval/validation path across instances. This is a hosting mismatch, not a defect in the separately verified owner CLI backups.

**CURRENT STATUS:** Implemented and locally verified in v35; original audit evidence above is retained.

### 60: BUG P1-060: Archive stream creation precedes the final session fence and permits a file-lifecycle race

**FILES:** `server/portability.ts`, `server/api.ts`, `packages/db/src/context.ts`

**FIX:** Close opened resources on failed completion, construct the stream after authorization commits where appropriate and serve immutable verified artifacts with cancellation cleanup.

**Low · Hardening.** A download response can own an opened file stream before withContext's completion session fence succeeds; rejection leaves a response never consumed and may leave its descriptor open. Hashing before streaming also assumes the operator cannot mutate the opened file in place. This is a privileged filesystem/session-race exposure, not user path traversal.

**CURRENT STATUS:** Implemented and locally verified in v35; original audit evidence above is retained.

### 61: BUG P1-061: Failed staging files consume quota without a complete failure inventory

**FILES:** `server/portability.ts`, `packages/config/src/policies.ts`, `docs/SETUP.md`

**FIX:** Record bounded failure metadata and quarantine inventory, expose staff diagnostics and an owner-reviewed retention/pruning procedure. Do not automatically erase failed evidence or attempt restore.

**Medium · Defect.** Malformed/checksum-failing uploads correctly remain unverified and retained, but failure exits do not record the same indexed status/audit inventory as success. Partial files count toward file/storage caps, so repeated failed operator uploads can make staging unusable without a documented reviewed reclamation path.

**CURRENT STATUS:** Implemented and locally verified in v35; original audit evidence above is retained.

### 62: BUG P1-062: Paged own-data exports are not a single point-in-time snapshot

**FILES:** `server/own-data.ts`, `server/jobs.ts`, `packages/db/src/schema.ts`

**FIX:** Define the temporal guarantee explicitly; materialize bounded snapshot values or use revisioned state at a cutoff, and record that cutoff/revision in every part without holding a long serverless transaction.

**Low · Hardening.** Each export page reads in a later transaction; creation cutoff excludes newer rows but does not freeze mutable profile/cycle/payout state. One artifact can contain states from different moments. The existing cutoff label describes row creation, so this is a consistency improvement rather than proof of unauthorized export.

### 63: BUG P1-063: Drizzle table coverage does not describe all deployed constraints and defaults

**FILES:** `packages/db/src/schema.ts`, `packages/db/src/migrations`, `packages/db/drizzle`, `scripts/check-drizzle-coverage.mjs`

**FIX:** Reconcile representable DDL in Drizzle, document necessary trigger/RLS/infrastructure SQL exceptions and review generated changes against the deployed schema without rewriting applied checksums.

**Medium · Maintenance.** All 80 migrated application tables are represented, but manual DDL contains constraints/indexes/defaults not fully mirrored in ORM definitions, for example auth timestamp defaults and price-quote indexes. Table-name coverage is not complete schema equivalence; future generated migrations can obscure drift.

**CURRENT STATUS:** Implemented and locally verified in v44; original audit evidence above is retained.

### 64: BUG P1-064: Large tightly coupled services and untyped UI contracts make changes fragile

**FILES:** `server/api.ts`, `server/core.ts`, `server/jobs.ts`, `components/dashboard-app.tsx`, `components/native-portal.tsx`, `lib/api-client.ts`, `scripts/lint.mjs`

**FIX:** Extract typed transport/service contracts and small operation modules incrementally, add explicit package import boundaries and format touched code. Preserve transaction ownership and money algorithms rather than undertaking a broad rewrite.

**Low · Maintenance.** The large central route dispatcher, densely packed financial/admin modules and frequent any DTOs make cross-file invariants and error completeness hard to review. Existing lint is primarily pattern-based and does not establish strong package dependency boundaries.

### 65: BUG P1-065: Help search lacks the specified locale full-text and trigram ranking

**FILES:** `components/help-browser.tsx`, `server/api.ts`, `packages/db/src/schema.ts`, `packages/db/src/migrations`, `docs/PRD.md`

**FIX:** Add bounded public published-only search with locale indexes/ranking and retain cheap offline search of explicitly labelled saved articles.

**Medium · Requirement gap.** Help search loads a bounded client list and uses text matching; the Phase One PRD specifies locale-aware PostgreSQL full-text search, trigram fallback and exact-title/relevance/slug ranking. The current method is usable for a small catalog but does not implement that contract.

**CURRENT STATUS:** Implemented and locally verified in v44; original audit evidence above is retained.

### 66: BUG P1-066: Published help cache does not remove withdrawn or renamed saved articles

**FILES:** `components/help-browser.tsx`, `lib/public-data-cache.ts`

**FIX:** Reconcile the saved public article inventory after a complete successful locale fetch, retain TTL/size limits and label offline content with version/observation time.

**Low · Defect.** Successful online loads save the current articles but have no per-locale reconciliation/removal for previously cached slugs absent from the new published set. Offline reading can keep withdrawn content until TTL even after an online visit learned the new catalog.

**CURRENT STATUS:** Implemented and locally verified in v33; original audit evidence above is retained.

### 67: BUG P1-067: Solana custody reconciliation requires identical live response slots

**FILES:** `packages/chains/src/solana.ts`, `server/chain-recovery.ts`

**FIX:** Define a provable common accounting cutoff or advance/reconcile scan bounds to a jointly observed finalized point; accept only matching scope/evidence and keep pausing on actual contradiction.

**Medium · Defect.** getReconciledBalance uses finalized minContextSlot then requires both response slots to be identical. minContextSlot is a lower bound, not a request for historical state at one exact slot; independent healthy providers may answer different finalized slots, and results may include transfers after the run's declared throughHeight.

### 68: BUG P1-068: Production dependencies include unresolved security advisories

**FILES:** `package.json`, `package-lock.json`, `packages/chains/package.json`, `packages/db/package.json`

**FIX:** Review advisory reachability and update compatible patched dependency trees, especially Drizzle's fix at 0.45.2+, checking chain serialization/signatures and bundle bounds. Do not run a blind force-upgrade or remove safety checks.

**High · Maintenance.** npm audit --omit=dev reports 15 affected package nodes: eight high and seven moderate, no critical. Direct families include drizzle-orm identifier escaping, SPL-token's bigint-buffer, TronWeb's axios/validator, ethers' ws and web3.js's jayson/stream-json/uuid. This is dependency exposure; no exploit through this app was demonstrated.

### 69: BUG P1-069: Native quote expiry and cooldown use the web clock instead of database time

**FILES:** `server/crypto-incoming.ts`, `server/crypto-checkout.ts`, `docs/PRD.md`

**FIX:** Read one database timestamp in the quoting transaction for expiry and cooldown, and keep provider block times limited to their explicitly defined chain-evidence role.

**Medium · Defect.** Native quote creation uses Date.now for expiresAt and compares cooldown against Date.now, while prepare/submission acceptance uses PostgreSQL clock_timestamp. Clock skew between serverless instances and the database can create inconsistent quote validity or eligibility; the PRD makes database time authoritative for these decisions.

### 70: BUG P1-070: A valid multi-asset plan catalog fails after 100 active versions

**FILES:** `server/crypto-reads.ts`, `server/plans.ts`, `components/native-portal.tsx`

**FIX:** Paginate or group the catalog by plan and asset with stable bounded queries, or validate an explicit consistent aggregate version limit before activation; do not accept configuration that later makes public reads fail.

**Medium · Defect.** Plan administration permits up to 100 plans and multiple native assets, but nativeCatalog takes 101 active plan/asset versions and throws CONFIGURATION_INVALID above 100. A valid configuration with, for example, 13 plans active on eight registered assets can exceed this bound and make the entire public native catalog unavailable.

### 71: BUG P1-071: Financial archives can claim the current migration version while source migrations are pending

**FILES:** `packages/db/src/recovery-inventory.ts`, `packages/db/src/recovery-cli.ts`

**FIX:** Compare the complete applied migration name/checksum inventory against the current immutable SQL files before capturing or restoring financial records. Reject missing, extra or changed migrations.

**ACCEPTANCE:** A source with pending migrations rejects backup before creating an archive; forward-migrated source and exact restored target validate.

**STATUS:** [x] Implemented and locally verified in v31; package B; Medium priority.

**EVIDENCE:** During v31, a source with pending077/078 could produce a packet whose migration fingerprint described the current files. The new applied-inventory check rejects RECOVERY_VERSION_MISMATCH before output. Old evidence is retained; source migrations are applied forward only, then a fresh signed archive is verified.

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

## Positive controls and exclusions

Database administration checks current role/status, rather than trusting only session claims; status/role triggers revoke families. Scoped transactions use restricted roles and completion fences. Wallet proofs and monetary operations have immutable snapshots and replay bindings, despite the specific gaps above. SQL values use Drizzle/parameters; no application-level injectable identifier path was demonstrated. Integer and exact PostgreSQL numeric arithmetic are preferable to introducing Decimal.js unnecessarily.

All86 current migrated tables are represented in Drizzle. Supabase Data API grants/revokes are explicitly classified: this application uses PostgreSQL roles, not browser Data API access. The new Supabase grant requirement is **not** a reason to grant anon/authenticated/service_role access to financial/signer tables. Future fixes must include explicit least-privilege grants/revokes and RLS in the same forward migration that adds a table. Current grant coverage is retained; P1-063 concerns deeper schema congruence.

Public help drafts are filtered by RLS; they were not confirmed leaked. ioredis is installed. Next's actual API trace contains the SQL migration assets, so missing migration packaging is not a finding. Simulation account selection is deliberate isolated tooling, not a proven production impersonation vulnerability. Failed sources/archives/factors remain preserved.

No concrete application XSS, RCE, user-controlled path traversal or CSRF bypass was demonstrated. Existing React escaping, CSP nonce/security headers, fixed download paths, no-follow file opens, bounded upload parsing and owner-only restore boundaries were reviewed. SSRF hardening is scoped to deployment-controlled destinations. AI prompt injection, smart-contract reentrancy and specialized MEV routing do not apply to this product, which has no AI provider/custom payment contract/swaps.

Both web/signer readiness gates remain false. Earlier automatic approval review rejected enabling them because it could enable real testnet operations; this audit neither retries nor bypasses that decision. Mainnet remains prohibited. Preserved negative-history fixtures and failed staging evidence must not be reset to make results appear clean.

## Dependency and hosting references

The production dependency audit reports **15 affected package nodes**, not 15 separate exploits. Representative upstream advisories: [Drizzle identifier escaping](https://github.com/advisories/GHSA-gpj5-g38j-94v9), [bigint-buffer](https://github.com/advisories/GHSA-3gc7-fjrx-p6mg), [ws memory disclosure](https://github.com/advisories/GHSA-58qx-3vcg-4xpx), [ws memory denial of service](https://github.com/advisories/GHSA-96hv-2xvq-fx4p), [stream-json](https://github.com/advisories/GHSA-hqr4-qq8f-hg3x), [uuid](https://github.com/advisories/GHSA-w5hq-g745-h8pq). Axios and validator have multiple advisory records in the installed TronWeb tree; remediation must review the full resolved tree, not only direct packages.

[Vercel function limits](https://vercel.com/docs/functions/limitations) document the 4.5 MB request/response body limit relevant to P1-058. Local-function body limits are distinct from advertised archive size, execution duration and free-plan quota. Existing PRD hosting/commercial-use constraints remain; no claim of guaranteed free operation is made.

The complete remediation mapping, verification checks and three-round exit rule are in [custom-bugs-fix-plan_v44.md](custom-bugs-fix-plan_v44.md). Current handover: [LLM-HANDOVER_v44.md](LLM-HANDOVER_v44.md).


## Current v44 remediation ledger

The owner approved all Round One fixes, autonomous Rounds Two/Three and continued remediation, every Phase Two milestone, and final bug fixes before deferred testing. Continue without plan or milestone acceptance pauses. Use best recommendations, complete substantial verified batches, and merge only after BOTH push and pull-request CI succeed for the exact final head. Both financial readiness gates remain false; mainnet remains prohibited. CRON frequency and test-only issues remain excluded.

65 of 73 tracked items implemented and locally verified; 8 remain open. The initial Round One audit had70 findings; P1-071/P1-072/P1-073 were discovered and fixed during remediation. This is item accounting, not a weighted Phase One completion percentage. Phase Two has not started. No bug-free or hosted acceptance claim is made.

Implemented: P1-001, P1-002, P1-003, P1-004, P1-005, P1-006, P1-007, P1-008, P1-010, P1-011, P1-012, P1-013, P1-014, P1-015, P1-016, P1-017, P1-018, P1-019, P1-020, P1-021, P1-022, P1-023, P1-024, P1-025, P1-026, P1-027, P1-029, P1-030, P1-031, P1-032, P1-033, P1-034, P1-035, P1-036, P1-037, P1-040, P1-041, P1-042, P1-043, P1-044, P1-045, P1-046, P1-047, P1-048, P1-049, P1-050, P1-051, P1-052, P1-053, P1-054, P1-055, P1-056, P1-057, P1-058, P1-059, P1-060, P1-061, P1-062, P1-063, P1-065, P1-066, P1-068, P1-069, P1-070, P1-071, P1-072, P1-073.

Open: P1-009, P1-028, P1-038, P1-039, P1-064, P1-067.

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

P1-038 remains open. Standard driver transactions now have per-pool bounded FIFO admission (at most twice the pool size waiting,1.5-second expiry), transient-failure cooldown capped at2 seconds,3-second public/5-second other SQL statement limits and1.5-second lock limits. Connection establishment is capped at5 seconds. API route declarations expose a60-second platform ceiling; this is not a proven whole-callback cancellation guarantee. Closing the runtime drains pending admission. No economic mutation is automatically retried.

The named manual-safe-admission_v42 procedure passed against inactive gw_v40_staff: capacity/expiry without queued callback dispatch, a real row-lock timeout, future-admission cooldown and drain rejection. User and financial rows were unchanged. Typechecking passed. Required check:all, build and bundle checks passed. Final-head dual CI and merge are pending at this update. No schema or migration changes.

Earlier whole-pool deadline experiments failed with a postgres-js callback/closed-socket race. Automatic approval review rejected never-resolving callbacks (pool exhaustion) and manual reserved-connection transactions/whole-pool closure (service disruption). Those approaches were removed; failed evidence is retained privately under remediation-v42. Total callback/request and signer shutdown budgeting still require a safe solution; do not mark P1-038 complete. Counts remain60/72 with12 open. Rounds Two/Three and Phase Two have not started.


## V43 verified presentation and export batch

Implemented P1-049/P1-051/P1-053/P1-062 plus new P1-073. Public homepage/catalog/help now render safe localized data in initial HTML, with configured-origin canonicals/alternates, visible nonce-protected WebSite data, published mechanics/privacy and the exact configured terms version. Real308 compatibility/rename redirects run before streaming. Static internal article routes retain GitHub browser-upload-safe paths. Sitemaps advertise available published translations and omit private surfaces; the new admin page is noindex. Forward092 adds only the test privacy notice, preserving operator-written versions; it makes no financial/schema-extension change. Forward093 fixes the eight server-only identity policies for supported service scopes; browser roles, member and mainnet scopes remain denied. No financial table or grant changed. Public catalogs show an explicit unavailable state if fresh data cannot load.

One appearance provider owns stored locale/theme across all portals and their navigation/footer. Shared feature/role-aware navigation uses44px targets and a mobile safe-area bottom bar; anonymous testnet visitors get the public plan catalog. Product notification templates localize without rewriting records or changing exact amounts/networks; authored staff content remains verbatim. Application portals load separately from public initial HTML, reducing the homepage JavaScript budget.

Own-data exports disclose their actual creation-cutoff/live-values guarantee. Each bounded part freezes captured values and includes a temporal contract version and capture interval in JSON/CSV, including empty parts. Later-created records are excluded; later mutable values can appear. Retained v1 downloads gain explanatory metadata after original cipher/hash validation; unknown completion time stays null. Export format/CSV concerns and public DTOs now have separate typed modules; P1-064 remains open for the broader critical financial boundaries.

Named procedures passed: manual-public-http-final-r2 (real production French initial HTML, canonicals, published versions, real308,404, sitemap, draft-map/API exclusion, missing-translation alternates, anonymous native catalog and private noindex); manual-appearance-nav-final (real Chromium390px/1280px, shared French/dark preference persistence and switches,44px targets, no overflow and anonymous staff-link exclusion); manual-export-temporal-r3 (staged mutable changes after fixed cutoff, later-record exclusion, immutable parts, JSON/CSV empty/legacy metadata and escaping, all generated rows rolled back); manual-display-contracts (exact notification facts, free-form staff text, legacy unknown times). Earlier harness/build failures are retained, including a correctly rejected immutable-notification-body update. These are named isolated checks, not the deferred broad automated suites or hosted capacity acceptance.

Required check:all, production build and bundle reporting passed after forward093. Exact-head dual CI and merge remain pending. Latest measured homepage180.22KiB/200, API1.429MiB/3, all clients0.661MiB. Schema remains86 tables;94 migrations and73 retained inventories. The initial encrypted site-financial-final_v43 archive (93 migrations) exactly restored into fresh inactive gw_v43_restore. After P1-073, a new site-financial-final_v43-r2 archive (94 migrations) exactly restored into fresh inactive gw_v43_restore_r2 with schema/RLS/grants/history verified. The presentation source is gw_v43_presentation; the separate gw_v43_public search experiment is preserved and is not the release/archive source. Original sources, archives, keys and financial histories are intact; both implementation gates remain false.

Historical v43 limitation, superseded by explicit v44 approval: P1-065 was blocked specifically by automatic approval review. Search/index prototypes passed rollback checks in a fresh inactive clone, but two proposed production search/recovery changes were rejected due migration/restore compatibility risk and a requirement for explicit owner approval of that exact change. No extension/index/restore-validator change is in this active batch. Read custom-bugs-search-approval_v44.md for the concrete proposal. P1-038 remains partial/open. Historical v43 total65/73 implemented,8 open; Rounds Two/Three and Phase Two have not started. Continue all unaffected findings without milestone pauses.


## V44 approved search and schema congruence

Updated: **14 October 2026 at 02:25:24 PM WAT**. The owner explicitly approved the concrete P1-065 search/backup proposal after its restore compatibility risk was explained, and instructed: **“approve this change and any other necessary change. dont stop, keep going.”** This resolves the earlier search approval hold. Continue remaining fixes, Rounds Two/Three, Phase Two and final remediation without milestone acceptance pauses; retain disabled financial/mainnet gates.

Implemented P1-063/P1-065. Drizzle declarations now match all810 columns/defaults,261 check constraints and102 standalone indexes against the forward-migrated PostgreSQL catalog. Three missing UNIQUE declarations are included. Both deferred FK targets remain modeled; their deferred timing and22 constraint triggers are explicitly inventoried in [custom-bugs-schema-contract_v44.json](custom-bugs-schema-contract_v44.json). SQL migrations remain authoritative for policies, grants, functions, views and trigger behavior; Drizzle-generated SQL alone is not a deployable security schema. Required coverage checks reject a changed declaration or migration set until catalog congruence is re-verified. All86 table select/insert/delete query shapes remained unchanged, and the complete app typechecks. Original applied migration checksums are intact.

Forward094 adds pinned public pg_trgm1.6 and three published-only GIN indexes. Bounded EN/FR search uses exact-title/full-text/relevance/trigram/slug ordering; query values are bound, normalized and capped, results limited20, concurrent public cache flights limited32. Browser search is debounced/cancellable with explicit saved-text fallback/retry. Closed recovery dependencies retain pgcrypto-only packet validation and optional pg_trgm, rejecting unknown/duplicate/version/schema entries; existing incompatible extensions are rejected before provisioning. Signatures, archive checksums, empty-target checks and exact restored inventories remain mandatory.

Named rollback checks passed EN/FR stemming, exact priority, typo fallback, deterministic20 cap and draft exclusion. Real production HTTP passed DTO/input/cache checks. The new encrypted search-final_v44 archive exactly restored73 retained inventories into fresh inactive gw_v44_restore, with financial rows, schema/RLS/grants/history verified. Source gw_v44_search and restore remain inactive; original sources/archives/failed fixtures remain preserved. Schema86 tables/95 migrations. No signing/broadcast or deferred broad suite ran. Actual Chromium passed French ranked search, explicit offline saved-text fallback/retry, online recovery and rapid query replacement. Required check:all and production build passed. Bundle bounds: homepage180.34KiB/200; maximum API1.440MiB/3; clients0.661MiB. Both exact-final-head CI events and merge remain pending.

Current accounting: **67/73 implemented and locally verified;6 open**: P1-009/P1-028/P1-038/P1-039/P1-064/P1-067. Rounds Two/Three and Phase Two have not started. Keep progressing; do not interpret item accounting as a completion percentage.

Signed: **14 October 2026 at 02:28:27 PM WAT**.

v44
