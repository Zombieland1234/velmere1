import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { buildPass35A16CanonicalChannelParityRuntime } from "../../lib/market-integrity/pass35-a16-canonical-channel-parity.ts";
import { buildPass35A17PacketPdf } from "../../lib/reporting/pass35-a17-packet-pdf-runtime.mjs";

const OUT = "artifacts/pass35/a17-packet-pdf-corpus";
const MANIFEST = "artifacts/pass35/PASS35_A17_PACKET_PDF_CORPUS_MANIFEST.json";
const sha256 = (value: string | Buffer) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const safe = (value: string) => value.toLowerCase().replace(/[^a-z0-9_-]+/gu, "-");
type PacketPdfCorpusEntry = {
  surfaceId: string;
  tier: string;
  path: string;
  pageCount: number;
  byteLength: number;
  sha256: string;
  packetId: string;
  packetHash: string;
  factsHash: string;
  claimIds: string[];
  evidenceIds: string[];
  sourceProjectionHash: string | null;
  synthetic: true;
  offline: true;
  notLive: true;
  notForSale: true;
};

const product = JSON.parse(readFileSync("config/pass35/product-tier-content-contract.json", "utf8"));
const parity = buildPass35A16CanonicalChannelParityRuntime({ productContract: product, generatedAt: "2026-07-23T04:00:00.000Z" });
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const entries: PacketPdfCorpusEntry[] = [];
for (const record of parity.packets) {
  const generated = buildPass35A17PacketPdf(record);
  const directory = path.join(OUT, safe(record.surfaceId));
  mkdirSync(directory, { recursive: true });
  const relativePath = path.join(directory, `${safe(record.tier)}.pdf`).split(path.sep).join("/");
  writeFileSync(relativePath, generated.bytes);
  entries.push({
    surfaceId: record.surfaceId,
    tier: record.tier,
    path: relativePath,
    pageCount: generated.pageCount,
    byteLength: generated.bytes.byteLength,
    sha256: generated.sha256,
    packetId: record.packet.packetId,
    packetHash: record.packet.packetHash,
    factsHash: record.packet.factsHash,
    claimIds: generated.claimIds,
    evidenceIds: generated.evidenceIds,
    sourceProjectionHash: record.projections.find((projection) => projection.channel === "pdf")?.projectionHash ?? null,
    synthetic: true,
    offline: true,
    notLive: true,
    notForSale: true,
  });
}
const core = {
  schemaVersion: "velmere.pass35.a17.packet-pdf-corpus-manifest.v1",
  passId: "PASS35_A17",
  sourceRevisionId: product.sourceRevisionId,
  generatedAt: "2026-07-23T04:00:00.000Z",
  mode: "canonical_packet_bound_synthetic_offline_pdf_qa",
  pdfCount: entries.length,
  totalPages: entries.reduce((sum, entry) => sum + entry.pageCount, 0),
  byTier: Object.fromEntries(["basic", "pro", "advanced"].map((tier) => [tier, entries.filter((entry) => entry.tier === tier).length])),
  entries,
  boundaries: { synthetic: true, offline: true, notLive: true, notForSale: true, commercialUseAllowed: false },
};
const manifest = { ...core, manifestSha256: sha256(JSON.stringify(core)) };
writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: "PASS_A17_PACKET_PDFS_GENERATED", pdfCount: entries.length, totalPages: manifest.totalPages, manifestPath: MANIFEST }, null, 2));
