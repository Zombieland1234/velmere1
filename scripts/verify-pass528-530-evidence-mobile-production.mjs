import fs from "node:fs";

const required = [
  ["lib/market-integrity/pass528-shield-evidence-packet.ts", ["pass528-shield-evidence-packet", "Evidence boundary", "Capsules organize visible data"]],
  ["lib/motion/pass529-mobile-interaction-replay.ts", ["pass529-mobile-interaction-replay", "targetFloorPx", "device-specific visual QA"]],
  ["components/market-integrity/ShieldMapCommandClient.tsx", ["data-pass528-evidence-packet", "data-pass528-shield-evidence-packet", "Evidence capsules"]],
  ["components/market-integrity/VlmNeuralAuditExperience.tsx", ["data-pass529-mobile-interaction-replay", "data-pass529-interaction-contract", "mobileInteractionReplay.targetFloorPx", "min-h-11"]],
  ["scripts/verify-pass530-node20-production-contract.mjs", ["Node 20.x", "source budget", "production contract"]],
  ["app/globals.css", ["PASS528–529", "data-pass528-shield-evidence-packet", "data-pass529-interaction-contract"]],
];
const errors = [];
for (const [file, markers] of required) {
  if (!fs.existsSync(file)) { errors.push(`missing ${file}`); continue; }
  const source = fs.readFileSync(file, "utf8");
  markers.forEach((marker) => { if (!source.includes(marker)) errors.push(`${file}: missing marker ${marker}`); });
  if (/Math\.random\(/.test(source)) errors.push(`${file}: Math.random is forbidden on evidence surfaces`);
}
const neuralSurface = fs.readFileSync("components/market-integrity/VlmNeuralAuditExperience.tsx", "utf8");
if (neuralSurface.includes("mobile interaction replay")) {
  errors.push("VLM Brain must keep PASS529 as a semantic QA contract, not a public technical HUD");
}
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
for (const script of ["verify:pass528-530-evidence-mobile-production", "verify:pass530-node20-production-contract"]) {
  if (!packageJson.scripts?.[script]) errors.push(`package.json: ${script} missing`);
  if (!String(packageJson.scripts?.build || "").includes(script)) errors.push(`package.json: ${script} missing from build`);
}
if (errors.length) {
  console.error("PASS528–530 verifier failed");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log("PASS528–530 verifier PASS");
