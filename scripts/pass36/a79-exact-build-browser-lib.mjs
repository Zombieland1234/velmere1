import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { collectPass35Inventory } from "../pass35/source-inventory.mjs";
import { buildA45DeterministicQaFixture } from "../pass35/a45-browser-qa-fixture.mjs";

export const A79_REVISION = "VELMERE_PASS36_A79R0_EXACT_FINAL_BYTE_BUILD_RUNTIME_AND_BROWSER_EVIDENCE_BINDING_HARDENING";
export const A79_SOURCE_MANIFEST_SUPPLEMENTS = Object.freeze([
  "_velmere/pass35/PASS35_EXTERNAL_BLOCKER_RECEIPT.json",
  "_velmere/pass35/PASS35_LOCAL_PDF_QA_SUMMARY.json",
  "_velmere/pass35/PASS35_LOCAL_PRODUCT_QUALITY_RECEIPT.json",
  "_velmere/pass35/PASS35_READINESS_DASHBOARD.json",
]);

const lexical = (a, b) => a.localeCompare(b, "en", { sensitivity: "variant" });
export const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const ANSI_COLOR = new RegExp(`${String.fromCodePoint(0x1b)}\\[[0-9;]*m`, "gu");

export function a60ChildProcessHasExited(child) {
  return Number.isInteger(child?.exitCode)
    || typeof child?.signalCode === "string" && child.signalCode.length > 0;
}

export function evaluateA60ServerTermination({
  wasRunning,
  serverExitCode,
  serverSignalCode,
  portClosed,
  platform = process.platform,
  terminationExitCode = null,
  terminationStderrBytes = 0,
}) {
  const processExited = Number.isInteger(serverExitCode)
    || typeof serverSignalCode === "string" && serverSignalCode.length > 0;
  const terminationAccepted = wasRunning === false
    || (wasRunning === true && (platform === "win32" ? terminationExitCode === 0 : serverSignalCode === "SIGTERM"));
  return {
    passed: processExited && portClosed === true && terminationAccepted && terminationStderrBytes === 0,
    processExited,
    terminationAccepted,
  };
}

function hasInvalidPortablePathCharacter(value) {
  const forbiddenAscii = '<>:"|?*';
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0);
    return (codePoint >= 0x00 && codePoint <= 0x1f)
      || (codePoint >= 0x7f && codePoint <= 0x9f)
      || (codePoint >= 0x202a && codePoint <= 0x202e)
      || (codePoint >= 0x2066 && codePoint <= 0x2069)
      || forbiddenAscii.includes(character);
  });
}

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort(lexical).map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function readJson(root, relative) {
  return JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
}

export function assertRegularAbsoluteFile(filePath, label) {
  if (typeof filePath !== "string" || !path.isAbsolute(filePath)) throw new Error(`a79_${label}_absolute_required`);
  assertAbsolutePathHasNoReparseComponents(filePath, label);
  const metadata = fs.lstatSync(filePath);
  if (!metadata.isFile() || metadata.isSymbolicLink()) throw new Error(`a79_${label}_regular_file_required`);
  return metadata;
}

export function assertPathInside(childPath, parentPath, label) {
  const child = fs.realpathSync.native(path.resolve(childPath));
  const parent = fs.realpathSync.native(path.resolve(parentPath));
  const comparableChild = process.platform === "win32" ? child.toLocaleLowerCase("en-US") : child;
  const comparableParent = process.platform === "win32" ? parent.toLocaleLowerCase("en-US") : parent;
  const relative = path.relative(comparableParent, comparableChild);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error(`a79_${label}_outside_runtime_root`);
  return child;
}

function assertAbsolutePathHasNoReparseComponents(absolutePath, label) {
  const resolved = path.resolve(absolutePath);
  const parsed = path.parse(resolved);
  const relativeParts = resolved.slice(parsed.root.length).split(path.sep).filter(Boolean);
  let current = parsed.root;
  for (const part of relativeParts) {
    current = path.join(current, part);
    const metadata = fs.lstatSync(current);
    if (metadata.isSymbolicLink()) throw new Error(`a79_${label}_reparse_component_forbidden`);
  }
}

function normalizedRelativePath(relativePath, label) {
  if (typeof relativePath !== "string" || !relativePath || relativePath.includes("\0") || path.isAbsolute(relativePath)) throw new Error(`a79_${label}_relative_path_required`);
  const rawPortable = relativePath.replaceAll("\\", "/");
  const portable = rawPortable.normalize("NFKC");
  if (relativePath !== rawPortable || portable !== rawPortable) throw new Error(`a79_${label}_noncanonical_path`);
  const parts = portable.split("/");
  const windowsReserved = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/iu;
  if (parts.some((part) => !part || part === "." || part === ".." || hasInvalidPortablePathCharacter(part) || /[. ]$/u.test(part) || windowsReserved.test(part))) throw new Error(`a79_${label}_relative_path_invalid`);
  return parts;
}

function sameFileIdentity(left, right) {
  return left.size === right.size && left.dev === right.dev && left.ino === right.ino && left.mode === right.mode;
}

function assertPhysicalComponents(root, parts, { leafMayBeMissing = false, expectedLeafType = null, label = "artifact" } = {}) {
  const rootAbsolute = path.resolve(root);
  const rootMetadata = fs.lstatSync(rootAbsolute, { bigint: true });
  if (!rootMetadata.isDirectory() || rootMetadata.isSymbolicLink()) throw new Error(`a79_${label}_root_not_physical_directory`);
  const rootReal = fs.realpathSync.native(rootAbsolute);
  let current = rootAbsolute;
  for (let index = 0; index < parts.length; index += 1) {
    current = path.join(current, parts[index]);
    if (!fs.existsSync(current)) {
      if (leafMayBeMissing) return { rootAbsolute, rootReal, absolutePath: path.join(rootAbsolute, ...parts), missingIndex: index };
      throw new Error(`a79_${label}_path_missing`);
    }
    const metadata = fs.lstatSync(current, { bigint: true });
    if (metadata.isSymbolicLink()) throw new Error(`a79_${label}_reparse_component_forbidden`);
    const isLeaf = index === parts.length - 1;
    if (!isLeaf && !metadata.isDirectory()) throw new Error(`a79_${label}_parent_not_directory`);
    if (isLeaf && expectedLeafType === "file" && !metadata.isFile()) throw new Error(`a79_${label}_regular_file_required`);
    if (isLeaf && expectedLeafType === "directory" && !metadata.isDirectory()) throw new Error(`a79_${label}_directory_required`);
    const physical = fs.realpathSync.native(current);
    const physicalRelative = path.relative(rootReal, physical);
    if (physicalRelative === ".." || physicalRelative.startsWith(`..${path.sep}`) || path.isAbsolute(physicalRelative)) throw new Error(`a79_${label}_physical_escape`);
  }
  return { rootAbsolute, rootReal, absolutePath: path.join(rootAbsolute, ...parts), missingIndex: null };
}

export function assertSafeOutputPathInsideRoot(root, relativePath, { expectedLeafType = "directory", label = "artifact_output" } = {}) {
  const parts = normalizedRelativePath(relativePath, label);
  return assertPhysicalComponents(root, parts, { leafMayBeMissing: true, expectedLeafType, label });
}

export function ensureSafeDirectoryInsideRoot(root, relativePath, { requireNewLeaf = false, label = "artifact_directory" } = {}) {
  const parts = normalizedRelativePath(relativePath, label);
  const existing = assertPhysicalComponents(root, parts, { leafMayBeMissing: true, expectedLeafType: "directory", label });
  if (existing.missingIndex === null) {
    if (requireNewLeaf) throw new Error(`a79_${label}_already_exists`);
    return existing.absolutePath;
  }
  let current = existing.rootAbsolute;
  for (let index = 0; index < parts.length; index += 1) {
    current = path.join(current, parts[index]);
    if (!fs.existsSync(current)) fs.mkdirSync(current);
    const metadata = fs.lstatSync(current);
    if (!metadata.isDirectory() || metadata.isSymbolicLink()) throw new Error(`a79_${label}_created_component_invalid`);
    const physical = fs.realpathSync.native(current);
    const physicalRelative = path.relative(existing.rootReal, physical);
    if (physicalRelative === ".." || physicalRelative.startsWith(`..${path.sep}`) || path.isAbsolute(physicalRelative)) throw new Error(`a79_${label}_created_component_escape`);
  }
  return current;
}

export function readBoundRegularFileInsideRoot(root, relativePath, { maxBytes = 128 * 1024 * 1024, label = "artifact" } = {}) {
  const parts = normalizedRelativePath(relativePath, label);
  const boundary = assertPhysicalComponents(root, parts, { expectedLeafType: "file", label });
  const flags = fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0);
  const descriptor = fs.openSync(boundary.absolutePath, flags);
  try {
    const descriptorBefore = fs.fstatSync(descriptor, { bigint: true });
    const pathBefore = fs.lstatSync(boundary.absolutePath, { bigint: true });
    if (!descriptorBefore.isFile() || !pathBefore.isFile() || pathBefore.isSymbolicLink() || !sameFileIdentity(descriptorBefore, pathBefore)) throw new Error(`a79_${label}_descriptor_path_identity_mismatch`);
    if (descriptorBefore.size < 0n || descriptorBefore.size > BigInt(maxBytes)) throw new Error(`a79_${label}_byte_budget_exceeded`);
    const bytes = fs.readFileSync(descriptor);
    const descriptorAfter = fs.fstatSync(descriptor, { bigint: true });
    const pathAfter = fs.lstatSync(boundary.absolutePath, { bigint: true });
    if (!sameFileIdentity(descriptorBefore, descriptorAfter) || !sameFileIdentity(descriptorAfter, pathAfter) || bytes.length !== Number(descriptorAfter.size)) throw new Error(`a79_${label}_changed_during_read`);
    assertPhysicalComponents(root, parts, { expectedLeafType: "file", label });
    return { path: parts.join("/"), absolutePath: boundary.absolutePath, bytes, byteLength: bytes.length, sha256: sha256(bytes), identity: { dev: String(descriptorAfter.dev), ino: String(descriptorAfter.ino), size: String(descriptorAfter.size), mode: Number(descriptorAfter.mode) } };
  } finally {
    fs.closeSync(descriptor);
  }
}

export function normalizeLoopbackBaseUrl(value) {
  let parsed;
  try { parsed = new URL(String(value)); } catch { throw new Error("a79_base_url_invalid"); }
  if (!new Set(["http:", "https:"]).has(parsed.protocol)) throw new Error("a79_base_url_http_or_https_required");
  if (parsed.hostname !== "127.0.0.1") throw new Error("a79_base_url_exact_loopback_required");
  if (parsed.username || parsed.password) throw new Error("a79_base_url_credentials_forbidden");
  if (parsed.pathname !== "/" || parsed.search || parsed.hash) throw new Error("a79_base_url_origin_only_required");
  const port = Number(parsed.port);
  if (!Number.isSafeInteger(port) || port < 1024 || port > 65535) throw new Error("a79_base_url_port_invalid");
  return `${parsed.protocol}//127.0.0.1:${port}`;
}

export function isExpectedNextRscAbort(failure, expectedBaseUrl) {
  if (!failure || failure.error !== "net::ERR_ABORTED") return false;
  if (failure.method !== "GET" || failure.isNavigationRequest === true) return false;
  if (failure.resourceType !== "fetch") return false;
  let parsed;
  try { parsed = new URL(failure.url); } catch { return false; }
  if (parsed.origin !== expectedBaseUrl || !parsed.searchParams.has("_rsc")) return false;
  return true;
}

export function expectedBrowserRows(contract) {
  const rows = [];
  for (const locale of contract.locales ?? []) {
    for (const route of contract.routes ?? []) rows.push({ locale, viewport: "desktop", route: route.id, suffix: route.suffix });
  }
  for (const route of contract.routes ?? []) rows.push({ locale: "pl", viewport: "mobile", route: route.id, suffix: route.suffix });
  return rows;
}

export function expectedScreenshotPaths(contract) {
  const paths = [];
  for (const route of contract.routes ?? []) paths.push(`artifacts/pass35/a45/screenshots/pl-desktop-${route.id}.png`);
  for (const route of contract.routes ?? []) paths.push(`artifacts/pass35/a45/screenshots/pl-mobile-${route.id}.png`);
  paths.push("artifacts/pass35/a45/screenshots/pl-desktop-shield-popup-four-tabs.png");
  return paths.sort(lexical);
}

export function expectedA60EvidencePaths(policy, contract) {
  const requiredStages = Array.isArray(policy?.requiredStages) ? policy.requiredStages : [];
  if (requiredStages.length !== 14 || new Set(requiredStages).size !== requiredStages.length) throw new Error("a60_evidence_stage_contract_invalid");
  const manualStages = new Set(["source-manifest-preflight", "production-server-ready"]);
  if (![...manualStages].every((id) => requiredStages.includes(id))) throw new Error("a60_evidence_manual_stage_contract_invalid");
  const requiredLogPaths = requiredStages
    .filter((id) => !manualStages.has(id))
    .flatMap((id) => [`artifacts/pass36/a60/logs/${id}.stdout.log`, `artifacts/pass36/a60/logs/${id}.stderr.log`]);
  requiredLogPaths.push("artifacts/pass36/a60/logs/production-server.stdout.log", "artifacts/pass36/a60/logs/production-server.stderr.log");
  const screenshotPaths = expectedScreenshotPaths(contract);
  const corePaths = [
    "artifacts/pass36/a60/PASS36_A60_EXACT_FINAL_BYTE_BUILD_BROWSER_ACCEPTANCE.json",
    "artifacts/pass36/a60/PASS36_A60_BROWSER_EVIDENCE_VERIFICATION.json",
    "artifacts/pass35/a45/PASS35_A45_BROWSER_ACCEPTANCE.json",
    policy?.browser?.qaFixture?.relativePath,
  ];
  if (corePaths.some((entry) => typeof entry !== "string" || !entry)) throw new Error("a60_evidence_core_path_contract_invalid");
  const requiredPaths = [...corePaths, ...requiredLogPaths, ...screenshotPaths].sort(lexical);
  if (new Set(requiredPaths).size !== requiredPaths.length) throw new Error("a60_evidence_required_path_duplicate");
  for (const relativePath of requiredPaths) if (normalizedRelativePath(relativePath, "a60_evidence_plan").join("/") !== relativePath) throw new Error("a60_evidence_path_noncanonical");
  if (new Set(requiredPaths.map((entry) => entry.normalize("NFKC").toLocaleLowerCase("en-US"))).size !== requiredPaths.length) throw new Error("a60_evidence_path_casefold_collision");
  const authority = policy?.evidencePackage;
  const authorityValid = authority?.coreArtifactsRequired === corePaths.length
    && authority?.childStageLogsRequired === requiredLogPaths.length - 2
    && authority?.productionServerLogsRequired === 2
    && authority?.totalLogsRequired === requiredLogPaths.length
    && authority?.screenshotsRequired === screenshotPaths.length
    && authority?.requiredPaths === requiredPaths.length
    && authority?.requiredPathSetSha256 === sha256(requiredPaths.join("\n"));
  if (!authorityValid) throw new Error("a60_evidence_path_authority_mismatch");
  return { corePaths: [...corePaths].sort(lexical), requiredLogPaths: [...requiredLogPaths].sort(lexical), screenshotPaths, requiredPaths };
}

export function validateA60EvidencePathSet(candidatePaths, policy, contract) {
  let expected;
  try { expected = expectedA60EvidencePaths(policy, contract); }
  catch (error) { return { passed: false, reason: error instanceof Error ? error.message : String(error), expected: [], declared: [] }; }
  const declared = Array.isArray(candidatePaths) && candidatePaths.every((entry) => typeof entry === "string") ? candidatePaths : [];
  const unique = new Set(declared).size === declared.length;
  let safe = declared.length === candidatePaths?.length;
  try { safe &&= declared.every((entry) => normalizedRelativePath(entry, "a60_evidence_candidate").join("/") === entry); }
  catch { safe = false; }
  const casefoldUnique = new Set(declared.map((entry) => entry.normalize("NFKC").toLocaleLowerCase("en-US"))).size === declared.length;
  const canonicalOrder = canonicalJson(declared) === canonicalJson([...declared].sort(lexical));
  const exact = canonicalJson(declared) === canonicalJson(expected.requiredPaths);
  return { passed: safe && unique && casefoldUnique && canonicalOrder && exact, safe, unique, casefoldUnique, canonicalOrder, exact, expected: expected.requiredPaths, declared };
}

const PNG_CRC_TABLE = Object.freeze(Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
  return value >>> 0;
}));

function pngCrc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = (crc >>> 8) ^ PNG_CRC_TABLE[(crc ^ byte) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}

export function inspectPng(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 57 || bytes.length > 128 * 1024 * 1024) return { valid: false, reason: "file_budget" };
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!bytes.subarray(0, 8).equals(signature)) return { valid: false, reason: "signature" };
  let offset = 8;
  let width = null;
  let height = null;
  let bitDepth = null;
  let colorType = null;
  let ihdr = 0;
  let iend = 0;
  let idat = 0;
  let plte = 0;
  let chunks = 0;
  let idatStarted = false;
  let idatEnded = false;
  const compressedParts = [];
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const typeBytes = bytes.subarray(offset + 4, offset + 8);
    const type = typeBytes.toString("ascii");
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const end = dataEnd + 4;
    if (!/^[A-Za-z]{4}$/u.test(type) || end > bytes.length) return { valid: false, reason: "chunk_bounds_or_type" };
    if (pngCrc32(Buffer.concat([typeBytes, bytes.subarray(dataStart, dataEnd)])) !== bytes.readUInt32BE(dataEnd)) return { valid: false, reason: `crc:${type}` };
    chunks += 1;
    if (chunks === 1 && type !== "IHDR") return { valid: false, reason: "ihdr_not_first" };
    if (type === "IHDR") {
      ihdr += 1;
      if (ihdr !== 1 || length !== 13) return { valid: false, reason: "ihdr" };
      width = bytes.readUInt32BE(dataStart);
      height = bytes.readUInt32BE(dataStart + 4);
      bitDepth = bytes[dataStart + 8];
      colorType = bytes[dataStart + 9];
      if (bytes[dataStart + 10] !== 0 || bytes[dataStart + 11] !== 0 || bytes[dataStart + 12] !== 0) return { valid: false, reason: "png_methods_or_interlace" };
    } else if (type === "PLTE") {
      if (idatStarted || length < 3 || length > 768 || length % 3 !== 0) return { valid: false, reason: "plte" };
      plte += 1;
    } else if (type === "IDAT") {
      if (idatEnded) return { valid: false, reason: "idat_not_contiguous" };
      idatStarted = true;
      idat += 1;
      compressedParts.push(bytes.subarray(dataStart, dataEnd));
    } else {
      if (idatStarted) idatEnded = true;
      if (type === "IEND") {
        iend += 1;
        if (iend !== 1 || length !== 0 || end !== bytes.length) return { valid: false, reason: "iend" };
        offset = end;
        break;
      }
      if (/^[A-Z]/u.test(type) && !new Set(["IHDR", "PLTE", "IDAT", "IEND"]).has(type)) return { valid: false, reason: `unknown_critical:${type}` };
    }
    offset = end;
  }
  const channelMap = new Map([[0, 1], [2, 3], [3, 1], [4, 2], [6, 4]]);
  const depthMap = new Map([[0, new Set([1, 2, 4, 8, 16])], [2, new Set([8, 16])], [3, new Set([1, 2, 4, 8])], [4, new Set([8, 16])], [6, new Set([8, 16])]]);
  if (ihdr !== 1 || idat < 1 || iend !== 1 || offset !== bytes.length || !width || !height || width > 10_000 || height > 50_000 || !depthMap.get(colorType)?.has(bitDepth) || (colorType === 3 && plte !== 1) || plte > 1) return { valid: false, reason: "structure" };
  const channels = channelMap.get(colorType);
  const rowBytes = 1 + Math.ceil((width * channels * bitDepth) / 8);
  const expectedInflatedBytes = rowBytes * height;
  if (!Number.isSafeInteger(expectedInflatedBytes) || expectedInflatedBytes < 1 || expectedInflatedBytes > 256 * 1024 * 1024) return { valid: false, reason: "inflated_budget" };
  let inflated;
  try { inflated = zlib.inflateSync(Buffer.concat(compressedParts), { maxOutputLength: expectedInflatedBytes }); }
  catch { return { valid: false, reason: "idat_decompression" }; }
  if (inflated.length !== expectedInflatedBytes) return { valid: false, reason: "scanline_length" };
  for (let row = 0; row < height; row += 1) if (inflated[row * rowBytes] > 4) return { valid: false, reason: "filter_type" };
  return { valid: true, width, height, bitDepth, colorType, chunks, idat, inflatedBytes: inflated.length };
}

export function validateSourceManifestExact(root, manifestRelativePath) {
  const manifestBytes = fs.readFileSync(path.join(root, manifestRelativePath));
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  const inventory = collectPass35Inventory(root);
  const expectedPaths = [
    ...inventory.entries.filter((entry) => entry.sourceIncluded && entry.path !== manifestRelativePath).map((entry) => entry.path),
    ...A79_SOURCE_MANIFEST_SUPPLEMENTS,
  ].sort(lexical);
  const declaredRows = Array.isArray(manifest.files) ? [...manifest.files].sort((a, b) => lexical(a.path, b.path)) : [];
  const declaredPaths = declaredRows.map((row) => row.path);
  const mismatches = [];
  if (inventory.unknownCount !== 0) mismatches.push({ reason: "unknown_inventory", count: inventory.unknownCount });
  if (new Set(declaredPaths).size !== declaredPaths.length) mismatches.push({ reason: "duplicate_manifest_paths" });
  if (canonicalJson(declaredPaths) !== canonicalJson(expectedPaths)) {
    const declared = new Set(declaredPaths);
    const expected = new Set(expectedPaths);
    mismatches.push({
      reason: "path_set_mismatch",
      missing: expectedPaths.filter((item) => !declared.has(item)).slice(0, 50),
      extra: declaredPaths.filter((item) => !expected.has(item)).slice(0, 50),
    });
  }
  for (const row of declaredRows) {
    const absolute = path.join(root, row.path);
    if (!fs.existsSync(absolute)) { mismatches.push({ path: row.path, reason: "missing" }); continue; }
    const metadata = fs.lstatSync(absolute);
    if (!metadata.isFile() || metadata.isSymbolicLink()) { mismatches.push({ path: row.path, reason: "not_regular" }); continue; }
    const bytes = fs.readFileSync(absolute);
    if (bytes.length !== row.bytes || sha256(bytes) !== row.sha256) mismatches.push({ path: row.path, reason: "bytes_or_hash" });
  }
  return {
    path: manifestRelativePath,
    bytes: manifestBytes.length,
    sha256: sha256(manifestBytes),
    declaredFiles: declaredRows.length,
    expectedFiles: expectedPaths.length,
    expectedPathSetSha256: sha256(expectedPaths.join("\n")),
    declaredPathSetSha256: sha256(declaredPaths.join("\n")),
    unknownInventory: inventory.unknownCount,
    mismatches,
  };
}

export function validateA79Environment(env, { runtimeRoot, npmCliPath, browserExecutable, npmScriptShell = null }) {
  const checks = [];
  const add = (id, passed, detail = null) => checks.push({ id, passed: Boolean(passed), detail });
  const casefold = (value) => process.platform === "win32" ? value.toLocaleLowerCase("en-US") : value;
  const entries = Object.entries(env);
  const byKey = new Map();
  for (const [key, value] of entries) {
    const folded = casefold(key);
    if (!byKey.has(folded)) byKey.set(folded, []);
    byKey.get(folded).push({ key, value: String(value) });
  }
  const value = (key) => byKey.get(casefold(key))?.[0]?.value;
  const collisions = [...byKey.entries()].filter(([, rows]) => rows.length !== 1).map(([key, rows]) => ({ key, spellings: rows.map((row) => row.key) }));
  add("environment-key-casefold-unique", collisions.length === 0, collisions);
  add("sentinel", value("VELMERE_A79_ISOLATED_ENVIRONMENT") === "1", value("VELMERE_A79_ISOLATED_ENVIRONMENT") ?? null);
  const allowed = new Set([
    "PATH", "PATHEXT", "SystemRoot", "WINDIR", "ComSpec", "USERPROFILE", "APPDATA", "LOCALAPPDATA", "TEMP", "TMP",
    "CI", "NODE_ENV", "LANG", "LC_ALL", "FORCE_COLOR", "NEXT_TELEMETRY_DISABLED", "TERM",
    "npm_config_cache", "npm_config_offline", "npm_config_ignore_scripts", "npm_config_include", "npm_config_audit", "npm_config_fund",
    "npm_config_update_notifier", "npm_config_progress", "npm_config_registry", "npm_config_userconfig", "npm_config_script_shell",
    "VELMERE_A79_ISOLATED_ENVIRONMENT", "VELMERE_A79_RUNTIME_ROOT", "VELMERE_A79_NPM_CLI_PATH", "VELMERE_PLAYWRIGHT_EXECUTABLE_PATH",
    "VELMERE_A60_EXPECTED_SOURCE_MANIFEST_SHA256", "VELMERE_A60_CONFIRM", "VELMERE_A60_TEST_FORCE_RUNTIME_MISMATCH", "VELMERE_A60_TEST_RECEIPT_RELATIVE_PATH",
  ].map(casefold));
  const leaked = Object.keys(env).filter((key) => !allowed.has(casefold(key))).sort(lexical);
  add("no-secret-names", leaked.length === 0, leaked);
  add("runtime-root-env", value("VELMERE_A79_RUNTIME_ROOT") === runtimeRoot, value("VELMERE_A79_RUNTIME_ROOT") ?? null);
  add("npm-cli-env", value("VELMERE_A79_NPM_CLI_PATH") === npmCliPath, value("VELMERE_A79_NPM_CLI_PATH") ?? null);
  add("browser-env", value("VELMERE_PLAYWRIGHT_EXECUTABLE_PATH") === browserExecutable, value("VELMERE_PLAYWRIGHT_EXECUTABLE_PATH") ?? null);
  const configuredScriptShell = value("npm_config_script_shell");
  const scriptShellExpected = typeof npmScriptShell === "string" && npmScriptShell.trim() ? npmScriptShell.trim() : null;
  const scriptShellBound = process.platform === "win32"
    ? configuredScriptShell === undefined && scriptShellExpected === null
    : scriptShellExpected !== null && path.isAbsolute(scriptShellExpected) && configuredScriptShell === scriptShellExpected;
  add("npm-script-shell-bound", scriptShellBound, {
    platformClass: process.platform === "win32" ? "WINDOWS_NATIVE_COMSPEC" : "POSIX_EXPLICIT_PINNED_SHELL",
    configured: configuredScriptShell ? path.basename(configuredScriptShell) : null,
    expected: scriptShellExpected ? path.basename(scriptShellExpected) : null,
  });
  const pathValue = value("PATH") ?? "";
  const pathRows = pathValue.split(path.delimiter).filter(Boolean);
  const firstPath = pathRows[0] ?? "";
  const runtimeComparable = casefold(path.resolve(runtimeRoot));
  const firstComparable = firstPath ? casefold(path.resolve(firstPath)) : "";
  const systemRoot = value("SystemRoot") ?? value("WINDIR") ?? "";
  const allowedSystem32 = systemRoot ? casefold(path.join(path.resolve(systemRoot), "System32")) : null;
  add("system-path-isolated", pathRows.length >= 1 && pathRows.length <= 2 && (firstComparable === runtimeComparable || firstComparable.startsWith(`${runtimeComparable}${casefold(path.sep)}`)) && (pathRows.length === 1 || casefold(path.resolve(pathRows[1])) === allowedSystem32), pathRows);
  const registry = value("npm_config_registry");
  const userConfig = value("npm_config_userconfig");
  const profile = value("USERPROFILE");
  const userConfigInsideProfile = !userConfig || !profile || (() => { const relative = path.relative(casefold(path.resolve(profile)), casefold(path.resolve(userConfig))); return relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative); })();
  add("npm-configuration-isolated", (!registry || registry === "https://registry.npmjs.org/") && userConfigInsideProfile && value("npm_config_offline") !== "false" && value("npm_config_ignore_scripts") !== "false", { registry: registry ?? null, userConfigClass: userConfig ? "profile-relative" : "absent", offline: value("npm_config_offline") ?? null, ignoreScripts: value("npm_config_ignore_scripts") ?? null });
  add("no-node-options", value("NODE_OPTIONS") === undefined);
  add("no-node-path", value("NODE_PATH") === undefined);
  add("no-python-path", value("PYTHONPATH") === undefined);
  add("no-loader-preload", value("LD_PRELOAD") === undefined && value("DYLD_INSERT_LIBRARIES") === undefined);
  return { passed: checks.every((row) => row.passed), checks };
}

export function buildA60ChildEnvironment(baseEnv, additions = {}) {
  const allowed = [
    "PATH", "PATHEXT", "SystemRoot", "WINDIR", "ComSpec", "USERPROFILE", "APPDATA", "LOCALAPPDATA", "TEMP", "TMP",
    "CI", "NODE_ENV", "LANG", "LC_ALL", "FORCE_COLOR", "NEXT_TELEMETRY_DISABLED", "TERM",
    "npm_config_cache", "npm_config_offline", "npm_config_ignore_scripts", "npm_config_include", "npm_config_audit", "npm_config_fund",
    "npm_config_update_notifier", "npm_config_progress", "npm_config_registry", "npm_config_userconfig", "npm_config_script_shell",
    "VELMERE_A79_ISOLATED_ENVIRONMENT", "VELMERE_A79_RUNTIME_ROOT", "VELMERE_A79_NPM_CLI_PATH", "VELMERE_PLAYWRIGHT_EXECUTABLE_PATH",
    "VELMERE_A60_EXPECTED_SOURCE_MANIFEST_SHA256", "VELMERE_A60_CONFIRM", "VELMERE_A60_TEST_FORCE_RUNTIME_MISMATCH", "VELMERE_A60_TEST_RECEIPT_RELATIVE_PATH",
  ];
  const baseEntries = Object.entries(baseEnv);
  const lookup = (name) => {
    const matches = baseEntries.filter(([key]) => process.platform === "win32" ? key.toLocaleLowerCase("en-US") === name.toLocaleLowerCase("en-US") : key === name);
    if (matches.length > 1) throw new Error("a79_child_environment_casefold_collision");
    return matches[0]?.[1];
  };
  const output = {};
  for (const key of allowed) {
    const value = lookup(key);
    if (value !== undefined) output[key] = String(value);
  }
  const stageAllowed = /^(?:PORT|HOSTNAME|VELMERE_A45_BASE_URL|VELMERE_A45_QA_FIXTURE_PATH|VELMERE_A45_QA_FIXTURE_GENERATE|VELMERE_A79_SOURCE_MANIFEST_SHA256|VELMERE_A79_RUNTIME_INSTANCE_SHA256|VELMERE_A79_BROWSER_EXECUTABLE_SHA256|VELMERE_A79_BUILD_ID|VELMERE_A60_RUNTIME_PROBE_SHA256|VELMERE_RUNTIME_BUILD_SCOPE|VELMERE_RUNTIME_DIST_DIR|VELMERE_RUNTIME_BUILD_ID|VELMERE_SMOKE_PORT)$/u;
  for (const [key, value] of Object.entries(additions)) {
    if (!stageAllowed.test(key) || value === undefined || value === null) throw new Error("a79_child_environment_addition_forbidden");
    output[key] = String(value);
  }
  return output;
}

export function evaluateA60LogSafety(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(String(value ?? ""), "utf8");
  const raw = bytes.toString("utf8");
  const normalized = raw.replace(ANSI_COLOR, "").replaceAll("\r\n", "\n");
  const sensitive = /(?:bearer\s+[a-z0-9._~+/=-]{8,}|(?:^|[^a-z0-9])(?:sk|pk|whsec|sess|cus|pi|pm|cs|acct|acc)_[a-z0-9_-]{6,}|[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}|(?:token|session|password|secret|cookie|authorization|api[_-]?key)\s*[:=]\s*[^\s,;]+|[a-z]:\\users\\[^\\\s]+\\)/iu.test(normalized);
  return { passed: bytes.length <= 128 * 1024 * 1024 && !sensitive, safeToPersist: !sensitive, bytes: bytes.length, sha256: sha256(bytes), rawTextIncludedInReceipt: false };
}

export function evaluateA60Stderr(id, value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(String(value ?? ""), "utf8");
  const raw = bytes.toString("utf8");
  const normalized = raw.replace(ANSI_COLOR, "").replaceAll("\r\n", "\n");
  const safety = evaluateA60LogSafety(bytes);
  let classification = "empty";
  let contentAllowed = normalized.length === 0;
  if (id === "npm-ci" && /^npm warn deprecated @safe-global\/safe-gateway-typescript-sdk@3\.23\.1: Package no longer supported\. Contact Support at https:\/\/www\.npmjs\.com\/support for more info\.\n?$/u.test(normalized)) {
    classification = "exact_known_dependency_deprecation";
    contentAllowed = true;
  }
  if (id === "production-server" && /^⚠ "next start" does not work with "output: standalone" configuration\. Use "node \.next\/standalone\/server\.js" instead\.\n?$/u.test(normalized)) {
    classification = "exact_known_next_standalone_advisory_runtime_physically_reverified";
    contentAllowed = true;
  }
  const passed = bytes.length <= 1024 * 1024 && safety.passed && contentAllowed;
  return { passed, safeToPersist: safety.safeToPersist, classification: passed ? classification : !safety.safeToPersist ? "sensitive_stderr_rejected" : "unapproved_stderr_rejected", bytes: bytes.length, sha256: sha256(bytes), rawTextIncludedInReceipt: false };
}

export function expectedA60StageCommand(id, policy) {
  const npm = (...args) => ["<EXACT_NODE>", "<EXACT_NPM_CLI>", ...args];
  const commands = new Map([
    ["npm-ci", npm("ci", "--offline", "--ignore-scripts", "--no-audit", "--fund=false")],
    ["lint", npm("run", "lint")],
    ["typecheck", npm("run", "typecheck")],
    ["a58-current-integrity", ["<EXACT_NODE>", "scripts/pass36/verify-a58-release-integrity.mjs"]],
    ["a59-contract", npm("run", "test:pass36:a59")],
    ["a60-contract", npm("run", "test:pass36:a60")],
    ["build-webpack", npm("run", "build:webpack")],
    ["build-turbopack", npm("run", "build:turbopack")],
    ["post-build-typecheck", npm("run", "typecheck")],
    ["runtime-smoke", ["<EXACT_NODE>", policy?.runtimeSmoke?.runnerPath, policy?.runtimeSmoke?.mode]],
    ["browser-acceptance", ["<EXACT_NODE>", "scripts/a45-browser-acceptance.mjs"]],
    ["browser-evidence-verification", ["<EXACT_NODE>", "scripts/a60-browser-evidence-verifier.mjs"]],
  ]);
  const command = commands.get(id);
  return command && command.every((entry) => typeof entry === "string" && entry.length > 0) ? command : null;
}

export const A60_REQUIRED_STAGE_IDS = Object.freeze([
  "source-manifest-preflight",
  "npm-ci",
  "lint",
  "typecheck",
  "a58-current-integrity",
  "a59-contract",
  "a60-contract",
  "build-webpack",
  "build-turbopack",
  "post-build-typecheck",
  "production-server-ready",
  "runtime-smoke",
  "browser-acceptance",
  "browser-evidence-verification",
]);

export function validateA60StageSequence({ root, stages, policy, readArtifact = null, expectedRuntime = null }) {
  const rows = [];
  const add = (id, passed, detail = null) => rows.push({ id, passed: Boolean(passed), detail });
  const required = A60_REQUIRED_STAGE_IDS;
  const policyStages = Array.isArray(policy?.requiredStages) ? policy.requiredStages : [];
  const declared = Array.isArray(stages) ? stages : [];
  const declaredIds = Array.from(declared, (row) => row !== null && typeof row === "object" && !Array.isArray(row) && typeof row.id === "string" && row.id.length > 0 ? row.id : null);
  const policyValid = canonicalJson(policyStages) === canonicalJson(required) && new Set(policyStages).size === required.length;
  const declaredShapeValid = declaredIds.every((id) => id !== null);
  add("exact-stage-sequence", policyValid && declaredShapeValid && canonicalJson(declaredIds) === canonicalJson(required) && new Set(declaredIds).size === declared.length, { required, policyStages, declared: declaredIds, policyValid, declaredShapeValid });
  const reader = readArtifact ?? ((relative) => readBoundRegularFileInsideRoot(root, relative, { maxBytes: 128 * 1024 * 1024, label: "a60_stage_log" }));
  let previousCompletedAt = null;
  for (const id of required) {
    const row = declared.find((candidate) => candidate !== null && typeof candidate === "object" && !Array.isArray(candidate) && candidate.id === id);
    const timingValid = Number.isSafeInteger(row?.startedAtMs) && Number.isSafeInteger(row?.completedAtMs) && row.startedAtMs <= row.completedAtMs
      && (previousCompletedAt === null || row.startedAtMs >= previousCompletedAt - 5_000);
    if (Number.isSafeInteger(row?.completedAtMs)) previousCompletedAt = row.completedAtMs;
    if (id === "source-manifest-preflight") {
      add(`stage:${id}`, row?.ok === true && timingValid && row?.detail?.passed === true && row.detail?.mismatches?.length === 0, row);
      continue;
    }
    if (id === "production-server-ready") {
      const detail = row?.detail;
      const structural = row?.ok === true && timingValid && Number.isInteger(detail?.status) && detail.status >= 200 && detail.status < 400
        && detail?.url === `${detail?.baseUrl}/pl` && typeof detail?.buildId === "string" && detail.buildId.length > 0
        && detail?.runtimeBuildMode === policy?.runtimeBuildOutput?.mode && detail?.runtimeDistDir === policy?.runtimeBuildOutput?.distDir
        && /^[a-f0-9]{64}$/u.test(detail?.runtimeInstanceSha256 ?? "") && /^[a-f0-9]{64}$/u.test(detail?.runtimeProbeSha256 ?? "");
      const externallyBound = expectedRuntime === null || (detail?.baseUrl === expectedRuntime?.baseUrl && detail?.buildId === expectedRuntime?.buildId
        && detail?.runtimeBuildMode === expectedRuntime?.runtimeBuildMode && detail?.runtimeDistDir === expectedRuntime?.runtimeDistDir
        && detail?.runtimeInstanceSha256 === expectedRuntime?.runtimeInstanceSha256 && detail?.runtimeProbeSha256 === expectedRuntime?.runtimeProbeSha256);
      add(`stage:${id}`, structural && externallyBound, { row, expectedRuntime });
      continue;
    }
    let logsValid = true;
    const logDetails = [];
    const logSnapshots = new Map();
    for (const suffix of ["stdout", "stderr"]) {
      const binding = row?.[suffix];
      const expectedPath = `artifacts/pass36/a60/logs/${id}.${suffix}.log`;
      try {
        const snapshot = reader(expectedPath);
        logSnapshots.set(suffix, snapshot);
        const valid = snapshot?.path === expectedPath && binding?.path === expectedPath && binding?.bytes === snapshot.byteLength && binding?.sha256 === snapshot.sha256;
        logsValid &&= valid;
        logDetails.push({ suffix, valid, binding, observed: { path: snapshot.path, byteLength: snapshot.byteLength, sha256: snapshot.sha256 } });
      } catch (error) {
        logsValid = false;
        logDetails.push({ suffix, valid: false, error: error instanceof Error ? error.message : String(error) });
      }
    }
    const expectedCommand = expectedA60StageCommand(id, policy);
    const durationValid = Number.isSafeInteger(row?.durationMs) && row.durationMs >= row.completedAtMs - row.startedAtMs && row.durationMs <= row.completedAtMs - row.startedAtMs + 5_000;
    const commandValid = expectedCommand !== null && canonicalJson(row?.command) === canonicalJson(expectedCommand);
    const { stderrPolicyValid, stdoutSafetyValid } = (() => {
      try {
        const stdoutSnapshot = logSnapshots.get("stdout");
        const stderrSnapshot = logSnapshots.get("stderr");
        if (!stdoutSnapshot || !stderrSnapshot) throw new Error("a60_stage_log_snapshot_missing");
        const observedStdoutSafety = evaluateA60LogSafety(stdoutSnapshot.bytes ?? Buffer.alloc(stdoutSnapshot.byteLength));
        const observedPolicy = evaluateA60Stderr(id, stderrSnapshot.bytes ?? Buffer.alloc(stderrSnapshot.byteLength));
        return {
          stdoutSafetyValid: observedStdoutSafety.passed === true && canonicalJson(row?.stdoutSafety) === canonicalJson(observedStdoutSafety),
          stderrPolicyValid: observedPolicy.passed === true && canonicalJson(row?.stderrPolicy) === canonicalJson(observedPolicy),
        };
      } catch {
        return { stdoutSafetyValid: false, stderrPolicyValid: false };
      }
    })();
    add(`stage:${id}`, row?.ok === true && timingValid && durationValid && commandValid && stdoutSafetyValid && stderrPolicyValid && row?.exitCode === 0 && row?.signal == null && row?.errorCode == null && row?.outputContractPassed === true && row?.outputContractError == null && logsValid, { row, expectedCommand, commandValid, durationValid, stdoutSafetyValid, stderrPolicyValid, logs: logDetails });
  }
  return { passed: rows.every((row) => row.passed), checks: rows, failures: rows.filter((row) => !row.passed), requiredStages: required.length, declaredStages: declared.length };
}

function collectorEvidenceShapeComplete(items, summary) {
  if (!Array.isArray(items) || !summary || !Number.isSafeInteger(summary.total) || !Number.isSafeInteger(summary.retained) || !Number.isSafeInteger(summary.limit)) return false;
  if (summary.total !== items.length || summary.retained !== items.length || summary.truncated !== false || summary.limit < items.length) return false;
  return true;
}

function collectorEvidenceIsComplete(items, summary, { allowExpectedRsc = false, baseUrl = null } = {}) {
  if (!collectorEvidenceShapeComplete(items, summary)) return false;
  if (!allowExpectedRsc) return items.length === 0;
  return items.every((failure) => failure?.classification === "expected_next_rsc_abort" && isExpectedNextRscAbort(failure, baseUrl));
}

export function evaluateBrowserRouteEvidence(row, { route, expectedUrl, baseUrl, budgets, strict = false }) {
  if (!row || !route) return false;
  if (!strict) return row.ok === true;
  const derived = deriveBrowserRouteEvidence(row, { route, expectedUrl, baseUrl, budgets });
  return row.ok === derived && derived;
}

export function deriveBrowserRouteEvidence(row, { route, expectedUrl, baseUrl, budgets }) {
  if (!row || !route) return false;
  const basic = row.navigationError == null
    && row.url === expectedUrl && row.finalUrl === expectedUrl && row.sameOrigin === true
    && Number.isInteger(row.status) && row.status >= 200 && row.status < 400
    && row.selector === route.selector && Number.isSafeInteger(row.selectorCount) && row.selectorCount > 0
    && Array.isArray(row.consoleErrors) && row.consoleErrors.length <= budgets.maximumConsoleErrorsPerRoute
    && Array.isArray(row.pageErrors) && row.pageErrors.length <= budgets.maximumPageErrorsPerRoute
    && Array.isArray(row.brokenImages) && row.brokenImages.length === 0
    && Number.isFinite(row.layout?.bodyHeight) && row.layout.bodyHeight >= budgets.minimumBodyHeightPx
    && Number.isFinite(row.layout?.horizontalOverflowPx) && row.layout.horizontalOverflowPx <= budgets.maximumHorizontalOverflowPx
    && Array.isArray(row.layout?.invalidTokens) && row.layout.invalidTokens.length === 0;
  const counts = row.evidenceCounts;
  const ignoredConsoleValid = collectorEvidenceShapeComplete(row.ignoredConsoleErrors, counts?.ignoredConsoleErrors)
    && row.ignoredConsoleErrors.every((entry) => entry?.classification === "exact_react_devtools_advisory" && entry?.rawTextIncluded === false && entry?.sanitizedTextIncluded === false);
  const recomputedFirstPartyFailures = Array.isArray(row.failedRequests) ? row.failedRequests.filter((failure) => failure?.originClass === "loopback").length : -1;
  return basic
    && row.fatalTokenPresent === false
    && row.securityHeaders?.contentSecurityPolicyPresent === true
    && row.securityHeaders?.frameAncestorsDeclared === true
    && row.securityHeaders?.contentTypeOptionsNosniff === true
    && row.securityHeaders?.referrerPolicyPresent === true
    && Array.isArray(row.hydrationErrors) && row.hydrationErrors.length === 0
    && row.interactions?.reducedMotion === true
    && row.interactions?.keyboardFocus?.escapedBody === true
    && row.interactions?.zoom200?.applied === true
    && row.interactions?.zoom200?.bodyVisible === true
    && row.interactions?.zoom200?.fatalTokenPresent === false
    && Number.isSafeInteger(row.imageSettle?.incomplete) && row.imageSettle.incomplete === 0
    && row.brokenImagesTotal === 0 && row.brokenImagesTruncated === false
    && collectorEvidenceIsComplete(row.consoleErrors, counts?.consoleErrors)
    && collectorEvidenceIsComplete(row.pageErrors, counts?.pageErrors)
    && collectorEvidenceIsComplete(row.hydrationErrors, counts?.hydrationErrors)
    && collectorEvidenceIsComplete(row.httpErrors, counts?.httpErrors)
    && collectorEvidenceIsComplete(row.failedRequests, counts?.failedRequests)
    && collectorEvidenceIsComplete(row.ignoredRequestFailures, counts?.ignoredRequestFailures, { allowExpectedRsc: true, baseUrl })
    && ignoredConsoleValid
    && Number.isSafeInteger(row.firstPartyFailureCount) && row.firstPartyFailureCount === recomputedFirstPartyFailures;
}

export function evaluatePopupEvidence(popup, { expectedUrl, requiredTabs, baseUrl, strict = false }) {
  if (!popup) return false;
  if (!strict) return popup.ok === true && popup.fitsViewport === true;
  const derived = derivePopupEvidence(popup, { expectedUrl, requiredTabs, baseUrl });
  return popup.ok === derived && derived;
}

export function derivePopupEvidence(popup, { expectedUrl, requiredTabs, baseUrl }) {
  if (!popup) return false;
  const declaredTabs = Array.isArray(popup.tabRows) ? popup.tabRows.map((row) => row.tabId) : [];
  const bounds = popup.modalBounds;
  const viewport = popup.viewport;
  const recomputedFit = Boolean(bounds && viewport
    && [bounds.x, bounds.y, bounds.width, bounds.height, viewport.width, viewport.height].every(Number.isFinite)
    && bounds.width > 0 && bounds.height > 0 && viewport.width > 0 && viewport.height > 0
    && bounds.x >= -2 && bounds.y >= -2
    && bounds.x + bounds.width <= viewport.width + 2 && bounds.y + bounds.height <= viewport.height + 2);
  const basic = popup.error == null && popup.url === expectedUrl && popup.finalUrl === expectedUrl
    && popup.fitsViewport === true && recomputedFit
    && canonicalJson(declaredTabs) === canonicalJson(requiredTabs)
    && new Set(declaredTabs).size === requiredTabs.length
    && popup.tabRows.every((row) => row.visible === true && row.selected === "true")
    && Array.isArray(popup.consoleErrors) && popup.consoleErrors.length === 0
    && Array.isArray(popup.pageErrors) && popup.pageErrors.length === 0;
  const counts = popup.evidenceCounts;
  const ignoredConsoleValid = collectorEvidenceShapeComplete(popup.ignoredConsoleErrors, counts?.ignoredConsoleErrors)
    && popup.ignoredConsoleErrors.every((entry) => entry?.classification === "exact_react_devtools_advisory" && entry?.rawTextIncluded === false && entry?.sanitizedTextIncluded === false);
  return basic
    && Array.isArray(popup.hydrationErrors) && popup.hydrationErrors.length === 0
    && Array.isArray(popup.brokenImages) && popup.brokenImages.length === 0
    && popup.brokenImagesTotal === 0 && popup.brokenImagesTruncated === false
    && collectorEvidenceIsComplete(popup.consoleErrors, counts?.consoleErrors)
    && collectorEvidenceIsComplete(popup.pageErrors, counts?.pageErrors)
    && collectorEvidenceIsComplete(popup.hydrationErrors, counts?.hydrationErrors)
    && collectorEvidenceIsComplete(popup.httpErrors, counts?.httpErrors)
    && collectorEvidenceIsComplete(popup.failedRequests, counts?.failedRequests)
    && collectorEvidenceIsComplete(popup.ignoredRequestFailures, counts?.ignoredRequestFailures, { allowExpectedRsc: true, baseUrl })
    && ignoredConsoleValid;
}

export function validateBrowserReceipt({ root, receipt, contract, expected, artifactReader = null }) {
  const checks = [];
  const add = (id, passed, detail = null) => checks.push({ id, passed: Boolean(passed), detail });
  const readArtifact = artifactReader ?? ((relativePath, options = {}) => readBoundRegularFileInsideRoot(root, relativePath, options));
  add("schema", receipt?.schemaVersion === "velmere.pass35.a45.browser-acceptance.v2", receipt?.schemaVersion);
  add("base-url", receipt?.baseUrl === expected.baseUrl, receipt?.baseUrl);
  add("source-binding", receipt?.bindings?.sourceManifestSha256 === expected.sourceManifestSha256, receipt?.bindings?.sourceManifestSha256);
  add("runtime-binding", receipt?.bindings?.runtimeInstanceSha256 === expected.runtimeInstanceSha256, receipt?.bindings?.runtimeInstanceSha256);
  add("browser-binding", receipt?.bindings?.browserExecutableSha256 === expected.browserExecutableSha256, receipt?.bindings?.browserExecutableSha256);
  add("build-binding", receipt?.bindings?.buildId === expected.buildId, receipt?.bindings?.buildId);
  if (expected.qaFixtureRequired === true) {
    const usage = receipt?.qaFixture;
    const declaredRelative = String(usage?.fixtureRelativePath ?? "").replaceAll("\\", "/");
    const expectedRelative = String(expected.qaFixtureRelativePath ?? "").replaceAll("\\", "/");
    const fixtureAbsolute = path.resolve(root, declaredRelative || "__missing_a45_fixture__");
    const fixtureRelativeFromRoot = path.relative(root, fixtureAbsolute).replaceAll("\\", "/");
    const safeFixturePath = declaredRelative === expectedRelative
      && declaredRelative.startsWith("artifacts/")
      && !fixtureRelativeFromRoot.startsWith("../")
      && !path.isAbsolute(fixtureRelativeFromRoot);
    let fixtureBytes = null;
    let fixtureJson = null;
    let fixtureRegular = false;
    const canonicalFixtureBytes = Buffer.from(`${JSON.stringify(buildA45DeterministicQaFixture(), null, 2)}\n`, "utf8");
    if (safeFixturePath && fs.existsSync(fixtureAbsolute)) {
      try {
        const snapshot = readArtifact(declaredRelative, { maxBytes: 8 * 1024 * 1024, label: "browser_fixture" });
        fixtureRegular = true;
        fixtureBytes = snapshot.bytes;
        try { fixtureJson = JSON.parse(fixtureBytes.toString("utf8")); } catch { fixtureJson = null; }
      } catch { fixtureRegular = false; }
    }
    add("fixture-enabled", usage?.enabled === true, usage?.enabled);
    add("fixture-path", safeFixturePath, { declared: declaredRelative, expected: expectedRelative });
    add("fixture-generated", usage?.generated === true && usage?.generatorId === expected.qaFixtureGeneratorId, { generated: usage?.generated, generatorId: usage?.generatorId });
    add("fixture-digest", fixtureRegular
      && /^[a-f0-9]{64}$/u.test(usage?.fixtureSha256 ?? "")
      && usage.fixtureSha256 === sha256(fixtureBytes)
      && usage.fixtureByteLength === fixtureBytes.length
      && fixtureBytes.equals(canonicalFixtureBytes),
    { declaredSha256: usage?.fixtureSha256, declaredBytes: usage?.fixtureByteLength, actualSha256: fixtureBytes ? sha256(fixtureBytes) : null, actualBytes: fixtureBytes?.length ?? null, expectedSha256: sha256(canonicalFixtureBytes), expectedBytes: canonicalFixtureBytes.length });
    add("fixture-truth-boundary", fixtureJson?.schemaVersion === "velmere.a45.market-ui-fixture.v1"
      && fixtureJson?.generatorId === expected.qaFixtureGeneratorId
      && fixtureJson?.liveProven === false
      && fixtureJson?.saleEnabled === false
      && fixtureJson?.providerCredit === false
      && fixtureJson?.durableStorageCredit === false
      && fixtureJson?.realDataCredit === false
      && typeof fixtureJson?.truthBoundary === "string"
      && fixtureJson.truthBoundary.includes("not current market data")
      && usage?.liveProven === false
      && usage?.saleEnabled === false
      && usage?.providerCredit === false
      && usage?.durableStorageCredit === false
      && usage?.realDataCredit === false,
    { fixture: fixtureJson ? { liveProven: fixtureJson.liveProven, saleEnabled: fixtureJson.saleEnabled, providerCredit: fixtureJson.providerCredit, durableStorageCredit: fixtureJson.durableStorageCredit, realDataCredit: fixtureJson.realDataCredit } : null, usage });
    const requestKeys = Object.keys(usage?.requests ?? {}).sort(lexical);
    const expectedRequestKeys = [...(expected.qaFixtureRequestCounterKeys ?? [])].sort(lexical);
    add("fixture-request-shape", canonicalJson(requestKeys) === canonicalJson(expectedRequestKeys)
      && expectedRequestKeys.every((keyName) => Number.isSafeInteger(usage?.requests?.[keyName]) && usage.requests[keyName] >= 0),
    { declared: requestKeys, expected: expectedRequestKeys, requests: usage?.requests });
    add("fixture-required-usage", (expected.qaFixtureRequiredPositiveRequestFamilies ?? []).every((keyName) => Number.isSafeInteger(usage?.requests?.[keyName]) && usage.requests[keyName] > 0)
      && (expected.qaFixtureRequiredZeroRequestFamilies ?? []).every((keyName) => Number.isSafeInteger(usage?.requests?.[keyName]) && usage.requests[keyName] === 0),
      { requiredPositive: expected.qaFixtureRequiredPositiveRequestFamilies, requiredZero: expected.qaFixtureRequiredZeroRequestFamilies, requests: usage?.requests });
  }
  const rows = Array.isArray(receipt?.rows) ? receipt.rows : [];
  const expectedRows = expectedBrowserRows(contract);
  const key = (row) => `${row.locale}\0${row.viewport}\0${row.route}`;
  const declaredKeys = rows.map(key).sort(lexical);
  const expectedKeys = expectedRows.map(key).sort(lexical);
  add("matrix-exact", canonicalJson(declaredKeys) === canonicalJson(expectedKeys), { declared: declaredKeys, expected: expectedKeys });
  add("matrix-unique", new Set(declaredKeys).size === declaredKeys.length, declaredKeys);
  add("summary", receipt?.summary?.checks === expectedRows.length + 1 && receipt?.summary?.failed === 0 && receipt?.summary?.passed === expectedRows.length + 1
    && (expected.requireHttpErrors !== true || (Array.isArray(receipt?.failures) && receipt.failures.length === 0)),
  { summary: receipt?.summary, failureCount: receipt?.failures?.length ?? null });
  const routeById = new Map((contract.routes ?? []).map((row) => [row.id, row]));
  const declaredRowByKey = new Map(rows.map((row) => [key(row), row]));
  for (const expectedRow of expectedRows) {
    const expectedKey = key(expectedRow);
    const row = declaredRowByKey.get(expectedKey);
    const route = routeById.get(expectedRow.route);
    const expectedUrl = route ? `${expected.baseUrl}/${expectedRow.locale}${route.suffix}` : null;
    add(`row-ok:${expectedKey}`, evaluateBrowserRouteEvidence(row, { route, expectedUrl, baseUrl: expected.baseUrl, budgets: contract.browserBudgets ?? {}, strict: expected.requireHttpErrors === true }), row?.ok);
    add(`row-url:${expectedKey}`, row?.url === expectedUrl && row?.finalUrl === expectedUrl, { url: row?.url, finalUrl: row?.finalUrl, expectedUrl });
    add(`row-status:${expectedKey}`, Number.isInteger(row?.status) && row.status >= 200 && row.status < 400, row?.status);
    add(`row-console:${expectedKey}`, Array.isArray(row?.consoleErrors) && row.consoleErrors.length === 0, row?.consoleErrors);
    add(`row-page-errors:${expectedKey}`, Array.isArray(row?.pageErrors) && row.pageErrors.length === 0, row?.pageErrors);
    add(`row-broken-images:${expectedKey}`, Array.isArray(row?.brokenImages) && row.brokenImages.length === 0, row?.brokenImages);
    const failedRequests = Array.isArray(row?.failedRequests) ? row.failedRequests : null;
    const ignoredRequests = Array.isArray(row?.ignoredRequestFailures) ? row.ignoredRequestFailures : null;
    const requestEvidenceValid = expected.requireHttpErrors === true
      ? Boolean(row) && failedRequests?.length === 0 && ignoredRequests !== null
        && ignoredRequests.every((failure) => failure?.classification === "expected_next_rsc_abort" && isExpectedNextRscAbort(failure, expected.baseUrl))
      : Boolean(row) && failedRequests?.length === 0;
    add(`row-first-party-requests:${expectedKey}`, requestEvidenceValid, { failedRequests, ignoredRequests });
    if (expected.requireHttpErrors === true) {
      add(`row-http-errors:${expectedKey}`, Array.isArray(row?.httpErrors) && row.httpErrors.length === 0, row?.httpErrors);
    }
  }
  const popup = receipt?.popup;
  const popupExpectedUrl = `${expected.baseUrl}/pl/market-integrity`;
  add("popup-ok", evaluatePopupEvidence(popup, { expectedUrl: popupExpectedUrl, requiredTabs: contract.requiredPopupTabs ?? [], baseUrl: expected.baseUrl, strict: expected.requireHttpErrors === true }), popup);
  add("popup-tabs", (contract.requiredPopupTabs ?? []).every((id) => popup?.tabRows?.some((row) => row.tabId === id && row.selected === "true" && row.visible === true)), popup?.tabRows);
  if (expected.requireHttpErrors === true) add("popup-http-errors", Array.isArray(popup?.httpErrors) && popup.httpErrors.length === 0, popup?.httpErrors);
  const screenshotRows = [];
  for (const row of rows) if (row.screenshotPath) screenshotRows.push({ path: row.screenshotPath, declared: row.screenshotSha256 });
  if (popup?.screenshotPath) screenshotRows.push({ path: popup.screenshotPath, declared: popup.screenshotSha256 });
  screenshotRows.sort((a, b) => lexical(a.path, b.path));
  const expectedPaths = expectedScreenshotPaths(contract);
  add("screenshots-exact", canonicalJson(screenshotRows.map((row) => row.path)) === canonicalJson(expectedPaths), { declared: screenshotRows.map((row) => row.path), expected: expectedPaths });
  const screenshotByPath = new Map(screenshotRows.map((row) => [row.path, row]));
  for (const expectedPath of expectedPaths) {
    const screenshot = screenshotByPath.get(expectedPath);
    const absolute = path.join(root, expectedPath);
    let present = Boolean(screenshot) && fs.existsSync(absolute);
    let bytes = null;
    let png = { valid: false, reason: present ? "unread" : "missing" };
    if (present) {
      try {
        bytes = readArtifact(expectedPath, { maxBytes: 128 * 1024 * 1024, label: "browser_screenshot" }).bytes;
        png = inspectPng(bytes);
      } catch (error) {
        present = false;
        png = { valid: false, reason: error instanceof Error ? error.message : "unsafe_screenshot" };
      }
    }
    add(`screenshot-present:${expectedPath}`, present, expectedPath);
    add(`screenshot-digest:${expectedPath}`, Boolean(bytes) && /^[a-f0-9]{64}$/u.test(screenshot?.declared ?? "") && sha256(bytes) === screenshot.declared, { declared: screenshot?.declared, actual: bytes ? sha256(bytes) : null });
    add(`screenshot-png:${expectedPath}`, png.valid === true, png);
    add(`screenshot-dimensions:${expectedPath}`, png.valid === true && png.width >= 320 && png.height >= 180 && png.width <= 10000 && png.height <= 50000, png);
  }
  return { passed: checks.every((row) => row.passed), checks, failures: checks.filter((row) => !row.passed) };
}
