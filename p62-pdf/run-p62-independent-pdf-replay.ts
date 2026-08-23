import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { renderLensPdfWorkerPayload } from "@/lib/search/lens-pdf-worker";

function arg(name: string) {
  const index = process.argv.indexOf(name);
  if (index < 0 || index + 1 >= process.argv.length) throw new Error(`missing_argument:${name}`);
  return process.argv[index + 1];
}

function sha256(bytes: Uint8Array | Buffer) {
  return createHash("sha256").update(bytes).digest("hex");
}

const inputPath = path.resolve(arg("--input"));
const outputPath = path.resolve(arg("--output"));
const receiptPath = path.resolve(arg("--receipt"));
const replayId = arg("--replay-id");

const frozen = JSON.parse(readFileSync(inputPath, "utf8")) as {
  schemaVersion: string;
  evidenceClass: string;
  depth: "basic" | "pro" | "advanced";
  report: unknown;
  expectedPdf: { byteLength: number; sha256: string; startsWithPdf: boolean };
  sourceJson: { byteLength: number; sha256: string };
  truthBoundary: string;
};
if (frozen.schemaVersion !== "velmere.p62.independent-pdf-replay-input.v1") throw new Error("p62_input_schema_mismatch");
if (frozen.evidenceClass !== "FIXTURE_INTERNAL_ONLY") throw new Error("p62_input_evidence_class_mismatch");
if (frozen.depth !== "basic") throw new Error(`p62_depth_mismatch:${frozen.depth}`);
if (!frozen.expectedPdf?.startsWithPdf) throw new Error("p62_expected_pdf_marker_missing");

const rendered = Buffer.from(
  renderLensPdfWorkerPayload({
    schemaVersion: "velmere.lens-pdf-worker-payload.v1",
    depth: frozen.depth,
    report: frozen.report,
  }),
);
const observed = {
  byteLength: rendered.length,
  sha256: sha256(rendered),
  startsWithPdf: rendered.subarray(0, 5).toString("ascii") === "%PDF-",
};
const expected = frozen.expectedPdf;
const pass = observed.startsWithPdf
  && observed.byteLength === expected.byteLength
  && observed.sha256 === expected.sha256;

writeFileSync(outputPath, rendered);
const receipt = {
  schemaVersion: "velmere.p62.independent-pdf-replay-process.v1",
  status: pass ? "PASS" : "FAIL",
  decision: pass ? "PASS_INDEPENDENT_PDF_REPLAY_EXACT_BROWSER_BYTES" : "FAIL_CLOSED_INDEPENDENT_PDF_REPLAY_BYTE_MISMATCH",
  replayId,
  input: {
    path: inputPath,
    sha256: sha256(readFileSync(inputPath)),
    sourceJson: frozen.sourceJson,
    evidenceClass: frozen.evidenceClass,
  },
  expectedPdf: expected,
  observedPdf: observed,
  outputPath,
  truthBoundary: "This process independently re-renders only a frozen internal-fixture Lens report. It does not call search providers, AI, payment, entitlement or customer systems and grants no live/current-provider, customer-value, sale, GO, LIVE or WORLD_CLASS credit.",
};
const core = Buffer.from(JSON.stringify(receipt, Object.keys(receipt).sort()), "utf8");
(receipt as typeof receipt & { integritySha256?: string }).integritySha256 = sha256(core);
writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
if (!pass) process.exit(1);
