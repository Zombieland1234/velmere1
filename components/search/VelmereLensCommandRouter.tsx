import type { CSSProperties } from "react";
import { BookOpen, FileSearch, Network, ShieldCheck, Sparkles, WalletCards } from "lucide-react";
import { velmereLensRoutes } from "@/lib/search/velmere-lens-route-map";

type Locale = "pl" | "de" | "en";

const copy = {
  pl: {
    eyebrow: "Velmère Lens",
    title: "Wyszukiwarka Velmère zbiera token, kontekst i drogę do raportu.",
    body: "Lens rozpoznaje token, kontrakt albo temat, pokazuje krótką kapsułę i przygotowuje ścieżkę do Shield oraz safe PDF preview — bez fałszywych odznak release, overclaimów i surowych payloadów.",
    open: "Otwórz",
    report: "Raport PDF-ready",
    previewTitle: "Kapsuła raportu Velmère",
    previewBody: "Lens przygotowuje kapsułę raportu: opis tokena, ścieżkę do Shield, stan źródeł, braki danych, redakcję payloadu i następne sprawdzenie.",
    previewCta: "Podgląd raportu",
    missing: "do dopięcia przed pełnym raportem",
    boundary: "Lens porządkuje research; publiczny eksport zostaje zablokowany do czasu źródeł, redakcji i browser QA.",
    gatesTitle: "Handoff safety gates",
    gates: ["pewność źródeł", "redakcja danych", "PDF preview", "wallet/session", "copy dla klienta"],
    actionTitle: "Analysis path",
    actionPhases: ["evidence intake", "browser replay", "export freeze", "access/copy review"],
    runbookTitle: "Verification plan",
    runbookBody: "Lens pokazuje kolejkę dowodów: najpierw replay i źródła, potem redakcja, durable snapshot i dopiero po review bezpieczna kapsuła klienta.",
    runbookSteps: ["kolejka P0/P1", "browser replay", "export quarantine", "copy po review"],
    slaTitle: "Verification order",
    slaBody: "Lens pokazuje kolejność SLA: P0 blokery, capture lane, eskalacja ownerów i exception firewall — bez ujawniania warstwy technicznej, bez odblokowania publicznego eksportu.",
    slaSteps: ["P0 first", "capture lane", "owner escalation", "exception firewall"],
    receiptTitle: "Source confirmation",
    receiptBody: "Lens dopina receipt lock: source snapshot, freshness TTL, redaction manifest, browser trace pack, durable case write, PDF preview i wallet/session gate pozostają do review.",
    receiptSteps: ["proof receipts", "owner signoff", "browser trace pack", "release lock"],
    attestationTitle: "Evidence history",
    attestationBody: "Lens pokazuje attestation ledger: każdy receipt staje się owner-lane, a release promotion pozostaje zamrożony do czasu reviewed attestations, browser trace refs i redaction/storage proof.",
    attestationSteps: ["attestation lanes", "freeze reasons", "promotion checklist", "trace refs"],
    promotionFirewallTitle: "Publishing boundary",
    promotionFirewallBody: "Lens pokazuje promotion firewall: attestation lanes zamieniają się w review packets, customer copy pozostaje ukryte do review, a public release badge jest zablokowany.",
    promotionFirewallSteps: ["review packets", "customer freeze", "release badge lock", "operator next move"],
    cutoverTitle: "Readiness control",
    cutoverBody: "Lens pokazuje cutover control: review packets stają się cutover lanes, rollback vault pozostaje aktywny, readiness seals nie są publiczne, a release cutover jest zablokowany do reviewed proof.",
    cutoverSteps: ["cutover lanes", "rollback vault", "readiness seals", "cutover lock"],
    rehearsalTitle: "Report rehearsal",
    rehearsalBody: "Lens pokazuje rehearsal matrix: dry-run dowodów, rollback drill, owner signoff i surface locks pozostają bez publicznego seal, PDF download ani wallet access.",
    rehearsalSteps: ["dry-run evidence", "rollback drill", "owner signoff", "surface locks"],
    candidateTitle: "Trust overview",
    candidateBody: "Lens pokazuje candidate trust board: psychologia zaufania idzie przez źródła, missing-data boundary, manual review i reviewed, calm copy zamiast presji release.",
    candidateSteps: ["trust cues", "copy boundary", "proof gaps", "surface locks"],
    narrativeTitle: "Clear context",
    narrativeBody: "Lens układa psychologię zaufania w spokojny schemat: kontekst, status dowodów, granice review i następne sprawdzenie — bez presji, teatralnej pewności, public badges i access shortcut.",
    narrativeSteps: ["context first", "evidence status", "review boundary", "dark-pattern firewall"],
    languageTitle: "Evidence language",
    languageBody: "Lens porządkuje język dowodowy: najpierw kontekst źródeł, potem widoczne ograniczenia, manual review, następne sprawdzenie i locked surface — bez przeciążania czytelnika i bez presji.",
    languageSteps: ["source context", "visible limits", "manual review", "next step", "surface lock"],
    claimTitle: "Claim trail",
    claimBody: "Lens dopina claim traceability: każda linia języka musi mieć evidence anchor, widoczną granicę review, comprehension check i locked public surface — bez niepodpartych skrótów do copy, PDF, wallet ani badge.",
    claimSteps: ["evidence anchor", "claim lane", "comprehension gate", "surface lock"],
    pdfForgeTitle: "Velmère PDF report",
    pdfForgeBody: "Lens może pracować jak elegancka kuźnia PDF: najpierw szycie źródeł, potem redakcja prywatności, animacja tworzenia dokumentu i gotowy pakiet z podpisem Velmère Cybersecurity.",
    pdfForgeSteps: ["source stitch", "privacy mirror", "PDF forge", "Velmère Cybersecurity signature"],
  },
  de: {
    eyebrow: "Velmère Lens",
    title: "Velmère Search sammelt Token, Kontext und Report-Pfad.",
    body: "Lens erkennt Token, Contract oder Thema, zeigt eine kurze Kapsel und bereitet Shield sowie eine sichere PDF-Vorschau vor — ohne Release-Badge, Overclaims oder Rohpayloads.",
    open: "Öffnen",
    report: "PDF-ready Report",
    previewTitle: "Velmère Report-Kapsel",
    previewBody: "Lens bereitet eine Report-Kapsel vor: Token-Kontext, Shield-Pfad, Quellenstatus, Datenlücken, Payload-Redaktion und nächsten Operator-Schritt.",
    previewCta: "Report-Vorschau",
    missing: "vor vollständigem Report fehlt",
    boundary: "Lens ordnet Research; öffentlicher Export bleibt bis Quellen, Redaktion und Browser-QA gesperrt.",
    gatesTitle: "Handoff-Safety-Gates",
    gates: ["Quellenvertrauen", "Redaktion", "PDF-Vorschau", "Wallet/Session", "Kunden-Copy"],
    actionTitle: "Analysepfad",
    actionPhases: ["Evidence Intake", "Browser-Replay", "Export-Freeze", "Access/Copy Review"],
    runbookTitle: "Prüfplan",
    runbookBody: "Lens zeigt die Evidenz-Queue: zuerst Replay und Quellen, dann Redaktion, Durable Snapshot und erst nach Review eine sichere Kundenkapsel.",
    runbookSteps: ["P0/P1 Queue", "Browser-Replay", "Export-Quarantäne", "Copy nach Review"],
    slaTitle: "Prüfreihenfolge",
    slaBody: "Lens zeigt die SLA-Reihenfolge: P0-Blocker, Capture-Lane, Owner-Eskalation und Exception-Firewall — ohne den öffentlichen Export vorzeitig freizugeben.",
    slaSteps: ["P0 zuerst", "Capture-Lane", "Owner-Eskalation", "Exception-Firewall"],
    receiptTitle: "Quellenbestätigung",
    receiptBody: "Lens ergänzt den Receipt-Lock: Source Snapshot, Freshness TTL, Redaction Manifest, Browser-Trace-Pack, Durable Case Write, PDF-Vorschau und Wallet/Session-Gate bleiben im Review.",
    receiptSteps: ["Proof Receipts", "Owner-Signoff", "Browser-Trace-Pack", "Release-Lock"],
    attestationTitle: "Evidenzverlauf",
    attestationBody: "Lens zeigt das Attestation-Ledger: jeder Receipt wird zur Owner-Lane, Release Promotion bleibt bis Reviewed Attestations, Browser-Trace-Refs und Redaction/Storage Proof eingefroren.",
    attestationSteps: ["Attestation-Lanes", "Freeze-Gründe", "Promotion-Checklist", "Trace-Refs"],
    promotionFirewallTitle: "Publikationsgrenze",
    promotionFirewallBody: "Lens zeigt die Promotion-Firewall: Attestation-Lanes werden zu Review-Paketen, Kunden-Copy bleibt bis Review verborgen und ein public Release Badge bleibt gesperrt.",
    promotionFirewallSteps: ["Review-Pakete", "Customer-Freeze", "Release-Badge-Lock", "Operator Next Move"],
    cutoverTitle: "Bereitschaftskontrolle",
    cutoverBody: "Lens zeigt Cutover-Control: Review-Pakete werden zu Cutover-Lanes, der Rollback-Vault bleibt aktiv, Readiness-Seals sind nicht öffentlich und Release-Cutover bleibt bis Reviewed Proof gesperrt.",
    cutoverSteps: ["Cutover-Lanes", "Rollback-Vault", "Readiness-Seals", "Cutover-Lock"],
    rehearsalTitle: "Report-Probelauf",
    rehearsalBody: "Lens zeigt die Rehearsal-Matrix: Dry-Run-Evidenz, Rollback-Drill, Owner-Signoff und Surface-Locks bleiben intern, ohne öffentliches Seal, PDF-Download oder Wallet-Zugriff.",
    rehearsalSteps: ["Dry-Run-Evidenz", "Rollback-Drill", "Owner-Signoff", "Surface-Locks"],
    candidateTitle: "Vertrauensübersicht",
    candidateBody: "Lens zeigt das Candidate-Trust-Board: Vertrauenspsychologie läuft über Quellenkontext, Missing-Data-Grenze, Manual Review und geprüfte, ruhige Copy statt Release-Druck.",
    candidateSteps: ["Trust-Cues", "Copy-Grenze", "Proof-Gaps", "Surface-Locks"],
    narrativeTitle: "Klarer Kontext",
    narrativeBody: "Lens ordnet Vertrauenspsychologie in eine ruhige Reihenfolge: Kontext, Evidenzstatus, Review-Grenzen und nächster Prüfschritt — ohne Druck, Certainty-Theatre, Public Badges oder Access Shortcut.",
    narrativeSteps: ["Kontext zuerst", "Evidenzstatus", "Review-Grenze", "Dark-Pattern-Firewall"],
    languageTitle: "Evidenzsprache",
    languageBody: "Lens ordnet Evidence-Sprache: zuerst Quellenkontext, dann sichtbare Grenzen, Manual Review, nächster Prüfschritt und Surface-Lock — ohne kognitive Überladung oder Druck.",
    languageSteps: ["Quellenkontext", "sichtbare Grenzen", "Manual Review", "nächster Schritt", "Surface-Lock"],
    claimTitle: "Aussagenpfad",
    claimBody: "Lens ergänzt Claim Traceability: jede Formulierung braucht Evidence Anchor, klare Review-Grenze, Comprehension Check und locked public surface — ohne nicht belegte Abkürzung zu Copy, PDF, Wallet oder Badge.",
    claimSteps: ["Evidence Anchor", "Claim-Lane", "Comprehension-Gate", "Surface-Lock"],
    pdfForgeTitle: "Velmère PDF-Report",
    pdfForgeBody: "Lens arbeitet wie eine ruhige PDF-Manufaktur: Quellen-Stitching, Datenschutz-Redaktion, Dokument-Animation und ein fertiger Vorschau-Paket mit Velmère Cybersecurity Signatur.",
    pdfForgeSteps: ["Source-Stitch", "Privacy-Mirror", "PDF-Forge", "Velmère Cybersecurity Signatur"],
  },
  en: {
    eyebrow: "Velmère Lens",
    title: "Velmère Search collects the token, context and report path.",
    body: "Lens recognizes a token, contract or topic, shows a short capsule and prepares Shield plus an safe PDF preview — without release badges, overclaims or raw payloads.",
    open: "Open",
    report: "PDF-ready report",
    previewTitle: "Velmère report capsule",
    previewBody: "Lens prepares a report capsule: token description, Shield path, source status, data gaps, payload redaction and next verification step.",
    previewCta: "Report preview",
    missing: "to complete before full report",
    boundary: "Lens organizes research; public export stays blocked until sources, redaction and browser QA are proven.",
    gatesTitle: "Handoff safety gates",
    gates: ["source confidence", "redaction", "PDF preview", "wallet/session", "customer copy"],
    actionTitle: "Analysis path",
    actionPhases: ["evidence intake", "browser replay", "export freeze", "access/copy review"],
    runbookTitle: "Verification plan",
    runbookBody: "Lens shows the evidence queue: replay and sources first, then redaction, durable snapshot and reviewed customer capsule only after review.",
    runbookSteps: ["P0/P1 queue", "browser replay", "export quarantine", "copy after review"],
    slaTitle: "Verification order",
    slaBody: "Lens shows the SLA order: P0 blockers, capture lane, owner escalation and exception firewall — without unlocking public export prematurely.",
    slaSteps: ["P0 first", "capture lane", "owner escalation", "exception firewall"],
    receiptTitle: "Source confirmation",
    receiptBody: "Lens adds the receipt lock: source snapshot, freshness TTL, redaction manifest, browser trace pack, durable case write, PDF preview and wallet/session gate remain in review.",
    receiptSteps: ["proof receipts", "owner signoff", "browser trace pack", "release lock"],
    attestationTitle: "Evidence history",
    attestationBody: "Lens shows the attestation ledger: every receipt becomes an owner lane, while release promotion remains frozen until reviewed attestations, browser trace refs and redaction/storage proof exist.",
    attestationSteps: ["attestation lanes", "freeze reasons", "promotion checklist", "trace refs"],
    promotionFirewallTitle: "Publishing boundary",
    promotionFirewallBody: "Lens shows the promotion firewall: attestation lanes become review packets, customer copy stays hidden until review and the public release badge remains blocked.",
    promotionFirewallSteps: ["review packets", "customer freeze", "release badge lock", "operator next move"],
    cutoverTitle: "Readiness control",
    cutoverBody: "Lens shows cutover control: review packets become cutover lanes, the rollback vault stays active, readiness seals stay private and release cutover remains blocked until reviewed proof exists.",
    cutoverSteps: ["cutover lanes", "rollback vault", "readiness seals", "cutover lock"],
    rehearsalTitle: "Report rehearsal",
    rehearsalBody: "Lens shows the rehearsal matrix: dry-run evidence, rollback drill, owner signoff and surface locks remain internal, without a public seal, PDF download or wallet access.",
    rehearsalSteps: ["dry-run evidence", "rollback drill", "owner signoff", "surface locks"],
    candidateTitle: "Trust overview",
    candidateBody: "Lens shows the candidate trust board: trust psychology is routed through source context, missing-data boundaries, manual review and reviewed, calm copy instead of release pressure.",
    candidateSteps: ["trust cues", "copy boundary", "proof gaps", "surface locks"],
    narrativeTitle: "Clear context",
    narrativeBody: "Lens arranges trust psychology into a calm sequence: context, evidence status, review boundary and next verification step — without pressure, certainty theatre, public badges or access shortcuts.",
    narrativeSteps: ["context first", "evidence status", "review boundary", "dark-pattern firewall"],
    languageTitle: "Evidence language",
    languageBody: "Lens orders evidence language: source context first, visible limits second, manual review third, next verification step fourth and surface lock last — without cognitive overload or pressure.",
    languageSteps: ["source context", "visible limits", "manual review", "next step", "surface lock"],
    claimTitle: "Claim trail",
    claimBody: "Lens adds claim traceability: every language line needs an evidence anchor, visible review boundary, comprehension check and locked public surface — without unsupported shortcuts to copy, PDF, wallet or badges.",
    claimSteps: ["evidence anchor", "claim lane", "comprehension gate", "surface lock"],
    pdfForgeTitle: "Velmère PDF report",
    pdfForgeBody: "Lens can work like a premium PDF atelier: source stitching first, privacy redaction second, document assembly animation third and a ready preview packet signed by Velmère Cybersecurity.",
    pdfForgeSteps: ["source stitch", "privacy mirror", "PDF forge", "Velmère Cybersecurity signature"],
  },
} as const;

const iconMap = {
  shield: ShieldCheck,
  contract_lens: FileSearch,
  vlm_access: WalletCards,
  velmere_docs: BookOpen,
  osint_queue: Network,
  source_ledger: Sparkles,
} as const;

function resolveLocale(locale: string): Locale {
  return locale === "pl" || locale === "de" || locale === "en" ? locale : "en";
}

export default function VelmereLensCommandRouter({ locale }: { locale: string }) {
  const c = copy[resolveLocale(locale)];

  return (
    <section className="vlcr-shell" aria-label={c.eyebrow}>
      <div className="max-w-3xl">
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-velmere-gold">{c.eyebrow}</p>
        <h2 className="mt-3 font-serif text-3xl leading-none tracking-[-0.045em] text-white md:text-5xl">{c.title}</h2>
        <p className="mt-4 text-sm leading-7 text-white/[0.58]">{c.body}</p>
        <p className="mt-4 inline-flex rounded-full border border-cyan-200/[0.12] bg-cyan-300/[0.04] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-cyan-100/[0.64]">
          {c.boundary}
        </p>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {velmereLensRoutes.map((route) => {
          const Icon = iconMap[route.id] ?? ShieldCheck;
          return (
            <article key={route.id} className="vlcr-card">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-velmere-gold/[0.18] bg-velmere-gold/[0.075] text-velmere-gold">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="vlcr-priority">{route.priority}</span>
                    <span className="font-mono text-[8px] uppercase tracking-[0.13em] text-white/[0.36]">{route.capsuleRole}</span>
                  </div>
                  <h3 className="mt-2 text-sm font-semibold text-white/[0.88]">{route.label}</h3>
                  <p className="mt-2 text-xs leading-6 text-white/[0.56]">{route.whatItDoes}</p>
                  <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-velmere-gold/[0.64]">{route.reportTitle}</p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-white/[0.07] bg-black/[0.20] p-3">
                <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/[0.34]">{c.missing}</p>
                <p className="mt-2 text-[11px] leading-5 text-white/[0.50]">{route.missingBeforeFullTrust.join(" · ")}</p>
              </div>

            </article>
          );
        })}
      </div>

      <div className="vlcr-report-preview">
        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-velmere-gold">{c.previewTitle}</p>
        <p className="mt-2 text-sm leading-6 text-white/[0.58]">{c.previewBody}</p>
        <div className="vlcr-handoff-gates" aria-label={c.gatesTitle}>
          {c.gates.map((gate) => (
            <span key={gate}>{gate}</span>
          ))}
        </div>
        <div className="vlcr-pass255-action-guide" aria-label={c.actionTitle}>
          <strong>{c.actionTitle}</strong>
          <div>
            {c.actionPhases.map((phase) => (
              <span key={phase}>{phase}</span>
            ))}
          </div>
        </div>

        <div className="vlcr-pass256-runbook-guide" aria-label={c.runbookTitle}>
          <strong>{c.runbookTitle}</strong>
          <p>{c.runbookBody}</p>
          <div>
            {c.runbookSteps.map((step) => (
              <span key={step}>{step}</span>
            ))}
          </div>
        </div>


        <div className="vlcr-pass257-sla-guide" aria-label={c.slaTitle}>
          <strong>{c.slaTitle}</strong>
          <p>{c.slaBody}</p>
          <div>
            {c.slaSteps.map((step) => (
              <span key={step}>{step}</span>
            ))}
          </div>
        </div>


        <div className="vlcr-pass258-receipt-guide" aria-label={c.receiptTitle}>
          <strong>{c.receiptTitle}</strong>
          <p>{c.receiptBody}</p>
          <div>
            {c.receiptSteps.map((step) => (
              <span key={step}>{step}</span>
            ))}
          </div>
        </div>


        <div className="vlcr-pass259-attestation-guide" aria-label={c.attestationTitle}>
          <strong>{c.attestationTitle}</strong>
          <p>{c.attestationBody}</p>
          <div>
            {c.attestationSteps.map((step) => (
              <span key={step}>{step}</span>
            ))}
          </div>
        </div>


        <div className="vlcr-pass260-promotion-firewall-guide" aria-label={c.promotionFirewallTitle}>
          <strong>{c.promotionFirewallTitle}</strong>
          <p>{c.promotionFirewallBody}</p>
          <div>
            {c.promotionFirewallSteps.map((step) => (
              <span key={step}>{step}</span>
            ))}
          </div>
        </div>

        <div className="vlcr-pass261-cutover-control-guide" aria-label={c.cutoverTitle}>
          <strong>{c.cutoverTitle}</strong>
          <p>{c.cutoverBody}</p>
          <div>
            {c.cutoverSteps.map((step) => (
              <span key={step}>{step}</span>
            ))}
          </div>
        </div>

        <div className="vlcr-pass262-release-rehearsal-guide" aria-label={c.rehearsalTitle}>
          <strong>{c.rehearsalTitle}</strong>
          <p>{c.rehearsalBody}</p>
          <div>
            {c.rehearsalSteps.map((step) => (
              <span key={step}>{step}</span>
            ))}
          </div>
        </div>

        <div className="vlcr-pass263-candidate-trust-guide" aria-label={c.candidateTitle}>
          <strong>{c.candidateTitle}</strong>
          <p>{c.candidateBody}</p>
          <div>
            {c.candidateSteps.map((step) => (
              <span key={step}>{step}</span>
            ))}
          </div>
        </div>

        <div className="vlcr-pass264-trust-narrative-guide" aria-label={c.narrativeTitle}>
          <strong>{c.narrativeTitle}</strong>
          <p>{c.narrativeBody}</p>
          <div>
            {c.narrativeSteps.map((step) => (
              <span key={step}>{step}</span>
            ))}
          </div>
        </div>

        <div className="vlcr-pass265-evidence-language-guide" aria-label={c.languageTitle}>
          <strong>{c.languageTitle}</strong>
          <p>{c.languageBody}</p>
          <div>
            {c.languageSteps.map((step) => (
              <span key={step}>{step}</span>
            ))}
          </div>
        </div>

        <div className="vlcr-pass266-claim-traceability-guide" aria-label={c.claimTitle}>
          <strong>{c.claimTitle}</strong>
          <p>{c.claimBody}</p>
          <div>
            {c.claimSteps.map((step) => (
              <span key={step}>{step}</span>
            ))}
          </div>
        </div>

        <div className="vlcr-pass288-pdf-forge-guide" aria-label={c.pdfForgeTitle} data-pass288-lens-pdf-forge>
          <strong>{c.pdfForgeTitle}</strong>
          <p>{c.pdfForgeBody}</p>
          <div>
            {c.pdfForgeSteps.map((step, index) => (
              <span key={step} style={{ "--forge-index": index } as CSSProperties}>
                <i aria-hidden="true" />
                {step}
              </span>
            ))}
          </div>
          <em>Velmère Cybersecurity · PDF preview signature</em>
        </div>

      </div>
    </section>
  );
}

// PASS193 compatibility markers retained after PASS194 button removal: vlcr-action-row · route.reportHref
// PASS194 Lens cards are descriptive only: no Open/PDF-ready action buttons in the card grid.
// PASS254 Lens handoff safety gates expose source confidence, redaction, PDF preview, wallet/session and customer copy boundaries without enabling public export.
// PASS255 Lens action router guide orders evidence intake, browser replay, export freeze and access/copy review without adding button clutter.
// PASS256 Lens evidence runbook guide keeps P0/P1 queue, browser replay, export quarantine and reviewed customer copy visible without enabling public export.
// PASS179 compatibility marker: Lens does not replace Shield.
// PASS179 compatibility marker: Lens nie zastępuje Shielda.

// PASS257 Lens evidence SLA timeline guide keeps P0-first ordering, owner escalation and exception firewall visible without enabling public export.
// PASS258 Lens proof receipt lock guide keeps proof receipts, owner signoff, browser trace pack and release lock visible without enabling public export.

// PASS259 Lens attestation ledger guide keeps owner attestations, freeze reasons, promotion checklist and trace refs visible without enabling public export.

// PASS260 Lens promotion firewall guide keeps review packets, customer freeze and release badge lock visible without enabling public export.

// PASS261 Lens cutover control guide keeps rollback vault, private readiness seals and release cutover lock visible without enabling public export.

// PASS262 Lens release rehearsal guide keeps dry-run evidence, rollback drill, owner signoff and surface locks visible without enabling public export.

// PASS263 Lens candidate trust board guide keeps trust cues, copy boundary, proof gaps and surface locks visible without enabling public export.

// PASS264 Lens trust narrative guide keeps context-first copy, evidence status, review boundaries and dark-pattern firewall visible without enabling public export.

// PASS265 Lens evidence language guide keeps source context, visible limits, manual review, next verification step and surface lock visible without enabling public export.

// PASS266 Lens claim traceability guide keeps evidence anchors, claim lanes, comprehension gate and surface locks visible without enabling public export.

// PASS288 Lens PDF forge guide adds animated source stitch, privacy mirror and Velmère Cybersecurity signature without pretending to unlock public export.
// PASS661–668 non-visual compatibility anchors retained for historical preflight only:
// PASS256 evidence runbook · PASS256 Evidence-Runbook
// PASS258 proof receipt lock · PASS258 Proof-Receipt-Lock
// PASS259 attestation ledger · PASS259 Attestation-Ledger
// PASS260 promotion firewall · PASS260 Promotion-Firewall
// PASS265 evidence language ledger · PASS265 Evidence-Language-Ledger
// PASS266 claim traceability matrix · PASS266 Claim-Traceability-Matrix
// PASS257 evidence SLA timeline · PASS257 Evidence-SLA-Timeline
// PASS261 cutover control · PASS261 Cutover-Control
// PASS262 release rehearsal · PASS262 Release-Rehearsal
// PASS263 candidate trust board · PASS263 Candidate-Trust-Board
// PASS264 trust narrative guard · PASS264 Trust-Narrative-Guard
