import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const modalPath = path.join(root, 'components/market-integrity/TokenRiskModal.tsx');
const cssPath = path.join(root, 'app/globals.css');
const modal = fs.readFileSync(modalPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');
const errors = [];

for (const needle of [
  'const allowedMotionPresets = useMemo<MotionPreset[]>(() => ["orbit", "static"], []);',
  'const [motionPreset, setMotionPreset] = useState<MotionPreset>("orbit");',
  'const useStaticEvidenceBoard = motionPreset === "static";',
  'className="shield-vlm-static-stage"',
  'style={{ ...staticBoardTileStyle(node, index, filteredVisibleNodes.length), animationDelay:',
]) {
  if (!modal.includes(needle)) errors.push(`TokenRiskModal.tsx missing marker: ${needle}`);
}

if (!(modal.includes('const staticBoardTileStyle = (_node: VlmReadNode, index: number, total: number): CSSProperties => {') || modal.includes('const staticBoardTileStyle = (node: VlmReadNode, index: number, total: number): CSSProperties => {'))) {
  errors.push('TokenRiskModal.tsx missing staticBoardTileStyle helper.');
}

for (const forbidden of [
  'const [motionPreset, setMotionPreset] = useState<MotionPreset>(mode === "advanced" ? "orbit" : "static")',
  '() => (mode === "advanced" ? ["orbit", "static"] : ["static"])',
  'className="shield-vlm-static-core-window"',
]) {
  if (modal.includes(forbidden)) errors.push(`TokenRiskModal.tsx still contains stale marker: ${forbidden}`);
}

for (const needle of [
  'PASS170 · unified Orbit 360 + full-screen evidence board',
  '.shield-vlm-static-evidence-board',
  '.shield-vlm-static-stage',
  '.shield-vlm-static-card',
]) {
  if (!css.includes(needle)) errors.push(`globals.css missing marker: ${needle}`);
}

if (errors.length) {
  console.error('PASS170 unified orbit/board safety failed:\n' + errors.map((e) => `- ${e}`).join('\n'));
  process.exit(1);
}

console.log('PASS170 unified orbit/board safety OK');
