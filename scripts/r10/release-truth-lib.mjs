import fs from "node:fs";
import path from "node:path";

const TEXT_EXTENSIONS = new Set([".md", ".txt", ".json", ".ts", ".tsx", ".js", ".mjs", ".html"]);
const SKIP_DIRS = new Set([".git", "node_modules", ".next", ".velmere", "artifacts"]);

export function walkTextFiles(root, relativeRoots) {
  const files = [];
  for (const rel of relativeRoots) {
    const start = path.join(root, rel);
    if (!fs.existsSync(start)) continue;
    const stack = [start];
    while (stack.length) {
      const current = stack.pop();
      if (!current) continue;
      const stat = fs.statSync(current);
      if (stat.isDirectory()) {
        if (SKIP_DIRS.has(path.basename(current))) continue;
        for (const entry of fs.readdirSync(current)) stack.push(path.join(current, entry));
        continue;
      }
      if (!TEXT_EXTENSIONS.has(path.extname(current).toLowerCase())) continue;
      files.push(current);
    }
  }
  return files;
}

export function scanTextForReleaseTruth(relativePath, text) {
  const findings = [];
  const add = (id, severity, match, reason) => findings.push({ id, severity, path: relativePath, match, reason });

  const patterns = [
    ["CLAIM_FORMAL_FULL_SMT", /\b(?:Full\s+SMT\s+(?:Z3\s+)?Solver\s+Verification|SMT\s+Z3\s+Solver\s+Verification)\b/i, "P0", "Formal/SMT wording requires exact-scope executed solver evidence."],
    ["CLAIM_FORMAL_STATIC_AND_FORMAL", /AUTOMATED\s+STATIC\s*&\s*FORMAL\s+ANALYSIS/i, "P0", "Do not describe the customer output as formal analysis when formal execution may be NOT_EXECUTED."],
    ["CLAIM_FULLY_AUDITED", /\bfully\s+audited\b/i, "P0", "Fully-audited wording requires current exact-scope content evidence and must not be inferred from file integrity."],
    ["CLAIM_PRODUCTION_READY", /\b(?:production[- ]ready|officially\s+certified\s+for\s+production|commercial\s+release\s+approved)\b/i, "P0", "Production-ready claims require current build, staging, authority and open-P0 evidence."],
    ["CLAIM_IMMUTABLE_CONTENT", /\[(?:VERIFIED\s*-\s*IMMUTABLE)\]/i, "P0", "Cryptographic file integrity must not be worded as audit-content correctness."],
    ["CLAIM_HUMAN_DEFAULT", /\b(?:HUMAN\s+AUDITED|HUMAN\s+REVIEWED|certified\s+human\s+auditor)\b/i, "P0", "Human-review claims require a confirmed human-review receipt."],
    ["HARDCODED_DETECTOR_72", /(?:totalDetectors\s*[:=]\s*72\b|\b72\s+Automated\s+Static\s+Detectors\b)/i, "P0", "Detector counts must be derived from the current detector registry, never hardcoded."],
  ];

  for (const [id, regex, severity, reason] of patterns) {
    const match = text.match(regex);
    if (match) add(id, severity, match[0], reason);
  }
  return findings;
}

export function verifyBuildTruth(root) {
  const findings = [];
  const nextConfig = path.join(root, "next.config.mjs");
  if (fs.existsSync(nextConfig)) {
    const text = fs.readFileSync(nextConfig, "utf8");
    if (/ignoreBuildErrors\s*:\s*true/.test(text)) {
      findings.push({
        id: "BUILD_IGNORE_TYPESCRIPT_ERRORS",
        severity: "P0",
        path: "next.config.mjs",
        match: "ignoreBuildErrors: true",
        reason: "A successful Next build cannot be treated as clean production evidence while TypeScript build errors are ignored.",
      });
    }
  }

  const expectedNode = "24.18.0";
  for (const rel of [".nvmrc", ".node-version"]) {
    const p = path.join(root, rel);
    if (!fs.existsSync(p)) {
      findings.push({ id: "RUNTIME_PIN_MISSING", severity: "P1", path: rel, match: null, reason: `Expected exact Node ${expectedNode} pin.` });
      continue;
    }
    const actual = fs.readFileSync(p, "utf8").trim();
    if (actual !== expectedNode) {
      findings.push({ id: "RUNTIME_PIN_MISMATCH", severity: "P0", path: rel, match: actual, reason: `Expected exact Node ${expectedNode}.` });
    }
  }

  const runtimePolicy = path.join(root, "config", "pass24", "runtime-policy.json");
  if (fs.existsSync(runtimePolicy)) {
    try {
      const policy = JSON.parse(fs.readFileSync(runtimePolicy, "utf8"));
      if (policy?.node?.version !== "24.18.0" || policy?.node?.bundledNpmVersion !== "11.16.0") {
        findings.push({ id: "RUNTIME_POLICY_MISMATCH", severity: "P0", path: "config/pass24/runtime-policy.json", match: JSON.stringify(policy?.node ?? null), reason: "R10 exact runtime is Node 24.18.0 / npm 11.16.0." });
      }
    } catch (error) {
      findings.push({ id: "RUNTIME_POLICY_INVALID_JSON", severity: "P0", path: "config/pass24/runtime-policy.json", match: String(error), reason: "Runtime policy must be valid machine-readable JSON." });
    }
  }

  return findings;
}

export function runReleaseTruthScan(root) {
  const scanRoots = ["dowody9", "dowody4", "docs/audit", "reports", "app", "public", "scripts"];
  const findings = [...verifyBuildTruth(root)];
  for (const file of walkTextFiles(root, scanRoots)) {
    const relativePath = path.relative(root, file).replaceAll(path.sep, "/");
    // Policy/spec/test fixtures are allowed to contain prohibited phrases as examples.
    if (/^(?:scripts\/r10\/|.*(?:test|spec|fixture).*)/i.test(relativePath)) continue;
    const text = fs.readFileSync(file, "utf8");
    findings.push(...scanTextForReleaseTruth(relativePath, text));
  }
  return findings;
}
