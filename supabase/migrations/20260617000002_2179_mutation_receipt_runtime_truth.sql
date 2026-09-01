-- PASS2179 Supabase runtime truth hardening.
-- The table remains server/service-role only. Client roles should not receive direct table access.
-- Runtime proof is: insert a redacted receipt, select it back by receipt_id, compare route/method/payload_hash.

revoke all on table public.velmere_mutation_receipts from anon;
revoke all on table public.velmere_mutation_receipts from authenticated;

grant select, insert on table public.velmere_mutation_receipts to service_role;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'velmere_mutation_receipts_payload_hash_shape_check'
  ) then
    alter table public.velmere_mutation_receipts
      add constraint velmere_mutation_receipts_payload_hash_shape_check
      check (payload_hash ~ '^sha256:[a-f0-9]{32}$');
  end if;
end $$;

comment on table public.velmere_mutation_receipts is 'PASS2179 runtime truth table for redacted mutation receipts. Direct client access revoked; service-role insert/select required for durable proof. Proof compares receipt_id, route, method and payload_hash after read-back.';
