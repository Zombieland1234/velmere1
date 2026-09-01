import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const json = (p) => JSON.parse(read(p));
const checks = [];
const check = (id, pass, detail = null) => checks.push({ id, pass: Boolean(pass), detail });
const REVISION = "VELMERE_PASS36_A66R0_AUDIT_TOOL_EXECUTION_TRUST_BOUNDARY_HARDENING";

const policy = json("config/pass36/a66-audit-tool-execution-trust-boundary.json");
const state = json("config/pass36/a66-current-state.json");
const receipt = json("config/pass36/a66-audit-tool-execution-boundary-test-receipt.json");
const a4Receipt = json("config/pass36/a66-a4-solc-regression-receipt.json");
const current = json("config/pass35/current-revision.json");
const packageJson = json("package.json");
const activePass = read("VELMERE_ACTIVE_PASS.txt").trim();
const boundary = read("lib/security/external-command-boundary.ts");
const adapter = read("lib/security/audit-a02-solc-reproduction.ts");
const fixture = read("fixtures/pass35/audit-a4/fake-solc.mjs");
const a4Test = read("scripts/pass35/test-audit-a4-solc-reproduction.ts");

check("revision:policy", policy.revisionId === REVISION);
check("revision:state", state.revisionId === REVISION);
check("revision:current", current.sourceRevisionId === "VELMERE_PASS36_A83R0_BROWSER_LENS_PDF_REAL_PACKET_MATRIX_AND_SECURE_DELIVERY_PARITY" && current.auditToolExecutionTrustBoundaryRevisionId === REVISION);
check("revision:active-pass", activePass === "VELMERE_PASS36_A83R0_BROWSER_LENS_PDF_REAL_PACKET_MATRIX_AND_SECURE_DELIVERY_PARITY");
check("parent:a65", policy.parentRevisionId === "VELMERE_PASS36_A65R0_EXTERNAL_COMMAND_EXECUTION_TRUST_BOUNDARY_HARDENING");
check("boundary:id", boundary.includes('PASS36_EXTERNAL_COMMAND_BOUNDARY_ID = "velmere.pass36.external-command-boundary.v4"'));
check("boundary:private-image", boundary.includes("executionImageSha256") && boundary.includes("source_changed_before_spawn"));
check("boundary:explicit-profile", boundary.includes("executionProfile") && boundary.includes("node-script") && boundary.includes("native"));
check("boundary:configurable-input", boundary.includes("maxInputBytes?: number") && boundary.includes("8 * 1024 * 1024"));
check("boundary:input-floor-ceiling", boundary.includes("input_limit_invalid") && boundary.includes("maxInputBytes < 1024"));
check("boundary:isolated-cwd", boundary.includes("randomBytes(16)") && boundary.includes("cwd: executionRoot.work") && boundary.includes("removeExecutionRoot"));
check("boundary:no-shell", boundary.includes("shell: false"));
check("boundary:minimal-env", boundary.includes("sanitizedEnvironment") && !boundary.includes('baseNames = ["PATH"'));
check("boundary:stderr-digest", boundary.includes("stderrDigest") && boundary.includes("command_exit"));
check("adapter:shared-boundary", adapter.includes("runBoundExternalCommand") && adapter.includes("PASS36_EXTERNAL_COMMAND_BOUNDARY_ID"));
check("adapter:no-direct-spawn", !adapter.includes('from "node:child_process"') && !adapter.includes("spawnSync("));
check("adapter:native-executable-anchor", adapter.includes("expectedExecutableSha256") && adapter.includes("a4_tool_executable_digest_mismatch"));
check("adapter:entrypoint-anchor", adapter.includes("expectedEntrypointSha256") && adapter.includes("fileArgumentBindings.push({ index: 0"));
check("adapter:argument-digests", adapter.includes("externalCommandArgsSha256(commandArgs)") && adapter.includes("versionArgsSha256") && adapter.includes("compileArgsSha256"));
check("adapter:empty-env-allowlist", adapter.includes("environmentAllowlist: []"));
check("adapter:large-standard-json-budget", adapter.includes("maxInputBytes: 8 * 1024 * 1024"));
check("adapter:bounded-output", adapter.includes("4 * 1024 * 1024"));
check("adapter:boundary-error-classification", adapter.includes("a4_compiler_boundary_failure") && adapter.includes("errorCode"));
check("adapter:receipt-truth", adapter.includes("isolatedWorkingDirectory: true") && adapter.includes("inheritedEnvironment: false"));
check("fixture:rejects-env-leak", fixture.includes("forbiddenEnvironment") && fixture.includes("STRIPE_SECRET_KEY") && fixture.includes("NODE_OPTIONS"));
check("fixture:requires-isolated-cwd", fixture.includes("velmere-external-command-"));
check("a4-test:sets-hostile-env", a4Test.includes("sk_live_a66_must_not_reach_compiler") && a4Test.includes("a66-evil-loader"));
check("a4-test:boundary-fields", a4Test.includes("executionBoundaryId") && a4Test.includes("compileArgsSha256"));
check("test:all-pass", receipt.total === 26 && receipt.passed === 26 && receipt.failed === 0);
check("test:environment-isolation", receipt.checks.some((x) => x.id === "solc_environment_noninheritance_recorded" && x.pass));
check("test:symlink-rejection", receipt.checks.some((x) => x.id === "symlink_compiler_entrypoint_rejected" && x.pass));
check("test:writable-rejection", receipt.checks.some((x) => x.id === "writable_compiler_entrypoint_rejected" && x.pass));
check("test:stderr-redaction", receipt.checks.some((x) => x.id === "compiler_stderr_secret_not_exposed" && x.pass));
check("test:single-child-process-sink", receipt.checks.some((x) => x.id === "only_shared_boundary_imports_child_process_in_lib" && x.pass));
check("a4-regression:pass", a4Receipt.status === "PASS_AUDIT_A4_SOLC_REPRODUCTION" && a4Receipt.assertions === 22);
check("a4-regression:not-paid", a4Receipt.fixtureOnly === true && a4Receipt.paidGateEligible === false);
check("truth:no-real-solc-credit", state.officialSolcExecuted === false && state.realProviderBoundContractExecuted === false);
check("truth:no-release-credit", state.exactFinalByteBuildExecuted === false && state.criticalOfflineGatePassed === false && state.saleEnabled === false && state.liveProven === false);
check("package:test-script", packageJson.scripts?.["test:pass36:a66"] === "node --experimental-strip-types scripts/pass36/test-a66-audit-tool-execution-boundary.mjs");
check("package:verify-script", packageJson.scripts?.["verify:pass36:a66"] === "node scripts/pass36/verify-a66-audit-tool-execution-boundary.mjs");
check("current:a66-field", current.auditToolExecutionTrustBoundaryRevisionId === REVISION && current.auditToolExecutionTrustBoundaryImplemented === true);

const failed = checks.filter((entry) => !entry.pass);
const output = {
  schemaVersion: "velmere.pass36.a66.audit-tool-execution-boundary-verification.v1",
  revisionId: REVISION,
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  checks,
};
console.log(JSON.stringify(output, null, 2));
if (failed.length) process.exit(1);
