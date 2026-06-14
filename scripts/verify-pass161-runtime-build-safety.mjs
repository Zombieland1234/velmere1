import { readFileSync } from "node:fs";

const market = readFileSync("components/market-integrity/MarketIntegrityClient.tsx", "utf8");
const evidence = readFileSync("lib/market-integrity/evidence-report.ts", "utf8");

const issues = [];
const effectIndex = market.indexOf("const clean = query.trim();");
const localFinderIndex = market.indexOf("const findLocalSuggestions");
const dependencyHazard = market.includes("}, [findLocalSuggestions, query, sourceCooldownActive])");
if (dependencyHazard) {
  issues.push("MarketIntegrityClient still references findLocalSuggestions in a dependency array before the const initializer.");
}
if (effectIndex !== -1 && localFinderIndex !== -1 && effectIndex < localFinderIndex && !market.includes("PASS161: do not put findLocalSuggestions")) {
  issues.push("Suggestion effect appears before findLocalSuggestions without the PASS161 TDZ guard comment.");
}
if (!evidence.includes("type EvidenceCaseInput = ShieldOperatorCaseFile | InvestigatorProtocol")) {
  issues.push("Evidence report does not accept both ShieldOperatorCaseFile and InvestigatorProtocol.");
}
if (!evidence.includes("normalizeEvidenceCaseFile")) {
  issues.push("Evidence report is missing the normalizeEvidenceCaseFile adapter.");
}
if (!evidence.includes("export const buildEvidenceReportDraft = buildShieldEvidenceReportDraft")) {
  issues.push("Evidence report legacy export alias is missing.");
}

if (issues.length) {
  console.error("PASS161 runtime/build safety failed:");
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}
console.log("PASS161 runtime/build safety OK");
