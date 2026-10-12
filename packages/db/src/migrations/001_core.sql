CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  email text UNIQUE,
  role text NOT NULL CHECK (role IN ('member','moderator','admin')) DEFAULT 'member',
  status text NOT NULL CHECK (status IN ('pending_consent','active','suspended','banned','deactivated','deleted')) DEFAULT 'pending_consent',
  locale text NOT NULL DEFAULT 'en',
  consent_version text,
  consented_at timestamptz,
  referrer_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS referral_codes (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  code uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL,
  environment text NOT NULL CHECK (environment IN ('simulation','testnet','mainnet')),
  chain_id text NOT NULL,
  decimals integer NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(symbol, environment, chain_id)
);

CREATE TABLE IF NOT EXISTS plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  usd_reference numeric(18,2) NOT NULL,
  receipts_required integer NOT NULL DEFAULT 2,
  status text NOT NULL CHECK (status IN ('disabled','scheduled','active','paused','retired')) DEFAULT 'disabled',
  bootstrap_enabled boolean NOT NULL DEFAULT true,
  bootstrap_count integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plan_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
  version integer NOT NULL,
  amount_base_units numeric(78,0) NOT NULL,
  receiver_bps integer NOT NULL,
  marketing_bps integer NOT NULL,
  referral_bps integer NOT NULL,
  developer_bps integer NOT NULL,
  reserve_bps integer NOT NULL,
  receipts_required integer NOT NULL,
  active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(plan_id, asset_id, version)
);

CREATE TABLE IF NOT EXISTS queue_partitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_version_id uuid NOT NULL UNIQUE REFERENCES plan_versions(id) ON DELETE RESTRICT,
  next_ticket bigint NOT NULL DEFAULT 1,
  revision bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  plan_version_id uuid NOT NULL REFERENCES plan_versions(id) ON DELETE RESTRICT,
  status text NOT NULL CHECK (status IN ('active','completed','exception')) DEFAULT 'active',
  credited_count integer NOT NULL DEFAULT 0,
  receipts_required integer NOT NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_cycle_per_user_plan
  ON cycles(user_id, plan_version_id) WHERE status IN ('active','exception');

CREATE TABLE IF NOT EXISTS queue_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partition_id uuid NOT NULL REFERENCES queue_partitions(id) ON DELETE RESTRICT,
  ticket bigint NOT NULL,
  kind text NOT NULL CHECK (kind IN ('member','bootstrap')),
  cycle_id uuid REFERENCES cycles(id) ON DELETE RESTRICT,
  beneficiary_user_id uuid REFERENCES users(id) ON DELETE RESTRICT,
  platform_role text,
  priority_ticket bigint,
  required_count integer NOT NULL,
  credited_count integer NOT NULL DEFAULT 0,
  status text NOT NULL CHECK (status IN ('waiting','fully_allocated','fulfilled','removed')) DEFAULT 'waiting',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(partition_id, ticket)
);
CREATE INDEX IF NOT EXISTS queue_waiting_order_idx ON queue_entries(partition_id, priority_ticket, ticket) WHERE status='waiting';

CREATE TABLE IF NOT EXISTS ledger_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
  owner_type text NOT NULL CHECK (owner_type IN ('user','platform','system')),
  owner_id uuid,
  purpose text NOT NULL,
  normal_side text NOT NULL CHECK (normal_side IN ('debit','credit')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(asset_id, owner_type, owner_id, purpose)
);

CREATE UNIQUE INDEX IF NOT EXISTS ledger_accounts_owner_unique ON ledger_accounts(asset_id,owner_type,COALESCE(owner_id,'00000000-0000-0000-0000-000000000000'::uuid),purpose);

CREATE TABLE IF NOT EXISTS ledger_journals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ledger_type text NOT NULL,
  business_key text NOT NULL UNIQUE,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ledger_postings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id uuid NOT NULL REFERENCES ledger_journals(id) ON DELETE RESTRICT,
  account_id uuid NOT NULL REFERENCES ledger_accounts(id) ON DELETE RESTRICT,
  direction text NOT NULL CHECK (direction IN ('debit','credit')),
  amount_base_units numeric(78,0) NOT NULL CHECK (amount_base_units > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS operation_keys (
  business_key text PRIMARY KEY,
  request_hash text NOT NULL,
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS point_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  source_key text NOT NULL,
  award_type text NOT NULL,
  points integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, source_key, award_type)
);

CREATE TABLE IF NOT EXISTS wallet_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  environment text NOT NULL,
  chain_id text NOT NULL,
  address text NOT NULL,
  verified_at timestamptz NOT NULL DEFAULT now(),
  cooling_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, environment, chain_id)
);

CREATE TABLE IF NOT EXISTS withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
  gross_base_units numeric(78,0) NOT NULL,
  fee_base_units numeric(78,0) NOT NULL DEFAULT 0,
  net_base_units numeric(78,0) NOT NULL,
  destination text NOT NULL,
  status text NOT NULL CHECK (status IN ('quoted','held','awaiting_requote','approved','sending','settled','cancelled','exception')),
  quote_expires_at timestamptz NOT NULL,
  settled_at timestamptz,
  request_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title_key text NOT NULL,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS x_manifest (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  type text NOT NULL,
  scope text NOT NULL CHECK (scope IN ('public','private','staff')),
  description text NOT NULL DEFAULT '',
  version integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  deprecated_at timestamptz
);

CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  reason text,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Supabase Data API grants. New public-schema tables require explicit GRANTs.
-- These are deliberately least-privilege because the application uses direct PostgreSQL
-- connections; Data API access is not the primary application data path.
-- The role checks keep this migration portable to local/Neon/generic PostgreSQL hosts
-- where Supabase roles do not exist.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    GRANT SELECT ON public.assets, public.plans, public.plan_versions TO anon;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT SELECT ON public.assets, public.plans, public.plan_versions TO authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON
      public.users,
      public.referral_codes,
      public.assets,
      public.plans,
      public.plan_versions,
      public.queue_partitions,
      public.cycles,
      public.queue_entries,
      public.ledger_accounts,
      public.ledger_journals,
      public.ledger_postings,
      public.operation_keys,
      public.point_events,
      public.wallet_links,
      public.withdrawals,
      public.notifications,
      public.x_manifest,
      public.audit_events
    TO service_role;
  END IF;
END $$;
