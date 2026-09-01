import {
  VLM_CANONICAL_CUSTOMER_PRODUCTS,
  VLM_CANONICAL_PRODUCT_FAMILIES,
  VLM_CANONICAL_STANDALONE_PRODUCTS,
  VLM_CANONICAL_TIERED_FAMILIES,
  VLM_CONTEXT_TRANSITIONS,
  VLM_INTERNAL_EXECUTION_CONTEXTS,
  VLM_INTERNAL_EXECUTION_PROFILES,
  VLM_PRODUCT_TAXONOMY_RULES,
  VLM_REPORT_INTEGRATION_DEPTH,
  VLM_STANDALONE_INTEGRATION_RULES,
  VLM_V16_TOPOLOGY_DENOMINATORS,
} from "@/lib/product/vlm-canonical-product-topology";
export const PASS36_R44P16_CURRENT_SKU_TRUTH_ID =
  "pass36-a102r44p16-single-current-sku-truth" as const;
export const PASS36_R44P34_PRODUCT_TOPOLOGY_ID_COMPAT =
  "pass36-a102r44p34-canonical-product-topology" as const;
export const PASS36_R44P35_PRODUCT_TOPOLOGY_ID =
  "pass36-a102r44p35-canonical-product-topology" as const;

export type VlmCurrentSkuLocale = "pl" | "en" | "de";
export type VlmCurrentSkuTier = "basic" | "pro" | "advanced";
export type VlmCurrentSkuDecision =
  | "PILOT_ONLY_FREE_LIMITED_PRESCREEN"
  | "INVITATION_ONLY_CONTROLLED_BETA"
  | "NOT_FOR_SALE";
export type VlmCurrentSkuCommercialTarget = "GO_FREE" | "GO_PAID";

export type VlmCurrentSkuTruth = {
  schemaVersion: typeof PASS36_R44P16_CURRENT_SKU_TRUTH_ID;
  tier: VlmCurrentSkuTier;
  decision: VlmCurrentSkuDecision;
  commercialTarget: VlmCurrentSkuCommercialTarget;
  freeAccessGuaranteed: boolean;
  publicCheckoutAllowed: false;
  publicPrice: null;
  publicPriceLabel: string;
  actionLabel: string;
  availabilityLabel: string;
  description: string;
  manualQualityControlRequired: boolean;
  humanReviewIncluded: false;
  independentCertificationIncluded: false;
  customerFindingConfidence: "NOT_CALIBRATED";
  saleEnabled: false;
  live: false;
  boundaries: readonly string[];
};

const COPY: Record<VlmCurrentSkuLocale, Record<VlmCurrentSkuTier, Omit<VlmCurrentSkuTruth,
  "schemaVersion" | "tier" | "commercialTarget" | "freeAccessGuaranteed" | "publicCheckoutAllowed" | "publicPrice" | "humanReviewIncluded" |
  "independentCertificationIncluded" | "customerFindingConfidence" | "saleEnabled" | "live">>> = {
  pl: {
    basic: {
      decision: "PILOT_ONLY_FREE_LIMITED_PRESCREEN",
      publicPriceLabel: "Darmowy prescreen",
      actionLabel: "Zapisz darmowy prescreen",
      availabilityLabel: "Darmowy intake do kolejki prescreenu",
      description: "Bezpłatny intake do kolejki prescreenu. Obecny customer runtime zwraca sprawę i status; nie dostarcza jeszcze ukończonego wyniku analizy ani raportu.",
      manualQualityControlRequired: false,
      boundaries: ["Basic pozostaje darmowy", "nigdy nie wymaga płatności", "wynik analizy nie jest jeszcze dostarczany przez intake", "bez gwarancji bezpieczeństwa"],
    },
    pro: {
      decision: "INVITATION_ONLY_CONTROLLED_BETA",
      publicPriceLabel: "Beta wyłącznie na zaproszenie",
      actionLabel: "Poproś o dostęp do bety",
      availabilityLabel: "Kontrolowana beta na zaproszenie",
      description: "Automatyczna analiza informacyjna Pro jest przygotowywana do przyszłej sprzedaży, ale obecnie pozostaje wyłącznie kontrolowaną betą. Każdy raport wymaga wewnętrznej kontroli jakości przed dostarczeniem.",
      manualQualityControlRequired: true,
      boundaries: ["publiczny checkout wyłączony", "brak publicznej ceny", "bez certyfikacji", "bez obietnicy bezpiecznego kontraktu"],
    },
    advanced: {
      decision: "NOT_FOR_SALE",
      publicPriceLabel: "Nie na sprzedaż",
      actionLabel: "Niedostępne publicznie",
      availabilityLabel: "Advanced — nie na sprzedaż",
      description: "Automatyczny pakiet Advanced jest przygotowywany do przyszłej sprzedaży, ale pozostaje niedostępny publicznie do zamknięcia wszystkich bramek jakości, wartości i operacji. Nie zawiera przeglądu człowieka, podpisu operatora ani niezależnej certyfikacji.",
      manualQualityControlRequired: false,
      boundaries: ["publiczny checkout wyłączony", "brak publicznej ceny", "human review nie jest zawarty", "bez certyfikacji"],
    },
  },
  en: {
    basic: {
      decision: "PILOT_ONLY_FREE_LIMITED_PRESCREEN",
      publicPriceLabel: "Free prescreen",
      actionLabel: "Submit free prescreen",
      availabilityLabel: "Free prescreen queue intake",
      description: "Free prescreen queue intake. The current customer runtime returns a case and status; it does not yet deliver a completed analysis result or report.",
      manualQualityControlRequired: false,
      boundaries: ["Basic remains free", "payment is never required", "analysis result is not yet delivered by intake", "no safety guarantee"],
    },
    pro: {
      decision: "INVITATION_ONLY_CONTROLLED_BETA",
      publicPriceLabel: "Invitation-only beta",
      actionLabel: "Request beta access",
      availabilityLabel: "Controlled invitation-only beta",
      description: "Pro automated informational analysis is available only in a controlled beta. Every report requires internal quality control before delivery.",
      manualQualityControlRequired: true,
      boundaries: ["public checkout disabled", "no public price", "no certification", "no guaranteed-safe claim"],
    },
    advanced: {
      decision: "NOT_FOR_SALE",
      publicPriceLabel: "Not for sale",
      actionLabel: "Not publicly available",
      availabilityLabel: "Advanced — not for sale",
      description: "The automated Advanced package is being prepared for future sale but remains unavailable until all quality, value, and operational gates close. It includes no human review, operator sign-off, or independent certification.",
      manualQualityControlRequired: false,
      boundaries: ["public checkout disabled", "no public price", "human review is not included", "no certification"],
    },
  },
  de: {
    basic: {
      decision: "PILOT_ONLY_FREE_LIMITED_PRESCREEN",
      publicPriceLabel: "Kostenloser Prescreen",
      actionLabel: "Kostenlosen Prescreen einreichen",
      availabilityLabel: "Kostenloser Prescreen-Warteschlangen-Intake",
      description: "Kostenloser Prescreen-Warteschlangen-Intake. Der aktuelle Customer-Runtime liefert Fall und Status, aber noch kein fertiges Analyseergebnis oder Bericht.",
      manualQualityControlRequired: false,
      boundaries: ["Basic bleibt kostenlos", "Zahlung ist niemals erforderlich", "Analyseergebnis wird vom Intake noch nicht ausgeliefert", "keine Sicherheitsgarantie"],
    },
    pro: {
      decision: "INVITATION_ONLY_CONTROLLED_BETA",
      publicPriceLabel: "Beta nur auf Einladung",
      actionLabel: "Beta-Zugang anfragen",
      availabilityLabel: "Kontrollierte Beta nur auf Einladung",
      description: "Die automatisierte Pro-Informationsanalyse wird für einen späteren Verkauf vorbereitet, bleibt derzeit aber eine kontrollierte Beta. Jeder Bericht benötigt vor der Auslieferung eine interne Qualitätsprüfung.",
      manualQualityControlRequired: true,
      boundaries: ["öffentlicher Checkout deaktiviert", "kein öffentlicher Preis", "keine Zertifizierung", "keine Sicherheitsgarantie"],
    },
    advanced: {
      decision: "NOT_FOR_SALE",
      publicPriceLabel: "Nicht zum Verkauf",
      actionLabel: "Nicht öffentlich verfügbar",
      availabilityLabel: "Advanced — nicht zum Verkauf",
      description: "Das automatisierte Advanced-Paket wird für einen späteren Verkauf vorbereitet, bleibt aber bis zum Abschluss aller Qualitäts-, Wert- und Betriebs-Gates öffentlich nicht verfügbar. Es enthält kein Human Review, keinen Operator-Sign-off und keine unabhängige Zertifizierung.",
      manualQualityControlRequired: false,
      boundaries: ["öffentlicher Checkout deaktiviert", "kein öffentlicher Preis", "Human Review ist nicht enthalten", "keine Zertifizierung"],
    },
  },
};

export function resolveVlmCurrentSkuLocale(value: unknown): VlmCurrentSkuLocale {
  return value === "pl" || value === "de" || value === "en" ? value : "en";
}

export function getVlmCurrentSkuTruth(tier: VlmCurrentSkuTier, locale: unknown = "en"): VlmCurrentSkuTruth {
  const safeLocale = resolveVlmCurrentSkuLocale(locale);
  return {
    schemaVersion: PASS36_R44P16_CURRENT_SKU_TRUTH_ID,
    tier,
    ...COPY[safeLocale][tier],
    commercialTarget: tier === "basic" ? "GO_FREE" : "GO_PAID",
    freeAccessGuaranteed: tier === "basic",
    publicCheckoutAllowed: false,
    publicPrice: null,
    humanReviewIncluded: false,
    independentCertificationIncluded: false,
    customerFindingConfidence: "NOT_CALIBRATED",
    saleEnabled: false,
    live: false,
  };
}

export function tierForVlmProductId(productId: string): Exclude<VlmCurrentSkuTier, "basic"> | null {
  if (productId.startsWith("vlm_pro_")) return "pro";
  if (productId.startsWith("vlm_advanced_")) return "advanced";
  return null;
}

export function normalizeLegacyAuditQueueState(value: unknown):
  | "intake"
  | "analysis_queue"
  | "automated_analysis"
  | "needs_evidence"
  | "pdf_attached"
  | "customer_safe_ready"
  | "ready_for_download"
  | "delivered"
  | "blocked_redaction"
  | "unknown" {
  if (value === "human_review_queue" || value === "paid_waiting_human_review" || value === "queued_paid_review") return "analysis_queue";
  if (value === "human_review") return "automated_analysis";
  if (value === "queued" || value === "queued_basic_prescreen" || value === "fulfilment_pending") return "analysis_queue";
  if (value === "ready_for_download" || value === "delivered_to_account") return "ready_for_download";
  if (value === "intake" || value === "analysis_queue" || value === "automated_analysis" || value === "needs_evidence" || value === "pdf_attached" || value === "customer_safe_ready" || value === "delivered" || value === "blocked_redaction") return value;
  return "unknown";
}

export function currentSkuTruthSnapshot(locale: unknown = "en") {
  return {
    schemaVersion: PASS36_R44P16_CURRENT_SKU_TRUTH_ID,
    globalDecision: "NO_GO" as const,
    live: false,
    saleEnabled: false,
    productionApproved: false,
    worldClassProven: false,
    basicAlwaysFree: true,
    proAdvancedCommercialTarget: "GO_PAID_AFTER_EVIDENCE" as const,
    legacyTierSnapshotScope: "AUDIT_REPORT_ONLY" as const,
    currentCustomerTierModelScope: "FIVE_EXPLICIT_TIERED_FAMILIES_ONLY" as const,
    auditReportTiers: {
      basic: getVlmCurrentSkuTruth("basic", locale),
      pro: getVlmCurrentSkuTruth("pro", locale),
      advanced: getVlmCurrentSkuTruth("advanced", locale),
    },
    // Compatibility alias. This is Audit report scope, not a tier model for every Velmère module.
    tiers: {
      basic: getVlmCurrentSkuTruth("basic", locale),
      pro: getVlmCurrentSkuTruth("pro", locale),
      advanced: getVlmCurrentSkuTruth("advanced", locale),
    },
    customerProductTopology: {
      schemaVersion: PASS36_R44P35_PRODUCT_TOPOLOGY_ID,
      previousSchemaVersion: PASS36_R44P34_PRODUCT_TOPOLOGY_ID_COMPAT,
      products: VLM_CANONICAL_CUSTOMER_PRODUCTS,
      productFamilies: VLM_CANONICAL_PRODUCT_FAMILIES,
      tieredFamilies: VLM_CANONICAL_TIERED_FAMILIES,
      standaloneProductIds: VLM_CANONICAL_STANDALONE_PRODUCTS,
      internalExecutionContexts: VLM_INTERNAL_EXECUTION_CONTEXTS,
      internalExecutionProfiles: VLM_INTERNAL_EXECUTION_PROFILES,
      contextTransitions: VLM_CONTEXT_TRANSITIONS,
      denominators: VLM_V16_TOPOLOGY_DENOMINATORS,
      reportIntegrationDepth: VLM_REPORT_INTEGRATION_DEPTH,
      standaloneIntegrationRules: VLM_STANDALONE_INTEGRATION_RULES,
      pdfArtifactModel: {
        pdfIsSeparateProductFamily: false,
        auditPdfIsCustomerArtifactForEachAuditTier: true,
        browserPdfRemainsBrowserArtifactWhereImplemented: true,
      } as const,
      rules: VLM_PRODUCT_TAXONOMY_RULES,
    },
  };
}
