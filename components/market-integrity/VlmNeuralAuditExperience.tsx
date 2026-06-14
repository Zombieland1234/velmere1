"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  BrainCircuit,
  Check,
  CircleAlert,
  ScanLine,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useModalScrollLock } from "@/components/ui/useModalScrollLock";
import { useDialogFocusBoundary } from "@/components/ui/useDialogFocusBoundary";
import { pass628LayerStyle } from "@/lib/ui/pass628-overlay-constitution";
import type {
  UnifiedAuditEvidence,
  UnifiedAuditLocale,
  UnifiedAuditMode,
} from "@/lib/market-integrity/unified-audit";
import { getPass484AnalysisDepthManifest } from "@/lib/market-integrity/pass484-analysis-depth-manifest";
import {
  buildPass485EvidenceReasoning,
  type Pass485ReasoningLaneId,
} from "@/lib/market-integrity/pass485-evidence-reasoning-engine";
import { useMotionQuality } from "@/lib/motion/useMotionQuality";
import { useRuntimeSurfaceGovernor } from "@/lib/motion/useRuntimeSurfaceGovernor";
import {
  getPass489MotionBudget,
  type Pass489MotionBudget,
} from "@/lib/motion/pass489-motion-system";
import {
  buildPass491NeuralConfidenceTopology,
  type Pass491ConfidenceAxisId,
} from "@/lib/market-integrity/pass491-neural-confidence-topology";
import {
  buildPass493NeuralAttentionDirector,
  resolvePass493AttentionStep,
} from "@/lib/market-integrity/pass493-neural-attention-director";
import { buildPass497NeuralDecisionBrief } from "@/lib/market-integrity/pass497-neural-decision-brief";
import { buildPass506SourceDiffTimeline } from "@/lib/market-integrity/pass506-source-diff-timeline";
import { buildPass508MobileReplay } from "@/lib/market-integrity/pass508-mobile-replay";
import { buildPass510NeuralConfidenceWaterfall } from "@/lib/market-integrity/pass510-neural-confidence-waterfall";
import { getPass514InteractionMotion } from "@/lib/motion/pass514-interaction-motion-orchestrator";
import { buildPass520AiContradictionLineage } from "@/lib/market-integrity/pass520-ai-contradiction-lineage";
import { buildPass525LineageRootCause } from "@/lib/market-integrity/pass525-lineage-root-cause";
import { buildPass534SourceLineage } from "@/lib/market-integrity/pass534-source-lineage";
import { buildPass540AiSourceTrustMatrix } from "@/lib/market-integrity/pass540-ai-source-trust-matrix";
import { buildPass546AiRemediationPlan } from "@/lib/market-integrity/pass546-ai-remediation-plan";
import { getPass522MobileGestureQa } from "@/lib/motion/pass522-mobile-gesture-qa";
import { usePass527AdaptiveFrameBudget } from "@/lib/motion/usePass527AdaptiveFrameBudget";
import { buildPass542MotionControl } from "@/lib/motion/pass542-motion-control";
import { buildPass529MobileInteractionReplay } from "@/lib/motion/pass529-mobile-interaction-replay";
import {
  buildPass602NeuralEvidenceTopology,
  resolvePass602ActiveNeuralPath,
  type Pass602ActiveNeuralPath,
  type Pass602NeuralEvidenceTopology,
} from "@/lib/market-integrity/pass602-neural-evidence-topology";
import {
  buildPass603ProgressiveLobeRendering,
  type Pass603ProgressiveLobePlan,
} from "@/lib/market-integrity/pass603-progressive-lobe-rendering";
import { buildPass604ConfidencePropagation } from "@/lib/market-integrity/pass604-confidence-propagation";
import {
  buildPass605BrainInteractionContract,
  resolvePass605BrainNavigation,
  type Pass605BrainInteractionContract,
} from "@/lib/market-integrity/pass605-brain-interaction-contract";
import {
  buildPass606EvidenceDrivenNeuralMotion,
  createPass606NeuralEvidenceFingerprint,
  type Pass606NeuralMotionPlan,
} from "@/lib/market-integrity/pass606-evidence-driven-neural-motion";

const VLM_NEURAL_SPIN_CYCLE_MS = 72_000;

const paletteByMode = {
  basic: {
    core: 0xd4af55,
    nodes: 0xffe2a0,
    lines: 0xb8862f,
    css: "#d4af55",
    glow: "rgba(212,175,85,0.32)",
  },
  pro: {
    core: 0xb16cff,
    nodes: 0xe2bfff,
    lines: 0x7b43c8,
    css: "#b16cff",
    glow: "rgba(177,108,255,0.32)",
  },
  advanced: {
    core: 0x62d9ff,
    nodes: 0xa8efff,
    lines: 0x168fff,
    css: "#62d9ff",
    glow: "rgba(35,190,255,0.32)",
  },
} as const;

const copy = {
  pl: {
    title: "Velmère Neural Audit",
    collecting: "Porządkowanie źródeł i sygnałów",
    resolving: "Budowanie pola dowodowego",
    complete: "Pole audytu",
    close: "Zamknij",
    remaining: "Szacowany czas",
    seconds: "s",
    evidence: "sygnałów",
    sourceBound: "wynik oparty na przekazanych źródłach",
    sourcesLabel: "źródła",
    confidence: "skalibrowana pewność",
    coverage: "pokrycie dowodów",
    verified: "potwierdzone",
    review: "do weryfikacji",
    missing: "brak źródła",
    attention: "aktywny fokus",
    weakestAxis: "oś ograniczająca",
    neuralTopology: "Topologia dowodowa VLM",
    activeLineage: "Aktywna ścieżka",
    sourceBoundary: "Granica źródłowa",
    sourceBoundConfidence: "Pewność ograniczona źródłami",
    facts: "fakty",
    hypotheses: "hipotezy",
    motionEvidence: "Ruch dowodowy",
    motionStill: "Ruch zatrzymany",
    topologyInstructions: "Strzałki zmieniają fokus, Enter wybiera płat, Escape zamyka audyt.",
    showAll: "pokaż wszystkie dowody",
    strongestFact: "Najmocniejszy fakt",
    limitingFactor: "Co ogranicza wynik",
    nextVerification: "Następna weryfikacja",
    confidenceDrag: "Wpływ osi na pewność",
    timeline: "Linia zmian źródeł",
    replay: "Odtwórz tok analizy",
    lineage: "Genealogia sprzeczności",
    contradictions: "sprzeczności",
    limiters: "ograniczenia",
    lineageEmpty:
      "Brak jawnej sprzeczności; graf nadal pokazuje, które pola ograniczają potwierdzone fakty.",
    previousStep: "Poprzedni krok",
    nextStep: "Następny krok",
    mobileNav: {
      decision: "Decyzja",
      confidence: "Pewność",
      reasoning: "Tok AI",
      evidence: "Dowody",
    },
    stages: ["Tożsamość", "Cena i świece", "Luki i źródła", "Pole audytu"],
    modePromise: {
      basic:
        "10 najważniejszych pól: cena, kapitalizacja, 24h, wolumen, źródło i pewność.",
      pro: "14 pól z dynamiką 1h/7d, FDV, świecami, drugim źródłem i lukami dowodowymi.",
      advanced:
        "20 pól pełnego audytu: płynność, slippage, podaż, koncentracja, venue health, lineage i nietypowe anomalie.",
    },
  },
  de: {
    title: "Velmère Neural Audit",
    collecting: "Quellen und Signale werden geordnet",
    resolving: "Evidenzfeld wird aufgebaut",
    complete: "Audit-Feld",
    close: "Schließen",
    remaining: "Geschätzte Zeit",
    seconds: "s",
    evidence: "Signale",
    sourceBound: "Ergebnis aus den übergebenen Quellen",
    sourcesLabel: "Quellen",
    confidence: "kalibrierte Konfidenz",
    coverage: "Evidenzabdeckung",
    verified: "bestätigt",
    review: "zu prüfen",
    missing: "Quelle fehlt",
    attention: "aktiver Fokus",
    weakestAxis: "begrenzende Achse",
    neuralTopology: "VLM-Evidenztopologie",
    activeLineage: "Aktiver Pfad",
    sourceBoundary: "Quellengrenze",
    sourceBoundConfidence: "Quellengebundene Konfidenz",
    facts: "Fakten",
    hypotheses: "Hypothesen",
    motionEvidence: "Evidenzbewegung",
    motionStill: "Bewegung pausiert",
    topologyInstructions: "Pfeiltasten bewegen den Fokus, Enter wählt einen Lappen, Escape schließt den Audit.",
    showAll: "alle Evidenzen zeigen",
    strongestFact: "Stärkster Fakt",
    limitingFactor: "Was das Ergebnis begrenzt",
    nextVerification: "Nächste Verifikation",
    confidenceDrag: "Einfluss auf die Konfidenz",
    timeline: "Quellen-Differenz-Timeline",
    replay: "Analyseablauf wiedergeben",
    lineage: "Widerspruchs-Lineage",
    contradictions: "Widersprüche",
    limiters: "Begrenzungen",
    lineageEmpty:
      "Kein expliziter Widerspruch; der Graph zeigt weiterhin, welche Felder bestätigte Fakten begrenzen.",
    previousStep: "Vorheriger Schritt",
    nextStep: "Nächster Schritt",
    mobileNav: {
      decision: "Entscheidung",
      confidence: "Konfidenz",
      reasoning: "KI-Pfad",
      evidence: "Evidenz",
    },
    stages: [
      "Identität",
      "Preis und Kerzen",
      "Lücken und Quellen",
      "Audit-Feld",
    ],
    modePromise: {
      basic:
        "10 Kernfelder: Preis, Market Cap, 24h, Volumen, Quelle und Konfidenz.",
      pro: "14 Felder mit 1h/7d-Dynamik, FDV, Kerzen, Zweitquelle und Evidenzlücken.",
      advanced:
        "20 Felder im Voll-Audit: Liquidität, Slippage, Angebot, Konzentration, Venue Health, Lineage und ungewöhnliche Anomalien.",
    },
  },
  en: {
    title: "Velmère Neural Audit",
    collecting: "Organizing sources and signals",
    resolving: "Building the evidence field",
    complete: "Audit field",
    close: "Close",
    remaining: "Estimated time",
    seconds: "s",
    evidence: "signals",
    sourceBound: "result bound to supplied sources",
    sourcesLabel: "sources",
    confidence: "calibrated confidence",
    coverage: "evidence coverage",
    verified: "verified",
    review: "review",
    missing: "source missing",
    attention: "active focus",
    weakestAxis: "limiting axis",
    neuralTopology: "VLM evidence topology",
    activeLineage: "Active lineage",
    sourceBoundary: "Source boundary",
    sourceBoundConfidence: "Source-bound confidence",
    facts: "facts",
    hypotheses: "hypotheses",
    motionEvidence: "Evidence motion",
    motionStill: "Motion paused",
    topologyInstructions: "Arrow keys move focus, Enter selects a lobe, and Escape closes the audit.",
    showAll: "show all evidence",
    strongestFact: "Strongest fact",
    limitingFactor: "What limits the result",
    nextVerification: "Next verification",
    confidenceDrag: "Confidence impact",
    timeline: "Source-diff timeline",
    replay: "Replay the reasoning path",
    lineage: "Contradiction lineage",
    contradictions: "contradictions",
    limiters: "limiters",
    lineageEmpty:
      "No explicit contradiction; the graph still shows which fields limit the verified facts.",
    previousStep: "Previous step",
    nextStep: "Next step",
    mobileNav: {
      decision: "Decision",
      confidence: "Confidence",
      reasoning: "AI path",
      evidence: "Evidence",
    },
    stages: [
      "Identity",
      "Price and candles",
      "Gaps and sources",
      "Audit field",
    ],
    modePromise: {
      basic:
        "10 essential fields: price, market cap, 24h move, volume, source and confidence.",
      pro: "14 fields with 1h/7d dynamics, FDV, candles, second source and evidence gaps.",
      advanced:
        "20 full-audit fields: liquidity, slippage, supply, concentration, venue health, lineage and unusual anomalies.",
    },
  },
} as const;

type Pass603RuntimeProfile = {
  viewportWidth: number;
  hardwareConcurrency: number;
  deviceMemory: number;
  coarsePointer: boolean;
  webglSupported: boolean;
};

function usePass603RuntimeProfile(): Pass603RuntimeProfile {
  const [profile, setProfile] = useState<Pass603RuntimeProfile>({
    viewportWidth: 1024,
    hardwareConcurrency: 4,
    deviceMemory: 4,
    coarsePointer: false,
    webglSupported: true,
  });

  useEffect(() => {
    const read = () => {
      const canvas = document.createElement("canvas");
      const webglSupported = Boolean(
        canvas.getContext("webgl2") || canvas.getContext("webgl"),
      );
      setProfile({
        viewportWidth: window.innerWidth,
        hardwareConcurrency: navigator.hardwareConcurrency || 4,
        deviceMemory:
          (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4,
        coarsePointer: window.matchMedia("(pointer: coarse)").matches,
        webglSupported,
      });
    };
    read();
    window.addEventListener("resize", read, { passive: true });
    return () => window.removeEventListener("resize", read);
  }, []);

  return profile;
}

function chunkIds(ids: string[], size: number): string[][] {
  const output: string[][] = [];
  for (let index = 0; index < ids.length; index += size) {
    output.push(ids.slice(index, index + size));
  }
  return output;
}

function NeuralTopologyDock({
  topology,
  activePath,
  interaction,
  activeNodeId,
  onActiveNodeChange,
  onClose,
  labels,
}: {
  topology: Pass602NeuralEvidenceTopology;
  activePath: Pass602ActiveNeuralPath;
  interaction: Pass605BrainInteractionContract;
  activeNodeId: string;
  onActiveNodeChange: (id: string) => void;
  onClose: () => void;
  labels: {
    topology: string;
    activeLineage: string;
    sourceBoundary: string;
    instructions: string;
    sources: string;
    conflicts: string;
    fields: string;
  };
}) {
  const nodeIds = interaction.nodeIds;
  const activeIndex = Math.max(0, nodeIds.indexOf(activeNodeId));
  const [focusIndex, setFocusIndex] = useState(activeIndex);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const next = Math.max(0, nodeIds.indexOf(activeNodeId));
    setFocusIndex(next);
  }, [activeNodeId, nodeIds]);

  const rows = chunkIds(nodeIds, interaction.columns);
  const activeNode =
    topology.nodes.find((node) => node.id === activeNodeId) ??
    topology.nodes.find((node) => node.id === topology.verdictNodeId) ??
    null;

  return (
    <section
      className="velmere-neural-topology-dock mx-auto w-full max-w-4xl rounded-[1.45rem] border border-cyan-200/[0.13] bg-[linear-gradient(135deg,rgba(58,207,255,0.075),transparent_44%),rgba(0,0,0,0.34)] p-3 sm:p-4"
      data-pass602-neural-evidence-topology={topology.nodes.length}
      data-pass605-brain-interaction-contract="roving-focus"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[8px] uppercase tracking-[0.15em] text-cyan-100/[0.64]">
            {labels.topology}
          </p>
          <p className="mt-1 text-[11px] leading-5 text-white/[0.42]">
            {labels.instructions}
          </p>
        </div>
        <span className="rounded-full border border-white/[0.09] bg-black/[0.22] px-3 py-1.5 font-mono text-[7px] uppercase tracking-[0.11em] text-white/[0.42]">
          {activePath.sourceIds.length} {labels.sources} · {activePath.conflictIds.length} {labels.conflicts}
        </span>
      </div>

      <div
        className="mt-3 grid gap-2"
        style={{ gridTemplateColumns: `repeat(${interaction.columns}, minmax(0, 1fr))` }}
        role="grid"
        aria-label={labels.topology}
        aria-colcount={interaction.columns}
        aria-rowcount={rows.length}
      >
        {rows.map((row, rowIndex) => (
          <div key={`row-${rowIndex}`} role="row" className="contents">
            {row.map((nodeId, columnIndex) => {
              const flatIndex = rowIndex * interaction.columns + columnIndex;
              const node = topology.nodes.find((entry) => entry.id === nodeId);
              if (!node) return null;
              const selected = node.id === activeNodeId;
              const inPath = activePath.visibleNodeIds.includes(node.id);
              return (
                <button
                  key={node.id}
                  ref={(element) => {
                    refs.current[flatIndex] = element;
                  }}
                  type="button"
                  role="gridcell"
                  aria-selected={selected}
                  aria-rowindex={rowIndex + 1}
                  aria-colindex={columnIndex + 1}
                  tabIndex={flatIndex === focusIndex ? 0 : -1}
                  onFocus={() => setFocusIndex(flatIndex)}
                  onClick={() => onActiveNodeChange(node.id)}
                  onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
                    const result = resolvePass605BrainNavigation({
                      key: event.key,
                      index: flatIndex,
                      count: nodeIds.length,
                      columns: interaction.columns,
                    });
                    if (result.action === "none") return;
                    event.preventDefault();
                    if (result.action === "close") {
                      onClose();
                      return;
                    }
                    if (result.action === "select") {
                      onActiveNodeChange(node.id);
                      return;
                    }
                    setFocusIndex(result.index);
                    refs.current[result.index]?.focus();
                  }}
                  className={`velmere-focus-ring min-h-11 rounded-xl border p-3 text-left transition ${
                    selected
                      ? "border-cyan-200/[0.34] bg-cyan-300/[0.10] text-white"
                      : inPath
                        ? "border-white/[0.13] bg-white/[0.045] text-white/[0.72]"
                        : "border-white/[0.07] bg-black/[0.18] text-white/[0.45] hover:bg-white/[0.04]"
                  }`}
                >
                  <span className="block font-mono text-[7px] uppercase tracking-[0.12em] text-cyan-100/[0.52]">
                    {node.kind}
                  </span>
                  <strong className="mt-1 block truncate text-xs font-semibold capitalize">
                    {node.label}
                  </strong>
                  <span className="mt-1 block truncate text-[9px] text-white/[0.34]">
                    {node.evidenceIds.length} {labels.fields}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {activeNode ? (
        <div className="mt-3 grid gap-2 rounded-xl border border-white/[0.08] bg-black/[0.22] p-3 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,0.55fr)]">
          <div>
            <p className="font-mono text-[7px] uppercase tracking-[0.12em] text-white/[0.34]">
              {labels.activeLineage}
            </p>
            <p className="mt-1.5 text-xs leading-5 text-white/[0.62]">
              {activeNode.summary}
            </p>
          </div>
          <div className="border-t border-white/[0.07] pt-2 sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0">
            <p className="font-mono text-[7px] uppercase tracking-[0.12em] text-amber-100/[0.48]">
              {labels.sourceBoundary}
            </p>
            <p className="mt-1.5 text-[10px] leading-5 text-white/[0.42]">
              {activePath.boundary}
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function NeuralFallback2D({
  symbol,
  mode,
  topology,
  activePath,
  renderingPlan,
}: {
  symbol: string;
  mode: UnifiedAuditMode;
  topology: Pass602NeuralEvidenceTopology;
  activePath: Pass602ActiveNeuralPath;
  renderingPlan: Pass603ProgressiveLobePlan;
}) {
  const palette = paletteByMode[mode];
  const nodes = renderingPlan.visualNodeIds
    .map((id) => topology.nodes.find((node) => node.id === id))
    .filter((node): node is NonNullable<typeof node> => Boolean(node));

  return (
    <svg
      viewBox="0 0 640 640"
      className="absolute inset-0 h-full w-full"
      role="img"
      aria-label={`${symbol} neural evidence topology`}
      data-pass603-fallback-2d="content-parity"
    >
      <defs>
        <radialGradient id={`vlm-neural-glow-${mode}`}>
          <stop offset="0%" stopColor={palette.css} stopOpacity="0.38" />
          <stop offset="100%" stopColor={palette.css} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="320" cy="320" r="210" fill={`url(#vlm-neural-glow-${mode})`} />
      {nodes.map((node, index) => {
        const angle = (index / Math.max(1, nodes.length)) * Math.PI * 2 - Math.PI / 2;
        const x = 320 + Math.cos(angle) * 190;
        const y = 320 + Math.sin(angle) * 150;
        const active = activePath.visibleNodeIds.includes(node.id);
        return (
          <g key={node.id}>
            <line
              x1="320"
              y1="320"
              x2={x}
              y2={y}
              stroke={active ? palette.css : "rgba(255,255,255,0.16)"}
              strokeWidth={active ? 2.4 : 1}
            />
            <circle
              cx={x}
              cy={y}
              r={active ? 10 : 7}
              fill={active ? palette.css : "rgba(255,255,255,0.42)"}
            />
          </g>
        );
      })}
      <circle cx="320" cy="320" r="80" fill="rgba(0,0,0,0.78)" stroke={palette.css} strokeOpacity="0.6" />
      <text x="320" y="315" textAnchor="middle" fill="white" fontSize="30" fontFamily="monospace">
        VLM
      </text>
      <text x="320" y="345" textAnchor="middle" fill={palette.css} fontSize="14" fontFamily="monospace">
        {symbol}
      </text>
    </svg>
  );
}

function NeuralScene({
  symbol,
  mode,
  progress,
  topology,
  activePath,
  renderingPlan,
  motionPlan,
}: {
  symbol: string;
  mode: UnifiedAuditMode;
  progress: number;
  topology: Pass602NeuralEvidenceTopology;
  activePath: Pass602ActiveNeuralPath;
  renderingPlan: Pass603ProgressiveLobePlan;
  motionPlan: Pass606NeuralMotionPlan;
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [sceneVisible, setSceneVisible] = useState(true);
  const palette = paletteByMode[mode];

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setSceneVisible(Boolean(entry?.isIntersecting)),
      { threshold: 0.06, rootMargin: "120px" },
    );
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (
      !host ||
      !sceneVisible ||
      renderingPlan.renderer !== "webgl" ||
      renderingPlan.visualNodeIds.length === 0
    ) {
      return;
    }
    let disposed = false;
    let frame = 0;
    let renderer: import("three").WebGLRenderer | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let disposeScene = () => {};

    void import("three").then((THREE) => {
      if (disposed || !host) return;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
      camera.position.z = 5.8;
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: renderingPlan.pressure === "normal",
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, renderingPlan.dprCap));
      renderer.setClearColor(0x000000, 0);
      host.appendChild(renderer.domElement);

      const root = new THREE.Group();
      scene.add(root);
      const coreGeometry = new THREE.IcosahedronGeometry(1.02, 2);
      const coreMaterial = new THREE.MeshBasicMaterial({
        color: palette.core,
        wireframe: true,
        transparent: true,
        opacity: 0.34,
      });
      const core = new THREE.Mesh(coreGeometry, coreMaterial);
      root.add(core);

      const lobeNodes = renderingPlan.visualNodeIds
        .map((id) => topology.nodes.find((node) => node.id === id))
        .filter((node): node is NonNullable<typeof node> => Boolean(node));
      const anchors = lobeNodes.map((node, index) => {
        const angle = (index / Math.max(1, lobeNodes.length)) * Math.PI * 2;
        const side = index % 2 === 0 ? -1 : 1;
        return {
          id: node.id,
          point: new THREE.Vector3(
            Math.cos(angle) * 1.42 + side * 0.12,
            Math.sin(angle) * 1.08,
            Math.cos(angle * 1.7) * 0.58,
          ),
        };
      });

      const particleCount = Math.max(anchors.length, renderingPlan.particleBudget);
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);
      const activeColor = new THREE.Color(palette.nodes);
      const quietColor = new THREE.Color(0x5d7b84);
      for (let index = 0; index < particleCount; index += 1) {
        const anchor = anchors[index % Math.max(1, anchors.length)] ?? {
          id: topology.verdictNodeId,
          point: new THREE.Vector3(0, 0, 0),
        };
        const ring = Math.floor(index / Math.max(1, anchors.length));
        const theta = index * 2.399963229728653;
        const spread = 0.05 + (ring % 7) * 0.027;
        positions[index * 3] = anchor.point.x + Math.cos(theta) * spread;
        positions[index * 3 + 1] = anchor.point.y + Math.sin(theta) * spread;
        positions[index * 3 + 2] = anchor.point.z + Math.sin(theta * 0.7) * spread;
        const color = activePath.visibleNodeIds.includes(anchor.id) ? activeColor : quietColor;
        colors[index * 3] = color.r;
        colors[index * 3 + 1] = color.g;
        colors[index * 3 + 2] = color.b;
      }
      const pointGeometry = new THREE.BufferGeometry();
      pointGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      pointGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      const pointMaterial = new THREE.PointsMaterial({
        vertexColors: true,
        size: 0.052,
        transparent: true,
        opacity: 0.92,
        blending: THREE.AdditiveBlending,
      });
      const pointCloud = new THREE.Points(pointGeometry, pointMaterial);
      root.add(pointCloud);

      const segments: number[] = [];
      for (const anchor of anchors.slice(0, renderingPlan.connectionBudget)) {
        segments.push(
          0,
          0,
          0,
          anchor.point.x,
          anchor.point.y,
          anchor.point.z,
        );
      }
      anchors.forEach((anchor, index) => {
        if (segments.length / 6 >= renderingPlan.connectionBudget) return;
        const next = anchors[(index + 1) % Math.max(1, anchors.length)];
        if (!next) return;
        segments.push(
          anchor.point.x,
          anchor.point.y,
          anchor.point.z,
          next.point.x,
          next.point.y,
          next.point.z,
        );
      });
      const lineGeometry = new THREE.BufferGeometry();
      lineGeometry.setAttribute("position", new THREE.Float32BufferAttribute(segments, 3));
      const lineMaterial = new THREE.LineBasicMaterial({
        color: palette.lines,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
      });
      const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
      root.add(lines);

      const packetGeometry = new THREE.SphereGeometry(0.038, 8, 8);
      const packetMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const packets = anchors.slice(0, Math.min(anchors.length, 8)).map((anchor, index) => {
        const mesh = new THREE.Mesh(packetGeometry, packetMaterial);
        mesh.position.copy(anchor.point);
        root.add(mesh);
        return { mesh, from: anchor.point, delay: index * 0.06 };
      });

      const resize = () => {
        const width = Math.max(1, host.clientWidth);
        const height = Math.max(1, host.clientHeight);
        renderer?.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };
      resize();
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(host);

      const renderAt = (time: number, linearProgress: number) => {
        if (!renderer) return;
        const progressValue = Math.max(0, Math.min(1, linearProgress));
        const eased = 1 - Math.pow(1 - progressValue, 3);
        const calmSpin = ((time % VLM_NEURAL_SPIN_CYCLE_MS) / VLM_NEURAL_SPIN_CYCLE_MS) * Math.PI * 2;
        root.rotation.y = calmSpin;
        root.rotation.x = Math.sin(calmSpin * 0.5) * 0.045;
        core.rotation.x = calmSpin * 0.18;
        core.rotation.z = -calmSpin * 0.12;
        core.scale.setScalar(1 + (motionPlan.pulseScale - 1) * Math.sin(eased * Math.PI));
        packets.forEach((packet) => {
          const local = Math.max(0, Math.min(1, (eased - packet.delay) / Math.max(0.01, 1 - packet.delay)));
          packet.mesh.position.copy(packet.from).multiplyScalar(1 - local);
          packet.mesh.scale.setScalar(0.6 + Math.sin(local * Math.PI) * 0.85);
          packet.mesh.visible = motionPlan.animate && progressValue < 1;
        });
        renderer.render(scene, camera);
      };

      const started = performance.now();
      const tick = (time: number) => {
        if (disposed || !renderer) return;
        const next = motionPlan.animate && motionPlan.durationMs > 0
          ? Math.min(1, (time - started) / motionPlan.durationMs)
          : 1;
        renderAt(time, next);
        frame = window.requestAnimationFrame(tick);
      };
      frame = window.requestAnimationFrame(tick);

      disposeScene = () => {
        coreGeometry.dispose();
        coreMaterial.dispose();
        pointGeometry.dispose();
        pointMaterial.dispose();
        lineGeometry.dispose();
        lineMaterial.dispose();
        packetGeometry.dispose();
        packetMaterial.dispose();
      };
    });

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      disposeScene();
      if (renderer) {
        renderer.dispose();
        renderer.domElement.remove();
      }
    };
  }, [
    activePath.visibleNodeIds,
    motionPlan.animate,
    motionPlan.durationMs,
    motionPlan.fingerprint,
    motionPlan.pulseScale,
    motionPlan.rotationDegrees,
    palette,
    renderingPlan,
    sceneVisible,
    topology,
  ]);

  const showFallback = sceneVisible && renderingPlan.renderer !== "webgl";

  return (
    <div
      ref={wrapperRef}
      className="relative mx-auto aspect-square w-full max-w-[min(620px,72dvh)]"
      onContextMenu={(event) => event.preventDefault()}
      data-pass603-progressive-lobe-rendering={
        sceneVisible ? renderingPlan.renderer : "offscreen"
      }
      data-pass606-evidence-driven-motion={motionPlan.mode}
    >
      {renderingPlan.renderer === "webgl" && sceneVisible ? (
        <div ref={hostRef} className="absolute inset-0 touch-pan-y" aria-hidden="true" />
      ) : null}
      {showFallback ? (
        <NeuralFallback2D
          symbol={symbol}
          mode={mode}
          topology={topology}
          activePath={activePath}
          renderingPlan={renderingPlan}
        />
      ) : null}
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div
          className="grid h-28 w-28 place-items-center rounded-full border bg-black/[0.72]"
          style={{
            borderColor: `${palette.css}66`,
            boxShadow: `0 0 80px ${palette.glow}`,
          }}
        >
          <span className="font-mono text-2xl font-semibold tracking-[0.14em] text-white">
            VLM
          </span>
          <span
            className="-mt-8 font-mono text-[9px] uppercase tracking-[0.16em]"
            style={{ color: palette.css }}
          >
            {symbol}
          </span>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-[12%] bottom-[7%] h-px bg-white/[0.08]">
        <span
          className="block h-full transition-[width] duration-300"
          style={{
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${palette.css}, #ffffff)`,
          }}
        />
      </div>
    </div>
  );
}


export default function VlmNeuralAuditExperience({
  locale,
  mode,
  symbol,
  name,
  evidence,
  onClose,
  contained = false,
}: {
  locale: UnifiedAuditLocale;
  mode: UnifiedAuditMode;
  symbol: string;
  name: string;
  evidence: UnifiedAuditEvidence[];
  onClose: () => void;
  contained?: boolean;
}) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const runtimeProfile = usePass603RuntimeProfile();
  const reducedMotion = useReducedMotion();
  const [ambientMotionPaused, setAmbientMotionPaused] = useState(false);
  const effectiveReducedMotion = Boolean(reducedMotion) || ambientMotionPaused;
  const motionQuality = useMotionQuality(effectiveReducedMotion);
  const runtimeGovernor = useRuntimeSurfaceGovernor();
  const adaptiveFrameBudget = usePass527AdaptiveFrameBudget(
    runtimeGovernor.animate && !ambientMotionPaused,
  );
  const pass542MotionControl = useMemo(
    () =>
      buildPass542MotionControl(
        locale,
        Boolean(reducedMotion),
        adaptiveFrameBudget.state,
        ambientMotionPaused,
      ),
    [adaptiveFrameBudget.state, ambientMotionPaused, locale, reducedMotion],
  );
  const baseMotionBudget = useMemo(
    () => getPass489MotionBudget(motionQuality, effectiveReducedMotion),
    [motionQuality, effectiveReducedMotion],
  );
  const motionBudget = useMemo<Pass489MotionBudget>(() => {
    const targetFps: Pass489MotionBudget["targetFps"] =
      runtimeGovernor.targetFps === 0
        ? 0
        : runtimeGovernor.targetFps <= 30
          ? 30
          : runtimeGovernor.targetFps <= 45
            ? 45
            : 60;
    return {
      ...baseMotionBudget,
      tier: pass542MotionControl.mode === "still" ? "still" : runtimeGovernor.tier,
      targetFps: Math.min(
        baseMotionBudget.targetFps,
        targetFps,
      ) as Pass489MotionBudget["targetFps"],
      blur: baseMotionBudget.blur && runtimeGovernor.blur,
      parallax: baseMotionBudget.parallax && runtimeGovernor.animate,
      orbit: baseMotionBudget.orbit && runtimeGovernor.animate,
      pulse: baseMotionBudget.pulse && runtimeGovernor.animate,
      concurrentLoops: pass542MotionControl.ambientAllowed && runtimeGovernor.animate
        ? baseMotionBudget.concurrentLoops
        : 0,
    };
  }, [baseMotionBudget, pass542MotionControl, runtimeGovernor]);
  const c = copy[locale];
  const depthManifest = getPass484AnalysisDepthManifest(locale, mode);
  const interactionMotion = useMemo(
    () =>
      getPass514InteractionMotion(
        runtimeGovernor.tier,
        effectiveReducedMotion,
        "enter",
      ),
    [effectiveReducedMotion, runtimeGovernor.tier],
  );
  const [elapsed, setElapsed] = useState(0);
  const [complete, setComplete] = useState(false);
  const completionTimeoutRef = useRef<number | null>(null);
  const [activeAxisId, setActiveAxisId] =
    useState<Pass491ConfidenceAxisId | null>(null);
  const [activeReasoningLaneId, setActiveReasoningLaneId] =
    useState<Pass485ReasoningLaneId | null>(null);
  const [activeReplayIndex, setActiveReplayIndex] = useState(0);
  const [activeLineageNodeId, setActiveLineageNodeId] = useState<string | null>(
    null,
  );
  const [activeTopologyNodeId, setActiveTopologyNodeId] = useState("");
  const previousNeuralFingerprintRef = useRef<string | null>(null);
  const previousTopologyNodeRef = useRef<string | null>(null);
  useModalScrollLock(!contained);

  const visibleEvidence = useMemo(() => evidence, [evidence]);
  const neuralTopology = useMemo(
    () =>
      buildPass602NeuralEvidenceTopology({
        subject: `${symbol}:${name}`,
        evidence: visibleEvidence,
        locale,
      }),
    [locale, name, symbol, visibleEvidence],
  );
  const resolvedTopologyNodeId =
    neuralTopology.nodes.some((node) => node.id === activeTopologyNodeId)
      ? activeTopologyNodeId
      : neuralTopology.verdictNodeId;
  const activeNeuralPath = useMemo(
    () => resolvePass602ActiveNeuralPath(neuralTopology, resolvedTopologyNodeId),
    [neuralTopology, resolvedTopologyNodeId],
  );
  const lobeRenderingPlan = useMemo(
    () =>
      buildPass603ProgressiveLobeRendering({
        mode,
        lobeIds: [neuralTopology.verdictNodeId, ...neuralTopology.lobeIds],
        visible: true,
        webglSupported: runtimeGovernor.webgl && runtimeProfile.webglSupported,
        reducedMotion: effectiveReducedMotion,
        hardwareConcurrency: runtimeProfile.hardwareConcurrency,
        deviceMemory: runtimeProfile.deviceMemory,
        viewportWidth: runtimeProfile.viewportWidth,
        coarsePointer: runtimeProfile.coarsePointer,
        runtimeTier: runtimeGovernor.tier,
      }),
    [
      effectiveReducedMotion,
      mode,
      neuralTopology.lobeIds,
      neuralTopology.verdictNodeId,
      runtimeGovernor.tier,
      runtimeGovernor.webgl,
      runtimeProfile,
    ],
  );
  const brainInteraction = useMemo(
    () =>
      buildPass605BrainInteractionContract({
        nodeIds: lobeRenderingPlan.accessibleNodeIds,
        viewportWidth: runtimeProfile.viewportWidth,
        coarsePointer: runtimeProfile.coarsePointer,
      }),
    [lobeRenderingPlan.accessibleNodeIds, runtimeProfile.coarsePointer, runtimeProfile.viewportWidth],
  );
  const confidencePropagation = useMemo(
    () =>
      buildPass604ConfidencePropagation({
        topology: neuralTopology,
        evidence: visibleEvidence,
      }),
    [neuralTopology, visibleEvidence],
  );
  const neuralFingerprint = useMemo(
    () =>
      createPass606NeuralEvidenceFingerprint({
        subject: `${symbol}:${name}`,
        activeNodeId: resolvedTopologyNodeId,
        evidence: visibleEvidence,
        sourceIds: activeNeuralPath.sourceIds,
        conflictCount: neuralTopology.conflictCount,
        confidence: confidencePropagation.finalConfidence,
      }),
    [
      activeNeuralPath.sourceIds,
      confidencePropagation.finalConfidence,
      name,
      neuralTopology.conflictCount,
      resolvedTopologyNodeId,
      symbol,
      visibleEvidence,
    ],
  );
  const neuralMotionPlan = useMemo(
    () =>
      buildPass606EvidenceDrivenNeuralMotion({
        fingerprint: neuralFingerprint,
        previousFingerprint: previousNeuralFingerprintRef.current,
        visible: true,
        reducedMotion: Boolean(reducedMotion),
        paused: ambientMotionPaused,
        activeNodeChanged:
          previousTopologyNodeRef.current !== null &&
          previousTopologyNodeRef.current !== resolvedTopologyNodeId,
      }),
    [
      ambientMotionPaused,
      neuralFingerprint,
      reducedMotion,
      resolvedTopologyNodeId,
    ],
  );
  const evidenceReasoning = useMemo(
    () => buildPass485EvidenceReasoning(locale, mode, visibleEvidence),
    [locale, mode, visibleEvidence],
  );
  const confidenceTopology = useMemo(
    () => buildPass491NeuralConfidenceTopology(locale, mode, visibleEvidence),
    [locale, mode, visibleEvidence],
  );
  const decisionBrief = useMemo(
    () =>
      buildPass497NeuralDecisionBrief(
        locale,
        mode,
        confidenceTopology,
        evidenceReasoning,
      ),
    [confidenceTopology, evidenceReasoning, locale, mode],
  );
  const attentionDirector = useMemo(
    () =>
      buildPass493NeuralAttentionDirector(
        locale,
        mode,
        motionBudget.tier,
        confidenceTopology,
        evidenceReasoning,
      ),
    [confidenceTopology, evidenceReasoning, locale, mode, motionBudget.tier],
  );
  const sourceDiffTimeline = useMemo(
    () => buildPass506SourceDiffTimeline(locale, visibleEvidence),
    [locale, visibleEvidence],
  );
  const mobileReplay = useMemo(
    () => buildPass508MobileReplay(sourceDiffTimeline.steps),
    [sourceDiffTimeline],
  );
  const confidenceWaterfall = useMemo(
    () =>
      buildPass510NeuralConfidenceWaterfall(
        locale,
        confidenceTopology,
        visibleEvidence,
      ),
    [confidenceTopology, locale, visibleEvidence],
  );
  const contradictionLineage = useMemo(
    () => buildPass520AiContradictionLineage(locale, visibleEvidence),
    [locale, visibleEvidence],
  );
  const lineageRootCause = useMemo(
    () => buildPass525LineageRootCause(contradictionLineage),
    [contradictionLineage],
  );
  const sourceLineage = useMemo(
    () =>
      buildPass534SourceLineage(locale, visibleEvidence, contradictionLineage),
    [contradictionLineage, locale, visibleEvidence],
  );
  const sourceTrustMatrix = useMemo(
    () => buildPass540AiSourceTrustMatrix(locale, sourceLineage),
    [locale, sourceLineage],
  );
  const remediationPlan = useMemo(
    () =>
      buildPass546AiRemediationPlan(
        locale,
        contradictionLineage,
        lineageRootCause,
        sourceTrustMatrix,
      ),
    [contradictionLineage, lineageRootCause, locale, sourceTrustMatrix],
  );
  const modalGestureQa = useMemo(() => getPass522MobileGestureQa("modal"), []);
  const railGestureQa = useMemo(
    () => getPass522MobileGestureQa("horizontal_rail"),
    [],
  );
  const mobileInteractionReplay = useMemo(
    () => buildPass529MobileInteractionReplay([modalGestureQa, railGestureQa]),
    [modalGestureQa, railGestureQa],
  );
  const activeReplayFrame =
    mobileReplay.frames[
      Math.min(activeReplayIndex, Math.max(0, mobileReplay.frames.length - 1))
    ] ?? null;
  const activeLineageNode =
    contradictionLineage.nodes.find(
      (node) => node.id === activeLineageNodeId,
    ) ??
    contradictionLineage.nodes[0] ??
    null;
  const activeSourceLineage = activeLineageNode
    ? (sourceLineage.records.find(
        (record) => record.nodeId === activeLineageNode.id,
      ) ?? null)
    : null;
  const activeSourceTrust = activeSourceLineage
    ? (sourceTrustMatrix.entries.find(
        (entry) => entry.sourceId === activeSourceLineage.sourceId,
      ) ?? null)
    : null;
  const activeLineageEdges = activeLineageNode
    ? contradictionLineage.edges.filter(
        (edge) =>
          edge.from === activeLineageNode.id ||
          edge.to === activeLineageNode.id,
      )
    : [];
  const tierDurationMs =
    mode === "advanced" ? 7_200 : mode === "pro" ? 4_600 : 2_600;
  const duration = effectiveReducedMotion ? 1 : tierDurationMs;

  useEffect(() => {
    if (activeTopologyNodeId !== resolvedTopologyNodeId) {
      setActiveTopologyNodeId(resolvedTopologyNodeId);
    }
  }, [activeTopologyNodeId, resolvedTopologyNodeId]);

  useEffect(() => {
    previousNeuralFingerprintRef.current = neuralFingerprint;
    previousTopologyNodeRef.current = resolvedTopologyNodeId;
  }, [neuralFingerprint, resolvedTopologyNodeId]);

  useDialogFocusBoundary(true, dialogRef, {
    onClose,
    initialFocus: closeButtonRef,
    closeOnOutsidePointerDown: false,
  });

  useEffect(() => {
    if (lineageRootCause.rootNodeId)
      setActiveLineageNodeId(lineageRootCause.rootNodeId);
  }, [lineageRootCause.rootNodeId]);

  useEffect(() => {
    setActiveAxisId(attentionDirector.focusAxisId);
  }, [attentionDirector.focusAxisId]);

  useEffect(() => {
    setActiveReplayIndex(0);
    setElapsed(0);
    setComplete(false);
    if (completionTimeoutRef.current !== null) {
      window.clearTimeout(completionTimeoutRef.current);
      completionTimeoutRef.current = null;
    }
  }, [symbol, name, mode, sourceDiffTimeline.steps.length]);

  useEffect(() => {
    const started = performance.now();
    let completed = false;
    const finish = () => {
      if (completed) return;
      completed = true;
      if (completionTimeoutRef.current !== null) {
        window.clearTimeout(completionTimeoutRef.current);
      }
      completionTimeoutRef.current = window.setTimeout(
        () => setComplete(true),
        effectiveReducedMotion ? 0 : 260,
      );
    };
    const timer = window.setInterval(
      () => {
        const next = performance.now() - started;
        setElapsed(Math.min(duration, next));
        if (next >= duration) {
          window.clearInterval(timer);
          finish();
        }
      },
      motionBudget.targetFps >= 45 ? 64 : 96,
    );
    return () => {
      window.clearInterval(timer);
      if (completionTimeoutRef.current !== null) {
        window.clearTimeout(completionTimeoutRef.current);
        completionTimeoutRef.current = null;
      }
    };
  }, [duration, motionBudget.targetFps, effectiveReducedMotion, symbol, name, mode]);

  const progress = Math.min(100, Math.round((elapsed / duration) * 100));
  const activeStage = Math.min(
    c.stages.length - 1,
    Math.floor((progress / 100) * c.stages.length),
  );
  const remaining = Math.max(0, Math.ceil((duration - elapsed) / 1000));
  const activeAttentionStep = resolvePass493AttentionStep(
    attentionDirector,
    progress,
  );
  const activeAxis =
    confidenceTopology.axes.find((axis) => axis.id === activeAxisId) ??
    confidenceTopology.dominantLimiter;
  const activeReasoningLane = activeReasoningLaneId
    ? (evidenceReasoning.lanes.find(
        (lane) => lane.id === activeReasoningLaneId,
      ) ?? null)
    : null;
  const spotlightEvidenceIds = activeReasoningLane?.evidenceIds ?? [];
  const auditSummary = useMemo(() => {
    const verified = visibleEvidence.filter(
      (item) => item.status === "verified",
    ).length;
    const review = visibleEvidence.filter(
      (item) => item.status === "review",
    ).length;
    const missing = visibleEvidence.filter(
      (item) => item.status === "missing",
    ).length;
    const coverage = visibleEvidence.length
      ? Math.round(((verified + review * 0.55) / visibleEvidence.length) * 100)
      : 0;
    const coverageItem = visibleEvidence.find((item) => item.id === "coverage");
    const confidence = String(confidencePropagation.finalConfidence);
    const calibratedCoverage =
      coverageItem?.value.match(/\d+/)?.[0] ?? String(coverage);
    return {
      verified,
      review,
      missing,
      coverage: calibratedCoverage,
      confidence,
    };
  }, [confidencePropagation.finalConfidence, visibleEvidence]);

  return (
    <div
      ref={dialogRef}
      data-modal-scroll-region="true"
      className={`velmere-neural-audit-root ${contained ? "relative h-full min-h-[34rem] max-h-full rounded-[1.75rem]" : "fixed inset-0 h-[100dvh]"} overflow-y-auto overscroll-contain bg-[#020708]/[0.97] text-white touch-pan-y data-[pass496-blur=true]:backdrop-blur-2xl`}
      data-contained={contained ? "true" : "false"}
      data-pass1983-contained-vlm={contained ? "inside-asset-popup" : "fullscreen"}
      data-pass1987-contained-vlm={contained ? "modal-bounded-no-duplicate-overscroll" : "fullscreen"}
      data-pass496-blur={runtimeGovernor.blur ? "true" : "false"}
      data-pass447-neural-scroll-lock="true"
      data-pass450-tiered-human-field="true"
      data-pass485-evidence-reasoning="true"
      data-pass489-motion-budget={motionBudget.tier}
      data-pass491-confidence-topology="true"
      data-pass493-neural-attention="true"
      data-pass496-runtime-surface={runtimeGovernor.reason}
      data-pass497-neural-decision-brief="true"
      data-pass506-source-diff-timeline="true"
      data-pass508-mobile-replay="true"
      data-pass510-confidence-waterfall="true"
      data-pass514-motion-orchestrator={
        interactionMotion.enabled ? "active" : "still"
      }
      data-pass515-mobile-command-rail="true"
      data-pass520-contradiction-lineage={
        contradictionLineage.contradictionCount
      }
      data-pass522-mobile-gesture-qa={modalGestureQa.status}
      data-pass525-lineage-root-cause={lineageRootCause.severity}
      data-pass534-source-lineage={sourceLineage.timestampCoverage}
      data-pass540-ai-source-trust={`${sourceTrustMatrix.state}:${sourceTrustMatrix.weightedScore}`}
      data-pass546-ai-remediation-plan={`${remediationPlan.state}:${remediationPlan.steps.length}`}
      data-pass542-motion-control={pass542MotionControl.mode}
      data-pass527-frame-budget={adaptiveFrameBudget.state}
      data-pass529-mobile-interaction-replay={mobileInteractionReplay.status}
      data-pass529-interaction-contract={`${mobileInteractionReplay.targetFloorPx}px:${mobileInteractionReplay.steps.length}`}
      data-pass562-neural-presentation="sealed-source-first"
      data-pass602-neural-evidence-topology={neuralTopology.nodes.length}
      data-pass603-progressive-lobe-rendering={lobeRenderingPlan.renderer}
      data-pass604-confidence-propagation={confidencePropagation.finalConfidence}
      data-pass605-brain-interaction-contract="dialog-focus-trap"
      data-pass606-evidence-driven-neural-motion={neuralMotionPlan.mode}
      style={{
        ...pass628LayerStyle("nestedModal"),
        touchAction: contained ? "pan-y" : modalGestureQa.touchAction,
        overscrollBehavior: modalGestureQa.overscroll,
      }}
      data-velmere-overlay-layer={contained ? "contained-nested-modal" : "nested-modal"}
      role="dialog"
      aria-modal={contained ? "false" : "true"}
      aria-labelledby="vlm-neural-audit-title"
    >
      <div data-motion-ambient="true" className={`pointer-events-none ${contained ? "absolute" : "fixed"} inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(0,148,255,0.16),transparent_31%),linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] bg-[size:auto,48px_48px,48px_48px]`} />
      <header className="velmere-neural-audit-header sticky top-0 z-20 flex items-center justify-between border-b border-white/[0.08] bg-[#020708]/[0.88] px-5 py-4 backdrop-blur-xl md:px-8">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-cyan-200">
            {c.title} · {mode}
          </p>
          <h2 id="vlm-neural-audit-title" className="mt-1 text-lg font-semibold">
            {symbol} · {name}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 place-items-center rounded-full border border-white/[0.12] bg-white/[0.04] text-white/[0.68]"
            aria-label={c.close}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {!complete ? (
          <motion.main
            key="collect"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.04, filter: "blur(14px)" }}
            transition={{
              duration: interactionMotion.duration,
              ease: interactionMotion.easing,
            }}
            className={`relative mx-auto flex ${contained ? "min-h-[34rem]" : "min-h-[calc(100dvh-78px)]"} max-w-7xl flex-col items-center justify-center px-4 py-5 sm:px-5 sm:py-8`}
          >
            <NeuralScene
              symbol={symbol}
              mode={mode}
              progress={progress}
              topology={neuralTopology}
              activePath={activeNeuralPath}
              renderingPlan={lobeRenderingPlan}
              motionPlan={neuralMotionPlan}
            />
            <div className="relative mt-3 w-full px-1">
              <NeuralTopologyDock
                topology={neuralTopology}
                activePath={activeNeuralPath}
                interaction={brainInteraction}
                activeNodeId={resolvedTopologyNodeId}
                onActiveNodeChange={setActiveTopologyNodeId}
                onClose={onClose}
                labels={{
                  topology: c.neuralTopology,
                  activeLineage: c.activeLineage,
                  sourceBoundary: c.sourceBoundary,
                  instructions: c.topologyInstructions,
                  sources: c.sourcesLabel,
                  conflicts: c.contradictions,
                  fields: c.evidence,
                }}
              />
            </div>
            <div className="relative -mt-8 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-100/[0.78]">
                {progress < 88 ? c.collecting : c.resolving}
              </p>
              <p className="mt-3 text-sm text-white/[0.46]">
                {visibleEvidence.length} {c.evidence} · {c.sourceBound}
              </p>
              <p className="mx-auto mt-3 max-w-2xl text-xs leading-6 text-white/[0.38]">
                {depthManifest.purpose}
              </p>
            </div>
            <div className="relative mt-7 flex items-center gap-3 rounded-full border border-cyan-200/[0.13] bg-cyan-300/[0.045] px-4 py-2 font-mono text-[9px] uppercase tracking-[0.15em] text-cyan-100/[0.72]">
              {c.remaining}: {remaining} {c.seconds}
            </div>
            <div className="relative mt-4 grid w-full max-w-3xl gap-2 sm:grid-cols-4">
              {c.stages.map((stage, index) => (
                <span
                  key={stage}
                  className={`rounded-2xl border px-3 py-2 text-center font-mono text-[8px] uppercase tracking-[0.13em] transition ${index <= activeStage ? "border-cyan-200/[0.30] bg-cyan-300/[0.08] text-cyan-100" : "border-white/[0.08] bg-white/[0.025] text-white/[0.32]"}`}
                >
                  {String(index + 1).padStart(2, "0")} · {stage}
                </span>
              ))}
            </div>
            <motion.div
              key={activeAttentionStep.id}
              initial={{ opacity: 0, y: effectiveReducedMotion ? 0 : 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative mt-3 w-full max-w-3xl rounded-[1.25rem] border border-cyan-200/[0.14] bg-cyan-300/[0.045] px-4 py-3 text-left"
              data-pass493-progressive-attention={activeAttentionStep.id}
              aria-live="polite"
            >
              <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-cyan-100/[0.56]">
                {c.attention} · {activeAttentionStep.label}
              </p>
              <strong className="mt-1.5 block text-xs leading-5 text-white/[0.76]">
                {activeAttentionStep.headline}
              </strong>
            </motion.div>
          </motion.main>
        ) : (
          <motion.main
            key="field"
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: interactionMotion.duration,
              ease: interactionMotion.easing,
            }}
            className="relative mx-auto max-w-7xl px-5 py-8 md:px-8"
          >
            <div className="mb-7 flex flex-col gap-4 border-b border-cyan-200/[0.13] pb-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-cyan-200">
                  {c.complete}
                </p>
                <h3 className="mt-2 font-serif text-4xl tracking-[-0.045em] md:text-6xl">
                  {symbol} · {c.complete}
                </h3>
              </div>
              <p className="max-w-xl text-sm leading-7 text-white/[0.48]">
                {depthManifest.purpose} {c.sourceBound}.{" "}
                {visibleEvidence.length} {c.evidence}.
              </p>
            </div>

            <section
              className="mb-5 overflow-hidden rounded-[1.35rem] border border-cyan-200/[0.13] bg-[linear-gradient(135deg,rgba(61,210,255,0.075),transparent_48%),rgba(0,0,0,0.26)]"
              data-pass604-confidence-propagation={confidencePropagation.limitingState}
            >
              <div className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_9rem] sm:items-center">
                <div>
                  <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-cyan-100/[0.60]">
                    {c.sourceBoundConfidence}
                  </span>
                  <p className="mt-2 text-xs leading-6 text-white/[0.48]">
                    {confidencePropagation.publicBoundary}
                  </p>
                </div>
                <div className="rounded-xl border border-white/[0.09] bg-black/[0.24] p-3 text-center">
                  <strong className="block font-mono text-3xl text-white">
                    {confidencePropagation.finalConfidence}%
                  </strong>
                  <span className="mt-1 block font-mono text-[7px] uppercase tracking-[0.11em] text-white/[0.34]">
                    {c.confidence}
                  </span>
                </div>
              </div>
              <div className="grid gap-px bg-white/[0.06] grid-cols-2 lg:grid-cols-4">
                {[
                  [c.facts, confidencePropagation.facts, "text-emerald-200/[0.72]"],
                  [c.hypotheses, confidencePropagation.hypotheses, "text-amber-200/[0.72]"],
                  [c.contradictions, confidencePropagation.conflicts, "text-rose-200/[0.72]"],
                  [c.missing, confidencePropagation.missingSources, "text-white/[0.58]"],
                ].map(([label, value, tone]) => (
                  <div key={String(label)} className="bg-[#03090a]/[0.95] p-3 text-center">
                    <strong className={`block font-mono text-lg ${tone}`}>{value}</strong>
                    <span className="mt-1 block font-mono text-[7px] uppercase tracking-[0.11em] text-white/[0.30]">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <div className="mb-5">
              <NeuralTopologyDock
                topology={neuralTopology}
                activePath={activeNeuralPath}
                interaction={brainInteraction}
                activeNodeId={resolvedTopologyNodeId}
                onActiveNodeChange={setActiveTopologyNodeId}
                onClose={onClose}
                labels={{
                  topology: c.neuralTopology,
                  activeLineage: c.activeLineage,
                  sourceBoundary: c.sourceBoundary,
                  instructions: c.topologyInstructions,
                  sources: c.sourcesLabel,
                  conflicts: c.contradictions,
                  fields: c.evidence,
                }}
              />
            </div>

            <div
              className="mb-5 grid gap-3 lg:grid-cols-3"
              data-pass484-analysis-depth-manifest="true"
            >
              <div className="rounded-[1.2rem] border border-cyan-200/[0.12] bg-cyan-300/[0.035] p-4">
                <span className="font-mono text-[8px] uppercase tracking-[0.15em] text-cyan-100/[0.50]">
                  {mode} · {depthManifest.fieldBudget} fields
                </span>
                <p className="mt-2 text-xs leading-6 text-white/[0.50]">
                  {depthManifest.purpose}
                </p>
              </div>
              <div className="rounded-[1.2rem] border border-white/[0.08] bg-white/[0.025] p-4">
                <span className="font-mono text-[8px] uppercase tracking-[0.15em] text-white/[0.34]">
                  Includes
                </span>
                <p className="mt-2 text-xs leading-6 text-white/[0.50]">
                  {depthManifest.includes.join(" · ")}
                </p>
              </div>
              <div className="rounded-[1.2rem] border border-amber-200/[0.10] bg-amber-300/[0.025] p-4">
                <span className="font-mono text-[8px] uppercase tracking-[0.15em] text-amber-100/[0.46]">
                  Boundary
                </span>
                <p className="mt-2 text-xs leading-6 text-white/[0.50]">
                  {depthManifest.excludes.join(" · ")}.{" "}
                  {depthManifest.confidenceRule}
                </p>
              </div>
            </div>

            <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                [
                  c.confidence,
                  auditSummary.confidence === "—"
                    ? "—"
                    : `${auditSummary.confidence}%`,
                ],
                [c.coverage, `${auditSummary.coverage}%`],
                [c.verified, String(auditSummary.verified)],
                [
                  `${c.review} / ${c.missing}`,
                  `${auditSummary.review} / ${auditSummary.missing}`,
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-[1.2rem] border border-white/[0.08] bg-white/[0.025] p-4"
                >
                  <span className="font-mono text-[8px] uppercase tracking-[0.15em] text-white/[0.34]">
                    {label}
                  </span>
                  <strong className="mt-2 block text-xl text-white/[0.88]">
                    {value}
                  </strong>
                </div>
              ))}
            </div>

            <nav
              className="sticky top-[4.85rem] z-10 -mx-1 mb-5 flex gap-2 overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#031012]/[0.94] p-2 shadow-[0_16px_44px_rgba(0,0,0,0.28)] backdrop-blur-xl md:hidden"
              style={{
                touchAction: railGestureQa.touchAction,
                overscrollBehavior: railGestureQa.overscroll,
              }}
              aria-label="Neural audit sections"
              data-pass515-mobile-command-rail="decision-confidence-reasoning-evidence"
              data-pass522-rail-gesture={railGestureQa.status}
            >
              {[
                ["neural-decision", c.mobileNav.decision],
                ["neural-confidence", c.mobileNav.confidence],
                ["neural-reasoning", c.mobileNav.reasoning],
                ["neural-evidence", c.mobileNav.evidence],
              ].map(([target, label]) => (
                <button
                  key={target}
                  type="button"
                  onClick={() =>
                    document
                      .getElementById(target)
                      ?.scrollIntoView({
                        behavior: effectiveReducedMotion ? "auto" : "smooth",
                        block: "start",
                      })
                  }
                  className="velmere-focus-ring min-w-max rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-2 font-mono text-[7px] uppercase tracking-[0.11em] text-white/[0.56]"
                >
                  {label}
                </button>
              ))}
            </nav>

            <section
              id="neural-decision"
              className="scroll-mt-32 mb-5 overflow-hidden rounded-[1.65rem] border border-cyan-200/[0.14] bg-[linear-gradient(135deg,rgba(79,214,255,0.085),transparent_42%),rgba(0,0,0,0.32)]"
              data-pass497-decision-brief="fact-limiter-next-test"
            >
              <div className="grid gap-5 border-b border-white/[0.08] p-5 lg:grid-cols-[minmax(0,1fr)_10rem] lg:items-center">
                <div>
                  <p className="font-mono text-[8px] uppercase tracking-[0.17em] text-cyan-100/[0.62]">
                    {decisionBrief.label} · {decisionBrief.modeLabel}
                  </p>
                  <h4 className="mt-2 max-w-4xl text-xl font-semibold leading-8 text-white/[0.90]">
                    {decisionBrief.headline}
                  </h4>
                </div>
                <div className="rounded-[1.2rem] border border-white/[0.10] bg-black/[0.24] p-4 text-center">
                  <strong className="block font-mono text-3xl text-white">
                    {decisionBrief.confidence}%
                  </strong>
                  <span className="mt-1 block font-mono text-[7px] uppercase tracking-[0.12em] text-white/[0.34]">
                    {c.confidence}
                  </span>
                </div>
              </div>
              <div className="grid gap-px bg-white/[0.06] lg:grid-cols-3">
                {[
                  [
                    c.strongestFact,
                    decisionBrief.strongestFact,
                    "text-emerald-200/[0.76]",
                  ],
                  [
                    c.limitingFactor,
                    decisionBrief.limitingFactor,
                    "text-amber-200/[0.76]",
                  ],
                  [
                    c.nextVerification,
                    decisionBrief.nextVerification,
                    "text-cyan-200/[0.76]",
                  ],
                ].map(([label, value, tone]) => (
                  <div key={label} className="bg-[#03090a]/[0.97] p-5">
                    <p
                      className={`font-mono text-[8px] uppercase tracking-[0.14em] ${tone}`}
                    >
                      {label}
                    </p>
                    <p className="mt-3 text-sm leading-7 text-white/[0.58]">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/[0.08] px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/[0.38]">
                    {c.confidenceDrag}
                  </p>
                  <span className="font-mono text-[8px] text-white/[0.30]">
                    −{decisionBrief.confidenceGap} pts
                  </span>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-5">
                  {decisionBrief.axisImpact.map((axis) => (
                    <button
                      key={axis.id}
                      type="button"
                      onClick={() =>
                        setActiveAxisId(axis.id as Pass491ConfidenceAxisId)
                      }
                      className="velmere-focus-ring rounded-xl border border-white/[0.08] bg-white/[0.025] p-3 text-left transition hover:bg-white/[0.05]"
                    >
                      <span className="block truncate font-mono text-[7px] uppercase tracking-[0.11em] text-white/[0.38]">
                        {axis.label}
                      </span>
                      <strong className="mt-2 block font-mono text-sm text-white/[0.76]">
                        −{axis.penalty}
                      </strong>
                    </button>
                  ))}
                </div>
              </div>
              <div
                className="border-t border-white/[0.08] px-5 py-5"
                data-pass510-neural-confidence-waterfall={
                  confidenceWaterfall.final
                }
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-cyan-100/[0.56]">
                      {confidenceWaterfall.headline}
                    </p>
                    <p className="mt-2 text-xs leading-6 text-white/[0.44]">
                      {confidenceWaterfall.contradiction}
                    </p>
                  </div>
                  <span className="font-mono text-[8px] uppercase tracking-[0.11em] text-white/[0.34]">
                    100 → {confidenceWaterfall.final}
                  </span>
                </div>
                <div className="mt-4 grid gap-2 md:grid-cols-5">
                  {confidenceWaterfall.steps.map((step, index) => (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() =>
                        setActiveAxisId(step.id as Pass491ConfidenceAxisId)
                      }
                      className={`velmere-focus-ring rounded-xl border p-3 text-left transition ${activeAxisId === step.id ? "border-cyan-200/[0.30] bg-cyan-300/[0.07]" : "border-white/[0.08] bg-black/[0.18] hover:bg-white/[0.04]"}`}
                    >
                      <span className="block font-mono text-[7px] uppercase tracking-[0.11em] text-white/[0.34]">
                        {String(index + 1).padStart(2, "0")} · {step.label}
                      </span>
                      <div className="mt-2 flex items-end justify-between gap-2">
                        <strong
                          className={
                            step.tone === "blocking"
                              ? "font-mono text-lg text-rose-200"
                              : step.tone === "review"
                                ? "font-mono text-lg text-amber-200"
                                : "font-mono text-lg text-emerald-200"
                          }
                        >
                          −{step.penalty}
                        </strong>
                        <span className="font-mono text-[7px] text-white/[0.28]">
                          → {step.cumulative}
                        </span>
                      </div>
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                        <span
                          className="block h-full rounded-full bg-cyan-200/[0.58]"
                          style={{ width: `${step.score}%` }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-[10px] leading-5 text-white/[0.30]">
                  {confidenceWaterfall.boundary}
                </p>
              </div>
            </section>

            <section
              id="neural-confidence"
              className="scroll-mt-32 mb-5 overflow-hidden rounded-[1.6rem] border border-cyan-200/[0.13] bg-[radial-gradient(circle_at_12%_0%,rgba(84,210,255,0.11),transparent_38%),rgba(0,0,0,0.30)]"
              data-pass491-confidence-topology="weakest-axis-caps-confidence"
            >
              <div className="grid gap-5 border-b border-white/[0.08] p-5 lg:grid-cols-[11rem_minmax(0,1fr)] lg:items-center">
                <div
                  className="mx-auto grid h-36 w-36 place-items-center rounded-full border border-white/[0.10] p-2"
                  style={{
                    background: `conic-gradient(${paletteByMode[mode].css} ${confidencePropagation.finalConfidence * 3.6}deg, rgba(255,255,255,.055) 0deg)`,
                  }}
                >
                  <div className="grid h-full w-full place-items-center rounded-full bg-[#02090a] text-center">
                    <div>
                      <strong className="block font-mono text-3xl text-white">
                        {confidencePropagation.finalConfidence}%
                      </strong>
                      <span className="mt-1 block font-mono text-[7px] uppercase tracking-[0.13em] text-white/[0.36]">
                        {c.confidence}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-cyan-100/[0.58]">
                    {c.sourceBoundConfidence} · {confidencePropagation.limitingState}
                  </p>
                  <h4 className="mt-2 text-lg font-semibold text-white/[0.88]">
                    {confidenceTopology.dominantLimiter.label}
                  </h4>
                  <p className="mt-2 max-w-3xl text-xs leading-6 text-white/[0.45]">
                    {confidenceTopology.dominantLimiter.detail}
                  </p>
                </div>
              </div>
              <div
                className="grid gap-px bg-white/[0.06] md:grid-cols-5"
                role="listbox"
                aria-label={c.weakestAxis}
              >
                {confidenceTopology.axes.map((axis, index) => (
                  <motion.button
                    key={axis.id}
                    type="button"
                    initial={{ opacity: 0, y: effectiveReducedMotion ? 0 : 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: effectiveReducedMotion ? 0 : 0.06 + index * 0.05,
                    }}
                    onClick={() => setActiveAxisId(axis.id)}
                    onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
                      if (
                        ![
                          "ArrowLeft",
                          "ArrowRight",
                          "ArrowUp",
                          "ArrowDown",
                        ].includes(event.key)
                      )
                        return;
                      event.preventDefault();
                      const ordered = attentionDirector.axisOrder;
                      const current = Math.max(0, ordered.indexOf(axis.id));
                      const delta =
                        event.key === "ArrowLeft" || event.key === "ArrowUp"
                          ? -1
                          : 1;
                      setActiveAxisId(
                        ordered[
                          (current + delta + ordered.length) % ordered.length
                        ],
                      );
                    }}
                    aria-selected={activeAxis.id === axis.id}
                    className={`velmere-focus-ring bg-[#03090a]/[0.97] p-4 text-left transition ${activeAxis.id === axis.id ? "relative z-10 bg-cyan-300/[0.07] ring-1 ring-inset ring-cyan-200/[0.34]" : "hover:bg-white/[0.035]"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[7px] uppercase tracking-[0.12em] text-white/[0.38]">
                        {axis.label}
                      </span>
                      <strong className="font-mono text-xs text-white/[0.76]">
                        {axis.score}%
                      </strong>
                    </div>
                    <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.07]">
                      <motion.span
                        className="block h-full rounded-full bg-cyan-200/[0.64]"
                        initial={{ width: 0 }}
                        animate={{ width: `${axis.score}%` }}
                        transition={{
                          duration: effectiveReducedMotion ? 0 : 0.55,
                          delay: effectiveReducedMotion ? 0 : 0.1 + index * 0.04,
                        }}
                      />
                    </div>
                    <p className="mt-3 text-[10px] leading-5 text-white/[0.34]">
                      {axis.detail}
                    </p>
                  </motion.button>
                ))}
              </div>
              <div
                className="grid gap-3 border-t border-white/[0.08] px-5 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
                data-pass493-focused-confidence-axis={activeAxis.id}
              >
                <div>
                  <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-cyan-100/[0.52]">
                    {c.weakestAxis} · {activeAxis.label} · {activeAxis.score}%
                  </p>
                  <p className="mt-2 text-[11px] leading-6 text-white/[0.40]">
                    {activeAxis.detail} {attentionDirector.operatorRead}
                  </p>
                </div>
                <span className="font-mono text-[7px] uppercase tracking-[0.11em] text-white/[0.28]">
                  {attentionDirector.interactionHint}
                </span>
              </div>
              <p className="border-t border-white/[0.08] px-5 py-4 text-[11px] leading-6 text-white/[0.34]">
                {confidenceTopology.boundary}
              </p>
            </section>

            <section
              id="neural-reasoning"
              className="scroll-mt-32 mb-5 overflow-hidden rounded-[1.6rem] border border-cyan-200/[0.12] bg-[radial-gradient(circle_at_10%_0%,rgba(98,217,255,0.09),transparent_34%),rgba(0,0,0,0.28)]"
              data-pass485-reasoning-cockpit="fact-tension-unknown-probe"
            >
              <div className="flex flex-col gap-3 border-b border-white/[0.08] px-5 py-5 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.16em] text-cyan-100/[0.58]">
                    <BrainCircuit className="h-3.5 w-3.5" />
                    {evidenceReasoning.headline}
                  </p>
                  <p className="mt-2 max-w-3xl text-sm leading-7 text-white/[0.58]">
                    {evidenceReasoning.summary}
                  </p>
                </div>
                <span className="rounded-full border border-cyan-200/[0.13] bg-cyan-300/[0.04] px-3 py-1.5 font-mono text-[8px] uppercase tracking-[0.12em] text-cyan-100/[0.62]">
                  {evidenceReasoning.confidence === null
                    ? "—"
                    : `${evidenceReasoning.confidence}%`}{" "}
                  · {evidenceReasoning.coverage}%
                </span>
              </div>
              <div className="grid gap-px bg-white/[0.06] md:grid-cols-2 xl:grid-cols-4">
                {evidenceReasoning.lanes.map((lane, index) => {
                  const Icon =
                    lane.id === "supported"
                      ? ShieldCheck
                      : lane.id === "next_probe"
                        ? ScanLine
                        : lane.id === "unknown"
                          ? CircleAlert
                          : Sparkles;
                  return (
                    <motion.button
                      key={lane.id}
                      type="button"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: effectiveReducedMotion ? 0 : 0.08 + index * 0.07,
                      }}
                      onClick={() =>
                        setActiveReasoningLaneId((current) =>
                          current === lane.id ? null : lane.id,
                        )
                      }
                      aria-pressed={activeReasoningLaneId === lane.id}
                      className={`velmere-focus-ring bg-[#03090a]/[0.96] p-5 text-left transition ${activeReasoningLaneId === lane.id ? "relative z-10 bg-cyan-300/[0.07] ring-1 ring-inset ring-cyan-200/[0.34]" : "hover:bg-white/[0.035]"}`}
                      data-pass485-reasoning-lane={lane.id}
                    >
                      <div className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.15em] text-white/[0.38]">
                        <Icon className="h-3.5 w-3.5 text-cyan-100/[0.58]" />
                        {lane.label}
                      </div>
                      <strong className="mt-3 block text-sm leading-6 text-white/[0.82]">
                        {lane.headline}
                      </strong>
                      <p className="mt-2 text-xs leading-6 text-white/[0.42]">
                        {lane.detail}
                      </p>
                    </motion.button>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] px-5 py-3">
                <p className="text-[11px] leading-6 text-white/[0.34]">
                  {evidenceReasoning.boundary}
                </p>
                {activeReasoningLaneId ? (
                  <button
                    type="button"
                    onClick={() => setActiveReasoningLaneId(null)}
                    className="velmere-focus-ring rounded-full border border-white/[0.10] px-3 py-1.5 font-mono text-[7px] uppercase tracking-[0.11em] text-white/[0.46] hover:bg-white/[0.05]"
                  >
                    {c.showAll}
                  </button>
                ) : null}
              </div>
            </section>

            <section
              className="mb-5 overflow-hidden rounded-[1.6rem] border border-white/[0.09] bg-[linear-gradient(120deg,rgba(255,255,255,.035),rgba(98,217,255,.035),rgba(255,255,255,.02))]"
              data-pass506-source-diff-timeline={
                sourceDiffTimeline.steps.length
              }
              data-pass508-mobile-replay={activeReplayFrame?.id ?? "empty"}
            >
              <div className="flex flex-col gap-3 border-b border-white/[0.08] px-5 py-5 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-cyan-100/[0.58]">
                    {c.timeline}
                  </p>
                  <h4 className="mt-2 text-lg font-semibold text-white/[0.88]">
                    {sourceDiffTimeline.headline}
                  </h4>
                  <p className="mt-2 max-w-3xl text-xs leading-6 text-white/[0.42]">
                    {sourceDiffTimeline.boundary}
                  </p>
                </div>
                <div className="flex gap-2 font-mono text-[7px] uppercase tracking-[0.11em]">
                  <span className="rounded-full border border-emerald-200/[0.14] bg-emerald-300/[0.04] px-3 py-1.5 text-emerald-100/[0.62]">
                    {c.verified} {sourceDiffTimeline.supported}
                  </span>
                  <span className="rounded-full border border-amber-200/[0.14] bg-amber-300/[0.04] px-3 py-1.5 text-amber-100/[0.62]">
                    {c.review} {sourceDiffTimeline.limited}
                  </span>
                  <span className="rounded-full border border-rose-200/[0.14] bg-rose-300/[0.04] px-3 py-1.5 text-rose-100/[0.62]">
                    {c.missing} {sourceDiffTimeline.blocked}
                  </span>
                </div>
              </div>
              <div className="relative overflow-x-auto overscroll-x-contain px-4 py-5">
                <div
                  className="absolute left-8 right-8 top-[2.45rem] h-px bg-gradient-to-r from-rose-300/[0.20] via-amber-200/[0.18] to-emerald-200/[0.20]"
                  aria-hidden="true"
                />
                <div className="relative flex min-w-max gap-3">
                  {mobileReplay.frames.map((frame, index) => (
                    <button
                      key={frame.id}
                      type="button"
                      onClick={() => setActiveReplayIndex(index)}
                      aria-pressed={activeReplayIndex === index}
                      className={`velmere-focus-ring w-[13.5rem] rounded-[1.15rem] border p-4 text-left transition ${activeReplayIndex === index ? "border-cyan-200/[0.34] bg-cyan-300/[0.08] shadow-[0_14px_45px_rgba(63,205,255,0.10)]" : "border-white/[0.08] bg-black/[0.30] hover:bg-white/[0.035]"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`grid h-7 w-7 place-items-center rounded-full border font-mono text-[8px] ${frame.state === "verified" ? "border-emerald-200/[0.25] text-emerald-100" : frame.state === "review" ? "border-amber-200/[0.25] text-amber-100" : "border-rose-200/[0.25] text-rose-100"}`}
                        >
                          {String(frame.step).padStart(2, "0")}
                        </span>
                        <span className="font-mono text-[7px] uppercase tracking-[0.11em] text-white/[0.30]">
                          {frame.state}
                        </span>
                      </div>
                      <strong className="mt-3 block text-xs leading-5 text-white/[0.78]">
                        {frame.label}
                      </strong>
                      <p className="mt-2 line-clamp-2 text-[10px] leading-5 text-white/[0.36]">
                        {frame.summary}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
              {activeReplayFrame ? (
                <div className="grid gap-3 border-t border-white/[0.08] px-5 py-4 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
                  <button
                    type="button"
                    onClick={() =>
                      setActiveReplayIndex(
                        (current) =>
                          (current - 1 + mobileReplay.frames.length) %
                          mobileReplay.frames.length,
                      )
                    }
                    className="velmere-focus-ring rounded-full border border-white/[0.10] px-3 py-2 font-mono text-[7px] uppercase tracking-[0.11em] text-white/[0.48] hover:bg-white/[0.05]"
                    aria-label={c.previousStep}
                  >
                    ←
                  </button>
                  <div>
                    <p className="font-mono text-[7px] uppercase tracking-[0.12em] text-cyan-100/[0.48]">
                      {c.replay} · {activeReplayFrame.step}/
                      {mobileReplay.frames.length}
                    </p>
                    <p className="mt-1 text-xs leading-6 text-white/[0.50]">
                      {activeReplayFrame.summary}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveReplayIndex(
                        (current) => (current + 1) % mobileReplay.frames.length,
                      )
                    }
                    className="velmere-focus-ring rounded-full border border-white/[0.10] px-3 py-2 font-mono text-[7px] uppercase tracking-[0.11em] text-white/[0.48] hover:bg-white/[0.05]"
                    aria-label={c.nextStep}
                  >
                    →
                  </button>
                </div>
              ) : null}
            </section>

            <section
              id="neural-lineage"
              className="scroll-mt-32 mb-5 overflow-hidden rounded-[1.6rem] border border-violet-200/[0.12] bg-[radial-gradient(circle_at_12%_0%,rgba(177,108,255,.10),transparent_34%),rgba(0,0,0,.30)]"
              data-pass520-ai-contradiction-lineage={`${contradictionLineage.contradictionCount}:${contradictionLineage.limiterCount}`}
              data-pass534-source-lineage={`${sourceLineage.sourceCount}:${sourceLineage.timestampCoverage}`}
            >
              <div className="flex flex-col gap-3 border-b border-white/[0.08] px-5 py-5 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-violet-100/[0.62]">
                    {c.lineage}
                  </p>
                  <h4 className="mt-2 text-lg font-semibold text-white/[0.88]">
                    {contradictionLineage.headline}
                  </h4>
                  <p className="mt-2 max-w-3xl text-xs leading-6 text-white/[0.42]">
                    {contradictionLineage.boundary}
                  </p>
                </div>
                <div className="flex gap-2 font-mono text-[7px] uppercase tracking-[0.11em]">
                  <span className="rounded-full border border-rose-200/[0.16] bg-rose-300/[0.04] px-3 py-1.5 text-rose-100/[0.68]">
                    {contradictionLineage.contradictionCount} {c.contradictions}
                  </span>
                  <span className="rounded-full border border-amber-200/[0.16] bg-amber-300/[0.04] px-3 py-1.5 text-amber-100/[0.68]">
                    {contradictionLineage.limiterCount} {c.limiters}
                  </span>
                  <span className="rounded-full border border-cyan-200/[0.16] bg-cyan-300/[0.04] px-3 py-1.5 text-cyan-100/[0.68]">
                    {sourceLineage.sourceCount}{" "}
                    {locale === "pl"
                      ? "źródła"
                      : locale === "de"
                        ? "Quellen"
                        : "sources"}
                  </span>
                  <span className="rounded-full border border-white/[0.10] px-3 py-1.5 text-white/[0.46]">
                    {sourceLineage.timestampCoverage}%{" "}
                    {locale === "pl"
                      ? "timestampów"
                      : locale === "de"
                        ? "Zeitstempel"
                        : "timestamps"}
                  </span>
                  <span
                    className={`rounded-full border px-3 py-1.5 ${sourceTrustMatrix.state === "trusted" ? "border-emerald-200/[0.16] text-emerald-100/[0.68]" : sourceTrustMatrix.state === "limited" || sourceTrustMatrix.state === "unlinked" ? "border-rose-200/[0.16] text-rose-100/[0.68]" : "border-amber-200/[0.16] text-amber-100/[0.68]"}`}
                    title={sourceTrustMatrix.boundary}
                  >
                    trust {sourceTrustMatrix.weightedScore}%
                  </span>
                </div>
              </div>
              <div className="grid gap-px bg-white/[0.06] lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,.65fr)]">
                <div className="grid gap-2 bg-[#03090a]/[0.97] p-4 sm:grid-cols-2 xl:grid-cols-3">
                  {contradictionLineage.nodes.slice(0, 12).map((node) => (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => setActiveLineageNodeId(node.id)}
                      aria-pressed={activeLineageNode?.id === node.id}
                      className={`velmere-focus-ring min-h-11 rounded-[1rem] border p-3 text-left transition ${activeLineageNode?.id === node.id ? "border-violet-200/[0.34] bg-violet-300/[0.08]" : "border-white/[0.08] bg-white/[0.025] hover:bg-white/[0.045]"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-mono text-[7px] uppercase tracking-[0.11em] text-white/[0.34]">
                          {node.group}
                        </span>
                        <span
                          className={`h-2 w-2 rounded-full ${node.status === "verified" ? "bg-emerald-300" : node.status === "review" ? "bg-amber-300" : "bg-rose-300"}`}
                        />
                      </div>
                      <strong className="mt-2 block truncate text-xs text-white/[0.76]">
                        {node.label}
                      </strong>
                      <p className="mt-1 line-clamp-2 text-[9px] leading-4 text-white/[0.34]">
                        {node.value}
                      </p>
                    </button>
                  ))}
                </div>
                <aside className="bg-[#07050a]/[0.97] p-5">
                  {activeLineageNode ? (
                    <>
                      <p className="font-mono text-[7px] uppercase tracking-[0.13em] text-violet-100/[0.52]">
                        {activeLineageNode.group} · {activeLineageNode.status}
                      </p>
                      <strong className="mt-2 block text-sm text-white/[0.84]">
                        {activeLineageNode.label}
                      </strong>
                      <p className="mt-2 text-xs leading-6 text-white/[0.46]">
                        {activeLineageNode.value}
                      </p>
                      {activeSourceLineage ? (
                        <div
                          className="mt-4 rounded-xl border border-cyan-200/[0.12] bg-cyan-300/[0.03] px-3 py-3"
                          data-pass534-active-source={
                            activeSourceLineage.freshness
                          }
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-mono text-[7px] uppercase tracking-[0.11em] text-cyan-100/[0.48]">
                              {sourceLineage.headline}
                            </span>
                            <span
                              className={`rounded-full border px-2 py-1 font-mono text-[7px] uppercase tracking-[0.09em] ${activeSourceLineage.freshness === "fresh" ? "border-emerald-200/[0.16] text-emerald-100/[0.66]" : activeSourceLineage.freshness === "stale" ? "border-amber-200/[0.16] text-amber-100/[0.66]" : "border-white/[0.10] text-white/[0.38]"}`}
                            >
                              {activeSourceLineage.freshness}
                            </span>
                          </div>
                          <strong className="mt-2 block break-words text-[10px] text-white/[0.68]">
                            {activeSourceLineage.sourceLabel}
                          </strong>
                          <div className="mt-2 flex flex-wrap gap-2 font-mono text-[7px] uppercase tracking-[0.08em] text-white/[0.30]">
                            <span>{activeSourceLineage.sourceId}</span>
                            <span>
                              {activeSourceLineage.observedAt
                                ? new Date(
                                    activeSourceLineage.observedAt * 1000,
                                  ).toLocaleString(locale)
                                : locale === "pl"
                                  ? "czas nieznany"
                                  : locale === "de"
                                    ? "Zeit unbekannt"
                                    : "time unknown"}
                            </span>
                          </div>
                        </div>
                      ) : null}
                      {activeSourceTrust ? (
                        <div
                          className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-3"
                          data-pass540-active-source-trust={activeSourceTrust.state}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-[7px] uppercase tracking-[0.11em] text-white/[0.42]">
                              {locale === "pl" ? "Macierz zaufania źródła" : locale === "de" ? "Quellen-Vertrauensmatrix" : "Source trust matrix"}
                            </span>
                            <strong className="font-mono text-[9px] text-white/[0.72]">
                              {activeSourceTrust.score}%
                            </strong>
                          </div>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                            <div className="h-full rounded-full bg-[linear-gradient(90deg,#22d3ee,#a78bfa)]" style={{ width: `${activeSourceTrust.score}%` }} />
                          </div>
                          <p className="mt-2 text-[9px] leading-4 text-white/[0.38]">
                            {activeSourceTrust.limiter}
                          </p>
                        </div>
                      ) : null}
                      <div
                        className="mt-4 rounded-xl border border-violet-200/[0.14] bg-violet-300/[0.04] px-3 py-3"
                        data-pass546-remediation-steps={remediationPlan.steps.length}
                        title={remediationPlan.boundary}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[7px] uppercase tracking-[0.11em] text-violet-100/[0.52]">
                            AI remediation plan
                          </span>
                          <span className="rounded-full border border-violet-200/[0.14] px-2 py-1 font-mono text-[7px] uppercase tracking-[0.08em] text-violet-100/[0.56]">
                            {remediationPlan.state}
                          </span>
                        </div>
                        <strong className="mt-2 block text-xs text-white/[0.74]">
                          {remediationPlan.headline}
                        </strong>
                        <div className="mt-3 space-y-2">
                          {remediationPlan.steps.slice(0, 3).map((step) => (
                            <div key={step.id} className="rounded-lg border border-white/[0.07] bg-black/[0.16] px-3 py-2">
                              <span className="font-mono text-[7px] uppercase tracking-[0.09em] text-white/[0.34]">
                                {String(step.rank).padStart(2, "0")} · {step.severity}
                              </span>
                              <strong className="mt-1 block text-[10px] text-white/[0.68]">{step.title}</strong>
                              <p className="mt-1 text-[9px] leading-4 text-white/[0.36]">{step.action}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div
                        className={`mt-4 rounded-xl border px-3 py-3 ${lineageRootCause.severity === "critical" ? "border-rose-200/[0.16] bg-rose-300/[0.04]" : lineageRootCause.severity === "review" ? "border-amber-200/[0.16] bg-amber-300/[0.04]" : "border-emerald-200/[0.16] bg-emerald-300/[0.04]"}`}
                        data-pass525-root-cause={lineageRootCause.severity}
                      >
                        <span className="font-mono text-[7px] uppercase tracking-[0.11em] text-white/[0.42]">
                          root cause · {lineageRootCause.severity}
                        </span>
                        <strong className="mt-1 block text-xs text-white/[0.76]">
                          {lineageRootCause.rootLabel}
                        </strong>
                        <p className="mt-1 text-[9px] leading-4 text-white/[0.36]">
                          {lineageRootCause.explanation}
                        </p>
                        <p className="mt-2 border-t border-white/[0.07] pt-2 text-[9px] leading-4 text-cyan-100/[0.48]">
                          {lineageRootCause.nextVerification}
                        </p>
                      </div>
                      <div className="mt-4 space-y-2">
                        {activeLineageEdges.length ? (
                          activeLineageEdges.map((edge) => (
                            <div
                              key={edge.id}
                              className={`rounded-xl border px-3 py-2 ${edge.relation === "contradicts" ? "border-rose-200/[0.16] bg-rose-300/[0.04]" : edge.relation === "limits" ? "border-amber-200/[0.16] bg-amber-300/[0.04]" : "border-emerald-200/[0.16] bg-emerald-300/[0.04]"}`}
                            >
                              <span className="font-mono text-[7px] uppercase tracking-[0.10em] text-white/[0.44]">
                                {edge.relation} · {edge.from} → {edge.to}
                              </span>
                              <p className="mt-1 text-[9px] leading-4 text-white/[0.34]">
                                {edge.reason}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs leading-6 text-white/[0.38]">
                            {c.lineageEmpty}
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-xs leading-6 text-white/[0.38]">
                      {c.lineageEmpty}
                    </p>
                  )}
                </aside>
              </div>
            </section>

            <div
              id="neural-evidence"
              className="scroll-mt-32 overflow-hidden rounded-[1.5rem] border border-white/[0.09] bg-black/[0.28]"
              data-pass493-evidence-spotlight={activeReasoningLaneId ?? "all"}
            >
              {visibleEvidence.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    delay: effectiveReducedMotion ? 0 : Math.min(index * 0.035, 0.5),
                  }}
                  className={`grid gap-3 border-b border-white/[0.07] px-5 py-4 transition last:border-b-0 md:grid-cols-[3rem_minmax(10rem,.72fr)_minmax(9rem,.55fr)_minmax(0,1.3fr)] md:items-center ${spotlightEvidenceIds.length ? (spotlightEvidenceIds.includes(item.id) ? "bg-cyan-300/[0.06] ring-1 ring-inset ring-cyan-200/[0.16]" : "opacity-[0.38]") : ""}`}
                >
                  <span className="font-mono text-[9px] text-white/[0.28]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <strong className="text-sm text-white/[0.82]">
                    {item.label}
                  </strong>
                  <span className="break-words font-mono text-xs leading-5 text-cyan-100/[0.78]">
                    {String(item.value)}
                  </span>
                  <span className="flex items-start gap-2 text-xs leading-6 text-white/[0.43]">
                    {item.status === "verified" ? (
                      <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-300" />
                    ) : (
                      <CircleAlert
                        className={`mt-1 h-3.5 w-3.5 shrink-0 ${item.status === "missing" ? "text-rose-300" : "text-amber-300"}`}
                      />
                    )}
                    {String(item.note)}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.main>
        )}
      </AnimatePresence>
    </div>
  );
}
