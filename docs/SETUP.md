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

## 3. Create the Supabase PostgreSQL database

### 3.1 Create the project

In Supabase:

1. Create a new project.
2. Choose a region reasonably close to the Vercel Functions region you intend to use.
3. Save the database password securely.
4. Open the project's **Connect** dialog.

Gifters World uses Supabase as hosted PostgreSQL. The application does not require Supabase Auth, Storage, Realtime, Edge Functions, or the Data API for its core database path.

### 3.2 Copy the runtime connection string

For Next.js Route Handlers on Vercel, use Supabase's **Transaction pooler** connection string for `DATABASE_URL`. Follow the current Supabase Connect instructions for Vercel/serverless connections; if Supabase instructs you to append a Vercel pooler workaround query parameter, preserve it exactly.

It normally uses port `6543` and is designed for serverless workloads with many short-lived connections.

Example shape only:

```text
postgresql://postgres.<project-ref>:<password>@<pooler-host>:6543/postgres
```

Do not invent the hostname. Copy the actual value from Supabase's Connect screen.

The application disables prepared statements for the Supabase runtime connection and keeps the serverless connection pool small. The database code runs only in the Next.js Node.js runtime, never in browser components.

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

### 3.4 Supabase GRANT requirement

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

- public catalog/config data may receive narrowly scoped read grants when appropriate,
- financial, identity, ledger, admin, queue, payout, and audit tables should not be exposed to `anon` or `authenticated` merely to silence a permission error,
- server-only tables should normally remain accessible only through the server/database role until an intentional RLS/Data API contract is implemented.

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

The cache adapter also supports `ioredis`/compatible Redis providers through `REDIS_URL`, but Upstash is the deployment default.

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

Add repository secrets:

```text
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
```

The workflow uses these to run `vercel pull`, `vercel build`, and `vercel deploy --prebuilt`.

## 8. Configure database migration secrets in GitHub

Vercel runtime environment variables do not automatically become GitHub Actions secrets for arbitrary commands such as `npm run db:migrate`.

Create a protected GitHub **production environment** and add:

```text
DATABASE_URL=<Supabase Transaction pooler URL>
DATABASE_MIGRATION_URL=<Supabase Direct or approved Session pooler URL>
```

The production database setup/migration job should run with:

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
npm run db:migrate
npm run db:seed
```

with:

```yaml
env:
  APP_ENV: simulation
  DB_PROVIDER: supabase
  MAINNET_ENABLED: "false"
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
  DATABASE_MIGRATION_URL: ${{ secrets.DATABASE_MIGRATION_URL }}
```

`db:migrate` is forward/idempotent for the current migration style, and the Phase One seed is designed to insert defaults without overwriting normal runtime state.

For later real-money releases, migration/seed policy must be reviewed again before deployment.

## 10. Drizzle ORM requirement

Application database access should use Drizzle ORM wherever practical, targeting effectively 100% application-table coverage.

New database work must follow both rules:

1. create/change the table in a migration,
2. represent that table/change in the Drizzle schema.

Raw SQL should be limited to PostgreSQL-specific operations that are clearer or safer outside the ORM, such as:

- DDL migrations,
- `GRANT` and RLS policy statements,
- explicit row/advisory locking where required,
- specialized recovery/reconciliation operations.

Do not introduce Supabase client-library calls into domain logic merely because Supabase hosts PostgreSQL.

## 11. Deploy the first live Phase One site

After all secrets and environment variables are configured:

1. Push the repository to `main`.
2. Open the repository's **Actions** tab.
3. Open the `ci-vercel` workflow run.
4. Confirm the checks job passes.
5. Confirm the production job migrates/seeds Supabase successfully.
6. Confirm `vercel build --prod` succeeds.
7. Confirm `vercel deploy --prebuilt --prod` succeeds.
8. Open the production URL shown by Vercel.

The GitHub workflow is the deployment authority. Do not manually deploy a different copy of the source after CI succeeds.

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

This is more meaningful than `/api/health` alone because the current health route does not prove every database query succeeds.

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

## 14. Package-lock note

This handoff currently uses `npm install --no-audit --no-fund` in CI because the environment that created the repository could not reach npm long enough to generate `package-lock.json`.

The first development environment with normal npm registry access should:

1. generate `package-lock.json`,
2. commit it,
3. replace CI/Vercel install commands with `npm ci`,
4. enable normal npm dependency caching in `actions/setup-node`.

Do not switch the workflow to `npm ci` before the lockfile is committed or CI will fail immediately.

## 15. Troubleshooting

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

A lockfile must exist first. Until `package-lock.json` is committed, use the repository's current `npm install --no-audit --no-fund` command.

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
