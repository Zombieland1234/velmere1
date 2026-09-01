import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const json = (p) => JSON.parse(read(p));
const checks = [];
const check = (id, pass, detail = null) => checks.push({ id, pass: Boolean(pass), detail });

const boundary = read("lib/security/external-command-boundary.ts");
const signer = read("lib/worldclass/commercial-cohort-external-key-custody.ts");
const publisher = read("lib/worldclass/commercial-cohort-transparency-publisher-client.ts");
const policy = json("config/pass36/a65-external-command-trust-boundary.json");
const state = json("config/pass36/a65-current-state.json");
const receipt = json("config/pass36/a65-external-command-trust-boundary-test-receipt.json");
const current = json("config/pass35/current-revision.json");
const packageJson = json("package.json");
const activePass = read("VELMERE_ACTIVE_PASS.txt").trim();

check("revision:policy", policy.revisionId === "VELMERE_PASS36_A65R0_EXTERNAL_COMMAND_EXECUTION_TRUST_BOUNDARY_HARDENING");
check("revision:state", state.revisionId === policy.revisionId);
check("revision:current", current.sourceRevisionId === "VELMERE_PASS36_A83R0_BROWSER_LENS_PDF_REAL_PACKET_MATRIX_AND_SECURE_DELIVERY_PARITY" && current.externalCommandTrustBoundaryRevisionId === policy.revisionId);
check("revision:active-pass", activePass === "VELMERE_PASS36_A83R0_BROWSER_LENS_PDF_REAL_PACKET_MATRIX_AND_SECURE_DELIVERY_PARITY");
check("parent:a64", policy.parentRevisionId === "VELMERE_PASS36_A64R0_HISTORICAL_CONTROL_METADATA_RECOVERY_COMPLETE_CONTROL_PLANE");
check("boundary:absolute-path", boundary.includes("path.isAbsolute(input)"));
check("boundary:symlink", boundary.includes("isSymbolicLink()") && boundary.includes("symlink_forbidden"));
check("boundary:realpath", boundary.includes("realpathSync") && boundary.includes("realpath_mismatch"));
check("boundary:executable-hash", boundary.includes("expectedExecutableSha256") && boundary.includes("executable_digest_mismatch"));
check("boundary:args-hash", boundary.includes("expectedArgsSha256") && boundary.includes("args_digest_mismatch"));
check("boundary:file-binding", boundary.includes("fileArgumentBindings") && boundary.includes("interpreter_entrypoint_unbound"));
check("boundary:posix-mode", boundary.includes("0o022") && boundary.includes("0o111"));
check("boundary:no-shell", boundary.includes("shell: false"));
check("boundary:isolated-cwd", boundary.includes("randomBytes(16)") && boundary.includes("cwd: executionRoot.work") && boundary.includes("removeExecutionRoot"));
check("boundary:private-image", boundary.includes("executionImageSha256") && boundary.includes("source_changed_before_spawn"));
check("boundary:explicit-profile", boundary.includes("executionProfile") && boundary.includes("external_command_interpreter_entrypoint_unbound"));
check("boundary:no-path-inheritance", !boundary.includes('baseNames = ["PATH"') && boundary.includes("external_command_dangerous_environment_forbidden"));
check("boundary:sensitive-env", boundary.includes("external_command_sensitive_environment_forbidden") && boundary.includes("SENSITIVE_ENV"));
check("boundary:loader-env", boundary.includes("NODE_OPTIONS") && boundary.includes("LD_PRELOAD") && boundary.includes("DYLD_"));
check("boundary:bounded-input-output", boundary.includes("2 * 1024 * 1024") && boundary.includes("4 * 1024 * 1024"));
check("boundary:stderr-digest-only", boundary.includes("stderrDigest") && !boundary.includes("result.stderr, 2048"));
check("signer:shared-boundary", signer.includes("runBoundExternalCommand") && signer.includes("ExternalCommandBoundary"));
check("signer:no-direct-spawn", !signer.includes("spawnSync") && !signer.includes("function sanitizedEnvironment"));
check("publisher:shared-boundary", publisher.includes("runBoundExternalCommand") && publisher.includes("ExternalCommandBoundary"));
check("publisher:no-direct-spawn", !publisher.includes("spawnSync") && !publisher.includes("function sanitizedEnvironment"));
check("test:all-pass", receipt.total === 34 && receipt.passed === 34 && receipt.failed === 0);
check("test:secret-noninheritance", receipt.checks.some((x) => x.id === "secret_environment_not_inherited" && x.pass));
check("test:node-options-noninheritance", receipt.checks.some((x) => x.id === "dangerous_node_options_not_inherited" && x.pass));
check("test:tamper-rejection", receipt.checks.some((x) => x.id === "wrong_bound_file_digest_rejected" && x.pass));
check("test:stderr-redaction", receipt.checks.some((x) => x.id === "stderr_secret_not_exposed" && x.pass));
check("truth:no-production-credit", state.productionExternalSignerExecuted === false && state.productionTransparencyPublisherExecuted === false && state.saleEnabled === false && state.liveProven === false);
check("package:test-script", packageJson.scripts?.["test:pass36:a65"] === "node --experimental-strip-types scripts/pass36/test-a65-external-command-trust-boundary.mjs");
check("package:verify-script", packageJson.scripts?.["verify:pass36:a65"] === "node scripts/pass36/verify-a65-external-command-trust-boundary.mjs");

const failed = checks.filter((entry) => !entry.pass);
const output = {
  schemaVersion: "velmere.pass36.a65.external-command-boundary-verification.v1",
  revisionId: policy.revisionId,
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  checks,
};
console.log(JSON.stringify(output, null, 2));
if (failed.length) process.exit(1);
