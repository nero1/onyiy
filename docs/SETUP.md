# Set up Gifters World in your browser

Follow these steps in order. You need no terminal or local installation. Start with a **simulation site using GIV**, then follow the preview/testnet sections. Mainnet production preparation is listed separately; this release cannot process real money. Keep passwords and tokens in a password manager.

Menu names checked against official platform documentation on **16 October 2026**. Your account's plan may change which options appear.

**Already used Google login with this database?** Do not apply the demo settings or create a shared demo preview. Keep your existing credentials and follow step 12 to promote the database to testnet first; then add the preview in testnet mode. The shared simulation walkthrough is for demo identities, not real Google-user data.

## One account and one shared database

Use **one Supabase project/database, one Upstash database and one Vercel project**. Keep the database name supplied by Supabase, usually `postgres`. Names such as `gifters-simulation` below are labels, not a requirement to create another instance for every mode.

| Setting | Meaning | What you change |
|---|---|---|
| `APP_ENV=simulation` | GIV and demo identities | Starting mode |
| `APP_ENV=testnet` | Test networks and Google identity | One payment-mode switch, after adding the required credentials once |
| Vercel **Preview** | A build for reviewing a branch | Selected by the workflow; never put `preview` in `APP_ENV` |
| Vercel **Production** | The main site/domain | Selected by the workflow; does not mean mainnet payments |
| Real-money **mainnet** | Actual assets and custody | Not implemented in this release; do not set `APP_ENV=mainnet` or enable its gates |

**Shared means shared data:** preview edits affect the same users, settings and records as the main site. It is not an isolated copy. Only approve trusted previews. After testnet initialization, simulation access/seed/reset is retired on that database; use testnet in both hosting stages. Existing GIV records are retained, never converted to test tokens.

No extra provider accounts are required for these stages. [Supabase free-project limits](https://supabase.com/docs/guides/platform/billing-faq) · [Vercel hosting stages](https://vercel.com/docs/deployments/environments).

## 1. Open GitHub

1. Go to [github.com](https://github.com). Create an account if needed.
2. Open [nero1/onyiy](https://github.com/nero1/onyiy). Ask the owner for administrator access if you cannot see **Settings**.
3. Open **Actions**. Enable workflows if GitHub asks. Leave deployments disabled until step 8.

Use this repository: the existing deployment workflow is restricted to `nero1/onyiy`. Copying it elsewhere requires a reviewed workflow change.

## 2. Create or reuse your one Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard). Sign up or sign in.
2. Choose your organization, or create one when prompted.
3. Click **New project**. Name it `gifters-world` (or keep your existing project name).
4. Generate a random database password of at least 32 letters and numbers. Save it as **Supabase owner password** in your password manager.
5. Choose a nearby region, review the price, then click **Create new project**. Wait until ready.

If your existing project already has this app installed, reuse it and confirm its receipt in step 3; do not install again. A first installation requires an empty application namespace. Do not delete existing tables to make this guide work. Supabase's own `auth` and other provider schemas are normal.

## 3. Paste the schema into SQL Editor

If already installed, run the receipt query below first and skip installation when it matches. Otherwise:

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
8. Open [001_historical_treasury_fence.sql](https://github.com/nero1/onyiy/blob/main/packages/db/src/migrations/001_historical_treasury_fence.sql), click **Raw**, copy the entire file, then paste it into **SQL Editor → New query** and click **Run** once.
9. Repeat the same whole-file copy/paste for [002_ephemeral_retention.sql](https://github.com/nero1/onyiy/blob/main/packages/db/src/migrations/002_ephemeral_retention.sql), then [003_monthly_financial_archives.sql](https://github.com/nero1/onyiy/blob/main/packages/db/src/migrations/003_monthly_financial_archives.sql), then [004_transparent_profiles.sql](https://github.com/nero1/onyiy/blob/main/packages/db/src/migrations/004_transparent_profiles.sql). Then repeat for [005_production_environments.sql](https://github.com/nero1/onyiy/blob/main/packages/db/src/migrations/005_production_environments.sql). Run them separately, in that order. If a filename is already in the receipt query, skip that file.
10. Run the receipt query again. Confirm all four filenames appear before deploying the matching app release.

Run the installation file once. It creates the final tables, views, functions, security rules and indexes together. It does **not** create all plans and demo accounts; the existing deployment workflow adds those in step 8. The old 99-file chain remains consolidated in `000`; `001`–`005` add later recovery, retention, profile and environment safeguards. Keep the installed `000` unchanged. Deployment checks receipts and never runs migrations for you.

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
2. Open **Redis → + Create Database**. Name it `gifters-world` (or keep your existing project name).
3. Choose a primary region close to your database. Click **Next**, review the plan and price, then create the database.
4. Open its **Details/Connect → REST** section. Save `UPSTASH_REDIS_REST_URL` and the standard `UPSTASH_REDIS_REST_TOKEN` privately. Do not choose the read-only token.

[Creation steps](https://upstash.com/docs/redis/overall/getstarted) · [REST credentials](https://upstash.com/docs/redis/features/restapi).

## 6. Create Vercel and enter the app settings

1. Go to [vercel.com/signup](https://vercel.com/signup). Choose **Continue with GitHub** and authorize access to `nero1/onyiy`.
2. Click **Add New → Project → Import** beside `onyiy`. If missing, use **Adjust GitHub App Permissions** to grant access.
3. Name it `gifters-world` or another available name. Keep **Framework Preset: Next.js** and **Root Directory: repository root**. Keep the repository's build settings.
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
9. In Vercel, open **Settings → Environment Variables → Add Environment Variable**. Add every row below to **Production**. You will reuse the same values for Preview in step 10. Enter values without extra quotes.

| Name | Value |
|---|---|
| `APP_ENV` | `simulation` |
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

**Leave provider selector overrides unset:** `AUTH_PROVIDER`, `PAYMENT_PROVIDER`, `WALLET_PROVIDER`, `SIGNER_PROVIDER`, `CAPTCHA_PROVIDER`, `REALTIME_PROVIDER`, `PRICE_PROVIDER`, `ALERT_PROVIDER` and `DEPLOYMENT_PROFILE`. `APP_ENV` supplies their matching defaults. If you previously added simulation values, delete those rows before switching modes. A deliberately selected override is validated, never silently replaced.

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

The existing workflow **does not run SQL migrations**. It verifies the manually installed schema's receipt, adds missing default settings/plans/help/demo accounts, checks the restricted login, and publishes the site. It preserves existing seeded settings. No separate seed button is needed. A missing or changed schema stops deployment and requires a reviewed manual SQL installation first. A green **checks** job alone does not mean deployment happened.

Do not approve preview runs before configuring preview credentials. To stop future deployments, set `ENABLE_VERCEL_DEPLOYMENTS` to `false`. [Run workflow instructions](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow).

## 9. Check the site

1. Open `https://YOUR-DOMAIN/api/health`. Confirm it is healthy. A `503` means the app is not ready.
2. Open the homepage. Check plans and English/French switching.
3. Use the simulation account chooser to select `member_01`. Complete consent and check the 5,000 GIV starter balance. GIV has no cash value.
4. Complete a simulated gift. Check the cycle, balance, history and notification. Refresh and confirm they persist.
5. Select `sim_admin` through the simulation controls. Complete any consent/two-factor prompts and inspect admin screens. Treat this as a demo: simulated identity is not a secure production login.
6. Check Vercel **Logs**, then Supabase and Upstash usage screens before inviting testers.

Health passing does not prove financial readiness. All three named bug rounds are merged. Phase Two release evidence is tracked separately. See [PROJECT-STATUS_v56.md](PROJECT-STATUS_v56.md).

## 10. Preview using the same projects and database

1. Open your existing Vercel project → **Settings → Environment Variables**. Edit each shared setting from step 6 and select **Preview** as well as **Production**. Keep the same database URL, Upstash values and app keys. Do not create another project.
2. Keep `APP_ENV` identical in both scopes: first `simulation`, later `testnet`. One row can apply to both scopes. Preview is chosen by the hosting workflow, not this variable.
3. In GitHub → **Settings → Environments → preview**, add the five secrets from step 7 using the **same values** as `production`. Protect it with reviewer approval where supported. These are duplicate settings, not new service accounts.
4. In GitHub → **Code**, open the branch selector → **View all branches → New branch**. Name it `preview` and create it from the current `main`. If it already exists, ensure it contains this release before using the shared database.
5. Add `WEB_ORIGIN` separately for **Preview**, using the exact HTTPS branch alias from Vercel. To discover the alias the first time, deploy with the existing production origin temporarily, open Vercel **Deployments → the preview deployment → Domains**, copy its branch URL, then immediately update Preview `WEB_ORIGIN` and redeploy. Do not sign in on that first deployment.
6. In GitHub → **Actions → ci-vercel → Run workflow**, choose `preview`. Approve only **preview** when prompted. Wait for checks and deployment to pass.
7. Open the branch alias, then `/api/health`. Confirm `deployment: preview` and the expected payment `environment`. The main domain should still report `deployment: production` with the same payment mode.
8. If using Google, add the exact preview callback from step 11. If using Turnstile, add the preview hostname to its existing widget. Use a stable preview branch for login testing; every extra branch origin needs its own matching settings.
9. Review trusted changes on the preview URL. Merge the approved PR in GitHub to publish through `main`. A deployment queue prevents simultaneous hosted initialization, but it does **not** isolate preview data.

Do not approve older/untrusted preview code against this shared database. Feature work needing destructive schema changes or independent data must wait or use a genuinely isolated workspace; do not create extra free accounts just to bypass a provider's limits. [Preview variables](https://vercel.com/docs/environment-variables) · [Generated branch URLs](https://vercel.com/docs/deployments/generated-urls) · [Official branch association reference](https://vercel.com/docs/cli/deploy#associate-a-cli-deployment-with-a-git-branch).

## 11. Optional domain and Google login

**Custom domain**

1. Open Vercel **Settings → Domains → Add Domain**. Enter a domain you own.
2. Open your registrar's DNS screen. Add the exact records Vercel displays. Wait for verification.
3. Update `WEB_ORIGIN` to the new HTTPS origin and any Google callback. Repeat step 8 to publish.

**Prepare Google sign-in for testnet**

1. Open [Google Cloud Console](https://console.cloud.google.com). Select or create a project.
2. Open **Google Auth platform → Get started** if prompted. Complete **Branding**, choose your **Audience**, and add your email as a test user while the app is in testing.
3. Open **Clients → Create client → Web application**. Enter a name.
4. Add `https://YOUR-DOMAIN/api/v1/auth/google/callback` under **Authorized redirect URIs**. Click **Create**.
5. Save its client ID and secret privately. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Vercel for Production and Preview. Leave the provider selectors unset.
6. Continue with step 12 before signing in with Google. After promotion, `APP_ENV=testnet` selects Google automatically. A Google-created account is not automatically an admin. Do not introduce real Google identities while any shared deployment still offers demo login.

[Google client setup](https://developers.google.com/workspace/guides/create-credentials) · [Callback requirements](https://developers.google.com/identity/protocols/oauth2/web-server). This does not enable testnet payments or real sending.

## 12. Move the existing database/site to testnet

This prepares a testnet website and its credentials. **Outgoing transfers and normal financial activation remain blocked by the existing readiness gates.** Changing `APP_ENV` does not bypass them.

### A. Prepare identity and retire old demo deployments

1. Finish the simulation checks. Keep a verified backup through the supervised recovery process before promotion; there is no full browser-only app restore button.
2. Complete Google setup in step 11. In **Google Auth platform → Clients → your web client**, register both main-site and preview callback URLs. Add test users under **Audience** while the client is in testing.
3. In Vercel → **Settings → Environment Variables**, add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to **Production and Preview**. The same Google client can list both callbacks.
4. In GitHub → **Settings → Secrets and variables → Actions → Variables**, set `ENABLE_VERCEL_DEPLOYMENTS`, `ENABLE_SCHEDULER` and `ENABLE_FINANCIAL_SCHEDULER` to `false` while preparing the change. Leave signing off. In **Actions**, cancel any queued/running deployment or scheduler runs from older code before rotating credentials.
5. Ensure `main` and the trusted `preview` branch contain this release's shared-database safeguard. Remove obsolete preview deployments in Vercel **Deployments → deployment menu → Delete** where available. Never approve a rollback to old demo code after promotion.
6. Retire the old runtime credentials before testnet identities are created. Generate a new 32-character letters/numbers runtime password. In Supabase **SQL Editor → New query**, privately replace the placeholder and run:

```sql
alter role gw_runtime password 'REPLACE_WITH_NEW_RUNTIME_PASSWORD';
```

7. Delete that password-bearing query. In a **separate new query**, run this to disconnect old app sessions; active requests may fail and uncommitted work rolls back:

```sql
select pg_terminate_backend(pid)
from pg_stat_activity
where usename = 'gw_runtime' and pid <> pg_backend_pid();
```

8. Update the password in `DATABASE_URL` in Vercel **Production and Preview**, and in both GitHub environments. Keep the same host, project reference and database name. Do not give old deployments the new password. Owner credentials and the database itself stay unchanged.
9. Delete old provider-selector rows listed in step 6. Change the shared `APP_ENV` row to **testnet** for Production and Preview. Keep `MAINNET_ENABLED=false`.

After hosted initialization commits the testnet namespace, current simulation runtimes refuse access, even if someone changes their variable back. Rotation above also retires pre-safeguard code. This is a **one-way promotion**, not simultaneous isolated simulation/testnet databases.

### B. Add bot protection

1. Go to [Cloudflare dashboard](https://dash.cloudflare.com). Use an existing account or sign up once if you do not have one.
2. Open **Turnstile → Add widget**. Name it `Gifters World`.
3. Add the main and preview **hostnames**, without `https://` or paths. Choose **Managed**, then **Create**.
4. Copy its site key and secret. In Vercel, add `CAPTCHA_SITE_KEY` and `CAPTCHA_SECRET_KEY` to Production and Preview. Do not prefix either with `NEXT_PUBLIC_`; the app serves the site key through its safe response.
5. Keep the widget's allowed hostnames aligned when a domain changes. [Current widget steps](https://developers.cloudflare.com/turnstile/get-started/widget-management/dashboard/).

### C. Deploy and verify the testnet website

1. In GitHub, set `ENABLE_VERCEL_DEPLOYMENTS=true`.
2. Open **Actions → ci-vercel → Run workflow → main**. Approve production and wait for success. The workflow verifies your installed SQL and registers testnet metadata; it does not recreate the database.
3. Run the same workflow for the trusted `preview` branch and approve preview. Old simulation sites should no longer work with the retired password.
4. Open each site's `/api/health`. Confirm `environment: testnet`, `mainnet: false` and `signer: disabled`.
5. Sign in with your configured Google test account, complete consent, and verify the demo account chooser is absent. No GIV starter grant should be issued for this testnet signup.
6. Google-created members do not automatically become staff. Complete the first-administrator steps below before asset setup.

**Create the first verified Google administrator — owner only**

1. On the testnet site, sign in with **your own Google account**, complete consent, then open **Account security → Set up authenticator**. Verify a code and save the recovery codes privately.
2. In Supabase **SQL Editor → New query**, run this read-only lookup. Find your own email/username and copy its `id`:

```sql
select u.id, u.username, u.email, coalesce(f.active, false) as two_factor_ready
from public.users u
join public.user_identities i on i.user_id = u.id and i.provider = 'google'
left join public.auth_factors f on f.user_id = u.id
where u.status = 'active';
```

3. Open a new query. Replace `REPLACE_WITH_YOUR_USER_UUID` below with **only your own copied ID** and run the whole block. It requires an active Google member with verified two-factor setup, no existing Google administrator, and no previous first-admin grant. It records a permanent key and audit together; it does not reset a factor or promote the old demo admin.

```sql
begin;
select pg_advisory_xact_lock(hashtextextended('last-administrator-recovery', 0));
with promoted as (
  update public.users u
  set role = 'admin', session_version = u.session_version + 1
  where u.id = 'REPLACE_WITH_YOUR_USER_UUID'::uuid
    and u.role = 'member' and u.status = 'active'
    and exists (select 1 from public.user_identities i
                where i.user_id = u.id and i.provider = 'google')
    and exists (select 1 from public.auth_factors f
                where f.user_id = u.id and f.active)
    and not exists (select 1 from public.users a
                    join public.user_identities i on i.user_id = a.id
                    where a.role = 'admin' and i.provider = 'google')
    and not exists (select 1 from public.operation_keys
                    where business_key = 'owner:first-google-admin')
  returning u.id
), recorded as (
  insert into public.operation_keys(business_key, request_hash, result)
  select 'owner:first-google-admin',
         encode(sha256(convert_to(id::text, 'UTF8')), 'hex'),
         jsonb_build_object('user_id', id, 'role', 'admin')
  from promoted
  returning business_key
)
insert into public.audit_events(action, target_type, target_id, reason,
                               before_state, after_state)
select 'owner.first_google_admin', 'user', p.id::text,
       'Owner initialized the first verified Google administrator in SQL Editor',
       '{"role":"member"}'::jsonb, '{"role":"admin"}'::jsonb
from promoted p cross join recorded
returning target_id;
commit;
```

4. In a new query, confirm the recorded `target_id` matches your own copied ID:

```sql
select target_id from public.audit_events
where action = 'owner.first_google_admin'
order by created_at desc limit 1;
```

5. Sign out, sign back in with Google and verify the authenticator prompt; then open **Admin**. If no matching record exists, do not weaken the conditions: check the account/2FA or use the existing administrator. Later recovery uses the supervised recovery process, not this one-time initializer.

### D. Prepare one test network, using browser settings

Start with **Solana devnet** to avoid needing a test token contract. Solana's separate network named “testnet” is for validator testing; the app uses **devnet** for application testing.

1. Open your wallet's network settings and choose **Solana Devnet**. Create a dedicated test treasury wallet; retain its recovery phrase privately, outside GitHub/Vercel. Never use a mainnet treasury seed for this step.
2. Request free devnet SOL using a web faucet linked from [Solana's faucet guide](https://solana.com/developers/cookbook/development/airdrops-and-faucets). Check the balance on [Solana Explorer](https://explorer.solana.com/?cluster=devnet).
3. Open your existing RPC provider's dashboard and select/create a **Solana Devnet** endpoint if its plan supports it. Copy its HTTPS endpoint privately. Supply a second independent approved devnet endpoint; two copies of one URL are not independent providers. If the free plan cannot supply the required evidence, keep the asset disabled; do not create throwaway accounts.
4. In Vercel Production/Preview, add `RPC_PRIMARY_SOL_TESTNET` and `RPC_SECONDARY_SOL_TESTNET` with those URLs. Add `OUTBOUND_ALLOWED_HOSTS` with the reviewed RPC hostnames as a comma-separated list, without schemes, paths or credentials. Add the reviewed alert receiver hostname later if used.
5. Add these server-only address settings using the intended public devnet receiving/beneficiary addresses, never private keys:

| Name | Address to enter |
|---|---|
| `PLATFORM_RECEIVING_ADDRESS_SOL_TESTNET` | Dedicated incoming treasury |
| `PLATFORM_DEV_ADDRESS_SOL_TESTNET` | Reviewed developer destination |
| `PLATFORM_MARKETING_ADDRESS_SOL_TESTNET` | Reviewed marketing destination |
| `PLATFORM_BOOTSTRAP_ADDRESS_SOL_TESTNET` | Reviewed platform/bootstrap destination |
| `PLATFORM_SWEEP_ADDRESS_SOL_TESTNET` | Reviewed company sweep destination |

6. Add `ASSET_REGISTRY_JSON` to Vercel Production/Preview. Paste the JSON below, replacing the date with the time you actually checked the official network details. Leave `ASSET_REGISTRY_FILE` unset. This contains no credentials or treasury addresses:

```json
[{"key":"sol","chain":"sol","environment":"testnet","network":"devnet","kind":"native","decimals":9,"enabled":true,"verified":true,"source":"https://solana.com/docs/references/clusters","verifiedAt":"REPLACE_WITH_VERIFICATION_TIME_UTC","explorer":"https://explorer.solana.com","finality":{"mode":"finalized"},"dust":"0"}]
```

Use the UTC format `YYYY-MM-DDTHH:MM:SSZ`. `verified=true` records a real network review, not permission to send. This registry entry does not itself create or activate the database asset.

7. Redeploy `main` and `preview`. Have the verified administrator open **Admin → Testnet administration**, select **sol**, enter a reason, and use **Stage disabled** when those controls are available. Do not select enable/activate to bypass the readiness pause. RPC/balance access is still required for staging.
8. Prepare the reviewed signed-price verification key, actual fee/gas limits and HTTPS alert receiver through the owner/maintainer. These are financial activation inputs, not values the guide can invent. There is no current browser-only key-signing/custody setup wizard.
9. **Stop before payment activation.** The unfinished financial release checks and hosted acceptance must be resolved before normal testnet sending can be accepted. Record the workspace as configured, not “payments working.”

Other supported test-network registry values: Ethereum Sepolia `11155111`, BNB testnet `97`, and reviewed TRON `nile`/`shasta`. Token assets additionally need independently verified contract/mint and decimals; do not copy a mainnet token address into a test registry. [Official Solana network details](https://solana.com/docs/references/clusters).

## 13. Prepare real-money production on the same accounts

**Mainnet launch is not available in this release.** `APP_ENV=mainnet`, `APP_ENV=production` and `MAINNET_ENABLED=true` are rejected. Vercel's Production label only means “main website.” The steps below prepare existing resources; they are not a working mainnet activation procedure.

1. Keep the existing Supabase, Upstash, Google and Vercel accounts. Do not create a second set just because the site will use real money.
2. In the existing Vercel project, open **Settings → Domains** and attach the real domain using step 11. Update Production `WEB_ORIGIN`, Google's production callback and Turnstile hostname.
3. Review the existing account's hosting plan. Vercel Hobby is personal/non-commercial; choose a compliant plan on the **same account** before operating this commercial service. Free database/cache quotas are shared by every deployment, not multiplied by changing mode.
4. Keep the current main domain on simulation or testnet with signing disabled while implementation finishes. Do not tell users to send real assets to it.
5. Have the maintainer complete: supported mainnet registry/adapters, isolated custody/signing, funding/fees, external alert evidence and verified backup/restore. These are existing release requirements, not checkboxes that environment variables can replace.
6. Before reusing this database for real funds, require a reviewed implementation that isolates mainnet financial records and disables demo/preview financial writes. Retain all GIV/testnet history in its original environment; never convert its balances, queues or receipts to real money.
7. Keep previews on reviewed code with a restricted non-sending access path before they can see a real-money database. Current shared previews are suitable for simulation/testnet development, **not an implemented mainnet isolation contract**. A safe future design can still use the same provider accounts/project.
8. After that release is implemented and verified, the maintainer must update this section with exact supported mainnet settings and rollout steps. Until then, keep deployments and financial activation at their supported simulation/testnet settings. There is no honest “flip one variable and go live” step today.

[Vercel Hobby terms](https://vercel.com/docs/plans/hobby). The resource-reuse preference is recorded in PRD: prefer existing accounts/projects and one payment-mode selector; introduce extra infrastructure only for a demonstrated requirement.

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
| `DATABASE_PROMOTED_TO_TESTNET` | Set both hosting stages to testnet. Do not remove the testnet namespace marker or reset retained data to restore demo access. |
| `REGISTRY_SOURCE_CONFLICT` | Keep only `ASSET_REGISTRY_JSON` for hosted setup; remove `ASSET_REGISTRY_FILE`. |
| Schema fingerprint/history mismatch | Keep the error. Do not edit receipts, delete migration history or overwrite the database. |
| Google `redirect_uri_mismatch` | Match the exact HTTPS origin and callback path in Google and Vercel, then publish updated settings. |
| Site shows old settings | Save in the correct Vercel environment, then repeat step 8. |

## Limits and later operations

- **Costs:** review current plans before creating resources. Vercel Hobby is for personal, non-commercial use; commercial hosting needs a suitable plan. Free quotas do not prove large-user capacity. Domain, gas and backup costs are separate.
- **Mode changes:** Preview/Production can share one supported payment mode and database. Testnet promotion retires simulation access; real-money promotion still requires the implementation described above.
- **Background work:** deployment does not activate all workers. Non-signing scheduler workflows need separate URL/key settings. Do not enable workers or signing just to remove a warning.
- **Backups:** keep the MFA key separately. Vercel has no complete web-only application archive/restore flow; full encrypted recovery requires supervised operator tooling. Supabase backups do not replace the app's signed archive checks. Never restore onto an occupied project.
- **Later schema changes:** preserve the installed baseline. Add a reviewed forward migration for later changes. Old 99-file archives require their matching historical release, not this fresh installer.

**Documentation rule:** keep five core guides plus the two owner-requested bug trackers. Fold notes into them unless a new file is explicitly requested or essential. Use beginner language, exact clicks/values, web UIs and manual SQL installation. Keep old versions in Git history.


## Choose the transparent profile

1. Finish the SQL installation above and deploy the matching release. Keep `APP_ENV=simulation` or `testnet`; this profile does not enable mainnet.
2. Sign in as an administrator. Complete the current MFA prompt.
3. Open **Admin → Release profiles**. Choose **Transparent**.
4. Choose platform positions: **Labelled** shows them clearly; **Disabled** stops new allocations to waiting platform positions. Existing credits remain.
5. Choose priority: **Disclosed** shows the exception; **Disabled** restores normal admission order for waiting positions. Joining numbers remain unchanged.
6. Choose activity: **Verified** uses consenting real members only, **Labelled demo** shows marked examples in simulation/testnet, or **Disabled** hides it. Verified activity and real-payment totals are empty in simulation/testnet.
7. Review the English/French screens, queue impact and any totals. Select **Stage**, then **Commit** before the preview expires. If anything changed, refresh and stage again.
8. Members accept materially changed terms before another gift. Payments submitted before the switch retain their original rights. Members can enable or withdraw optional publication under account settings.
9. Keep the readiness record **Not reviewed** until supporting evidence exists. A profile change never approves real-money operation.

Archives created before SQL004 need the matching earlier release to restore. Keep original archives, keys and release references; do not alter checksums or signed inventories.

## Final testing: details to prepare

Provide these during final setup; coding can continue before they are available. Never send private keys, passwords or recovery phrases in chat.

1. Choose launch countries and obtain the required business/legal review. Approve user terms, funding sources, refunds, closure handling and loss disclosures.
2. Set an operating/gas budget and choose the existing hosting/custody accounts to use. Confirm the hosting plan permits the intended commercial use.
3. For each enabled asset, record its exact network, verified contract/mint, decimals, provenance and two independent RPC providers. Supply JAGA's reviewed BNB contract if JAGA is included. Leave unverified assets disabled.
4. Prepare dedicated treasury/gas and settlement addresses, per-transaction/daily limits, fee reserves and an HTTPS alert receiver. Keep custody/decryption material only in the separate signer host's protected settings.
5. Put database, OAuth, CAPTCHA, archive and worker credentials in the protected provider settings identified above. Preview must receive restricted access before the shared database holds real funds.
6. During final testing, verify actual OAuth/MFA, wallet approvals, every enabled asset's payments/refunds/recovery, received alerts and a fresh empty-target restore. Save the actual evidence; local fixtures cannot substitute for it.
7. Complete the PRD's14-day beta and14-day initial-cap observation periods. Mainnet implementation remains in progress; this checklist does not activate it.

## Account checks after deployment

1. Sign in and open **Account**. Save English/French and your time zone; dates should use that zone. The default is Africa/Lagos.
2. When consent requests a birth date, enter the full date. The server checks the required age and retains the verification time, not the birth date.
3. In native plan administration, choose USD-derived pricing or enter the exact token amount. Use **Resume the existing price unchanged** to preserve a paused plan's existing amount.

New backups use recovery inventory contract4. Keep original archives, keys and release references. Contract3 archives require release `6c323dc43c45efa1957308e467ce06e7cc0b36c0`; do not edit or re-sign them.
