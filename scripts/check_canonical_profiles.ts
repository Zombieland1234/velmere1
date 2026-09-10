import { BENCHMARK_30_CONTRACTS } from "../lib/security/contract-audit-profiles.ts";

const CANONICAL_20_KEYS = [
  "0xdac17f958d2ee523a2206206994597c13d831ec7", // USDT
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // USDC
  "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c", // WBNB
  "0x10ed43c718714eb63d5aa57b78b54704e256024e", // CAKE-RTR
  "0xe592427a0aece92de3edee1f18e0157c05861564", // UNI-ROUTER3
  "0x6b175474e89094c44da98b954eedeac495271d0f", // DAI
  "0x514910771af9ca656af840dff83e8264ecf986ca", // LINK
  "0x6982508145454ce325ddbe47a25d4ec3d2311933", // PEPE
  "0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce", // SHIB
  "0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2", // AAVE-V3-POOL
  "0xae7ab96520de3a18e5e111b5eaab095312d7fe84", // stETH
  "0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7", // 3CRV
  "0x4dbd4fc535ac27206064b68ffcf827b0a60bab3f", // ARB-INBOX
  "0x3e5c63644e683549055b9be8653de26e0b4cd36e", // SAFE-L2
  "0x39aa39c021dfbae8fac545936693ac917d5e7563", // cUSDC
  "0x8076c74c5e3f5852037f31ff0093eeb8c8add8d3", // SAFEMOON
  "0xfb5b838b6cff2d9991874f439794e0985f4658ab", // FLOKI
  "0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f", // SNX
  "0x000000000000ad05ccc4f10045630fb539565570", // BLUR-EXCHANGE
  "0xd90e2f925da726b50c4ed8d0fb90ad053324f31b", // TORN-ROUTER
];

console.log("=== CANONICAL 20 PROFILE INSPECTION ===");
CANONICAL_20_KEYS.forEach((addr, i) => {
  const p = BENCHMARK_30_CONTRACTS[addr];
  if (!p) {
    console.log(`[${i + 1}] MISSING: ${addr}`);
  } else {
    console.log(`[${i + 1}] ${p.tokenSymbol.padEnd(12)} | ${p.contractName.padEnd(25)} | snap: ${Boolean(p.snapshotProvenance)} | covTuple: ${Boolean(p.coverageTuple)} | bytecodeSha: ${p.snapshotProvenance?.runtimeBytecodeSha256?.slice(0, 10)}... | reviewAtt: ${Boolean(p.humanReviewAttestation)}`);
  }
});
