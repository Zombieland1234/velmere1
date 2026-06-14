import type { UnifiedAuditLocale, UnifiedAuditMode } from "./unified-audit";
import type { Pass485EvidenceReasoning } from "./pass485-evidence-reasoning-engine";
import type { Pass491NeuralConfidenceTopology } from "./pass491-neural-confidence-topology";

export type Pass497NeuralDecisionBrief = {
  version: "pass497-neural-decision-brief";
  label: string;
  headline: string;
  strongestFact: string;
  limitingFactor: string;
  nextVerification: string;
  confidence: number;
  confidenceGap: number;
  modeLabel: string;
  axisImpact: Array<{ id: string; label: string; score: number; penalty: number }>;
};

const copy = {
  pl: {
    label: "Decyzja w 20 sekund",
    mode: { basic: "Szybki obraz", pro: "Analiza rozszerzona", advanced: "Pełny audyt" },
    headline: (confidence: number) => confidence >= 75 ? "Wniosek ma mocne podparcie, ale nadal jest zależny od źródeł." : confidence >= 50 ? "Wniosek jest użyteczny warunkowo — najpierw sprawdź główną lukę." : "Nie ma jeszcze podstaw do mocnego wniosku. Najważniejsza jest weryfikacja braków.",
  },
  de: {
    label: "Entscheidung in 20 Sekunden",
    mode: { basic: "Schnellbild", pro: "Erweiterte Analyse", advanced: "Vollständiges Audit" },
    headline: (confidence: number) => confidence >= 75 ? "Die Aussage ist gut gestützt, bleibt aber quellengebunden." : confidence >= 50 ? "Die Aussage ist bedingt nutzbar — zuerst die Hauptlücke prüfen." : "Für eine starke Aussage fehlt noch die Grundlage. Zuerst die Lücken verifizieren.",
  },
  en: {
    label: "Decision in 20 seconds",
    mode: { basic: "Quick view", pro: "Extended analysis", advanced: "Full audit" },
    headline: (confidence: number) => confidence >= 75 ? "The conclusion is well supported but remains source-bound." : confidence >= 50 ? "The conclusion is conditionally useful — verify the main gap first." : "There is not enough support for a strong conclusion yet. Verify the gaps first.",
  },
} as const;

export function buildPass497NeuralDecisionBrief(
  locale: UnifiedAuditLocale,
  mode: UnifiedAuditMode,
  topology: Pass491NeuralConfidenceTopology,
  reasoning: Pass485EvidenceReasoning,
): Pass497NeuralDecisionBrief {
  const c = copy[locale];
  const strongestFact = reasoning.lanes.find((lane) => lane.id === "supported")?.headline ?? "—";
  const nextVerification = reasoning.lanes.find((lane) => lane.id === "next_probe")?.headline ?? "—";
  const axisImpact = topology.axes
    .map((axis) => ({ ...axis, penalty: Math.max(0, 100 - axis.score) }))
    .sort((left, right) => right.penalty - left.penalty);
  return {
    version: "pass497-neural-decision-brief",
    label: c.label,
    headline: c.headline(topology.calibratedConfidence),
    strongestFact,
    limitingFactor: `${topology.dominantLimiter.label}: ${topology.dominantLimiter.detail}`,
    nextVerification,
    confidence: topology.calibratedConfidence,
    confidenceGap: Math.max(0, 100 - topology.calibratedConfidence),
    modeLabel: c.mode[mode],
    axisImpact,
  };
}
