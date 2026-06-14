import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const failures = [];
const requireFile = (file) => {
  if (!fs.existsSync(path.join(root, file))) failures.push(`missing file: ${file}`);
};
const requireText = (file, needles) => {
  requireFile(file);
  if (!fs.existsSync(path.join(root, file))) return;
  const text = read(file);
  for (const needle of needles) if (!text.includes(needle)) failures.push(`${file}: missing ${needle}`);
};

requireText("lib/market-integrity/pass488-a4-decision-cockpit.ts", [
  'version: "pass488-a4-decision-cockpit"',
  "readerPageCount: 4",
  "binaryPageCount: 4",
  "parityKey",
]);
requireText("lib/search/lens-report.ts", ["pass488: Pass488A4DecisionCockpit", "buildPass488A4DecisionCockpit", "Boolean(report.pass488)"]);
requireText("app/api/search/lens-report/route.ts", ["report.pass488", "pass488.parityKey", "pass488.pageCount"]);
requireText("components/search/VelmereIntelligenceSearchClient.tsx", [
  "data-pass488-a4-navigation",
  "data-pass488-reader-binary-parity",
  "lens-reader-page-decision",
  "lens-reader-page-evidence",
  "lens-reader-page-analysis",
  "lens-reader-page-boundary",
]);
requireText("lib/motion/pass489-motion-system.ts", ["pass489-premium-motion-budget", "targetFps", "particleCap", "concurrentLoops"]);
requireText("lib/motion/useMotionQuality.ts", ["deviceMemory", "saveData", "effectiveType"]);
requireText("app/globals.css", ["--velmere-motion-standard", ".velmere-motion-surface", "prefers-reduced-motion"]);
requireText("lib/market-integrity/pass490-production-release-gate.ts", ["360", "390", "768", "1280", "1440", "next-production-build"]);
requireText("lib/market-integrity/pass491-neural-confidence-topology.ts", ["dominantLimiter", "weakest", "calibratedConfidence"]);
requireText("components/market-integrity/VlmNeuralAuditExperience.tsx", [
  "getPass489MotionBudget",
  "buildPass491NeuralConfidenceTopology",
  "data-pass491-confidence-topology",
  "motionBudget.targetFps",
]);
requireText("lib/market-integrity/pass492-shield-lane-focus.ts", ["strongestId", "previousId", "nextId", "checksum"]);
requireText("components/market-integrity/ShieldMapCommandClient.tsx", [
  "data-pass492-shield-lane-focus",
  "data-pass492-focused-lane-panel",
  "aria-pressed",
  "handleLaneKey",
  "opacity-[0.78]",
]);

const shield = read("components/market-integrity/ShieldMapCommandClient.tsx");
if (shield.includes("opacity-78")) failures.push("non-standard Tailwind class opacity-78 returned");
const pkg = JSON.parse(read("package.json"));
if (!pkg.scripts?.["verify:pass488-492-premium-release"]) failures.push("package.json missing PASS488–492 verifier script");
if (!String(pkg.scripts?.build).includes("verify:pass488-492-premium-release")) failures.push("build pipeline does not execute PASS488–492 verifier");

if (failures.length) {
  console.error("PASS488–492 premium release verifier: FAIL");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log("PASS488–492 premium release verifier: PASS");
