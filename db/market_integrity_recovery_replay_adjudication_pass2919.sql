-- PASS2919 Recovery Replay Adjudication / Public Recovery Decision Gate
-- Escrow reopen after downgrade cannot promote itself. Independent replay and customer acknowledgement are mandatory.

create table if not exists market_integrity_recovery_replay_adjudication_gates (
  id text primary key,
  created_at timestamptz not null default now(),
  pass integer not null check (pass = 2919),
  previous_recovery_escrow_digest_sha256 text not null,
  independent_recovery_replay_matrix_sha256 text not null,
  customer_acknowledgement_packet_sha256 text not null,
  shield_recovery_replay_receipt_sha256 text not null,
  realmarkets_recovery_replay_receipt_sha256 text not null,
  pdf_tier_recovery_replay_receipt_sha256 text not null,
  payment_entitlement_recovery_replay_receipt_sha256 text not null,
  provider_freshness_recovery_replay_receipt_sha256 text not null,
  public_recovery_decision_sha256 text not null,
  append_only_recovery_decision_history_sha256 text not null,
  production_decision text not null default 'NO_GO',
  recovery_replay_adjudication_status text not null default 'NO_GO_RECOVERY_REPLAY_ADJUDICATION_REQUIRED',
  customer_acknowledgement_status text not null default 'NO_GO_CUSTOMER_ACKNOWLEDGEMENT_REQUIRED',
  public_recovery_decision_status text not null default 'NO_GO_PUBLIC_RECOVERY_DECISION_REQUIRED',
  can_promote_recovery_escrow_directly boolean not null default false,
  can_show_green_badge boolean not null default false,
  can_claim_world_class_live boolean not null default false,
  can_hide_customer_acknowledgement boolean not null default false,
  can_skip_independent_recovery_replay boolean not null default false,
  check (production_decision = 'NO_GO'),
  check (recovery_replay_adjudication_status = 'NO_GO_RECOVERY_REPLAY_ADJUDICATION_REQUIRED'),
  check (customer_acknowledgement_status = 'NO_GO_CUSTOMER_ACKNOWLEDGEMENT_REQUIRED'),
  check (public_recovery_decision_status = 'NO_GO_PUBLIC_RECOVERY_DECISION_REQUIRED'),
  check (can_promote_recovery_escrow_directly = false),
  check (can_show_green_badge = false),
  check (can_claim_world_class_live = false),
  check (can_hide_customer_acknowledgement = false),
  check (can_skip_independent_recovery_replay = false)
);

create or replace view pass2919_no_recovery_promotion_without_replay_adjudication as
select
  id,
  recovery_replay_adjudication_status,
  customer_acknowledgement_status,
  public_recovery_decision_status,
  can_promote_recovery_escrow_directly,
  can_show_green_badge,
  can_claim_world_class_live
from market_integrity_recovery_replay_adjudication_gates
where production_decision = 'NO_GO'
  and can_promote_recovery_escrow_directly = false
  and can_show_green_badge = false
  and can_claim_world_class_live = false;
