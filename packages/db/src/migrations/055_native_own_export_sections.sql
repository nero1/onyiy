ALTER TABLE public.data_exports DROP CONSTRAINT IF EXISTS data_exports_section_check;
ALTER TABLE public.data_exports ADD CONSTRAINT data_exports_section_check CHECK(section BETWEEN 0 AND 12);
-- Existing section order0–8 is preserved; native invoice/event/payout sections
-- append9–11. Ready exports keep their existing encrypted parts unchanged.
