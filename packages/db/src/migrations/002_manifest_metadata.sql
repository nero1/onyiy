-- Metadata correction only: preserve all configured values and versions.
-- No new table or Data API permission is introduced by this migration.
UPDATE public.x_manifest SET scope = 'staff' WHERE key = 'simulation_policy' AND scope <> 'staff';
UPDATE public.x_manifest SET type = 'json' WHERE type = 'object';
