# Set up Gifters World in your browser

Follow these steps in order. You need no terminal or local installation. Start with a **simulation site using GIV**, then follow the preview/testnet sections. Mainnet configuration for controlled real-money testing is in section13. Public launch still requires the final checks. Keep passwords and tokens in a password manager.

Menu names checked against official platform documentation on **17 October 2026**. Your account's plan may change which options appear.

**Already used Google login with this database?** Do not apply the demo settings or create a shared demo preview. Keep your existing credentials and follow step 12 to promote the database to testnet first; then add the preview in testnet mode. The shared simulation walkthrough is for demo identities, not real Google-user data.

## One account and one shared database

Use **one Supabase project/database, one Upstash database and one Vercel project**. Keep the database name supplied by Supabase, usually `postgres`. Names such as `gifters-simulation` below are labels, not a requirement to create another instance for every mode.

| Setting | Meaning | What you change |
|---|---|---|
| `APP_ENV=simulation` | GIV and demo identities | Starting mode |
| `APP_ENV=testnet` | Test networks and Google identity | One payment-mode switch, after adding the required credentials once |
| Vercel **Preview** | A build for reviewing a branch | Selected by the workflow; never put `preview` in `APP_ENV` |
| Vercel **Production** | The main site/domain | Selected by the workflow; does not mean mainnet payments |
| `APP_ENV=mainnet` | Actual assets and custody | Follow section13; protected approvals and a separate signer are required |

**Shared database, restricted preview:** the main site can write; the read-only preview uses a separate login for public configuration/catalogue/help. It cannot sign in or change records. After testnet initialization, simulation writes/seed/reset are retired. Keep the preview payment mode aligned with the main site. Existing GIV records are retained, never converted to test tokens.

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

1. In GitHub, open [fresh-install.sql](https://github.com/nero1/onyiy/blob/main/packages/db/fresh-install.sql).
2. Click **Raw**. Copy the **entire file**, including its first and last lines.
3. In your Supabase project, click **SQL Editor → New query**.
4. Use the owner role, normally **postgres**. Paste the SQL unchanged.
5. Click **Run**. Check the selected project before confirming a database-change warning.
6. After success, open a new query and run:

```sql
select name from public.schema_migrations order by name;
```

7. Confirm seven receipts appear, from `000_initial_schema.sql` through `006_public_queue_disclosure.sql`. These identify the installed schema version; **do not run those files separately**.

This one file creates the final tables, views, functions, indexes and security rules directly. It does not replay the old upgrades. Step 8 adds the remaining default settings/plans/accounts. Existing databases keep their original receipts and use reviewed upgrades; never run this fresh installer over existing tables. Deployment checks the schema and does not apply SQL automatically.

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
9. In Vercel, open **Settings → Environment Variables → Add Environment Variable**. Add every row below to **Production**. Step10 adds a separate restricted Preview login and public settings. Enter values without extra quotes.

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

7. Create another environment named `preview` and protect it too. Leave its secrets empty until you prepare the restricted preview login in step10.

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

Health passing does not prove financial readiness. All three named bug rounds are merged. Phase Two release evidence is tracked separately. See [PROJECT-STATUS_v112.md](PROJECT-STATUS_v112.md).

## 10. Read-only preview using the same database

Use the same Supabase project, database name and Vercel project. A separate **database login** limits preview to public content; it does not create another database or paid instance. Sign-in, private records, jobs and payments are unavailable on this preview.

1. In your password manager, generate a separate password of at least32 letters/numbers. Save it as **Gifters preview password**.
2. Open Supabase **SQL Editor → New query**. Replace the password placeholder privately, then run:

```sql
create role gw_preview_runtime login noinherit nosuperuser nocreatedb
  nocreaterole noreplication nobypassrls password 'REPLACE_WITH_PREVIEW_PASSWORD';
grant gw_preview to gw_preview_runtime;
grant connect on database postgres to gw_preview_runtime;
```

3. Delete the saved password-bearing query. In **Connect → Transaction pooler**, copy the URI. Keep the same project, host, port and database name. Change its username to `gw_preview_runtime.PROJECT_REF` and use the **preview** password. Save this as **Preview DATABASE_URL**.
4. In Vercel **Settings → Environment Variables**, edit account, Redis, signing, scheduler, export and owner credentials so they apply to **Production only**. In particular, Preview must have no `AUTH_ACCESS_KEY`, `MFA_ENCRYPTION_KEY`, `GOOGLE_CLIENT_SECRET`, `DATABASE_MIGRATION_URL`, signer keys, worker keys (including `PRICE_FEED_AUTH_KEY`), `UPSTASH_REDIS_REST_TOKEN`, `REDIS_URL` or `SUPABASE_SERVICE_ROLE_KEY`. Keep their Production values.
5. Add these values for **Preview only**:

| Name | Value |
|---|---|
| `PUBLIC_PREVIEW_MODE` | `read_only` |
| `APP_ENV` | Same as the main site's payment mode: `simulation`, `testnet` or, after production setup, `mainnet` |
| `DATABASE_URL` | Preview URI from step3 |
| `DB_PROVIDER` | `supabase` |
| `MAINNET_ENABLED` | `false` |
| `SIGNER_PROVIDER` | `disabled` |
| `WEB_ORIGIN` | Exact HTTPS preview branch alias |

6. Leave `PUBLIC_PREVIEW_MODE` unset or `off` in **Production**. Preview uses bounded memory caching; it needs no extra Upstash database or authentication/RPC credentials.
7. Open GitHub **Settings → Environments → preview**. Add `VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` with the existing project's values. Add `DATABASE_URL` with the **preview** URI. Remove any preview `DATABASE_MIGRATION_URL` secret.
8. In that environment's **Environment variables**, click **Add variable**. Name it `PUBLIC_PREVIEW_MODE` and enter `read_only`. Protect the environment with reviewer approval where supported.
9. In GitHub's branch selector, create/update `preview` from the current `main`. Open **Actions → ci-vercel → Run workflow**, select `preview` and approve only that environment when prompted. Its verification uses the restricted login; it does not seed or use an owner connection.
10. If you do not know the branch alias yet, use the main HTTPS origin temporarily for `WEB_ORIGIN`. After deployment, open Vercel **Deployments → your preview → Domains**, copy the branch alias, update Preview `WEB_ORIGIN` and redeploy.
11. Open the preview URL. Confirm the read-only banner, English/French catalogue and help. Open `/api/health`: expect `deployment: preview`, the selected `environment`, `read_only: true` and `signer: disabled`.
12. Check `/wallet`, `/admin` and `/api/v1/auth/session` are unavailable. The main site should still work normally. Merge reviewed changes through the checked PR workflow.

**Previously shared the full runtime login with Preview?** In Vercel **Deployments**, delete those old preview deployments. In Supabase SQL Editor, rotate the `gw_runtime` password privately (`alter role gw_runtime password 'NEW_RUNTIME_PASSWORD';`), update its URL in Vercel Production and GitHub’s `production` environment, then redeploy `main`. Keep the new preview login/password separate; changing variable scopes alone does not revoke old deployments.

This preview reads the same published configuration/catalogue as the main database and cannot edit it. Use the main testnet site for sign-in and payment testing. Mainnet payment activation remains subject to the production checklist. Do not deploy untrusted code with shared credentials.

[Official Vercel variables guide](https://vercel.com/docs/environment-variables/managing-environment-variables) · [GitHub environment variables](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-variables).

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
5. Save its client ID and secret privately. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Vercel for **Production only**. Leave the provider selectors unset.
6. Continue with step 12 before signing in with Google. After promotion, `APP_ENV=testnet` selects Google automatically. A Google-created account is not automatically an admin. Do not introduce real Google identities while any shared deployment still offers demo login.

[Google client setup](https://developers.google.com/workspace/guides/create-credentials) · [Callback requirements](https://developers.google.com/identity/protocols/oauth2/web-server). This does not enable testnet payments or real sending.

## 12. Move the existing database/site to testnet

This prepares a testnet website and its credentials. **Outgoing transfers and normal financial activation remain blocked by the existing readiness gates.** Changing `APP_ENV` does not bypass them.

### A. Prepare identity and retire old demo deployments

1. Finish the simulation checks. Keep a verified backup through the supervised recovery process before promotion; there is no full browser-only app restore button.
2. Complete Google setup in step 11. In **Google Auth platform → Clients → your web client**, register the main-site callback URL. The read-only preview has no sign-in. Add test users under **Audience** while the client is in testing.
3. In Vercel → **Settings → Environment Variables**, add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to **Production only**.
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

8. Update the runtime password in Vercel **Production** and GitHub’s `production` environment. The restricted preview keeps its separate login/password from step10. Keep the same host, project reference and database name. Do not give old deployments the new password. Owner credentials and the database itself stay unchanged.
9. Delete old provider-selector rows listed in step 6. Change the shared `APP_ENV` row to **testnet** for Production and Preview. Keep `MAINNET_ENABLED=false`.

After hosted initialization commits the testnet namespace, current simulation runtimes refuse access, even if someone changes their variable back. Rotation above also retires pre-safeguard code. This is a **one-way promotion**, not simultaneous isolated simulation/testnet databases.

### B. Add bot protection

1. Go to [Cloudflare dashboard](https://dash.cloudflare.com). Use an existing account or sign up once if you do not have one.
2. Open **Turnstile → Add widget**. Name it `Gifters World`.
3. Add the main-site **hostname**, without `https://` or a path. Choose **Managed**, then **Create**.
4. Copy its site key and secret. In Vercel, add `CAPTCHA_SITE_KEY` and `CAPTCHA_SECRET_KEY` to **Production only**. Do not prefix either with `NEXT_PUBLIC_`; the app serves the site key through its safe response.
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
4. In Vercel **Production**, add `RPC_PRIMARY_SOL_TESTNET` and `RPC_SECONDARY_SOL_TESTNET` with those URLs. Add `OUTBOUND_ALLOWED_HOSTS` with the reviewed RPC hostnames as a comma-separated list, without schemes, paths or credentials. Add the reviewed alert receiver hostname later if used.
5. Add these server-only address settings using the intended public devnet receiving/beneficiary addresses, never private keys:

| Name | Address to enter |
|---|---|
| `PLATFORM_RECEIVING_ADDRESS_SOL_TESTNET` | Dedicated incoming treasury |
| `PLATFORM_DEV_ADDRESS_SOL_TESTNET` | Reviewed developer destination |
| `PLATFORM_MARKETING_ADDRESS_SOL_TESTNET` | Reviewed marketing destination |
| `PLATFORM_BOOTSTRAP_ADDRESS_SOL_TESTNET` | Reviewed platform/bootstrap destination |
| `PLATFORM_SWEEP_ADDRESS_SOL_TESTNET` | Reviewed company sweep destination |

6. Add `ASSET_REGISTRY_JSON` to Vercel **Production**. Paste the JSON below, replacing the date with the time you actually checked the official network details. Leave `ASSET_REGISTRY_FILE` unset. This contains no credentials or treasury addresses:

```json
[{"key":"sol","chain":"sol","environment":"testnet","network":"devnet","kind":"native","decimals":9,"enabled":true,"verified":true,"source":"https://solana.com/docs/references/clusters","verifiedAt":"REPLACE_WITH_VERIFICATION_TIME_UTC","explorer":"https://explorer.solana.com","finality":{"mode":"finalized"},"dust":"0"}]
```

Use the UTC format `YYYY-MM-DDTHH:MM:SSZ`. `verified=true` records a real network review, not permission to send. This registry entry does not itself create or activate the database asset.

7. Redeploy `main` and `preview`. Have the verified administrator open **Admin → Testnet administration**, select **sol**, enter a reason, and use **Stage disabled** when those controls are available. Do not select enable/activate to bypass the readiness pause. RPC/balance access is still required for staging.
8. Prepare the pricing key using **Configure prices and manual fallback** below, plus reviewed fee/gas limits and an HTTPS alert receiver. These are financial activation inputs, not values the guide can invent. For new encrypted keys, use the browser custody-preparation steps below. Follow the custody, isolated-signer and background-job steps below; actual hosted acceptance remains required.
9. Complete the provider, readiness, custody and signer checks below before controlled testnet sending. Record actual results; configuration alone does not prove payments work.

Other supported test-network registry values: Ethereum Sepolia `11155111`, BNB testnet `97`, and reviewed TRON `nile`/`shasta`. Token assets additionally need independently verified contract/mint and decimals; do not copy a mainnet token address into a test registry. [Official Solana network details](https://solana.com/docs/references/clusters).

## 13. Configure real-money mainnet on the same accounts

Code supports Ethereum `1`, BNB `56`, Solana `mainnet-beta` and TRON `mainnet`. Tokens remain disabled until their exact contracts/mints and provenance are verified. These steps configure **controlled final testing**; finish the final-testing checklist before public launch.

### Prepare the existing site

1. Keep your existing Supabase, Upstash, Google, GitHub and Vercel accounts. Keep Supabase's database name. Mainnet initialization retires testnet writes on this database; old balances/history remain in their original environment.
2. In Vercel, open **Settings → Domains**. Attach the real domain using section11. Update Production `WEB_ORIGIN`, Google's callback and the Turnstile hostname.
3. Check the existing hosting plan. Vercel Hobby is personal/non-commercial; choose a commercially permitted plan on the same account before operating this service. Database/cache quotas remain shared.
4. While still in testnet, sign in as admin and complete MFA. Open **Admin → Release profiles**, choose **Transparent**, then **Stage → Commit**. Choose **Verified** or **Disabled** activity; never labelled demo on mainnet.
5. In the admin configuration editor, set `feature_simulation` to `false`. Review the actual English/French terms, fee rules, receiving/business addresses and small initial limits. Save an encrypted backup before promotion; preserve all old archives and custody keys.
6. Complete the countries, terms, funding/refund/closure, custody and budget review in **Final testing** below. Record its real evidence IDs under **Release profiles → Financial readiness**. Select **Approved** only after that review exists.
7. Set the admin configuration value `mainnet_enabled` to `true`. This database setting alone cannot send money.

### Set Production values in Vercel

8. Open **Settings → Environment Variables**. Select **Production** and set:

| Name | Value |
|---|---|
| `APP_ENV` | `mainnet` |
| `MAINNET_ENABLED` | `true` |
| `DEPLOYMENT_PROFILE` | `transparent` |
| `SIGNER_PROVIDER` | `disabled` — private keys stay outside the website |
| `CAPTCHA_PROVIDER` | `turnstile`, with your existing site/secret keys |
| `ASSET_REGISTRY_JSON` | Reviewed mainnet entries; keep unverified assets disabled |
| `FINANCIAL_ACTIVATION` | `mainnet-reviewed` |
| `ALERT_WEBHOOK_URL`, `ALERT_WEBHOOK_KEY` | Your HTTPS alert receiver and its protected acknowledgement key |
| `OUTBOUND_ALLOWED_HOSTS` | Comma-separated hostnames of the chosen RPC and alert services |

9. Keep the existing database/cache, Google, MFA and application-authentication settings. Remove simulation-tool credentials. Never put signer files, the signer database login or decryption/payload keys in Vercel. Preview keeps its separate restricted login and `MAINNET_ENABLED=false`.
10. Add two independent HTTPS RPC endpoints for each enabled network. Replace `SUFFIX` below with `ETH_MAINNET`, `BNB_MAINNET`, `SOL_MAINNET` or `TRON_MAINNET`: `RPC_PRIMARY_SUFFIX` and `RPC_SECONDARY_SUFFIX`. Example: `RPC_PRIMARY_BNB_MAINNET`.
11. Add `PLATFORM_RECEIVING_ADDRESS_SUFFIX` from the matching custody inventory below. Add the approved `PLATFORM_DEV_ADDRESS_SUFFIX`, `PLATFORM_MARKETING_ADDRESS_SUFFIX`, `PLATFORM_BOOTSTRAP_ADDRESS_SUFFIX` and `PLATFORM_SWEEP_ADDRESS_SUFFIX` where used. Other destinations must differ from receiving. Copy identical values to the signer environment.
12. Redeploy through the existing GitHub Production deployment workflow. It verifies your manually pasted SQL and initializes the selected namespace; it does not apply migrations. If promotion fails, inspect the failed check; do not erase history or change checksums.

### Approve each network and connect the signer

13. Prepare custody using **Prepare new encrypted custody keys** below, then configure **Run the isolated signer**. Do not replace an existing funded treasury with new keys.
14. On the site, open native payment administration. Provision each reviewed asset; TRX is an operating/gas asset, not a member gift currency. Leave JAGA disabled unless its exact BNB contract is verified. Add current signed prices; keep plans disabled until the approvals below are in place.
15. In the existing GitHub `production` environment, set `APP_ENV=mainnet` and the current `FINANCIAL_API_ORIGIN`. Run the non-signing financial scheduler using **Background jobs** below so queued deliveries can reach the receiver. Use **Check alert channel** in native payment administration for each enabled network. Confirm that the real receiver accepts the signed delivery and returns a valid acknowledgement. Keep the probe open for reminders/renewal; an old acknowledgement expires after24 hours.
16. Copy every distinct returned configuration hash. In Vercel Production and the matching GitHub signer environment, set both `FINANCIAL_CONFIG_APPROVALS_JSON` and `ALERT_ACCEPTANCE_FINGERPRINTS_JSON` to the reviewed list, for example `["FIRST_64_CHARACTER_HASH","SECOND_64_CHARACTER_HASH"]`. Use real returned hashes. Remove the older singular approval/fingerprint variables when using these lists.
17. Redeploy Production, then run the isolated signer workflow once. Check its run result and the site's signer heartbeat. A changed policy, registry, address or alert binding needs new hashes/probes; never reuse an unrelated approval.
18. With the owner present, fund only the approved treasury/reserve amounts, activate the intended per-currency plans and perform the final tests with small limits. Confirm actual wallet approval, chain receipts, balances, fees, refunds, alerts and restore reconciliation. Complete the required observation periods before public launch.

Official references: [Vercel Hobby terms](https://vercel.com/docs/plans/hobby), [GitHub environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments). Current remaining acceptance work is in [status](PROJECT-STATUS_v112.md).

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
- **Mode changes:** Preview/Production can share one supported payment mode and database. Testnet promotion retires simulation access; real-money promotion requires the setup and acceptance checks above.
- **Background work:** deployment does not activate all workers. Non-signing scheduler workflows need separate URL/key settings. Do not enable workers or signing just to remove a warning.
- **Backups:** use the protected GitHub recovery steps below. Keep archive, MFA and custody keys separately. Supabase backups do not replace signed app verification. Never restore onto an occupied project.
- **Later schema changes:** preserve the installed baseline. Add a reviewed forward migration for later changes. Old 99-file archives require their matching historical release, not this fresh installer.

**Documentation rule:** keep five core guides plus one concise bug report; no separate fix plan. Summarize fixed bugs by range and omit repeated histories. Keep this SETUP detailed for a beginner: exact web UI clicks, fields, values, checks and manual SQL. Keep the PRD comprehensive. New documents require an owner request or essential need; history stays in Git.


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

Archives created before SQL004 need the matching earlier release to restore. Keep original archives, keys and release references; do not alter checksums or signed inventories. A restored staging site must get fresh scheduler/worker request keys, with previous-key settings removed, before any reviewed activation. Keep its custody/MFA encryption keys backed up separately.

## Read-only staff previews

1. Sign in as an administrator and complete MFA.
2. When a staff feature is off, click **Administration (read-only)** or **Moderation (read-only)** in navigation. These open the preview under account settings.
3. Use **Reload**, **Refresh** or search to inspect data. Change buttons stay disabled. Moderators and members cannot use this exception.
4. The normal disabled `/admin` and `/moderation` pages return404. Use the preview link to inspect them.

## Final testing: details to prepare

Provide these during final setup; coding can continue before they are available. Never send private keys, passwords or recovery phrases in chat.

1. Choose launch countries and obtain the required business/legal review. Approve user terms, funding sources, refunds, closure handling and loss disclosures.
2. Set an operating/gas budget and choose the existing hosting/custody accounts to use. Confirm the hosting plan permits the intended commercial use.
3. For each enabled asset, record its exact network, verified contract/mint, decimals, provenance and two independent RPC providers. Supply JAGA's reviewed BNB contract if JAGA is included. Leave unverified assets disabled.
4. Prepare dedicated treasury/gas and settlement addresses, per-transaction/daily limits, fee reserves and an HTTPS alert receiver. Keep custody/decryption material only in the separate signer host's protected settings.
5. Put database, OAuth, CAPTCHA, archive and worker credentials in the protected provider settings identified above. Preview must receive restricted access before the shared database holds real funds.
6. During final testing, verify actual OAuth/MFA, wallet approvals, every enabled asset's payments/refunds/recovery, received alerts and a fresh empty-target restore. Save the actual evidence; local fixtures cannot substitute for it.
7. Complete the PRD's14-day beta and14-day initial-cap observation periods. Configuration is not acceptance evidence; this checklist alone does not authorize public launch.

## Account checks after deployment

1. Sign in and open **Account**. Save English/French and your time zone; dates should use that zone. The default is Africa/Lagos.
2. When consent requests a birth date, enter the full date. The server checks the required age and retains the verification time, not the birth date.
3. In native plan administration, choose USD-derived pricing or enter the exact token amount. Use **Resume the existing price unchanged** to preserve a paused plan's existing amount.
4. To schedule a new plan, save it disabled in **Plans and system positions**. In **Payment administration**, load/select it, select a currency and pricing mode, enter **Scheduled launch (UTC)**, then click **Schedule this currency**. Repeat for other currencies with the same date.
5. Keep the scheduler, signed prices and approvals current. The countdown does not open payments by itself: launch checks must pass. A failure appears in payment alerts and retries after five minutes; other ready currencies can proceed. To cancel, pause/disable the plan. To change its date, cancel first, save it disabled and schedule again after existing obligations resolve.

6. On the member wallet, open **All my current items → Type: Cycles → View: Completed** to inspect completed cycles, recorded completion times and the live rejoin cooldown. Dates use the saved account time zone.

New backups use recovery inventory contract4. Keep original archives, keys and release references. Contract4 packets made before SQL006 need the matching pre-006 release (PR65 `0ea4cf5e62a0ef7e7f83c26c1a512d6935775ac3`) before a reviewed forward upgrade. Contract3 archives require release `6c323dc43c45efa1957308e467ce06e7cc0b36c0`; do not edit or re-sign them.

## Background jobs

1. In Supabase SQL Editor, run the key generator from section6 again. Save the two new results as `SCHEDULER_HMAC_KEY` and `FINANCIAL_WORKER_AUTH_KEY` in your password manager. Do not replace your existing authentication or MFA keys.
2. Add both to Vercel **Production** and GitHub **Settings → Environments → production → Environment secrets**. Redeploy Production after saving.
3. In that GitHub environment's **Variables**, set `APP_ENV` to the active mode, `SCHEDULER_ORIGIN` and `FINANCIAL_API_ORIGIN` to the exact site HTTPS origin.
4. In **Settings → Secrets and variables → Actions → Variables**, set `ENABLE_SCHEDULER=true`. For testnet/mainnet, set `ENABLE_FINANCIAL_SCHEDULER=true` after configuring the financial providers; keep it off for simulation.
5. Open **Actions → non-signing-scheduler → Run workflow → main**. For native modes, also run **non-signing-financial-scheduler**. Check accepted results and actual delivery; five-minute schedules can be delayed.
6. These jobs do not sign transfers. Configure the separate signer below. To pause a scheduler, set its enable variable to `false`.

## Prepare new encrypted custody keys in your browser

This creates **new, unfunded wallets** on a GitHub runner. Use it only if you trust the repository administrators with custody. Do not use it to replace an existing funded treasury. Generation alone does not activate payments.

1. In Supabase **SQL Editor → New query**, run this once for each custody environment you intend to prepare:

```sql
select translate(rtrim(encode(gen_random_bytes(32), 'base64'), '='), '+/', '-_')
  as signer_decryption_secret;
```

2. Save the result in your password manager. Use a different secret for testnet and mainnet. Keep it separate from downloaded encrypted files; never add it to Vercel or paste it in chat.
3. In GitHub **onyiy → Settings → Environments → New environment**, create `custody-testnet`. Create `custody-mainnet` only when preparing mainnet keys.
4. Open that environment. Under **Environment secrets**, click **Add secret**. Set **Name** to `SIGNER_DECRYPTION_SECRET`, paste its saved value, and click **Add secret**. No database or worker credentials belong here.
5. Open **Actions → prepare-encrypted-custody → Run workflow**. Select **Branch: main**, then the matching **payment_environment**. Click **Run workflow**. If the button is missing, confirm the workflow is merged into main and you have repository write access.
6. Open the completed run. Under **Artifacts**, click `encrypted-custody-ENVIRONMENT-RUN_ID` to download it. Download within **one day**; GitHub then expires the artifact.
7. Keep private backup copies of the encrypted files and `inventory.json`. The inventory lists public addresses; it contains no recovery phrase or plaintext key. Keep the decryption secret backed up separately.
8. During final signer-host setup, use the reviewed encrypted files and compare their public addresses with the configured treasury addresses. **Do not fund or install a replacement treasury merely because this workflow passed.** Use the installation workflow below only after checking the inventory and selected environment.

Official UI references: [run a workflow](https://docs.github.com/en/actions/managing-workflow-runs/manually-running-a-workflow), [download artifacts](https://docs.github.com/en/actions/managing-workflow-runs/downloading-workflow-artifacts), [environment secrets](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions).

## Run the isolated signer from GitHub

The repository is public; GitHub currently provides standard Linux runner usage free for public repositories. Storage, provider quotas and scheduling limits still apply. Keep the repository and protected environments restricted to trusted administrators.

1. In GitHub **onyiy → Settings → Environments → New environment**, create `signer-testnet` or `signer-mainnet`. Open it and restrict deployment branches to **main**. This reuses GitHub; no extra server account is required.
2. Under **Environment secrets → Add secret**, add these values:

| Secret | Where it comes from |
|---|---|
| `SIGNER_KEY_PACKAGE_JSON` | Entire `encrypted-key-package.json` from the matching downloaded custody artifact |
| `SIGNER_DECRYPTION_SECRET` | Separately saved secret used to create that package |
| `SIGNER_DATABASE_URL` | Connection using a separate login holding only `gw_signer` |
| `SIGNED_PAYLOAD_ENCRYPTION_KEY` | A new32-byte secret, generated like the custody secret; preserve it for retained signed attempts |
| `FINANCIAL_WORKER_AUTH_KEY` | Same protected worker-authentication key as the website |
| `ALERT_WEBHOOK_KEY` | Same protected alert acknowledgement key as the website |

3. If you have no signer login, use Supabase **SQL Editor → New query**. Replace the password locally, then run:

```sql
create role gw_signer_runtime login noinherit password 'PASTE_A_NEW_STRONG_PASSWORD_HERE';
grant gw_signer to gw_signer_runtime;
```

Use the existing database's connection details with that login, following the connection-format instructions above. Never grant it `gw_service`, `gw_read` or owner membership. Do not recreate an existing login merely to clear an error.

4. Under this environment's **Environment variables → Add variable**, copy the matching website values: `ASSET_REGISTRY_JSON`, `PRICE_PROVIDER`, `COINMARKETCAP_IDS_JSON`, `PRICE_FEED_PUBLIC_KEY`, `ALERT_WEBHOOK_URL`, `OUTBOUND_ALLOWED_HOSTS`, both approval JSON lists, `FINANCIAL_ACTIVATION`, the enabled network RPC values and all configured platform addresses. Set `FINANCIAL_API_ORIGIN` to the website's exact HTTPS origin. Copy any non-default signer hard limits and custom database CA setting too.
5. Keep website authentication, Google, MFA and migration credentials out of this environment. The workflow installs all four encrypted files into a new private runner directory and keeps the decryption secret separate.
6. Open **Settings → Secrets and variables → Actions → Variables**. Add repository variable `SIGNER_PAYMENT_ENVIRONMENT` with `testnet` or `mainnet`. Add `ENABLE_SIGNER_WORKER` with `true` when ready to run. This also enables the five-minute schedule.
7. Open **Actions → isolated-encrypted-signer → Run workflow**. Choose **main** and the matching payment environment, then **Run workflow**. Inspect the completed run and signer heartbeat. A paused result requires investigation; it never proves that a payment succeeded.
8. To stop new signing during setup, set `ENABLE_SIGNER_WORKER=false`. Keep the non-signing financial scheduler configured to observe known attempts and process reports. Never delete signed attempts, reservations or keys to clear an error.

Official UI: [environments and secrets](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments), [run a workflow](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow), [public-runner billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions).


## Back up and recover through GitHub

Use the same GitHub/Supabase accounts. Recovery never starts payments or deploys a site. A restore needs an **empty, unpublished target**; use an available project slot on your existing account. Do not erase the active project to make room. Leave the target SQL Editor closed while restoration runs. Known idle Supabase service connections are allowed only with no open transaction; active or unknown connections still block restore. Close your application connections and retry without terminating provider sessions or weakening the check.

### Prepare protected recovery settings

1. In GitHub → **Settings → Environments → New environment**, create `recovery-backup-mainnet` and `recovery-restore-mainnet`. For another payment mode, replace `mainnet` with `testnet` or `simulation`.
2. Restrict deployment branches to **main** and require an owner review where your account supports it. Give access only to trusted administrators.
3. Generate a separate archive key in Supabase **SQL Editor → New query**:

```sql
select translate(rtrim(encode(gen_random_bytes(32), 'base64'), '='), '+/', '-_')
  as archive_encryption_key;
```

4. Save the result in your password manager. In each recovery environment, add these **environment secrets**:

| Secret | Backup environment | Restore environment |
|---|---|---|
| `DATABASE_URL` | Source runtime URL | Empty target runtime URL |
| `DATABASE_MIGRATION_URL` | Source owner/session-pooler URL | Empty target owner/session-pooler URL |
| `DATABASE_TLS_CA_PEM` | Source CA, if required | Target CA, if required |
| `EXPORT_ENCRYPTION_KEY` | Saved archive key | The exact key used by that backup |

Do not add web, Google, MFA, signer or scheduler secrets here. Keep old archive keys when rotating them. Preserve original MFA/custody/payload keys separately for eventual application recovery.

### Make and retain a backup

1. Open GitHub → **Actions → encrypted-financial-recovery → Run workflow**.
2. Choose **main**, action **backup** and the payment mode. Leave archive/target fields blank. Click **Run workflow** and approve the protected environment if prompted.
3. Open the successful run. Under **Artifacts**, download its `financial-backup-…` ZIP. Save the original ZIP and the **Archive release commit** printed in the recovery step. The ZIP contains encrypted data, its signed inventory and `release.json`; never add keys.
4. The Actions copy expires after **one day**. Keep the ZIP in your protected storage. For browser recovery after expiry, open the repository → **Releases → Draft a new release**. Create a tag such as `recovery-mainnet-20261017a`, keep **Target: main**, attach only that original ZIP, mark it as a pre-release and publish. Keep the original backup commit recorded separately; the release tag is only a storage label.
5. For automatic backups, follow the next subsection. A successful backup does not prove restore time or chain reconciliation.

### Turn on automatic backups

1. Complete **Prepare protected recovery settings** above and make one successful manual backup first.
2. Open GitHub → **Settings → Secrets and variables → Actions → Variables → New repository variable**. Add `AUTOMATIC_BACKUP_ENVIRONMENT` with your active payment mode: `simulation`, `testnet` or `mainnet`. Add `ENABLE_AUTOMATIC_BACKUPS` with value `true`.
3. In **Settings → Actions → General → Artifact and log retention**, allow at least the app’s `backup_policy.keep_days` (default30). This workflow supports up to90days; longer retention needs reviewed external storage. Check storage usage/billing before enabling it.
4. The workflow wakes hourly and follows the database’s backup policy. Under **Actions → encrypted-financial-recovery**, check scheduled runs and their `financial-backup-…` artifacts. A second small `financial-backup-state-…` artifact is only a checkpoint; restore uses the financial archive’s run ID. A successful skipped run has no new archive.
5. Enable GitHub’s failed-workflow notifications for your account. Check that the last actual archive stays within your recovery target; GitHub schedules can be delayed or disabled after inactivity. If backups stop, make a manual backup and investigate. The app does not guarantee GitHub scheduling or storage availability.
6. Keep archive keys separately. In a public repository, readers can download encrypted artifacts. Download important originals before expiry and retain them as described above. Complete a separate restore/verify drill at `restore_check_days` (default30); scheduled backups do not perform it.
7. When changing payment mode, update `AUTOMATIC_BACKUP_ENVIRONMENT` and its protected environment settings. A different database identity starts fresh backup history. To stop automation, set `ENABLE_AUTOMATIC_BACKUPS=false`; manual recovery stays available.

### Prepare an empty target and restore

1. In the empty target project, generate a new runtime password. In **SQL Editor → New query**, run this once, replacing the password privately. **Do not paste the application installer into this target.**

```sql
create role gw_read nologin noinherit nosuperuser nocreatedb
  nocreaterole nobypassrls noreplication;
create role gw_service nologin noinherit nosuperuser nocreatedb
  nocreaterole nobypassrls noreplication;
create role gw_runtime login noinherit nosuperuser nocreatedb
  nocreaterole nobypassrls noreplication password 'REPLACE_WITH_NEW_RUNTIME_PASSWORD';
grant gw_read, gw_service to gw_runtime;
grant connect on database postgres to gw_runtime;
```

2. Delete the password-bearing saved query. Copy this target’s runtime and owner/session-pooler URLs as in section4. Put them in the **restore** environment only, with the original archive key and the target CA. Keep the target unpublished and signing/schedulers off.
3. Open **Actions → encrypted-financial-recovery → Run workflow**. Choose **main**, action **restore** and the archive’s payment mode. Enter the exact target database name, usually `postgres`.
4. Choose **one** archive source: enter the successful backup’s numeric run ID from its URL, **or** enter the permanent recovery release tag and its original40-character backup commit. Leave the other source blank. The workflow checks trusted main history and runs the matching backup release. It never upgrades an old archive automatically.
5. Run and review the result. Signature/checksum/version, empty-target, role and exact-content checks must all pass. On failure, keep the log/archive/key/target intact; do not delete records or weaken checks to retry.
6. Run again with action **verify**, the same archive selection and target settings. This independently checks the restored data without restoring again.
7. Before publication, reconcile every retained financial attempt against the real chains, preserve sender/refund rights, set fresh auth/scheduler/worker request keys and retain the original MFA/custody/payload keys. Obtain new per-network configuration hashes and signed alert acknowledgements. A restored database has a new identity, so source approvals cannot enable it. Reconcile old attempts; never overwrite their hashes or resend to clear a warning.


### Reconcile transfers after restoration

Keep signing/schedulers off and the target private while reviewing it.

1. In the app’s admin area, open **Recovery from a checkpoint**. Enter the asset key and click **Load receiving addresses**. Include historical addresses.
2. Obtain an agreed finalized block height/hash from both configured providers. For each retained address, enter a fresh checkpoint, case reference and reason; copy the displayed confirmation into **Exact confirmation**, then click **Register and pause**. Copied source checkpoints cannot authorize work on the restored database.
3. Enter the common final height, click **Start reconciliation**, then repeat **Process one bounded page** until complete. Missing or contradictory proof means stop and investigate; never resend a saved transaction to clear the warning.
4. For an unknown outgoing transfer, investigate its actual chain evidence and missing records. **Record company loss, then rescan** explicitly charges the company; it does not prove a member was paid or reconstruct a missing withdrawal request. A saved member wallet address alone does not prove that the person requested that transfer. Use it only after review, then start a fresh complete scan.
5. Unknown incoming funds remain owed to their original sender. Use **Return to the original sender** with the original wallet’s signature; do not assign the funds to a guessed member.
6. Confirm every address reconciles at the common finalized cutoff. Old reviewed scans remain under **All history**. Obtain fresh target approvals/alert acknowledgement, restore the protected custody keys, and perform a small newly confirmed payout before public activation. If missing off-chain records remain unexplained, keep the asset paused.

**Upgrading from an earlier release:** verify old archives with their matching release first. Then deploy the current reviewed app/signer release before monitoring current Solana activity; older readers cannot read v1 transactions. Financial hashes now include database identity. Refresh reviewed hashes/alert acknowledgements even on the original database. Keep existing obligation/signed-attempt snapshots intact and use the recovery/requote controls for unresolved old configuration. Historical archives predating this browser workflow still require their matching supervised recovery release.

References: [download workflow artifacts](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/download-workflow-artifacts) · [create releases](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository) · [PostgreSQL Ubuntu packages](https://www.postgresql.org/download/linux/ubuntu/).

### Pause new checkout during an incident

Use a plan pause to close checkout while keeping valid payouts available. Global wallet/mainnet switches also pause payments and change approval requirements.

1. On the active financial site, open **Admin → Plans → Load**. Complete administrator verification if asked, then select a plan.
2. Enter a reason, choose **State → Pause**, and click **Change state**. Repeat for each plan that must stop accepting new payments.
3. Check that new checkout is closed. Keep the approved signer, wallet access, signed prices and healthy providers running to process valid payouts. Inspect their actual receipts and payment alerts.
4. For an unresolved chain/custody discrepancy, follow **Recovery from a checkpoint** above. Keep saved hashes and liabilities intact; investigate before resuming that asset.
5. After review, use **Payment administration → Resume the existing price unchanged** for the selected plan/currency. Confirm current approvals and prices before reopening checkout.

### When the app asks you to reload

1. Finish any open wallet connection, ownership-signature or payment confirmation. Do not send the payment again.
2. If a transaction hash appears, click **Copy hash and reload** and keep it for the original payment. If copying fails, copy it manually before using your browser’s reload button.
3. Otherwise click **Reload app**. Ordinary compatible updates do not block payments. An incompatible update blocks new actions until reload; it never queues or resends them.

**Pending send labels:** “Signed; submission pending” means bytes are retained but no network submission is recorded. “Submitted to network” still needs confirmation. Save the recorded hash if shown; do not create another payment to clear either state.


## Configure prices and manual fallback

Use this for testnet and mainnet after custody/RPC setup. Simulation needs no external feed. Prices are USD reference rates; testnet coins have no promised cash value. Keep payment plans disabled while setting this up.

### Prepare a separate pricing key

1. In GitHub, open **onyiy → Settings → Environments → New environment**. Create `prices-testnet` or `prices-mainnet` to match the website. Restrict deployment branches to **main**. Add required reviewers if your GitHub plan supports them.
2. In Supabase, open **SQL Editor → New query**. Run:

```sql
select
  rtrim(translate(encode(gen_random_bytes(32), 'base64'), '+/', '-_'), '=')
    as price_feed_auth_key,
  rtrim(translate(encode(gen_random_bytes(32), 'base64'), '+/', '-_'), '=')
    as price_feed_decryption_secret;
```

3. Save the two different results privately. Do not replace existing application, MFA or custody keys.
4. In the GitHub pricing environment, choose **Environment secrets → Add environment secret**. Add `PRICE_FEED_AUTH_KEY` and `PRICE_FEED_DECRYPTION_SECRET` using the matching results.
5. In Vercel **Settings → Environment Variables**, add the same `PRICE_FEED_AUTH_KEY` for **Production only**. The decryption secret stays in GitHub.
6. In GitHub, open **Actions → protected-price-feed → Run workflow**. Select **main**, the matching payment environment and operation **prepare_key**. Leave the manual-price fields blank. Run it.
7. Open the successful run. Under **Artifacts**, download the encrypted pricing archive within one day. Save it privately, separately from its decryption secret. Extract it: there should be `encrypted-price-key.json` and `price-feed-public-key.txt`.
8. In the GitHub pricing environment, add secret `PRICE_FEED_KEY_PACKAGE_JSON`: paste the complete encrypted JSON file. Do not paste it into the website.
9. In Vercel Production, add `PRICE_FEED_PUBLIC_KEY`: paste the public text file's single value. This public key cannot sign payments or rates.

### Select the provider and reviewed currencies

1. In Vercel Production, set `PRICE_PROVIDER=coinmarketcap`. This is the native-mode default. If upgrading an existing manual-rate installation, explicitly retain `PRICE_PROVIDER=manual_signed` until ready to change providers.
2. Add `COINMARKETCAP_IDS_JSON` with reviewed market IDs for **every enabled registry asset and its native gas currency**. For a SOL-only setup, use `{"sol":5426}`. For the seven supported ETH/BNB/SOL/TRON native/USDT entries, excluding JAGA, use:

```json
{"eth":1027,"bnb":1839,"sol":5426,"trx":1958,"usdt_bnb":825,"usdt_sol":825,"usdt_tron":825}
```

3. Compare each ID with its current CoinMarketCap listing. USDT uses the same market ID on its three supported chains, but each chain's contract/mint still needs separate verification. Market IDs never establish on-chain provenance. Keep JAGA disabled until both its actual BNB contract and market mapping are reviewed; do not invent an ID. If a required asset has no usable listing, use the explicitly reviewed manual provider instead.
4. In the GitHub pricing environment, choose **Environment variables → Add variable**. Add `PRICE_FEED_API_ORIGIN` as the website's exact HTTPS origin, with no trailing slash or path. Add `OUTBOUND_ALLOWED_HOSTS` as the website hostname and `pro-api.coinmarketcap.com`, separated by a comma; omit `https://` and paths.
5. CoinMarketCap's current v3 public endpoint supports keyless requests. If your existing account/plan uses a Pro API key, add `COINMARKETCAP_API_KEY` as a **pricing-environment secret only**. Obtain it from the [CoinMarketCap API dashboard](https://pro.coinmarketcap.com/). Review the chosen plan's quotas and usage terms. Never put that key in Vercel or public browser variables.
6. In the matching `signer-testnet` or `signer-mainnet` environment, copy `PRICE_PROVIDER`, `COINMARKETCAP_IDS_JSON` and `PRICE_FEED_PUBLIC_KEY` as variables, identical to the website. The signer receives no pricing private key/decryption secret.
7. Redeploy Vercel Production. On the website, open native payment administration and provision the reviewed assets **disabled**. The registry entries must be enabled/verified to be available to the feed; the database payment plans remain disabled. Provisioning checks the configured RPC and receiving address.
8. Run **Actions → protected-price-feed → Run workflow** again, this time with operation **refresh** and the matching environment. Inspect its result: `published` should cover the enabled reviewed registry entries. Missing mappings, invalid responses, stale data or unavailable providers stop publication; no fake rate replaces them.
9. Continue the network approval steps above. Provider mapping or public-key changes alter financial configuration hashes: obtain fresh hashes and alert acknowledgements before activation. Do not overwrite old obligation or signed-attempt snapshots.
10. To schedule refreshes, open **Settings → Secrets and variables → Actions → Variables**. Add repository variables `ENABLE_PRICE_FEED=true` and `PRICE_FEED_PAYMENT_ENVIRONMENT=testnet` or `mainnet`, matching the active website. Check actual successful runs and fresh stored rates. GitHub's five-minute schedule can be delayed; expired rates close affected price-dependent actions. Set the enable variable to `false` to pause automatic refreshes.

### Publish a reviewed manual fallback

1. Keep the encrypted pricing package, public key and pricing authentication settings above. A manual fallback also works during a CoinMarketCap cooldown; it does not erase that cooldown.
2. To use manual rates exclusively, set `PRICE_PROVIDER=manual_signed` in Vercel and the signer environment, redeploy and repeat changed-configuration approvals. Automatic **refresh** is then disabled. Keep the other financial gates intact.
3. Open **Actions → protected-price-feed → Run workflow**. Select **main**, the matching environment and operation **manual**.
4. Fill `asset_key` with one enabled registry key, such as `sol` or `usdt_bnb`. Fill `asset_usd` with the reviewed USD price per token/unit, and `native_usd` with the reviewed USD price of its gas currency. Native assets require identical values. Use plain positive decimals with at most18 decimal places; never assume a stablecoin peg.
5. Fill `observed_at` with the actual recent UTC observation time, such as `2026-10-19T12:30:00Z`, replacing the example with the real time. Fill `source` with its public HTTPS evidence URL, without login credentials or query parameters. Run immediately: quotes expire five minutes after their observation. GitHub queue delays can make the request expire; review a fresh observation rather than changing an old observation's timestamp.
6. Inspect the result and stored quote. Repeat separately for other currencies if needed. A successful rate publication does not activate plans or prove a financial transfer.

The pricing environment needs no database, Google, MFA, custody or financial-worker keys. Keep all such credentials out of it. See the current [CMC v3 reference](https://coinmarketcap.com/api/documentation/pro-api-reference/cryptocurrency) for provider behavior; hosted refresh/retry acceptance remains part of final setup.
