import { strict as assert } from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { resolveAssetClass } from "../../lib/security/asset-class-firewall";

interface GoldenTestCase {
  id: string;
  name: string;
  description: string;
  expectedAssetClass: string;
  targetAddress: string;
  expectedFindings: string[];
  expectedNonFindings: string[];
  expectedEvidenceStates: Record<string, string>;
  expectedConfidenceBounds: { min: number; max: number };
  expectedScoreRange: { minRisk: number; maxRisk: number };
}

console.log("=== RUNNING GOLDEN SECURITY CORPUS HARNESS ===");

const corpusDir = path.resolve(process.cwd(), "tests/fixtures/golden-security-corpus");
const files = fs.readdirSync(corpusDir).filter(f => f.endsWith(".json"));

assert.ok(files.length >= 14, `Expected at least 14 golden corpus cases, found ${files.length}`);

let evaluatedCount = 0;

for (const file of files) {
  const fullPath = path.join(corpusDir, file);
  const raw = fs.readFileSync(fullPath, "utf8");
  const testCase: GoldenTestCase = JSON.parse(raw);

  evaluatedCount++;
  console.log(`[${testCase.id}] Evaluating ${testCase.name}...`);

  // 1. Asset Class Isolation Validation
  const assetClass = resolveAssetClass(testCase.targetAddress);
  assert.equal(
    assetClass,
    testCase.expectedAssetClass,
    `Asset class mismatch for ${testCase.name}. Expected ${testCase.expectedAssetClass}, got ${assetClass}`
  );

  // 2. Expected Findings Invariant Check
  assert.ok(Array.isArray(testCase.expectedFindings) && testCase.expectedFindings.length > 0);
  for (const finding of testCase.expectedFindings) {
    assert.ok(typeof finding === "string" && finding.length > 3);
  }

  // 3. Expected Non-Findings Invariant Check
  assert.ok(Array.isArray(testCase.expectedNonFindings) && testCase.expectedNonFindings.length > 0);
  for (const nonFinding of testCase.expectedNonFindings) {
    // Assert no overlap between findings and non-findings
    assert.ok(
      !testCase.expectedFindings.includes(nonFinding),
      `Contradiction in ${testCase.name}: "${nonFinding}" exists in both findings and non-findings`
    );
  }

  // 4. Evidence States Invariant
  assert.ok(Object.keys(testCase.expectedEvidenceStates).length > 0);
  for (const [checkName, state] of Object.entries(testCase.expectedEvidenceStates)) {
    assert.ok(
      ["PASS", "FAIL", "UNVERIFIED", "NOT_APPLICABLE", "UNAVAILABLE"].includes(state),
      `Invalid evidence state "${state}" for check "${checkName}" in ${testCase.name}`
    );
  }

  // 5. Confidence Bounds Invariant [0, 100]
  assert.ok(testCase.expectedConfidenceBounds.min >= 0 && testCase.expectedConfidenceBounds.min <= 100);
  assert.ok(testCase.expectedConfidenceBounds.max >= 0 && testCase.expectedConfidenceBounds.max <= 100);
  assert.ok(testCase.expectedConfidenceBounds.min <= testCase.expectedConfidenceBounds.max);

  // 6. Score Range Invariant [0, 100]
  assert.ok(testCase.expectedScoreRange.minRisk >= 0 && testCase.expectedScoreRange.minRisk <= 100);
  assert.ok(testCase.expectedScoreRange.maxRisk >= 0 && testCase.expectedScoreRange.maxRisk <= 100);
  assert.ok(testCase.expectedScoreRange.minRisk <= testCase.expectedScoreRange.maxRisk);
}

console.log(`✔ SUCCESS: All ${evaluatedCount} Golden Security Corpus test cases passed validation.`);
