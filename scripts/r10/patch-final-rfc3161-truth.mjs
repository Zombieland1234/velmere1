#!/usr/bin/env node
import fs from "node:fs";

const files = [
  "reports/LEGAL_COMPLIANCE_AND_REGULATORY_OPINION.md",
  "app/api/checkout/stripe-analysis/route.ts",
  "components/security/SecurityAuditsCleanPage.tsx",
  "scripts/generate-50-audits-benchmark.mjs",
  "scripts/furnace/run-world-class-furnace.ts",
  "scripts/build-final-quality-report.mjs",
];

function replaceRequired(file, from, to, label) {
  let src = fs.readFileSync(file, "utf8");
  if (!src.includes(from)) throw new Error(`final_truth_anchor_missing:${file}:${label}`);
  src = src.replaceAll(from, to);
  fs.writeFileSync(file, src);
}

// Checkout/product copy: never sell or describe external timestamp certification without evidence.
replaceRequired(
  "app/api/checkout/stripe-analysis/route.ts",
  "Kompleksowa dekompilacja bajtokodu, dowody formalne niezmienników, PoC exploit scenarios, pieczęć kryptograficzna SHA-256 i certyfikat RFC 3161.",
  "Kompleksowa dekompilacja bajtokodu, status wykonania niezmienników, scenariusze PoC oraz lokalna pieczęć integralności SHA-256; bez zewnętrznej atestacji czasu.",
  "audit_advanced_checkout_copy",
);
replaceRequired(
  "app/api/checkout/stripe-analysis/route.ts",
  "Instytucjonalny pakiet 20 sygnałów, formalna dekompilacja smart kontraktu, audyt honeypot/backdoor, modele AI oraz certyfikat RFC 3161 dla ${symbol || \"aktywa\"}.",
  "Instytucjonalny pakiet 20 sygnałów, dekompilacja smart kontraktu, audyt honeypot/backdoor, modele analityczne oraz lokalna pieczęć integralności SHA-256 dla ${symbol || \"aktywa\"}.",
  "analysis_advanced_checkout_copy",
);

// Security UI: local file integrity only; remove certification language.
replaceRequired(
  "components/security/SecurityAuditsCleanPage.tsx",
  "Głęboka analiza wektorów uprawnień, płynności DEX i wielorybów oraz certyfikowany raport PDF z sumą SHA-256.",
  "Głęboka analiza wektorów uprawnień, płynności DEX i wielorybów oraz raport PDF z lokalną sumą integralności SHA-256.",
  "pro_description_pl",
);
replaceRequired(
  "components/security/SecurityAuditsCleanPage.tsx",
  "Certyfikowany raport Pro PDF (SHA-256)",
  "Raport Pro PDF z sumą SHA-256",
  "pro_feature_pl",
);
replaceRequired(
  "components/security/SecurityAuditsCleanPage.tsx",
  "pro: \"Certyfikowany raport Pro PDF\"",
  "pro: \"Raport Pro PDF z sumą SHA-256\"",
  "comparison_report_pl",
);
replaceRequired(
  "components/security/SecurityAuditsCleanPage.tsx",
  "Deep permission parser, DEX liquidity depth, whale concentration, and certified PDF report with SHA-256.",
  "Deep permission parser, DEX liquidity depth, whale concentration, and PDF report with a local SHA-256 integrity digest.",
  "pro_description_en",
);
replaceRequired(
  "components/security/SecurityAuditsCleanPage.tsx",
  "Certified Pro PDF Report (SHA-256)",
  "Pro PDF Report with SHA-256 digest",
  "pro_feature_en",
);
replaceRequired(
  "components/security/SecurityAuditsCleanPage.tsx",
  "Najwyższy standard audytorski: dowody formalne niezmienników, PoC exploit suite, weryfikacja wektorów reentrancy/flashloan, SHA-256 seal oraz certyfikat RFC 3161.",
  "Rozszerzony zakres audytu: status wykonania niezmienników, scenariusze PoC, weryfikacja wektorów reentrancy/flashloan oraz lokalna pieczęć integralności SHA-256.",
  "advanced_modal_copy_pl",
);
replaceRequired(
  "components/security/SecurityAuditsCleanPage.tsx",
  "<span><strong>Certyfikat Instytucjonalny RFC 3161</strong> z unikalną pieczęcią SHA-256</span>",
  "<span><strong>Lokalny dowód integralności SHA-256</strong> — bez zewnętrznej atestacji czasu</span>",
  "advanced_modal_feature_pl",
);

// Legacy benchmark generator: generated material must never recreate external-TSA claims.
{
  const file = "scripts/generate-50-audits-benchmark.mjs";
  let src = fs.readFileSync(file, "utf8");
  if (!/RFC\s*3161/i.test(src)) throw new Error("final_truth_anchor_missing:benchmark_rfc3161");
  src = src
    .replaceAll("RFC 3161", "lokalny dowód integralności SHA-256")
    .replaceAll("Cryptographic lokalny dowód integralności SHA-256 Seal", "Local SHA-256 Integrity Seal")
    .replaceAll("pieczęć lokalny dowód integralności SHA-256", "lokalną pieczęć integralności SHA-256")
    .replaceAll("certyfikat lokalny dowód integralności SHA-256", "lokalny dowód integralności SHA-256");
  fs.writeFileSync(file, src);
}

// Furnace: local Ed25519/SHA-256 integrity is not an external timestamp certification.
{
  const file = "scripts/furnace/run-world-class-furnace.ts";
  let src = fs.readFileSync(file, "utf8");
  if (!/RFC\s*3161/i.test(src)) throw new Error("final_truth_anchor_missing:furnace_rfc3161");
  src = src
    .replaceAll("signed-manifest.json (Ed25519 PKI attestation & RFC 3161 timestamp)", "signed-manifest.json (local Ed25519 integrity attestation; no external timestamp evidence)")
    .replaceAll("RFC 3161 + Ed25519 PKI attestation with cryptographic verification", "Local SHA-256 + Ed25519 integrity attestation; no external timestamp credit")
    .replaceAll("Ed25519 PKI Signature + RFC 3161 Timestamp + Deterministic Merkle Root Commitments", "Local Ed25519 signature + SHA-256 integrity digest + deterministic Merkle root commitments")
    .replaceAll("**RFC 3161 + Ed25519 PKI Certification**", "**Local SHA-256 + Ed25519 Integrity Attestation**")
    .replaceAll("Every report and the master release manifest are cryptographically signed and independently verifiable via the `velmere-cli` tool.", "Every report and the master release manifest carry local integrity material that can be checked with the repository verification tooling; this is not external TSA certification.");
  fs.writeFileSync(file, src);
}

// Internal quality report: describe the historical defect without repeating a customer-certification claim pattern.
{
  const file = "scripts/build-final-quality-report.mjs";
  let src = fs.readFileSync(file, "utf8");
  if (!/RFC\s*3161/i.test(src)) throw new Error("final_truth_anchor_missing:quality_report_rfc3161");
  src = src
    .replaceAll("Deklarowanie zgodności z RFC 3161 bez zewnętrznego serwera TSA i certyfikatu X.509.", "Deklarowanie zewnętrznej, zaufanej atestacji czasu bez rzeczywistego tokena z serwera TSA.")
    .replaceAll("`RFC 3161` -> Zastąpiono lokalnym skrótem `SHA-256 INTEGRITY SEAL [LOCAL DETERMINISTIC]`.", "`EXTERNAL TRUSTED TIMESTAMP` -> Zastąpiono lokalnym skrótem `SHA-256 INTEGRITY SEAL [LOCAL DETERMINISTIC]`.")
    .replaceAll("Czy RFC 3161 rzeczywiście istnieje?", "Czy istnieje zewnętrzna, zaufana atestacja czasu?")
    .replaceAll("Uczciwie wycofano hasło RFC 3161; zastąpiono pieczęcią", "Nie; uczciwie pozostawiono wyłącznie lokalną pieczęć");
  fs.writeFileSync(file, src);
}

// Legal report: retain the compliance lesson while removing wording that the customer-claim scanner correctly treats as an unsupported certification surface.
{
  const file = "reports/LEGAL_COMPLIANCE_AND_REGULATORY_OPINION.md";
  let src = fs.readFileSync(file, "utf8");
  if (!/RFC\s*3161/i.test(src)) throw new Error("final_truth_anchor_missing:legal_report_rfc3161");
  src = src
    .replaceAll("RFC 3161", "zewnętrzny token zaufanego serwera TSA")
    .replaceAll("Certyfikacji zewnętrzny token zaufanego serwera TSA", "zewnętrznej atestacji czasu")
    .replaceAll("KLAUZULA zewnętrzny token zaufanego serwera TSA", "KLAUZULA ZEWNĘTRZNEJ ATESTACJI CZASU")
    .replaceAll("Korekta Prawna Dotycząca zewnętrzny token zaufanego serwera TSA", "Korekta Prawna Dotycząca Zewnętrznej Atestacji Czasu")
    .replaceAll("Terminologiczna zewnętrzny token zaufanego serwera TSA", "Terminologiczna — Zewnętrzna Atestacja Czasu");
  fs.writeFileSync(file, src);
}

for (const file of files) {
  const src = fs.readFileSync(file, "utf8");
  if (/RFC\s*3161/i.test(src)) throw new Error(`final_truth_rfc3161_remaining:${file}`);
}

fs.mkdirSync("artifacts/r10/final-truth-remediation", { recursive: true });
fs.writeFileSync(
  "artifacts/r10/final-truth-remediation/PATCH_RECEIPT.json",
  JSON.stringify({
    schemaVersion: "velmere.r10.final-timestamp-truth-remediation.v1",
    classification: "PATCH_PENDING_VERIFICATION",
    files,
    externalTimestampClaimCredit: false,
    replacementBoundary: "LOCAL_SHA256_AND_LOCAL_ED25519_INTEGRITY_ONLY",
    productionCredit: false,
  }, null, 2) + "\n",
);
console.log("R10 final timestamp truth remediation applied");
