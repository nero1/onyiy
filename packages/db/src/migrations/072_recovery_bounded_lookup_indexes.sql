CREATE INDEX chain_checkpoint_latest_idx ON public.chain_checkpoints(asset_id,created_at DESC,id DESC);
CREATE INDEX chain_recovery_latest_idx ON public.chain_recovery_runs(checkpoint_id,created_at DESC,id DESC);
CREATE INDEX recovery_outflow_event_idx ON public.recovery_outflows(asset_id,tx_hash,event_index);
CREATE INDEX crypto_obligation_treasury_lineage_idx ON public.crypto_obligations(asset_id,treasury_sender,id);
