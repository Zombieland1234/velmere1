#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const migrationPath = path.join(root, "supabase/migrations/20260720000008_5007_pass22_owner_operator_rls_and_provider_evidence.sql");
const a102r2MigrationPath = path.join(
  root,
  "supabase/migrations/20260729000003_a102r2_salted_account_binding_rls.sql",
);
const classificationPath = path.join(root, "config/pass22/rls-table-classification.json");
const outputPath = path.join(root, ".velmere/pass22-diagnostics/owner-operator-rls-audit.json");
const baseSql = fs.readFileSync(migrationPath, "utf8");
const a102r2Sql = fs.readFileSync(a102r2MigrationPath, "utf8");
const sql = `${baseSql}\n${a102r2Sql}`;
const classification = JSON.parse(fs.readFileSync(classificationPath, "utf8"));
const expectedPolicies = [
  "pass22_account_subject_owner_select", "pass22_audit_intake_owner_select", "a102r2_audit_pdf_consumption_owner_select",
  "a102r2_audit_report_snapshot_owner_select", "a102r2_customer_artifact_snapshot_owner_select", "a102r2_customer_artifact_pdf_owner_select",
  "pass22_angel_memory_owner_select", "pass22_order_draft_owner_select", "pass22_order_owner_select", "pass22_order_item_owner_select",
  "pass22_order_event_owner_select", "pass22_order_state_event_owner_select", "pass22_entitlement_owner_select",
  "pass22_admin_role_self_or_owner_select", "pass22_admin_session_self_or_owner_select", "pass22_audit_log_operator_select",
  "pass22_fulfilment_recovery_operator_select", "pass22_support_handoff_operator_select", "pass22_human_audit_queue_operator_select"
];
const supersededPolicies = [
  "pass22_audit_pdf_consumption_owner_select",
  "pass22_audit_report_snapshot_owner_select",
  "pass22_customer_artifact_snapshot_owner_select",
  "pass22_customer_artifact_pdf_owner_select",
];
const requiredHelpers = [
  "velmere_current_account_hash", "velmere_current_actor_id", "velmere_current_operator_role", "velmere_has_operator_role",
  "velmere_is_resource_owner", "velmere_bind_admin_subject", "velmere_bind_account_resource"
];
const errors = [];
for (const name of expectedPolicies) if (!new RegExp(`create\\s+policy\\s+${name}\\b`, "iu").test(sql)) errors.push(`missing_policy:${name}`);
for (const name of supersededPolicies) if (!new RegExp(`drop\\s+policy\\s+if\\s+exists\\s+${name}\\b`, "iu").test(a102r2Sql)) errors.push(`missing_superseded_policy_drop:${name}`);
if (!/create\s+or\s+replace\s+function\s+public\.velmere_current_account_binding_hash\b/iu.test(a102r2Sql)) errors.push("salted_account_binding_helper_missing");
if (!/'velmere-account-binding-v1:'\s*\|\|\s*public\.velmere_current_account_id\(\)/iu.test(a102r2Sql)) errors.push("salted_account_binding_domain_separator_missing");
for (const name of requiredHelpers) if (!new RegExp(`create\\s+or\\s+replace\\s+function\\s+public\\.${name}\\b`, "iu").test(sql)) errors.push(`missing_helper:${name}`);
if (/using\s*\([^)]*(?:actor_email|customer_email|wallet_address)\s*=/iu.test(sql)) errors.push("unsafe_identity_policy");
if (/grant\s+select\s+on\s+public\.velmere_admin_sessions\s+to\s+authenticated/iu.test(sql)) errors.push("admin_session_hash_exposed");
if (!/grant\s+select\s*\([^)]*expires_at[^)]*\)\s+on\s+public\.velmere_admin_sessions\s+to\s+authenticated/iu.test(sql)) errors.push("safe_admin_session_columns_missing");
if (/grant\s+(?:insert|update|delete)[^;]*to\s+authenticated/iu.test(sql)) errors.push("authenticated_mutation_grant_detected");
if (!/revoke\s+all\s+on\s+table\s+public\.velmere_account_resource_bindings\s+from\s+public,\s*anon,\s*authenticated/iu.test(sql)) errors.push("resource_binding_not_server_only");
if (!/account_id_hash\s*=\s*encode\(digest\(account_id,\s*'sha256'\),\s*'hex'\)/iu.test(sql)) errors.push("resource_binding_hash_constraint_missing");
const policyRows = classification.tables.filter((row) => row.classification.includes("POLICY_IMPLEMENTED_STATIC"));
const stagingProofRows = policyRows.filter((row) => row.requiresMultiUserStagingProof === true);
if (policyRows.length !== 19) errors.push(`classification_policy_count:${policyRows.length}`);
if (stagingProofRows.length !== 19) errors.push(`staging_proof_count:${stagingProofRows.length}`);
if (policyRows.some((row) => row.blocksStaging !== false || row.explicitPolicyPresent !== true)) errors.push("classification_status_invalid");
const report = {
  schemaVersion: "velmere.pass22.owner-operator-rls-audit.v1",
  generatedAt: "2026-07-20T14:30:00.000Z",
  ok: errors.length === 0,
  expectedPolicies: expectedPolicies.length,
  policiesFound: expectedPolicies.filter((name) => new RegExp(`create\\s+policy\\s+${name}\\b`, "iu").test(sql)).length,
  helperFunctions: requiredHelpers.length,
  supersededPoliciesDropped: supersededPolicies.length - errors.filter((entry) => entry.startsWith("missing_superseded_policy_drop:")).length,
  effectivePolicyRevision: "A102R2",
  staticallyImplementedPolicyRows: policyRows.length,
  multiUserStagingProofRequired: stagingProofRows.length,
  codeLevelStagingPolicyBlockers: errors.length === 0 ? 0 : 19,
  stagingProven: false,
  errors,
  status: errors.length === 0 ? "POLICIES_IMPLEMENTED_STATIC_MULTI_USER_REPLAY_REQUIRED" : "FAIL",
  truthBoundary: "This gate verifies the composed PASS22+A102R2 SQL source contract only. It does not execute migrations, backfill legacy rows, populate subject/resource bindings, verify Postgres RLS behavior or prove tenant isolation."
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);
