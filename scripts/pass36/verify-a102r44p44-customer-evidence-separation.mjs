#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const simulation = read("config/pass36/r44p44-ai-simulated-evidence-policy.json");
const human = read("config/pass36/r44p44-real-human-customer-proof-ledger.json");
const checks = [];
const check = (id, pass, detail) => checks.push({ id, pass: Boolean(pass), detail });

check("simulation:classification", simulation.classification === "AI_SIMULATED_CUSTOMERS_AND_REVIEWERS_NOT_REAL_HUMAN_PROOF", simulation.classification);
check("simulation:personas", simulation.denominators?.simulatedPersonas === 100, simulation.denominators?.simulatedPersonas);
check("simulation:journeys", simulation.denominators?.journeyRows === 2400, simulation.denominators?.journeyRows);
check("simulation:angel", simulation.denominators?.angelCases === 121, simulation.denominators?.angelCases);
check("simulation:contract-tier", simulation.denominators?.contractTierRows === 150, simulation.denominators?.contractTierRows);
check("simulation:real-customer-forbidden", simulation.credits?.realCustomerProof === false, simulation.credits?.realCustomerProof);
check("simulation:wtp-forbidden", simulation.credits?.willingnessToPay === false, simulation.credits?.willingnessToPay);
check("simulation:independent-review-forbidden", simulation.credits?.independentReviewer === false, simulation.credits?.independentReviewer);
check("simulation:sale-forbidden", simulation.credits?.sale === false, simulation.credits?.sale);
check("simulation:world-class-forbidden", simulation.credits?.worldClass === false, simulation.credits?.worldClass);
check("human:classification", human.classification === "REAL_HUMAN_CUSTOMER_PROOF", human.classification);
check("human:participants-zero", human.realParticipants === 0, human.realParticipants);
check("human:customer-proof-zero", human.customerProofPercent === 0, human.customerProofPercent);
check("human:wtp-zero", human.willingnessToPayPercent === 0, human.willingnessToPayPercent);
check("human:customer-credit-false", human.credits?.customer === false, human.credits?.customer);
check("human:sale-credit-false", human.credits?.sale === false, human.credits?.sale);
check("separation:distinct-classification", simulation.classification !== human.classification, `${simulation.classification} != ${human.classification}`);

const failed = checks.filter((entry) => !entry.pass);
const receipt = {
  schemaVersion: "velmere.pass36.a102r44p44.customer-evidence-separation-receipt.v1",
  revisionId: simulation.revisionId,
  status: failed.length === 0 ? "PASS_R44P44_AI_SIMULATION_AND_REAL_HUMAN_PROOF_SEPARATED" : "FAIL_R44P44_AI_SIMULATION_AND_REAL_HUMAN_PROOF_SEPARATION",
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  checks,
  realCustomerProof: 0,
  willingnessToPay: 0,
  saleCredit: false,
  liveCredit: false,
  worldClassCredit: false
};
console.log(JSON.stringify(receipt, null, 2));
if (failed.length) process.exit(1);
