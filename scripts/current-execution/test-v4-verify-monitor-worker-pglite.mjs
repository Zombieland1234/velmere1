import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const root = process.cwd();
const registryMigration = fs.readFileSync(path.resolve(root,
  "supabase/migrations/20260821000003_v4_verify_continuous_publication_registry.sql"), "utf8");
const monitorMigration = fs.readFileSync(path.resolve(root,
  "supabase/migrations/20260821000007_v4_verify_continuous_monitor_worker.sql"), "utf8");
const db = new PGlite({ extensions: { pgcrypto } });
await db.waitReady;

const sha = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");
const exactDailyMonitoringTtlSeconds = (checkedAt) => {
  const observed = new Date(checkedAt);
  const windowEnd = new Date(Date.UTC(
    observed.getUTCFullYear(),
    observed.getUTCMonth(),
    observed.getUTCDate(),
    3, 59, 0, 0,
  ));
  if (observed.getTime() >= Date.UTC(
    observed.getUTCFullYear(),
    observed.getUTCMonth(),
    observed.getUTCDate(),
    3, 0, 0, 0,
  )) windowEnd.setUTCDate(windowEnd.getUTCDate() + 1);
  return Math.ceil((windowEnd.getTime() - observed.getTime()) / 1000);
};
const checks = [];
const check = (id, condition, detail = null) => checks.push({ id, pass: Boolean(condition), detail });

async function expectFailure(id, action, pattern) {
  await db.exec("begin");
  try {
    await action();
    check(id, false, "unexpected_success");
  } catch (error) {
    const message = String(error?.message ?? error);
    check(id, pattern.test(message), message.slice(0, 800));
  } finally {
    await db.exec("rollback");
  }
}

await db.exec(String.raw`
create extension if not exists pgcrypto;
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;
`);
await db.exec(registryMigration);
await db.exec(monitorMigration);

const appendSql = `select public.velmere_append_verify_publication_event_v1(
  $1::text,$2::text,$3::text,$4::text,$5::text,$6::text,$7::text,$8::text,
  $9::text,$10::text,$11::text,$12::text,$13::text,$14::text,$15::text,
  $16::text,$17::timestamptz,$18::integer,$19::text
) as receipt`;

let blockCursor = 40_000_000;
async function initial(label, visibility = "PRIVATE") {
  blockCursor += 10;
  const publicProofId = `pubidx-${sha(`proof:${label}`).slice(0, 48)}`;
  const address = `0x${sha(`address:${label}`).slice(0, 40)}`;
  const checkedAt = new Date().toISOString();
  const auditedDeploymentDigest = sha(`deployment:${label}`);
  const result = await db.query(appendSql, [
    sha(`initial-idempotency:${label}`), publicProofId, "56", address,
    "INITIAL_VERIFICATION", visibility, `Project ${label}`, `Audit ${label}`,
    `Public verification summary for ${label}.`, "LOW_DETECTED_RISK",
    sha(`report:${label}`), auditedDeploymentDigest, sha(`receipt:${label}`),
    sha(`actor:${label}`), String(blockCursor), `0x${sha(`block:${label}`)}`,
    checkedAt, 89_940, null,
  ]);
  await db.query(`insert into public.velmere_verify_deployment_identity_bindings(
    public_proof_id,initial_event_digest,identity_schema_version,
    deployment_identity_digest,provenance_receipt_digest
  ) values ($1,$2,'velmere.verify-canonical-deployment-identity.v1',$3,$4)`, [
    publicProofId,
    result.rows[0].receipt.eventDigest,
    auditedDeploymentDigest,
    sha(`identity-provenance:${label}`),
  ]);
  return {
    publicProofId,
    address,
    auditedDeploymentDigest,
    blockNumber: blockCursor,
    eventDigest: result.rows[0].receipt.eventDigest,
  };
}

const privateProof = await initial("private-one");

async function claim(token, limit = 1, leaseSeconds = 60) {
  const result = await db.query(
    `select * from public.velmere_claim_verify_monitor_jobs_v1($1::text,$2::integer,$3::integer)`,
    [token, limit, leaseSeconds],
  );
  return result.rows;
}

async function settle(args) {
  const monitoringTtlSeconds = args.outcome === "FAILURE"
    ? null
    : exactDailyMonitoringTtlSeconds(args.checkedAt);
  const result = await db.query(
    `select public.velmere_settle_verify_monitor_job_v1(
      $1::uuid,$2::text,$3::text,$4::text,$5::text,$6::text,$7::text,$8::text,
      $9::timestamptz,$10::integer,$11::text
    ) as receipt`,
    [
      args.jobId, args.token, args.expectedEventDigest, args.outcome,
      args.observedDeploymentDigest ?? null, args.verificationReceiptDigest,
      args.checkedBlockNumber ?? null, args.checkedBlockHash ?? null,
      args.checkedAt, monitoringTtlSeconds, args.failureCode ?? null,
    ],
  );
  return result.rows[0].receipt;
}

const privileges = await db.query(`select
  has_table_privilege('anon','public.velmere_verify_monitor_jobs','select') as anon_table,
  has_table_privilege('authenticated','public.velmere_verify_monitor_jobs','select') as authenticated_table,
  has_function_privilege('anon','public.velmere_claim_verify_monitor_jobs_v1(text,integer,integer,integer)','execute') as anon_claim,
  has_function_privilege('service_role','public.velmere_claim_verify_monitor_jobs_v1(text,integer,integer,integer)','execute') as service_claim,
  has_function_privilege('service_role','public.velmere_settle_verify_monitor_job_v1(uuid,text,text,text,text,text,text,text,timestamptz,integer,text)','execute') as service_settle`);
check("service_role_only_control_plane", privileges.rows[0].anon_table === false
  && privileges.rows[0].authenticated_table === false
  && privileges.rows[0].anon_claim === false
  && privileges.rows[0].service_claim === true
  && privileges.rows[0].service_settle === true, privileges.rows[0]);

const privateExact = await db.query(
  `select public.velmere_resolve_verify_publication_exact_v1($1::text) as projection`,
  [privateProof.publicProofId],
);
const privateSearch = await db.query(
  `select public.velmere_search_verify_publications_v1('56',$1::text,null,1) as rows`,
  [privateProof.address],
);
check("private_identity_non_enumerable", privateExact.rows[0].projection === null
  && privateSearch.rows[0].rows.length === 0);

await db.query(`update public.velmere_verify_monitor_jobs
  set due_at=clock_timestamp()-interval '1 second' where public_proof_id=$1`, [privateProof.publicProofId]);
const tokenOne = "worker-token-private-0001";
const firstClaim = await claim(tokenOne);
check("due_claim_exact_identity", firstClaim.length === 1
  && firstClaim[0].chain_id === "56"
  && firstClaim[0].contract_address === privateProof.address
  && firstClaim[0].expected_event_digest === privateProof.eventDigest, firstClaim);
check("concurrent_claim_excluded", (await claim("worker-token-racer-0002")).length === 0);

const claimed = firstClaim[0];
const successArgs = {
  jobId: claimed.job_id,
  token: tokenOne,
  expectedEventDigest: claimed.expected_event_digest,
  outcome: "UNCHANGED",
  observedDeploymentDigest: privateProof.auditedDeploymentDigest,
  verificationReceiptDigest: sha("monitor-receipt-private-one"),
  checkedBlockNumber: String(privateProof.blockNumber + 1),
  checkedBlockHash: `0x${sha("monitor-block-private-one")}`,
  checkedAt: new Date().toISOString(),
};
await expectFailure("wrong_lease_token_rejected", () => settle({
  ...successArgs, token: "wrong-worker-token-0000",
}), /verify_monitor_lease_not_owned/);
await expectFailure("expected_head_tamper_rejected", () => settle({
  ...successArgs, expectedEventDigest: "0".repeat(64),
}), /verify_monitor_claim_replay/);
await expectFailure("changed_same_digest_rolls_back", () => settle({
  ...successArgs, outcome: "CHANGED",
}), /verify_monitor_changed_digest_replay/);

const beforeSuccess = await db.query(
  `select count(*)::int as count from public.velmere_verify_publication_events where public_proof_id=$1`,
  [privateProof.publicProofId],
);
const unchanged = await settle(successArgs);
const afterSuccess = await db.query(`select
  (select count(*)::int from public.velmere_verify_publication_events where public_proof_id=$1) as event_count,
  (select state from public.velmere_verify_monitor_jobs where public_proof_id=$1) as job_state,
  (select attempt_count from public.velmere_verify_monitor_jobs where public_proof_id=$1) as attempt_count`,
  [privateProof.publicProofId]);
check("unchanged_appends_exact_monitor_check", unchanged.state === "MONITORED_UNCHANGED"
  && unchanged.currentStatus === "VERIFIED"
  && afterSuccess.rows[0].event_count === beforeSuccess.rows[0].count + 1
  && afterSuccess.rows[0].job_state === "queued"
  && afterSuccess.rows[0].attempt_count === 0, { unchanged, after: afterSuccess.rows[0] });
await expectFailure("settled_lease_replay_rejected", () => settle(successArgs), /verify_monitor_lease_not_owned/);

await db.query(`update public.velmere_verify_monitor_jobs
  set due_at=clock_timestamp()-interval '1 second' where public_proof_id=$1`, [privateProof.publicProofId]);
const changeToken = "worker-token-change-0003";
const changeClaim = (await claim(changeToken))[0];
const changed = await settle({
  ...successArgs,
  jobId: changeClaim.job_id,
  token: changeToken,
  expectedEventDigest: changeClaim.expected_event_digest,
  outcome: "CHANGED",
  observedDeploymentDigest: sha("changed-deployment-private-one"),
  verificationReceiptDigest: sha("changed-monitor-receipt"),
  checkedBlockNumber: String(privateProof.blockNumber + 2),
  checkedBlockHash: `0x${sha("changed-monitor-block")}`,
  checkedAt: new Date().toISOString(),
});
const changedState = await db.query(`select
  j.state,j.due_at,j.attempt_count,
  e.current_status,e.event_kind,e.previous_event_digest,e.event_digest,
  (select count(*)::int from public.velmere_verify_publication_events x where x.public_proof_id=e.public_proof_id) as event_count
  from public.velmere_verify_monitor_jobs j
  join lateral (select * from public.velmere_verify_publication_events x
    where x.public_proof_id=j.public_proof_id order by publication_version desc limit 1) e on true
  where j.public_proof_id=$1`, [privateProof.publicProofId]);
check("change_requires_revalidation_atomically", changed.state === "REVALIDATION_REQUIRED"
  && changed.currentStatus === "REVALIDATION_REQUIRED"
  && changedState.rows[0].state === "awaiting_revalidation"
  && changedState.rows[0].due_at === null
  && changedState.rows[0].attempt_count === 0
  && changedState.rows[0].event_kind === "REVALIDATION_REQUIRED"
  && changedState.rows[0].event_count === 4, { changed, state: changedState.rows[0] });

const deadProof = await initial("dead-letter");
await db.query(`update public.velmere_verify_monitor_jobs
  set due_at=clock_timestamp()-interval '1 second',attempt_count=7 where public_proof_id=$1`, [deadProof.publicProofId]);
const deadToken = "worker-token-dead-0004";
const deadClaim = (await claim(deadToken))[0];
const dead = await settle({
  jobId: deadClaim.job_id,
  token: deadToken,
  expectedEventDigest: deadClaim.expected_event_digest,
  outcome: "FAILURE",
  verificationReceiptDigest: sha("monitor-configuration-failure"),
  checkedAt: new Date().toISOString(),
  failureCode: "configuration_unavailable",
});
const deadState = await db.query(`select j.state,j.due_at,j.attempt_count,j.last_failure_code,e.current_status,e.event_kind
  from public.velmere_verify_monitor_jobs j
  join lateral (select * from public.velmere_verify_publication_events x
    where x.public_proof_id=j.public_proof_id order by publication_version desc limit 1) e on true
  where j.public_proof_id=$1`, [deadProof.publicProofId]);
check("failure_dead_letter_alert_visible", dead.state === "MONITORING_UNAVAILABLE"
  && dead.deadLettered === true
  && dead.retryScheduled === false
  && deadState.rows[0].state === "dead_letter"
  && deadState.rows[0].due_at === null
  && deadState.rows[0].attempt_count === 8
  && deadState.rows[0].current_status === "MONITORING_UNAVAILABLE"
  && deadState.rows[0].event_kind === "MONITORING_FAILURE", { dead, state: deadState.rows[0] });

const reclaimProof = await initial("lease-reclaim");
await db.query(`update public.velmere_verify_monitor_jobs
  set due_at=clock_timestamp()-interval '1 second' where public_proof_id=$1`, [reclaimProof.publicProofId]);
const staleToken = "worker-token-stale-0005";
const staleClaim = (await claim(staleToken))[0];
await db.query(`update public.velmere_verify_monitor_jobs
  set lease_expires_at=clock_timestamp()-interval '1 second' where public_proof_id=$1`, [reclaimProof.publicProofId]);
const reclaimToken = "worker-token-reclaim-006";
const reclaimed = (await claim(reclaimToken))[0];
check("expired_lease_reclaimed_with_generation", reclaimed.job_id === staleClaim.job_id
  && reclaimed.attempt_count === 2
  && BigInt(reclaimed.lease_generation) > BigInt(staleClaim.lease_generation), { staleClaim, reclaimed });
await expectFailure("stale_lease_token_rejected", () => settle({
  jobId: staleClaim.job_id,
  token: staleToken,
  expectedEventDigest: staleClaim.expected_event_digest,
  outcome: "UNCHANGED",
  observedDeploymentDigest: reclaimProof.auditedDeploymentDigest,
  verificationReceiptDigest: sha("stale-lease-receipt"),
  checkedBlockNumber: String(reclaimProof.blockNumber + 1),
  checkedBlockHash: `0x${sha("stale-lease-block")}`,
  checkedAt: new Date().toISOString(),
}), /verify_monitor_lease_not_owned/);
await expectFailure("block_regression_rolls_back", () => settle({
  jobId: reclaimed.job_id,
  token: reclaimToken,
  expectedEventDigest: reclaimed.expected_event_digest,
  outcome: "UNCHANGED",
  observedDeploymentDigest: reclaimProof.auditedDeploymentDigest,
  verificationReceiptDigest: sha("block-regression-receipt"),
  checkedBlockNumber: String(reclaimProof.blockNumber - 1),
  checkedBlockHash: `0x${sha("block-regression")}`,
  checkedAt: new Date().toISOString(),
}), /verify_observation_regression/);
await settle({
  jobId: reclaimed.job_id,
  token: reclaimToken,
  expectedEventDigest: reclaimed.expected_event_digest,
  outcome: "UNCHANGED",
  observedDeploymentDigest: reclaimProof.auditedDeploymentDigest,
  verificationReceiptDigest: sha("reclaim-success-receipt"),
  checkedBlockNumber: String(reclaimProof.blockNumber + 1),
  checkedBlockHash: `0x${sha("reclaim-success-block")}`,
  checkedAt: new Date().toISOString(),
});

const raceProof = await initial("visibility-race");
await db.query(`update public.velmere_verify_monitor_jobs
  set due_at=clock_timestamp()-interval '1 second' where public_proof_id=$1`, [raceProof.publicProofId]);
const raceToken = "worker-token-race-000007";
const raceClaim = (await claim(raceToken))[0];
const visibility = await db.query(appendSql, [
  sha("visibility-race-idempotency"), raceProof.publicProofId, "56", raceProof.address,
  "VISIBILITY_CHANGED", "PUBLIC", null, null, null, null, null, null,
  sha("visibility-race-receipt"), sha("visibility-race-actor"), null, null,
  null, null, raceClaim.expected_event_digest,
]);
await expectFailure("head_race_rolls_back_settlement", () => settle({
  jobId: raceClaim.job_id,
  token: raceToken,
  expectedEventDigest: raceClaim.expected_event_digest,
  outcome: "UNCHANGED",
  observedDeploymentDigest: raceProof.auditedDeploymentDigest,
  verificationReceiptDigest: sha("visibility-race-monitor-receipt"),
  checkedBlockNumber: String(raceProof.blockNumber + 1),
  checkedBlockHash: `0x${sha("visibility-race-block")}`,
  checkedAt: new Date().toISOString(),
}), /verify_monitor_head_changed/);
await db.query(`update public.velmere_verify_monitor_jobs
  set lease_expires_at=clock_timestamp()-interval '1 second' where public_proof_id=$1`, [raceProof.publicProofId]);
check("head_race_first_reconcile_not_due", (await claim("worker-token-race-reconcile-08")).length === 0);
const reconciled = await db.query(`select state,expected_event_digest from public.velmere_verify_monitor_jobs where public_proof_id=$1`, [raceProof.publicProofId]);
check("head_race_reconciles_exact_new_head", reconciled.rows[0].state === "queued"
  && reconciled.rows[0].expected_event_digest === visibility.rows[0].receipt.eventDigest, reconciled.rows[0]);

await expectFailure("append_only_event_tamper_rejected", () => db.query(
  `update public.velmere_verify_publication_events set current_status='VERIFIED' where event_digest=$1`,
  [privateProof.eventDigest],
), /verify_publication_event_immutable/);

const healthResult = await db.query(`select public.velmere_get_verify_monitor_health_v1() as health`);
const health = healthResult.rows[0].health;
check("aggregate_health_exposes_dead_letter", health.schemaVersion === "velmere.verify-monitor-health.v1"
  && health.deadLettered === 1
  && health.awaitingRevalidation === 1
  && health.processingExpired === 0, health);

for (let index = 1; index < 5; index += 1) {
  const chain = await db.query(`select e.publication_version,e.previous_event_digest,
    lag(e.event_digest) over(order by e.publication_version) as expected_previous
    from public.velmere_verify_publication_events e
    where e.public_proof_id=$1 order by e.publication_version`, [privateProof.publicProofId]);
  check(`append_chain_${index}`, index === 1
    ? chain.rows[index - 1].previous_event_digest === null
    : chain.rows[index - 1].previous_event_digest === chain.rows[index - 1].expected_previous,
  chain.rows[index - 1]);
}

const failed = checks.filter((row) => !row.pass);
if (failed.length) {
  console.error(JSON.stringify({ schemaVersion: "velmere.v4-verify-monitor-pglite.v1", pass: false, failed, checks }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    schemaVersion: "velmere.v4-verify-monitor-pglite.v1",
    pass: true,
    assertions: checks.length,
    customerFinalCredit: false,
    stagingCredit: false,
    liveProviderCalls: 0,
  }, null, 2));
}

await db.close();
