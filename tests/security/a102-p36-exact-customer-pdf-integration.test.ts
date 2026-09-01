import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { canonicalJson } from "../../lib/security/canonical-json.js";
import { sha256BytesDigest, sha256Digest } from "../../lib/security/cryptographic-digest.js";
import {
  buildVelmereAccountCookie,
  buildVelmereAccountSession,
  hashVelmereAccountBinding,
} from "../../lib/auth/account-session.js";
import { buildLensReport } from "../../lib/search/lens-report.js";
import { buildA83FixtureSearchResult } from "../../lib/worldclass/pass36-a83-browser-lens-pdf-real-packet-runtime.js";
import { inspectPass4649PdfBinary } from "../../lib/market-integrity/commercial-staging-proof.js";
import { buildCanonicalCustomerArtifact } from "../../lib/reporting/canonical-customer-artifact.js";
import {
  PASS4822_ACCOUNT_CUSTOMER_ARTIFACT_SNAPSHOT_ID,
  PASS4824_ACCOUNT_CUSTOMER_ARTIFACT_EXACT_PDF_STORAGE,
  buildPass4822AccountCustomerArtifactSnapshot,
  verifyPass4822AccountCustomerArtifactSnapshot,
  type AccountCustomerArtifactSnapshot,
} from "../../lib/reporting/account-customer-artifact-snapshot.js";
import {
  assertPass4824PdfBlobMatchesSnapshot,
  verifyPass4824AccountCustomerArtifactPdfBlob,
} from "../../lib/reporting/account-customer-artifact-pdf-blob.js";
import {
  getPass4822AccountCustomerArtifactSnapshot,
  getPass4824AccountCustomerArtifactPdfBlob,
  getPass4824AccountCustomerArtifactPdfMetadata,
  storePass4822AccountCustomerArtifactSnapshot,
  storePass4824AccountCustomerArtifactPdfBundle,
} from "../../lib/reporting/account-customer-artifact-store.js";
import {
  buildExactCustomerPdfDelivery,
  verifyExactCustomerPdfPreviewDownloadPair,
} from "../../lib/reporting/exact-customer-pdf-delivery.js";

/**
 * P36 credit boundary
 *
 * This is an executable integration of the real snapshot, immutable in-memory
 * bundle store, lookup, binding verifier, exact delivery functions and the real
 * lazy route handler. It does not mock Supabase or claim deployed HTTP/RLS
 * credit. P36 makes the signed, non-production preview-cookie branch reachable
 * while every real account continues to require a user-RLS Supabase client.
 */

let assertions = 0;

function check(value: unknown, message: string): asserts value {
  assertions += 1;
  assert.ok(value, message);
}

async function rejects(promise: Promise<unknown>, expected: RegExp, message: string) {
  assertions += 1;
  await assert.rejects(promise, expected, message);
}

function byteLength(value: string) {
  return Buffer.byteLength(value, "ascii");
}

function sourceBinding(relativePath: string) {
  const bytes = readFileSync(relativePath);
  return {
    path: relativePath,
    byteLength: bytes.byteLength,
    sha256: sha256BytesDigest(bytes).replace(/^sha256:/u, ""),
  };
}

/** Builds a one-page PDF 1.4 file with exact byte offsets and a real xref. */
function buildP36MinimalPdf() {
  const padding = Array.from(
    { length: 20 },
    (_, index) => `% P36 deterministic parser padding row ${String(index + 1).padStart(2, "0")} 0123456789abcdef\n`,
  ).join("");
  const content = `BT\n/F1 12 Tf\n30 100 Td\n(Velmere P36 exact PDF) Tj\nET\n${padding}`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${byteLength(content)} >>\nstream\n${content}endstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let pdf = "%PDF-1.4\n%P36\n";
  const offsets: number[] = [];
  objects.forEach((body, index) => {
    offsets.push(byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefOffset = byteLength(pdf);
  pdf += "xref\n0 6\n0000000000 65535 f \n";
  for (const offset of offsets) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}

function verifyP36CrossReference(bytes: Uint8Array) {
  const text = Buffer.from(bytes).toString("ascii");
  const startXref = /startxref\n(\d+)\n%%EOF\n$/u.exec(text);
  check(startXref !== null, "minimal PDF must terminate with startxref and %%EOF");
  const xrefOffset = Number(startXref[1]);
  check(text.slice(xrefOffset).startsWith("xref\n0 6\n"), "startxref must point to the xref table");
  const rows = text.slice(xrefOffset).split("\n");
  for (let objectNumber = 1; objectNumber <= 5; objectNumber += 1) {
    const row = rows[objectNumber + 2] ?? "";
    const offset = Number(row.slice(0, 10));
    check(
      /^\d{10} 00000 n $/u.test(row) && text.slice(offset).startsWith(`${objectNumber} 0 obj\n`),
      `xref row ${objectNumber} must point to object ${objectNumber}`,
    );
  }
}

function verifyWithIndependentPdfParser(bytes: Uint8Array) {
  const directory = mkdtempSync(path.join(tmpdir(), "velmere-p36-pdf-"));
  const pdfPath = path.join(directory, "p36-minimal.pdf");
  try {
    writeFileSync(pdfPath, bytes);
    const parsed = spawnSync("pdfinfo", [pdfPath], { encoding: "utf8" });
    if (parsed.error && (parsed.error as NodeJS.ErrnoException).code === "ENOENT") {
      check(inspectPass4649PdfBinary(bytes).valid, "PDF binary must pass structural inspection");
    } else {
      check(parsed.status === 0, `pdfinfo must parse the generated PDF: ${parsed.stderr || parsed.error?.message || "unknown error"}`);
      check(/^Pages:\s+1\s*$/mu.test(parsed.stdout), "pdfinfo must observe exactly one page");
      check(/^PDF version:\s+1\.4\s*$/mu.test(parsed.stdout), "pdfinfo must observe PDF 1.4");
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function buildMinimalLensPayload(generatedAt: string) {
  const catalog = JSON.parse(
    readFileSync("evaluation/pass36/a83-fixture-packet-catalog.json", "utf8"),
  ) as { cases: Parameters<typeof buildA83FixtureSearchResult>[0][] };
  const fixture = catalog.cases[0];
  assert.ok(fixture, "A83 fixture catalog must contain a case");
  return buildLensReport(
    buildA83FixtureSearchResult(fixture, "en"),
    "en",
    "basic",
    generatedAt,
  );
}

function buildArtifact(args: {
  payload: unknown;
  pdfBytes: Uint8Array;
  reportId: string;
}) {
  return buildCanonicalCustomerArtifact({
    surface: "lens",
    rendererId: "p36-minimal-pdf-1.4-fixture",
    reportId: args.reportId,
    requestedTier: "basic",
    deliveredTier: "basic",
    payloadDigest: sha256Digest(canonicalJson(args.payload)),
    layoutDigest: sha256Digest("p36-layout-v1"),
    renderPlanDigest: sha256Digest("p36-render-plan-v1"),
    pdfDigest: sha256BytesDigest(args.pdfBytes),
    pdfByteLength: args.pdfBytes.byteLength,
    pageCount: 1,
    renderedRowCount: 1,
  });
}

function buildP36LegacyReadOnlySnapshot(args: {
  accountId: string;
  generatedAt: string;
  payload: unknown;
  canonicalArtifact: ReturnType<typeof buildArtifact>;
}) {
  const accountIdHash = hashVelmereAccountBinding(args.accountId);
  const artifactDigestHex = args.canonicalArtifact.artifactDigest.replace(/^sha256:/u, "");
  const payloadDigest = sha256Digest(canonicalJson(args.payload));
  const unsigned = {
    schemaVersion: PASS4822_ACCOUNT_CUSTOMER_ARTIFACT_SNAPSHOT_ID,
    snapshotId: `artifact-lens-${accountIdHash.slice(0, 16)}-${artifactDigestHex}`,
    accountIdHash,
    surface: "lens" as const,
    payloadKind: "lens_report_v1" as const,
    reportId: "p36-legacy-report",
    requestedTier: "basic",
    deliveredTier: "basic",
    locale: "en" as const,
    title: "P36 legacy artifact",
    subject: "P36 legacy report",
    generatedAt: new Date(args.generatedAt).toISOString(),
    payload: args.payload,
    payloadDigest,
    canonicalArtifact: args.canonicalArtifact,
  } as const;
  return {
    ...unsigned,
    snapshotDigest: sha256Digest(canonicalJson(unsigned)),
  } satisfies AccountCustomerArtifactSnapshot;
}

async function main() {
  const mutableEnv = process.env as Record<string, string | undefined>;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalVercelEnv = process.env.VERCEL_ENV;
  mutableEnv.NODE_ENV = "test";
  mutableEnv.VERCEL_ENV = "preview";
  try {
    const ownerAccountId = "preview:p36-exact-pdf-owner";
    const otherAccountId = "preview:p36-other-account";
    const generatedAt = "2026-08-13T15:00:00.000Z";
    const pdfBytes = buildP36MinimalPdf();
    verifyP36CrossReference(pdfBytes);
    verifyWithIndependentPdfParser(pdfBytes);

    const inspection = inspectPass4649PdfBinary(pdfBytes);
    check(inspection.valid, `current-source PDF inspection must accept the fixture: ${inspection.blockers.join(",")}`);
    check(inspection.pageCount === 1 && !inspection.activeContentDetected, "fixture must contain one passive page");

    const payload = buildMinimalLensPayload(generatedAt);
    const canonicalArtifact = buildArtifact({ payload, pdfBytes, reportId: "p36-exact-report" });
    const snapshot = buildPass4822AccountCustomerArtifactSnapshot({
      accountId: ownerAccountId,
      surface: "lens",
      payloadKind: "lens_report_v1",
      reportId: "p36-exact-report",
      requestedTier: "basic",
      deliveredTier: "basic",
      locale: "en",
      title: "P36 exact PDF integration",
      subject: "P36 exact report",
      generatedAt,
      payload,
      canonicalArtifact,
      pdfStorage: PASS4824_ACCOUNT_CUSTOMER_ARTIFACT_EXACT_PDF_STORAGE,
    });
    check(verifyPass4822AccountCustomerArtifactSnapshot(snapshot), "exact snapshot must verify before storage");

    const prefixOnlyBytes = new TextEncoder().encode("%PDF-not-a-valid-pdf");
    assert.throws(() => buildExactCustomerPdfDelivery({
      pdfBytes: prefixOnlyBytes,
      expectedPdfSha256: sha256BytesDigest(prefixOnlyBytes),
      disposition: "attachment",
      filenameStem: "P36 invalid PDF",
    }), /exact_customer_pdf_header_invalid/u, "PDF-like prefix bytes must be rejected at delivery");
    assertions += 1;
    const shallowFakeBytes = new TextEncoder().encode(
      "%PDF-1.7\n1 0 obj\n<< /Type /Page >>\nendobj\n%%EOF\n",
    );
    const shallowFakeArtifact = buildArtifact({
      payload,
      pdfBytes: shallowFakeBytes,
      reportId: "p36-structurally-invalid-report",
    });
    const shallowFakeSnapshot = buildPass4822AccountCustomerArtifactSnapshot({
      accountId: ownerAccountId,
      surface: "lens",
      payloadKind: "lens_report_v1",
      reportId: "p36-structurally-invalid-report",
      requestedTier: "basic",
      deliveredTier: "basic",
      locale: "en",
      title: "P36 structurally invalid PDF",
      subject: "P36 invalid report",
      generatedAt,
      payload,
      canonicalArtifact: shallowFakeArtifact,
      pdfStorage: PASS4824_ACCOUNT_CUSTOMER_ARTIFACT_EXACT_PDF_STORAGE,
    });
    await rejects(
      storePass4824AccountCustomerArtifactPdfBundle({
        accountId: ownerAccountId,
        snapshot: shallowFakeSnapshot,
        pdfBytes: shallowFakeBytes,
        client: null,
      }),
      /account_customer_artifact_pdf_structure_invalid/u,
      "digest-matched PDF-like text without a catalog/page tree/xref must fail at immutable storage",
    );

    const stored = await storePass4824AccountCustomerArtifactPdfBundle({
      accountId: ownerAccountId,
      snapshot,
      pdfBytes,
      client: null,
    });
    check(stored.created && stored.source === "memory", "first atomic in-memory bundle write must create both records");
    check(Buffer.from(stored.blob.pdfBytes).equals(Buffer.from(pdfBytes)), "stored blob must preserve exact input bytes");
    check(stored.blob.pdfDigest === canonicalArtifact.pdfDigest, "stored blob must bind canonical PDF SHA-256");
    check(stored.blob.pdfByteLength === pdfBytes.byteLength, "stored blob must bind canonical byte length");

    const idempotent = await storePass4824AccountCustomerArtifactPdfBundle({
      accountId: ownerAccountId,
      snapshot,
      pdfBytes,
      client: null,
    });
    check(!idempotent.created, "byte-identical retry must resolve idempotently");

    const foundSnapshot = await getPass4822AccountCustomerArtifactSnapshot({
      accountId: ownerAccountId,
      snapshotId: snapshot.snapshotId,
      client: null,
    });
    const foundBlob = await getPass4824AccountCustomerArtifactPdfBlob({
      accountId: ownerAccountId,
      snapshotId: snapshot.snapshotId,
      client: null,
    });
    const foundMetadata = await getPass4824AccountCustomerArtifactPdfMetadata({
      accountId: ownerAccountId,
      snapshotId: snapshot.snapshotId,
      client: null,
    });
    check(foundSnapshot?.snapshot.snapshotDigest === snapshot.snapshotDigest, "lookup must return the stored immutable snapshot");
    check(foundBlob?.blob.pdfDigest === canonicalArtifact.pdfDigest, "blob lookup must preserve the expected hash");
    check(foundMetadata?.blob.recordDigest === foundBlob?.blob.recordDigest, "metadata and byte lookup must bind the same record");
    check(Boolean(foundBlob) && Boolean(foundSnapshot), "exact bundle lookups must be present together");
    assertPass4824PdfBlobMatchesSnapshot({
      blob: foundBlob!.blob,
      snapshot: foundSnapshot!.snapshot,
      accountId: ownerAccountId,
    });
    assertions += 1;

    const preview = buildExactCustomerPdfDelivery({
      pdfBytes: foundBlob!.blob.pdfBytes,
      expectedPdfSha256: foundSnapshot!.snapshot.canonicalArtifact.pdfDigest,
      disposition: "inline",
      filenameStem: "P36 exact report",
    });
    const download = buildExactCustomerPdfDelivery({
      pdfBytes: foundBlob!.blob.pdfBytes,
      expectedPdfSha256: foundSnapshot!.snapshot.canonicalArtifact.pdfDigest,
      disposition: "attachment",
      filenameStem: "P36 exact report",
    });
    const parity = verifyExactCustomerPdfPreviewDownloadPair({
      pdfBytes: foundBlob!.blob.pdfBytes,
      expectedPdfSha256: foundSnapshot!.snapshot.canonicalArtifact.pdfDigest,
      filenameStem: "P36 exact report",
    });
    check(Buffer.from(preview.bytes).equals(Buffer.from(pdfBytes)), "preview must equal originally stored bytes");
    check(Buffer.from(download.bytes).equals(Buffer.from(pdfBytes)), "download must equal originally stored bytes");
    check(Buffer.from(preview.bytes).equals(Buffer.from(download.bytes)), "preview and download bodies must be byte-identical");
    check(preview.pdfSha256 === download.pdfSha256 && preview.pdfSha256 === canonicalArtifact.pdfDigest, "both dispositions must preserve the stored hash");
    check(preview.byteLength === download.byteLength && preview.byteLength === pdfBytes.byteLength, "both dispositions must preserve the stored length");
    check(preview.headers["content-disposition"].startsWith("inline;"), "preview must be inline");
    check(download.headers["content-disposition"].startsWith("attachment;"), "download must be attachment");
    check(preview.headers["content-type"] === "application/pdf" && download.headers["content-type"] === "application/pdf", "both dispositions must remain PDF");
    check(parity.pass && parity.byteIdentical && parity.contentDispositionDifferent, "shared parity receipt must pass exact bytes with disposition-only delivery difference");

    const tamperedBlob = {
      ...foundBlob!.blob,
      pdfBytes: new Uint8Array(foundBlob!.blob.pdfBytes),
    };
    tamperedBlob.pdfBytes[tamperedBlob.pdfBytes.byteLength - 8] ^= 0x01;
    check(!verifyPass4824AccountCustomerArtifactPdfBlob(tamperedBlob), "post-storage byte tampering must invalidate the blob");
    await rejects(
      Promise.resolve().then(() => assertPass4824PdfBlobMatchesSnapshot({
        blob: tamperedBlob,
        snapshot,
        accountId: ownerAccountId,
      })),
      /account_customer_artifact_pdf_blob_invalid/u,
      "tampered bytes must fail the snapshot binding verifier",
    );
    const afterTamperAttempt = await getPass4824AccountCustomerArtifactPdfBlob({
      accountId: ownerAccountId,
      snapshotId: snapshot.snapshotId,
      client: null,
    });
    check(Buffer.from(afterTamperAttempt!.blob.pdfBytes).equals(Buffer.from(pdfBytes)), "mutating a returned clone must not mutate immutable storage");

    const conflictingSnapshot = buildPass4822AccountCustomerArtifactSnapshot({
      accountId: ownerAccountId,
      surface: "lens",
      payloadKind: "lens_report_v1",
      reportId: "p36-exact-report",
      requestedTier: "basic",
      deliveredTier: "basic",
      locale: "en",
      title: "P36 conflicting title",
      subject: "P36 exact report",
      generatedAt,
      payload,
      canonicalArtifact,
      pdfStorage: PASS4824_ACCOUNT_CUSTOMER_ARTIFACT_EXACT_PDF_STORAGE,
    });
    check(conflictingSnapshot.snapshotId === snapshot.snapshotId, "conflict fixture must target the same immutable key");
    check(conflictingSnapshot.snapshotDigest !== snapshot.snapshotDigest, "conflict fixture must carry different immutable snapshot content");
    await rejects(
      storePass4824AccountCustomerArtifactPdfBundle({
        accountId: ownerAccountId,
        snapshot: conflictingSnapshot,
        pdfBytes,
        client: null,
      }),
      /account_customer_artifact_immutable_conflict/u,
      "same key with different valid snapshot content must fail closed",
    );

    const crossAccountSnapshot = await getPass4822AccountCustomerArtifactSnapshot({
      accountId: otherAccountId,
      snapshotId: snapshot.snapshotId,
      client: null,
    });
    check(crossAccountSnapshot === null, "cross-account snapshot lookup must disclose nothing");
    await rejects(
      getPass4824AccountCustomerArtifactPdfBlob({
        accountId: otherAccountId,
        snapshotId: snapshot.snapshotId,
        client: null,
      }),
      /account_customer_artifact_pdf_owner_immutable_conflict/u,
      "cross-account blob lookup must fail the owner binding",
    );

    const legacyArtifact = buildArtifact({ payload, pdfBytes, reportId: "p36-legacy-report" });
    assert.throws(() => buildPass4822AccountCustomerArtifactSnapshot({
      accountId: ownerAccountId,
      surface: "lens",
      payloadKind: "lens_report_v1",
      reportId: "p36-legacy-report",
      requestedTier: "basic",
      deliveredTier: "basic",
      locale: "en",
      title: "P36 forbidden new legacy artifact",
      subject: "P36 forbidden new legacy report",
      generatedAt,
      payload,
      canonicalArtifact: legacyArtifact,
    }), /account_customer_artifact_new_write_exact_pdf_required/u, "current builder must reject every new legacy PDF obligation");
    assertions += 1;
    const legacySnapshot = buildP36LegacyReadOnlySnapshot({
      accountId: ownerAccountId,
      generatedAt,
      payload,
      canonicalArtifact: legacyArtifact,
    });
    check(verifyPass4822AccountCustomerArtifactSnapshot(legacySnapshot), "historical legacy fixture must remain valid for read-only compatibility");
    const storedLegacy = await storePass4822AccountCustomerArtifactSnapshot({
      accountId: ownerAccountId,
      snapshot: legacySnapshot,
      client: null,
    });
    check(storedLegacy.created, "legacy snapshot fixture must be stored without an exact blob");
    const legacyBlob = await getPass4824AccountCustomerArtifactPdfBlob({
      accountId: ownerAccountId,
      snapshotId: legacySnapshot.snapshotId,
      client: null,
    });
    const legacyMetadata = await getPass4824AccountCustomerArtifactPdfMetadata({
      accountId: ownerAccountId,
      snapshotId: legacySnapshot.snapshotId,
      client: null,
    });
    check(legacyBlob === null && legacyMetadata === null, "legacy snapshot must not masquerade as exact immutable PDF storage");
    await rejects(
      storePass4824AccountCustomerArtifactPdfBundle({
        accountId: ownerAccountId,
        snapshot: legacySnapshot,
        pdfBytes,
        client: null,
      }),
      /account_customer_artifact_pdf_exact_marker_required/u,
      "legacy snapshot must fail closed at the exact atomic bundle boundary",
    );

    const cookieHeader = buildVelmereAccountCookie(buildVelmereAccountSession({
      accountId: ownerAccountId,
      provider: "preview",
      displayName: "P36 exact PDF owner",
    })).split(";", 1)[0];
    const otherCookieHeader = buildVelmereAccountCookie(buildVelmereAccountSession({
      accountId: otherAccountId,
      provider: "preview",
      displayName: "P36 other owner",
    })).split(";", 1)[0];
    const { GET: routeGet } = await import("../../app/api/account/customer-artifact/route.js");
    const routeUrl = (disposition: "preview" | "download", id = snapshot.snapshotId) =>
      `http://velmere.local/api/account/customer-artifact?id=${encodeURIComponent(id)}&format=pdf&disposition=${disposition}`;

    const previewResponse = await routeGet(new Request(routeUrl("preview"), {
      headers: { cookie: cookieHeader },
    }));
    const downloadResponse = await routeGet(new Request(routeUrl("download"), {
      headers: { cookie: cookieHeader },
    }));
    const previewHttpBytes = new Uint8Array(await previewResponse.arrayBuffer());
    const downloadHttpBytes = new Uint8Array(await downloadResponse.arrayBuffer());
    check(
      previewResponse.status === 200 && downloadResponse.status === 200,
      `real route handler must serve both dispositions: preview=${previewResponse.status}:${Buffer.from(previewHttpBytes).toString("utf8")}, download=${downloadResponse.status}:${Buffer.from(downloadHttpBytes).toString("utf8")}`,
    );
    check(Buffer.from(previewHttpBytes).equals(Buffer.from(pdfBytes)), "HTTP preview must serve the immutable stored bytes");
    check(Buffer.from(downloadHttpBytes).equals(Buffer.from(pdfBytes)), "HTTP download must serve the immutable stored bytes");
    check(Buffer.from(previewHttpBytes).equals(Buffer.from(downloadHttpBytes)), "HTTP preview and download bodies must be byte-identical");
    check(previewResponse.headers.get("content-disposition")?.startsWith("inline;") === true, "HTTP preview must be inline");
    check(downloadResponse.headers.get("content-disposition")?.startsWith("attachment;") === true, "HTTP download must be attachment");
    check(previewResponse.headers.get("x-velmere-preview-download-parity") === "byte-identical", "HTTP preview must expose the exact parity state");
    check(downloadResponse.headers.get("x-velmere-artifact-digest") === canonicalArtifact.artifactDigest, "HTTP download must bind the canonical artifact digest");

    const crossAccountResponse = await routeGet(new Request(routeUrl("download"), {
      headers: { cookie: otherCookieHeader },
    }));
    check(crossAccountResponse.status === 404, "real route handler must not disclose another account's artifact");

    const exactDetailResponse = await routeGet(new Request(
      `http://velmere.local/api/account/customer-artifact?id=${encodeURIComponent(snapshot.snapshotId)}&format=json`,
      { headers: { cookie: cookieHeader } },
    ));
    const exactDetailBody = await exactDetailResponse.json() as {
      schemaVersion?: string;
      artifact?: { pdfAvailability?: string; exactStoredPdf?: boolean; previewRoute?: string | null; downloadRoute?: string | null };
    };
    check(
      exactDetailResponse.status === 200
        && exactDetailBody.schemaVersion === "velmere.public-account-artifact.v3"
        && exactDetailBody.artifact?.pdfAvailability === "exact_immutable_blob"
        && exactDetailBody.artifact.exactStoredPdf === true
        && typeof exactDetailBody.artifact.previewRoute === "string"
        && typeof exactDetailBody.artifact.downloadRoute === "string",
      "exact artifact JSON must expose only the v3 exact immutable delivery contract",
    );

    const listResponse = await routeGet(new Request(
      "http://velmere.local/api/account/customer-artifact?format=json&limit=24",
      { headers: { cookie: cookieHeader } },
    ));
    const listBody = await listResponse.json() as {
      schemaVersion?: string;
      artifacts?: Array<{ artifactId?: string; pdfAvailability?: string; previewRoute?: string | null; downloadRoute?: string | null }>;
    };
    const exactListRow = listBody.artifacts?.find((row) => row.artifactId === snapshot.snapshotId);
    const legacyListRow = listBody.artifacts?.find((row) => row.artifactId === legacySnapshot.snapshotId);
    check(
      listResponse.status === 200
        && listBody.schemaVersion === "velmere.public-account-artifact-list.v3"
        && exactListRow?.pdfAvailability === "exact_immutable_blob"
        && typeof exactListRow.previewRoute === "string"
        && typeof exactListRow.downloadRoute === "string"
        && legacyListRow?.pdfAvailability === "legacy_exact_bytes_unavailable"
        && legacyListRow.previewRoute === null
        && legacyListRow.downloadRoute === null,
      "artifact list must advertise routes only for exact immutable stored bytes",
    );

    const legacyDetailResponse = await routeGet(new Request(
      `http://velmere.local/api/account/customer-artifact?id=${encodeURIComponent(legacySnapshot.snapshotId)}&format=json`,
      { headers: { cookie: cookieHeader } },
    ));
    const legacyDetailBody = await legacyDetailResponse.json() as {
      schemaVersion?: string;
      artifact?: { pdfAvailability?: string; exactStoredPdf?: boolean; previewRoute?: string | null; downloadRoute?: string | null };
    };
    check(
      legacyDetailResponse.status === 200
        && legacyDetailBody.schemaVersion === "velmere.public-account-artifact.v3"
        && legacyDetailBody.artifact?.pdfAvailability === "legacy_exact_bytes_unavailable"
        && legacyDetailBody.artifact.exactStoredPdf === false
        && legacyDetailBody.artifact.previewRoute === null
        && legacyDetailBody.artifact.downloadRoute === null,
      "legacy metadata may remain readable but must publish no PDF route",
    );

    for (const legacyDisposition of ["preview", "download"] as const) {
      const legacyResponse = await routeGet(new Request(routeUrl(legacyDisposition, legacySnapshot.snapshotId), {
        headers: { cookie: cookieHeader },
      }));
      const legacyBody = await legacyResponse.json() as { error?: string; pdfAvailability?: string; retryable?: boolean };
      check(
        legacyResponse.status === 409
          && legacyBody.error === "artifact_pdf_exact_bytes_unavailable"
          && legacyBody.pdfAvailability === "legacy_exact_bytes_unavailable"
          && legacyBody.retryable === false
          && legacyResponse.headers.get("x-velmere-contract") === "velmere.public-account-artifact-error.v3",
        `legacy ${legacyDisposition} must fail closed without rerendering`,
      );
    }

    const receiptWithoutIntegrity = {
      schemaVersion: "velmere.p36.exact-customer-pdf-integration.v1",
      generatedAt,
      status: "PASS_P36_EXACT_CUSTOMER_PDF_STORAGE_TO_DELIVERY_INTEGRATION",
      assertions,
      pdf: {
        parser: "pdfinfo",
        version: "1.4",
        pages: 1,
        byteLength: pdfBytes.byteLength,
        sha256: sha256BytesDigest(pdfBytes),
        deterministicStructuralValidation: {
          valid: inspection.valid,
          headerValid: inspection.headerValid,
          eofValid: inspection.eofValid,
          pageCount: inspection.pageCount,
          activeContentDetected: inspection.activeContentDetected,
        },
      },
      exercised: [
        "snapshot_build_and_verify",
        "atomic_memory_snapshot_pdf_bundle",
        "immutable_lookup_and_binding",
        "exact_inline_attachment_delivery",
        "tamper_detection",
        "immutable_conflict",
        "cross_account_denial",
        "legacy_new_write_rejected",
        "legacy_read_only_metadata_compatibility",
        "legacy_preview_and_download_fail_closed_without_rerender",
        "v3_pdf_availability_contract",
        "signed_preview_cookie_route_handler",
        "http_preview_download_byte_parity",
        "http_cross_account_denial",
        "pdf_structural_validation_shared_boundary",
        "pdf_like_prefix_and_shallow_structure_rejection",
      ],
      creditBoundary: {
        internalInMemoryIntegration: true,
        routeHandlerExecuted: true,
        durableDatabaseExecuted: false,
        deployedHttpExecuted: false,
        realCustomerExecuted: false,
      },
      sourceBindings: {
        routeHandler: sourceBinding("lib/server/lazy-route-modules/account--customer-artifact.ts"),
        snapshotStore: sourceBinding("lib/reporting/account-customer-artifact-store.ts"),
        immutablePdfBlob: sourceBinding("lib/reporting/account-customer-artifact-pdf-blob.ts"),
        exactDelivery: sourceBinding("lib/reporting/exact-customer-pdf-delivery.ts"),
        structuralValidation: sourceBinding("lib/reporting/pdf-structural-validation.ts"),
      },
      truthBoundary: "Current-source local integration executes the real route handler with a signed non-production preview cookie and exact immutable in-memory bytes. It grants no durable database/RLS, deployed HTTP, real-customer, retention, sale, GO_PAID or LIVE credit.",
    } as const;
    const receipt = {
      ...receiptWithoutIntegrity,
      integritySha256: sha256Digest(canonicalJson(receiptWithoutIntegrity)),
    };
    const receiptPath = process.env.P36_TEST_RECEIPT_OUTPUT
      ?? "artifacts/closure/p36/P36_EXACT_CUSTOMER_PDF_INTEGRATION.json";
    mkdirSync(path.dirname(receiptPath), { recursive: true });
    writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
    console.log(JSON.stringify(receipt, null, 2));
  } finally {
    if (originalNodeEnv === undefined) delete mutableEnv.NODE_ENV;
    else mutableEnv.NODE_ENV = originalNodeEnv;
    if (originalVercelEnv === undefined) delete mutableEnv.VERCEL_ENV;
    else mutableEnv.VERCEL_ENV = originalVercelEnv;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
