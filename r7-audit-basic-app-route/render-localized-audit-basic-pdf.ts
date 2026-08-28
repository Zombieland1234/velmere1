import crypto from "node:crypto";
import fs from "node:fs";

import {
  buildCustomerSafeMinimalPdf,
  planCustomerSafePdf,
} from "../lib/security/pro-audit-pdf/customer-safe-renderer";

type Locale = "pl" | "en" | "de";

const locale = process.argv[2] as Locale | undefined;
const outputPath = process.argv[3];
const documentId = process.argv[4];
const generatedAt = process.argv[5];

if (!locale || !["pl", "en", "de"].includes(locale)) {
  throw new Error("locale_invalid");
}
if (!outputPath || !documentId || !generatedAt) {
  throw new Error("render_arguments_missing");
}
if (!/^AUD-[A-F0-9]{10}$/.test(documentId)) {
  throw new Error("document_id_invalid");
}
if (!Number.isFinite(Date.parse(generatedAt))) {
  throw new Error("generated_at_invalid");
}

const copy: Record<Locale, {
  title: string;
  subtitle: string;
  footer: string;
  lines: string[];
}> = {
  pl: {
    title: "Velmère — Raport Audytu Basic",
    subtitle: "Bezpieczeństwo inteligentnego kontraktu",
    footer: "Wynik opisuje dostarczone dowody; nie jest poradą inwestycyjną.",
    lines: [
      "Zakres: kontrola techniczna A01–A05.",
      "Łańcuch: BSC (56).",
      "Status dowodów: zweryfikowane technicznie.",
      "Niepewność: brakujące dowody pozostają jawnie brakujące.",
      "Ograniczenie: raport nie zastępuje kwalifikowanej oceny człowieka.",
      "Integralność: bajty PDF są związane z kontem i identyfikatorem sprawy.",
    ],
  },
  en: {
    title: "Velmère — Audit Basic Report",
    subtitle: "Smart-contract security review",
    footer: "The result describes supplied evidence; it is not investment advice.",
    lines: [
      "Scope: technical A01–A05 controls.",
      "Chain: BSC (56).",
      "Evidence status: technically verified.",
      "Uncertainty: missing evidence remains explicitly missing.",
      "Boundary: this report does not replace qualified human review.",
      "Integrity: PDF bytes are bound to the account and case identifier.",
    ],
  },
  de: {
    title: "Velmère — Audit-Basic-Bericht",
    subtitle: "Sicherheitsprüfung für Smart Contracts",
    footer: "Das Ergebnis beschreibt Belege; es ist keine Anlageberatung.",
    lines: [
      "Umfang: technische Kontrollen A01–A05.",
      "Blockchain: BSC (56).",
      "Belegstatus: technisch geprüft.",
      "Unsicherheit: fehlende Belege bleiben ausdrücklich als fehlend markiert.",
      "Grenze: Der Bericht ersetzt keine qualifizierte menschliche Prüfung.",
      "Integrität: PDF-Bytes sind an Konto und Fallkennung gebunden.",
    ],
  },
};

const selected = copy[locale];
const options = {
  title: selected.title,
  subtitle: selected.subtitle,
  footer: selected.footer,
  integrityLabel: `Case ${documentId}`,
  issuer: "Velmère",
  generator: "r7-audit-basic-promoted-source",
  documentId,
  generatedAt,
  locale,
  classification: "customer_private" as const,
};
const plan = planCustomerSafePdf(selected.lines, options);
if (plan.unsupportedGlyphReplacements !== 0) {
  throw new Error("localized_glyph_replacement_detected");
}
const bytes = Buffer.from(buildCustomerSafeMinimalPdf(selected.lines, options));
if (bytes.byteLength < 10_000 || !bytes.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
  throw new Error("rendered_pdf_invalid");
}
fs.writeFileSync(outputPath, bytes, { flag: "wx" });
const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");

process.stdout.write(JSON.stringify({
  schemaVersion: "velmere.r7.audit-basic-localized-pdf-render.v1",
  locale,
  documentId,
  pdfSha256: `sha256:${sha256}`,
  pdfByteLength: bytes.byteLength,
  pageCount: plan.pages.length,
  renderedRowCount: plan.renderedRowCount,
  unsupportedGlyphReplacements: plan.unsupportedGlyphReplacements,
  planDigest: plan.planDigest,
}));
