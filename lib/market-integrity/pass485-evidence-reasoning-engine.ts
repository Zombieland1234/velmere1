import type {
  UnifiedAuditEvidence,
  UnifiedAuditLocale,
  UnifiedAuditMode,
} from "@/lib/market-integrity/unified-audit";

export type Pass485ReasoningLaneId =
  | "supported"
  | "tension"
  | "unknown"
  | "next_probe";

export type Pass485ReasoningLane = {
  id: Pass485ReasoningLaneId;
  label: string;
  tone: "positive" | "review" | "warning" | "action";
  headline: string;
  detail: string;
  evidenceIds: string[];
};

export type Pass485EvidenceReasoning = {
  version: "pass485-evidence-reasoning-engine";
  locale: UnifiedAuditLocale;
  mode: UnifiedAuditMode;
  fieldBudget: 10 | 14 | 20;
  verifiedCount: number;
  reviewCount: number;
  missingCount: number;
  coverage: number;
  confidence: number | null;
  headline: string;
  summary: string;
  boundary: string;
  lanes: Pass485ReasoningLane[];
  rules: {
    priceForecastsBlocked: true;
    missingDataCannotBecomeFact: true;
    confidenceCappedByEvidence: true;
    deterministicRanking: true;
  };
};

const fieldBudget: Record<UnifiedAuditMode, 10 | 14 | 20> = {
  basic: 10,
  pro: 14,
  advanced: 20,
};

const preferredFactIds = [
  "identity",
  "price",
  "marketCap",
  "change24h",
  "volume",
  "volume24h",
  "source",
  "timestamp",
  "coverage",
  "confidence",
];

const preferredTensionIds = [
  "risk",
  "volatility",
  "slippage",
  "depth",
  "concentration",
  "holders",
  "unlockPressure",
  "venueHealth",
  "secondSource",
  "sourceQuality",
  "gaps",
];

const preferredUnknownIds = [
  "secondSource",
  "timestamp",
  "liquidity",
  "slippage",
  "depth",
  "holders",
  "unlocks",
  "filing",
  "reserves",
  "proofOfReserves",
  "providerResilience",
];

function numberFrom(value: string) {
  const parsed = Number.parseInt(value.replace(/[^0-9-]/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function rankBy(ids: string[], evidence: UnifiedAuditEvidence[]) {
  return [...evidence].sort((left, right) => {
    const leftIndex = ids.indexOf(left.id);
    const rightIndex = ids.indexOf(right.id);
    return (leftIndex === -1 ? 999 : leftIndex) - (rightIndex === -1 ? 999 : rightIndex);
  });
}

function compact(item: UnifiedAuditEvidence | undefined, fallback: string) {
  if (!item) return fallback;
  return `${item.label}: ${item.value}`;
}

const copy = {
  pl: {
    headline: "Wniosek oparty na dowodach",
    summary: (verified: number, review: number, missing: number) =>
      `${verified} pól potwierdzonych, ${review} wymaga ostrożnej interpretacji, ${missing} pozostaje bez wystarczającego źródła.`,
    boundary:
      "To nie jest prognoza ceny ani porada inwestycyjna. Pewność nie może być wyższa niż pokrycie i świeżość dowodów.",
    labels: {
      supported: "Najmocniejszy fakt",
      tension: "Główne napięcie",
      unknown: "Krytyczny brak",
      next_probe: "Następny test",
    },
    fallback: {
      supported: "Brak potwierdzonego faktu o wystarczającej jakości.",
      tension: "Nie wykryto mocnego sygnału napięcia w dostarczonych polach.",
      unknown: "Drugie niezależne źródło i aktualny timestamp pozostają priorytetem.",
      next_probe: "Uzupełnij brak o największym wpływie na pewność i ponów analizę.",
    },
    detail: {
      supported: "To pole ma najlepsze wsparcie w przekazanym payloadzie.",
      tension: "Ten sygnał ogranicza siłę wniosku albo wymaga kontekstu.",
      unknown: "Brak nie jest zastępowany wartością domyślną ani narracją AI.",
      next_probe: "Najpierw sprawdź brak, który może najbardziej zmienić ocenę.",
    },
  },
  de: {
    headline: "Evidenzgebundene Schlussfolgerung",
    summary: (verified: number, review: number, missing: number) =>
      `${verified} Felder bestätigt, ${review} benötigen vorsichtige Interpretation, ${missing} haben keine ausreichende Quelle.`,
    boundary:
      "Keine Preisprognose und keine Anlageberatung. Konfidenz darf Evidenzabdeckung und Freshness nicht übersteigen.",
    labels: {
      supported: "Stärkster Fakt",
      tension: "Hauptspannung",
      unknown: "Kritische Lücke",
      next_probe: "Nächster Test",
    },
    fallback: {
      supported: "Kein ausreichend belegter Fakt verfügbar.",
      tension: "Kein starkes Spannungssignal in den gelieferten Feldern erkannt.",
      unknown: "Eine unabhängige Zweitquelle und ein aktueller Zeitstempel bleiben Priorität.",
      next_probe: "Die Lücke mit dem größten Einfluss auf die Konfidenz zuerst schließen.",
    },
    detail: {
      supported: "Dieses Feld hat im gelieferten Payload die stärkste Unterstützung.",
      tension: "Dieses Signal begrenzt den Schluss oder braucht zusätzlichen Kontext.",
      unknown: "Die Lücke wird weder mit Default-Werten noch mit AI-Narrativ ersetzt.",
      next_probe: "Zuerst die Lücke prüfen, die die Bewertung am stärksten verändern kann.",
    },
  },
  en: {
    headline: "Evidence-bound conclusion",
    summary: (verified: number, review: number, missing: number) =>
      `${verified} fields are supported, ${review} require guarded interpretation, and ${missing} remain without sufficient source coverage.`,
    boundary:
      "This is not a price forecast or investment advice. Confidence cannot exceed evidence coverage and freshness.",
    labels: {
      supported: "Strongest fact",
      tension: "Primary tension",
      unknown: "Critical unknown",
      next_probe: "Next probe",
    },
    fallback: {
      supported: "No sufficiently supported fact is available yet.",
      tension: "No strong tension signal was found in the supplied fields.",
      unknown: "An independent second source and current timestamp remain the priority.",
      next_probe: "Resolve the gap with the largest confidence impact, then rerun the audit.",
    },
    detail: {
      supported: "This field has the strongest support in the supplied payload.",
      tension: "This signal limits the conclusion or requires more context.",
      unknown: "The gap is not replaced with a default value or AI narrative.",
      next_probe: "Check the gap most likely to change the assessment first.",
    },
  },
} as const;

export function buildPass485EvidenceReasoning(
  locale: UnifiedAuditLocale,
  mode: UnifiedAuditMode,
  evidence: UnifiedAuditEvidence[],
): Pass485EvidenceReasoning {
  const c = copy[locale];
  const verified = evidence.filter((item) => item.status === "verified");
  const review = evidence.filter((item) => item.status === "review");
  const missing = evidence.filter((item) => item.status === "missing");
  const coverageItem = evidence.find((item) => item.id === "coverage");
  const confidenceItem = evidence.find((item) => item.id === "confidence");
  const calculatedCoverage = evidence.length
    ? Math.round(((verified.length + review.length * 0.55) / evidence.length) * 100)
    : 0;
  const coverage = Math.max(0, Math.min(100, numberFrom(coverageItem?.value ?? "") ?? calculatedCoverage));
  const confidenceValue = numberFrom(confidenceItem?.value ?? "");
  const confidence = confidenceValue === null ? null : Math.max(0, Math.min(coverage, confidenceValue));

  const strongestFact = rankBy(preferredFactIds, verified)[0];
  const primaryTension = rankBy(preferredTensionIds, review)[0] ?? rankBy(preferredTensionIds, missing)[0];
  const criticalUnknown = rankBy(preferredUnknownIds, missing)[0] ?? missing[0];
  const nextProbe = criticalUnknown ?? rankBy(preferredTensionIds, review)[0];

  const lanes: Pass485ReasoningLane[] = [
    {
      id: "supported",
      label: c.labels.supported,
      tone: "positive",
      headline: compact(strongestFact, c.fallback.supported),
      detail: strongestFact?.note || c.detail.supported,
      evidenceIds: strongestFact ? [strongestFact.id] : [],
    },
    {
      id: "tension",
      label: c.labels.tension,
      tone: "review",
      headline: compact(primaryTension, c.fallback.tension),
      detail: primaryTension?.note || c.detail.tension,
      evidenceIds: primaryTension ? [primaryTension.id] : [],
    },
    {
      id: "unknown",
      label: c.labels.unknown,
      tone: "warning",
      headline: compact(criticalUnknown, c.fallback.unknown),
      detail: criticalUnknown?.note || c.detail.unknown,
      evidenceIds: criticalUnknown ? [criticalUnknown.id] : [],
    },
    {
      id: "next_probe",
      label: c.labels.next_probe,
      tone: "action",
      headline: nextProbe
        ? `${nextProbe.label}: ${nextProbe.status === "missing" ? c.detail.next_probe : nextProbe.note}`
        : c.fallback.next_probe,
      detail: c.detail.next_probe,
      evidenceIds: nextProbe ? [nextProbe.id] : [],
    },
  ];

  return {
    version: "pass485-evidence-reasoning-engine",
    locale,
    mode,
    fieldBudget: fieldBudget[mode],
    verifiedCount: verified.length,
    reviewCount: review.length,
    missingCount: missing.length,
    coverage,
    confidence,
    headline: c.headline,
    summary: c.summary(verified.length, review.length, missing.length),
    boundary: c.boundary,
    lanes,
    rules: {
      priceForecastsBlocked: true,
      missingDataCannotBecomeFact: true,
      confidenceCappedByEvidence: true,
      deterministicRanking: true,
    },
  };
}
