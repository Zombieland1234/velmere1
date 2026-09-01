-- PASS2637: Live release-board write receipt + public-safe view for RLS regression.
-- This migration intentionally exposes only redacted receipt fields. It must never include
-- service-role traces, anon keys, JWT claims, raw PostgREST bodies, private refs,
-- operator notes, raw provider payloads or raw artifact payloads.

create or replace view public.velmere_audit_release_evidence_board_public_receipts as
select
  id,
  report_id,
  account_id,
  release_board_version,
  release_board_hash,
  customer_status,
  storage_readiness,
  launch_blocking_count,
  pdf_blocking_count,
  advanced_blocking_count,
  next_safe_action,
  created_at,
  supersedes_board_id,
  jsonb_build_object(
    'artifactPointers', jsonb_array_length(coalesce(artifact_pointer_manifest, '[]'::jsonb)),
    'unredactedPayloadStored', false,
    'privateRefsStoredOnPublicBoard', false,
    'pass2637PublicSafe', true
  ) as public_receipt_summary
from public.velmere_audit_release_evidence_boards;

alter view public.velmere_audit_release_evidence_board_public_receipts set (security_invoker = true);

grant select on public.velmere_audit_release_evidence_board_public_receipts to authenticated;

-- Explicitly keep anonymous users away from the public receipt view until an account/session
-- owner binding exists. Owner-scoped customer reads should go through authenticated session/RLS.
revoke all on public.velmere_audit_release_evidence_board_public_receipts from anon;
