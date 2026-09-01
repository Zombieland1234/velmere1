import { writeFileSync } from "node:fs";
import { canonicalJson } from "../../lib/security/canonical-json.ts";
import { sha256BytesDigest, sha256Digest } from "../../lib/security/cryptographic-digest.ts";
import { buildLensReport } from "../../lib/search/lens-report.ts";
import { buildA83FixtureSearchResult } from "../../lib/worldclass/pass36-a83-browser-lens-pdf-real-packet-runtime.ts";
import { buildCanonicalCustomerArtifact } from "../../lib/reporting/canonical-customer-artifact.ts";
import { PASS4824_ACCOUNT_CUSTOMER_ARTIFACT_EXACT_PDF_STORAGE, buildPass4822AccountCustomerArtifactSnapshot } from "../../lib/reporting/account-customer-artifact-snapshot.ts";
import { buildPass4824AccountCustomerArtifactPdfBlob } from "../../lib/reporting/account-customer-artifact-pdf-blob.ts";
import catalogJson from "../../evaluation/pass36/a83-fixture-packet-catalog.json" with { type: "json" };

function byteLength(value: string) { return Buffer.byteLength(value, "ascii"); }
function buildPdf(label: string) {
  const padding = Array.from({ length: 20 }, (_, i) => `% R7 ${label} deterministic padding ${String(i+1).padStart(2,"0")} 0123456789abcdef\n`).join("");
  const content = `BT\n/F1 12 Tf\n30 100 Td\n(Velmere R7 ${label}) Tj\nET\n${padding}`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${byteLength(content)} >>\nstream\n${content}endstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf="%PDF-1.4\n%R7\n"; const offsets:number[]=[];
  objects.forEach((body,i)=>{ offsets.push(byteLength(pdf)); pdf+=`${i+1} 0 obj\n${body}\nendobj\n`; });
  const xrefOffset=byteLength(pdf); pdf+="xref\n0 6\n0000000000 65535 f \n";
  for (const off of offsets) pdf+=`${String(off).padStart(10,"0")} 00000 n \n`;
  pdf+=`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}

const catalog = catalogJson as { cases: Parameters<typeof buildA83FixtureSearchResult>[0][] };
const fixture = catalog.cases[0]; if (!fixture) throw new Error("fixture_missing");
const generatedAt="2026-08-24T00:30:00.000Z";
const payload=buildLensReport(buildA83FixtureSearchResult(fixture,"en"),"en","basic",generatedAt);
const rows=[];
for (const [name,userId] of [["USER_A","11111111-1111-4111-8111-111111111111"],["USER_B","22222222-2222-4222-8222-222222222222"]] as const) {
  const accountId=`supabase:${userId}`; const pdf=buildPdf(name); const reportId=`r7-browser-basic-staging-${name.toLowerCase()}`;
  const canonicalArtifact=buildCanonicalCustomerArtifact({ surface:"lens",rendererId:"r7-browser-basic-staging-pdf-v1",reportId,requestedTier:"basic",deliveredTier:"basic",payloadDigest:sha256Digest(canonicalJson(payload)),layoutDigest:sha256Digest(`r7-layout-${name}`),renderPlanDigest:sha256Digest(`r7-render-${name}`),pdfDigest:sha256BytesDigest(pdf),pdfByteLength:pdf.byteLength,pageCount:1,renderedRowCount:Math.max(1,payload.sections.length+payload.sources.length+payload.pass623.atoms.length+payload.pass626.tasks.length) });
  const snapshot=buildPass4822AccountCustomerArtifactSnapshot({accountId,surface:"lens",payloadKind:"lens_report_v1",reportId,requestedTier:"basic",deliveredTier:"basic",locale:"en",title:`R7 Browser Basic staging ${name}`,subject:`R7 owner-controlled staging artifact ${name}`,generatedAt,payload,canonicalArtifact,pdfStorage:PASS4824_ACCOUNT_CUSTOMER_ARTIFACT_EXACT_PDF_STORAGE});
  const blob=buildPass4824AccountCustomerArtifactPdfBlob({accountId,snapshot,pdfBytes:pdf});
  const {pdfBytes,...blobMetadata}=blob;
  rows.push({name,userId,accountId,payloadCanonical:canonicalJson(payload),snapshot,blob:blobMetadata,pdfBase64:Buffer.from(pdfBytes).toString("base64"),safe:{snapshotId:snapshot.snapshotId,artifactDigest:snapshot.canonicalArtifact.artifactDigest,pdfDigest:snapshot.canonicalArtifact.pdfDigest,pdfByteLength:pdfBytes.byteLength,snapshotDigest:snapshot.snapshotDigest,recordDigest:blob.recordDigest}});
}
writeFileSync("/mnt/data/velmere_r7_work/receipts/R7_BROWSER_BASIC_STAGING_PROBE_ARTIFACTS_PRIVATE.json",JSON.stringify({schemaVersion:"velmere.r7.browser-basic-staging-probe-artifacts.v1",generatedAt,rows},null,2)+"\n");
writeFileSync("/mnt/data/velmere_r7_work/receipts/R7_BROWSER_BASIC_STAGING_PROBE_ARTIFACTS_SAFE.json",JSON.stringify({schemaVersion:"velmere.r7.browser-basic-staging-probe-artifacts-safe.v1",generatedAt,rows:rows.map(r=>({name:r.name,userId:r.userId,accountIdHash:r.snapshot.accountIdHash,...r.safe}))},null,2)+"\n");
console.log(JSON.stringify({status:"PASS",rows:rows.map(r=>({name:r.name,...r.safe}))},null,2));
