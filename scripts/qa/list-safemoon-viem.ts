import { toFunctionSelector } from "viem";

const funcs = [
  "setTaxFeePercent(uint256)",
  "setLiquidityFeePercent(uint256)",
  "setMaxTxPercent(uint256)",
  "excludeFromFee(address)",
  "includeInFee(address)",
  "excludeFromReward(address)",
  "includeInReward(address)",
  "totalFees()",
  "_taxFee()",
  "_liquidityFee()",
  "_maxTxAmount()",
  "deliver(uint256)",
  "reflectionFromToken(uint256,bool)",
  "tokenFromReflection(uint256)",
  "isExcludedFromReward(address)",
  "isExcludedFromFee(address)",
  "setSwapAndLiquifyEnabled(bool)",
  "unlock()",
  "lock(uint256)",
  "geUnlockTime()",
  "uniswapV2Pair()",
  "uniswapV2Router()"
];

for (const f of funcs) {
  console.log(`${toFunctionSelector(f)} -> ${f}`);
}
