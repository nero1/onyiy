# Project status v50

Updated: **16 October 2026 at 08:06:03 PM WAT**.

## Scope and stop boundary

The owner requested shared hosted resources, one payment-mode switch and detailed browser setup for preview/testnet/real-money production. Complete this scoped PR and its verified merge, report, then **halt**. Other bug work and Phase Two remain paused.

| Area | State |
|---|---|
| Round One | **72/74 implemented and locally verified**; P1-009/P1-028 open |
| Rounds Two/Three and Phase Two | Not started; paused |
| Mainnet production | Not implemented; web/signer gates remain false |
| Shared resources | One existing Supabase database, Upstash database and Vercel project; trusted Preview/Production share data and quotas |
| Payment mode | `APP_ENV=simulation` or `testnet`; matching provider defaults, no silent override replacement |
| Current completion percentage | Not established; bug counts and historical M0–M8 coverage are not weighted release acceptance |

## Changes in this pass

- Added pure provider defaults used by authentication, price selection and hosted validation/initialization. Google and Turnstile credentials are checked for hosted testnet setup.
- Added a transactional shared-database promotion guard. Existing simulation records remain; after testnet initialization, simulation access/seed/reset is rejected. A row fence covers stale repeatable snapshots. SETUP also retires older code through credential rotation.
- CI now selects Preview variables for the actual branch and supplies explicit GitHub branch metadata for prebuilt deployment. Owner initialization runs with the GitHub-only marker override, keeping real Vercel owner-credential rejection intact.
- Replaced hosted migration execution with exact **manual-schema receipt verification** before binding/seeding/runtime checks. Shared deployment initialization is queued across branches.
- Added bounded server-only `ASSET_REGISTRY_JSON`, retaining validated file input and identical content fingerprints; conflicting sources fail.
- Added exact owner-only first-Google-admin SQL to SETUP: identity/2FA/first-use guards, permanent key, audit and session invalidation; the documented statement passed rollback-only generated checks.
- Health now distinguishes payment environment from Vercel hosting stage.
- Expanded SETUP with same-project preview, Google/Turnstile testnet preparation, wallet/RPC/registry steps and explicit mainnet preparation/blockers. No fictional mainnet activation or browser-only custody/restore wizard is claimed.
- Kept five core docs plus the two requested bug trackers; current filename pair/trackers are v50. No SQL/schema/financial history/readiness gate changed.

## Verification

Passed locally:

- Required `check:all`, production build and bundle budgets: homepage **180.34 KiB / 200**, API **1.394 MiB / 3**, clients **0.661 MiB / 2**. Existing root README/AGENTS doc warnings remain.
- Fresh schema-free binding and manual-only initialization; absent/mismatched receipts rejected without installing SQL. The reviewed baseline/schema/evidence bytes are unchanged.
- Matching simulation/testnet provider defaults without env mutation; incompatible/empty overrides, missing hosted Google/Turnstile settings, invalid registry and mainnet/stage-as-payment values rejected.
- Inline/file registry fingerprint parity, source conflict and byte-limit rejection.
- Both promotion orderings: active simulation transactions drain before promotion; stale repeatable snapshots fail closed. Read-only snapshots remain readable and reject callback writes. Configuration value/version/audit metadata and original identities remain unchanged.
- Promoted simulation requests/seed/reset denied; testnet binding/runtime/initialization succeeds. GitHub owner initialization works even when pulled settings contain the real Vercel marker; real web owner credentials remain forbidden.
- Actual production-build HTTP: EN/FR homepage/help 200; health reports testnet/preview, disabled signing and mainnet false; Google-default bootstrap works; demo-session route is denied. Generated Google-start checks made no external identity request.
- Exact documented first-admin SQL denies missing identity/factor, grants once with permanent key/audit/session invalidation, rejects replay; generated rows were rolled back.
- Seven-doc layout, links/versions, all 74 original findings/fixes/acceptance checks and unchanged SQL/schema proof files verified. Pinned Vercel CLI supports the branch-settings flag; official docs support explicit branch metadata.

Named private evidence is under `/workspace/work/shared-hosting-v50`, using a fresh isolated cluster and clearly labelled fixtures. Draft procedure failures and the deliberate invalid-receipt clone are retained; they are not final acceptance evidence. No original financial source, hosted account, signer, broadcast, mainnet activation or broad deferred suite was involved.

Merge rule: both exact-final-head push and PR CI must succeed; the PR's check records provide the final build/merge evidence. Actual hosted Google callback, Turnstile/RPC/Upstash, branch-domain association and capacity acceptance remain unrun until observed on the owner's services.

## Prior merged evidence

- [PR46](https://github.com/nero1/onyiy/pull/46): P1-039 ledger counters.
- [PR47](https://github.com/nero1/onyiy/pull/47): one final-state SQL installer; 92 tables/848 columns/274 CHECKs/105 standalone indexes, exact encrypted 79-inventory restore.
- [PR48](https://github.com/nero1/onyiy/pull/48): documentation consolidation, merge `26a85e5297efe816ea7e839929c244ff04618f28`; exact-head push 38893204805 and PR 38893237617 passed.
- The unchanged schema contract remains `packages/db/schema-contract_v48.json`. Original sources, failed fixtures, archives, keys and signed evidence remain preserved.

## After this PR

Halt. When the owner resumes application work, finish P1-009 (historical receiving-address monitoring/custody) and P1-028 (retention/archives), re-audit/fix later rounds, then implement PRD §32 and final defects. Real-money release additionally needs actual adapter/custody/alert/recovery evidence and the approved transparent profile; changing a hosting label cannot supply it.

[Setup](SETUP.md) · [Handover](LLM-HANDOVER_v50.md) · [Bug report](custom-bugs-report_v50.md) · [Fix plan](custom-bugs-fix-plan_v50.md).

v50
