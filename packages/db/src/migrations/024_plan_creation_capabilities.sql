-- Dedicated admin plan services create disabled plans/version snapshots and
-- their closed manifest policy. No DELETE or monetary-history update is granted.
GRANT INSERT ON public.plans,public.plan_versions,public.x_manifest TO gw_service;
