import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (value) => fs.readFileSync(path.join(root, value), "utf8");
const json = (value) => JSON.parse(read(value));
const checks = [];
const check = (id, pass, detail = null) => checks.push({ id, pass: Boolean(pass), detail });
const REVISION = "VELMERE_PASS36_A68R0_FILESYSTEM_PERSISTENCE_TRUST_BOUNDARY_HARDENING";
const PARENT = "VELMERE_PASS36_A67R0_NETWORK_EGRESS_CREDENTIAL_AND_SAME_ORIGIN_TRUST_BOUNDARY_HARDENING";

const policy = json("config/pass36/a68-filesystem-persistence-trust-boundary.json");
const state = json("config/pass36/a68-current-state.json");
const receipt = json("config/pass36/a68-filesystem-persistence-trust-boundary-test-receipt.json");
const current = json("config/pass35/current-revision.json");
const packageJson = json("package.json");
const activePass = read("VELMERE_ACTIVE_PASS.txt").trim();
const boundary = read("lib/security/durable-file-boundary.ts");
const modules = [
  "lib/market-integrity/provider-evidence-ledger.ts",
  "lib/market-integrity/instrument-metadata-cache.ts",
  "lib/market-integrity/continuous-evidence-availability.ts",
  "lib/products/local-product-store.ts",
].map((file) => ({ file, source: read(file) }));

check("revision:policy", policy.revisionId === REVISION && policy.parentRevisionId === PARENT);
check("revision:state", state.revisionId === REVISION && state.parentRevisionId === PARENT);
check("revision:current", current.sourceRevisionId === "VELMERE_PASS36_A83R0_BROWSER_LENS_PDF_REAL_PACKET_MATRIX_AND_SECURE_DELIVERY_PARITY");
check("revision:active-pass", activePass === "VELMERE_PASS36_A83R0_BROWSER_LENS_PDF_REAL_PACKET_MATRIX_AND_SECURE_DELIVERY_PARITY");
check("current:a68-field", current.filesystemPersistenceTrustBoundaryRevisionId === REVISION && current.filesystemPersistenceTrustBoundaryImplemented === true);
check("current:a67-retained", current.networkEgressTrustBoundaryRevisionId === PARENT);
check("policy:shared-boundary", policy.requirements?.singleSharedDurableFileBoundary === true);
check("policy:absolute-production-root", policy.requirements?.productionRootMustBeAbsolute === true);
check("policy:symlink-free", policy.requirements?.symlinkComponentsForbidden === true && policy.requirements?.symlinkTargetsForbidden === true);
check("policy:permissions", policy.requirements?.groupWorldWritableProductionRootForbidden === true);
check("policy:atomic", policy.requirements?.exclusiveTemporaryFile === true && policy.requirements?.atomicRename === true);
check("policy:bounded", policy.requirements?.boundedReadAndWrite === true && policy.requirements?.exactReadBackDigest === true);
check("boundary:id", boundary.includes('DURABLE_FILE_BOUNDARY_ID = "velmere.pass36.a68.durable-file-boundary.v1"'));
check("boundary:no-follow", boundary.includes("O_NOFOLLOW") && boundary.includes("durable_file_target_symlink_forbidden"));
check("boundary:path-components", boundary.includes("assertPathComponentsSymlinkFree") && boundary.includes("durable_file_path_symlink_forbidden"));
check("boundary:production-absolute", boundary.includes("durable_file_root_absolute_required"));
check("boundary:root-permissions", boundary.includes("durable_file_root_writable_by_group_or_world"));
check("boundary:exclusive-temp", boundary.includes("O_EXCL") && boundary.includes("randomUUID"));
check("boundary:sync", boundary.includes("await handle.sync()") && boundary.includes("syncDirectoryBestEffort"));
check("boundary:rename", boundary.includes("await fs.rename(temporary, target)"));
check("boundary:readback", boundary.includes("durable_file_readback_mismatch") && boundary.includes("readDurableFileBounded(options)"));
check("boundary:cleanup", boundary.includes("await fs.unlink(temporary).catch"));
for (const { file, source } of modules) {
  check(`module:${file}:uses-boundary`, source.includes("durable-file-boundary"));
  check(`module:${file}:no-direct-write-rename`, !/\b(?:writeFile|rename)\s*\(/u.test(source));
}
check("test:all-pass", receipt.total === 38 && receipt.passed === 38 && receipt.failed === 0);
for (const id of [
  "symlink_root_rejected",
  "symlink_component_rejected",
  "target_symlink_write_rejected",
  "world_writable_production_root_rejected",
  "oversized_read_rejected",
  "regular_file_replacement_atomic",
  "temporary_files_cleaned",
]) check(`test:${id}`, receipt.checks?.some((row) => row.id === id && row.pass === true));
check("package:test-script", packageJson.scripts?.["test:pass36:a68"] === "node --experimental-strip-types scripts/pass36/test-a68-filesystem-persistence-trust-boundary.mjs");
check("package:verify-script", packageJson.scripts?.["verify:pass36:a68"] === "node scripts/pass36/verify-a68-filesystem-persistence-trust-boundary.mjs");
check("truth:no-production-credit", state.realProductionFilesystemExecuted === false && state.distributedLockProven === false && state.networkFilesystemSemanticsProven === false);
check("truth:no-release-credit", state.exactFinalByteBuildExecuted === false && state.criticalOfflineGatePassed === false && state.realStagingExecuted === false && state.saleEnabled === false && state.liveProven === false);

const failed = checks.filter((row) => !row.pass);
const output = {
  schemaVersion: "velmere.pass36.a68.filesystem-persistence-trust-boundary-verification.v1",
  revisionId: REVISION,
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  checks,
};
console.log(JSON.stringify(output, null, 2));
if (failed.length) process.exit(1);
