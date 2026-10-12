# Project Status — Phase One

Updated: 12 October 2026. **62.15% implemented / 37.85% remaining.** Weighted implementation estimate, separate from acceptance/release permission. No hosted/live financial gate is declared passed.

**Owner directive:** implement all M0–M8 irrespective of M1/M2 or earlier acceptance. Move toward 100% Phase One in as few substantial verified iterations as practical; do not wait for deferred acceptance to implement later milestones. Record unrun evidence separately and keep unverified live sending disabled. This direction is also in PRD §31.

| Milestone | Weight | Implementation | Contribution | Verified / remaining |
|---|---:|---:|---:|---|
| M0 — schema/config/runtime | 10% | 97% | 9.70% | 51 schemas/RLS/grants, checksum-tracked migrations, bounded history indexes. Hosted acceptance remains. |
| M1 — GIV money/queues | 15% | 99% | 14.85% | Fresh six financial scenarios; immutable plan snapshots and admission/lifecycle locks. Provider contracts remain. |
| M2 — identity/permissions | 15% | 92% | 13.80% | Cookie/MFA/status/privacy, client callback/unmount/generation fences including pre-auth. CAPTCHA and verified blocked-account/last-admin recovery remain. |
| M3 — first testnet adapter | 15% | 0% | 0.00% | Verifier/signer/native gas/business settlement implementation remains. |
| M4 — responsive product | 15% | 88% | 13.20% | Member routes/history/points/referrals/export/receipt PNG and mobile plan administration. Accessibility/copy/preview/polish and provider wallet UX remain. |
| M5 — admin/portability/recovery | 10% | 78% | 7.80% | Async own JSON/CSV, typed plan versions/scheduling/bootstrap, audited administration, encrypted46-table restore. Selected-user/site UI and remaining recovery controls remain. |
| M6 — remaining adapters | 8% | 0% | 0.00% | Named additional chain adapters remain. |
| M7 — bounded prototype release | 7% | 40% | 2.80% | Public PWA/routes and190.20KiB homepage budget. Hosted/mobile/provider/capacity evidence remains. |
| M8 — financial acceptance tooling | 5% | 0% | 0.00% | Signer/alerts/caps/live recovery/monitoring implementation and evidence remain. |
| **Total** | **100%** | | **62.15%** | **37.85% implementation remains.** |

Calculation:9.70+14.85+13.80+0+13.20+7.80+0+2.80+0=62.15. These are implementation estimates, not acceptance claims.

## Completed this iteration

- PR#21 merged after exact-head push/PR checks (b14fb327f8d79665f82277e112b55763ba97fd60; main97dd6e1f0e7c6fbb087efc29bd60600aeb575b5d). Continued without waiting for earlier acceptance.
- Migrations021–024 add owner-only schema provenance, own export requests/chunks, plan revisions/snapshot guards, history indexes and narrow plan/locking capabilities. Migration CLI records each applied file/hash atomically, skips unchanged bodies and rejects edited applied files. This prevents older kind constraints from overwriting newer durable job types. History remains owner-only, is Drizzle/RLS-classified and transfers as signed snapshot metadata.
- Own data exports build through bounded durable outbox jobs: nine closed sections,100 rows/page,1MiB/chunk,50MiB/export,10000-page guard, two active builds and two creations/day under current policy. Separate DATA_EXPORT_KEY encrypts chunks with owner/export/part AAD and content checksums. JSON/CSV downloads are own authenticated attachments with no-store, expiry and CSV formula escaping. Per-page capture/cutoff is recorded; this is not a whole-site monetary snapshot/import. Larger own datasets have paged authenticated streaming; native encrypted site CLI remains separate.
- Reads/replays no longer consume creation allowance. Failed jobs expose failed exports; stale failed-job leases cannot commit export side effects. Immutable chunks can be purged only after expiry or verified deletion, in bounded maintenance pages. Deletion locks the owner against builders and removes duplicated artifact data while retaining requests/work/financial history.
- Added real member routes for gifts/wallet, history, points, referrals, notifications, data and settled-only shares. Referral URLs prefill explicit consent; points use signed history totals, ledger DTOs omit private journal metadata/business keys, receipts use precise settled asset/network/net/fee values and generate local PNG with download/share fallback. Native OS sharing remains unrun.
- Added audited typed disabled plan creation/economics versions, CAS pause/disable/retire/schedule and bootstrap add/unfunded removal. Used snapshots cannot change; existing cycles/invoices/queue obligations block economics edits. Shared plan locks serialize admission against lifecycle edits. Public catalog returns latest versions only. New manual edits cap100 plans/100 initial positions; bootstrap pages cap100, counters remain40-bit. One approved due launch runs per tick and rechecks current schedule/version/actor, preserving manual activation and retirement guards.
- Added lazy staff plan UI and member scopes with no private artifact storage. Auth callbacks reject unmounted/changed owner/family results; pre-auth metadata and busy state remain consistent. Pending/restricted navigation is narrowed.

## Verification actually performed

- Fresh separate restricted-runtime financial fixture passed all six M1 scenarios after current plan/snapshot/worker changes. Earlier failed scheduler/empty-init fixtures remain retained; no reset occurred.
- Cookie async JSON/CSV creation/permanent replay, bounded worker completion, encryption/cross-owner denial and unchanged administrative-only postings passed. Own points/referrals/paged ledger/settled-only receipt projections rejected auth/private metadata/unsettled requests.
- Chunk update and early deletion guards passed; verified profile deletion purged artifact ciphertext and revoked access without changing postings. Two creations/day allowed repeated key/read access without another creation. A separate expired fixture returned410, bounded cleanup removed its chunk and retained its request.
- Plan creation/replay/conflicts, old economics immutability, latest catalog, bootstrap add/replay/unfunded removal, funded removal/economics refusal, retirement and due scheduled activation/replay passed with final balanced/consistent reconciliation. Checksummed migration rerun skipped; a changed scratch migration failed before data changes.
- Actual390px Chromium passed EN/FR export creation/ready links, absent artifact persistence, points/referrals/history layouts, staff pre-auth/MFA/lazy plan editor and settled receipt PNG. Native OS share/real wallet/provider/mobile installation remain unrun. Corrected the observed pre-auth generation/busy mismatch and preserved failed browser probes.
- Native encrypted roundtrip verified46 retained inventories across51 schemas/RLS/grants and copied checksummed migration history; post-restore migrate skipped already-applied files. Old archives/failed fixtures/logs/source money remain untouched. Drizzle generated/check passed; static/build/bundle/grant/secret checks pass (107 EN/FR keys,51 tables,190.20KiB actual homepage gzip). No dependency or broad automated suite was added.
- Fixed observed export read/replay quota, chunk-lock and plan-insert grants. Fixed scratch assertion/selector errors and transient schema index declarations before use; every log/fixture remains retained. New migration files contain the forward fixes rather than rewriting applied bodies.

## Remaining work and acceptance dependencies

Prioritize M3/M6/M8 now: chain verifiers/adapters, generalized financial inflow/outflow/gas/business settlement, isolated durable signer, alert delivery/caps/monitoring/recovery contracts. Do not wait for M1/M2 acceptance. CAPTCHA, verified blocked-account liability/last-admin recovery, selected-user/site portability UI, public metrics/remaining UX and bounded identity cleanup remain. Hosted Supabase/Upstash/Vercel/Google and live inputs are owner-deferred; deployments and unverified sends stay disabled. No hosted/live gate is declared passed.

Native recovery keys stay outside web/archive; own-export key is separate, server-only and stripped from native child processes. Product exports/PNG never authorize imports/payments. Older archives require matching migration revisions, then reviewed forward upgrades. Permanent keys, retained failures and liabilities are never cleanup targets.

## Continue immediately

Finish exact-head checks/PR/merge, then implement substantial financial adapter/signer/alert contracts and remaining closure requirements. Preserve the owner directive, advance the pair to v24 after the next verified batch and merge every completed iteration. Do not end at this percentage or wait for deferred acceptance.

v23
