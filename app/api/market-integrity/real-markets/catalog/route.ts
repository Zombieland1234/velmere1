import { NextResponse } from "next/server";
import { buildPass371GlobalRealMarketCatalog, pass371CoverageContract } from "@/lib/market-integrity/pass371-global-real-market-catalog";
import { buildPass372RealMarketInstitutionalSpine, pass372CoverageUpgrade } from "@/lib/market-integrity/pass372-real-market-institutional-spine";
import { buildPass373RealMarketProviderSpine, pass373ProviderSpineContract } from "@/lib/market-integrity/pass373-real-market-provider-spine";
import { buildPass374RealMarketUniverse, pass374ProviderParityContract } from "@/lib/market-integrity/pass374-global-market-ai-contract";
import { buildPass375MarketCoverageUniverse, pass375ProviderConnectorMap, pass375PdfExactPreviewContract } from "@/lib/market-integrity/pass375-unified-provider-terminal";
import { buildPass376MarketCoverageUniverse, pass376PdfParitySeal, pass376ProviderLaunchFidelity } from "@/lib/market-integrity/pass376-launch-fidelity-spine";
import { buildPass377MarketCoverageUniverse, pass377PdfParityControl, pass377UnifiedFidelityContract } from "@/lib/market-integrity/pass377-realmarket-neural-audit-control";
import { buildPass378MarketCoverageUniverse, pass378LaunchOrchestratorContract, pass378PdfMirrorContract, pass378ProviderDeck } from "@/lib/market-integrity/pass378-unified-launch-orchestrator";
import { buildPass379MarketCoverageUniverse, pass379LiveProviderBrainContract, pass379PdfMirror, pass379ProviderReadinessRails } from "@/lib/market-integrity/pass379-live-provider-brain-contract";
import { buildPass380MarketCoverageUniverse, pass380LiveTruthContract, pass380PdfParityContract, pass380ProviderDeck } from "@/lib/market-integrity/pass380-market-trng-brain-contract";
import { buildPass381MarketCoverageUniverse, pass381OrchestratedBrainContract, pass381PdfMirror, pass381ProviderRails } from "@/lib/market-integrity/pass381-live-provider_orchestrated_brain";
import { buildPass382MarketCoverageUniverse, pass382PdfMirror, pass382ProviderControlDeck, pass382UnifiedBrainMirrorContract } from "@/lib/market-integrity/pass382-unified-brain-mirror";
import { buildPass383MarketCoverageUniverse, pass383CleanLaunchContract, pass383PdfMirror, pass383ProviderLanes } from "@/lib/market-integrity/pass383-clean-launch-brain";
import { buildPass384MarketCoverageUniverse, pass384ProductionFidelityContract, pass384ProviderChecklist } from "@/lib/market-integrity/pass384-production-fidelity-spine";
import { buildPass385MarketCoverageUniverse, pass385ProductionClosureContract, pass385ProviderClosureDeck } from "@/lib/market-integrity/pass385-production-closure-brain";
import { buildPass386MarketCoverageUniverse, pass386ExactMirrorContract, pass386ProviderDeck } from "@/lib/market-integrity/pass386-exact-mirror-terminal";
import { buildPass387MarketCoverageUniverse, pass387ProductionSignalContract, pass387ProviderMatrix } from "@/lib/market-integrity/pass387-production-signal-spine";
import { buildPass388MarketCoverageUniverse, pass388ProviderRails, pass388WorldMarketClarityContract } from "@/lib/market-integrity/pass388-world-market-clarity-terminal";
import { buildPass389MarketCoverageUniverse, pass389ProviderChecklist, pass389PublicLaunchTerminalContract } from "@/lib/market-integrity/pass389-public-launch-terminal";
import { buildPass390MarketCoverageUniverse, pass390ProductionGradeTerminalContract, pass390ProviderRails } from "@/lib/market-integrity/pass390-production-grade-terminal";
import { buildPass391MarketCoverageUniverse, pass391ProductionClosureContract, pass391ProviderRails } from "@/lib/market-integrity/pass391-production-closure-terminal";
import { buildPass392MarketCoverageUniverse, pass392PublicFidelityCore, pass392ProviderRails } from "@/lib/market-integrity/pass392-public-fidelity-core";
import { buildPass396MarketCoverageUniverse, pass396TerminalParityContract } from "@/lib/market-integrity/pass396-terminal-parity-brain";
import { buildPass397MarketCoverageUniverse, pass397UnifiedTerminalContract } from "@/lib/market-integrity/pass397-unified-search-pdf-brain";
import { buildPass398MarketCoverageUniverse, pass398TerminalFidelityContract } from "@/lib/market-integrity/pass398-terminal-fidelity-loop";
import { buildPass399MarketCoverageUniverse, pass399KernelExactnessContract } from "@/lib/market-integrity/pass399-kernel-exactness-loop";
import { buildPass400MarketCoverageUniverse, pass400TerminalProofContract } from "@/lib/market-integrity/pass400-terminal-proof-engine";
import { buildPass401MarketCoverageUniverse, pass401TerminalExactnessMatrix } from "@/lib/market-integrity/pass401-terminal-exactness-matrix";
import { buildPass402MarketCoverageUniverse, pass402TerminalCleanOrbit } from "@/lib/market-integrity/pass402-terminal-clean-orbit-controller";
import { buildPass403MarketCoverageUniverse, pass403TerminalTruthOrbit } from "@/lib/market-integrity/pass403-terminal-truth-orbit";
import { buildPass404MarketCoverageUniverse, pass404TerminalExactOrbit } from "@/lib/market-integrity/pass404-terminal-exact-orbit";
import { buildPass405MarketCoverageUniverse, pass405TerminalOnePayloadOrbit } from "@/lib/market-integrity/pass405-terminal-one-payload-orbit";
import { buildPass406MarketCoverageUniverse, pass406TerminalPayloadIntegrityOrbit } from "@/lib/market-integrity/pass406-terminal-payload-integrity-orbit";
import { buildPass407MarketCoverageUniverse, pass407TerminalPayloadIntegrityOrbit } from "@/lib/market-integrity/pass407-terminal-exact-payload-orbit";
import { buildPass408MarketCoverageUniverse, pass408TerminalSourceProofOrbit } from "@/lib/market-integrity/pass408-terminal-source-proof-orbit";
import { buildPass409MarketCoverageUniverse, pass409TerminalSourceTruthOrbit } from "@/lib/market-integrity/pass409-terminal-source-truth-orbit";
import { buildPass410MarketCoverageUniverse, pass410TerminalLiveParityOrbit } from "@/lib/market-integrity/pass410-terminal-live-parity-orbit";
import { buildPass411MarketCoverageUniverse, pass411TerminalSourceEqualizerOrbit } from "@/lib/market-integrity/pass411-terminal-source-equalizer-orbit";
import { buildPass413MarketCoverageUniverse, pass413TerminalStabilityRuntime } from "@/lib/market-integrity/pass413-terminal-stability-runtime";
import { buildPass414MarketCoverageUniverse, pass414TerminalParityStabilizer } from "@/lib/market-integrity/pass414-terminal-parity-stabilizer";
import { buildPass415MarketCoverageUniverse, pass415TerminalLatencyStabilizer } from "@/lib/market-integrity/pass415-terminal-latency-stabilizer";
import { buildPass416MarketCoverageUniverse, pass416TerminalPrecisionAnchor } from "@/lib/market-integrity/pass416-terminal-precision-anchor";
import { buildPass417MarketCoverageUniverse, pass417TerminalChartAnchorStabilizer } from "@/lib/market-integrity/pass417-terminal-chart-anchor-stabilizer";
import { buildPass418MarketCoverageUniverse, pass418TerminalCleanroomRuntime } from "@/lib/market-integrity/pass418-terminal-cleanroom-runtime";
import { buildPass419MarketCoverageUniverse, pass419TerminalPayloadStabilizer } from "@/lib/market-integrity/pass419-terminal-payload-stabilizer";
import { pass449ArchitectureDarkMatterGuard } from "@/lib/market-integrity/pass449-architecture-dark-matter-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanCatalogSymbol(value: unknown, fallback = "UNKNOWN") {
  const clean = String(value ?? fallback).trim().toUpperCase();
  return clean || fallback;
}

export async function GET() {
  const rawRows = [
    ...buildPass371GlobalRealMarketCatalog(),
    ...buildPass372RealMarketInstitutionalSpine(),
    ...buildPass373RealMarketProviderSpine(),
    ...buildPass374RealMarketUniverse(),
    ...buildPass375MarketCoverageUniverse(),
    ...buildPass376MarketCoverageUniverse(),
    ...buildPass377MarketCoverageUniverse(),
    ...buildPass378MarketCoverageUniverse(),
    ...buildPass379MarketCoverageUniverse(),
    ...buildPass380MarketCoverageUniverse(),
    ...buildPass381MarketCoverageUniverse(),
    ...buildPass382MarketCoverageUniverse(),
    ...buildPass383MarketCoverageUniverse(),
    ...buildPass384MarketCoverageUniverse(),
    ...buildPass385MarketCoverageUniverse(),
    ...buildPass386MarketCoverageUniverse(),
    ...buildPass387MarketCoverageUniverse(),
    ...buildPass388MarketCoverageUniverse(),
    ...buildPass389MarketCoverageUniverse(),
    ...buildPass390MarketCoverageUniverse(),
    ...buildPass391MarketCoverageUniverse(),
    ...buildPass392MarketCoverageUniverse(),
    ...buildPass396MarketCoverageUniverse(),
    ...buildPass397MarketCoverageUniverse(),
    ...buildPass398MarketCoverageUniverse(),
    ...buildPass399MarketCoverageUniverse(),
    ...buildPass400MarketCoverageUniverse(),
    ...buildPass401MarketCoverageUniverse(),
    ...buildPass402MarketCoverageUniverse(),
    ...buildPass403MarketCoverageUniverse(),
    ...buildPass404MarketCoverageUniverse(),
    ...buildPass405MarketCoverageUniverse(),
    ...buildPass406MarketCoverageUniverse(),
    ...buildPass407MarketCoverageUniverse(),
    ...buildPass408MarketCoverageUniverse(),
    ...buildPass409MarketCoverageUniverse(),
    ...buildPass410MarketCoverageUniverse(),
    ...buildPass411MarketCoverageUniverse(),
    ...buildPass413MarketCoverageUniverse(),
    ...buildPass414MarketCoverageUniverse(),
    ...buildPass415MarketCoverageUniverse(),
    ...buildPass416MarketCoverageUniverse(),
    ...buildPass417MarketCoverageUniverse(),
    ...buildPass418MarketCoverageUniverse(),
    ...buildPass419MarketCoverageUniverse(),
  ];

  // PASS453: later market-coverage builders intentionally inherit earlier rows.
  // The public catalog must therefore collapse inherited duplicates before counts/UI use.
  const rows = Array.from(
    new Map(
      rawRows.map((row) => [
        `${row.assetClass}:${cleanCatalogSymbol(row.symbol)}`,
        row,
      ]),
    ).values(),
  ).sort((left, right) => left.rank - right.rank || left.symbol.localeCompare(right.symbol));
  const uniqueSymbols = new Set(rows.map((row) => cleanCatalogSymbol(row.symbol))).size;

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    contract: {
      ...pass371CoverageContract,
      pass372: pass372CoverageUpgrade,
      pass373: pass373ProviderSpineContract,
      pass374: pass374ProviderParityContract,
      pass375: pass375ProviderConnectorMap,
      pass376: pass376ProviderLaunchFidelity,
      pdfParity: pass375PdfExactPreviewContract,
      pass376PdfParity: pass376PdfParitySeal,
      pass377: pass377UnifiedFidelityContract,
      pass377PdfParity: pass377PdfParityControl,
      pass378: pass378LaunchOrchestratorContract,
      pass378PdfMirror: pass378PdfMirrorContract,
      pass378ProviderDeck,
      pass379: pass379LiveProviderBrainContract,
      pass379PdfMirror,
      pass379ProviderReadinessRails,
      pass380: pass380LiveTruthContract,
      pass380PdfParity: pass380PdfParityContract,
      pass380ProviderDeck,
      pass381: pass381OrchestratedBrainContract,
      pass381PdfMirror,
      pass381ProviderRails,
      pass382: pass382UnifiedBrainMirrorContract,
      pass382PdfMirror,
      pass382ProviderControlDeck,
      pass383: pass383CleanLaunchContract,
      pass383PdfMirror,
      pass383ProviderLanes,
      pass384: pass384ProductionFidelityContract,
      pass384ProviderChecklist,
      pass385: pass385ProductionClosureContract,
      pass385ProviderClosureDeck,
      pass386: pass386ExactMirrorContract,
      pass386ProviderDeck,
      pass387: pass387ProductionSignalContract,
      pass387ProviderMatrix,
      pass388: pass388WorldMarketClarityContract,
      pass388ProviderRails,
      pass389: pass389PublicLaunchTerminalContract,
      pass389ProviderChecklist,
      pass390: pass390ProductionGradeTerminalContract,
      pass390ProviderRails,
      pass391: pass391ProductionClosureContract,
      pass391ProviderRails,
      pass392: pass392PublicFidelityCore,
      pass392ProviderRails,
      pass396: pass396TerminalParityContract,
      pass397: pass397UnifiedTerminalContract,
      pass398: pass398TerminalFidelityContract,
      pass399: pass399KernelExactnessContract,
      pass400: pass400TerminalProofContract,
      pass401: pass401TerminalExactnessMatrix,
      pass402: pass402TerminalCleanOrbit,
      pass403: pass403TerminalTruthOrbit,
      pass404: pass404TerminalExactOrbit,
      pass405: pass405TerminalOnePayloadOrbit,
      pass406: pass406TerminalPayloadIntegrityOrbit,
      pass407: pass407TerminalPayloadIntegrityOrbit,
      pass408: pass408TerminalSourceProofOrbit,
      pass409: pass409TerminalSourceTruthOrbit,
      pass410: pass410TerminalLiveParityOrbit,
      pass411: pass411TerminalSourceEqualizerOrbit,
      pass413: pass413TerminalStabilityRuntime,
      pass414: pass414TerminalParityStabilizer,
      pass415: pass415TerminalLatencyStabilizer,
      pass416: pass416TerminalPrecisionAnchor,
      pass417: pass417TerminalChartAnchorStabilizer,
      pass418: pass418TerminalCleanroomRuntime,
      pass419: pass419TerminalPayloadStabilizer,
      pass449: pass449ArchitectureDarkMatterGuard,
      pass453: {
        id: "PASS453",
        rule: "Inherited catalog rows are de-duplicated by assetClass + symbol before public counts and UI consumption.",
        dynamicProviderSearch: true,
        noFakeVenuePrice: true,
      },
    },
    counts: {
      total: rows.length,
      uniqueSymbols,
      inheritedRowsCollapsed: rawRows.length - rows.length,
      stocks: rows.filter((row) => row.assetClass === "stock").length,
      fx: rows.filter((row) => row.assetClass === "fx").length,
      etf: rows.filter((row) => row.assetClass === "etf").length,
      commodities: rows.filter((row) => row.assetClass === "commodity").length,
      realEstate: rows.filter((row) => row.assetClass === "real_estate").length,
      crypto: rows.filter((row) => row.assetClass === "crypto").length,
      exchangeTokens: rows.filter((row) => row.assetClass === "exchange_token").length,
    },
    rows,
  }, { headers: { "cache-control": "no-store" } });
}
