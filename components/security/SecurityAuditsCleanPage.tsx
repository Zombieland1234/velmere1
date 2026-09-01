"use client";

import { fetchWithDeadline, readJsonResponseBounded } from "@/lib/network/fetch-with-deadline";
import { assertCheckoutRedirectUrl } from "@/lib/security/navigation-redirect-boundary";
import { pass35PaidUiStopSellCopy, resolvePass35PaidUiStopSell } from "@/lib/commerce/pass35-paid-ui-stop-sell";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  FileSearch,
  LockKeyhole,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import BodyPortal from "@/components/ui/BodyPortal";
import AuditPaidPreviewModal from "@/components/security/AuditPaidPreviewModal";
import type { AuditPaidTierPreview } from "@/lib/security/audit-tier-preview";
import { rememberAuditCaseRef } from "@/lib/security/audit-case-client-registry";


type Locale = "pl" | "en" | "de";
type TierId = "basic" | "pro" | "advanced";
type IntakeUiState = "idle" | "submitting" | "checkout" | "success" | "error" | "account_required";
type PaidPreviewTier = Exclude<TierId, "basic">;
type AuditPaidPreviewResponse = { ok?: boolean; error?: string; preview?: AuditPaidTierPreview };

type AuditIntakeResponse = {
  ok?: boolean;
  error?: string;
  auth?: { accountResolved?: boolean };
  case?: {
    caseRef?: string;
    status?: "queued_basic_prescreen" | "awaiting_entitlement" | "checkout_pending" | "queued_paid_review";
    durable?: boolean;
    storageMode?: string;
  };
};

type AuditCheckoutResponse = {
  ok?: boolean;
  error?: string;
  url?: string;
  sessionId?: string;
  auditCase?: { caseRef?: string; status?: string; checkoutBound?: boolean };
};

type Tier = {
  id: TierId;
  title: string;
  price: string;
  description: string;
  features: string[];
  recommended?: boolean;
};

type ComparisonRow = {
  label: string;
  basic: string | boolean;
  pro: string | boolean;
  advanced: string | boolean;
};

const COPY = {
  pl: {
    section: "AUDYTY",
    audits: "Audyty",
    checkInfo: "Sprawdź zakres",
    signIn: "Zaloguj",
    eyebrow: "PRZEGLĄD BEZPIECZEŃSTWA · NAJPIERW DOWODY",
    title: "Audyt, który pokazuje ryzyko — bez marketingowego hałasu.",
    subtitle:
      "Bezpłatny intake zapisuje sprawę Basic do kolejki prescreenu i pokazuje status. Gotowy wynik analizy ani raport PDF nie są jeszcze dostarczane z tego workflow; Pro i Advanced pozostają poza sprzedażą.",
    placeholder: "Adres kontraktu BSC (0x…)",
    request: "Zapisz prescreen",
    prepared: "Zakres przygotowany",
    inputHint: "Bieżące wykonanie: kontrakt BSC · chainId 56.",
    targetWithheld: "URL i GitHub są rozpoznawane jako przyszłe typy, ale obecnie są WITHHELD i nie trafiają do kolejki.",
    invalidHint: "Wprowadź poprawny adres kontraktu BSC 0x…",
    noStorage: "Bez kluczy prywatnych i frazy odzyskiwania",
    confidential: "Poufnie domyślnie",
    evidence: "Poziom ryzyka · pewność · brakujące dowody",
    select: "Wybierz",
    selected: "Wybrano",
    compare: "Pełne porównanie",
    comparisonTitle: "Zakres planów audytu",
    comparisonSubtitle: "Dokładne różnice między Basic, Pro i Advanced.",
    capability: "Zakres",
    close: "Zamknij",
    saving: "Zapisywanie…",
    checkoutRedirect: "Weryfikowanie dostępu do kontrolowanej bety…",
    checkoutFailed: "Publiczny checkout jest wyłączony. Analiza płatna nie została uruchomiona.",
    casePrepared: "Sprawa utworzona",
    openStatus: "Otwórz status",
    basicQueued: "Wstępna analiza Basic została zapisana w kolejce.",
    paidWaiting: "Sprawa zapisana — płatna beta pozostaje niedostępna bez ręcznie zatwierdzonego zaproszenia.",
    accountRequired: "Kontrolowana beta Pro wymaga zalogowanego, ręcznie zatwierdzonego konta. Advanced nie jest sprzedawany.",
    serverUnavailable: "Bezpieczny system nie przyjął sprawy. Analiza nie została uruchomiona.",
    saleNotice: "Płatne warianty nie są obecnie sprzedawane.",
    plannedPrice: "Nie na sprzedaż",
    localOnly: "Tylko podgląd na tym urządzeniu — bez trwałego zapisu.",
    anonymousBasic: "Ta anonimowa sprawa Basic nie jest przypisana do portalu konta.",
    tiers: [
      {
        id: "basic",
        title: "Basic",
        price: "Bezpłatnie",
        description: "Bezpłatne zgłoszenie do kolejki Basic. Obecny workflow zwraca numer sprawy i status, ale nie dostarcza jeszcze gotowego wyniku analizy ani PDF.",
        features: ["Bezpieczny intake + numer sprawy", "Status kolejki Basic", "Wynik i PDF: jeszcze niedostarczane"],
      },
      {
        id: "pro",
        title: "Pro",
        price: "NOT_FOR_SALE",
        description: "Plan rozszerzonej analizy; prawa, dokładność i wartość klienta nie są potwierdzone.",
        features: ["Wszystko z Basic", "Mapa uprawnień i płynności", "Priorytetowa analiza źródeł"],
      },
      {
        id: "advanced",
        title: "Advanced",
        price: "NOT_FOR_SALE",
        description: "Plan najszerszej automatycznej analizy informacyjnej; dokładność, dane i wartość klienta nadal wymagają domknięcia.",
        features: ["Wszystko z Pro", "Konsensus narzędzi + różnica ABI/bytecode", "Porównanie ryzyko-remediacja + pakiet adjudykacyjny"],
      },
    ] satisfies Tier[],
    rows: [
      { label: "Automatyczna analiza kontraktu", basic: "W kolejce — wynik niedostarczany", pro: "Niedostępne", advanced: "Niedostępne" },
      { label: "Poziom ryzyka i kompletność dowodów", basic: "Niedostarczane", pro: "Niedostępne", advanced: "Niedostępne" },
      { label: "Brakujące dowody", basic: "Niedostarczane", pro: "Niedostępne", advanced: "Niedostępne" },
      { label: "Uprawnienia i kontrola właściciela", basic: "Niedostarczane", pro: "Niedostępne", advanced: "Niedostępne" },
      { label: "Ryzyko koncentracji i płynności", basic: false, pro: "Niedostępne", advanced: "Niedostępne" },
      { label: "Analiza powierzchni ataku", basic: false, pro: "Niedostępne", advanced: "Niedostępne" },
      { label: "Ręczna weryfikacja analityka", basic: false, pro: false, advanced: "Osobny produkt — nie zawiera" },
      { label: "Priorytetowa kontrola dowodów", basic: false, pro: "Niedostępne", advanced: "Niedostępne" },
      { label: "Raport PDF", basic: "Jeszcze niedostarczany", pro: "Niedostępny", advanced: "Niedostępny" },
    ] satisfies ComparisonRow[],
  },
  en: {
    section: "AUDITS",
    audits: "Audits",
    checkInfo: "Check scope",
    signIn: "Sign in",
    eyebrow: "SECURITY REVIEW · EVIDENCE FIRST",
    title: "An audit that exposes risk — without marketing noise.",
    subtitle:
      "Free Basic intake saves a case to the prescreen queue and exposes status. A completed analysis result or PDF is not yet delivered by this workflow; Pro and Advanced remain unavailable for sale.",
    placeholder: "BSC contract address (0x…)",
    request: "Submit prescreen",
    prepared: "Scope prepared",
    inputHint: "Current execution target: BSC contract · chainId 56.",
    targetWithheld: "URL and GitHub are recognized future target types, but are currently WITHHELD and never queued.",
    invalidHint: "Enter a valid BSC 0x… contract address.",
    noStorage: "No private keys or seed phrases",
    confidential: "Confidential by default",
    evidence: "Severity · confidence · evidence gaps",
    select: "Select",
    selected: "Selected",
    compare: "Full comparison",
    comparisonTitle: "Audit plan scope",
    comparisonSubtitle: "Exact differences between Basic, Pro and Advanced.",
    capability: "Capability",
    close: "Close",
    saving: "Saving…",
    checkoutRedirect: "Checking controlled-beta eligibility…",
    checkoutFailed: "Public checkout is disabled. No paid analysis was started.",
    casePrepared: "Case created",
    openStatus: "Open status",
    basicQueued: "Basic pre-screen saved to the queue.",
    paidWaiting: "Case saved — paid beta delivery remains unavailable without a manually approved invitation.",
    accountRequired: "The controlled Pro beta requires a signed-in, manually approved account. Advanced is not for sale.",
    serverUnavailable: "The secure vault did not accept the case. No analysis was started.",
    saleNotice: "Paid tiers are not currently sold.",
    plannedPrice: "Not for sale",
    localOnly: "Local preview only — no durable production storage.",
    anonymousBasic: "This anonymous Basic case is not attached to the account portal.",
    tiers: [
      {
        id: "basic",
        title: "Basic",
        price: "Free",
        description: "Free Basic queue intake. The current workflow returns a case reference and status, but does not yet deliver a completed analysis result or PDF.",
        features: ["Safe intake + case reference", "Basic queue status", "Result and PDF: not yet delivered"],
      },
      {
        id: "pro",
        title: "Pro",
        price: "NOT_FOR_SALE",
        description: "Planned extended analysis; rights, accuracy and customer value are not proven.",
        features: ["Everything in Basic", "Permissions and liquidity map", "Priority source analysis"],
      },
      {
        id: "advanced",
        title: "Advanced",
        price: "NOT_FOR_SALE",
        description: "Planned deepest automated informational analysis; accuracy, data and customer value still require closure.",
        features: ["Everything in Pro", "Cross-tool consensus + ABI/bytecode diff", "Risk-to-control delta + adjudication packet"],
      },
    ] satisfies Tier[],
    rows: [
      { label: "Automated contract scan", basic: "Queued — result not delivered", pro: "Unavailable", advanced: "Unavailable" },
      { label: "Severity + evidence completeness", basic: "Not delivered", pro: "Unavailable", advanced: "Unavailable" },
      { label: "Evidence gaps", basic: "Not delivered", pro: "Unavailable", advanced: "Unavailable" },
      { label: "Permissions and owner controls", basic: "Not delivered", pro: "Unavailable", advanced: "Unavailable" },
      { label: "Holder and liquidity risk", basic: false, pro: "Unavailable", advanced: "Unavailable" },
      { label: "Attack surface review", basic: false, pro: "Unavailable", advanced: "Unavailable" },
      { label: "Human analyst verification", basic: false, pro: false, advanced: "Separate product — not included" },
      { label: "Priority evidence review", basic: false, pro: "Unavailable", advanced: "Unavailable" },
      { label: "PDF report", basic: "Not yet delivered", pro: "Unavailable", advanced: "Unavailable" },
    ] satisfies ComparisonRow[],
  },
  de: {
    section: "AUDITS",
    audits: "Audits",
    checkInfo: "Umfang prüfen",
    signIn: "Anmelden",
    eyebrow: "SICHERHEITSPRÜFUNG · BELEGE ZUERST",
    title: "Ein Audit, das Risiken zeigt — ohne Marketingrauschen.",
    subtitle:
      "Der kostenlose Basic-Intake speichert einen Fall in der Prescreen-Warteschlange und zeigt den Status. Ein fertiges Analyseergebnis oder PDF wird über diesen Workflow noch nicht ausgeliefert; Pro und Advanced bleiben unverkäuflich.",
    placeholder: "BSC-Contract-Adresse (0x…)",
    request: "Prescreen einreichen",
    prepared: "Umfang vorbereitet",
    inputHint: "Aktuelles Ausführungsziel: BSC-Contract · chainId 56.",
    targetWithheld: "URL und GitHub werden als künftige Zieltypen erkannt, sind derzeit jedoch WITHHELD und werden nicht eingereiht.",
    invalidHint: "Eine gültige BSC-Contract-Adresse 0x… eingeben.",
    noStorage: "Keine privaten Schlüssel oder Wiederherstellungsphrasen",
    confidential: "Standardmäßig vertraulich",
    evidence: "Risikostufe · Verlässlichkeit · fehlende Belege",
    select: "Wählen",
    selected: "Gewählt",
    compare: "Vollständiger Vergleich",
    comparisonTitle: "Leistungsumfang der Audit-Pläne",
    comparisonSubtitle: "Die genauen Unterschiede zwischen Basic, Pro und Advanced.",
    capability: "Umfang",
    close: "Schließen",
    saving: "Wird gespeichert…",
    checkoutRedirect: "Berechtigung für die kontrollierte Beta wird geprüft…",
    checkoutFailed: "Der öffentliche Checkout ist deaktiviert. Es wurde keine bezahlte Analyse gestartet.",
    casePrepared: "Fall erstellt",
    openStatus: "Status öffnen",
    basicQueued: "Die Basic-Vorprüfung wurde in die Warteschlange aufgenommen.",
    paidWaiting: "Fall gespeichert — die bezahlte Beta bleibt ohne manuell genehmigte Einladung nicht verfügbar.",
    accountRequired: "Die kontrollierte Pro-Beta erfordert ein angemeldetes, manuell genehmigtes Konto. Advanced steht nicht zum Verkauf.",
    serverUnavailable: "Das sichere System hat den Fall nicht angenommen. Es wurde keine Analyse gestartet.",
    saleNotice: "Bezahlte Tiers werden derzeit nicht verkauft.",
    plannedPrice: "Nicht zu verkaufen",
    localOnly: "Nur lokale Vorschau — keine dauerhafte Speicherung.",
    anonymousBasic: "Dieser anonyme Basic-Fall ist nicht dem Kontoportal zugeordnet.",
    tiers: [
      {
        id: "basic",
        title: "Basic",
        price: "Kostenlos",
        description: "Kostenloser Basic-Warteschlangen-Intake. Der aktuelle Workflow liefert Fallreferenz und Status, aber noch kein fertiges Analyseergebnis oder PDF.",
        features: ["Sicherer Intake + Fallreferenz", "Basic-Warteschlangenstatus", "Ergebnis und PDF: noch nicht ausgeliefert"],
      },
      {
        id: "pro",
        title: "Pro",
        price: "NOT_FOR_SALE",
        description: "Geplante erweiterte Analyse; Rechte, Genauigkeit und Kundenwert sind nicht belegt.",
        features: ["Alles aus Basic", "Berechtigungs- und Liquiditätskarte", "Priorisierte Quellenanalyse"],
      },
      {
        id: "advanced",
        title: "Advanced",
        price: "NOT_FOR_SALE",
        description: "Geplante tiefste automatisierte Informationsanalyse; Genauigkeit, Daten und Kundenwert müssen noch geschlossen werden.",
        features: ["Alles aus Pro", "Werkzeugkonsens + ABI/Bytecode-Differenz", "Risiko-Abhilfe-Delta + Adjudikationspaket"],
      },
    ] satisfies Tier[],
    rows: [
      { label: "Automatisierte Vertragsanalyse", basic: "Eingereiht — Ergebnis nicht ausgeliefert", pro: "Nicht verfügbar", advanced: "Nicht verfügbar" },
      { label: "Risikostufe und Evidenzvollständigkeit", basic: "Nicht ausgeliefert", pro: "Nicht verfügbar", advanced: "Nicht verfügbar" },
      { label: "Fehlende Belege", basic: "Nicht ausgeliefert", pro: "Nicht verfügbar", advanced: "Nicht verfügbar" },
      { label: "Berechtigungen und Eigentümerkontrolle", basic: "Nicht ausgeliefert", pro: "Nicht verfügbar", advanced: "Nicht verfügbar" },
      { label: "Konzentrations- und Liquiditätsrisiko", basic: false, pro: "Nicht verfügbar", advanced: "Nicht verfügbar" },
      { label: "Prüfung der Angriffsfläche", basic: false, pro: "Nicht verfügbar", advanced: "Nicht verfügbar" },
      { label: "Manuelle Analystenprüfung", basic: false, pro: false, advanced: "Separates Produkt — nicht enthalten" },
      { label: "Priorisierte Belegprüfung", basic: false, pro: "Nicht verfügbar", advanced: "Nicht verfügbar" },
      { label: "PDF-Bericht", basic: "Noch nicht ausgeliefert", pro: "Nicht verfügbar", advanced: "Nicht verfügbar" },
    ] satisfies ComparisonRow[],
  },
} as const;

function classifyInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "empty" as const;
  if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) return "contract" as const;
  if (/^(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/i.test(trimmed)) return "github" as const;
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    const host = url.hostname.toLowerCase();
    const privateIpv4 = /^(?:10\.|127\.|169\.254\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(host);
    const unsafeHost = host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || privateIpv4 || host === "::1";
    if (!unsafeHost && (url.protocol === "http:" || url.protocol === "https:") && url.hostname.includes(".") && !url.hostname.endsWith(".")) return "url" as const;
  } catch {
    return "invalid" as const;
  }
  return "invalid" as const;
}

function MatrixValue({ value }: { value: string | boolean }) {
  if (value === true) {
    return <Check className="h-4 w-4" aria-label="Included" />;
  }
  if (value === false) {
    return <span className="audit-v4609-dash" aria-label="Not included">—</span>;
  }
  return <span>{value}</span>;
}

export default function SecurityAuditsCleanPage({ locale }: { locale: string }) {
  const localeKey: Locale = locale === "pl" || locale === "de" ? locale : "en";
  const t = COPY[localeKey];
  const [selectedTier, setSelectedTier] = useState<TierId>("basic");
  const [projectInput, setProjectInput] = useState("");
  const [staged, setStaged] = useState(false);
  const [intakeState, setIntakeState] = useState<IntakeUiState>("idle");
  const [intakeMessage, setIntakeMessage] = useState("");
  const [caseRef, setCaseRef] = useState("");
  const [accountOwnedCase, setAccountOwnedCase] = useState(false);
  const requestIdRef = useRef<string | undefined>(undefined);
  const [menuOpen, setMenuOpen] = useState(false);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [paidPreviewOpen, setPaidPreviewOpen] = useState(false);
  const [paidPreviewTier, setPaidPreviewTier] = useState<PaidPreviewTier | null>(null);
  const [paidPreview, setPaidPreview] = useState<AuditPaidTierPreview | null>(null);
  const [paidPreviewLoading, setPaidPreviewLoading] = useState(false);
  const [paidPreviewError, setPaidPreviewError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const comparisonCloseRef = useRef<HTMLButtonElement>(null);
  const comparisonTriggerRef = useRef<HTMLButtonElement>(null);
  const paidPreviewTriggerRef = useRef<HTMLButtonElement | null>(null);

  const inputKind = useMemo(() => classifyInput(projectInput), [projectInput]);
  const inputValid = inputKind === "contract";
  const recognizedFutureTarget = inputKind === "url" || inputKind === "github";
  const selectedPaidUiGate = selectedTier === "basic"
    ? null
    : resolvePass35PaidUiStopSell({
        productId:
          selectedTier === "advanced"
            ? "vlm_advanced_audit_human_review"
            : "vlm_pro_audit_review",
        surface: "audit",
        tier: selectedTier,
      });
  const paidSaleBlocked = selectedPaidUiGate?.checkoutAllowed === false;
  const paidPreviewButtonLabel = localeKey === "pl" ? "Bezpieczny podgląd" : localeKey === "de" ? "Sichere Vorschau" : "Secure preview";

  useEffect(() => {
    document.body.classList.add("audit-v4609-active", "audit-v4610-global-header-owner");
    return () => document.body.classList.remove("audit-v4609-active", "audit-v4610-global-header-owner");
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [menuOpen]);

  useEffect(() => {
    if (!comparisonOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    comparisonCloseRef.current?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setComparisonOpen(false);
        comparisonTriggerRef.current?.focus({ preventScroll: true });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [comparisonOpen]);

  const closePaidPreview = () => {
    setPaidPreviewOpen(false);
    setPaidPreviewLoading(false);
    setPaidPreviewError(null);
    paidPreviewTriggerRef.current?.focus({ preventScroll: true });
  };

  const openPaidPreview = async (tier: PaidPreviewTier, trigger: HTMLButtonElement) => {
    paidPreviewTriggerRef.current = trigger;
    setPaidPreviewTier(tier);
    setPaidPreview(null);
    setPaidPreviewError(null);
    setPaidPreviewLoading(true);
    setPaidPreviewOpen(true);
    try {
      const response = await fetchWithDeadline(
        `/api/security/audit-watch/paid-preview?tier=${encodeURIComponent(tier)}&locale=${encodeURIComponent(localeKey)}&format=json`,
        { method: "GET", credentials: "same-origin", cache: "no-store" },
        { timeoutMs: 12_000, operation: "audit_paid_preview" },
      );
      const payload: AuditPaidPreviewResponse = await readJsonResponseBounded<AuditPaidPreviewResponse>(response, 128 * 1024).catch(() => ({ ok: false, error: "audit_paid_preview_unavailable" }));
      if (!response.ok || !payload.ok || !payload.preview || payload.preview.previewOnly !== true || payload.preview.fullContentIncluded !== false) {
        throw new Error(payload.error || "audit_paid_preview_unavailable");
      }
      setPaidPreview(payload.preview);
    } catch {
      setPaidPreviewError("audit_paid_preview_unavailable");
    } finally {
      setPaidPreviewLoading(false);
    }
  };

  const resetIntake = () => {
    setStaged(false);
    setIntakeState("idle");
    setIntakeMessage("");
    setCaseRef("");
    setAccountOwnedCase(false);
    requestIdRef.current = undefined;
  };

  const beginPaidCheckout = async (caseReference: string, requestId: string, tier: "pro" | "advanced") => {
    setIntakeState("checkout");
    setIntakeMessage(t.checkoutRedirect);
    const productId = tier === "advanced" ? "vlm_advanced_audit_human_review" : "vlm_pro_audit_review";
    const productCellGate = resolvePass35PaidUiStopSell({
      productId,
      surface: "audit",
      tier,
    });
    if (!productCellGate.ok || !productCellGate.checkoutAllowed) {
      throw new Error("product_cell_not_sell_ready");
    }
    const checkoutResponse = await fetchWithDeadline("/api/checkout/vlm-service", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-velmere-client-request-id": `${requestId}:checkout`,
      },
      credentials: "same-origin",
      body: JSON.stringify({
        productId,
        productCellId: productCellGate.productCellId,
        locale: localeKey,
        clientRequestId: `${requestId}:checkout`,
        context: {
          surface: "audit",
          locale: localeKey,
          depth: tier,
          requestId,
          auditCaseRef: caseReference,
          returnPath: `/${localeKey}/account?tab=audits&caseRef=${encodeURIComponent(caseReference)}`,
        },
      }),
    }, { timeoutMs: 15_000, operation: "audit_checkout" });
    const checkoutPayload = await readJsonResponseBounded<AuditCheckoutResponse>(checkoutResponse, 256 * 1024).catch(() => ({} as AuditCheckoutResponse));
    if (!checkoutResponse.ok || !checkoutPayload.ok || !checkoutPayload.url) {
      throw new Error(checkoutPayload.error || "audit_checkout_unavailable");
    }
    const destination = assertCheckoutRedirectUrl(checkoutPayload.url, window.location.origin);
    window.location.assign(destination);
  };

  const stageAudit = async () => {
    if (!inputValid || intakeState === "submitting" || intakeState === "checkout") return;
    if (selectedTier !== "basic" && paidSaleBlocked) { setIntakeState("error"); setIntakeMessage(pass35PaidUiStopSellCopy(localeKey)); return; }

    const requestId = requestIdRef.current ?? (globalThis.crypto?.randomUUID?.() || `audit_${Date.now()}`);
    requestIdRef.current = requestId;
    setStaged(false);
    setIntakeState("submitting");
    setIntakeMessage("");
    setCaseRef("");
    setAccountOwnedCase(false);

    try {
      const response = await fetchWithDeadline("/api/security/audit-intake", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          target: projectInput.trim(),
          chainId: "56",
          chainName: "BSC",
          tier: selectedTier,
          locale: localeKey,
          requestId,
        }),
      }, { timeoutMs: 15_000, operation: "audit_intake" });
      const payload = await readJsonResponseBounded<AuditIntakeResponse>(response, 2 * 1024 * 1024).catch(() => ({} as AuditIntakeResponse));

      if (!response.ok || !payload.ok || !payload.case?.caseRef) {
        if (response.status === 401 || payload.error === "account_required") {
          setIntakeState("account_required");
          setIntakeMessage(t.accountRequired);
          return;
        }
        if (payload.error === "basic_execution_target_withheld" || payload.error === "audit_execution_target_withheld"
          || payload.error === "audit_execution_chain_required" || payload.error === "audit_execution_chain_withheld") {
          setIntakeState("error");
          setIntakeMessage(t.targetWithheld);
          return;
        }
        setIntakeState("error");
        setIntakeMessage(t.serverUnavailable);
        return;
      }

      const durable = payload.case.durable === true;
      const accountOwned = payload.auth?.accountResolved === true;
      const statusMessage = payload.case.status === "queued_basic_prescreen" ? t.basicQueued : t.paidWaiting;
      setCaseRef(payload.case.caseRef);
      setAccountOwnedCase(accountOwned);
      if (accountOwned) rememberAuditCaseRef(payload.case.caseRef, { tier: selectedTier });
      setIntakeMessage(`${statusMessage}${durable ? "" : ` ${t.localOnly}`}${accountOwned ? "" : ` ${t.anonymousBasic}`}`);
      setStaged(true);

      if (selectedTier === "pro" || selectedTier === "advanced") {
        try {
          await beginPaidCheckout(payload.case.caseRef, requestId, selectedTier);
          return;
        } catch {
          setIntakeState("error");
          setIntakeMessage(t.checkoutFailed);
          return;
        }
      }

      setIntakeState("success");
    } catch {
      setIntakeState("error");
      setIntakeMessage(t.serverUnavailable);
    }
  };

  return (
    <main
      className="audit-v4609-shell"
      data-pass4609-audit-clean="one-screen-three-plans-comparison-overlay-no-debug-wall"
      data-pass4610-audit-header-owner="global-navbar-only"
      data-pass4611-audit-intake="private-server-case-vault-entitlement-fail-closed"
      data-pass4612-audit-checkout="case-ref-account-bound-stripe-session-webhook-queue"
      data-pass4614-account-portal="case-ref-bookmarked-and-paid-return-targets-account-audits-tab"
      data-intake-state={intakeState}
      data-account-owned-case={accountOwnedCase || undefined}
      data-selected-tier={selectedTier}
      data-pass35-paid-tier-state="unavailable-not-for-sale"
      data-audit-product="Automated Security Evidence Review"
      data-audit-execution-chain="BSC:56"
    >
      <div className="audit-v4609-ambient" aria-hidden="true" />

      <section className="audit-v4609-content" data-pass4610-audits-global-header="single-global-header-no-local-brand-or-signin">
        <div className="audit-v4609-hero">
          <div className="audit-v4609-copy">
            <div className="audit-v4610-controlbar">
              <div ref={menuRef} className="audit-v4609-menu-wrap">
                <button
                  type="button"
                  className="audit-v4609-audits-trigger"
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                  onClick={() => setMenuOpen((open) => !open)}
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>{t.audits}</span>
                  <span className="audit-v4609-bolt" aria-hidden="true">↯</span>
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                </button>

                {menuOpen ? (
                  <div className="audit-v4609-menu" role="menu">
                    <div className="audit-v4609-menu-grid">
                      {t.tiers.map((tier) => (
                        <button
                          key={tier.id}
                          type="button"
                          role="menuitem"
                          data-active={selectedTier === tier.id}
                          onClick={(event) => {
                            setMenuOpen(false);
                            if (tier.id === "basic") {
                              setSelectedTier("basic");
                              resetIntake();
                            } else {
                              void openPaidPreview(tier.id, event.currentTarget);
                            }
                          }}
                        >
                          <span>{tier.title}</span>
                          <strong>{tier.id === "basic" ? tier.price : t.plannedPrice}</strong>
                          <small>{tier.features[0]}</small>
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="audit-v4609-menu-info"
                      onClick={() => {
                        setMenuOpen(false);
                        setComparisonOpen(true);
                      }}
                    >
                      {t.checkInfo}
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
              </div>
              <span className="audit-v4610-selected-plan" aria-live="polite">
                {t.section} · {t.tiers.find((tier) => tier.id === selectedTier)?.title}
              </span>
            </div>
            <p className="audit-v4609-eyebrow"><Sparkles className="h-3.5 w-3.5" /> {t.eyebrow}</p>
            <h1>{t.title}</h1>
            <p className="audit-v4609-subtitle">{t.subtitle}</p>
            <p className="audit-v4609-subtitle" data-sale-notice="paid-tiers-unavailable">{t.saleNotice}</p>
          </div>

          <div className="audit-v4609-intake" data-valid={inputValid} data-staged={staged}>
            <label>
              <Search className="h-4 w-4" aria-hidden="true" />
              <input
                value={projectInput}
                onChange={(event) => {
                  setProjectInput(event.target.value);
                  resetIntake();
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void stageAudit();
                }}
                placeholder={t.placeholder}
                aria-label={t.placeholder}
              />
            </label>
            <button
              type="button"
              onClick={() => void stageAudit()}
              disabled={!inputValid || paidSaleBlocked || intakeState === "submitting" || intakeState === "checkout"}
              aria-busy={intakeState === "submitting" || intakeState === "checkout"}
            >
              {staged ? <CircleCheck className="h-4 w-4" /> : null}
              <span>{intakeState === "submitting" ? t.saving : intakeState === "checkout" ? t.checkoutRedirect : staged ? t.casePrepared : t.request}</span>
              {!staged && intakeState !== "submitting" && intakeState !== "checkout" ? <ArrowRight className="h-4 w-4" /> : null}
            </button>
          </div>

          <div className="audit-v4609-intake-meta" role="status" aria-live="polite" data-state={intakeState}>
            <span>{projectInput && recognizedFutureTarget ? t.targetWithheld : projectInput && !inputValid ? t.invalidHint : t.inputHint}</span>
            {intakeState !== "idle" ? (
              <strong className="audit-v4611-intake-status" title={intakeMessage}>
                {caseRef ? `${caseRef} · ` : ""}{intakeState === "submitting" ? t.saving : intakeState === "checkout" ? t.checkoutRedirect : intakeMessage}
              </strong>
            ) : null}
            {caseRef && accountOwnedCase && intakeState !== "submitting" && intakeState !== "checkout" ? (
              <a className="audit-v4614-open-status" href={`/${localeKey}/account?tab=audits&caseRef=${encodeURIComponent(caseRef)}`}>
                {t.openStatus}<ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            ) : null}
          </div>

          <div className="audit-v4609-trust">
            <span><LockKeyhole className="h-4 w-4" /> {t.noStorage}</span>
            <span><ShieldCheck className="h-4 w-4" /> {t.confidential}</span>
            <span><FileSearch className="h-4 w-4" /> {t.evidence}</span>
          </div>

          <div className="audit-v4609-hero-art" aria-hidden="true">
            <svg viewBox="0 0 760 390" role="presentation">
              <defs>
                <linearGradient id="auditGoldStroke" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#f0d9a5" />
                  <stop offset="0.36" stopColor="#b9822d" />
                  <stop offset="0.68" stopColor="#e2bd71" />
                  <stop offset="1" stopColor="#9c6a21" />
                </linearGradient>
                <linearGradient id="auditGoldFill" x1="0.1" y1="0" x2="0.9" y2="1">
                  <stop offset="0" stopColor="#fffdf9" stopOpacity="0.98" />
                  <stop offset="0.52" stopColor="#f8f0df" stopOpacity="0.78" />
                  <stop offset="1" stopColor="#ead6aa" stopOpacity="0.42" />
                </linearGradient>
                <filter id="auditSoftShadow" x="-80%" y="-80%" width="260%" height="260%">
                  <feDropShadow dx="0" dy="12" stdDeviation="10" floodColor="#8f601d" floodOpacity="0.2" />
                </filter>
              </defs>

              <g className="audit-v4609-wave-lines">
                <path d="M-30 310 C115 214 208 372 352 280 S596 126 820 210" />
                <path d="M-28 320 C118 226 216 382 360 288 S606 138 822 222" />
                <path d="M-22 331 C124 238 226 392 370 297 S616 151 826 235" />
                <path d="M-12 342 C136 252 240 402 384 307 S632 166 830 249" />
                <path d="M4 353 C150 268 256 411 400 318 S646 184 836 266" />
                <path d="M30 364 C172 286 278 418 421 331 S664 205 842 284" />
                <path d="M70 375 C202 307 310 421 449 346 S684 228 850 305" />
                <path d="M105 386 C232 329 342 421 477 362 S704 255 858 329" />
              </g>

              <g className="audit-v4609-orbits">
                <circle cx="482" cy="184" r="146" />
                <circle cx="482" cy="184" r="130" />
                <circle cx="482" cy="184" r="112" />
                <path d="M283 197 C327 82 430 19 547 49 C639 72 695 153 704 228" />
              </g>

              <g className="audit-v4609-speckles">
                <circle cx="301" cy="117" r="1.7" />
                <circle cx="335" cy="78" r="1.1" />
                <circle cx="609" cy="76" r="1.4" />
                <circle cx="657" cy="115" r="1.8" />
                <circle cx="698" cy="161" r="1.1" />
                <circle cx="277" cy="239" r="1.2" />
                <circle cx="634" cy="281" r="1.4" />
                <circle cx="724" cy="246" r="1.6" />
              </g>

              <g className="audit-v4609-shield-mark" filter="url(#auditSoftShadow)">
                <path
                  d="M482 91 C519 119 552 130 583 137 V205 C583 264 545 311 482 340 C419 311 381 264 381 205 V137 C412 130 445 119 482 91 Z"
                  fill="url(#auditGoldFill)"
                  stroke="url(#auditGoldStroke)"
                  strokeWidth="7"
                />
                <path
                  d="M482 104 C516 129 546 139 570 145 V204 C570 253 539 294 482 322 C425 294 394 253 394 204 V145 C418 139 448 129 482 104 Z"
                  fill="none"
                  stroke="#f2dfb4"
                  strokeOpacity="0.72"
                  strokeWidth="2"
                />
                <path
                  d="M435 213 L470 248 L535 171"
                  fill="none"
                  stroke="url(#auditGoldStroke)"
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                  strokeWidth="12"
                />
                <path
                  d="M440 210 L470 240 L530 169"
                  fill="none"
                  stroke="#f4dfb2"
                  strokeLinecap="square"
                  strokeWidth="3"
                  opacity="0.72"
                />
              </g>
            </svg>
          </div>

        </div>

        <div
          className="audit-v4609-plans"
          role="radiogroup"
          aria-label={localeKey === "pl" ? "Plany audytu" : localeKey === "de" ? "Audit-Pläne" : "Audit plans"}
        >
          <div className="audit-v4609-plans-label">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            <span>{t.capability}</span>
          </div>
          {t.tiers.map((tier) => {
            const active = selectedTier === tier.id;
            const unavailable = tier.id !== "basic";
            return (
              <article key={tier.id} className="audit-v4609-plan" data-active={active} data-sale-state={unavailable ? "unavailable-not-for-sale" : "available"} data-recommended={undefined}>
                <div className="audit-v4609-plan-top">
                  <div>
                    <span className="audit-v4609-plan-index"><ShieldCheck className="h-4 w-4" aria-hidden="true" /> 0{tier.id === "basic" ? 1 : tier.id === "pro" ? 2 : 3}</span>
                    <h2>{tier.title}</h2>
                  </div>
                </div>
                <p>{tier.description}</p>
                <div className="audit-v4609-price">{unavailable ? t.plannedPrice : tier.price}</div>
                <button
                  type="button"
                  role={unavailable ? undefined : "radio"}
                  aria-checked={unavailable ? undefined : active}
                  data-preview-trigger={unavailable || undefined}
                  onClick={(event) => {
                    if (tier.id === "basic") {
                      setSelectedTier("basic");
                      resetIntake();
                    } else {
                      void openPaidPreview(tier.id, event.currentTarget);
                    }
                  }}
                >
                  <span>{unavailable ? paidPreviewButtonLabel : active ? t.selected : t.select}</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </article>
            );
          })}

          <div className="audit-v4609-plan-rows">
            {t.rows.map((row) => (
              <div key={row.label} className="audit-v4609-plan-row">
                <span><ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> {row.label}</span>
                <div><MatrixValue value={row.basic} /></div>
                <div><MatrixValue value={row.pro} /></div>
                <div><MatrixValue value={row.advanced} /></div>
              </div>
            ))}
          </div>
        </div>

        <button
          ref={comparisonTriggerRef}
          type="button"
          className="audit-v4609-compare"
          onClick={() => setComparisonOpen(true)}
        >
          <span>{t.compare}</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </section>

      {comparisonOpen ? (
        <BodyPortal>
          <div
            className="audit-v4609-overlay"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setComparisonOpen(false);
                comparisonTriggerRef.current?.focus({ preventScroll: true });
              }
            }}
          >
            <section className="audit-v4609-comparison" role="dialog" aria-modal="true" aria-labelledby="audit-v4609-comparison-title">
            <header>
              <div>
                <span>VELMÈRE SECURITY</span>
                <h2 id="audit-v4609-comparison-title">{t.comparisonTitle}</h2>
                <p>{t.comparisonSubtitle}</p>
              </div>
              <button
                ref={comparisonCloseRef}
                type="button"
                aria-label={t.close}
                onClick={() => {
                  setComparisonOpen(false);
                  comparisonTriggerRef.current?.focus({ preventScroll: true });
                }}
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="audit-v4609-table-wrap">
              <div className="audit-v4609-table-head">
                <span>{t.capability}</span>
                {t.tiers.map((tier) => <strong key={tier.id}>{tier.title}<small>{tier.id === "basic" ? tier.price : t.plannedPrice}</small></strong>)}
              </div>
              {t.rows.map((row) => (
                <div key={row.label} className="audit-v4609-table-row">
                  <span>{row.label}</span>
                  <div><MatrixValue value={row.basic} /></div>
                  <div><MatrixValue value={row.pro} /></div>
                  <div><MatrixValue value={row.advanced} /></div>
                </div>
              ))}
            </div>

            <div className="audit-v4609-mobile-comparison" aria-label={t.comparisonSubtitle}>
              {t.tiers.map((tier) => {
                const unavailable = tier.id !== "basic";
                return (
                <article key={tier.id} data-sale-state={unavailable ? "unavailable-not-for-sale" : "available"} data-recommended={undefined}>
                  <div className="audit-v4609-mobile-comparison-head">
                    <div>
                      <span>{unavailable ? t.plannedPrice : t.capability}</span>
                      <h3>{tier.title}</h3>
                    </div>
                    <strong>{unavailable ? t.plannedPrice : tier.price}</strong>
                  </div>
                  <dl>
                    {t.rows.map((row) => (
                      <div key={row.label}>
                        <dt>{row.label}</dt>
                        <dd><MatrixValue value={row[tier.id]} /></dd>
                      </div>
                    ))}
                  </dl>
                  {tier.id !== "basic" ? (
                    <button
                      type="button"
                      className="audit-r44p22-preview-inline"
                      onClick={(event) => void openPaidPreview(tier.id, event.currentTarget)}
                    >
                      {paidPreviewButtonLabel}<ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  ) : null}
                </article>
                );
              })}
            </div>
            </section>
          </div>
        </BodyPortal>
      ) : null}

      <AuditPaidPreviewModal
        open={paidPreviewOpen}
        locale={localeKey}
        tier={paidPreviewTier}
        preview={paidPreview}
        loading={paidPreviewLoading}
        error={paidPreviewError}
        onClose={closePaidPreview}
      />
    </main>
  );
}
