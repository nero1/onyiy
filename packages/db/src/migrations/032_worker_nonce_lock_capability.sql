-- Row-lock capability only; the existing trigger rejects every nonce UPDATE.
GRANT UPDATE(nonce) ON public.worker_requests TO gw_service;
