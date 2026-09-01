import assert from "node:assert/strict";
import { sha256BytesDigest } from "@/lib/security/cryptographic-digest";
import {
  buildExactCustomerPdfDelivery,
  verifyExactCustomerPdfPreviewDownloadPair,
} from "@/lib/reporting/exact-customer-pdf-delivery";
import { inspectPdfStructure } from "@/lib/reporting/pdf-structural-validation";

let assertions = 0;
function check(value: unknown, message: string) {
  assertions += 1;
  assert.ok(value, message);
}

function asciiLength(value: string) {
  return Buffer.byteLength(value, "ascii");
}

function buildClassicPdf(args: {
  objects?: string[];
  trailer?: string;
} = {}) {
  const objects = args.objects ?? [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] >>",
  ];
  let pdf = "%PDF-1.7\n";
  const offsets: number[] = [];
  objects.forEach((body, index) => {
    offsets.push(asciiLength(pdf));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefOffset = asciiLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n${args.trailer ?? `<< /Size ${objects.length + 1} /Root 1 0 R >>`}\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}

const bytes = buildClassicPdf();
const digest = sha256BytesDigest(bytes);
const structure = inspectPdfStructure(bytes);
check(structure.valid && structure.pageCount === 1, `valid fixture must pass structural validation: ${structure.blockers.join(",")}`);
const preview = buildExactCustomerPdfDelivery({
  pdfBytes: bytes,
  expectedPdfSha256: digest,
  disposition: "inline",
  filenameStem: "Velmère audit report",
});
const download = buildExactCustomerPdfDelivery({
  pdfBytes: bytes,
  expectedPdfSha256: digest,
  disposition: "attachment",
  filenameStem: "Velmère audit report",
});
const parity = verifyExactCustomerPdfPreviewDownloadPair({
  pdfBytes: bytes,
  expectedPdfSha256: digest,
  filenameStem: "Velmère audit report",
});

check(preview.pdfSha256 === digest && download.pdfSha256 === digest, "preview and download must bind the exact expected PDF hash");
check(Buffer.from(preview.bytes).equals(Buffer.from(download.bytes)), "preview and download bodies must be byte-identical");
check(preview.headers["content-disposition"].startsWith("inline;"), "preview must use inline disposition");
check(download.headers["content-disposition"].startsWith("attachment;"), "download must use attachment disposition");
check(preview.headers["content-type"] === "application/pdf", "preview must preserve PDF content type");
check(preview.headers["content-length"] === download.headers["content-length"], "preview and download length must match");
check(parity.pass && parity.byteIdentical, "parity receipt must pass only for exact body equality");
check(parity.contentDispositionDifferent, "HTTP disposition is the intended difference");
assert.throws(() => buildExactCustomerPdfDelivery({
  pdfBytes: bytes,
  expectedPdfSha256: "sha256:" + "0".repeat(64),
  disposition: "attachment",
  filenameStem: "Velmere",
}), /exact_customer_pdf_digest_mismatch/u, "digest mismatch must fail closed");
assertions += 1;
assert.throws(() => buildExactCustomerPdfDelivery({
  pdfBytes: new Uint8Array([1, 2, 3]),
  expectedPdfSha256: sha256BytesDigest(new Uint8Array([1, 2, 3])),
  disposition: "attachment",
  filenameStem: "Velmere",
}), /exact_customer_pdf_header_invalid/u, "non-PDF bytes must fail closed");
assertions += 1;
const prefixOnly = new TextEncoder().encode("%PDF-not-a-valid-pdf");
assert.throws(() => buildExactCustomerPdfDelivery({
  pdfBytes: prefixOnly,
  expectedPdfSha256: sha256BytesDigest(prefixOnly),
  disposition: "attachment",
  filenameStem: "Velmere",
}), /exact_customer_pdf_header_invalid/u, "a PDF-like prefix without a valid version must fail closed");
assertions += 1;
const shallowFake = new TextEncoder().encode("%PDF-1.7\n1 0 obj\n<< /Type /Page >>\nendobj\n%%EOF\n");
assert.throws(() => buildExactCustomerPdfDelivery({
  pdfBytes: shallowFake,
  expectedPdfSha256: sha256BytesDigest(shallowFake),
  disposition: "attachment",
  filenameStem: "Velmere",
}), /exact_customer_pdf_structure_invalid/u, "header/object/EOF text without a page tree and xref must fail closed");
assertions += 1;
const corruptXref = new TextEncoder().encode(Buffer.from(bytes).toString("ascii").replace(/startxref\n\d+/u, "startxref\n1"));
assert.throws(() => buildExactCustomerPdfDelivery({
  pdfBytes: corruptXref,
  expectedPdfSha256: sha256BytesDigest(corruptXref),
  disposition: "attachment",
  filenameStem: "Velmere",
}), /exact_customer_pdf_structure_invalid:.*pdf_xref_target_invalid/u, "startxref must resolve to an xref structure");
assertions += 1;

const malformedXrefEntry = new TextEncoder().encode(
  Buffer.from(bytes).toString("ascii").replace("0000000009 00000 n", "9999999999 00000 n"),
);
const malformedXrefInspection = inspectPdfStructure(malformedXrefEntry);
check(
  !malformedXrefInspection.valid
    && malformedXrefInspection.blockers.includes("pdf_xref_object_offset_invalid"),
  "an in-use xref row with an out-of-range object offset must fail closed",
);

const xrefStream = new TextEncoder().encode(
  "%PDF-1.5\n1 0 obj\n<< /Type /XRef /Size 2 /Root 2 0 R /W [1 2 1] /Length 0 >>\nstream\nendstream\nendobj\nstartxref\n9\n%%EOF\n",
);
const xrefStreamInspection = inspectPdfStructure(xrefStream);
check(
  !xrefStreamInspection.valid && xrefStreamInspection.blockers.includes("pdf_xref_target_invalid"),
  "xref streams are outside the supported subset and must be explicitly rejected",
);

const disconnected = buildClassicPdf({
  objects: [
    "<< /Type /Catalog /Pages 4 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ],
});
const disconnectedInspection = inspectPdfStructure(disconnected);
check(
  !disconnectedInspection.valid
    && disconnectedInspection.blockers.includes("pdf_page_tree_type_invalid"),
  "xref-valid but disconnected Catalog/Pages/Page tokens must not satisfy page-tree connectivity",
);

const missingRoot = buildClassicPdf({ trailer: "<< /Size 4 >>" });
const missingRootInspection = inspectPdfStructure(missingRoot);
check(
  !missingRootInspection.valid && missingRootInspection.blockers.includes("pdf_trailer_root_missing"),
  "classic xref trailer without Root must fail closed",
);

const mismatchedKids = buildClassicPdf({
  objects: [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 2 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] >>",
  ],
});
const mismatchedKidsInspection = inspectPdfStructure(mismatchedKids);
check(
  !mismatchedKidsInspection.valid
    && mismatchedKidsInspection.blockers.includes("pdf_pages_count_mismatch"),
  "Pages Count must equal the recursively connected Kids page count",
);

const encodedActiveName = buildClassicPdf({
  objects: [
    "<< /Type /Catalog /Pages 2 0 R /Open#41ction 4 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] >>",
    "<< /S /J#61vaScript /J#53 (app.alert) >>",
  ],
});
const encodedActiveInspection = inspectPdfStructure(encodedActiveName);
check(
  !encodedActiveInspection.valid
    && encodedActiveInspection.activeContentDetected
    && encodedActiveInspection.activeContentMarkers.includes("/OpenAction")
    && encodedActiveInspection.activeContentMarkers.includes("/JavaScript")
    && encodedActiveInspection.activeContentMarkers.includes("/JS"),
  "#xx-encoded active PDF names must be decoded and denied at token level",
);

const passiveStringMention = buildClassicPdf({
  objects: [
    "<< /Type /Catalog /Pages 2 0 R /Title (/Open#41ction is inert text) >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] >>",
  ],
});
check(
  inspectPdfStructure(passiveStringMention).valid,
  "active-looking text inside a literal string must not be confused with a decoded PDF name token",
);

const oversized = new Uint8Array(8 * 1024 * 1024 + 1);
oversized.set(new TextEncoder().encode("%PDF-1.7\n"));
const oversizedInspection = inspectPdfStructure(oversized);
check(
  !oversizedInspection.valid
    && oversizedInspection.blockers.some((blocker) => blocker.startsWith("pdf_byte_length_out_of_range:")),
  "PDF structural boundary must reject bytes above the 8 MiB immutable-artifact limit",
);

console.log(`Exact customer PDF delivery: PASS (${assertions}/${assertions})`);
