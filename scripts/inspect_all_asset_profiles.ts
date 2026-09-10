import {
  INSTITUTIONAL_SHIELD_PROFILES,
  INSTITUTIONAL_MARKET_PROFILES,
} from "../lib/security/benchmarks/institutional-asset-profiles";
import {
  EXTENDED_SHIELD_PROFILES,
  EXTENDED_MARKET_PROFILES,
} from "../lib/security/benchmarks/institutional-asset-profiles-extended";

console.log("=== SHIELD PROFILES (1-5) ===");
for (const [key, val] of Object.entries(INSTITUTIONAL_SHIELD_PROFILES)) {
  console.log(`${key.padEnd(8)} | ${val.tokenSymbol.padEnd(6)} | ${val.contractName.slice(0, 30).padEnd(30)} | chainId: ${val.chainId} | snap: ${Boolean(val.snapshotProvenance)} | snapBlock: ${val.snapshotProvenance?.snapshotBlockNumber} | bytecodeSha: ${val.snapshotProvenance?.runtimeBytecodeSha256?.slice(0, 16)}`);
}

console.log("\n=== EXTENDED SHIELD PROFILES (6-20) ===");
for (const [key, val] of Object.entries(EXTENDED_SHIELD_PROFILES)) {
  console.log(`${key.padEnd(8)} | ${val.tokenSymbol.padEnd(6)} | ${val.contractName.slice(0, 30).padEnd(30)} | chainId: ${val.chainId} | snap: ${Boolean(val.snapshotProvenance)} | snapBlock: ${val.snapshotProvenance?.snapshotBlockNumber} | bytecodeSha: ${val.snapshotProvenance?.runtimeBytecodeSha256?.slice(0, 16)}`);
}

console.log("\n=== REAL MARKETS PROFILES (1-5) ===");
for (const [key, val] of Object.entries(INSTITUTIONAL_MARKET_PROFILES)) {
  console.log(`${key.padEnd(8)} | ${val.tokenSymbol.padEnd(6)} | ${val.contractName.slice(0, 30).padEnd(30)} | chainId: ${val.chainId} | snap: ${Boolean(val.snapshotProvenance)} | snapBlock: ${val.snapshotProvenance?.snapshotBlockNumber} | bytecodeSha: ${val.snapshotProvenance?.runtimeBytecodeSha256?.slice(0, 16)}`);
}

console.log("\n=== EXTENDED REAL MARKETS PROFILES (6-20) ===");
for (const [key, val] of Object.entries(EXTENDED_MARKET_PROFILES)) {
  console.log(`${key.padEnd(8)} | ${val.tokenSymbol.padEnd(6)} | ${val.contractName.slice(0, 30).padEnd(30)} | chainId: ${val.chainId} | snap: ${Boolean(val.snapshotProvenance)} | snapBlock: ${val.snapshotProvenance?.snapshotBlockNumber} | bytecodeSha: ${val.snapshotProvenance?.runtimeBytecodeSha256?.slice(0, 16)}`);
}
