import type { Pass520AiContradictionLineage } from "./pass520-ai-contradiction-lineage";
import type { Pass525LineageRootCause } from "./pass525-lineage-root-cause";
import type { Pass540AiSourceTrustMatrix } from "./pass540-ai-source-trust-matrix";

export type Pass546RemediationStep = {
  id: string;
  rank: number;
  severity: "critical" | "high" | "normal";
  title: string;
  action: string;
  expectedEffect: string;
};

export type Pass546AiRemediationPlan = {
  version: "pass546-ai-remediation-plan";
  state: "clear" | "actionable" | "critical";
  steps: Pass546RemediationStep[];
  headline: string;
  boundary: string;
};

export function buildPass546AiRemediationPlan(
  locale: "pl" | "de" | "en",
  lineage: Pass520AiContradictionLineage,
  root: Pass525LineageRootCause,
  trust: Pass540AiSourceTrustMatrix,
): Pass546AiRemediationPlan {
  const weakest = trust.entries
    .filter((entry) => entry.state !== "trusted")
    .sort((left, right) => left.score - right.score)
    .slice(0, 2);
  const candidates: Omit<Pass546RemediationStep, "rank">[] = [];

  if (root.severity !== "clear") {
    candidates.push({
      id: "root-cause",
      severity: root.severity === "critical" ? "critical" : "high",
      title: root.rootLabel,
      action: root.nextVerification,
      expectedEffect:
        locale === "pl"
          ? "Zmniejsza wpływ dominującej sprzeczności na końcowy confidence."
          : locale === "de"
            ? "Reduziert den Einfluss des dominierenden Widerspruchs auf die Konfidenz."
            : "Reduces the dominant contradiction's impact on final confidence.",
    });
  }

  weakest.forEach((entry) => {
    candidates.push({
      id: `source-${entry.sourceId}`,
      severity: entry.score < 45 ? "critical" : "high",
      title: entry.sourceLabel,
      action:
        locale === "pl"
          ? `Napraw lineage źródła: ${entry.limiter}.`
          : locale === "de"
            ? `Quellen-Lineage korrigieren: ${entry.limiter}.`
            : `Repair source lineage: ${entry.limiter}.`,
      expectedEffect:
        locale === "pl"
          ? `Możliwy wzrost jakości źródła z ${entry.score}% po uzupełnieniu czasu i statusu dowodu.`
          : locale === "de"
            ? `Mögliche Verbesserung gegenüber ${entry.score}% nach Ergänzung von Zeit und Evidenzstatus.`
            : `Potential improvement from ${entry.score}% after completing time and evidence status.`,
    });
  });

  if (lineage.contradictionCount > 0) {
    candidates.push({
      id: "contradiction-review",
      severity: lineage.contradictionCount > 2 ? "critical" : "high",
      title:
        locale === "pl"
          ? "Przegląd sprzecznych krawędzi"
          : locale === "de"
            ? "Prüfung widersprüchlicher Kanten"
            : "Contradictory edge review",
      action:
        locale === "pl"
          ? `Porównaj ${lineage.contradictionCount} sprzeczne relacje z ich źródłami i timestampami.`
          : locale === "de"
            ? `${lineage.contradictionCount} widersprüchliche Beziehungen mit Quellen und Zeitstempeln vergleichen.`
            : `Compare ${lineage.contradictionCount} contradictory relationships against their sources and timestamps.`,
      expectedEffect:
        locale === "pl"
          ? "Oddziela prawdziwy konflikt danych od różnic definicji lub czasu."
          : locale === "de"
            ? "Trennt echte Datenkonflikte von Definitions- oder Zeitunterschieden."
            : "Separates a real data conflict from definition or timing differences.",
    });
  }

  if (!candidates.length) {
    candidates.push({
      id: "monitor",
      severity: "normal",
      title: locale === "pl" ? "Monitoruj świeżość" : locale === "de" ? "Aktualität überwachen" : "Monitor freshness",
      action: trust.nextAction,
      expectedEffect:
        locale === "pl"
          ? "Utrzymuje obecny poziom pewności bez sztucznego podbijania wyniku."
          : locale === "de"
            ? "Hält die aktuelle Konfidenz ohne künstliche Aufwertung stabil."
            : "Maintains current confidence without artificially inflating the score.",
    });
  }

  const steps = candidates
    .sort((left, right) => {
      const rank = { critical: 0, high: 1, normal: 2 } as const;
      return rank[left.severity] - rank[right.severity];
    })
    .slice(0, 4)
    .map((step, index) => ({ ...step, rank: index + 1 }));
  const state: Pass546AiRemediationPlan["state"] = steps.some((step) => step.severity === "critical")
    ? "critical"
    : steps.some((step) => step.severity === "high")
      ? "actionable"
      : "clear";

  return {
    version: "pass546-ai-remediation-plan",
    state,
    steps,
    headline:
      state === "critical"
        ? locale === "pl"
          ? "Najpierw usuń krytyczny limiter dowodów"
          : locale === "de"
            ? "Zuerst den kritischen Evidenz-Limiter beheben"
            : "Resolve the critical evidence limiter first"
        : state === "actionable"
          ? locale === "pl"
            ? "Mózg ma konkretny plan podniesienia jakości analizy"
            : locale === "de"
              ? "Das KI-System hat einen konkreten Verbesserungsplan"
              : "The AI has a concrete plan to improve analysis quality"
          : locale === "pl"
            ? "Brak krytycznych napraw; utrzymuj monitoring"
            : locale === "de"
              ? "Keine kritischen Reparaturen; Monitoring fortsetzen"
              : "No critical repair is required; continue monitoring",
    boundary:
      "The plan prioritizes evidence repair only. It does not promise a score increase and does not replace source review.",
  };
}
