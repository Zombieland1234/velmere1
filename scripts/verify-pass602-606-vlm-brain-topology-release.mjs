import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const errors = [];
const requiredFiles = [
  "lib/market-integrity/pass602-neural-evidence-topology.ts",
  "lib/market-integrity/pass603-progressive-lobe-rendering.ts",
  "lib/market-integrity/pass604-confidence-propagation.ts",
  "lib/market-integrity/pass605-brain-interaction-contract.ts",
  "lib/market-integrity/pass606-evidence-driven-neural-motion.ts",
  "components/market-integrity/VlmNeuralAuditExperience.tsx",
  "app/globals.css",
  "tsconfig.pass606.json",
];
const read = (file) => (fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "");
const markers = (file, expected) => {
  const source = read(file);
  for (const marker of expected) {
    if (!source.includes(marker)) errors.push(`${file} missing ${marker}`);
  }
};
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) errors.push(`missing ${file}`);
}

markers("lib/market-integrity/pass602-neural-evidence-topology.ts", [
  'version: "pass602-neural-evidence-topology"',
  "stableId",
  "publicWeightExposure: false",
  "resolvePass602ActiveNeuralPath",
  'kind: "verdict"',
  'kind: "agent"',
  'kind: "claim"',
  'kind: "source"',
]);
markers("lib/market-integrity/pass603-progressive-lobe-rendering.ts", [
  'version: "pass603-progressive-lobe-rendering"',
  'export type Pass603Renderer = "webgl" | "fallback_2d" | "offscreen"',
  "offscreen_lobes_unmounted",
  "contentParity: true",
]);
markers("lib/market-integrity/pass604-confidence-propagation.ts", [
  'version: "pass604-confidence-propagation"',
  '"fact" | "hypothesis" | "conflict" | "missing_source"',
  "confidenceCap",
  "publicBoundary",
]);
markers("lib/market-integrity/pass605-brain-interaction-contract.ts", [
  'version: "pass605-brain-interaction-contract"',
  "rovingTabIndex: true",
  "dialogFocusTrap: true",
  'case "ArrowRight"',
  'case "Escape"',
  "resolvePass605FocusTrap",
]);
markers("lib/market-integrity/pass606-evidence-driven-neural-motion.ts", [
  'version: "pass606-evidence-driven-neural-motion"',
  '"initial_evidence"',
  '"evidence_delta"',
  '"lineage_delta"',
  "iterations: animate ? 1 : 0",
]);
markers("components/market-integrity/VlmNeuralAuditExperience.tsx", [
  "buildPass602NeuralEvidenceTopology",
  "buildPass603ProgressiveLobeRendering",
  "buildPass604ConfidencePropagation",
  "buildPass605BrainInteractionContract",
  "buildPass606EvidenceDrivenNeuralMotion",
  'data-pass602-neural-evidence-topology',
  'data-pass603-progressive-lobe-rendering',
  'data-pass604-confidence-propagation',
  'data-pass605-brain-interaction-contract="dialog-focus-trap"',
  'data-pass606-evidence-driven-neural-motion',
  'aria-labelledby="vlm-neural-audit-title"',
  "resolvePass605FocusTrap",
  "NeuralFallback2D",
]);
markers("app/globals.css", [
  "PASS602–606",
  ".velmere-neural-audit-header",
  ".velmere-neural-topology-dock",
  'data-pass603-fallback-2d="content-parity"',
  "prefers-reduced-motion: reduce",
]);

const componentSource = read("components/market-integrity/VlmNeuralAuditExperience.tsx");
for (const forbidden of [
  "mobile interaction replay",
  "fps budget",
  "% drop",
  "frame = window.requestAnimationFrame(animate)",
]) {
  if (componentSource.includes(forbidden)) errors.push(`public/runtime regression: ${forbidden}`);
}

function loadPureTsModule(file) {
  const source = read(file);
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: file,
    reportDiagnostics: true,
  });
  for (const diagnostic of output.diagnostics ?? []) {
    if (diagnostic.category === ts.DiagnosticCategory.Error) {
      errors.push(`${file} transpile: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")}`);
    }
  }
  const module = { exports: {} };
  const execute = new Function(
    "exports",
    "require",
    "module",
    "__filename",
    "__dirname",
    output.outputText,
  );
  execute(module.exports, () => ({}), module, file, path.dirname(file));
  return module.exports;
}

try {
  const evidence = [
    { id: "identity", label: "Identity", value: "ETH", note: "Verified identity", status: "verified" },
    { id: "price", label: "Price", value: "3500", note: "Current quote", status: "verified" },
    { id: "source", label: "Source", value: "Provider A", note: "Live", status: "verified" },
    { id: "venueConflict", label: "Venue mismatch", value: "Provider B", note: "Provider conflict", status: "review" },
    { id: "holders", label: "Holder concentration", value: "", note: "Source missing", status: "missing" },
    { id: "confidence", label: "Confidence", value: "88%", note: "", status: "verified" },
  ];

  const pass602 = loadPureTsModule("lib/market-integrity/pass602-neural-evidence-topology.ts");
  const topology = pass602.buildPass602NeuralEvidenceTopology({ subject: "ETH", evidence, locale: "pl" });
  const repeated = pass602.buildPass602NeuralEvidenceTopology({ subject: "ETH", evidence, locale: "pl" });
  if (
    topology.version !== "pass602-neural-evidence-topology" ||
    topology.publicWeightExposure !== false ||
    topology.verdictNodeId !== repeated.verdictNodeId ||
    topology.conflictCount < 1 ||
    !topology.nodes.some((node) => node.kind === "source" && node.status === "missing") ||
    !topology.nodes.some((node) => node.kind === "agent" && node.label === "tożsamość")
  ) {
    errors.push("PASS602 stable/localized/source/conflict topology failed");
  }
  const activePath = pass602.resolvePass602ActiveNeuralPath(topology, topology.lobeIds[0]);
  if (!activePath.activeNodeId || !activePath.visibleNodeIds.includes(topology.lobeIds[0]) || activePath.sourceIds.length < 1) {
    errors.push("PASS602 active evidence path failed");
  }

  const pass603 = loadPureTsModule("lib/market-integrity/pass603-progressive-lobe-rendering.ts");
  const nodeIds = [topology.verdictNodeId, ...topology.lobeIds];
  const hidden = pass603.buildPass603ProgressiveLobeRendering({ mode: "advanced", lobeIds: nodeIds, visible: false, webglSupported: true });
  const critical = pass603.buildPass603ProgressiveLobeRendering({ mode: "advanced", lobeIds: nodeIds, visible: true, webglSupported: true, hardwareConcurrency: 2, deviceMemory: 2, viewportWidth: 340, coarsePointer: true });
  const normal = pass603.buildPass603ProgressiveLobeRendering({ mode: "advanced", lobeIds: nodeIds, visible: true, webglSupported: true, hardwareConcurrency: 12, deviceMemory: 16, viewportWidth: 1440, coarsePointer: false });
  if (hidden.renderer !== "offscreen" || hidden.visualNodeIds.length !== 0 || hidden.accessibleNodeIds.length !== nodeIds.length || critical.renderer !== "fallback_2d" || critical.lobeBudget > 5 || normal.renderer !== "webgl") {
    errors.push("PASS603 offscreen/fallback/GPU budgets failed");
  }

  const pass604 = loadPureTsModule("lib/market-integrity/pass604-confidence-propagation.ts");
  const confidence = pass604.buildPass604ConfidencePropagation({ topology, evidence });
  if (confidence.finalConfidence !== 54 || confidence.limitingState !== "missing_source" || confidence.conflicts < 1 || confidence.missingSources < 1 || !confidence.traces.every((trace) => trace.path.length > 0)) {
    errors.push("PASS604 source/conflict confidence propagation failed");
  }

  const pass605 = loadPureTsModule("lib/market-integrity/pass605-brain-interaction-contract.ts");
  const contract = pass605.buildPass605BrainInteractionContract({ nodeIds, viewportWidth: 390, coarsePointer: true });
  const down = pass605.resolvePass605BrainNavigation({ key: "ArrowDown", index: 0, count: 6, columns: 1 });
  const select = pass605.resolvePass605BrainNavigation({ key: "Enter", index: 2, count: 6, columns: 2 });
  const close = pass605.resolvePass605BrainNavigation({ key: "Escape", index: 2, count: 6, columns: 2 });
  const wrap = pass605.resolvePass605FocusTrap({ activeIndex: 5, focusableCount: 6, shiftKey: false });
  if (contract.targetFloorPx !== 44 || contract.columns !== 1 || down.index !== 1 || select.action !== "select" || close.action !== "close" || wrap !== 0) {
    errors.push("PASS605 keyboard/touch/focus trap contract failed");
  }

  const pass606 = loadPureTsModule("lib/market-integrity/pass606-evidence-driven-neural-motion.ts");
  const fingerprint = pass606.createPass606NeuralEvidenceFingerprint({ subject: "ETH", activeNodeId: topology.verdictNodeId, evidence, sourceIds: topology.sourceIds, conflictCount: topology.conflictCount, confidence: confidence.finalConfidence });
  const initial = pass606.buildPass606EvidenceDrivenNeuralMotion({ fingerprint, previousFingerprint: null, visible: true, reducedMotion: false });
  const settled = pass606.buildPass606EvidenceDrivenNeuralMotion({ fingerprint, previousFingerprint: fingerprint, visible: true, reducedMotion: false });
  const lineage = pass606.buildPass606EvidenceDrivenNeuralMotion({ fingerprint: `${fingerprint}-lobe`, previousFingerprint: fingerprint, visible: true, reducedMotion: false, activeNodeChanged: true });
  const reduced = pass606.buildPass606EvidenceDrivenNeuralMotion({ fingerprint, previousFingerprint: null, visible: true, reducedMotion: true });
  if (!initial.animate || initial.iterations !== 1 || settled.animate || lineage.mode !== "lineage_delta" || lineage.iterations !== 1 || reduced.animate || reduced.mode !== "reduced") {
    errors.push("PASS606 one-shot evidence/lineage/reduced motion failed");
  }
} catch (error) {
  errors.push(`PASS602–606 runtime helper test failed: ${error.stack || error.message}`);
}

for (const file of requiredFiles.filter((file) => /\.tsx?$/.test(file))) {
  const source = read(file);
  const parsed = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  for (const diagnostic of parsed.parseDiagnostics ?? []) {
    const position = parsed.getLineAndCharacterOfPosition(diagnostic.start ?? 0);
    errors.push(`${file}:${position.line + 1}:${position.character + 1} ${ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")}`);
  }
}

const packageJson = JSON.parse(read("package.json") || "{}");
for (const script of [
  "verify:pass602-606-vlm-brain-topology-release",
  "typecheck:pass606",
]) {
  if (!packageJson.scripts?.[script]) errors.push(`missing package script ${script}`);
}
if (!String(packageJson.scripts?.build || "").includes("verify:pass602-606-vlm-brain-topology-release")) {
  errors.push("PASS602–606 verifier missing from build chain");
}

if (errors.length) {
  console.error(`PASS602–606 gate failed (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log(
  "PASS602–606 gate PASS · stable neural evidence topology · progressive WebGL/2D lobe budgets · source-bound confidence propagation · modal keyboard/touch contract · one-shot evidence-driven motion",
);
