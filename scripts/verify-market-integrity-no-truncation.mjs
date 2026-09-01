#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { loadTypeScript } = require("./lib/load-typescript.cjs");
const ts = loadTypeScript();
const root = process.cwd();
const assertions = [];
const failures = [];

function check(value, id, detail = "") {
  const ok = Boolean(value);
  assertions.push({ ok, id, detail });
  if (!ok) failures.push({ id, detail });
}

function read(relative) {
  const absolute = path.join(root, relative);
  check(fs.existsSync(absolute), `file:${relative}`, "required active file exists");
  return fs.existsSync(absolute) ? fs.readFileSync(absolute, "utf8") : "";
}

const activeFiles = [
  "components/market-integrity/MarketIntegrityClient.tsx",
  "components/market-integrity/TokenRiskModal.tsx",
  "components/market-integrity/ShieldMapClient.tsx",
  "components/market-integrity/ShieldMapCommandClient.tsx",
  "lib/market-integrity/risk-brain.ts",
  "lib/market-integrity/holder-intelligence.ts",
  "lib/market-integrity/stress-simulator.ts",
  "lib/market-integrity/risk-replay.ts",
  "lib/market-integrity/ai-risk-bot.ts",
  "lib/market-integrity/ai-orchestrator.ts",
  "lib/market-integrity/shield-chat.ts",
  "lib/market-integrity/chart-regime.ts",
  "lib/market-integrity/soc-orchestrator.ts",
  "lib/market-integrity/vlm-access-layer.ts",
  "lib/market-integrity/terminal-readiness.ts",
  "lib/market-integrity/liquidity-intelligence.ts",
  "lib/market-integrity/evidence-workflow.ts",
  "lib/market-integrity/product-ops-audit.ts",
  "lib/market-integrity/terminal-control-plane.ts",
  "lib/market-integrity/terminal-risk-workspace.ts",
  "lib/market-integrity/production-hardening.ts",
  "lib/market-integrity/terminal-usability-guard.ts",
  "lib/market-integrity/terminal-performance-guard.ts",
  "lib/market-integrity/terminal-operator-copilot.ts",
  "lib/market-integrity/terminal-launch-bridge.ts",
  "lib/market-integrity/terminal-source-trust.ts",
  "lib/market-integrity/terminal-evidence-export.ts",
  "lib/market-integrity/terminal-runtime-health.ts",
  "lib/market-integrity/terminal-operator-focus.ts",
  "lib/market-integrity/terminal-interaction-stability.ts",
  "lib/market-integrity/terminal-review-deck.ts",
  "lib/market-integrity/binance-klines.ts",
  "lib/market-integrity/coingecko.ts",
  "app/api/market-integrity/report/route.ts",
  "app/[locale]/market-integrity/shield-map/page.tsx",
  "app/[locale]/shield-map/page.tsx",
];

const truncationMarkers = [
  "[... ELLIPSIZATION ...]",
  "/* truncated */",
  "TODO: CUT",
  "reszta bez zmian",
  "<TRUNCATED>",
];

for (const relative of activeFiles) {
  const source = read(relative);
  if (!source) continue;
  for (const marker of truncationMarkers) {
    check(!source.includes(marker), `not-truncated:${relative}:${marker}`, marker);
  }
  const output = ts.transpileModule(source, {
    fileName: relative,
    reportDiagnostics: true,
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  });
  const errors = (output.diagnostics ?? []).filter((entry) => entry.category === ts.DiagnosticCategory.Error);
  check(errors.length === 0, `syntax:${relative}`, errors.map((entry) => ts.flattenDiagnosticMessageText(entry.messageText, " ")).join(" | "));
}

const reportRoute = read("app/api/market-integrity/report/route.ts");
const consolidatedBuilders = [
  "buildTerminalControlPlane",
  "buildTerminalUsabilityGuard",
  "buildTerminalOperatorCopilot",
  "buildTerminalLaunchBridge",
  "buildTerminalSourceTrust",
  "buildTerminalEvidenceExport",
  "buildTerminalRuntimeHealth",
  "buildTerminalOperatorFocus",
  "buildTerminalReviewDeck",
];
for (const builder of consolidatedBuilders) {
  check(reportRoute.includes(builder), `report-consolidation:${builder}`, "builder remains in the consolidated report route");
}

const modal = read("components/market-integrity/TokenRiskModal.tsx");
for (const command of ["risk", "control", "sources", "export", "runtime", "deck"]) {
  check(modal.includes(`"${command}"`), `modal-command:${command}`, "current command remains represented");
}
check(modal.includes('activeCommand === "control"'), "modal-focused-command-routing", "focused control lane remains explicit");

const localizedMapPage = read("app/[locale]/market-integrity/shield-map/page.tsx");
const shortMapPage = read("app/[locale]/shield-map/page.tsx");
for (const [id, source] of [["canonical", localizedMapPage], ["short", shortMapPage]]) {
  check(source.includes("SUPPORTED_LOCALES"), `shield-map:${id}:locale-guard`, "locale guard present");
  check(source.includes("ShieldMapCommandClient"), `shield-map:${id}:client`, "current command client present");
}

const removedStandaloneRoutes = [
  "app/api/market-integrity/ops-audit/route.ts",
  "app/api/market-integrity/control-plane/route.ts",
  "app/api/market-integrity/production-hardening/route.ts",
  "app/api/market-integrity/operator-copilot/route.ts",
  "app/api/market-integrity/runtime-health/route.ts",
  "app/api/market-integrity/operator-focus/route.ts",
];
for (const relative of removedStandaloneRoutes) {
  check(!fs.existsSync(path.join(root, relative)), `legacy-route-removed:${relative}`, "capability is consolidated into the report route");
}

const receipt = {
  schemaVersion: "velmere.pass4689.market-integrity-no-truncation.v2",
  generatedAt: new Date().toISOString(),
  status: failures.length === 0 ? "PASS" : "FAIL",
  assertions: assertions.length,
  activeFiles: activeFiles.length,
  consolidatedBuilders: consolidatedBuilders.length,
  failures,
};
fs.mkdirSync(path.join(root, "artifacts/pass4689"), { recursive: true });
fs.writeFileSync(path.join(root, "artifacts/pass4689/market-integrity-no-truncation.json"), JSON.stringify(receipt, null, 2));
if (failures.length) {
  console.error(JSON.stringify(receipt, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(receipt, null, 2));
