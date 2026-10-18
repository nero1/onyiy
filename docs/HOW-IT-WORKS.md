# How Gifters World works

Use [SETUP](SETUP.md) to install, [PRD](PRD.md) for requirements and [status](PROJECT-STATUS_v106.md) for remaining work.

## Code map

| Location | Purpose |
|---|---|
| `app/`, `components/`, `lib/` | Pages, UI, PWA and API entry points |
| `server/` | Permissions and application transactions |
| `packages/domain/` | Amounts, splits and business rules |
| `packages/config/` | Validated settings/provider choices |
| `packages/db/` | PostgreSQL, Drizzle, schema and recovery |
| `packages/cache/`, `packages/chains/` | Cache and blockchain adapters |
| `workers/`, `.github/workflows/` | Background work, isolated signing, checks and deployment |

## Hosting and settings

- Reuse one Supabase database, Upstash database and Vercel project. Supabase supplies PostgreSQL; app identity uses Google/app sessions rather than Supabase Auth.
- `APP_ENV=simulation|testnet|mainnet` selects payments. Vercel Preview/Production selects the build/domain. Preview uses only `gw_preview`, with no sign-in, private records or payments.
- Promotion retires earlier financial writes without converting/deleting balances. Old deployments must lose their credentials. Follow SETUP before changing modes.
- `xmanifest.json` supplies initial defaults; seeding preserves existing edits. Later database settings are authoritative. Credentials stay in protected provider settings.
- Invalid financial settings close affected actions. During database loss, informational fallback disables features, activity and statistics; it cannot authorize money.
- Public widgets check API compatibility, selected mode and profile revision. Private responses use `no-store`; private pending submissions never enter PWA caches.

## Database and identity

- Paste `packages/db/fresh-install.sql` once into an empty application schema. It creates the final state directly. Existing installations use reviewed upgrades; deployments verify SQL rather than applying it.
- Runtime transactions use restricted read/service roles, row security and current database permissions. Owner credentials stay outside Vercel; the separate signer holds only its own role.
- Financial amounts use integer smallest units. Journals balance and posted history is immutable; corrections add compensating records. Permanent operation keys prevent duplicate benefits.
- Consent, current account status and fresh MFA protect sensitive actions. Wallet proofs bind account, domain, network, environment, purpose, nonce and expiry.
- Session/identity changes discard old private responses. Deletion redacts personal data while preserving required financial liabilities and audit history.
- Birth-date checks retain verification time/minimum age, not the date. Language/timezone settings change display only.

## Gifts, queues and withdrawals

1. Simulation grants 5,000 GIV once; GIV has no blockchain value.
2. Checkout freezes the plan, asset, sender, amounts and network in an invoice.
3. The server independently verifies payment; wallet success alone is insufficient.
4. Queue admission, balanced allocations and durable jobs commit together.
5. Allocations credit internal balances. A separate approved withdrawal pays an external wallet after its fees.

**Internal credit, available balance, held withdrawal and settled wallet transfer are different states.** Missing wallets, suspension, deletion or failed sends do not erase liabilities. Late/incorrect/unmatched transfers keep their own recovery/refund state; refunds return to the proven original sender.

Queues preserve joining tickets. Transparent profiles show actual serving position; platform positions and administrative priority are labelled or disabled. Priority changes notify affected waiting members without private staff reasons. Potential receipts depend on later confirmed gifts and are not guaranteed.

Verified activity uses consenting real members and eligible immutable events; tests/business allocations are excluded. Empty feeds remain empty. Publication is optional and revocable. Receipts retain asset, network and environment labels.

## Native payments and signing

- Four mainnets: Ethereum, BNB, Solana and TRON. Seven member currencies are supported; TRX is operating-only. Contracts/mints, decimals, provenance and independent RPCs must be verified before enablement.
- Mainnet requires transparent policy, approved readiness, matching configuration hashes, signed alert acknowledgement, prices, gas and limits. Local checks do not authorize public launch.
- Private keys stay in the isolated signer. It validates each obligation and persists encrypted signed bytes before broadcast. An uncertain transfer must be resolved before another is constructed.
- EVM replacements retain nonce/intent. Solana/TRON rebuilds require positive expiry/nonsettlement proof. Attempts, actual fees, refunds and company losses remain separately accounted.
- Promotion and signing share financial-mode fences. Old workers and mismatched key/network/environment combinations fail closed.

## Background work and recovery

- Durable jobs use leases, bounded retries and replay protection. Signed scheduler requests bind environment, body, time and nonce. Redis caches data; PostgreSQL remains the financial authority.
- Deadlines and row/byte limits bound database/provider work. Cleanup retains unresolved financial work and permanent identifiers. Monthly online archives still occupy database quota.
- Member JSON/CSV exports have a creation cutoff and a disclosed capture interval; mutable values are not one global point-in-time snapshot.
- Full archives encrypt a consistent PostgreSQL snapshot and authenticate inventory/schema/security. Restore requires the matching release and an empty private target. It never automatically deploys or starts payments.
- Retain archive/MFA/custody/payload keys. Before restored operation, rotate request keys, reconcile every retained address at a common finalized cutoff and obtain fresh target-bound approvals.
- Unknown incoming funds remain original-sender liabilities. Recording company loss does not reconstruct a missing withdrawal request or prove a member was paid.
- GitHub backups/signing/schedulers are opt-in. Monitor actual archive age, alerts, quotas and schedules; a successful workflow does not establish hosted capacity or recovery time.
- On an incompatible update, finish wallet prompts and save the displayed hash before reloading. The app never automatically resends a payment.

## Development and documentation

- Run mandatory type, import/lint, translation, settings, schema/grant, docs, secret, build and bundle checks. Use named isolated manual procedures; broad automated suites remain deferred.
- Preserve original/failed financial fixtures, archives and keys. Both CI events must pass the exact final head before merge. Real provider/device/hosted acceptance and observation periods stay separate.
- Keep five core guides and one concise versioned bug report. Fixed bugs need only ranges; open bugs need problem, next fix and status. Do not recreate the fix plan or append evidence histories. Keep the PRD comprehensive and SETUP detailed for a beginner; shorten status and general explanations. New documents require an owner request or essential need.
