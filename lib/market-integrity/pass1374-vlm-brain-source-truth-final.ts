export type Pass1374Locale = "pl" | "de" | "en";

export type Pass1374VlmBrainSourceTruthFinal = {
  version: "pass1374-vlm-brain-source-truth-final";
  state: "truth_ready" | "bounded_review" | "blocked";
  score: number;
  hallucinationBrake: "no_random_copy_no_fake_live_no_hidden_missing_data";
  missingDataPolicy: "visible_uncertainty_not_filler";
  confidenceCeiling: number;
  sourceTruthMode: "source_bound" | "partial_source" | "source_required";
  outputRules: Array<{ id: string; rule: string; enforced: true }>;
  forbiddenClaims: ["guaranteed_safe", "investment_advice", "live_verified_without_source", "collapse_claim_without_evidence"];
  copy: {
    title: string;
    body: string;
    unknownLabel: string;
    badge: string;
  };
  manifestKey: string;
};

type Pass1374Input = {
  locale: Pass1374Locale;
  confidenceCap: number;
  sourceCount: number;
  missingCount: number;
  conflictCount: number;
  providerState: string;
  evidenceKey: string;
};

const copy = {
  pl: {
    title: "VLM Brain Source Truth",
    ready: "AI może pisać tylko z widocznych źródeł i musi pokazać braki danych.",
    review: "AI działa w trybie ograniczonym: braki i konflikty obniżają pewność.",
    blocked: "AI nie ma źródeł do mocnego wniosku — pokazuje niepewność zamiast dopisywać narrację.",
    unknown: "brak potwierdzonego źródła",
    badgeReady: "truth ready",
    badgeReview: "bounded review",
    badgeBlocked: "source required",
  },
  de: {
    title: "VLM Brain Source Truth",
    ready: "Die KI darf nur aus sichtbaren Quellen schreiben und muss Datenlücken zeigen.",
    review: "Die KI läuft begrenzt: Lücken und Konflikte senken die Konfidenz.",
    blocked: "Die KI hat keine Quellen für eine starke Aussage und zeigt Unsicherheit statt Fülltext.",
    unknown: "keine bestätigte Quelle",
    badgeReady: "truth ready",
    badgeReview: "bounded review",
    badgeBlocked: "source required",
  },
  en: {
    title: "VLM Brain Source Truth",
    ready: "AI may write only from visible sources and must show missing data.",
    review: "AI runs in bounded mode: gaps and conflicts lower confidence.",
    blocked: "AI lacks sources for a strong conclusion and shows uncertainty instead of filler.",
    unknown: "no confirmed source",
    badgeReady: "truth ready",
    badgeReview: "bounded review",
    badgeBlocked: "source required",
  },
} as const;

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function key(parts: Array<string | number>) {
  const raw = parts.join("|");
  let hash = 0x9e3779b9;
  for (let index = 0; index < raw.length; index += 1) {
    hash ^= raw.charCodeAt(index) + 0x9e3779b9 + (hash << 6) + (hash >> 2);
  }
  return `p1374-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function buildPass1374VlmBrainSourceTruthFinal(input: Pass1374Input): Pass1374VlmBrainSourceTruthFinal {
  const sourceTruthMode = input.sourceCount >= 2 ? "source_bound" : input.sourceCount === 1 ? "partial_source" : "source_required";
  const penalty = (input.missingCount > 0 ? Math.min(18, input.missingCount * 3) : 0) + (input.conflictCount > 0 ? Math.min(18, input.conflictCount * 6) : 0) + (input.sourceCount === 0 ? 30 : input.sourceCount === 1 ? 10 : 0);
  const score = clamp(input.confidenceCap - penalty + 20);
  const state = sourceTruthMode === "source_required" || score < 45 ? "blocked" : score >= 76 ? "truth_ready" : "bounded_review";
  const t = copy[input.locale];
  return {
    version: "pass1374-vlm-brain-source-truth-final",
    state,
    score,
    hallucinationBrake: "no_random_copy_no_fake_live_no_hidden_missing_data",
    missingDataPolicy: "visible_uncertainty_not_filler",
    confidenceCeiling: Math.min(input.confidenceCap, sourceTruthMode === "source_required" ? 35 : sourceTruthMode === "partial_source" ? 68 : 92),
    sourceTruthMode,
    outputRules: [
      { id: "missing_visible", rule: "Missing data must be rendered as uncertainty, never as confidence.", enforced: true },
      { id: "no_fake_live", rule: "Live wording is forbidden unless a live/live_table source exists.", enforced: true },
      { id: "conflict_lowers_confidence", rule: "Provider conflict lowers confidence and raises review state.", enforced: true },
      { id: "same_payload_same_copy", rule: "Same payload, locale and depth must produce deterministic copy.", enforced: true },
      { id: "human_next_check", rule: "Every report needs a human next-check action.", enforced: true },
    ],
    forbiddenClaims: ["guaranteed_safe", "investment_advice", "live_verified_without_source", "collapse_claim_without_evidence"],
    copy: {
      title: t.title,
      body: state === "truth_ready" ? t.ready : state === "bounded_review" ? t.review : t.blocked,
      unknownLabel: t.unknown,
      badge: state === "truth_ready" ? t.badgeReady : state === "bounded_review" ? t.badgeReview : t.badgeBlocked,
    },
    manifestKey: key([input.evidenceKey, input.confidenceCap, input.sourceCount, input.missingCount, input.conflictCount, input.providerState]),
  };
}
