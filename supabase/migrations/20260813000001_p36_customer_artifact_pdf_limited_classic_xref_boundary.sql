begin;

-- P36 deliberately keeps the database boundary narrower than the application
-- parser. PostgreSQL proves only the byte-size/header/terminal-footer and that
-- startxref points to a classic xref token. Catalog/page-tree connectivity and
-- decoded active-name denial remain mandatory in the server-side TypeScript
-- parser before the service-role-only bundle RPC is called.
create or replace function public.velmere_pdf_classic_xref_limited_boundary_v1(
  p_pdf bytea
) returns boolean
language plpgsql
immutable
strict
security invoker
set search_path = public, pg_temp
as $$
declare
  v_length integer := octet_length(p_pdf);
  v_last integer;
  v_eof_start integer;
  v_tail_start integer;
  v_tail text;
  v_match text[];
  v_xref_offset bigint;
  v_version text;
  v_delimiter integer;
begin
  if v_length < 9 or v_length > 8388608 then
    return false;
  end if;
  if substring(p_pdf from 1 for 5) <> decode('255044462d', 'hex') then
    return false;
  end if;
  v_version := convert_from(substring(p_pdf from 6 for 3), 'LATIN1');
  if v_version not in ('1.0','1.1','1.2','1.3','1.4','1.5','1.6','1.7','2.0') then
    return false;
  end if;
  if get_byte(p_pdf, 8) not in (10, 13) then
    return false;
  end if;

  -- Bytea indexes below are zero based. Only PDF whitespace may trail %%EOF.
  v_last := v_length - 1;
  while v_last >= 0 and get_byte(p_pdf, v_last) in (0, 9, 10, 12, 13, 32) loop
    v_last := v_last - 1;
  end loop;
  if v_last < 4 then
    return false;
  end if;
  v_eof_start := v_last - 4;
  if substring(p_pdf from v_eof_start + 1 for 5) <> decode('2525454f46', 'hex') then
    return false;
  end if;

  -- The footer is ASCII by contract. LATIN1 keeps this conversion total even
  -- when the preceding PDF body contains arbitrary binary stream bytes.
  v_tail_start := greatest(0, v_eof_start - 256);
  v_tail := convert_from(
    substring(p_pdf from v_tail_start + 1 for (v_eof_start + 5 - v_tail_start)),
    'LATIN1'
  );
  v_match := regexp_match(
    v_tail,
    'startxref[[:space:]]+([0-9]+)[[:space:]]*%%EOF$'
  );
  if v_match is null or array_length(v_match, 1) <> 1 then
    return false;
  end if;
  begin
    v_xref_offset := v_match[1]::bigint;
  exception when others then
    return false;
  end;
  if v_xref_offset <= 0 or v_xref_offset + 4 >= v_eof_start then
    return false;
  end if;
  if substring(p_pdf from v_xref_offset::integer + 1 for 4) <> decode('78726566', 'hex') then
    return false;
  end if;
  v_delimiter := get_byte(p_pdf, v_xref_offset::integer + 4);
  if v_delimiter not in (0, 9, 10, 12, 13, 32) then
    return false;
  end if;
  return true;
end;
$$;

revoke all on function public.velmere_pdf_classic_xref_limited_boundary_v1(bytea)
  from public, anon, authenticated, service_role;

-- NOT VALID avoids claiming that pre-existing durable rows were replayed in
-- this source-only environment. PostgreSQL still enforces the constraint for
-- every new row. A later database migration may VALIDATE it only after a real
-- durable replay has been executed and recorded.
alter table public.velmere_customer_artifact_pdf_blobs
  drop constraint if exists velmere_customer_artifact_pdf_limited_classic_xref_check,
  add constraint velmere_customer_artifact_pdf_limited_classic_xref_check
    check (public.velmere_pdf_classic_xref_limited_boundary_v1(pdf_bytes))
    not valid;

-- Preserve the write topology: the application cannot bypass the atomic,
-- security-definer bundle RPC with a direct service-role table insert.
revoke insert, update, delete on table public.velmere_customer_artifact_pdf_blobs
  from anon, authenticated, service_role;
revoke insert, update, delete on table public.velmere_customer_artifact_snapshots
  from anon, authenticated, service_role;

comment on function public.velmere_pdf_classic_xref_limited_boundary_v1(bytea) is
  'P36 limited DB byte boundary only: size/header/terminal EOF/startxref-to-classic-xref. Not a PDF parser and grants no Catalog/page-tree/active-content or deployed DB credit.';
comment on constraint velmere_customer_artifact_pdf_limited_classic_xref_check
  on public.velmere_customer_artifact_pdf_blobs is
  'P36 NOT VALID for historical rows; enforced on new inserts. Full passive-PDF validation remains server-side before the service-role-only atomic RPC.';

commit;
