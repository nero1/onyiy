# Custom bug report

**Independent review: 21 October 2026, 11:44 PM WAT (Africa/Lagos)**

**Source revision:** `3782caf49d60ebef6a0d0d210812b5df1acd12b3`

**Status:** 33 open findings; AUD-014 withdrawn after verification. Findings and proposed plan only; no fixes applied.

## Discovered issues

1: **AUD-001: [High] The protected price-feed endpoint is missing from Next.js routing.**

2: **AUD-002: [High] Per-currency launch scheduling calls another missing endpoint.**

3: **AUD-003: [High] An ambiguous wallet response allows a fresh transfer request for the same invoice.**

4: **AUD-004: [High] Changing the selected admin plan can leave another plan’s queue actionable.**

5: **AUD-005: [Medium] Temporary authentication failures are converted into anonymous/logged-out state.**

6: **AUD-006: [Medium] The authenticator-status endpoint bypasses the application rate limiter.**

7: **AUD-007: [Medium] Ordinary client API requests have no default deadline.**

8: **AUD-008: [Medium] The public health endpoint performs uncached expensive database work without admission limits.**

9: **AUD-009: [Medium] Several operational balance checks still rescan complete ledger histories.**

10: **AUD-010: [Medium] Notification pagination and badge queries do growing scans/sorts.**

11: **AUD-011: [Medium] A priority change synchronously fans notifications out to every waiting member.**

12: **AUD-012: [Medium] Multi-leg business settlement prepares up to 100 RPC-backed legs in one transaction.**

13: **AUD-013: [Medium] Admin queue screens cannot reach entries beyond their first page.**

14: **AUD-014: [Withdrawn] Historical help-slug reuse is already blocked.**

15: **AUD-015: [Low] Help redirect history can outgrow a reader cap and disable alias resolution.**

16: **AUD-016: [Low] A stale clipboard completion can claim a replacement value was copied.**

17: **AUD-017: [Medium] Recovery connectivity controls do not subscribe to online/offline changes.**

18: **AUD-018: [Low] Logout revokes sessions but does not expire the browser’s session cookies.**

19: **AUD-019: [Low] Some operational HTTP response limits are checked only after full buffering.**

20: **AUD-020: [Low] Recovery child processes inherit more secret environment data than they need.**

21: **AUD-021: [Medium] Large duplicated portal/controller modules and pervasive any weaken contract checking.**

22: **AUD-022: [Low] Web financial services receive broadcast-capable adapters despite narrower facades existing.**

23: **AUD-023: [High] Missing RPC history can be mistaken for proof that a signed payment expired without landing.**

24: **AUD-024: [High] The signer dispatch cursor loses timestamp precision and can starve later payouts.**

25: **AUD-025: [Medium] Greedy business-payout splitting rejects totals that have a valid dust-safe split.**

26: **AUD-026: [Medium] One non-payable business account can block daily settlement for every later account.**

27: **AUD-027: [Medium] Refreshing an open notification inbox drops history without repairing its cursor.**

28: **AUD-028: [Low] Mainnet recovery records use a fingerprint derived with a literal testnet environment.**

29: **AUD-029: [Medium] A shortage alert for one asset can suppress another asset sharing the same treasury.**

30: **AUD-030: [Medium] Oversized unmatched deposits are approved for refunds that the signer cannot send.**

31: **AUD-031: [Medium] Replaying a deposit-observation job sent to review can finish without rechecking the transfer.**

32: **AUD-032: [High] Solana ATA rent top-ups can disappear from native-fee accounting.**

33: **AUD-033: [Low] Release-profile status reports real-money payments disabled regardless of current configuration.**

34: **AUD-034: [Low] Changing language in another tab leaves server-rendered content in the previous language.**

## Scope and evidence

This fresh three-pass review adds **AUD-030–034**: five new findings. The report now has **33 open findings and one withdrawn item (AUD-014)**. Existing IDs remain stable; no application fixes were made.

Each pass started from the tracked source: security and data boundaries; financial state, concurrency and recovery; then browser behavior, API wiring, SEO and deployment. The fresh inventory covers 462 tracked paths, including 460 text files and 407 parsed code files, with no syntax diagnostics. SQL/configuration and high-risk entry-point-to-database paths were also traced. Comments, handovers and existing reports were not accepted as proof. File inventory and syntax parsing are coverage aids; they do not establish that every path is correct. Dependencies were checked at application boundaries, with primary-source checks where needed.

Earlier evidence includes actual production HTTP 404s, actual-component Chromium reproductions, and signer paging against fresh PostgreSQL tables. New evidence uses the actual refund and job functions, actual Solana adapter, and actual React components with explicit generated dependencies or transaction data. The locale reproduction uses a router spy and static article fixture; the mainnet status reproduction does not prove hosted activation. The Solana rent branch was checked against the token program’s source. No real-money transfer, hosted penetration test, production database mutation or capacity benchmark was performed. Cron-frequency and test-suite issues are excluded. This review cannot prove that no further bugs exist.

## Findings and proposed fixes

### 1: AUD-001: The protected price-feed endpoint is missing from Next.js routing.

**Priority:** High · **Type:** Code finding

**FILES:** `workers/prices/feed.ts:18`; `server/api.ts:145`; `app/api/v1/internal/prices/route.ts (missing)`

**Problem:** The pricing worker sends status, publish and failure requests to /api/v1/internal/prices. A handler exists inside server/api.ts, but no route file or rewrite exposes it. Independent inspection of the built route manifest and an actual production Next.js POST both confirmed the missing route; the POST returned HTML 404. Automatic prices and the worker’s manual signed fallback cannot reach their handler, leaving derived-price operations blocked when quotes expire.

**FIX:** Add the missing POST route through the existing authenticated dispatcher, preserving HMAC, environment, nonce and body-size checks. Verify status, signed publication, cooldown reporting and rejection paths through the real HTTP endpoint, rather than calling the service function directly.

### 2: AUD-002: Per-currency launch scheduling calls another missing endpoint.

**Priority:** High · **Type:** Code finding

**FILES:** `components/native-admin.tsx:195`; `server/api.ts:186`; `app/api/v1/admin/crypto/plans/schedule/route.ts (missing)`

**Problem:** The payment-administration form posts to /api/v1/admin/crypto/plans/schedule, but only /admin/crypto/plans has a Next.js route. The schedule service is therefore unreachable from that form. The compiled manifest omits the requested path, and an actual production Next.js POST returned 404. This is a routing defect, not a cron-frequency issue.

**FIX:** Expose the schedule POST using the existing dispatcher and administrator, fresh-authentication, revision and idempotency guards. Check a real browser request through scheduling and subsequent retrieval of the saved per-currency launch configuration.

### 3: AUD-003: An ambiguous wallet response allows a fresh transfer request for the same invoice.

**Priority:** High · **Type:** Code finding

**FILES:** `lib/native-wallet.ts`; `lib/payment-receipts.ts`; `components/native-portal.tsx:287`; `server/crypto-checkout.ts:92`

**Problem:** The client retains a payment only after the wallet returns a valid hash. A malformed/missing hash or uncertain provider failure can occur after dispatch, yet the invoice remains available and the approval action can call the wallet again. An isolated run of the real client adapter confirmed two transfer requests for one invoice after two BROADCAST_AMBIGUOUS results. No real broadcast occurred. A second request could create a second payment, even if later accounting prevents duplicate entitlement.

**FIX:** Record a recoverable send-attempt state before opening the transfer prompt. Block fresh sends and unsafe cancellation while the outcome is unknown, including after navigation/reload and from another tab. Provide wallet-history/hash submission and reconciliation. Permit retry only after a definitive pre-broadcast rejection or verified resolution; never invent a hash or treat an attempted send as verified funds.

### 4: AUD-004: Changing the selected admin plan can leave another plan’s queue actionable.

**Priority:** High · **Type:** Code finding

**FILES:** `components/admin-panel.tsx:13`; `components/admin-panel.tsx:19`; `components/plan-manager.tsx`

**Problem:** AdminPanel changes its selected plan without clearing the previously loaded queue. Its priority buttons still use entry IDs from that old queue, so an administrator can select Plan B while changing priority in Plan A. PlanManager clears immediately, but an older in-flight load can repopulate the previous plan’s queue after selection changes. Server authorization validates the supplied entry, not the administrator’s current UI selection.

**FIX:** Bind queue results and mutations to the selected plan, partition, asset and request generation. Clear or disable the queue immediately on selection changes, discard stale responses, and present the affected plan/network beside each action. Validate the expected plan/partition server-side as an additional intent check.

### 5: AUD-005: Temporary authentication failures are converted into anonymous/logged-out state.

**Priority:** Medium · **Type:** Code finding

**FILES:** `server/auth-api.ts:15`; `lib/auth-client.ts:5`; `lib/api-client.ts:47`

**Problem:** Session bootstrap catches every authentication exception and returns an anonymous success response, including database-capacity and availability failures. loadSession also turns every refresh exception into an anonymous result, while the shared API helper clears the active browser scope after any refresh failure. A temporary503 or timeout can therefore discard valid signed-in UI/cache state and trigger extra refresh traffic rather than communicate an outage. These are executable catch paths, not assumptions from comments.

**FIX:** Treat only definitive authentication failures as session invalidation. Return an availability error for transient bootstrap failures, preserve the existing account scope while refresh is temporarily unavailable, and expose a bounded retry state. Preserve strict revocation and refresh-token-reuse handling; do not serve private data as newly authenticated during an outage.

### 6: AUD-006: The authenticator-status endpoint bypasses the application rate limiter.

**Priority:** Medium · **Type:** Code finding

**FILES:** `server/api.ts:496`; `server/auth-api.ts:20`; `server/rate-limits.ts`

**Problem:** Auth routes return to handleAuthRequest before the general authenticated rate limiter. GET /auth/2fa/status authenticates and performs a further database read but never invokes enforceRate. An authenticated caller can repeat this database-backed endpoint without the application’s read/auth limits. The surrounding protected routes do not supply a fallback limiter for it.

**FIX:** Apply a consistent route-level authentication/read budget before this endpoint’s database work, with appropriate account and trusted-IP scopes. Audit the other early-return auth branches for the same policy gap and keep rejection responses cheap. Do not rely on a limiter that runs only in the non-auth dispatcher.

### 7: AUD-007: Ordinary client API requests have no default deadline.

**Priority:** Medium · **Type:** Code finding

**FILES:** `lib/api-client.ts:17`; `components/native-portal.tsx`; `components/account-portal.tsx`; `components/member-portal.tsx`

**Problem:** The common request helper passes through an optional caller signal but supplies no deadline. Many bootstrap, read and mutation callers supply none. A stalled response can leave loading or financial busy state pending indefinitely. An isolated dispatch check confirmed that an ordinary /auth/session request receives no AbortSignal. Selected pollers having their own timeouts does not protect these other callers.

**FIX:** Add bounded operation-specific deadlines combined with caller cancellation. Surface timeout/unknown-result states and always release UI busy state. Keep idempotency context and returned payment hashes available; a client timeout must not automatically replay a financial mutation or imply the server rolled it back.

### 8: AUD-008: The public health endpoint performs uncached expensive database work without admission limits.

**Priority:** Medium · **Type:** Code finding

**FILES:** `app/api/health/route.ts:10`; `packages/db/src/health.ts:10`; `server/operational-diagnostics.ts`

**Problem:** Every completed health request can be followed immediately by a new standalone database connection/probe and an operations transaction. The pending promise coalesces overlapping probes only; there is no short result lifetime or endpoint limiter. Across serverless instances this permits unauthenticated traffic to amplify database connections and queries. The operations read also runs for each successful request rather than sharing the probe’s result.

**FIX:** Separate a cheap public liveness response from detailed readiness/operations checks. Give public readiness a short bounded result cache, single-flight behavior and an inexpensive admission ceiling; keep detailed operational data protected. Ensure monitoring remains useful during overload and does not become its cause.

### 9: AUD-009: Several operational balance checks still rescan complete ledger histories.

**Priority:** Medium · **Type:** Code finding

**FILES:** `server/crypto-business.ts:115`; `server/treasury-sweeps.ts:58`; `server/liability-recovery.ts:209`; `packages/db/src/ledger-counters.ts`

**Problem:** Business settlement, sweep liability/reserve calculations and liability-recovery confirmation still sum historical postings directly. These are operational paths that may hold user/account locks and perform RPC work. Their cost grows with ledger history despite bounded response sizes and despite existing protected balance-counter helpers. Indexes reduce lookup cost but do not make a full account-history aggregate constant-time.

**FIX:** Use the existing protected account/asset aggregates with explicit coverage verification and matching debit/credit semantics. Retain exact journal reconciliation as a separate bounded diagnostic path. Fail closed on incomplete counters; do not substitute a recent-history window or delete retained financial evidence.

### 10: AUD-010: Notification pagination and badge queries do growing scans/sorts.

**Priority:** Medium · **Type:** Code finding

**FILES:** `server/notifications.ts:12`; `server/notifications.ts:14`; `packages/db/fresh-install.sql:4139`; `packages/db/src/schema-contracts.ts`

**Problem:** Notification pages filter by user and retirement state but order/cursor by created_at and id. The installed user index is (user_id,id), not that ordering. Badge calculation uses bool_or across all active notices rather than a bounded existence query. A small page limit therefore does not bound the rows examined as a member’s notification history grows.

**FIX:** Add an appropriately reviewed composite/partial index for the actual user, retirement and timestamp/id access pattern. Change badge evaluation to an indexed existence/newest-notice check with the same seen-watermark semantics. Keep SQL, ORM descriptors, fresh installation and recovery compatibility synchronized.

### 11: AUD-011: A priority change synchronously fans notifications out to every waiting member.

**Priority:** Medium · **Type:** Code finding

**FILES:** `server/notifications.ts:22`; `server/administration.ts:28`; `server/plans.ts`

**Problem:** queueAdjustmentNotices inserts one outbox record for every waiting member in the affected partition within the administrator’s transaction. There is no recipient chunk or cursor. On a large queue, changing one priority entry can produce a large insert and extend partition-lock duration until the request times out, rolling back the intended change. This is unrelated to how frequently a scheduler runs.

**FIX:** Persist one idempotent change event and process its notification recipients in bounded pages. Define stable recipient eligibility at the change boundary and preserve per-recipient deduplication. Release the queue-changing transaction promptly while retaining durable progress and backlog visibility.

### 12: AUD-012: Multi-leg business settlement prepares up to 100 RPC-backed legs in one transaction.

**Priority:** Medium · **Type:** Code finding

**FILES:** `server/crypto-business.ts:153`; `server/crypto-business.ts:173`; `packages/db/src/execution-budget.ts`; `packages/chains/src/runtime.ts`

**Problem:** Business settlement accepts balances requiring up to 100 legs and sequentially estimates each fee, inserts its obligation and posts its hold inside one transaction. That work is not aligned with the transaction/request deadline or RPC admission budget. A sufficiently accumulated balance, low configured per-transfer cap or slow provider can make the whole settlement repeatedly time out and roll back without progress.

**FIX:** Introduce a durable bounded settlement-batch plan, or prepare an explicitly bounded subset against a preserved balance watermark. Estimate safely reusable fees once where valid and enforce a per-pass work budget. Maintain exact reservations, lineage and resumability; never resend settled legs or release their holds when a later leg fails.

### 13: AUD-013: Admin queue screens cannot reach entries beyond their first page.

**Priority:** Medium · **Type:** Code finding

**FILES:** `server/api.ts:452`; `components/admin-panel.tsx:13`; `components/plan-manager.tsx`

**Problem:** The queue API limits results and accepts partition_id/after_ticket, but the admin screens request only the base plan URL and expose no next-page or partition controls. The response is a bare limited array rather than a usable continuation envelope. Older/other-partition entries beyond the first result window cannot be inspected or selected for priority/bootstrap management through these screens.

**FIX:** Return a bounded cursor envelope that includes partition/asset identity and implement next/previous-or-refresh controls in both queue consumers. Preserve stable ordering, validate cursor scope, and avoid offset or full-queue loading as the workaround.

### 14: AUD-014: Historical help-slug reuse is already blocked.

**Priority:** Withdrawn · **Type:** Withdrawn finding

**FILES:** `server/administration.ts:45`

**Problem:** The earlier report overlooked the existing historical-alias reservation check. editHelp reads slugRedirects and rejects a slug owned by another article before writing. An independent run of the actual function confirmed VERSION_CONFLICT with zero mutations for the previously reported reuse scenario. AUD-014 is withdrawn; it was not a bug fixed during this review.

**FIX:** No application change is needed for this scenario. Keep the existing reservation guard. AUD-015 remains separate: unlimited renames can still exceed the public redirect reader’s inventory cap.

### 15: AUD-015: Help redirect history can outgrow a reader cap and disable alias resolution.

**Priority:** Low · **Type:** Code finding

**FILES:** `server/administration.ts:50`; `server/public-reads.ts:105`

**Problem:** Each new rename can append another redirect without a write-time growth policy. Alias resolution loads up to 1001 published redirects for an entire locale and throws CONFIGURATION_INVALID when the count exceeds1000. Consequently, continued legitimate editing can make all historical-slug misses fail, including requests for otherwise valid old links. The current article-count limit does not bound rename history.

**FIX:** Resolve aliases through the indexed locale/old-slug key instead of requiring the whole redirect inventory to fit in memory. Bound cache entries separately and expose redirect growth operationally. Preserve published historical links rather than silently deleting them to stay below a hardcoded cap.

### 16: AUD-016: A stale clipboard completion can claim a replacement value was copied.

**Priority:** Low · **Type:** Code finding

**FILES:** `components/copy-button.tsx:6`; `components/native-admin.tsx`; `components/member-portal.tsx`

**Problem:** CopyButton resets its status when text changes, but an earlier pending writeText can complete afterward and set Copied for the new field. A browser reproduction with the actual component copied original-value, changed the field to replacement-value, then completed the old promise; the replacement field displayed Copied. Overlapping copies can similarly overwrite the latest feedback.

**FIX:** Bind completion to the captured text and a monotonically increasing request generation. Discard results after text/scope changes or unmount, and avoid concurrent copy requests or distinguish their outcomes. Keep the selectable manual-copy field and localized feedback.

### 17: AUD-017: Recovery connectivity controls do not subscribe to online/offline changes.

**Priority:** Medium · **Type:** Code finding

**FILES:** `components/recovery-portal.tsx:103`

**Problem:** The recovery sign button reads navigator.onLine during render, but the component does not subscribe to connectivity events or maintain reactive online state. A Chromium run of the actual component confirmed that reconnecting after an offline render leaves the button disabled until an unrelated locale render. The inverse can leave the visible control enabled after disconnection, even though the wallet adapter later refuses the action.

**FIX:** Use a shared reactive connectivity hook with event cleanup and a safe initial browser state. Re-render the recovery controls immediately on both events, retain the statement while reconnecting, and continue checking connectivity and expiry inside the signing action.

### 18: AUD-018: Logout revokes sessions but does not expire the browser’s session cookies.

**Priority:** Low · **Type:** Code finding

**FILES:** `server/auth.ts:83`; `server/auth-api.ts`; `lib/auth-client.ts`

**Problem:** logout revokes the selected/all session families and returns authResponse without calling clearCookies. The handler also returns that response unchanged. Access, refresh, pre-auth and CSRF cookies can therefore remain after successful logout. Revocation prevents reuse, but later anonymous bootstrap sees the retained refresh cookie and attempts a refresh against the revoked family, creating avoidable errors and traffic.

**FIX:** Expire all application authentication cookies on successful logout using their exact original paths and security attributes. Keep database revocation authoritative and make repeated logout safe, including with an expired access token. Verify both current-session and all-session logout behavior.

### 19: AUD-019: Some operational HTTP response limits are checked only after full buffering.

**Priority:** Low · **Type:** Hardening gap

**FILES:** `workers/signer/run.ts:70`; `scripts/backup-retention.mjs:9`

**Problem:** The signer callback reads response.text before checking its16KiB limit; backup-retention verification similarly reads the full body before checking 1MiB. Those checks reject an oversized result only after allocating it. A broken/compromised configured endpoint or unexpected upstream response can therefore consume substantially more memory than the stated bound. Other transports in this repository already enforce streaming limits.

**FIX:** Read these responses through a bounded streaming UTF-8 reader with a deadline and early cancellation, then parse. Validate content type and status before expensive processing. Keep endpoint configuration, signatures and authorization unchanged; this is resource hardening, not evidence of an existing endpoint compromise.

### 20: AUD-020: Recovery child processes inherit more secret environment data than they need.

**Priority:** Low · **Type:** Hardening gap

**FILES:** `packages/db/src/recovery-files.ts:41`

**Problem:** nativeEnvironment starts by copying process.env and removes a fixed list of keys. That list omits newer pricing secrets and signer package/map variables. When present in a caller’s environment, unrelated credentials or encrypted key packages can reach pg_dump/pg_restore. The selected backup workflow need not currently supply those values for the helper’s least-privilege guarantee to be incomplete.

**FIX:** Construct an explicit child-process environment allowlist covering only required executable paths, locale, selected database credentials and TLS configuration. Keep unrelated auth, custody, oracle and request-signing material out of child environments, and validate separation without printing any values.

### 21: AUD-021: Large duplicated portal/controller modules and pervasive any weaken contract checking.

**Priority:** Medium · **Type:** Structural improvement

**FILES:** `server/api.ts`; `components/native-portal.tsx`; `components/native-admin.tsx`; `components/member-portal.tsx`; `components/account-portal.tsx`

**Problem:** The request dispatcher, payment portal and payment administration each combine many independent workflows in large components/functions. Several transport/state boundaries use any, while authentication, notices and session invalidation are repeated across portals. Syntax/import inspection confirms this structure; the missing HTTP route wiring illustrates a concrete contract that compilation does not currently connect. This is maintainability/type-safety debt, not a separate proven exploit.

**FIX:** Split by bounded feature: identity/session bootstrap, checkout, recovery, queue administration and public content. Define closed request/response DTOs and typed state transitions, then share scoped async/lifecycle helpers. Keep domain math independent of framework/DB code. Prefer a small explicit route registry that makes handler-to-HTTP wiring reviewable.

### 22: AUD-022: Web financial services receive broadcast-capable adapters despite narrower facades existing.

**Priority:** Low · **Type:** Hardening gap

**FILES:** `server/financial-config.ts:36`; `packages/chains/src/runtime.ts`; `packages/chains/src/index.ts`

**Problem:** The web-facing adapter export aliases runtimeAdapter, which returns the full ChainAdapter including broadcast methods. Separate observation/preparation facades already exist, but this alias does not use them. No current web broadcast call or leaked signing key was found; the issue is an unnecessarily broad capability boundary that makes future accidental sender logic easier to introduce.

**FIX:** Provide explicit runtime observation/preparation factories for web services and reserve the full sending adapter for the isolated signer. Preserve all required read, ownership and unsigned-preparation operations through narrow interfaces. Enforce the import/capability boundary without moving private keys or signed payloads into the web process.

### 23: AUD-023: Missing RPC history can be mistaken for proof that a signed payment expired without landing.

**Priority:** High · **Type:** Code finding

**FILES:** `packages/chains/src/solana.ts:660`; `packages/chains/src/tron.ts:695`; `server/crypto-expiry.ts:11`; `server/crypto-payouts.ts:490`; `server/crypto-operational-recovery.ts:108`

**Problem:** Both expiry verifiers accept missing transaction records plus a finalized height/time beyond validity without establishing retained-history coverage. Two independent providers can both lack older records after an outage or pruning. Actual-method fixtures returned true for that situation. The server can then mark the attempt expired, and recovery can release its hold despite a previously landed payment. This could fund another payout. No real double payment was performed; the risk depends on missing historical coverage, not merely a request timeout.

**FIX:** Keep the outcome unresolved when historical coverage is unknown. Require independently verified coverage of the entire possible inclusion window, with durable signing slot/block anchors and complete canonical transaction evidence, before releasing funds. Enforce this rule in the authoritative expiry/closure path, reject malformed/error responses, and retain signed packets and reservations. Network validity ending proves that future inclusion is impossible; it does not prove that earlier inclusion never happened.

### 24: AUD-024: The signer dispatch cursor loses timestamp precision and can starve later payouts.

**Priority:** High · **Type:** Code finding

**FILES:** `workers/signer/store.ts:199`; `workers/signer/store.ts:206`; `workers/signer/store.ts:212`; `packages/db/src/schema.ts:479`; `packages/db/fresh-install.sql:3302`

**Problem:** pending reads PostgreSQL microsecond timestamps into JavaScript Date objects, then persists and compares the millisecond value. Rows in that final millisecond can consequently qualify again even when their IDs precede the saved ID. With 40 generated pending obligations inside one millisecond, the actual method selected the same first 20 on three calls; only 20 were reached. If that group remains eligible while awaiting confirmation or recovery, later obligations can remain undispatched.

**FIX:** Preserve exact database timestamp text or update the cursor directly from the selected database row without a Date conversion. Use the exact same timestamp/ID ordering for selection and wraparound. Verify progress through timestamp ties and sub-millisecond bursts while earlier obligations remain eligible; preserve all original obligations and signed attempts.

### 25: AUD-025: Greedy business-payout splitting rejects totals that have a valid dust-safe split.

**Priority:** Medium · **Type:** Code finding

**FILES:** `server/crypto-business.ts:147`; `server/crypto-business.ts:173`

**Problem:** Each leg takes the per-transfer maximum until the last remainder. A remainder below the registry minimum rejects the whole transaction, including earlier valid legs. The actual function rejected a total of 1000001 units with a 1000000 maximum and 10-unit minimum, although 999991+10 is valid. A control total of 1000010 succeeded. An otherwise payable business balance can remain blocked until a later credit happens to change its remainder.

**FIX:** Plan all leg amounts before reserving funds or making RPC calls. Redistribute a small final remainder across earlier legs while preserving the exact total, the minimum, the effective signer maximum and the leg-count cap. Treat a total below the minimum as deferred; do not discard dust or debit it as a fee.

### 26: AUD-026: One non-payable business account can block daily settlement for every later account.

**Priority:** Medium · **Type:** Code finding

**FILES:** `server/financial-operations.ts:153`; `server/financial-operations.ts:179`; `server/financial-operations.ts:191`; `server/crypto-business.ts:175`

**Problem:** The daily dispatcher always starts at the first asset/role without a successful daily key and immediately returns its settlement attempt. A legitimate positive balance below dust throws instead of creating that key. Every later invocation therefore retries the same account before any later asset/role. An actual-dispatcher fixture confirmed three identical attempts and no later account reached. Stale prices, missing destinations or other persistent failures can produce the same starvation. This concerns dispatch progress, not cron frequency.

**FIX:** Use a durable rotating cursor or bounded per-account retry schedule. Defer balances below the minimum without marking their money settled, and allow unrelated eligible accounts to progress. Record failures and alert appropriately while applying backoff; distinguish a temporary deferral from a completed daily settlement. Keep each account reservation and daily idempotency boundary intact.

### 27: AUD-027: Refreshing an open notification inbox drops history without repairing its cursor.

**Priority:** Medium · **Type:** Code finding

**FILES:** `components/notification-inbox.tsx:13`; `components/notification-inbox.tsx:16`

**Problem:** Load-more retains the last 100 rows, while a live initial-page refresh prepends new rows and retains the first 100. The refresh does not rewind the continuation cursor. A Chromium reproduction with the actual component loaded 105 notices, refreshed the first 15 and lost notices100–104; the next page started at105, leaving a gap. The records remain in the database, but further paging in that open inbox skips them.

**FIX:** Manage notification history as a consistent page window. If a refresh discards older loaded rows, reset the continuation to that boundary or restart paging visibly. Alternatively keep live-head updates separate while browsing history. Apply bounded storage, stable deduplication and scope-bound responses without silently dropping rows behind an advanced cursor.

### 28: AUD-028: Mainnet recovery records use a fingerprint derived with a literal testnet environment.

**Priority:** Low · **Type:** Code finding

**FILES:** `packages/db/src/treasury-inventory.ts:5`; `packages/chains/src/runtime.ts:85`; `server/chain-recovery.ts:121`; `server/chain-recovery.ts:161`; `server/financial-monitor.ts:151`

**Problem:** The recovery/inventory hashing helper hardcodes testnet, while the runtime helper includes the asset environment. Mainnet checkpoints, recovered inflows and historical-address projections therefore identify the same treasury differently from signer/obligation records. A pure-function check confirmed the mismatch for a generated mainnet address. This impairs provenance correlation and operator reconciliation; no cross-environment spending or bypass was demonstrated.

**FIX:** Use one environment-aware fingerprint definition for newly created runtime, checkpoint and monitoring records. Require the environment in the helper input and preserve existing testnet hashes. Provide explicit compatibility handling for retained mainnet recovery fingerprints rather than silently rewriting immutable financial evidence or reclassifying historical records.

### 29: AUD-029: A shortage alert for one asset can suppress another asset sharing the same treasury.

**Priority:** Medium · **Type:** Code finding

**FILES:** `server/financial-monitor.ts:91`; `server/financial-monitor.ts:105`; `server/financial-alerts.ts:66`; `packages/chains/src/runtime.ts:85`

**Problem:** Liability-shortage condition keys include chain, network and treasury fingerprint but omit the asset. BNB and USDT on the same BNB wallet therefore share one condition. Once the BNB alert is acknowledged, a new USDT shortage returns that acknowledged row without updating details or delivering a new alert. An actual alert-function fixture confirmed this. When both are open, alternating details can instead cancel and replace deliveries. Per-asset custody problems are not represented independently.

**FIX:** Include the asset identity in liability-shortage condition keys; keep genuinely chain-wide gas/signer conditions scoped to the treasury. Ensure acknowledgement suppresses only the same asset and occurrence. Preserve old delivery keys and audit history, and check simultaneous shortages, acknowledgement of one asset, recovery and recurrence of the other.

### 30: AUD-030: Oversized unmatched deposits are approved for refunds that the signer cannot send.

**Priority:** Medium · **Type:** Code finding

**FILES:** `server/unallocated-refunds.ts:186`; `server/unallocated-refunds.ts:219`; `workers/signer/store.ts:311`

**Problem:** reserveUnmatchedRefund approves and holds the entire original deposit without checking the per-transfer signer limit or planning smaller legs. The actual function approved a $2 refund against a generated $1 policy limit. SignerStore.claim rejects that principal with SIGNER_CAP_EXCEEDED. The refund cannot proceed at that quoted price and limit; releasing and recreating the same full-principal request repeats the problem. Funds remain held rather than being silently lost.

**FIX:** Check the effective signer cap before reserving funds. Support resumable, dust-safe refund legs that return the exact original principal to the verified original sender, with stable lineage and no resend of settled legs. Until splitting exists, return a clear actionable rejection before creating an approved hold. Preserve signer limits and full-principal accounting; never silently trim the refund.

### 31: AUD-031: Replaying a deposit-observation job sent to review can finish without rechecking the transfer.

**Priority:** Medium · **Type:** Code finding

**FILES:** `server/jobs.ts:116`; `server/jobs.ts:125`; `server/jobs.ts:163`; `server/jobs.ts:232`; `packages/db/fresh-install.sql:1096`

**Problem:** After the observation retry ceiling, the executor marks its observation review and its job dead_letter. Generic administrator replay accepts that job, but the executor only verifies observations whose status is pending. The actual replay/executor functions changed a generated job from dead_letter through pending to done with zero deposit checks; its observation stayed review. The SQL guard also prevents simply changing review back to pending. A successful-looking retry leaves the payment unresolved.

**FIX:** Provide an explicit reviewed-resume operation with a new bounded verification generation, preserving the original observation and job history. Alternatively reject generic replay for review observations and direct the administrator to the supported resolution workflow. Do not reset immutable history or mark verification successful without performing it. Show the unresolved review state accurately in job and payment screens.

### 32: AUD-032: Solana ATA rent top-ups can disappear from native-fee accounting.

**Priority:** High · **Type:** Code finding

**FILES:** `packages/chains/src/solana.ts:35`; `packages/chains/src/solana.ts:548`; `server/crypto-settlement.ts:82`; `server/crypto-settlement.ts:239`

**Problem:** If a destination associated token account receives lamports after preparation but before creation executes, its program funds the remaining rent through a System transfer, allocate and assign. transactionCosts classifies that transfer as principal and reports zero setup cost. The actual adapter accepted a generated valid transaction shape spending 2,044,279 lamports but reported only the 5,000 network fee, omitting 2,039,279 rent. Settlement then understates treasury costs and can over-refund the approved setup charge. The program’s official implementation confirms this branch.

**FIX:** Classify ATA rent funding using the parent instruction, validated account identity/owner/mint and pre/post balances. Separate actual SOL principal from rent top-ups and include all measured setup costs exactly once in the native cash ledger. Preserve the approved beneficiary charge cap and company-paid variance. Keep unsupported or inconsistent instruction shapes under review instead of treating their setup cost as zero.

### 33: AUD-033: Release-profile status reports real-money payments disabled regardless of current configuration.

**Priority:** Low · **Type:** Code finding

**FILES:** `components/release-profiles.tsx:27`; `components/admin-panel.tsx:20`; `server/transparency.ts:68`; `components/native-portal.tsx:445`

**Problem:** The release-profile screen always says Real-money payments remain disabled, including when reached from the mainnet administrator portal. Its API assessment also hardcodes mainnet_enabled:false and a fixed unresolved checklist. Rendering the actual component with mainnet settings reproduced the unconditional message. These values do not inspect current financial activation and can mislead an operator checking launch readiness. This is an incorrect status report; no activation bypass or live production rollout was demonstrated.

**FIX:** Distinguish the saved readiness assessment, profile changes and current payment execution status. Obtain execution status from the authoritative financial configuration and per-asset activation checks; pass the environment into the screen and localize accurate messages. Keep unknown or unchecked requirements explicit. Changing a presentation profile or recording approval must never enable payments by itself.

### 34: AUD-034: Changing language in another tab leaves server-rendered content in the previous language.

**Priority:** Low · **Type:** Code finding

**FILES:** `components/appearance-provider.tsx:34`; `components/appearance-provider.tsx:59`; `server/public-pages.tsx:79`; `app/help/article/page.tsx:8`

**Problem:** The locale storage-event handler updates React context and the document language but never updates the URL or requests translated server content. In Chromium, the actual provider changed its client language to French while the URL and generated static article remained English; the router received zero calls. Real published pages render their article text on the server, so another tab’s language change can leave navigation and content disagreeing until navigation or reload.

**FIX:** Use one locale-navigation operation for local choices and cross-tab changes. Update the localized URL and request matching server content while preventing storage-event loops. Define what happens when a page has an explicit language choice, and defer server refresh safely while offline. Keep document language, metadata, navigation and article text consistent.

Provider-history references for AUD-023: [Solana transaction queries](https://solana.com/docs/rpc/http/gettransaction), [Solana retained ledger range](https://solana.com/docs/rpc/http/getfirstavailableblock), and [TRON historical query limits](https://developers.tron.network/docs/faq).

ATA implementation reference for AUD-032: [Associated Token Account rent funding, allocation and assignment](https://raw.githubusercontent.com/solana-program/associated-token-account/main/program/src/tools/account.rs).

## Ratings and brief review

These are qualitative source-review scores out of 10, not measured throughput, a security certification or verified post-fix results.

- **Overall: 5.5/10 now; projected 8/10 after the proposed fixes.** Expiry proof, payout dispatch and alert-scope defects lower the earlier assessment. Existing financial safeguards remain useful, but real-money readiness is not established.
- **Financial implementation: 5/10 → 8/10.** Integer amounts, idempotent journals, immutable attempts and independently checked settlement evidence are good foundations. Expiry closure must distinguish unavailable history from non-inclusion; signer paging, business/refund progress, Solana rent accounting and ambiguous member-wallet sends also need correction.
- **Security/defense in depth: 7/10 → 8.5/10.** Live database/session checks, origin/CSRF validation, replay nonces, restricted roles, DNS pinning and signer isolation are visible in implementation. Rate-limit coverage and secret/resource boundaries need tightening.
- **Performance/free-hosting suitability: 5.5/10 → 7.5/10.** Bounded pools/caches and cursor infrastructure help, but growing scans, synchronous fan-out and large transactional batches undermine predictable cost. Thousands of concurrent users and zero-cost operation are not verified.
- **Architecture/type safety: 6/10 → 8/10.** Domain/DB/chain packages provide useful boundaries; large controllers, repeated portal logic and broad DTO/adapter types make integration errors easier.
- **SEO: 7/10 → 8/10.** Localized metadata, canonical links, sitemap generation and private-page indexing restrictions exist in code. Historical slug ownership is guarded; unbounded redirect inventory remains a problem.
- **UX/accessibility/recovery: 6.5/10 → 8/10.** Labels, keyboard targets, reduced-motion handling and localized feedback are present; stale selection/copy/connectivity/language state, misleading readiness copy, inbox gaps and inaccessible queue pages remain. Physical-device and assistive-technology acceptance are separate.

## Database and Supabase grant assessment

Independent SQL inspection found 96 logical application tables plus 3 default partitions; runtime Drizzle descriptors map 96 tables and 897 columns. All 77 SECURITY DEFINER functions in the fresh-install SQL have an explicit search_path. The SQL normalizes object privileges and grants the application’s custom roles explicitly; new-table accessibility does not depend on Supabase automatically granting Data API access.

I did **not** identify a missing-grant defect requiring blanket access for anon, authenticated or service_role. Those roles have no direct grants in the fresh-install application grant block. This application uses server-side Postgres roles; opening private financial tables to the Data API would weaken that design. Future table/index changes must retain explicit least-privilege grants, RLS and recovery compatibility. Static mapping coverage does not prove every possible database behavior correct.

## Proposed implementation order — awaiting your review

1. **Protect funds and payout progress:** AUD-023–024 and AUD-032, then AUD-003–004; keep unknown outcomes held and bind actions to the correct intent.
2. **Restore reachable functionality:** AUD-001–002; verify actual protected HTTP paths.
3. **Repair settlement and monitoring:** AUD-025–026 and AUD-028–031; preserve exact totals, provenance, independent asset alerts and honest replay results.
4. **Stabilize sessions and request handling:** AUD-005–008 and AUD-018–020.
5. **Bound growing workloads:** AUD-009–013 and AUD-015; preserve financial history and accounting.
6. **Finish UI correctness and narrow boundaries:** AUD-016–017, AUD-021–022, AUD-027 and AUD-033–034. AUD-014 requires no fix.

Use substantial related batches, update the report as fixes are verified, and preserve original/failed financial evidence. Do not weaken activation, grants, custody isolation or financial verification to make a failing path appear complete. No implementation or merge is authorized by this report itself; the owner explicitly requested review before fixes.

---

**End of report — 21 October 2026, 11:44 PM WAT (Africa/Lagos)**

Independent source audit · 33 open findings + 1 withdrawn · revision `3782caf49d60` · no fixes applied.
