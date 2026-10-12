-- PostgreSQL roles are deployment-owned groups; no login/password is created.
-- Runtime logins require NOINHERIT, membership in both groups and no ownership.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='gw_read') THEN
    CREATE ROLE gw_read NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='gw_service') THEN
    CREATE ROLE gw_service NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname IN ('gw_read','gw_service') AND
    (rolcanlogin OR rolinherit OR rolsuper OR rolcreatedb OR rolcreaterole OR rolbypassrls)) THEN
    RAISE EXCEPTION 'UNSAFE_APPLICATION_ROLE';
  END IF;
END $$;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO gw_read, gw_service;

CREATE OR REPLACE FUNCTION public.gw_actor_id() RETURNS uuid
LANGUAGE sql STABLE SET search_path=pg_catalog AS $$
  SELECT nullif(current_setting('gw.actor_id',true),'')::uuid
$$;
CREATE OR REPLACE FUNCTION public.gw_staff_reader() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT coalesce(current_setting('gw.access',true)='staff' AND EXISTS (
    SELECT 1 FROM public.users WHERE id=public.gw_actor_id() AND role='admin' AND status='active'
  ),false)
$$;
CREATE OR REPLACE FUNCTION public.gw_owns(target uuid) RETURNS boolean
LANGUAGE sql STABLE SET search_path=pg_catalog AS $$
  SELECT target=public.gw_actor_id() OR public.gw_staff_reader()
$$;
REVOKE ALL ON FUNCTION public.gw_actor_id(), public.gw_staff_reader(), public.gw_owns(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gw_actor_id(), public.gw_staff_reader(), public.gw_owns(uuid) TO gw_read, gw_service;

DO $$
DECLARE name text; browser text;
BEGIN
  FOREACH name IN ARRAY ARRAY['users','referral_codes','assets','plans','plan_versions','queue_partitions','cycles','queue_entries','ledger_accounts','ledger_journals','ledger_postings','operation_keys','point_events','wallet_links','withdrawals','notifications','x_manifest','audit_events'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',name);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, gw_read, gw_service',name);
    -- Core data is served by native handlers, never by a browser Data API key.
    FOREACH browser IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=browser) THEN
        EXECUTE format('REVOKE ALL ON public.%I FROM %I',name,browser);
      END IF;
    END LOOP;
    EXECUTE format('DROP POLICY IF EXISTS gw_service_access ON public.%I',name);
    EXECUTE format('CREATE POLICY gw_service_access ON public.%I TO gw_service USING (true) WITH CHECK (true)',name);
  END LOOP;
END $$;

-- Read group cannot mutate, see unscoped financial history, or read configuration.
GRANT SELECT ON public.users, public.referral_codes, public.assets, public.plans,
  public.plan_versions, public.queue_partitions, public.cycles, public.queue_entries,
  public.point_events, public.wallet_links, public.withdrawals, public.notifications,
  public.audit_events TO gw_read;
DO $$
DECLARE name text; owner_column text;
BEGIN
  FOR name,owner_column IN SELECT * FROM (VALUES
    ('users','id'),('referral_codes','user_id'),('cycles','user_id'),
    ('queue_entries','beneficiary_user_id'),('point_events','user_id'),
    ('wallet_links','user_id'),('withdrawals','user_id'),('notifications','user_id')
  ) AS owned(name,owner_column) LOOP
    EXECUTE format('DROP POLICY IF EXISTS gw_owned_read ON public.%I',name);
    EXECUTE format('CREATE POLICY gw_owned_read ON public.%I FOR SELECT TO gw_read USING (public.gw_owns(%I))',name,owner_column);
  END LOOP;
END $$;
ALTER POLICY gw_owned_read ON public.wallet_links
  USING (public.gw_owns(user_id) AND environment=current_setting('gw.environment',true));
ALTER POLICY gw_owned_read ON public.cycles USING (public.gw_owns(user_id) AND
  EXISTS (SELECT 1 FROM public.plan_versions v JOIN public.assets a ON a.id=v.asset_id WHERE v.id=plan_version_id AND a.environment=current_setting('gw.environment',true)));
ALTER POLICY gw_owned_read ON public.withdrawals USING (public.gw_owns(user_id) AND
  EXISTS (SELECT 1 FROM public.assets WHERE id=asset_id AND environment=current_setting('gw.environment',true)));
ALTER POLICY gw_owned_read ON public.queue_entries USING (public.gw_owns(beneficiary_user_id) AND
  EXISTS (SELECT 1 FROM public.queue_partitions WHERE id=partition_id));
DROP POLICY IF EXISTS gw_assets_read ON public.assets;
CREATE POLICY gw_assets_read ON public.assets FOR SELECT TO gw_read
  USING (environment=current_setting('gw.environment',true));
DROP POLICY IF EXISTS gw_plans_read ON public.plans;
CREATE POLICY gw_plans_read ON public.plans FOR SELECT TO gw_read USING (true);
DROP POLICY IF EXISTS gw_versions_read ON public.plan_versions;
CREATE POLICY gw_versions_read ON public.plan_versions FOR SELECT TO gw_read USING (
  EXISTS (SELECT 1 FROM public.assets WHERE id=asset_id)
);
DROP POLICY IF EXISTS gw_partitions_read ON public.queue_partitions;
CREATE POLICY gw_partitions_read ON public.queue_partitions FOR SELECT TO gw_read USING (
  EXISTS (SELECT 1 FROM public.plan_versions WHERE id=plan_version_id)
);
DROP POLICY IF EXISTS gw_audit_read ON public.audit_events;
CREATE POLICY gw_audit_read ON public.audit_events FOR SELECT TO gw_read USING (public.gw_staff_reader());

-- Service group operates only behind transaction-bound domain authorization.
GRANT SELECT ON public.users, public.referral_codes, public.assets, public.plans,
  public.plan_versions, public.queue_partitions, public.cycles, public.queue_entries,
  public.ledger_accounts, public.ledger_journals, public.ledger_postings,
  public.operation_keys, public.point_events, public.wallet_links, public.withdrawals,
  public.notifications, public.x_manifest, public.audit_events TO gw_service;
GRANT INSERT ON public.referral_codes, public.queue_partitions, public.cycles,
  public.queue_entries, public.ledger_accounts, public.ledger_journals,
  public.ledger_postings, public.operation_keys, public.point_events,
  public.wallet_links, public.withdrawals, public.notifications, public.audit_events TO gw_service;
GRANT UPDATE ON public.users, public.plans, public.plan_versions,
  public.queue_partitions, public.cycles, public.queue_entries,
  public.withdrawals, public.x_manifest TO gw_service;
-- No DELETE, TRUNCATE, ledger UPDATE, schema CREATE or browser grant.

CREATE OR REPLACE VIEW public.gw_user_account_balances WITH (security_barrier=true) AS
SELECT a.owner_id AS user_id, a.asset_id, a.purpose,
  coalesce(sum(CASE WHEN p.direction='credit' THEN p.amount_base_units ELSE -p.amount_base_units END),0)::numeric(78,0) AS balance
FROM public.ledger_accounts a LEFT JOIN public.ledger_postings p ON p.account_id=a.id
JOIN public.assets asset ON asset.id=a.asset_id
WHERE a.owner_type='user' AND public.gw_owns(a.owner_id)
  AND asset.environment=current_setting('gw.environment',true)
GROUP BY a.owner_id,a.asset_id,a.purpose;

CREATE OR REPLACE VIEW public.gw_queue_positions WITH (security_barrier=true) AS
SELECT e.id AS entry_id,
  (SELECT count(*)+1 FROM public.queue_entries ahead
   WHERE ahead.partition_id=e.partition_id AND ahead.status='waiting' AND ahead.ticket<e.ticket) AS display_position
FROM public.queue_entries e WHERE public.gw_owns(e.beneficiary_user_id);

-- Synthetic account chooser only; no email/profile/auth records are exposed.
CREATE OR REPLACE VIEW public.gw_sim_accounts WITH (security_barrier=true) AS
SELECT id,username,role,status,locale FROM public.users
WHERE current_setting('gw.environment',true)='simulation';
REVOKE ALL ON public.gw_user_account_balances, public.gw_queue_positions, public.gw_sim_accounts FROM PUBLIC;
GRANT SELECT ON public.gw_user_account_balances, public.gw_queue_positions, public.gw_sim_accounts TO gw_read;
DO $$
DECLARE browser text;
BEGIN
  FOREACH browser IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=browser) THEN
      EXECUTE format('REVOKE ALL ON public.gw_user_account_balances, public.gw_queue_positions, public.gw_sim_accounts FROM %I',browser);
      EXECUTE format('REVOKE ALL ON FUNCTION public.gw_actor_id(), public.gw_staff_reader(), public.gw_owns(uuid) FROM %I',browser);
    END IF;
  END LOOP;
END $$;
