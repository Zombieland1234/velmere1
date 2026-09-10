import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import solc from "solc";
import { runVelmereTop5Detectors, type CanonicalFinding, type RuleId } from "../../lib/security/analyzer/vlm-top5-detectors.ts";
import { SmartContractAnalyzer } from "../../lib/security/analyzer/contract-analyzer.ts";

const fixturesDir = path.resolve(process.cwd(), "tests/fixtures/vlm-top5");

function compileSolidity(fileName: string) {
  const source = fs.readFileSync(path.join(fixturesDir, fileName), "utf8");
  const input = {
    language: "Solidity",
    sources: { [fileName]: { content: source } },
    settings: {
      optimizer: { enabled: false, runs: 200 },
      outputSelection: { "*": { "": ["ast"], "*": ["abi"] } },
    },
  };
  const out = JSON.parse(solc.compile(JSON.stringify(input)));
  if (out.errors?.some((e: any) => e.severity === "error")) {
    throw new Error(`Solc compilation error in ${fileName}: ` + JSON.stringify(out.errors, null, 2));
  }
  const ast = out.sources[fileName]?.ast;
  if (!ast) throw new Error(`Failed to extract AST for ${fileName}`);
  return { ast, source };
}

interface TestCase {
  file: string;
  expectedRule: RuleId | "";
  absentRule?: RuleId;
  network?: { isL2?: boolean; chainId?: number; networkName?: string };
  isControl: boolean;
}

const testCases: TestCase[] = [
  {
    file: "VLM_DEFI_4626_01_vulnerable.sol",
    expectedRule: "VLM-DEFI-4626-01",
    isControl: false,
  },
  {
    file: "VLM_DEFI_4626_01_control.sol",
    expectedRule: "",
    absentRule: "VLM-DEFI-4626-01",
    isControl: true,
  },
  {
    file: "VLM_DEFI_REENT_RO_01_vulnerable.sol",
    expectedRule: "VLM-DEFI-REENT-RO-01",
    isControl: false,
  },
  {
    file: "VLM_DEFI_REENT_RO_01_control.sol",
    expectedRule: "",
    absentRule: "VLM-DEFI-REENT-RO-01",
    isControl: true,
  },
  {
    file: "VLM_AUTH_EIP712_01_vulnerable.sol",
    expectedRule: "VLM-AUTH-EIP712-01",
    isControl: false,
  },
  {
    file: "VLM_AUTH_EIP712_01_control.sol",
    expectedRule: "",
    absentRule: "VLM-AUTH-EIP712-01",
    isControl: true,
  },
  {
    file: "VLM_ERC20_SEM_01_vulnerable.sol",
    expectedRule: "VLM-ERC20-SEM-01",
    isControl: false,
  },
  {
    file: "VLM_ERC20_SEM_01_control.sol",
    expectedRule: "",
    absentRule: "VLM-ERC20-SEM-01",
    isControl: true,
  },
  {
    file: "VLM_ORACLE_LINK_01_vulnerable.sol",
    expectedRule: "VLM-ORACLE-LINK-01",
    network: { isL2: true, chainId: 8453, networkName: "Base" },
    isControl: false,
  },
  {
    file: "VLM_ORACLE_LINK_01_control.sol",
    expectedRule: "",
    absentRule: "VLM-ORACLE-LINK-01",
    network: { isL2: true, chainId: 8453, networkName: "Base" },
    isControl: true,
  },
];

console.log("\n========================================================");
console.log("   VELMÈRE TOP-5 DETECTOR PACK — MASTER REGRESSION");
console.log("========================================================\n");

let passedAssertions = 0;

for (const tc of testCases) {
  const { ast, source } = compileSolidity(tc.file);

  // 1. Direct Compiler AST Top-5 Detector Evaluation
  const astFindings = runVelmereTop5Detectors(ast, { network: tc.network });
  const astRules = astFindings.map((f) => f.ruleId);

  // 2. Full SmartContractAnalyzer Integration Evaluation
  const fullAnalysis = SmartContractAnalyzer.analyze("AUDIT-TOP5-MASTER", source, tc.file, {
    network: tc.network,
    astRoot: ast,
  });
  const analyzerRules = fullAnalysis.findings.map((f) => f.ruleId).filter(Boolean);

  if (tc.expectedRule) {
    // Assert detected in AST detector
    assert.ok(
      astRules.includes(tc.expectedRule),
      `FAIL: ${tc.file} expected AST detector rule ${tc.expectedRule}, got [${astRules.join(", ")}]`
    );
    // Assert detected in integrated analyzer
    assert.ok(
      analyzerRules.includes(tc.expectedRule),
      `FAIL: ${tc.file} expected analyzer rule ${tc.expectedRule}, got [${analyzerRules.join(", ")}]`
    );

    const matchFinding = fullAnalysis.findings.find((f) => f.ruleId === tc.expectedRule)!;
    assert.ok(matchFinding, "Finding must be attached");
    assert.ok(matchFinding.structuredEvidence && matchFinding.structuredEvidence.length > 0, "Must have evidence graph");
    assert.ok(matchFinding.fingerprint && matchFinding.fingerprint.length === 64, "Must have 64-char SHA256 fingerprint");

    console.log(
      `[PASS] [VULNERABLE] ${tc.file.padEnd(35)} -> CAUGHT: ${tc.expectedRule.padEnd(22)} (${matchFinding.title})`
    );
  } else if (tc.absentRule) {
    // Assert absent in AST detector (No False Positives)
    assert.ok(
      !astRules.includes(tc.absentRule),
      `FAIL: Control fixture ${tc.file} unexpectedly emitted ${tc.absentRule} in AST detector!`
    );
    // Assert absent in integrated analyzer
    assert.ok(
      !analyzerRules.includes(tc.absentRule),
      `FAIL: Control fixture ${tc.file} unexpectedly emitted ${tc.absentRule} in analyzer!`
    );

    console.log(
      `[PASS] [CONTROL]    ${tc.file.padEnd(35)} -> CLEAN:  0 false positives for ${tc.absentRule}`
    );
  }

  passedAssertions += 2;
}

console.log("\n========================================================");
console.log(` ALL ${passedAssertions}/${testCases.length * 2} DUAL-LAYER INSTITUTIONAL ASSERTIONS PASSED (100%) `);
console.log("========================================================\n");
