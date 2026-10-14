-- Current work and full history paginate independently by immutable identity.
-- Existing native invoice/obligation owned cursor indexes already cover this.
CREATE INDEX IF NOT EXISTS cycle_owned_cursor_idx ON public.cycles(user_id,id);
CREATE INDEX IF NOT EXISTS withdrawal_owned_cursor_idx ON public.withdrawals(user_id,id);
CREATE INDEX IF NOT EXISTS gift_invoice_owned_cursor_idx ON public.gift_invoices(user_id,id);
