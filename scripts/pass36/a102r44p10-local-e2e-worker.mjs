import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function pdfEscape(text) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function makePdf(text) {
  const stream = `BT /F1 12 Tf 48 760 Td (${pdfEscape(text)}) Tj ET`;
  const objects = [
    `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`,
    `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`,
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n`,
    `4 0 obj\n<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream\nendobj\n`,
    `5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`,
  ];
  let output = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(output));
    output += object;
  }
  const xref = Buffer.byteLength(output);
  output += `xref\n0 ${objects.length + 1}\n`;
  output += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i += 1) output += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(output, "binary");
}

const jobPath = process.argv[2];
if (!jobPath) throw new Error("job path required");
const job = JSON.parse(fs.readFileSync(jobPath, "utf8"));
job.attempts = Number(job.attempts || 0) + 1;
job.updatedAt = new Date().toISOString();

if (job.simulateInterruptOnce && job.attempts === 1) {
  job.state = "INTERRUPTED_RETRYABLE";
  fs.writeFileSync(jobPath, JSON.stringify(job, null, 2) + "\n");
  process.exit(75);
}

const root = path.dirname(path.dirname(jobPath));
const packets = path.join(root, "packets");
const storage = path.join(root, "private-storage");
fs.mkdirSync(packets, { recursive: true });
fs.mkdirSync(storage, { recursive: true });

const sourceSha256 = sha256(Buffer.from(job.source, "utf8"));
const packet = {
  schemaVersion: "velmere.pass36.a102r44p10.local-e2e.packet.v1",
  jobId: job.id,
  accountId: job.accountId,
  sourceSha256,
  findingConfidence: "NOT_CALIBRATED",
  evidenceCompleteness: "LOCAL_INTEGRATION_ONLY",
  reviewStatus: "AUTOMATED_UNREVIEWED",
  adjudicationStatus: "NOT_PERFORMED",
  customerCredit: false,
  stagingCredit: false,
  liveCredit: false,
  saleCredit: false,
};
const packetBytes = Buffer.from(JSON.stringify(packet, null, 2) + "\n");
const packetPath = path.join(packets, `${job.id}.json`);
fs.writeFileSync(packetPath, packetBytes);

const pdfBytes = makePdf(`Velmere automated informational prescreen ${job.id} - NOT CALIBRATED`);
const pdfPath = path.join(storage, `${job.id}.pdf`);
fs.writeFileSync(pdfPath, pdfBytes);

job.state = "COMPLETED";
job.packetPath = packetPath;
job.packetSha256 = sha256(packetBytes);
job.pdfPath = pdfPath;
job.pdfSha256 = sha256(pdfBytes);
job.updatedAt = new Date().toISOString();
fs.writeFileSync(jobPath, JSON.stringify(job, null, 2) + "\n");
console.log(JSON.stringify({ status: "COMPLETED", jobId: job.id, packetSha256: job.packetSha256, pdfSha256: job.pdfSha256 }));
