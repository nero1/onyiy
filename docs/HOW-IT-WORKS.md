# How Gifters World Works — Technical Summary

## Hosted architecture

Gifters World is a TypeScript application built on Next.js 16 App Router, React, native Next.js Route Handlers, Drizzle ORM, and PostgreSQL.

Primary hosted stack:

- **Vercel** — Next.js web/PWA and Node.js Route Handlers
- **Supabase PostgreSQL** — primary database
- **Upstash Redis REST** — default cache/coordination provider, used sparingly
- **GitHub Actions** — checks and Vercel deployments
- **separate scheduled signer workload** — required later for real-chain signing; signer secrets do not belong in Vercel

Provider boundaries remain portable: compatible PostgreSQL databases and compatible Redis providers can be supported without changing domain logic.

## Database and Drizzle

Supabase is used primarily as PostgreSQL. Runtime Vercel Functions use the Supabase transaction pooler; migrations/admin work use an appropriate migration connection.

Application table access is Drizzle-first, targeting effectively 100% coverage. Raw SQL is reserved for PostgreSQL-specific operations such as DDL, GRANT/RLS, explicit locking, and specialized reconciliation/recovery.

Every migration that creates a new `public` table must include an explicit Supabase GRANT classification. Sensitive financial, identity, ledger, admin, queue, payout, and audit tables must not be broadly exposed to `anon` or `authenticated` merely to satisfy the Data API.

## Cache and browser persistence

PostgreSQL is authoritative. Redis must never be required for financial correctness.

Upstash is the hosted default, but Redis calls are intentionally minimized. Safe public data and approved user-scoped display snapshots can be retained in browser storage to reduce repeated network/cache calls. User-scoped keys must include the active user/session scope and must be cleared on logout, account switch, or authentication failure so data cannot leak between users sharing a device.

Browser-stored financial data is display-only and never authorizes a mutation. Auth tokens, signing material, private keys, secrets, and pending financial writes are not stored there.

## Phase One simulation

The current hosted Phase One profile uses internal GIV simulation. Consent activates a test account and grants 5,000 GIV once. GIV cannot be redeemed or exported on-chain.

Seeded plans begin disabled. Admin activation creates the simulation plan/queue. The default bootstrap creates ten system receiver positions; each receiver requires two allocations. An incoming gift serves the currently selected prior receiver and then admits the payer behind existing entries. A payer never receives their own incoming allocation.

Displayed queue order and actual serving order remain separate concepts.

## Ledger and withdrawals

Authoritative asset amounts use integer base units. Money movement is represented by append-only journals and balanced debit/credit postings. Corrections use compensating entries rather than rewriting historical postings.

Default incoming split:

- receiver 85%
- marketing 4%
- eligible referrer 4%
- developer 6%
- reserve 1%

If no eligible referrer exists, the referral share falls back to reserve.

Cycle completion and withdrawal are separate. The current simulator supports a dummy GIV destination and a zero-network-fee quote → hold → settle flow. Real-chain withdrawal verification/signing/broadcast belongs to later milestones.

## Deployment flow

GitHub Actions is the deployment authority for the Next.js application:

1. validate/check the repository,
2. migrate/seed the hosted Supabase database when required,
3. build through Vercel CLI,
4. deploy preview or production with `vercel deploy --prebuilt`.

Vercel's native Git auto-deployment should be disabled when this CI path is active to avoid duplicate deployments.

The workflow always runs credential-free checks. Deployment is enabled only by the repository variable `ENABLE_VERCEL_DEPLOYMENTS=true`: same-repository PRs target the protected preview environment; `main` pushes target production; forks receive checks only. Each deployment retrieves and validates its Vercel settings and migrates/seeds its corresponding simulation database before the prebuilt deployment. Setup instructions live only in `SETUP.md`.

The current runtime rejects non-simulation environments and unsupported provider selectors rather than treating a configured live provider as implemented. Mainnet and real signer execution remain disabled until the PRD's later gates are satisfied.

Static API folders preserve parameterized public URLs through rewrites. Resource IDs are validated as UUIDs; handlers resolve the public URL path first because a rewritten Route Handler can retain its original URL. A query parameter cannot override an ID already present in a public resource path.

## Manual M1 acceptance procedure

Use a fresh, isolated **hosted simulation** database migrated and seeded through the deployment workflow. Run `APP_BASE_URL=<the verified HTTPS deployment origin> npm run scenario:m1` with Node 22. It accepts the 21 seeded members, activates Bronze, sends 21 gifts, and checks ten fulfilled bootstrap positions, one credit for `member_01`, and balanced ledger journals. Inspect the returned queue and reconciliation data; do not count health alone as financial acceptance. The scenario changes simulation state and is not repeatable on a used queue without a separately authorized reset of that isolated simulation database. Never reset a shared or real-money database. Record results only in the current project status.

Provider contract acceptance additionally requires documented observations of Upstash expiry/increment/outage behavior, PostgreSQL transaction rollback and duplicate/concurrent admission, missing-wallet liability preservation, and rejected simulated withdrawals. These gates remain separate from compilation and the 21-gift happy path.


## Iteration handover

Implementation state and completion percentages live in the current `docs/PROJECT-STATUS_vN.md`. The self-contained prompt for the next implementation LLM lives in the current `docs/LLM-HANDOVER_vN.md`. The `_vN` filename suffix is the visible iteration version. The baseline pair is `_v0`; each completed iteration normally renames/replaces the pair with `_v1`, `_v2`, and so on.
