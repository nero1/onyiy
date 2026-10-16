# Set up Gifters World in your browser

Follow these steps in order. You need no terminal or local installation. This creates a **simulation site using GIV**, not a real-money service. Keep passwords and tokens in a password manager.

Menu names checked against official platform documentation on **16 October 2026**. Your account's plan may change which options appear.

## 1. Open GitHub

1. Go to [github.com](https://github.com). Create an account if needed.
2. Open [nero1/onyiy](https://github.com/nero1/onyiy). Ask the owner for administrator access if you cannot see **Settings**.
3. Open **Actions**. Enable workflows if GitHub asks. Leave deployments disabled until step 8.

Use this repository: the existing deployment workflow is restricted to `nero1/onyiy`. Copying it elsewhere requires a reviewed workflow change.

## 2. Create an empty Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard). Sign up or sign in.
2. Choose your organization, or create one when prompted.
3. Click **New project**. Name it `gifters-simulation`.
4. Generate a random database password of at least 32 letters and numbers. Save it as **Supabase owner password** in your password manager.
5. Choose a nearby region, review the price, then click **Create new project**. Wait until ready.

Use a new project with no application tables. Do not delete existing tables to make this guide work. Supabase's own `auth` and other provider schemas are normal.

## 3. Paste the single migration into SQL Editor

1. In GitHub, open [000_initial_schema.sql](https://github.com/nero1/onyiy/blob/main/packages/db/src/migrations/000_initial_schema.sql).
2. Click **Raw**. Select and copy the **entire file**, including its first and last lines.
3. Return to the correct Supabase project. Click **SQL Editor → New query**.
4. Use the owner role, normally **postgres**. Paste the SQL without changing it.
5. Click **Run**. If warned about database changes, confirm only after checking this is your new simulation project.
6. Wait for success. Open a new query, paste the following, and click **Run**:

```sql
select name from public.schema_migrations;
```

7. Confirm the result contains `000_initial_schema.sql`.

Run the installation file once. It creates the final tables, views, functions, security rules and indexes together. It does **not** create all plans and demo accounts; the existing deployment workflow adds those in step 8. There are no earlier migration files to paste.

If installation fails, keep the error and check the troubleshooting table below. Do not split the file, remove checks, or rerun it over existing application tables. [SQL Editor reference](https://supabase.com/docs/guides/database/functions).

## 4. Create the app login and copy its connection URLs

1. Generate a separate random password of at least 32 letters and numbers in your password manager. Save it as **Gifters runtime password**. Letters and numbers avoid URL-encoding mistakes.
2. In **SQL Editor → New query**, paste this SQL. Replace `REPLACE_WITH_RUNTIME_PASSWORD` privately before clicking **Run**:

```sql
create role gw_runtime login noinherit nosuperuser nocreatedb
  nocreaterole nobypassrls password 'REPLACE_WITH_RUNTIME_PASSWORD';
grant gw_read, gw_service to gw_runtime;
grant connect on database postgres to gw_runtime;
```

3. Delete the saved password-bearing query using its query menu. Never share it or put it in GitHub. The migration already created `gw_read` and `gw_service`.
4. Click **Connect** at the top of the project. Choose the connection-string/URI view and **Transaction pooler**.
5. Save the copied URL privately as **DATABASE_URL**. Change `postgres.PROJECT_REF` to `gw_runtime.PROJECT_REF`, retaining your actual project reference. Replace the password placeholder with the **runtime** password. Keep the copied host and port, normally `6543`.
6. In **Connect**, choose **Session pooler**. Save its owner URL as **DATABASE_MIGRATION_URL**, normally port `5432`. Replace the password placeholder with the **Supabase owner** password. Keep `postgres.PROJECT_REF` as its username.
7. If a URL has no query options, append `?sslmode=require`. Retain only supported `sslmode=require` and optional `sslrootcert=system` options.

The owner URL goes into GitHub only. The runtime URL goes into GitHub and Vercel. Both must target the same project. Session pooling avoids the direct endpoint's IPv6 requirement on many hosted runners. [Connection guide](https://supabase.com/docs/guides/database/connecting-to-postgres) · [Role guide](https://supabase.com/docs/guides/database/postgres/roles).

## 5. Create Upstash Redis

1. Go to [console.upstash.com](https://console.upstash.com). Sign up or sign in.
2. Open **Redis → + Create Database**. Name it `gifters-simulation`.
3. Choose a primary region close to your database. Click **Next**, review the plan and price, then create the database.
4. Open its **Details/Connect → REST** section. Save `UPSTASH_REDIS_REST_URL` and the standard `UPSTASH_REDIS_REST_TOKEN` privately. Do not choose the read-only token.

[Creation steps](https://upstash.com/docs/redis/overall/getstarted) · [REST credentials](https://upstash.com/docs/redis/features/restapi).

## 6. Create Vercel and enter the app settings

1. Go to [vercel.com/signup](https://vercel.com/signup). Choose **Continue with GitHub** and authorize access to `nero1/onyiy`.
2. Click **Add New → Project → Import** beside `onyiy`. If missing, use **Adjust GitHub App Permissions** to grant access.
3. Name it `gifters-world-simulation` or another available name. Keep **Framework Preset: Next.js** and **Root Directory: repository root**. Keep the repository's build settings.
4. Create the project with **Deploy**. This initial import may fail before settings exist; finish the steps below before retrying through GitHub Actions.
5. Open **Settings → Build and Deployment → Node.js Version**. Select **22.x** and save.
6. Copy the assigned production domain from **Settings → Domains**. Save its HTTPS origin, such as `https://YOUR-PROJECT.vercel.app`, as **WEB_ORIGIN**. Use no trailing slash or path.
7. Return to Supabase **SQL Editor → New query**. Run this query once to generate two independent app keys:

```sql
set search_path = public, extensions;
select
  translate(rtrim(encode(gen_random_bytes(32), 'base64'), '='), '+/', '-_')
    as auth_access_key,
  translate(rtrim(encode(gen_random_bytes(32), 'base64'), '='), '+/', '-_')
    as mfa_encryption_key;
```

8. Save each result privately as `AUTH_ACCESS_KEY` and `MFA_ENCRYPTION_KEY`. Back up the MFA key: replacing it can make existing two-factor settings unreadable. Do not use a public key-generator website.
9. In Vercel, open **Settings → Environment Variables → Add Environment Variable**. Add every row below to **Production**. Enter values without extra quotes.

| Name | Value |
|---|---|
| `APP_ENV` | `simulation` |
| `DEPLOYMENT_PROFILE` | `test_iteration` |
| `MAINNET_ENABLED` | `false` |
| `DB_PROVIDER` | `supabase` |
| `DATABASE_URL` | Runtime URL from step 4 |
| `DATABASE_POOL_MAX` | `1` |
| `CACHE_PROVIDER` | `upstash` |
| `UPSTASH_REDIS_REST_URL` | Your Upstash REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Your Upstash standard REST token |
| `WEB_ORIGIN` | Your exact HTTPS site origin |
| `AUTH_ACCESS_KEY` | First generated key |
| `MFA_ENCRYPTION_KEY` | Second generated key |
| `AUTH_PROVIDER` | `simulation` |
| `PAYMENT_PROVIDER` | `giv_simulation` |
| `WALLET_PROVIDER` | `dummy` |
| `SIGNER_PROVIDER` | `disabled` |
| `CAPTCHA_PROVIDER` | `dummy` |
| `REALTIME_PROVIDER` | `none` |
| `PRICE_PROVIDER` | `manual_simulation` |
| `ALERT_PROVIDER` | `none` |

Do not add `DATABASE_MIGRATION_URL`, signer keys or `SIMULATION_TOOL_AUTH_KEY` to Vercel. Do not prefix these names with `NEXT_PUBLIC_`. The workflow must retrieve the server settings to validate them; do not choose a setting type that prevents this.

[Project settings](https://vercel.com/docs/project-configuration/project-settings) · [Environment-variable screen](https://vercel.com/academy/vercel-foundations/vercel-settings) · [Node version](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).

## 7. Give GitHub permission to deploy

1. In Vercel, open the project's **Settings → General**. Save **Project ID** as `VERCEL_PROJECT_ID`.
2. Switch to the owning team's **Settings → General**. Save **Team ID** as `VERCEL_ORG_ID`.
3. Open [Vercel account tokens](https://vercel.com/account/tokens). Click **Create Token**. Name it `gifters-github`, choose the owning team's scope and a suitable expiry, then create it. Save as `VERCEL_TOKEN`.
4. In GitHub, open **onyiy → Settings → Environments → New environment**. Enter `production`, then click **Configure environment**.
5. Add yourself as a **Required reviewer** if your plan offers it. Restrict deployment branches to `main`. If the plan cannot protect private-repository deployments, leave deployment enablement off until the owner chooses a supported plan or approved protection arrangement.
6. Under **Environment secrets → Add environment secret**, add these names and saved values:

| Name | Value |
|---|---|
| `VERCEL_TOKEN` | Vercel token |
| `VERCEL_ORG_ID` | Vercel Team ID |
| `VERCEL_PROJECT_ID` | Vercel Project ID |
| `DATABASE_URL` | Exactly the runtime URL saved in Vercel |
| `DATABASE_MIGRATION_URL` | Supabase owner session-pooler URL |

7. Create another environment named `preview` and protect it too. Leave its secrets empty until you prepare a separate preview project below.

The repository already disables Vercel's automatic Git deployments. Keep GitHub Actions as the deployment path. [Vercel tokens](https://vercel.com/docs/accounts/access-tokens) · [GitHub environments and plan limits](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments).

## 8. Deploy from GitHub's website

1. Confirm step 3 succeeded and all Production settings are saved.
2. In GitHub, open **Settings → Secrets and variables → Actions → Variables → New repository variable**.
3. Enter name `ENABLE_VERCEL_DEPLOYMENTS` and value `true`. Click **Add variable**.
4. Open **Actions → ci-vercel → Run workflow**. Select branch **main**, then click **Run workflow**.
5. Open the new run. Wait for **checks** to pass. If prompted, select **Review deployments → production → Approve and deploy**.
6. Wait for **deploy** to pass. Open its **Build and deploy prebuilt output** log and follow the URL. Your production domain is also listed in Vercel.

The existing workflow verifies the manually installed schema's receipt, adds missing default settings/plans/help/demo accounts, checks the restricted login, and publishes the site. It preserves existing seeded settings. No separate seed button or additional SQL installation is needed. A green **checks** job alone does not mean deployment happened.

Do not approve preview runs before configuring preview credentials. To stop future deployments, set `ENABLE_VERCEL_DEPLOYMENTS` to `false`. [Run workflow instructions](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow).

## 9. Check the site

1. Open `https://YOUR-DOMAIN/api/health`. Confirm it is healthy. A `503` means the app is not ready.
2. Open the homepage. Check plans and English/French switching.
3. Use the simulation account chooser to select `member_01`. Complete consent and check the 5,000 GIV starter balance. GIV has no cash value.
4. Complete a simulated gift. Check the cycle, balance, history and notification. Refresh and confirm they persist.
5. Select `sim_admin` through the simulation controls. Complete any consent/two-factor prompts and inspect admin screens. Treat this as a demo: simulated identity is not a secure production login.
6. Check Vercel **Logs**, then Supabase and Upstash usage screens before inviting testers.

Health passing does not prove financial readiness. Two Round One bugs remain open; Phase Two is not started. See [PROJECT-STATUS_v49.md](PROJECT-STATUS_v49.md).

## 10. If you need a preview site

1. Repeat steps 2–7 with a **different Supabase project, Upstash database and Vercel project**. Use names ending in `preview`.
2. In the preview Vercel project, put its values in the **Preview** environment. Use the actual stable HTTPS preview origin for `WEB_ORIGIN`.
3. In GitHub's `preview` environment, add the five secrets from step 7 using preview values.
4. Run **Actions → ci-vercel → Run workflow** on the `preview` branch, if it exists, or open a trusted same-repository pull request. Approve only preview.
5. Verify the resulting URL separately. Never connect preview to real-money data. Google login, if used, needs an exact callback for each actual origin.

## 11. Optional domain and Google login

**Custom domain**

1. Open Vercel **Settings → Domains → Add Domain**. Enter a domain you own.
2. Open your registrar's DNS screen. Add the exact records Vercel displays. Wait for verification.
3. Update `WEB_ORIGIN` to the new HTTPS origin and any Google callback. Repeat step 8 to publish.

**Google sign-in for the simulation site**

1. Open [Google Cloud Console](https://console.cloud.google.com). Select or create a project.
2. Open **Google Auth platform → Get started** if prompted. Complete **Branding**, choose your **Audience**, and add your email as a test user while the app is in testing.
3. Open **Clients → Create client → Web application**. Enter a name.
4. Add `https://YOUR-DOMAIN/api/v1/auth/google/callback` under **Authorized redirect URIs**. Click **Create**.
5. Save its client ID and secret privately. In Vercel, set `AUTH_PROVIDER` to `google`. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
6. Repeat step 8 and try a configured test user. A Google-created account is not automatically an admin.

[Google client setup](https://developers.google.com/workspace/guides/create-credentials) · [Callback requirements](https://developers.google.com/identity/protocols/oauth2/web-server). This does not enable testnet payments or real sending.

## If something fails

| What you see | What to do |
|---|---|
| SQL says application schema is not empty | Check whether step 3 succeeded using its receipt query. Use a new project for a new installation; preserve existing data. |
| Extension/version error | Keep the error. Required: `pgcrypto` 1.3 in `public` or `extensions`; `pg_trgm` 1.6 in `public`. Ask the maintainer to check compatibility, without removing guards. |
| `gw_runtime` already exists | Check whether step 4 was completed. Do not recreate it or change privileges blindly. |
| Password failure or “Tenant or user not found” | Recopy Connect details. Check project reference, pooler host, username and correct runtime/owner password. |
| TLS/certificate error | Keep verification enabled. If required, obtain the provider's public CA chain and add `DATABASE_TLS_CA_PEM` to Vercel and the matching GitHub environment secret. Never use a private key or disable verification. |
| `Run workflow` missing | Select **ci-vercel** and check it exists on `main`. Ask the administrator to enable Actions. |
| Deploy skipped | Check the repository variable is exactly `true` and branch is `main` for production. Ordinary feature-branch pushes run checks only. |
| Missing deployment binding | Check the five GitHub environment secrets and that the token belongs to the Vercel project team. |
| Schema fingerprint/history mismatch | Keep the error. Do not edit receipts, delete migration history or overwrite the database. |
| Google `redirect_uri_mismatch` | Match the exact HTTPS origin and callback path in Google and Vercel, then publish updated settings. |
| Site shows old settings | Save in the correct Vercel environment, then repeat step 8. |

## Limits and later operations

- **Costs:** review current plans before creating resources. Vercel Hobby is for personal, non-commercial use; commercial hosting needs a suitable plan. Free quotas do not prove large-user capacity. Domain, gas and backup costs are separate.
- **Testnets:** this guide stays on simulation. Testnet release also needs Google identity, a verified registry/network, two approved RPC endpoints, custody addresses, gas/fee policy and tested alerts. Both financial readiness gates remain disabled. No dashboard button safely completes that release process.
- **Background work:** deployment does not activate all workers. Non-signing scheduler workflows need separate URL/key settings. Do not enable workers or signing just to remove a warning.
- **Backups:** keep the MFA key separately. Vercel has no complete web-only application archive/restore flow; full encrypted recovery requires supervised operator tooling. Supabase backups do not replace the app's signed archive checks. Never restore onto an occupied project.
- **Later schema changes:** preserve the installed baseline. Add a reviewed forward migration for later changes. Old 99-file archives require their matching historical release, not this fresh installer.

**Documentation rule:** keep five core guides plus the two owner-requested bug trackers. Fold notes into them unless a new file is explicitly requested or essential. Use beginner language, exact clicks/values, web UIs and manual SQL installation. Keep old versions in Git history.
