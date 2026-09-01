-- PASS2869 customer export supervisory tamper incident resolution / archive resume gate
-- Contract only: prepare durable storage for tamper resolution, corrected-index verification and archive resume/refreeze decisions.

create table if not exists market_integrity_customer_export_supervisory_tamper_incident_resolution_archive_resumes (
  id text primary key,
  tamper_incident_case_id text not null,
  resolution_case_id text not null,
  root_cause_hash text not null,
  impact_scope_hash text not null,
  corrected_evidence_index_id text not null,
  corrected_evidence_index_version text not null,
  corrected_evidence_index_hash text not null,
  corrected_index_verification_receipt_id text not null,
  archive_resume_decision text not null check (archive_resume_decision in ('re_seal_and_resume','re_freeze','close_no_change','reject_resume')),
  archive_resume_decision_receipt_id text not null,
  re_freeze_receipt_id text,
  archive_resume_receipt_id text,
  customer_final_notice_receipt_id text,
  regulator_final_notice_receipt_id text,
  auditor_final_notice_receipt_id text,
  regulator_suppression_reason_hash text,
  legal_closure_signoff_receipt_id text not null,
  security_closure_signoff_receipt_id text not null,
  privacy_closure_signoff_receipt_id text not null,
  resolution_payload_hash text not null,
  incident_closure_timeline_hash text not null,
  original_archive_mutated boolean not null default false,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

alter table market_integrity_customer_export_supervisory_tamper_incident_resolution_archive_resumes
  add constraint pass2869_no_original_archive_mutation
  check (original_archive_mutated = false);

alter table market_integrity_customer_export_supervisory_tamper_incident_resolution_archive_resumes
  add constraint pass2869_resume_requires_resume_receipt
  check (archive_resume_decision <> 're_seal_and_resume' or archive_resume_receipt_id is not null);

alter table market_integrity_customer_export_supervisory_tamper_incident_resolution_archive_resumes
  add constraint pass2869_refreeze_requires_refreeze_receipt
  check (archive_resume_decision not in ('re_freeze','reject_resume') or re_freeze_receipt_id is not null);
