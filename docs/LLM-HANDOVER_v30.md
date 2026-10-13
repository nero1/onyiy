# Gifters World — autonomous remediation handover v30

Updated: **14 October 2026 at 12:42:08 AM WAT**.

Read in order: docs/PRD.md, docs/PROJECT-STATUS_v30.md, docs/SETUP.md, docs/HOW-IT-WORKS.md, actual AGENTS.md, docs/custom-bugs-report_v30.md, docs/custom-bugs-fix-plan_v30.md. Read relevant installed Next guides before code changes.

The owner approved all Round One fixes, autonomous Rounds Two/Three and continued remediation, every Phase Two milestone, and final bug fixes before deferred testing. Continue without plan or milestone acceptance pauses. Use best recommendations, complete substantial verified batches, and merge only after BOTH push and pull-request CI succeed for the exact final head. Both financial readiness gates remain false; mainnet remains prohibited. CRON frequency and test-only issues remain excluded.

Round One has 26/70 implemented items and 44 open; no current 100%/bug-free claim. Phase Two has not begun. Current branch feat/phase-one-remediation-round1a is based on PR28/main b6059b3; the current code batch still needs its own PR and exact-head dual CI before merge. PR28 documentation head af31afb had successful push38471630006 and PR38471660546.

Implemented IDs: P1-001, P1-002, P1-003, P1-004, P1-010, P1-011, P1-014, P1-016, P1-017, P1-018, P1-020, P1-021, P1-022, P1-023, P1-024, P1-025, P1-037, P1-044, P1-046, P1-052, P1-055, P1-056, P1-057, P1-068, P1-069, P1-070. P1-019/P1-036 remain open despite partial improvements. Full numbered tracker and acceptance checks are in the versioned report/plan. Rename all four current artifacts together on the next completed iteration; update cross-links, headers, 12-hour WAT timestamps and footer markers. Preserve previous evidence in Git history.

Local verification: required check:all; production build and bundle budget checks; production npm audit now zero advisories. Named isolated manual-contracts, manual-money and manual-quotes-r5 passed. The last validates quote cancellation/expiry/payload replay/DB clock, late-fund refunds, frozen pre-pause admission, custom bootstrap destination, positively refunded plan edit, and independent lower live per-transaction/daily signer caps without reservations or signed bytes. Initial quote-probe failures (invalid price TTL, missing scoped fixture binding, missing operational gas asset) remain retained and were corrected only in fresh r2/r3/r5 databases. No external RPC or broadcast occurred.

Latest measured homepage196.35KiB, max API1.426MiB gzip, aggregate client0.642MiB gzip; final changed-head check:all/build/bundle passed locally. Named private scratch/evidence/env files under /workspace/work/remediation-v30 are0600, outside repo. Preserve all initial failed probes and databases; no reset/reuse of partially exercised financial sources.

## Architecture and release boundaries

Native Next16 Route Handlers/App Router, Node22.23.3, Drizzle/PostgreSQL/Supabase and GitHub Actions→Vercel. No Docker/Hono/Vite/local-first. 80 tables; 001–072 plus053a (73 checksummed migrations). Never change applied checksums. New tables require explicit least-privilege grants/revokes and RLS in the same forward migration, Drizzle declarations and archive/grant inventory updates. SQL infrastructure/locks/triggers/RLS are exceptions; application rows use Drizzle.

Preserve exact base-unit arithmetic, sealed balanced journals, globally bound payload replay, immutable registry/economic/treasury snapshots, durable encrypted signed payloads, nonce/lease/cap reservations, original-sender refunds and beneficiary liabilities. Unknown hashes preserve holds; corrections append compensating journals. Restore/upload never publishes or starts workers.

Both financial readiness gates remain false. Automatic approval review rejected enabling them because broad completion approval did not authorize real testnet operations. Do not retry or bypass it. A concrete gate change requires explicit approval and separate owner registry/address/key/configuration and authenticated live alert-ACK release inputs. Mainnet prohibited. Hosted acceptance remains distinct from local implementation.

Retain original gw_v27_native_refund_isolated negative-held/phantom retry evidence, GW25 partial factor and all prior v28 archives/source/signed history. No reset to manufacture clean evidence. The prior native archive has70 inventories/80 tables/73 migrations; forward archive changes must remain compatible or explicitly versioned.

## Workspace and next action

Use Node22 at /workspace/work/tooling/node-v22.23.3-linux-x64/bin; NPM_CONFIG_CACHE=/workspace/work/npm-cache. TLS PG17 port55433 tools /workspace/work/tooling/pg-tls/bin, verified CA /workspace/work/v20-tls/root.pem. Network/listener/tsx need granted network; Git metadata writes need /workspace/onyiy/.git. Never print secrets, cookies, signed bytes or raw SQL parameter diagnostics. No delegation requested. Update user about every60seconds.

Local check:all/build/bundle are complete. Maintain the ledger, create the coherent PR and merge after both exact-head CI events pass. Immediately continue remaining Round One packages, prioritizing P1-005/006/007/008/009/013, then complete all other findings. Repeat the full audit/plan/fix process for Rounds Two/Three and any remaining known bugs, implement all §32 Phase Two milestones, and final bug fixes before deferred tests. No owner plan review or acceptance pause remains.

PR29 https://github.com/nero1/onyiy/pull/29 is open. Initial head4e9333d failed push38485592440 and PR38485625731 because the lockfile omitted the nested optional utf-8-validate5.0.10 peer. A clean Node22/npm10 dependency tree regenerated the lockfile; both dry-run and fresh npm ci were required before repush. Do not merge using the failed initial head.

Signed: **14 October 2026 at 12:42:08 AM WAT**

v30
