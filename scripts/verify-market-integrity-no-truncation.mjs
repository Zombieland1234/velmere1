#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let ts;
try {
  ts = require('typescript');
} catch {
  ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
}

const root = process.cwd();
const requiredFiles = [
  'components/market-integrity/MarketIntegrityClient.tsx',
  'components/market-integrity/TokenRiskModal.tsx',
  'components/market-integrity/ShieldMapClient.tsx',
  'lib/market-integrity/risk-brain.ts',
  'lib/market-integrity/holder-intelligence.ts',
  'lib/market-integrity/stress-simulator.ts',
  'lib/market-integrity/risk-replay.ts',
  'lib/market-integrity/ai-risk-bot.ts',
  'lib/market-integrity/ai-orchestrator.ts',
  'lib/market-integrity/shield-chat.ts',
  'lib/market-integrity/chart-regime.ts',
  'lib/market-integrity/soc-orchestrator.ts',
  'lib/market-integrity/vlm-access-layer.ts',
  'lib/market-integrity/terminal-readiness.ts',
  'lib/market-integrity/liquidity-intelligence.ts',
  'lib/market-integrity/evidence-workflow.ts',
  'lib/market-integrity/product-ops-audit.ts',
  'lib/market-integrity/terminal-control-plane.ts',
  'lib/market-integrity/terminal-risk-workspace.ts',
  'lib/market-integrity/production-hardening.ts',
  'lib/market-integrity/terminal-usability-guard.ts',
  'lib/market-integrity/terminal-performance-guard.ts',
  'lib/market-integrity/terminal-operator-copilot.ts',
  'lib/market-integrity/terminal-launch-bridge.ts',
  'lib/market-integrity/terminal-source-trust.ts',
  'lib/market-integrity/terminal-evidence-export.ts',
  'lib/market-integrity/terminal-runtime-health.ts',
  'lib/market-integrity/terminal-operator-focus.ts',
  'lib/market-integrity/terminal-interaction-stability.ts',
  'lib/market-integrity/terminal-review-deck.ts',
  'lib/market-integrity/binance-klines.ts',
  'lib/market-integrity/coingecko.ts',
  'app/api/market-integrity/brain/route.ts',
  'app/api/market-integrity/holders/route.ts',
  'app/api/market-integrity/stress/route.ts',
  'app/api/market-integrity/replay/route.ts',
  'app/api/market-integrity/assistant/route.ts',
  'app/api/market-integrity/orchestrator/route.ts',
  'app/api/market-integrity/chat/route.ts',
  'app/api/market-integrity/chart-regime/route.ts',
  'app/api/market-integrity/soc/route.ts',
  'app/api/market-integrity/access/route.ts',
  'app/api/market-integrity/readiness/route.ts',
  'app/api/market-integrity/liquidity-intelligence/route.ts',
  'app/api/market-integrity/evidence-workflow/route.ts',
  'app/api/market-integrity/ops-audit/route.ts',
  'app/api/market-integrity/control-plane/route.ts',
  'app/api/market-integrity/workspace/route.ts',
  'app/api/market-integrity/production-hardening/route.ts',
  'app/api/market-integrity/usability-guard/route.ts',
  'app/api/market-integrity/performance-guard/route.ts',
  'app/api/market-integrity/operator-copilot/route.ts',
  'app/api/market-integrity/launch-bridge/route.ts',
  'app/api/market-integrity/source-trust/route.ts',
  'app/api/market-integrity/evidence-export/route.ts',
  'app/api/market-integrity/runtime-health/route.ts',
  'app/api/market-integrity/operator-focus/route.ts',
  'app/api/market-integrity/interaction-stability/route.ts',
  'app/api/market-integrity/review-deck/route.ts',
  'app/api/market-integrity/report/route.ts',
  'app/[locale]/market-integrity/shield-map/page.tsx',
  'app/market-integrity/shield-map/page.tsx',
];

const minimumLines = {
  'components/market-integrity/MarketIntegrityClient.tsx': 850,
  'components/market-integrity/TokenRiskModal.tsx': 1700,
  'components/market-integrity/ShieldMapClient.tsx': 300,
  'lib/market-integrity/risk-brain.ts': 130,
  'lib/market-integrity/holder-intelligence.ts': 150,
  'lib/market-integrity/stress-simulator.ts': 120,
  'lib/market-integrity/risk-replay.ts': 190,
  'lib/market-integrity/ai-risk-bot.ts': 95,
  'lib/market-integrity/ai-orchestrator.ts': 150,
  'lib/market-integrity/shield-chat.ts': 180,
  'lib/market-integrity/chart-regime.ts': 100,
  'lib/market-integrity/soc-orchestrator.ts': 180,
  'lib/market-integrity/vlm-access-layer.ts': 195,
  'lib/market-integrity/terminal-readiness.ts': 160,
  'lib/market-integrity/liquidity-intelligence.ts': 190,
  'lib/market-integrity/evidence-workflow.ts': 160,
  'lib/market-integrity/product-ops-audit.ts': 220,
  'lib/market-integrity/terminal-control-plane.ts': 220,
  'lib/market-integrity/terminal-risk-workspace.ts': 300,
  'lib/market-integrity/production-hardening.ts': 260,
  'lib/market-integrity/terminal-usability-guard.ts': 220,
  'lib/market-integrity/terminal-performance-guard.ts': 50,
  'lib/market-integrity/terminal-operator-copilot.ts': 150,
  'lib/market-integrity/terminal-launch-bridge.ts': 180,
  'lib/market-integrity/terminal-source-trust.ts': 220,
  'lib/market-integrity/terminal-evidence-export.ts': 250,
  'lib/market-integrity/terminal-runtime-health.ts': 230,
  'lib/market-integrity/terminal-operator-focus.ts': 240,
  'lib/market-integrity/terminal-interaction-stability.ts': 220,
  'lib/market-integrity/terminal-review-deck.ts': 220,
  'lib/market-integrity/binance-klines.ts': 80,
  'lib/market-integrity/coingecko.ts': 330,
};

let failed = false;
for (const rel of requiredFiles) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    console.error(`Missing required file: ${rel}`);
    failed = true;
    continue;
  }
  const source = fs.readFileSync(full, 'utf8');
  if (source.includes('[... ELLIPSIZATION') || source.includes('/* truncated */') || source.includes('TODO: CUT') || source.includes('reszta bez zmian') || source.includes('truncated')) {
    console.error(`Possible truncated placeholder found in ${rel}`);
    failed = true;
  }
  const lines = source.split('\n').length;
  if (minimumLines[rel] && lines < minimumLines[rel]) {
    console.error(`File too short: ${rel} has ${lines} lines, expected >= ${minimumLines[rel]}`);
    failed = true;
  }
  const out = ts.transpileModule(source, {
    fileName: rel,
    reportDiagnostics: true,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  });
  if (out.diagnostics?.length) {
    for (const diagnostic of out.diagnostics) {
      const pos = diagnostic.file?.getLineAndCharacterOfPosition(diagnostic.start ?? 0);
      const location = pos ? `${pos.line + 1}:${pos.character + 1}` : 'unknown';
      console.error(`${rel}:${location} ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`);
    }
    failed = true;
  }
}


const pass65RequiredTokens = [
  { file: 'components/market-integrity/MarketIntegrityClient.tsx', token: 'ShieldModalErrorBoundary' },
  { file: 'components/market-integrity/MarketIntegrityClient.tsx', token: 'resolveScanQuery' },
  { file: 'components/market-integrity/MarketIntegrityClient.tsx', token: 'criticalReviewRows' },
  { file: 'components/market-integrity/MarketIntegrityClient.tsx', token: 'shield-map-button' },
  { file: 'components/market-integrity/MarketIntegrityClient.tsx', token: 'market-integrity/shield-map' },
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'setActiveCommand("risk")' },
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'setActiveCommand("control")' },
  { file: 'app/globals.css', token: '.shield-map-button' },
  { file: 'app/globals.css', token: '.shield-map-panel' },
  { file: 'app/globals.css', token: '.shield-table-scroll-x' },
];
for (const { file, token } of pass65RequiredTokens) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  if (!source.includes(token)) {
    console.error(`Missing PASS65 hotfix token ${token} in ${file}`);
    failed = true;
  }
}

const pass72RequiredTokens = [
  { file: 'components/market-integrity/MarketIntegrityClient.tsx', token: 'sourceCooldownUntil' },
  { file: 'components/market-integrity/MarketIntegrityClient.tsx', token: 'shield-source-cooldown' },
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'TerminalSourceTrustPanel' },
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'id: "sources" as const' },
  { file: 'components/market-integrity/ShieldMapClient.tsx', token: 'source trust console · PASS72' },
  { file: 'lib/market-integrity/terminal-source-trust.ts', token: 'velmere_terminal_source_trust_v1_pass72' },
  { file: 'app/api/market-integrity/source-trust/route.ts', token: 'buildTerminalSourceTrust' },
  { file: 'app/api/market-integrity/report/route.ts', token: 'terminalSourceTrust' },
  { file: 'app/globals.css', token: '.shield-source-trust' },
  { file: 'app/globals.css', token: '.shield-map-source-trust' },
];
for (const { file, token } of pass72RequiredTokens) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  if (!source.includes(token)) {
    console.error(`Missing PASS72 source trust token ${token} in ${file}`);
    failed = true;
  }
}


const pass66RequiredTokens = [
  { file: 'components/market-integrity/MarketIntegrityClient.tsx', token: 'fetchSuggestionHit' },
  { file: 'components/market-integrity/MarketIntegrityClient.tsx', token: 'shield-sort-hint' },
  { file: 'components/market-integrity/MarketIntegrityClient.tsx', token: 'shield-search-icon-button' },
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'TerminalUsabilityGuardPanel' },
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'Terminal usability guard · PASS66' },
  { file: 'lib/market-integrity/terminal-usability-guard.ts', token: 'velmere_terminal_usability_guard_v1_pass66' },
  { file: 'app/api/market-integrity/usability-guard/route.ts', token: 'buildTerminalUsabilityGuard' },
  { file: 'app/api/market-integrity/report/route.ts', token: 'terminalUsabilityGuard' },
  { file: 'app/globals.css', token: '.shield-usability-guard' },
];
for (const { file, token } of pass66RequiredTokens) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  if (!source.includes(token)) {
    console.error(`Missing PASS66 usability token ${token} in ${file}`);
    failed = true;
  }
}

const pass67RequiredTokens = [
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'FileText,' },
  { file: 'components/market-integrity/MarketIntegrityClient.tsx', token: 'handleOutsidePointer' },
  { file: 'components/market-integrity/MarketIntegrityClient.tsx', token: 'handleTableWheel' },
  { file: 'components/market-integrity/MarketIntegrityClient.tsx', token: 'response.status === 429' },
  { file: 'components/market-integrity/MarketIntegrityClient.tsx', token: 'href="/market-integrity/shield-map"' },
  { file: 'components/market-integrity/ShieldMapClient.tsx', token: 'Private scoring core hidden' },
  { file: 'app/[locale]/market-integrity/shield-map/page.tsx', token: 'Mapa operacyjna Shielda' },
  { file: 'app/market-integrity/shield-map/page.tsx', token: 'redirect("/pl/market-integrity/shield-map")' },
  { file: 'app/globals.css', token: '.shield-table-scroll-x' },
];
for (const { file, token } of pass67RequiredTokens) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  if (!source.includes(token)) {
    console.error(`Missing PASS67 hotfix token ${token} in ${file}`);
    failed = true;
  }
}

const usabilitySource = fs.readFileSync(path.join(root, 'lib/market-integrity/terminal-usability-guard.ts'), 'utf8');
if (usabilitySource.includes('operatorActionQueue')) {
  console.error('PASS67 fixed terminal usability guard must use control.actionQueue, not control.operatorActionQueue.');
  failed = true;
}


const pass69RequiredTokens = [
  { file: 'components/market-integrity/MarketIntegrityClient.tsx', token: 'dynamic(' },
  { file: 'components/market-integrity/MarketIntegrityClient.tsx', token: 'isOpeningTerminal' },
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'TerminalBootSkeleton' },
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'terminalBooted' },
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'window.setTimeout(() => void loadOrderBook(), 260)' },
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'window.setTimeout(() => void loadHistory(), 420)' },
  { file: 'components/market-integrity/ShieldMapClient.tsx', token: 'Shield Map command room' },
  { file: 'components/market-integrity/ShieldMapClient.tsx', token: 'activeAtlasNode' },
  { file: 'lib/market-integrity/terminal-performance-guard.ts', token: 'velmere-terminal-performance-guard-v1-pass69' },
  { file: 'app/api/market-integrity/performance-guard/route.ts', token: 'buildTerminalPerformanceGuard' },
  { file: 'app/api/market-integrity/report/route.ts', token: 'terminalPerformanceGuard' },
  { file: 'app/globals.css', token: '.shield-terminal-loader' },
  { file: 'app/globals.css', token: '.shield-map-command-room' },
];
for (const { file, token } of pass69RequiredTokens) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  if (!source.includes(token)) {
    console.error(`Missing PASS69 performance token ${token} in ${file}`);
    failed = true;
  }
}

const modalSource = fs.readFileSync(path.join(root, 'components/market-integrity/TokenRiskModal.tsx'), 'utf8');
if ((modalSource.match(/"1d": \{ spanMs/g) ?? []).length !== 1) {
  console.error('PASS66 expected exactly one 1d range profile definition.');
  failed = true;
}


const pass68RequiredTokens = [
  { file: 'lib/market-integrity/soc-orchestrator.ts', token: 'getWorstStressScenario(stress)' },
  { file: 'lib/market-integrity/shield-chat.ts', token: 'getWorstStressScenario(stress)' },
  { file: 'components/market-integrity/MarketIntegrityClient.tsx', token: 'shield-quick-panel' },
  { file: 'components/market-integrity/ShieldMapClient.tsx', token: 'operating atlas' },
  { file: 'components/market-integrity/ShieldMapClient.tsx', token: 'source truth ledger' },
  { file: 'app/globals.css', token: '.shield-quick-panel' },
];
for (const { file, token } of pass68RequiredTokens) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  if (!source.includes(token)) {
    console.error(`Missing PASS68 stability token ${token} in ${file}`);
    failed = true;
  }
}
for (const rel of ['lib/market-integrity/soc-orchestrator.ts', 'lib/market-integrity/shield-chat.ts']) {
  const source = fs.readFileSync(path.join(root, rel), 'utf8');
  if (source.includes('[...stress]') || source.includes('stress.map(')) {
    console.error(`${rel} must not treat buildStressScenarios as an iterable array after PASS68.`);
    failed = true;
  }
}



const pass70RequiredTokens = [
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'OperatorCopilotPanel' },
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'Operator copilot · PASS70' },
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'id: "copilot" as const' },
  { file: 'components/market-integrity/ShieldMapClient.tsx', token: 'system boundary' },
  { file: 'components/market-integrity/ShieldMapClient.tsx', token: 'AI copilot playbook' },
  { file: 'components/market-integrity/ShieldMapClient.tsx', token: 'private core protected' },
  { file: 'lib/market-integrity/terminal-operator-copilot.ts', token: 'velmere_terminal_operator_copilot_v1_pass70' },
  { file: 'app/api/market-integrity/operator-copilot/route.ts', token: 'buildTerminalOperatorCopilot' },
  { file: 'app/api/market-integrity/report/route.ts', token: 'terminalOperatorCopilot' },
  { file: 'app/globals.css', token: '.shield-operator-copilot' },
  { file: 'app/globals.css', token: '.shield-map-boundary' },
];
for (const { file, token } of pass70RequiredTokens) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  if (!source.includes(token)) {
    console.error(`Missing PASS70 operator-copilot token ${token} in ${file}`);
    failed = true;
  }
}


const pass71RequiredTokens = [
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'TerminalLaunchBridgePanel' },
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'Launch bridge · PASS71' },
  { file: 'components/market-integrity/ShieldMapClient.tsx', token: 'Launch bridge · PASS71' },
  { file: 'lib/market-integrity/terminal-launch-bridge.ts', token: 'velmere_terminal_launch_bridge_v1_pass71' },
  { file: 'app/api/market-integrity/launch-bridge/route.ts', token: 'buildTerminalLaunchBridge' },
  { file: 'app/api/market-integrity/report/route.ts', token: 'terminalLaunchBridge' },
  { file: 'app/globals.css', token: '.shield-launch-bridge' },
  { file: 'app/globals.css', token: '.shield-map-launch-bridge' },
];
for (const { file, token } of pass71RequiredTokens) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  if (!source.includes(token)) {
    console.error(`Missing PASS71 launch bridge token ${token} in ${file}`);
    failed = true;
  }
}


const pass73RequiredTokens = [
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'TerminalEvidenceExportPanel' },
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'Evidence export console · PASS73' },
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'id: "export" as const' },
  { file: 'components/market-integrity/ShieldMapClient.tsx', token: 'evidence export console · PASS73' },
  { file: 'components/market-integrity/ShieldMapClient.tsx', token: 'manifest before export' },
  { file: 'lib/market-integrity/terminal-evidence-export.ts', token: 'velmere_terminal_evidence_export_v1_pass73' },
  { file: 'app/api/market-integrity/evidence-export/route.ts', token: 'buildTerminalEvidenceExport' },
  { file: 'app/api/market-integrity/report/route.ts', token: 'terminalEvidenceExport' },
  { file: 'app/globals.css', token: '.shield-evidence-export' },
  { file: 'app/globals.css', token: '.shield-map-evidence-export' },
];
for (const { file, token } of pass73RequiredTokens) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  if (!source.includes(token)) {
    console.error(`Missing PASS73 evidence export token ${token} in ${file}`);
    failed = true;
  }
}

const stressSimulatorSource = fs.readFileSync(path.join(root, 'lib/market-integrity/stress-simulator.ts'), 'utf8');
if (!stressSimulatorSource.includes('getStressScenarioList') || !stressSimulatorSource.includes('getWorstStressScenario')) {
  console.error('PASS73 stress simulator must expose safe helpers for scenario bundle access.');
  failed = true;
}


const pass74RequiredTokens = [
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'TerminalRuntimeHealthPanel' },
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'Runtime health console · PASS74' },
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'id: "runtime" as const' },
  { file: 'components/market-integrity/MarketIntegrityClient.tsx', token: 'shield-lens-review-row' },
  { file: 'components/market-integrity/ShieldMapClient.tsx', token: 'runtime health console · PASS74' },
  { file: 'components/market-integrity/ShieldMapClient.tsx', token: 'runtime safeguards' },
  { file: 'lib/market-integrity/terminal-runtime-health.ts', token: 'velmere_terminal_runtime_health_v1_pass74' },
  { file: 'lib/market-integrity/terminal-runtime-health.ts', token: 'Runtime health is a product QA signal' },
  { file: 'app/api/market-integrity/runtime-health/route.ts', token: 'buildTerminalRuntimeHealth' },
  { file: 'app/api/market-integrity/report/route.ts', token: 'terminalRuntimeHealth' },
  { file: 'app/globals.css', token: '.shield-runtime-health' },
  { file: 'app/globals.css', token: '.shield-map-runtime-health' },
  { file: 'app/globals.css', token: '.shield-lens-review-row' },
];
for (const { file, token } of pass74RequiredTokens) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  if (!source.includes(token)) {
    console.error(`Missing PASS74 runtime-health token ${token} in ${file}`);
    failed = true;
  }
}


const pass75RequiredTokens = [
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'TerminalOperatorFocusPanel' },
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'Operator focus router · PASS75' },
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'id: "control" as const' },
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'activeCommand === "control"' },
  { file: 'components/market-integrity/ShieldMapClient.tsx', token: 'operator focus router · PASS75' },
  { file: 'components/market-integrity/ShieldMapClient.tsx', token: 'focused terminal OS' },
  { file: 'lib/market-integrity/terminal-operator-focus.ts', token: 'velmere_terminal_operator_focus_v1_pass75' },
  { file: 'lib/market-integrity/terminal-operator-focus.ts', token: 'Do not render every console at once after the chart' },
  { file: 'app/api/market-integrity/operator-focus/route.ts', token: 'buildTerminalOperatorFocus' },
  { file: 'app/api/market-integrity/report/route.ts', token: 'terminalOperatorFocus' },
  { file: 'app/globals.css', token: '.shield-operator-focus' },
  { file: 'app/globals.css', token: '.shield-map-operator-focus' },
];
for (const { file, token } of pass75RequiredTokens) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  if (!source.includes(token)) {
    console.error(`Missing PASS75 operator-focus token ${token} in ${file}`);
    failed = true;
  }
}

const modalMainLane = fs.readFileSync(path.join(root, 'components/market-integrity/TokenRiskModal.tsx'), 'utf8');
if (!modalMainLane.includes('activeCommand === "control"') || !modalMainLane.includes('id: "sources" as const')) {
  console.error('PASS75 expected focused activeCommand routing for control/source panels.');
  failed = true;
}


const pass77RequiredTokens = [
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'TerminalReviewDeckPanel' },
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'Review deck · PASS77' },
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'id: "deck" as const' },
  { file: 'components/market-integrity/ShieldMapClient.tsx', token: 'review deck · PASS77' },
  { file: 'lib/market-integrity/terminal-review-deck.ts', token: 'velmere_terminal_review_deck_v1_pass77' },
  { file: 'app/api/market-integrity/review-deck/route.ts', token: 'buildTerminalReviewDeck' },
  { file: 'app/api/market-integrity/report/route.ts', token: 'terminalReviewDeck' },
  { file: 'app/globals.css', token: '.shield-review-deck' },
  { file: 'app/globals.css', token: '.shield-map-review-card' },
];
for (const { file, token } of pass77RequiredTokens) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  if (!source.includes(token)) {
    console.error(`Missing PASS77 review deck token ${token} in ${file}`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log('Market integrity no-truncation smoke passed.');
