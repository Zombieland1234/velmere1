import type { UnifiedAuditEvidence, UnifiedAuditLocale } from "./unified-audit";
import type { Pass491NeuralConfidenceTopology } from "./pass491-neural-confidence-topology";

export type Pass510WaterfallStep = {
  id: string;
  label: string;
  score: number;
  penalty: number;
  cumulative: number;
  tone: "stable" | "review" | "blocking";
  detail: string;
};

export type Pass510NeuralConfidenceWaterfall = {
  version: "pass510-neural-confidence-waterfall";
  base: 100;
  final: number;
  gap: number;
  steps: Pass510WaterfallStep[];
  headline: string;
  contradiction: string;
  boundary: string;
};

const copy = {
  pl: {
    headline: "Skąd dokładnie bierze się wynik pewności",
    contradiction: (supported: string, limiter: string) => `Najmocniejszy fakt: ${supported}. Główne ograniczenie: ${limiter}.`,
    noSupported: "Brak potwierdzonego faktu o wystarczającej sile.",
    boundary: "Kary rozdzielają wyłącznie rzeczywistą lukę do 100%. Nie są prognozą ceny ani prawdopodobieństwem zysku.",
  },
  de: {
    headline: "Wie sich die Konfidenz exakt zusammensetzt",
    contradiction: (supported: string, limiter: string) => `Stärkster Fakt: ${supported}. Hauptbegrenzung: ${limiter}.`,
    noSupported: "Kein bestätigter Fakt mit ausreichender Stärke.",
    boundary: "Die Abzüge verteilen nur die reale Lücke zu 100 %. Sie sind weder Preisprognose noch Gewinnwahrscheinlichkeit.",
  },
  en: {
    headline: "Exactly how the confidence score is formed",
    contradiction: (supported: string, limiter: string) => `Strongest fact: ${supported}. Main constraint: ${limiter}.`,
    noSupported: "No sufficiently strong verified fact is available.",
    boundary: "Penalties only allocate the real gap to 100%. They are not a price forecast or a probability of profit.",
  },
} as const;

export function buildPass510NeuralConfidenceWaterfall(
  locale: UnifiedAuditLocale,
  topology: Pass491NeuralConfidenceTopology,
  evidence: UnifiedAuditEvidence[],
): Pass510NeuralConfidenceWaterfall {
  const gap = Math.max(0, 100 - topology.calibratedConfidence);
  const weighted = topology.axes.map((axis) => ({ axis, raw: Math.max(0, 100 - axis.score) }));
  const rawTotal = weighted.reduce((sum, item) => sum + item.raw, 0);
  let allocated = 0;
  const steps = weighted
    .sort((left, right) => right.raw - left.raw)
    .map((item, index, list) => {
      const penalty = index === list.length - 1
        ? Math.max(0, gap - allocated)
        : rawTotal > 0
          ? Math.round((item.raw / rawTotal) * gap)
          : 0;
      allocated += penalty;
      return {
        id: item.axis.id,
        label: item.axis.label,
        score: item.axis.score,
        penalty,
        cumulative: Math.max(topology.calibratedConfidence, 100 - allocated),
        tone: item.axis.score < 45 ? "blocking" : item.axis.score < 72 ? "review" : "stable",
        detail: item.axis.detail,
      } satisfies Pass510WaterfallStep;
    });

  const strongest = evidence.find((item) => item.status === "verified")?.label;
  const c = copy[locale];
  return {
    version: "pass510-neural-confidence-waterfall",
    base: 100,
    final: topology.calibratedConfidence,
    gap,
    steps,
    headline: c.headline,
    contradiction: strongest
      ? c.contradiction(strongest, topology.dominantLimiter.label)
      : c.noSupported,
    boundary: c.boundary,
  };
}
