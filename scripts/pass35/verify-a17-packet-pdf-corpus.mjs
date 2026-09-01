import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { inspectPass35A17PacketPdf } from "../../lib/reporting/pass35-a17-packet-pdf-runtime.mjs";

const MANIFEST = "artifacts/pass35/PASS35_A17_PACKET_PDF_CORPUS_MANIFEST.json";
const RECEIPT = "artifacts/pass35/PASS35_A17_PACKET_PDF_QA_RECEIPT.json";
const sha256 = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const manifestBytes = readFileSync(MANIFEST);
const manifest = JSON.parse(manifestBytes);
const failures = [];
if (manifest.schemaVersion !== "velmere.pass35.a17.packet-pdf-corpus-manifest.v1") failures.push("manifest_schema_invalid");
if (manifest.pdfCount !== 21 || manifest.totalPages !== 98) failures.push(`manifest_totals:${manifest.pdfCount}/${manifest.totalPages}`);
if (JSON.stringify(manifest.byTier) !== JSON.stringify({ basic: 7, pro: 7, advanced: 7 })) failures.push("manifest_tier_counts_invalid");
const pdfs = [];
for (const entry of manifest.entries) {
  let bytes;
  try { bytes = readFileSync(entry.path); } catch { failures.push(`pdf_unreadable:${entry.path}`); continue; }
  const inspection = inspectPass35A17PacketPdf(bytes, entry);
  const reasons = [...inspection.reasons];
  if (sha256(bytes) !== entry.sha256) reasons.push("sha256_mismatch");
  if (bytes.byteLength !== entry.byteLength) reasons.push("byte_length_mismatch");
  if (!entry.synthetic || !entry.offline || !entry.notLive || !entry.notForSale) reasons.push("boundary_invalid");
  pdfs.push({ ...entry, observedSha256: sha256(bytes), observedByteLength: bytes.byteLength, inspection, status: reasons.length ? "FAIL" : "PASS", reasons });
}
const failedPdfs = pdfs.filter((pdf) => pdf.status !== "PASS");
const receiptCore = {
  schemaVersion: "velmere.pass35.a17.packet-pdf-qa-receipt.v1",
  generatedAt: manifest.generatedAt,
  status: failures.length || failedPdfs.length ? "FAIL" : "PASS",
  manifest: { path: MANIFEST, sha256: sha256(manifestBytes) },
  totals: { pdfCount: pdfs.length, totalPages: pdfs.reduce((sum, pdf) => sum + pdf.inspection.pageCount, 0), passingPdfs: pdfs.length - failedPdfs.length, failedPdfs: failedPdfs.length },
  assertions: { total: 14 + pdfs.length * 12, failed: failures.length + failedPdfs.reduce((sum, pdf) => sum + pdf.reasons.length, 0) },
  failures,
  pdfs,
  boundaries: manifest.boundaries,
};
receiptCore.assertions.passed = receiptCore.assertions.total - receiptCore.assertions.failed;
const receipt = { ...receiptCore, receiptSha256: sha256(JSON.stringify(receiptCore)) };
writeFileSync(RECEIPT, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ status: receipt.status, receiptPath: RECEIPT, totals: receipt.totals, assertions: receipt.assertions, failures }, null, 2));
if (receipt.status !== "PASS") process.exitCode = 1;
