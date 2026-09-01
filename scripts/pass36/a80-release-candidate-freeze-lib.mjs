import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { validateCurrentSourceAuthorityExact } from "./current-source-authority-lib.mjs";

export const A80_REVISION = "VELMERE_PASS36_A80R0_FROZEN_LOCAL_RELEASE_CANDIDATE_ADMISSION_AND_PROMOTION_SEAL_HARDENING";
export const A79_REVISION = "VELMERE_PASS36_A79R0_EXACT_FINAL_BYTE_BUILD_RUNTIME_AND_BROWSER_EVIDENCE_BINDING_HARDENING";
const HASH_RE = /^[a-f0-9]{64}$/u;
const lexical = (a, b) => a.localeCompare(b, "en", { sensitivity: "variant" });
export const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort(lexical).map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
export function readJson(root, relative) { return JSON.parse(fs.readFileSync(path.join(root, relative), "utf8")); }
export function isDigest(value) { return HASH_RE.test(String(value ?? "")); }

const FORBIDDEN_DIRECTORY_NAMES = new Set([".git", ".next", "node_modules", "coverage", ".turbo", ".cache", "playwright-report", "test-results"]);
const FORBIDDEN_PATH_PREFIXES = [
  "artifacts/live-receipts/", "artifacts/public-proof/", "artifacts/pass35/incoming/", "artifacts/pass35/a47/intake/",
  "EVIDENCE_HISTORY/", ".velmere/deployment-builds/", ".velmere/private/",
];
const FORBIDDEN_EXACT_FILES = new Set([".env", ".env.local", ".env.production", ".env.development", ".npmrc.local"]);
const FORBIDDEN_FILE_PATTERNS = [
  /(?:^|\/)id_(?:rsa|dsa|ecdsa|ed25519)$/u,
  /\.(?:p12|pfx|jks|keystore|sqlite|sqlite3|db|core)$/iu,
  /(?:^|\/)core\.\d+$/u,
];
const ALLOWED_ENV_EXAMPLES = new Set([".env.example", "ENV_PRODUCTION_READY.example"]);

function walk(root) {
  const files = [];
  const stack = [{ absolute: path.resolve(root), prefix: "" }];
  while (stack.length) {
    const { absolute, prefix } = stack.pop();
    for (const entry of fs.readdirSync(absolute, { withFileTypes: true }).sort((a, b) => lexical(a.name, b.name))) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      const absolutePath = path.join(absolute, entry.name);
      const metadata = fs.lstatSync(absolutePath);
      files.push({ relative, absolute: absolutePath, entry, metadata });
      if (entry.isDirectory() && !metadata.isSymbolicLink()) stack.push({ absolute: absolutePath, prefix: relative });
    }
  }
  return files.sort((a, b) => lexical(a.relative, b.relative));
}

export function inspectReleaseSourceHygiene(root) {
  const violations = [];
  for (const row of walk(root)) {
    const segments = row.relative.split("/");
    if (row.metadata.isSymbolicLink()) violations.push(`symlink:${row.relative}`);
    if (row.entry.isDirectory() && FORBIDDEN_DIRECTORY_NAMES.has(row.entry.name)) violations.push(`forbidden_directory:${row.relative}`);
    if (FORBIDDEN_PATH_PREFIXES.some((prefix) => row.relative === prefix.slice(0, -1) || row.relative.startsWith(prefix))) violations.push(`private_or_mutable_evidence:${row.relative}`);
    if (row.entry.isFile()) {
      const base = segments.at(-1) ?? "";
      if (FORBIDDEN_EXACT_FILES.has(row.relative) || (base.startsWith(".env") && !ALLOWED_ENV_EXAMPLES.has(base))) violations.push(`environment_file:${row.relative}`);
      if (FORBIDDEN_FILE_PATTERNS.some((pattern) => pattern.test(row.relative))) violations.push(`sensitive_or_mutable_file:${row.relative}`);
      if (/\.(?:pem|key)$/iu.test(row.relative)) {
        const sample = fs.readFileSync(row.absolute, "utf8").slice(0, 16384);
        if (/BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/u.test(sample) || /BEGIN ENCRYPTED PRIVATE KEY/u.test(sample)) violations.push(`private_key_material:${row.relative}`);
      }
      if (/\.log$/iu.test(row.relative) && !row.relative.startsWith("fixtures/")) violations.push(`mutable_log:${row.relative}`);
      if (row.metadata.size > 256 * 1024 * 1024) violations.push(`oversized_single_file:${row.relative}`);
    }
  }
  return { passed: violations.length === 0, violations: [...new Set(violations)].sort(lexical) };
}

function add(checks, id, passed, detail = null, blocker = true) { checks.push({ id, passed: Boolean(passed), blocker, detail }); }
function exactA60(receipt, policy) {
  const checks = [];
  add(checks, "a60:decision", receipt?.decision === policy.requiredExactDecision, receipt?.decision);
  add(checks, "a60:no-failure", !receipt?.failure, receipt?.failure ?? null);
  add(
    checks,
    "a60:source-unchanged",
    receipt?.sourceUnchanged === true
      && isDigest(receipt?.sourceBefore?.sha256)
      && isDigest(receipt?.sourceAfter?.sha256)
      && receipt.sourceBefore.sha256 === receipt.sourceAfter.sha256,
    { before: receipt?.sourceBefore?.sha256, after: receipt?.sourceAfter?.sha256 },
  );
  add(checks, "a60:runtime", receipt?.runtime?.node === policy.expectedRuntime.node && receipt?.runtime?.npm === policy.expectedRuntime.npm, receipt?.runtime);
  add(checks, "a60:stages", receipt?.summary?.executedStages === receipt?.summary?.requiredStages && receipt?.summary?.failedStages === 0 && receipt?.summary?.passedStages === receipt?.summary?.requiredStages, receipt?.summary);
  add(checks, "a60:bindings", isDigest(receipt?.bindings?.runtimeInstanceSha256) && isDigest(receipt?.bindings?.browserExecutableSha256) && typeof receipt?.bindings?.buildId === "string" && receipt.bindings.buildId.length >= 8 && /^http:\/\/127\.0\.0\.1:\d+$/u.test(String(receipt?.bindings?.baseUrl ?? "")), receipt?.bindings);
  add(checks, "a60:no-promotion-claims", receipt?.saleEnabled === false && receipt?.liveProven === false, { saleEnabled: receipt?.saleEnabled, liveProven: receipt?.liveProven });
  return checks;
}

export function evaluateReleaseCandidate({ root, policy, current, authority, a78State, a79State, a60Receipt, a58Verification, currentRootGate, hygiene = null, sourceAuthority = null }) {
  const checks = [];
  const observedHygiene = hygiene ?? inspectReleaseSourceHygiene(root);
  const activeRevisionId = fs.readFileSync(path.join(root, "VELMERE_ACTIVE_PASS.txt"), "utf8").trim();
  const currentRevisionId = current?.sourceRevisionId;
  add(checks, "revision:current-shape", typeof currentRevisionId === "string" && /^VELMERE_PASS36_A(?:8[0-9]|9[0-9]|1[0-9]{2})R/u.test(currentRevisionId), currentRevisionId);
  add(checks, "revision:active-current", activeRevisionId === currentRevisionId, { activeRevisionId, currentRevisionId });
  add(checks, "authority:current", authority?.authorityRevisionId === currentRevisionId && authority?.currentSource?.revisionId === currentRevisionId, authority?.currentSource);
  add(checks, "a78:exact-inputs", a78State?.exactInputs?.runtime === true && a78State?.exactInputs?.dependencies === true && a78State?.exactInputs?.browser === true, a78State?.exactInputs);
  add(checks, "a78:exact-credit", a78State?.currentRoot?.exactCredit === true && a78State?.claims?.exactRuntimeVerified === true && a78State?.claims?.dependencyBundleVerified === true && a78State?.claims?.browserBundleVerified === true, { currentRoot: a78State?.currentRoot, claims: a78State?.claims });
  add(checks, "a79:exact-execution", a79State?.exactExecution?.exactBuildExecuted === true && a79State?.exactExecution?.exactBrowserExecuted === true && a79State?.exactExecution?.webpackExecutedOnA79 === true && a79State?.exactExecution?.turbopackExecutedOnA79 === true && a79State?.exactExecution?.productionRuntimeExecutedOnA79 === true && a79State?.exactExecution?.playwrightExecutedOnA79 === true && a79State?.exactExecution?.screenshotParityExecutedOnA79 === true && a79State?.exactExecution?.credit === true, a79State?.exactExecution);
  checks.push(...exactA60(a60Receipt, policy));
  add(checks, "current-root:exact-30-of-30", currentRootGate?.exactRuntime === true && currentRootGate?.passed === 30 && currentRootGate?.required === 30 && currentRootGate?.blocked === 0 && currentRootGate?.semanticFailures === 0 && currentRootGate?.sourceImmutable === true, currentRootGate);
  add(checks, "a58:integrity", a58Verification?.blockingFailures === 0 && a58Verification?.archiveIntegrityVerified === true && a58Verification?.cleanUnpackVerified === true, a58Verification);
  add(checks, "source:hygiene", observedHygiene.passed === true, observedHygiene.violations);
  add(checks, "source:manifest-exact", current?.currentRootDescendantManifestRevisionId === currentRevisionId && currentRevisionId === activeRevisionId, { sourceRevisionId: currentRevisionId, descendant: current?.currentRootDescendantManifestRevisionId, activeRevisionId });
  add(checks, "claims:fail-closed", current?.saleEnabled === false && current?.liveProven === false && current?.worldClassProven === false && authority?.claims?.saleEnabled === false && authority?.claims?.liveProven === false && authority?.claims?.worldClassProven === false, { current: { saleEnabled: current?.saleEnabled, liveProven: current?.liveProven, worldClassProven: current?.worldClassProven }, authority: authority?.claims });
  add(checks, "output:outside-source-required", policy?.outputBoundary?.outputMustBeOutsideSourceRoot === true && policy?.outputBoundary?.sourceTreeMutationForbidden === true, policy?.outputBoundary);
  const sourceManifest = sourceAuthority ?? validateCurrentSourceAuthorityExact(root);
  add(
    checks,
    "source:current-authority-exact",
    sourceManifest?.passed === true
      && Array.isArray(sourceManifest?.mismatches)
      && sourceManifest.mismatches.length === 0
      && isDigest(sourceManifest?.manifestSha256),
    sourceManifest?.mismatches ?? ["source_authority_result_invalid"],
  );
  const failed = checks.filter((row) => row.blocker && !row.passed);
  const verified = failed.length === 0;
  const candidateCore = {
    schemaVersion: "velmere.pass36.a80.frozen-local-release-candidate.v1",
    revisionId: currentRevisionId,
    admissionRevisionId: A80_REVISION,
    parentRevisionId: authority?.parentRevisionId ?? A79_REVISION,
    generatedAt: policy.deterministicEpoch,
    decision: verified ? policy.decisions.verified : policy.decisions.blocked,
    verified,
    sourceManifest: { path: sourceManifest.manifestPath, sha256: sourceManifest.manifestSha256, fileCount: sourceManifest.payload?.fileCount ?? null, aggregateSha256: sourceManifest.payload?.aggregateSha256 ?? null },
    exactBindings: {
      runtimeInstanceSha256: verified ? a60Receipt.bindings.runtimeInstanceSha256 : null,
      browserExecutableSha256: verified ? a60Receipt.bindings.browserExecutableSha256 : null,
      buildId: verified ? a60Receipt.bindings.buildId : null,
      a60ReceiptSha256: sha256(canonicalJson(a60Receipt ?? {})),
    },
    checks: { total: checks.length, passed: checks.length - failed.length, failed: failed.length },
    blockers: failed.map((row) => row.id).sort(lexical),
    sourceUnchanged: verified
      && a60Receipt?.sourceUnchanged === true
      && isDigest(a60Receipt?.sourceBefore?.sha256)
      && a60Receipt.sourceBefore.sha256 === a60Receipt?.sourceAfter?.sha256,
    stagingApproved: false,
    liveProven: false,
    saleEnabled: false,
    worldClassProven: false,
  };
  return { ...candidateCore, candidateDigestSha256: sha256(canonicalJson(candidateCore)), checkRows: checks };
}

export function assertOutputOutsideSource(root, outputPath) {
  const source = fs.realpathSync(path.resolve(root));
  const output = path.resolve(outputPath);
  let cursor = output;
  const suffix = [];
  while (!fs.existsSync(cursor)) {
    const parent = path.dirname(cursor);
    if (parent === cursor) throw new Error("a80_output_ancestor_missing");
    suffix.unshift(path.basename(cursor));
    cursor = parent;
  }
  const projectedOutput = path.resolve(fs.realpathSync(cursor), ...suffix);
  const inside = (candidate) => candidate === source || candidate.startsWith(`${source}${path.sep}`);
  if (inside(output) || inside(projectedOutput)) throw new Error("a80_output_inside_source_forbidden");
  return output;
}
