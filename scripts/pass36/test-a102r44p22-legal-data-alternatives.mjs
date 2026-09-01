#!/usr/bin/env node
import fs from "node:fs";
const p = JSON.parse(fs.readFileSync("config/pass36/a102r44p22-legal-data-alternative-registry.json", "utf8"));
const rows=[]; const add=(id,ok,detail=null)=>rows.push({id,passed:Boolean(ok),detail});
add("schema", p.schemaVersion.endsWith(".v1"));
add("decision", p.decision === "NO_GO");
add("review-not-counsel", p.reviewClass === "OFFICIAL_SOURCE_REVIEWED_NOT_COUNSEL_OR_PROVIDER_APPROVED");
add("source-count", p.sources.length === 7, p.sources.length);
add("unique-ids", new Set(p.sources.map(x=>x.id)).size === p.sources.length);
for (const source of p.sources) {
  add(`${source.id}:class`, ["PUBLIC_BLOCKCHAIN_DIRECT","PUBLIC_REGULATOR_DATA","USER_SUPPLIED","EXTERNAL_PROVIDER"].includes(source.sourceClass));
  add(`${source.id}:fields`, Array.isArray(source.candidateFields) && source.candidateFields.length > 0);
  add(`${source.id}:safe-use`, Array.isArray(source.safeUse) && source.safeUse.length > 0);
  add(`${source.id}:not-equivalent`, Array.isArray(source.notEquivalentTo) && source.notEquivalentTo.length > 0);
  add(`${source.id}:status`, typeof source.commercialStatus === "string" && source.commercialStatus.length > 10);
  add(`${source.id}:fallback`, typeof source.fallback === "string" && source.fallback.length > 20);
  if (source.sourceClass !== "USER_SUPPLIED") add(`${source.id}:official-url`, /^https:\/\//u.test(source.officialUrl));
}
const byId=Object.fromEntries(p.sources.map(x=>[x.id,x]));
add("ethereum:not-market", byId.ethereum_self_hosted_json_rpc.notEquivalentTo.includes("market_price"));
add("sec:not-real-time", byId.sec_edgar_data_apis.notEquivalentTo.includes("real_time_quote"));
add("ecb:reference-only", byId.ecb_reference_fx.notEquivalentTo.includes("transaction_rate"));
add("eia:not-order-book", byId.eia_open_energy_data.notEquivalentTo.includes("real_time_order_book"));
add("coinpaprika:blocked", byId.coinpaprika_public_api.commercialStatus.startsWith("BLOCKED_"));
add("coinbase:blocked", byId.coinbase_market_data.commercialStatus.startsWith("BLOCKED_"));
add("global:no-legal-advice", p.globalTruthBoundary.legalAdviceProvided === false);
add("global:no-rights", p.globalTruthBoundary.providerRightsApproved === false);
add("global:no-paid", p.globalTruthBoundary.publicPaidDataEnabled === false);
add("global:field-only", p.globalTruthBoundary.sourcesMayReplaceOnlyNamedFields === true && p.globalTruthBoundary.wholeProductZeroingForbidden === true);
add("global:reference-label", p.globalTruthBoundary.referenceDataMustBeLabeledReference === true);
const failed=rows.filter(x=>!x.passed);
const result={schemaVersion:"velmere.pass36.a102r44p22.legal-data-alternatives-test.v1",status:failed.length?"FAIL":"PASS",checks:rows.length,passed:rows.length-failed.length,failed:failed.length,rows};
console.log(JSON.stringify(result,null,2)); process.exit(failed.length?1:0);
