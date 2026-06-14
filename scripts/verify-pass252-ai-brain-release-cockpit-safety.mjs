import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const errors = [];
const requireIncludes = (file, markers) => {
  const source = read(file);
  for (const marker of markers) {
    if (!source.includes(marker)) errors.push(`${file}: missing ${marker}`);
  }
};

for (const file of [
  "lib/market-integrity/vlm-brain-release-cockpit.ts",
  "components/market-integrity/TokenRiskModal.tsx",
  "app/globals.css",
]) {
  if (!fs.existsSync(path.join(root, file))) errors.push(`${file}: missing PASS252 file`);
}

if (!errors.length) {
  requireIncludes("lib/market-integrity/vlm-brain-release-cockpit.ts", [
    "vlm-brain-release-cockpit-v1-pass252",
    "operator_release_control_center",
    "PASS252_VLM_BRAIN_RELEASE_COCKPIT_CONTRACT",
    "customerExportAllowed: false",
    "publicRouteAllowed: false",
    "binaryPdfAllowed: false",
    "walletAccessAllowed: false",
    "rawPayloadAllowed: false",
    "browserQaRequired: true",
  ]);
  requireIncludes("components/market-integrity/TokenRiskModal.tsx", [
    "buildVlmBrainReleaseCockpit",
    "selectedTileReleaseCockpit",
    'data-vlm-release-cockpit="pass252"',
    "data-vlm-release-cockpit-decision",
    "data-vlm-release-cockpit-lane",
    "PASS252 marker",
  ]);
  requireIncludes("app/globals.css", [
    "PASS252 — AI Brain release cockpit",
    ".shield-vlm-pass252-cockpit",
    "data-vlm-release-cockpit-lane=\"hard_block\"",
    "data-vlm-release-cockpit-lane=\"review_lock\"",
    "data-vlm-release-cockpit-lane=\"operator_only\"",
  ]);
  requireIncludes("scripts/vercel-preflight.mjs", [
    "PASS252 AI Brain release cockpit guard",
    "verify-pass252-ai-brain-release-cockpit-safety.mjs",
  ]);
  const pkg = JSON.parse(read("package.json"));
  if (!pkg.scripts?.["verify:pass252-ai-brain-release-cockpit"]) errors.push("package.json: missing verify:pass252-ai-brain-release-cockpit script");
  if (!String(pkg.scripts?.["verify:shield-all"] ?? "").includes("verify:pass252-ai-brain-release-cockpit")) errors.push("package.json: verify:shield-all missing PASS252 guard");
}

const forbidden = [
  /buy\s+signal/i,
  /sell\s+signal/i,
  /guaranteed\s+profit/i,
  /risk[-\s]?free/i,
  /safe\s+investment/i,
  /scam\s+confirmed/i,
  /fraud\s+proven/i,
  /enter\s+seed\s+phrase/i,
];
const cockpit = fs.existsSync(path.join(root, "lib/market-integrity/vlm-brain-release-cockpit.ts")) ? read("lib/market-integrity/vlm-brain-release-cockpit.ts") : "";
for (const pattern of forbidden) {
  if (pattern.test(cockpit)) errors.push(`release cockpit forbidden wording: ${pattern}`);
}

if (errors.length) {
  console.error("PASS252 AI Brain release cockpit guard failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS252 AI Brain release cockpit guard passed.");
