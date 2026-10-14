# Gifters World — autonomous remediation handover v43

Updated: **14 October 2026 at 01:33:00 PM WAT**.

Read in order: docs/PRD.md, docs/PROJECT-STATUS_v43.md, docs/SETUP.md, docs/HOW-IT-WORKS.md, AGENTS.md, docs/custom-bugs-report_v43.md, docs/custom-bugs-fix-plan_v43.md. Read relevant installed Next guides before code changes.

The owner approved all Round One fixes, autonomous Rounds Two/Three and continued remediation, every Phase Two milestone and final bug fixes before deferred tests. Continue without plan or milestone acceptance pauses. Use best recommendations and substantial verified batches. Merge only after BOTH push and pull-request CI succeed for the exact final head. No delegation requested. CRON frequency and test-only issues remain excluded.

Round One: **65/73 tracked findings implemented and locally verified;8 open**. The original audit had70 findings; P1-071/P1-072/P1-073 were discovered and fixed during remediation. This is item accounting, not a weighted Phase One percentage. Phase One remediation is incomplete; Phase Two has not started.

PR39 merged at4558fe619738de55f1263b2678bedd8d13cf968a after push38534378166 and pull_request38534388168 both succeeded for exact head9304e67d71d4e7b605642761271703649723dd2e. PR40 merged at1b2fa3b592c1b5c2bf0dc85dfc806868fe348401 after push38540185905 and pull_request38540196203 succeeded for exact head3bd6595c337afc07889e22fed5710e8d2a93cdd3. PR41 merged at864e8cbbd6025aeb249126571579adbcd69d08fc after push38551692293 and pull_request38551699013 succeeded for exact head7d63c89ba9633879832bd3e543712ae31baa677c. Current branch feat/phase-one-remediation-round1n awaits final-head dual CI and merge.

Read [custom-bugs-report_v43.md](custom-bugs-report_v43.md) and [custom-bugs-fix-plan_v43.md](custom-bugs-fix-plan_v43.md) for every finding and acceptance. All four current filenames match_v43; earlier versions remain in Git history. Rename all four together in the next batch and update cross-links, WAT12-hour headers/footers and mirrored markers.

Implemented: P1-001, P1-002, P1-003, P1-004, P1-005, P1-006, P1-007, P1-008, P1-010, P1-011, P1-012, P1-013, P1-014, P1-015, P1-016, P1-017, P1-018, P1-019, P1-020, P1-021, P1-022, P1-023, P1-024, P1-025, P1-026, P1-027, P1-029, P1-030, P1-031, P1-032, P1-033, P1-034, P1-035, P1-036, P1-037, P1-040, P1-041, P1-042, P1-043, P1-044, P1-045, P1-046, P1-047, P1-048, P1-049, P1-050, P1-051, P1-052, P1-053, P1-054, P1-055, P1-056, P1-057, P1-058, P1-059, P1-060, P1-061, P1-062, P1-066, P1-068, P1-069, P1-070, P1-071, P1-072, P1-073.

Open: P1-009, P1-028, P1-038, P1-039, P1-063, P1-064, P1-065, P1-067.

## V41 changes

Relevant member pages now subscribe to one visible-online clock per account/session in the document. Consumers of the same snapshot coalesce into one GET; dashboard/native status and notification updates share their financial snapshot. Requests have10-second deadlines, jitter and at most six transient retry attempts with bounded exponential backoff; definitive errors stop and offer an explicit retry. Hidden/offline transitions abort active reads and stop dispatch, route exits dispose subscriptions, and obsolete account/generation responses are inert. Manual refreshes advance read generations so older poll responses cannot replace them. Export status no longer has a separate interval. Native snapshots include own notifications/badge and public-only policy; simulation policy and owned views share a repeatable transaction through withMemberSnapshot, retaining the ordinary completion fence. Member continuation pages survive parent refreshes; open inboxes include newly arrived messages. No private DTO enters storage or cross-tab broadcasts.

## Verification and boundaries

Named Chromium manual-private-poll-r2 passed two-consumer request coalescing, generated external update, hidden/offline pause, delayed previous-account rejection, six-attempt backoff, late stopped-state handoff, explicit retry, definitive-error stop,10-second deadline and disposal using a labelled generated clock/API. These are protocol checks, not wall-clock/provider capacity measurements. Manual-snapshot-shape-r3 passed exact native income8500000, own notifications/badge, other-user exclusion and public-only policy in rollback-only reads. Initial role fixtures correctly rejected reading private policy/owned views under the wrong role; the helper reads policy under service and owned views under member, without widening grants. Manual-member-snapshot-fence passed the actual helper, concurrent family revocation before response completion and rejection of future reuse; its generated revoked family is retained in the inactive clone. Manual-member-page-refresh passed real Chromium continuation preservation, filter reset and obsolete-account rejection. Earlier syntax/type/harness failures remain in private evidence; no financial history changed.

Required check:all/build/bundle pass (homepage199.74KiB/200; maximum API1.424MiB/3; clients0.657MiB). Evidence is under /workspace/work/remediation-v41. No schema/migration changes:86 tables/92 migrations/73 retained inventories. The exact v40 archive and inactive gw_v40_restore remain valid for this schema. Original sources/archives/signed histories remain preserved. Both financial gates remain false; no broadcast or broad automated suite ran.

## Next work

Continue the8 remaining IDs, with historical address inventory/SOL cutoff and storage/retention work still open. Complete fresh full-codebase Rounds Two and Three, fix new or reopened findings, then implement every PRD §32 P2.0–P2.4 milestone and final bug fixes before deferred tests. No acceptance pause remains.

Node22.23.3 at /workspace/work/tooling/node-v22.23.3-linux-x64/bin; npm cache /workspace/work/npm-cache. Verified TLS PG17 port55433 and CA /workspace/work/v20-tls/root.pem. Network/listener/tsx need network permission; Git metadata writes need /workspace/onyiy/.git. Never print secrets/cookies/signed bytes/raw driver parameters. Preserve immutable migration checksums and financial histories, positive evidence/holds and original-sender refunds. Corrections append compensating journals.


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

P1-065 is blocked specifically by automatic approval review. Search/index prototypes passed rollback checks in a fresh inactive clone, but two proposed production search/recovery changes were rejected due migration/restore compatibility risk and a requirement for explicit owner approval of that exact change. No extension/index/restore-validator change is in this active batch. Read custom-bugs-search-approval_v43.md for the concrete proposal. P1-038 remains partial/open. Current total65/73 implemented,8 open; Rounds Two/Three and Phase Two have not started. Continue all unaffected findings without milestone pauses.

Signed: **14 October 2026 at 01:33:00 PM WAT**

v43
