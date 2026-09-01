import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { canonicalJson, parseDeterministicZip, sha256, writeDeterministicZip } from "../pass4826/release-package-contract.mjs";
import { inventoryFields } from "./package-a102r40-deterministic.mjs";
import { collectA102R42Inventory, validateA102R42PortablePathSet } from "./package-a102r42-deterministic.mjs";
import { loadSourceModePolicy } from "./source-mode-policy.mjs";
import { parseStrictJsonCli } from "./strict-json-cli.mjs";

export const REVISION_ID = "VELMERE_PASS36_A102R44_ACTION_REQUIRED_FINAL_UI_POLISH_EXACT_BUILD_BROWSER_AND_CLEAN_HANDOFF_NO_LIVE_CREDIT";
export const PARENT_REVISION_ID = "VELMERE_PASS36_A102R43_ACTION_REQUIRED_FINAL_UI_UX_PERFORMANCE_HARDENING_AND_BLOCKED_FAULT_EMULATION_NO_LIVE_CREDIT";
export const NORMALIZED_TIMESTAMP = "1980-01-01T00:00:00.000Z";
export const SOURCE_FILE_NAME = `${REVISION_ID}_SOURCE_ONLY.zip`;
export const MATERIALS_FILE_NAME = `${REVISION_ID}_MATERIALS.zip`;
export const ROADMAP_FILE_NAME = "VELMERE_WORLD_CLASS_MAX_ROADMAP_PASS36_A102R44_ACTION_REQUIRED_FINAL_UI_POLISH_EXACT_BUILD_BROWSER_AND_CLEAN_HANDOFF_NO_LIVE_CREDIT.txt";
export const SOURCE_MANIFEST_PATH = "_velmere/PASS36_A102R44_SOURCE_ONLY_MANIFEST.json";
export const MATERIALS_MANIFEST_PATH = "MANIFESTS/PASS36_A102R44_MATERIALS_MANIFEST.json";
export const SOURCE_MODE_POLICY_PATH = "config/pass36/a102r44-cross-platform-source-mode-policy.json";

const invariant = (condition, code) => { if (!condition) throw new Error(code); };
const isInside = (root, target) => {
  const relative = path.relative(root, target);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
};

function assertOutputBoundary(root, output) {
  const resolvedRoot = fs.realpathSync(root);
  const resolvedOutput = path.resolve(output);
  invariant(!isInside(resolvedRoot, resolvedOutput), "a102r44_output_inside_input_root");
  invariant(!fs.existsSync(resolvedOutput), "a102r44_output_exists_no_overwrite");
  const ancestor = path.dirname(resolvedOutput);
  fs.mkdirSync(ancestor, { recursive: true });
  invariant(!isInside(resolvedRoot, fs.realpathSync(ancestor)), "a102r44_output_ancestor_inside_input_root");
}

function inventory(root, kind) {
  if (kind === "source") {
    const policy = loadSourceModePolicy(root, SOURCE_MODE_POLICY_PATH);
    return collectA102R42Inventory(root, kind, { sourceModePolicy: policy, platform: process.platform });
  }
  return collectA102R42Inventory(root, kind, { platform: process.platform });
}

function buildManifest(kind, rows, sourceArchiveBinding = null) {
  const fields = inventoryFields(rows);
  const core = {
    schemaVersion: kind === "source" ? "velmere.pass36.a102r44.source-only-package-manifest.v1" : "velmere.pass36.a102r44.materials-package-manifest.v1",
    revisionId: REVISION_ID,
    parentRevisionId: PARENT_REVISION_ID,
    normalizedTimestamp: NORMALIZED_TIMESTAMP,
    fileCount: fields.fileCount,
    byteLength: fields.byteLength,
    pathSetSha256: fields.pathSetSha256,
    aggregateSha256: fields.aggregateSha256,
    entries: fields.entries,
    manifestPath: kind === "source" ? SOURCE_MANIFEST_PATH : MATERIALS_MANIFEST_PATH,
    manifestExcludedFromOwnInventory: true,
    checkpointClass: "ACTION_REQUIRED_NON_PASS",
    completedThrough: 89,
    a90ToA102PassCredit: false,
    exactReleaseCredit: false,
    globalDecision: "NO_GO",
    live: false,
    saleEnabled: false,
    productionApproved: false,
    worldClassProven: false,
    ...(kind === "materials" ? { sourceArchiveBinding } : {}),
  };
  return { ...core, manifestSha256: sha256(canonicalJson(core)) };
}

function sourceArchiveIdentity(sourceZipPath) {
  const sourceZip = path.resolve(sourceZipPath);
  invariant(path.basename(sourceZip) === SOURCE_FILE_NAME, "a102r44_source_archive_filename");
  const parsed = parseDeterministicZip(sourceZip);
  const manifestEntry = parsed.entries.find((entry) => entry.path === SOURCE_MANIFEST_PATH);
  invariant(Boolean(manifestEntry), "a102r44_source_manifest_missing");
  return { fileName: SOURCE_FILE_NAME, byteLength: parsed.byteLength, sha256: parsed.archiveSha256 };
}

function validateParsedArchive(parsed, kind, expectedBinding = null) {
  const manifestPath = kind === "source" ? SOURCE_MANIFEST_PATH : MATERIALS_MANIFEST_PATH;
  validateA102R42PortablePathSet(parsed.entries.map((entry) => entry.path));
  const manifestRows = parsed.entries.filter((entry) => entry.path === manifestPath);
  invariant(manifestRows.length === 1 && manifestRows[0].mode === 0o100644, "a102r44_manifest_count_or_mode");
  const manifest = parseStrictJsonCli(new TextDecoder("utf-8", { fatal: true }).decode(manifestRows[0].content), { maxBytes: 16 * 1024 * 1024, maxDepth: 64, maxNodes: 300_000, requireObject: true });
  invariant(manifest.revisionId === REVISION_ID && manifest.parentRevisionId === PARENT_REVISION_ID, "a102r44_manifest_identity");
  invariant(manifest.normalizedTimestamp === NORMALIZED_TIMESTAMP && manifest.checkpointClass === "ACTION_REQUIRED_NON_PASS", "a102r44_manifest_boundary");
  invariant(manifest.globalDecision === "NO_GO" && manifest.live === false && manifest.saleEnabled === false && manifest.productionApproved === false && manifest.worldClassProven === false, "a102r44_manifest_truth");
  const core = { ...manifest }; delete core.manifestSha256;
  invariant(manifest.manifestSha256 === sha256(canonicalJson(core)), "a102r44_manifest_self_digest");
  const payload = parsed.entries.filter((entry) => entry.path !== manifestPath).map(({ path: entryPath, byteLength, sha256: digest, mode }) => ({ path: entryPath, byteLength, sha256: digest, mode }));
  invariant(canonicalJson(payload) === canonicalJson(manifest.entries), "a102r44_payload_manifest_mismatch");
  const fields = inventoryFields(payload.map((row) => ({ ...row, content: Buffer.alloc(0) })));
  invariant(fields.fileCount === manifest.fileCount && fields.byteLength === manifest.byteLength && fields.pathSetSha256 === manifest.pathSetSha256 && fields.aggregateSha256 === manifest.aggregateSha256, "a102r44_manifest_denominators");
  if (kind === "materials") invariant(canonicalJson(manifest.sourceArchiveBinding) === canonicalJson(expectedBinding), "a102r44_materials_source_binding");
  return manifest;
}

export function packageA102R44(options) {
  invariant(options?.kind === "source" || options?.kind === "materials", "a102r44_package_kind");
  const root = path.resolve(options.root);
  const output = path.resolve(options.output);
  const expectedName = options.kind === "source" ? SOURCE_FILE_NAME : MATERIALS_FILE_NAME;
  invariant(path.basename(output) === expectedName, "a102r44_canonical_output_filename_required");
  assertOutputBoundary(root, output);
  const beforeRows = inventory(root, options.kind).rows;
  const before = inventoryFields(beforeRows);
  const binding = options.kind === "materials" ? sourceArchiveIdentity(options.sourceZip ?? "") : null;
  const manifest = buildManifest(options.kind, beforeRows, binding);
  const manifestPath = options.kind === "source" ? SOURCE_MANIFEST_PATH : MATERIALS_MANIFEST_PATH;
  const entries = [
    ...beforeRows.map(({ path: entryPath, content, mode }) => ({ path: entryPath, content, mode })),
    { path: manifestPath, content: Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8"), mode: 0o100644 },
  ];
  validateA102R42PortablePathSet(entries.map((entry) => entry.path));
  const written = writeDeterministicZip(output, entries, { overwrite: false });
  const parsed = parseDeterministicZip(output);
  const verifiedManifest = validateParsedArchive(parsed, options.kind, binding);
  invariant(written.sha256 === parsed.archiveSha256 && written.byteLength === parsed.byteLength, "a102r44_post_write_identity");
  invariant(verifiedManifest.manifestSha256 === manifest.manifestSha256, "a102r44_post_write_manifest");
  const after = inventoryFields(inventory(root, options.kind).rows);
  invariant(canonicalJson(before) === canonicalJson(after), "a102r44_input_changed_during_packaging");
  return {
    schemaVersion: "velmere.pass36.a102r44.deterministic-package.v1",
    revisionId: REVISION_ID,
    status: options.kind === "source" ? "PASS_A102R44_DETERMINISTIC_SOURCE_PACKAGE_NO_PROMOTION" : "PASS_A102R44_DETERMINISTIC_MATERIALS_PACKAGE_NO_PROMOTION",
    kind: options.kind,
    fileName: expectedName,
    byteLength: written.byteLength,
    sha256: written.sha256,
    entries: written.entryCount,
    manifestPath,
    manifestSha256: manifest.manifestSha256,
    sourceArchiveBinding: binding,
    inputRootUnchanged: true,
    globalDecision: "NO_GO",
    live: false,
    saleEnabled: false,
    productionApproved: false,
    worldClassProven: false,
  };
}

function parseArguments(argv) {
  const values = new Map();
  const allowed = new Set(["--kind", "--root", "--output", "--source-zip"]);
  for (let index = 0; index < argv.length; index += 1) {
    const name = argv[index];
    invariant(allowed.has(name) && !values.has(name), `a102r44_argument:${name}`);
    const value = argv[++index];
    invariant(typeof value === "string" && value.length > 0 && !value.startsWith("--"), `a102r44_argument_value:${name}`);
    values.set(name, value);
  }
  for (const name of ["--kind", "--root", "--output"]) invariant(values.has(name), `a102r44_argument_required:${name}`);
  const kind = values.get("--kind");
  invariant(kind === "source" || kind === "materials", "a102r44_argument_kind");
  invariant(kind === "materials" ? values.has("--source-zip") : !values.has("--source-zip"), "a102r44_argument_source_zip");
  return { kind, root: values.get("--root"), output: values.get("--output"), sourceZip: values.get("--source-zip") ?? null };
}

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invoked === import.meta.url) {
  try { process.stdout.write(`${JSON.stringify(packageA102R44(parseArguments(process.argv.slice(2))), null, 2)}\n`); }
  catch (error) {
    process.stderr.write(`${JSON.stringify({ status: "FAIL_A102R44_DETERMINISTIC_PACKAGE", error: error instanceof Error ? error.message : String(error), globalDecision: "NO_GO", live: false, saleEnabled: false, productionApproved: false, worldClassProven: false })}\n`);
    process.exitCode = 1;
  }
}
