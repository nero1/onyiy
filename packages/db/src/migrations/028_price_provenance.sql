CREATE UNIQUE INDEX IF NOT EXISTS price_quote_fingerprint_idx ON public.price_quotes(fingerprint);
CREATE INDEX IF NOT EXISTS price_quote_fresh_idx ON public.price_quotes(asset_id,observed_at DESC,expires_at);
CREATE INDEX IF NOT EXISTS wallet_challenge_expiry_idx ON public.wallet_challenges(expires_at,id);
CREATE INDEX IF NOT EXISTS worker_request_expiry_idx ON public.worker_requests(expires_at,nonce);
