-- PASS36 A102R44P16: normalize legacy payment/human-review queue names into
-- customer-safe automated analysis states. This migration does not enable sale,
-- checkout, human review, certification or production delivery.

begin;

update public.velmere_audit_account_messages
set
  message_status = case
    when message_status in ('payment_pending', 'human_review') then 'analysis_queue'
    else message_status
  end,
  delivery_status = case
    when delivery_status in ('waiting_payment', 'human_review_queue') then 'analysis_queue'
    else delivery_status
  end,
  operator_status = case
    when operator_status = 'human_review' then 'automated_analysis'
    else operator_status
  end,
  updated_at = now()
where message_status in ('payment_pending', 'human_review')
   or delivery_status in ('waiting_payment', 'human_review_queue')
   or operator_status = 'human_review';

create or replace function public.velmere_normalize_audit_analysis_queue_v1()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if new.message_status in ('payment_pending', 'human_review') then
    new.message_status := 'analysis_queue';
  end if;
  if new.delivery_status in ('waiting_payment', 'human_review_queue') then
    new.delivery_status := 'analysis_queue';
  end if;
  if new.operator_status = 'human_review' then
    new.operator_status := 'automated_analysis';
  end if;
  return new;
end;
$$;

revoke all on function public.velmere_normalize_audit_analysis_queue_v1() from public, anon, authenticated;
grant execute on function public.velmere_normalize_audit_analysis_queue_v1() to service_role;

drop trigger if exists velmere_normalize_audit_analysis_queue_v1 on public.velmere_audit_account_messages;
create trigger velmere_normalize_audit_analysis_queue_v1
before insert or update of message_status, delivery_status, operator_status
on public.velmere_audit_account_messages
for each row execute function public.velmere_normalize_audit_analysis_queue_v1();

alter table public.velmere_audit_account_messages
  drop constraint if exists velmere_audit_account_messages_delivery_status_check;
alter table public.velmere_audit_account_messages
  add constraint velmere_audit_account_messages_delivery_status_check
  check (delivery_status in ('queued','delivered_to_account','analysis_queue','ready_for_download')) not valid;
alter table public.velmere_audit_account_messages
  validate constraint velmere_audit_account_messages_delivery_status_check;

alter table public.velmere_audit_account_messages
  drop constraint if exists velmere_audit_account_messages_operator_status_check;
alter table public.velmere_audit_account_messages
  add constraint velmere_audit_account_messages_operator_status_check
  check (operator_status in ('intake','analysis_queue','automated_analysis','needs_evidence','pdf_attached','customer_safe_ready','delivered','blocked_redaction')) not valid;
alter table public.velmere_audit_account_messages
  validate constraint velmere_audit_account_messages_operator_status_check;

alter table public.velmere_audit_account_messages
  drop constraint if exists velmere_audit_account_messages_message_status_check;
alter table public.velmere_audit_account_messages
  add constraint velmere_audit_account_messages_message_status_check
  check (message_status in ('received','queued','analysis_queue','ready','needs_evidence')) not valid;
alter table public.velmere_audit_account_messages
  validate constraint velmere_audit_account_messages_message_status_check;

comment on function public.velmere_normalize_audit_analysis_queue_v1() is
  'Compatibility-only normalization: legacy payment/human-review queue values become analysis_queue/automated_analysis before constraints. It grants no customer-facing human review, sale or checkout entitlement.';

comment on column public.velmere_audit_account_messages.delivery_status is
  'Current customer-safe delivery state. analysis_queue covers automated analysis and internal quality control; no human-review claim.';
comment on column public.velmere_audit_account_messages.operator_status is
  'Current internal processing state. automated_analysis is not a promise of a human reviewer or operator sign-off.';

commit;
