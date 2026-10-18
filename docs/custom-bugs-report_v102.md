# Bug report — Rounds One/Two/Three v102

**Full product remains incomplete.** Earlier completion statements below refer to their named bug/transparency batches. Current work is tracked as C001–C017 in [status](PROJECT-STATUS_v102.md).

Updated: **18 October2026 (Africa/Lagos)**.

**Resumed by the owner on 16 October 2026.** Round One: **74 of 74 original findings implemented, locally verified and merged**. Round Two found and locally verified fixes for R2-004–006; local release checks passed; merged in PR52. Round Three also fixed R3-001; Phase Two implementation and eight local review fixes are in [PR53](https://github.com/nero1/onyiy/pull/53); GitHub records final CI/merge state. These counts are not a completion percentage or hosted acceptance.

Historical numbered migration paths below identify the original fixes in Git history. Fresh installations paste only `packages/db/fresh-install.sql`. Historical numbered files remain for installed-release compatibility; do not replay them on a fresh installation.

PR51 completed Round One and incidental R2-001–003. The v53 batch fixes the three fresh Round Two findings below; The same batch includes the Round Three recovery fix below; Phase Two transparency implementation/local review was completed in v54; full-product work remains open.

## Findings at a glance

- **P1-107:** readable account/case/role and shared balance-purpose labels implemented; actual EN/FR browser/API-value and financial-integrity checks passed.

- **P1-106:** simulation gift card/tile keyboard focus implemented; actual EN/FR keyboard, visible-focus and financial-integrity checks passed.

- **P1-104–105:** native wallet route feature/mode gates implemented; production simulation/testnet/mainnet routing and independent financial-integrity checks passed.

- **P1-103:** disabled staff-feature admin previews implemented; actual TOTP/role/flag API, production EN/FR browser and financial-integrity checks passed.

- **P1-102:** GIV dashboard retirement filter implemented; genuine-session page/feature/retention and original-source integrity checks passed.

- **P1-100–101:** readable bilingual moderation/profile notifications implemented; actual delivery, browser and integrity checks passed.

- **P1-099:** transparent priority-change member notices implemented; named local delivery, privacy, replay and browser checks passed.

- **P1-096–098:** account deletion age proofs, exact owned balance display and suspended publication opt-out implemented; named local verification passed (details below).

1. **P1-001 — Expired or dismissed native invoices prevent another checkout.** (High; defect) — Implemented; local checks passed.
2. **P1-002 — A successful wallet send followed by a failed submission can prompt a second payment.** (High; defect) — Implemented; local checks passed.
3. **P1-003 — Native TRX status observation rejects its own event index.** (High; defect) — Implemented; local checks passed.
4. **P1-004 — Signer reservations ignore tighter runtime payout limits.** (High; defect) — Implemented; local checks passed.
5. **P1-005 — Recovery binding distinguishes pooler and signer endpoints for the same database.** (High; defect) — Implemented; local checks passed.
6. **P1-006 — Recovery can journal the same transaction fees more than once.** (High; defect) — Implemented; local checks passed.
7. **P1-007 — Solana fee attribution treats other transfers as account setup cost.** (High; defect) — Implemented; local checks passed.
8. **P1-008 — Saved expired Solana or TRON attempts can indefinitely block a recovery scan.** (Medium; defect) — Implemented; local checks passed.
9. **P1-009 — Previous receiving addresses have no complete recovery monitoring inventory.** (High; requirement gap) — Implemented; local checks passed.
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
28. **P1-028 — Declared notification, terminal-job, ledger and audit retention is not implemented.** (Medium; requirement gap) — Implemented; local checks passed.
29. **P1-029 — Pending chain observation ignores poll policy and creates a new durable job each round.** (Medium; defect) — Implemented; local checks passed.
30. **P1-030 — Configured DLQ, backlog, lock-wait and quota alert thresholds have no complete alert path.** (Medium; requirement gap) — Implemented; local checks passed.
31. **P1-031 — Acknowledged or resolved alerts can still send queued reminders.** (Medium; defect) — Implemented; local checks passed.
32. **P1-032 — Old low-priority alert retries can consume the budget before a new critical alert.** (Medium; defect) — Implemented; local checks passed.
33. **P1-033 — A permanent alert delivery key does not bind an immutable payload.** (Medium; defect) — Implemented; local checks passed.
34. **P1-034 — Reopened alert escalation uses lifetime delivery count as the interval index.** (Low; defect) — Implemented; local checks passed.
35. **P1-035 — Request IDs do not correlate API, audit, job and error records.** (Medium; requirement gap) — Implemented; local checks passed.
36. **P1-036 — Expected failures become generic nonretryable errors and raw codes reach users.** (Medium; defect) — Implemented; local checks passed.
37. **P1-037 — The shared JSON byte cap has no elapsed read deadline.** (Medium; hardening) — Implemented; local checks passed.
38. **P1-038 — Ordinary database work lacks a complete query, queue and request time budget.** (Medium; hardening) — Implemented and locally verified in v46.
39. **P1-039 — Balances and reconciliation repeatedly aggregate full ledger history.** (Medium; requirement gap) — Implemented and locally verified in v47.
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
64. **P1-064 — Large tightly coupled services and untyped UI contracts make changes fragile.** (Low; maintenance) — Implemented and locally verified in v45.
65. **P1-065 — Help search lacks the specified locale full-text and trigram ranking.** (Medium; requirement gap) — Implemented and locally verified in v44.
66. **P1-066 — Published help cache does not remove withdrawn or renamed saved articles.** (Low; defect) — Implemented; local checks passed.
67. **P1-067 — Solana custody reconciliation requires identical live response slots.** (Medium; defect) — Implemented and locally verified in v45.
68. **P1-068 — Production dependencies include unresolved security advisories.** (High; maintenance) — Implemented; local checks passed.
69. **P1-069 — Native quote expiry and cooldown use the web clock instead of database time.** (Medium; defect) — Implemented; local checks passed.
70. **P1-070 — A valid multi-asset plan catalog fails after 100 active versions.** (Medium; defect) — Implemented; local checks passed.
71. **P1-071 — Financial archives can claim the current migration version while source migrations are pending.** (Medium; defect) — Implemented; local checks passed.
72. **P1-072 — Same-address native/token transfers can manufacture incoming principal.** (High; defect) — Implemented; local checks passed.
73. **P1-073 — Testnet identity and rate infrastructure remains simulation-only.** (High; requirement gap) — Implemented and locally verified in v43.
74. **P1-074 — TRON reconciliation accepts live balances beyond the declared scan cutoff.** (Medium; defect) — Implemented and locally verified in v45.

75. **P1-075 — Solana v1 transactions block receipt and recovery reads.** (High; defect) — Implemented; public baseline, recorded-data scanner and local financial regression pass; Merged in PR78 after both exact-head CI events passed.

76. **P1-076 — Receipt sharing defaults to simulation on native deployments.** (Medium; defect) — Implemented and locally verified; GitHub tracks final CI/merge status.
77. **P1-077 — Shared history uses raw units, testnet labels and incomplete send state.** (Medium; defect) — Implemented and locally verified; data/isolation and browser checks pass.
78. **P1-078 — Shared-page errors retain an old language or superseded scope.** (Low; defect) — Implemented and locally verified; GitHub tracks final CI/merge status.
79. **P1-079 — Offline language switching discards the loaded page.** (Medium; defect) — Implemented and locally verified; GitHub tracks final CI/merge status.
80. **P1-080 — Confirmed earnings recovery is missing from receipts and public payouts.** (Medium; defect) — Implemented and locally verified; GitHub tracks final CI/merge status.
81. **P1-081 — Recent wallet omits earnings recovery and lacks its action distinction.** (Medium; defect) — Implemented and locally verified; GitHub tracks final CI/merge status.
82. **P1-082 — Early OAuth callback failures retain transient state.** (Low; defect) — Implemented and locally verified; GitHub tracks final CI/merge status.
83. **P1-083 — Mainnet CAPTCHA ignores the shared default provider.** (High; defect) — Implemented and locally verified; GitHub tracks final CI/merge status.
84. **P1-084 — Members cannot reach older reports/appeals.** (Medium; defect) — Implemented and locally verified; GitHub tracks final CI/merge status.
85. **P1-085 — Private GETs use action quotas instead of read limits.** (Medium; defect) — Implemented and locally verified; GitHub tracks final CI/merge status.
86. **P1-086 — Account errors retain an old language/session scope.** (Low; defect) — Implemented and locally verified; GitHub tracks final CI/merge status.
87. **P1-087 — Other portals retain translated exception notices.** (Low; defect) — Implemented and locally verified; GitHub tracks final CI/merge status.
88. **P1-088 — Native wallet retains a recovered read error.** (Low; defect) — Implemented and locally verified; GitHub tracks final CI/merge status.
89. **P1-089 — Superseded recovery review stays unresolved.** (Low; defect) — Fixed, locally verified and merged in PR86.
90. **P1-090 — Copied loss review lacks a database-target guard.** (High; defect) — Fixed, locally verified and merged in PR87.
91. **P1-091 — Bounded scan requires an extra confirmation.** (Medium; defect) — Fixed; local boundary checks pass; full release evidence is tracked in status.
92. **P1-092 — Empty scan pages hide provider block-hash disagreement.** (High; defect) — Fixed; local cross-family checks pass; full release evidence is tracked in status.
93. **P1-093 — Plan read failures invent raw reauthentication errors.** (Medium; defect) — Fixed; baseline/corrected production browser and unchanged financial fingerprints pass; final CI/merge is tracked in GitHub.
94. **P1-094 — Completed portal notices retain the old language.** (Low; defect) — Bilingual copy retained for current-language rendering; source/compilation acceptance is tracked separately from every staff workflow.
95. **P1-095 — Notification retry retains its old read/page error.** (Low; defect) — Fixed; production EN/FR browser, restricted contracts and unchanged financial fingerprints pass; GitHub tracks final CI/merge.

## How to read this report

- The explanations below record the **original audit failures**, not claims that fixed defects remain present. Use the list above for current status.
- “Defect” means a source/contract failure; “requirement gap” means missing requested behavior; “hardening” means a conditional defensive improvement; “maintenance” means structural/dependency risk.
- Initial audit ratings (current → projected after fixes): money/recovery 5 → 8; security/privacy 6.5 → 8.5; performance 5 → 8; maintainability 6 → 8; product/accessibility/SEO 6 → 8, out of 10. These were qualitative judgments, not measured guarantees or updated release ratings.
- Original audit: 70 findings; four more were found during remediation. Three analysis passes were one audit round. CRON frequency and test-only issues were excluded.
- Paths are repository-relative. Fix instructions and acceptance checks are in [the fix plan](custom-bugs-fix-plan_v102.md).

## Original evidence by finding

### 1: BUG P1-001: Expired or dismissed native invoices prevent another checkout

**Files:** `server/crypto-incoming.ts`, `packages/db/src/schema.ts`, `components/native-portal.tsx`

**High · Defect.** quoteCryptoInvoice inserts a new quote without closing an earlier quoted invoice. crypto_invoice_open_idx permits only one quoted/submitted invoice per member/version; neither expiration nor dismissing the review screen changes that row. A new request key therefore encounters a uniqueness failure, and a quote tied to an old session cannot simply be prepared again.

### 2: BUG P1-002: A successful wallet send followed by a failed submission can prompt a second payment

**Files:** `components/native-portal.tsx`, `lib/native-wallet.ts`, `server/crypto-incoming.ts`

**High · Defect.** pay keeps the transaction hash only in a local variable and clears the payment only after /gifts/crypto/transaction succeeds. A transport/server failure leaves the approval action available; another click invokes the wallet transfer again. An identity change after the wallet returns also discards the hash.

### 3: BUG P1-003: Native TRX status observation rejects its own event index

**Files:** `packages/chains/src/tron.ts`, `server/crypto-expiry.ts`, `workers/signer/run.ts`

**High · Defect.** getTransactionStatus calls observe with index -1; the native TransferContract verifier requires index 0. A generated valid native transaction confirmed through verifyTransfer(index 0), while getTransactionStatus threw TRANSFER_NOT_FOUND. This blocks successful native TRX recovery/status paths.

### 4: BUG P1-004: Signer reservations ignore tighter runtime payout limits

**Files:** `workers/signer/store.ts`, `server/unallocated-refunds.ts`, `server/financial-config.ts`

**High · Defect.** SignerStore.claim reads SIGNER_HARD_PER_TX_USD and SIGNER_HARD_DAILY_PER_ASSET_USD for its reservations, rather than intersecting them with the live payout_limits policy. Web prechecks do not independently enforce every obligation kind, notably unallocated refunds; the daily runtime limit is not enforced by this signer calculation.

### 5: BUG P1-005: Recovery binding distinguishes pooler and signer endpoints for the same database

**Files:** `packages/db/src/binding-fingerprint.ts`, `packages/db/src/context.ts`, `workers/signer/store.ts`, `server/chain-recovery.ts`

**High · Defect.** The scope fingerprint includes connection host and port. Web and signer derive it from different URL bindings; transaction pooler port 6543 and session port 5432 generate different identities even for the same project/database. The synthetic comparison reproduced the mismatch. A valid web checkpoint can therefore fail the signer resume fence.

### 6: BUG P1-006: Recovery can journal the same transaction fees more than once

**Files:** `server/chain-recovery.ts`, `server/crypto-settlement.ts`, `packages/db/src/schema.ts`

**High · Defect.** Outflow resolution is unique by asset/hash/event, but network/setup journals use the resolution UUID. Several recovered events or asset views of one transaction can each post the full transaction fee; a known attempt and an additional unknown event can also overlap normal settlement gas accounting.

### 7: BUG P1-007: Solana fee attribution treats other transfers as account setup cost

**Files:** `packages/chains/src/solana.ts`, `server/chain-recovery.ts`

**High · Defect.** observe calculates total payer balance decrease minus the selected transfer amount, then calls everything above meta.fee accountSetupCost. For a transaction containing multiple native transfers, another recipient's principal becomes setup expense. Arbitrary recovered transactions are not restricted to the worker's single-transfer shape.

### 8: BUG P1-008: Saved expired Solana or TRON attempts can indefinitely block a recovery scan

**Files:** `server/chain-recovery.ts`, `server/crypto-expiry.ts`, `packages/chains/src/solana.ts`, `packages/chains/src/tron.ts`

**Medium · Defect.** The saved-lineage loop tries findTransferIndex and settleCryptoAttempt but does not invoke positive signed-expiry verification or select retained expiry evidence. An absent, positively expired transaction remains KNOWN_ATTEMPT_PENDING until a separate closure path is discovered and completed.

### 9: BUG P1-009: Previous receiving addresses have no complete recovery monitoring inventory

**Files:** `server/financial-config.ts`, `server/chain-recovery.ts`, `workers/signer/store.ts`, `docs/PRD.md`

**High · Requirement gap.** Address roles and scans use the active receiving treasury. The PRD requires monitoring prior versions until unresolved invoice exposure closes. Submitted old invoices have their own observation path, but unmatched funds at a previous receiving address are outside the active checkpoint scan.

**v51 result:** An immutable, trigger-maintained address inventory survives archival. Staff can page all addresses and checkpoint a known historical address. Scheduled monitoring advances a durable least-recently-attempted cursor through the complete historical set. Recovery aggregates all saved address witnesses at one canonical cutoff; missing evidence stays pending, and the database service/signer fence checks every address’s latest scan. Generated 40+60 custody, 104-address aggregation, expired-invoice backfill, access restrictions, EVM/SOL adapter checks and exact encrypted restore passed locally. No live-chain or hosted acceptance is claimed.

### 10: BUG P1-010: Pausing a plan rejects payments already committed under its frozen terms

**Files:** `server/core.ts`, `server/incoming.ts`, `server/crypto-incoming.ts`, `server/plans.ts`

**High · Defect.** Delayed admission ultimately calls sendGift, which requires the current plan to be active. A pause or retirement between submission and confirmation prevents the GIV admission and routes native funds into exception/refund handling instead of honoring an otherwise valid frozen invoice.

### 11: BUG P1-011: Accepted bootstrap destinations have no complete liability and payout support

**Files:** `packages/config/src/policies.ts`, `server/core.ts`, `server/crypto-business.ts`, `server/treasury-sweeps.ts`, `server/chain-recovery.ts`, `workers/signer/store.ts`

**High · Defect.** Configuration accepts platform/custom_bootstrap destinations and allocation creates bootstrap_<role>_payable balances. Business settlement supports developer/marketing purposes; signer, sweep and custody liability lists omit the additional bootstrap purposes. Accepted money can become payable without a valid settlement path or adequate surplus exclusion.

### 12: BUG P1-012: The signer's oldest fixed candidate batch can starve later payable work

**Files:** `workers/signer/store.ts`, `workers/signer/run.ts`

**Medium · Defect.** Candidate queries order by age and take 20 before per-item eligibility/recovery decisions. Twenty paused, mismatched, invalid-destination or still-pending items can repeatedly occupy the whole window, leaving later eligible obligations unseen.

### 13: BUG P1-013: Recovery pages have row bounds without a feasible total RPC/time budget

**Files:** `server/chain-recovery.ts`, `packages/chains/src/tron.ts`, `packages/chains/src/rpc.ts`, `app/api/v1/admin/crypto/scans/page/route.ts`

**High · Defect.** A five-block page can individually verify 100 events; TRON token scanning may inspect up to 1,000 unrelated transactions per block. At the configured RPC throttle, the page can exceed its HTTP/transaction budget. There is no durable within-block/event cursor to make an oversized page progress.

### 14: BUG P1-014: The generic scheduler client signs only simulation and leaves testnet jobs undrained

**Files:** `scripts/scheduler-tick.mjs`, `server/scheduler.ts`, `server/jobs.ts`, `server/financial-operations.ts`, `.github/workflows/scheduler.yml`

**High · Defect.** scheduler-tick hardcodes simulation in its HMAC canonical string, while the server validates the configured environment. The financial tick handles monitoring/business/alerts/cleanup but does not dispatch generic notification, export or chain-observation jobs. The supplied generic client therefore cannot provide this work on testnet.

### 15: BUG P1-015: The hosted deploy workflow cannot migrate the selected testnet binding

**Files:** `.github/workflows/ci-vercel.yml`, `scripts/validate-deployment.ts`, `packages/db/src/seed.ts`

**Medium · Requirement gap.** Hosted validation supports a selected testnet environment, but the migration/seed step forces APP_ENV=simulation, disabled signing and GIV payment settings. It conflicts with a database already bound to testnet and has no defined non-signing testnet migration/seed path.

### 16: BUG P1-016: Safe cancellation and unallocated-refund recovery are unreachable in the UI

**Files:** `components/native-portal.tsx`, `components/native-admin.tsx`, `server/crypto-payouts.ts`, `server/crypto-operational-recovery.ts`

**Medium · Defect.** NativePortal routes cancellation through financial(), which returns when execution_enabled is false, even though safe unsigned cancellation has a server path. NativeAdmin offers operational recovery for business/refund kinds but omits unallocated_refund.

### 17: BUG P1-017: Import and business operations use the generic staff rate policy

**Files:** `server/api.ts`, `server/rate-limits.ts`, `packages/config/src/policies.ts`, `xmanifest.json`

**Medium · Defect.** All /admin routes select staff before more specific operation families. The declared import_reset and business_settlement budgets are never selected, so expensive staging and settlement attempts receive the broader staff allowance.

### 18: BUG P1-018: Rate budgets fragment across raw resource paths

**Files:** `server/rate-limits.ts`, `next.config.ts`, `server/api.ts`

**Medium · Defect.** The limiter hashes Request.url.pathname directly, including resource IDs where the incoming URL retains them. Equivalent confirmation/cancellation/proof operations on different resource URLs get different counters instead of the intended user/IP operation budget, and produce extra database keys.

### 19: BUG P1-019: Public database reads and OAuth callbacks bypass explicit rate budgets

**Files:** `server/api.ts`, `server/auth-api.ts`, `server/google-auth.ts`, `server/public-reads.ts`

**Medium · Hardening.** Public routes dispatch before enforceRate, auth/session has no equivalent throttle, and finishGoogle can reach provider exchange without callback-specific rate enforcement. Cached public reads reduce work but misses and authentication reads still reach the database; this is an abuse/cost exposure, not a demonstrated account compromise.

### 20: BUG P1-020: A combined factor/IP bucket does not bound distributed MFA guesses

**Files:** `server/rate-limits.ts`, `server/auth.ts`, `server/auth-api.ts`, `packages/config/src/policies.ts`

**Medium · Hardening.** factor_ip_route produces one hash combining subject, IP and route. Attackers changing IP obtain separate allowances against the same factor/account. TOTP replay protection prevents reuse of a successful step but does not impose a shared guessing budget.

### 21: BUG P1-021: Wallet changes lack the PRD's fresh authentication and domain-bound challenge

**Files:** `server/api.ts`, `server/crypto-wallets.ts`, `packages/db/src/context.ts`, `docs/PRD.md`

**High · Defect.** Sensitive session/account checks and wallet ownership proof exist, but requiresWithdrawalProof is set only for withdrawal confirmations. Wallet challenge/proof can change a destination without fresh authentication, and the signed ownership statement lacks the configured web origin/domain.

### 22: BUG P1-022: Ordinary API reads can return data from the previous client identity

**Files:** `lib/api-client.ts`, `components/notification-inbox.tsx`, `components/dashboard-app.tsx`, `components/admin-panel.tsx`

**High · Defect.** api() does not reject a response when client owner/generation changes while fetch is in flight. A synthetic deferred response returned the former owner's private fixture after setClientSession switched accounts. Several child read handlers have no independent epoch check, allowing stale state to repopulate after clearing.

### 23: BUG P1-023: Concurrent browser tabs can revoke a valid refresh family

**Files:** `lib/api-client.ts`, `server/auth.ts`, `components/dashboard-app.tsx`

**Medium · Defect.** Refresh single-flight is module-local. Two tabs can submit the same current refresh cookie concurrently; the second observes a used refresh token and triggers the intended family-reuse revocation. This converts ordinary cross-tab concurrency into a security logout.

### 24: BUG P1-024: Secondary portals show login instead of using an available refresh session

**Files:** `components/native-portal.tsx`, `components/member-portal.tsx`, `components/account-portal.tsx`, `lib/auth-client.ts`, `components/dashboard-app.tsx`

**Medium · Defect.** Dashboard bootstrap handles auth/session.can_refresh, but native/member/account bootstrap simply accepts user:null. With an expired short access cookie and a valid refresh cookie, these pages present an unnecessary login.

### 25: BUG P1-025: Concurrent Google registrations can collide and fallback names violate configured lengths

**Files:** `server/google-auth.ts`, `server/auth.ts`, `packages/config/src/policies.ts`

**Medium · Defect.** Username allocation checks availability then inserts under a lock keyed by Google subject, not the chosen username. Different subjects with the same stem can race into a unique violation. The fallback member_ plus 12 hex characters is always 19 characters and can fail valid shorter/longer username policies.

### 26: BUG P1-026: Account deletion leaves private message content in notifications and job payloads

**Files:** `server/moderation.ts`, `server/jobs.ts`, `packages/db/src/schema.ts`, `packages/db/src/migrations/011_durable_notification_jobs.sql`

**Medium · Defect.** Deletion erases identity/factors and redacts reports/appeals, but does not redact delivered notification bodies or their immutable outbox/job copies. Free-text administrator messages can contain personal information indefinitely after deletion.

### 27: BUG P1-027: Expired authentication and rate records have no bounded cleanup lifecycle

**Files:** `server/maintenance.ts`, `server/financial-cleanup.ts`, `server/auth.ts`, `server/google-auth.ts`, `packages/db/src/schema.ts`

**Medium · Defect.** Current cleanup covers scheduler records and selected financial challenges, not expired OAuth flows, old refresh families/tokens, rate keys or retained TOTP replay rows. Routine logins and changing resources/IPs can grow these stores indefinitely.

### 28: BUG P1-028: Declared notification, terminal-job, ledger and audit retention is not implemented

**Files:** `server/maintenance.ts`, `server/jobs.ts`, `server/notifications.ts`, `packages/config/src/policies.ts`, `packages/db/src/migrations`

**Medium · Requirement gap.** Only selected ephemeral records are cleaned; job_terminal_days, notification_days, audit_hot_days and financial_archive_after_days have no corresponding complete archival process. Terminal jobs/outbox and full hot financial history accumulate despite the cheap-hosting retention contract.

### 29: BUG P1-029: Pending chain observation ignores poll policy and creates a new durable job each round

**Files:** `server/crypto-observer.ts`, `server/jobs.ts`, `packages/config/src/policies.ts`

**Medium · Defect.** Each pending observation enqueues a new round-specific outbox/job, up to the 2,880-round bound, without the configured first/later poll delay. Normal pending results are not failures, so failure backoff does not address this work and storage amplification.

### 30: BUG P1-030: Configured DLQ, backlog, lock-wait and quota alert thresholds have no complete alert path

**Files:** `server/financial-monitor.ts`, `server/financial-operations.ts`, `server/jobs.ts`, `packages/config/src/policies.ts`, `app/api/health/route.ts`

**Medium · Requirement gap.** Financial monitors cover several custody/signer conditions, and staff can read job counts. alert_policy backlog/dlq/lock_wait/quota/public-RPC controls are not wired into equivalent external alert conditions or a bounded operational health projection.

### 31: BUG P1-031: Acknowledged or resolved alerts can still send queued reminders

**Files:** `server/financial-alerts.ts`, `server/financial-operations.ts`

**Medium · Defect.** deliverFinancialAlert selects pending/failed/sending deliveries without filtering the parent alert status. A reminder queued before acknowledgement/resolution can still be retried and consume the shared daily HTTP budget.

### 32: BUG P1-032: Old low-priority alert retries can consume the budget before a new critical alert

**Files:** `server/financial-alerts.ts`, `server/financial-monitor.ts`

**Medium · Defect.** Delivery selection orders only by creation time. With the default small shared daily attempt budget, an older failing P2 delivery can take repeated slots while a fresh P1 condition waits behind it.

### 33: BUG P1-033: A permanent alert delivery key does not bind an immutable payload

**Files:** `server/financial-alerts.ts`, `packages/db/src/schema.ts`

**Medium · Defect.** Delivery rows retain the business key but dispatch reads the parent's current severity/safeDetails. Reopening the same condition can change those fields while an older failed/uncertain delivery remains. The same delivery key can then identify a different signed body, breaking receiver deduplication/ACK consistency.

### 34: BUG P1-034: Reopened alert escalation uses lifetime delivery count as the interval index

**Files:** `server/financial-alerts.ts`, `server/financial-operations.ts`

**Low · Defect.** Reopening correctly advances the permanent ordinal and schedules the first reminder interval, but enqueueFinancialReminders indexes subsequent intervals using the lifetime reminders count. A previously escalated condition therefore skips the early escalation steps on later occurrences.

### 35: BUG P1-035: Request IDs do not correlate API, audit, job and error records

**Files:** `server/api.ts`, `server/auth.ts`, `server/jobs.ts`, `server/scheduler.ts`, `server/worker-auth.ts`

**Medium · Requirement gap.** Responses generate new UUIDs but there is no shared validated request context/response header and no consistent propagation into jobs/audit or redacted failure logs. Catch blocks often discard the underlying operational context, making a reported private reference difficult to trace.

### 36: BUG P1-036: Expected failures become generic nonretryable errors and raw codes reach users

**Files:** `server/api.ts`, `lib/api-client.ts`, `lib/i18n.ts`, `components/native-portal.tsx`, `components/account-portal.tsx`, `server/crypto-prices.ts`

**Medium · Defect.** The error map omits several thrown domain codes, including withdrawal viability/price/fee cases; retryable is set only for RECONCILIATION_TIMEOUT. Portals often render ApiError.code instead of translated guidance. Provider/transient and permanent user errors are consequently indistinguishable.

### 37: BUG P1-037: The shared JSON byte cap has no elapsed read deadline

**Files:** `server/request-body.ts`, `server/api.ts`, `server/auth-api.ts`

**Medium · Hardening.** boundedJson enforces 64 KiB but waits indefinitely for reader.read and does not race a request-abort/read deadline. A synthetic silent stream stayed unsettled until supplied with data. Hosting may buffer or impose its own limits; the parser itself supplies none.

### 38: BUG P1-038: Ordinary database work lacks a complete query, queue and request time budget

**Files:** `packages/db/src/connection-options.ts`, `packages/db/src/context.ts`, `packages/db/src/index.ts`, `workers/signer/run.ts`

**Medium · Hardening.** The connection helper bounds connection establishment and pool size, but ordinary contexts do not set a universal statement/lock/transaction deadline or bounded pool admission. Metadata safety scans execute on every context; specialized reconciliation bounds do not cover other routes.

### 39: BUG P1-039: Balances and reconciliation repeatedly aggregate full ledger history

**Files:** `server/core.ts`, `server/reconcile.ts`, `server/crypto-reads.ts`, `server/public-statistics.ts`, `packages/db/src/migrations/007_scoped_runtime_access.sql`, `packages/db/src/migrations/005_ledger_integrity.sql`

**Medium · Requirement gap.** Balance views/helpers and several deferred integrity/reconciliation checks sum accumulated postings rather than maintain the PRD's sealed incremental counters. The existing full-query timeout fails safely, but larger histories can make ordinary reads and completion checks expensive or repeatedly time out.

### 40: BUG P1-040: Expired public statistics can create an advisory-lock request herd

**Files:** `server/public-statistics.ts`, `server/public-reads.ts`, `packages/db/src/context.ts`

**Medium · Hardening.** After cache expiry callers enter the database and wait on pg_advisory_xact_lock before rechecking the cached aggregate. Recalculation is serialized, but waiters still occupy connections/transactions; a cold burst need not be one inexpensive refresh.

### 41: BUG P1-041: RPC cache misses are not coalesced and throttle waiting is outside the timeout

**Files:** `packages/chains/src/rpc.ts`, `packages/chains/src/evm.ts`, `packages/chains/src/solana.ts`, `packages/chains/src/tron.ts`

**Medium · Hardening.** DualRpc.cached loads each simultaneous miss independently, while throttled requests wait before the fetch timer begins. At 3 requests/second a full 100-entry lane can add about 33 seconds before network timeout, and repeated network-identity checks add calls.

### 42: BUG P1-042: Deployment-controlled RPC, alert and cache URLs lack an explicit SSRF destination policy

**Files:** `packages/chains/src/rpc.ts`, `server/financial-alerts.ts`, `packages/cache/src/index.ts`, `packages/config/src/index.ts`

**Medium · Hardening.** HTTPS and credential checks exist for RPC/alerts, but private/link-local destination resolution and an approved-host policy are absent. These are deployment-owned URLs, not a demonstrated unauthenticated user-controlled SSRF entry point; configuration mistakes or compromised settings can still reach internal services.

### 43: BUG P1-043: Remote cache adapters lack equivalent timeout, response and lifecycle bounds

**Files:** `packages/cache/src/index.ts`, `packages/config/src/index.ts`

**Medium · Hardening.** UpstashRestCache.command uses fetch with no AbortSignal, redirect:error or bounded response reader. The injected Redis interface also lacks an explicit close/drain contract. A slow or oversized response can consume resources when this optional provider is enabled.

### 44: BUG P1-044: Global activity remains visible when feature_activity is disabled

**Files:** `components/public-information.tsx`, `packages/config/src/policies.ts`, `app/layout.tsx`

**Medium · Defect.** PublicInformation sets statements from activity_statements without checking feature_activity. It can render/rotate fixtures after staff disables the feature. Concurrent statistics requests can also repopulate a prior enabled snapshot after a later disabled manifest response.

### 45: BUG P1-045: There is no shared visible authenticated snapshot poll

**Files:** `components/dashboard-app.tsx`, `components/native-portal.tsx`, `components/member-portal.tsx`, `components/public-information.tsx`, `packages/config/src/policies.ts`

**Medium · Requirement gap.** Dashboard/native state refreshes on local actions or manual refresh, not the required shared client_poll_seconds policy. Gifts received from other users and worker confirmations can remain stale. Export polling continues every 15 seconds without hidden/offline suspension; independent public loads are not single-flight/jittered.

### 46: BUG P1-046: Notification load-more permanently stops at 100 items

**Files:** `components/notification-inbox.tsx`, `server/notifications.ts`

**Medium · Defect.** The inbox truncates merged rows to the first 100 and renders Load more only while rows.length<100. Server cursors may still identify older notifications, but the UI cannot reach them.

### 47: BUG P1-047: Staff lists hide older users, jobs and recovery cases without search or cursors

**Files:** `server/moderation.ts`, `server/financial-operations.ts`, `server/chain-recovery.ts`, `components/account-portal.tsx`, `components/admin-panel.tsx`, `components/chain-recovery-admin.tsx`

**Medium · Requirement gap.** Staff user/case and recovery lists take fixed first/latest windows; the admin job UI displays its initial page without a complete continuation flow. Older unresolved cases or a member beyond the initial user cap can become unreachable even though the records remain valid. Native obligation list continuation already exists; this finding concerns the other capped lists.

### 48: BUG P1-048: Latest-history caps can omit older active cycles and pending withdrawals

**Files:** `server/api.ts`, `server/crypto-reads.ts`, `components/dashboard-app.tsx`, `components/native-portal.tsx`

**Medium · Defect.** Dashboard/native queries take recent cycles/withdrawals across statuses with small fixed windows. Newer completed history can push an older active cycle or long-held obligation out of the operational screen, although some historical pages can still find it.

### 49: BUG P1-049: Public catalog and help lack the Phase One SEO rendering and metadata contract

**Files:** `app/page.tsx`, `app/gifts/page.tsx`, `app/help/page.tsx`, `app/layout.tsx`, `components/help-browser.tsx`, `next.config.ts`

**Medium · Requirement gap.** Public content is loaded mainly in client components, leaving initial HTML without the meaningful plan/help article body. Canonical configured origin, locale alternates, sitemap/robots, legal/How It Works routes and actual permanent help redirects are incomplete; client history replacement is not HTTP 308.

### 50: BUG P1-050: Several private portals lack noindex metadata

**Files:** `app/points/page.tsx`, `app/referrals/page.tsx`, `app/notifications/page.tsx`, `app/share/page.tsx`, `app/settings/account/page.tsx`, `app/settings/data/page.tsx`, `app/moderation/page.tsx`

**Low · Requirement gap.** Wallet/recovery pages have noindex handling, but several member/settings/moderation routes inherit public root metadata. Anonymous login shells can be indexed contrary to the PRD; this is not evidence that authenticated private data was indexed.

### 51: BUG P1-051: Stored locale and product copy are not consistently applied across portals

**Files:** `components/native-portal.tsx`, `components/member-portal.tsx`, `components/account-portal.tsx`, `components/notification-inbox.tsx`, `lib/i18n.ts`, `app/layout.tsx`

**Medium · Defect.** Secondary portals initialize English instead of applying the stored user/default locale/theme consistently. Notification titles replace underscores in English keys and raw errors remain untranslated; configured product copy/domain/tagline do not consistently drive headings and metadata.

### 52: BUG P1-052: Dark-mode primary button text fails normal-text contrast

**Files:** `app/globals.css`

**Medium · Defect.** White text on the dark accent #9b86ff measures 2.90:1, below WCAG AA's 4.5:1 normal-text requirement. Existing keyboard focus and reduced-motion controls do not correct this contrast failure.

### 53: BUG P1-053: Mobile navigation and the testnet home omit required product surfaces

**Files:** `components/native-portal.tsx`, `components/dashboard-app.tsx`, `app/globals.css`, `app/page.tsx`, `app/manifest.ts`

**Medium · Requirement gap.** Navigation remains a wrapping top menu instead of the PRD's fixed mobile bottom destinations with staff entries and safe areas. Testnet home selects NativePortal, whose payment-oriented authenticated view does not provide the complete anonymous three-plan/mechanics presentation and integrated member navigation offered by the simulation product.

### 54: BUG P1-054: The native wallet summary omits held and withdrawn/net-income totals

**Files:** `components/native-portal.tsx`, `server/crypto-reads.ts`, `docs/PRD.md`

**Medium · Requirement gap.** The native portal emphasizes available value but does not render the full required available/held/withdrawn separation and net-income summary, even where the DTO already provides held value. Users must infer reserved value from individual requests.

### 55: BUG P1-055: Closed historical exceptions can prevent plan editing forever

**Files:** `server/plans.ts`, `server/incoming.ts`, `server/crypto-refunds.ts`

**Medium · Defect.** noOutstanding treats every exception invoice as an outstanding obligation. Refund closure can leave the immutable invoice classified exception even after refundable value is exhausted and linked liabilities are terminal, so a drained plan remains uneditable.

### 56: BUG P1-056: Native activation ignores the configured fixed-token pricing mode

**Files:** `server/crypto-provisioning.ts`, `server/plans.ts`, `packages/config/src/index.ts`

**Medium · Defect.** Native activation always finds a fresh price and converts the plan's USD reference into base units, without honoring plan_config.pricing_mode=fixed_token and amount_base_units. Configuration accepts a pricing choice that does not determine activated native economics.

### 57: BUG P1-057: Accepted provider and finality selectors have no matching implementation

**Files:** `packages/config/src/index.ts`, `packages/chains/src/registry.ts`, `packages/chains/src/evm.ts`, `server/crypto-prices.ts`

**Medium · Defect.** Configuration accepts coinmarketcap although the implemented price ingress is manual_signed; registry finality can accept solidified for an EVM asset while the EVM adapter treats the non-depth branch as finalized. Valid-looking settings can therefore select unavailable or different behavior.

### 58: BUG P1-058: Advertised single-request archive uploads exceed the Vercel function body limit

**Files:** `server/portability.ts`, `components/native-admin.tsx`, `packages/config/src/policies.ts`, `docs/SETUP.md`

**Medium · Defect.** The portal accepts/configures uploads up to 50 MiB through one function request, whereas Vercel's documented function request-body limit is 4.5 MB. Requests above the platform cap never reach the application's otherwise bounded staging reader.

### 59: BUG P1-059: Filesystem archive staging is not durable or consistently reachable across serverless instances

**Files:** `server/portability.ts`, `docs/SETUP.md`, `docs/HOW-IT-WORKS.md`

**Medium · Requirement gap.** SITE_BACKUP_FILE and staging files are local filesystem paths. On Vercel, writable temporary files are instance-local and ephemeral; a staging_id does not provide a durable owner retrieval/validation path across instances. This is a hosting mismatch, not a defect in the separately verified owner CLI backups.

### 60: BUG P1-060: Archive stream creation precedes the final session fence and permits a file-lifecycle race

**Files:** `server/portability.ts`, `server/api.ts`, `packages/db/src/context.ts`

**Low · Hardening.** A download response can own an opened file stream before withContext's completion session fence succeeds; rejection leaves a response never consumed and may leave its descriptor open. Hashing before streaming also assumes the operator cannot mutate the opened file in place. This is a privileged filesystem/session-race exposure, not user path traversal.

### 61: BUG P1-061: Failed staging files consume quota without a complete failure inventory

**Files:** `server/portability.ts`, `packages/config/src/policies.ts`, `docs/SETUP.md`

**Medium · Defect.** Malformed/checksum-failing uploads correctly remain unverified and retained, but failure exits do not record the same indexed status/audit inventory as success. Partial files count toward file/storage caps, so repeated failed operator uploads can make staging unusable without a documented reviewed reclamation path.

### 62: BUG P1-062: Paged own-data exports are not a single point-in-time snapshot

**Files:** `server/own-data.ts`, `server/jobs.ts`, `packages/db/src/schema.ts`

**Low · Hardening.** Each export page reads in a later transaction; creation cutoff excludes newer rows but does not freeze mutable profile/cycle/payout state. One artifact can contain states from different moments. The existing cutoff label describes row creation, so this is a consistency improvement rather than proof of unauthorized export.

### 63: BUG P1-063: Drizzle table coverage does not describe all deployed constraints and defaults

**Files:** `packages/db/src/schema.ts`, `packages/db/src/migrations`, `packages/db/drizzle`, `scripts/check-drizzle-coverage.mjs`

**Medium · Maintenance.** All 80 migrated application tables are represented, but manual DDL contains constraints/indexes/defaults not fully mirrored in ORM definitions, for example auth timestamp defaults and price-quote indexes. Table-name coverage is not complete schema equivalence; future generated migrations can obscure drift.

### 64: BUG P1-064: Large tightly coupled services and untyped UI contracts make changes fragile

**Files:** `server/api.ts`, `server/core.ts`, `server/jobs.ts`, `components/dashboard-app.tsx`, `components/native-portal.tsx`, `lib/api-client.ts`, `scripts/lint.mjs`

**Low · Maintenance.** The large central route dispatcher, densely packed financial/admin modules and frequent any DTOs make cross-file invariants and error completeness hard to review. Existing lint is primarily pattern-based and does not establish strong package dependency boundaries.

### 65: BUG P1-065: Help search lacks the specified locale full-text and trigram ranking

**Files:** `components/help-browser.tsx`, `server/api.ts`, `packages/db/src/schema.ts`, `packages/db/src/migrations`, `docs/PRD.md`

**Medium · Requirement gap.** Help search loads a bounded client list and uses text matching; the Phase One PRD specifies locale-aware PostgreSQL full-text search, trigram fallback and exact-title/relevance/slug ranking. The current method is usable for a small catalog but does not implement that contract.

### 66: BUG P1-066: Published help cache does not remove withdrawn or renamed saved articles

**Files:** `components/help-browser.tsx`, `lib/public-data-cache.ts`

**Low · Defect.** Successful online loads save the current articles but have no per-locale reconciliation/removal for previously cached slugs absent from the new published set. Offline reading can keep withdrawn content until TTL even after an online visit learned the new catalog.

### 67: BUG P1-067: Solana custody reconciliation requires identical live response slots

**Files:** `packages/chains/src/solana.ts`, `server/chain-recovery.ts`

**Medium · Defect.** getReconciledBalance uses finalized minContextSlot then requires both response slots to be identical. minContextSlot is a lower bound, not a request for historical state at one exact slot; independent healthy providers may answer different finalized slots, and results may include transfers after the run's declared throughHeight.

### 68: BUG P1-068: Production dependencies include unresolved security advisories

**Files:** `package.json`, `package-lock.json`, `packages/chains/package.json`, `packages/db/package.json`

**High · Maintenance.** npm audit --omit=dev reports 15 affected package nodes: eight high and seven moderate, no critical. Direct families include drizzle-orm identifier escaping, SPL-token's bigint-buffer, TronWeb's axios/validator, ethers' ws and web3.js's jayson/stream-json/uuid. This is dependency exposure; no exploit through this app was demonstrated.

### 69: BUG P1-069: Native quote expiry and cooldown use the web clock instead of database time

**Files:** `server/crypto-incoming.ts`, `server/crypto-checkout.ts`, `docs/PRD.md`

**Medium · Defect.** Native quote creation uses Date.now for expiresAt and compares cooldown against Date.now, while prepare/submission acceptance uses PostgreSQL clock_timestamp. Clock skew between serverless instances and the database can create inconsistent quote validity or eligibility; the PRD makes database time authoritative for these decisions.

### 70: BUG P1-070: A valid multi-asset plan catalog fails after 100 active versions

**Files:** `server/crypto-reads.ts`, `server/plans.ts`, `components/native-portal.tsx`

**Medium · Defect.** Plan administration permits up to 100 plans and multiple native assets, but nativeCatalog takes 101 active plan/asset versions and throws CONFIGURATION_INVALID above 100. A valid configuration with, for example, 13 plans active on eight registered assets can exceed this bound and make the entire public native catalog unavailable.

### 71: BUG P1-071: Financial archives can claim the current migration version while source migrations are pending

**Files:** `packages/db/src/recovery-inventory.ts`, `packages/db/src/recovery-cli.ts`

**EVIDENCE:** During v31, a source with pending077/078 could produce a packet whose migration fingerprint described the current files. The new applied-inventory check rejects RECOVERY_VERSION_MISMATCH before output. Old evidence is retained; source migrations are applied forward only, then a fresh signed archive is verified.

### 72: BUG P1-072: Same-address native/token transfers can manufacture incoming principal

**Files:** `packages/chains/src/evm.ts`, `packages/chains/src/solana.ts`, `packages/chains/src/tron.ts`, `server/crypto-incoming.ts`, `server/crypto-payouts.ts`, `server/crypto-settlement.ts`, `server/native-funding.ts`

**EVIDENCE:** Generated two-provider EVM contracts confirmed native and ERC20 self-transfers with amount7 despite no incoming movement. The adapter equality fence now rejects that path before any ledger write. No real funding or broadcast occurred.

### 73: BUG P1-073: Testnet identity and rate infrastructure remains simulation-only

**Files:** `packages/db/src/migrations/018_identity_sessions.sql` (preserved), `packages/db/src/migrations/093_supported_identity_service_scopes.sql`, `server/rate-limits.ts`, `server/auth.ts`, `server/google-auth.ts`.

**EVIDENCE:** A real testnet production process failed public manifest/native catalog reads with42501 because cache-miss admission could not insert its rate record. Forward018 identity policies still admitted only gw.environment=simulation, covering eight identity/session/OAuth/rate tables; verified testnet authentication would fail similarly. Simulation-only fixtures hid this requirement gap.

### 74: BUG P1-074: TRON reconciliation accepts live balances beyond the declared scan cutoff

**Files:** `packages/chains/src/tron.ts`, `server/chain-recovery.ts`, `packages/db/src/migrations/095_recovery_balance_cutoff_witness.sql`

**Medium · Defect.** The original implementation checks matching provider tips and balances but only requires each tip to be at least the requested height. Two matching later live responses could be compared with an earlier recovery scan, incorporating transfers outside the declared range.

## Evidence and compatibility

- Local verification and merged implementation do not prove hosted Google, Upstash, RPC, alert, load, mobile or live-chain acceptance. No broad automated regression suite was added.
- P1-065 search/recovery scope was explicitly approved by the owner on 14 October 2026 at 02:25:24 PM WAT after compatibility risks were explained. It is implemented; there is no pending search approval. Published-only EN/FR full-text/trigram search and closed optional `pg_trgm` archive dependencies retain signature, checksum and exact-restore checks.
- [PR46](https://github.com/nero1/onyiy/pull/46) completed P1-039 ledger counters. [PR47](https://github.com/nero1/onyiy/pull/47) consolidated the fresh schema; neither closed P1-009/P1-028 nor started Phase Two.
- Detailed prior evidence remains in Git history and private retained fixtures. Never delete, reset or rewrite source financial records, signed bytes, failed fixtures, original archives or keys as cleanup.

Signed: **16 October 2026 at 09:21:01 PM WAT**.

## Retention and follow-up findings

- **P1-028 implemented/local checks passed:** notifications expire; only old completed expendable job/outbox payloads compact. Permanent keys, unresolved work and financial payloads remain. Same-database monthly partitions freeze ledger postings, network scan pages and audit events; bounded checksum and independent verification passes precede archived status. Journals/events remain global identity registries. No financial deletion; archives still consume database quota.
- **R2-001 fixed/local checks passed:** column grants and partition bounds/indexes enter the security fingerprint. Signed schema contract v2 rejects older packets before touching the target. Existing signatures are never rewritten.
- **R2-002 fixed/local checks passed:** real PostgreSQL lock timeout `55P03` is transient, preserving retry eligibility instead of marking work permanently failed.
- **R2-003 fixed/local checks passed:** a real timeout opens admission cooldown; failure recording now waits once (at most two seconds), respects the remaining execution budget and rechecks job/run leases before retrying. Immediate durable retry passed on a fresh fixture.

Evidence and remaining release checks: [current status](PROJECT-STATUS_v102.md). Original finding descriptions and acceptance conditions remain above.

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

**P2-B001 — Queue revisions omit administrative entry changes.** Profile preview validation could miss a priority/bootstrap edit because only selected gift paths advanced the partition revision. SQL004 now increments it on every entry insertion/change and bounds it to an exact JavaScript integer. A fresh fixture reproduced stale-priority preview rejection while retaining actual balances/tickets. Phase Two implementation/local verification is complete; exact-head CI/merge is tracked in see [status](PROJECT-STATUS_v102.md).



### Additional Phase Two review fixes

- **P2-B002:** Admin screen preview called an internal rank function without permission. Count the admin-visible waiting priority rows; keep the internal routine private.
- **P2-B003:** Historical-price validation over-escaped the decimal separator. Use an unambiguous SQL decimal pattern, guard numeric casts, and retain asset-only output when no trustworthy historical rate exists.
- **P2-B004:** A cached catalogue could show old plan disclosures beside a newer profile. Hide mismatched rows until refreshed; authoritative payment validation still rejects stale quotes.
- Final review also rejects test/demo profile selection in a future mainnet context and preserves actual paragraph breaks in changed consent text. No mainnet runtime is enabled.

- **P2-B005:** Recovery paging truncated PostgreSQL microseconds through JavaScript dates. Read timestamp fields as exact UTC PostgreSQL strings for both keyset cursors and row fingerprints. Actual encrypted backup, empty-target restore and independent verification passed with83 retained tables. Signed inventory contract3 requires matching historical code for older packets; original signatures stay intact.
- **P2-B006:** A type import preceded the native-wallet client directive. Move the directive to the first statement; production compilation now passes that boundary.

- **P2-B007:** Raw SQL passed to the ORM `exists` helper omitted subquery parentheses in the future real-event path. Use explicit closed `EXISTS(...)` expressions. The rollback-only owner contract now executes every feed query, proves opt-in/withdrawal and anonymous output, and checks historical-price validation without enabling mainnet or sending funds.

- **P2-B008:** Receipt masking depended on a potentially stale/unavailable profile, and changing language during a publication save could leave controls busy. Receipt images always mask identity; publication scope resets controls and prevents an old request from releasing a newer request’s lock.


## Current completion and delivery

Current C001–C017 scope, release evidence and remaining acceptance are maintained in [status](PROJECT-STATUS_v102.md) and [handover](LLM-HANDOVER_v102.md). The detailed v55–v79 delivery chronology remains in [the merged v79 record](https://github.com/nero1/onyiy/blob/61adf9375e0c534cad9e52d841df31702d61677b/docs/custom-bugs-report_v79.md). Original numbered findings and Round Two/Three/Phase Two review details above remain unchanged.

### P1-075 — Solana v1 reads

Merged in PR78 after exact-head push39090744721 / PR39090751758 passed. Integer maximum1 is shared by adapter/scanner receipt, block, event and expiry reads. Public -32015 reproduction, recorded public-data bounded-scan regression, strict local SPL account-setup/native SOL expiry and required release checks pass. No signing/schema change or live dual-provider acceptance is inferred.

### P1-076 — Receipt mode default

Shared receipt pages defaulted to simulation on mainnet despite settled native payouts. Initialize from authenticated environment; preserve explicit historical selection and correct PNG environment/asset/privacy labels. Actual production-browser baseline reproduced the defect.

### P1-077 — History currency and send state

History displayed unformatted base units, used testnet-only native labels and omitted recorded send progress/hash. Add bounded display metadata and render exact currency/network/status, with original private/export fields preserved. Explicitly qualified correlated IDs prevent single-table Drizzle queries from accidentally referring to an attempt’s own ID. Restricted-role ETH/GIV/isolation/unchanged-data checks and retained-pending joined/shared reads pass.

### P1-078 — Shared-page error language/scope

Error strings captured an old locale and initial failures exposed an internal code. Keep ephemeral error objects, localize during render, clear on identity change and ignore superseded read failures. A production-browser offline baseline reproduces the old-language notice; localized recovery checks pass as recorded in status.

### P1-079 — Offline language navigation

Changing language while disconnected attempted server navigation and lost the loaded private view. Use Next’s supported native History API for offline locale URL changes while retaining online server navigation. No private response caching or queued actions are introduced. Final production-browser checks pass for the loaded history, translated failure and reconnection.

v82

### P1-080 — Settled earnings recovery

Admin-reviewed recovery pays an existing member earnings balance to the original verified wallet, but receipt/activity/statistic queries accepted only ordinary withdrawal rows. Include settled `recovery` alongside `withdrawal`, restricted to `available_payable`; retain opt-in, real-member, historical-price, confirmed-settlement and reorg checks. Refunds, business settlements and sweeps remain excluded. `product-audit-v81/eth-support-r1` reproduces the omission using the actual quote, wallet signature, encrypted worker and separate authenticated settlement. `recovery-earnings-reads-r1` verifies exact receipt/hash, once-only historical USD1.65 totals and opt-in/revocation with unchanged financial hashes. No schema change.

### P1-081 — Recent wallet recovery visibility

The recent native wallet list excluded admin-reviewed earnings recovery even after settlement, while full history retained it. Include withdrawal/recovery from `available_payable`, expose the kind and label it in EN/FR. Recovery rows remain read-only in the ordinary member actions; cancellation/requote still follows its reviewed support path. `product-audit-v81/recovery-wallet-baseline-r1` reproduces the omission; `recovery-wallet-reads-r1` verifies its exact saved amount/hash with unchanged financial records. No schema change.

### P1-082 — OAuth callback error cleanup

Rate limiting and configuration errors occur before the normal Google callback redirect/cleanup. The final API response now expires only `gw_oauth_state` on failed GET callbacks, retaining the original status/body and session cookies. Cleanup uses the request protocol so broken origin configuration cannot mask the original error. `auth-callback-v84/limited-callback-baseline-r1` reproduces the missing429 cleanup. `limited-callback-fixed-r2` verifies invalid-state302, rate-limit429, configuration503, secure/HttpOnly/path attributes and unrelated-route isolation. It uses generated settings and makes no Google token request or financial mutation.

### P1-083 — Mainnet CAPTCHA provider default

SETUP correctly leaves provider overrides unset so `APP_ENV` supplies matching defaults. Configuration selected Turnstile for mainnet, but bot-check independently selected prohibited dummy, blocking required consent checks. Use `runtimeProviders().CAPTCHA_PROVIDER` as the single default source. `auth-callback-v84/captcha-default-baseline-r1` reproduces the failure; `captcha-default-fixed-r1` verifies mainnet Turnstile challenge creation without a dummy token, explicit dummy rejection and explicit none. `captcha-simulation-regression-r2` preserves simulation dummy proof/generation/replay behavior. Generated settings only; real Cloudflare/device acceptance remains open.

### P1-084 — Own-case pagination

The account view returned only the newest100 reports/appeals, with no cursor or member load-more controls; older resolved reports could not be reached to appeal. Add bounded independent report/appeal pages with encrypted account/collection/filter-bound cursors, retaining full timestamp precision and stable ID tie-breakers. Member predicates still restrict reports to actor/target and appeals to their author; staff routes/permissions stay separate. The member controls load each collection independently and guard superseded read failures. `member-cases-v85/baseline-r1` reproduces101 reports with no way to reach the oldest; `pagination-r1/r3` verify all IDs, tied microsecond timestamps, cursor isolation, unrelated-case exclusion and older-case token access. No financial/schema change.

### P1-085 — Private read rate classification

Own report/appeal reads used the five-per-hour report-action policy, blocking ordinary refresh/pagination despite the configured120-per-minute read policy. Classify nonstaff authenticated GETs as reads before write-action categories; staff and mutation policies remain. `member-cases-v85/read-quota-baseline-r1` reproduces429 on the sixth authenticated own-report read. `read-quota-fixed-r1` verifies six successful reads while the sixth CSRF-protected report creation remains429. Method/route counters remain separate; opening a report view did not consume the POST counter. No financial change.

### P1-086 — Account error language and scope

Account/moderation errors were stored as already-translated text; an offline language change kept the old language, and initial failures could show a raw code. Retain ephemeral error values and translate at render time. Clear failures on identity changes; reject superseded page/bootstrap/action results while still loading public bootstrap data. `member-cases-v85/browser-language-baseline-r2` reproduces French error text after switching to English offline. `browser-language-fixed-r1` verifies translation, retained case data and completed reconnection refresh in production Chromium390px; final build/check-all/bundle pass. No private responses are cached offline and no mutations are queued.

### P1-087 — Shared operation notice language

The native wallet reproduced the same frozen-language exception pattern across other portal components. Use an ephemeral localized-notice hook in15 components; the simulation dashboard renders stored exceptions and known notice keys in its current language, including its loading fallback. Native proof/payment status copy also follows current language. Requests, guards and financial state are unchanged. `notices-v86/native-baseline-r1` reproduces French text after an offline English switch; simulation/native production browser procedures verify the fix. This is sampled browser acceptance plus source-wide adoption, not physical testing of every staff workflow.

### P1-088 — Recovered native read errors

A successful owned-portfolio read did not clear an earlier read error. Keep read errors separate from operation notices: a fresh owned response clears only read errors; identity/new operations clear their scoped state. Payment/proof warnings remain visible across ordinary refreshes. The initial native recovery procedure is retained, including transient database deadline errors; `notices-v86/native-fixed-r2` observes successful portfolio responses and verifies recovery plus operation-warning retention; financial fingerprints remain unchanged. No monetary request is queued or retried.

### P1-089 — Superseded recovery reviews remain unresolved

A retained restored ETH fixture reproduces an old reviewed scan in the Unresolved list after a later full scan reconciles the same checkpoint. Exclude it only when a later reconciled scan has the same checkpoint/database binding and covers at least its height. Preserve raw history, unresolved incoming liabilities and all financial fences. Restricted-role `post-backup-v87/recovery-current-fixed-r1` verifies current/history separation on actual restored data; `recovery-current-boundaries-r1` uses a retained fresh clone to verify newer, insufficient-height and other-binding reviews remain current; the original failing procedure remains retained.

### P1-090 — Loss review lacks the recovery target guard

On a retained fresh clone, a copied unresolved loss review reached provider verification (`RPC_UNAVAILABLE`) instead of rejecting the source database binding. Validate the run binding before confirmation/replay/provider access and validate the checkpoint binding before proof verification. A changed database must register a fresh checkpoint and rescan; never rewrite copied evidence. `post-backup-v87/loss-binding-baseline-r1` retains the reproduction; `loss-binding-fixed-r1` rejects with `RECOVERY_TARGET_MISMATCH`. `loss-binding-valid-replay-r1` preserves exact replay and changed-body conflict on the original target. Independent source/target accounting checks remain unchanged. No schema/archive change.

**Post-merge recovery regression:** `post-backup-v87/eth-unknown-r4` passes the full fresh restore, denies wrong confirmation/missing canonical proof without accounting entries, then reconciles and resumes one newly approved withdrawal. `integrity-r4` independently verifies balances/attempts/loss/liability. Failed r3 is retained; its invocation lacked the generated transport loader and stopped at alert setup. No new defect number is assigned to a fixture invocation mistake.

### P1-091 — Depth-mode scan rejects an accepted finalized cutoff

Canonical verification counts the block itself, but bounded scanning required one extra confirmation. At BNB height146/tip160/depth15, verification accepted while scanning rejected. Use the same `height + depth - 1` rule, retaining both-provider/network checks. Named baseline/fixed boundary procedures reproduce and verify the correction; the depth15 full BNB restore retains its original failing r2 and uses a fresh r3. No finality policy is lowered.

### P1-092 — Empty scan pages omit canonical block disagreement

Empty/exhausted pages omit block hashes from their public cursors. Comparing only page results could advance despite different provider block hashes. Compare the separately retained hashes before returning any page, including SOL/SPL/TRX/TRC20 empty blocks; preserve the public page shape and agreed Solana skipped-slot behavior. `empty-block-quorum-baseline-r1`, corrected boundary cases and `empty-block-families-r1` reproduce/verify the fix. No accounting entry or final activation is inferred from an empty page.

**Full corrected BNB procedure:** `post-backup-v87/bnb-unknown-r3` reaches the exact depth15 cutoff, reconciles unknown incoming/outgoing and resumes one fresh confirmed nonce3 withdrawal. `bnb-integrity-r3` independently passes. Original r1/r2 and all sources/packets/keys remain retained. Required checks, production build and bundle budgets pass; GitHub records final CI/merge.

### P1-093 — Plan reads fabricate reauthentication errors

Both Load and Load queue discarded the actual failure and displayed literal `STEP_UP_REQUIRED`, including for an offline request. Preserve the caught exception through the existing localized notice hook and clear old messages when a new read starts. `plan-notices-v91/baseline-r1` reproduces the raw code and frozen language in production Chromium390px using a genuine generated admin session. Actual server step-up requirements remain intact.

### P1-094 — Success/expiry notices freeze their language

Six status/success notices still stored an already translated string. Retain bilingual copy until render in plan manager, native admin, operations, publication consent and release profiles. Financial/API behavior and existing hooks stay unchanged. This is source-wide adoption with compilation checks, not a claim that every successful staff workflow has received physical/hosted acceptance.

`plan-notices-v91/fixed-r1` verifies a real offline plan failure, immediate EN/FR error rendering and a genuine server step-up denial without bypassing authentication. `integrity-r1` verifies unchanged financial fingerprints. Required/build/bundle/docs/secrets/whitespace checks pass; original baseline/session fixture is retained.

**Further post-backup acceptance:** generated SOL `post-backup-v87/sol-unknown-r2` and independent `sol-integrity-r2` pass encrypted restore, unknown outgoing/incoming, no-write invalid review, common-slot custody reconciliation and one fresh approved payout. Thirteen SOL/SPL balance-witness provider cases also pass with sending disabled. Original sources/packets/keys remain retained; failed source-name and fixture pause-count assertions are not application defects. Missing off-chain intents and hosted acceptance remain open.

**Seven-asset post-backup matrix:** ETH/BNB, USDT BNB, generated JAGA BNB, SOL, USDT SOL and USDT TRON all pass encrypted restore, unknown-transfer review, no-write invalid review, custody reconciliation and one fresh approved payout. Independent checks verify token/native cash separately, once-only fees/loss, original-sender liability and balanced journals. Thirteen SOL/SPL plus15 TRX/TRC20 read-only balance-witness cases also pass. Exact procedure names and retained failures are in current status. No additional application bug was found in this evidence batch; no real JAGA approval, missing off-chain intent reconstruction or hosted acceptance is inferred.

**Missing-intent safeguard:** `post-backup-v87/eth-missing-intent-r1` verifies that a known member wallet alone creates no inferred withdrawal, debit or payout receipt. Reviewed company loss remains separate from one subsequently authorized payout; original member/cycle/point state is preserved during review and the source/archive stay unchanged. This is conservative handling, not lost-request reconstruction. Combined incident-pause acceptance is tracked in status; no new application defect is asserted.

**Combined incident acceptance:** fresh `eth-missing-intent-r3` passes plan-pause/replay/conflict, blocked checkout, unchanged financial rows/configuration hash during pause and settlement of the already approved payout while intake stays paused. `missing-intent-incident-integrity-r1` verifies balances, one authorized own receipt, retained raw history/current unresolved separation and one pause audit. Failed r2 remains intact; it stopped on a fixture variable shadow. Runtime/schema are unchanged.

### P1-095 — Recovered notification errors remain visible

A successful retry marked the notice read but left the earlier error visible. Clear the notice for new open/read/page actions and ignore older error responses after a newer action or identity reset. Preserve server read/view semantics and all request bodies. `notification-audit-v94/browser-baseline-r1` reproduces the error; corrected production Chromium390px verifies actual HTTP200 read/page recovery and EN/FR translation. Restricted `contract-r1` verifies201 same-microsecond rows, ownership/cursor/feature gates and distinct viewed/read behavior. `integrity-r1` confirms unchanged financial fingerprints. Required/build/bundle/docs/secrets checks pass; original fixtures remain retained.

### P1-096 — Age-verified accounts cannot be deleted

Deletion cleared age confirmation but retained DOB-verification time, violating the paired-field constraint and rolling back. Clear both proofs together. The original failure and corrected full account-permission contract are retained under `account-permissions-v95`. A separate deleted-member ETH lifecycle pays the proven original wallet, retains the private receipt/liability and does not restore identity. No financial records are erased.

### P1-097 — Restricted account balances omit currency and precision

The account view displayed raw purpose/base units with no asset. Add owned asset metadata to its read-only API and format exact integer balances with the existing domain helper, plus asset/environment/network and EN/FR purpose labels. Older responses retain explicitly labeled base units and asset ID. Genuine-session/API and production390px EN/FR checks pass; no balance or schema change.

### P1-098 — Suspension prevents withdrawing publication consent

The suspended-route allowlist blocked the privacy control although the domain permits opt-out. Allow the own publication route; existing domain checks still deny suspended opt-in. Fresh genuine-session/CSRF acceptance verifies read/withdrawal/exact retry, changed-body conflict, denied opt-in/new financial actions and unchanged financial fingerprints. Original baseline retained; hosted acceptance remains separate.

### P1-099 — Transparent priority changes omit member notices

A real bump changed serving ranks1/2 to2/1 without notifying either waiting member, contrary to PRD §32.4. Queue one safe notice per waiting member in the changed partition for bump/revoke and priority bootstrap creation/removal. Durable change/member keys prevent duplicate delivery; unchanged priority queues nothing. Keep staff reasons private and translate the known template at display time. Phase One behavior stays unchanged.

`own-data-v96/priority-baseline-r2` reproduces the omission. `priority-fixed-r4` passes serving/joining order, exact retry/no-op/conflict, bootstrap changes, rollback and actual once-only job delivery. Disabled-profile and production390px EN/FR checks pass. Independent integrity compares the original source and seven retained copies: four financial fingerprints match and the final eight notices are delivered once. Personal-data export/ownership/deletion checks also pass; no additional bug is asserted for that evidence. Required/build/bundle checks pass; hosted acceptance remains separate.

### P1-100 — English account notifications expose raw JSON

Moderation stores immutable action/status JSON. The renderer returned English early, so members saw implementation data while French received readable status. Render recognized status in the selected language before the language fallback; preserve unknown payloads and authored staff messages. Actual suspend/restore/job delivery and production390px baseline/fixed EN/FR checks pass under `account-notices-v97`. No stored message or account state is rewritten.

### P1-101 — Profile-change notices retain their saved language

A notice saved for a French-speaking member stayed French after selecting English. Recognize both existing profile templates and render the selected EN/FR copy, as for priority notices. Actual delivered French notice baseline/fixed production-browser checks pass. Independent original-source comparisons preserve financial fingerprints and original JSON/French bodies. Required/build/bundle checks pass; this is local acceptance, not hosted/device completion.

### P1-102 — GIV dashboard returns retired notification placeholders

The inbox excluded retired notices, but the dashboard's initial notification query returned their `[expired]` bodies. Add the same `retired_at is null` filter while preserving existing response aliases. `dashboard-retention-v98/baseline-r4` reproduces the mismatch; fresh `fixed-r1` verifies page agreement, retained retirement body/hash and feature off/on behavior. `integrity-r1` independently confirms seven financial/point tables match the original simulation source. Earlier wrong-mode fixture refusals were correct guards, not application defects; retain all copies. No financial timestamps, schema or balances change. Required/build/bundle checks pass; hosted acceptance remains separate.

### P1-103 — Disabled staff features lose the required admin preview

Disabled moderation rejected administrator reads; disabled administration/moderation pages disappeared without a preview entry point, contrary to PRD §3. Provide administrator-only read-only previews through account settings and navigation. Allow admin moderation reads through the existing fresh-MFA gate; moderator/disabled writes remain denied. Render cases in the disabled preview and disable mutation controls even with valid input. Normal disabled feature URLs stay404; preview parameters grant no authority.

`staff-permissions-v99/baseline-r3` and production `browser-baseline-r1` reproduce the gap. Fresh `fixed-r4` passes full genuine-session/CSRF TOTP/role/moderation/flag checks. `browser-fixed-r1` verifies actual data, EN/FR390px layout, disabled controls, normal404s and member denial. `integrity-r1` independently compares original source and four retained copies. No financial/schema/auth-cookie change; required/build/bundle checks pass. Real Google/device/hosted acceptance remains separate.

### P1-104 — Native wallet URL bypasses the wallet feature toggle

`/wallet` and history returned404 when wallets were off, but `/wallet/crypto` still served the application. Add the same authoritative feature check. Production HTTP baseline/fixed checks under `wallet-route-v100` verify all three paths disabled/enabled through the real admin setting service. Existing API/financial gates stay intact.

### P1-105 — Simulation exposes a misleading testnet wallet page

The native URL mapped every non-mainnet mode to testnet, including GIV simulation. Require an actual native mode before rendering and pass its narrowed value unchanged. Actual production baseline/fixed checks verify simulation keeps its normal GIV wallet and returns404 for the native URL; current-schema testnet and mainnet routes remain available when enabled. A fresh retained testnet clone receives only reviewed006, preserving its original six-receipt source. Independent grouped financial comparisons and required/build/bundle checks pass. No original financial record, archive or key is reset.

### P1-106 — GIV gift navigation loses keyboard focus

Tile links scrolled to nonfocusable cards and the global return control targeted the tile section rather than the selected tile. Add stable tile IDs, named focusable card/section targets, an accessible cost/name label and a remembered in-memory return target with a first-visible fallback. Clear that selection on identity changes. Keep ordinary hash navigation and payment handlers intact.

`keyboard-v101/baseline-r1` reproduces both failures with real keyboard Enter in production Chromium. Fresh `fixed-r2` verifies the chosen second tile → accessibility-tree-named card → same tile flow, visible focus and390px EN/FR layout with unchanged financial/point hashes. `integrity-r2` independently checks seven tables against the retained original source. Required/build/bundle checks pass; broader physical-device/WCAG acceptance remains open.

### P1-107 — Account/case screens expose internal status and balance labels

French account and case views displayed `suspended`, `resolved` and `held_payable`. Add bilingual account/case/role display labels without changing enum values or comparisons. Reuse the existing history-purpose formatter instead of a partial balance-only map; add its incoming-balance label.

`account-copy-v102/baseline-r1` reproduces the issue on an actual resolved-case/suspended-member fixture. Fresh `fixture-r2` / `fixed-r1` verify production390px EN/FR copy, exact ETH amount, unchanged API status and layout. `integrity-r1` confirms original-source/two-copy financial equality. No API/schema/permission change; required/build/bundle checks pass. Private authored case content remains unchanged.
