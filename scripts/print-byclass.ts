import { buildRealMarketsCurrentFieldAuthoritySnapshot } from "../lib/market-integrity/real-markets-current-field-authority";

const s = buildRealMarketsCurrentFieldAuthoritySnapshot();
const byClass: Record<string, number> = {};
s.ruleRows.forEach((r) => {
  byClass[r.assetClass] = (byClass[r.assetClass] ?? 0) + 1;
});
console.log(JSON.stringify({ byClass }, null, 2));
