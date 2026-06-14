#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = [
  'app/globals.css',
  'components/market-integrity/MarketIntegrityClient.tsx',
  'components/market-integrity/TokenRiskModal.tsx',
  'components/market-integrity/ShieldMapClient.tsx',
  'app/[locale]/market-integrity/shield-map/page.tsx',
];
const requiredCss = [
  '.shield-typography-root',
  '.shield-terminal-font',
  '.shield-serif-display',
  '.shield-safe-card',
  '.shield-table-shell',
  '.shield-no-overlap',
  '.shield-mobile-chart-height',
  '.shield-cluster-card',
  '.shield-chart-terminal-panel',
  '.shield-search-shell',
  '.shield-premium-focus',
  '.shield-psych-card',
  '.shield-readability-grade',
  '.shield-modal-shell',
  '.shield-command-palette',
  '.shield-evidence-workflow',
  '.shield-liquidity-intelligence',
  '.shield-source-ledger-pill',
  '.shield-ops-audit',
  '.shield-ops-ledger-cell',
  '.shield-control-plane',
  '.shield-control-rail',
  '.shield-risk-workspace',
  '.shield-policy-registry',
  '.shield-production-hardening',
  '.shield-production-gate',
  '.shield-map-button',
  '.shield-map-panel',
  '.shield-usability-guard',
  '.shield-sort-hint',
  '.shield-search-icon-button',
  '.shield-table-scroll-x',
  '.shield-quick-panel',
  '.shield-map-evidence-export',
  '.shield-export-lane',
  '.shield-evidence-export',
  '.shield-runtime-health',
  '.shield-runtime-lane',
  '.shield-map-runtime-health',
  '.shield-map-runtime-card',
  '.shield-lens-review-row',
  '.shield-operator-focus',
  '.shield-operator-focus-lane',
  '.shield-map-operator-focus',
  '.shield-map-focus-card',
  '.shield-interaction-stability',
  '.shield-interaction-lane',
  '.shield-map-interaction-stability',
  '.shield-map-interaction-card',
];
const requiredComponentTokens = [
  'shield-no-overlap',
  'shield-typography-root',
  'min-w-0',
  'truncate',
  'overflow-x-auto',
  'table-fixed',
  'rangeProfiles',
  'createPortal(modal',
  'Holder intelligence 2.0',
  'ResizeObserver',
  'dataUncertaintyPercent',
  'visible {clean.length}/{profile.targetBars}',
  'visualComposureScore',
  'terminalAnchors',
  'shield-readability-grade',
  'TerminalCommandPalette',
  'TerminalReadinessPanel',
  'EvidenceWorkflowPanel',
  'LiquidityIntelligencePanel',
  'Audit sources',
  'Ops audit',
  'ProductOpsAuditPanel',
  'Product ops audit · PASS62',
  'TerminalControlPlanePanel',
  'Terminal control plane · PASS62',
  'Control plane',
  'TerminalRiskWorkspacePanel',
  'Terminal risk workspace · PASS63',
  'Risk workspace',
  'ProductionHardeningPanel',
  'Production hardening · PASS64',
  'ShieldModalErrorBoundary',
  'criticalReviewRows',
  'shield-map-button',
  'market-integrity/shield-map',
  'placeholder=""',
  'resolveScanQuery',
  'setActiveCommand("risk")',
  'setActiveCommand("control")',
  'TerminalUsabilityGuardPanel',
  'Terminal usability guard · PASS66',
  'Usability guard',
  'shield-sort-hint',
  'shield-search-icon-button',
  'fetchSuggestionHit',
  'searchShellRef',
  'handleOutsidePointer',
  'handleTableWheel',
  'OperatorCopilotPanel',
  'Operator copilot · PASS70',
  'TerminalLaunchBridgePanel',
  'Launch bridge · PASS71',
  'Evidence export console · PASS73',
  'TerminalEvidenceExportPanel',
  'TerminalRuntimeHealthPanel',
  'Runtime health console · PASS74',
  'TerminalOperatorFocusPanel',
  'Operator focus router · PASS75',
  'Interaction stability console · PASS76',
  'id: "control" as const',
  'id: "stability" as const',
];

let failed = false;
for (const rel of files) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    console.error(`Missing design safety file: ${rel}`);
    failed = true;
  }
}
const css = fs.readFileSync(path.join(root, 'app/globals.css'), 'utf8');
for (const token of requiredCss) {
  if (!css.includes(token)) {
    console.error(`Missing CSS design token: ${token}`);
    failed = true;
  }
}
const client = fs.readFileSync(path.join(root, 'components/market-integrity/MarketIntegrityClient.tsx'), 'utf8');
const modal = fs.readFileSync(path.join(root, 'components/market-integrity/TokenRiskModal.tsx'), 'utf8');
for (const token of requiredComponentTokens) {
  if (!client.includes(token) && !modal.includes(token)) {
    console.error(`Missing UI safety token in Shield components: ${token}`);
    failed = true;
  }
}

const pass61RequiredTokens = [
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'clusterMap' },
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'operatorPrompt' },
  { file: 'lib/market-integrity/binance-klines.ts', token: 'minimumBars' },
  { file: 'lib/market-integrity/binance-klines.ts', token: '1w' },
  { file: 'lib/market-integrity/coingecko.ts', token: 'resampleMarketChartPoints' },
  { file: 'lib/market-integrity/chart-regime.ts', token: 'chart_regime_v2_pass56' },
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'visual psychology' },
  { file: 'components/market-integrity/MarketIntegrityClient.tsx', token: 'shield-search-shell' },
  { file: 'lib/market-integrity/ai-risk-bot.ts', token: 'VELMERE_AI_RISK_BOT_V7_PASS62_CONTROL_PLANE' },
  { file: 'lib/market-integrity/holder-intelligence.ts', token: 'velmere-holder-intelligence-v7-pass62-control-plane' },
  { file: 'lib/market-integrity/terminal-readiness.ts', token: 'velmere_terminal_readiness_v4_pass62_control_plane' },
  { file: 'lib/market-integrity/liquidity-intelligence.ts', token: 'velmere_liquidity_intelligence_v3_pass62_control_plane' },
  { file: 'lib/market-integrity/evidence-workflow.ts', token: 'velmere_evidence_workflow_v3_pass62_control_plane' },
  { file: 'app/api/market-integrity/readiness/route.ts', token: 'buildTerminalReadiness' },
  { file: 'app/api/market-integrity/liquidity-intelligence/route.ts', token: 'buildLiquidityIntelligence' },
  { file: 'app/api/market-integrity/evidence-workflow/route.ts', token: 'buildEvidenceWorkflow' },
  { file: 'lib/market-integrity/product-ops-audit.ts', token: 'velmere_product_ops_audit_v2_pass62_control_plane' },
  { file: 'app/api/market-integrity/ops-audit/route.ts', token: 'buildProductOpsAudit' },
  { file: 'app/api/market-integrity/report/route.ts', token: 'productOpsAudit' },
  { file: 'lib/market-integrity/terminal-control-plane.ts', token: 'velmere_terminal_control_plane_v1_pass62' },
  { file: 'app/api/market-integrity/control-plane/route.ts', token: 'buildTerminalControlPlane' },
  { file: 'app/api/market-integrity/report/route.ts', token: 'terminalControlPlane' },
  { file: 'lib/market-integrity/terminal-risk-workspace.ts', token: 'velmere_terminal_risk_workspace_v1_pass63' },
  { file: 'app/api/market-integrity/workspace/route.ts', token: 'buildTerminalRiskWorkspace' },
  { file: 'app/api/market-integrity/report/route.ts', token: 'terminalRiskWorkspace' },
  { file: 'lib/market-integrity/production-hardening.ts', token: 'velmere_production_hardening_v1_pass64' },
  { file: 'app/api/market-integrity/production-hardening/route.ts', token: 'buildProductionHardening' },
  { file: 'app/api/market-integrity/report/route.ts', token: 'productionHardening' },
];
for (const { file, token } of pass61RequiredTokens) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  if (!source.includes(token)) {
    console.error(`Missing PASS 61 token ${token} in ${file}`);
    failed = true;
  }
}
const forbiddenPlaceholders = ['[... ELLIPSIZATION', '/* truncated */', 'reszta bez zmian', 'TODO: CUT', 'holder.dataCompleteness * 100', 'holder.dataCompleteness < 0.', 'dataQuality === "poor"'];
for (const rel of files) {
  const source = fs.readFileSync(path.join(root, rel), 'utf8');
  for (const token of forbiddenPlaceholders) {
    if (source.includes(token)) {
      console.error(`Forbidden placeholder token ${token} in ${rel}`);
      failed = true;
    }
  }
}


const exchangeComponentStart = modal.indexOf('function ExchangeCandlesChart');
const exchangeComponentEnd = modal.indexOf('function ChartRegimePanel');
const exchangeComponent = exchangeComponentStart >= 0 && exchangeComponentEnd > exchangeComponentStart
  ? modal.slice(exchangeComponentStart, exchangeComponentEnd)
  : '';
if (exchangeComponent.includes('const range = max - min || 1')) {
  console.error('ExchangeCandlesChart shadows the range prop with a local range variable. Use priceRange.');
  failed = true;
}
if (!exchangeComponent.includes('preserveAspectRatio="none"')) {
  console.error('ExchangeCandlesChart missing responsive SVG preserveAspectRatio safety.');
  failed = true;
}
if ((modal.match(/"1d": \{ spanMs/g) ?? []).length !== 1) {
  console.error('Duplicate or missing 1d range profile detected.');
  failed = true;
}


const pass66RequiredTokens = [
  { file: 'lib/market-integrity/terminal-usability-guard.ts', token: 'velmere_terminal_usability_guard_v1_pass66' },
  { file: 'app/api/market-integrity/usability-guard/route.ts', token: 'buildTerminalUsabilityGuard' },
  { file: 'app/api/market-integrity/report/route.ts', token: 'terminalUsabilityGuard' },
  { file: 'components/market-integrity/MarketIntegrityClient.tsx', token: 'sortDirectionCopy' },
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'TerminalUsabilityGuardPanel' },
];
for (const { file, token } of pass66RequiredTokens) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  if (!source.includes(token)) {
    console.error(`Missing PASS66 design token ${token} in ${file}`);
    failed = true;
  }
}

const pass65HotfixChecks = [
  {
    file: 'components/market-integrity/MarketIntegrityClient.tsx',
    absent: 'SOC compact queue',
    message: 'Main page should not render SOC compact queue under the clean search area.',
  },
  {
    file: 'components/market-integrity/MarketIntegrityClient.tsx',
    absent: 'placeholder={t("searchPlaceholder")}',
    message: 'Search input placeholder must remain empty for PASS65 clean main page.',
  },
  {
    file: 'components/market-integrity/MarketIntegrityClient.tsx',
    absent: 'Skanuj token',
    message: 'Text scan button should not be reintroduced; use icon submit only.',
  },
  {
    file: 'components/market-integrity/MarketIntegrityClient.tsx',
    absent: 'AI bot JSON',
    message: 'Shield quick actions should not open raw JSON pages.',
  },
  {
    file: 'components/market-integrity/TokenRiskModal.tsx',
    absent: 'AI Bot JSON',
    message: 'Token modal header should use in-panel command actions, not raw JSON links.',
  },
  {
    file: 'components/market-integrity/TokenRiskModal.tsx',
    absent: 'href={`/api/market-integrity/assistant',
    message: 'Token modal must not link to raw assistant JSON endpoint.',
  },
  {
    file: 'components/market-integrity/TokenRiskModal.tsx',
    absent: 'href={`/api/market-integrity/orchestrator',
    message: 'Token modal must not link to raw orchestrator JSON endpoint.',
  },
  {
    file: 'components/market-integrity/TokenRiskModal.tsx',
    absent: 'href={`/api/market-integrity/access',
    message: 'Token modal must not link to raw VLM access JSON endpoint.',
  },
];
for (const check of pass65HotfixChecks) {
  const source = fs.readFileSync(path.join(root, check.file), 'utf8');
  if (source.includes(check.absent)) {
    console.error(check.message);
    failed = true;
  }
}

const pass67HotfixChecks = [
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'FileText' },
  { file: 'components/market-integrity/MarketIntegrityClient.tsx', token: 'href="/market-integrity/shield-map"' },
  { file: 'components/market-integrity/MarketIntegrityClient.tsx', token: 'handleOutsidePointer' },
  { file: 'components/market-integrity/MarketIntegrityClient.tsx', token: 'handleTableWheel' },
  { file: 'components/market-integrity/MarketIntegrityClient.tsx', token: 'response.status === 429' },
  { file: 'components/market-integrity/ShieldMapClient.tsx', token: 'Private scoring core hidden' },
  { file: 'app/[locale]/market-integrity/shield-map/page.tsx', token: 'MarketIntegrityShieldMapPage' },
  { file: 'app/market-integrity/shield-map/page.tsx', token: 'redirect("/pl/market-integrity/shield-map")' },
  { file: 'app/globals.css', token: '.shield-table-scroll-x' },
];
for (const { file, token } of pass67HotfixChecks) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  if (!source.includes(token)) {
    console.error(`Missing PASS67 hotfix token ${token} in ${file}`);
    failed = true;
  }
}
if (client.includes('{shieldMapOpen ?')) {
  console.error('Shield Map must not open as an inline panel on the main page after PASS67.');
  failed = true;
}
if (!modal.includes('FileText,') || !modal.includes('<FileText')) {
  console.error('TokenRiskModal Evidence button must import and render FileText safely.');
  failed = true;
}

const pass68DesignChecks = [
  { file: 'components/market-integrity/MarketIntegrityClient.tsx', token: 'shield-quick-panel' },
  { file: 'components/market-integrity/MarketIntegrityClient.tsx', token: 'scroller.scrollTop += event.deltaY' },
  { file: 'components/market-integrity/ShieldMapClient.tsx', token: 'operating atlas' },
  { file: 'components/market-integrity/ShieldMapClient.tsx', token: 'source truth ledger' },
  { file: 'app/globals.css', token: '.shield-quick-panel' },
];
for (const { file, token } of pass68DesignChecks) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  if (!source.includes(token)) {
    console.error(`Missing PASS68 design token ${token} in ${file}`);
    failed = true;
  }
}
for (const rel of ['lib/market-integrity/soc-orchestrator.ts', 'lib/market-integrity/shield-chat.ts']) {
  const source = fs.readFileSync(path.join(root, rel), 'utf8');
  if (source.includes('[...stress]')) {
    console.error(`${rel} still spreads stress as an iterable array.`);
    failed = true;
  }
}


const pass69DesignChecks = [
  { file: 'components/market-integrity/MarketIntegrityClient.tsx', token: 'Shield terminal booting' },
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'PASS69 performance guard' },
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'terminalBooted ?' },
  { file: 'components/market-integrity/ShieldMapClient.tsx', token: 'Shield Map command room' },
  { file: 'components/market-integrity/ShieldMapClient.tsx', token: 'active layer preview' },
  { file: 'app/globals.css', token: '.shield-map-radar-board' },
  { file: 'lib/market-integrity/terminal-performance-guard.ts', token: 'Performance guard does not change risk conclusions' },
];
for (const { file, token } of pass69DesignChecks) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  if (!source.includes(token)) {
    console.error(`Missing PASS69 design token ${token} in ${file}`);
    failed = true;
  }
}



const pass70DesignChecks = [
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'OperatorCopilotPanel' },
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'AI copilot' },
  { file: 'components/market-integrity/ShieldMapClient.tsx', token: 'system boundary' },
  { file: 'components/market-integrity/ShieldMapClient.tsx', token: 'Shield Map ma budować zaufanie' },
  { file: 'components/market-integrity/ShieldMapClient.tsx', token: 'AI copilot playbook' },
  { file: 'app/globals.css', token: '.shield-operator-copilot' },
  { file: 'app/globals.css', token: '.shield-map-boundary-card' },
  { file: 'lib/market-integrity/terminal-operator-copilot.ts', token: 'Not financial advice. Algorithmic risk flag only.' },
];
for (const { file, token } of pass70DesignChecks) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  if (!source.includes(token)) {
    console.error(`Missing PASS70 design token ${token} in ${file}`);
    failed = true;
  }
}

const riskyPatterns = [
  { name: 'unbounded modal header row', pattern: /flex items-start justify-between gap-4 border-b/ },
  { name: 'fixed 30rem chart without responsive safety', pattern: /h-\[30rem\]/ },
  { name: 'table without fixed layout', pattern: /<table(?![^>]*table-fixed)/ },
];
for (const { name, pattern } of riskyPatterns) {
  if (pattern.test(client) || pattern.test(modal)) {
    console.error(`Potential overlap risk: ${name}`);
    failed = true;
  }
}

const pass71DesignTokens = [
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'buildTerminalLaunchBridge' },
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'id: "launch" as const' },
  { file: 'components/market-integrity/ShieldMapClient.tsx', token: 'build-to-100 spine' },
  { file: 'lib/market-integrity/terminal-launch-bridge.ts', token: 'Not financial advice. Algorithmic risk flag only.' },
  { file: 'app/api/market-integrity/report/route.ts', token: 'terminalLaunchBridge' },
];
for (const { file, token } of pass71DesignTokens) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  if (!source.includes(token)) {
    console.error(`Missing PASS71 design token ${token} in ${file}`);
    failed = true;
  }
}

const pass72DesignTokens = [
  { file: 'components/market-integrity/MarketIntegrityClient.tsx', token: 'sourceCooldownUntil' },
  { file: 'components/market-integrity/MarketIntegrityClient.tsx', token: 'Shield przełącza search w tryb local-first' },
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'Source trust console · PASS72' },
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'TerminalSourceTrustPanel' },
  { file: 'components/market-integrity/ShieldMapClient.tsx', token: 'Shield Map ma pokazywać prawdę o źródłach' },
  { file: 'components/market-integrity/ShieldMapClient.tsx', token: 'no fake certainty' },
  { file: 'lib/market-integrity/terminal-source-trust.ts', token: 'Not financial advice. Algorithmic risk flag only.' },
  { file: 'app/api/market-integrity/report/route.ts', token: 'terminalSourceTrust' },
  { file: 'app/globals.css', token: '.shield-source-adapter' },
];
for (const { file, token } of pass72DesignTokens) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  if (!source.includes(token)) {
    console.error(`Missing PASS72 design token ${token} in ${file}`);
    failed = true;
  }
}


const pass73DesignTokens = [
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'Evidence export console · PASS73' },
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'TerminalEvidenceExportPanel' },
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'id: "export" as const' },
  { file: 'components/market-integrity/ShieldMapClient.tsx', token: 'evidence export console · PASS73' },
  { file: 'components/market-integrity/ShieldMapClient.tsx', token: 'manifest before export' },
  { file: 'lib/market-integrity/terminal-evidence-export.ts', token: 'velmere_terminal_evidence_export_v1_pass73' },
  { file: 'lib/market-integrity/stress-simulator.ts', token: 'getWorstStressScenario' },
  { file: 'app/api/market-integrity/evidence-export/route.ts', token: 'buildTerminalEvidenceExport' },
  { file: 'app/api/market-integrity/report/route.ts', token: 'terminalEvidenceExport' },
  { file: 'app/globals.css', token: '.shield-evidence-export' },
  { file: 'app/globals.css', token: '.shield-map-evidence-export' },
];
for (const { file, token } of pass73DesignTokens) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  if (!source.includes(token)) {
    console.error(`Missing PASS73 design token ${token} in ${file}`);
    failed = true;
  }
}



const pass74DesignTokens = [
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'buildTerminalRuntimeHealth' },
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'id: "runtime" as const' },
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'Runtime health console · PASS74' },
  { file: 'components/market-integrity/MarketIntegrityClient.tsx', token: 'runtime guard' },
  { file: 'components/market-integrity/MarketIntegrityClient.tsx', token: 'shield-lens-review-row' },
  { file: 'components/market-integrity/ShieldMapClient.tsx', token: 'runtime health console · PASS74' },
  { file: 'components/market-integrity/ShieldMapClient.tsx', token: 'Terminal runtime is product QA' },
  { file: 'lib/market-integrity/terminal-runtime-health.ts', token: 'Not financial advice. Algorithmic risk flag only.' },
  { file: 'app/api/market-integrity/report/route.ts', token: 'terminalRuntimeHealth' },
  { file: 'app/globals.css', token: '.shield-runtime-health' },
  { file: 'app/globals.css', token: '.shield-map-runtime-card' },
];
for (const { file, token } of pass74DesignTokens) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  if (!source.includes(token)) {
    console.error(`Missing PASS74 design token ${token} in ${file}`);
    failed = true;
  }
}


const pass75DesignTokens = [
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'buildTerminalOperatorFocus' },
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'Operator focus router · PASS75' },
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'activeCommand === "control"' },
  { file: 'lib/market-integrity/terminal-operator-focus.ts', token: 'Do not render every console at once after the chart' },
  { file: 'components/market-integrity/ShieldMapClient.tsx', token: 'focused terminal OS' },
  { file: 'components/market-integrity/ShieldMapClient.tsx', token: 'jeden aktywny panel komendy' },
  { file: 'lib/market-integrity/terminal-operator-focus.ts', token: 'Not financial advice. Algorithmic risk flag only.' },
  { file: 'app/api/market-integrity/operator-focus/route.ts', token: 'terminalOperatorFocus' },
  { file: 'app/api/market-integrity/report/route.ts', token: 'terminalOperatorFocus' },
  { file: 'app/globals.css', token: '.shield-operator-focus-lane' },
  { file: 'app/globals.css', token: '.shield-map-focus-card' },
];
for (const { file, token } of pass75DesignTokens) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  if (!source.includes(token)) {
    console.error(`Missing PASS75 design token ${token} in ${file}`);
    failed = true;
  }
}


const pass77DesignTokens = [
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'buildTerminalReviewDeck' },
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'Review deck · PASS77' },
  { file: 'components/market-integrity/TokenRiskModal.tsx', token: 'useState<TerminalCommandId>("deck")' },
  { file: 'components/market-integrity/ShieldMapClient.tsx', token: 'Pierwszy ekran terminala ma prowadzić decyzję' },
  { file: 'components/market-integrity/ShieldMapClient.tsx', token: 'Review Deck is an operator workflow summary' },
  { file: 'lib/market-integrity/terminal-review-deck.ts', token: 'Not financial advice. Algorithmic risk flag only.' },
  { file: 'app/api/market-integrity/review-deck/route.ts', token: 'terminalReviewDeck' },
  { file: 'app/api/market-integrity/report/route.ts', token: 'terminalReviewDeck' },
  { file: 'app/globals.css', token: '.shield-review-lane' },
  { file: 'app/globals.css', token: '.shield-map-review-deck' },
];
for (const { file, token } of pass77DesignTokens) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  if (!source.includes(token)) {
    console.error(`Missing PASS77 design token ${token} in ${file}`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log('Shield design safety checks passed.');
