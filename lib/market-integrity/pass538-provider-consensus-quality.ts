import type { Pass517ProviderFailoverRuntime } from "./pass517-provider-failover-runtime";
import type { Pass518CrossProviderChartDiff } from "./pass518-cross-provider-chart-diff";
import type { Pass531SecondaryCandleOverlay } from "./pass531-secondary-candle-overlay";
import type { Pass532ProviderRetryTelemetry } from "./pass532-provider-retry-telemetry";

export type Pass538ConsensusFactor = {
  id: "route" | "comparison" | "coverage" | "divergence" | "retry";
  score: number;
  weight: number;
  detail: string;
};

export type Pass538ProviderConsensusQuality = {
  version: "pass538-provider-consensus-quality";
  state: "verified_consensus" | "monitored" | "single_source" | "blocked";
  score: number;
  confidenceCap: number;
  factors: Pass538ConsensusFactor[];
  headline: string;
  nextAction: string;
  boundary: string;
};

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

function localized(
  locale: "pl" | "de" | "en",
  values: { pl: string; de: string; en: string },
) {
  return values[locale];
}

export function buildPass538ProviderConsensusQuality(
  locale: "pl" | "de" | "en",
  failover: Pass517ProviderFailoverRuntime,
  comparison: Pass518CrossProviderChartDiff,
  overlay: Pass531SecondaryCandleOverlay,
  retry: Pass532ProviderRetryTelemetry,
): Pass538ProviderConsensusQuality {
  const routeScore =
    failover.mode === "blocked"
      ? 0
      : failover.mode === "degraded"
        ? 42
        : failover.failoverAllowed
          ? 96
          : 72;
  const comparisonScore =
    comparison.state === "aligned"
      ? 98
      : comparison.state === "watch"
        ? 68
        : comparison.state === "divergent"
          ? 24
          : comparison.state === "single_source"
            ? 48
            : 20;
  const coverageScore =
    comparison.source === "candles"
      ? comparison.matchRate
      : overlay.state === "ready"
        ? overlay.matchRate
        : overlay.state === "limited"
          ? Math.min(overlay.matchRate, 54)
          : 25;
  const divergenceScore =
    comparison.medianCloseDivergenceBps === null
      ? comparison.state === "single_source"
        ? 45
        : 35
      : clamp(100 - comparison.medianCloseDivergenceBps * 1.25);
  const retryScore =
    retry.state === "healthy"
      ? 100
      : retry.state === "retrying"
        ? 62
        : retry.state === "degraded"
          ? 46
          : 12;

  const factors: Pass538ConsensusFactor[] = [
    {
      id: "route",
      score: routeScore,
      weight: 0.25,
      detail: failover.reason,
    },
    {
      id: "comparison",
      score: comparisonScore,
      weight: 0.25,
      detail: comparison.explanation,
    },
    {
      id: "coverage",
      score: coverageScore,
      weight: 0.2,
      detail: `${comparison.matchRate || overlay.matchRate}% timestamp coverage`,
    },
    {
      id: "divergence",
      score: divergenceScore,
      weight: 0.2,
      detail:
        comparison.medianCloseDivergenceBps === null
          ? "No candle-level divergence measurement is available."
          : `${comparison.medianCloseDivergenceBps.toFixed(1)} bps median close divergence`,
    },
    {
      id: "retry",
      score: retryScore,
      weight: 0.1,
      detail: retry.headline,
    },
  ];

  const weighted = factors.reduce(
    (total, factor) => total + factor.score * factor.weight,
    0,
  );
  const confidenceCap = Math.min(
    failover.confidenceCap,
    comparison.state === "single_source" ? 68 : 100,
    retry.state === "blocked" ? 35 : 100,
  );
  const score = clamp(Math.min(weighted, confidenceCap));
  const state: Pass538ProviderConsensusQuality["state"] =
    failover.mode === "blocked" || retry.state === "blocked"
      ? "blocked"
      : comparison.state === "single_source" || comparison.source === "none"
        ? "single_source"
        : score >= 82 && comparison.state === "aligned"
          ? "verified_consensus"
          : "monitored";

  const headline =
    state === "verified_consensus"
      ? localized(locale, {
          pl: "Dwa źródła są zgodne w widocznym oknie",
          de: "Zwei Quellen stimmen im sichtbaren Fenster überein",
          en: "Two sources agree inside the visible window",
        })
      : state === "single_source"
        ? localized(locale, {
            pl: "Wykres działa w trybie pojedynczego źródła",
            de: "Der Chart läuft im Einzelquellenmodus",
            en: "The chart is operating in single-source mode",
          })
        : state === "blocked"
          ? localized(locale, {
              pl: "Brak wystarczającej trasy do potwierdzenia wykresu",
              de: "Keine ausreichende Route zur Chart-Bestätigung",
              en: "No sufficient route is available to verify the chart",
            })
          : localized(locale, {
              pl: "Zgodność źródeł wymaga dalszego monitorowania",
              de: "Die Quellenübereinstimmung muss weiter überwacht werden",
              en: "Provider agreement requires continued monitoring",
            });

  const nextAction =
    state === "verified_consensus"
      ? localized(locale, {
          pl: "Monitoruj świeżość i rozjazd przed zmianą aktywnej trasy.",
          de: "Aktualität und Abweichung vor einem Routenwechsel überwachen.",
          en: "Monitor freshness and divergence before changing the active route.",
        })
      : state === "single_source"
        ? localized(locale, {
            pl: "Dołącz drugi feed świec z kompatybilnymi timestampami.",
            de: "Einen zweiten Kerzenfeed mit kompatiblen Zeitstempeln anbinden.",
            en: "Attach a second candle feed with compatible timestamps.",
          })
        : state === "blocked"
          ? localized(locale, {
              pl: "Wstrzymaj roszczenia live do czasu powrotu zweryfikowanego źródła.",
              de: "Live-Aussagen pausieren, bis eine verifizierte Quelle zurückkehrt.",
              en: "Pause live claims until a verified source returns.",
            })
          : localized(locale, {
              pl: "Sprawdź rozjazd, pokrycie i historię retry przed podniesieniem pewności.",
              de: "Abweichung, Abdeckung und Retry-Verlauf vor höherer Sicherheit prüfen.",
              en: "Review divergence, coverage and retry history before raising confidence.",
            });

  return {
    version: "pass538-provider-consensus-quality",
    state,
    score,
    confidenceCap,
    factors,
    headline,
    nextAction,
    boundary:
      "Consensus quality describes agreement and continuity between declared data sources. It is not a market-quality, safety or investment score.",
  };
}
