CREATE INDEX IF NOT EXISTS wallet_reuse_lookup_idx ON public.wallet_links(environment,chain_id,address,user_id);
