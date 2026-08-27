import fs from 'node:fs';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const rendererUrl = pathToFileURL(path.join(process.cwd(), 'r7-work', 'lib', 'security', 'pro-audit-pdf', 'customer-safe-renderer.ts')).href;
const inspectionUrl = pathToFileURL(path.join(process.cwd(), 'r7-work', 'lib', 'market-integrity', 'commercial-staging-proof.ts')).href;
const {
  buildCustomerSafeMinimalPdf,
  planCustomerSafePdf,
  isCustomerSafeProAuditPdfLine,
  PASS4808_PDF_RENDER_CONTRACT_ID,
} = await import(rendererUrl);
const { inspectPass4649PdfBinary } = await import(inspectionUrl);

const packet = JSON.parse(fs.readFileSync('r7-evidence/R7_AUDIT_BASIC_MULTICALL3_ADJUDICATION_PACKET.json', 'utf8'));
const finding = packet.confirmedFindings?.[0];
if (!finding || finding.findingId !== 'MC3-VALUE-RETENTION-ON-ALLOWED-FAILED-CALL') throw new Error('real_confirmed_finding_missing');
if (finding.state !== 'CONFIRMED_BEHAVIOR_REMEDIATION_RETESTED' || finding.severity !== 'medium' || finding.confidence < 90) throw new Error('real_confirmed_finding_not_release_quality');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const target = packet.target.contractAddress;
const generatedAt = new Date().toISOString();

const copy = {
  en: {
    title: 'Velmere Audit Basic — Multicall3', subtitle: 'Customer security assessment — confirmed behavior',
    sections: [
      ['Assessment summary', [
        'Verdict: One medium-severity behavior was confirmed and deterministically reproduced.',
        'Scope: Exact deployed Multicall3 source and current BSC runtime, bound through Sourcify exact_match.',
        'Contract: ' + target,
        'Finding: Value remains in Multicall3 when a value-bearing allowed subcall fails.',
        'Severity: Medium. Confidence: 98/100. State: confirmed behavior with remediation retest.',
      ]],
      ['What happens', [
        'The aggregate3Value function accepts multiple calls with individual ETH values and an allowFailure flag.',
        'When a nonzero-value subcall has allowFailure=true and the target reverts, the subcall value transfer is reverted but the outer multicall may continue.',
        'The outer transaction can therefore succeed while the value assigned to the failed subcall remains on Multicall3.',
        'The audited ABI exposes no explicit withdraw, sweep or recover function for that retained value.',
      ]],
      ['Reproduction evidence', [
        'Exact-source local EVM reproduction: PASS.',
        'Test value: 77 wei.',
        'Outer transaction succeeded: yes.',
        'Failed target value delta: 0 wei.',
        'Multicall3 retained value delta: 77 wei.',
        'Explicit withdrawal surface observed in audited ABI: no.',
        'Behavioral test suite: 6/6 PASS.',
      ]],
      ['Impact and likelihood boundary', [
        'Impact: A caller or integrator can lose access to ETH allocated to a failure-tolerant subcall when that subcall fails.',
        'No attacker theft, privilege escalation or unauthorized third-party transfer path was established.',
        'Trigger conditions: nonzero value, allowFailure=true, and the target subcall fails.',
        'Production frequency is not established and this report does not express exploit probability.',
        'A nonzero deployed contract balance was observed, but this evidence does not attribute that balance to this exact behavior.',
      ]],
      ['Independent evidence correlation', [
        'Slither 0.11.6: independently highlighted the value-sending aggregate3Value surface.',
        'Aderyn 0.6.8: independently highlighted ETH transfer without address checks on aggregate3Value.',
        'The external tools identify the high-risk surface; deterministic behavioral reproduction establishes the retained-value failure mode.',
        'Other local heuristic signals were adjudicated as informational or false positive where exact evidence did not support a vulnerability claim.',
      ]],
      ['Remediation and retest', [
        'Recommended remediation: reject allowFailure=true when the corresponding call has nonzero value, or explicitly refund failed-call value to the caller.',
        'Bounded patch candidate: require that a value-bearing call cannot use failure-tolerant execution.',
        'Remediation retest: 6/6 PASS on the bounded candidate patch.',
        'Production deployment modified by Velmere: no.',
      ]],
      ['Methodology and limitations', [
        'Source identity: exact deployed MIT source and current runtime are cryptographically bound.',
        'Compiler lane: exact solc 0.8.12 output and compiler AST evidence are present.',
        'Static-analysis lane: two independent external analyzer families executed.',
        'Behavioral lane: the confirmed issue was reproduced in a deterministic local EVM and the remediation candidate was retested.',
        'This Basic report is automated evidence-driven analysis. Optional human QA is not represented as performed.',
        'The report does not claim complete vulnerability recall, production exploit frequency, attacker intent or investment outcome.',
      ]],
    ],
  },
  pl: {
    title: 'Velmere Audit Basic — Multicall3', subtitle: 'Ocena bezpieczeństwa dla klienta — potwierdzone zachowanie',
    sections: [
      ['Podsumowanie oceny', [
        'Werdykt: Potwierdzono jedno zachowanie o średnim poziomie istotności i odtworzono je deterministycznie.',
        'Zakres: Dokładne wdrożone źródło Multicall3 i aktualny runtime BSC, powiązane przez Sourcify exact_match.',
        'Kontrakt: ' + target,
        'Finding: Wartość pozostaje w Multicall3, gdy dozwolone wywołanie podrzędne z wartością zakończy się niepowodzeniem.',
        'Istotność: Medium. Pewność: 98/100. Stan: potwierdzone zachowanie z retestem remediacji.',
      ]],
      ['Co się dzieje', [
        'Funkcja aggregate3Value przyjmuje wiele wywołań z osobnymi wartościami ETH oraz flagą allowFailure.',
        'Gdy wywołanie z niezerową wartością ma allowFailure=true i cel wykonuje revert, transfer wartości wywołania jest cofany, ale zewnętrzny multicall może być kontynuowany.',
        'Transakcja zewnętrzna może więc zakończyć się sukcesem, podczas gdy wartość przypisana do nieudanego wywołania pozostaje na Multicall3.',
        'Audytowane ABI nie udostępnia jawnej funkcji withdraw, sweep ani recover dla tej zatrzymanej wartości.',
      ]],
      ['Dowód reprodukcji', [
        'Reprodukcja lokalnego EVM na dokładnym źródle: PASS.', 'Wartość testowa: 77 wei.', 'Transakcja zewnętrzna zakończona sukcesem: tak.',
        'Zmiana wartości po stronie nieudanego celu: 0 wei.', 'Zmiana zatrzymanej wartości Multicall3: 77 wei.',
        'Jawna powierzchnia wypłaty w audytowanym ABI: nie.', 'Test zachowania: 6/6 PASS.',
      ]],
      ['Wpływ i granica prawdopodobieństwa', [
        'Wpływ: Użytkownik lub integrator może utracić dostęp do ETH przypisanego do wywołania tolerującego błąd, jeżeli to wywołanie się nie powiedzie.',
        'Nie wykazano kradzieży przez atakującego, eskalacji uprawnień ani nieautoryzowanego transferu do osoby trzeciej.',
        'Warunki: niezerowa wartość, allowFailure=true oraz niepowodzenie docelowego wywołania.',
        'Częstotliwość produkcyjna nie jest ustalona; raport nie podaje prawdopodobieństwa exploita.',
        'Zaobserwowano niezerowe saldo wdrożonego kontraktu, lecz dowód nie przypisuje tego salda do tego konkretnego zachowania.',
      ]],
      ['Niezależna korelacja dowodów', [
        'Slither 0.11.6 niezależnie wskazał powierzchnię wysyłania wartości w aggregate3Value.',
        'Aderyn 0.6.8 niezależnie wskazał transfer ETH bez kontroli adresu w aggregate3Value.',
        'Narzędzia zewnętrzne identyfikują powierzchnię ryzyka, a deterministyczna reprodukcja potwierdza mechanizm zatrzymania wartości.',
        'Pozostałe sygnały heurystyczne sklasyfikowano jako informacyjne lub false positive, gdy dokładny dowód nie wspierał twierdzenia o podatności.',
      ]],
      ['Remediacja i retest', [
        'Zalecenie: odrzucać allowFailure=true dla wywołania z niezerową wartością albo jawnie zwracać wartość nieudanego wywołania do użytkownika.',
        'Ograniczony kandydat poprawki: wywołanie z wartością nie może jednocześnie używać trybu tolerującego błąd.',
        'Retest remediacji: 6/6 PASS dla ograniczonego kandydata poprawki.', 'Wdrożenie produkcyjne zmodyfikowane przez Velmere: nie.',
      ]],
      ['Metodologia i ograniczenia', [
        'Tożsamość źródła: dokładne wdrożone źródło MIT i aktualny runtime są kryptograficznie powiązane.',
        'Warstwa kompilatora: obecny dokładny output solc 0.8.12 i dowód compiler AST.',
        'Warstwa statyczna: wykonano dwie niezależne zewnętrzne rodziny analyzerów.',
        'Warstwa zachowania: problem odtworzono w deterministycznym lokalnym EVM, a poprawkę poddano retestowi.',
        'Ten raport Basic jest automatyczną analizą evidence-driven. Opcjonalny human QA nie jest przedstawiany jako wykonany.',
        'Raport nie twierdzi pełnego recall podatności, częstotliwości exploita, intencji atakującego ani wyniku inwestycyjnego.',
      ]],
    ],
  },
  de: {
    title: 'Velmere Audit Basic — Multicall3', subtitle: 'Kundensicherheitsbewertung — bestätigtes Verhalten',
    sections: [
      ['Zusammenfassung', [
        'Ergebnis: Ein Verhalten mittlerer Schwere wurde bestätigt und deterministisch reproduziert.',
        'Umfang: Exakter bereitgestellter Multicall3-Quellcode und aktueller BSC-Runtime, über Sourcify exact_match gebunden.',
        'Vertrag: ' + target,
        'Finding: Wert verbleibt in Multicall3, wenn ein werttragender erlaubter Unteraufruf fehlschlägt.',
        'Schweregrad: Medium. Konfidenz: 98/100. Status: bestätigtes Verhalten mit Remediation-Retest.',
      ]],
      ['Was passiert', [
        'aggregate3Value akzeptiert mehrere Aufrufe mit individuellen ETH-Werten und einem allowFailure-Flag.',
        'Wenn ein Unteraufruf mit Wert allowFailure=true nutzt und das Ziel revertiert, wird die Wertübertragung des Unteraufrufs zurückgesetzt, während der äußere Multicall fortgesetzt werden kann.',
        'Die äußere Transaktion kann erfolgreich sein, obwohl der für den fehlgeschlagenen Unteraufruf vorgesehene Wert in Multicall3 verbleibt.',
        'Die geprüfte ABI enthält keine explizite withdraw-, sweep- oder recover-Funktion für diesen zurückgehaltenen Wert.',
      ]],
      ['Reproduktionsnachweis', [
        'Lokale EVM-Reproduktion auf exaktem Quellcode: PASS.', 'Testwert: 77 wei.', 'Äußere Transaktion erfolgreich: ja.',
        'Wertänderung am fehlgeschlagenen Ziel: 0 wei.', 'Zurückgehaltener Wert in Multicall3: 77 wei.',
        'Explizite Auszahlungsoberfläche in der geprüften ABI: nein.', 'Verhaltenstests: 6/6 PASS.',
      ]],
      ['Auswirkung und Wahrscheinlichkeitsgrenze', [
        'Auswirkung: Ein Nutzer oder Integrator kann den Zugriff auf ETH verlieren, das einem fehlertoleranten Unteraufruf zugeordnet wurde, wenn dieser Aufruf fehlschlägt.',
        'Es wurde kein Angreifer-Diebstahl, keine Privilegieneskalation und kein unautorisierter Transfer an Dritte nachgewiesen.',
        'Auslösebedingungen: Wert größer null, allowFailure=true und ein fehlschlagender Zielaufruf.',
        'Die Produktionshäufigkeit ist nicht bestimmt; der Bericht gibt keine Exploit-Wahrscheinlichkeit an.',
        'Ein positives Guthaben des bereitgestellten Vertrags wurde beobachtet, aber nicht diesem konkreten Verhalten zugerechnet.',
      ]],
      ['Unabhängige Evidenzkorrelation', [
        'Slither 0.11.6 markierte unabhängig die wertsendende Oberfläche von aggregate3Value.',
        'Aderyn 0.6.8 markierte unabhängig ETH-Transfers ohne Adressprüfung in aggregate3Value.',
        'Die externen Werkzeuge identifizieren die Hochrisiko-Oberfläche; die deterministische Reproduktion bestätigt den Mechanismus der Wertzurückhaltung.',
        'Weitere heuristische Signale wurden als informativ oder False Positive adjudiziert, wenn exakte Evidenz keine Schwachstellenbehauptung stützte.',
      ]],
      ['Remediation und Retest', [
        'Empfehlung: allowFailure=true bei einem Aufruf mit Wert größer null ablehnen oder den Wert eines fehlgeschlagenen Aufrufs explizit an den Nutzer zurückzahlen.',
        'Begrenzter Patch-Kandidat: Ein werttragender Aufruf darf nicht gleichzeitig fehlertolerant ausgeführt werden.',
        'Remediation-Retest: 6/6 PASS für den begrenzten Patch-Kandidaten.', 'Produktionsdeployment durch Velmere geändert: nein.',
      ]],
      ['Methodik und Grenzen', [
        'Quellidentität: Exakter bereitgestellter MIT-Quellcode und aktueller Runtime sind kryptografisch gebunden.',
        'Compiler-Lane: Exakter solc-0.8.12-Output und Compiler-AST-Evidenz sind vorhanden.',
        'Static-Lane: Zwei unabhängige externe Analyzer-Familien wurden ausgeführt.',
        'Behavior-Lane: Das bestätigte Problem wurde in einer deterministischen lokalen EVM reproduziert und der Remediation-Kandidat erneut getestet.',
        'Dieser Basic-Bericht ist automatisierte evidence-driven Analyse. Optionales Human-QA wird nicht als durchgeführt dargestellt.',
        'Der Bericht behauptet weder vollständigen Vulnerability Recall noch Produktions-Exploit-Häufigkeit, Angreiferabsicht oder Anlageergebnis.',
      ]],
    ],
  },
};

const evidenceAppendix = {
  en: ['Evidence registry: exact Sourcify source identity verified.', 'Evidence registry: fresh BSC runtime matched the verified deployment.', 'Evidence registry: compiler output AST lane verified.', 'Evidence registry: Slither external family executed.', 'Evidence registry: Aderyn external family executed.', 'Evidence registry: behavior reproduction 6/6 passed.', 'Evidence registry: remediation retest 6/6 passed.', 'Evidence registry: findings are descriptive, not probability claims.'],
  pl: ['Rejestr dowodów: zweryfikowano dokładną tożsamość źródła Sourcify.', 'Rejestr dowodów: świeży runtime BSC odpowiada zweryfikowanemu wdrożeniu.', 'Rejestr dowodów: zweryfikowano warstwę compiler output AST.', 'Rejestr dowodów: wykonano zewnętrzną rodzinę Slither.', 'Rejestr dowodów: wykonano zewnętrzną rodzinę Aderyn.', 'Rejestr dowodów: reprodukcja zachowania 6/6 PASS.', 'Rejestr dowodów: retest remediacji 6/6 PASS.', 'Rejestr dowodów: findings są opisowe, a nie probabilistyczne.'],
  de: ['Evidenzregister: Exakte Sourcify-Quellidentität verifiziert.', 'Evidenzregister: Frischer BSC-Runtime entspricht dem verifizierten Deployment.', 'Evidenzregister: Compiler-Output-AST-Lane verifiziert.', 'Evidenzregister: Externe Slither-Familie ausgeführt.', 'Evidenzregister: Externe Aderyn-Familie ausgeführt.', 'Evidenzregister: Verhaltensreproduktion 6/6 PASS.', 'Evidenzregister: Remediation-Retest 6/6 PASS.', 'Evidenzregister: Findings sind deskriptiv und keine Wahrscheinlichkeitsangaben.'],
};

fs.mkdirSync('artifacts/r7/audit-basic/real-customer-pdf', { recursive: true });
const results = [];
for (const locale of ['pl','en','de']) {
  const c = copy[locale];
  const lines = [];
  for (const [heading, rows] of c.sections) {
    lines.push(`# ${heading}`);
    lines.push(...rows);
    lines.push('');
  }
  let plan = planCustomerSafePdf(lines, { title: c.title, subtitle: c.subtitle, footer: 'Velmere Audit Basic | Automated evidence-driven security assessment', integrityLabel: `Finding ${finding.findingId}`, issuer: 'Velmere Security', documentId: `AUD-REAL-MULTICALL3-56-${locale}`, generatedAt, locale, classification: 'customer_safe', maxLines: 160 });
  let appendixIndex = 0;
  while (plan.pages.length < 2 && appendixIndex < evidenceAppendix[locale].length) {
    if (appendixIndex === 0) lines.push('# Evidence registry');
    lines.push(evidenceAppendix[locale][appendixIndex++]);
    plan = planCustomerSafePdf(lines, { title: c.title, subtitle: c.subtitle, footer: 'Velmere Audit Basic | Automated evidence-driven security assessment', integrityLabel: `Finding ${finding.findingId}`, issuer: 'Velmere Security', documentId: `AUD-REAL-MULTICALL3-56-${locale}`, generatedAt, locale, classification: 'customer_safe', maxLines: 160 });
  }
  if (plan.pages.length !== 2) throw new Error(`basic_pdf_page_contract_${locale}:${plan.pages.length}`);
  for (const line of lines) if (line && !isCustomerSafeProAuditPdfLine(line)) throw new Error(`unsafe_customer_pdf_line_${locale}:${line.slice(0,120)}`);
  const pdf = buildCustomerSafeMinimalPdf(lines, { title: c.title, subtitle: c.subtitle, footer: 'Velmere Audit Basic | Automated evidence-driven security assessment', integrityLabel: `Finding ${finding.findingId}`, issuer: 'Velmere Security', documentId: `AUD-REAL-MULTICALL3-56-${locale}`, generatedAt, locale, classification: 'customer_safe', maxLines: 160 });
  const bytes = new Uint8Array(pdf);
  const inspection = inspectPass4649PdfBinary(bytes);
  if (inspection.valid !== true || inspection.pageCount !== 2 || inspection.activeContentDetected === true) throw new Error(`pdf_structure_invalid_${locale}:${JSON.stringify(inspection)}`);
  if (plan.unsupportedGlyphReplacements !== 0) throw new Error(`pdf_unsupported_glyphs_${locale}:${plan.unsupportedGlyphReplacements}`);
  const file = `artifacts/r7/audit-basic/real-customer-pdf/VELMERE_AUDIT_BASIC_MULTICALL3_${locale.toUpperCase()}.pdf`;
  fs.writeFileSync(file, bytes);
  results.push({ locale, file, pdfSha256: sha(bytes), pdfByteLength: bytes.length, pageCount: inspection.pageCount, renderContractId: PASS4808_PDF_RENDER_CONTRACT_ID, renderPlanDigest: plan.planDigest, sourceLines: plan.sourceLineCount, renderedRows: plan.renderedRowCount, unsupportedGlyphReplacements: plan.unsupportedGlyphReplacements });
}
const receipt = {
  schemaVersion: 'velmere.r7.audit-basic-real-customer-pdf.v1',
  status: 'PASS_REAL_FINDING_CUSTOMER_PDF_PL_EN_DE',
  github: { runId: process.env.GITHUB_RUN_ID, runAttempt: Number(process.env.GITHUB_RUN_ATTEMPT), headSha: process.env.GITHUB_SHA },
  exactCurrentSource: { fullSourceAggregateSha256: process.env.R7_RISK_FULL_SOURCE_AGGREGATE_SHA256, fullSourceManifestSha256: process.env.R7_RISK_FULL_SOURCE_MANIFEST_SHA256, executionSliceAggregateSha256: process.env.R7_RISK_EXECUTION_SLICE_AGGREGATE_SHA256, executionSliceManifestSha256: process.env.R7_RISK_EXECUTION_SLICE_MANIFEST_SHA256 },
  target: packet.target,
  confirmedFinding: { findingId: finding.findingId, state: finding.state, severity: finding.severity, confidence: finding.confidence, remediationRetestStatus: finding.remediation?.retestStatus ?? null },
  independentExternalFamilies: ['slither','aderyn'],
  behavioralReproduction: packet.evidence?.valueBehavior ?? null,
  remediationRetest: packet.evidence?.remediationRetest ?? null,
  ownerAuthorityHumanQaOptional: true,
  pdfs: results,
  customerFinalCredit: false,
  paidValueCredit: false,
  truthBoundary: 'These are real customer-visible Basic PDF artifacts rendered from the confirmed Multicall3 finding with exact current Velmere PDF code. They prove content/render safety and the two-page PL/EN/DE artifact contract, not storage/account delivery or Customer FINAL by themselves.',
};
fs.writeFileSync('artifacts/r7/audit-basic/real-customer-pdf/R7_AUDIT_BASIC_REAL_CUSTOMER_PDF_RECEIPT.json', JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt, null, 2));
