#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { parseStrictJsonCli } from "./strict-json-cli.mjs";

export const REVISION_ID = "VELMERE_PASS36_A102R44P46_ACTION_REQUIRED_LEGACY_MULTIPLICATION_ECONOMIC_SINK_TRUTH_REBASE_NO_LIVE_CREDIT";
export const PARENT_REVISION_ID = "VELMERE_PASS36_A102R44P45_ACTION_REQUIRED_CONTINUOUS_CURRENT_STATE_CONTEXT_QUALIFIED_INTERACTION_ORDERING_PUBLIC_CONTROL_DELTA_NO_LIVE_CREDIT";
export const CHECKPOINT = "PASS36 A102R44P46";
export const PARENT_CHECKPOINT = "PASS36 A102R44P45";
export const FINAL_CYCLE = "CONTINUOUS_CLOSURE_FINAL_PACKAGE";
export const SOURCE_FILE_NAME = `${REVISION_ID}_SOURCE_ONLY.zip`;
export const MATERIALS_FILE_NAME = `${REVISION_ID}_MATERIALS.zip`;
export const LEDGER_FILE_NAME = "VELMERE_CURRENT_STATE_AND_PASS_LEDGER_PASS36_A102R44P46_ACTION_REQUIRED_LEGACY_MULTIPLICATION_ECONOMIC_SINK_TRUTH_REBASE_NO_LIVE_CREDIT.txt";
export const SOURCE_MANIFEST_PATH = "_velmere/PASS36_A102R44P46_SOURCE_ONLY_MANIFEST.json";
export const MATERIALS_MANIFEST_PATH = "MANIFESTS/PASS36_A102R44P46_MATERIALS_PACKAGE_MANIFEST.json";
export const SOURCE_MANIFEST_SCHEMA = "velmere.pass36.a102r44p46.source-manifest.v1";
export const MATERIALS_MANIFEST_SCHEMA = "velmere.pass36.a102r44p46.materials-package-manifest.v1";
export const NORMALIZED_TIMESTAMP = "1980-01-01T00:00:00.000Z";

export const LEDGER_HEADERS = Object.freeze([
  "CHECKPOINT",
  "PARENT",
  "PASS",
  "CYCLE",
  "SOURCE FINGERPRINT",
  "GLOBAL DECISION",
  "LIVE",
  "saleEnabled",
  "productionApproved",
  "worldClassProven",
  "INTERNAL CLOSURE previous → current",
  "EXTERNAL EVIDENCE CLOSURE previous → current",
  "PROOF-WEIGHTED previous → current",
]);

export const LEDGER_SECTIONS = Object.freeze([
  "EXECUTIVE TRUTH",
  "PREVIOUS → CURRENT DELTA",
  "IMPLEMENTED",
  "TESTED",
  "FAILED / NEGATIVE EVIDENCE",
  "ROOT CAUSES",
  "CURRENT PRODUCT MATRIX",
  "BASIC/PRO/ADVANCED MATRIX",
  "STANDALONE TIER-CONTEXT MATRIX",
  "AI CUSTOMER PANEL",
  "AI REVIEWER PANEL",
  "SECURITY ATTACKER PANEL",
  "ACCOUNT/AUTH/TENANT",
  "STRIPE/ENTITLEMENT",
  "DATA RIGHTS",
  "PRIVACY/DSAR",
  "STORAGE/KMS/EMAIL",
  "BACKUP/RESTORE/ROLLBACK",
  "INCIDENT/KILL SWITCH",
  "OBSERVABILITY/SLO",
  "OVERLOAD/PERFORMANCE",
  "SUPPLY CHAIN",
  "ANGEL/RISK",
  "WHALE/MARKET IMPACT",
  "ACCESSIBILITY/I18N",
  "CLAIM AUDIT",
  "SCORE DELTAS",
  "P0",
  "P1",
  "INTERNAL BLOCKERS",
  "EXTERNAL BLOCKERS",
  "FREE RELEASE READINESS",
  "PAID RELEASE READINESS",
  "WORLD-CLASS EVIDENCE",
  "EXTERNAL HUMAN TABLE",
  "THREE CANONICAL ARTIFACTS",
  "REMAINING LARGE INTERNAL CLOSURE PASSES",
  "NEXT HIGHEST-VALUE TASK",
]);

export const SOURCE_EXCLUDED_PARTS = Object.freeze([
  "node_modules", ".git", ".next", ".velmere", ".turbo", ".cache",
  "coverage", "test-results", "playwright-report", "__pycache__",
  ".pytest_cache", "tmp", "temp", "out", "cache", "failures", "artifacts",
]);

const SOURCE_EXCLUDED_SET = new Set(SOURCE_EXCLUDED_PARTS);
const DIGEST = /^[a-f0-9]{64}$/u;
const WINDOWS_RESERVED = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/iu;
const CURRENT_LEDGER_MARKER = /VELMERE_CURRENT_STATE_AND_PASS_LEDGER.*(?:R44P46|A102R44P46)/iu;
const UTF8_COMPARE = (left, right) => Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));

export function invariant(condition, code) {
  if (!condition) throw new Error(code);
}

export const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sourceExcluded(relativePath) {
  const normalized = relativePath.split(path.sep).join("/");
  const parts = normalized.split("/");
  if (parts.some((part) => SOURCE_EXCLUDED_SET.has(part) || part.startsWith(".next-"))) return true;
  if (/(?:^|\/)tsconfig\.tmp.*\.json$/u.test(normalized)) return true;
  if (/(?:^|\/).*\.tsbuildinfo$/u.test(normalized)) return true;
  return false;
}

export function normalizePortablePath(value) {
  invariant(typeof value === "string" && value.length > 0, "r44p46_path_empty");
  invariant(!value.includes("\\") && !value.includes("\0"), `r44p46_path_unsafe_character:${value}`);
  invariant(!value.startsWith("/") && !/^[a-z]:/iu.test(value), `r44p46_path_absolute:${value}`);
  invariant(path.posix.normalize(value) === value, `r44p46_path_not_normalized:${value}`);
  invariant(!value.startsWith("../") && !value.includes("/../") && value !== "." && value !== "..", `r44p46_path_traversal:${value}`);
  invariant(!value.endsWith("/"), `r44p46_path_directory_entry:${value}`);
  for (const segment of value.split("/")) {
    invariant(segment.length > 0 && !segment.includes(":"), `r44p46_path_ads_or_empty_segment:${value}`);
    invariant(!/[<>"|?*]/u.test(segment) && !/[ .]$/u.test(segment), `r44p46_path_windows_unsafe:${value}`);
    invariant(!WINDOWS_RESERVED.test(segment), `r44p46_path_windows_reserved:${value}`);
  }
  return value;
}

export function validatePortablePathSet(paths) {
  const normalized = paths.map(normalizePortablePath);
  invariant(new Set(normalized).size === normalized.length, "r44p46_duplicate_path");
  const folded = new Map();
  for (const entryPath of normalized) {
    const key = entryPath.normalize("NFC").toLocaleLowerCase("en-US");
    invariant(!folded.has(key), `r44p46_portable_path_collision:${folded.get(key) ?? ""}:${entryPath}`);
    folded.set(key, entryPath);
  }
  const ordered = [...normalized].sort(UTF8_COMPARE);
  for (let index = 1; index < ordered.length; index += 1) {
    invariant(!ordered[index].startsWith(`${ordered[index - 1]}/`), `r44p46_file_directory_collision:${ordered[index - 1]}:${ordered[index]}`);
  }
  return ordered;
}

export function isInside(root, target) {
  const relative = path.relative(root, target);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

export function requireRealDirectory(directoryPath, code) {
  const resolved = path.resolve(directoryPath);
  const metadata = fs.lstatSync(resolved);
  invariant(metadata.isDirectory() && !metadata.isSymbolicLink(), `${code}_not_real_directory`);
  return { resolved, real: fs.realpathSync(resolved) };
}

export function requireEmptyOutputDirectory(outputPath, inputRoots = []) {
  const output = requireRealDirectory(outputPath, "r44p46_output");
  invariant(fs.readdirSync(output.real).length === 0, "r44p46_output_not_empty");
  for (const rootPath of inputRoots) {
    const root = requireRealDirectory(rootPath, "r44p46_input");
    invariant(root.real !== output.real, "r44p46_output_input_alias");
    invariant(!isInside(root.real, output.real), "r44p46_output_inside_input");
    invariant(!isInside(output.real, root.real), "r44p46_input_inside_output");
  }
  return output;
}

export function assertDistinctInputRoots(sourcePath, materialsPath) {
  const source = requireRealDirectory(sourcePath, "r44p46_source_root");
  const materials = requireRealDirectory(materialsPath, "r44p46_materials_root");
  invariant(source.real !== materials.real, "r44p46_source_materials_alias");
  invariant(!isInside(source.real, materials.real) && !isInside(materials.real, source.real), "r44p46_source_materials_nested");
  return { source, materials };
}

export function assertNoCurrentLedgerPath(relativePath) {
  const base = path.posix.basename(relativePath);
  invariant(base !== LEDGER_FILE_NAME && !CURRENT_LEDGER_MARKER.test(base), `r44p46_current_ledger_embedded:${relativePath}`);
}

function readBoundRegularFile(filePath, code, maxBytes = 768 * 1024 * 1024) {
  const metadata = fs.lstatSync(filePath);
  invariant(metadata.isFile() && !metadata.isSymbolicLink(), `${code}_not_regular_file`);
  invariant(metadata.nlink === 1, `${code}_hardlink_forbidden`);
  invariant(metadata.size <= maxBytes, `${code}_too_large`);
  const bytes = fs.readFileSync(filePath);
  const after = fs.lstatSync(filePath);
  invariant(after.dev === metadata.dev && after.ino === metadata.ino && after.size === metadata.size, `${code}_changed_during_read`);
  return bytes;
}

export function collectTree(rootPath, { kind, excludePaths = new Set() } = {}) {
  invariant(kind === "source" || kind === "materials", "r44p46_inventory_kind");
  const root = requireRealDirectory(rootPath, `r44p46_${kind}`).real;
  const rows = [];
  function visit(directory, prefix = "") {
    const entries = fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => UTF8_COMPARE(a.name, b.name));
    for (const entry of entries) {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (excludePaths.has(relativePath) || (kind === "source" && sourceExcluded(relativePath))) continue;
      normalizePortablePath(relativePath);
      assertNoCurrentLedgerPath(relativePath);
      const absolutePath = path.join(directory, entry.name);
      const metadata = fs.lstatSync(absolutePath);
      invariant(!metadata.isSymbolicLink(), `r44p46_${kind}_symlink_forbidden:${relativePath}`);
      if (metadata.isDirectory()) {
        const realDirectory = fs.realpathSync(absolutePath);
        invariant(isInside(root, realDirectory), `r44p46_${kind}_directory_escape:${relativePath}`);
        visit(realDirectory, relativePath);
      } else {
        invariant(metadata.isFile(), `r44p46_${kind}_special_file_forbidden:${relativePath}`);
        const content = readBoundRegularFile(absolutePath, `r44p46_${kind}_${relativePath.replaceAll(/[^a-z0-9._-]/giu, "_")}`);
        rows.push({ path: relativePath, byteLength: content.length, sha256: sha256(content), mode: 0o100644, content });
      }
    }
  }
  visit(root);
  rows.sort((a, b) => UTF8_COMPARE(a.path, b.path));
  invariant(rows.length > 0, `r44p46_${kind}_inventory_empty`);
  validatePortablePathSet(rows.map((row) => row.path));
  return rows;
}

export function sourceRowsForManifest(rows) {
  return rows.map(({ path: entryPath, byteLength, sha256: digest }) => ({ path: entryPath, byteLength, sha256: digest }));
}

export function sourceAggregate(rows) {
  const hash = crypto.createHash("sha256");
  for (const row of rows) hash.update(`${row.path}\0${row.byteLength}\0${row.sha256}\n`);
  return hash.digest("hex");
}

export function sourcePathSet(rows) {
  return sha256(Buffer.from(`${rows.map((row) => row.path).join("\n")}\n`, "utf8"));
}

export function buildSourceManifest(rootPath) {
  const rows = collectTree(rootPath, { kind: "source", excludePaths: new Set([SOURCE_MANIFEST_PATH]) });
  const files = sourceRowsForManifest(rows);
  const core = {
    schemaVersion: SOURCE_MANIFEST_SCHEMA,
    revisionId: REVISION_ID,
    parentSourceRevisionId: PARENT_REVISION_ID,
    parentCheckpointRevisionId: PARENT_REVISION_ID,
    manifestPath: SOURCE_MANIFEST_PATH,
    manifestExcludedFromOwnInventory: true,
    pathOrderAlgorithm: "UTF8_BYTEWISE_ASCENDING_V1",
    fileCount: files.length,
    payloadBytes: files.reduce((sum, row) => sum + row.byteLength, 0),
    sourceAggregateSha256: sourceAggregate(files),
    pathSetSha256: sourcePathSet(files),
    files,
    excludedGenerated: [...SOURCE_EXCLUDED_PARTS, ".next-*", "tsconfig.tmp*.json", "*.tsbuildinfo"],
    checkpointClass: "ACTION_REQUIRED_NON_PASS",
    globalDecision: "NO_GO",
    live: false,
    saleEnabled: false,
    productionApproved: false,
    worldClassProven: false,
  };
  return { ...core, manifestSha256: sha256(canonicalJson(core)) };
}

export function parseStrictObject(bytes, code) {
  try {
    return parseStrictJsonCli(new TextDecoder("utf-8", { fatal: true }).decode(bytes), {
      maxBytes: 16 * 1024 * 1024,
      maxDepth: 128,
      maxNodes: 1_500_000,
      requireObject: true,
    });
  } catch (error) {
    throw new Error(`${code}:${error instanceof Error ? error.message : String(error)}`, { cause: error });
  }
}

export function validateSourceManifest(manifest) {
  invariant(manifest?.schemaVersion === SOURCE_MANIFEST_SCHEMA, "r44p46_source_manifest_schema");
  invariant(manifest.revisionId === REVISION_ID, "r44p46_source_manifest_revision");
  invariant(manifest.parentSourceRevisionId === PARENT_REVISION_ID && manifest.parentCheckpointRevisionId === PARENT_REVISION_ID, "r44p46_source_manifest_parent");
  invariant(manifest.manifestPath === SOURCE_MANIFEST_PATH && manifest.manifestExcludedFromOwnInventory === true, "r44p46_source_manifest_boundary");
  invariant(manifest.pathOrderAlgorithm === "UTF8_BYTEWISE_ASCENDING_V1", "r44p46_source_manifest_order_algorithm");
  invariant(manifest.checkpointClass === "ACTION_REQUIRED_NON_PASS" && manifest.globalDecision === "NO_GO", "r44p46_source_manifest_decision");
  invariant(manifest.live === false && manifest.saleEnabled === false && manifest.productionApproved === false && manifest.worldClassProven === false, "r44p46_source_manifest_flags");
  invariant(Array.isArray(manifest.files) && manifest.files.length > 0 && manifest.fileCount === manifest.files.length, "r44p46_source_manifest_files");
  const core = { ...manifest };
  delete core.manifestSha256;
  invariant(DIGEST.test(String(manifest.manifestSha256 ?? "")) && manifest.manifestSha256 === sha256(canonicalJson(core)), "r44p46_source_manifest_self_digest");
  const files = [];
  for (const row of manifest.files) {
    invariant(row && Object.keys(row).sort().join(",") === "byteLength,path,sha256", `r44p46_source_manifest_row_shape:${row?.path ?? "unknown"}`);
    normalizePortablePath(row.path);
    invariant(!sourceExcluded(row.path) && row.path !== SOURCE_MANIFEST_PATH, `r44p46_source_manifest_excluded_path:${row.path}`);
    assertNoCurrentLedgerPath(row.path);
    invariant(Number.isSafeInteger(row.byteLength) && row.byteLength >= 0 && DIGEST.test(String(row.sha256 ?? "")), `r44p46_source_manifest_row_identity:${row.path}`);
    files.push(row);
  }
  validatePortablePathSet(files.map((row) => row.path));
  invariant(canonicalJson(files) === canonicalJson([...files].sort((a, b) => UTF8_COMPARE(a.path, b.path))), "r44p46_source_manifest_file_order");
  invariant(manifest.payloadBytes === files.reduce((sum, row) => sum + row.byteLength, 0), "r44p46_source_manifest_payload_bytes");
  invariant(manifest.sourceAggregateSha256 === sourceAggregate(files), "r44p46_source_manifest_aggregate");
  invariant(manifest.pathSetSha256 === sourcePathSet(files), "r44p46_source_manifest_path_set");
  invariant(canonicalJson(manifest.excludedGenerated) === canonicalJson([...SOURCE_EXCLUDED_PARTS, ".next-*", "tsconfig.tmp*.json", "*.tsbuildinfo"]), "r44p46_source_manifest_exclusion_contract");
  return manifest;
}

export function readSourceManifestFromRoot(rootPath) {
  const root = requireRealDirectory(rootPath, "r44p46_source_manifest_root").real;
  const manifestBytes = readBoundRegularFile(path.join(root, ...SOURCE_MANIFEST_PATH.split("/")), "r44p46_source_manifest", 64 * 1024 * 1024);
  return { manifest: validateSourceManifest(parseStrictObject(manifestBytes, "r44p46_source_manifest_parse")), manifestBytes };
}

export function verifySourceRoot(rootPath) {
  const { manifest, manifestBytes } = readSourceManifestFromRoot(rootPath);
  const actual = sourceRowsForManifest(collectTree(rootPath, { kind: "source", excludePaths: new Set([SOURCE_MANIFEST_PATH]) }));
  invariant(canonicalJson(actual) === canonicalJson(manifest.files), "r44p46_source_root_manifest_mismatch");
  return {
    manifest,
    manifestFileSha256: sha256(manifestBytes),
    sourceFingerprint: manifest.sourceAggregateSha256,
    fileCount: actual.length,
    payloadBytes: manifest.payloadBytes,
  };
}

export function inventoryIdentity(rows) {
  const entries = rows.map(({ path: entryPath, byteLength, sha256: digest, mode }) => ({ path: entryPath, byteLength, sha256: digest, mode }));
  return {
    fileCount: entries.length,
    byteLength: entries.reduce((sum, row) => sum + row.byteLength, 0),
    pathSetSha256: sha256(entries.map((row) => row.path).join("\n")),
    aggregateSha256: sha256(canonicalJson(entries)),
    entries,
  };
}

export function buildMaterialsManifest(rows, sourceArchiveBinding) {
  const identity = inventoryIdentity(rows);
  const core = {
    schemaVersion: MATERIALS_MANIFEST_SCHEMA,
    revisionId: REVISION_ID,
    parentRevisionId: PARENT_REVISION_ID,
    normalizedTimestamp: NORMALIZED_TIMESTAMP,
    manifestPath: MATERIALS_MANIFEST_PATH,
    manifestExcludedFromOwnInventory: true,
    ...identity,
    sourceArchiveBinding,
    checkpointClass: "ACTION_REQUIRED_NON_PASS",
    globalDecision: "NO_GO",
    live: false,
    saleEnabled: false,
    productionApproved: false,
    worldClassProven: false,
  };
  return { ...core, manifestSha256: sha256(canonicalJson(core)) };
}

export function validateMaterialsManifest(manifest) {
  invariant(manifest?.schemaVersion === MATERIALS_MANIFEST_SCHEMA, "r44p46_materials_manifest_schema");
  invariant(manifest.revisionId === REVISION_ID && manifest.parentRevisionId === PARENT_REVISION_ID, "r44p46_materials_manifest_identity");
  invariant(manifest.normalizedTimestamp === NORMALIZED_TIMESTAMP && manifest.manifestPath === MATERIALS_MANIFEST_PATH && manifest.manifestExcludedFromOwnInventory === true, "r44p46_materials_manifest_boundary");
  invariant(manifest.checkpointClass === "ACTION_REQUIRED_NON_PASS" && manifest.globalDecision === "NO_GO", "r44p46_materials_manifest_decision");
  invariant(manifest.live === false && manifest.saleEnabled === false && manifest.productionApproved === false && manifest.worldClassProven === false, "r44p46_materials_manifest_flags");
  const core = { ...manifest };
  delete core.manifestSha256;
  invariant(DIGEST.test(String(manifest.manifestSha256 ?? "")) && manifest.manifestSha256 === sha256(canonicalJson(core)), "r44p46_materials_manifest_self_digest");
  invariant(Array.isArray(manifest.entries) && manifest.entries.length > 0 && manifest.fileCount === manifest.entries.length, "r44p46_materials_manifest_entries");
  for (const row of manifest.entries) {
    normalizePortablePath(row.path);
    assertNoCurrentLedgerPath(row.path);
    invariant(row.path !== MATERIALS_MANIFEST_PATH && Number.isSafeInteger(row.byteLength) && row.byteLength >= 0 && DIGEST.test(String(row.sha256 ?? "")), `r44p46_materials_manifest_row:${row.path}`);
    invariant(row.mode === 0o100644, `r44p46_materials_manifest_mode:${row.path}`);
  }
  validatePortablePathSet(manifest.entries.map((row) => row.path));
  invariant(canonicalJson(inventoryIdentity(manifest.entries.map((row) => ({ ...row, content: Buffer.alloc(0) })))) === canonicalJson({ fileCount: manifest.fileCount, byteLength: manifest.byteLength, pathSetSha256: manifest.pathSetSha256, aggregateSha256: manifest.aggregateSha256, entries: manifest.entries }), "r44p46_materials_manifest_totals");
  validateSourceArchiveBinding(manifest.sourceArchiveBinding);
  return manifest;
}

export function validateSourceArchiveBinding(binding) {
  invariant(binding && binding.fileName === SOURCE_FILE_NAME, "r44p46_source_binding_filename");
  invariant(Number.isSafeInteger(binding.byteLength) && binding.byteLength > 0 && Number.isSafeInteger(binding.entryCount) && binding.entryCount > 1, "r44p46_source_binding_counts");
  invariant(DIGEST.test(String(binding.sha256 ?? "")) && DIGEST.test(String(binding.sourceFingerprint ?? "")) && DIGEST.test(String(binding.sourceManifestSha256 ?? "")), "r44p46_source_binding_digests");
  return binding;
}

export function sourceBindingFromVerification(verified) {
  return {
    fileName: SOURCE_FILE_NAME,
    byteLength: verified.archiveByteLength,
    sha256: verified.archiveSha256,
    entryCount: verified.archiveEntryCount,
    sourceFingerprint: verified.sourceFingerprint,
    sourceManifestSha256: verified.sourceManifestSha256,
  };
}

export function validateLedgerText(text, expected) {
  invariant(typeof text === "string" && text.length > 0, "r44p46_ledger_empty");
  invariant(!text.includes("\r"), "r44p46_ledger_crlf_forbidden");
  invariant(!/(?:DRAFT_PREPACKAGE(?:_NOT_AUTHORITY)?|DRAFT CLASSIFICATION|PREPACKAGE_NOT_AUTHORITY|TO_BE_FILLED|FILL_ME|PENDING_PACKAGE)/iu.test(text), "r44p46_ledger_draft_or_prepackage_marker");
  invariant(!/(?:__PLACEHOLDER__|\[PLACEHOLDER\]|<PLACEHOLDER>|\{\{[^}]+\}\}|FINAL_[A-Z0-9_]+_(?:SHA|BYTES|NAME))/u.test(text), "r44p46_ledger_placeholder");
  invariant(!/(?:LIVE|saleEnabled|productionApproved|worldClassProven)\s*[:=]\s*true/iu.test(text), "r44p46_ledger_forbidden_true_promotion");
  const lines = text.split("\n");
  const headers = [];
  for (const line of lines) {
    const match = /^([^:#\n]+):\s*(.*)$/u.exec(line);
    if (match && LEDGER_HEADERS.includes(match[1])) headers.push([match[1], match[2]]);
  }
  invariant(headers.length === LEDGER_HEADERS.length, "r44p46_ledger_header_count");
  invariant(canonicalJson(headers.map(([key]) => key)) === canonicalJson(LEDGER_HEADERS), "r44p46_ledger_header_order_or_duplicate");
  const values = Object.fromEntries(headers);
  invariant(values.CHECKPOINT === CHECKPOINT && values.PARENT === PARENT_CHECKPOINT && values.PASS === REVISION_ID && values.CYCLE === FINAL_CYCLE, "r44p46_ledger_checkpoint_identity");
  invariant(values["SOURCE FINGERPRINT"] === expected.sourceFingerprint, "r44p46_ledger_source_fingerprint");
  invariant(values["GLOBAL DECISION"] === "NO_GO" && values.LIVE === "false" && values.saleEnabled === "false" && values.productionApproved === "false" && values.worldClassProven === "false", "r44p46_ledger_truth_flags");
  invariant(values["INTERNAL CLOSURE previous → current"].length > 0 && values["EXTERNAL EVIDENCE CLOSURE previous → current"].length > 0 && values["PROOF-WEIGHTED previous → current"].length > 0, "r44p46_ledger_score_headers_empty");
  const sections = lines.map((line, lineIndex) => ({ match: /^##\s+(\d+)\.\s+(.+)$/u.exec(line), lineIndex })).filter(({ match }) => Boolean(match)).map(({ match, lineIndex }) => ({ number: Number(match[1]), name: match[2], lineIndex }));
  invariant(sections.length === LEDGER_SECTIONS.length, "r44p46_ledger_section_count");
  invariant(sections.every((section, index) => section.number === index + 1 && section.name === LEDGER_SECTIONS[index]), "r44p46_ledger_section_sequence");
  for (let index = 0; index < sections.length; index += 1) {
    const start = sections[index].lineIndex + 1;
    const end = sections[index + 1]?.lineIndex ?? lines.length;
    invariant(lines.slice(start, end).some((line) => line.trim().length > 0), `r44p46_ledger_section_empty:${index + 1}`);
  }
  const bindings = new Map();
  for (const line of lines) {
    const match = /^(SOURCE ZIP|SOURCE ZIP SHA-256|SOURCE ZIP BYTES|MATERIALS ZIP|MATERIALS ZIP SHA-256|MATERIALS ZIP BYTES|SOURCE MANIFEST SHA-256|DETACHED LEDGER):\s*(.+)$/u.exec(line);
    if (match) {
      invariant(!bindings.has(match[1]), `r44p46_ledger_duplicate_binding:${match[1]}`);
      bindings.set(match[1], match[2]);
    }
  }
  const requiredBindings = ["SOURCE ZIP", "SOURCE ZIP SHA-256", "SOURCE ZIP BYTES", "MATERIALS ZIP", "MATERIALS ZIP SHA-256", "MATERIALS ZIP BYTES", "SOURCE MANIFEST SHA-256", "DETACHED LEDGER"];
  invariant(requiredBindings.every((key) => bindings.has(key)) && bindings.size === requiredBindings.length, "r44p46_ledger_binding_count");
  invariant(bindings.get("SOURCE ZIP") === SOURCE_FILE_NAME && bindings.get("SOURCE ZIP SHA-256") === expected.source.sha256 && bindings.get("SOURCE ZIP BYTES") === String(expected.source.byteLength), "r44p46_ledger_source_zip_binding");
  invariant(bindings.get("MATERIALS ZIP") === MATERIALS_FILE_NAME && bindings.get("MATERIALS ZIP SHA-256") === expected.materials.sha256 && bindings.get("MATERIALS ZIP BYTES") === String(expected.materials.byteLength), "r44p46_ledger_materials_zip_binding");
  invariant(bindings.get("SOURCE MANIFEST SHA-256") === expected.sourceManifestSha256 && bindings.get("DETACHED LEDGER") === LEDGER_FILE_NAME, "r44p46_ledger_manifest_or_self_binding");
  return { headers: values, sections, bindings: Object.fromEntries(bindings) };
}
