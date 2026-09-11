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

function collectIdentityStrings(value, out = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectIdentityStrings(item, out);
    return out;
  }
  if (!value || typeof value !== "object") return out;
  const identityKeys = new Set([
    "target",
    "identifier",
    "providersymbol",
    "canonicalsymbol",
    "symbol",
    "description",
    "economicexposure",
    "underlying",
    "assetclass",
    "instrumenttype",
    "venue",
  ]);
  for (const [key, item] of Object.entries(value)) {
    if (identityKeys.has(key.toLowerCase()) && typeof item === "string") out.push(item);
    else if (item && typeof item === "object") collectIdentityStrings(item, out);
  }
  return out;
}

function realMarketsIdentityText(text) {
  try {
    return collectIdentityStrings(JSON.parse(text)).join(" ");
  } catch {
    return text;
  }
}

function scanRealMarketsTruth(relativePath, text) {
  const findings = [];
  if (!/real[_-]?markets/i.test(relativePath) && !/"marketSpec"\s*:/i.test(text)) return findings;

  const add = (id, severity, match, reason) => findings.push({ id, severity, path: relativePath, match, reason });
  const checks = [
    [
      "REAL_MARKETS_SMART_CONTRACT_ASSET_CLASS",
      /"marketSpec"\s*:\s*\{[\s\S]{0,2500}?"assetClass"\s*:\s*"Smart Contract Application"/i,
      "P0",
      "Real Markets instrument identity cannot classify traditional-market targets as Smart Contract Application.",
    ],
    [
      "REAL_MARKETS_GENERIC_REGULATOR_TRIAD",
      /"regulatoryJurisdiction"\s*:\s*"SEC\s*\/\s*FINRA\s*\/\s*CFTC"/i,
      "P0",
      "Real Markets jurisdiction must be instrument-specific; the generic SEC/FINRA/CFTC triad is not a valid universal identity field.",
    ],
  ];

  for (const [id, regex, severity, reason] of checks) {
    const match = text.match(regex);
    if (match) add(id, severity, match[0].slice(0, 240), reason);
  }

  const identity = realMarketsIdentityText(text);
  const hasPhysicalOrSpotSemantics = /\b(?:physical|bullion|spot)\b/i.test(identity);
  if (
    hasPhysicalOrSpotSemantics &&
    /\b(?:XAU|Gold)\b/i.test(identity) &&
    /\bcme\s*:\s*gc[-_:]?front\b/i.test(identity)
  ) {
    add(
      "REAL_MARKETS_XAU_PHYSICAL_VS_GC_FUTURE",
      "P0",
      identity.slice(0, 240),
      "Gold identity mixes physical/spot semantics with the CME GC front-future proxy.",
    );
  }
  if (
    hasPhysicalOrSpotSemantics &&
    /\b(?:XAG|Silver)\b/i.test(identity) &&
    /\bcme\s*:\s*si[-_:]?front\b/i.test(identity)
  ) {
    add(
      "REAL_MARKETS_XAG_PHYSICAL_VS_SI_FUTURE",
      "P0",
      identity.slice(0, 240),
      "Silver identity mixes physical/spot semantics with the CME SI front-future proxy.",
    );
  }
  if (
    /\b(?:EURUSD|USDJPY)\b/i.test(identity) &&
    /\b(?:spot|OTC|sovereign)\b/i.test(identity) &&
    /(?:\bcme\s*:[^\s\"']*(?:6E|6J)\b|\b(?:6E|6J)[FGHJKMNQUVXZ]?\d{0,2}\b)/i.test(identity)
  ) {
    add(
      "REAL_MARKETS_FX_SPOT_VS_CME_FUTURE",
      "P0",
      identity.slice(0, 240),
      "FX identity mixes spot/OTC semantics with a CME currency-futures identifier.",
    );
  }

  return findings;
}

export function scanTextForReleaseTruth(relativePath, text) {
  const findings = [];
  const add = (id, severity, match, reason) => findings.push({ id, severity, path: relativePath, match, reason });

  const patterns = [
    ["CLAIM_FORMAL_FULL_SMT", /\b(?:Full\s+SMT\s+(?:Z3\s+)?Solver\s+Verification|SMT\s+Z3\s+Solver\s+Verification)\b/i, "P0", "Formal/SMT wording requires exact-scope executed solver evidence."],
    ["CLAIM_FORMAL_STATIC_AND_FORMAL", /AUTOMATED\s+STATIC\s*&\s*FORMAL\s+ANALYSIS/i, "P0", "Do not describe the customer output as formal analysis when formal execution may be NOT_EXECUTED."],
    ["CLAIM_FORMAL_STATIC_AND_FORMAL_PL", /ZAUTOMATYZOWANA\s+WERYFIKACJA\s+STATYCZNA\s*&\s*FORMALNA/i, "P0", "Polish customer wording must not imply formal execution when formal verification is NOT_EXECUTED."],
    ["CLAIM_FULLY_AUDITED", /\bfully\s+audited\b/i, "P0", "Fully-audited wording requires current exact-scope content evidence and must not be inferred from file integrity."],
    ["CLAIM_PRODUCTION_READY", /\b(?:production[- ]ready|officially\s+certified\s+for\s+production|commercial\s+release\s+approved)\b/i, "P0", "Production-ready claims require current build, staging, authority and open-P0 evidence."],
    ["CLAIM_IMMUTABLE_CONTENT", /\[(?:VERIFIED\s*-\s*IMMUTABLE)\]/i, "P0", "Cryptographic file integrity must not be worded as audit-content correctness."],
    ["CLAIM_HUMAN_DEFAULT", /\b(?:HUMAN\s+AUDITED|HUMAN\s+REVIEWED|certified\s+human\s+auditor)\b/i, "P0", "Human-review claims require a confirmed human-review receipt."],
    ["HARDCODED_DETECTOR_72", /(?:totalDetectors\s*[:=]\s*72\b|\b72\s+Automated\s+Static\s+Detectors\b)/i, "P0", "Detector counts must be derived from the current detector registry, never hardcoded."],
    ["PSEUDO_RFC3161_LOCAL_TSA", /"tsaName"\s*:\s*"Velm[èe]re\s+RFC\s*3161\s+Trusted\s+Authority"/i, "P0", "A locally synthesized JSON timestamp must not be represented as an RFC 3161 trusted TSA token."],
    ["PSEUDO_ROOT_CA_LOCAL_SIGNER", /"signerIdentity"\s*:\s*"Velm[èe]re\s+Cryptographic\s+Root\s+CA[^\"]*"/i, "P0", "An embedded/local report signer must not be represented as a trusted root CA."],
    ["PLACEHOLDER_PROVENANCE_HASH", /"provenanceHash"\s*:\s*"0xprovenance_root"/i, "P0", "Placeholder provenance is not observed provenance and must be null/NOT_OBSERVED until exact-scope evidence exists."],
  ];

  for (const [id, regex, severity, reason] of patterns) {
    const match = text.match(regex);
    if (match) add(id, severity, match[0], reason);
  }

  findings.push(...scanRealMarketsTruth(relativePath, text));
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
