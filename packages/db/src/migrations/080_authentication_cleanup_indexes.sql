CREATE INDEX IF NOT EXISTS auth_flow_expiry_cleanup_idx ON public.auth_flows(expires_at,state_hash);
CREATE INDEX IF NOT EXISTS auth_session_expiry_cleanup_idx ON public.auth_sessions(absolute_expires_at,id);
CREATE INDEX IF NOT EXISTS auth_refresh_expiry_cleanup_idx ON public.auth_refresh_tokens(expires_at,token_hash);
CREATE INDEX IF NOT EXISTS auth_totp_cleanup_idx ON public.auth_totp_replays(accepted_at,factor_id,time_step);
