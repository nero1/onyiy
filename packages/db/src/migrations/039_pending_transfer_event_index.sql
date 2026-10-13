-- -1 records a wallet hash before its receipt/event index is available.
ALTER TABLE public.crypto_submissions DROP CONSTRAINT IF EXISTS crypto_submissions_event_index_check;
ALTER TABLE public.crypto_submissions ADD CONSTRAINT crypto_submissions_event_index_check CHECK(event_index>=-1 AND event_index<=1000);
