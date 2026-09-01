import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const migrationPath = path.resolve(
  "supabase/migrations/20260821000003_v4_verify_continuous_publication_registry.sql",
);
const migrationBefore = fs.readFileSync(migrationPath);
const sourceSha256 = crypto.createHash("sha256").update(migrationBefore).digest("hex");
const checks = [];
const check = (id, condition, detail) => checks.push({ id, pass: Boolean(condition), detail });
const digest = (character) => character.repeat(64);
const blockHash = (character) => `0x${character.repeat(64)}`;
const proofId = `pubidx-${"a".repeat(48)}`;
const privateProofId = `pubidx-${"b".repeat(48)}`;
const chainId = "56";
const address = `0x${"a".repeat(40)}`;
const db = new PGlite({ extensions: { pgcrypto } });
await db.waitReady;

const bootstrap = String.raw`
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;
`;

async function expectFailure(id, action, expectedPattern) {
  await db.exec("begin");
  try {
    await action();
    check(id, false, "unexpected_success");
  } catch (error) {
    const message = String(error?.message ?? error);
    check(id, expectedPattern.test(message), message.slice(0, 800));
  } finally {
    await db.exec("rollback");
  }
}

const appendSql = `
select public.velmere_append_verify_publication_event_v1(
  $1::text, $2::text, $3::text, $4::text, $5::text, $6::text,
  $7::text, $8::text, $9::text, $10::text, $11::text, $12::text,
  $13::text, $14::text, $15::text, $16::text, $17::timestamptz,
  $18::integer, $19::text
) as receipt`;

async function append(input) {
  const result = await db.query(appendSql, [
    input.idempotencyKey,
    input.publicProofId ?? proofId,
    input.chainId ?? chainId,
    input.contractAddress ?? address,
    input.eventKind,
    input.visibility ?? "PUBLIC",
    input.projectName ?? null,
    input.reportTitle ?? null,
    input.publicSummary ?? null,
    input.riskStatus ?? null,
    input.reportDigest ?? null,
    input.deploymentDigest ?? null,
    input.verificationReceiptDigest ?? digest("d"),
    input.actorDigest ?? digest("e"),
    input.checkedBlockNumber ?? null,
    input.checkedBlockHash ?? null,
    input.checkedAt ?? null,
    input.monitoringTtlSeconds ?? null,
    input.expectedPreviousEventDigest ?? null,
  ]);
  return result.rows[0].receipt;
}

try {
  await db.exec(bootstrap);
  await db.exec(migrationBefore.toString("utf8"));
  check("exact_migration_executes", true);

  const inventory = await db.query(`
    select c.relname, c.relrowsecurity
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('velmere_verify_publication_identities','velmere_verify_publication_events')
    order by c.relname`);
  check("two_rls_tables_exist", inventory.rows.length === 2
    && inventory.rows.every((row) => row.relrowsecurity === true), inventory.rows);

  const acl = await db.query(`
    select p.proname,
      has_function_privilege('service_role', p.oid, 'EXECUTE') as service_execute,
      has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
      has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'velmere_append_verify_publication_event_v1',
        'velmere_resolve_verify_publication_exact_v1',
        'velmere_search_verify_publications_v1',
        'velmere_get_verify_publication_history_v1'
      ) order by p.proname`);
  check("four_service_role_only_rpcs", acl.rows.length === 4
    && acl.rows.every((row) => row.service_execute && !row.anon_execute && !row.authenticated_execute), acl.rows);

  const now = () => new Date().toISOString();
  const initialCheckedAt = now();
  const initial = await append({
    idempotencyKey: digest("1"),
    eventKind: "INITIAL_VERIFICATION",
    projectName: "PGlite Verify fixture",
    reportTitle: "Initial exact deployment report",
    publicSummary: "The initial exact deployment observation matches this redacted audit publication.",
    riskStatus: "LOW_DETECTED_RISK",
    reportDigest: digest("2"),
    deploymentDigest: digest("3"),
    checkedBlockNumber: "40000000",
    checkedBlockHash: blockHash("4"),
    checkedAt: initialCheckedAt,
    monitoringTtlSeconds: 3600,
  });
  check("initial_is_verified", initial.currentStatus === "VERIFIED"
    && initial.publicationVersion === 1 && initial.auditVersion === 1, initial);

  await expectFailure("checked_time_regression_rejected", () => append({
    idempotencyKey: "31".repeat(32),
    eventKind: "MONITOR_CHECK",
    deploymentDigest: digest("3"),
    checkedBlockNumber: "40000001",
    checkedBlockHash: blockHash("3"),
    checkedAt: new Date(Date.parse(initialCheckedAt) - 1_000).toISOString(),
    monitoringTtlSeconds: 3600,
    expectedPreviousEventDigest: initial.eventDigest,
  }), /verify_observation_regression/u);
  await expectFailure("checked_block_regression_rejected", () => append({
    idempotencyKey: "32".repeat(32),
    eventKind: "MONITOR_CHECK",
    deploymentDigest: digest("3"),
    checkedBlockNumber: "39999999",
    checkedBlockHash: blockHash("3"),
    checkedAt: now(),
    monitoringTtlSeconds: 3600,
    expectedPreviousEventDigest: initial.eventDigest,
  }), /verify_observation_regression/u);

  const initialRetry = await append({
    idempotencyKey: digest("1"),
    eventKind: "INITIAL_VERIFICATION",
    projectName: "PGlite Verify fixture",
    reportTitle: "Initial exact deployment report",
    publicSummary: "The initial exact deployment observation matches this redacted audit publication.",
    riskStatus: "LOW_DETECTED_RISK",
    reportDigest: digest("2"),
    deploymentDigest: digest("3"),
    checkedBlockNumber: "40000000",
    checkedBlockHash: blockHash("4"),
    checkedAt: initialCheckedAt,
    monitoringTtlSeconds: 3600,
  });
  check("exact_retry_is_idempotent", initialRetry.idempotent === true
    && initialRetry.eventDigest === initial.eventDigest, initialRetry);
  await expectFailure("idempotency_conflict_rejected", () => append({
    idempotencyKey: digest("1"),
    eventKind: "INITIAL_VERIFICATION",
    projectName: "PGlite Verify fixture",
    reportTitle: "Initial exact deployment report",
    publicSummary: "A different request must never reuse the original idempotency key.",
    riskStatus: "LOW_DETECTED_RISK",
    reportDigest: digest("2"),
    deploymentDigest: digest("3"),
    checkedBlockNumber: "40000000",
    checkedBlockHash: blockHash("4"),
    checkedAt: initialCheckedAt,
    monitoringTtlSeconds: 3600,
  }), /verify_idempotency_conflict/u);

  const monitor = await append({
    idempotencyKey: digest("5"),
    eventKind: "MONITOR_CHECK",
    deploymentDigest: digest("3"),
    checkedBlockNumber: "40000001",
    checkedBlockHash: blockHash("5"),
    checkedAt: now(),
    monitoringTtlSeconds: 3600,
    expectedPreviousEventDigest: initial.eventDigest,
  });
  check("unchanged_monitor_stays_verified", monitor.currentStatus === "VERIFIED"
    && monitor.publicationVersion === 2, monitor);

  const changed = await append({
    idempotencyKey: digest("6"),
    eventKind: "MONITOR_CHECK",
    deploymentDigest: digest("9"),
    checkedBlockNumber: "40000002",
    checkedBlockHash: blockHash("6"),
    checkedAt: now(),
    monitoringTtlSeconds: 3600,
    expectedPreviousEventDigest: monitor.eventDigest,
  });
  check("material_change_invalidates_green", changed.currentStatus === "CHANGE_DETECTED", changed);

  const changedProjection = (await db.query(
    "select public.velmere_resolve_verify_publication_exact_v1($1::text) as projection",
    [proofId],
  )).rows[0].projection;
  check("changed_projection_withholds_risk", changedProjection.currentStatus === "CHANGE_DETECTED"
    && changedProjection.riskStatus === "WITHHELD"
    && changedProjection.monitoringCurrent === false
    && changedProjection.reportCurrent === false
    && changedProjection.reportDigest === null, changedProjection);

  await expectFailure("stale_status_replay_rejected", () => append({
    idempotencyKey: digest("7"),
    eventKind: "REVALIDATION_REQUIRED",
    deploymentDigest: digest("9"),
    checkedBlockNumber: "40000003",
    checkedBlockHash: blockHash("7"),
    checkedAt: now(),
    expectedPreviousEventDigest: monitor.eventDigest,
  }), /verify_status_replay_or_chain_conflict/u);

  const required = await append({
    idempotencyKey: digest("8"),
    eventKind: "REVALIDATION_REQUIRED",
    deploymentDigest: digest("9"),
    checkedBlockNumber: "40000003",
    checkedBlockHash: blockHash("7"),
    checkedAt: now(),
    expectedPreviousEventDigest: changed.eventDigest,
  });
  const started = await append({
    idempotencyKey: digest("a"),
    eventKind: "REVALIDATION_STARTED",
    deploymentDigest: digest("9"),
    checkedBlockNumber: "40000004",
    checkedBlockHash: blockHash("8"),
    checkedAt: now(),
    expectedPreviousEventDigest: required.eventDigest,
  });
  const completed = await append({
    idempotencyKey: digest("b"),
    eventKind: "REVALIDATION_COMPLETED",
    projectName: "PGlite Verify fixture",
    reportTitle: "Revalidated exact deployment report",
    publicSummary: "A new redacted report is bound to the changed deployment after revalidation.",
    riskStatus: "ELEVATED_RISK",
    reportDigest: digest("c"),
    deploymentDigest: digest("9"),
    checkedBlockNumber: "40000005",
    checkedBlockHash: blockHash("9"),
    checkedAt: now(),
    monitoringTtlSeconds: 3600,
    expectedPreviousEventDigest: started.eventDigest,
  });
  check("revalidation_advances_audit_version", completed.currentStatus === "VERIFIED_AGAIN"
    && completed.auditVersion === 2 && completed.publicationVersion === 6, completed);

  const expiredProjection = (await db.query(
    "select public.velmere_build_verify_public_projection_v1($1::text, statement_timestamp() + interval '2 hours') as projection",
    [proofId],
  )).rows[0].projection;
  check("expired_monitoring_forces_unavailable", expiredProjection.currentStatus === "MONITORING_UNAVAILABLE"
    && expiredProjection.riskStatus === "WITHHELD"
    && expiredProjection.monitoringCurrent === false
    && expiredProjection.reportCurrent === false
    && expiredProjection.reportDigest === null, expiredProjection);

  const failure = await append({
    idempotencyKey: digest("f"),
    eventKind: "MONITORING_FAILURE",
    checkedAt: now(),
    expectedPreviousEventDigest: completed.eventDigest,
  });
  check("explicit_monitor_failure_is_unavailable", failure.currentStatus === "MONITORING_UNAVAILABLE", failure);
  const recovered = await append({
    idempotencyKey: digest("0"),
    eventKind: "MONITOR_CHECK",
    deploymentDigest: digest("9"),
    checkedBlockNumber: "40000006",
    checkedBlockHash: blockHash("a"),
    checkedAt: now(),
    monitoringTtlSeconds: 3600,
    expectedPreviousEventDigest: failure.eventDigest,
  });
  check("monitor_recovery_is_verified_again", recovered.currentStatus === "VERIFIED_AGAIN", recovered);

  const summaryOnly = await append({
    idempotencyKey: digest("d"),
    eventKind: "VISIBILITY_CHANGED",
    visibility: "PUBLIC_SUMMARY_PRIVATE_REPORT",
    expectedPreviousEventDigest: recovered.eventDigest,
  });
  const summaryProjection = (await db.query(
    "select public.velmere_resolve_verify_publication_exact_v1($1::text) as projection",
    [proofId],
  )).rows[0].projection;
  const summaryHistory = (await db.query(
    "select public.velmere_get_verify_publication_history_v1($1::text, 100) as history",
    [proofId],
  )).rows[0].history;
  check("summary_visibility_hides_report_digest", summaryOnly.visibility === "PUBLIC_SUMMARY_PRIVATE_REPORT"
    && summaryProjection.reportDigest === null && summaryProjection.historyVisibility === "PRIVATE"
    && summaryHistory.every((entry) => entry.reportDigest === null), { summaryProjection, summaryHistory });

  const search = (await db.query(
    "select public.velmere_search_verify_publications_v1($1::text,$2::text,null,5) as results",
    [chainId, address],
  )).rows[0].results;
  check("exact_identity_search_returns_one", search.length === 1
    && search[0].publicProofId === proofId, search);
  const nameSearch = (await db.query(
    "select public.velmere_search_verify_publications_v1(null,null,$1::text,5) as results",
    ["pglite verify fixture"],
  )).rows[0].results;
  check("exact_public_project_name_search_returns_one", nameSearch.length === 1
    && nameSearch[0].chainId === chainId && nameSearch[0].contractAddress === address, nameSearch);

  await expectFailure("wrong_chain_address_collision_rejected", () => append({
    idempotencyKey: digest("e"),
    publicProofId: privateProofId,
    eventKind: "INITIAL_VERIFICATION",
    projectName: "Collision fixture",
    reportTitle: "Collision report must fail",
    publicSummary: "This event attempts to bind a second proof id to the same exact identity.",
    riskStatus: "WITHHELD",
    reportDigest: digest("7"),
    deploymentDigest: digest("8"),
    checkedBlockNumber: "40000007",
    checkedBlockHash: blockHash("b"),
    checkedAt: now(),
    monitoringTtlSeconds: 3600,
  }), /verify_wrong_chain_address_collision/u);

  const privateAddress = `0x${"c".repeat(40)}`;
  const privateInitial = await append({
    idempotencyKey: "41".repeat(32),
    publicProofId: privateProofId,
    chainId: "137",
    contractAddress: privateAddress,
    eventKind: "INITIAL_VERIFICATION",
    visibility: "PRIVATE",
    projectName: "Private history fixture",
    reportTitle: "Private initial deployment report",
    publicSummary: "This first report digest was created while the publication remained private.",
    riskStatus: "LOW_DETECTED_RISK",
    reportDigest: digest("7"),
    deploymentDigest: digest("8"),
    checkedBlockNumber: "70000000",
    checkedBlockHash: blockHash("c"),
    checkedAt: now(),
    monitoringTtlSeconds: 3600,
  });
  const privateChanged = await append({
    idempotencyKey: "42".repeat(32),
    publicProofId: privateProofId,
    chainId: "137",
    contractAddress: privateAddress,
    eventKind: "MONITOR_CHECK",
    visibility: "PRIVATE",
    deploymentDigest: digest("9"),
    checkedBlockNumber: "70000001",
    checkedBlockHash: blockHash("d"),
    checkedAt: now(),
    monitoringTtlSeconds: 3600,
    expectedPreviousEventDigest: privateInitial.eventDigest,
  });
  const privateRevalidated = await append({
    idempotencyKey: "43".repeat(32),
    publicProofId: privateProofId,
    chainId: "137",
    contractAddress: privateAddress,
    eventKind: "REVALIDATION_COMPLETED",
    visibility: "PRIVATE",
    projectName: "Private history fixture",
    reportTitle: "Private replacement deployment report",
    publicSummary: "This replacement report digest was also created while the publication remained private.",
    riskStatus: "ELEVATED_RISK",
    reportDigest: digest("9"),
    deploymentDigest: digest("9"),
    checkedBlockNumber: "70000002",
    checkedBlockHash: blockHash("e"),
    checkedAt: now(),
    monitoringTtlSeconds: 3600,
    expectedPreviousEventDigest: privateChanged.eventDigest,
  });
  const newlyPublic = await append({
    idempotencyKey: "44".repeat(32),
    publicProofId: privateProofId,
    chainId: "137",
    contractAddress: privateAddress,
    eventKind: "VISIBILITY_CHANGED",
    visibility: "PUBLIC",
    expectedPreviousEventDigest: privateRevalidated.eventDigest,
  });
  const privateToPublicHistory = (await db.query(
    "select public.velmere_get_verify_publication_history_v1($1::text,100) as history",
    [privateProofId],
  )).rows[0].history;
  check("private_history_is_not_retroactively_published", newlyPublic.visibility === "PUBLIC"
    && privateToPublicHistory.length === 4
    && privateToPublicHistory[0].reportDigest === digest("9")
    && privateToPublicHistory[0].historicalReportVisibility === "PUBLIC"
    && privateToPublicHistory.slice(1).every((entry) => entry.reportDigest === null
      && entry.historicalReportVisibility === "PRIVATE"), privateToPublicHistory);

  const privateEvent = await append({
    idempotencyKey: digest("2"),
    eventKind: "VISIBILITY_CHANGED",
    visibility: "PRIVATE",
    expectedPreviousEventDigest: summaryOnly.eventDigest,
  });
  const privateProjection = (await db.query(
    "select public.velmere_resolve_verify_publication_exact_v1($1::text) as projection",
    [proofId],
  )).rows[0].projection;
  const privateSearch = (await db.query(
    "select public.velmere_search_verify_publications_v1($1::text,$2::text,null,5) as results",
    [chainId, address],
  )).rows[0].results;
  const privateHistory = (await db.query(
    "select public.velmere_get_verify_publication_history_v1($1::text,100) as history",
    [proofId],
  )).rows[0].history;
  check("private_and_unknown_are_non_enumerable", privateEvent.visibility === "PRIVATE"
    && privateProjection === null && privateSearch.length === 0 && privateHistory.length === 0,
  { privateProjection, privateSearch, privateHistory });

  await expectFailure("event_rows_are_immutable", () => db.exec(
    `update public.velmere_verify_publication_events set current_status='VERIFIED' where public_proof_id='${proofId}'`,
  ), /verify_publication_event_immutable/u);

  await db.exec("set role service_role;");
  const serviceRoleProjection = (await db.query(
    "select public.velmere_resolve_verify_publication_exact_v1($1::text) as projection",
    [proofId],
  )).rows[0].projection;
  check("service_role_can_execute_registered_projection", serviceRoleProjection === null);
  await expectFailure("service_role_has_no_direct_table_read", () => db.query(
    "select count(*) from public.velmere_verify_publication_events",
  ), /permission denied/u);
  await expectFailure("service_role_cannot_execute_private_projection_helper", () => db.query(
    "select public.velmere_build_verify_public_projection_v1($1::text,statement_timestamp())",
    [proofId],
  ), /permission denied/u);
  await db.exec("reset role;");

  const migrationAfter = fs.readFileSync(migrationPath);
  check("migration_source_stable_during_execution", sourceSha256 === crypto.createHash("sha256").update(migrationAfter).digest("hex"));
} catch (error) {
  check("pglite_execution_completed", false, String(error?.stack ?? error).slice(0, 5000));
} finally {
  await db.close();
}

const failed = checks.filter((row) => !row.pass);
console.log(JSON.stringify({
  schemaVersion: "velmere.v4.verify-pglite-execution.v1",
  status: failed.length ? "FAIL_LOCAL_SEMANTICS_PRESERVED" : "PASS_LOCAL_SEMANTICS_ONLY",
  sourceSha256,
  assertions: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  failures: failed,
  truthBoundary: "Exact migration in a fresh disposable PGlite PostgreSQL runtime with real bundled pgcrypto. No native Supabase staging, Auth, multi-account RLS, deployed monitoring, customer, FINAL, LIVE or sale credit.",
  credits: { localSemanticsOnly: true, supabaseStaging: false, customerFinal: 0, live: false },
}, null, 2));
if (failed.length) process.exitCode = 1;
