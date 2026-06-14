import type { UnifiedAuditEvidence, UnifiedAuditLocale, UnifiedAuditMode } from "./unified-audit";

export type Pass491ConfidenceAxisId = "coverage" | "quorum" | "freshness" | "consistency" | "unknown_control";

export type Pass491ConfidenceAxis = {
  id: Pass491ConfidenceAxisId;
  label: string;
  score: number;
  detail: string;
};

export type Pass491NeuralConfidenceTopology = {
  version: "pass491-neural-confidence-topology";
  calibratedConfidence: number;
  rawConfidence: number | null;
  dominantLimiter: Pass491ConfidenceAxis;
  axes: Pass491ConfidenceAxis[];
  boundary: string;
};

const copy = {
  pl: {
    labels: ["Pokrycie dowodów", "Kworum źródeł", "Świeżość", "Spójność", "Kontrola niewiadomych"],
    details: [
      "Udział pól potwierdzonych lub częściowo potwierdzonych.",
      "Czy wynik ma co najmniej dwa niezależne punkty odniesienia.",
      "Czy dostępny jest jawny i aktualny znacznik czasu.",
      "Czy źródła oraz pola nie przeczą sobie nawzajem.",
      "Czy braki są widoczne zamiast zastąpione przypuszczeniem.",
    ],
    boundary: "Pewność jest ograniczana przez najsłabszą oś. Wynik nie zastępuje samodzielnej weryfikacji źródeł.",
  },
  de: {
    labels: ["Evidenzabdeckung", "Quellenquorum", "Aktualität", "Konsistenz", "Unknown-Kontrolle"],
    details: [
      "Anteil bestätigter oder teilweise bestätigter Felder.",
      "Ob mindestens zwei unabhängige Referenzpunkte vorhanden sind.",
      "Ob ein expliziter und aktueller Zeitstempel vorliegt.",
      "Ob Quellen und Felder einander nicht widersprechen.",
      "Ob Lücken sichtbar bleiben, statt durch Vermutungen ersetzt zu werden.",
    ],
    boundary: "Konfidenz wird durch die schwächste Achse begrenzt und ersetzt keine eigenständige Quellenprüfung.",
  },
  en: {
    labels: ["Evidence coverage", "Source quorum", "Freshness", "Consistency", "Unknown control"],
    details: [
      "Share of fields that are verified or partially supported.",
      "Whether at least two independent reference points are present.",
      "Whether an explicit and current timestamp is available.",
      "Whether sources and fields avoid material contradiction.",
      "Whether gaps stay visible instead of being replaced by inference.",
    ],
    boundary: "Confidence is capped by the weakest axis and does not replace independent source verification.",
  },
} as const;

function numberFromEvidence(evidence: UnifiedAuditEvidence[], id: string) {
  const item = evidence.find((entry) => entry.id === id);
  const match = item?.value.match(/-?\d+(?:[.,]\d+)?/);
  return match ? Number(match[0].replace(",", ".")) : null;
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function buildPass491NeuralConfidenceTopology(
  locale: UnifiedAuditLocale,
  mode: UnifiedAuditMode,
  evidence: UnifiedAuditEvidence[],
): Pass491NeuralConfidenceTopology {
  const c = copy[locale];
  const verified = evidence.filter((item) => item.status === "verified").length;
  const review = evidence.filter((item) => item.status === "review").length;
  const missing = evidence.filter((item) => item.status === "missing").length;
  const total = Math.max(1, evidence.length);
  const coverage = clamp(((verified + review * 0.5) / total) * 100);
  const sourceRows = evidence.filter((item) => /source|provider|venue|źród|quelle/i.test(`${item.id} ${item.label}`));
  const quorum = sourceRows.filter((item) => item.status === "verified").length >= 2 ? 92 : sourceRows.some((item) => item.status !== "missing") ? 58 : 20;
  const freshnessRows = evidence.filter((item) => /fresh|timestamp|czas|age|aktual|zeit/i.test(`${item.id} ${item.label} ${item.note}`));
  const freshness = freshnessRows.some((item) => item.status === "verified") ? 88 : freshnessRows.some((item) => item.status === "review") ? 55 : 28;
  const consistency = clamp(100 - review * 7 - missing * 10);
  const unknownControl = clamp(100 - missing * 8 + Math.min(20, evidence.filter((item) => item.status === "missing" && item.note.length > 8).length * 5));
  const scores = [coverage, quorum, freshness, consistency, unknownControl];
  const ids: Pass491ConfidenceAxisId[] = ["coverage", "quorum", "freshness", "consistency", "unknown_control"];
  const axes = ids.map((id, index) => ({ id, label: c.labels[index], score: scores[index], detail: c.details[index] }));
  const rawConfidence = numberFromEvidence(evidence, "confidence");
  const modeCeiling = mode === "basic" ? 82 : mode === "pro" ? 90 : 96;
  const weakest = Math.min(...scores);
  const evidenceMean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const candidate = rawConfidence ?? evidenceMean;
  const calibratedConfidence = clamp(Math.min(candidate, evidenceMean, weakest + 22, modeCeiling));
  const dominantLimiter = axes.reduce((current, axis) => axis.score < current.score ? axis : current, axes[0]);

  return {
    version: "pass491-neural-confidence-topology",
    calibratedConfidence,
    rawConfidence,
    dominantLimiter,
    axes,
    boundary: c.boundary,
  };
}
