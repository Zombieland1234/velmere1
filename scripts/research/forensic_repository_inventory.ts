import fs from "fs";
import path from "path";

const ROOT_DIR = process.cwd();

const EXCLUDE_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  ".aider.tags.cache.v4",
  "P51_NATIVE_WINDOWS_EXACT_BUNDLE_PROJECTION",
  "p65-windows",
  "p73-runtime",
  "p75-runtime",
  "p76-runtime",
  "p76r2-runtime",
  "p77-runtime",
  "r7-runtime",
]);

const PATTERNS_TO_SEARCH = [
  "VERIFIED",
  "CERTIFIED",
  "SECURITY SCORE",
  "CONFIDENCE",
  "COVERAGE",
  "EVIDENCE",
  "STATIC",
  "FORMAL",
  "FUZZ",
  "ORACLE",
  "REENTRANCY",
  "BYTECODE",
  "ABI",
  "PROXY",
  "OWNER",
  "ADMIN",
  "MULTISIG",
  "TIMELOCK",
  "CHAINLINK",
  "SAFE",
  "LIQUIDITY",
  "HOLDERS",
  "MARKET",
  "GOVERNANCE",
  "CONSENSUS",
  "COMPILER",
  "DEPLOYMENT",
  "VERIFIED SOURCE",
  "HUMAN REVIEW",
  "AUDITOR",
  "CERTIFICATE",
  "ATTESTATION",
  "MOCK",
  "FIXTURE",
  "SIMULATED",
  "FALLBACK",
  "DEFAULT",
  "MAGIC NUMBER",
  "PLACEHOLDER",
  "TODO",
  "FIXME",
];

interface FileInfo {
  relativePath: string;
  extension: string;
  sizeBytes: number;
  category: string;
}

function categorizeFile(relPath: string): string {
  const norm = relPath.replace(/\\/g, "/");
  if (norm.startsWith("lib/security/engines/")) return "engine";
  if (norm.startsWith("lib/security/v2/")) return "v2_engine";
  if (norm.startsWith("lib/security/corpus/")) return "corpus";
  if (norm.startsWith("lib/security/pro-audit-pdf/")) return "pdf_generator";
  if (norm.startsWith("lib/security/")) return "security_module";
  if (norm.startsWith("lib/")) return "library";
  if (norm.startsWith("app/api/")) return "api_route";
  if (norm.startsWith("app/")) return "app_route";
  if (norm.startsWith("components/")) return "component";
  if (norm.startsWith("tests/adversarial/")) return "test_adversarial";
  if (norm.startsWith("tests/security/")) return "test_security";
  if (norm.startsWith("tests/unit/")) return "test_unit";
  if (norm.startsWith("tests/")) return "test_suite";
  if (norm.startsWith("fixtures/") || norm.includes("/fixtures/")) return "fixture";
  if (norm.startsWith("golden/") || norm.includes("/golden")) return "golden_corpus";
  if (norm.startsWith("scripts/furnace/")) return "script_furnace";
  if (norm.startsWith("scripts/")) return "script";
  if (norm.startsWith("reports/")) return "report";
  if (norm.startsWith("dowody2/")) return "evidence_v3";
  if (norm.startsWith("dowody/")) return "evidence_v2";
  if (norm.startsWith("artifacts/")) return "artifact";
  if (norm.startsWith("docs/")) return "documentation";
  if (norm.startsWith(".velmere/")) return "state_file";
  return "other";
}

function walkDir(dir: string, fileList: FileInfo[] = []): FileInfo[] {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    if (EXCLUDE_DIRS.has(item.name)) continue;
    const fullPath = path.join(dir, item.name);
    const relPath = path.relative(ROOT_DIR, fullPath);

    if (item.isDirectory()) {
      walkDir(fullPath, fileList);
    } else if (item.isFile()) {
      const ext = path.extname(item.name).toLowerCase();
      const stats = fs.statSync(fullPath);
      fileList.push({
        relativePath: relPath,
        extension: ext,
        sizeBytes: stats.size,
        category: categorizeFile(relPath),
      });
    }
  }
  return fileList;
}

function scanPatternsInCode(files: FileInfo[]): Record<string, { count: number; files: string[] }> {
  const results: Record<string, { count: number; files: string[] }> = {};
  for (const pat of PATTERNS_TO_SEARCH) {
    results[pat] = { count: 0, files: [] };
  }

  const codeExts = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".json", ".md"]);

  for (const f of files) {
    if (!codeExts.has(f.extension)) continue;
    if (f.category.startsWith("evidence_") || f.category === "artifact") continue; // skip generated binary/raw dumps
    if (f.sizeBytes > 2 * 1024 * 1024) continue; // skip files > 2MB

    const fullPath = path.join(ROOT_DIR, f.relativePath);
    try {
      const content = fs.readFileSync(fullPath, "utf-8");
      for (const pat of PATTERNS_TO_SEARCH) {
        const regex = new RegExp(`\\b${pat}\\b`, "gi");
        const matches = content.match(regex);
        if (matches && matches.length > 0) {
          results[pat].count += matches.length;
          results[pat].files.push(f.relativePath);
        }
      }
    } catch {}
  }

  return results;
}

function detectHardcodedAddresses(files: FileInfo[]): { totalMatches: number; sampleAddresses: Record<string, string[]> } {
  const codeExts = new Set([".ts", ".tsx", ".js", ".mjs"]);
  const ethAddressRegex = /0x[a-fA-F0-9]{40}/g;
  let totalMatches = 0;
  const sampleAddresses: Record<string, string[]> = {};

  for (const f of files) {
    if (!codeExts.has(f.extension)) continue;
    if (f.category.startsWith("evidence_") || f.category === "artifact") continue;

    const fullPath = path.join(ROOT_DIR, f.relativePath);
    try {
      const content = fs.readFileSync(fullPath, "utf-8");
      const matches = content.match(ethAddressRegex);
      if (matches && matches.length > 0) {
        totalMatches += matches.length;
        sampleAddresses[f.relativePath] = Array.from(new Set(matches)).slice(0, 5);
      }
    } catch {}
  }

  return { totalMatches, sampleAddresses };
}

function runInventory() {
  console.log("Starting repository forensic inventory scan...");
  const files = walkDir(ROOT_DIR);
  console.log(`Found ${files.length} total files across repository.`);

  const categoryCounts: Record<string, number> = {};
  const extCounts: Record<string, number> = {};
  let totalBytes = 0;

  for (const f of files) {
    categoryCounts[f.category] = (categoryCounts[f.category] || 0) + 1;
    extCounts[f.extension || "(no_ext)"] = (extCounts[f.extension || "(no_ext)"] || 0) + 1;
    totalBytes += f.sizeBytes;
  }

  console.log("Scanning code patterns...");
  const patternOccurrences = scanPatternsInCode(files);

  console.log("Scanning hardcoded EVM addresses...");
  const hardcodedAddrs = detectHardcodedAddresses(files);

  const inventoryJson = {
    scannedAt: new Date().toISOString(),
    totalFiles: files.length,
    totalSizeBytes: totalBytes,
    categoryCounts,
    extensionCounts: extCounts,
    patternOccurrences: Object.fromEntries(
      Object.entries(patternOccurrences).map(([k, v]) => [
        k,
        { count: v.count, fileCount: v.files.length, sampleFiles: v.files.slice(0, 8) },
      ])
    ),
    hardcodedAddresses: {
      totalFound: hardcodedAddrs.totalMatches,
      filesWithAddressesCount: Object.keys(hardcodedAddrs.sampleAddresses).length,
      sampleFileMap: hardcodedAddrs.sampleAddresses,
    },
    keyArchitectureModules: {
      engines: files.filter((f) => f.category === "engine" || f.category === "v2_engine").map((f) => f.relativePath),
      corpus: files.filter((f) => f.category === "corpus").map((f) => f.relativePath),
      pdfGenerators: files.filter((f) => f.category === "pdf_generator").map((f) => f.relativePath),
      tests: files.filter((f) => f.category.startsWith("test_")).map((f) => f.relativePath),
      stateFiles: files.filter((f) => f.category === "state_file").map((f) => f.relativePath),
    },
  };

  const jsonOutPath = path.join(ROOT_DIR, "reports/research/repository_inventory.json");
  fs.writeFileSync(jsonOutPath, JSON.stringify(inventoryJson, null, 2), "utf-8");
  console.log(`Wrote JSON inventory to ${jsonOutPath}`);

  const mdLines = [
    "# VELMÈRE REPOSITORY FORENSIC INVENTORY",
    `*Generated at: ${new Date().toISOString()}*`,
    `*Total Files Analyzed:* ${files.length} | *Total Bytes:* ${(totalBytes / (1024 * 1024)).toFixed(2)} MB`,
    "",
    "## 1. Directory & Category Breakdown",
    "| Category | File Count | Description |",
    "| :--- | :--- | :--- |",
  ];

  for (const [cat, cnt] of Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])) {
    mdLines.push(`| **${cat}** | ${cnt} | ${getCategoryDescription(cat)} |`);
  }

  mdLines.push("", "## 2. Sensitive & Forensic Pattern Analysis in Source Code", "| Pattern | Total Occurrences | Files Affected | Sample Files |", "| :--- | :--- | :--- | :--- |");

  for (const [pat, data] of Object.entries(inventoryJson.patternOccurrences).sort((a, b) => b[1].count - a[1].count)) {
    const samples = data.sampleFiles.map((s) => `\`${path.basename(s)}\``).join(", ");
    mdLines.push(`| \`${pat}\` | ${data.count} | ${data.fileCount} | ${samples || "—"} |`);
  }

  mdLines.push(
    "",
    "## 3. Hardcoded EVM Address Footprint",
    `- **Total Hardcoded Address Matches:** ${hardcodedAddrs.totalMatches}`,
    `- **Files Containing Addresses:** ${Object.keys(hardcodedAddrs.sampleAddresses).length}`,
    "",
    "### Key Files with Address Dependencies:",
  );

  for (const [file, addrs] of Object.entries(hardcodedAddrs.sampleAddresses).slice(0, 15)) {
    mdLines.push(`- \`${file}\`: ${addrs.join(", ")}`);
  }

  mdLines.push(
    "",
    "## 4. Key Architectural Modules",
    "### Engines (`lib/security/engines/` and `lib/security/v2/`):",
    ...inventoryJson.keyArchitectureModules.engines.map((e) => `- \`${e}\``),
    "",
    "### Corpus & Mappings:",
    ...inventoryJson.keyArchitectureModules.corpus.map((c) => `- \`${c}\``),
    "",
    "### PDF Rendering:",
    ...inventoryJson.keyArchitectureModules.pdfGenerators.map((p) => `- \`${p}\``),
    "",
    "### Test Suites:",
    ...inventoryJson.keyArchitectureModules.tests.map((t) => `- \`${t}\``),
    "",
    "### State Files:",
    ...inventoryJson.keyArchitectureModules.stateFiles.map((s) => `- \`${s}\``),
  );

  const mdOutPath = path.join(ROOT_DIR, "reports/research/repository_inventory.md");
  fs.writeFileSync(mdOutPath, mdLines.join("\n"), "utf-8");
  console.log(`Wrote Markdown inventory to ${mdOutPath}`);

  buildCurrentArchitectureDoc(inventoryJson);
}

function getCategoryDescription(cat: string): string {
  switch (cat) {
    case "engine": return "Specialized asset security engines (EVM, Native, Market)";
    case "v2_engine": return "V2 security analysis engines (reentrancy, access control, etc.)";
    case "corpus": return "Master asset definitions and test vectors";
    case "pdf_generator": return "Customer-safe PDF renderers and typography fonts";
    case "security_module": return "Security guards, rate limiters, RLS, linters, digests";
    case "library": return "Shared TypeScript helpers and UI utilities";
    case "api_route": return "Next.js App Router API endpoints";
    case "app_route": return "Next.js frontend pages and layouts";
    case "component": return "React UI components and modals";
    case "test_adversarial": return "Red-team and mutation test harnesses";
    case "test_security": return "Security compliance, PKI, and parity tests";
    case "test_unit": return "Isolated unit tests for pricing, auth, provider";
    case "test_suite": return "Integration and benchmark suites";
    case "fixture": return "Mock and real contract test data fixtures";
    case "golden_corpus": return "Golden vulnerability benchmark contracts";
    case "script_furnace": return "Audit Furnace multi-tier generator and orchestrator";
    case "script": return "Maintenance, verification, and inspection scripts";
    case "report": return "Inspection outputs, audit notes, and logs";
    case "evidence_v3": return "Furnace V3 150-PDF corpus and cycle artifacts";
    case "evidence_v2": return "Legacy 50-PDF audit evidence corpus";
    case "artifact": return "Inspection checkpoints and past cycle outputs";
    case "documentation": return "Markdown manuals and architecture specs";
    case "state_file": return "Audit furnace and pass execution state JSONs";
    default: return "Miscellaneous configuration and source assets";
  }
}

function buildCurrentArchitectureDoc(inv: any) {
  const doc = `# VELMÈRE REAL CURRENT ARCHITECTURE AUDIT

*Generated during World-Class Evidence Intelligence Transformation*

---

## 1. Executive Assessment: Code vs Claims

A forensic inspection of the codebase reveals the discrepancy between documented claims and actual execution:

\`\`\`mermaid
flowchart TD
    subgraph Intake[Asset Ingestion]
        A[Input Asset Target: Address / Symbol] --> B[resolveAssetClass]
        B --> C[resolveContractAuditProfile]
    end

    subgraph ProfileBranch[Profile Resolution]
        C -->|Known in BENCHMARK_30| D[Static Hardcoded Benchmark Profile]
        C -->|Unknown / Unlisted| E[Dynamic Bytecode Disassembly]
    end

    subgraph Disassembly[Bytecode Analyzer]
        E --> F[analyzeEvmBytecode]
        F --> G[Extract Selectors & Opcode Patterns]
    end

    subgraph Vulnerability[Defect in Existing Architecture]
        F -->|Missing / Malformed Bytecode| H[FALLBACK DEFAULTING]
        H -->|Generates false-pass| I["Zero Destructive Opcodes: verified"]
        H -->|Generates false-pass| J["Clear / Guarded: verified"]
        H -->|Generates false-pass| K["Direct Execution Non-Proxy: verified"]
        H -->|Invented Score| L["riskScore = 72 (MODERATE RISK)"]
    end
\`\`\`

### 1.1 The Critical Finding: Fallback Over-Optimism
In \`lib/security/contract-audit-profiles.ts\`:
- When an asset is in \`BENCHMARK_30_CONTRACTS\`, a static pre-computed profile is returned.
- When an asset is NOT in the benchmark and bytecode is missing or empty, \`analyzeEvmBytecode("")\` returns an empty result, which is then mapped into optimistic positive assertions:
  - \`Dangerous Opcode Scan\`: \`"Zero Destructive Opcodes"\` (Status: \`verified\`)
  - \`Proxy Implementation Slot\`: \`"Direct Execution (Non-Proxy)"\` (Status: \`verified\`)
  - \`Spot AMM Oracle Sensitivity\`: \`"TWAP / No Spot Dependency"\` (Status: \`verified\`)
  - \`Reentrancy Mutation Scan\`: \`"Guarded / Clean Checks-Effects"\` (Status: \`verified\`)
  - \`Risk Score\`: A default synthetic formula calculates a score (e.g. \`72\`) rather than declaring **\`NOT SCORED / INSUFFICIENT EVIDENCE\`**!

This directly violates the core directive:
$$\\text{bytecode} == \\text{missing} \\implies \\text{bytecode-derived\\_claims} == 0$$
$$\\text{NO EVIDENCE} \\implies \\text{NO FACT}$$

---

## 2. Asset Class Firewall Assessment
- **Status:** Currently implemented in \`lib/security/asset-class-firewall.ts\` and \`lib/security/engines/\`.
- **Classification:** Routes to \`evm_contract\`, \`native_chain\`, or \`market_asset\`.
- **Strengths:**
  - Prevents EVM bytecode scanners from running on BTC or AAPL.
  - Successfully gates Mode B locked teasers so stock equities do not mention Solidity or EVM addresses.
- **Weaknesses:**
  - Lacks granular classification of \`TRADITIONAL_EQUITY\`, \`ETF\`, \`COMMODITY_FUTURE\`, \`FX\`, and \`SIMULATED_FIXTURE\`.
  - Does not have explicit \`supported_asset_classes[]\` array declared per engine analyzer for formal fail-closed assertion.

---

## 3. Claim & Evidence Provenance Assessment
- **Status:**
  - Reports compute a SHA-256 digest of the canonical JSON (\`reportDigest\`).
  - An Ed25519-like mock keypair exists in \`audit-pki-signature.ts\` but was signing a synthetic block rather than verified live evidence payloads.
  - **No explicit Claim model exists:** There are no unique \`claim_id\` values (e.g., \`CLM-EVM-000001\`) tied to individual statements.
  - **No explicit Evidence object exists:** Findings have a string property \`evidence: "..."\` instead of a relational link to an \`EVD-...\` evidence object with raw input hash, normalized input hash, source URI, and snapshot block.

---

## 4. Replay & Reproducibility Assessment
- **Status:**
  - Reports are deterministic when given the exact same input object.
  - **However**, there is no standalone \`velmere verify-report <file>\` or \`velmere verify-evidence <id>\` CLI or replay harness.
  - No snapshot differential analysis exists (comparing Snapshot A vs Snapshot B).

---

## 5. Architectural Transformation Requirements
To achieve **World-Class Evidence Intelligence**, the following layers are being built:
1. **Explicit Claim & Evidence Model** (\`lib/security/evidence/\`):
   - Every finding and metric generates a unique \`claim_id\` backed by an authentic \`evidence_id\` object.
2. **Fail-Closed Malformed Bytecode Guard** (\`lib/security/bytecode/\`):
   - Missing/malformed bytecode strictly sets bytecode-derived claims to 0 and marks security risk as \`NOT SCORED\`.
3. **Evidence Graph & Differential Engine** (\`lib/security/replay/\`):
   - Graph tracing from \`Asset -> Snapshot -> Source -> Observation -> Analysis -> Finding -> ScoreContribution\`.
4. **8 Canonical Asset Classes Firewall** (\`lib/security/firewall/\`):
   - Declares \`supported_asset_classes[]\` on each module with fail-closed rejection.
5. **Signed Cryptographic Attestation & Verification CLI** (\`scripts/velmere-cli.ts\`):
   - True digital signature with Ed25519 and complete verification tool.
`;

  const archPath = path.join(ROOT_DIR, "reports/research/current_architecture.md");
  fs.writeFileSync(archPath, doc, "utf-8");
  console.log(`Wrote architecture report to ${archPath}`);
}

runInventory();
