-- Native own-portfolio service uses the existing owner/environment-scoped rank.
GRANT EXECUTE ON FUNCTION public.gw_queue_rank(uuid,text) TO gw_service;
