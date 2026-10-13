# Continue Gifters World — Phase One

Before code changes read, in order: docs/PRD.md, docs/PROJECT-STATUS_v25.md, docs/SETUP.md, docs/HOW-IT-WORKS.md, then the user's prompt and actual AGENTS.md/Next guides.

**Owner directive — preserve in every handover:** implement all M0–M8 irrespective of acceptance of M1, M2 or any earlier milestone. Move quickly to100% Phase One implementation in as few substantial verified iterations as practical. Continue independent work while acceptance inputs are deferred; keep implementation coverage separate from hosted/live acceptance and release permission. Choose sensible defaults, do not ask routine confirmation, continue fixing defects. Never promise automatic resumption after the session stops.

**Every completed iteration must create a PR and merge after both final-head push and PR checks pass.** Authorized; never direct-push main. PR23 merged after exact e02986558e49cf4ecd217709792b15218f5dc94f push38344371120/PR38344453522 success; squash81044242503d1ebeb5915b74b7b8c4dd5a9f8905 mainCI38344765333 passed. Finish the current v25 PR before the next batch.

Current weighted implementation84.20%/15.80% remaining; M0 98,M1 99,M2 92,M3 75,M4 92,M5 84,M6 75,M7 40,M8 70. Status contains the actual named verification and limits. Do not finalize at this percentage.

## Preserve architecture and financial contracts

Native Next16 App Router/Route Handlers, Node22.23.3, Drizzle/Postgres/Supabase, economical cache, GitHubActions→Vercel. No Docker/Hono/Vite/local-first. Filesystem routes bracket-free; rewrites preserve parameter URLs. Next16 retry prop differs from older reset. Dynamic nonce-CSP routes must render dynamically; static native wallet HTML caused a retained hydration failure and was fixed.

64 tables/migrations001–041 are RLS/classified; owner-only checksum migration history rejects edits. Restricted NOINHERIT nonowner web/read roles, separate signer login/role, fresh owner/runtime challenge and strict host/certificate TLS remain mandatory. Browser/DataAPI financial/admin/identity grants stay closed. SQL stays in documented locks/PG infrastructure/catalog/rank exceptions. Seeds insert only missing settings. DB transaction-time typed/versioned manifest owns policy; all economics base units/balanced append-only sealed journals, immutable snapshots/permanent request keys. Preserve all money, rights, failed fixtures, work/history and old archives; never reset real/shared sources.

GIV is nonredeemable simulation-only and its issuer differs from testnet. Inherited v24 fresh six GIV scenarios/same-plan concurrency passed. Sparse40-bit display/FIFO/priority queues preserve immutable tickets/actual serving independence. Staged incoming custody and savepoint/immediate deferred constraints preserve refunds when admission becomes ineligible. Receiver completion credits balances; it never auto-withdraws. Unfunded future receipts are conditional.

Cookie identity has isolated dummy/configured Google state/nonce/PKCE/JWKS, explicit terms/adult/username, secure families/refresh reuse/version revocation/CSRF/Origin. MFA uses encrypted TOTP, monotonic replay and one-use recovery codes; staff/money commit fences protect live identity. Private browser data stays in scope-bound component memory, cross-tab messages carry metadata only, no offline mutations. Local public compact/IndexedDB and L1 budgets are bounded; activation invalidates public flights. PWA caches five public assets only. Pending/suspended nav stays restricted.

Moderation is audited CAS/reasons, sorted locks and independent staff permissions. Deletion anonymizes identity/secrets but retains financial UUID/history/tombstone/rights. Verified blocked liability recovery and last-admin recovery are still required. Own bounded async JSON/CSV has encrypted chunks/quotas/cursors, authenticated downloads, formula escaping and no auth/signer secrets; site/selected-user UI remains incomplete. Plan lifecycle versions preserve outstanding economics/rights and bounded bootstrap/schedules.

## Native contracts verified in v25

SDK versions remain ethers6.15/Sol1.98.4/SPL0.4.14/TronWeb6.0.4/scure1.2.6, isolated in chain adapters/lazy wallet client. Registry defaults empty, only named testnet assets; operational trx gas-only. Immutable asset identity/registry snapshots bind historical transfers. Independently configured RPCs pin testnet/genesis, bound rate/time/response/cache and lossless >53-bit quantities; canonical hash/block membership/provider disagreements cannot silently confirm. No real contract/mint/address invented.

Provisioning/plan activation validates network/decimals/binding, stages disabled, pins signed rates/base units and avoids duplicate versions/bootstrap. Native portal explicit ownership proof moves no funds. Exact user-approved incoming preparation validates immutable invoice/linked address/live eligibility/version, shows sender-paid network/setup fees, and asks injected wallet approval separately. EVM only transfers with wallet-selected nonce; SPL exact transferChecked/ATA; TRON protobuf/testnet host. Scope rechecked before send. Native profile uses home/gifts/wallet.390px EN/FR actual production browser ownership/payment passed, no private address storage/overflow. Catalog button gate was intercepted only for the named local fixture; live code remained disabled.

Unknown event index -1 stages a hash before receipt. Durable observer continuation discovers a unique matching event and verifies finality; missing/ambiguous evidence preserves pending/zero custody. Original first-seen time persists. Canonical hash replay and global cross-purpose event keys prevent duplication. Local pending→final and repeated tick probe passed.

Native contributed reserve has explicit funder ownership statement/verified receipt/permanent replay. Treasury/equity only, no user balance and no company expense for funder's gas. SOL setup is separate from network gas; worker variance applies to network only. Quotes/postings/refunds pin exact rates. Local generated evidence proves contracts, not real physical funding/custody.

Failed executed withdrawal remains held until every immutable attempt is positively failed and reverified. Exact600000 hold/13500 charge/586500 return/no principal/replay passed, including contradiction preserving hold. New quote links prior obligation and does not auto-hold/send. Forward041 fixes a reproduced guard querying protected signed payload table: use safe metadata view, never grant web encrypted bytes. Unresolved/expired hashes still cannot release. Requote/replacement/expiry/reorg/checkpoints remain incomplete.

Signer is isolated: encrypted key file/private decryption and independent payload key, protected DB role, hard principal/day/gas caps/reservations, persist-before-broadcast, nonce advances only encrypted persist, stale lease denied, unchanged bytes on ambiguity, post-ledger status repair. Both financialImplementationComplete in server/financial-config.ts and implementationComplete in workers/signer/run.ts are false. Do not flip them to make a probe pass or claim completion. Close invariants then independent owner/live release gates.

Workload HMAC binds method/path/env/body/time/nonce; bounded challenges/nonces/retention. Authenticated alert ACK echoes permanent key/digest, HTTP200 insufficient. Concurrent reminders obey global daily cap/permanent ordinals; audited acknowledge/resolve. Opt-in separate financial scheduler handles one daily business asset/role, monitors/reminders/delivery/cleanup; real endpoint/scheduling is unrun. Native admin controls implemented but full UI acceptance remains.

## Local evidence and tooling

Source gw_v25_native TLS55433, archive work/backups/v25-native.gwbackup, inactive restore gw_v25_native_restore:57 retained/64 schema/RLS/grant definitions exact. Old v24 final/source/failed databases,version-bound inventories and archives remain unchanged; old formats stay version-bound. Native children strip all signing/auth/MFA/backup/export/workload/alert secrets. Restore never resumes workers; trusted-chain checkpoint recovery is still required.

Scratch under /workspace/work: manual-v25-provision-r3, native-funding, observer-index, spl-setup, hash-replay, wallet-send-r2, failed-recovery-resume, reminders, payment-browser-r4 and logs. All initial failed logs/fixtures retained. No broad automated suite. Local checks/build/bundle/grants/secrets passed,109 translation keys,193.51KiB homepage/9scripts. Re-run checks applicable to changes and exact-head CI, not unchanged historical probes without reason.

Node /workspace/work/tooling/node-v22.23.3-linux-x64/bin; npm cache/workspace/work/npm-cache. PGplain55432 and TLS55433; TLS tools/workspace/work/tooling/pg-tls/bin, CA/workspace/work/v20-tls/root.pem. Node --env-file supports multiline CA. Private env/key files0600 underwork, never dump values. Network/listeners/tsxIPC need tool network permission; Git metadata needs write permission /workspace/onyiy/.git. Chromium CDP9340, close only local fixture tabs before cross-tab/cookie probes (cookies ignore ports); new build needs fresh server port/chunks. Last UI probe port3380, earlier ports/source fixtures preserved.

Current developer prohibits subagents unless explicitly requested; none used. Read managed-cloud runtime skill on resume. Auto-review previously rejected reverting incidental formatter output in financial-review; it was kept and mergedPR23, never bypass that rejection. No outstanding block. Communicate concise progress every60s. Avoid analysis loops: inspect exact files, make concrete changes, run named probes.

## Continue now

Close replacement/expiry/requote state and native reorg/checkpoints/unallocated transfers/sweeps/hot caps. Then CAPTCHA, verified blocked-account liabilities/last-admin recovery, selected-user/site portability UI, native pagination/receipts/full admin/product controls, public metrics/accessibility/archive/retention. Keep financial activation false until implementation closure. Owner deferred hosted Supabase/Upstash/Vercel/Google/provider/registry/live ACK inputs do not block independent implementation. Do not ask routine permission or finalize84.20%.

Update HOW/SETUP/PRD for actual behavior/requirements, advance pairv26 next, remove prior pair/update markers, verify and PR/merge every completed iteration. At actual100% issue a completion handover with independent acceptance gaps explicit; continue fixing known defects under existing authorization.

v25
