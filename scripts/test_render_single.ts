import { buildCanonicalAuditReport, renderCanonicalReportToPdf } from "@/lib/security/audit-canonical-report";
import fs from "node:fs";

console.log("Starting test render...");
const t0 = Date.now();
const report = buildCanonicalAuditReport({
  reportId: "rep_usdt_001",
  contractName: "Tether USD (USDT)",
  contractAddress: "0xdac17f958d2ee523a2206206994597c13d831ec7",
  network: "Ethereum Mainnet",
  chainId: "1",
  tokenSymbol: "USDT",
}, "pro");

const { pdfBytes, pdfDigest, pdfByteLength, pageCount } = renderCanonicalReportToPdf(report);
const duration = Date.now() - t0;

console.log(`Rendered in ${duration}ms:`, {
  bytes: pdfByteLength,
  pageCount,
  sha256: pdfDigest,
});

fs.writeFileSync("dowody/pdfs/01-usdt-pro.pdf", Buffer.from(pdfBytes));
console.log("Saved to dowody/pdfs/01-usdt-pro.pdf");
