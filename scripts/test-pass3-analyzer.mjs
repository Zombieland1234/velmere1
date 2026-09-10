import { SmartContractAnalyzer } from "../lib/security/analyzer/contract-analyzer.ts";

console.log("=== TESTING PASS 3: SMART CONTRACT STATIC ANALYZER & AST ===");

const sampleSolidity = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract VulnerableVault {
    address public owner;
    mapping(address => uint256) public balances;

    constructor() {
        owner = msg.sender;
    }

    function withdraw() external {
        uint256 bal = balances[msg.sender];
        require(bal > 0, "No balance");
        (bool ok, ) = msg.sender.call{value: bal}("");
        require(ok, "Transfer failed");
        balances[msg.sender] = 0; // CEI violation!
    }

    function transferOwnership(address newOwner) external {
        require(tx.origin == owner, "Not owner"); // tx.origin violation!
        owner = newOwner;
    }
}
`;

const result = SmartContractAnalyzer.analyze("AUD-TEST-VAULT", sampleSolidity, "VulnerableVault.sol");

console.log("Analysis Output:");
console.log("- Source provenance:", result.sourceProvenance);
console.log("- Contracts extracted:", result.contracts.map((c) => c.name));
console.log("- Proxy Status:", result.proxy.status, `(${result.proxy.notes})`);
console.log("- Access Control Multisig:", result.accessControl.multisigStatus);
console.log("- Findings detected:", result.findings.length);

for (const f of result.findings) {
  console.log(`\nFinding: [${f.severity}] ${f.id}: ${f.title}`);
  console.log(`  File: ${f.file} Lines: L${f.lineStart}-L${f.lineEnd}`);
  console.log(`  Snippet: "${f.codeSnippet.replace(/\n/g, ' ')}"`);
  console.log(`  Detector: ${f.detector}`);
}

if (result.findings.length !== 2) {
  throw new Error(`Expected 2 findings (reentrancy + tx.origin), got ${result.findings.length}`);
}

if (result.proxy.status !== "NOT_DETECTED") {
  throw new Error(`Expected proxy NOT_DETECTED, got ${result.proxy.status}`);
}

console.log("\nPASS 3 VERIFICATION SUCCESSFUL!");
