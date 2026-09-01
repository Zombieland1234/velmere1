-- PASS2899 Post-Rollback Recovery Reapproval Gate
-- A revoked release cannot return to GO using old receipts or old operator signatures.

create table if not exists market_integrity_post_rollback_recovery_reapproval_gates (
  id text primary key,
  pass integer not null check (pass = 2899),
  gate text not null check (gate = 'post-rollback-recovery-reapproval'),
  default_production_decision text not null check (default_production_decision = 'NO_GO'),
  default_recovery_decision text not null check (default_recovery_decision = 'NO_GO_RECOVERY_REQUIRED'),
  source_revocation_pass integer not null check (source_revocation_pass = 2898),
  recovery_digest_sha256 text,
  revoked_digest_reuse_forbidden boolean not null default true,
  requires_new_install_receipt boolean not null default true,
  requires_new_typecheck_receipt boolean not null default true,
  requires_new_build_receipt boolean not null default true,
  requires_new_browser_receipts boolean not null default true,
  requires_new_pdf_payment_provider_receipts boolean not null default true,
  requires_new_operator_reapproval_signature boolean not null default true,
  can_claim_worldclass_live boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists pass2899_post_rollback_recovery_reapproval_gate_idx
  on market_integrity_post_rollback_recovery_reapproval_gates (pass, gate, default_recovery_decision);

alter table market_integrity_post_rollback_recovery_reapproval_gates
  add constraint pass2899_no_go_without_new_recovery_receipt_chain
  check (
    default_production_decision = 'NO_GO'
    and default_recovery_decision = 'NO_GO_RECOVERY_REQUIRED'
    and revoked_digest_reuse_forbidden = true
    and requires_new_operator_reapproval_signature = true
    and can_claim_worldclass_live = false
  );
