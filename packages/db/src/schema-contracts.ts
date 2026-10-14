/** Static DDL descriptors verified against the forward-migrated owner catalog.
 * sql.raw is restricted to these committed definitions, never request data.
 * SQL migrations remain authoritative for RLS, functions, triggers and FK timing. */
import {sql} from 'drizzle-orm';
import {check,index,uniqueIndex} from 'drizzle-orm/pg-core';
const checks:Record<string,readonly {name:string;expression:string}[]>={
  "abuse_signals": [
    {
      "name": "abuse_signals_category_check",
      "expression": "(category = 'payment_proof_failure'::text)"
    },
    {
      "name": "abuse_signals_source_key_check",
      "expression": "(length(source_key) = 64)"
    }
  ],
  "alert_deliveries": [
    {
      "name": "alert_deliveries_occurrence_check",
      "expression": "(occurrence > 0)"
    },
    {
      "name": "alert_deliveries_payload_hash_check",
      "expression": "((payload_hash IS NULL) OR (length(payload_hash) = 64))"
    },
    {
      "name": "alert_deliveries_status_check",
      "expression": "(status = ANY (ARRAY['pending'::text, 'sending'::text, 'delivered'::text, 'failed'::text, 'cancelled'::text]))"
    }
  ],
  "appeals": [
    {
      "name": "appeals_body_check",
      "expression": "((length(body) >= 1) AND (length(body) <= 2000))"
    },
    {
      "name": "appeals_revision_check",
      "expression": "(revision > 0)"
    },
    {
      "name": "appeals_status_check",
      "expression": "(status = ANY (ARRAY['open'::text, 'resolved'::text, 'dismissed'::text]))"
    }
  ],
  "assets": [
    {
      "name": "assets_environment_check",
      "expression": "(environment = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text]))"
    }
  ],
  "auth_factors": [
    {
      "name": "auth_factors_last_step_check",
      "expression": "(last_step >= '-1'::integer)"
    },
    {
      "name": "auth_factors_secret_cipher_check",
      "expression": "((length(secret_cipher) >= 60) AND (length(secret_cipher) <= 512))"
    }
  ],
  "auth_flows": [
    {
      "name": "auth_flows_check",
      "expression": "(expires_at > created_at)"
    },
    {
      "name": "auth_flows_nonce_hash_check",
      "expression": "(length(nonce_hash) = 64)"
    },
    {
      "name": "auth_flows_state_hash_check",
      "expression": "(length(state_hash) = 64)"
    },
    {
      "name": "auth_flows_verifier_cipher_check",
      "expression": "((length(verifier_cipher) >= 60) AND (length(verifier_cipher) <= 512))"
    }
  ],
  "auth_recovery_codes": [
    {
      "name": "auth_recovery_codes_code_hash_check",
      "expression": "(length(code_hash) = 64)"
    }
  ],
  "auth_refresh_tokens": [
    {
      "name": "auth_refresh_tokens_check",
      "expression": "(expires_at > created_at)"
    },
    {
      "name": "auth_refresh_tokens_token_hash_check",
      "expression": "(length(token_hash) = 64)"
    }
  ],
  "auth_sessions": [
    {
      "name": "auth_sessions_access_hash_check",
      "expression": "(length(access_hash) = 64)"
    },
    {
      "name": "auth_sessions_check",
      "expression": "((access_expires_at > created_at) AND (idle_expires_at > created_at) AND (absolute_expires_at > created_at))"
    },
    {
      "name": "auth_sessions_csrf_hash_check",
      "expression": "(length(csrf_hash) = 64)"
    },
    {
      "name": "auth_sessions_session_version_check",
      "expression": "(session_version > 0)"
    }
  ],
  "auth_totp_replays": [
    {
      "name": "auth_totp_replays_time_step_check",
      "expression": "(time_step >= 0)"
    }
  ],
  "bot_challenges": [
    {
      "name": "bot_challenges_environment_check",
      "expression": "(environment = ANY (ARRAY['simulation'::text, 'testnet'::text]))"
    },
    {
      "name": "bot_challenges_provider_check",
      "expression": "(provider = ANY (ARRAY['dummy'::text, 'turnstile'::text]))"
    },
    {
      "name": "bot_challenges_surface_check",
      "expression": "(surface = ANY (ARRAY['consent'::text, 'suspicious_checkout'::text]))"
    }
  ],
  "bot_token_uses": [
    {
      "name": "bot_token_uses_environment_check",
      "expression": "(environment = ANY (ARRAY['simulation'::text, 'testnet'::text]))"
    },
    {
      "name": "bot_token_uses_token_hash_check",
      "expression": "(length(token_hash) = 64)"
    }
  ],
  "chain_checkpoints": [
    {
      "name": "chain_checkpoints_binding_fingerprint_check",
      "expression": "(length(binding_fingerprint) = 64)"
    },
    {
      "name": "chain_checkpoints_configuration_hash_check",
      "expression": "(length(configuration_hash) = 64)"
    },
    {
      "name": "chain_checkpoints_height_check",
      "expression": "(height >= (0)::numeric)"
    },
    {
      "name": "chain_checkpoints_proof_reference_check",
      "expression": "((length(proof_reference) >= 5) AND (length(proof_reference) <= 200))"
    },
    {
      "name": "chain_checkpoints_treasury_fingerprint_check",
      "expression": "(length(treasury_fingerprint) = 64)"
    }
  ],
  "chain_fee_claims": [
    {
      "name": "chain_fee_claims_account_setup_base_units_check",
      "expression": "(account_setup_base_units >= (0)::numeric)"
    },
    {
      "name": "chain_fee_claims_chain_check",
      "expression": "(chain = ANY (ARRAY['eth'::text, 'bnb'::text, 'sol'::text, 'tron'::text]))"
    },
    {
      "name": "chain_fee_claims_environment_check",
      "expression": "(environment = 'testnet'::text)"
    },
    {
      "name": "chain_fee_claims_network_fee_base_units_check",
      "expression": "(network_fee_base_units >= (0)::numeric)"
    }
  ],
  "chain_observations": [
    {
      "name": "chain_observations_event_index_check",
      "expression": "((event_index >= '-1'::integer) AND (event_index <= 1000))"
    },
    {
      "name": "chain_observations_rounds_check",
      "expression": "((rounds >= 0) AND (rounds <= 2880))"
    },
    {
      "name": "chain_observations_status_check",
      "expression": "(status = ANY (ARRAY['pending'::text, 'done'::text, 'review'::text]))"
    }
  ],
  "chain_recovery_runs": [
{
    "name": "recovery_balance_witness_check",
    "expression": "((balance_witness IS NULL) OR (((jsonb_typeof(balance_witness) = 'object'::text) AND ((balance_witness ->> 'format'::text) = 'gw-finalized-balance-v1'::text) AND ((balance_witness ->> 'checkpoint_id'::text) = (checkpoint_id)::text) AND ((balance_witness ->> 'binding_fingerprint'::text) = binding_fingerprint) AND ((balance_witness ->> 'height'::text) = (through_height)::text) AND ((length((balance_witness ->> 'asset_key'::text)) >= 1) AND (length((balance_witness ->> 'asset_key'::text)) <= 30)) AND ((length((balance_witness ->> 'address'::text)) >= 1) AND (length((balance_witness ->> 'address'::text)) <= 128)) AND ((length((balance_witness ->> 'block_hash'::text)) >= 1) AND (length((balance_witness ->> 'block_hash'::text)) <= 100)) AND ((balance_witness ->> 'amount_base_units'::text) ~ '^(0|[1-9][0-9]{0,77})$'::text) AND ((balance_witness - ARRAY['format'::text, 'asset_key'::text, 'checkpoint_id'::text, 'binding_fingerprint'::text, 'address'::text, 'height'::text, 'block_hash'::text, 'amount_base_units'::text]) = '{}'::jsonb)) IS TRUE))"
},
    {
      "name": "chain_recovery_runs_binding_fingerprint_check",
      "expression": "(length(binding_fingerprint) = 64)"
    },
    {
      "name": "chain_recovery_runs_check",
      "expression": "(cursor_height <= through_height)"
    },
    {
      "name": "chain_recovery_runs_incoming_count_check",
      "expression": "(incoming_count >= 0)"
    },
    {
      "name": "chain_recovery_runs_outgoing_count_check",
      "expression": "(outgoing_count >= 0)"
    },
    {
      "name": "chain_recovery_runs_revision_check",
      "expression": "(revision >= 0)"
    },
    {
      "name": "chain_recovery_runs_state_check",
      "expression": "(state = ANY (ARRAY['scanning'::text, 'review'::text, 'reconciled'::text]))"
    },
    {
      "name": "recovery_progress_shape",
      "expression": "((scan_progress IS NULL) OR ((jsonb_typeof(scan_progress) = 'object'::text) AND (octet_length((scan_progress)::text) <= 16384) AND (scan_progress ?& ARRAY['stage'::text, 'cursor'::text]) AND (jsonb_typeof((scan_progress -> 'stage'::text)) = 'string'::text) AND ((scan_progress ->> 'stage'::text) = ANY (ARRAY['discover'::text, 'verify'::text, 'book'::text, 'known_next'::text, 'known_index'::text, 'known_settle'::text, 'known_expiry'::text, 'balance'::text])) AND (jsonb_typeof((scan_progress -> 'cursor'::text)) = 'object'::text) AND ((scan_progress -> 'cursor'::text) ?& ARRAY['height'::text, 'transaction'::text, 'event'::text]) AND (jsonb_typeof(((scan_progress -> 'cursor'::text) -> 'height'::text)) = 'string'::text) AND (((scan_progress -> 'cursor'::text) ->> 'height'::text) ~ '^(0|[1-9][0-9]{0,77})$'::text) AND ((((scan_progress -> 'cursor'::text) ->> 'height'::text))::numeric = (cursor_height + (1)::numeric)) AND (jsonb_typeof(((scan_progress -> 'cursor'::text) -> 'transaction'::text)) = 'number'::text) AND (((scan_progress -> 'cursor'::text) ->> 'transaction'::text) ~ '^(0|[1-9][0-9]{0,5})$'::text) AND ((((scan_progress -> 'cursor'::text) ->> 'transaction'::text))::integer <= 100000) AND (jsonb_typeof(((scan_progress -> 'cursor'::text) -> 'event'::text)) = 'number'::text) AND (((scan_progress -> 'cursor'::text) ->> 'event'::text) ~ '^(0|[1-9][0-9]{0,5})$'::text) AND ((((scan_progress -> 'cursor'::text) ->> 'event'::text))::integer <= 100000)))"
    }
  ],
  "chain_scan_pages": [
    {
      "name": "chain_scan_pages_check1",
      "expression": "((incoming_count >= 0) AND (outgoing_count >= 0))"
    },
    {
      "name": "chain_scan_pages_evidence_hash_check",
      "expression": "(length(evidence_hash) = 64)"
    },
    {
      "name": "scan_page_height_order",
      "expression": "(from_height <= through_height)"
    }
  ],
  "crypto_events": [
    {
      "name": "crypto_events_amount_base_units_check",
      "expression": "(amount_base_units >= (0)::numeric)"
    },
    {
      "name": "crypto_events_environment_check",
      "expression": "(environment = 'testnet'::text)"
    },
    {
      "name": "crypto_events_event_index_check",
      "expression": "(event_index >= 0)"
    },
    {
      "name": "crypto_events_status_check",
      "expression": "(status = ANY (ARRAY['confirmed'::text, 'credited'::text, 'exception'::text, 'reorged'::text]))"
    }
  ],
  "crypto_invoices": [
    {
      "name": "crypto_invoices_environment_check",
      "expression": "(environment = 'testnet'::text)"
    },
    {
      "name": "crypto_invoices_expected_base_units_check",
      "expression": "(expected_base_units > (0)::numeric)"
    },
    {
      "name": "crypto_invoices_registry_hash_check",
      "expression": "(length(registry_hash) = 64)"
    },
    {
      "name": "crypto_invoices_status_check",
      "expression": "(status = ANY (ARRAY['quoted'::text, 'submitted'::text, 'credited'::text, 'exception'::text, 'expired'::text, 'cancelled'::text]))"
    },
    {
      "name": "crypto_invoices_usd_reference_check",
      "expression": "(usd_reference > (0)::numeric)"
    }
  ],
  "crypto_obligations": [
    {
      "name": "crypto_obligations_charge_base_units_check",
      "expression": "(charge_base_units >= (0)::numeric)"
    },
    {
      "name": "crypto_obligations_check",
      "expression": "((net_base_units + charge_base_units) = gross_base_units)"
    },
    {
      "name": "crypto_obligations_configuration_hash_check",
      "expression": "(length(configuration_hash) = 64)"
    },
    {
      "name": "crypto_obligations_environment_check",
      "expression": "(environment = 'testnet'::text)"
    },
    {
      "name": "crypto_obligations_gross_base_units_check",
      "expression": "(gross_base_units > (0)::numeric)"
    },
    {
      "name": "crypto_obligations_kind_check",
      "expression": "(kind = ANY (ARRAY['withdrawal'::text, 'business'::text, 'refund'::text, 'sweep'::text, 'recovery'::text, 'unallocated_refund'::text]))"
    },
    {
      "name": "crypto_obligations_native_fee_quote_check",
      "expression": "(native_fee_quote >= (0)::numeric)"
    },
    {
      "name": "crypto_obligations_net_base_units_check",
      "expression": "(net_base_units > (0)::numeric)"
    },
    {
      "name": "crypto_obligations_registry_hash_check",
      "expression": "(length(registry_hash) = 64)"
    },
    {
      "name": "crypto_obligations_request_hash_check",
      "expression": "(length(request_hash) = 64)"
    },
    {
      "name": "crypto_obligations_status_check",
      "expression": "(status = ANY (ARRAY['quoted'::text, 'held'::text, 'approved'::text, 'signing'::text, 'broadcast'::text, 'settled'::text, 'awaiting_requote'::text, 'exception'::text, 'cancelled'::text]))"
    },
    {
      "name": "crypto_obligations_treasury_fingerprint_check",
      "expression": "(length(treasury_fingerprint) = 64)"
    }
  ],
  "crypto_reorg_resolutions": [
    {
      "name": "crypto_reorg_resolutions_block_height_check",
      "expression": "(block_height >= (0)::numeric)"
    },
    {
      "name": "crypto_reorg_resolutions_evidence_hash_check",
      "expression": "(length(evidence_hash) = 64)"
    },
    {
      "name": "crypto_reorg_resolutions_reason_check",
      "expression": "((length(reason) >= 10) AND (length(reason) <= 500))"
    }
  ],
  "crypto_reorg_reviews": [
    {
      "name": "crypto_reorg_reviews_amount_base_units_check",
      "expression": "(amount_base_units > (0)::numeric)"
    },
    {
      "name": "crypto_reorg_reviews_evidence_hash_check",
      "expression": "(length(evidence_hash) = 64)"
    },
    {
      "name": "crypto_reorg_reviews_reason_check",
      "expression": "((length(reason) >= 10) AND (length(reason) <= 500))"
    },
    {
      "name": "crypto_reorg_reviews_revision_check",
      "expression": "((revision >= 1) AND (revision <= 1000000))"
    },
    {
      "name": "native_review_anchor_height",
      "expression": "(anchor_height >= (0)::numeric)"
    }
  ],
  "crypto_submissions": [
    {
      "name": "crypto_submissions_event_index_check",
      "expression": "((event_index >= '-1'::integer) AND (event_index <= 1000))"
    }
  ],
  "cycles": [
    {
      "name": "cycles_status_check",
      "expression": "(status = ANY (ARRAY['active'::text, 'completed'::text, 'exception'::text]))"
    }
  ],
  "data_exports": [
    {
      "name": "data_exports_check",
      "expression": "(expires_at > created_at)"
    },
    {
      "name": "data_exports_check1",
      "expression": "(((status = 'building'::text) AND (completed_at IS NULL)) OR ((status <> 'building'::text) AND (completed_at IS NOT NULL)))"
    },
    {
      "name": "data_exports_error_code_check",
      "expression": "(error_code = ANY (ARRAY['LIMIT_EXCEEDED'::text, 'ACCOUNT_RESTRICTED'::text, 'BUILD_FAILED'::text]))"
    },
    {
      "name": "data_exports_page_check",
      "expression": "((page >= 0) AND (page <= 10000))"
    },
    {
      "name": "data_exports_section_check",
      "expression": "((section >= 0) AND (section <= 12))"
    },
    {
      "name": "data_exports_status_check",
      "expression": "(status = ANY (ARRAY['building'::text, 'ready'::text, 'failed'::text, 'expired'::text]))"
    },
    {
      "name": "data_exports_total_bytes_check",
      "expression": "((total_bytes >= 0) AND (total_bytes <= 52428800))"
    }
  ],
  "database_binding_nonce": [
    {
      "name": "database_binding_nonce_singleton_check",
      "expression": "singleton"
    }
  ],
  "deployment_binding_challenges": [
    {
      "name": "deployment_binding_challenges_environment_check",
      "expression": "(environment = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text]))"
    }
  ],
  "environment_instances": [
    {
      "name": "environment_instances_environment_check",
      "expression": "(environment = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text]))"
    }
  ],
  "export_chunks": [
    {
      "name": "export_chunks_byte_count_check",
      "expression": "((byte_count >= 0) AND (byte_count <= 1048576))"
    },
    {
      "name": "export_chunks_cipher_check",
      "expression": "(octet_length(cipher) <= 1400000)"
    },
    {
      "name": "export_chunks_part_check",
      "expression": "((part >= 0) AND (part <= 10000))"
    },
    {
      "name": "export_chunks_row_count_check",
      "expression": "((row_count >= 0) AND (row_count <= 100))"
    },
    {
      "name": "export_chunks_sha256_check",
      "expression": "(length(sha256) = 64)"
    }
  ],
  "financial_reconciliation_results": [
    {
      "name": "financial_reconciliation_results_environment_check",
      "expression": "(environment = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text]))"
    },
    {
      "name": "financial_reconciliation_results_result_check",
      "expression": "((jsonb_typeof(result) = 'object'::text) AND (octet_length((result)::text) <= 131072))"
    }
  ],
  "gift_invoices": [
    {
      "name": "gift_invoice_amount_check",
      "expression": "((expected_base_units > (0)::numeric) AND (actual_base_units >= (0)::numeric) AND (refundable_base_units >= (0)::numeric))"
    },
    {
      "name": "gift_invoice_environment_check",
      "expression": "((environment = 'simulation'::text) AND (chain_id = 'giv'::text))"
    },
    {
      "name": "gift_invoice_status_check",
      "expression": "(status = ANY (ARRAY['quoted'::text, 'submitted'::text, 'credited'::text, 'exception'::text, 'failed'::text, 'expired'::text]))"
    }
  ],
  "help_articles": [
    {
      "name": "help_articles_body_check",
      "expression": "((length(body) >= 1) AND (length(body) <= 20000))"
    },
    {
      "name": "help_articles_locale_check",
      "expression": "(locale = ANY (ARRAY['en'::text, 'fr'::text]))"
    },
    {
      "name": "help_articles_slug_check",
      "expression": "(slug ~ '^[a-z0-9][a-z0-9-]{0,79}$'::text)"
    },
    {
      "name": "help_articles_title_check",
      "expression": "((length(title) >= 1) AND (length(title) <= 200))"
    },
    {
      "name": "help_articles_version_check",
      "expression": "(version > 0)"
    }
  ],
  "jobs": [
    {
      "name": "jobs_attempts_check",
      "expression": "(attempts >= 0)"
    },
    {
      "name": "jobs_completion_shape",
      "expression": "(((status = ANY (ARRAY['done'::text, 'dead_letter'::text])) AND (completed_at IS NOT NULL)) OR ((status <> ALL (ARRAY['done'::text, 'dead_letter'::text])) AND (completed_at IS NULL)))"
    },
    {
      "name": "jobs_environment_check",
      "expression": "(environment = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text]))"
    },
    {
      "name": "jobs_kind_check",
      "expression": "(kind = ANY (ARRAY['notification'::text, 'financial_reconciliation'::text, 'operational_cleanup'::text, 'own_export'::text, 'chain_observation'::text, 'privacy_redaction'::text]))"
    },
    {
      "name": "jobs_last_error_code_check",
      "expression": "(last_error_code = ANY (ARRAY['TRANSIENT_FAILURE'::text, 'INVALID_JOB'::text, 'LEASE_EXPIRED'::text, 'PERMANENT_FAILURE'::text]))"
    },
    {
      "name": "jobs_lease_generation_check",
      "expression": "((lease_generation >= 0) AND (lease_generation <= 1000000))"
    },
    {
      "name": "jobs_lease_shape",
      "expression": "(((status = 'running'::text) AND (lease_token IS NOT NULL) AND (lease_until IS NOT NULL)) OR ((status <> 'running'::text) AND (lease_token IS NULL) AND (lease_until IS NULL)))"
    },
    {
      "name": "jobs_payload_check",
      "expression": "((jsonb_typeof(payload) = 'object'::text) AND (octet_length((payload)::text) <= 8192))"
    },
    {
      "name": "jobs_redacted_payload_hash_check",
      "expression": "((redacted_payload_hash IS NULL) OR (length(redacted_payload_hash) = 64))"
    },
    {
      "name": "jobs_retry_limit_check",
      "expression": "((retry_limit >= 1) AND (retry_limit <= 1000000))"
    },
    {
      "name": "jobs_status_check",
      "expression": "(status = ANY (ARRAY['pending'::text, 'running'::text, 'done'::text, 'retry_wait'::text, 'dead_letter'::text]))"
    }
  ],
  "ledger_accounts": [
    {
      "name": "ledger_accounts_normal_side_check",
      "expression": "(normal_side = ANY (ARRAY['debit'::text, 'credit'::text]))"
    },
    {
      "name": "ledger_accounts_owner_type_check",
      "expression": "(owner_type = ANY (ARRAY['user'::text, 'platform'::text, 'system'::text]))"
    }
  ],
  "ledger_postings": [
    {
      "name": "ledger_postings_amount_base_units_check",
      "expression": "(amount_base_units > (0)::numeric)"
    },
    {
      "name": "ledger_postings_direction_check",
      "expression": "(direction = ANY (ARRAY['debit'::text, 'credit'::text]))"
    }
  ],
  "liability_recoveries": [
    {
      "name": "liability_recoveries_confirmation_hash_check",
      "expression": "((confirmation_hash IS NULL) OR (length(confirmation_hash) = 64))"
    },
    {
      "name": "liability_recoveries_statement_hash_check",
      "expression": "(length(statement_hash) = 64)"
    }
  ],
  "maintenance_results": [
    {
      "name": "maintenance_result_bounds",
      "expression": "((nonces_deleted <= batch_limit) AND (runs_deleted <= batch_limit) AND ((NOT held) OR ((nonces_deleted = 0) AND (runs_deleted = 0) AND (NOT more_possible))))"
    },
    {
      "name": "maintenance_results_batch_limit_check",
      "expression": "((batch_limit >= 1) AND (batch_limit <= 100))"
    },
    {
      "name": "maintenance_results_environment_check",
      "expression": "(environment = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text]))"
    },
    {
      "name": "maintenance_results_lease_generation_check",
      "expression": "((lease_generation >= 1) AND (lease_generation <= 1000000))"
    },
    {
      "name": "maintenance_results_nonces_deleted_check",
      "expression": "((nonces_deleted >= 0) AND (nonces_deleted <= 100))"
    },
    {
      "name": "maintenance_results_page_number_check",
      "expression": "((page_number >= 0) AND (page_number <= 1000000))"
    },
    {
      "name": "maintenance_results_runs_deleted_check",
      "expression": "((runs_deleted >= 0) AND (runs_deleted <= 100))"
    }
  ],
  "native_reserve_inflows": [
    {
      "name": "native_reserve_inflows_amount_base_units_check",
      "expression": "(amount_base_units > (0)::numeric)"
    },
    {
      "name": "native_reserve_inflows_environment_check",
      "expression": "(environment = 'testnet'::text)"
    },
    {
      "name": "native_reserve_inflows_event_index_check",
      "expression": "(event_index >= 0)"
    },
    {
      "name": "native_reserve_inflows_request_hash_check",
      "expression": "(length(request_hash) = 64)"
    },
    {
      "name": "native_reserve_inflows_statement_hash_check",
      "expression": "(length(statement_hash) = 64)"
    }
  ],
  "notifications": [
    {
      "name": "notifications_redacted_body_hash_check",
      "expression": "((redacted_body_hash IS NULL) OR (length(redacted_body_hash) = 64))"
    }
  ],
  "operational_alerts": [
    {
      "name": "operational_alerts_environment_check",
      "expression": "(environment = ANY (ARRAY['simulation'::text, 'testnet'::text]))"
    },
    {
      "name": "operational_alerts_escalation_step_check",
      "expression": "(escalation_step >= 0)"
    },
    {
      "name": "operational_alerts_occurrence_check",
      "expression": "(occurrence > 0)"
    },
    {
      "name": "operational_alerts_severity_check",
      "expression": "(severity = ANY (ARRAY['P1'::text, 'P2'::text, 'P3'::text, 'INFO'::text]))"
    },
    {
      "name": "operational_alerts_status_check",
      "expression": "(status = ANY (ARRAY['open'::text, 'acknowledged'::text, 'resolved'::text]))"
    }
  ],
  "operational_diagnostics": [
    {
      "name": "operational_diagnostics_environment_check",
      "expression": "(environment = ANY (ARRAY['simulation'::text, 'testnet'::text]))"
    },
    {
      "name": "operational_diagnostics_snapshot_check",
      "expression": "(octet_length((snapshot)::text) <= 8192)"
    }
  ],
  "outbox": [
    {
      "name": "outbox_environment_check",
      "expression": "(environment = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text]))"
    },
    {
      "name": "outbox_kind_check",
      "expression": "(kind = ANY (ARRAY['notification'::text, 'financial_reconciliation'::text, 'operational_cleanup'::text, 'own_export'::text, 'chain_observation'::text, 'privacy_redaction'::text]))"
    },
    {
      "name": "outbox_payload_check",
      "expression": "((jsonb_typeof(payload) = 'object'::text) AND (octet_length((payload)::text) <= 8192))"
    },
    {
      "name": "outbox_redacted_payload_hash_check",
      "expression": "((redacted_payload_hash IS NULL) OR (length(redacted_payload_hash) = 64))"
    }
  ],
  "plans": [
    {
      "name": "plans_revision_check",
      "expression": "(revision > 0)"
    },
    {
      "name": "plans_status_check",
      "expression": "(status = ANY (ARRAY['disabled'::text, 'scheduled'::text, 'active'::text, 'paused'::text, 'retired'::text]))"
    }
  ],
  "price_quotes": [
    {
      "name": "price_quotes_fingerprint_check",
      "expression": "(length(fingerprint) = 64)"
    }
  ],
  "provider_quota_reports": [
    {
      "name": "provider_quota_reports_binding_fingerprint_check",
      "expression": "(length(binding_fingerprint) = 64)"
    },
    {
      "name": "provider_quota_reports_capacity_check",
      "expression": "(capacity > (0)::numeric)"
    },
    {
      "name": "provider_quota_reports_environment_check",
      "expression": "(environment = ANY (ARRAY['simulation'::text, 'testnet'::text]))"
    },
    {
      "name": "provider_quota_reports_proof_reference_check",
      "expression": "((length(proof_reference) >= 5) AND (length(proof_reference) <= 200))"
    },
    {
      "name": "provider_quota_reports_provider_check",
      "expression": "(provider = ANY (ARRAY['postgres'::text, 'vercel'::text, 'cache'::text, 'rpc'::text]))"
    },
    {
      "name": "provider_quota_reports_revision_check",
      "expression": "(revision > 0)"
    },
    {
      "name": "provider_quota_reports_used_check",
      "expression": "(used >= (0)::numeric)"
    }
  ],
  "public_statistics": [
    {
      "name": "public_statistics_environment_check",
      "expression": "(environment = ANY (ARRAY['simulation'::text, 'testnet'::text]))"
    },
    {
      "name": "public_statistics_members_check",
      "expression": "(members >= 0)"
    },
    {
      "name": "public_statistics_pending_registrations_check",
      "expression": "(pending_registrations >= 0)"
    },
    {
      "name": "public_statistics_settled_member_usd_check",
      "expression": "(settled_member_usd >= (0)::numeric)"
    }
  ],
  "queue_entries": [
    {
      "name": "queue_entries_kind_check",
      "expression": "(kind = ANY (ARRAY['member'::text, 'bootstrap'::text]))"
    },
    {
      "name": "queue_entries_priority_revision_check",
      "expression": "(priority_revision > 0)"
    },
    {
      "name": "queue_entries_status_check",
      "expression": "(status = ANY (ARRAY['waiting'::text, 'fully_allocated'::text, 'fulfilled'::text, 'removed'::text]))"
    },
    {
      "name": "queue_entry_ticket_bounds",
      "expression": "((ticket >= 1) AND (ticket <= '1099511627775'::bigint) AND ((priority_ticket IS NULL) OR ((priority_ticket >= 1) AND (priority_ticket <= '1099511627775'::bigint))))"
    }
  ],
  "queue_partitions": [
    {
      "name": "queue_partition_ticket_bounds",
      "expression": "((next_ticket >= 1) AND (next_ticket <= '1099511627776'::bigint) AND ((next_priority_ticket >= 1) AND (next_priority_ticket <= '1099511627776'::bigint)))"
    }
  ],
  "queue_rank_nodes": [
    {
      "name": "queue_rank_nodes_lane_check",
      "expression": "(lane = ANY (ARRAY['display'::text, 'fifo'::text, 'priority'::text]))"
    },
    {
      "name": "queue_rank_nodes_node_index_check",
      "expression": "((node_index >= 1) AND (node_index <= '1099511627776'::bigint))"
    },
    {
      "name": "queue_rank_nodes_waiting_count_check",
      "expression": "((waiting_count >= 0) AND (waiting_count <= '1099511627775'::bigint))"
    }
  ],
  "rate_limits": [
    {
      "name": "rate_limits_environment_check",
      "expression": "(environment = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text]))"
    },
    {
      "name": "rate_limits_key_hash_check",
      "expression": "(length(key_hash) = 64)"
    },
    {
      "name": "rate_limits_used_check",
      "expression": "(used > 0)"
    },
    {
      "name": "rate_limits_window_seconds_check",
      "expression": "((window_seconds >= 1) AND (window_seconds <= 1000000))"
    }
  ],
  "receipt_allocations": [
    {
      "name": "receipt_allocations_amount_base_units_check",
      "expression": "(amount_base_units > (0)::numeric)"
    },
    {
      "name": "receipt_allocations_environment_check",
      "expression": "(environment = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text]))"
    },
    {
      "name": "receipt_allocations_lineage_status_check",
      "expression": "(lineage_status = ANY (ARRAY['captured'::text, 'legacy_linked'::text]))"
    },
    {
      "name": "receipt_allocations_receiver_kind_check",
      "expression": "(receiver_kind = ANY (ARRAY['member'::text, 'bootstrap'::text, 'empty_queue_business'::text]))"
    },
    {
      "name": "receipt_beneficiary_shape",
      "expression": "(((receiver_kind = 'member'::text) AND (beneficiary_user_id IS NOT NULL) AND (beneficiary_user_id <> payer_user_id) AND (recipient_role IS NULL)) OR ((receiver_kind = ANY (ARRAY['bootstrap'::text, 'empty_queue_business'::text])) AND (beneficiary_user_id IS NULL) AND (recipient_role IS NOT NULL) AND (recipient_role = ANY (ARRAY['developer'::text, 'marketing'::text, 'platform'::text, 'custom_bootstrap'::text]))))"
    },
    {
      "name": "receipt_slot_shape",
      "expression": "(((receiver_kind = 'empty_queue_business'::text) AND (receiver_entry_id IS NULL) AND (slot_index IS NULL)) OR ((receiver_kind = ANY (ARRAY['member'::text, 'bootstrap'::text])) AND (receiver_entry_id IS NOT NULL) AND (((lineage_status = 'captured'::text) AND (slot_index IS NOT NULL) AND (slot_index > 0)) OR ((lineage_status = 'legacy_linked'::text) AND (slot_index IS NULL)))))"
    }
  ],
  "recovery_outflow_resolutions": [
    {
      "name": "recovery_outflow_resolutions_check",
      "expression": "((account_setup_base_units >= (0)::numeric) AND (account_setup_base_units <= native_fee_base_units))"
    },
    {
      "name": "recovery_outflow_resolutions_evidence_hash_check",
      "expression": "(length(evidence_hash) = 64)"
    },
    {
      "name": "recovery_outflow_resolutions_native_fee_base_units_check",
      "expression": "(native_fee_base_units >= (0)::numeric)"
    },
    {
      "name": "recovery_outflow_resolutions_principal_base_units_check",
      "expression": "(principal_base_units >= (0)::numeric)"
    }
  ],
  "recovery_outflows": [
    {
      "name": "recovery_outflows_amount_base_units_check",
      "expression": "(amount_base_units >= (0)::numeric)"
    },
    {
      "name": "recovery_outflows_evidence_hash_check",
      "expression": "(length(evidence_hash) = 64)"
    },
    {
      "name": "recovery_outflows_status_check",
      "expression": "(status = ANY (ARRAY['matched'::text, 'review'::text]))"
    }
  ],
  "recovery_view_caps": [
    {
      "name": "recovery_view_caps_token_hash_check",
      "expression": "(length(token_hash) = 64)"
    }
  ],
  "reports": [
    {
      "name": "reports_body_check",
      "expression": "((length(body) >= 1) AND (length(body) <= 2000))"
    },
    {
      "name": "reports_reason_hash_check",
      "expression": "(length(reason_hash) = 64)"
    },
    {
      "name": "reports_revision_check",
      "expression": "(revision > 0)"
    },
    {
      "name": "reports_status_check",
      "expression": "(status = ANY (ARRAY['open'::text, 'reviewing'::text, 'resolved'::text, 'dismissed'::text, 'appealed'::text]))"
    }
  ],
  "scheduler_nonces": [
    {
      "name": "scheduler_nonces_environment_check",
      "expression": "(environment = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text]))"
    }
  ],
  "scheduler_runs": [
    {
      "name": "scheduler_runs_environment_check",
      "expression": "(environment = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text]))"
    },
    {
      "name": "scheduler_runs_lease_generation_check",
      "expression": "((lease_generation >= 1) AND (lease_generation <= 1000000))"
    }
  ],
  "schema_migrations": [
    {
      "name": "schema_migrations_sha256_check",
      "expression": "(length(sha256) = 64)"
    }
  ],
  "signed_attempts": [
    {
      "name": "signed_attempt_actual_fee_check",
      "expression": "((actual_native_fee IS NULL) OR (actual_native_fee >= (0)::numeric))"
    },
    {
      "name": "signed_attempt_no_execution_fee",
      "expression": "((status <> ALL (ARRAY['expired'::text, 'superseded'::text])) OR (actual_native_fee = (0)::numeric))"
    },
    {
      "name": "signed_attempt_terminal_shape",
      "expression": "((status <> ALL (ARRAY['confirmed'::text, 'failed'::text, 'expired'::text, 'superseded'::text])) OR ((actual_native_fee IS NOT NULL) AND (confirmed_at IS NOT NULL)))"
    },
    {
      "name": "signed_attempts_attempt_check",
      "expression": "(attempt > 0)"
    },
    {
      "name": "signed_attempts_configuration_hash_check",
      "expression": "(length(configuration_hash) = 64)"
    },
    {
      "name": "signed_attempts_environment_check",
      "expression": "(environment = 'testnet'::text)"
    },
    {
      "name": "signed_attempts_intent_hash_check",
      "expression": "(length(intent_hash) = 64)"
    },
    {
      "name": "signed_attempts_native_fee_cap_check",
      "expression": "(native_fee_cap >= (0)::numeric)"
    },
    {
      "name": "signed_attempts_signed_at_height_check",
      "expression": "(signed_at_height >= (0)::numeric)"
    },
    {
      "name": "signed_attempts_status_check",
      "expression": "(status = ANY (ARRAY['signed'::text, 'broadcast'::text, 'confirmed'::text, 'failed'::text, 'expired'::text, 'unknown'::text, 'superseded'::text]))"
    }
  ],
  "signer_dispatch_cursor": [
    {
      "name": "signer_dispatch_cursor_check",
      "expression": "((last_created_at IS NULL) = (last_id IS NULL))"
    },
    {
      "name": "signer_dispatch_cursor_singleton_check",
      "expression": "singleton"
    }
  ],
  "signer_heartbeats": [
    {
      "name": "signer_heartbeats_chain_check",
      "expression": "(chain = ANY (ARRAY['eth'::text, 'bnb'::text, 'sol'::text, 'tron'::text]))"
    },
    {
      "name": "signer_heartbeats_configuration_hash_check",
      "expression": "(length(configuration_hash) = 64)"
    },
    {
      "name": "signer_heartbeats_environment_check",
      "expression": "(environment = 'testnet'::text)"
    },
    {
      "name": "signer_heartbeats_treasury_fingerprint_check",
      "expression": "(length(treasury_fingerprint) = 64)"
    }
  ],
  "signer_reservations": [
    {
      "name": "signer_reservations_native_fee_reserved_check",
      "expression": "(native_fee_reserved >= (0)::numeric)"
    },
    {
      "name": "signer_reservations_principal_usd_micros_check",
      "expression": "(principal_usd_micros >= (0)::numeric)"
    }
  ],
  "signer_states": [
    {
      "name": "signer_states_environment_check",
      "expression": "(environment = 'testnet'::text)"
    },
    {
      "name": "signer_states_next_nonce_check",
      "expression": "(next_nonce >= (0)::numeric)"
    },
    {
      "name": "signer_states_treasury_fingerprint_check",
      "expression": "(length(treasury_fingerprint) = 64)"
    }
  ],
  "simulation_incoming_controls": [
    {
      "name": "simulation_incoming_controls_actual_base_units_check",
      "expression": "(actual_base_units >= (0)::numeric)"
    },
    {
      "name": "simulation_incoming_controls_environment_check",
      "expression": "(environment = 'simulation'::text)"
    },
    {
      "name": "simulation_incoming_controls_outcome_check",
      "expression": "(outcome = ANY (ARRAY['reject'::text, 'under'::text, 'over'::text, 'late'::text, 'delay'::text]))"
    },
    {
      "name": "simulation_incoming_controls_reason_check",
      "expression": "((length(reason) >= 5) AND (length(reason) <= 500))"
    }
  ],
  "simulation_incoming_events": [
    {
      "name": "simulation_incoming_events_environment_check",
      "expression": "(environment = 'simulation'::text)"
    },
    {
      "name": "simulation_incoming_events_outcome_check",
      "expression": "(outcome = ANY (ARRAY['exact'::text, 'reject'::text, 'under'::text, 'over'::text, 'late'::text, 'review_reject'::text]))"
    }
  ],
  "simulation_incoming_refunds": [
    {
      "name": "simulation_incoming_refunds_amount_base_units_check",
      "expression": "(amount_base_units > (0)::numeric)"
    },
    {
      "name": "simulation_incoming_refunds_environment_check",
      "expression": "(environment = 'simulation'::text)"
    },
    {
      "name": "simulation_incoming_refunds_reason_check",
      "expression": "((length(reason) >= 5) AND (length(reason) <= 500))"
    }
  ],
  "simulation_reorg_resolutions": [
    {
      "name": "simulation_reorg_resolutions_environment_check",
      "expression": "(environment = 'simulation'::text)"
    },
    {
      "name": "simulation_reorg_resolutions_reason_check",
      "expression": "((length(reason) >= 5) AND (length(reason) <= 500))"
    }
  ],
  "simulation_reorg_reviews": [
    {
      "name": "simulation_reorg_reviews_affected_user_ids_check",
      "expression": "((cardinality(affected_user_ids) >= 1) AND (cardinality(affected_user_ids) <= 3))"
    },
    {
      "name": "simulation_reorg_reviews_amount_base_units_check",
      "expression": "(amount_base_units > (0)::numeric)"
    },
    {
      "name": "simulation_reorg_reviews_environment_check",
      "expression": "(environment = 'simulation'::text)"
    },
    {
      "name": "simulation_reorg_reviews_reason_check",
      "expression": "((length(reason) >= 5) AND (length(reason) <= 500))"
    },
    {
      "name": "simulation_reorg_reviews_revision_check",
      "expression": "((revision >= 1) AND (revision <= 1000000))"
    },
    {
      "name": "simulation_reorg_reviews_settled_outgoing_exposure_check",
      "expression": "(settled_outgoing_exposure >= (0)::numeric)"
    }
  ],
  "simulation_withdrawal_controls": [
    {
      "name": "simulation_withdrawal_controls_environment_check",
      "expression": "(environment = 'simulation'::text)"
    },
    {
      "name": "simulation_withdrawal_controls_outcome_check",
      "expression": "(outcome = ANY (ARRAY['hold'::text, 'reject'::text]))"
    },
    {
      "name": "simulation_withdrawal_controls_reason_check",
      "expression": "((length(reason) >= 5) AND (length(reason) <= 500))"
    }
  ],
  "slug_redirects": [
    {
      "name": "slug_redirects_locale_check",
      "expression": "(locale = ANY (ARRAY['en'::text, 'fr'::text]))"
    },
    {
      "name": "slug_redirects_old_slug_check",
      "expression": "(old_slug ~ '^[a-z0-9][a-z0-9-]{0,79}$'::text)"
    }
  ],
  "unallocated_inflows": [
    {
      "name": "unallocated_inflows_amount_base_units_check",
      "expression": "(amount_base_units > (0)::numeric)"
    },
    {
      "name": "unallocated_inflows_block_height_check",
      "expression": "(block_height >= (0)::numeric)"
    },
    {
      "name": "unallocated_inflows_environment_check",
      "expression": "(environment = 'testnet'::text)"
    },
    {
      "name": "unallocated_inflows_event_index_check",
      "expression": "(event_index >= 0)"
    },
    {
      "name": "unallocated_inflows_treasury_fingerprint_check",
      "expression": "(length(treasury_fingerprint) = 64)"
    }
  ],
  "unallocated_refund_claims": [
    {
      "name": "unallocated_refund_claims_proof_reference_check",
      "expression": "((length(proof_reference) >= 5) AND (length(proof_reference) <= 200))"
    },
    {
      "name": "unallocated_refund_claims_signature_hash_check",
      "expression": "(length(signature_hash) = 64)"
    },
    {
      "name": "unallocated_refund_claims_statement_hash_check",
      "expression": "(length(statement_hash) = 64)"
    }
  ],
  "user_identities": [
    {
      "name": "user_identities_provider_check",
      "expression": "(provider = ANY (ARRAY['google'::text, 'simulation'::text]))"
    },
    {
      "name": "user_identities_subject_check",
      "expression": "((length(subject) >= 1) AND (length(subject) <= 255))"
    }
  ],
  "users": [
    {
      "name": "users_account_revision_check",
      "expression": "(account_revision > 0)"
    },
    {
      "name": "users_age_minimum_accepted_check",
      "expression": "((age_minimum_accepted >= 1) AND (age_minimum_accepted <= 120))"
    },
    {
      "name": "users_role_check",
      "expression": "(role = ANY (ARRAY['member'::text, 'moderator'::text, 'admin'::text]))"
    },
    {
      "name": "users_session_version_check",
      "expression": "(session_version > 0)"
    },
    {
      "name": "users_status_check",
      "expression": "(status = ANY (ARRAY['pending_consent'::text, 'active'::text, 'suspended'::text, 'banned'::text, 'deactivated'::text, 'deleted'::text]))"
    },
    {
      "name": "users_suspension_previous_status_check",
      "expression": "(suspension_previous_status = ANY (ARRAY['active'::text, 'deactivated'::text]))"
    }
  ],
  "wallet_challenges": [
    {
      "name": "wallet_challenges_chain_check",
      "expression": "(chain = ANY (ARRAY['eth'::text, 'bnb'::text, 'sol'::text, 'tron'::text]))"
    },
    {
      "name": "wallet_challenges_environment_check",
      "expression": "(environment = 'testnet'::text)"
    }
  ],
  "wallet_links": [
    {
      "name": "wallet_links_revision_check",
      "expression": "(revision > 0)"
    }
  ],
  "withdrawals": [
    {
      "name": "withdrawals_status_check",
      "expression": "(status = ANY (ARRAY['quoted'::text, 'held'::text, 'awaiting_requote'::text, 'approved'::text, 'sending'::text, 'settled'::text, 'cancelled'::text, 'exception'::text]))"
    }
  ],
  "worker_requests": [
    {
      "name": "worker_requests_body_hash_check",
      "expression": "(length(body_hash) = 64)"
    },
    {
      "name": "worker_requests_environment_check",
      "expression": "(environment = 'testnet'::text)"
    }
  ],
  "x_manifest": [
    {
      "name": "x_manifest_scope_check",
      "expression": "(scope = ANY (ARRAY['public'::text, 'private'::text, 'staff'::text]))"
    }
  ]
};
const indexes:Record<string,readonly {name:string;method:string;unique:boolean;columns:readonly string[];predicate:string|null}[]>={
  "abuse_signals": [
    {
      "name": "abuse_user_time_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "user_id",
        "created_at",
        "id"
      ],
      "predicate": null
    }
  ],
  "appeals": [
    {
      "name": "appeal_open_case_unique",
      "method": "btree",
      "unique": true,
      "columns": [
        "report_id"
      ],
      "predicate": "(status = 'open'::text)"
    },
    {
      "name": "staff_appeal_status_cursor_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "status",
        "id"
      ],
      "predicate": null
    }
  ],
  "audit_events": [
    {
      "name": "audit_request_correlation_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "request_id",
        "id"
      ],
      "predicate": "(request_id IS NOT NULL)"
    }
  ],
  "auth_flows": [
    {
      "name": "auth_flow_expiry_cleanup_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "expires_at",
        "state_hash"
      ],
      "predicate": null
    }
  ],
  "auth_refresh_tokens": [
    {
      "name": "auth_refresh_expiry_cleanup_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "expires_at",
        "token_hash"
      ],
      "predicate": null
    },
    {
      "name": "auth_refresh_session_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "session_id"
      ],
      "predicate": null
    }
  ],
  "auth_sessions": [
    {
      "name": "auth_session_expiry_cleanup_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "absolute_expires_at",
        "id"
      ],
      "predicate": null
    },
    {
      "name": "auth_sessions_user_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "user_id",
        "id"
      ],
      "predicate": null
    }
  ],
  "auth_totp_replays": [
    {
      "name": "auth_totp_cleanup_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "accepted_at",
        "factor_id",
        "time_step"
      ],
      "predicate": null
    }
  ],
  "bot_challenges": [
    {
      "name": "bot_challenge_expiry_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "expires_at",
        "id"
      ],
      "predicate": null
    }
  ],
  "bot_token_uses": [
    {
      "name": "bot_token_expiry_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "expires_at",
        "token_hash"
      ],
      "predicate": null
    }
  ],
  "chain_checkpoints": [
    {
      "name": "chain_checkpoint_latest_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "asset_id",
        "created_at DESC",
        "id DESC"
      ],
      "predicate": null
    },
    {
      "name": "checkpoint_treasury_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "treasury_fingerprint",
        "asset_id",
        "created_at",
        "id"
      ],
      "predicate": null
    }
  ],
  "chain_fee_claims": [
    {
      "name": "chain_fee_identity_idx",
      "method": "btree",
      "unique": true,
      "columns": [
        "environment",
        "chain",
        "network",
        "tx_hash"
      ],
      "predicate": null
    }
  ],
  "chain_observations": [
    {
      "name": "chain_observation_due_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "status",
        "next_observation_at",
        "id"
      ],
      "predicate": null
    }
  ],
  "chain_recovery_runs": [
    {
      "name": "chain_recovery_latest_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "checkpoint_id",
        "created_at DESC",
        "id DESC"
      ],
      "predicate": null
    },
    {
      "name": "staff_recovery_current_cursor_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "id"
      ],
      "predicate": "(state <> 'reconciled'::text)"
    }
  ],
  "crypto_events": [
    {
      "name": "crypto_event_invoice_cursor_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "invoice_id",
        "id"
      ],
      "predicate": null
    }
  ],
  "crypto_invoices": [
    {
      "name": "crypto_invoice_open_idx",
      "method": "btree",
      "unique": true,
      "columns": [
        "user_id",
        "plan_version_id"
      ],
      "predicate": "(status = ANY (ARRAY['quoted'::text, 'submitted'::text]))"
    },
    {
      "name": "crypto_invoice_owned_cursor_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "user_id",
        "id"
      ],
      "predicate": null
    }
  ],
  "crypto_obligations": [
    {
      "name": "crypto_obligation_owned_cursor_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "user_id",
        "id"
      ],
      "predicate": null
    },
    {
      "name": "crypto_obligation_treasury_lineage_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "asset_id",
        "treasury_sender",
        "id"
      ],
      "predicate": null
    },
    {
      "name": "native_receipt_owned_cursor_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "user_id",
        "kind",
        "status",
        "id"
      ],
      "predicate": null
    },
    {
      "name": "obligation_pending_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "status",
        "created_at",
        "id"
      ],
      "predicate": null
    },
    {
      "name": "unallocated_refund_source_status_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "asset_id",
        "status",
        "split_part(business_key, ':'::text, 2)"
      ],
      "predicate": "((kind = 'unallocated_refund'::text) AND (split_part(business_key, ':'::text, 1) = 'unallocated-refund'::text))"
    }
  ],
  "crypto_reorg_reviews": [
    {
      "name": "crypto_reorg_asset_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "asset_id",
        "event_id",
        "revision"
      ],
      "predicate": null
    }
  ],
  "cycles": [
    {
      "name": "cycle_owned_cursor_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "user_id",
        "id"
      ],
      "predicate": null
    },
    {
      "name": "cycle_user_history_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "user_id",
        "created_at",
        "id"
      ],
      "predicate": null
    },
    {
      "name": "uniq_active_cycle_per_user_plan",
      "method": "btree",
      "unique": true,
      "columns": [
        "user_id",
        "plan_version_id"
      ],
      "predicate": "(status = ANY (ARRAY['active'::text, 'exception'::text]))"
    }
  ],
  "data_exports": [
    {
      "name": "data_export_expiry_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "expires_at",
        "id"
      ],
      "predicate": null
    },
    {
      "name": "data_export_owned_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "user_id",
        "created_at",
        "id"
      ],
      "predicate": null
    }
  ],
  "deployment_binding_challenges": [
    {
      "name": "binding_challenge_expiry_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "expires_at",
        "id"
      ],
      "predicate": null
    }
  ],
  "financial_reconciliation_results": [
    {
      "name": "reconciliation_history_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "environment",
        "checked_at",
        "id"
      ],
      "predicate": null
    }
  ],
  "gift_invoices": [
    {
      "name": "gift_invoice_history_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "user_id",
        "created_at",
        "id"
      ],
      "predicate": null
    },
    {
      "name": "gift_invoice_open_unique",
      "method": "btree",
      "unique": true,
      "columns": [
        "user_id",
        "plan_version_id"
      ],
      "predicate": "(status = ANY (ARRAY['quoted'::text, 'submitted'::text]))"
    },
    {
      "name": "gift_invoice_owned_cursor_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "user_id",
        "id"
      ],
      "predicate": null
    }
  ],
  "help_articles": [
{
    "name": "help_published_en_search_idx",
    "method": "gin",
    "unique": false,
    "predicate": "(published AND (locale = 'en'::text))",
    "columns": [
        "(setweight(to_tsvector('english'::regconfig, title), 'A'::\"char\") || setweight(to_tsvector('english'::regconfig, body), 'B'::\"char\"))"
    ]
},
{
    "name": "help_published_fr_search_idx",
    "method": "gin",
    "unique": false,
    "predicate": "(published AND (locale = 'fr'::text))",
    "columns": [
        "(setweight(to_tsvector('french'::regconfig, title), 'A'::\"char\") || setweight(to_tsvector('french'::regconfig, body), 'B'::\"char\"))"
    ]
},
{
    "name": "help_published_title_trigram_idx",
    "method": "gin",
    "unique": false,
    "predicate": "published",
    "columns": [
        "lower(title) gin_trgm_ops"
    ]
},
    {
      "name": "help_public_locale_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "locale",
        "published",
        "slug"
      ],
      "predicate": null
    }
  ],
  "jobs": [
    {
      "name": "job_redaction_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "(payload ->> 'user_id'::text)",
        "id"
      ],
      "predicate": "((kind = 'notification'::text) AND (redacted_at IS NULL))"
    },
    {
      "name": "job_request_correlation_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "request_id",
        "id"
      ],
      "predicate": "(request_id IS NOT NULL)"
    },
    {
      "name": "jobs_due_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "environment",
        "status",
        "due_at",
        "id"
      ],
      "predicate": null
    },
    {
      "name": "jobs_expired_lease_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "environment",
        "lease_until",
        "id"
      ],
      "predicate": "(status = 'running'::text)"
    },
    {
      "name": "staff_job_current_cursor_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "environment",
        "id"
      ],
      "predicate": "(status <> 'done'::text)"
    },
    {
      "name": "staff_job_history_cursor_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "environment",
        "id"
      ],
      "predicate": null
    },
    {
      "name": "staff_job_status_cursor_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "environment",
        "status",
        "id"
      ],
      "predicate": null
    }
  ],
  "ledger_accounts": [
    {
      "name": "ledger_accounts_owner_unique",
      "method": "btree",
      "unique": true,
      "columns": [
        "asset_id",
        "owner_type",
        "COALESCE(owner_id, '00000000-0000-0000-0000-000000000000'::uuid)",
        "purpose"
      ],
      "predicate": null
    },
    {
      "name": "ledger_user_page_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "owner_id",
        "asset_id",
        "id"
      ],
      "predicate": "(owner_type = 'user'::text)"
    }
  ],
  "ledger_journals": [
    {
      "name": "ledger_business_prefix_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "business_key text_pattern_ops"
      ],
      "predicate": null
    },
    {
      "name": "ledger_giv_uuid_nonce_unique",
      "method": "btree",
      "unique": true,
      "columns": [
        "lower(business_key)"
      ],
      "predicate": "(business_key ~ '^gift-in:[0-9a-fA-F-]{36}:[0-9a-fA-F-]{36}$|^allocation:gift:[0-9a-fA-F-]{36}:[0-9a-fA-F-]{36}:'::text)"
    },
    {
      "name": "native_hold_obligation_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "(metadata ->> 'obligation_id'::text)"
      ],
      "predicate": "(ledger_type = 'PAYOUT_HOLD'::text)"
    }
  ],
  "ledger_postings": [
    {
      "name": "ledger_account_page_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "account_id",
        "id"
      ],
      "predicate": null
    }
  ],
  "maintenance_results": [
    {
      "name": "maintenance_history_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "environment",
        "checked_at",
        "id"
      ],
      "predicate": null
    }
  ],
  "notifications": [
    {
      "name": "notification_redaction_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "user_id",
        "title_key",
        "id"
      ],
      "predicate": "(redacted_at IS NULL)"
    },
    {
      "name": "notification_user_page_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "user_id",
        "id"
      ],
      "predicate": null
    },
    {
      "name": "notifications_delivery_key_unique",
      "method": "btree",
      "unique": true,
      "columns": [
        "delivery_key"
      ],
      "predicate": null
    }
  ],
  "operation_keys": [
    {
      "name": "operation_key_case_lookup",
      "method": "btree",
      "unique": false,
      "columns": [
        "lower(business_key)"
      ],
      "predicate": null
    },
    {
      "name": "operation_staff_uuid_nonce_unique",
      "method": "btree",
      "unique": true,
      "columns": [
        "lower(business_key)"
      ],
      "predicate": "(business_key ~ '^admin-(job-replay|sim-withdrawal|resolve-withdrawal):[0-9a-fA-F-]{36}:[0-9a-fA-F-]{36}$'::text)"
    },
    {
      "name": "operation_uuid_nonce_unique",
      "method": "btree",
      "unique": true,
      "columns": [
        "lower(business_key)"
      ],
      "predicate": "(business_key ~ '^(gift|admin-activate):[0-9a-fA-F-]{36}:[0-9a-fA-F-]{36}$'::text)"
    }
  ],
  "operational_alerts": [
    {
      "name": "alert_claim_priority_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "severity",
        "status",
        "occurrence",
        "id"
      ],
      "predicate": null
    },
    {
      "name": "staff_alert_current_cursor_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "id"
      ],
      "predicate": "(status <> 'resolved'::text)"
    }
  ],
  "outbox": [
    {
      "name": "outbox_pending_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "environment",
        "created_at",
        "id"
      ],
      "predicate": "(dispatched_at IS NULL)"
    },
    {
      "name": "outbox_redaction_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "(payload ->> 'user_id'::text)",
        "id"
      ],
      "predicate": "((kind = 'notification'::text) AND (redacted_at IS NULL))"
    }
  ],
  "plan_versions": [
    {
      "name": "plan_asset_active_unique",
      "method": "btree",
      "unique": true,
      "columns": [
        "plan_id",
        "asset_id"
      ],
      "predicate": "active"
    }
  ],
  "point_events": [
    {
      "name": "point_source_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "source_key",
        "user_id"
      ],
      "predicate": null
    },
    {
      "name": "point_user_page_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "user_id",
        "id"
      ],
      "predicate": null
    }
  ],
  "price_quotes": [
    {
      "name": "price_quote_fingerprint_idx",
      "method": "btree",
      "unique": true,
      "columns": [
        "fingerprint"
      ],
      "predicate": null
    },
    {
      "name": "price_quote_fresh_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "asset_id",
        "observed_at DESC",
        "expires_at"
      ],
      "predicate": null
    }
  ],
  "queue_entries": [
    {
      "name": "queue_cycle_entry_unique",
      "method": "btree",
      "unique": true,
      "columns": [
        "cycle_id"
      ],
      "predicate": "(cycle_id IS NOT NULL)"
    },
    {
      "name": "queue_priority_ticket_unique",
      "method": "btree",
      "unique": true,
      "columns": [
        "partition_id",
        "priority_ticket"
      ],
      "predicate": "((priority_ticket IS NOT NULL) AND (status = 'waiting'::text))"
    },
    {
      "name": "queue_waiting_display_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "partition_id",
        "ticket"
      ],
      "predicate": "(status = 'waiting'::text)"
    },
    {
      "name": "queue_waiting_fifo_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "partition_id",
        "ticket"
      ],
      "predicate": "((status = 'waiting'::text) AND (priority_ticket IS NULL))"
    },
    {
      "name": "queue_waiting_order_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "partition_id",
        "priority_ticket",
        "ticket"
      ],
      "predicate": "(status = 'waiting'::text)"
    },
    {
      "name": "queue_waiting_priority_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "partition_id",
        "priority_ticket",
        "ticket"
      ],
      "predicate": "((status = 'waiting'::text) AND (priority_ticket IS NOT NULL))"
    }
  ],
  "rate_limits": [
    {
      "name": "rate_limit_expiry_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "environment",
        "expires_at",
        "key_hash"
      ],
      "predicate": null
    }
  ],
  "receipt_allocations": [
    {
      "name": "receipt_beneficiary_history_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "beneficiary_user_id",
        "credited_at",
        "id"
      ],
      "predicate": null
    },
    {
      "name": "receipt_receiver_slot_unique",
      "method": "btree",
      "unique": true,
      "columns": [
        "receiver_entry_id",
        "slot_index"
      ],
      "predicate": "(slot_index IS NOT NULL)"
    },
    {
      "name": "receipt_source_cycle_unique",
      "method": "btree",
      "unique": true,
      "columns": [
        "source_cycle_id"
      ],
      "predicate": null
    }
  ],
  "recovery_outflows": [
    {
      "name": "recovery_outflow_event_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "asset_id",
        "tx_hash",
        "event_index"
      ],
      "predicate": null
    },
    {
      "name": "staff_outflow_review_cursor_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "id"
      ],
      "predicate": "(status = 'review'::text)"
    }
  ],
  "recovery_view_caps": [
    {
      "name": "recovery_view_expiry_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "expires_at",
        "id"
      ],
      "predicate": null
    }
  ],
  "reports": [
    {
      "name": "reports_dedupe_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "actor_id",
        "target_id",
        "reason_hash",
        "created_at"
      ],
      "predicate": null
    },
    {
      "name": "reports_status_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "status",
        "created_at",
        "id"
      ],
      "predicate": null
    },
    {
      "name": "staff_report_status_cursor_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "status",
        "id"
      ],
      "predicate": null
    }
  ],
  "scheduler_nonces": [
    {
      "name": "scheduler_nonce_environment_expiry_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "environment",
        "expires_at",
        "id"
      ],
      "predicate": null
    },
    {
      "name": "scheduler_nonce_expiry_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "expires_at",
        "id"
      ],
      "predicate": null
    }
  ],
  "scheduler_runs": [
    {
      "name": "scheduler_runs_completed_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "environment",
        "completed_at",
        "id"
      ],
      "predicate": "(completed_at IS NOT NULL)"
    },
    {
      "name": "scheduler_runs_lease_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "environment",
        "lease_until",
        "id"
      ],
      "predicate": "(completed_at IS NULL)"
    }
  ],
  "signed_attempts": [
    {
      "name": "recovery_known_attempt_order",
      "method": "btree",
      "unique": false,
      "columns": [
        "obligation_id",
        "id"
      ],
      "predicate": null
    }
  ],
  "simulation_reorg_reviews": [
    {
      "name": "reorg_affected_users_idx",
      "method": "gin",
      "unique": false,
      "columns": [
        "affected_user_ids"
      ],
      "predicate": null
    },
    {
      "name": "reorg_partition_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "partition_id",
        "created_at",
        "id"
      ],
      "predicate": null
    },
    {
      "name": "reorg_source_operation_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "source_operation_key"
      ],
      "predicate": null
    }
  ],
  "unallocated_inflows": [
    {
      "name": "unmatched_sender_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "asset_id",
        "sender",
        "created_at",
        "id"
      ],
      "predicate": null
    }
  ],
  "users": [
    {
      "name": "staff_user_status_cursor_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "status",
        "id"
      ],
      "predicate": null
    }
  ],
  "wallet_challenges": [
    {
      "name": "wallet_challenge_expiry_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "expires_at",
        "id"
      ],
      "predicate": null
    }
  ],
  "wallet_links": [
    {
      "name": "wallet_reuse_lookup_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "environment",
        "chain_id",
        "address",
        "user_id"
      ],
      "predicate": null
    }
  ],
  "withdrawals": [
    {
      "name": "withdrawal_owned_cursor_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "user_id",
        "id"
      ],
      "predicate": null
    },
    {
      "name": "withdrawal_uuid_quote_unique",
      "method": "btree",
      "unique": true,
      "columns": [
        "lower(request_key)"
      ],
      "predicate": null
    },
    {
      "name": "withdrawals_user_history_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "user_id",
        "created_at",
        "id"
      ],
      "predicate": null
    }
  ],
  "worker_requests": [
    {
      "name": "worker_request_expiry_idx",
      "method": "btree",
      "unique": false,
      "columns": [
        "expires_at",
        "nonce"
      ],
      "predicate": null
    }
  ]
};
export function contractChecks(table:string){return (checks[table]??[]).map(value=>check(value.name,sql.raw(value.expression)));}
export function contractIndexes(table:string){return (indexes[table]??[]).map(value=>{const [first,...rest]=value.columns;if(!first)throw new Error('INVALID_SCHEMA_CONTRACT');const builder=(value.unique?uniqueIndex(value.name):index(value.name)).using(value.method,sql.raw(first),...rest.map(column=>sql.raw(column)));return value.predicate?builder.where(sql.raw(value.predicate)):builder;});}
