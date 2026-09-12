#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const rendererPath = path.join(root, "lib/security/pro-audit-pdf/customer-safe-renderer.ts");
const sealPath = path.join(root, "lib/security/pdf-institutional-seal.ts");
const receiptPath = path.join(root, "artifacts/r10/R10_PDF_TRUTH_LAYOUT_PATCH.json");
const write = process.argv.includes("--write");

function replaceOne(source, from, to, label) {
  const parts = source.split(from);
  if (parts.length !== 2) throw new Error(`r10_pdf_patch_exact_match:${label}:count=${parts.length - 1}`);
  return parts[0] + to + parts[1];
}

function patchRenderer(raw) {
  let next = raw;
  next = replaceOne(
    next,
    'const integrityLabel = fitTextToWidth(options.integrityLabel || "Document integrity verified by Velmère", 330, 7);',
    'const integrityLabel = fitTextToWidth(options.integrityLabel || "File integrity commitment by Velmère", 330, 7);',
    "integrity_label",
  );
  next = replaceOne(
    next,
    'let pages = paginateCustomerPdfGroups(groups, 692);',
    'let pages = paginateCustomerPdfGroups(groups, 650);',
    "primary_body_budget",
  );
  next = replaceOne(
    next,
    'height: r.blank ? 6 : r.heading ? 15 : 12.5,',
    'height: r.blank ? 6 : r.height >= 50 ? r.height : r.heading ? 15 : 12.5,',
    "compact_special_row_height",
  );
  next = replaceOne(
    next,
    'const compactPages = paginateCustomerPdfGroups(compactGroups, 706);',
    'const compactPages = paginateCustomerPdfGroups(compactGroups, 650);',
    "compact_body_budget",
  );
  next = replaceOne(
    next,
    '`${encodeProAuditPdfHexText("ISO/IEC 18004 Compliant 2D Barcode | Direct On-Chain & Forensic Verification")} Tj`,',
    '`${encodeProAuditPdfHexText("ISO/IEC 18004 2D Barcode | Document reference and verification endpoint")} Tj`,',
    "qr_scope_wording",
  );
  return next;
}

function patchSeal(raw) {
  let next = raw;
  next = replaceOne(
    next,
    'const headerHex = Buffer.from("VELMERE CRYPTOGRAPHIC AUDIT SEAL - SHA-256 MERKLE ROOT", "ascii").toString("hex");',
    'const headerHex = Buffer.from("VELMERE FILE INTEGRITY COMMITMENT - SHA-256 MERKLE ROOT", "ascii").toString("hex");',
    "seal_header",
  );
  next = replaceOne(
    next,
    'const pillHex = Buffer.from("[VERIFIED - IMMUTABLE]", "ascii").toString("hex");',
    'const pillText = options.isVerified === true ? "[FILE INTEGRITY VERIFIED]" : "[FILE INTEGRITY COMMITMENT]";\n  const pillHex = Buffer.from(pillText, "ascii").toString("hex");',
    "seal_pill",
  );
  next = replaceOne(
    next,
    'const footerText = `${blockText}Standard: Merkle Non-Repudiation Seal | RFC 3161 Pinned | Verification: /api/audit/report-pdf`;',
    'const footerText = `${blockText}Scope: Local Merkle integrity commitment | External TSA: NOT VERIFIED | Verification: /api/audit/report-pdf`;',
    "seal_footer",
  );
  return next;
}

const rendererBefore = fs.readFileSync(rendererPath, "utf8");
const sealBefore = fs.readFileSync(sealPath, "utf8");
const rendererAfter = patchRenderer(rendererBefore);
const sealAfter = patchSeal(sealBefore);

const forbidden = [
  "Document integrity verified by Velmère",
  "paginateCustomerPdfGroups(groups, 692)",
  "paginateCustomerPdfGroups(compactGroups, 706)",
  "[VERIFIED - IMMUTABLE]",
  "RFC 3161 Pinned",
  "CRYPTOGRAPHIC AUDIT SEAL",
  "Direct On-Chain & Forensic Verification",
];
const combined = `${rendererAfter}\n${sealAfter}`;
for (const token of forbidden) {
  if (combined.includes(token)) throw new Error(`r10_pdf_patch_forbidden_residual:${token}`);
}

const required = [
  'paginateCustomerPdfGroups(groups, 650)',
  'paginateCustomerPdfGroups(compactGroups, 650)',
  'r.height >= 50 ? r.height',
  'File integrity commitment by Velmère',
  '[FILE INTEGRITY VERIFIED]',
  '[FILE INTEGRITY COMMITMENT]',
  'External TSA: NOT VERIFIED',
  'Document reference and verification endpoint',
];
for (const token of required) {
  if (!combined.includes(token)) throw new Error(`r10_pdf_patch_required_missing:${token}`);
}

if (write) {
  fs.writeFileSync(rendererPath, rendererAfter, "utf8");
  fs.writeFileSync(sealPath, sealAfter, "utf8");
}

fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
const receipt = {
  schemaVersion: "velmere.r10.pdf-truth-layout-patch.v1",
  context: "R10_CANDIDATE_NO_RELEASE_CREDIT",
  write,
  changedFiles: [
    "lib/security/pro-audit-pdf/customer-safe-renderer.ts",
    "lib/security/pdf-institutional-seal.ts",
  ],
  bodyStartY: 744,
  maxPlannedBodyHeight: 650,
  minimumPlannedBodyY: 94,
  footerBaselinesY: [34, 23, 12],
  minimumGapToTopFooterBaseline: 60,
  specialRowsPreservedInCompactMode: true,
  externalTsaCredit: false,
  defaultSealVerificationCredit: false,
  passed: true,
  limitations: [
    "This patch fixes planner geometry and customer wording; it is not a substitute for raster/render QA of every final release PDF.",
    "FILE INTEGRITY VERIFIED is rendered only when isVerified=true is explicitly supplied to the seal renderer; the default is a commitment, not a verification claim.",
  ],
};
fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
console.log(JSON.stringify(receipt, null, 2));
