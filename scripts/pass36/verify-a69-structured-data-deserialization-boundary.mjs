import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (value) => fs.readFileSync(path.join(root, value), "utf8");
const json = (value) => JSON.parse(read(value));
const checks = [];
const check = (id, pass, detail = null) => checks.push({ id, pass: Boolean(pass), detail });
const REVISION = "VELMERE_PASS36_A69R0_STRUCTURED_DATA_DESERIALIZATION_TRUST_BOUNDARY_HARDENING";
const PARENT = "VELMERE_PASS36_A68R0_FILESYSTEM_PERSISTENCE_TRUST_BOUNDARY_HARDENING";

const policy = json("config/pass36/a69-structured-data-deserialization-trust-boundary.json");
const state = json("config/pass36/a69-current-state.json");
const receipt = json("config/pass36/a69-structured-data-deserialization-test-receipt.json");
const current = json("config/pass35/current-revision.json");
const pkg = json("package.json");
const active = read("VELMERE_ACTIVE_PASS.txt").trim();
const boundary = read("lib/security/strict-json-boundary.ts");
const integrations = [
  "lib/server/search-route-modules/lens-report.ts",
  "lib/security/audit-provider-runtime-client.ts",
  "lib/security/audit-permission-parser.ts",
  "lib/security/contract-source-abi-extraction.ts",
  "lib/jobs/durable-computation-payload.ts",
  "lib/jobs/durable-computation-replay.ts",
  "lib/server/security-route-modules/csp-report.ts"
];

check("revision:policy", policy.revisionId === REVISION && policy.parentRevisionId === PARENT);
check("revision:state", state.revisionId === REVISION && state.parentRevisionId === PARENT);
check("revision:current", current.sourceRevisionId === "VELMERE_PASS36_A83R0_BROWSER_LENS_PDF_REAL_PACKET_MATRIX_AND_SECURE_DELIVERY_PARITY");
check("revision:active", active === "VELMERE_PASS36_A83R0_BROWSER_LENS_PDF_REAL_PACKET_MATRIX_AND_SECURE_DELIVERY_PARITY");
check("current:a69", current.structuredDataDeserializationTrustBoundaryRevisionId === REVISION && current.structuredDataDeserializationTrustBoundaryImplemented === true);
check("current:a68-retained", current.filesystemPersistenceTrustBoundaryRevisionId === PARENT && current.filesystemPersistenceTrustBoundaryImplemented === true);
check("policy:single-boundary", policy.requirements?.singleSharedStrictJsonBoundary === true);
check("policy:bytes", policy.requirements?.boundedUtf8Bytes === true && policy.requirements?.fatalUtf8ForByteInputs === true);
check("policy:keys", policy.requirements?.duplicateObjectKeysRejected === true && policy.requirements?.prototypePollutionKeysRejected === true);
check("policy:complexity", policy.requirements?.maximumDepthRequired === true && policy.requirements?.maximumNodeCountRequired === true);
check("boundary:id", boundary.includes('STRICT_JSON_BOUNDARY_ID = "velmere.pass36.a69.strict-json-boundary.v1"'));
check("boundary:duplicate", boundary.includes("strict_json_duplicate_key"));
check("boundary:forbidden", boundary.includes("__proto__") && boundary.includes("strict_json_forbidden_key"));
check("boundary:depth", boundary.includes("strict_json_depth_exceeded"));
check("boundary:nodes", boundary.includes("strict_json_node_limit_exceeded"));
check("boundary:utf8", boundary.includes('TextDecoder("utf-8", { fatal: true })'));
check("boundary:byte-budget", boundary.includes("Buffer.byteLength") && boundary.includes("strict_json_too_large"));
for (const file of integrations) {
  const source = read(file);
  check(`integration:${file}:imports`, source.includes("strict-json-boundary"));
  check(`integration:${file}:uses`, /parseStrictJson(?:Text|Bytes)/u.test(source));
}
check("test:all-pass", receipt.total >= 40 && receipt.passed === receipt.total && receipt.failed === 0, receipt);
for (const id of [
  "duplicate_key_rejected",
  "escaped_duplicate_key_rejected",
  "forbidden___proto___rejected",
  "forbidden_constructor_rejected",
  "depth_limit_rejected",
  "node_limit_rejected",
  "invalid_utf8_rejected",
  "lens_form_payload_no_direct_json_parse",
  "provider_response_no_direct_json_parse",
  "durable_payload_no_direct_json_parse"
]) check(`test:${id}`, receipt.checks?.some((row) => row.id === id && row.pass === true));
check("package:test", pkg.scripts?.["test:pass36:a69"] === "node --experimental-strip-types scripts/pass36/test-a69-structured-data-deserialization-boundary.mjs");
check("package:verify", pkg.scripts?.["verify:pass36:a69"] === "node scripts/pass36/verify-a69-structured-data-deserialization-boundary.mjs");
check("truth:no-external-credit", state.realProviderNetworkExecuted === false && state.realCustomerLensExportExecuted === false && state.realDurableWorkerExecuted === false);
check("truth:no-release-credit", state.exactFinalByteBuildExecuted === false && state.criticalOfflineGatePassed === false && state.realStagingExecuted === false && state.saleEnabled === false && state.liveProven === false);

const failed = checks.filter((row) => !row.pass);
const output = {
  schemaVersion: "velmere.pass36.a69.structured-data-deserialization-verification.v1",
  revisionId: REVISION,
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  checks,
};
console.log(JSON.stringify(output, null, 2));
if (failed.length) process.exit(1);
