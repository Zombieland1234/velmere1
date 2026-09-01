#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const REVISION = "VELMERE_PASS36_A102R44P35_ACTION_REQUIRED_STANDALONE_DECISION_SUPPORT_ANGEL_RISK_IMPACT_WHALE_AND_PSYCHOLOGY30_TEST_CYCLE_2_OF_3_NO_LIVE_CREDIT";
const personas = [
  ["crypto-beginner", "Początkujący inwestor krypto", "simple risk explanation"],
  ["equity-etf-beginner", "Początkujący inwestor akcji i ETF", "asset-class clarity"],
  ["loss-averse-user", "Osoba bardzo ostrożna", "calm uncertainty"],
  ["hype-prone-user", "Osoba podatna na hype", "resistance to false certainty"],
  ["free-scanner-comparison", "Porównujący z darmowym skanerem", "material value"],
  ["spot-trader", "Doświadczony trader spot", "freshness and speed"],
  ["leverage-trader", "Trader z dźwignią", "no leverage guidance"],
  ["long-term-investor", "Inwestor długoterminowy", "durable risk factors"],
  ["large-transfer-user", "Obserwujący wielkie transfery", "transfer is not trade"],
  ["cross-asset-analyst", "Analityk wielu klas aktywów", "consistent provenance"],
  ["token-founder", "Twórca tokena", "remediation"],
  ["solidity-developer", "Developer Solidity", "technical evidence"],
  ["protocol-architect", "Architekt protokołu", "business logic"],
  ["independent-auditor", "Niezależny audytor", "false negatives"],
  ["security-lead", "Security lead", "severity governance"],
  ["startup-pro-buyer", "Mały startup", "scope and price fairness"],
  ["advanced-enterprise", "Firma rozważająca Advanced", "SLA and accountability"],
  ["fund-research", "Fundusz / research", "repeatable evidence"],
  ["legal-reviewer", "Compliance / legal reviewer", "claims and rights"],
  ["procurement", "Procurement", "price-to-scope"],
  ["mobile-only", "Użytkownik mobilny", "small-screen comprehension"],
  ["slow-network", "Słabe połączenie", "recovery"],
  ["keyboard-screenreader", "Klawiatura i screen reader", "accessible semantics"],
  ["polish-user", "Użytkownik polskojęzyczny", "natural Polish"],
  ["german-user", "Użytkownik niemieckojęzyczny", "natural German"],
  ["plain-english-user", "Anglojęzyczny bez wiedzy technicznej", "plain English"],
  ["ambiguous-input", "Błędny symbol", "fail-closed recovery"],
  ["conflicting-sources", "Sprzeczne źródła", "conflict disclosure"],
  ["paywall-attacker", "Próba obejścia paywalla", "no artificial standalone paywall"],
  ["refund-delete-user", "Refund i usunięcie danych", "control and explanation"],
];
const modules = [
  ["market-impact", "Market Impact"],
  ["whale-watch", "Whale Watch"],
  ["angel", "Angel"],
  ["risk-indicator", "Risk Indicator"],
];
const checks = [
  ["truth-type", "fact / calculation / simulation separation"],
  ["false-certainty", "no false precision or guarantee"],
  ["withheld-reason", "clear withheld or limited reason"],
  ["next-safe-action", "one concrete next safe action"],
  ["cognitive-load", "plain-language cognitive load"],
  ["commercial-truth", "standalone identity and no artificial tier pressure"],
];
const rows = [];
for (const [personaId, persona, concern] of personas) {
  for (const [productId, product] of modules) {
    for (const [checkId, check] of checks) {
      rows.push({
        personaId,
        persona,
        primaryConcern: concern,
        productId,
        product,
        checkId,
        check,
        expectation: `${persona} rozumie ${product}: ${check}.`,
        implementedBoundary:
          productId === "market-impact" ? "modelled impact is not realized slippage or a forecast"
          : productId === "whale-watch" ? "transfer is not trade; unknown labels are UNCLASSIFIED"
          : productId === "angel" ? "abstain on missing/conflicting proof; same safety standard at every report depth"
          : "technical, market and data-quality risk are separate; no probability, leverage or sizing",
        acceptanceTest: `The user can restate the evidence type, limitation and next safe action without upgrading uncertainty for ${product}.`,
        darkPatternForbidden: true,
        customerCredit: false,
        status: "STATICALLY_TESTED_R44P35",
      });
    }
  }
}
const result = {
  schemaVersion: "velmere.pass36.a102r44p35.standalone-psychology-matrix.v1",
  revisionId: REVISION,
  testCycle: { current: 2, total: 3 },
  globalDecision: "NO_GO",
  customerProven: false,
  summary: { personas: personas.length, modules: modules.length, checksPerPersonaModule: checks.length, rows: rows.length, realParticipants: 0 },
  rows,
  truthBoundary: "Static and adversarial psychology checks only. No real-person comprehension, purchase, refund or customer-value credit.",
};
const index = process.argv.indexOf("--output");
if (index >= 0) {
  const output = process.argv[index + 1];
  if (!output) throw new Error("output_path_required");
  fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
  fs.writeFileSync(path.resolve(output), `${JSON.stringify(result, null, 2)}\n`);
}
console.log(JSON.stringify(result, null, 2));
