import {
  createHash,
  createPrivateKey,
  createPublicKey,
  sign as signBytes,
  verify as verifyBytes,
} from "node:crypto";
import { lstat, readFile, readdir, readlink } from "node:fs/promises";
import path from "node:path";

export const POLICY_PATH = "config/pass4992-supply-chain-release-policy.json";
export const EXTERNAL_RECEIPT_SCHEMA = "velmere.pass4992.external-control-receipt.v1";
export const RELEASE_GATE_SCHEMA = "velmere.pass4992.supply-chain-release-gate.v1";

const SOURCE_EXCLUDED_DIRECTORIES = new Set([
  ".git",
  ".next",
  "artifacts",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "playwright-report",
  "test-results",
]);

const SECRET_SCAN_EXTENSIONS = new Set([
  ".cjs",
  ".css",
  ".env",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".sql",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);

const SECRET_RULES = [
  { id: "private-key-pem", pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g },
  { id: "aws-access-key", pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g },
  { id: "github-token", pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,})\b/g },
  { id: "google-api-key", pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { id: "npm-access-token", pattern: /\bnpm_[A-Za-z0-9]{36,}\b/g },
  { id: "slack-token", pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g },
  { id: "stripe-live-secret", pattern: /\b(?:sk|rk)_live_[A-Za-z0-9]{16,}\b/g },
];

const SECRET_SCAN_EXACT_FIXTURES = new Map([
  ["synthetic/pass4992-secret-fingerprint.txt:stripe-live-secret", new Set(["71a68559119629d989386448adad9d5920e7e8e83fb7f55282d9ef9fcc7051cf"])],
]);

const OPENVEX_NOT_AFFECTED_JUSTIFICATIONS = new Set([
  "component_not_present",
  "inline_mitigations_already_exist",
  "vulnerable_code_cannot_be_controlled_by_adversary",
  "vulnerable_code_not_in_execute_path",
  "vulnerable_code_not_present",
]);

function normalized(value) {
  if (Array.isArray(value)) return value.map(normalized);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, normalized(value[key])]),
    );
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(normalized(value));
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sha256Bytes(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function isSha256(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function deterministicUuid(hexDigest) {
  const bytes = Buffer.from(hexDigest.slice(0, 32), "hex");
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function validIsoTimestamp(value) {
  if (typeof value !== "string" || value.length < 20) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

export async function readPolicy(root) {
  const text = await readFile(path.join(root, POLICY_PATH), "utf8");
  const policy = JSON.parse(text);
  if (policy.schemaVersion !== "velmere.pass4992.supply-chain-release-policy.v2") {
    throw new Error("pass4992_policy_schema_invalid");
  }
  for (const [action, digests] of Object.entries(policy.githubActions?.allowedActions ?? {})) {
    if (!Array.isArray(digests) || !digests.length || digests.some((digest) => !/^[a-f0-9]{40}$/.test(digest))) {
      throw new Error(`pass4992_action_allowlist_invalid:${action}`);
    }
    if (new Set(digests).size !== digests.length) {
      throw new Error(`pass4992_action_allowlist_duplicate:${action}`);
    }
  }
  return { policy, policyDigest: sha256(text), policyText: text };
}

async function collectSourceEntries(root, relative = "") {
  const absolute = path.join(root, relative);
  const children = await readdir(absolute, { withFileTypes: true });
  const entries = [];
  for (const child of children.sort((left, right) => left.name.localeCompare(right.name))) {
    if (!relative && child.isDirectory() && SOURCE_EXCLUDED_DIRECTORIES.has(child.name)) continue;
    const childRelative = relative ? `${relative}/${child.name}` : child.name;
    const childAbsolute = path.join(root, childRelative);
    if (child.isDirectory()) {
      entries.push(...await collectSourceEntries(root, childRelative));
      continue;
    }
    const metadata = await lstat(childAbsolute);
    if (metadata.isSymbolicLink()) {
      const target = await readlink(childAbsolute);
      entries.push({
        path: childRelative.replaceAll(path.sep, "/"),
        type: "symlink",
        size: Buffer.byteLength(target),
        sha256: sha256(target),
      });
      continue;
    }
    if (!metadata.isFile()) throw new Error(`unsupported_source_entry:${childRelative}`);
    const content = await readFile(childAbsolute);
    entries.push({
      path: childRelative.replaceAll(path.sep, "/"),
      type: "file",
      size: content.length,
      sha256: sha256Bytes(content),
    });
  }
  return entries;
}

export async function buildSourceManifest(root) {
  const entries = await collectSourceEntries(root);
  entries.sort((left, right) => left.path.localeCompare(right.path));
  return {
    schemaVersion: "velmere.pass4992.source-manifest.v1",
    fileCount: entries.length,
    totalBytes: entries.reduce((total, entry) => total + entry.size, 0),
    sourceDigest: sha256(canonicalJson(entries)),
    entries,
  };
}

function packageNameFromLockPath(lockPath, packageMetadata) {
  if (typeof packageMetadata.name === "string" && packageMetadata.name.trim()) {
    return packageMetadata.name.trim();
  }
  const marker = "node_modules/";
  const markerIndex = lockPath.lastIndexOf(marker);
  if (markerIndex < 0) throw new Error(`lockfile_package_name_unresolved:${lockPath}`);
  const tail = lockPath.slice(markerIndex + marker.length);
  const segments = tail.split("/");
  return tail.startsWith("@") ? segments.slice(0, 2).join("/") : segments[0];
}

function npmPurl(name, version) {
  if (name.startsWith("@")) {
    const [scope, packageName] = name.slice(1).split("/");
    return `pkg:npm/%40${encodeURIComponent(scope)}/${encodeURIComponent(packageName)}@${encodeURIComponent(version)}`;
  }
  return `pkg:npm/${encodeURIComponent(name)}@${encodeURIComponent(version)}`;
}

function integrityToCycloneDx(integrity, lockPath) {
  const [algorithm, encoded, ...extra] = String(integrity ?? "").split("-");
  if (algorithm !== "sha512" || !encoded || extra.length) {
    throw new Error(`lockfile_integrity_not_sha512:${lockPath}`);
  }
  const bytes = Buffer.from(encoded, "base64");
  if (bytes.length !== 64 || bytes.toString("base64") !== encoded) {
    throw new Error(`lockfile_integrity_encoding_invalid:${lockPath}`);
  }
  return { alg: "SHA-512", content: bytes.toString("hex") };
}

export function buildCycloneDxSbom({ packageJsonText, packageLockText, generatedAt }) {
  if (!validIsoTimestamp(generatedAt)) throw new Error("sbom_generated_at_invalid");
  const packageJson = JSON.parse(packageJsonText);
  const packageLock = JSON.parse(packageLockText);
  if (packageLock.lockfileVersion !== 3 || !packageLock.packages || typeof packageLock.packages !== "object") {
    throw new Error("package_lock_v3_required");
  }
  const packageLockDigest = sha256(packageLockText);
  const components = Object.entries(packageLock.packages)
    .filter(([lockPath]) => lockPath !== "")
    .map(([lockPath, metadata]) => {
      const name = packageNameFromLockPath(lockPath, metadata);
      const version = String(metadata.version ?? "").trim();
      if (!version) throw new Error(`lockfile_package_version_missing:${lockPath}`);
      const resolved = String(metadata.resolved ?? "");
      let registryHost;
      try {
        registryHost = new URL(resolved).host;
      } catch {
        throw new Error(`lockfile_registry_url_invalid:${lockPath}`);
      }
      if (registryHost !== "registry.npmjs.org") throw new Error(`lockfile_registry_not_allowed:${lockPath}:${registryHost}`);
      const component = {
        type: "library",
        "bom-ref": `urn:velmere:npm-lock-path:${sha256(lockPath)}`,
        name,
        version,
        scope: metadata.dev ? "excluded" : "required",
        hashes: [integrityToCycloneDx(metadata.integrity, lockPath)],
        purl: npmPurl(name, version),
        externalReferences: [{ type: "distribution", url: resolved }],
        properties: [
          { name: "velmere:package-lock:path", value: lockPath },
          { name: "velmere:package-lock:development-only", value: metadata.dev ? "true" : "false" },
        ],
      };
      if (typeof metadata.license === "string" && metadata.license.trim()) {
        component.licenses = [{ license: { id: metadata.license.trim() } }];
      }
      return component;
    })
    .sort((left, right) => left.properties[0].value.localeCompare(right.properties[0].value));

  const rootName = String(packageJson.name ?? packageLock.name ?? "").trim();
  const rootVersion = String(packageJson.version ?? packageLock.version ?? "").trim();
  if (!rootName || !rootVersion) throw new Error("root_package_identity_missing");
  return {
    $schema: "https://cyclonedx.org/schema/bom-1.6.schema.json",
    bomFormat: "CycloneDX",
    specVersion: "1.6",
    serialNumber: `urn:uuid:${deterministicUuid(packageLockDigest)}`,
    version: 1,
    metadata: {
      timestamp: generatedAt,
      tools: {
        components: [{ type: "application", name: "velmere-pass4992-lockfile-sbom", version: "1" }],
      },
      component: {
        type: "application",
        "bom-ref": `pkg:npm/${encodeURIComponent(rootName)}@${encodeURIComponent(rootVersion)}`,
        name: rootName,
        version: rootVersion,
        purl: npmPurl(rootName, rootVersion),
      },
      properties: [
        { name: "velmere:package-lock:sha256", value: packageLockDigest },
        { name: "velmere:inventory-scope", value: "package-lock-v3-all-packages" },
      ],
    },
    components,
  };
}

export function validateCycloneDxSbom({ sbom, packageJsonText, packageLockText }) {
  const blockers = [];
  try {
    if (sbom?.bomFormat !== "CycloneDX" || sbom?.specVersion !== "1.6" || sbom?.version !== 1) {
      blockers.push("cyclonedx_identity_invalid");
    }
    if (!validIsoTimestamp(sbom?.metadata?.timestamp)) blockers.push("cyclonedx_timestamp_invalid");
    const rebuilt = buildCycloneDxSbom({
      packageJsonText,
      packageLockText,
      generatedAt: sbom?.metadata?.timestamp,
    });
    if (canonicalJson(rebuilt) !== canonicalJson(sbom)) blockers.push("cyclonedx_not_exactly_reproducible_from_lockfile");
    const packageLock = JSON.parse(packageLockText);
    const expectedCount = Object.keys(packageLock.packages).filter((entry) => entry !== "").length;
    if (sbom?.components?.length !== expectedCount) blockers.push(`cyclonedx_component_coverage_incomplete:${sbom?.components?.length ?? 0}/${expectedCount}`);
    if (new Set((sbom?.components ?? []).map((item) => item["bom-ref"])).size !== expectedCount) {
      blockers.push("cyclonedx_component_refs_not_unique");
    }
  } catch (error) {
    blockers.push(error instanceof Error ? error.message : "cyclonedx_validation_failed");
  }
  return [...new Set(blockers)].sort();
}

export function buildEmptyOpenVex({ generatedAt, sourceDigest }) {
  if (!validIsoTimestamp(generatedAt) || !isSha256(sourceDigest)) throw new Error("openvex_input_invalid");
  return {
    "@context": "https://openvex.dev/ns/v0.2.0",
    "@id": `urn:uuid:${deterministicUuid(sha256(`openvex:${sourceDigest}`))}`,
    author: "Velmere offline supply-chain preflight",
    role: "Document creator; no vulnerability disposition authority claimed",
    timestamp: generatedAt,
    version: 1,
    tooling: "velmere-pass4992-offline-preflight/1",
    statements: [],
  };
}

export function validateOpenVex(vex) {
  const blockers = [];
  if (vex?.["@context"] !== "https://openvex.dev/ns/v0.2.0") blockers.push("openvex_context_invalid");
  if (typeof vex?.["@id"] !== "string" || !vex["@id"].startsWith("urn:uuid:")) blockers.push("openvex_id_invalid");
  if (typeof vex?.author !== "string" || !vex.author.trim()) blockers.push("openvex_author_missing");
  if (!validIsoTimestamp(vex?.timestamp)) blockers.push("openvex_timestamp_invalid");
  if (!Number.isSafeInteger(vex?.version) || vex.version < 1) blockers.push("openvex_version_invalid");
  if (!Array.isArray(vex?.statements)) return [...new Set([...blockers, "openvex_statements_missing"])].sort();
  const seen = new Set();
  for (const statement of vex.statements) {
    const vulnerability = String(statement?.vulnerability?.name ?? "").trim();
    const products = Array.isArray(statement?.products) ? statement.products : [];
    const status = String(statement?.status ?? "");
    if (!vulnerability) blockers.push("openvex_vulnerability_name_missing");
    if (!products.length || products.some((product) => typeof product?.["@id"] !== "string" || !product["@id"].trim())) {
      blockers.push(`openvex_product_identity_missing:${vulnerability || "unknown"}`);
    }
    if (!["affected", "fixed", "not_affected", "under_investigation"].includes(status)) {
      blockers.push(`openvex_status_invalid:${vulnerability || "unknown"}`);
    }
    if (status === "not_affected" && !OPENVEX_NOT_AFFECTED_JUSTIFICATIONS.has(statement?.justification)) {
      blockers.push(`openvex_not_affected_justification_invalid:${vulnerability || "unknown"}`);
    }
    if (status === "affected" && (typeof statement?.action_statement !== "string" || !statement.action_statement.trim())) {
      blockers.push(`openvex_affected_action_missing:${vulnerability || "unknown"}`);
    }
    for (const product of products) {
      const identity = `${vulnerability}\u0000${String(product?.["@id"] ?? "")}`;
      if (seen.has(identity)) blockers.push(`openvex_duplicate_statement:${vulnerability || "unknown"}`);
      seen.add(identity);
    }
  }
  return [...new Set(blockers)].sort();
}

export function buildOfflineProvenance({ generatedAt, sourceDigest, packageLockDigest, sbomDigest, vexDigest, builderId }) {
  for (const digest of [sourceDigest, packageLockDigest, sbomDigest, vexDigest]) {
    if (!isSha256(digest)) throw new Error("offline_provenance_digest_invalid");
  }
  if (!validIsoTimestamp(generatedAt)) throw new Error("offline_provenance_timestamp_invalid");
  return {
    _type: "https://in-toto.io/Statement/v1",
    subject: [
      { name: "PASS4992_CYCLONEDX_SBOM.cdx.json", digest: { sha256: sbomDigest } },
      { name: "PASS4992_OPENVEX.json", digest: { sha256: vexDigest } },
    ],
    predicateType: "https://slsa.dev/provenance/v1",
    predicate: {
      buildDefinition: {
        buildType: "https://velmere.invalid/build-types/pass4992-offline-preflight/v1",
        externalParameters: {
          networkAccess: false,
          purpose: "offline_preparation_only_not_release_attestation",
        },
        internalParameters: {
          trustedBuilder: false,
          signatureIssued: false,
        },
        resolvedDependencies: [
          { uri: "urn:velmere:source-tree", digest: { sha256: sourceDigest } },
          { uri: "package-lock.json", digest: { sha256: packageLockDigest } },
        ],
      },
      runDetails: {
        builder: { id: builderId },
        metadata: {
          invocationId: `urn:uuid:${deterministicUuid(sha256(`provenance:${sourceDigest}:${generatedAt}`))}`,
          startedOn: generatedAt,
          finishedOn: generatedAt,
        },
        byproducts: [],
      },
    },
  };
}

export function validateOfflineProvenance({ provenance, policy, sourceDigest, packageLockDigest, sbomDigest, vexDigest }) {
  const blockers = [];
  if (provenance?._type !== policy.provenance.statementType) blockers.push("offline_provenance_statement_type_invalid");
  if (provenance?.predicateType !== policy.provenance.predicateType) blockers.push("offline_provenance_predicate_type_invalid");
  if (provenance?.predicate?.runDetails?.builder?.id !== policy.provenance.offlineBuilderId) blockers.push("offline_provenance_builder_identity_invalid");
  if (provenance?.predicate?.buildDefinition?.internalParameters?.trustedBuilder !== false) blockers.push("offline_provenance_must_be_explicitly_untrusted");
  if (provenance?.predicate?.buildDefinition?.internalParameters?.signatureIssued !== false) blockers.push("offline_provenance_must_be_explicitly_unsigned");
  const subjects = new Map((provenance?.subject ?? []).map((subject) => [subject.name, subject?.digest?.sha256]));
  if (subjects.get("PASS4992_CYCLONEDX_SBOM.cdx.json") !== sbomDigest) blockers.push("offline_provenance_sbom_binding_invalid");
  if (subjects.get("PASS4992_OPENVEX.json") !== vexDigest) blockers.push("offline_provenance_vex_binding_invalid");
  const dependencies = new Map((provenance?.predicate?.buildDefinition?.resolvedDependencies ?? []).map((item) => [item.uri, item?.digest?.sha256]));
  if (dependencies.get("urn:velmere:source-tree") !== sourceDigest) blockers.push("offline_provenance_source_binding_invalid");
  if (dependencies.get("package-lock.json") !== packageLockDigest) blockers.push("offline_provenance_lock_binding_invalid");
  return [...new Set(blockers)].sort();
}

export function scanTextForHighPrecisionSecrets(text, filePath = "fixture") {
  const findings = [];
  for (const rule of SECRET_RULES) {
    rule.pattern.lastIndex = 0;
    for (const match of text.matchAll(rule.pattern)) {
      const matched = match[0];
      const index = match.index ?? 0;
      findings.push({
        path: filePath,
        line: text.slice(0, index).split("\n").length,
        ruleId: rule.id,
        fingerprint: sha256(`pass4992-redacted-secret:${matched}`),
        redactedLength: matched.length,
      });
    }
  }
  return findings.sort((left, right) => left.line - right.line || left.ruleId.localeCompare(right.ruleId));
}

function isSecretScannablePath(filePath) {
  const base = path.basename(filePath).toLowerCase();
  return base === ".env" || base.startsWith(".env.") || SECRET_SCAN_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

export async function scanSourceForHighPrecisionSecrets(root, sourceManifest) {
  const findings = [];
  const ignoredFixtureFindings = [];
  const ignoredFixtureCounts = new Map();
  let scannedFileCount = 0;
  let scannedBytes = 0;
  for (const entry of sourceManifest.entries) {
    if (entry.type !== "file" || !isSecretScannablePath(entry.path)) continue;
    const content = await readFile(path.join(root, entry.path));
    if (content.includes(0)) continue;
    const text = content.toString("utf8");
    scannedFileCount += 1;
    scannedBytes += content.length;
    for (const finding of scanTextForHighPrecisionSecrets(text, entry.path)) {
      const fixtureKey = `${finding.path}:${finding.ruleId}`;
      const allowedFingerprints = SECRET_SCAN_EXACT_FIXTURES.get(fixtureKey);
      const occurrenceKey = `${fixtureKey}:${finding.fingerprint}`;
      const priorIgnored = ignoredFixtureCounts.get(occurrenceKey) ?? 0;
      if (allowedFingerprints?.has(finding.fingerprint) && priorIgnored === 0) {
        ignoredFixtureCounts.set(occurrenceKey, 1);
        ignoredFixtureFindings.push({ path: finding.path, line: finding.line, ruleId: finding.ruleId, fingerprint: finding.fingerprint });
      } else {
        findings.push(finding);
      }
    }
  }
  return {
    schemaVersion: "velmere.pass4992.high-precision-secret-scan.v1",
    scannerScope: "current-source-high-precision-patterns",
    historicalGitScanExecuted: false,
    githubSecretScanningVerified: false,
    pushProtectionVerified: false,
    scannedFileCount,
    scannedBytes,
    findingCount: findings.length,
    ignoredFixtureFindingCount: ignoredFixtureFindings.length,
    ignoredFixtureFindings,
    fixturePolicy: "EXACT_PATH_RULE_FINGERPRINT_SINGLE_OCCURRENCE",
    status: findings.length ? "FAIL" : "PASS_OFFLINE_SCOPE_ONLY",
    findings,
  };
}

function actionUsesFromWorkflow(text) {
  const uses = [];
  for (const [index, line] of text.split("\n").entries()) {
    const match = line.match(/^\s*(?:-\s*)?uses:\s*([^\s#]+)(?:\s+#.*)?$/);
    if (match) uses.push({ value: match[1], line: index + 1 });
  }
  return uses;
}

export function auditWorkflowText({ text, workflowPath, policy }) {
  const blockers = [];
  if (/^\s*pull_request_target\s*:/m.test(text)) blockers.push(`${workflowPath}:pull_request_target_forbidden`);
  if (/^\s*permissions\s*:\s*write-all\s*$/m.test(text)) blockers.push(`${workflowPath}:write_all_forbidden`);
  const uses = actionUsesFromWorkflow(text);
  for (const item of uses) {
    if (item.value.startsWith("./")) continue;
    const match = item.value.match(/^([^@]+)@([a-f0-9]{40})$/);
    if (!match) {
      blockers.push(`${workflowPath}:${item.line}:action_not_full_sha_pinned`);
      continue;
    }
    const action = match[1];
    const digest = match[2];
    const allowedDigests = policy.githubActions.allowedActions[action];
    if (!Array.isArray(allowedDigests) || !allowedDigests.includes(digest)) {
      blockers.push(`${workflowPath}:${item.line}:action_not_policy_allowlisted:${action}`);
    }
  }
  if (policy.githubActions.requireCheckoutCredentialsDisabledForAllWorkflows) {
    const checkoutCount = uses.filter((item) => item.value.startsWith("actions/checkout@")).length;
    const disabledCredentialCount = (text.match(/^\s*persist-credentials:\s*false\s*$/gm) ?? []).length;
    if (disabledCredentialCount < checkoutCount) blockers.push(`${workflowPath}:checkout_credentials_persisted`);
  }
  if (workflowPath.endsWith("pass4992-supply-chain-security.yml")) {
    for (const language of policy.codeql.requiredLanguages) {
      if (!text.includes(`- ${language}`)) blockers.push(`${workflowPath}:codeql_language_missing:${language}`);
    }
    for (const suite of policy.codeql.requiredQuerySuites) {
      if (!text.includes(suite)) blockers.push(`${workflowPath}:codeql_query_suite_missing:${suite}`);
    }
    if (!/^\s*security-events:\s*write\s*$/m.test(text)) blockers.push(`${workflowPath}:codeql_security_events_permission_missing`);
    if (!uses.some((item) => item.value.startsWith("actions/dependency-review-action@"))) {
      blockers.push(`${workflowPath}:dependency_review_action_missing`);
    }
    if (!/^\s*fail-on-severity:\s*high\s*$/m.test(text)) {
      blockers.push(`${workflowPath}:dependency_review_severity_policy_missing`);
    }
    if (!/^\s*fail-on-scopes:\s*runtime,\s*development,\s*unknown\s*$/m.test(text)) {
      blockers.push(`${workflowPath}:dependency_review_scope_policy_incomplete`);
    }
  }
  return blockers;
}

export async function auditWorkflowDirectory(root, policy) {
  const workflowRoot = path.join(root, ".github/workflows");
  const names = (await readdir(workflowRoot)).filter((name) => /\.ya?ml$/.test(name)).sort();
  const blockers = [];
  let actionReferenceCount = 0;
  for (const name of names) {
    const text = await readFile(path.join(workflowRoot, name), "utf8");
    actionReferenceCount += actionUsesFromWorkflow(text).length;
    blockers.push(...auditWorkflowText({ text, workflowPath: `.github/workflows/${name}`, policy }));
  }
  const required = [...(policy.githubActions.requiredWorkflowFiles ?? [])].sort();
  const missingWorkflowFiles = required.filter((name) => !names.includes(name));
  for (const name of missingWorkflowFiles) blockers.push(`workflow_missing:${name}`);

  // R10: the active workflow directory is the authority for inventory size.
  // The policy list is a minimum baseline only; every discovered workflow still
  // receives the same pinning, permissions and checkout-credential audit.
  const additionalWorkflowFiles = names.filter((name) => !required.includes(name));
  const unexpectedWorkflowFiles = [];
  return {
    workflowCount: names.length,
    workflowFiles: names,
    actionReferenceCount,
    inventoryMode: "DISCOVER_ACTIVE",
    requiredWorkflowFiles: required,
    missingWorkflowFiles,
    additionalWorkflowFiles,
    unexpectedWorkflowFiles,
    blockers: [...new Set(blockers)].sort(),
  };
}

export function auditDependabotText(text) {
  const blockers = [];
  if (!/^version:\s*2\s*$/m.test(text)) blockers.push("dependabot_schema_version_invalid");
  for (const ecosystem of ["npm", "github-actions"]) {
    if (!new RegExp(`package-ecosystem:\\s*${ecosystem.replace("-", "\\-")}`).test(text)) {
      blockers.push(`dependabot_ecosystem_missing:${ecosystem}`);
    }
  }
  if ((text.match(/interval:\s*weekly/g) ?? []).length < 2) blockers.push("dependabot_weekly_schedule_incomplete");
  if ((text.match(/target-branch:\s*main/g) ?? []).length < 2) blockers.push("dependabot_target_branch_incomplete");
  if (/^\s*ignore\s*:/m.test(text)) blockers.push("dependabot_ignored_dependencies_require_review");
  return blockers.sort();
}

function externalReceiptUnsigned(receipt) {
  const { signature: _signature, ...unsigned } = receipt;
  return unsigned;
}

export function signExternalReceipt(unsigned, { privateKey, keyId }) {
  if (unsigned?.schemaVersion !== EXTERNAL_RECEIPT_SCHEMA) throw new Error("external_receipt_schema_invalid");
  const key = typeof privateKey === "string" ? createPrivateKey(privateKey) : privateKey;
  const signature = signBytes(null, Buffer.from(canonicalJson(unsigned)), key).toString("base64");
  return { ...unsigned, signature: { algorithm: "ed25519", keyId, value: signature } };
}

function verifyExternalReceiptSignature(receipt, trustedReceiptKeys) {
  try {
    if (receipt?.signature?.algorithm !== "ed25519") return false;
    const publicMaterial = trustedReceiptKeys[receipt?.signature?.keyId];
    if (!publicMaterial) return false;
    const publicKey = typeof publicMaterial === "string" ? createPublicKey(publicMaterial) : publicMaterial;
    const signature = Buffer.from(String(receipt.signature.value ?? ""), "base64");
    return verifyBytes(null, Buffer.from(canonicalJson(externalReceiptUnsigned(receipt))), publicKey, signature);
  } catch {
    return false;
  }
}

function semanticReceiptBlockers({ receipt, control, policy, manifest, packageLockDigest, now, sbomDigest, vexDigest, trustedReceiptKeys, externalEvidenceByDigest }) {
  const blockers = [];
  const prefix = `external_receipt:${control}`;
  if (!receipt) return [`${prefix}:missing`];
  if (receipt.schemaVersion !== EXTERNAL_RECEIPT_SCHEMA) blockers.push(`${prefix}:schema_invalid`);
  if (receipt.control !== control) blockers.push(`${prefix}:control_mismatch`);
  if (receipt.sourceDigest !== manifest.sourceDigest) blockers.push(`${prefix}:source_digest_mismatch`);
  if (receipt.packageLockDigest !== packageLockDigest) blockers.push(`${prefix}:lockfile_digest_mismatch`);
  if (receipt.status !== "PASS" || receipt.complete !== true) blockers.push(`${prefix}:not_complete_pass`);
  if (typeof receipt.receiptId !== "string" || receipt.receiptId.length < 16) blockers.push(`${prefix}:receipt_id_invalid`);
  if (typeof receipt.nonce !== "string" || receipt.nonce.length < 16) blockers.push(`${prefix}:nonce_invalid`);
  if (typeof receipt.issuer !== "string" || !receipt.issuer.trim()) blockers.push(`${prefix}:issuer_missing`);
  if (!isSha256(receipt.evidenceDigest)) blockers.push(`${prefix}:evidence_digest_invalid`);
  if (!policy.releaseGate.trustedReceiptKeyIds.includes(receipt?.signature?.keyId)) blockers.push(`${prefix}:key_id_not_policy_trusted`);
  const issuedAt = Date.parse(receipt.issuedAt);
  const expiresAt = Date.parse(receipt.expiresAt);
  const nowMs = now.getTime();
  const maximumAgeSeconds = control === "codeql"
    ? policy.codeql.maximumReceiptAgeSeconds
    : control === "github-secret-protection"
      ? policy.secretProtection.maximumReceiptAgeSeconds
      : policy.dependencySecurity.maximumReceiptAgeSeconds;
  if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresAt)) blockers.push(`${prefix}:time_invalid`);
  else {
    if (issuedAt > nowMs + 60_000) blockers.push(`${prefix}:issued_in_future`);
    if (nowMs - issuedAt > maximumAgeSeconds * 1_000) blockers.push(`${prefix}:stale`);
    if (expiresAt <= nowMs || expiresAt <= issuedAt) blockers.push(`${prefix}:expired`);
  }
  if (!verifyExternalReceiptSignature(receipt, trustedReceiptKeys)) blockers.push(`${prefix}:signature_untrusted_or_invalid`);

  const result = receipt.result ?? {};
  if (control === "codeql") {
    if (result.analysisCompleted !== true || result.sarifUploaded !== true) blockers.push(`${prefix}:analysis_incomplete`);
    for (const language of policy.codeql.requiredLanguages) {
      if (!Array.isArray(result.languages) || !result.languages.includes(language)) blockers.push(`${prefix}:language_missing:${language}`);
    }
    for (const suite of policy.codeql.requiredQuerySuites) {
      if (!Array.isArray(result.querySuites) || !result.querySuites.includes(suite)) blockers.push(`${prefix}:query_suite_missing:${suite}`);
    }
    if (result.openCritical !== 0 || result.openHigh !== 0) blockers.push(`${prefix}:critical_or_high_open`);
  }
  if (control === "github-secret-protection") {
    if (result.secretScanningEnabled !== true || result.pushProtectionEnabled !== true || result.historicalScanCompleted !== true) {
      blockers.push(`${prefix}:platform_protection_incomplete`);
    }
    if (result.unresolvedVerifiedSecrets !== 0) blockers.push(`${prefix}:verified_secret_unresolved`);
  }
  if (control === "dependency-review") {
    if (result.dependencyGraphComplete !== true || result.lockfileReviewed !== true || result.malwareReviewComplete !== true || result.registrySignaturesReviewed !== true) {
      blockers.push(`${prefix}:review_scope_incomplete`);
    }
    if (result.critical !== 0 || result.high !== 0 || result.unknownSeverity !== 0) blockers.push(`${prefix}:critical_high_or_unknown_open`);
    if (!Array.isArray(result.findingIds) || !Array.isArray(result.vexRequiredFindingIds)) blockers.push(`${prefix}:finding_inventory_missing`);
  }
  if (control === "provenance") {
    if (typeof result.builderId !== "string" || !result.builderId.trim()) blockers.push(`${prefix}:builder_identity_missing`);
    if (typeof result.buildArtifactName !== "string" || !result.buildArtifactName.trim()) blockers.push(`${prefix}:artifact_name_missing`);
    if (result.predicateType !== policy.provenance.predicateType || !isSha256(result.statementDigest)) blockers.push(`${prefix}:statement_invalid`);
    if (!isSha256(result.buildArtifactDigest)) blockers.push(`${prefix}:artifact_digest_invalid`);
    if (result.sbomDigest !== sbomDigest || result.vexDigest !== vexDigest) blockers.push(`${prefix}:sbom_or_vex_binding_mismatch`);
    if (result.trustedBuilder !== true || result.oidcIdentityVerified !== true || result.transparencyLogVerified !== true) blockers.push(`${prefix}:trusted_builder_evidence_incomplete`);
    if (result.immutableArtifact !== true || result.twoPersonReviewVerified !== true) blockers.push(`${prefix}:release_governance_incomplete`);
    const statement = externalEvidenceByDigest[result.statementDigest];
    if (!statement || sha256(canonicalJson(statement)) !== result.statementDigest) {
      blockers.push(`${prefix}:statement_material_missing_or_digest_invalid`);
    } else {
      if (statement._type !== policy.provenance.statementType || statement.predicateType !== policy.provenance.predicateType) blockers.push(`${prefix}:statement_type_mismatch`);
      if (statement?.predicate?.runDetails?.builder?.id !== result.builderId || result.builderId === policy.provenance.offlineBuilderId) blockers.push(`${prefix}:builder_identity_mismatch`);
      const artifactBound = (statement.subject ?? []).some((subject) => subject?.name === result.buildArtifactName && subject?.digest?.sha256 === result.buildArtifactDigest);
      if (!artifactBound) blockers.push(`${prefix}:artifact_subject_not_bound`);
      const dependencies = new Map((statement?.predicate?.buildDefinition?.resolvedDependencies ?? []).map((item) => [item.uri, item?.digest?.sha256]));
      if (dependencies.get("urn:velmere:source-tree") !== manifest.sourceDigest) blockers.push(`${prefix}:statement_source_not_bound`);
      if (dependencies.get("package-lock.json") !== packageLockDigest) blockers.push(`${prefix}:statement_lockfile_not_bound`);
    }
  }
  return blockers;
}

export function buildReleaseGate({
  generatedAt,
  now,
  policy,
  policyDigest,
  manifest,
  packageJsonText,
  packageLockText,
  sbom,
  vex,
  offlineProvenance,
  externalReceipts = [],
  trustedReceiptKeys = {},
  externalEvidenceByDigest = {},
}) {
  if (!validIsoTimestamp(generatedAt) || !(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw new Error("release_gate_time_invalid");
  }
  const blockers = [];
  const packageLockDigest = sha256(packageLockText);
  const sbomDigest = sha256(canonicalJson(sbom));
  const vexDigest = sha256(canonicalJson(vex));
  blockers.push(...validateCycloneDxSbom({ sbom, packageJsonText, packageLockText }));
  blockers.push(...validateOpenVex(vex));
  blockers.push(...validateOfflineProvenance({
    provenance: offlineProvenance,
    policy,
    sourceDigest: manifest.sourceDigest,
    packageLockDigest,
    sbomDigest,
    vexDigest,
  }));
  if (!isSha256(policyDigest)) blockers.push("policy_digest_invalid");

  const receiptByControl = new Map();
  const receiptIds = new Set();
  const nonces = new Set();
  for (const receipt of externalReceipts) {
    if (receiptByControl.has(receipt?.control)) blockers.push(`external_receipt_duplicate_control:${String(receipt?.control ?? "unknown")}`);
    if (!policy.releaseGate.requiredSignedControls.includes(receipt?.control)) blockers.push(`external_receipt_unknown_control:${String(receipt?.control ?? "unknown")}`);
    if (receiptIds.has(receipt?.receiptId)) blockers.push(`external_receipt_duplicate_id:${String(receipt?.receiptId ?? "unknown")}`);
    if (nonces.has(receipt?.nonce)) blockers.push(`external_receipt_duplicate_nonce:${String(receipt?.nonce ?? "unknown")}`);
    receiptIds.add(receipt?.receiptId);
    nonces.add(receipt?.nonce);
    receiptByControl.set(receipt?.control, receipt);
  }
  for (const control of policy.releaseGate.requiredSignedControls) {
    blockers.push(...semanticReceiptBlockers({
      receipt: receiptByControl.get(control),
      control,
      policy,
      manifest,
      packageLockDigest,
      now,
      sbomDigest,
      vexDigest,
      trustedReceiptKeys,
      externalEvidenceByDigest,
    }));
  }

  const dependencyReceipt = receiptByControl.get("dependency-review");
  if (dependencyReceipt?.result?.vexRequiredFindingIds) {
    const dispositions = new Set((vex.statements ?? []).map((statement) => statement?.vulnerability?.name));
    for (const findingId of dependencyReceipt.result.vexRequiredFindingIds) {
      if (!dispositions.has(findingId)) blockers.push(`openvex_required_disposition_missing:${findingId}`);
    }
  }

  const uniqueBlockers = [...new Set(blockers)].sort();
  const body = {
    schemaVersion: RELEASE_GATE_SCHEMA,
    generatedAt,
    status: uniqueBlockers.length ? "BLOCKED" : "READY",
    releaseEligible: uniqueBlockers.length === 0,
    releaseEligibilityBps: uniqueBlockers.length === 0 ? 10_000 : 0,
    sourceDigest: manifest.sourceDigest,
    sourceFileCount: manifest.fileCount,
    packageLockDigest,
    policyDigest,
    sbomDigest,
    vexDigest,
    signedExternalControlCount: policy.releaseGate.requiredSignedControls.filter((control) => receiptByControl.has(control)).length,
    requiredSignedExternalControlCount: policy.releaseGate.requiredSignedControls.length,
    blockers: uniqueBlockers,
    claims: {
      offlineArtifactsValidated: !uniqueBlockers.some((item) => item.startsWith("cyclonedx_") || item.startsWith("openvex_") || item.startsWith("offline_provenance_")),
      hostedCiExecutedByThisLocalReceipt: false,
      liveRegistrySecurityVerifiedByThisLocalReceipt: false,
      productionProvenanceClaimedByThisLocalReceipt: false,
    },
  };
  return { ...body, receiptDigest: sha256(canonicalJson(body)) };
}
