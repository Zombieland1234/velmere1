-- PASS2121 runtime bridge evidence tables.
-- These are operational proof rows only: no raw customer PII, secrets, or raw provider payloads.

create table if not exists public.velmere_runtime_bridge_evidence_runs (
  id uuid primary key default gen_random_uuid(),
  run_id text unique not null,
  source text not null default 'owner-gate',
  status text not null default 'blocked',
  node_version text,
  npm_version text,
  git_sha text,
  base_url text,
  redacted_env_summary jsonb not null default '{}'::jsonb,
  blocker_count integer not null default 0,
  created_at timestamptz not null default now(),
  constraint velmere_runtime_bridge_evidence_runs_status_check check (status in ('pass','blocked','fail','partial'))
);

create table if not exists public.velmere_runtime_bridge_gate_results (
  id uuid primary key default gen_random_uuid(),
  run_id text not null references public.velmere_runtime_bridge_evidence_runs(run_id) on delete cascade,
  gate_id text not null,
  status text not null,
  command text,
  evidence_artifact text,
  blocker_reason text,
  created_at timestamptz not null default now(),
  unique(run_id, gate_id),
  constraint velmere_runtime_bridge_gate_results_status_check check (status in ('pass','blocked','fail','skipped'))
);

alter table public.velmere_runtime_bridge_evidence_runs enable row level security;
alter table public.velmere_runtime_bridge_gate_results enable row level security;
create index if not exists velmere_runtime_bridge_runs_status_idx on public.velmere_runtime_bridge_evidence_runs(status, created_at desc);
create index if not exists velmere_runtime_bridge_gate_results_run_idx on public.velmere_runtime_bridge_gate_results(run_id, gate_id);

create or replace view public.velmere_runtime_bridge_latest_status as
select
  r.run_id,
  r.source,
  r.status,
  r.blocker_count,
  r.created_at,
  jsonb_agg(jsonb_build_object('gate', g.gate_id, 'status', g.status, 'artifact', g.evidence_artifact, 'blocker', g.blocker_reason) order by g.gate_id) as gates
from public.velmere_runtime_bridge_evidence_runs r
left join public.velmere_runtime_bridge_gate_results g on g.run_id = r.run_id
group by r.run_id, r.source, r.status, r.blocker_count, r.created_at;

comment on table public.velmere_runtime_bridge_evidence_runs is 'PASS2121 runtime bridge proof runs. Redacted gate evidence only.';
comment on table public.velmere_runtime_bridge_gate_results is 'PASS2121 per-gate proof results. No PII, secrets, or raw provider payloads.';
comment on view public.velmere_runtime_bridge_latest_status is 'PASS2121 owner-safe release status view for evidence gates.';
