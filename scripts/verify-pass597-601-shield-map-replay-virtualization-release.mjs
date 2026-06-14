import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const errors = [];
const requiredFiles = [
  "lib/market-integrity/pass597-shield-map-multi-snapshot-replay.ts",
  "lib/market-integrity/pass598-visible-node-virtualization.ts",
  "lib/market-integrity/pass599-evidence-path-isolation.ts",
  "lib/market-integrity/pass600-keyboard-spatial-navigation.ts",
  "lib/market-integrity/pass601-evidence-only-motion.ts",
  "components/market-integrity/ShieldMapClient.tsx",
  "app/globals.css",
  "tsconfig.pass601.json",
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

markers("lib/market-integrity/pass597-shield-map-multi-snapshot-replay.ts", [
  'version: "pass597-shield-map-multi-snapshot-replay"',
  'state: "empty" | "baseline" | "ready" | "identity_rejected"',
  "rejectedSnapshotIds",
  "materialChanges",
  "normalizePass597EvidenceSnapshots",
]);
markers("lib/market-integrity/pass598-visible-node-virtualization.ts", [
  'version: "pass598-visible-node-virtualization"',
  "assessPass598DevicePressure",
  "mountedIndices",
  "offscreen_nodes_unmounted",
]);
markers("lib/market-integrity/pass599-evidence-path-isolation.ts", [
  'version: "pass599-evidence-path-isolation"',
  'state: "active" | "dependency" | "dependent" | "conflict" | "unrelated"',
  "visibleNodeIds",
  "confidenceCap",
]);
markers("lib/market-integrity/pass600-keyboard-spatial-navigation.ts", [
  'version: "pass600-keyboard-spatial-navigation"',
  'case "ArrowRight"',
  'case "ArrowDown"',
  'case "Escape"',
]);
markers("lib/market-integrity/pass601-evidence-only-motion.ts", [
  'version: "pass601-evidence-only-motion"',
  'mode: "offscreen" | "reduced" | "settled" | "probing" | "evidence_delta"',
  "createPass601EvidenceFingerprint",
  "iterations: animate ? 1 : 0",
]);
markers("components/market-integrity/ShieldMapClient.tsx", [
  "buildPass597ShieldMapMultiSnapshotReplay",
  "buildPass598VisibleNodeVirtualization",
  "buildPass599EvidencePathIsolation",
  "resolvePass600SpatialNavigation",
  "buildPass601EvidenceOnlyMotion",
  'data-pass597-multi-snapshot-replay',
  'data-pass598-visible-node-virtualization',
  'data-pass599-evidence-path-isolation',
  'data-pass600-keyboard-spatial-navigation="roving-tabindex"',
  'data-pass601-evidence-motion',
  'role="grid"',
  'role="row"',
  "atlasDrawerInteractive",
  "PASS597_SNAPSHOT_HISTORY_KEY",
  "const trapFocus = (event: KeyboardEvent)",
]);
markers("app/globals.css", [
  "PASS597–601",
  ".shield-map-replay-frame",
  ".shield-map-atlas-row",
  ".shield-map-atlas-node.shield-map-path-active",
  ".shield-orbit-pressure-critical",
  ".shield-evidence-motion-evidence_delta",
  "prefers-reduced-motion: reduce",
]);

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
  const pass597 = loadPureTsModule("lib/market-integrity/pass597-shield-map-multi-snapshot-replay.ts");
  const normalizedSnapshots = pass597.normalizePass597EvidenceSnapshots([
    { id: "safe", symbol: " eth ", timestamp: "2026-06-08T08:00:00Z", sourceState: "live", overallRisk: 140, confidence: "High", blockedBy: [" holders ", "holders"] },
    { id: "invalid", symbol: "", timestamp: "not-a-date", overallRisk: "NaN" },
  ]);
  if (normalizedSnapshots.length !== 1 || normalizedSnapshots[0].symbol !== "ETH" || normalizedSnapshots[0].overallRisk !== 100 || normalizedSnapshots[0].blockedBy.length !== 1) {
    errors.push("PASS597 persisted snapshot normalization failed");
  }
  const ready = pass597.buildPass597ShieldMapMultiSnapshotReplay({
    locale: "en",
    snapshots: [
      { id: "s1", symbol: "ETH", timestamp: "2026-06-08T09:00:00Z", sourceState: "partial", overallRisk: 42, confidence: "Low", blockedBy: ["holders"] },
      { id: "s2", symbol: "ETH", timestamp: "2026-06-08T10:00:00Z", sourceState: "live", overallRisk: 58, confidence: "Medium", blockedBy: ["holders", "vesting", "contract"] },
      { id: "s3", symbol: "ETH", timestamp: "2026-06-08T11:00:00Z", sourceState: "live", overallRisk: 51, confidence: "Medium", blockedBy: ["contract"] },
    ],
  });
  if (ready.state !== "ready" || ready.frames.length !== 3 || ready.materialChanges < 1) {
    errors.push("PASS597 same-identity multi-snapshot replay failed");
  }
  const mixed = pass597.buildPass597ShieldMapMultiSnapshotReplay({
    snapshots: [
      { id: "btc", symbol: "BTC", timestamp: "2026-06-08T09:00:00Z", sourceState: "live", overallRisk: 30, confidence: "High", blockedBy: [] },
      { id: "eth", symbol: "ETH", timestamp: "2026-06-08T10:00:00Z", sourceState: "partial", overallRisk: 55, confidence: "Low", blockedBy: ["holders"] },
    ],
  });
  if (mixed.state !== "identity_rejected" || !mixed.rejectedSnapshotIds.includes("btc") || mixed.identity !== "ETH") {
    errors.push("PASS597 mixed-identity rejection failed");
  }

  const pass598 = loadPureTsModule("lib/market-integrity/pass598-visible-node-virtualization.ts");
  const hidden = pass598.buildPass598VisibleNodeVirtualization({ totalNodes: 10, viewportState: "hidden", pressure: "normal" });
  const critical = pass598.buildPass598VisibleNodeVirtualization({ totalNodes: 10, viewportState: "visible", pressure: "critical" });
  const normal = pass598.buildPass598VisibleNodeVirtualization({ totalNodes: 10, viewportState: "visible", pressure: "normal" });
  if (hidden.mountCount !== 0 || critical.mountCount > 5 || normal.mountCount !== 10) {
    errors.push("PASS598 viewport/GPU budgets failed");
  }
  if (pass598.assessPass598DevicePressure({ hardwareConcurrency: 2, deviceMemory: 2, viewportWidth: 375, coarsePointer: true }) !== "critical") {
    errors.push("PASS598 device pressure assessment failed");
  }

  const pass599 = loadPureTsModule("lib/market-integrity/pass599-evidence-path-isolation.ts");
  const pathPlan = pass599.buildPass599EvidencePathIsolation({
    activeId: "agent-fusion",
    nodes: [
      { id: "source-root", citations: ["S00"] },
      { id: "sources", dependsOn: ["source-root"], citations: ["S01"] },
      { id: "agent-fusion", dependsOn: ["sources", "holder-agent"], citations: ["S02", "S03"], conflicts: ["social-hype"], confidenceCap: "Medium until holder source is current." },
      { id: "holder-agent", citations: ["S04"] },
      { id: "social-hype", conflicts: ["agent-fusion"] },
      { id: "unrelated" },
    ],
  });
  if (
    pathPlan.state !== "ready" ||
    !pathPlan.visibleNodeIds.includes("source-root") ||
    !pathPlan.visibleNodeIds.includes("sources") ||
    !pathPlan.visibleNodeIds.includes("holder-agent") ||
    !pathPlan.visibleNodeIds.includes("social-hype") ||
    pathPlan.visibleNodeIds.includes("unrelated") ||
    pathPlan.conflictIds[0] !== "social-hype"
  ) {
    errors.push("PASS599 active evidence path isolation failed");
  }

  const pass600 = loadPureTsModule("lib/market-integrity/pass600-keyboard-spatial-navigation.ts");
  const right = pass600.resolvePass600SpatialNavigation({ key: "ArrowRight", index: 0, count: 8, columns: 3 });
  const down = pass600.resolvePass600SpatialNavigation({ key: "ArrowDown", index: 1, count: 8, columns: 3 });
  const home = pass600.resolvePass600SpatialNavigation({ key: "Home", index: 6, count: 8, columns: 3 });
  const end = pass600.resolvePass600SpatialNavigation({ key: "End", index: 0, count: 8, columns: 3 });
  const open = pass600.resolvePass600SpatialNavigation({ key: "Enter", index: 4, count: 8, columns: 3 });
  const close = pass600.resolvePass600SpatialNavigation({ key: "Escape", index: 4, count: 8, columns: 3 });
  if (right.index !== 1 || down.index !== 4 || home.index !== 0 || end.index !== 7 || open.action !== "open" || close.action !== "close") {
    errors.push("PASS600 spatial keyboard actions failed");
  }

  const pass601 = loadPureTsModule("lib/market-integrity/pass601-evidence-only-motion.ts");
  const fingerprint = pass601.createPass601EvidenceFingerprint({ snapshotId: "s1", deltaState: "changed", riskDelta: 12, blockerDelta: 1, sourceState: "live" });
  const settled = pass601.buildPass601EvidenceOnlyMotion({ visible: true, reducedMotion: false, loading: false, evidenceChanged: false, fingerprint });
  const delta = pass601.buildPass601EvidenceOnlyMotion({ visible: true, reducedMotion: false, loading: false, evidenceChanged: true, fingerprint });
  const reduced = pass601.buildPass601EvidenceOnlyMotion({ visible: true, reducedMotion: true, loading: false, evidenceChanged: true, fingerprint });
  if (settled.animate || !delta.animate || delta.iterations !== 1 || reduced.animate || reduced.mode !== "reduced") {
    errors.push("PASS601 evidence-only motion contract failed");
  }
} catch (error) {
  errors.push(`PASS597–601 runtime helper test failed: ${error.stack || error.message}`);
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
  "verify:pass597-601-shield-map-replay-virtualization-release",
  "typecheck:pass601",
]) {
  if (!packageJson.scripts?.[script]) errors.push(`missing package script ${script}`);
}
if (!String(packageJson.scripts?.build || "").includes("verify:pass597-601-shield-map-replay-virtualization-release")) {
  errors.push("PASS597–601 verifier missing from build chain");
}

if (errors.length) {
  console.error(`PASS597–601 gate failed (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log(
  "PASS597–601 gate PASS · same-identity multi-snapshot replay · viewport/GPU node virtualization · isolated evidence paths · spatial keyboard grid · one-shot evidence-only motion",
);
