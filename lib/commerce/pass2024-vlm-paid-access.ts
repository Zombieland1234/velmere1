export const PASS2024_VLM_PAID_ACCESS_ID = "pass2024-vlm-paid-advanced-pdf-analysis" as const;
export const PASS2024_VLM_PAID_ACCESS_TASKS = 74 as const;

export type VlmPaidAccessLocale = "pl" | "en" | "de";
export type VlmPaidProductId =
  | "vlm_advanced_analysis_single"
  | "vlm_advanced_pdf_single"
  | "vlm_advanced_audit_human_review";

export type VlmPaidProduct = {
  id: VlmPaidProductId;
  amount: number;
  currency: "eur";
  priceLabel: string;
  label: string;
  shortLabel: string;
  checkoutCta: string;
  includedIn?: VlmPaidProductId[];
  accessScope: "vlm_advanced_analysis" | "vlm_advanced_pdf" | "audit_advanced_human_review";
  description: string;
  boundaries: string[];
};

export type VlmPaidAccessContext = {
  surface: "shield" | "real-markets" | "browser" | "audit" | "unknown";
  locale: VlmPaidAccessLocale;
  assetId?: string;
  symbol?: string;
  depth?: "basic" | "pro" | "advanced";
  requestId?: string;
  returnPath?: string;
};

const localeFallback: VlmPaidAccessLocale = "en";

export function resolveVlmPaidLocale(locale: string | undefined | null): VlmPaidAccessLocale {
  return locale === "pl" || locale === "de" || locale === "en" ? locale : localeFallback;
}

const productsByLocale: Record<VlmPaidAccessLocale, Record<VlmPaidProductId, VlmPaidProduct>> = {
  pl: {
    vlm_advanced_analysis_single: {
      id: "vlm_advanced_analysis_single",
      amount: 499,
      currency: "eur",
      priceLabel: "4.99€",
      label: "VLM Advanced Analysis",
      shortLabel: "Advanced 4.99€",
      checkoutCta: "Odblokuj Advanced - 4.99€",
      accessScope: "vlm_advanced_analysis",
      description: "Jednorazowy dostęp do trzeciego kafelka Advanced dla wybranego aktywa: pełniejszy VLM Brain, głębsze pola dowodowe i spokojna interpretacja ryzyka.",
      boundaries: ["brak porad inwestycyjnych", "brak gwarancji wyniku", "dostęp dotyczy analizy, nie tokena"],
    },
    vlm_advanced_pdf_single: {
      id: "vlm_advanced_pdf_single",
      amount: 1499,
      currency: "eur",
      priceLabel: "14.99€",
      label: "VLM Advanced PDF Report",
      shortLabel: "Advanced PDF 14.99€",
      checkoutCta: "Odblokuj Advanced PDF - 14.99€",
      accessScope: "vlm_advanced_pdf",
      description: "Jednorazowy płatny raport PDF Advanced dla wybranego wyniku Browser/Lens. Basic i Pro mogą zostać darmowe, Advanced PDF jest produktem premium.",
      boundaries: ["PDF nie jest certyfikatem bezpieczeństwa", "bez obietnic ROI", "podgląd i pobranie muszą mieć ten sam payload"],
    },
    vlm_advanced_audit_human_review: {
      id: "vlm_advanced_audit_human_review",
      amount: 8999,
      currency: "eur",
      priceLabel: "89.99€",
      label: "Velmère Advanced Audit",
      shortLabel: "Audit 89.99€",
      checkoutCta: "Zamów Advanced Audit",
      includedIn: ["vlm_advanced_pdf_single"],
      accessScope: "audit_advanced_human_review",
      description: "Płatny audyt hybrydowy: system VLM + ręczna weryfikacja Velmère + prywatny raport klienta. Cena zawiera raport PDF Advanced dla tego zgłoszenia.",
      boundaries: ["start po płatności", "human-reviewed", "nie enterprise retest", "high-risk detale prywatnie"],
    },
  },
  en: {
    vlm_advanced_analysis_single: {
      id: "vlm_advanced_analysis_single",
      amount: 499,
      currency: "eur",
      priceLabel: "4.99€",
      label: "VLM Advanced Analysis",
      shortLabel: "Advanced 4.99€",
      checkoutCta: "Unlock Advanced - 4.99€",
      accessScope: "vlm_advanced_analysis",
      description: "One-time access to the third Advanced card for the selected asset: deeper VLM Brain, stronger evidence fields and calm risk interpretation.",
      boundaries: ["no investment advice", "no outcome guarantee", "access is for analysis, not token value"],
    },
    vlm_advanced_pdf_single: {
      id: "vlm_advanced_pdf_single",
      amount: 1499,
      currency: "eur",
      priceLabel: "14.99€",
      label: "VLM Advanced PDF Report",
      shortLabel: "Advanced PDF 14.99€",
      checkoutCta: "Unlock Advanced PDF - 14.99€",
      accessScope: "vlm_advanced_pdf",
      description: "One-time paid Advanced PDF report for the selected Browser/Lens result. Basic and Pro can remain free; Advanced PDF is the premium document.",
      boundaries: ["PDF is not a security certificate", "no ROI promises", "preview and download must share the same payload"],
    },
    vlm_advanced_audit_human_review: {
      id: "vlm_advanced_audit_human_review",
      amount: 8999,
      currency: "eur",
      priceLabel: "89.99€",
      label: "Velmère Advanced Audit",
      shortLabel: "Audit 89.99€",
      checkoutCta: "Order Advanced Audit",
      includedIn: ["vlm_advanced_pdf_single"],
      accessScope: "audit_advanced_human_review",
      description: "Paid hybrid audit: VLM system + Velmère human verification + private client report. The price includes the Advanced PDF for this request.",
      boundaries: ["starts after payment", "human-reviewed", "not enterprise retest", "high-risk detail private"],
    },
  },
  de: {
    vlm_advanced_analysis_single: {
      id: "vlm_advanced_analysis_single",
      amount: 499,
      currency: "eur",
      priceLabel: "4.99€",
      label: "VLM Advanced Analysis",
      shortLabel: "Advanced 4.99€",
      checkoutCta: "Advanced freischalten - 4.99€",
      accessScope: "vlm_advanced_analysis",
      description: "Einmaliger Zugriff auf die dritte Advanced-Kachel für das ausgewählte Asset: tieferer VLM Brain, stärkere Evidenzfelder und ruhige Risiko-Interpretation.",
      boundaries: ["keine Anlageberatung", "keine Ergebnisgarantie", "Access gilt für Analyse, nicht Token-Wert"],
    },
    vlm_advanced_pdf_single: {
      id: "vlm_advanced_pdf_single",
      amount: 1499,
      currency: "eur",
      priceLabel: "14.99€",
      label: "VLM Advanced PDF Report",
      shortLabel: "Advanced PDF 14.99€",
      checkoutCta: "Advanced PDF freischalten - 14.99€",
      accessScope: "vlm_advanced_pdf",
      description: "Einmalig bezahlter Advanced PDF Report für das ausgewählte Browser/Lens Ergebnis. Basic und Pro können kostenlos bleiben; Advanced PDF ist das Premium-Dokument.",
      boundaries: ["PDF ist kein Sicherheitszertifikat", "keine ROI-Versprechen", "Preview und Download nutzen denselben Payload"],
    },
    vlm_advanced_audit_human_review: {
      id: "vlm_advanced_audit_human_review",
      amount: 8999,
      currency: "eur",
      priceLabel: "89.99€",
      label: "Velmère Advanced Audit",
      shortLabel: "Audit 89.99€",
      checkoutCta: "Advanced Audit bestellen",
      includedIn: ["vlm_advanced_pdf_single"],
      accessScope: "audit_advanced_human_review",
      description: "Bezahlter Hybrid-Audit: VLM System + Velmère Human Verification + privater Kundenreport. Der Preis enthält das Advanced PDF für diese Anfrage.",
      boundaries: ["startet nach Zahlung", "human-reviewed", "kein Enterprise Retest", "High-Risk Details privat"],
    },
  },
};

export function getVlmPaidProduct(productId: VlmPaidProductId, locale = "en"): VlmPaidProduct {
  const safeLocale = resolveVlmPaidLocale(locale);
  return productsByLocale[safeLocale][productId] ?? productsByLocale.en[productId];
}

export function listVlmPaidProducts(locale = "en"): VlmPaidProduct[] {
  const safeLocale = resolveVlmPaidLocale(locale);
  return [
    productsByLocale[safeLocale].vlm_advanced_analysis_single,
    productsByLocale[safeLocale].vlm_advanced_pdf_single,
    productsByLocale[safeLocale].vlm_advanced_audit_human_review,
  ];
}

export function normalizeVlmPaidProductId(value: unknown): VlmPaidProductId | null {
  return value === "vlm_advanced_analysis_single" ||
    value === "vlm_advanced_pdf_single" ||
    value === "vlm_advanced_audit_human_review"
    ? value
    : null;
}

export function normalizePaidContext(input: Partial<VlmPaidAccessContext> | undefined, locale = "en"): VlmPaidAccessContext {
  const safeLocale = resolveVlmPaidLocale(input?.locale ?? locale);
  const surface = input?.surface === "shield" || input?.surface === "real-markets" || input?.surface === "browser" || input?.surface === "audit"
    ? input.surface
    : "unknown";
  const depth = input?.depth === "basic" || input?.depth === "pro" || input?.depth === "advanced" ? input.depth : undefined;
  const clean = (value: unknown, max: number) => typeof value === "string" && value.trim() ? value.trim().slice(0, max) : undefined;
  return {
    surface,
    locale: safeLocale,
    assetId: clean(input?.assetId, 96),
    symbol: clean(input?.symbol, 32),
    depth,
    requestId: clean(input?.requestId, 96),
    returnPath: clean(input?.returnPath, 360),
  };
}

export function buildVlmPaidAccessStorageKey(productId: VlmPaidProductId, context: Partial<VlmPaidAccessContext>): string {
  const normalized = normalizePaidContext(context, context.locale);
  const identity = [normalized.surface, normalized.locale, normalized.assetId || normalized.symbol || normalized.requestId || "generic", normalized.depth || "none"]
    .join(":")
    .toLowerCase()
    .replace(/[^a-z0-9:_-]+/g, "-")
    .slice(0, 180);
  return `velmere.paid-access.${productId}.${identity}`;
}

export function buildVlmPaidReturnPath(context: Partial<VlmPaidAccessContext>, fallback = "/"): string {
  const raw = typeof context.returnPath === "string" && context.returnPath.startsWith("/") ? context.returnPath : fallback;
  return raw.replace(/[\r\n]/g, "").slice(0, 360);
}
