# Gifters World — Phase One bug-fixing handover v29

Updated: **13 October 2026 at 09:31:02 PM UTC**.

Read, in order: docs/PRD.md, docs/PROJECT-STATUS_v29.md, docs/SETUP.md, docs/HOW-IT-WORKS.md, actual AGENTS.md, docs/custom-bugs-report.md and docs/custom-bugs-fix-plan.md. Read relevant installed Next guides before code changes.

**Current user instruction overrides earlier continuation:** “DO NOT FIX THE BUGS YET UNTIL I REVIEW THE PLAN!!!” Round 1 audit is complete, with 70 open findings; v29 changes documentation only. Verify active-session evidence that the owner has reviewed/authorized this concrete plan before any application/migration/dependency fix. Do not treat the documentation PR merge or old “continue” messages as plan approval.

**Owner speed directive — preserve in every handover:** implement all M0–M8 irrespective of M1/M2 or earlier acceptance until complete, in as few substantial verified iterations as practical. Once this bug plan is reviewed/authorized, keep fixing without milestone acceptance pauses and resolve routine uncertainties using the recommended plan. Complete up to three bug-finding/fixing rounds unless a closing round finds no new bugs with all prior work resolved; then implement the entire Phase Two milestone sequence without waiting for milestone acceptance. The three current analysis passes count as one audit round. Never invent evidence, conceal financial history or enable sending to meet a percentage.

Every completed iteration requires a PR and merge only after BOTH exact-final-head push and pull-request CI succeed. Never direct-push main. Do not use a successful old SHA or only one event as merge evidence. No agents/delegation were requested.

## Current audit

Baseline main ee50068, PR27 merged: push run38437406457 and PR run38437476871 succeeded for feature head8938b22. Historical v28 milestone checklist recorded100% implementation; the audit now reopens 43 defects and14 Phase One requirement gaps plus10 hardening/3 maintenance items. Current remediation completion is0/70; no new overall100%/bug-free claim is valid. Phase Two has not started.

Reports contain a complete first numbered list, all detailed file/fix entries, current 12-hour date/time in header/footer, an engineering rating and per-finding acceptance checks. Ratings are qualitative: current6/10, projected about8/10 subject to successful fixes/verification. No capacity or free-hosting guarantee is made.

Prioritize P1-068 (compatible dependency security update), package A payment/economic invariants, package B recovery/fee/scope evidence, and High session/wallet P1-021/P1-022. Then operational dispatch/budgets/alerts, privacy/schema/retention, hosting/portability, UI/pagination/i18n/accessibility and SEO/help. All70 IDs must be resolved or explicitly dispositioned with evidence and an accepted requirement change. Do not add broad automated suites or report test-only/CRON-frequency issues; run the existing required CI/static/build checks and named isolated manual/provider-contract procedures appropriate to fixes.

Synthetic audit evidence: native TRX verifyTransfer(index0) confirms while getTransactionStatus rejects TRANSFER_NOT_FOUND; same database/project with pooler6543 versus session5432 has different binding fingerprints; a delayed ordinary api response returns former-owner data after scope change; silent boundedJson has no elapsed deadline; dark primary text measures2.90:1. First scratch import failure was corrected. No key, broadcast, real RPC, private response or financial source mutation occurred. npm audit reports15 affected package nodes (8 high/7 moderate), not15 demonstrated exploits.

False positives rejected: public help drafts remain RLS-filtered; ioredis is installed; actual Next traces contain all73 SQL migrations; account-status/role changes revoke sessions through DB triggers; simulation account selection is deliberate isolated tooling; native obligation list pagination already exists. No concrete XSS/RCE/user path traversal/CSRF bypass was demonstrated. Smart-contract reentrancy/AI injection/specialized MEV do not apply to this architecture.

## Preserved architecture and evidence

Native Next16 Route Handlers/App Router, Node22.23.3, Drizzle/PostgreSQL/Supabase, economical cache and GitHub Actions→Vercel. No Docker/Hono/Vite/local-first. Bracket-free filesystem routes use public rewrites. Installed Next error retry differs from reset; nonce-CSP routes render dynamically.

80 schema tables,001–072 plus053a (73 checksummed migrations),70 retained backup inventories. Never alter applied checksums, reset financial sources or delete failed evidence. Financial values remain exact integer/base units; sealed/balanced/append-only journals and global payload-bound replay persist. SQL-only infrastructure/locks/triggers/RLS are explicit exceptions, not a reason to bypass Drizzle for application rows.

New tables need explicit least-privilege GRANT/REVOKE and RLS in the same migration. Supabase's Data API change does not require broad browser/service_role grants here: the app uses restricted PostgreSQL roles and keeps financial/signer tables unavailable to browser Data API roles. Preserve current DB role/status/MFA/session completion checks.

GIV is simulation-only; owner-empty native registry and mainnet-off defaults persist. Keep immutable registry/economic/treasury/destination snapshots, durable encrypted signed bytes, nonce/lease/cap reservations, original-sender refunds, beneficiary liabilities and positive-failure/expiry rules. Missing/unknown hashes preserve holds. Financial corrections use new compensating journals, never rewritten history. Restore/upload never publishes or starts workers.

Retained v28 evidence: cold-recovery-r5, scanners-r2, idle-heartbeat, operations-portability-r4 and archive-portal named procedures, actual390px EN/FR browser checks, production/static/Drizzle/grant/secret/bundle checks. Homepage194.91KiB, maximum API trace1.422MiB gzip, all client chunks0.687MiB gzip. Local sequential read p95 samples33.08ms public/63.30ms staff do not establish hosted capacity. See status for scope/limitations and preserved first failures.

Native archive work/backups/v28-native-final.gwbackup verifies70 inventories/80 tables/73 migrations into fresh inactive gw_v28_cold_restore_r2. Older archives keep their own migration fingerprints. Source gw_v28_cold_recovery_isolated_r5 retains original-sender refund/company-loss/signed history. gw_v28_ui_isolated is generated browser/portability data. Original inconsistent gw_v27_native_refund_isolated remains inactive with negative-held/phantom retry evidence; never reset it or describe it as clean. Rejected GW25 administrator-factor reset was never retried; preserve the partial factor.

**Automatic approval review rejected enabling web/signer readiness gates**, because that could enable real testnet operations and broad Phase One completion did not authorize it. Both stay false. Do not retry or indirectly bypass the rejection. A concrete reviewed gate change needs explicit approval plus separate owner registry/address/key/configuration and independently authenticated live alert-ACK acceptance. Mainnet remains prohibited. Coding/plan approval alone is not release authorization.

Hosted OAuth/Turnstile/RPC, actual wallet/broadcast/native funding, live external ACK, mobile installation/LCP, hosted quota/latency/capacity and monitoring durations are unrun. Generated contract evidence never substitutes for them.

## Workspace operation

Private scratch/evidence/env/key files0600 are under /workspace/work; never print values or commit them. Current audit scratch is /workspace/work/audit-v29, outside the repo. TLS PG55433 tools /workspace/work/tooling/pg-tls/bin use verified CA /workspace/work/v20-tls/root.pem. Browser CDP9340; close only local33xx fixture tabs, cookies ignore ports, use a fresh server port for a new build. Never reset factors to recover browser access.

Network/listener/tsx tools need network permission; Git metadata needs /workspace/onyiy/.git write permission. Keep useful failure evidence and scoped private bindings. Communicate concise progress about every60seconds.

Next action: finish documentation exact-head CI/merge where pending, then await the explicitly requested owner plan review. Only after authorization begin the fix packages, retain the full tracker and update the audit-round status.

Signed: **13 October 2026 at 09:31:02 PM UTC**

v29
