# LLM handover v50

Updated: **16 October 2026 at 08:06:03 PM WAT**.

## Current scope

Finish only the shared-resource deployment/setup PR, verify both exact-final-head CI events, merge, report and **halt**. If already merged, remain paused until the owner resumes. P1-009/P1-028, new bug rounds and Phase Two are not resumed by this task.

Read `AGENTS.md`, [PRD](PRD.md) §§27/30/32/33, [status](PROJECT-STATUS_v50.md), [HOW-IT-WORKS](HOW-IT-WORKS.md), [SETUP](SETUP.md) and the [report](custom-bugs-report_v50.md)/[plan](custom-bugs-fix-plan_v50.md).

## Owner preferences

- Use existing accounts and preferably **one Supabase database, one Upstash database and one Vercel project**. Do not prescribe new free accounts/instances for every mode. Shared previews intentionally share test data/configuration and quotas.
- `APP_ENV` chooses simulation/testnet. Vercel Preview/Production is a separate hosting stage. “Production” in the owner's request means **real-money mainnet**, not merely Vercel's label.
- Mainnet is not implemented and remains denied. Document actual preparation/blockers; never claim changing one variable activates it safely. Unfinished Phase Two and mainnet-preview isolation remain explicit.
- Keep five core guides and the two requested versioned bug trackers. Only create another non-core document if explicitly requested or essential. Use concise beginner lists/tables and numbered browser steps; manual SQL paste only, no terminal/localhost setup.

## Implementation facts

- Repository `nero1/onyiy`; branch `feat/shared-hosted-environments`.
- Round One 72/74 locally implemented/verified; P1-009 and P1-028 open. Rounds Two/Three and Phase Two not started. Do not invent weighted completion percentages from item counts.
- `runtimeProviders()` resolves matching selectors without mutating env or hiding incompatible overrides. Testnet defaults to Google/Turnstile. Hosted validation checks those credentials and the registry.
- Shared testnet initialization retires simulation access/seed/reset, preserving history. Transaction locks and a configuration-row revision/share lock cover ordinary and repeatable-read promotion races. No schema migration or configuration value/version change is introduced by the fence.
- Old code predating the guard requires runtime-password rotation and old-session termination before promotion; see SETUP. Never redeploy old demo code with new credentials.
- CI pulls branch-specific Preview settings and supplies explicit GitHub metadata for stable branch association. Its owner-init step sets `VERCEL=0` only on GitHub; real Vercel still forbids owner credentials. Hosted branch association is not yet observed.
- `scripts/initialize-hosted.ts` replaces hosted migration execution: verify exact manually installed receipts, bind, seed, verify runtime. It executes no DDL/migration; `.github/workflows/ci-vercel.yml` serializes shared initialization across branches.
- SETUP includes exact one-time first-Google-admin SQL, requiring a verified Google-linked member and active two-factor enrollment, no existing Google admin/prior bootstrap, an atomic permanent key/audit and session invalidation. It is owner setup, not a new web escalation/recovery endpoint.
- Registry input may be protected `ASSET_REGISTRY_JSON` or the operator file, not both. Both retain strict bounded validation/content fingerprints.
- Both web/signer readiness gates remain false; no signing/broadcast/mainnet activation. P1-065 search approval is resolved and implemented.
- Only active SQL installer: `packages/db/src/migrations/000_initial_schema.sql`. Unchanged machine evidence: `packages/db/schema-contract_v48.json`; 92 tables/848 columns/274 CHECKs/105 indexes.

## Verification and preservation

- Use relevant named manual procedures and required checks; no broad automated test suite was authorized. Both exact-final-head push and PR CI must pass before merge; no direct push to main. PR creation/merge is authorized.
- Private current evidence: `/workspace/work/shared-hosting-v50`. Fresh local fixture cluster only; preserve failed attempts separately. Actual hosted Google/Turnstile/RPC/Upstash/capacity acceptance remains unrun until observed.
- Prior schema evidence: `/workspace/work/schema-consolidation-v48`, encrypted `initial-schema_v48-r2.gwbackup`, exact inactive 79-inventory restores. [PR46](https://github.com/nero1/onyiy/pull/46), [PR47](https://github.com/nero1/onyiy/pull/47) and [PR48](https://github.com/nero1/onyiy/pull/48) are merged.
- Preserve all original financial sources, failed fixtures, signed bytes, permanent keys, beneficiary holds, original archives and keys. The inconsistent `gw_v27_native_refund_isolated` source remains untouched. Never reset it or a shared source to repeat checks.
- Old 99-file archives require matching historical release `e6f7888034afae01d0c7803965f1c17889783171`; do not reinterpret signed inventories or bypass restore checks.

## Next work after explicit resumption

Finish P1-009/P1-028, then the authorized later bug rounds, PRD §32 milestones and final bug fixes. Mainnet/shared-preview readiness needs its own implemented and verified contract; this hosting pass does not complete it.

v50
