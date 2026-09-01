import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import {
  canonicalJson,
  fixedExclusionReason,
  parseDeterministicZip,
  sha256,
  writeDeterministicZip,
} from "../pass4826/release-package-contract.mjs";
import {
  inventoryFields,
  sourceExclusionReason,
  validatePortablePathSet,
} from "./package-a102r40-deterministic.mjs";
import { canonicalSourceMode, loadSourceModePolicy, validateObservedSourceMode } from "./source-mode-policy.mjs";
import { parseStrictJsonCli } from "./strict-json-cli.mjs";
import { readDescriptorBoundRegularFile } from "./descriptor-bound-regular-file.mjs";

export const REVISION_ID = "VELMERE_PASS36_A102R42_ACTION_REQUIRED_A60_TOTAL_FAIL_CLOSED_RECEIPT_AND_LOG_CLASSIFIER_BOUNDARY_EXACT_WINDOWS_NO_LIVE_CREDIT";
export const PARENT_REVISION_ID = "VELMERE_PASS36_A102R41_ACTION_REQUIRED_SECURITY_EVIDENCE_AUTHORITY_EXACT_WINDOWS_AND_FAIL_CLOSED_RELEASE_PACKAGING_NO_LIVE_CREDIT";
export const NORMALIZED_TIMESTAMP = "1980-01-01T00:00:00.000Z";
export const SOURCE_FILE_NAME = `${REVISION_ID}_SOURCE_ONLY.zip`;
export const MATERIALS_FILE_NAME = `${REVISION_ID}_MATERIALS.zip`;
export const ROADMAP_FILE_NAME = `VELMERE_WORLD_CLASS_MAX_ROADMAP_PASS36_A102R42_ACTION_REQUIRED_A60_TOTAL_FAIL_CLOSED_RECEIPT_AND_LOG_CLASSIFIER_BOUNDARY_EXACT_WINDOWS_NO_LIVE_CREDIT.txt`;
export const SOURCE_ROADMAP_PATH = "VELMERE_WORLD_CLASS_MAX_ROADMAP_PASS35.txt";
export const SOURCE_MANIFEST_PATH = "_velmere/PASS36_A102R42_SOURCE_ONLY_MANIFEST.json";
export const MATERIALS_MANIFEST_PATH = "MANIFESTS/PASS36_A102R42_MATERIALS_MANIFEST.json";
export const SOURCE_MANIFEST_SCHEMA = "velmere.pass36.a102r42.source-only-package-manifest.v1";
export const MATERIALS_MANIFEST_SCHEMA = "velmere.pass36.a102r42.materials-package-manifest.v1";
export const SOURCE_MODE_POLICY_PATH = "config/pass36/a102r42-cross-platform-source-mode-policy.json";

const DIGEST = /^[a-f0-9]{64}$/u;
const WINDOWS_RESERVED_SEGMENT = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/iu;
const ENTRY_KEYS = ["path", "byteLength", "sha256", "mode"];
const COMMON_KEYS = [
  "schemaVersion", "revisionId", "parentRevisionId", "normalizedTimestamp",
  "fileCount", "byteLength", "pathSetSha256", "aggregateSha256", "entries",
  "manifestPath", "manifestExcludedFromOwnInventory", "checkpointClass",
  "completedThrough", "a90ToA102PassCredit", "exactReleaseCredit",
  "globalDecision", "live", "saleEnabled", "productionApproved",
  "worldClassProven", "manifestSha256",
];

function invariant(condition, code) { if (!condition) throw new Error(code); }
const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const exactKeys = (value, expected) => isRecord(value) && canonicalJson(Object.keys(value).sort()) === canonicalJson([...expected].sort());

export function validateA102R42PortablePathSet(paths) {
  validatePortablePathSet(paths);
  for (const entryPath of paths) {
    for (const segment of entryPath.split("/")) {
      invariant(!segment.includes(":"), `a102r42_windows_ads_or_drive_segment:${entryPath}`);
      invariant(!/[<>"|?*]/u.test(segment), `a102r42_windows_invalid_segment_character:${entryPath}`);
      invariant(!/[ .]$/u.test(segment), `a102r42_windows_trailing_dot_or_space:${entryPath}`);
      invariant(!WINDOWS_RESERVED_SEGMENT.test(segment), `a102r42_windows_reserved_segment:${entryPath}`);
    }
  }
  const ordered = [...paths].sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
  for (let index = 1; index < ordered.length; index += 1) invariant(!ordered[index].startsWith(`${ordered[index - 1]}/`), `a102r42_file_directory_prefix_collision:${ordered[index - 1]}:${ordered[index]}`);
}

export function validateA102R42SourcePath(entryPath) {
  validateA102R42PortablePathSet([entryPath]);
  invariant(sourceExclusionReason(entryPath) === null, `a102r42_source_forbidden_payload_path:${entryPath}`);
  return entryPath;
}

function isInside(root, target) {
  const relative = path.relative(root, target);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function projectedRealPath(targetPath) {
  let cursor = path.resolve(targetPath);
  const suffix = [];
  while (!fs.existsSync(cursor)) {
    const parent = path.dirname(cursor);
    invariant(parent !== cursor, "a102r42_output_ancestor_missing");
    suffix.unshift(path.basename(cursor));
    cursor = parent;
  }
  return path.resolve(fs.realpathSync(cursor), ...suffix);
}

function assertOutputOutsideRoot(root, output) {
  const realRoot = fs.realpathSync(root);
  const resolved = path.resolve(output);
  const projected = projectedRealPath(resolved);
  invariant(!isInside(realRoot, resolved) && !isInside(realRoot, projected), "a102r42_output_inside_input_root");
  invariant(!fs.existsSync(resolved), "a102r42_output_exists_no_overwrite");
}

export function collectA102R42Inventory(rootPath, kind, options = {}) {
  invariant(kind === "source" || kind === "materials", "a102r42_inventory_kind_invalid");
  const root = path.resolve(rootPath);
  const rootMetadata = fs.lstatSync(root);
  invariant(rootMetadata.isDirectory() && !rootMetadata.isSymbolicLink(), "a102r42_inventory_root_not_regular_directory");
  const realRoot = fs.realpathSync(root);
  const reservedManifestPath = kind === "source" ? SOURCE_MANIFEST_PATH : MATERIALS_MANIFEST_PATH;
  invariant(options.allowReservedManifestInput === true || !fs.existsSync(path.join(root, ...reservedManifestPath.split("/"))), `a102r42_${kind}_reserved_manifest_input_forbidden`);
  const sourceModePolicy = kind === "source"
    ? (options.sourceModePolicy ?? loadSourceModePolicy(root, SOURCE_MODE_POLICY_PATH))
    : undefined;
  const platform = options.platform ?? process.platform;
  const rows = [];
  const walk = (directory, prefix = "") => {
    const entries = fs.readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
    for (const entry of entries) {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const absolutePath = path.join(directory, entry.name);
      if (kind === "source" && sourceExclusionReason(relativePath) !== null) continue;
      if (relativePath === reservedManifestPath) {
        const observed = readDescriptorBoundRegularFile(absolutePath, { maxBytes: 16 * 1024 * 1024, errorPrefix: `a102r42_reserved_manifest_${kind}` });
        invariant(observed.observedNlink === 1, `a102r42_hardlink_forbidden:${relativePath}`);
        continue;
      }
      const metadata = fs.lstatSync(absolutePath);
      invariant(!metadata.isSymbolicLink(), `a102r42_symlink_forbidden:${relativePath}`);
      if (metadata.isDirectory()) {
        validateA102R42PortablePathSet([relativePath]);
        if (kind === "materials" && fixedExclusionReason(relativePath) !== null) throw new Error(`a102r42_materials_forbidden_path:${relativePath}`);
        const realDirectory = fs.realpathSync(absolutePath);
        invariant(isInside(realRoot, realDirectory), `a102r42_directory_reparse_escape:${relativePath}`);
        walk(realDirectory, relativePath);
        continue;
      }
      invariant(metadata.isFile(), `a102r42_special_file_forbidden:${relativePath}`);
      validateA102R42PortablePathSet([relativePath]);
      if (kind === "materials" && fixedExclusionReason(relativePath) !== null) throw new Error(`a102r42_materials_forbidden_path:${relativePath}`);
      const observed = readDescriptorBoundRegularFile(absolutePath, { maxBytes: 512 * 1024 * 1024, errorPrefix: `a102r42_inventory_${relativePath.replaceAll(/[^a-z0-9._-]/giu, "_")}` });
      invariant(observed.observedNlink === 1, `a102r42_hardlink_forbidden:${relativePath}`);
      const mode = kind === "source"
        ? (validateObservedSourceMode(relativePath, { mode: observed.observedMode }, sourceModePolicy, platform), canonicalSourceMode(relativePath, sourceModePolicy))
        : (observed.observedMode & 0o111 ? 0o100755 : 0o100644);
      rows.push({ path: relativePath, byteLength: observed.binding.byteLength, sha256: observed.binding.sha256, mode, content: observed.bytes });
    }
  };
  walk(realRoot);
  rows.sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  invariant(rows.length > 0, `a102r42_${kind}_inventory_empty`);
  validateA102R42PortablePathSet(rows.map((row) => row.path));
  return { root, rows };
}

function buildManifest(kind, inventory, sourceArchiveBinding = null) {
  invariant(kind === "source" || kind === "materials", "a102r42_kind_invalid");
  if (kind === "source") invariant(sourceArchiveBinding === null, "a102r42_source_binding_forbidden");
  else invariant(exactKeys(sourceArchiveBinding, ["fileName", "byteLength", "sha256"]), "a102r42_materials_binding_shape");
  const core = {
    schemaVersion: kind === "source" ? SOURCE_MANIFEST_SCHEMA : MATERIALS_MANIFEST_SCHEMA,
    revisionId: REVISION_ID,
    parentRevisionId: PARENT_REVISION_ID,
    normalizedTimestamp: NORMALIZED_TIMESTAMP,
    fileCount: inventory.fileCount,
    byteLength: inventory.byteLength,
    pathSetSha256: inventory.pathSetSha256,
    aggregateSha256: inventory.aggregateSha256,
    entries: inventory.entries,
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

export function parseA102R42ManifestBytes(bytes, kind) {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const value = parseStrictJsonCli(text, { maxBytes: 16 * 1024 * 1024, maxDepth: 64, maxNodes: 250000, requireObject: true });
    invariant(isRecord(value), `a102r42_${kind}_manifest_not_object`);
    return value;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("a102r42_")) throw error;
    if (error instanceof Error && error.message.startsWith("strict_json_")) throw new Error(`a102r42_${kind}_manifest_${error.message}`, { cause: error });
    throw new Error(`a102r42_${kind}_manifest_parse`, { cause: error });
  }
}

function parseManifestEntry(entry, kind) { return parseA102R42ManifestBytes(entry.content, kind); }

function validateManifest(manifest, kind) {
  const manifestPath = kind === "source" ? SOURCE_MANIFEST_PATH : MATERIALS_MANIFEST_PATH;
  const schema = kind === "source" ? SOURCE_MANIFEST_SCHEMA : MATERIALS_MANIFEST_SCHEMA;
  invariant(exactKeys(manifest, kind === "source" ? COMMON_KEYS : [...COMMON_KEYS, "sourceArchiveBinding"]), `a102r42_${kind}_manifest_fields`);
  invariant(manifest.schemaVersion === schema, `a102r42_${kind}_manifest_schema`);
  invariant(manifest.revisionId === REVISION_ID && manifest.parentRevisionId === PARENT_REVISION_ID, `a102r42_${kind}_manifest_identity`);
  invariant(manifest.normalizedTimestamp === NORMALIZED_TIMESTAMP, `a102r42_${kind}_manifest_timestamp`);
  invariant(manifest.manifestPath === manifestPath && manifest.manifestExcludedFromOwnInventory === true, `a102r42_${kind}_manifest_self_boundary`);
  invariant(
    manifest.checkpointClass === "ACTION_REQUIRED_NON_PASS"
      && manifest.completedThrough === 89
      && manifest.a90ToA102PassCredit === false
      && manifest.exactReleaseCredit === false
      && manifest.globalDecision === "NO_GO"
      && manifest.live === false
      && manifest.saleEnabled === false
      && manifest.productionApproved === false
      && manifest.worldClassProven === false,
    `a102r42_${kind}_truth_boundary`,
  );
  const core = { ...manifest }; delete core.manifestSha256;
  invariant(DIGEST.test(String(manifest.manifestSha256 ?? "")) && manifest.manifestSha256 === sha256(canonicalJson(core)), `a102r42_${kind}_manifest_digest`);
  invariant(Array.isArray(manifest.entries) && manifest.fileCount === manifest.entries.length, `a102r42_${kind}_manifest_count`);
  for (const entry of manifest.entries) {
    invariant(exactKeys(entry, ENTRY_KEYS), `a102r42_${kind}_entry_fields`);
    invariant(typeof entry.path === "string" && !path.isAbsolute(entry.path) && !entry.path.includes("\\"), `a102r42_${kind}_entry_path`);
    invariant(Number.isSafeInteger(entry.byteLength) && entry.byteLength >= 0 && DIGEST.test(String(entry.sha256 ?? "")), `a102r42_${kind}_entry_identity`);
    invariant(entry.mode === 0o100644 || entry.mode === 0o100755, `a102r42_${kind}_entry_mode`);
    if (kind === "source") invariant(sourceExclusionReason(entry.path) === null, `a102r42_source_forbidden_payload_path:${entry.path}`);
  }
  validateA102R42PortablePathSet([...manifest.entries.map((entry) => entry.path), manifestPath]);
  invariant(canonicalJson(manifest.entries) === canonicalJson([...manifest.entries].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0)), `a102r42_${kind}_entry_order`);
  const fields = inventoryFields(manifest.entries.map((entry) => ({ ...entry, content: Buffer.alloc(0) })));
  invariant(
    fields.fileCount === manifest.fileCount
      && fields.byteLength === manifest.byteLength
      && fields.pathSetSha256 === manifest.pathSetSha256
      && fields.aggregateSha256 === manifest.aggregateSha256,
    `a102r42_${kind}_inventory_totals`,
  );
  if (kind === "materials") {
    invariant(exactKeys(manifest.sourceArchiveBinding, ["fileName", "byteLength", "sha256"]), "a102r42_materials_binding_fields");
    invariant(manifest.sourceArchiveBinding.fileName === SOURCE_FILE_NAME && Number.isSafeInteger(manifest.sourceArchiveBinding.byteLength) && manifest.sourceArchiveBinding.byteLength > 0 && DIGEST.test(String(manifest.sourceArchiveBinding.sha256 ?? "")), "a102r42_materials_binding_identity");
  }
}

export function validateA102R42ParsedArchive(parsed, kind, expectedSourceArchive = null) {
  invariant(kind === "source" || kind === "materials", "a102r42_archive_kind");
  const manifestPath = kind === "source" ? SOURCE_MANIFEST_PATH : MATERIALS_MANIFEST_PATH;
  validateA102R42PortablePathSet(parsed.entries.map((entry) => entry.path));
  const manifestEntries = parsed.entries.filter((entry) => entry.path === manifestPath);
  invariant(manifestEntries.length === 1 && manifestEntries[0].mode === 0o100644, `a102r42_${kind}_archive_manifest_count_or_mode`);
  const manifest = parseManifestEntry(manifestEntries[0], kind);
  validateManifest(manifest, kind);
  const payload = parsed.entries.filter((entry) => entry.path !== manifestPath);
  if (kind === "source") for (const entry of payload) invariant(sourceExclusionReason(entry.path) === null, `a102r42_source_forbidden_archive_path:${entry.path}`);
  const observed = payload.map(({ path: entryPath, byteLength, sha256: digest, mode }) => ({ path: entryPath, byteLength, sha256: digest, mode }));
  invariant(canonicalJson(observed) === canonicalJson(manifest.entries), `a102r42_${kind}_payload_manifest_mismatch`);
  if (kind === "materials" && expectedSourceArchive) invariant(canonicalJson(manifest.sourceArchiveBinding) === canonicalJson(expectedSourceArchive), "a102r42_materials_source_binding_mismatch");
  return {
    manifest,
    manifestFileSha256: manifestEntries[0].sha256,
    payloadFileCount: payload.length,
    payloadByteLength: payload.reduce((sum, entry) => sum + entry.byteLength, 0),
  };
}

export function sourceArchiveIdentity(sourceZipPath) {
  const sourceZip = path.resolve(sourceZipPath);
  const metadata = fs.lstatSync(sourceZip);
  invariant(metadata.isFile() && !metadata.isSymbolicLink(), "a102r42_source_archive_not_regular");
  invariant(path.basename(sourceZip) === SOURCE_FILE_NAME, "a102r42_source_archive_filename");
  const parsed = parseDeterministicZip(sourceZip);
  validateA102R42ParsedArchive(parsed, "source");
  return { fileName: SOURCE_FILE_NAME, byteLength: parsed.byteLength, sha256: parsed.archiveSha256 };
}

export function packageA102R42(options) {
  invariant(options?.kind === "source" || options?.kind === "materials", "a102r42_package_kind");
  const inputRoot = path.resolve(options.root);
  const output = path.resolve(options.output);
  const expectedName = options.kind === "source" ? SOURCE_FILE_NAME : MATERIALS_FILE_NAME;
  invariant(path.basename(output) === expectedName, "a102r42_canonical_output_filename_required");
  assertOutputOutsideRoot(inputRoot, output);
  const sourceZip = options.kind === "materials" ? path.resolve(options.sourceZip ?? "") : null;
  invariant(options.kind === "materials" ? sourceZip.length > 0 : options.sourceZip == null, "a102r42_source_zip_argument_boundary");
  if (sourceZip) invariant(sourceZip !== output, "a102r42_source_output_collision");
  const beforeRows = collectA102R42Inventory(inputRoot, options.kind);
  const before = inventoryFields(beforeRows.rows);
  const binding = sourceZip ? sourceArchiveIdentity(sourceZip) : null;
  const manifest = buildManifest(options.kind, before, binding);
  const manifestPath = options.kind === "source" ? SOURCE_MANIFEST_PATH : MATERIALS_MANIFEST_PATH;
  const entries = [
    ...beforeRows.rows.map(({ path: entryPath, content, mode }) => ({ path: entryPath, content, mode })),
    { path: manifestPath, content: Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8"), mode: 0o100644 },
  ];
  validateA102R42PortablePathSet(entries.map((entry) => entry.path));
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const archive = writeDeterministicZip(output, entries, { overwrite: false });
  const parsed = parseDeterministicZip(output);
  const verified = validateA102R42ParsedArchive(parsed, options.kind, binding);
  invariant(archive.sha256 === parsed.archiveSha256 && archive.byteLength === parsed.byteLength && archive.entryCount === parsed.entries.length, "a102r42_post_write_archive_identity");
  invariant(verified.manifest.manifestSha256 === manifest.manifestSha256, "a102r42_post_write_manifest_identity");
  const after = inventoryFields(collectA102R42Inventory(inputRoot, options.kind).rows);
  invariant(canonicalJson(before) === canonicalJson(after), "a102r42_input_root_changed_during_packaging");
  return {
    schemaVersion: "velmere.pass36.a102r42.deterministic-package.v1",
    revisionId: REVISION_ID,
    status: options.kind === "source" ? "PASS_A102R42_DETERMINISTIC_SOURCE_PACKAGE_NO_PROMOTION" : "PASS_A102R42_DETERMINISTIC_MATERIALS_PACKAGE_NO_PROMOTION",
    kind: options.kind,
    inputRootClass: options.kind === "source" ? "CURRENT_SOURCE_AUTHORITY_ROOT" : "EXTERNAL_MATERIALS_EVIDENCE_ROOT",
    inputRootUnchanged: true,
    outputBoundary: { outsideInputRoot: true, noClobber: true },
    fileName: expectedName,
    byteLength: archive.byteLength,
    sha256: archive.sha256,
    entries: archive.entryCount,
    manifestPath,
    manifestSha256: manifest.manifestSha256,
    manifestFileSha256: verified.manifestFileSha256,
    sourceArchiveBinding: binding,
    archiveFormat: "zip-store-v1",
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
    invariant(allowed.has(name), `a102r42_argument_unknown:${name}`);
    invariant(!values.has(name), `a102r42_argument_duplicate:${name}`);
    const value = argv[++index];
    invariant(typeof value === "string" && value.length > 0 && !value.startsWith("--"), `a102r42_argument_value:${name}`);
    values.set(name, value);
  }
  for (const name of ["--kind", "--root", "--output"]) invariant(values.has(name), `a102r42_argument_required:${name}`);
  const kind = values.get("--kind");
  invariant(kind === "source" || kind === "materials", "a102r42_argument_kind");
  invariant(kind === "materials" ? values.has("--source-zip") : !values.has("--source-zip"), "a102r42_argument_source_zip");
  return { kind, root: values.get("--root"), output: values.get("--output"), sourceZip: values.get("--source-zip") ?? null };
}

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invoked === import.meta.url) {
  try { process.stdout.write(`${JSON.stringify(packageA102R42(parseArguments(process.argv.slice(2))), null, 2)}\n`); }
  catch (error) {
    process.stderr.write(`${JSON.stringify({ status: "FAIL_A102R42_DETERMINISTIC_PACKAGE", error: error instanceof Error ? error.message : String(error), globalDecision: "NO_GO", live: false, saleEnabled: false, productionApproved: false, worldClassProven: false })}\n`);
    process.exitCode = 1;
  }
}
