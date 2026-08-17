\set ON_ERROR_STOP on
insert into public.velmere_audit_intake_cases(case_id,case_ref,request_id,target_hash,tier,status,account_id,entitlement_id,entitlement_required,entitlement_verified,analysis_started)
values ('case-p76','AUD-P76DB01','req-p76','sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','advanced','queued_paid_review','account-p76','ent-p76',true,true,false);

do $$
declare r jsonb; c int;
begin
 r := public.velmere_assign_advanced_audit_reviewer('AUD-P76DB01','optional-qa','assign-p76',1440);
 if not (r->>'ok')::boolean or r->>'state' <> 'queued' then raise exception 'optional_qa_changed_execution:%',r; end if;
 select count(*) into c from public.velmere_audit_case_status_history where case_ref='AUD-P76DB01';
 if c<>0 then raise exception 'optional_qa_entered_customer_history:%',c; end if;
end $$;

do $$
declare r jsonb;
begin
 r:=public.velmere_claim_advanced_audit_worker_lease('AUD-P76DB01','worker-p76','claim-1','lease-token-p76-000000000001',300);
 if not (r->>'ok')::boolean or r->>'state'<>'leased' then raise exception 'claim_failed:%',r; end if;
 r:=public.velmere_settle_advanced_audit_worker_lease('AUD-P76DB01','worker-p76','lease-token-p76-000000000001','retry','transient_provider');
 if not (r->>'ok')::boolean or r->>'state'<>'retry_wait' or (r->>'attemptCount')::int<>1 then raise exception 'retry_settle_failed:%',r; end if;
 update public.velmere_audit_review_orchestration set next_attempt_at=now()-interval '1 second' where case_ref='AUD-P76DB01';
 r:=public.velmere_claim_advanced_audit_worker_lease('AUD-P76DB01','worker-p76','claim-2','lease-token-p76-000000000002',300);
 if not (r->>'ok')::boolean or r->>'state'<>'leased' then raise exception 'reclaim_failed:%',r; end if;
end $$;

do $$
declare r jsonb; c int; ah text; snap jsonb;
begin
 ah:=encode(digest('velmere-account-binding-v1:account-p76','sha256'),'hex');
 snap:=jsonb_build_object('requestId','req-p76','tier','advanced','digest','sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb','sourceReceiptRoot','sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc');
 r:=public.velmere_complete_advanced_audit_with_snapshot('AUD-P76DB01','worker-p76','wrong-lease-token-00000000000','worker_result','report-p76','req-p76',ah,'ent-p76','sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd','sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb','sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc','sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',snap,now());
 if (r->>'ok')::boolean or r->>'error'<>'lease_mismatch' then raise exception 'wrong_lease_not_blocked:%',r; end if;
 select count(*) into c from public.velmere_audit_report_snapshots where case_ref='AUD-P76DB01'; if c<>0 then raise exception 'wrong_lease_reserved_snapshot'; end if;
end $$;

do $$
declare r jsonb; c int; ah text; snap jsonb; h1 record; h2 record;
begin
 ah:=encode(digest('velmere-account-binding-v1:account-p76','sha256'),'hex');
 snap:=jsonb_build_object('requestId','req-p76','tier','advanced','digest','sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb','sourceReceiptRoot','sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc');
 r:=public.velmere_complete_advanced_audit_with_snapshot('AUD-P76DB01','worker-p76','lease-token-p76-000000000002','worker_result','report-p76','req-p76',ah,'ent-p76','sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd','sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb','sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc','sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',snap,now());
 if not (r->>'ok')::boolean or r->>'state'<>'completed' then raise exception 'atomic_complete_failed:%',r; end if;
 select count(*) into c from public.velmere_audit_report_snapshots where case_ref='AUD-P76DB01' and tier='advanced'; if c<>1 then raise exception 'snapshot_count:%',c; end if;
 if exists(select 1 from public.velmere_audit_review_orchestration where case_ref='AUD-P76DB01' and (review_state<>'completed' or worker_principal_hash is not null or lease_token_hash is not null or lease_expires_at is not null)) then raise exception 'review_not_atomically_completed'; end if;
 select * into h1 from public.velmere_audit_case_status_history where case_ref='AUD-P76DB01' order by case_sequence desc limit 1;
 select * into h2 from public.velmere_audit_case_status_history where case_ref='AUD-P76DB01' and case_sequence=h1.case_sequence-1;
 if h1.event_type<>'automation_completed' or h1.queue_lane<>'advanced_automation' or h1.previous_event_hash is distinct from h2.event_hash then raise exception 'history_chain_invalid'; end if;
 r:=public.velmere_complete_advanced_audit_with_snapshot('AUD-P76DB01','worker-p76','lease-token-p76-000000000002','worker_result','report-p76','req-p76',ah,'ent-p76','sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd','sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb','sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc','sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',snap,now());
 if not (r->>'ok')::boolean or not (r->>'idempotent')::boolean then raise exception 'idempotent_repeat_failed:%',r; end if;
 r:=public.velmere_complete_advanced_audit_with_snapshot('AUD-P76DB01','worker-p76','lease-token-p76-000000000002','worker_result','report-p76','req-p76',ah,'ent-p76','sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff','sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb','sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc','sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',snap,now());
 if (r->>'ok')::boolean or r->>'error'<>'audit_report_snapshot_immutable_conflict' then raise exception 'immutable_conflict_not_blocked:%',r; end if;
end $$;

select jsonb_build_object(
 'schemaVersion','velmere.p76.postgres-runtime.v1','status','PASS',
 'reviewState',(select review_state from public.velmere_audit_review_orchestration where case_ref='AUD-P76DB01'),
 'snapshotCount',(select count(*) from public.velmere_audit_report_snapshots where case_ref='AUD-P76DB01'),
 'historyCount',(select count(*) from public.velmere_audit_case_status_history where case_ref='AUD-P76DB01'),
 'historyEvents',(select jsonb_agg(event_type order by case_sequence) from public.velmere_audit_case_status_history where case_ref='AUD-P76DB01'),
 'queueLanes',(select jsonb_agg(queue_lane order by case_sequence) from public.velmere_audit_case_status_history where case_ref='AUD-P76DB01'),
 'humanReviewRequired',false,
 'truthBoundary','Real PostgreSQL transaction proof of the exact P75 migration; not a live production Supabase deployment and no customer FINAL/PDF/right/value/sale credit.'
);
