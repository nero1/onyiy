ALTER TABLE public.signed_attempts ADD CONSTRAINT signed_attempt_actual_fee_check CHECK(actual_native_fee IS NULL OR actual_native_fee>=0);
ALTER TABLE public.signed_attempts ADD CONSTRAINT signed_attempt_terminal_shape CHECK(status NOT IN ('confirmed','failed','expired','superseded') OR actual_native_fee IS NOT NULL AND confirmed_at IS NOT NULL);
ALTER TABLE public.signed_attempts ADD CONSTRAINT signed_attempt_no_execution_fee CHECK(status NOT IN ('expired','superseded') OR actual_native_fee=0);
