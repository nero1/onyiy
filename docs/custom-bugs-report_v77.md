# Bug report — Rounds One/Two/Three v77

**Full product remains incomplete.** Earlier completion statements below refer to their named bug/transparency batches. Current work is tracked as C001–C017 in [status](PROJECT-STATUS_v77.md).

Updated: **17 October2026 (Africa/Lagos)**.

**Resumed by the owner on 16 October 2026.** Round One: **74 of 74 findings implemented, locally verified and merged**. Round Two found and locally verified fixes for R2-004–006; local release checks passed; merged in PR52. Round Three also fixed R3-001; Phase Two implementation and eight local review fixes are in [PR53](https://github.com/nero1/onyiy/pull/53); GitHub records final CI/merge state. These counts are not a completion percentage or hosted acceptance.

Historical numbered migration paths below identify the original fixes in Git history. Fresh installations paste only `packages/db/fresh-install.sql`. Historical numbered files remain for installed-release compatibility; do not replay them on a fresh installation.

PR51 completed Round One and incidental R2-001–003. The v53 batch fixes the three fresh Round Two findings below; The same batch includes the Round Three recovery fix below; Phase Two transparency implementation/local review was completed in v54; full-product work remains open.

## Findings at a glance

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

## How to read this report

- The explanations below record the **original audit failures**, not claims that fixed defects remain present. Use the list above for current status.
- “Defect” means a source/contract failure; “requirement gap” means missing requested behavior; “hardening” means a conditional defensive improvement; “maintenance” means structural/dependency risk.
- Initial audit ratings (current → projected after fixes): money/recovery 5 → 8; security/privacy 6.5 → 8.5; performance 5 → 8; maintainability 6 → 8; product/accessibility/SEO 6 → 8, out of 10. These were qualitative judgments, not measured guarantees or updated release ratings.
- Original audit: 70 findings; four more were found during remediation. Three analysis passes were one audit round. CRON frequency and test-only issues were excluded.
- Paths are repository-relative. Fix instructions and acceptance checks are in [the fix plan](custom-bugs-fix-plan_v77.md).

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

Evidence and remaining release checks: [current status](PROJECT-STATUS_v77.md). Original finding descriptions and acceptance conditions remain above.

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

**P2-B001 — Queue revisions omit administrative entry changes.** Profile preview validation could miss a priority/bootstrap edit because only selected gift paths advanced the partition revision. SQL004 now increments it on every entry insertion/change and bounds it to an exact JavaScript integer. A fresh fixture reproduced stale-priority preview rejection while retaining actual balances/tickets. Phase Two implementation/local verification is complete; exact-head CI/merge is tracked in see [status](PROJECT-STATUS_v77.md).



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
- Named restricted-role/native/simulation and actual production-browser evidence: [status](PROJECT-STATUS_v77.md). Whole-product/live acceptance remains open; continue after checked merge.

## Browser recovery and restore activation fixes (v69)

- C008/C011: add a protected GitHub browser flow for encrypted backup, empty-target restore and independent exact verification, plus permanent encrypted ZIP release selection after short-term artifacts expire. Run only the selected trusted backup release; reject extra files, wrong confirmation, occupied targets and mixed signer/web credentials.
- Financial approval hashes lacked database identity, so a restored copy could retain apparently valid source approvals/acknowledgements. Bind web/signer hashes to the actual database nonce/name/OID; require fresh approval without modifying retained financial snapshots.
- Exact seven-migration archive roundtrip, full restricted-role worker/web regression, controller denials, copied-ack activation denial and bounded ZIP checks pass locally. [Status](PROJECT-STATUS_v77.md) distinguishes this evidence from hosted acceptance and remaining chain/lifecycle work.

## Cycle history and idle-preview fixes (v70)

- Transparent paginated cycle positions incorrectly used legacy display rank. Select actual serving rank consistently, retaining the legacy profile’s rule.
- Completed history omitted completion/cooldown and a Completed view. Add the entitled filter, original completion time, localized live cooldown and member status labels; preserve financial records.
- A recent30-row window could miss an older active cycle and allow currency rotation. Use a separate bounded scoped existence flag; keep unresolved chain-review cycles in Current.
- Baseline reproduction, restricted-service reads,35 declared synthetic historical rows, user isolation, unchanged ledger totals and actual390px EN/FR browser checks pass locally. Evidence/remaining build-client, managed-recovery and full-product work: [status](PROJECT-STATUS_v77.md).

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
- [Status](PROJECT-STATUS_v77.md) and [handover](LLM-HANDOVER_v77.md) now consolidate current evidence/remaining work; detailed history stays in Git. Continue recovery edge cases, the current PRD audit and external acceptance without milestone pauses.

v77

## Recovery families and live transaction hashes (v75)

Pending SOL/SPL/TRC20 refund archive/restore procedures pass locally without new signatures/broadcasts, with source/packet preservation and source approvals/authentication rejected. Prefer live broadcast/signed hashes over earlier failed attempts while keeping confirmed winners first; five actual-helper temporary scenarios pass (`hash-priority-r2`). Details and outstanding work: [status](PROJECT-STATUS_v77.md). Hosted/unknown-history recovery and whole-product completion remain open.

## Mainnet expiry and replacement preparation (v76)

SOL/SPL/TRC20 pending refunds retain principal before expiry and close only after dual-provider positive expiry through actual worker/separate authenticated web. Original-sender liability returns once without additional gas/signature/broadcast; independent retained-database accounting reads pass. ETH post-withdrawal reorg also passes absence/outage denial, retained review/asset fence, immutable allocations and once-only cash/point reconfirmation. Native ETH and18-decimal BNB token replacement preparation preserves exact intent and rejects unsafe fee/evidence changes. This does not establish complete replacement persistence/restart or hosted-chain acceptance. Evidence and remaining work: [status](PROJECT-STATUS_v77.md).

v77

## Durable EVM replacement follow-up (v77)

Actual encrypted worker ETH and18-decimal BNB token replacement persistence/broadcast/settlement pass locally, with exact immutable transfer intent, linked lineage, principal held until the canonical winner and once-only settlement/gas. Failed fixture originals remain intact. Fresh-process continuation passes for ETH and BNB tokens, with independent accounting checks across all four retained databases; results and remaining scope: [status](PROJECT-STATUS_v77.md). No public-chain or hosted acceptance is inferred.

v77
