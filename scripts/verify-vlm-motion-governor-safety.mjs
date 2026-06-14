import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const errors = [];
const modal = fs.readFileSync(path.join(root, "components/market-integrity/TokenRiskModal.tsx"), "utf8");
const css = fs.readFileSync(path.join(root, "app/globals.css"), "utf8");

for (const needle of [
  'type MotionPreset = "orbit" | "static"',
  'PASS149 hard guard: Orbit 360 belongs only to Advanced',
  'renderHeavyCanvas',
  'showLineSvg',
  'shield-vlm-motion-toggle-mini',
  'motionPreset === "static"',
  'targetFrameMs = orbitUpdateFrameMs',
  'allowedMotionPresets',
]) {
  if (!modal.includes(needle)) errors.push(`TokenRiskModal missing motion governor marker: ${needle}`);
}
if (!(modal.includes('const [motionPreset, setMotionPreset] = useState<MotionPreset>(mode === "advanced" ? "orbit" : "static")') || modal.includes('const [motionPreset, setMotionPreset] = useState<MotionPreset>("orbit")'))) {
  errors.push('TokenRiskModal missing supported motionPreset initializer.');
}

if (modal.includes('motionLite') || modal.includes('(["orbit", "lite", "static"]')) {
  errors.push('Lite motion button must stay removed from VLM brain UI.');
}

if (modal.includes('DRAG CHART') || modal.includes('older</button>') || modal.includes('newer</button>') || modal.includes('latest</button>')) {
  errors.push('Popup chart debug/pan labels must remain hidden from premium UI.');
}

for (const needle of [
  'PASS128 — VLM motion governor',
  '.shield-vlm-motion-toggle-mini',
  '.shield-vlm-motion-lite .shield-vlm-read-card-scan',
  '.shield-popup-chart-pan',
]) {
  if (!css.includes(needle)) errors.push(`globals.css missing motion governor CSS marker: ${needle}`);
}

if (errors.length) {
  console.error('VLM motion governor safety verification failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('VLM motion governor safety checks passed.');
