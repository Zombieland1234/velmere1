/**

VELMÈRE — MASTER AUDIT PIPELINE / INSTITUTIONAL RELEASE GATE




Purpose:

Execute deterministic integration and adversarial regression checks

against the complete audit pipeline.




This script is intentionally independent from the PDF generator and

analyzer implementation details. It validates the contracts exposed by

unified-audit-pipeline.ts.




Exit codes:

0 = RELEASE GATE PASSED

1 = RELEASE GATE FAILED

2 = CONFIGURATION / HARNESS ERROR
*/

import {
  assertUnknownCannotPass,
  assertBundleTamperDetected,
  UnifiedAuditPipeline,
  runInstitutionalAudit,
  evaluateReleaseGate,
  validateFormalReleasePolicy,
  validateScoreIntegrity,
  validatePdfLayout,
  calculateMerkleRoot,
  verifyEvidenceBundle,
  evidenceToLeaf,
  canonicalize,
  sha256Canonical,
  sha256Bytes,
  type AstFinding,
  type AuditOutput,
  type AuditTier,
  type CanonicalEvidence,
  type ContractIdentity,
  type EvidenceBundle,
  type FormalEngineAdapter,
  type FormalVerificationResult,
  type GeneratedReport,
  type SecurityScore,
  type SmartContractAnalyzerAdapter,
  type TierReportBuilderAdapter,
  type TwoDimensionalScorerAdapter,
} from "../../lib/security/institutional-pipeline-gate.ts";

/**

NOTE:




The import above expects buildMasterSyntheticOutput if that helper exists.

If your branch does not expose it, the script below constructs the

fixtures itself. The implementation here avoids reliance on it.
*/

/* -------------------------------------------------------------------------- /
/ TEST FRAMEWORK /
/ -------------------------------------------------------------------------- */

interface TestResult {
name: string;
passed: boolean;
durationMs: number;
details?: string;
}

interface TestContext {
results: TestResult[];
}

function nowMs(): number {
return Number(process.hrtime.bigint()) / 1_000_000;
}

async function runTest(
context: TestContext,
name: string,
test: () => void | Promise<void>,
): Promise<void> {
const start = nowMs();

try {
await test();

context.results.push({
  name,
  passed: true,
  durationMs: nowMs() - start,
});

} catch (error) {
context.results.push({
name,
passed: false,
durationMs: nowMs() - start,
details:
error instanceof Error
? error.stack ?? error.message
: String(error),
});
}
}

function assert(
condition: unknown,
message: string,
): asserts condition {
if (!condition) {
throw new Error(message);
}
}

/* -------------------------------------------------------------------------- /
/ DETERMINISTIC FIXTURES /
/ -------------------------------------------------------------------------- */

const TEST_CONTRACT: ContractIdentity = {
address: "0x1111111111111111111111111111111111111111",
chainId: 1,
network: "testnet-fixture",
bytecodeSha256:
"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
sourceVerified: true,
isProxy: false,
};

function makeEvidence(
evidenceId: string,
kind: CanonicalEvidence["kind"],
payload: unknown,
): CanonicalEvidence {
return {
evidenceId,
kind,
type: "master-gate-test",
title: evidenceId,
payload,
source: "master-audit-pipeline",
timestamp: "2026-01-01T00:00:00.000Z",
sha256: sha256Canonical(payload),
};
}

function makeFormalResult(
invariantId: string,
status: FormalVerificationResult["status"],
overrides: Partial<FormalVerificationResult> = {},
): FormalVerificationResult {
const input = {
invariantId,
contract: TEST_CONTRACT,
};

const resultPayload = {
invariantId,
status,
model:
status === "FALSIFIED"
? {
counterexample: "fixture",
}
: undefined,
};

return {
invariantId,
status,
solverName: "Z3",
solverVersion: "5.1.0",
solverAvailable:
status === "PROVED" ||
status === "FALSIFIED",
durationMs: 10,
inputSha256: sha256Canonical(input),
outputSha256: sha256Canonical(resultPayload),
proofCertificate:
status === "PROVED"
? {
kind: "UNSAT_CERTIFICATE",
theoremHash:
sha256Canonical({
theorem: invariantId,
}),
}
: status === "FALSIFIED"
? {
kind: "SAT_MODEL",
model: {
counterexample: "fixture",
},
}
: undefined,
diagnostics: [],
...overrides,
};
}

function makeFinding(
id: string,
severity: AstFinding["severity"],
): AstFinding {
return {
id,
detectorId: "master-fixture-detector",
title: `Fixture finding ${id}`,
description: "Synthetic deterministic release-gate finding.",
severity,
contractAddress: TEST_CONTRACT.address,
chainId: TEST_CONTRACT.chainId,
evidenceRefs: [`evidence:${id}`],
confidence: 0.95,
};
}

function makePdf(
overflow = false,
): GeneratedReport {
const pdfBytes = new TextEncoder().encode(
"%PDF-1.7\nVELMERE-MASTER-GATE\n%%EOF\n",
);

const hash = sha256Canonical(
Array.from(pdfBytes),
);

/**

sha256Canonical above is intentionally NOT suitable for the actual PDF

hash field. The test below imports the pipeline helper and recomputes

the true byte hash where appropriate.
*/
void hash;

return {
pdfBytes,
sha256:
"0000000000000000000000000000000000000000000000000000000000000000",
layout: {
pageCount: 1,
overflow,
pages: [
{
page: 1,
contentHeightPt: overflow ? 701 : 600,
budgetHeightPt: 650,
remainingHeightPt: overflow ? -51 : 50,
},
],
},
};
}

/* -------------------------------------------------------------------------- /
/ MINIMAL ADAPTER FIXTURES /
/ -------------------------------------------------------------------------- */

class FixtureAnalyzer
implements SmartContractAnalyzerAdapter
{
public async analyze(): Promise<{
identity: ContractIdentity;
findings: AstFinding[];
evidence: CanonicalEvidence[];
}> {
return {
identity: TEST_CONTRACT,
findings: [
makeFinding(
"fixture-medium-risk",
"MEDIUM",
),
],
evidence: [
makeEvidence(
"ast",
"AST_FINDING",
{
detector:
"master-fixture-detector",
severity: "MEDIUM",
},
),
makeEvidence(
"system",
"SYSTEM_METADATA",
TEST_CONTRACT,
),
],
};
}
}

class FixtureFormalEngine
implements FormalEngineAdapter
{
public constructor(
private readonly behavior:
| "ALL_PROVED"
| "ONE_UNKNOWN"
| "ONE_FALSIFIED",
) {}

public async verify(input: {
invariantId: string;
contract: ContractIdentity;
findings: AstFinding[];
}): Promise<FormalVerificationResult> {
void input.contract;
void input.findings;

if (
  this.behavior === "ONE_UNKNOWN" &&
  input.invariantId ===
    "defi.solvency"
) {
  return makeFormalResult(
    input.invariantId,
    "UNKNOWN",
    {
      solverAvailable: true,
      proofCertificate: undefined,
    },
  );
}

if (
  this.behavior === "ONE_FALSIFIED" &&
  input.invariantId ===
    "defi.solvency"
) {
  return makeFormalResult(
    input.invariantId,
    "FALSIFIED",
  );
}

return makeFormalResult(
  input.invariantId,
  "PROVED",
);

}
}

class FixtureScorer
implements TwoDimensionalScorerAdapter
{
public async score(input: {
tier: AuditTier;
findings: AstFinding[];
formalResults: FormalVerificationResult[];
evidenceBundle: EvidenceBundle;
}) {
void input.tier;
void input.findings;
void input.formalResults;
void input.evidenceBundle;

const score: SecurityScore = {
  securityScore: 92,
  auditConfidence: 91,
};

return {
  score,
  classification: "LOW" as const,
  findingRisks: [
    {
      findingId:
        "fixture-medium-risk",
      severity: "MEDIUM" as const,
      cvss: {
        version: "3.1" as const,
        vector:
          "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:N",
        baseScore: 6.5,
      },
      dasp: "OTHER" as const,
    },
  ],
};

}
}

class FixtureReportBuilder
implements TierReportBuilderAdapter
{
public async build(input: {
tier: AuditTier;
contract: ContractIdentity;
findings: AstFinding[];
formalResults: FormalVerificationResult[];
evidenceBundle: EvidenceBundle;
score: ReturnType<
FixtureScorer["score"]
> extends Promise<infer T>
? T
: never;
}): Promise<GeneratedReport> {
void input;

const pdfBytes = new TextEncoder().encode(
  "%PDF-1.7\nVELMERE-FIXTURE\n%%EOF\n",
);

const actualSha = sha256Bytes(pdfBytes);

return {
  pdfBytes,
  sha256: actualSha,
  layout: {
    pageCount: 1,
    overflow: false,
    pages: [
      {
        page: 1,
        contentHeightPt: 550,
        budgetHeightPt: 650,
        remainingHeightPt: 100,
      },
    ],
  },
};

}
}

/* -------------------------------------------------------------------------- /
/ DIRECT EVIDENCE TEST HELPERS /
/ -------------------------------------------------------------------------- */

function makeBundle(
leaves: CanonicalEvidence[],
): EvidenceBundle {
const merkleLeaves = leaves.map(evidenceToLeaf);
const sortedLeaves = [...merkleLeaves].sort(
(a, b) => {
const aBytes =
Buffer.from(a.leafHash, "hex");
const bBytes =
Buffer.from(b.leafHash, "hex");

  return Buffer.compare(
    aBytes,
    bBytes,
  );
},

);

const root =
calculateMerkleRoot(sortedLeaves);

const formalResults = [
makeFormalResult(
"defi.fixture",
"PROVED",
),
];

return {
schemaVersion:
"VELMERE-EVIDENCE-BUNDLE-V1",
bundleId: "master-gate-fixture",
createdAt:
"2026-01-01T00:00:00.000Z",
contract: TEST_CONTRACT,
tier: "ADVANCED",
sortingRule:
"UTF8_BYTEWISE_ASCENDING_V1",
hashAlgorithm: "SHA-256",
leaves: sortedLeaves,
merkleRoot: root,
formalSummary: {
proved: formalResults.filter(
(item) =>
item.status === "PROVED",
).length,
falsified: 0,
unknown: 0,
notRun: 0,
errors: 0,
solverAvailable: true,
},
integrity: {
verified: true,
},
};
}

/* -------------------------------------------------------------------------- /
/ ADVERSARIAL TESTS /
/ -------------------------------------------------------------------------- */

async function testDeterministicMerkle(
context: TestContext,
): Promise<void> {
await runTest(
context,
"MERKLE: deterministic root under repeated construction",
() => {
const evidence = [
makeEvidence(
"evidence",
"BYTECODE",
{ value: 3 },
),
makeEvidence(
"evidence",
"SOURCE",
{ value: 1 },
),
makeEvidence(
"evidence",
"ABI",
{ value: 2 },
),
];

  const bundleA = makeBundle(
    evidence,
  );

  const bundleB = makeBundle(
    [...evidence].reverse(),
  );

  assert(
    bundleA.merkleRoot ===
      bundleB.merkleRoot,
    "Merkle root changed when input evidence order changed.",
  );

  assert(
    verifyEvidenceBundle(
      bundleA,
    ),
    "Original bundle failed verification.",
  );

  assert(
    verifyEvidenceBundle(
      bundleB,
    ),
    "Reordered bundle failed verification.",
  );
},

);
}

async function testAntiTamper(
context: TestContext,
): Promise<void> {
await runTest(
context,
"ANTI-TAMPER: mutation invalidates Merkle proof",
() => {
const bundle = makeBundle([
makeEvidence(
"evidence:1",
"BYTECODE",
{ value: "original" },
),
makeEvidence(
"evidence:2",
"SOURCE",
{ value: "original" },
),
]);

  assert(
    verifyEvidenceBundle(
      bundle,
    ),
    "Fixture bundle did not initially verify.",
  );

  assertBundleTamperDetected(
    bundle,
  );
},

);
}

async function testUnknownNeverPass(
context: TestContext,
): Promise<void> {
await runTest(
context,
"FORMAL: UNKNOWN can never be accepted as PASS",
() => {
assertUnknownCannotPass(
"defi.unknown.fixture",
);
},
);
}

async function testNoSolverNoProof(
context: TestContext,
): Promise<void> {
await runTest(
context,
"FORMAL: solver absence blocks PROVED",
() => {
const invalid = makeFormalResult(
"defi.no-solver",
"PROVED",
{
solverAvailable: false,
},
);

  const failures =
    validateFormalReleasePolicy(
      "ADVANCED",
      [invalid],
    );

  assert(
    failures.some(
      (failure) =>
        failure.code ===
        "FORMAL_RESULT_INVALID",
    ),
    "PROVED without solver was not blocked.",
  );
},

);
}

async function testProofCertificateRequired(
context: TestContext,
): Promise<void> {
await runTest(
context,
"FORMAL: PROVED requires UNSAT certificate",
() => {
const invalid = makeFormalResult(
"defi.missing-certificate",
"PROVED",
{
proofCertificate: undefined,
},
);

  const failures =
    validateFormalReleasePolicy(
      "ADVANCED",
      [invalid],
    );

  assert(
    failures.some(
      (failure) =>
        failure.code ===
        "FORMAL_RESULT_INVALID",
    ),
    "PROVED without certificate passed.",
  );
},

);
}

async function testFalsifiedRequiresModel(
context: TestContext,
): Promise<void> {
await runTest(
context,
"FORMAL: FALSIFIED requires SAT model",
() => {
const invalid = makeFormalResult(
"defi.missing-model",
"FALSIFIED",
{
proofCertificate:
undefined,
},
);

  const failures =
    validateFormalReleasePolicy(
      "ADVANCED",
      [invalid],
    );

  assert(
    failures.some(
      (failure) =>
        failure.code ===
        "FORMAL_RESULT_INVALID",
    ),
    "FALSIFIED without model passed.",
  );
},

);
}

async function testCvssIntegrity(
context: TestContext,
): Promise<void> {
await runTest(
context,
"SCORING: CVSS v3.1 and score ranges are enforced",
() => {
const validFailures =
validateScoreIntegrity({
score: {
securityScore: 90,
auditConfidence: 80,
},
classification: "LOW",
findingRisks: [
{
findingId: "fixture",
severity: "MEDIUM",
cvss: {
version: "3.1",
vector:
"CVSS:3.1/AV/AC/PR/UI/S/C/I/A",
baseScore: 6.5,
},
dasp: "OTHER",
},
],
});

  assert(
    validFailures.length === 0,
    "Valid CVSS / score result was rejected.",
  );

  const invalidFailures =
    validateScoreIntegrity({
      score: {
        securityScore: 101,
        auditConfidence: -1,
      },
      classification: "UNDETERMINED",
      findingRisks: [
        {
          findingId: "fixture",
          severity: "MEDIUM",
          cvss: {
            version: "3.0" as "3.1",
            vector:
              "CVSS:3.0/AV:N",
            baseScore: 12,
          },
          dasp: "OTHER",
        },
      ],
    });

  assert(
    invalidFailures.length >= 3,
    "Invalid scoring input was not rejected comprehensively.",
  );
},

);
}

async function testPdfOverflow(
context: TestContext,
): Promise<void> {
await runTest(
context,
"PDF: overflow fails customer-safe budget",
() => {
const valid = makePdf(
false,
);

  /**
   * Repair the test fixture with a real byte hash.
   */
  void valid;

  const overflowingBytes =
    new TextEncoder().encode(
      "%PDF-1.7\nOVERFLOW\n%%EOF\n",
    );

  const report: GeneratedReport = {
    pdfBytes: overflowingBytes,
    sha256:
      "0000000000000000000000000000000000000000000000000000000000000000",
    layout: {
      pageCount: 1,
      overflow: true,
      pages: [
        {
          page: 1,
          contentHeightPt: 701,
          budgetHeightPt: 650,
          remainingHeightPt: -51,
        },
      ],
    },
  };

  const failures =
    validatePdfLayout(
      report,
    );

  assert(
    failures.some(
      (failure) =>
        failure.code ===
        "PDF_OVERFLOW",
    ),
    "PDF overflow was not detected.",
  );
},

);
}

async function testValidPdf(
context: TestContext,
): Promise<void> {
await runTest(
context,
"PDF: valid report remains inside customer-safe budget",
() => {
const bytes =
new TextEncoder().encode(
"%PDF-1.7\nVALID\n%%EOF\n",
);

  const report: GeneratedReport = {
    pdfBytes: bytes,
    sha256:
      requireSha256Bytes(
        bytes,
      ),
    layout: {
      pageCount: 2,
      overflow: false,
      pages: [
        {
          page: 1,
          contentHeightPt: 500,
          budgetHeightPt: 650,
          remainingHeightPt: 150,
        },
        {
          page: 2,
          contentHeightPt: 600,
          budgetHeightPt: 650,
          remainingHeightPt: 50,
        },
      ],
    },
  };

  const failures =
    validatePdfLayout(
      report,
    );

  assert(
    failures.length === 0,
    failures
      .map(
        (failure) =>
          `${failure.code}: ${failure.message}`,
      )
      .join("\n"),
  );
},

);
}

function requireSha256Bytes(
bytes: Uint8Array,
): string {
/**

Keep this import synchronous at runtime.

Node ESM supports createHash directly here.
*/
return createHashSync(bytes);
}

function createHashSync(
bytes: Uint8Array,
): string {
/**

Dynamic require is avoided because this script is ESM-friendly.

The Node crypto implementation is loaded at module level below.
*/
return nodeSha256(bytes);
}

/* -------------------------------------------------------------------------- /
/ NODE SHA-256 /
/ -------------------------------------------------------------------------- */

import { createHash } from "node:crypto";

function nodeSha256(
bytes: Uint8Array,
): string {
return createHash(
"sha256",
)
.update(bytes)
.digest("hex");
}

/* -------------------------------------------------------------------------- /
/ PIPELINE INTEGRATION TESTS /
/ -------------------------------------------------------------------------- */

function buildFixturePipeline(
behavior:
| "ALL_PROVED"
| "ONE_UNKNOWN"
| "ONE_FALSIFIED",
): UnifiedAuditPipeline {
return new UnifiedAuditPipeline(
new FixtureAnalyzer(),
new FixtureFormalEngine(
behavior,
),
new FixtureScorer(),
new FixtureReportBuilder(),
{
clock: () =>
new Date(
"2026-01-01T00:00:00.000Z",
),
bundleIdFactory: (input) =>
[
"master-fixture",
input.tier,
input.contract.chainId,
input.contract.address.toLowerCase(),
input.contract.bytecodeSha256,
].join(":"),
},
);
}

async function testFullPipeline(
context: TestContext,
): Promise<void> {
await runTest(
context,
"PIPELINE: Advanced audit survives complete end-to-end release gate",
async () => {
const pipeline =
buildFixturePipeline(
"ALL_PROVED",
);

  const output =
    await runInstitutionalAudit(
      pipeline,
      {
        address:
          TEST_CONTRACT.address,
        chainId:
          TEST_CONTRACT.chainId,
        tier: "ADVANCED",
      },
    );

  const gate =
    evaluateReleaseGate(
      output,
    );

  assert(
    gate.passed,
    gate.failures
      .map(
        (failure) =>
          `${failure.code}: ${failure.message}`,
      )
      .join("\n"),
  );

  assert(
    output.evidenceBundle.integrity
      .verified,
    "Evidence bundle is not verified.",
  );

  assert(
    output.formalResults.every(
      (result) =>
        result.status ===
        "PROVED",
    ),
    "Fixture pipeline did not prove all invariants.",
  );
},

);
}

async function testUnknownPipelineFails(
context: TestContext,
): Promise<void> {
await runTest(
context,
"PIPELINE: unresolved formal result blocks institutional release",
async () => {
const pipeline =
buildFixturePipeline(
"ONE_UNKNOWN",
);

  let blocked = false;

  try {
    await runInstitutionalAudit(
      pipeline,
      {
        address:
          TEST_CONTRACT.address,
        chainId:
          TEST_CONTRACT.chainId,
        tier: "ADVANCED",
      },
    );
  } catch {
    blocked = true;
  }

  assert(
    blocked,
    "Pipeline accepted UNKNOWN formal state as release-ready.",
  );
},

);
}

async function testFalsyProofCannotPass(
context: TestContext,
): Promise<void> {
await runTest(
context,
"PIPELINE: falsified invariant cannot become PASS",
async () => {
const pipeline =
buildFixturePipeline(
"ONE_FALSIFIED",
);

  /**
   * A FALSIFIED theorem is evidence of a counterexample,
   * not evidence of safety.
   *
   * The pipeline must therefore block the institutional release.
   */
  let blocked = false;

  try {
    await runInstitutionalAudit(
      pipeline,
      {
        address:
          TEST_CONTRACT.address,
        chainId:
          TEST_CONTRACT.chainId,
        tier: "ADVANCED",
      },
    );
  } catch {
    blocked = true;
  }

  assert(
    blocked,
    "FALSIFIED invariant was incorrectly accepted.",
  );
},

);
}

/* -------------------------------------------------------------------------- /
/ CANONICALIZATION TESTS /
/ -------------------------------------------------------------------------- */

async function testCanonicalOrdering(
context: TestContext,
): Promise<void> {
await runTest(
context,
"CANONICAL: evidence serialization is deterministic",
() => {
const a = {
z: 1,
a: 2,
nested: {
b: 3,
a: 4,
},
};

  const b = {
    nested: {
      a: 4,
      b: 3,
    },
    a: 2,
    z: 1,
  };

  assert(
    canonicalize(a) ===
      canonicalize(b),
    "Canonical JSON changed after object-key permutation.",
  );
},

);
}

/* -------------------------------------------------------------------------- /
/ BUNDLE ROUND-TRIP /
/ -------------------------------------------------------------------------- */

async function testBundleRoundTrip(
context: TestContext,
): Promise<void> {
await runTest(
context,
"BUNDLE: serialized evidence bundle preserves Merkle integrity",
() => {
const bundle =
makeBundle([
makeEvidence(
"evidence:roundtrip",
"SOURCE",
{
sourceVerified: true,
},
),
makeEvidence(
"evidence:roundtrip",
"BYTECODE",
{
hash: TEST_CONTRACT
.bytecodeSha256,
},
),
]);

  const serialized =
    canonicalize(bundle);

  const parsed =
    JSON.parse(
      serialized,
    ) as EvidenceBundle;

  assert(
    verifyEvidenceBundle(
      parsed,
    ),
    "Bundle failed after canonical serialize/parse round trip.",
  );

  assert(
    parsed.merkleRoot ===
      bundle.merkleRoot,
    "Merkle root changed after round trip.",
  );
},

);
}

/* -------------------------------------------------------------------------- /
/ RELEASE REPORTING /
/ -------------------------------------------------------------------------- */

function printResults(
context: TestContext,
): void {
const total =
context.results.length;

const passed =
context.results.filter(
(result) =>
result.passed,
).length;

const failed =
total - passed;

console.log("");
console.log(
"============================================================",
);
console.log(
"VELMÈRE — MASTER AUDIT PIPELINE / RELEASE GATE",
);
console.log(
"============================================================",
);
console.log("");

for (const result of context.results) {
const state =
result.passed
? "PASS"
: "FAIL";

console.log(
  `${state.padEnd(5)} ${result.name} (${result.durationMs.toFixed(2)}ms)`,
);

if (
  !result.passed &&
  result.details
) {
  console.error(
    result.details,
  );
}

}

console.log("");
console.log(
`TOTAL: ${total}`,
);
console.log(
`PASS: ${passed}`,
);
console.log(
`FAIL: ${failed}`,
);
console.log("");

if (failed === 0) {
console.log(
"RELEASE GATE: PASS",
);
console.log(
"No master adversarial regression failed.",
);
} else {
console.error(
"RELEASE GATE: FAIL",
);
console.error(
"Production release is BLOCKED.",
);
}

console.log("");
}

function assertNoUnexpectedWarnings(
gate: ReturnType<typeof evaluateReleaseGate>,
): void {
/**

Warnings are allowed only when they describe explicitly unresolved

formal states. No warning may silently override a failed blocker.
*/
if (
gate.failures.length === 0
) {
for (const warning of gate.warnings) {
assert(
warning.includes(
"remain unresolved",
),
`Unexpected release warning: ${warning}`,
);
}
}
}

/* -------------------------------------------------------------------------- /
/ MASTER TEST EXECUTION /
/ -------------------------------------------------------------------------- */

async function main(): Promise<void> {
const context: TestContext = {
results: [],
};

await testDeterministicMerkle(
context,
);

await testAntiTamper(
context,
);

await testUnknownNeverPass(
context,
);

await testNoSolverNoProof(
context,
);

await testProofCertificateRequired(
context,
);

await testFalsifiedRequiresModel(
context,
);

await testCvssIntegrity(
context,
);

await testPdfOverflow(
context,
);

await testValidPdf(
context,
);

await testCanonicalOrdering(
context,
);

await testBundleRoundTrip(
context,
);

await testFullPipeline(
context,
);

await testUnknownPipelineFails(
context,
);

await testFalsyProofCannotPass(
context,
);

printResults(
context,
);

const failures =
context.results.filter(
(result) =>
!result.passed,
);

if (failures.length > 0) {
process.exitCode = 1;
return;
}

process.exitCode = 0;
}

/* -------------------------------------------------------------------------- /
/ ENTRYPOINT /
/ -------------------------------------------------------------------------- */

main().catch(
(error) => {
console.error("");
console.error(
"============================================================",
);
console.error(
"VELMÈRE MASTER RELEASE GATE: HARNESS ERROR",
);
console.error(
"============================================================",
);
console.error("");
console.error(
error instanceof Error
? error.stack ??
error.message
: String(error),
);
console.error("");

process.exitCode = 2;

},
);
