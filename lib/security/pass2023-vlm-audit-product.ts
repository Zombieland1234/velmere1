import type { AuditReviewLevel, AuditReviewPreview, AuditReviewSubmission } from "./pass1534-audit-review-flow";

export const PASS2023_VLM_AUDIT_PRODUCT_ID = "pass2023-vlm-audit-product-account-messages" as const;
export const PASS2023_VLM_AUDIT_PRODUCT_TASKS = 96 as const;

export type VlmAuditLocale = "pl" | "en" | "de";
export type VlmAuditPackageId = "basic_audit" | "advanced_human_review" | "enterprise_manual";
export type VlmAuditMessageStatus = "received" | "queued" | "payment_pending" | "human_review" | "ready" | "needs_evidence";
export type VlmAuditFindingVisibility = "public_summary" | "client_only" | "redacted_until_disclosure";
export type VlmAuditSignalTone = "good" | "watch" | "risk" | "neutral";

export type VlmAuditPackage = {
  id: VlmAuditPackageId;
  label: string;
  price: string;
  headline: string;
  body: string;
  delivery: string;
  cta: string;
  reviewLevel: AuditReviewLevel;
  humanReviewed: boolean;
  deliverables: string[];
  boundaries: string[];
};

export type VlmAuditDemoProject = {
  id: string;
  asset: string;
  chain: string;
  publicAudit: string;
  vlmStatus: string;
  tone: VlmAuditSignalTone;
  visibility: VlmAuditFindingVisibility;
  summary: string;
  safeDetail: string;
};

export type VlmAuditAccountMessage = {
  id: string;
  title: string;
  body: string;
  status: VlmAuditMessageStatus;
  packageLabel: string;
  requestId: string;
  createdAt: string;
  eta: string;
  accountRoute: string;
  nextSteps: string[];
};

export type VlmAuditProductPage = {
  passId: typeof PASS2023_VLM_AUDIT_PRODUCT_ID;
  taskCount: typeof PASS2023_VLM_AUDIT_PRODUCT_TASKS;
  locale: VlmAuditLocale;
  eyebrow: string;
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  searchHelper: string;
  submitBasic: string;
  submitAdvanced: string;
  accountMessageTitle: string;
  accountMessageBody: string;
  priceExplanationTitle: string;
  priceExplanationBody: string;
  humanReviewTitle: string;
  humanReviewBody: string;
  tableTitle: string;
  tableBody: string;
  safetyBoundary: string;
  packages: VlmAuditPackage[];
  demoProjects: VlmAuditDemoProject[];
  scorecard: { label: string; percent: number; note: string }[];
  forbiddenClaims: string[];
  approvedClaims: string[];
};

function resolveLocale(locale: string): VlmAuditLocale {
  return locale === "pl" || locale === "de" || locale === "en" ? locale : "en";
}

const approvedClaims = [
  "AI-assisted security review",
  "human-reviewed advanced report",
  "evidence checked",
  "pre-audit intelligence",
  "no custody",
  "no seed phrase",
  "no investment advice",
];

const forbiddenClaims = [
  "certified safe",
  "no risk",
  "guaranteed secure",
  "approved investment",
  "better than every top audit firm",
  "send seed phrase",
  "public exploit instructions",
];

const packagesByLocale = {
  pl: [
    {
      id: "basic_audit",
      label: "Velmère Basic Audit",
      price: "Free",
      headline: "Audyt przy użyciu technologii VLM.",
      body: "Darmowy, technologiczny pre-audit: VLM Brain sprawdza widoczne ryzyka, publiczny audyt, braki dowodów, scope, źródła i podstawowe sygnały kontraktu.",
      delivery: "Wiadomość na koncie klienta w ciągu 24h.",
      cta: "Wyślij Basic Audit",
      reviewLevel: "basic_review",
      humanReviewed: false,
      deliverables: ["risk snapshot", "audit claim check", "missing evidence", "public-source confidence", "account message"],
      boundaries: ["technologia VLM", "bez exploita", "bez gwarancji bezpieczeństwa", "bez porad inwestycyjnych"],
    },
    {
      id: "advanced_human_review",
      label: "Velmère Advanced Audit",
      price: "89.99€",
      headline: "System VLM + ręczna weryfikacja Velmère.",
      body: "Płatny audyt hybrydowy: VLM Brain, Shadow Review, Evidence Quorum, Source Integrity, podpisany raport i końcowa kontrola przez osobę z Velmère przed dostarczeniem klientowi.",
      delivery: "Raport trafia jako wiadomość na konto klienta po weryfikacji.",
      cta: "Zamów Advanced — 89.99€",
      reviewLevel: "advanced_review",
      humanReviewed: true,
      deliverables: ["human-reviewed report", "technical risk map", "audit recheck", "signed receipt", "private disclosure note"],
      boundaries: ["skoncentrowany zakres", "nie enterprise retest", "detale high-risk prywatnie", "bez Certified Safe"],
    },
    {
      id: "enterprise_manual",
      label: "Velmère Manual Security Audit",
      price: "Custom",
      headline: "Pełny zakres dla projektów i partnerów.",
      body: "Późniejszy pakiet enterprise: formalny scope, komunikacja z zespołem, ręczny review, poprawki, retest i responsible disclosure.",
      delivery: "Indywidualny termin po ustaleniu zakresu.",
      cta: "Zapytaj o Enterprise",
      reviewLevel: "pro_review",
      humanReviewed: true,
      deliverables: ["manual scope", "team communication", "remediation cycle", "formal retest", "partner report"],
      boundaries: ["tylko po zgodzie", "scope wymagany", "wycena indywidualna", "brak aktywnych testów bez autoryzacji"],
    },
  ],
  en: [
    {
      id: "basic_audit",
      label: "Velmère Basic Audit",
      price: "Free",
      headline: "Audit powered by VLM technology.",
      body: "A free technology-driven pre-audit: VLM Brain checks visible risks, public audit claims, missing evidence, scope, sources and basic contract signals.",
      delivery: "Message delivered to the client account within 24h.",
      cta: "Submit Basic Audit",
      reviewLevel: "basic_review",
      humanReviewed: false,
      deliverables: ["risk snapshot", "audit claim check", "missing evidence", "public-source confidence", "account message"],
      boundaries: ["VLM technology", "no exploit detail", "no safety guarantee", "no investment advice"],
    },
    {
      id: "advanced_human_review",
      label: "Velmère Advanced Audit",
      price: "89.99€",
      headline: "VLM system + Velmère human verification.",
      body: "A paid hybrid audit: VLM Brain, Shadow Review, Evidence Quorum, Source Integrity, signed report and final review by a Velmère analyst before delivery.",
      delivery: "The report is delivered as an account message after review.",
      cta: "Order Advanced — 89.99€",
      reviewLevel: "advanced_review",
      humanReviewed: true,
      deliverables: ["human-reviewed report", "technical risk map", "audit recheck", "signed receipt", "private disclosure note"],
      boundaries: ["focused scope", "not enterprise retest", "high-risk detail private", "no Certified Safe"],
    },
    {
      id: "enterprise_manual",
      label: "Velmère Manual Security Audit",
      price: "Custom",
      headline: "Full scope for projects and partners.",
      body: "A later enterprise package: formal scope, team communication, manual review, remediation, retest and responsible disclosure.",
      delivery: "Custom delivery timeline after scope agreement.",
      cta: "Ask for Enterprise",
      reviewLevel: "pro_review",
      humanReviewed: true,
      deliverables: ["manual scope", "team communication", "remediation cycle", "formal retest", "partner report"],
      boundaries: ["permission required", "scope required", "custom pricing", "no active testing without authorization"],
    },
  ],
  de: [
    {
      id: "basic_audit",
      label: "Velmère Basic Audit",
      price: "Free",
      headline: "Audit mit VLM Technologie.",
      body: "Ein kostenloser technologiegestützter Pre-Audit: VLM Brain prüft sichtbare Risiken, öffentliche Audit Claims, Missing Evidence, Scope, Quellen und Basis-Contract-Signale.",
      delivery: "Nachricht im Kundenkonto innerhalb von 24h.",
      cta: "Basic Audit senden",
      reviewLevel: "basic_review",
      humanReviewed: false,
      deliverables: ["risk snapshot", "audit claim check", "missing evidence", "public-source confidence", "account message"],
      boundaries: ["VLM technology", "keine Exploit-Details", "keine Sicherheitsgarantie", "keine Anlageberatung"],
    },
    {
      id: "advanced_human_review",
      label: "Velmère Advanced Audit",
      price: "89.99€",
      headline: "VLM System + Velmère Human Verification.",
      body: "Ein bezahlter Hybrid-Audit: VLM Brain, Shadow Review, Evidence Quorum, Source Integrity, signierter Report und finale Prüfung durch Velmère vor Lieferung.",
      delivery: "Der Report wird nach Review als Kontonachricht geliefert.",
      cta: "Advanced bestellen — 89.99€",
      reviewLevel: "advanced_review",
      humanReviewed: true,
      deliverables: ["human-reviewed report", "technical risk map", "audit recheck", "signed receipt", "private disclosure note"],
      boundaries: ["fokussierter Scope", "kein Enterprise Retest", "High-Risk Details privat", "kein Certified Safe"],
    },
    {
      id: "enterprise_manual",
      label: "Velmère Manual Security Audit",
      price: "Custom",
      headline: "Full Scope für Projekte und Partner.",
      body: "Späteres Enterprise Paket: formaler Scope, Team-Kommunikation, manueller Review, Remediation, Retest und Responsible Disclosure.",
      delivery: "Individuelle Timeline nach Scope Agreement.",
      cta: "Enterprise anfragen",
      reviewLevel: "pro_review",
      humanReviewed: true,
      deliverables: ["manual scope", "team communication", "remediation cycle", "formal retest", "partner report"],
      boundaries: ["permission required", "scope required", "custom pricing", "keine aktiven Tests ohne Autorisierung"],
    },
  ],
} satisfies Record<VlmAuditLocale, VlmAuditPackage[]>;

const demoProjectsByLocale = {
  pl: [
    ["AURX", "Ethereum", "Public audit found", "Additional review points", "watch", "Publiczny audyt istnieje, ale VLM oznacza możliwe braki w zakresie proxy/admin.", "Szczegóły techniczne ukryte do walidacji i responsible disclosure."],
    ["OMNI", "BSC", "Audit badge found", "Scope mismatch", "risk", "Badge audytu nie wystarcza, jeżeli deployment lub moduły po audycie nie pasują do raportu.", "Pokazujemy klasę ryzyka, nie instrukcję wykorzystania."],
    ["LUNA-X", "Arbitrum", "No public audit confirmed", "Needs evidence", "neutral", "Nie znaleziono wystarczającego publicznego śladu audytu dla pełnego confidence.", "Basic może wskazać missing data, Advanced wymaga źródeł."],
    ["NOVA", "Base", "Public audit found", "Clean pre-screen", "good", "Nie wykryto krytycznego sygnału w publicznym pre-screenie, ale to nie jest gwarancja bezpieczeństwa.", "Confidence zostaje ograniczony przez dostępność danych."],
    ["MANT", "Polygon", "Audit found", "Disclosure pending", "risk", "VLM oznacza obszar wymagający prywatnej weryfikacji przed publikacją szczegółów.", "Najpierw kontakt/scope, potem ewentualny publiczny status."],
  ],
  en: [
    ["AURX", "Ethereum", "Public audit found", "Additional review points", "watch", "A public audit exists, but VLM flags possible proxy/admin coverage gaps.", "Technical detail stays hidden until validation and responsible disclosure."],
    ["OMNI", "BSC", "Audit badge found", "Scope mismatch", "risk", "An audit badge is not enough if deployment or later modules do not match the report.", "We show the risk class, not exploit instructions."],
    ["LUNA-X", "Arbitrum", "No public audit confirmed", "Needs evidence", "neutral", "No sufficient public audit trail was found for full confidence.", "Basic can show missing data; Advanced requires source evidence."],
    ["NOVA", "Base", "Public audit found", "Clean pre-screen", "good", "No critical signal was detected in the public pre-screen, but this is not a safety guarantee.", "Confidence remains capped by data availability."],
    ["MANT", "Polygon", "Audit found", "Disclosure pending", "risk", "VLM flags an area that requires private verification before public detail.", "Contact/scope first, then possible public status."],
  ],
  de: [
    ["AURX", "Ethereum", "Public audit found", "Additional review points", "watch", "Ein öffentlicher Audit existiert, aber VLM markiert mögliche Proxy/Admin Scope Gaps.", "Technische Details bleiben bis Validierung und Responsible Disclosure verborgen."],
    ["OMNI", "BSC", "Audit badge found", "Scope mismatch", "risk", "Ein Audit Badge reicht nicht, wenn Deployment oder spätere Module nicht zum Report passen.", "Wir zeigen die Risikoklasse, nicht die Exploit-Anleitung."],
    ["LUNA-X", "Arbitrum", "No public audit confirmed", "Needs evidence", "neutral", "Kein ausreichender öffentlicher Audit-Trail für volles Confidence gefunden.", "Basic zeigt Missing Data; Advanced braucht Source Evidence."],
    ["NOVA", "Base", "Public audit found", "Clean pre-screen", "good", "Kein kritisches Signal im öffentlichen Pre-Screen erkannt, aber keine Sicherheitsgarantie.", "Confidence bleibt durch Datenverfügbarkeit begrenzt."],
    ["MANT", "Polygon", "Audit found", "Disclosure pending", "risk", "VLM markiert einen Bereich, der private Verifikation vor öffentlichen Details braucht.", "Erst Kontakt/Scope, dann möglicher Public Status."],
  ],
} satisfies Record<VlmAuditLocale, readonly (readonly [string, string, string, string, VlmAuditSignalTone, string, string])[]>;

const copy = {
  pl: {
    eyebrow: "Velmère Audit",
    title: "Czysty audyt technologiczny z wiadomością na koncie.",
    subtitle: "Wklej kontrakt, token albo publiczny raport. Basic Audit idzie jako darmowy review technologii VLM, a Advanced łączy VLM Brain z ręczną weryfikacją Velmère.",
    searchPlaceholder: "Wklej adres kontraktu, nazwę tokena albo link do publicznego audytu…",
    searchHelper: "Bez seed phrase, bez custody, bez publicznych instrukcji exploita. Wynik trafia do konta klienta.",
    submitBasic: "Basic Audit — Free",
    submitAdvanced: "Advanced Audit",
    accountMessageTitle: "Wiadomość na koncie klienta",
    accountMessageBody: "Po wysłaniu zgłoszenia klient dostaje status w koncie. Basic ma obietnicę do 24h; Advanced trafia do kolejki human-reviewed.",
    priceExplanationTitle: "Dlaczego Advanced kosztuje 89.99€?",
    priceExplanationBody: "Cena jest niższa niż klasyczne audyty, bo Velmère automatyzuje pierwszą warstwę analizy przez VLM Brain, Shadow Review, Evidence Quorum i signed receipts. Płatność dotyczy skoncentrowanego, ręcznie sprawdzanego security review, a nie wielotygodniowego enterprise retestu.",
    humanReviewTitle: "System + człowiek",
    humanReviewBody: "VLM Brain znajduje sygnały, Shadow Brain je podważa, Evidence Quorum ocenia źródła, a Advanced jest sprawdzany przez Velmère przed dostarczeniem raportu.",
    tableTitle: "VLM Brain: przykładowe 5 projektów",
    tableBody: "Tabela pokazuje, że sam znaczek audited nie wystarcza. VLM może oznaczyć braki scope, stare dane albo obszar do prywatnej weryfikacji bez publikowania exploita.",
    safetyBoundary: "Velmère Audit nie jest gwarancją bezpieczeństwa, certyfikacją regulacyjną ani poradą inwestycyjną.",
  },
  en: {
    eyebrow: "Velmère Audit",
    title: "Clean technology audit with account delivery.",
    subtitle: "Paste a contract, token or public audit report. Basic Audit is a free VLM technology review, while Advanced combines VLM Brain with Velmère human verification.",
    searchPlaceholder: "Paste contract address, token name or public audit link…",
    searchHelper: "No seed phrase, no custody, no public exploit instructions. The result is delivered to the client account.",
    submitBasic: "Basic Audit — Free",
    submitAdvanced: "Advanced Audit",
    accountMessageTitle: "Client account message",
    accountMessageBody: "After submission, the client receives a status message in the account. Basic promises delivery within 24h; Advanced routes to a human-reviewed queue.",
    priceExplanationTitle: "Why is Advanced 89.99€?",
    priceExplanationBody: "The price is lower than traditional audits because Velmère automates the first review layer with VLM Brain, Shadow Review, Evidence Quorum and signed receipts. The paid product is a focused human-reviewed security review, not a multi-week enterprise retest.",
    humanReviewTitle: "System + human",
    humanReviewBody: "VLM Brain finds signals, Shadow Brain challenges them, Evidence Quorum scores sources, and Advanced is reviewed by Velmère before delivery.",
    tableTitle: "VLM Brain: sample 5 projects",
    tableBody: "The table shows that an audited badge is not enough. VLM can flag scope gaps, stale evidence or private verification areas without publishing exploit detail.",
    safetyBoundary: "Velmère Audit is not a safety guarantee, regulatory certification or investment advice.",
  },
  de: {
    eyebrow: "Velmère Audit",
    title: "Cleaner Technologie-Audit mit Konto-Lieferung.",
    subtitle: "Contract, Token oder öffentlichen Audit Report einfügen. Basic Audit ist ein kostenloser VLM Technology Review, Advanced kombiniert VLM Brain mit Velmère Human Verification.",
    searchPlaceholder: "Contract address, Token Name oder Public Audit Link einfügen…",
    searchHelper: "Keine Seed Phrase, kein Custody, keine öffentlichen Exploit-Anleitungen. Das Ergebnis kommt ins Kundenkonto.",
    submitBasic: "Basic Audit — Free",
    submitAdvanced: "Advanced Audit",
    accountMessageTitle: "Kundennachricht im Konto",
    accountMessageBody: "Nach Absenden erhält der Kunde eine Statusnachricht im Konto. Basic innerhalb von 24h; Advanced geht in eine human-reviewed Queue.",
    priceExplanationTitle: "Warum kostet Advanced 89.99€?",
    priceExplanationBody: "Der Preis ist niedriger als klassische Audits, weil Velmère die erste Review-Schicht mit VLM Brain, Shadow Review, Evidence Quorum und signed receipts automatisiert. Das bezahlte Produkt ist ein fokussierter human-reviewed Security Review, kein wochenlanger Enterprise Retest.",
    humanReviewTitle: "System + Mensch",
    humanReviewBody: "VLM Brain findet Signale, Shadow Brain prüft dagegen, Evidence Quorum bewertet Quellen und Advanced wird vor Lieferung durch Velmère geprüft.",
    tableTitle: "VLM Brain: 5 Beispielprojekte",
    tableBody: "Die Tabelle zeigt: ein Audit Badge reicht nicht. VLM kann Scope Gaps, veraltete Evidenz oder private Verifikationsbereiche markieren, ohne Exploit-Details zu veröffentlichen.",
    safetyBoundary: "Velmère Audit ist keine Sicherheitsgarantie, regulatorische Zertifizierung oder Anlageberatung.",
  },
} satisfies Record<VlmAuditLocale, Omit<VlmAuditProductPage, "passId" | "taskCount" | "locale" | "packages" | "demoProjects" | "scorecard" | "forbiddenClaims" | "approvedClaims">>;

function demoProjects(locale: VlmAuditLocale): VlmAuditDemoProject[] {
  return demoProjectsByLocale[locale].map(([asset, chain, publicAudit, vlmStatus, tone, summary, safeDetail]) => ({
    id: `${asset.toLowerCase()}-${chain.toLowerCase()}`,
    asset,
    chain,
    publicAudit,
    vlmStatus,
    tone,
    visibility: tone === "risk" ? "redacted_until_disclosure" : tone === "watch" ? "client_only" : "public_summary",
    summary,
    safeDetail,
  }));
}

export function buildVlmAuditProductPage(locale = "en"): VlmAuditProductPage {
  const safeLocale = resolveLocale(locale);
  const scorecard = safeLocale === "pl" ? [
    { label: "Strona audytu", percent: 74, note: "Była funkcjonalna, ale za ciężka wizualnie i produktowo." },
    { label: "Clean search", percent: 92, note: "Nowy intake jest prosty: jeden input, dwa przyciski, zero chaosu." },
    { label: "Basic Free", percent: 90, note: "Jasny darmowy audyt technologii VLM z dostawą do 24h." },
    { label: "Advanced 89.99€", percent: 88, note: "Checkout i token dostępu są gotowe; produkcyjnie trzeba ustawić Stripe env, sekret i DB/webhook." },
    { label: "Wiadomości konta", percent: 82, note: "Działa jako account message contract/local preview; produkcyjnie trzeba podpiąć DB." },
    { label: "Premium trust", percent: 89, note: "Język jest spokojny, premium i prawnie bezpieczniejszy." },
  ] : [
    { label: "Audit page", percent: 74, note: "Previously functional but too heavy as a product surface." },
    { label: "Clean search", percent: 92, note: "New intake uses one input, two actions and less noise." },
    { label: "Basic Free", percent: 90, note: "Clear free VLM technology audit with 24h delivery promise." },
    { label: "Advanced 89.99€", percent: 88, note: "Checkout and access token gate are ready; production still needs Stripe env, secret and DB/webhook." },
    { label: "Account messages", percent: 82, note: "Works as account message contract/local preview; production needs DB persistence." },
    { label: "Premium trust", percent: 89, note: "Copy is calm, premium and safer legally." },
  ];

  return {
    passId: PASS2023_VLM_AUDIT_PRODUCT_ID,
    taskCount: PASS2023_VLM_AUDIT_PRODUCT_TASKS,
    locale: safeLocale,
    ...copy[safeLocale],
    packages: packagesByLocale[safeLocale],
    demoProjects: demoProjects(safeLocale),
    scorecard,
    forbiddenClaims,
    approvedClaims,
  };
}

export function packageForReviewLevel(level: AuditReviewLevel | undefined, locale = "en"): VlmAuditPackage {
  const page = buildVlmAuditProductPage(locale);
  if (level === "advanced_review") return page.packages.find((pkg) => pkg.id === "advanced_human_review") ?? page.packages[1];
  if (level === "pro_review") return page.packages.find((pkg) => pkg.id === "enterprise_manual") ?? page.packages[2];
  return page.packages.find((pkg) => pkg.id === "basic_audit") ?? page.packages[0];
}

function stableHash(input: string): string {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, "0").toUpperCase();
}

export function buildVlmAuditAccountMessage(args: {
  locale?: string;
  submission: Partial<AuditReviewSubmission>;
  preview?: AuditReviewPreview;
  now?: Date;
}): VlmAuditAccountMessage {
  const safeLocale = resolveLocale(args.locale ?? "en");
  const pkg = packageForReviewLevel(args.submission.reviewLevel, safeLocale);
  const now = args.now ?? new Date();
  const requestId = args.preview?.requestId ?? `VLM-AUD-${now.getUTCFullYear()}-${stableHash(JSON.stringify(args.submission))}`;
  const project = args.submission.projectName || args.submission.contractAddress || (safeLocale === "pl" ? "zgłoszenie audytu" : "audit request");
  const eta = pkg.id === "advanced_human_review"
    ? (safeLocale === "pl" ? "po płatności i ręcznej weryfikacji Velmère" : safeLocale === "de" ? "nach Zahlung und Velmère Human Review" : "after payment and Velmère human review")
    : (safeLocale === "pl" ? "do 24h" : safeLocale === "de" ? "innerhalb von 24h" : "within 24h");

  const title = safeLocale === "pl"
    ? `${pkg.label}: ${project}`
    : safeLocale === "de"
      ? `${pkg.label}: ${project}`
      : `${pkg.label}: ${project}`;
  const body = safeLocale === "pl"
    ? `${pkg.label} został przyjęty. ${pkg.id === "advanced_human_review" ? "Ręczna weryfikacja startuje po potwierdzeniu płatności 89.99€." : "Wynik pojawi się jako wiadomość na koncie klienta do 24h."} Raport nie jest gwarancją bezpieczeństwa i nie zawiera publicznych instrukcji wykorzystania luk.`
    : safeLocale === "de"
      ? `${pkg.label} wurde angenommen. ${pkg.id === "advanced_human_review" ? "Human Review startet nach Zahlungsbestätigung von 89.99€." : "Das Ergebnis erscheint als Kontonachricht innerhalb von 24h."} Der Report ist keine Sicherheitsgarantie und enthält keine öffentlichen Exploit-Anleitungen.`
      : `${pkg.label} was received. ${pkg.id === "advanced_human_review" ? "Human review starts after the 89.99€ payment is confirmed." : "The result will appear as an account message within 24h."} The report is not a safety guarantee and does not include public exploit instructions.`;

  return {
    id: `msg-${requestId.toLowerCase()}`,
    title,
    body,
    status: pkg.humanReviewed ? "payment_pending" : "queued",
    packageLabel: pkg.label,
    requestId,
    createdAt: now.toISOString(),
    eta,
    accountRoute: `/${safeLocale}/account?tab=messages`,
    nextSteps: pkg.id === "advanced_human_review"
      ? ["payment confirmation", "Velmère analyst verification", "redaction check", "signed client report", "account delivery"]
      : ["VLM technology review", "source confidence check", "missing evidence list", "account delivery within 24h"],
  };
}

export function buildDefaultAuditAccountMessages(locale = "en"): VlmAuditAccountMessage[] {
  const safeLocale = resolveLocale(locale);
  return [
    buildVlmAuditAccountMessage({
      locale: safeLocale,
      now: new Date("2026-06-14T08:00:00.000Z"),
      submission: {
        projectName: safeLocale === "pl" ? "Przykładowy Basic Audit" : "Sample Basic Audit",
        chain: "ethereum",
        reviewLevel: "basic_review",
      },
    }),
    buildVlmAuditAccountMessage({
      locale: safeLocale,
      now: new Date("2026-06-14T09:30:00.000Z"),
      submission: {
        projectName: safeLocale === "pl" ? "Przykładowy Advanced Audit" : "Sample Advanced Audit",
        chain: "base",
        reviewLevel: "advanced_review",
      },
    }),
  ];
}
