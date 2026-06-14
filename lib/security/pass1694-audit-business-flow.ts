import {
  buildAuditReportById,
  buildAuditReportQueue,
  type AuditReportQueueRecord,
} from "./pass1614-audit-report-queue";
import {
  buildAuditReportExportPayload,
  type AuditReportExportPayload,
} from "./pass1654-audit-pdf-shield-export";
import { type AuditReviewLevel } from "./pass1534-audit-review-flow";

export const PASS1694_AUDIT_BUSINESS_FLOW_ID = "pass1694-audit-watch-business-flow" as const;
export const PASS1694_AUDIT_BUSINESS_FLOW_TASKS = 148 as const;

export type AuditBusinessLocale = "pl" | "en" | "de";
export type AuditBusinessTone = "gold" | "cyan" | "emerald" | "amber" | "rose" | "neutral";
export type AuditBusinessTierId = "free_scan" | "basic_review" | "pro_review" | "advanced_review" | "disclosure_case";
export type AuditLeadPriority = "low" | "standard" | "high" | "private_disclosure";
export type AuditLeadRoute = "self_serve" | "review_desk" | "senior_triage" | "responsible_disclosure";

export type AuditBusinessTier = {
  id: AuditBusinessTierId;
  label: string;
  priceLabel: string;
  caption: string;
  bestFor: string;
  deliverables: string[];
  requirements: string[];
  boundary: string;
  cta: string;
  tone: AuditBusinessTone;
  reviewLevel: AuditReviewLevel | "disclosure";
};

export type AuditLeadCapturePacket = {
  passId: typeof PASS1694_AUDIT_BUSINESS_FLOW_ID;
  requestId: string;
  projectName: string;
  selectedTier: AuditBusinessTierId;
  priority: AuditLeadPriority;
  route: AuditLeadRoute;
  publicStatusRoute: string;
  exportRoute: string;
  adminInboxRoute: string;
  disclosureContactRequired: boolean;
  replyPromise: string;
  safeSalesCopy: string[];
  blockedSalesCopy: string[];
  nextOperatorActions: string[];
};

export type AuditBusinessFlow = {
  passId: typeof PASS1694_AUDIT_BUSINESS_FLOW_ID;
  taskCount: typeof PASS1694_AUDIT_BUSINESS_FLOW_TASKS;
  locale: AuditBusinessLocale;
  eyebrow: string;
  title: string;
  body: string;
  pricingTitle: string;
  pricingBody: string;
  routingTitle: string;
  routingBody: string;
  reportIdTitle: string;
  reportIdBody: string;
  premiumChecksTitle: string;
  premiumChecks: string[];
  tiers: AuditBusinessTier[];
  sampleLead: AuditLeadCapturePacket;
  sampleExport: AuditReportExportPayload;
  queue: AuditReportQueueRecord[];
  releaseGate: {
    hasPricingLanes: true;
    hasLeadCapturePacket: true;
    hasDisclosureRouting: true;
    hasReportIdPolish: true;
    noCertifiedSafe: true;
    noGuaranteedSecure: true;
    noInvestmentAdvice: true;
    noCustody: true;
    noSeedPhrase: true;
    activeTestingRequiresAuthorization: true;
  };
};

const copy = {
  pl: {
    eyebrow: "PASS1694 Audit Watch business flow",
    title: "Audit Watch jako realny produkt, nie tylko demo.",
    body:
      "Velmère może przyjmować zgłoszenia, prowadzić je przez bezpieczne pakiety review, generować publiczny status, pełny export i operator route bez obiecywania certyfikacji albo gwarancji bezpieczeństwa.",
    pricingTitle: "Pakiety review bez ryzykownych claimów",
    pricingBody:
      "Każdy pakiet ma jasny zakres, wymagane dowody i granicę: review/pre-audit, nie certyfikacja regulacyjna i nie porada inwestycyjna.",
    routingTitle: "Routing zgłoszeń i responsible disclosure",
    routingBody:
      "Free/Basic idą self-serve, Pro/Advanced do review desk, a wysokie ryzyko do private disclosure, zanim cokolwiek trafi publicznie.",
    reportIdTitle: "Report ID + public status polish",
    reportIdBody:
      "Każdy case dostaje ID, publiczny status, export payload, PDF outline, Shield Map graph i jasny stan redakcji.",
    premiumChecksTitle: "Premium release checks",
    premiumChecks: [
      "Pricing nie używa Certified Safe / No Risk.",
      "Lead capture nie prosi o seed phrase ani custody.",
      "Active testing jest blokowane bez zgody/scope.",
      "High-risk detail idzie do private disclosure.",
      "Public badge language zostaje Evidence Checked / Audit Checked.",
      "Request flow pokazuje, czego brakuje przed wyższym confidence cap.",
    ],
  },
  en: {
    eyebrow: "PASS1694 Audit Watch business flow",
    title: "Audit Watch as a real product, not only a demo.",
    body:
      "Velmère can accept review requests, route them through safe review packages, generate public status, full export and operator routing without pretending to certify safety.",
    pricingTitle: "Review packages without risky claims",
    pricingBody:
      "Every package has scope, required evidence and a clear boundary: review/pre-audit, not regulatory certification and not investment advice.",
    routingTitle: "Request routing and responsible disclosure",
    routingBody:
      "Free/Basic stay self-serve, Pro/Advanced route to the review desk, and high risk goes to private disclosure before anything becomes public.",
    reportIdTitle: "Report ID + public status polish",
    reportIdBody:
      "Every case gets an ID, public status, export payload, PDF outline, Shield Map graph and clear redaction state.",
    premiumChecksTitle: "Premium release checks",
    premiumChecks: [
      "Pricing never uses Certified Safe / No Risk.",
      "Lead capture never asks for seed phrases or custody.",
      "Active testing is blocked without permission/scope.",
      "High-risk detail routes to private disclosure.",
      "Public badge language stays Evidence Checked / Audit Checked.",
      "Request flow explains missing evidence before a higher confidence cap.",
    ],
  },
  de: {
    eyebrow: "PASS1694 Audit Watch business flow",
    title: "Audit Watch als echtes Produkt, nicht nur als Demo.",
    body:
      "Velmère kann Review-Anfragen annehmen, sicher routen, Public Status, Full Export und Operator Routing erzeugen, ohne Sicherheit zu zertifizieren.",
    pricingTitle: "Review Pakete ohne riskante Claims",
    pricingBody:
      "Jedes Paket hat Scope, Required Evidence und klare Boundary: Review/Pre-Audit, keine regulatorische Zertifizierung und keine Anlageberatung.",
    routingTitle: "Request Routing und Responsible Disclosure",
    routingBody:
      "Free/Basic bleiben self-serve, Pro/Advanced gehen zum Review Desk, High Risk geht vor Veröffentlichung in private Disclosure.",
    reportIdTitle: "Report ID + Public Status polish",
    reportIdBody:
      "Jeder Case erhält ID, Public Status, Export Payload, PDF Outline, Shield Map Graph und klaren Redaction State.",
    premiumChecksTitle: "Premium release checks",
    premiumChecks: [
      "Pricing nutzt nie Certified Safe / No Risk.",
      "Lead Capture fragt nie nach Seed Phrases oder Custody.",
      "Aktive Tests sind ohne Permission/Scope blockiert.",
      "High-Risk Detail geht in private Disclosure.",
      "Public Badge Language bleibt Evidence Checked / Audit Checked.",
      "Request Flow zeigt Missing Evidence vor höherem Confidence Cap.",
    ],
  },
} satisfies Record<AuditBusinessLocale, Omit<AuditBusinessFlow, "passId" | "taskCount" | "locale" | "tiers" | "sampleLead" | "sampleExport" | "queue" | "releaseGate">>;

function resolveLocale(locale: string): AuditBusinessLocale {
  return locale === "pl" || locale === "de" || locale === "en" ? locale : "en";
}

const tiersBase: Omit<AuditBusinessTier, "label" | "caption" | "bestFor" | "cta" | "deliverables" | "requirements" | "boundary">[] = [
  { id: "free_scan", priceLabel: "Free", tone: "neutral", reviewLevel: "free_scan" },
  { id: "basic_review", priceLabel: "Free", tone: "cyan", reviewLevel: "basic_review" },
  { id: "pro_review", priceLabel: "Request quote", tone: "gold", reviewLevel: "pro_review" },
  { id: "advanced_review", priceLabel: "89.99€", tone: "emerald", reviewLevel: "advanced_review" },
  { id: "disclosure_case", priceLabel: "Private", tone: "rose", reviewLevel: "disclosure" },
];

const tierCopy = {
  pl: {
    free_scan: ["Free Scan", "Szybki publiczny pre-check dla kontraktu lub audytu.", "Użytkownik sprawdzający badge", "Start free scan"],
    basic_review: ["Velmère Basic Audit", "Darmowy audyt przy użyciu technologii VLM, dostarczany jako wiadomość na koncie do 24h.", "Użytkownik / mały projekt", "Request Basic"],
    pro_review: ["Pro Review", "Manual-assisted scope freshness, admin-risk and Shield Map graph.", "Projekt z audytem i tokenem", "Request Pro"],
    advanced_review: ["Velmère Advanced Audit", "VLM system + ręczna weryfikacja Velmère, signed receipt i klient-ready report za 89.99€.", "Projekt chcący human-reviewed review", "Order Advanced"],
    disclosure_case: ["Disclosure Case", "Prywatny routing dla wysokiego ryzyka i wrażliwych findingów.", "High-risk finding", "Route privately"],
  },
  en: {
    free_scan: ["Free Scan", "A fast public pre-check for a contract or audit claim.", "User checking a badge", "Start free scan"],
    basic_review: ["Velmère Basic Audit", "Free audit powered by VLM technology, delivered as an account message within 24h.", "User / small project", "Request Basic"],
    pro_review: ["Pro Review", "Manual-assisted scope freshness, admin-risk and Shield Map graph.", "Audited token project", "Request Pro"],
    advanced_review: ["Velmère Advanced Audit", "VLM system + Velmère human verification, signed receipt and client-ready report for 89.99€.", "Project needing human-reviewed review", "Order Advanced"],
    disclosure_case: ["Disclosure Case", "Private routing for high-risk and sensitive findings.", "High-risk finding", "Route privately"],
  },
  de: {
    free_scan: ["Free Scan", "Schneller öffentlicher Pre-Check für Contract oder Audit Claim.", "User prüft Badge", "Free Scan starten"],
    basic_review: ["Velmère Basic Audit", "Kostenloser Audit mit VLM Technologie, geliefert als Kontonachricht innerhalb von 24h.", "User / kleines Projekt", "Basic anfragen"],
    pro_review: ["Pro Review", "Manual-assisted Scope Freshness, Admin Risk und Shield Map Graph.", "Audited Token Projekt", "Pro anfragen"],
    advanced_review: ["Velmère Advanced Audit", "VLM System + Velmère Human Verification, signed receipt und client-ready report für 89.99€.", "Projekt mit human-reviewed Bedarf", "Advanced bestellen"],
    disclosure_case: ["Disclosure Case", "Privates Routing für High-Risk und sensitive Findings.", "High-risk finding", "Privat routen"],
  },
} satisfies Record<AuditBusinessLocale, Record<AuditBusinessTierId, string[]>>;

function tierDeliverables(id: AuditBusinessTierId): string[] {
  const shared = ["public status card", "safe badge language", "no custody / no seed boundary"];
  if (id === "free_scan") return ["audit claim pre-check", "missing evidence list", ...shared];
  if (id === "basic_review") return ["Lens PDF outline", "findings table", "scope/freshness matrix", ...shared];
  if (id === "pro_review") return ["manual-assisted triage", "Shield Map evidence graph", "admin/control review", "source freshness notes", ...shared];
  if (id === "advanced_review") return ["operator checklist", "redaction workflow", "client-ready export", "disclosure boundary", ...shared];
  return ["private disclosure route", "redacted public summary", "contact log required", "no exploit public detail"];
}

function tierRequirements(id: AuditBusinessTierId): string[] {
  if (id === "free_scan") return ["contract or audit URL", "chain", "project website optional"];
  if (id === "basic_review") return ["contract address", "public audit URL", "website/docs", "contact email recommended"];
  if (id === "pro_review") return ["contract", "audit report", "docs/GitHub", "admin/proxy context", "disclosure contact"];
  if (id === "advanced_review") return ["written permission/scope", "client contact", "docs/GitHub", "deployment history", "private notes channel"];
  return ["responsible disclosure contact", "authorization/scope", "private handling", "redaction before public"];
}

function buildTiers(locale: AuditBusinessLocale): AuditBusinessTier[] {
  return tiersBase.map((base) => {
    const [label, caption, bestFor, cta] = tierCopy[locale][base.id];
    return {
      ...base,
      label,
      caption,
      bestFor,
      cta,
      deliverables: tierDeliverables(base.id),
      requirements: tierRequirements(base.id),
      boundary: base.id === "disclosure_case"
        ? "Private first. Public output only after responsible disclosure and redaction."
        : "Review/pre-audit only. Not a regulatory certification and not a safety guarantee.",
    };
  });
}

function priorityFor(record: AuditReportQueueRecord): AuditLeadPriority {
  if (record.lensExport.redactionRequired || record.status === "private_disclosure") return "private_disclosure";
  if (record.reviewLevel === "advanced_review") return "high";
  if (record.reviewLevel === "pro_review" || record.reviewLevel === "basic_review") return "standard";
  return "low";
}

function routeFor(priority: AuditLeadPriority, level: AuditReviewLevel): AuditLeadRoute {
  if (priority === "private_disclosure") return "responsible_disclosure";
  if (priority === "high") return "senior_triage";
  if (level === "pro_review" || level === "basic_review") return "review_desk";
  return "self_serve";
}

export function buildAuditLeadCapturePacket(id = "sample", locale = "en"): AuditLeadCapturePacket {
  const safeLocale = resolveLocale(locale);
  const record = buildAuditReportById(id, safeLocale);
  const priority = priorityFor(record);
  const route = routeFor(priority, record.reviewLevel);
  return {
    passId: PASS1694_AUDIT_BUSINESS_FLOW_ID,
    requestId: record.reportId,
    projectName: record.projectName,
    selectedTier: record.lane === "disclosure" ? "disclosure_case" : record.reviewLevel,
    priority,
    route,
    publicStatusRoute: record.publicRoute,
    exportRoute: `/${safeLocale}/security/audits/export/${record.slug}`,
    adminInboxRoute: record.adminRoute,
    disclosureContactRequired: priority === "private_disclosure" || record.reviewLevel === "advanced_review",
    replyPromise: route === "self_serve" ? "instant preview packet" : route === "responsible_disclosure" ? "private triage before public update" : "operator review queue",
    safeSalesCopy: ["Velmère Audit Checked", "Evidence Checked", "Pre-Audit Review", "No custody", "No seed phrases", "No investment advice"],
    blockedSalesCopy: ["Certified Safe", "No Risk", "Guaranteed secure", "Approved investment", "We custody assets", "Send seed phrase"],
    nextOperatorActions: record.nextActions.concat([
      "Choose public/private lane before publishing.",
      "Attach Lens PDF export only after redaction state is clear.",
      "Keep active testing blocked until authorization is documented.",
    ]),
  };
}

export function buildAuditBusinessFlow(locale = "en", id = "sample"): AuditBusinessFlow {
  const safeLocale = resolveLocale(locale);
  return {
    passId: PASS1694_AUDIT_BUSINESS_FLOW_ID,
    taskCount: PASS1694_AUDIT_BUSINESS_FLOW_TASKS,
    locale: safeLocale,
    ...copy[safeLocale],
    tiers: buildTiers(safeLocale),
    sampleLead: buildAuditLeadCapturePacket(id, safeLocale),
    sampleExport: buildAuditReportExportPayload(id, safeLocale),
    queue: buildAuditReportQueue(safeLocale),
    releaseGate: {
      hasPricingLanes: true,
      hasLeadCapturePacket: true,
      hasDisclosureRouting: true,
      hasReportIdPolish: true,
      noCertifiedSafe: true,
      noGuaranteedSecure: true,
      noInvestmentAdvice: true,
      noCustody: true,
      noSeedPhrase: true,
      activeTestingRequiresAuthorization: true,
    },
  };
}
