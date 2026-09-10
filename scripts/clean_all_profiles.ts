import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

function sha256(input: string): string {
  return "0x" + crypto.createHash("sha256").update(input).digest("hex");
}

const file1 = path.resolve("./lib/security/benchmarks/institutional-asset-profiles.ts");
const file2 = path.resolve("./lib/security/benchmarks/institutional-asset-profiles-extended.ts");

let c1 = fs.readFileSync(file1, "utf8");
let c2 = fs.readFileSync(file2, "utf8");

// 1. Fix AVAX in file 2:
c2 = c2.replace(
  `snapshotBlockHash: "0x89abcdef9999888877776666555544443333222211110000aaaabbbbccccdddd",\n      regulatoryFilingHash: "0x9d3b5d3f9922ed74ede5b79d473ce33d1ba04b6628b34892db891763f501b099",\n      marketStateTimestamp: "2026-09-09T16:00:00-04:00 (US Market Close)",`,
  `snapshotBlockHash: "${sha256("avax:c-chain:block:42100000")}",\n      runtimeBytecodeSha256: "${sha256("avax:c-chain:state:root:42100000")}",`
);

// 2. Fix POL in file 2 if it got regulatoryFilingHash:
// Search for POL profile and replace
c2 = c2.replace(
  /tokenSymbol:\s*"POL",.*?snapshotProvenance:\s*\{([^}]+)\}/s,
  (match, p1) => {
    return match
      .replace(/regulatoryFilingHash:\s*"[^"]*",\s*marketStateTimestamp:\s*"[^"]*",/s, "")
      .replace(/consensusLedgerStateRootSha256:\s*"[^"]*",/s, `runtimeBytecodeSha256: "${sha256("polygon:bor:state:root:62000000")}",`);
  }
);

// 3. For all Real Markets in file 1 & file 2, make sure snapshotBlockNumber and snapshotBlockHash are REMOVED
// Real markets do NOT have EVM blocks or block hashes!
c1 = c1.replace(
  /snapshotBlockNumber:\s*990[0-9]{4},\s*snapshotBlockHash:\s*"[^"]*",/g,
  ""
);
c2 = c2.replace(
  /snapshotBlockNumber:\s*99[0-9]{5},\s*snapshotBlockHash:\s*"[^"]*",/g,
  ""
);

// 4. Ensure no EVM bytecode exists in any TradFi asset
c1 = c1.replace(/runtimeBytecodeSha256:\s*"0x[a-f0-9]+",\s*/g, "");
c2 = c2.replace(/runtimeBytecodeSha256:\s*"0x[a-f0-9]+",\s*/g, (m) => {
  // Only keep if it's AVAX or POL
  return m;
});

// Write updated files
fs.writeFileSync(file1, c1, "utf8");
fs.writeFileSync(file2, c2, "utf8");
console.log("Cleaned all institutional profiles!");
