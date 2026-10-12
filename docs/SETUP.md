# Gifters World — Hosted Developer Setup

This guide is for getting Gifters World **live on Vercel** using hosted services from start to finish.

The deployment path is:

**GitHub → GitHub Actions CI → Vercel**

Hosted services:

- **Vercel** — Next.js 16 App Router application and native Node.js Route Handlers
- **Supabase PostgreSQL** — primary hosted database
- **Drizzle ORM** — application database access
- **Upstash Redis REST** — default Redis/cache provider, used sparingly
- **GitHub Actions** — validation, database migration, build, preview deployment, production deployment, and later isolated scheduled worker jobs

The product is still in the Phase One `test_iteration` profile. Keep mainnet and real signing disabled.

## 1. Accounts you need

Create or have access to:

1. a **GitHub** account and repository,
2. a **Vercel** account/team,
3. a **Supabase** project,
4. an **Upstash** account with a Redis database.


## 2. Put the repository on GitHub

Create a GitHub repository and upload/push the project files so that the repository root contains files such as:

```text
.github/
app/
components/
lib/
server/
packages/
docs/
package.json
next.config.ts
vercel.json
xmanifest.json
```

Use `main` as the production branch unless you intentionally change the workflow.

Do not upload real secrets, `.env` files, database dumps, private keys, wallet seed phrases, RPC credentials, Supabase passwords, Upstash tokens, or Vercel tokens.

### 2.1 Run CI before hosted accounts are configured

The committed `.github/workflows/ci-vercel.yml` runs on pushes, pull requests, and manual **Actions → ci-vercel → Run workflow** requests. The `checks` job installs the committed lockfile with `npm ci`, runs `check:all`, builds Next.js, measures homepage JavaScript, and scans source/client bundles. These checks need no Supabase, Upstash, or Vercel settings.

Deployment is deliberately skipped until the repository Actions variable `ENABLE_VERCEL_DEPLOYMENTS` equals the exact string `true`. Leave it absent or `false` while building without provider settings. A skipped deployment does not mean the CI checks failed. Enable GitHub Actions in repository settings if workflows are disabled.

## 3. Create the Supabase PostgreSQL database

### 3.1 Create the project

In Supabase:

1. Create a new project.
2. Choose a region reasonably close to the Vercel Functions region you intend to use.
3. Save the database password securely.
4. Open the project's **Connect** dialog.

Gifters World uses Supabase as hosted PostgreSQL. The application does not require Supabase Auth, Storage, Realtime, Edge Functions, or the Data API for its core database path.

### 3.2 Copy the runtime connection string

For Next.js Route Handlers on Vercel, use Supabase's **Transaction pooler** connection string for `DATABASE_URL`. Follow the current Supabase Connect instructions for the postgres-js driver. Only driver-compatible SSL query settings are accepted; Prisma-specific pooler options do not apply.

It normally uses port `6543` and is designed for serverless workloads with many short-lived connections.

Example shape only:

```text
postgresql://gw_runtime.<project-ref>:<password>@<pooler-host>:6543/postgres
```

Do not invent the hostname. Copy the actual value from Supabase's Connect screen and select the restricted runtime role described below, rather than the migration owner.

The application disables prepared statements for the Supabase runtime connection and keeps the serverless connection pool small. Runtime, migration and health connections require trusted certificates and matching hostnames for hosted PostgreSQL, including URLs with `sslmode=require`. Never use `sslmode=disable`, `NODE_TLS_REJECT_UNAUTHORIZED=0` or a verification bypass to unblock deployment.

Use the provider hostname and its documented trust chain. If the provider requires a custom CA, put the exact provider-issued public PEM certificate chain in the server-only `DATABASE_TLS_CA_PEM` environment value in Vercel and the matching GitHub environment. It contains certificates only, never private keys. Standard system trust works without this variable. URL options are limited to `sslmode` and `sslrootcert=system`; remove unsupported query settings. Optional pool/idle/connect settings are positive bounded integers; the default serverless pool is one connection. The database code runs only in the Next.js Node.js runtime, never in browser components.

Set:

```text
DB_PROVIDER=supabase
DATABASE_URL=<Supabase Transaction pooler URL>
DATABASE_POOL_MAX=1
```

### 3.3 Copy the migration connection string

Database migrations should use a connection intended for migration/admin work rather than the Vercel transaction-pooler connection.

Preferred:

```text
DATABASE_MIGRATION_URL=<Supabase Direct connection URL>
```

Supabase recommends a direct connection for migrations, backup/restore, and other native PostgreSQL administration.

If a hosted CI runner cannot reach the direct endpoint because of network/IP-version restrictions, use the Supabase **Session pooler** connection for the migration job after confirming the migration works through it. Do not use the transaction pooler as the default migration connection.

### 3.4 Provision the restricted runtime login

Before enabling deployments, use the Supabase SQL editor as the database owner to create the two application groups. These commands contain no credentials:

```sql
create role gw_read nologin noinherit nosuperuser nocreatedb nocreaterole nobypassrls;
create role gw_service nologin noinherit nosuperuser nocreatedb nocreaterole nobypassrls;
create role gw_runtime login noinherit nosuperuser nocreatedb nocreaterole nobypassrls;
grant gw_read, gw_service to gw_runtime;
grant connect on database postgres to gw_runtime;
```

Run each creation only if that role does not already exist. Set a strong generated password for `gw_runtime` through the provider's secure role settings or SQL editor; never save the password-setting statement to GitHub or chat. Store the resulting custom-role transaction-pooler URL as `DATABASE_URL` in Vercel and the matching GitHub environment. Store the owner direct/session URL only as GitHub `DATABASE_MIGRATION_URL`. Do not give the runtime login ownership, BYPASSRLS, superuser, role creation or inherited table access. Compatible PostgreSQL hosts use the same role contract with their actual database name and supported connection endpoint.

Migration 007 installs explicit privileges and RLS: member reads use own rows; financial services receive only their required server permissions; public catalog data is served by native handlers. No browser or Data API key receives application tables/views, including ledger/audit/configuration. Migration/seed/reset tooling uses the separate owner connection. A migration user without permission to create the groups must have them provisioned by the provider owner beforehand.

Before application migrations, `npm run db:check:binding` bootstraps only migration 014's server-only proof table and verifies a fresh owner-write/runtime-read challenge. Provision the groups above first. Different projects fail even when backups copied their stored namespace IDs; failure prevents financial migrations. The proof is removed after checking. After migrations/seed, `npm run db:check:runtime` repeats binding and validates roles/configuration. No proof or credential reaches the browser. Simulation's account chooser still does not replace OAuth/session/MFA acceptance.


### 3.5 Supabase GRANT requirement

Every migration that creates a new table in `public` must include its explicit Supabase Data API grant classification in that same migration.

Supabase now requires explicit `GRANT` permissions for newly created public-schema tables before the Data API can access them. Migrations count as table creation.

Typical syntax is:

```sql
grant select
on public.your_table
to anon;

grant select, insert, update, delete
on public.your_table
to authenticated;

grant select, insert, update, delete
on public.your_table
to service_role;
```

Do **not** blindly grant those permissions to every table.

For Gifters World:

- public catalog data is served through native handlers; configuration is projected by its registered scope,
- financial, identity, ledger, admin, queue, payout, and audit tables should not be exposed to `anon` or `authenticated` merely to silence a permission error,
- application tables/views remain closed to `anon`, `authenticated` and Data API `service_role`; native handlers use the restricted application groups. Do not restore broad Data API grants to fix a dashboard warning.

The repository's migration checks are intended to catch new public tables that lack a grant classification.

## 4. Create Upstash Redis

Create an Upstash Redis database.

Copy these two values from the Upstash console:

```text
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

Gifters World intentionally uses Redis sparingly because the expected default plan has low limits.

Redis is not the financial source of truth. PostgreSQL remains authoritative. Browser caching, request coalescing, Vercel/CDN caching where safe, and in-process caching should absorb ordinary read traffic before adding more Redis calls.

The default hosted cache configuration is:

```text
CACHE_PROVIDER=upstash
UPSTASH_REDIS_REST_URL=<your Upstash REST URL>
UPSTASH_REDIS_REST_TOKEN=<your Upstash REST token>
```

The cache adapter also supports `ioredis`/compatible Redis providers through `REDIS_URL`, but Upstash is the deployment default. Selecting that adapter without its configuration fails; unknown cache selectors fail rather than silently substituting memory. Increment/expiry requires Redis Lua (`EVAL`) permission. Run the named cache provider contract in HOW-IT-WORKS against isolated keys before accepting the selected hosted adapter; include an HTTP-success/command-error response and outage. Do not use cache counters as durable rate limits. Browser v3 upgrades discard previous snapshot envelopes and apply public `cache_policy` entry/byte limits; this needs no credential or financial migration.

## 5. Create the Vercel project

### 5.1 Import the repository once

In Vercel:

1. Choose **Add New → Project**.
2. Import the GitHub repository.
3. Keep the repository root as the Vercel project root.
4. Use Node.js 22.
5. Create the project.

The repository is a root-level Next.js application. Vercel should detect Next.js automatically and use the root `package.json`, `next.config.ts`, and `vercel.json`. Do not set an `apps/web` root directory or a custom static output directory.

### 5.2 Make GitHub Actions the deployment authority

This project is intended to deploy through GitHub Actions rather than having Vercel create a second automatic deployment for every Git push.

Ensure `vercel.json` contains:

```json
{
  "git": {
    "deploymentEnabled": false
  }
}
```

If this property is absent, add it before relying on the CI workflow. Otherwise the connected Vercel Git integration and GitHub Actions can both deploy the same commit.

### 5.3 Choose the Functions region

In Vercel:

**Project → Settings → Functions**

Choose a Functions region near the Supabase database region where practical. This reduces latency on database-backed API requests.

## 6. Configure Vercel environment variables

Open:

**Vercel Project → Settings → Environment Variables**

For the first hosted Phase One deployment, configure the following for **Production**.

```text
APP_ENV=simulation
DEPLOYMENT_PROFILE=test_iteration
MAINNET_ENABLED=false

DB_PROVIDER=supabase
DATABASE_URL=<Supabase Transaction pooler URL>
DATABASE_POOL_MAX=1

CACHE_PROVIDER=upstash
UPSTASH_REDIS_REST_URL=<Upstash REST URL>
UPSTASH_REDIS_REST_TOKEN=<Upstash REST token>

AUTH_PROVIDER=simulation
PAYMENT_PROVIDER=giv_simulation
WALLET_PROVIDER=dummy
SIGNER_PROVIDER=disabled
CAPTCHA_PROVIDER=dummy
REALTIME_PROVIDER=none
PRICE_PROVIDER=manual_simulation
ALERT_PROVIDER=none
```

Set `WEB_ORIGIN` to the final production origin, for example:

```text
WEB_ORIGIN=https://giftersworld.org
```

If you do not yet have the custom domain, initially use the Vercel production URL. Add/update `WEB_ORIGIN` only when the authentication milestone consumes it; the current simulation API is same-origin.

Do not place real signer/decryption keys in Vercel. The future signer must remain a separate isolated workload.

### Preview environments

Preview deployments should remain simulation-only.

Do not connect a preview deployment to a future real-money/mainnet database. For early Phase One work you may either:

- use a separate Supabase preview project, which is preferred, or
- deliberately share the simulation database while accepting that preview activity can affect the same test data.

## 7. Configure Vercel deployment credentials in GitHub

The existing GitHub Actions workflow deploys with the Vercel CLI.

Create a Vercel access token, then collect:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

You can find the Project ID under the Vercel project's **Settings → General**. The Team ID is available from the Vercel team settings.

In GitHub, open:

**Repository → Settings → Secrets and variables → Actions**

Create two GitHub environments at **Repository → Settings → Environments**:

- `preview` for trusted same-repository PRs and the `preview` branch,
- `production` for pushes/manual runs on `main`.

Use required reviewers where your GitHub plan supports them. Review the changed code before approving a preview because that code executes with preview credentials. Fork PRs run checks only; never use `pull_request_target` to build untrusted PR code with secrets. Restrict the production environment to `main`, protect that branch, and require the `checks` job before merging.

In **each environment**, add secrets:

```text
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
```

The workflow uses these to run `vercel pull`, `vercel build`, and `vercel deploy --prebuilt`.

## 8. Configure database migration secrets in GitHub

Vercel runtime environment variables do not automatically become GitHub Actions secrets for arbitrary commands such as `npm run db:migrate`.

In **both** GitHub environments (`production` and `preview`), add:

```text
DATABASE_URL=<Supabase Transaction pooler URL>
DATABASE_MIGRATION_URL=<Supabase Direct or approved Session pooler URL>
```

Give `preview` a separate simulation Supabase database; PR migrations and seeds can change its state. Configure the corresponding Vercel **Preview** environment with that same database and Upstash bindings. Multiple PR previews share the selected preview database unless you provision isolated projects; do not reset it while another preview uses it. Keep all preview data separate from future real-money data.

The workflow requires `DATABASE_MIGRATION_URL` explicitly before deployment and migrates/seeds the selected environment before building. It checks that Vercel and GitHub have the exact same restricted runtime URL, verifies the fresh owner/runtime binding before financial migrations, then validates seeds and privileges afterward. The migration URL is prohibited in Vercel runtime settings. If your provider needs a custom CA, add the same public certificate chain as GitHub environment secret `DATABASE_TLS_CA_PEM` as well as the Vercel server variable. The database setup/migration step runs with:

```text
APP_ENV=simulation
DB_PROVIDER=supabase
MAINNET_ENABLED=false
```

Do not expose these values in logs.

## 9. Make production CI run migrations before deployment

For a fresh Supabase project, the database must be migrated and seeded before the site can work correctly.

The production GitHub Actions job should run these commands after dependencies are installed and before the Vercel production build/deploy:

```bash
npm run db:check:binding
npm run db:migrate
npm run db:seed
npm run db:check:runtime
```

with:

```yaml
env:
  APP_ENV: simulation
  DB_PROVIDER: supabase
  MAINNET_ENABLED: "false"
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
  DATABASE_MIGRATION_URL: ${{ secrets.DATABASE_MIGRATION_URL }}
  DATABASE_TLS_CA_PEM: ${{ secrets.DATABASE_TLS_CA_PEM }}
```

`db:migrate` is forward/idempotent for the current migration style, and the Phase One seed is designed to insert defaults without overwriting normal runtime state.

For later real-money releases, migration/seed policy must be reviewed again before deployment.

### 9.1 Safe refresh and simulation reset

Migrations execute each file atomically. Repeated seeds insert missing defaults and preserve configured values, disabled assets and existing plans. Apply migration `002_manifest_metadata.sql` before the updated seed; it corrects the legacy simulation-policy scope without changing its value. Invalid stored settings stop financial work rather than silently replacing them with file defaults.

Use a fresh, isolated Supabase simulation project for milestone acceptance. Never reset a shared preview or a real-money database. If an isolated reset is deliberately required, stop its writes, set `APP_ENV=simulation`, confirm the actual owner/migration target database name through `SIMULATION_RESET_CONFIRM=reset:<database-name>`, and run `npm run db:reset:simulation` followed by `npm run db:seed`. Reset refuses production runtime/deployment context, a disabled database reset policy, or any non-simulation asset. Supabase projects often share the database name `postgres`; independently verify the selected project/connection before confirming it. Reset clears all simulation financial and durable work/report/scheduler/proof records before reseeding; old jobs cannot target new accounts. No reset is part of ordinary CI/deployment.

Migrations 003–006 add immutable USD snapshots and ledger integrity protections. Migration 003 derives only the known historical GIV conversion; unsupported legacy plan assets require review rather than an invented rate. Orphaned financial owners also stop the owner-FK migration. Resolve such records through an authorized repair/restore process; do not delete obligations or disable ledger guards to make deployment pass.

Migration 009 rebuilds only derived queue counters while holding maintenance locks; it preserves financial records and admission tickets. Schedule it while simulation writes are paused if existing queues are large. Out-of-range tickets, duplicate cycle entries or duplicate priority tickets stop migration for review; never renumber rights to make it pass. Normal rank changes then update bounded counters transactionally.

Migration 010 adds immutable allocation links and withdrawal/operation snapshot guards under maintenance locks. Pause simulation writes during legacy backfill. Only verifiable GIV evidence is linked; unknown slot sequence stays unresolved in reconciliation. Historical UUID keys that collide only by letter case stop migration for review; never erase financial records to bypass uniqueness. Use fresh isolated data for complete-lineage acceptance.

Migration 012 adds immutable GIV failure controls and exact deferred hold/settle/release checks. It does not invent historical cancellation timestamps or verify real-chain attempts. Investigate unsupported legacy GIV states through reconciliation before attempting recovery; never alter quotes or journals to bypass a guard.

After first hosted M1 acceptance, the optional integrity scenario is documented in HOW-IT-WORKS.md. Both scenarios require isolated simulation data and actual deployment evidence; skipped provider configuration does not count as a deployment.

## 10. Drizzle ORM requirement

Application database access should use Drizzle ORM wherever practical, targeting effectively 100% application-table coverage.

New database work must follow both rules:

1. create/change the table in a migration,
2. represent that table/change in the Drizzle schema.

Raw SQL should be limited to PostgreSQL-specific operations that are clearer or safer outside the ORM, such as:

- DDL migrations,
- `GRANT` and RLS policy statements,
- explicit row/advisory locking where required,
- specialized recovery/reconciliation operations, exported snapshots and PostgreSQL catalog fingerprints for native backup/restore.

Do not introduce Supabase client-library calls into domain logic merely because Supabase hosts PostgreSQL.

## 11. Enable deployments and deploy from PRs

Complete these prerequisites first:

1. Link the repository to a Vercel project using Node 22 and the root application directory; keep Vercel native Git deployment disabled.
2. Fill the Vercel **Preview** and **Production** environment settings from section 6, including the corresponding Supabase and Upstash values. No signer credentials belong here.
3. Provision the restricted database roles from section 3.4. Fill **both** GitHub `preview` and `production` environments with `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `DATABASE_URL`, and `DATABASE_MIGRATION_URL`. Apply the reviewer and branch controls from section 7.
4. At **Repository → Settings → Secrets and variables → Actions → Variables**, create the **repository variable** `ENABLE_VERCEL_DEPLOYMENTS` with value `true`. This is a non-secret switch, not a credential.
5. Open or update a same-repository pull request. If the PR was already open before enabling the variable, push a new commit or rerun its workflow after saving the settings.
6. In **Actions → ci-vercel**, confirm `checks` passes. Approve the protected `preview` environment when prompted. The `deploy` job retrieves Vercel Preview configuration, validates required bindings, migrates/seeds the preview database, runs `vercel build`, and runs `vercel deploy --prebuilt`. The CLI prints the preview deployment URL in the job log; this workflow does not post a PR comment.
7. Verify the preview using section 12 and the manual M1 procedure in `HOW-IT-WORKS.md` before accepting its behavior. Merge the approved PR into `main`.
8. The resulting `main` push runs checks again and targets the protected `production` environment. After approval, it migrates/seeds that database, runs `vercel build --prod`, and runs `vercel deploy --prebuilt --prod`. Verify the production URL and record acceptance in the current project status.

Fork PRs always run checks without deployment credentials. Other branch pushes run checks only, except the designated `preview` branch. Manual workflow runs use the same branch and enablement rules. Setting the variable back to `false` stops future deployment jobs while preserving CI checks.

Missing/invalid hosted bindings fail the deployment preflight; they are never replaced with invented credentials or a successful mock deployment. Workflow files being present does not prove a hosted run succeeded. GitHub Actions remains the sole deployment authority.

## 12. Verify the live site

At minimum verify:

### API

Open:

```text
https://<your-domain>/api/health
```

It should respond successfully and identify the Phase One/simulation configuration.

### Database-backed UI

Open the main site and confirm that:

- the application loads,
- the seeded gift plans are available to the simulation/admin flow,
- simulation users can be retrieved,
- dashboard/API-backed pages do not return database errors.

`/api/health` now probes database configuration readiness within the configured bootstrap time budget and returns a redacted 503 on failure. It does not verify every financial route, Redis connectivity, signing or treasury readiness; still inspect the dashboard and run the applicable manual acceptance.

### Supabase

In Supabase verify that the migrated tables exist and seed rows were created.

Do not manually edit ledger/queue/financial rows from the Supabase table editor to make the application appear to work.

### Upstash

Confirm the Vercel deployment has the two Upstash environment variables and that no missing-credential errors appear in Vercel function logs.

Keep Redis command volume low. Redis usage should be justified by a cross-instance coordination or rate-limit/cache requirement, not simply added to every read path.

## 13. Custom domain

When ready:

1. Add the domain in **Vercel Project → Settings → Domains**.
2. Follow Vercel's DNS instructions.
3. Wait for Vercel to confirm the domain and TLS certificate.
4. Set `WEB_ORIGIN` to the final HTTPS domain.
5. Redeploy production.
6. Update any future Google OAuth callback URLs to the same production origin when M2 authentication is implemented.

## 14. Reproducible dependencies and build checks

`package-lock.json` is committed. CI and Vercel both use `npm ci --no-audit --no-fund`; `actions/setup-node` caches npm downloads using the lockfile. Use the pinned Node version in `.nvmrc` (Node 22.23.3; Vercel runtime major 22). The Vercel CLI is also pinned in the development dependencies.

For a deliberate dependency update, edit the manifest, regenerate the lockfile with Node 22, then run:

```bash
npm ci --no-audit --no-fund
npm run check:all
npm run build
npm run check:bundle
npm run check:secrets
```

Commit the manifest and matching lockfile together. `check:deployment` validates runtime, lockfile consistency, Vercel install/deployment settings, and upload-safe application paths without hosted credentials. During deployment, its `--hosted` mode also checks selected simulation providers and credential presence; it does not prove provider connectivity. The current application accepts only simulation, the `test_iteration` profile, and a disabled real signer; testnet/mainnet integration is future work.

## 15. Troubleshooting

### A PR passes checks but deployment is skipped

Check that the repository variable `ENABLE_VERCEL_DEPLOYMENTS` is exactly `true`, the PR originates in this same repository, and the `preview` environment exists. A run waiting for a required reviewer must be approved before secrets are released. Fork PRs deliberately do not deploy. Ensure Actions is enabled and the PR contains the workflow file.

### Vercel deploys the same commit twice

Git integration is probably auto-deploying in addition to GitHub Actions.

Ensure `vercel.json` has:

```json
"git": {
  "deploymentEnabled": false
}
```

### Supabase reports `permission denied`

Check the migration that created the table. New public-schema tables need explicit Supabase grants.

Do not fix a sensitive table by broadly granting `anon` or `authenticated` access. Add the intended least-privilege grant and, when the Data API is used, the corresponding RLS policy.

### Vercel reports too many PostgreSQL connections

Verify that:

```text
DATABASE_URL=<Supabase Transaction pooler URL>
DATABASE_POOL_MAX=1
```

and that you did not accidentally give Vercel the direct database URL.

### GitHub migration cannot reach Supabase Direct

The direct endpoint may not be reachable from the runner's network/IP mode. Use Supabase's Session pooler for the migration secret if necessary and verify the migrations complete correctly, or use an approved network option that can reach the direct endpoint.

### Upstash configuration error

For hosted production with `CACHE_PROVIDER=upstash`, both variables are required:

```text
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

After changing Vercel environment variables, redeploy so the new values are available to the Functions.

### Site builds but API calls fail

Check, in order:

1. Vercel Function logs,
2. `DATABASE_URL`,
3. Supabase project availability,
4. database migrations,
5. whether the Next.js Route Handler exists under `app/api/`,
6. Upstash credentials if the failing route uses cache,
7. whether Vercel detected the project as Next.js rather than a static site.

### CI fails on `npm ci`

Use Node 22 and verify `package.json` and `package-lock.json` match. Regenerate the lockfile only for an intentional dependency change, then rerun `npm ci`. Do not replace `npm ci` in CI to hide a mismatch.

## 16. Documentation rule

Project documentation stays limited to:

- `docs/PRD.md`
- `docs/SETUP.md`
- `docs/HOW-IT-WORKS.md`
- the current `docs/PROJECT-STATUS_vN.md`
- the current `docs/LLM-HANDOVER_vN.md`

Keep routine progress, handoff, acceptance, deployment, database, and build-state notes in the current status/handover pair whenever practical. Extra Markdown files are allowed when genuinely useful and must not fail CI solely because they exist.

Use:

- `PRD.md` for product requirements,
- `SETUP.md` for the hosted deployment/setup procedure,
- `HOW-IT-WORKS.md` for concise technical explanations,
- `PROJECT-STATUS_vN.md` for progress, known issues, validation results, blockers, deviations, and the exact next task.
- `LLM-HANDOVER_vN.md` for the self-contained continuation prompt for the next LLM.

## 13. Enable non-signing notification jobs

Migration 011 adds the transactional outbox, durable jobs and scheduler replay/lease records. Pending work is retained; existing immediate notifications stay unchanged. New financial notifications are delivered by the signed tick, so they can remain pending while scheduling is disabled. No real signer or financial send is enabled here.

After the production simulation deployment works:

1. Generate a cryptographically random key of at least 32 bytes, encoded as unpadded base64url, using your secure password/secret tooling. Store it as server-only `SCHEDULER_HMAC_KEY` in Vercel **Production** and as a matching secret in GitHub's protected `production` environment. Never put the key in GitHub files, chat, logs, public variables or exports.
2. Set the GitHub `production` environment variable `SCHEDULER_ORIGIN` to the exact production HTTPS origin, without a trailing slash or path. Redeploy Vercel after changing its environment values.
3. Set repository Actions variable `ENABLE_SCHEDULER=true`, then run **Actions → non-signing-scheduler → Run workflow** on `main`. Check its result and staff `GET /api/v1/admin/jobs` diagnostics. The workflow runs a signed notification tick every five minutes thereafter; it requires no migration credentials or signer material. Leave this flag absent/false until settings are ready. PRs/forks do not run this scheduler.

Protected environments with required reviewers also hold scheduled runs for approval. GitHub scheduled runs can be delayed and consume Actions quota; five minutes is the desired cadence, not guaranteed delivery. Review your plan's budget or use a compatible external scheduler calling the same signed endpoint. New work catches up from database due times. `ENABLE_VERCEL_DEPLOYMENTS` controls deployment separately; both workflows remain opt-in during credential-free iterations.

For key rotation, put the old key in Vercel's optional `SCHEDULER_HMAC_PREVIOUS_KEY`, install a new current key in Vercel, redeploy, then update GitHub's current secret. Retire the previous key after outstanding requests' maximum skew/replay window. Use separate keys/origins if manually exercising an isolated preview; never point preview jobs at production data. Hosted key delivery and scheduling remain unverified until executed.

Staff may explicitly replay a reviewed dead-letter notification through `POST /api/v1/admin/jobs/<id>/replay` with an empty JSON body and UUID `Idempotency-Key`. This preserves the original operation and attempts. Invalid payloads are refused; never edit immutable work or financial history to force a retry. Long-running workers, alerts and retention/recovery orchestration remain later milestones.

## 14. Exercise GIV withdrawal recovery

Use only an isolated simulation deployment. Create a normal user quote, then as the selected simulation admin call `POST /api/v1/admin/simulation/withdrawals/<id>/control` with `{ "outcome": "hold", "reason": "Your named scenario" }` or outcome `reject`, and a UUID `Idempotency-Key`. Configure it before confirmation; its outcome is immutable. Without a control, GIV retains normal immediate settlement.

The user confirms the quote normally. A `hold` reserves funds without settlement; the wallet shows a cancellable held withdrawal. A `reject` records a balanced release and cancellation. The user can call `POST /api/v1/me/withdrawals/<id>/cancel` with `{}`; the withdrawal ID is its single-use state identity. This moves no money for an unused quote and releases an unsent GIV hold once.

For a reviewed delayed hold, admin calls `POST /api/v1/admin/simulation/withdrawals/<id>/resolve` with `{ "action": "settle", "reason": "Your review reason" }` or action `cancel`, plus a UUID `Idempotency-Key`. Inspect the returned state and staff reconciliation; duplicate requests preserve the original result. No mode permits reopening settlement or exporting GIV. The named recovery procedure is in HOW-IT-WORKS.md. Real-chain cancellation/signing and reorg handling remain separate, unimplemented gates.

## 15. Inspect scheduled reconciliation

Migration 013 adds immutable staff-only results. The existing signed tick queues one named reconciliation per UTC day; no additional credential or Redis operation is needed. Successful job completion stores a coherent snapshot and capped diagnostics. A timeout stores no success report and leaves retryable work; a recorded discrepancy is not repaired automatically.

Read summary history at `GET /api/v1/admin/reconcile/reports`, then a selected result at `GET /api/v1/admin/reconcile/reports/<id>`. Inspect its snapshot/check timestamps, `balanced`, `consistent` and `lineage_complete` separately. A stored daily report describes its snapshot, not every later transaction. The normal admin reconciliation button runs a fresh bounded check.

Migration 014 and the pre-migration binding command protect against backup-cloned IDs. The guarded simulation reset clears old work and reports. These contracts passed in tooling; hosted provider validation, scheduling, larger-dataset capacity and external alerts remain unverified.

## 17. Exercise incoming GIV exceptions

Migration 015 adds server-only invoices and immutable simulation control/event/refund history. It grants no browser/Data API access and requires no chain secret. Normal GIV UI uses invoice review then separate confirmation. Keep real asset/payment/signing selectors disabled.

On an isolated simulation deployment, create a member invoice through `POST /api/v1/gifts/invoices` with `{ "plan_id": "<plan UUID>" }` and a UUID `Idempotency-Key`. Before submission, staff may call `POST /api/v1/admin/simulation/invoices/<id>/control` with outcome `reject`, `under`, `over`, `late` or `delay`, a named `reason`, and an idempotency key. Optional `actual_base_units` must match the chosen outcome; defaults differ by one base unit for under/over. Controls are immutable and cannot be added after submission/expiry.

The member submits `{}` to `POST /api/v1/gifts/invoices/<id>/transaction`; its invoice ID deduplicates retries. A delayed payment keeps funds held. Staff resolves it through `POST /api/v1/admin/simulation/invoices/<id>/resolve` with `{ "action": "confirm", "reason": "<review reason>" }` or `cancel`, and an idempotency key. Valid pre-expiry submissions can confirm after expiry; failed current eligibility preserves the hold for review. Cancellation creates refundable liability, which a separate reviewed `refund` action returns to the original internal GIV sender. Under/late and surplus refunds use the same action. Neither endpoint accepts arbitrary destinations or performs a blockchain send.

For named acceptance, run `M1_INCOMING_CONFIRM=isolated-simulation APP_BASE_URL=<verified origin> npm run scenario:m1:incoming` after the fresh M1/integrity/jobs/recovery order. It changes isolated Silver data and never resets it. Inspect incoming/refundable balances and staff reconciliation; a balanced ledger alone is insufficient. Hosted, restore and reorg acceptance remain separate.

## 18. Exercise GIV reorg review

Migration 016 adds immutable server-only review/resolution records, own-row views and commit-time financial guards. Apply it through the normal binding/migration/seed/runtime-check deployment path. It requires no RPC, signer or new hosted credential.

On isolated simulation data, use a captured `allocation_id` returned by a confirmed GIV gift. Staff calls `POST /api/v1/admin/simulation/allocations/<id>/reorg` with a named `reason` and UUID `Idempotency-Key`. Repeated requests for the same unresolved source preserve the same review and compensation. Staff diagnostics are `GET /api/v1/admin/simulation/reorgs`. Inspect its principal/loss and post-source settled-outflow exposure; do not interpret that exposure as exact source-to-withdrawal attribution.

The affected partition and user/asset spends remain paused. Existing balances, held liabilities and settled withdrawals stay intact; cancelled unsent GIV holds remain recoverable. For a positively reconfirmed simulation source, call `POST /api/v1/admin/simulation/reorgs/<review_id>/reconfirm` with a review reason and idempotency key. It appends an inverse principal/point correction, not another admission/payout. Do not use this GIV endpoint as live-chain evidence or blindly clear a persistent invalid source. A future real adapter needs independently observed canonical finality and signed-attempt recovery.

Run `M1_REORG_CONFIRM=isolated-simulation APP_BASE_URL=<verified origin> npm run scenario:m1:reorg` only after the fresh M1/integrity/jobs/recovery/incoming order. It changes isolated Bronze data and never resets it. Preserve any failing evidence and inspect fresh reconciliation; open review must report inconsistent even when journals balance. Original stored daily reports remain historical snapshots.

## 19. Operate bounded scheduler retention

Migration 017 adds server-only immutable maintenance reports and protects scheduler identities/deletion windows. Apply it through the ordinary binding → migrate → seed → runtime-check path before deploying this version. It does not delete financial history or require another provider. The signed non-signing scheduler from section 13 supplies the daily root and later continuation pages; no second schedule or owner database credential is added to Vercel.

`retention_policy.http_replay_days` controls completed scheduler-window retention. Each job page caps each resource at 100 rows or the smaller configured job chunk. Inspect `GET /api/v1/admin/maintenance/reports`: `more_possible` means a durable continuation is pending, not success for the entire backlog. Undispatched/pending/running/retry/DLQ jobs, permanent work keys, financial/audit/report history and notifications are retained. Other retention fields still have no deletion implementation; never assume they archive or erase records.

For an operational/legal preservation hold, set server-only `OPERATIONAL_RETENTION_HOLD=true` on the affected deployment and redeploy. The exact values are `true` and `false`; other values fail closed. This suppresses daily cleanup and routine nonce pruning. Reports record held pages with zero deletion; they are not a claim of empty backlog. Review the hold before setting `false` and redeploying. The next daily root resumes cleanup. A hold increases coordination storage; monitor backlog and database quota. No financial deletion is enabled when the hold is removed.

Before hosted acceptance, perform the named isolated procedure in HOW-IT-WORKS.md, check fresh reconciliation, and verify the restricted runtime cannot delete a current nonce/run or change completed-window identity. Never bypass these guards, remove pending jobs, or infer live-chain nonbroadcast from a scheduler record.


## 20. Verify an isolated simulation backup and restore

These operator-only commands preserve the current GIV application database, including unpaid liabilities, ledger/receipt history, queue tickets/counters, retained reports and pending/retry/running/DLQ work. They implement neither member/site portability exports nor hosted/live-chain recovery. Hosted acceptance remains deferred. Do not run them in Vercel or schedule them automatically.

Use an owner maintenance host with Node 22.23.3 and compatible native `pg_dump`/`pg_restore` on PATH (PG17.5 was observed). Use a direct/session owner connection, never a transaction pooler for native tools or the shared snapshot. Provision the same restricted runtime groups and closed browser roles from section 3 separately on the target. Set owner/runtime URLs to one dedicated simulation namespace; fresh binding is required even if copied namespace IDs match. Native remote connections require hostname/certificate verification with system trust or the exact `DATABASE_TLS_CA_PEM`; no weakening URL option is accepted. Loopback plaintext remains limited to disposable simulation tooling. Native remote TLS/provider acceptance was not run in this pass.

Create a private operator environment file and archive directory outside source control (file mode 600, directory mode 700). Keep `DATABASE_MIGRATION_URL` and a cryptographically generated 32-byte `EXPORT_ENCRYPTION_KEY` (canonical 43-character base64url) in the maintenance secret store, outside Vercel, browser, manifest and logs. Store the key separately from the archives; losing it prevents recovery. Restore and verify require the same key. This command does not rotate keys or manage backup retention. Never paste credentials or command environment contents into chat.

Require `APP_ENV=simulation`, `MAINNET_ENABLED=false`, `SIGNER_PROVIDER=disabled`, `RECOVERY_CONFIRM=isolated-simulation` and unset both scheduler HMAC keys. Choose an absolute, new file path with an allowlisted basename ending `.gwbackup`. The CLI refuses existing archive/inventory paths. For example, after loading the private maintenance environment into the process:

```sh
npm run db:backup:simulation -- /secure/backups/simulation-snapshot.gwbackup
```

It streams an application-`public`-schema native dump through AES-256-GCM without saving plaintext. Provider auth/storage/vault and unrelated schemas are excluded. The paired `.gwbackup.json` contains only counts/hashes, extension/version metadata and an HMAC signature. Retain both files together. Ephemeral binding challenges are excluded and must be freshly proved. Drizzle keyset hashes and native dump share a repeatable-read snapshot; unknown public tables, unknown manifest keys and non-simulation assets stop backup. Current proof covers 34 retained tables of 35 implemented tables, not future PRD resources.

Create an empty, unpublished staging database with no other clients. Set its owner and restricted runtime URLs in the private environment and `RECOVERY_RESTORE_CONFIRM=restore:<exact database name>`. Keep the scheduler and signer off. Database names must be literal ASCII names, not libpq connection strings. Then:

```sh
npm run db:restore:simulation -- /secure/backups/simulation-snapshot.gwbackup
npm run db:verify:restore -- /secure/backups/simulation-snapshot.gwbackup
```

Restore verifies signed metadata, migration fingerprint, ciphertext checksum and full AEAD authentication before target bootstrap. It uses a private ciphertext copy to prevent input replacement. It provisions only the signed pgcrypto dependency, preserves the existing public schema/fresh proof and imports application objects/data/ACLs in one native transaction. It does not use `--clean`, merge into populated tables, erase evidence, run a job or publish staging. Row hashes, constraints/functions/triggers/RLS/grants/schema privileges, extension version, counters and fresh owner/runtime/configuration binding must match exactly afterward. Failure prints a fixed redacted category; keep the archive, inventory, failure observations and quarantined staging intact. A content mismatch after native commit still requires explicit review; never promote it or edit history to pass.

For named acceptance, retain submitted incoming holds, refundable amounts, unsent withdrawal holds, pending/retry/running/DLQ jobs and an open financial review; take a backup and restore to a separate empty namespace. Compare own dashboards and staff reconciliation, confirming liabilities/review survive, unauthorized staff access fails and unsigned ticks remain rejected. Verify bad keys, metadata/version/ciphertext tamper, active/populated targets, unknown source resources and output overwrite rejection. Use a separately signed disposable corrupt-FK archive to observe a real import rollback; preserve that target and do not alter the source ledger. This pass verified these GIV contracts in PG17.5. Before any future scheduler resumption, reconcile, inspect stale leases/due work, unresolved obligations and reviews, and explicitly authorize publication/resumption. No live signer, sessions/TOTP, chain finality, failover, large-dataset capacity or hosted-provider restore is accepted by this procedure.


## 21. Operate public display cache budgets

No provider, role, migration or secret is added by the public IndexedDB store. Deploy the ordinary Next.js build after checks. `cache_policy.max_public_help_mb` bounds its versioned public documents (10 MiB by default); the entry ceiling is `min(max_memory_entries,1000)`. Compact v3 localStorage snapshots retain their separate `max_memory_entries`/`max_memory_mb` budget. IndexedDB uses conservative UTF-8/UTF-16 payload accounting plus metadata allowance, fixed expiry and LRU; these caps do not promise a browser disk quota or hosted capacity. A smaller policy trims existing records. Invalid settings cannot raise the deployment ceilings.

The current dashboard writes only approved simulation catalog fields. Text-help DTOs have separate locale/slug keys, but the full help publisher, search and offline shell remain later work. Never put authenticated responses, arbitrary URLs, invoice bodies, destinations, credentials or session material into this store. Cached plans are display-only: the financial transaction still loads current configuration and verifies economics/version/eligibility. Successful writes refresh the catalog. No offline write is queued.

Browser storage denial, blocked opening, transaction timeout or quota rejection returns a cache miss without failing the action. The compact catalog remains the fallback when the larger store is unavailable. The public disk namespace is independent of private identity generations; it survives account changes while private snapshots are purged. Public data can be explicitly cleared with the cache module's `clearPublicData` without touching private scope or server history.

Observe the named cache procedure in HOW on an isolated browser profile. Verify catalog ETag/304 and current database TTL through the deployed public endpoint, plus private/no-store dashboard responses. Repeat separate hosted CDN/provider/quota measurements before acceptance; credential-free Chromium observations do not prove Vercel/Upstash behavior or a complete PWA.


## 22. Operate public server L1 reads

Public manifest/catalog loaders coalesce misses within one Node.js process. Only public DTOs enter a bounded in-process cache; no Redis/provider call, credentials, staff policy, actor/session state or financial authority is stored. Validated database `max_memory_entries`/`max_memory_mb` apply. L1 lifetime is the smaller of `manifest_server_seconds` and the resource's public TTL. The catalog rejects more than 1,000 rows rather than returning a truncated list. Data-query statements have a five-second PostgreSQL timeout; existing connection/security checks still apply. Failed catalog loads are evicted. Manifest seed fallback remains display-only and expires from L1 within five seconds.

Plan activation invalidates both DTOs after commit. Generation fencing prevents an older load from repopulating the cache or deleting a newer flight. This is process-local invalidation; other Function instances, CDN copies and out-of-band maintenance changes remain bounded by their TTLs. Restart/redeploy or explicitly invalidate after owner maintenance where immediate display propagation is needed. Cached age reduces outward CDN `s-maxage`, so a warm hit cannot restart an old snapshot's full freshness window. Financial actions always recheck current database configuration/version/status; do not use display caching as an activation or authorization gate.

Perform HOW's named source-lock/concurrency/expiry/invalidation/timeout and live-boundary procedure on a dedicated simulation namespace. Hosted multi-instance/CDN invalidation, latency and quotas still require provider observations; local coalescing proves neither hosted capacity nor production identity. No signer or scheduled business work is enabled by this change.


## 23. Configure sessions, Google and staff MFA

Provide independent canonical base64url-encoded 32-byte `AUTH_ACCESS_KEY` and `MFA_ENCRYPTION_KEY` through server-only secret settings, plus the exact `WEB_ORIGIN` HTTPS origin with no path/trailing slash. Generate/store keys privately; never print them or add NEXT_PUBLIC aliases. `AUTH_ACCESS_PREVIOUS_KEY` may temporarily accept the prior access-signing key during rotation; a current key remains required. Preserve the MFA key separately from encrypted backups: it is never in an archive. Replacing it prevents existing factors from being decrypted; do not rotate it casually. Hosted preflight validates these bindings before deployment.

Set `AUTH_PROVIDER=google` and privately provision `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`. Register exactly `<WEB_ORIGIN>/api/v1/auth/google/callback` in the owner-controlled Google client. API-created sessions remain platform-issued; Google tokens are never returned, cached or archived. No Supabase Auth/Data API/browser credential is needed. Failed callbacks return a generic sign-in failure; real Google consent/callback remains a separate hosted observation.

For isolated GIV use `AUTH_PROVIDER=simulation`. The browser chooser/sign-up route issues cookie families, not a trusted username header. Require unchecked current terms and adult attestation to consent. Staff must enroll an authenticator and verify a code before staff actions; save one-use recovery codes privately when shown. Member withdrawal confirmation needs a recent session or an enrolled factor's recent proof. If it returns STEP_UP_REQUIRED, reauthenticate/verify before confirming the original quote; revalidate expiry and never silently issue another withdrawal.

Migrate/seed 001–018 with the separate owner credentials and fresh binding procedure. New identity tables are server-only and browser/reader roles cannot read hashes/factors. Role/status changes revoke access; ordinary blocked account access does not delete money. Deletion/redaction tooling, moderation workflows, CAPTCHA and lost-factor administrative recovery remain later work.

Named operator M1 scripts now also require a separately generated `SIMULATION_TOOL_AUTH_KEY` in the isolated server and operator environment. Their helper adds it only to same-origin calls already carrying x-sim-user. Headers alone fail. This explicit fixture capability can bypass sessions/MFA for financial observations; never expose it to the browser, enable it on Vercel, or treat fixture observations as real login evidence. Vercel/runtime preflight rejects the setting. Keep scheduler keys separate, and unset them for recovery CLI runs.

Cookies, raw TOTP/recovery values, PKCE verifiers and OAuth/access/refresh tokens never enter local storage, logs or JSON exports. New recovery archives retain identity/factor ciphertext/recovery hashes/replay steps, exclude session/refresh/auth-flow/rate data, and verify all 43 table schemas with 38 retained row inventories. A restore has zero active sessions and cannot reuse source cookies. Older version-bound archives remain valid only with their matching revision; restore with that revision into isolated staging, then perform reviewed migrations. Never rewrite old inventories to bypass version checks.

Nonce CSP makes HTML dynamic and private/no-store; public catalog/manifest retain bounded CDN caching. Observe fresh distinct nonces, matching Next script nonces, working mobile hydration and blocked untrusted inline event code after deployment. `check:bundle` launches an isolated production renderer to measure actual homepage scripts; no hosted credentials are needed. Secure cookies/HSTS and platform-trusted forwarded IP rate keys still need hosted HTTPS acceptance. Keep deployments disabled until the owner provisions the deferred hosted settings.
