import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const file = "components/market-integrity/ShieldMapCommandClient.tsx";
const source = fs.readFileSync(path.join(root, file), "utf8");
const required = [
  'data-pass487-shield-decision-field="true"',
  'data-pass487-decision-orbit="risk-six-lanes-next-probe"',
  "pass487GraphPoints",
  "pass487DesktopPositions",
  "pass487PrimaryLane",
  "pass487StableLane",
  "useReducedMotion",
  "conic-gradient",
  "investigator.caseFrame.missingData.length",
  "localizedAction(topAction, safeLocale, symbol)",
];
const forbidden = ["Math.random", "guaranteed safe", "risk-free"];
const failures = [];
for (const marker of required) if (!source.includes(marker)) failures.push(`missing ${marker}`);
for (const marker of forbidden) if (source.includes(marker)) failures.push(`forbidden ${marker}`);
if (failures.length) {
  console.error(`PASS487 verifier failed (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("PASS487 Shield decision field verifier OK");
