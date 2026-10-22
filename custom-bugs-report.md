# Custom bug report

**Updated: 22 October 2026, 08:09 AM WAT (Africa/Lagos)**

**Status:** 25 fixed; 8 open; AUD-014 withdrawn. Fixing and checked PR merges are authorized.

## Open issues

1: **AUD-003: [High] An ambiguous wallet response allows a fresh transfer request for the same invoice.**

2: **AUD-004: [High] Changing the selected admin plan can leave another plan’s queue actionable.**

3: **AUD-009: [Medium] Several operational balance checks still rescan complete ledger histories.**

4: **AUD-010: [Medium] Notification pagination and badge queries do growing scans/sorts.**

5: **AUD-011: [Medium] A priority change synchronously fans notifications out to every waiting member.**

6: **AUD-013: [Medium] Admin queue screens cannot reach entries beyond their first page.**

7: **AUD-021: [Medium] Large duplicated portal/controller modules and pervasive any weaken contract checking.**

8: **AUD-026: [Medium] One non-payable business account can block daily settlement for every later account.**

## Fixed

**AUD-001–002, AUD-005–008, AUD-012, AUD-015–020, AUD-022–025 and AUD-027–034: fixed.**

**AUD-014:** withdrawn; no change required.

## Remaining fixes

### 1: AUD-003: An ambiguous wallet response allows a fresh transfer request for the same invoice.

**FILES:** `lib/native-wallet.ts`; `lib/payment-receipts.ts`; `components/native-portal.tsx:287`; `server/crypto-checkout.ts:92`

**Problem:** The client retains a payment only after the wallet returns a valid hash. A malformed/missing hash or uncertain provider failure can occur after dispatch, yet the invoice remains available and the approval action can call the wallet again. An isolated run of the real client adapter confirmed two transfer requests for one invoice after two BROADCAST_AMBIGUOUS results. No real broadcast occurred. A second request could create a second payment, even if later accounting prevents duplicate entitlement.

**FIX:** Record a recoverable send-attempt state before opening the transfer prompt. Block fresh sends and unsafe cancellation while the outcome is unknown, including after navigation/reload and from another tab. Provide wallet-history/hash submission and reconciliation. Permit retry only after a definitive pre-broadcast rejection or verified resolution; never invent a hash or treat an attempted send as verified funds.

### 2: AUD-004: Changing the selected admin plan can leave another plan’s queue actionable.

**FILES:** `components/admin-panel.tsx:13`; `components/admin-panel.tsx:19`; `components/plan-manager.tsx`

**Problem:** AdminPanel changes its selected plan without clearing the previously loaded queue. Its priority buttons still use entry IDs from that old queue, so an administrator can select Plan B while changing priority in Plan A. PlanManager clears immediately, but an older in-flight load can repopulate the previous plan’s queue after selection changes. Server authorization validates the supplied entry, not the administrator’s current UI selection.

**FIX:** Bind queue results and mutations to the selected plan, partition, asset and request generation. Clear or disable the queue immediately on selection changes, discard stale responses, and present the affected plan/network beside each action. Validate the expected plan/partition server-side as an additional intent check.

### 3: AUD-009: Several operational balance checks still rescan complete ledger histories.

**FILES:** `server/crypto-business.ts:115`; `server/treasury-sweeps.ts:58`; `server/liability-recovery.ts:209`; `packages/db/src/ledger-counters.ts`

**Problem:** Business settlement, sweep liability/reserve calculations and liability-recovery confirmation still sum historical postings directly. These are operational paths that may hold user/account locks and perform RPC work. Their cost grows with ledger history despite bounded response sizes and despite existing protected balance-counter helpers. Indexes reduce lookup cost but do not make a full account-history aggregate constant-time.

**FIX:** Use the existing protected account/asset aggregates with explicit coverage verification and matching debit/credit semantics. Retain exact journal reconciliation as a separate bounded diagnostic path. Fail closed on incomplete counters; do not substitute a recent-history window or delete retained financial evidence.

### 4: AUD-010: Notification pagination and badge queries do growing scans/sorts.

**FILES:** `server/notifications.ts:12`; `server/notifications.ts:14`; `packages/db/fresh-install.sql:4139`; `packages/db/src/schema-contracts.ts`

**Problem:** Notification pages filter by user and retirement state but order/cursor by created_at and id. The installed user index is (user_id,id), not that ordering. Badge calculation uses bool_or across all active notices rather than a bounded existence query. A small page limit therefore does not bound the rows examined as a member’s notification history grows.

**FIX:** Add an appropriately reviewed composite/partial index for the actual user, retirement and timestamp/id access pattern. Change badge evaluation to an indexed existence/newest-notice check with the same seen-watermark semantics. Keep SQL, ORM descriptors, fresh installation and recovery compatibility synchronized.

### 5: AUD-011: A priority change synchronously fans notifications out to every waiting member.

**FILES:** `server/notifications.ts:22`; `server/administration.ts:28`; `server/plans.ts`

**Problem:** queueAdjustmentNotices inserts one outbox record for every waiting member in the affected partition within the administrator’s transaction. There is no recipient chunk or cursor. On a large queue, changing one priority entry can produce a large insert and extend partition-lock duration until the request times out, rolling back the intended change. This is unrelated to how frequently a scheduler runs.

**FIX:** Persist one idempotent change event and process its notification recipients in bounded pages. Define stable recipient eligibility at the change boundary and preserve per-recipient deduplication. Release the queue-changing transaction promptly while retaining durable progress and backlog visibility.

### 6: AUD-013: Admin queue screens cannot reach entries beyond their first page.

**FILES:** `server/api.ts:452`; `components/admin-panel.tsx:13`; `components/plan-manager.tsx`

**Problem:** The queue API limits results and accepts partition_id/after_ticket, but the admin screens request only the base plan URL and expose no next-page or partition controls. The response is a bare limited array rather than a usable continuation envelope. Older/other-partition entries beyond the first result window cannot be inspected or selected for priority/bootstrap management through these screens.

**FIX:** Return a bounded cursor envelope that includes partition/asset identity and implement next/previous-or-refresh controls in both queue consumers. Preserve stable ordering, validate cursor scope, and avoid offset or full-queue loading as the workaround.

### 7: AUD-021: Large duplicated portal/controller modules and pervasive any weaken contract checking.

**FILES:** `server/api.ts`; `components/native-portal.tsx`; `components/native-admin.tsx`; `components/member-portal.tsx`; `components/account-portal.tsx`

**Problem:** The request dispatcher, payment portal and payment administration each combine many independent workflows in large components/functions. Several transport/state boundaries use any, while authentication, notices and session invalidation are repeated across portals. Syntax/import inspection confirms this structure; the missing HTTP route wiring illustrates a concrete contract that compilation does not currently connect. This is maintainability/type-safety debt, not a separate proven exploit.

**FIX:** Split by bounded feature: identity/session bootstrap, checkout, recovery, queue administration and public content. Define closed request/response DTOs and typed state transitions, then share scoped async/lifecycle helpers. Keep domain math independent of framework/DB code. Prefer a small explicit route registry that makes handler-to-HTTP wiring reviewable.

### 8: AUD-026: One non-payable business account can block daily settlement for every later account.

**FILES:** `server/financial-operations.ts:153`; `server/financial-operations.ts:179`; `server/financial-operations.ts:191`; `server/crypto-business.ts:175`

**Problem:** The daily dispatcher always starts at the first asset/role without a successful daily key and immediately returns its settlement attempt. A legitimate positive balance below dust throws instead of creating that key. Every later invocation therefore retries the same account before any later asset/role. An actual-dispatcher fixture confirmed three identical attempts and no later account reached. Stale prices, missing destinations or other persistent failures can produce the same starvation. This concerns dispatch progress, not cron frequency.

**FIX:** Use a durable rotating cursor or bounded per-account retry schedule. Defer balances below the minimum without marking their money settled, and allow unrelated eligible accounts to progress. Record failures and alert appropriately while applying backoff; distinguish a temporary deferral from a completed daily settlement. Keep each account reservation and daily idempotency boundary intact.

## Work order and limits

1. Fix AUD-003–004: durable uncertain-send recovery and plan/partition-bound admin actions.
2. Fix AUD-009–011, AUD-013 and AUD-026: protected aggregates, notification indexes, bounded notification work, complete queue paging and fair settlement dispatch. Keep SQL, ORM, fresh-install receipts and signed recovery compatibility aligned.
3. Fix AUD-021: split the remaining large controllers and replace unsafe transport types while preserving behavior.

Continue in substantial batches, verify the final head, and merge after both push and pull-request CI pass. Preserve original/failed financial evidence. Add newly confirmed defects here; do not expand fixed-bug histories.

A missing Solana/TRON transaction is not proof of non-inclusion: retain its signed packet and reservation for positive canonical resolution. Original financial history and legacy fingerprints remain unchanged. Business settlement prepares at most two dust-safe legs per request; the remaining source balance is not reserved. Unmatched refunds above the effective signer cap are rejected before a hold. These are operational safeguards, not proof of hosted/mainnet acceptance.

## Ratings and brief review

Qualitative source-review scores out of 10; projected scores assume the remaining fixes are verified.

- **Overall: 7 → 8.** Many concrete safety, recovery and UI defects are corrected; wallet-send ambiguity and queue intent still need work.
- **Financial correctness: 7 → 8.** Exact amounts, retained attempts and guarded holds remain; remaining uncertainty must not trigger another payment.
- **Security: 8 → 8.5.** Session failures, deadlines, rate limiting, child-process secrets and web adapter capabilities are tighter.
- **Performance: 6 → 7.5.** Health work and settlement batches are bounded; growing ledger/notification/queue workloads remain.
- **Architecture: 6 → 8.** Large controllers and broad DTOs still need refactoring.
- **SEO: 7.5 → 8.** Alias lookup and locale navigation are corrected; deployed acceptance remains separate.
- **UX/recovery: 7 → 8.** Several stale-state failures are corrected; uncertain sends and admin queue coverage remain.

Existing custom Postgres-role grants remain explicit. No blanket anon/authenticated/service_role grants are needed. No live-money transfer or hosted capacity acceptance is claimed.

---

**End of report — 22 October 2026, 08:09 AM WAT (Africa/Lagos)**

25 fixed · 8 open · 1 withdrawn.
