export type VlmBrainReportCapsuleLocale = "pl" | "en" | "de" | string;

export type VlmBrainReportCapsuleReadiness = "blocked" | "review" | "ready";

export type VlmBrainReportCapsuleSourceMode = "live" | "partial" | "fallback" | "missing" | "blocked" | string;

export type VlmBrainReportCapsuleInput = {
  locale: VlmBrainReportCapsuleLocale;
  token: {
    symbol: string;
    name?: string | null;
  };
  tile: {
    label: string;
    group: string;
    value: string;
    severity: string;
  };
  source: {
    trust: string;
    publicationState: string;
    chartSource: string;
    dataQuality: VlmBrainReportCapsuleSourceMode;
    confidence: string;
  };
  capsule: {
    publicBrief: string;
    operatorMemo: string;
    redactionRule: string;
    exportGate: string;
  };
  operator: {
    nextAction: string;
    checklist: string[];
  };
  generatedAt?: string;
};

export type VlmBrainReportCapsuleEnvelope = {
  schemaVersion: "vlm-brain-report-capsule-v1-pass209";
  capsuleMode: "tile_preview_only";
  capsuleId: string;
  generatedAt: string;
  locale: string;
  token: {
    symbol: string;
    name: string;
  };
  tile: {
    label: string;
    group: string;
    value: string;
    severity: string;
  };
  source: {
    trust: string;
    publicationState: string;
    chartSource: string;
    dataQuality: string;
    confidence: string;
  };
  exportReadiness: VlmBrainReportCapsuleReadiness;
  publicBrief: string;
  operatorMemo: string;
  dataBoundary: string;
  redactionRules: string[];
  operatorChecklist: string[];
  copyGuard: string;
};

const FORBIDDEN_COPY_PATTERNS = [
  /guaranteed\s+profit/gi,
  /risk[-\s]?free/gi,
  /safe\s+investment/gi,
  /buy\s+signal/gi,
  /sell\s+signal/gi,
  /scam\s+confirmed/gi,
  /fraud\s+proven/gi,
  /seed\s+phrase/gi,
  /private\s+key/gi,
];

function compact(value: unknown, fallback = "review required") {
  return String(value ?? fallback)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 420) || fallback;
}

function redactSensitive(value: unknown) {
  let output = compact(value, "not provided");
  output = output.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]");
  output = output.replace(/0x[a-f0-9]{48,}/gi, "[redacted-long-hex]");
  output = output.replace(/\b(?:[a-z]+\s+){11,23}[a-z]+\b/gi, "[redacted-seed-like-text]");
  for (const pattern of FORBIDDEN_COPY_PATTERNS) {
    output = output.replace(pattern, "review wording");
  }
  return output;
}

function normalizeId(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 88);
}

function readinessFromInput(input: VlmBrainReportCapsuleInput): VlmBrainReportCapsuleReadiness {
  const combined = `${input.source.dataQuality} ${input.source.trust} ${input.source.publicationState} ${input.capsule.exportGate}`.toLowerCase();
  if (combined.includes("blocked") || combined.includes("missing") || combined.includes("fallback") || combined.includes("internal")) {
    return "blocked";
  }
  if (combined.includes("partial") || combined.includes("review") || combined.includes("second")) {
    return "review";
  }
  return "ready";
}

function copyGuardForLocale(locale: string) {
  if (locale === "pl") {
    return "Używaj języka anomaly/review/missing data. To kapsuła robocza, nie certyfikat bezpieczeństwa, nie porada finansowa i nie finalny werdykt.";
  }
  if (locale === "de") {
    return "Sprache bei Anomalie/Review/Missing Data halten. Diese Kapsel ist ein Arbeits-Preview, kein Sicherheitszertifikat, keine Finanzberatung und kein finales Urteil.";
  }
  return "Use anomaly/review/missing-data wording. This capsule is a working preview, not a safety certificate, not financial advice and not a final verdict.";
}

function dataBoundaryForLocale(locale: string) {
  if (locale === "pl") {
    return "Eksport pokazuje tylko streszczenie kafelka, stan źródeł i checklistę. Surowe payloady, PII, sekrety, prywatne wagi i długie identyfikatory są wycięte.";
  }
  if (locale === "de") {
    return "Der Export zeigt nur Kachel-Zusammenfassung, Quellenstatus und Checkliste. Rohdaten, PII, Secrets, private Gewichtungen und lange Kennungen werden entfernt.";
  }
  return "Export includes only the tile summary, source state and checklist. Raw payloads, PII, secrets, private weights and long identifiers are removed.";
}

export function buildVlmBrainReportCapsule(input: VlmBrainReportCapsuleInput): VlmBrainReportCapsuleEnvelope {
  const locale = input.locale === "pl" || input.locale === "de" ? input.locale : "en";
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const symbol = compact(input.token.symbol, "TOKEN").toUpperCase();
  const capsuleId = normalizeId(`VLM-BRAIN-CAPSULE-${symbol}-${input.tile.group}-${input.tile.label}-${generatedAt}`);
  const exportReadiness = readinessFromInput(input);

  return {
    schemaVersion: "vlm-brain-report-capsule-v1-pass209",
    capsuleMode: "tile_preview_only",
    capsuleId,
    generatedAt,
    locale,
    token: {
      symbol,
      name: compact(input.token.name || input.token.symbol, symbol),
    },
    tile: {
      label: redactSensitive(input.tile.label),
      group: compact(input.tile.group, "risk"),
      value: redactSensitive(input.tile.value),
      severity: compact(input.tile.severity, "review"),
    },
    source: {
      trust: redactSensitive(input.source.trust),
      publicationState: redactSensitive(input.source.publicationState),
      chartSource: redactSensitive(input.source.chartSource),
      dataQuality: compact(input.source.dataQuality, "partial"),
      confidence: compact(input.source.confidence, "review"),
    },
    exportReadiness,
    publicBrief: redactSensitive(input.capsule.publicBrief),
    operatorMemo: redactSensitive(input.capsule.operatorMemo),
    dataBoundary: dataBoundaryForLocale(locale),
    redactionRules: [
      redactSensitive(input.capsule.redactionRule),
      dataBoundaryForLocale(locale),
      copyGuardForLocale(locale),
    ],
    operatorChecklist: input.operator.checklist.map(redactSensitive).slice(0, 6),
    copyGuard: copyGuardForLocale(locale),
  };
}

export function serializeVlmBrainReportCapsule(capsule: VlmBrainReportCapsuleEnvelope) {
  return JSON.stringify(capsule, null, 2);
}

export const PASS209_VLM_BRAIN_REPORT_CAPSULE_CONTRACT = true;
