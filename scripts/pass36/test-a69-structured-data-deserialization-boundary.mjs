import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  STRICT_JSON_BOUNDARY_ID,
  StrictJsonBoundaryError,
  parseStrictJsonBytes,
  parseStrictJsonText,
} from "../../lib/security/strict-json-boundary.ts";

const REVISION = "VELMERE_PASS36_A69R0_STRUCTURED_DATA_DESERIALIZATION_TRUST_BOUNDARY_HARDENING";
const checks = [];
const check = (id, condition, detail = null) => {
  const pass = Boolean(condition);
  checks.push({ id, pass, detail });
  assert.ok(pass, id);
};
const expectCode = (id, fn, code) => {
  try {
    fn();
    check(id, false, "unexpected_success");
  } catch (error) {
    check(id, error instanceof StrictJsonBoundaryError && error.code === code, error instanceof Error ? error.message : String(error));
  }
};

check("boundary_id_exact", STRICT_JSON_BOUNDARY_ID === "velmere.pass36.a69.strict-json-boundary.v1");
const object = parseStrictJsonText('{"alpha":1,"nested":{"beta":true},"items":[1,2,3]}', { maxBytes: 1024, requireObject: true });
check("valid_object_parsed", object.alpha === 1 && object.nested.beta === true && object.items.length === 3);
const array = parseStrictJsonText('[{"a":1},{"b":2}]', { maxBytes: 1024, requireArray: true });
check("valid_array_parsed", Array.isArray(array) && array.length === 2);
check("valid_primitive_when_allowed", parseStrictJsonText('true', { maxBytes: 32, requireObject: false }) === true);
check("valid_utf8_bytes", parseStrictJsonBytes(new TextEncoder().encode('{"zażółć":"gęślą"}'), { maxBytes: 128, requireObject: true }).zażółć === "gęślą");

expectCode("duplicate_key_rejected", () => parseStrictJsonText('{"a":1,"a":2}', { maxBytes: 128 }), "strict_json_duplicate_key");
expectCode("nested_duplicate_key_rejected", () => parseStrictJsonText('{"x":{"a":1,"a":2}}', { maxBytes: 128 }), "strict_json_duplicate_key");
expectCode("escaped_duplicate_key_rejected", () => parseStrictJsonText('{"a":1,"\\u0061":2}', { maxBytes: 128 }), "strict_json_duplicate_key");
for (const key of ["__proto__", "prototype", "constructor"]) {
  expectCode(`forbidden_${key}_rejected`, () => parseStrictJsonText(JSON.stringify({ safe: { [key]: { polluted: true } } }), { maxBytes: 256 }), "strict_json_forbidden_key");
}
expectCode("escaped_forbidden_key_rejected", () => parseStrictJsonText('{"\\u005f\\u005fproto__":{}}', { maxBytes: 128 }), "strict_json_forbidden_key");

const deep = `${"[".repeat(35)}0${"]".repeat(35)}`;
expectCode("depth_limit_rejected", () => parseStrictJsonText(deep, { maxBytes: 256, maxDepth: 16, requireObject: false }), "strict_json_depth_exceeded");
expectCode("node_limit_rejected", () => parseStrictJsonText('[1,2,3,4,5,6]', { maxBytes: 128, maxNodes: 5, requireArray: true }), "strict_json_node_limit_exceeded");
expectCode("byte_limit_rejected", () => parseStrictJsonText(JSON.stringify({ value: "x".repeat(128) }), { maxBytes: 32 }), "strict_json_too_large");
expectCode("invalid_json_rejected", () => parseStrictJsonText('{"a":}', { maxBytes: 128 }), "strict_json_invalid");
expectCode("trailing_json_rejected", () => parseStrictJsonText('{"a":1} trailing', { maxBytes: 128 }), "strict_json_invalid");
expectCode("object_requirement_enforced", () => parseStrictJsonText('[1,2]', { maxBytes: 128, requireObject: true }), "strict_json_object_required");
expectCode("array_requirement_enforced", () => parseStrictJsonText('{"a":1}', { maxBytes: 128, requireArray: true }), "strict_json_array_required");
expectCode("conflicting_shape_requirements_rejected", () => parseStrictJsonText('{}', { maxBytes: 128, requireObject: true, requireArray: true }), "strict_json_input_type_invalid");
expectCode("invalid_max_bytes_rejected", () => parseStrictJsonText('{}', { maxBytes: 0 }), "strict_json_max_bytes_invalid");
expectCode("invalid_utf8_rejected", () => parseStrictJsonBytes(Uint8Array.from([0xc3, 0x28]), { maxBytes: 16 }), "strict_json_invalid_utf8");
check("prototype_not_polluted", ({}).polluted === undefined);

const integrations = {
  lens: "lib/server/search-route-modules/lens-report.ts",
  provider: "lib/security/audit-provider-runtime-client.ts",
  permission: "lib/security/audit-permission-parser.ts",
  abi: "lib/security/contract-source-abi-extraction.ts",
  payload: "lib/jobs/durable-computation-payload.ts",
  replay: "lib/jobs/durable-computation-replay.ts",
  csp: "lib/server/security-route-modules/csp-report.ts",
};
for (const [id, file] of Object.entries(integrations)) {
  const source = await readFile(file, "utf8");
  check(`integration_${id}_imports_boundary`, source.includes("strict-json-boundary"), file);
  check(`integration_${id}_uses_strict_parser`, /parseStrictJson(?:Text|Bytes)/u.test(source), file);
}
const lensSource = await readFile(integrations.lens, "utf8");
check("lens_form_payload_no_direct_json_parse", !/rawPayload\s*=\s*JSON\.parse/u.test(lensSource));
const providerSource = await readFile(integrations.provider, "utf8");
check("provider_response_no_direct_json_parse", !/data\s*=\s*text\s*\?\s*JSON\.parse/u.test(providerSource));
const permissionSource = await readFile(integrations.permission, "utf8");
check("permission_abi_no_direct_json_parse", !/const parsed = JSON\.parse\(raw\)/u.test(permissionSource));
const abiSource = await readFile(integrations.abi, "utf8");
check("extraction_abi_no_direct_json_parse", !/const parsed = JSON\.parse\(abiText\)/u.test(abiSource));
const payloadSource = await readFile(integrations.payload, "utf8");
check("durable_payload_no_direct_json_parse", !/JSON\.parse\((?:raw|plaintext)/u.test(payloadSource));
const replaySource = await readFile(integrations.replay, "utf8");
check("durable_result_no_direct_json_parse", !/JSON\.parse\(stored\.payload\)/u.test(replaySource));
const cspSource = await readFile(integrations.csp, "utf8");
check("csp_report_no_direct_json_parse", !/parsed\s*=\s*JSON\.parse\(body\)/u.test(cspSource));

const failed = checks.filter((row) => !row.pass);
const receipt = {
  schemaVersion: "velmere.pass36.a69.structured-data-deserialization-test.v1",
  revisionId: REVISION,
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  checks,
};
console.log(JSON.stringify(receipt, null, 2));
if (failed.length) process.exit(1);
