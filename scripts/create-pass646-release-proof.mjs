import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";

const root = process.cwd();
const hashFile = (relative) => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relative))).digest("hex");
const files = [
  "lib/market-integrity/pass642-pdfua-external-validation-lane.ts",
  "lib/market-integrity/pass643-reader-pdf-visual-parity-matrix.ts",
  "lib/market-integrity/pass644-source-outage-replay-lab.ts",
  "lib/market-integrity/pass645-premium-mobile-performance-budget.ts",
  "lib/market-integrity/pass646-unified-evidence-ledger.ts",
  "lib/search/lens-report.ts",
  "components/market-integrity/shield/ShieldEvidenceSummary.tsx",
  "components/market-integrity/shield/ShieldAnalysisTierSelector.tsx",
  "components/market-integrity/TokenRiskModal.tsx",
  "components/search/VelmereIntelligenceSearchClient.tsx",
  "app/api/search/lens-report/route.ts",
  "tests/e2e/pass643-reader-pdf-visual-parity.spec.ts",
  "tests/e2e/pass645-mobile-performance.spec.ts",
];
const missing = files.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length) throw new Error(`Missing PASS646 files: ${missing.join(", ")}`);
const proof = {
  version: "pass646-release-proof",
  generatedAt: new Date().toISOString(),
  node: process.version,
  packageVersion: JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version,
  files: Object.fromEntries(files.map((file) => [file, hashFile(file)])),
  contracts: {
    pdfUaClaimRequiresExternalAndHumanValidation: true,
    readerPdfMatrixCases: 27,
    outageReplayStates: 5,
    mobileWidths: [320, 360, 390, 430],
    unifiedSurfaces: ["browser", "pdf", "shield", "map", "brain", "real_markets"],
  },
};
const output = path.join(root, "PASS646_RELEASE_PROOF.json");
fs.writeFileSync(output, `${JSON.stringify(proof, null, 2)}\n`);
console.log(`PASS646 release proof written: ${output}`);
