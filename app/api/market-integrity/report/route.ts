import { NextResponse } from "next/server";
import { searchCoinGeckoMarket } from "@/lib/market-integrity/coingecko";
import { analyzeDexScreenerToken } from "@/lib/market-integrity/dexscreener";
import { buildInvestigationPlan } from "@/lib/market-integrity/investigation-plan";
import { buildAttackSurface } from "@/lib/market-integrity/attack-playbook";
import { recordSingleResult } from "@/lib/market-integrity/market-memory";
import { getPersistentRiskHistory, persistRiskSnapshots } from "@/lib/market-integrity/risk-ledger";
import { buildSingleAssetRuleHits } from "@/lib/market-integrity/rule-engine";
import { buildRiskBrain } from "@/lib/market-integrity/risk-brain";
import { buildHolderIntelligence } from "@/lib/market-integrity/holder-intelligence";
import { buildStressScenarios } from "@/lib/market-integrity/stress-simulator";
import { buildRiskReplay } from "@/lib/market-integrity/risk-replay";
import { buildAiRiskBotBrief } from "@/lib/market-integrity/ai-risk-bot";
import { buildAiRiskOrchestrator } from "@/lib/market-integrity/ai-orchestrator";
import { buildShieldChatResponse } from "@/lib/market-integrity/shield-chat";
import { buildChartRegime } from "@/lib/market-integrity/chart-regime";
import { buildSocTerminalBrief } from "@/lib/market-integrity/soc-orchestrator";
import { buildVlmShieldAccess } from "@/lib/market-integrity/vlm-access-layer";
import { buildEvidenceWorkflow } from "@/lib/market-integrity/evidence-workflow";
import { buildLiquidityIntelligence } from "@/lib/market-integrity/liquidity-intelligence";
import { buildProductOpsAudit } from "@/lib/market-integrity/product-ops-audit";
import { buildTerminalControlPlane } from "@/lib/market-integrity/terminal-control-plane";
import { buildTerminalRiskWorkspace } from "@/lib/market-integrity/terminal-risk-workspace";
import { buildProductionHardening } from "@/lib/market-integrity/production-hardening";
import { buildTerminalUsabilityGuard } from "@/lib/market-integrity/terminal-usability-guard";
import { buildTerminalPerformanceGuard } from "@/lib/market-integrity/terminal-performance-guard";
import { buildTerminalOperatorCopilot } from "@/lib/market-integrity/terminal-operator-copilot";
import { buildTerminalLaunchBridge } from "@/lib/market-integrity/terminal-launch-bridge";
import { buildTerminalSourceTrust } from "@/lib/market-integrity/terminal-source-trust";
import { buildTerminalEvidenceExport } from "@/lib/market-integrity/terminal-evidence-export";
import { buildTerminalRuntimeHealth } from "@/lib/market-integrity/terminal-runtime-health";
import { buildTerminalOperatorFocus } from "@/lib/market-integrity/terminal-operator-focus";
import { buildTerminalInteractionStability } from "@/lib/market-integrity/terminal-interaction-stability";
import { buildTerminalReviewDeck } from "@/lib/market-integrity/terminal-review-deck";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ErrorPayload = { mode: "error"; error: string };

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim();
  const localeCandidate = searchParams.get("locale")?.trim() || "pl";
  const locale = localeCandidate === "de" || localeCandidate === "en" ? localeCandidate : "pl";
  if (!query) return NextResponse.json<ErrorPayload>({ mode: "error", error: "Missing query" }, { status: 400 });

  try {
    const marketRow = await searchCoinGeckoMarket(query);
    const result = marketRow?.result ?? await analyzeDexScreenerToken(query);
    const memory = recordSingleResult(result);
    const ledger = memory?.lastSnapshot ? await persistRiskSnapshots([memory.lastSnapshot]) : undefined;
    const id = result.token.marketId ?? result.token.tokenAddress ?? result.token.symbol;
    const history = await getPersistentRiskHistory(id, 144);
    const investigationPlan = buildInvestigationPlan(result, history);
    const attackSurface = buildAttackSurface(result);
    const rules = buildSingleAssetRuleHits(result, searchParams.get("watchlist"));
    const riskBrain = buildRiskBrain(result, history);
    const holderIntelligence = buildHolderIntelligence(result);
    const stressSimulator = buildStressScenarios(result);
    const riskReplay = buildRiskReplay(result, history);
    const aiRiskBot = buildAiRiskBotBrief(result, history);
    const aiOrchestrator = buildAiRiskOrchestrator(result, history);
    const shieldChat = buildShieldChatResponse(result, history, searchParams.get("prompt") ?? "Explain the current risk.", locale);
    const chartRegime = buildChartRegime(result, {
      bars: result.chart?.sevenDay?.length ?? 0,
      source: result.chart?.sevenDay?.length ? "result.chart.sevenDay" : "market metrics",
    });
    const socTerminal = buildSocTerminalBrief(result, history);
    const vlmAccessLayer = buildVlmShieldAccess(result);
    const liquidityIntelligence = buildLiquidityIntelligence(result);
    const evidenceWorkflow = buildEvidenceWorkflow(result, {
      historyCount: history.length,
      candlesCount: result.chart?.sevenDay?.length ?? 0,
      chartSource: result.chart?.sevenDay?.length ? "result.chart.sevenDay" : "market metrics",
      activeCommand: searchParams.get("command") ?? "risk",
    });
    const productOpsAudit = buildProductOpsAudit(result, {
      historyCount: history.length,
      candlesCount: result.chart?.sevenDay?.length ?? 0,
      chartSource: result.chart?.sevenDay?.length ? "result.chart.sevenDay" : "market metrics",
      hasOrderBook: false,
      activeCommand: searchParams.get("command") ?? "ops",
      sessionMode: "operator_session",
    });
    const terminalControlPlane = buildTerminalControlPlane(result, {
      historyCount: history.length,
      candlesCount: result.chart?.sevenDay?.length ?? 0,
      chartSource: result.chart?.sevenDay?.length ? "result.chart.sevenDay" : "market metrics",
      hasOrderBook: false,
      activeCommand: searchParams.get("command") ?? "control",
      sessionMode: "operator_session",
    });
    const terminalRiskWorkspace = buildTerminalRiskWorkspace(result, {
      historyCount: history.length,
      candlesCount: result.chart?.sevenDay?.length ?? 0,
      chartSource: result.chart?.sevenDay?.length ? "result.chart.sevenDay" : "market metrics",
      hasOrderBook: false,
      activeCommand: searchParams.get("command") ?? "workspace",
      sessionMode: "operator_session",
    });
    const productionHardening = buildProductionHardening(result, {
      historyCount: history.length,
      candlesCount: result.chart?.sevenDay?.length ?? 0,
      chartSource: result.chart?.sevenDay?.length ? "result.chart.sevenDay" : "market metrics",
      hasOrderBook: false,
      activeCommand: searchParams.get("command") ?? "production",
      sessionMode: "operator_session",
    });
    const terminalUsabilityGuard = buildTerminalUsabilityGuard(result, {
      historyCount: history.length,
      candlesCount: result.chart?.sevenDay?.length ?? 0,
      chartSource: result.chart?.sevenDay?.length ? "result.chart.sevenDay" : "market metrics",
      hasOrderBook: false,
      activeCommand: searchParams.get("command") ?? "usability",
      sessionMode: "operator_session",
      searchHasIconSubmit: true,
      searchHasEmptyPlaceholder: true,
      shieldMapDetached: true,
      modalErrorBoundary: true,
      sortToggleEnabled: true,
      mobileBottomSheet: true,
    });
    const terminalPerformanceGuard = buildTerminalPerformanceGuard(result, {
      terminalBootDeferred: true,
      modalChunkSplit: true,
      orderBookDeferred: true,
      historyDeferred: true,
      heavyPanelsDeferred: true,
      shieldMapDetached: true,
      tableWheelUnlocked: true,
    });
    const terminalOperatorCopilot = buildTerminalOperatorCopilot(result, {
      candlesCount: result.chart?.sevenDay?.length ?? 0,
      chartSource: result.chart?.sevenDay?.length ? "result.chart.sevenDay" : "market metrics",
      hasOrderBook: false,
      historyCount: history.length,
      activeCommand: searchParams.get("command") ?? "copilot",
      terminalBootDeferred: true,
      shieldMapDetached: true,
      sourceHonestyVisible: true,
      chatHistoryCount: 0,
    });
    const terminalLaunchBridge = buildTerminalLaunchBridge(result, {
      candlesCount: result.chart?.sevenDay?.length ?? 0,
      chartSource: result.chart?.sevenDay?.length ? "result.chart.sevenDay" : "market metrics",
      hasOrderBook: false,
      historyCount: history.length,
      activeCommand: searchParams.get("command") ?? "launch",
      sessionMode: "operator_session",
      terminalBootDeferred: true,
      modalChunkSplit: true,
      shieldMapDetached: true,
      tableWheelUnlocked: true,
      searchResolverGuarded: true,
      suggestionDismissOnOutsideClick: true,
      sourceHonestyVisible: true,
    });
    const terminalSourceTrust = buildTerminalSourceTrust(result, {
      candlesCount: result.chart?.sevenDay?.length ?? 0,
      chartSource: result.chart?.sevenDay?.length ? "result.chart.sevenDay" : "market metrics",
      hasOrderBook: false,
      historyCount: history.length,
      activeCommand: searchParams.get("command") ?? "sources",
      searchResolverGuarded: true,
      suggestionDismissOnOutsideClick: true,
      sourceCooldownActive: false,
      terminalBootDeferred: true,
      modalChunkSplit: true,
      tableWheelUnlocked: true,
      walletSessionReady: false,
      exportInfrastructureReady: false,
      rateLimitMiddlewareReady: false,
    });
    const terminalEvidenceExport = buildTerminalEvidenceExport(result, {
      candlesCount: result.chart?.sevenDay?.length ?? 0,
      chartSource: result.chart?.sevenDay?.length ? "result.chart.sevenDay" : "market metrics",
      hasOrderBook: false,
      historyCount: history.length,
      activeCommand: searchParams.get("command") ?? "export",
      sessionMode: "operator_session",
      walletSessionReady: false,
      exportInfrastructureReady: false,
      rateLimitMiddlewareReady: false,
      persistentAuditLogReady: false,
    });
    const terminalRuntimeHealth = buildTerminalRuntimeHealth(result, {
      candlesCount: result.chart?.sevenDay?.length ?? 0,
      chartSource: result.chart?.sevenDay?.length ? "result.chart.sevenDay" : "market metrics",
      hasOrderBook: false,
      historyCount: history.length,
      activeCommand: searchParams.get("command") ?? "runtime",
      modalErrorBoundary: true,
      terminalBootDeferred: true,
      modalChunkSplit: true,
      heavyPanelsDeferred: true,
      shieldMapDetached: true,
      tableWheelUnlocked: true,
      suggestionDismissOnOutsideClick: true,
      sourceCooldownActive: false,
      rateLimitMiddlewareReady: false,
      exportInfrastructureReady: false,
      persistentAuditLogReady: false,
      walletSessionReady: false,
    });
    const terminalOperatorFocus = buildTerminalOperatorFocus(result, {
      candlesCount: result.chart?.sevenDay?.length ?? 0,
      chartSource: result.chart?.sevenDay?.length ? "result.chart.sevenDay" : "market metrics",
      hasOrderBook: false,
      historyCount: history.length,
      activeCommand: searchParams.get("command") ?? "review",
      terminalBootDeferred: true,
      modalChunkSplit: true,
      heavyPanelsDeferred: true,
      modalErrorBoundary: true,
      focusedPanelRouting: true,
      sourceCooldownActive: false,
      rateLimitMiddlewareReady: false,
      exportInfrastructureReady: false,
      persistentAuditLogReady: false,
      walletSessionReady: false,
    });
    const terminalInteractionStability = buildTerminalInteractionStability(result, {
      candlesCount: result.chart?.sevenDay?.length ?? 0,
      chartSource: result.chart?.sevenDay?.length ? "result.chart.sevenDay" : "market metrics",
      hasOrderBook: false,
      historyCount: history.length,
      activeCommand: searchParams.get("command") ?? "stability",
      terminalBootDeferred: true,
      modalChunkSplit: true,
      heavyPanelsDeferred: true,
      modalErrorBoundary: true,
      focusedPanelRouting: true,
      sourceCooldownActive: false,
      searchLocalFirst: true,
      suggestionDismissOnOutsideClick: true,
      shieldMapDetached: true,
      tableWheelUnlocked: true,
      stressScenarioHelpers: true,
      noRawJsonButtons: true,
    });
    const terminalReviewDeck = buildTerminalReviewDeck(result, {
      candlesCount: result.chart?.sevenDay?.length ?? 0,
      chartSource: result.chart?.sevenDay?.length ? "result.chart.sevenDay" : "market metrics",
      hasOrderBook: false,
      historyCount: history.length,
      activeCommand: searchParams.get("command") ?? "deck",
      terminalBootDeferred: true,
      modalChunkSplit: true,
      heavyPanelsDeferred: true,
      sourceCooldownActive: false,
      searchLocalFirst: true,
      suggestionDismissOnOutsideClick: true,
      tableWheelUnlocked: true,
      shieldMapDetached: true,
      focusedPanelRouting: true,
      rateLimitMiddlewareReady: false,
      exportInfrastructureReady: false,
      persistentAuditLogReady: false,
      walletSessionReady: false,
    });

    return NextResponse.json({
      mode: "live",
      reportType: "velmere-shield-market-integrity-evidence-bundle",
      result,
      memory,
      ledger,
      history,
      investigationPlan,
      attackSurface,
      rules,
      riskBrain,
      holderIntelligence,
      stressSimulator,
      riskReplay,
      aiRiskBot,
      aiOrchestrator,
      shieldChat,
      chartRegime,
      socTerminal,
      vlmAccessLayer,
      liquidityIntelligence,
      evidenceWorkflow,
      productOpsAudit,
      terminalControlPlane,
      terminalRiskWorkspace,
      productionHardening,
      terminalUsabilityGuard,
      terminalPerformanceGuard,
      terminalOperatorCopilot,
      terminalLaunchBridge,
      terminalSourceTrust,
      terminalEvidenceExport,
      terminalRuntimeHealth,
      terminalOperatorFocus,
      terminalInteractionStability,
      terminalReviewDeck,
      legalNote: "Automated market-integrity signal. Not legal proof, not an accusation, not financial advice.",
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json<ErrorPayload>(
      { mode: "error", error: error instanceof Error ? error.message : "Report generation failed" },
      { status: 502 },
    );
  }
}
