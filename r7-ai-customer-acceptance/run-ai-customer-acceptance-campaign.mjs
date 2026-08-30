import crypto from "node:crypto";
import fs from "node:fs";

const TOTAL_PERSONAS = 100;
const ACTIONS_PER_PERSONA = 24;
const OUT = "artifacts/r7/ai-customer-acceptance/R7_AI_CUSTOMER_ACCEPTANCE.json";
const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");
const locales = ["pl", "en", "de"];
const tiers = ["basic", "pro", "advanced"];
const goals = ["verify-safety", "compare-tiers", "investigate-evidence", "recover-artifact", "check-rights", "test-isolation", "validate-export", "review-history", "understand-risk", "evaluate-workflow"];
const actions = [
  "open-product", "select-locale", "submit-input", "read-summary", "inspect-evidence", "inspect-provenance",
  "open-history", "compare-basic", "compare-paid", "attempt-forbidden-action", "retry-invalid-input", "refresh",
  "reconnect-session", "check-artifact", "open-pdf", "verify-pdf-hash", "check-currentness", "check-rights",
  "cross-account-read", "revoke-entitlement", "verify-revocation", "restore-workspace", "acknowledge-finding", "export-result",
];

function persona(i) {
  return {
    personaId: `AI-CUSTOMER-${String(i).padStart(3, "0")}`,
    locale: locales[i % locales.length],
    tier: tiers[i % tiers.length],
    goal: goals[i % goals.length],
    toleranceForFailure: i % 3 === 0 ? "low" : i % 3 === 1 ? "medium" : "high",
    securitySensitivity: i % 4 === 0 ? "high" : "standard",
    expectsBasicFree: true,
  };
}

const results = [];
for (let i = 1; i <= TOTAL_PERSONAS; i += 1) {
  const p = persona(i);
  const steps = [];
  for (let j = 0; j < ACTIONS_PER_PERSONA; j += 1) {
    const action = actions[j];
    const shouldFailClosed = ["attempt-forbidden-action", "cross-account-read"].includes(action);
    const state = shouldFailClosed ? "EXPECTED_FAIL_CLOSED" : "READY_FOR_LIVE_ASSERTION";
    steps.push({
      step: j + 1,
      action,
      expected: shouldFailClosed ? "deny-or-withhold-without-data-leak" : "customer-visible-correct-behavior",
      state,
      assertionInputSha256: sha256(`${p.personaId}|${j + 1}|${action}`),
    });
  }
  results.push({
    ...p,
    actionCount: steps.length,
    steps,
    simulationBoundary: "AI_SIMULATED_CUSTOMER_ONLY",
    externalHumanProofCredit: false,
    customerFinalCredit: false,
    paidValueCredit: false,
  });
}

if (results.length !== TOTAL_PERSONAS || results.some((r) => r.steps.length !== ACTIONS_PER_PERSONA)) {
  throw new Error("ai_customer_campaign_denominator_invalid");
}

const aggregate = sha256(results.map((r) => `${r.personaId}|${r.locale}|${r.tier}|${r.goal}|${r.steps.map((s) => s.assertionInputSha256).join(",")}`).join("\n"));
const summary = {
  totalPersonas: TOTAL_PERSONAS,
  actionsPerPersona: ACTIONS_PER_PERSONA,
  totalInteractions: TOTAL_PERSONAS * ACTIONS_PER_PERSONA,
  locales: locales.length,
  tiers: tiers.length,
  aggregateSha256: aggregate,
};

fs.mkdirSync("artifacts/r7/ai-customer-acceptance", { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify({
  schemaVersion: "velmere.r7.ai-simulated-customer-acceptance.v1",
  campaignStatus: "CAMPAIGN_DEFINED",
  summary,
  personas: results,
  executionBoundary: {
    modelOutputsUntrusted: true,
    humanProofSeparate: true,
    noCustomerFinalCredit: true,
    noPaidValueCredit: true,
    noProductionApproval: true,
  },
  nextPhase: "Bind each action to the real customer route and execute 2400 live assertions after Customer FINAL 20/20 and Paid Value FINAL 10/10.",
}, null, 2)}\n`);
console.log(JSON.stringify({ status: "PASS_CAMPAIGN_DENOMINATOR", ...summary }, null, 2));
