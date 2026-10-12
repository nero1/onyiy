-- PostgreSQL SELECT FOR UPDATE needs an UPDATE capability. The immutable
-- chunk trigger rejects every UPDATE, including a no-op; this grants locking only.
GRANT UPDATE(part) ON public.export_chunks TO gw_service;
