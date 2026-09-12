import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";

type Props = {
  locale: string;
  surface: "shield" | "real-markets";
  assetId: string;
};

const COPY = {
  en: {
    eyebrow: "VERIFIED DATA REQUIRED",
    title: "Asset detail is temporarily withheld",
    body: "Velmère will not publish a price, market change, risk score, confidence value, freshness claim, or source count here until those fields are bound to server-verified provider evidence for this exact asset request.",
    note: "URL parameters and local fallback values are not authoritative market evidence.",
    backShield: "Back to Shield",
    backMarkets: "Back to Real Markets",
  },
  pl: {
    eyebrow: "WYMAGANE ZWERYFIKOWANE DANE",
    title: "Szczegóły aktywa są tymczasowo wstrzymane",
    body: "Velmère nie opublikuje tutaj ceny, zmiany rynkowej, wyniku ryzyka, poziomu pewności, świeżości ani liczby źródeł, dopóki pola te nie zostaną powiązane z serwerowo zweryfikowanym dowodem dostawcy dla tego konkretnego aktywa.",
    note: "Parametry URL i lokalne wartości zastępcze nie są autorytatywnym dowodem rynkowym.",
    backShield: "Powrót do Shield",
    backMarkets: "Powrót do Real Markets",
  },
  de: {
    eyebrow: "VERIFIZIERTE DATEN ERFORDERLICH",
    title: "Asset-Details sind vorübergehend zurückgehalten",
    body: "Velmère veröffentlicht hier weder Preis noch Marktveränderung, Risikowert, Konfidenz, Aktualitätsangabe oder Quellenanzahl, solange diese Felder nicht an serverseitig verifizierte Provider-Evidenz für genau dieses Asset gebunden sind.",
    note: "URL-Parameter und lokale Fallback-Werte sind keine autoritative Marktevidenz.",
    backShield: "Zurück zu Shield",
    backMarkets: "Zurück zu Real Markets",
  },
} as const;

export default function AssetDetailTruthWithheldPage({ locale, surface, assetId }: Props) {
  const safeLocale = locale === "pl" || locale === "de" ? locale : "en";
  const copy = COPY[safeLocale];
  const backHref = surface === "shield" ? `/${safeLocale}/shield` : `/${safeLocale}/real-markets`;
  const backLabel = surface === "shield" ? copy.backShield : copy.backMarkets;
  const displayAssetId = decodeURIComponent(assetId).slice(0, 120);

  return (
    <main
      className="min-h-[calc(100dvh-4rem)] bg-[#07090d] px-5 py-24 text-white md:px-10 md:py-32"
      data-asset-detail-truth-state="WITHHELD"
      data-asset-detail-surface={surface}
    >
      <section className="mx-auto max-w-3xl rounded-[1.75rem] border border-amber-200/[0.14] bg-amber-200/[0.035] p-6 shadow-2xl md:p-10">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-200/[0.18] bg-amber-200/[0.06] text-amber-200">
            <ShieldAlert className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200/80">
              {copy.eyebrow}
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">
              {copy.title}
            </h1>
            <p className="mt-5 text-sm leading-7 text-white/70">{copy.body}</p>
            <p className="mt-4 rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 font-mono text-[11px] leading-5 text-white/55">
              {copy.note}
            </p>
            <dl className="mt-6 grid gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 text-xs sm:grid-cols-[9rem_1fr]">
              <dt className="font-mono uppercase tracking-wider text-white/35">Asset request</dt>
              <dd className="break-all font-mono text-white/70">{displayAssetId || "unknown"}</dd>
              <dt className="font-mono uppercase tracking-wider text-white/35">Truth state</dt>
              <dd className="font-mono font-semibold text-amber-200">WITHHELD</dd>
            </dl>
            <Link
              href={backHref}
              className="mt-7 inline-flex items-center gap-2 rounded-xl border border-white/[0.10] bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {backLabel}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
