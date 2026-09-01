import { createHash } from "node:crypto";
import { lstat, readFile, readdir, realpath } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";
import { computePass4823SourceTree } from "../pass4823/typecheck-source-contract.mjs";

export const APPEARANCE_FREEZE_SCHEMA = "velmere.pass4825.appearance-projection-freeze.v1";
export const APPEARANCE_FREEZE_OUTPUT = "artifacts/pass4825/PASS4825_APPEARANCE_FREEZE_RECEIPT.json";

const REQUIRED_DIRECTORIES = Object.freeze(["app", "components", "messages", "public"]);
const TSX_DIRECTORIES = Object.freeze(["app", "components"]);
const FULL_BYTE_DIRECTORIES = Object.freeze(["messages", "public"]);
const OPTIONAL_PRESENTATION_DIRECTORIES = Object.freeze(["styles"]);
const PRESENTATION_CONFIGS = Object.freeze(["postcss.config.js", "tailwind.config.ts"]);
const STYLESHEET_EXTENSIONS = new Set([".css", ".less", ".sass", ".scss", ".styl"]);
const IMPORTED_ASSET_EXTENSIONS = new Set([
  ".avif", ".eot", ".gif", ".ico", ".jpeg", ".jpg", ".mp4", ".otf", ".png",
  ".svg", ".ttf", ".webm", ".webp", ".woff", ".woff2",
]);
const PRESENTATION_ATTRIBUTE = /^(?:accent|align|alt|animation|appearance|aria-.+|background|border|checked|class|className|color|data-.+|dir|disabled|display|fill|font|gap|height|hidden|icon|id|lang|layout|loading|margin|max|min|opacity|open|padding|placeholder|position|radius|role|scale|selected|shape|size|src|stroke|style|theme|title|tone|transform|transition|value|variant|visible|width|zIndex)$/u;
const SHA256 = /^sha256:[a-f0-9]{64}$/u;
const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed, removeComments: true });

const APPROVED_DATA_TRUTH_POLICY_VERSION = "velmere.pass4825.approved-data-truth-substitutions.v2";
const APPROVED_DATA_TRUTH_SUBSTITUTIONS = Object.freeze([
  Object.freeze({
    id: "asset-detail-live-truth-status",
    path: "components/market-integrity/AssetDetailModal.tsx",
    baselineProjectionSha256: "sha256:69069acb442c5700f667127d8a6cd4976d928542259aa1e7a9657e2e3d334647",
    currentProjectionSha256: "sha256:3d1bb9b398889ffcc31d960c0a30c77b38c5fb732332168b85e1ddba3d20831f",
    rationale: "Pin the complete component projection while replacing ambiguous live-time fallbacks with explicit verified/not-verified market status and a truthful source-status aria label; tags, classes and layout remain unchanged.",
  }),
  Object.freeze({
    id: "real-markets-live-truth-status",
    path: "components/market-integrity/CrossAssetCollapseRadarPanel.tsx",
    baselineProjectionSha256: "sha256:ea2f4f56a44570ac0ecf6d9bd8ad8463f0e9bddea12d2ccaead74f37d2fac72f",
    currentProjectionSha256: "sha256:c9503ca127c5af2df5e7376102ddabd72cf394845e2a36a050b80d123c21a9fb",
    rationale: "Pin the complete component projection for the audited provider/source-bound versus server-verified LIVE wording and status readouts; no tag, class, color or layout change is approved separately.",
  }),
  Object.freeze({
    id: "shield-pro-kline-truth-status",
    path: "components/market-integrity/ShieldProCleanTerminalClient.tsx",
    baselineProjectionSha256: "sha256:b628d7d53da6b179591cf3a3835ed225616290d5bf90c3f4c3e5a08fa4bbed5b",
    currentProjectionSha256: "sha256:8a52a48d30773f006d339c658cb738362114a63677b7db4b6f1ffa70ed28cd64",
    rationale: "Pin the complete component projection for explicit verified, partial-not-live, last-known-good, conflict and error kline states; existing presentation structure and classes stay fixed.",
  }),
  Object.freeze({
    id: "vlm-brain-optional-diagnostics-truth",
    path: "components/market-integrity/VlmBrainWorkspace.tsx",
    baselineProjectionSha256: "sha256:cef78f7c7755df1bdae296e5a6e52f5e6814a1be039adc1dd2c6ebab5fe1aab9",
    currentProjectionSha256: "sha256:1d4ca464fba357c24ca7cdf119f5b8fadedce51483a5e510e6c78294324e8abf",
    rationale: "Pin the complete component projection for null-safe diagnostic counts after the server evidence envelope became optional; rendered fallback values, tags, classes and layout are unchanged.",
  }),
]);

function invariant(condition, code) {
  if (!condition) throw new Error(code);
}

function posix(value) {
  return value.split(path.sep).join("/");
}

export function canonicalAppearance(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    invariant(Number.isFinite(value), "appearance_non_finite_number");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalAppearance).join(",")}]`;
  invariant(value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype,
    "appearance_unsupported_canonical_value");
  const keys = Object.keys(value).sort((left, right) => left.localeCompare(right, "en"));
  for (const key of keys) invariant(value[key] !== undefined, `appearance_undefined_value:${key}`);
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalAppearance(value[key])}`).join(",")}}`;
}

export function sha256Appearance(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

export function attachAppearanceChecksum(core) {
  return { ...core, checksumSha256: sha256Appearance(canonicalAppearance(core)) };
}

export function verifyAppearanceChecksum(receipt) {
  invariant(receipt && typeof receipt === "object" && !Array.isArray(receipt), "appearance_receipt_invalid");
  invariant(SHA256.test(receipt.checksumSha256 ?? ""), "appearance_checksum_missing");
  const core = { ...receipt };
  delete core.checksumSha256;
  invariant(receipt.checksumSha256 === sha256Appearance(canonicalAppearance(core)),
    "appearance_checksum_mismatch");
}

function replaceProjectionHash(value, targetHash, policyId) {
  if (value === null || typeof value !== "object") return { value, matchCount: 0 };
  if (sha256Appearance(canonicalAppearance(value)) === targetHash) {
    return {
      value: { kind: "approved-data-truth-substitution", policyId },
      matchCount: 1,
    };
  }
  if (Array.isArray(value)) {
    let matchCount = 0;
    const normalized = value.map((item) => {
      const result = replaceProjectionHash(item, targetHash, policyId);
      matchCount += result.matchCount;
      return result.value;
    });
    return { value: normalized, matchCount };
  }
  let matchCount = 0;
  const normalized = {};
  for (const [key, item] of Object.entries(value)) {
    const result = replaceProjectionHash(item, targetHash, policyId);
    normalized[key] = result.value;
    matchCount += result.matchCount;
  }
  return { value: normalized, matchCount };
}

function normalizeApprovedDataTruthProjections(relative, projection, role) {
  invariant(role === "baseline" || role === "current", "appearance_manifest_role_invalid");
  let normalized = projection;
  const slots = [];
  for (const policy of APPROVED_DATA_TRUTH_SUBSTITUTIONS.filter((entry) => entry.path === relative)) {
    const pinnedProjectionSha256 = role === "baseline"
      ? policy.baselineProjectionSha256
      : policy.currentProjectionSha256;
    const result = replaceProjectionHash(normalized, pinnedProjectionSha256, policy.id);
    normalized = result.value;
    slots.push({
      id: policy.id,
      path: policy.path,
      pinnedProjectionSha256,
      matchCount: result.matchCount,
    });
  }
  return {
    normalizedProjectionSha256: sha256Appearance(canonicalAppearance(normalized)),
    approvedDataTruthSlots: slots,
  };
}

async function regularRoot(input, code) {
  const absolute = path.resolve(input);
  const stats = await lstat(absolute).catch(() => null);
  invariant(stats?.isDirectory() && !stats.isSymbolicLink(), `${code}_missing_or_invalid`);
  const resolved = await realpath(absolute);
  return resolved;
}

function rootsAreDisjoint(currentRoot, baselineRoot) {
  if (currentRoot === baselineRoot) return false;
  const baselineFromCurrent = path.relative(currentRoot, baselineRoot);
  const currentFromBaseline = path.relative(baselineRoot, currentRoot);
  return baselineFromCurrent.startsWith("..") && currentFromBaseline.startsWith("..")
    && !path.isAbsolute(baselineFromCurrent) && !path.isAbsolute(currentFromBaseline);
}

async function requireDirectories(root) {
  for (const relative of REQUIRED_DIRECTORIES) {
    const stats = await lstat(path.join(root, relative)).catch(() => null);
    invariant(stats?.isDirectory() && !stats.isSymbolicLink(), `appearance_required_directory_missing:${relative}`);
  }
}

async function walk(root, relativeDirectory, output) {
  const absolute = path.join(root, relativeDirectory);
  const stats = await lstat(absolute).catch(() => null);
  if (!stats) return;
  invariant(stats.isDirectory() && !stats.isSymbolicLink(),
    `appearance_directory_invalid:${relativeDirectory}`);
  const entries = await readdir(absolute, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name, "en"));
  for (const entry of entries) {
    const relative = posix(path.join(relativeDirectory, entry.name));
    invariant(!entry.isSymbolicLink(), `appearance_symlink_forbidden:${relative}`);
    if (entry.isDirectory()) await walk(root, relative, output);
    else if (entry.isFile()) output.push(relative);
  }
}

function tagName(node, sourceFile) {
  return node.getText(sourceFile).replaceAll("\r\n", "\n");
}

function printed(node, sourceFile) {
  return printer.printNode(ts.EmitHint.Unspecified, node, sourceFile).replaceAll("\r\n", "\n");
}

function attributeName(node) {
  return node.name.getText().replaceAll("\r\n", "\n");
}

function initializerProjection(initializer, sourceFile, bindValue, metrics) {
  if (!initializer) return { kind: "boolean", value: true };
  if (ts.isStringLiteral(initializer)) return { kind: "string", value: initializer.text };
  invariant(ts.isJsxExpression(initializer), "appearance_jsx_initializer_kind_unsupported");
  if (!initializer.expression) return { kind: "empty-expression", value: null };
  if (!bindValue) {
    const nested = nestedJsxProjection(initializer.expression, sourceFile, metrics);
    return nested.length > 0
      ? { kind: "nested-jsx-expression", roots: nested }
      : { kind: "non-presentation-logic-expression", valueIntentionallyOmitted: true };
  }
  return {
    kind: "expression",
    value: printed(initializer.expression, sourceFile),
  };
}

function attributesProjection(attributes, sourceFile, metrics) {
  return attributes.properties.map((attribute) => {
    if (ts.isJsxSpreadAttribute(attribute)) {
      metrics.spreadAttributeCount += 1;
      return { kind: "spread", expression: printed(attribute.expression, sourceFile) };
    }
    const name = attributeName(attribute);
    metrics.attributeCount += 1;
    if (name === "class" || name === "className") metrics.classAttributeCount += 1;
    if (name === "style") metrics.styleAttributeCount += 1;
    if (name === "role" || name.startsWith("aria-") || name.startsWith("data-")) {
      metrics.semanticAttributeCount += 1;
    }
    const presentationRelevant = PRESENTATION_ATTRIBUTE.test(name);
    return {
      kind: "attribute",
      name,
      presentationRelevant,
      initializer: initializerProjection(attribute.initializer, sourceFile, presentationRelevant, metrics),
    };
  });
}

function countDirectExpressionStrings(node, metrics) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    metrics.visibleExpressionStringCount += 1;
  }
  ts.forEachChild(node, (child) => countDirectExpressionStrings(child, metrics));
}

function nestedJsxProjection(expression, sourceFile, metrics) {
  const roots = [];
  const visit = (node) => {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) {
      roots.push(projectJsx(node, sourceFile, metrics));
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(expression);
  return roots;
}

function jsxExpressionProjection(expression, sourceFile, metrics) {
  if (!expression) return { mode: "empty", value: null };
  const nested = nestedJsxProjection(expression, sourceFile, metrics);
  if (nested.length > 0) {
    metrics.logicContainerExpressionCount += 1;
    return {
      mode: "logic-container-with-nested-jsx",
      surroundingLogicIntentionallyOmitted: true,
      roots: nested,
    };
  }
  countDirectExpressionStrings(expression, metrics);
  return { mode: "direct-render-expression", value: printed(expression, sourceFile) };
}

function projectJsx(node, sourceFile, metrics) {
  if (ts.isJsxElement(node)) {
    metrics.tagCount += 1;
    return {
      kind: "element",
      tag: tagName(node.openingElement.tagName, sourceFile),
      attributes: attributesProjection(node.openingElement.attributes, sourceFile, metrics),
      children: node.children.map((child) => projectJsx(child, sourceFile, metrics)),
      closingTag: tagName(node.closingElement.tagName, sourceFile),
    };
  }
  if (ts.isJsxSelfClosingElement(node)) {
    metrics.tagCount += 1;
    metrics.selfClosingTagCount += 1;
    return {
      kind: "self-closing-element",
      tag: tagName(node.tagName, sourceFile),
      attributes: attributesProjection(node.attributes, sourceFile, metrics),
    };
  }
  if (ts.isJsxFragment(node)) {
    metrics.fragmentCount += 1;
    return {
      kind: "fragment",
      children: node.children.map((child) => projectJsx(child, sourceFile, metrics)),
    };
  }
  if (ts.isJsxText(node)) {
    const value = node.getText(sourceFile).replaceAll("\r\n", "\n");
    if (value.trim()) metrics.visibleTextNodeCount += 1;
    return { kind: "text", value };
  }
  invariant(ts.isJsxExpression(node), "appearance_jsx_child_kind_unsupported");
  metrics.expressionCount += 1;
  return {
    kind: "expression",
    expression: jsxExpressionProjection(node.expression, sourceFile, metrics),
  };
}

function tsxProjection(relative, bytes, role) {
  const source = bytes.toString("utf8");
  const sourceFile = ts.createSourceFile(relative, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const parseDiagnostics = sourceFile.parseDiagnostics ?? [];
  invariant(parseDiagnostics.length === 0,
    `appearance_tsx_parse_failed:${relative}:${ts.flattenDiagnosticMessageText(parseDiagnostics[0]?.messageText ?? "unknown", " ")}`);
  const roots = [];
  const metrics = {
    jsxRootCount: 0,
    tagCount: 0,
    selfClosingTagCount: 0,
    fragmentCount: 0,
    expressionCount: 0,
    logicContainerExpressionCount: 0,
    attributeCount: 0,
    spreadAttributeCount: 0,
    classAttributeCount: 0,
    styleAttributeCount: 0,
    semanticAttributeCount: 0,
    visibleTextNodeCount: 0,
    visibleExpressionStringCount: 0,
  };
  const visit = (node) => {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) {
      roots.push(projectJsx(node, sourceFile, metrics));
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  metrics.jsxRootCount = roots.length;
  const projection = {
    schemaVersion: "velmere.pass4825.tsx-appearance-ast-projection.v1",
    roots,
  };
  const approvalProjection = normalizeApprovedDataTruthProjections(relative, projection, role);
  return {
    path: relative,
    byteLength: bytes.byteLength,
    rawSourceSha256: sha256Appearance(bytes),
    projectionSha256: sha256Appearance(canonicalAppearance(projection)),
    normalizedProjectionSha256: approvalProjection.normalizedProjectionSha256,
    approvedDataTruthSlots: approvalProjection.approvedDataTruthSlots,
    metrics,
  };
}

function fullByteClassification(relative) {
  if (PRESENTATION_CONFIGS.includes(relative)) return "presentation-config";
  if (relative.startsWith("public/")) return "public-asset";
  if (relative.startsWith("messages/")) return "localized-visible-copy";
  const extension = path.posix.extname(relative).toLowerCase();
  if (STYLESHEET_EXTENSIONS.has(extension)) return "stylesheet";
  if (IMPORTED_ASSET_EXTENSIONS.has(extension)) return "imported-presentation-asset";
  return null;
}

async function collectPaths(root) {
  await requireDirectories(root);
  const appAndComponents = [];
  for (const directory of TSX_DIRECTORIES) await walk(root, directory, appAndComponents);
  const fullDirectoryFiles = [];
  for (const directory of FULL_BYTE_DIRECTORIES) await walk(root, directory, fullDirectoryFiles);
  const optionalFiles = [];
  for (const directory of OPTIONAL_PRESENTATION_DIRECTORIES) await walk(root, directory, optionalFiles);
  const tsxPaths = appAndComponents
    .filter((relative) => relative.endsWith(".tsx") && !relative.startsWith("app/api/"))
    .sort((left, right) => left.localeCompare(right, "en"));
  const presentationCandidates = [...appAndComponents, ...fullDirectoryFiles, ...optionalFiles, ...PRESENTATION_CONFIGS];
  const fullBytePaths = [...new Set(presentationCandidates.filter((relative) => fullByteClassification(relative) !== null))]
    .sort((left, right) => left.localeCompare(right, "en"));
  invariant(tsxPaths.length > 0, "appearance_tsx_scope_empty");
  invariant(fullBytePaths.length > 0, "appearance_full_byte_scope_empty");
  for (const config of PRESENTATION_CONFIGS) {
    invariant(fullBytePaths.includes(config), `appearance_presentation_config_missing:${config}`);
  }
  return { tsxPaths, fullBytePaths };
}

export async function collectAppearanceManifest(rootInput, role) {
  invariant(role === "baseline" || role === "current", "appearance_manifest_role_invalid");
  const root = await regularRoot(rootInput, "appearance_root");
  const { tsxPaths, fullBytePaths } = await collectPaths(root);
  const tsxEntries = [];
  for (const relative of tsxPaths) {
    const absolute = path.join(root, relative);
    const stats = await lstat(absolute).catch(() => null);
    invariant(stats?.isFile() && !stats.isSymbolicLink(), `appearance_tsx_file_invalid:${relative}`);
    tsxEntries.push(tsxProjection(relative, await readFile(absolute), role));
  }
  const fullByteEntries = [];
  for (const relative of fullBytePaths) {
    const absolute = path.join(root, relative);
    const stats = await lstat(absolute).catch(() => null);
    invariant(stats?.isFile() && !stats.isSymbolicLink(), `appearance_full_byte_file_invalid:${relative}`);
    const bytes = await readFile(absolute);
    fullByteEntries.push({
      path: relative,
      classification: fullByteClassification(relative),
      byteLength: bytes.byteLength,
      fileSha256: sha256Appearance(bytes),
    });
  }
  return {
    schemaVersion: "velmere.pass4825.appearance-projection-manifest.v1",
    role,
    scope: {
      tsx: "all app/components .tsx except app/api; TypeScript-AST JSX projection",
      fullByte: "all CSS-like files and imported presentation assets in app/components/styles, every public/messages file, and fixed presentation configs",
      requiredDirectories: [...REQUIRED_DIRECTORIES],
      presentationConfigs: [...PRESENTATION_CONFIGS],
    },
    tsx: {
      fileCount: tsxEntries.length,
      aggregateProjectionSha256: sha256Appearance(canonicalAppearance(
        tsxEntries.map((entry) => ({ path: entry.path, projectionSha256: entry.projectionSha256 })),
      )),
      aggregateNormalizedProjectionSha256: sha256Appearance(canonicalAppearance(
        tsxEntries.map((entry) => ({
          path: entry.path,
          normalizedProjectionSha256: entry.normalizedProjectionSha256,
        })),
      )),
      entries: tsxEntries,
    },
    fullByte: {
      fileCount: fullByteEntries.length,
      byteLength: fullByteEntries.reduce((total, entry) => total + entry.byteLength, 0),
      aggregateSha256: sha256Appearance(canonicalAppearance(fullByteEntries)),
      entries: fullByteEntries,
    },
  };
}

function compareManifests(baseline, current) {
  const failures = [];
  const baselineTsx = new Map(baseline.tsx.entries.map((entry) => [entry.path, entry]));
  const currentTsx = new Map(current.tsx.entries.map((entry) => [entry.path, entry]));
  const baselineFull = new Map(baseline.fullByte.entries.map((entry) => [entry.path, entry]));
  const currentFull = new Map(current.fullByte.entries.map((entry) => [entry.path, entry]));
  const logicOnlyTsxDifferences = [];
  const rawTsxProjectionDifferences = [];
  const approvedDataTruthSubstitutions = APPROVED_DATA_TRUTH_SUBSTITUTIONS.map((policy) => {
    const baselineEntry = baselineTsx.get(policy.path);
    const currentEntry = currentTsx.get(policy.path);
    const applicable = Boolean(baselineEntry || currentEntry);
    const baselineSlot = baselineEntry?.approvedDataTruthSlots.find((slot) => slot.id === policy.id);
    const currentSlot = currentEntry?.approvedDataTruthSlots.find((slot) => slot.id === policy.id);
    const applied = applicable
      && baselineSlot?.pinnedProjectionSha256 === policy.baselineProjectionSha256
      && baselineSlot.matchCount === 1
      && currentSlot?.pinnedProjectionSha256 === policy.currentProjectionSha256
      && currentSlot.matchCount === 1;
    return {
      id: policy.id,
      path: policy.path,
      rationale: policy.rationale,
      baselineProjectionSha256: policy.baselineProjectionSha256,
      currentProjectionSha256: policy.currentProjectionSha256,
      baselineMatchCount: baselineSlot?.matchCount ?? 0,
      currentMatchCount: currentSlot?.matchCount ?? 0,
      applicable,
      applied,
    };
  });
  const approvalsByPath = new Map();
  for (const approval of approvedDataTruthSubstitutions) {
    const entries = approvalsByPath.get(approval.path) ?? [];
    entries.push(approval);
    approvalsByPath.set(approval.path, entries);
  }
  for (const pathName of [...new Set([...baselineTsx.keys(), ...currentTsx.keys()])].sort()) {
    const expected = baselineTsx.get(pathName);
    const actual = currentTsx.get(pathName);
    if (!expected) failures.push({ code: "tsx_added", path: pathName });
    else if (!actual) failures.push({ code: "tsx_removed", path: pathName });
    else if (expected.projectionSha256 !== actual.projectionSha256) {
      rawTsxProjectionDifferences.push(pathName);
      const pathApprovals = approvalsByPath.get(pathName) ?? [];
      const exactApprovedDifference = pathApprovals.length > 0
        && pathApprovals.every((approval) => approval.applied)
        && expected.normalizedProjectionSha256 === actual.normalizedProjectionSha256;
      if (!exactApprovedDifference) failures.push({ code: "tsx_projection_changed", path: pathName });
    } else if (expected.rawSourceSha256 !== actual.rawSourceSha256) {
      logicOnlyTsxDifferences.push(pathName);
    }
  }
  for (const approval of approvedDataTruthSubstitutions) {
    if (approval.applicable && !approval.applied) {
      failures.push({
        code: "approved_data_truth_substitution_not_exact",
        path: approval.path,
        id: approval.id,
      });
    }
  }
  for (const pathName of [...new Set([...baselineFull.keys(), ...currentFull.keys()])].sort()) {
    const expected = baselineFull.get(pathName);
    const actual = currentFull.get(pathName);
    if (!expected) failures.push({ code: "full_byte_material_added", path: pathName });
    else if (!actual) failures.push({ code: "full_byte_material_removed", path: pathName });
    else if (canonicalAppearance(expected) !== canonicalAppearance(actual)) {
      failures.push({ code: "full_byte_material_changed", path: pathName });
    }
  }
  return {
    failures,
    logicOnlyTsxDifferences,
    rawTsxProjectionDifferences,
    approvedDataTruthSubstitutions,
  };
}

export async function createAppearanceFreezeReceipt({ currentRoot, baselineRoot }) {
  invariant(typeof currentRoot === "string" && currentRoot.length > 0, "appearance_current_root_required");
  invariant(typeof baselineRoot === "string" && baselineRoot.length > 0, "appearance_baseline_root_required");
  const [currentReal, baselineReal] = await Promise.all([
    regularRoot(currentRoot, "appearance_current_root"),
    regularRoot(baselineRoot, "appearance_baseline_root"),
  ]);
  invariant(rootsAreDisjoint(currentReal, baselineReal), "appearance_baseline_must_be_independent_disjoint_root");
  const currentSourceBefore = computePass4823SourceTree(currentReal);
  const baselineSourceBefore = computePass4823SourceTree(baselineReal);
  const [currentManifest, baselineManifest] = await Promise.all([
    collectAppearanceManifest(currentReal, "current"),
    collectAppearanceManifest(baselineReal, "baseline"),
  ]);
  const currentSourceAfter = computePass4823SourceTree(currentReal);
  const baselineSourceAfter = computePass4823SourceTree(baselineReal);
  invariant(currentSourceBefore.sha256 === currentSourceAfter.sha256
    && currentSourceBefore.fileCount === currentSourceAfter.fileCount
    && currentSourceBefore.totalBytes === currentSourceAfter.totalBytes,
  "appearance_current_source_changed_during_verification");
  invariant(baselineSourceBefore.sha256 === baselineSourceAfter.sha256
    && baselineSourceBefore.fileCount === baselineSourceAfter.fileCount
    && baselineSourceBefore.totalBytes === baselineSourceAfter.totalBytes,
  "appearance_baseline_source_changed_during_verification");
  const comparison = compareManifests(baselineManifest, currentManifest);
  const applicableApprovals = comparison.approvedDataTruthSubstitutions
    .filter((substitution) => substitution.applicable);
  const appliedApprovals = applicableApprovals.filter((substitution) => substitution.applied);
  const core = {
    schemaVersion: APPEARANCE_FREEZE_SCHEMA,
    evidenceClass: "source_bound_static_appearance_projection_comparison",
    status: comparison.failures.length === 0 ? "PASS" : "FAIL",
    rootBoundary: {
      currentRootName: path.basename(currentReal),
      baselineRootName: path.basename(baselineReal),
      rootsDistinct: true,
      rootsDisjoint: true,
      selfBaselineAccepted: false,
    },
    sourceBinding: {
      current: currentSourceBefore,
      currentPostVerificationSha256: currentSourceAfter.sha256,
      currentUnchanged: true,
      baseline: baselineSourceBefore,
      baselinePostVerificationSha256: baselineSourceAfter.sha256,
      baselineUnchanged: true,
    },
    claimBoundary: {
      rawTsxAppearanceProjectionEqual: comparison.rawTsxProjectionDifferences.length === 0,
      appearanceProjectionEqualAfterApprovedDataTruthSubstitutions: comparison.failures.length === 0,
      approvedDataTruthSubstitutionsApplied: appliedApprovals.length,
      tsxSourceByteParityClaimed: false,
      completeRenderEquivalenceClaimed: false,
      pixelParityClaimed: false,
      browserRuntimeExecuted: false,
      dynamicDataRenderParityClaimed: false,
    },
    comparison: {
      tsxFileCount: currentManifest.tsx.fileCount,
      fullByteMaterialCount: currentManifest.fullByte.fileCount,
      fullByteMaterialBytes: currentManifest.fullByte.byteLength,
      logicOnlyTsxDifferenceCount: comparison.logicOnlyTsxDifferences.length,
      logicOnlyTsxDifferences: comparison.logicOnlyTsxDifferences,
      rawTsxProjectionDifferenceCount: comparison.rawTsxProjectionDifferences.length,
      rawTsxProjectionDifferences: comparison.rawTsxProjectionDifferences,
      failureCount: comparison.failures.length,
      failures: comparison.failures,
    },
    approvedDataTruthSubstitutions: {
      policyVersion: APPROVED_DATA_TRUTH_POLICY_VERSION,
      declaredCount: APPROVED_DATA_TRUTH_SUBSTITUTIONS.length,
      applicableCount: applicableApprovals.length,
      appliedCount: appliedApprovals.length,
      allApplicableSubstitutionsExact: applicableApprovals.length === appliedApprovals.length,
      substitutions: comparison.approvedDataTruthSubstitutions,
    },
    manifests: {
      current: currentManifest,
      baseline: baselineManifest,
    },
    limitations: [
      "PASS proves equality of the declared static appearance projection, not byte equality of TSX source files.",
      "PASS is not pixel parity, browser rendering proof, complete render equivalence, accessibility certification or visual design review.",
      "Logic outside JSX may differ. Runtime values flowing into unchanged JSX expressions can therefore change rendered data without changing this projection.",
      "Four checksum-bound PASS4825 live/data-truth substitutions are declared for the audited market surfaces. Each pins the complete baseline/current component projection; no other JSX projection delta is allowed.",
      "Dynamic class/style values defined outside JSX are not followed through arbitrary runtime data flow; exact browser pixel receipts remain a separate stronger gate.",
      "Full-byte equality is enforced for CSS-like files, presentation assets, localized message files and the declared presentation configuration files.",
    ],
    generatedAt: new Date().toISOString(),
  };
  return attachAppearanceChecksum(core);
}

export function validateAppearanceFreezeReceipt(receipt) {
  verifyAppearanceChecksum(receipt);
  invariant(receipt.schemaVersion === APPEARANCE_FREEZE_SCHEMA, "appearance_schema_mismatch");
  invariant(receipt.evidenceClass === "source_bound_static_appearance_projection_comparison",
    "appearance_evidence_class_mismatch");
  invariant(receipt.status === "PASS" || receipt.status === "FAIL", "appearance_status_invalid");
  invariant(receipt.rootBoundary?.rootsDistinct === true && receipt.rootBoundary?.rootsDisjoint === true
    && receipt.rootBoundary?.selfBaselineAccepted === false
    && typeof receipt.rootBoundary?.currentRootName === "string" && receipt.rootBoundary.currentRootName.length > 0
    && typeof receipt.rootBoundary?.baselineRootName === "string" && receipt.rootBoundary.baselineRootName.length > 0,
  "appearance_root_boundary_invalid");
  invariant(receipt.sourceBinding?.currentUnchanged === true
    && receipt.sourceBinding?.baselineUnchanged === true
    && receipt.sourceBinding.current?.sha256 === receipt.sourceBinding.currentPostVerificationSha256
    && receipt.sourceBinding.baseline?.sha256 === receipt.sourceBinding.baselinePostVerificationSha256
    && /^[a-f0-9]{64}$/u.test(receipt.sourceBinding.current?.sha256 ?? "")
    && /^[a-f0-9]{64}$/u.test(receipt.sourceBinding.baseline?.sha256 ?? "")
    && Number.isSafeInteger(receipt.sourceBinding.current?.fileCount) && receipt.sourceBinding.current.fileCount > 0
    && Number.isSafeInteger(receipt.sourceBinding.baseline?.fileCount) && receipt.sourceBinding.baseline.fileCount > 0,
  "appearance_source_binding_invalid");
  invariant(typeof receipt.claimBoundary?.rawTsxAppearanceProjectionEqual === "boolean"
    && typeof receipt.claimBoundary?.appearanceProjectionEqualAfterApprovedDataTruthSubstitutions === "boolean"
    && Number.isSafeInteger(receipt.claimBoundary?.approvedDataTruthSubstitutionsApplied)
    && receipt.claimBoundary.approvedDataTruthSubstitutionsApplied >= 0
    && receipt.claimBoundary.appearanceProjectionEqual === undefined
    && receipt.claimBoundary.tsxSourceByteParityClaimed === false
    && receipt.claimBoundary?.completeRenderEquivalenceClaimed === false
    && receipt.claimBoundary?.pixelParityClaimed === false
    && receipt.claimBoundary?.browserRuntimeExecuted === false
    && receipt.claimBoundary?.dynamicDataRenderParityClaimed === false,
  "appearance_claim_boundary_invalid");
  invariant(Array.isArray(receipt.comparison?.failures)
    && receipt.comparison.failureCount === receipt.comparison.failures.length
    && Array.isArray(receipt.comparison.logicOnlyTsxDifferences)
    && receipt.comparison.logicOnlyTsxDifferenceCount === receipt.comparison.logicOnlyTsxDifferences.length
    && Array.isArray(receipt.comparison.rawTsxProjectionDifferences)
    && receipt.comparison.rawTsxProjectionDifferenceCount
      === receipt.comparison.rawTsxProjectionDifferences.length
    && Number.isSafeInteger(receipt.comparison.tsxFileCount) && receipt.comparison.tsxFileCount > 0
    && Number.isSafeInteger(receipt.comparison.fullByteMaterialCount) && receipt.comparison.fullByteMaterialCount > 0,
  "appearance_comparison_structure_invalid");
  const passed = receipt.comparison.failureCount === 0;
  invariant(receipt.status === (passed ? "PASS" : "FAIL")
    && receipt.claimBoundary.appearanceProjectionEqualAfterApprovedDataTruthSubstitutions === passed
    && receipt.claimBoundary.rawTsxAppearanceProjectionEqual
      === (receipt.comparison.rawTsxProjectionDifferenceCount === 0),
  "appearance_status_claim_mismatch");
  for (const side of ["current", "baseline"]) {
    const manifest = receipt.manifests?.[side];
    invariant(manifest?.schemaVersion === "velmere.pass4825.appearance-projection-manifest.v1"
      && manifest.role === side
      && manifest.tsx?.fileCount === manifest.tsx?.entries?.length
      && manifest.fullByte?.fileCount === manifest.fullByte?.entries?.length
      && manifest.tsx.entries.every((entry) => SHA256.test(entry.rawSourceSha256 ?? "")
        && SHA256.test(entry.projectionSha256 ?? "")
        && SHA256.test(entry.normalizedProjectionSha256 ?? "")
        && Array.isArray(entry.approvedDataTruthSlots))
      && manifest.fullByte.entries.every((entry) => SHA256.test(entry.fileSha256 ?? "")),
    `appearance_manifest_invalid:${side}`);
    for (const entry of manifest.tsx.entries) {
      const expectedSlots = APPROVED_DATA_TRUTH_SUBSTITUTIONS
        .filter((policy) => policy.path === entry.path)
        .map((policy) => ({
          id: policy.id,
          path: policy.path,
          pinnedProjectionSha256: side === "baseline"
            ? policy.baselineProjectionSha256
            : policy.currentProjectionSha256,
        }));
      invariant(entry.approvedDataTruthSlots.length === expectedSlots.length
        && entry.approvedDataTruthSlots.every((slot, index) => slot.id === expectedSlots[index].id
          && slot.path === expectedSlots[index].path
          && slot.pinnedProjectionSha256 === expectedSlots[index].pinnedProjectionSha256
          && Number.isSafeInteger(slot.matchCount) && slot.matchCount >= 0),
      `appearance_manifest_approval_slots_invalid:${side}:${entry.path}`);
    }
    invariant(new Set(manifest.tsx.entries.map((entry) => entry.path)).size === manifest.tsx.entries.length
      && new Set(manifest.fullByte.entries.map((entry) => entry.path)).size === manifest.fullByte.entries.length
      && canonicalAppearance(manifest.tsx.entries.map((entry) => entry.path))
        === canonicalAppearance([...manifest.tsx.entries.map((entry) => entry.path)]
          .sort((left, right) => left.localeCompare(right, "en")))
      && canonicalAppearance(manifest.fullByte.entries.map((entry) => entry.path))
        === canonicalAppearance([...manifest.fullByte.entries.map((entry) => entry.path)]
          .sort((left, right) => left.localeCompare(right, "en"))),
    `appearance_manifest_path_set_invalid:${side}`);
    invariant(manifest.tsx.aggregateProjectionSha256 === sha256Appearance(canonicalAppearance(
      manifest.tsx.entries.map((entry) => ({ path: entry.path, projectionSha256: entry.projectionSha256 })),
    )), `appearance_manifest_projection_aggregate_invalid:${side}`);
    invariant(manifest.tsx.aggregateNormalizedProjectionSha256 === sha256Appearance(canonicalAppearance(
      manifest.tsx.entries.map((entry) => ({
        path: entry.path,
        normalizedProjectionSha256: entry.normalizedProjectionSha256,
      })),
    )), `appearance_manifest_normalized_projection_aggregate_invalid:${side}`);
    invariant(manifest.fullByte.byteLength === manifest.fullByte.entries
      .reduce((total, entry) => total + entry.byteLength, 0)
      && manifest.fullByte.aggregateSha256 === sha256Appearance(canonicalAppearance(manifest.fullByte.entries)),
    `appearance_manifest_full_byte_aggregate_invalid:${side}`);
  }
  const independentlyCompared = compareManifests(receipt.manifests.baseline, receipt.manifests.current);
  invariant(canonicalAppearance(receipt.comparison.failures) === canonicalAppearance(independentlyCompared.failures)
    && canonicalAppearance(receipt.comparison.logicOnlyTsxDifferences)
      === canonicalAppearance(independentlyCompared.logicOnlyTsxDifferences)
    && canonicalAppearance(receipt.comparison.rawTsxProjectionDifferences)
      === canonicalAppearance(independentlyCompared.rawTsxProjectionDifferences)
    && receipt.comparison.tsxFileCount === receipt.manifests.current.tsx.fileCount
    && receipt.comparison.fullByteMaterialCount === receipt.manifests.current.fullByte.fileCount
    && receipt.comparison.fullByteMaterialBytes === receipt.manifests.current.fullByte.byteLength,
  "appearance_comparison_recomputation_mismatch");
  const independentlyApplicable = independentlyCompared.approvedDataTruthSubstitutions
    .filter((substitution) => substitution.applicable);
  const independentlyApplied = independentlyApplicable.filter((substitution) => substitution.applied);
  invariant(receipt.approvedDataTruthSubstitutions?.policyVersion === APPROVED_DATA_TRUTH_POLICY_VERSION
    && receipt.approvedDataTruthSubstitutions.declaredCount === APPROVED_DATA_TRUTH_SUBSTITUTIONS.length
    && receipt.approvedDataTruthSubstitutions.applicableCount === independentlyApplicable.length
    && receipt.approvedDataTruthSubstitutions.appliedCount === independentlyApplied.length
    && receipt.approvedDataTruthSubstitutions.allApplicableSubstitutionsExact
      === (independentlyApplicable.length === independentlyApplied.length)
    && canonicalAppearance(receipt.approvedDataTruthSubstitutions.substitutions)
      === canonicalAppearance(independentlyCompared.approvedDataTruthSubstitutions)
    && receipt.claimBoundary.approvedDataTruthSubstitutionsApplied === independentlyApplied.length,
  "appearance_approved_data_truth_substitutions_invalid");
  invariant(Array.isArray(receipt.limitations) && receipt.limitations.length >= 6
    && receipt.limitations.some((entry) => /not pixel parity/iu.test(entry))
    && receipt.limitations.some((entry) => /Logic outside JSX may differ/iu.test(entry))
    && receipt.limitations.some((entry) => /data-truth substitutions/iu.test(entry)),
  "appearance_limitations_incomplete");
  invariant(typeof receipt.generatedAt === "string" && !Number.isNaN(Date.parse(receipt.generatedAt)),
    "appearance_generated_at_invalid");
  return receipt;
}
