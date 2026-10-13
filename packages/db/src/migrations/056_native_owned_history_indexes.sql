CREATE INDEX IF NOT EXISTS crypto_invoice_owned_cursor_idx ON public.crypto_invoices(user_id,id);
CREATE INDEX IF NOT EXISTS crypto_event_invoice_cursor_idx ON public.crypto_events(invoice_id,id);
CREATE INDEX IF NOT EXISTS crypto_obligation_owned_cursor_idx ON public.crypto_obligations(user_id,id);
CREATE INDEX IF NOT EXISTS native_receipt_owned_cursor_idx ON public.crypto_obligations(user_id,kind,status,id);
