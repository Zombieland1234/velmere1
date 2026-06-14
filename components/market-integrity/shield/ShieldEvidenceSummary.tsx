"use client";

import type { Pass612OneSourceStateContract } from "@/lib/market-integrity/pass612-one-source-state-contract";
import type { Pass615TierManifest } from "@/lib/market-integrity/pass615-tier-information-architecture";

export type ShieldEvidenceSummaryProps = {
  locale: "pl" | "de" | "en";
  sourceContract: Pass612OneSourceStateContract;
  candleCount: number;
  gapCount: number;
  stateLabel: string;
  tierManifest: Pass615TierManifest;
};

const COPY = {
  pl: {
    aria: "Stan dowodów analizy",
    sources: "Źródła",
    candles: "Świece",
    gaps: "Braki",
    state: "Stan",
    ready:
      "AI pokazuje tylko dane przypięte do źródła. Advanced otwiera pełny plan weryfikacji.",
    limited:
      "Część danych wymaga drugiego źródła — system nie podnosi pewności bez dowodu.",
    fields: "pól",
    confirmed: "potwierdzone",
    limitedCount: "ograniczone",
    missing: "brakujące",
  },
  de: {
    aria: "Evidenzstatus der Analyse",
    sources: "Quellen",
    candles: "Kerzen",
    gaps: "Lücken",
    state: "Status",
    ready:
      "Die KI zeigt nur quellengebundene Daten. Advanced öffnet den vollständigen Prüfplan.",
    limited:
      "Ein Teil der Daten braucht eine zweite Quelle; die Konfidenz steigt nicht ohne Beleg.",
    fields: "Felder",
    confirmed: "bestätigt",
    limitedCount: "begrenzt",
    missing: "fehlend",
  },
  en: {
    aria: "Analysis evidence status",
    sources: "Sources",
    candles: "Candles",
    gaps: "Gaps",
    state: "State",
    ready:
      "AI shows source-bound data only. Advanced opens the full verification plan.",
    limited:
      "Some data needs a second source; confidence is not raised without evidence.",
    fields: "fields",
    confirmed: "confirmed",
    limitedCount: "limited",
    missing: "missing",
  },
} as const;

export function ShieldEvidenceSummary({
  locale,
  sourceContract,
  candleCount,
  gapCount,
  stateLabel,
  tierManifest,
}: ShieldEvidenceSummaryProps) {
  const copy = COPY[locale];
  const ready = sourceContract.readyCount >= 2;

  return (
    <section
      className="shield-evidence-summary-card"
      data-pass647-evidence-summary-card="true"
    >
      <div className="shield-evidence-summary-head">
        <div className="min-w-0">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-velmere-gold/[0.78]">
            {copy.aria}
          </p>
          <p className="mt-2 text-[11px] leading-5 text-white/[0.46]">
            {ready ? copy.ready : copy.limited}
          </p>
        </div>
        <span className="shield-evidence-summary-state">{stateLabel}</span>
      </div>

      <div
        className="shield-public-evidence-spine"
        data-pass559-public-evidence-spine="true"
        data-pass612-source-state={sourceContract.aggregateState}
        data-pass645-mobile-budget="interaction-safe"
        data-pass646-surface="shield"
        data-source-state={sourceContract.aggregateState}
        aria-label={copy.aria}
      >
        <div>
          <span>{copy.sources}</span>
          <strong>
            {sourceContract.readyCount}/{sourceContract.totalCount}
          </strong>
        </div>
        <div>
          <span>{copy.candles}</span>
          <strong>{candleCount}</strong>
        </div>
        <div>
          <span>{copy.gaps}</span>
          <strong>{gapCount}</strong>
        </div>
        <div>
          <span>{copy.state}</span>
          <strong>{stateLabel}</strong>
        </div>
      </div>

      <p
        id="shield-token-modal-boundary"
        className="shield-public-evidence-next"
        data-pass559-next-proof-step="true"
        data-pass615-active-tier={tierManifest.tier}
      >
        {ready ? copy.ready : copy.limited}
      </p>

      <div
        className="shield-tier-manifest-strip"
        data-pass615-tier-information-architecture="true"
        data-tier={tierManifest.tier}
      >
        <span>
          {tierManifest.fieldBudget} {copy.fields}
        </span>
        <span>
          {tierManifest.confirmedCount} {copy.confirmed}
        </span>
        <span>
          {tierManifest.limitedCount} {copy.limitedCount}
        </span>
        <span>
          {tierManifest.missingCount} {copy.missing}
        </span>
      </div>
    </section>
  );
}
