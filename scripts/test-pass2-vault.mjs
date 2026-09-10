import fs from "fs";
import path from "path";
import { EvidenceVault } from "../lib/security/evidence-vault/evidence-vault.ts";
import { computeMerkleRoot } from "../lib/security/evidence-vault/merkle-tree.ts";

console.log("=== TESTING PASS 2: EVIDENCE VAULT & MERKLE ROOT ===");

const testVaultDir = path.resolve("test_evidence_vault");
const vault = new EvidenceVault(testVaultDir);

const auditId = "AUD-TEST-USDT";

// 1. Store test artifacts
vault.storeArtifact(auditId, {
  category: "source",
  filename: "TetherToken.sol",
  content: "// SPDX-License-Identifier: MIT\npragma solidity ^0.8.20;\ncontract TetherToken { ... }"
});

vault.storeArtifact(auditId, {
  category: "static",
  filename: "slither_output.json",
  content: JSON.stringify({ success: true, findings: [] })
});

vault.storeArtifact(auditId, {
  category: "formal",
  filename: "invariant_balance.smt2",
  content: "(assert (= (balance a) 100))"
});

// 2. Build and verify manifest
const manifest = vault.buildAndStoreManifest({
  auditId,
  symbol: "USDT",
  name: "Tether USD",
  chain: "ethereum",
  contractAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  sourceHash: "a5579e9b5f13db7f",
  reportBuffer: Buffer.from("PDF DUMMY REPORT BYTES")
});

console.log("Manifest created successfully!");
console.log("- Schema Version:", manifest.schemaVersion);
console.log("- Artifact count:", manifest.artifacts.length);
console.log("- Leaf hashes:", manifest.leafHashes.length);
console.log("- Evidence Root (Merkle):", manifest.evidenceRoot);
console.log("- Seal Type:", manifest.timestamping.sealType);
console.log("- Notice:", manifest.timestamping.notice);

if (manifest.artifacts.length !== 3) {
  throw new Error(`Expected 3 artifacts, found ${manifest.artifacts.length}`);
}

if (!manifest.evidenceRoot || manifest.evidenceRoot.length !== 64) {
  throw new Error("Invalid Merkle evidenceRoot!");
}

if (manifest.timestamping.sealType !== "SHA-256 INTEGRITY SEAL") {
  throw new Error("Seal type should be SHA-256 INTEGRITY SEAL when no TSA token is provided!");
}

// Clean up test directory
fs.rmSync(testVaultDir, { recursive: true, force: true });

console.log("\nPASS 2 VERIFICATION SUCCESSFUL!");
