import { fetchOnChainBytecode } from "../../lib/security/evm-rpc-fetcher";
import { analyzeEvmBytecode, extractFunctionSelectorsFromBytecode } from "../../lib/security/evm-bytecode-analyzer";

async function inspectSafemoon() {
  const r = await fetchOnChainBytecode("0x8076c74c5e3f5852037f31ff0093eeb8c8add8d3", "56");
  console.log("SafeMoon Bytecode length:", r.bytecode?.length);
  const cleanHex = r.bytecode?.replace(/^0x/, "") || "";
  const selectors = extractFunctionSelectorsFromBytecode(cleanHex);
  console.log("Found selectors count:", selectors.length);
  console.log("Selectors:", selectors.map(s => `${s.selectorHex} (${s.signature || "unknown"}) [${s.category}]`));
  const analysis = analyzeEvmBytecode(r.bytecode!);
  console.log("Findings:", analysis.findings.map(f => ({ id: f.id, sev: f.severity, title: f.title })));
  console.log("Score:", analysis.dynamicRiskScore);
}

inspectSafemoon();
