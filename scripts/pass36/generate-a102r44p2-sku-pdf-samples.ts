import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { buildCustomerSafeMinimalPdf, planCustomerSafePdf } from "../../lib/security/pro-audit-pdf/customer-safe-renderer";
import { CURRENT_AUDIT_TIER_CONTRACTS, type AuditTierId } from "../../lib/security/audit-tier-contract";
import { CURRENT_AUDIT_COMMERCIAL_SKU_TRUTH } from "../../lib/security/audit-commercial-sku-truth";

const outputArgIndex = process.argv.indexOf("--output-dir");
if (outputArgIndex < 0 || !process.argv[outputArgIndex + 1]) throw new Error("--output-dir is required");
const outputDir = path.resolve(process.argv[outputArgIndex + 1]);
if (fs.existsSync(outputDir)) throw new Error(`output_dir_already_exists:${outputDir}`);
fs.mkdirSync(outputDir, { recursive: true });

const sha256 = (value: Buffer | string) => crypto.createHash("sha256").update(value).digest("hex");
const locales = ["pl", "en", "de"] as const;
const tiers: AuditTierId[] = ["basic", "pro", "advanced"];
const text = {
  pl: {
    scope: "Automatyczna analiza informacyjna dostarczonego snapshotu kontraktu.",
    evidence: "Dowody są związane z identyfikacją kontraktu, świeżością i źródłem.",
    limitations: "Raport nie jest audytem człowieka, niezależnym certyfikatem, gwarancją bezpieczeństwa ani poradą inwestycyjną.",
    next: "Przed użyciem wyniku potwierdź najnowszy bytecode, implementację proxy i uprawnienia administratora.",
  },
  en: {
    scope: "Automated informational analysis of the supplied contract snapshot.",
    evidence: "Evidence is bound to contract identity, freshness and source provenance.",
    limitations: "This report is not human-reviewed, independently certified, guaranteed safe or personalised investment advice.",
    next: "Verify the latest bytecode, proxy implementation and administrator permissions before relying on the result.",
  },
  de: {
    scope: "Automatisierte Informationsanalyse des bereitgestellten Contract-Snapshots.",
    evidence: "Die Evidenz ist an Contract-Identität, Aktualität und Quellenherkunft gebunden.",
    limitations: "Dieser Bericht ist kein Human-Review, keine unabhängige Zertifizierung, keine Sicherheitsgarantie und keine persönliche Anlageberatung.",
    next: "Vor der Nutzung Bytecode, Proxy-Implementierung und Administratorrechte erneut prüfen.",
  },
} as const;

const entries: Array<Record<string, unknown>> = [];
for (const locale of locales) {
  for (const tier of tiers) {
    const contract = CURRENT_AUDIT_TIER_CONTRACTS[tier];
    const truth = CURRENT_AUDIT_COMMERCIAL_SKU_TRUTH[tier];
    const lines = [
      "SCOPE",
      text[locale].scope,
      "TIER",
      `${tier.toUpperCase()} - ${truth.productClass.replaceAll("_", " ")}`,
      "MATERIAL VALUE",
      ...contract.includes.map((row) => `- ${row}`),
      "EVIDENCE",
      text[locale].evidence,
      ...(tier === "pro" || tier === "advanced" ? ["- multi-family evidence trace", "- source and freshness register"] : []),
      ...(tier === "advanced" ? ["CONTRADICTIONS", "- contradiction and abstention register", "SCENARIOS", "- expanded economic and control scenarios", "REMEDIATION", "- prioritised remediation and retest map"] : []),
      "LIMITATIONS",
      text[locale].limitations,
      "NEXT SAFE CHECK",
      text[locale].next,
    ];
    const documentId = `VLM-R44P2-${tier.toUpperCase()}-${locale.toUpperCase()}-0001`;
    const options = {
      title: `VELMÈRE SECURITY - ${tier.toUpperCase()} AUTOMATED ANALYSIS`,
      subtitle: `Evidence-bound informational report | ${locale.toUpperCase()}`,
      documentId,
      generatedAt: "2026-08-02T00:00:00.000Z",
      locale,
      classification: "customer_safe" as const,
    };
    const plan = planCustomerSafePdf(lines, options);
    const bytes = buildCustomerSafeMinimalPdf(lines, options);
    const fileName = `${tier}-${locale}.pdf`;
    const filePath = path.join(outputDir, fileName);
    fs.writeFileSync(filePath, bytes, { flag: "wx" });
    entries.push({
      tier,
      locale,
      fileName,
      bytes: bytes.length,
      sha256: sha256(bytes),
      pages: plan.pages.length,
      contentDigest: plan.contentDigest,
      planDigest: plan.planDigest,
      issuerLine: plan.issuerLine,
      integrityLine: plan.integrityLine,
      saleDecision: truth.decision,
      humanReviewed: truth.humanReviewed,
      independentlyCertified: truth.independentlyCertified,
    });
  }
}
const manifestCore = {
  schemaVersion: "velmere.pass36.a102r44p2.sku-pdf-samples.v1",
  generatedAt: "2026-08-02T00:00:00.000Z",
  sampleCount: entries.length,
  entries,
  truthBoundary: "Deterministic local customer-safe samples. They are not real customer PDFs, human-reviewed audits, independent certification or LIVE evidence.",
};
const manifest = { ...manifestCore, manifestSha256: sha256(JSON.stringify(manifestCore)) };
fs.writeFileSync(path.join(outputDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });
console.log(JSON.stringify({ status: "PASS_A102R44P2_SKU_PDF_SAMPLES", ...manifest }, null, 2));
