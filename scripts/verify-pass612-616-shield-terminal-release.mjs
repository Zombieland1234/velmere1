import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = process.cwd();
const errors = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const requiredFiles = [
  "lib/market-integrity/pass612-one-source-state-contract.ts",
  "lib/market-integrity/pass613-modal-viewport-governor.ts",
  "lib/market-integrity/pass614-chart-evidence-overlay.ts",
  "lib/market-integrity/pass615-tier-information-architecture.ts",
  "lib/market-integrity/pass616-shield-mobile-stress-sweep.ts",
  "components/market-integrity/TokenRiskModal.tsx",
  "app/globals.css",
  "tsconfig.pass616.json",
];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) errors.push(`missing ${file}`);
}

function markers(file, values) {
  const source = read(file);
  for (const value of values) {
    if (!source.includes(value)) errors.push(`${file} missing marker: ${value}`);
  }
}

markers("lib/market-integrity/pass612-one-source-state-contract.ts", [
  'version: "pass612-one-source-state-contract"',
  '| "live"',
  '| "partial"',
  '| "stale"',
  '| "fallback"',
  '| "offline"',
  'timestampKind: Pass612TimestampKind',
  'same live, partial, stale, fallback or offline state',
]);
markers("lib/market-integrity/pass613-modal-viewport-governor.ts", [
  'version: "pass613-modal-viewport-governor"',
  'singleScrollOwner: "dialog_shell"',
  'minimumTargetPx: 44',
  '"--shield-vv-height"',
]);
markers("lib/market-integrity/pass614-chart-evidence-overlay.ts", [
  'version: "pass614-chart-evidence-overlay"',
  'crosshairFields',
  'confidenceCap',
  'gapCount',
]);
markers("lib/market-integrity/pass615-tier-information-architecture.ts", [
  'version: "pass615-tier-information-architecture"',
  'basic: 10',
  'pro: 14',
  'advanced: 20',
  'velmere:shield-analysis-tier:v1',
]);
markers("lib/market-integrity/pass616-shield-mobile-stress-sweep.ts", [
  'version: "pass616-shield-mobile-stress-sweep"',
  'supported-width',
  'single-scroll-owner',
  'zoom-layout',
]);
markers("components/market-integrity/TokenRiskModal.tsx", [
  'data-pass612-source-state',
  'data-pass613-modal-viewport-governor',
  'data-pass614-chart-evidence-overlay',
  'data-pass615-tier-memory',
  'data-pass616-mobile-stress',
  'window.visualViewport',
  'closeButtonRef.current?.focus',
  'opener.focus({ preventScroll: true })',
  'data-single-scroll-owner="dialog_shell"',
]);
markers("app/globals.css", [
  'PASS612–616',
  'var(--shield-vv-height',
  '.shield-tier-quick-dock',
  '.shield-chart-evidence-rail',
  'min-height: 44px',
  '@media (max-width: 360px)',
  '@media (orientation: landscape)',
  '@media (prefers-reduced-motion: reduce)',
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
  const execute = new Function("exports", "require", "module", "__filename", "__dirname", output.outputText);
  execute(module.exports, () => ({}), module, file, path.dirname(file));
  return module.exports;
}

try {
  const pass612 = loadPureTsModule("lib/market-integrity/pass612-one-source-state-contract.ts");
  const contract = pass612.buildPass612OneSourceStateContract({
    now: "2026-06-08T10:00:00.000Z",
    generatedAt: "2026-06-08T10:00:00.000Z",
    layers: [
      {
        id: "market",
        label: "Market",
        provider: "Provider A",
        observedAt: "2026-06-08T09:59:00.000Z",
        timestampKind: "provider",
        recordCount: 1,
        expectedRecords: 1,
        required: true,
      },
      {
        id: "candles",
        label: "Candles",
        provider: "Provider B",
        backupProvider: "Provider C",
        observedAt: "2026-06-08T09:58:00.000Z",
        timestampKind: "provider",
        recordCount: 72,
        expectedRecords: 72,
        required: true,
      },
      {
        id: "orderbook",
        label: "Orderbook",
        provider: "Route cache",
        observedAt: "2026-06-08T09:59:30.000Z",
        timestampKind: "route",
        recordCount: 1,
        expectedRecords: 1,
        required: false,
      },
      {
        id: "osint",
        label: "OSINT",
        provider: null,
        observedAt: null,
        timestampKind: "none",
        recordCount: 0,
        expectedRecords: 1,
        required: false,
      },
    ],
  });
  if (contract.aggregateState !== "live" || contract.confidenceCap < 80) {
    errors.push("PASS612 optional offline layer incorrectly degraded required aggregate");
  }
  if (contract.layers.find((layer) => layer.id === "orderbook")?.state !== "partial") {
    errors.push("PASS612 route timestamp upgraded to provider-live");
  }
  if (contract.layers.find((layer) => layer.id === "osint")?.state !== "offline") {
    errors.push("PASS612 offline source state failed");
  }

  const pass613 = loadPureTsModule("lib/market-integrity/pass613-modal-viewport-governor.ts");
  const keyboardGovernor = pass613.buildPass613ModalViewportGovernor({
    layoutWidth: 390,
    layoutHeight: 844,
    visualWidth: 390,
    visualHeight: 472,
    offsetLeft: 0,
    offsetTop: 0,
    scale: 1,
    safeTop: 20,
    safeBottom: 16,
  });
  if (keyboardGovernor.mode !== "keyboard" || keyboardGovernor.keyboardOcclusion < 300) {
    errors.push("PASS613 visual viewport keyboard governor failed");
  }
  if (keyboardGovernor.singleScrollOwner !== "dialog_shell" || keyboardGovernor.minimumTargetPx !== 44) {
    errors.push("PASS613 modal scroll/target contract failed");
  }

  const pass614 = loadPureTsModule("lib/market-integrity/pass614-chart-evidence-overlay.ts");
  const overlay = pass614.buildPass614ChartEvidenceOverlay({
    locale: "pl",
    sourceContract: contract,
    chartLayerId: "candles",
    candleTimestamp: "2026-06-08T09:58:00.000Z",
    gapCount: 2,
  });
  if (overlay.sourceState !== "live" || overlay.gapCount !== 2 || overlay.crosshairFields.length !== 5) {
    errors.push("PASS614 chart source/crosshair evidence overlay failed");
  }

  const pass615 = loadPureTsModule("lib/market-integrity/pass615-tier-information-architecture.ts");
  const labels = {};
  const values = {
    price: "$100", change24h: "1%", change7d: "4%", marketCap: "$1B", volume: "$20M",
    risk: "20/100", confidence: "88%", sourceState: "live", candles: 72, gaps: 2,
    change1h: "0.2%", fdv: "$1.2B", liquidity: "$5M", secondSource: "Provider C",
    slippage: "0.3%", depth: "$1M / $1M", holders: "100k", concentration: "22%",
    supply: "80%", contract: "verified",
  };
  const basic = pass615.buildPass615TierInformationArchitecture({ tier: "basic", sourceContract: contract, labels, values });
  const pro = pass615.buildPass615TierInformationArchitecture({ tier: "pro", sourceContract: contract, labels, values });
  const advanced = pass615.buildPass615TierInformationArchitecture({ tier: "advanced", sourceContract: contract, labels, values });
  if (basic.fields.length !== 10 || pro.fields.length !== 14 || advanced.fields.length !== 20) {
    errors.push("PASS615 tier budgets are not exactly 10/14/20");
  }
  if (basic.distinctFieldCount !== 10 || pro.distinctFieldCount !== 14 || advanced.distinctFieldCount !== 20) {
    errors.push("PASS615 tiers repeat fields instead of adding unique dimensions");
  }
  if (!basic.fields.every((field, index) => pro.fields[index]?.id === field.id) || !pro.fields.every((field, index) => advanced.fields[index]?.id === field.id)) {
    errors.push("PASS615 progressive disclosure hierarchy failed");
  }

  const pass616 = loadPureTsModule("lib/market-integrity/pass616-shield-mobile-stress-sweep.ts");
  for (const width of [320, 360, 390, 430]) {
    const sweep = pass616.buildPass616ShieldMobileStressSweep({
      width,
      height: 844,
      orientation: "portrait",
      zoomPercent: 200,
      keyboardOcclusion: 280,
      minimumTargetPx: 44,
      focusTrap: true,
      closeReachable: true,
      singleScrollOwner: true,
      backdropCloses: true,
    });
    if (sweep.state !== "pass") errors.push(`PASS616 ${width}px portrait/200% sweep failed: ${sweep.failedChecks.join(",")}`);
  }
  const landscape = pass616.buildPass616ShieldMobileStressSweep({
    width: 844,
    height: 390,
    orientation: "landscape",
    zoomPercent: 100,
    keyboardOcclusion: 0,
    minimumTargetPx: 44,
    focusTrap: true,
    closeReachable: true,
    singleScrollOwner: true,
    backdropCloses: true,
  });
  if (landscape.state !== "pass") errors.push("PASS616 landscape sweep failed");
} catch (error) {
  errors.push(`PASS612–616 runtime helper test failed: ${error.stack || error.message}`);
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

const packageJson = JSON.parse(read("package.json"));
for (const script of [
  "verify:pass612-616-shield-terminal-release",
  "typecheck:pass616",
]) {
  if (!packageJson.scripts?.[script]) errors.push(`missing package script ${script}`);
}
if (!String(packageJson.scripts?.build || "").includes("verify:pass612-616-shield-terminal-release")) {
  errors.push("PASS612–616 verifier missing from build chain");
}

if (errors.length) {
  console.error(`PASS612–616 gate failed (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log("PASS612–616 gate PASS · one source-state contract · VisualViewport modal governor · source-bound chart crosshair · exact 10/14/20 tier fields · 320/360/390/430 mobile, landscape and 200% zoom invariants");
