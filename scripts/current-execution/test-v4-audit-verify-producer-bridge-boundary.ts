import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const migrationPath = "supabase/migrations/20260821000005_v4_audit_verify_initial_producer_bridge.sql";
const bridgePath = "lib/server/audit-verify-initial-publication-bridge.ts";
const routes = [
  "lib/server/lazy-route-modules/security--audit-review--basic--settle.ts",
  "lib/server/lazy-route-modules/security--audit-review--pro--settle.ts",
  "lib/server/lazy-route-modules/security--audit-review--advanced--settle.ts",
] as const;

assert.equal(existsSync(migrationPath), true, "trusted Audit→Verify producer migration is missing");
assert.equal(existsSync(bridgePath), true, "trusted Audit→Verify runtime bridge is missing");

const migration = readFileSync(migrationPath, "utf8");
const bridge = readFileSync(bridgePath, "utf8");
const operationRegistry = readFileSync("lib/db/supabase-rpc-operation-registry.ts", "utf8");

for (const marker of [
  "velmere_audit_verify_visibility_consent_events",
  "velmere_audit_verify_publication_bridges",
  "velmere_record_audit_verify_visibility_consent_v1",
  "velmere_publish_completed_audit_to_verify_v1",
  "audit_verify_exact_customer_artifact_required",
  "audit_verify_current_deployment_line_invalid",
  "audit_verify_public_visibility_consent_required",
  "velmere_append_verify_publication_event_v1",
  "gen_random_bytes(24)",
]) {
  assert.match(migration, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"), marker);
}

assert.match(migration, /p_requested_visibility text default 'PRIVATE'/u);
assert.match(migration, /review_state <> 'completed'/u);
assert.match(migration, /source_receipt_root/u);
assert.match(migration, /currentDeploymentReceiptDigest/u);
assert.match(migration, /v_release->>'packetDigest'/u);
assert.match(migration, /renderContract,pdfDigest/u);
assert.match(migration, /target_chain_id/u);
assert.match(migration, /lower\(v_case\.target_private\)/u);
assert.match(migration, /report_id text not null unique/u);
assert.match(migration, /snapshot_digest text not null unique/u);
assert.match(migration, /order by consent_sequence desc/u);
assert.match(migration, /verify_publication_event_immutable/u);
assert.doesNotMatch(migration, /grant execute[^;]+velmere_publish_completed_audit_to_verify_v1[^;]+authenticated/isu);
assert.match(migration, /grant execute on function public\.velmere_publish_completed_audit_to_verify_v1\(text,text\)\s+to service_role/isu);
assert.match(migration, /grant execute on function public\.velmere_record_audit_verify_visibility_consent_v1\(text,text\)\s+to authenticated/isu);

assert.match(operationRegistry, /audit_verify_initial_publish:\s*\{\s*rpcName:\s*"velmere_publish_completed_audit_to_verify_v1"/u);
assert.match(bridge, /status:\s*"ACTIVE_PRIVATE"/u);
assert.match(bridge, /status:\s*"WITHHELD"/u);
assert.match(bridge, /p_requested_visibility:\s*"PRIVATE"/u);
assert.doesNotMatch(bridge, /createVerifyPublicProofId/u);

for (const route of routes) {
  const source = readFileSync(route, "utf8");
  const completionIndex = source.indexOf("atomicCompletionResult =");
  const verifyIndex = source.indexOf("verifyPublication = await publishCompletedAuditToPrivateVerify");
  assert.ok(completionIndex >= 0, `${route}: durable completion result missing`);
  assert.ok(verifyIndex > completionIndex, `${route}: Verify producer must run only after immutable Audit completion`);
  assert.match(source, /verifyPublication/u, `${route}: response must expose exact Verify result`);
}

console.log("V4 Audit→Verify trusted initial producer boundary: PASS");
