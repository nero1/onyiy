-- QUEUE_TICKET_BITS=40: one bounded index update touches at most 41 nodes.
CREATE TABLE IF NOT EXISTS public.queue_rank_nodes (
  partition_id uuid NOT NULL REFERENCES public.queue_partitions(id) ON DELETE RESTRICT,
  lane text NOT NULL CHECK (lane IN ('display','fifo','priority')),
  node_index bigint NOT NULL CHECK (node_index BETWEEN 1 AND 1099511627776),
  waiting_count bigint NOT NULL CHECK (waiting_count BETWEEN 0 AND 1099511627775),
  PRIMARY KEY(partition_id,lane,node_index)
);
ALTER TABLE public.queue_partitions ADD COLUMN IF NOT EXISTS next_priority_ticket bigint NOT NULL DEFAULT 1;
LOCK TABLE public.queue_partitions, public.queue_entries, public.queue_rank_nodes IN ACCESS EXCLUSIVE MODE;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='queue_entry_ticket_bounds' AND conrelid='public.queue_entries'::regclass) THEN
    ALTER TABLE public.queue_entries ADD CONSTRAINT queue_entry_ticket_bounds CHECK (ticket BETWEEN 1 AND 1099511627775 AND (priority_ticket IS NULL OR priority_ticket BETWEEN 1 AND 1099511627775));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='queue_partition_ticket_bounds' AND conrelid='public.queue_partitions'::regclass) THEN
    ALTER TABLE public.queue_partitions ADD CONSTRAINT queue_partition_ticket_bounds CHECK (next_ticket BETWEEN 1 AND 1099511627776 AND next_priority_ticket BETWEEN 1 AND 1099511627776);
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS queue_priority_ticket_unique ON public.queue_entries(partition_id,priority_ticket) WHERE priority_ticket IS NOT NULL AND status='waiting';
CREATE UNIQUE INDEX IF NOT EXISTS queue_cycle_entry_unique ON public.queue_entries(cycle_id) WHERE cycle_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS queue_waiting_display_idx ON public.queue_entries(partition_id,ticket) WHERE status='waiting';
CREATE INDEX IF NOT EXISTS queue_waiting_priority_idx ON public.queue_entries(partition_id,priority_ticket,ticket) WHERE status='waiting' AND priority_ticket IS NOT NULL;
CREATE INDEX IF NOT EXISTS queue_waiting_fifo_idx ON public.queue_entries(partition_id,ticket) WHERE status='waiting' AND priority_ticket IS NULL;
UPDATE public.queue_partitions p SET next_priority_ticket=greatest(p.next_priority_ticket,
  coalesce((SELECT max(priority_ticket)+1 FROM public.queue_entries WHERE partition_id=p.id),1));

-- Rebuild only derived counters under maintenance locks, never financial rows.
DELETE FROM public.queue_rank_nodes;
WITH RECURSIVE contributions(partition_id,lane,node_index) AS (
  SELECT e.partition_id, lane.name, lane.ticket FROM public.queue_entries e
  CROSS JOIN LATERAL (VALUES ('display',e.ticket),
    (CASE WHEN e.priority_ticket IS NULL THEN 'fifo' ELSE 'priority' END,coalesce(e.priority_ticket,e.ticket))) lane(name,ticket)
  WHERE e.status='waiting'
  UNION ALL
  SELECT partition_id,lane,node_index+(node_index & -node_index) FROM contributions
  WHERE node_index+(node_index & -node_index)<=1099511627776
)
INSERT INTO public.queue_rank_nodes(partition_id,lane,node_index,waiting_count)
SELECT partition_id,lane,node_index,count(*) FROM contributions GROUP BY partition_id,lane,node_index;

CREATE OR REPLACE FUNCTION public.gw_rank_delta(partition uuid,lane_name text,ticket bigint,delta integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE node bigint:=ticket;
BEGIN
  IF ticket<1 OR ticket>=1099511627776 OR delta NOT IN (-1,1) THEN RAISE EXCEPTION 'QUEUE_INDEX_INVALID'; END IF;
  WHILE node<=1099511627776 LOOP
    IF delta=-1 THEN
      UPDATE public.queue_rank_nodes SET waiting_count=waiting_count-1 WHERE partition_id=partition AND lane=lane_name AND node_index=node;
      IF NOT FOUND THEN RAISE EXCEPTION 'QUEUE_INDEX_INVALID'; END IF;
    ELSE
      INSERT INTO public.queue_rank_nodes(partition_id,lane,node_index,waiting_count) VALUES(partition,lane_name,node,1)
      ON CONFLICT(partition_id,lane,node_index) DO UPDATE SET waiting_count=queue_rank_nodes.waiting_count+1;
    END IF;
    node:=node+(node & -node);
  END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.gw_queue_rank_maintain()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF TG_OP='UPDATE' AND OLD.status=NEW.status AND OLD.priority_ticket IS NOT DISTINCT FROM NEW.priority_ticket THEN RETURN NEW; END IF;
  PERFORM 1 FROM public.queue_partitions WHERE id=NEW.partition_id FOR UPDATE;
  IF TG_OP='UPDATE' AND OLD.status='waiting' THEN
    PERFORM public.gw_rank_delta(OLD.partition_id,'display',OLD.ticket,-1);
    PERFORM public.gw_rank_delta(OLD.partition_id,CASE WHEN OLD.priority_ticket IS NULL THEN 'fifo' ELSE 'priority' END,coalesce(OLD.priority_ticket,OLD.ticket),-1);
  END IF;
  IF NEW.status='waiting' THEN
    PERFORM public.gw_rank_delta(NEW.partition_id,'display',NEW.ticket,1);
    PERFORM public.gw_rank_delta(NEW.partition_id,CASE WHEN NEW.priority_ticket IS NULL THEN 'fifo' ELSE 'priority' END,coalesce(NEW.priority_ticket,NEW.ticket),1);
  END IF;
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.gw_queue_identity_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'QUEUE_HISTORY_IMMUTABLE'; END IF;
  IF OLD.partition_id<>NEW.partition_id OR OLD.ticket<>NEW.ticket THEN RAISE EXCEPTION 'QUEUE_TICKET_IMMUTABLE'; END IF;
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.gw_queue_sequence_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
  IF NEW.next_ticket<OLD.next_ticket OR NEW.next_priority_ticket<OLD.next_priority_ticket THEN RAISE EXCEPTION 'QUEUE_SEQUENCE_CANNOT_REWIND'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS queue_rank_maintain ON public.queue_entries;
CREATE TRIGGER queue_rank_maintain AFTER INSERT OR UPDATE OF status,priority_ticket ON public.queue_entries
FOR EACH ROW EXECUTE FUNCTION public.gw_queue_rank_maintain();
DROP TRIGGER IF EXISTS queue_identity_guard ON public.queue_entries;
CREATE TRIGGER queue_identity_guard BEFORE UPDATE OR DELETE ON public.queue_entries
FOR EACH ROW EXECUTE FUNCTION public.gw_queue_identity_guard();
DROP TRIGGER IF EXISTS queue_sequence_guard ON public.queue_partitions;
CREATE TRIGGER queue_sequence_guard BEFORE UPDATE ON public.queue_partitions
FOR EACH ROW EXECUTE FUNCTION public.gw_queue_sequence_guard();

CREATE OR REPLACE FUNCTION public.gw_rank_prefix(partition uuid,lane_name text,ticket bigint)
RETURNS bigint LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE node bigint:=ticket; total bigint:=0; amount bigint;
BEGIN
  IF ticket<0 OR ticket>1099511627776 THEN RAISE EXCEPTION 'QUEUE_INDEX_INVALID'; END IF;
  WHILE node>0 LOOP
    SELECT waiting_count INTO amount FROM public.queue_rank_nodes WHERE partition_id=partition AND lane=lane_name AND node_index=node;
    total:=total+coalesce(amount,0); node:=node-(node & -node);
  END LOOP;
  RETURN total;
END $$;
CREATE OR REPLACE FUNCTION public.gw_queue_rank(entry uuid,mode text)
RETURNS bigint LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE item public.queue_entries%ROWTYPE; priority_enabled boolean;
BEGIN
  SELECT e.* INTO item FROM public.queue_entries e
  JOIN public.queue_partitions q ON q.id=e.partition_id JOIN public.plan_versions v ON v.id=q.plan_version_id JOIN public.assets a ON a.id=v.asset_id
  WHERE e.id=entry AND a.environment=current_setting('gw.environment',true);
  IF NOT FOUND OR public.gw_owns(item.beneficiary_user_id) IS NOT TRUE OR item.status<>'waiting' THEN RETURN NULL; END IF;
  IF mode='display' THEN RETURN public.gw_rank_prefix(item.partition_id,'display',item.ticket-1)+1; END IF;
  IF mode<>'serving' OR NOT public.gw_staff_reader() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  SELECT value='true'::jsonb INTO priority_enabled FROM public.x_manifest WHERE key='feature_priority';
  IF priority_enabled IS NULL THEN RAISE EXCEPTION 'CONFIGURATION_INVALID'; END IF;
  IF NOT priority_enabled THEN RETURN public.gw_rank_prefix(item.partition_id,'display',item.ticket-1)+1; END IF;
  IF item.priority_ticket IS NOT NULL THEN RETURN public.gw_rank_prefix(item.partition_id,'priority',item.priority_ticket-1)+1; END IF;
  RETURN public.gw_rank_prefix(item.partition_id,'priority',1099511627776)+public.gw_rank_prefix(item.partition_id,'fifo',item.ticket-1)+1;
END $$;
CREATE OR REPLACE VIEW public.gw_queue_positions WITH (security_barrier=true) AS
SELECT e.id AS entry_id,public.gw_queue_rank(e.id,'display') AS display_position
FROM public.queue_entries e WHERE public.gw_owns(e.beneficiary_user_id) AND e.status='waiting';

-- Supabase Data API grants: internal derived counters; no browser/Data API use.
ALTER TABLE public.queue_rank_nodes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gw_rank_service_read ON public.queue_rank_nodes;
CREATE POLICY gw_rank_service_read ON public.queue_rank_nodes FOR SELECT TO gw_service USING (true);
REVOKE ALL ON public.queue_rank_nodes FROM PUBLIC,gw_read,gw_service;
GRANT SELECT ON public.queue_rank_nodes TO gw_service;
REVOKE ALL ON FUNCTION public.gw_rank_delta(uuid,text,bigint,integer),public.gw_queue_rank_maintain(),public.gw_queue_identity_guard(),public.gw_queue_sequence_guard(),public.gw_rank_prefix(uuid,text,bigint),public.gw_queue_rank(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gw_queue_rank(uuid,text) TO gw_read;
DO $$
DECLARE browser text;
BEGIN
  FOREACH browser IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=browser) THEN
      EXECUTE format('REVOKE ALL ON public.queue_rank_nodes FROM %I',browser);
      EXECUTE format('REVOKE ALL ON FUNCTION public.gw_rank_delta(uuid,text,bigint,integer),public.gw_queue_rank_maintain(),public.gw_queue_identity_guard(),public.gw_queue_sequence_guard(),public.gw_rank_prefix(uuid,text,bigint),public.gw_queue_rank(uuid,text) FROM %I',browser);
    END IF;
  END LOOP;
END $$;
