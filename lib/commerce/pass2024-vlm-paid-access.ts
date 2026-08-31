export const PASS2024_VLM_PAID_ACCESS_ID = "pass2024-vlm-paid-advanced-pdf-analysis" as const;
export const PASS2024_VLM_PAID_ACCESS_TASKS = 74 as const;

export type VlmPaidAccessLocale = "pl" | "en" | "de";
export type VlmPaidProductId =
  | "vlm_advanced_analysis_single"
  | "vlm_advanced_pdf_single"
  | "vlm_advanced_audit_human_review"
  | "audit_pro_review"
  | "shield_pro_basic_single"
  | "shield_pro_pro_single"
  | "shield_pro_advanced_single"
  | "real_markets_pro_single"
  | "real_markets_advanced_single"
  | "market_impact_single"
  | "whale_watch_single"
  | "risk_indicator_single";

export type VlmPaidProduct = {
  id: VlmPaidProductId;
  amount: number;
  currency: "eur";
  priceLabel: string;
  label: string;
  shortLabel: string;
  checkoutCta: string;
  includedIn?: VlmPaidProductId[];
  accessScope: "vlm_advanced_analysis" | "vlm_advanced_pdf" | "audit_advanced_human_review" | "audit_pro_review" | "shield_pro" | "real_markets" | "market_impact" | "whale_watch" | "risk_indicator";
  description: string;
  boundaries: string[];
};

export type VlmPaidAccessContext = {
  surface: "shield" | "shield-pro" | "real-markets" | "browser" | "audit" | "market-impact" | "whale-watch" | "risk-indicator" | "unknown";
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
    audit_pro_review: {
      id: "audit_pro_review",
      amount: 2999,
      currency: "eur",
      priceLabel: "29.99€",
      label: "Velmère Pro Audit",
      shortLabel: "Audit Pro 29.99€",
      checkoutCta: "Zamów Pro Audit",
      accessScope: "audit_pro_review",
      description: "Rozszerzony audyt bezpieczeństwa: głębsza analiza VLM +优先级 review + szczegółowy raport PDF.",
      boundaries: ["start po płatności", "VLM-powered", "nie enterprise", "raport PDF w cenie"],
    },
    shield_pro_basic_single: {
      id: "shield_pro_basic_single",
      amount: 399,
      currency: "eur",
      priceLabel: "3.99€",
      label: "Shield Pro Basic",
      shortLabel: "Shield Pro Basic 3.99€",
      checkoutCta: "Odblokuj Shield Pro Basic - 3.99€",
      accessScope: "shield_pro",
      description: "Podstawowa analiza risk w Shield Pro: 10 pól dowodowych, podstawowe wskaźniki ryzyka.",
      boundaries: ["brak porad inwestycyjnych", "brak gwarancji wyniku", "dostęp dotyczy analizy"],
    },
    shield_pro_pro_single: {
      id: "shield_pro_pro_single",
      amount: 799,
      currency: "eur",
      priceLabel: "7.99€",
      label: "Shield Pro",
      shortLabel: "Shield Pro 7.99€",
      checkoutCta: "Odblokuj Shield Pro - 7.99€",
      accessScope: "shield_pro",
      description: "Zaawansowana analiza risk w Shield Pro: 14 pól, głębsze wskaźniki, drugie źródło danych.",
      boundaries: ["brak porad inwestycyjnych", "brak gwarancji wyniku", "dostęp dotyczy analizy"],
    },
    shield_pro_advanced_single: {
      id: "shield_pro_advanced_single",
      amount: 1299,
      currency: "eur",
      priceLabel: "12.99€",
      label: "Shield Pro Advanced",
      shortLabel: "Shield Pro Adv 12.99€",
      checkoutCta: "Odblokuj Shield Pro Advanced - 12.99€",
      accessScope: "shield_pro",
      description: "Pełna analiza risk w Shield Pro: 20 pól, wszystkie wskaźniki, slippage, depth, holders.",
      boundaries: ["brak porad inwestycyjnych", "brak gwarancji wyniku", "dostęp dotyczy analizy"],
    },
    real_markets_pro_single: {
      id: "real_markets_pro_single",
      amount: 599,
      currency: "eur",
      priceLabel: "5.99€",
      label: "Real Markets Pro",
      shortLabel: "Real Markets Pro 5.99€",
      checkoutCta: "Odblokuj Real Markets Pro - 5.99€",
      accessScope: "real_markets",
      description: "Zaawansowana analiza rynków realnych: głębsze dane, drugie źródło, zaawansowane wskaźniki.",
      boundaries: ["brak porad inwestycyjnych", "brak gwarancji wyniku", "dostęp dotyczy analizy"],
    },
    real_markets_advanced_single: {
      id: "real_markets_advanced_single",
      amount: 999,
      currency: "eur",
      priceLabel: "9.99€",
      label: "Real Markets Advanced",
      shortLabel: "Real Markets Adv 9.99€",
      checkoutCta: "Odblokuj Real Markets Advanced - 9.99€",
      accessScope: "real_markets",
      description: "Pełna analiza rynków realnych: wszystkie pola, slippage, depth, holders, koncentracja.",
      boundaries: ["brak porad inwestycyjnych", "brak gwarancji wyniku", "dostęp dotyczy analizy"],
    },
    market_impact_single: {
      id: "market_impact_single",
      amount: 699,
      currency: "eur",
      priceLabel: "6.99€",
      label: "Market Impact Analysis",
      shortLabel: "Market Impact 6.99€",
      checkoutCta: "Odblokuj Market Impact - 6.99€",
      accessScope: "market_impact",
      description: "Analiza wpływu rynkowego: testy stress, płynność, symulacje slippage, impact large orders.",
      boundaries: ["brak porad inwestycyjnych", "symulacje nie gwarantują wyniku", "dostęp dotyczy analizy"],
    },
    whale_watch_single: {
      id: "whale_watch_single",
      amount: 499,
      currency: "eur",
      priceLabel: "4.99€",
      label: "Whale Watch",
      shortLabel: "Whale Watch 4.99€",
      checkoutCta: "Odblokuj Whale Watch - 4.99€",
      accessScope: "whale_watch",
      description: "Śledzenie wielorybów: koncentracja holdingów, odblokowania, presja sell-side, clustering.",
      boundaries: ["brak porad inwestycyjnych", "dane nie gwarantują przyszłych ruchów", "dostęp dotyczy analizy"],
    },
    risk_indicator_single: {
      id: "risk_indicator_single",
      amount: 399,
      currency: "eur",
      priceLabel: "3.99€",
      label: "Risk Indicator",
      shortLabel: "Risk Indicator 3.99€",
      checkoutCta: "Odblokuj Risk Indicator - 3.99€",
      accessScope: "risk_indicator",
      description: "Zaawansowane wskaźniki ryzyka: scoring, klasyfikacja, alerty, trend analysis.",
      boundaries: ["brak porad inwestycyjnych", "wskaźniki nie gwarantują wyniku", "dostęp dotyczy analizy"],
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
    audit_pro_review: {
      id: "audit_pro_review",
      amount: 2999,
      currency: "eur",
      priceLabel: "29.99€",
      label: "Velmère Pro Audit",
      shortLabel: "Audit Pro 29.99€",
      checkoutCta: "Order Pro Audit",
      accessScope: "audit_pro_review",
      description: "Extended security audit: deeper VLM analysis + priority review + detailed PDF report.",
      boundaries: ["starts after payment", "VLM-powered", "not enterprise", "PDF report included"],
    },
    shield_pro_basic_single: {
      id: "shield_pro_basic_single",
      amount: 399,
      currency: "eur",
      priceLabel: "3.99€",
      label: "Shield Pro Basic",
      shortLabel: "Shield Pro Basic 3.99€",
      checkoutCta: "Unlock Shield Pro Basic - 3.99€",
      accessScope: "shield_pro",
      description: "Basic risk analysis in Shield Pro: 10 evidence fields, fundamental risk indicators.",
      boundaries: ["no investment advice", "no outcome guarantee", "access is for analysis"],
    },
    shield_pro_pro_single: {
      id: "shield_pro_pro_single",
      amount: 799,
      currency: "eur",
      priceLabel: "7.99€",
      label: "Shield Pro",
      shortLabel: "Shield Pro 7.99€",
      checkoutCta: "Unlock Shield Pro - 7.99€",
      accessScope: "shield_pro",
      description: "Advanced risk analysis in Shield Pro: 14 fields, deeper indicators, second data source.",
      boundaries: ["no investment advice", "no outcome guarantee", "access is for analysis"],
    },
    shield_pro_advanced_single: {
      id: "shield_pro_advanced_single",
      amount: 1299,
      currency: "eur",
      priceLabel: "12.99€",
      label: "Shield Pro Advanced",
      shortLabel: "Shield Pro Adv 12.99€",
      checkoutCta: "Unlock Shield Pro Advanced - 12.99€",
      accessScope: "shield_pro",
      description: "Full risk analysis in Shield Pro: 20 fields, all indicators, slippage, depth, holders.",
      boundaries: ["no investment advice", "no outcome guarantee", "access is for analysis"],
    },
    real_markets_pro_single: {
      id: "real_markets_pro_single",
      amount: 599,
      currency: "eur",
      priceLabel: "5.99€",
      label: "Real Markets Pro",
      shortLabel: "Real Markets Pro 5.99€",
      checkoutCta: "Unlock Real Markets Pro - 5.99€",
      accessScope: "real_markets",
      description: "Advanced real markets analysis: deeper data, second source, advanced indicators.",
      boundaries: ["no investment advice", "no outcome guarantee", "access is for analysis"],
    },
    real_markets_advanced_single: {
      id: "real_markets_advanced_single",
      amount: 999,
      currency: "eur",
      priceLabel: "9.99€",
      label: "Real Markets Advanced",
      shortLabel: "Real Markets Adv 9.99€",
      checkoutCta: "Unlock Real Markets Advanced - 9.99€",
      accessScope: "real_markets",
      description: "Full real markets analysis: all fields, slippage, depth, holders, concentration.",
      boundaries: ["no investment advice", "no outcome guarantee", "access is for analysis"],
    },
    market_impact_single: {
      id: "market_impact_single",
      amount: 699,
      currency: "eur",
      priceLabel: "6.99€",
      label: "Market Impact Analysis",
      shortLabel: "Market Impact 6.99€",
      checkoutCta: "Unlock Market Impact - 6.99€",
      accessScope: "market_impact",
      description: "Market impact analysis: stress tests, liquidity, slippage simulations, large order impact.",
      boundaries: ["no investment advice", "simulations do not guarantee outcome", "access is for analysis"],
    },
    whale_watch_single: {
      id: "whale_watch_single",
      amount: 499,
      currency: "eur",
      priceLabel: "4.99€",
      label: "Whale Watch",
      shortLabel: "Whale Watch 4.99€",
      checkoutCta: "Unlock Whale Watch - 4.99€",
      accessScope: "whale_watch",
      description: "Whale tracking: holding concentration, unlocks, sell-side pressure, clustering.",
      boundaries: ["no investment advice", "data does not guarantee future moves", "access is for analysis"],
    },
    risk_indicator_single: {
      id: "risk_indicator_single",
      amount: 399,
      currency: "eur",
      priceLabel: "3.99€",
      label: "Risk Indicator",
      shortLabel: "Risk Indicator 3.99€",
      checkoutCta: "Unlock Risk Indicator - 3.99€",
      accessScope: "risk_indicator",
      description: "Advanced risk indicators: scoring, classification, alerts, trend analysis.",
      boundaries: ["no investment advice", "indicators do not guarantee outcome", "access is for analysis"],
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
    audit_pro_review: {
      id: "audit_pro_review",
      amount: 2999,
      currency: "eur",
      priceLabel: "29.99€",
      label: "Velmère Pro Audit",
      shortLabel: "Audit Pro 29.99€",
      checkoutCta: "Pro Audit bestellen",
      accessScope: "audit_pro_review",
      description: "Erweiterter Sicherheits-Audit: tiefere VLM-Analyse + Priority Review + detaillierter PDF-Bericht.",
      boundaries: ["startet nach Zahlung", "VLM-powered", "kein Enterprise", "PDF-Bericht inklusive"],
    },
    shield_pro_basic_single: {
      id: "shield_pro_basic_single",
      amount: 399,
      currency: "eur",
      priceLabel: "3.99€",
      label: "Shield Pro Basic",
      shortLabel: "Shield Pro Basic 3.99€",
      checkoutCta: "Shield Pro Basic freischalten - 3.99€",
      accessScope: "shield_pro",
      description: "Basis-Risikoanalyse in Shield Pro: 10 Evidenzfelder, grundlegende Risikoindikatoren.",
      boundaries: ["keine Anlageberatung", "keine Ergebnisgarantie", "Access gilt für Analyse"],
    },
    shield_pro_pro_single: {
      id: "shield_pro_pro_single",
      amount: 799,
      currency: "eur",
      priceLabel: "7.99€",
      label: "Shield Pro",
      shortLabel: "Shield Pro 7.99€",
      checkoutCta: "Shield Pro freischalten - 7.99€",
      accessScope: "shield_pro",
      description: "Erweiterte Risikoanalyse in Shield Pro: 14 Felder, tiefere Indikatoren, zweite Datenquelle.",
      boundaries: ["keine Anlageberatung", "keine Ergebnisgarantie", "Access gilt für Analyse"],
    },
    shield_pro_advanced_single: {
      id: "shield_pro_advanced_single",
      amount: 1299,
      currency: "eur",
      priceLabel: "12.99€",
      label: "Shield Pro Advanced",
      shortLabel: "Shield Pro Adv 12.99€",
      checkoutCta: "Shield Pro Advanced freischalten - 12.99€",
      accessScope: "shield_pro",
      description: "Vollständige Risikoanalyse in Shield Pro: 20 Felder, alle Indikatoren, Slippage, Depth, Holders.",
      boundaries: ["keine Anlageberatung", "keine Ergebnisgarantie", "Access gilt für Analyse"],
    },
    real_markets_pro_single: {
      id: "real_markets_pro_single",
      amount: 599,
      currency: "eur",
      priceLabel: "5.99€",
      label: "Real Markets Pro",
      shortLabel: "Real Markets Pro 5.99€",
      checkoutCta: "Real Markets Pro freischalten - 5.99€",
      accessScope: "real_markets",
      description: "Erweiterte Analyse realer Märkte: tiefere Daten, zweite Quelle, fortschrittliche Indikatoren.",
      boundaries: ["keine Anlageberatung", "keine Ergebnisgarantie", "Access gilt für Analyse"],
    },
    real_markets_advanced_single: {
      id: "real_markets_advanced_single",
      amount: 999,
      currency: "eur",
      priceLabel: "9.99€",
      label: "Real Markets Advanced",
      shortLabel: "Real Markets Adv 9.99€",
      checkoutCta: "Real Markets Advanced freischalten - 9.99€",
      accessScope: "real_markets",
      description: "Vollständige Analyse realer Märkte: alle Felder, Slippage, Depth, Holders, Konzentration.",
      boundaries: ["keine Anlageberatung", "keine Ergebnisgarantie", "Access gilt für Analyse"],
    },
    market_impact_single: {
      id: "market_impact_single",
      amount: 699,
      currency: "eur",
      priceLabel: "6.99€",
      label: "Market Impact Analyse",
      shortLabel: "Market Impact 6.99€",
      checkoutCta: "Market Impact freischalten - 6.99€",
      accessScope: "market_impact",
      description: "Markt-Impact-Analyse: Stress-Tests, Liquidität, Slippage-Simulationen, Großauftrag-Impact.",
      boundaries: ["keine Anlageberatung", "Simulationen garantieren kein Ergebnis", "Access gilt für Analyse"],
    },
    whale_watch_single: {
      id: "whale_watch_single",
      amount: 499,
      currency: "eur",
      priceLabel: "4.99€",
      label: "Whale Watch",
      shortLabel: "Whale Watch 4.99€",
      checkoutCta: "Whale Watch freischalten - 4.99€",
      accessScope: "whale_watch",
      description: "Wale-Tracking: Holdings-Konzentration, Entsperrungen, Verkaufsdruck, Clustering.",
      boundaries: ["keine Anlageberatung", "Daten garantieren keine zukünftigen Bewegungen", "Access gilt für Analyse"],
    },
    risk_indicator_single: {
      id: "risk_indicator_single",
      amount: 399,
      currency: "eur",
      priceLabel: "3.99€",
      label: "Risk Indicator",
      shortLabel: "Risk Indicator 3.99€",
      checkoutCta: "Risk Indicator freischalten - 3.99€",
      accessScope: "risk_indicator",
      description: "Fortgeschrittene Risikoindikatoren: Scoring, Klassifizierung, Alerts, Trend-Analyse.",
      boundaries: ["keine Anlageberatung", "Indikatoren garantieren kein Ergebnis", "Access gilt für Analyse"],
    },
  },
};

export function getVlmPaidProduct(productId: VlmPaidProductId, locale = "en"): VlmPaidProduct {
  const safeLocale = resolveVlmPaidLocale(locale);
  return productsByLocale[safeLocale][productId] ?? productsByLocale.en[productId];
}

export function listVlmPaidProducts(locale = "en"): VlmPaidProduct[] {
  const safeLocale = resolveVlmPaidLocale(locale);
  const r = productsByLocale[safeLocale];
  return [
    r.vlm_advanced_analysis_single,
    r.vlm_advanced_pdf_single,
    r.vlm_advanced_audit_human_review,
    r.audit_pro_review,
    r.shield_pro_basic_single,
    r.shield_pro_pro_single,
    r.shield_pro_advanced_single,
    r.real_markets_pro_single,
    r.real_markets_advanced_single,
    r.market_impact_single,
    r.whale_watch_single,
    r.risk_indicator_single,
  ];
}

export function normalizeVlmPaidProductId(value: unknown): VlmPaidProductId | null {
  const valid: VlmPaidProductId[] = [
    "vlm_advanced_analysis_single",
    "vlm_advanced_pdf_single",
    "vlm_advanced_audit_human_review",
    "audit_pro_review",
    "shield_pro_basic_single",
    "shield_pro_pro_single",
    "shield_pro_advanced_single",
    "real_markets_pro_single",
    "real_markets_advanced_single",
    "market_impact_single",
    "whale_watch_single",
    "risk_indicator_single",
  ];
  return valid.includes(value as VlmPaidProductId) ? (value as VlmPaidProductId) : null;
}

export function normalizePaidContext(input: Partial<VlmPaidAccessContext> | undefined, locale = "en"): VlmPaidAccessContext {
  const safeLocale = resolveVlmPaidLocale(input?.locale ?? locale);
  const surface = input?.surface === "shield" || input?.surface === "shield-pro" || input?.surface === "real-markets" || input?.surface === "browser" || input?.surface === "audit" || input?.surface === "market-impact" || input?.surface === "whale-watch" || input?.surface === "risk-indicator"
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
