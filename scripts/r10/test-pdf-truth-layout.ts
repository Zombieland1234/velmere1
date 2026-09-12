import assert from "node:assert/strict";
import {
  buildCustomerSafeMinimalPdf,
  planCustomerSafePdf,
} from "../../lib/security/pro-audit-pdf/customer-safe-renderer";
import { renderInstitutionalMerkleSealCard } from "../../lib/security/pdf-institutional-seal";

const BODY_START_Y = 744;
const MAX_BODY_HEIGHT = 650;
const MIN_BODY_Y = BODY_START_Y - MAX_BODY_HEIGHT;
const TOP_FOOTER_Y = 34;
const merkleLine = `Merkle Root: sha256:${"a".repeat(64)}`;
const qrLine = "QR Verification: https://velmere.example/verify/r10-layout-test";

function decodeHexText(commands: string[]) {
  return commands
    .flatMap((command) => [...command.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g)].map((match) => Buffer.from(match[1], "hex").toString("utf8")))
    .join("\n");
}

function decodePdfHexText(pdf: Buffer) {
  const source = pdf.toString("ascii");
  return [...source.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g)]
    .map((match) => Buffer.from(match[1], "hex").toString("latin1"))
    .join("\n");
}

// Stress enough content to exercise pagination and force a compact-mode case.
let compactPlan: ReturnType<typeof planCustomerSafePdf> | null = null;
for (let count = 35; count <= 180; count += 1) {
  const lines = Array.from({ length: count }, (_, index) => `Evidence-bound PDF layout fixture row ${String(index + 1).padStart(3, "0")}`);
  lines.splice(Math.floor(lines.length / 2), 0, merkleLine);
  lines.splice(Math.floor(lines.length * 0.75), 0, qrLine);
  const plan = planCustomerSafePdf(lines, { documentId: `r10-layout-${count}`, generatedAt: "2026-09-12T00:00:00.000Z" });
  for (const page of plan.pages) {
    assert.ok(page.usedHeight <= MAX_BODY_HEIGHT, `page ${page.pageNumber} exceeded safe body budget: ${page.usedHeight}`);
    assert.ok(BODY_START_Y - page.usedHeight >= MIN_BODY_Y, `page ${page.pageNumber} entered footer-safe zone`);
  }
  const rows = plan.pages.flatMap((page) => page.rows);
  if (rows.some((row) => row.height === 12.5)) {
    compactPlan = plan;
    break;
  }
}
assert.ok(compactPlan, "expected at least one compact pagination fixture");
const compactRows = compactPlan.pages.flatMap((page) => page.rows);
const merkleRow = compactRows.find((row) => row.text.startsWith("Merkle Root:"));
const qrRow = compactRows.find((row) => row.text.startsWith("QR Verification:"));
assert.ok(merkleRow, "compact fixture missing Merkle row");
assert.ok(qrRow, "compact fixture missing QR row");
assert.equal(merkleRow.height, 50, "compact mode must preserve Merkle card height");
assert.equal(qrRow.height, 58, "compact mode must preserve QR card height");
assert.ok(MIN_BODY_Y - TOP_FOOTER_Y >= 60, "safe-area gap to footer must be at least 60pt");
assert.match(compactPlan.integrityLine, /^File integrity commitment by Velmère \|/);
assert.doesNotMatch(compactPlan.integrityLine, /content verified|audit verified|immutable/i);

const defaultSeal = renderInstitutionalMerkleSealCard(
  { merkleRoot: `sha256:${"b".repeat(64)}`, documentId: "r10-default-seal" },
  200,
);
const defaultSealText = decodeHexText(defaultSeal.commands);
assert.match(defaultSealText, /VELMERE FILE INTEGRITY COMMITMENT/);
assert.match(defaultSealText, /\[FILE INTEGRITY COMMITMENT\]/);
assert.match(defaultSealText, /External TSA: NOT VERIFIED/);
assert.doesNotMatch(defaultSealText, /RFC 3161|IMMUTABLE|CRYPTOGRAPHIC AUDIT SEAL/i);
assert.equal(defaultSeal.actualHeight, 50);

const verifiedSeal = renderInstitutionalMerkleSealCard(
  { merkleRoot: `sha256:${"c".repeat(64)}`, documentId: "r10-verified-seal", isVerified: true },
  200,
);
const verifiedSealText = decodeHexText(verifiedSeal.commands);
assert.match(verifiedSealText, /\[FILE INTEGRITY VERIFIED\]/);
assert.doesNotMatch(verifiedSealText, /content verified|audit verified|immutable/i);

const qrPdf = buildCustomerSafeMinimalPdf(
  ["R10 PDF TRUTH", qrLine, merkleLine],
  { documentId: "r10-qr-scope", generatedAt: "2026-09-12T00:00:00.000Z" },
);
const qrPdfText = decodePdfHexText(qrPdf);
assert.match(qrPdfText, /Document reference and verification endpoint/);
assert.doesNotMatch(qrPdfText, /Direct On-Chain & Forensic Verification|RFC 3161 Pinned|VERIFIED - IMMUTABLE/i);

console.log(JSON.stringify({
  status: "PASS",
  maxBodyHeight: MAX_BODY_HEIGHT,
  minBodyY: MIN_BODY_Y,
  topFooterY: TOP_FOOTER_Y,
  safeGap: MIN_BODY_Y - TOP_FOOTER_Y,
  compactSpecialRows: { merkle: merkleRow.height, qr: qrRow.height },
  defaultSealCredit: "COMMITMENT_ONLY",
  externalTsaCredit: false,
}, null, 2));
