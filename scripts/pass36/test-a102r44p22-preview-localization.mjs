import assert from "node:assert/strict";
import fs from "node:fs";
import { buildAuditPaidTierPreview } from "../../lib/security/audit-tier-preview.ts";
import { buildAuditPaidTierPreviewPdf } from "../../lib/security/audit-tier-preview-pdf.ts";

const rows = [];
const check = (id, condition, detail = null) => {
  assert.ok(condition, id);
  rows.push({ id, passed: true, detail });
};

const pl = buildAuditPaidTierPreview({ tier: "pro", locale: "pl" });
const de = buildAuditPaidTierPreview({ tier: "pro", locale: "de" });
const en = buildAuditPaidTierPreview({ tier: "pro", locale: "en" });

const plText = JSON.stringify(pl);
const deText = JSON.stringify(de);
const enText = JSON.stringify(en);

for (const [id, text, required, forbidden] of [
  ["pl", plText, ["Automatyczna analiza wstępna", "rejestr ustaleń", "rejestr sprzeczności", "ponowny audyt", "Niezatwierdzone pola dostawcy danych"], ["Unapproved provider fields", "contradiction register", "Technical appendix", "Finding confidence"]],
  ["de", deText, ["Automatische Vorprüfung", "Befund- und Herkunftsregister", "Widerspruchsregister", "erneute Prüfung", "Felder externer Datenanbieter"], ["Unapproved provider fields", "Finding confidence", "Team workflow", "Provider-Feld"]],
  ["en", enText, ["Automated prescreen", "contradiction register", "Technical appendix", "Unapproved provider fields"], ["Niezatwierdzone pola", "Nicht genehmigte Felder"]],
]) {
  for (const needle of required) check(`${id}:required:${needle}`, text.includes(needle));
  for (const needle of forbidden) check(`${id}:forbidden:${needle}`, !text.includes(needle));
}

const pdfSource = fs.readFileSync("lib/security/audit-tier-preview-pdf.ts", "utf8");
const modalSource = fs.readFileSync("components/security/AuditPaidPreviewModal.tsx", "utf8");
check("pdf:pl-workflow-localized", pdfSource.includes('workflow: "SPOSÓB PRACY"'));
check("pdf:de-workflow-localized", pdfSource.includes('workflow: "ARBEITSABLAUF"'));
check("pdf:pl-integrity-localized", pdfSource.includes("Integralność dokumentu zweryfikowana przez Velmère"));
check("pdf:de-integrity-localized", pdfSource.includes("Dokumentintegrität durch Velmère verifiziert"));
check("pdf:de-withheld-localized", pdfSource.includes("VOLLSTÄNDIGE BEFUNDE, QUELLCODE"));
check("modal:pl-workflow-localized", modalSource.includes('workflow: "Sposób pracy"'));
check("modal:de-workflow-localized", modalSource.includes('workflow: "Arbeitsablauf"'));
check("modal:severity-localized", modalSource.includes("copy.highExample") && modalSource.includes("copy.mediumExample"));

for (const locale of ["pl", "en", "de"]) {
  for (const tier of ["pro", "advanced"]) {
    const { pdf, preview } = buildAuditPaidTierPreviewPdf({ tier, locale });
    const latin = pdf.toString("latin1");
    check(`${locale}:${tier}:pdf-header`, pdf.subarray(0, 8).toString("ascii") === "%PDF-1.7");
    check(`${locale}:${tier}:pdf-no-active-content`, ["/JavaScript", "/OpenAction", "/Launch", "/EmbeddedFile", "/XFA", "/Encrypt"].every((marker) => !latin.includes(marker)));
    check(`${locale}:${tier}:preview-truth`, preview.previewOnly && !preview.fullContentIncluded && preview.criticalDetailsWithheld);
  }
}

console.log(JSON.stringify({
  schemaVersion: "velmere.pass36.a102r44p22.preview-localization.v1",
  status: "PASS",
  checks: rows.length,
  passed: rows.length,
  failed: 0,
  rows,
}, null, 2));
