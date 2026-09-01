import { buildRealMarketsCurrentFieldAuthoritySnapshot } from "../lib/market-integrity/real-markets-current-field-authority";

const s = buildRealMarketsCurrentFieldAuthoritySnapshot();
console.log(JSON.stringify({
  catalogAssetDenominator: s.catalogAssetDenominator,
  catalogUniqueSymbolDenominator: s.catalogUniqueSymbolDenominator,
  ruleRowCount: s.ruleRowCount,
  criticalRuleRowCount: s.criticalRuleRowCount,
  optionalRuleRowCount: s.optionalRuleRowCount,
  notApplicableRuleRowCount: s.notApplicableRuleRowCount,
  currentExecutionBaseline: s.currentExecutionBaseline,
}, null, 2));
