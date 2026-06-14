import type { Pass518CrossProviderChartDiff } from "./pass518-cross-provider-chart-diff";
import type { Pass531SecondaryCandleOverlay } from "./pass531-secondary-candle-overlay";
import type { Pass538ProviderConsensusQuality } from "./pass538-provider-consensus-quality";

export type Pass545ConsensusReason = {
  id: "coverage" | "divergence" | "direction" | "freshness" | "route";
  state: "support" | "review" | "block";
  label: string;
  value: string;
};

export type Pass545ProviderConsensusExplainability = {
  version: "pass545-provider-consensus-explainability";
  state: "verified" | "watch" | "single_source" | "blocked";
  score: number;
  visibleClaim: string;
  reasons: Pass545ConsensusReason[];
  nextAction: string;
  boundary: string;
};

function localized(
  locale: "pl" | "de" | "en",
  values: { pl: string; de: string; en: string },
) {
  return values[locale];
}

function reasonState(
  value: number | null,
  supportAt: number,
  reviewAt: number,
  invert = false,
): Pass545ConsensusReason["state"] {
  if (value === null) return "review";
  if (invert) return value <= supportAt ? "support" : value <= reviewAt ? "review" : "block";
  return value >= supportAt ? "support" : value >= reviewAt ? "review" : "block";
}

export function buildPass545ProviderConsensusExplainability(
  locale: "pl" | "de" | "en",
  consensus: Pass538ProviderConsensusQuality,
  comparison: Pass518CrossProviderChartDiff,
  overlay: Pass531SecondaryCandleOverlay,
): Pass545ProviderConsensusExplainability {
  const coverage = comparison.matchRate || overlay.matchRate;
  const divergence = comparison.medianCloseDivergenceBps;
  const direction = comparison.directionAgreement;
  const freshness = comparison.freshnessDeltaSeconds;
  const reasons: Pass545ConsensusReason[] = [
    {
      id: "coverage",
      state: reasonState(coverage, 75, 45),
      label: localized(locale, { pl: "Pokrycie czasu", de: "Zeitabdeckung", en: "Time coverage" }),
      value: `${coverage}%`,
    },
    {
      id: "divergence",
      state: reasonState(divergence, 18, 65, true),
      label: localized(locale, { pl: "Mediana rozjazdu", de: "Medianabweichung", en: "Median divergence" }),
      value: divergence === null ? "—" : `${divergence.toFixed(1)} bps`,
    },
    {
      id: "direction",
      state: reasonState(direction, 78, 55),
      label: localized(locale, { pl: "Zgodność kierunku", de: "Richtungsübereinstimmung", en: "Direction agreement" }),
      value: direction === null ? "—" : `${direction}%`,
    },
    {
      id: "freshness",
      state: reasonState(freshness, 120, 900, true),
      label: localized(locale, { pl: "Różnica świeżości", de: "Aktualitätsdifferenz", en: "Freshness delta" }),
      value: freshness === null ? "—" : `${Math.round(freshness)}s`,
    },
    {
      id: "route",
      state: consensus.state === "blocked" ? "block" : consensus.state === "verified_consensus" ? "support" : "review",
      label: localized(locale, { pl: "Trasa źródeł", de: "Quellenroute", en: "Provider route" }),
      value: `${consensus.confidenceCap}% cap`,
    },
  ];

  const state: Pass545ProviderConsensusExplainability["state"] =
    consensus.state === "blocked"
      ? "blocked"
      : comparison.state === "single_source" || comparison.source === "none"
        ? "single_source"
        : consensus.state === "verified_consensus" && reasons.every((reason) => reason.state !== "block")
          ? "verified"
          : "watch";

  const visibleClaim =
    state === "verified"
      ? localized(locale, {
          pl: "Wniosek opiera się na dwóch zgodnych feedach w aktualnym oknie.",
          de: "Die Aussage stützt sich im aktuellen Fenster auf zwei übereinstimmende Feeds.",
          en: "The claim is supported by two agreeing feeds in the current window.",
        })
      : state === "single_source"
        ? localized(locale, {
            pl: "Wniosek jest ograniczony do jednego feedu i nie ma statusu konsensusu.",
            de: "Die Aussage ist auf einen Feed begrenzt und besitzt keinen Konsensstatus.",
            en: "The claim is limited to one feed and is not a consensus claim.",
          })
        : state === "blocked"
          ? localized(locale, {
              pl: "Wniosek live jest zablokowany do czasu odzyskania wiarygodnej trasy.",
              de: "Die Live-Aussage bleibt gesperrt, bis eine belastbare Route wiederhergestellt ist.",
              en: "The live claim is blocked until a trustworthy route is restored.",
            })
          : localized(locale, {
              pl: "Wniosek pozostaje monitorowany; część czynników nie spełnia progu konsensusu.",
              de: "Die Aussage bleibt überwacht; einige Faktoren erfüllen die Konsensschwelle nicht.",
              en: "The claim remains monitored because some factors do not meet the consensus threshold.",
            });

  const weakest = [...reasons].sort((left, right) => {
    const rank = { block: 0, review: 1, support: 2 } as const;
    return rank[left.state] - rank[right.state];
  })[0];

  return {
    version: "pass545-provider-consensus-explainability",
    state,
    score: consensus.score,
    visibleClaim,
    reasons,
    nextAction:
      weakest.state === "support"
        ? consensus.nextAction
        : localized(locale, {
            pl: `Najpierw popraw czynnik: ${weakest.label}.`,
            de: `Zuerst den Faktor verbessern: ${weakest.label}.`,
            en: `Improve this factor first: ${weakest.label}.`,
          }),
    boundary:
      "This panel explains visible provider agreement only. It does not certify an exchange, predict price, or fill missing candles.",
  };
}
