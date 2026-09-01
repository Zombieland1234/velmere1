import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const root = process.cwd();
const verifyMigration = fs.readFileSync(path.resolve(root,
  "supabase/migrations/20260821000003_v4_verify_continuous_publication_registry.sql"), "utf8");
const bridgeMigrationPath = path.resolve(root,
  "supabase/migrations/20260821000005_v4_audit_verify_initial_producer_bridge.sql");
const bridgeMigrationBefore = fs.readFileSync(bridgeMigrationPath);
const bridgeMigrationSha256 = crypto.createHash("sha256").update(bridgeMigrationBefore).digest("hex");
const bridgeMigration = bridgeMigrationBefore.toString("utf8");
const db = new PGlite({ extensions: { pgcrypto } });
await db.waitReady;

const checks = [];
const check = (id, condition, detail) => checks.push({ id, pass: Boolean(condition), detail });
const sha = (value) => crypto.createHash("sha256").update(value).digest("hex");
const prefixed = (value) => `sha256:${sha(value)}`;

async function expectFailure(id, action, pattern) {
  await db.exec("begin");
  try {
    await action();
    check(id, false, "unexpected_success");
  } catch (error) {
    const message = String(error?.message ?? error);
    check(id, pattern.test(message), message.slice(0, 1_000));
  } finally {
    await db.exec("rollback");
  }
}

await db.exec(String.raw`
create extension if not exists pgcrypto;
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;

create table public.velmere_audit_intake_cases (
  case_id text primary key,
  case_ref text not null unique,
  request_id text not null unique,
  target_kind text not null,
  target_private text not null,
  target_hash text not null,
  display_label text not null,
  tier text not null,
  locale text not null,
  status text not null,
  account_id text,
  target_chain_id text,
  target_chain_name text
);
create table public.velmere_audit_review_orchestration (
  case_id text primary key references public.velmere_audit_intake_cases(case_id),
  case_ref text not null unique,
  tier text not null,
  review_state text not null,
  completed_at timestamptz
);
create table public.velmere_audit_basic_report_artifacts (
  report_id text primary key,
  case_ref text not null unique references public.velmere_audit_intake_cases(case_ref),
  request_id text not null,
  account_id_hash text not null,
  target_hash text not null,
  report_version_hash text not null,
  snapshot_digest text not null,
  source_receipt_root text not null,
  pdf_digest text not null,
  pdf_byte_length integer not null,
  render_contract_id text not null,
  record_digest text not null,
  snapshot_json jsonb not null,
  pdf_bytes bytea not null,
  created_at timestamptz not null
);
create table public.velmere_audit_report_snapshots (
  report_id text primary key,
  case_ref text not null,
  request_id text not null,
  account_id_hash text not null,
  entitlement_id text not null,
  tier text not null,
  target_hash text not null,
  report_version_hash text not null,
  snapshot_digest text not null,
  source_receipt_root text not null,
  pdf_digest text not null,
  snapshot_json jsonb not null,
  created_at timestamptz not null
);
create table public.velmere_audit_report_pdf_blobs (
  report_id text primary key,
  case_ref text not null,
  request_id text not null,
  account_id_hash text not null,
  entitlement_id text not null,
  tier text not null,
  target_hash text not null,
  report_version_hash text not null,
  snapshot_digest text not null,
  source_receipt_root text not null,
  pdf_digest text not null,
  pdf_byte_length integer not null,
  render_contract_id text not null,
  record_digest text not null,
  pdf_bytes bytea not null,
  created_at timestamptz not null
);

create or replace function public.velmere_current_account_id()
returns text language sql stable security definer
set search_path = pg_catalog, public, pg_temp
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '') $$;
create or replace function public.velmere_current_account_binding_hash()
returns text language sql stable security definer
set search_path = pg_catalog, public, pg_temp
as $$ select case when public.velmere_current_account_id() is null then null
  else encode(digest('velmere-account-binding-v1:' || public.velmere_current_account_id(), 'sha256'), 'hex') end $$;
`);

await db.exec(verifyMigration);
await db.exec(bridgeMigration);

const accountId = "owner-audit-verify-01";
const accountHash = sha(`velmere-account-binding-v1:${accountId}`);
const caseRef = "AUD-VERIFY-BASIC-01";
const requestId = "request-audit-verify-basic-01";
const reportId = "audit-verify-basic-v1";
const address = `0x${"1".repeat(40)}`;
const chainId = "56";
const chainName = "BSC";
const targetHash = prefixed(`velmere-audit-contract-target-v1:${chainId}:${address}`);
const reportVersionHash = prefixed("report-version");
const snapshotDigest = prefixed("snapshot");
const sourceReceiptRoot = prefixed("source-root");
const packetDigest = prefixed("packet");
const deploymentReceiptDigest = prefixed("deployment-receipt");
const matchedInputDigest = prefixed("matched-input");
const releaseCanonical = JSON.stringify({
  blockers: [],
  caseRef,
  completionAllowed: true,
  currentDeploymentReceiptDigest: deploymentReceiptDigest,
  expectedTier: "basic",
  matchedInputDigest,
  packetDigest,
  schemaVersion: "velmere.audit-execution-release-gate.v1",
});
const releaseBindingDigest = prefixed(releaseCanonical);
const now = new Date().toISOString();
const observedAt = new Date(now);
const dailyWindowStartMs = Date.UTC(
  observedAt.getUTCFullYear(), observedAt.getUTCMonth(), observedAt.getUTCDate(), 3, 0, 0, 0,
);
const expectedMonitorDueMs = observedAt.getTime() < dailyWindowStartMs
  ? dailyWindowStartMs + 59 * 60_000
  : dailyWindowStartMs + 24 * 60 * 60_000 + 59 * 60_000;
const expectedInitialTtlSeconds = Math.ceil((expectedMonitorDueMs - observedAt.getTime()) / 1_000);
const blockNumber = "40000000";
const blockHash = `0x${"2".repeat(64)}`;
const deploymentLine = `currentDeployment=${address}; snapshotBlock=${blockNumber}; blockHash=${blockHash}; stateRoot=0x${"3".repeat(64)}; runtimeSha256=sha256:${"4".repeat(64)}; proxy=EIP_1167_COMPATIBLE_MINIMAL_PROXY; implementation=0x${"5".repeat(40)}; implementationSha256=sha256:${"6".repeat(64)}; trustedForwarder=0x${"7".repeat(40)}; trustedForwarderState=INACTIVE; negativeControl=INACTIVE; currentExploitabilityProven=false; independentReplay=false`;
const pdfBytes = Buffer.concat([
  Buffer.from("%PDF-1.7\n", "latin1"),
  Buffer.alloc(1_120, 0x41),
  Buffer.from("\n%%EOF\n", "latin1"),
]);
const pdfDigest = `sha256:${sha(pdfBytes)}`;
const snapshot = {
  schemaVersion: "velmere.audit-pdf-snapshot.v1",
  requestId,
  target: address,
  chain: chainName,
  tier: "basic",
  generatedAt: now,
  digest: snapshotDigest,
  canonicalEvidencePacketId: "canonical-evidence-packet-fixture",
  canonicalEvidenceDigest: prefixed("canonical-evidence"),
  sourceReceiptRoot,
  evidenceRoots: { aggregateRoot: sourceReceiptRoot },
  renderContract: {
    id: "pass4808-deterministic-latin-extended-pagination-v1",
    pdfDigest,
    pdfByteLength: pdfBytes.byteLength,
  },
  auditExecutionRelease: {
    schemaVersion: "velmere.audit-execution-release-gate.v1",
    decision: "ALLOW_COMPLETE",
    completionAllowed: true,
    persistAllowed: true,
    expectedTier: "basic",
    caseRef,
    packetDigest,
    currentDeploymentReceiptDigest: deploymentReceiptDigest,
    matchedInputDigest,
    releaseBindingDigest,
  },
  customerEligibility: { commercialUseReady: true },
  evidenceReadiness: { proReady: false, advancedReady: false },
  verdict: { riskScore: 30, riskLabel: "Low" },
  lines: ["Audit fixture header", deploymentLine, "Audit fixture footer"],
};

await db.query(`insert into public.velmere_audit_intake_cases(
  case_id,case_ref,request_id,target_kind,target_private,target_hash,display_label,
  tier,locale,status,account_id,target_chain_id,target_chain_name
) values ($1,$2,$3,'contract',$4,$5,'Audit Verify fixture','basic','en','queued_basic_prescreen',$6,$7,$8)`,
["case-audit-verify-basic", caseRef, requestId, address, targetHash, accountId, chainId, chainName]);
await db.query(`insert into public.velmere_audit_review_orchestration(
  case_id,case_ref,tier,review_state,completed_at
) values ($1,$2,'basic','completed',$3::timestamptz)`,
["case-audit-verify-basic", caseRef, now]);
await db.query(`insert into public.velmere_audit_basic_report_artifacts(
  report_id,case_ref,request_id,account_id_hash,target_hash,report_version_hash,
  snapshot_digest,source_receipt_root,pdf_digest,pdf_byte_length,render_contract_id,
  record_digest,snapshot_json,pdf_bytes,created_at
) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14::bytea,$15::timestamptz)`, [
  reportId, caseRef, requestId, accountHash, targetHash, reportVersionHash,
  snapshotDigest, sourceReceiptRoot, pdfDigest, pdfBytes.byteLength,
  "pass4808-deterministic-latin-extended-pagination-v1", prefixed("pdf-record"),
  JSON.stringify(snapshot), pdfBytes, now,
]);

const publishSql = `select public.velmere_publish_completed_audit_to_verify_v1($1::text,$2::text) as receipt`;
const querySanity = await db.query(`select 1 as value,
  to_regprocedure('public.velmere_publish_completed_audit_to_verify_v1(text,text)')::text as producer`);
if (!querySanity.rows[0]) throw new Error(`query_sanity_returned_no_row:${JSON.stringify(querySanity)}`);
const bindingSanity = await db.query(
  `select public.velmere_resolve_completed_audit_verify_binding_v1($1::text) as binding`,
  [caseRef],
);
if (!bindingSanity.rows[0]) throw new Error(`binding_returned_no_row:${JSON.stringify(bindingSanity)}`);
const privateResult = await db.query(publishSql, [caseRef, "PRIVATE"]);
if (!privateResult.rows[0]) throw new Error(`private_publish_returned_no_row:${JSON.stringify(privateResult)}`);
const privateReceipt = privateResult.rows[0].receipt;
check("private_initial_active", privateReceipt.verifyActive === true
  && privateReceipt.publiclyVisible === false
  && privateReceipt.visibility === "PRIVATE"
  && /^pubidx-[a-f0-9]{48}$/.test(privateReceipt.publicProofId), privateReceipt);
const canonicalDeploymentIdentity = JSON.stringify({
  chainId,
  contractAddress: address,
  implementationAddress: `0x${"5".repeat(40)}`,
  implementationBytecodeSha256: `sha256:${"6".repeat(64)}`,
  negativeControlAddress: "0x0000000000000000000000000000000000000001",
  negativeControlState: "INACTIVE",
  proxyKind: "EIP_1167_COMPATIBLE_MINIMAL_PROXY",
  runtimeBytecodeSha256: `sha256:${"4".repeat(64)}`,
  schemaVersion: "velmere.verify-canonical-deployment-identity.v1",
  trustedForwarderAddress: `0x${"7".repeat(40)}`,
  trustedForwarderSelector: "0x572b6c05",
  trustedForwarderState: "INACTIVE",
});
const expectedDeploymentIdentityDigest = sha(
  `velmere.verify-canonical-deployment-identity.v1\u001f${canonicalDeploymentIdentity}`,
);
const initialIdentity = await db.query(`select audited_deployment_digest,current_deployment_digest,
  extract(epoch from (monitor_due_at-checked_at))::integer as ttl_seconds
  from public.velmere_verify_publication_events where public_proof_id=$1`, [privateReceipt.publicProofId]);
check("initial_exact_canonical_deployment_identity", initialIdentity.rows[0].audited_deployment_digest === expectedDeploymentIdentityDigest
  && initialIdentity.rows[0].current_deployment_digest === expectedDeploymentIdentityDigest
  && initialIdentity.rows[0].audited_deployment_digest !== deploymentReceiptDigest.slice(7), initialIdentity.rows[0]);
check("initial_daily_jitter_freshness_horizon", initialIdentity.rows[0].ttl_seconds === expectedInitialTtlSeconds, { ...initialIdentity.rows[0], expectedInitialTtlSeconds });

const privateProjection = await db.query(
  `select public.velmere_resolve_verify_publication_exact_v1($1::text) as projection`,
  [privateReceipt.publicProofId],
);
check("private_exact_projection_non_enumerable", privateProjection.rows[0].projection === null);
const privateSearch = await db.query(
  `select public.velmere_search_verify_publications_v1($1::text,$2::text,null,1) as rows`,
  [chainId, address],
);
check("private_identity_search_non_enumerable", privateSearch.rows[0].rows.length === 0);

const retryResult = await db.query(publishSql, [caseRef, "PRIVATE"]);
const retry = retryResult.rows[0].receipt;
const privateCounts = await db.query(`select
  (select count(*)::int from public.velmere_verify_publication_identities) as identities,
  (select count(*)::int from public.velmere_verify_publication_events) as events,
  (select count(*)::int from public.velmere_audit_verify_publication_bridges) as bridges`);
check("private_retry_exact_idempotency", retry.idempotent === true
  && retry.publicProofId === privateReceipt.publicProofId
  && privateCounts.rows[0].identities === 1
  && privateCounts.rows[0].events === 1
  && privateCounts.rows[0].bridges === 1, { retry, counts: privateCounts.rows[0] });

await expectFailure("public_without_consent_rejected", async () => {
  await db.query(publishSql, [caseRef, "PUBLIC"]);
}, /audit_verify_public_visibility_consent_required/u);

await db.query(`select set_config('request.jwt.claim.sub',$1,false)`, ["wrong-owner"]);
await expectFailure("cross_account_consent_rejected", async () => {
  await db.query(`select public.velmere_record_audit_verify_visibility_consent_v1($1::text,'PUBLIC')`, [caseRef]);
}, /audit_verify_visibility_owner_mismatch/u);

await db.query(`select set_config('request.jwt.claim.sub',$1,false)`, [accountId]);
const consentResult = await db.query(
  `select public.velmere_record_audit_verify_visibility_consent_v1($1::text,'PUBLIC') as receipt`,
  [caseRef],
);
const consentRetryResult = await db.query(
  `select public.velmere_record_audit_verify_visibility_consent_v1($1::text,'PUBLIC') as receipt`,
  [caseRef],
);
const consent = consentResult.rows[0].receipt;
const consentRetry = consentRetryResult.rows[0].receipt;
check("owner_public_consent_append_and_retry", consent.idempotent === false
  && consent.visibility === "PUBLIC"
  && consentRetry.idempotent === true
  && consentRetry.consentDigest === consent.consentDigest);

const publicResult = await db.query(publishSql, [caseRef, "PUBLIC"]);
const publicReceipt = publicResult.rows[0].receipt;
check("public_transition_requires_exact_consent", publicReceipt.publiclyVisible === true
  && publicReceipt.visibility === "PUBLIC"
  && publicReceipt.publicProofId === privateReceipt.publicProofId, publicReceipt);
const publicProjection = await db.query(
  `select public.velmere_resolve_verify_publication_exact_v1($1::text) as projection`,
  [privateReceipt.publicProofId],
);
check("public_projection_exact_report_visible", publicProjection.rows[0].projection?.visibility === "PUBLIC"
  && publicProjection.rows[0].projection?.reportDigest === snapshotDigest.slice(7));

const historicalProjection = await db.query(
  `select public.velmere_build_verify_public_projection_v1(
     $1::text,
     (select max(monitor_due_at) + interval '1 second'
        from public.velmere_verify_publication_events where public_proof_id=$1)
   ) as projection`,
  [privateReceipt.publicProofId],
);
check("old_report_becomes_historical_not_green", historicalProjection.rows[0].projection?.currentStatus === "MONITORING_UNAVAILABLE"
  && historicalProjection.rows[0].projection?.riskStatus === "WITHHELD"
  && historicalProjection.rows[0].projection?.reportDigest === null
  && historicalProjection.rows[0].projection?.reportCurrent === false, historicalProjection.rows[0].projection);

const acl = await db.query(`select p.proname,
  has_function_privilege('service_role',p.oid,'EXECUTE') as service_execute,
  has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute,
  has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in (
  'velmere_publish_completed_audit_to_verify_v1',
  'velmere_record_audit_verify_visibility_consent_v1'
) order by p.proname`);
const publishAcl = acl.rows.find((row) => row.proname === "velmere_publish_completed_audit_to_verify_v1");
const consentAcl = acl.rows.find((row) => row.proname === "velmere_record_audit_verify_visibility_consent_v1");
check("producer_and_consent_acl_separation", acl.rows.length === 2
  && publishAcl?.service_execute === true
  && publishAcl?.authenticated_execute === false
  && publishAcl?.anon_execute === false
  && consentAcl?.service_execute === false
  && consentAcl?.authenticated_execute === true
  && consentAcl?.anon_execute === false, acl.rows);

await expectFailure("tampered_source_binding_rejected", async () => {
  await db.query(`update public.velmere_audit_basic_report_artifacts
    set source_receipt_root=$2 where case_ref=$1`, [caseRef, prefixed("tampered-source")]);
  await db.query(`select public.velmere_resolve_completed_audit_verify_binding_v1($1::text)`, [caseRef]);
}, /audit_verify_exact_customer_artifact_required/u);

await expectFailure("tampered_release_binding_rejected", async () => {
  await db.query(`update public.velmere_audit_basic_report_artifacts
    set snapshot_json=jsonb_set(snapshot_json,'{auditExecutionRelease,releaseBindingDigest}',to_jsonb($2::text))
    where case_ref=$1`, [caseRef, prefixed("tampered-release")]);
  await db.query(`select public.velmere_resolve_completed_audit_verify_binding_v1($1::text)`, [caseRef]);
}, /audit_verify_release_binding_digest_invalid/u);

const afterNegativeCounts = await db.query(`select
  (select count(*)::int from public.velmere_verify_publication_identities) as identities,
  (select count(*)::int from public.velmere_verify_publication_events) as events,
  (select count(*)::int from public.velmere_audit_verify_publication_bridges) as bridges`);
check("negative_paths_create_no_duplicate_report", afterNegativeCounts.rows[0].identities === 1
  && afterNegativeCounts.rows[0].events === 2
  && afterNegativeCounts.rows[0].bridges === 1, afterNegativeCounts.rows[0]);

const migrationAfter = fs.readFileSync(bridgeMigrationPath);
check("migration_source_not_mutated_by_test", crypto.createHash("sha256").update(migrationAfter).digest("hex") === bridgeMigrationSha256);

await db.close();
const failed = checks.filter((row) => !row.pass);
console.log(JSON.stringify({
  schemaVersion: "velmere.v4.audit-verify-producer-pglite-proof.v1",
  status: failed.length ? "FAIL" : "PASS_LOCAL_ONLY",
  assertions: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  failures: failed,
  bridgeMigrationSha256,
  truthBoundary: "PGlite PostgreSQL semantics only. No Supabase staging, deployment, monitor-worker uptime, customer, FINAL, GO_PAID or LIVE credit.",
  stagingCredit: false,
  liveCredit: false,
  finalCredit: false,
}, null, 2));
if (failed.length) process.exitCode = 1;
