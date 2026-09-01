import assert from "node:assert/strict";
import {
  P86_EXACT_IMMUTABLE_PDF_AVAILABLE,
  P86_LEGACY_EXACT_PDF_UNAVAILABLE,
  P86_PUBLIC_ACCOUNT_ARTIFACT_LIST_SCHEMA,
  P86_PUBLIC_ACCOUNT_ARTIFACT_SCHEMA,
  expectedP86PublicAccountArtifactPdfRoute,
  p86PublicAccountArtifactListMatchesDetail,
  parseP86PublicAccountArtifactDetail,
  parseP86PublicAccountArtifactList,
} from "../../lib/reporting/public-account-artifact-contract.ts";

const checks: string[] = [];
function check(name: string, condition: unknown) {
  assert.equal(Boolean(condition), true, name);
  checks.push(name);
}

const artifactDigest = `sha256:${"a".repeat(64)}`;
const pdfDigest = `sha256:${"c".repeat(64)}`;
const artifactId = `artifact-lens-${"b".repeat(16)}-${"a".repeat(64)}`;
const exactRow = {
  artifactId,
  surface: "lens",
  reportId: "lens-report-1",
  requestedTier: "basic",
  deliveredTier: "basic",
  locale: "pl",
  title: "Velmère Browser Basic",
  subject: "EUR/PLN",
  generatedAt: "2026-08-24T18:00:00.000Z",
  integrityToken: artifactDigest,
  pdfSha256: pdfDigest,
  pageCount: 2,
  pdfAvailability: P86_EXACT_IMMUTABLE_PDF_AVAILABLE,
  exactStoredPdf: true,
  previewRoute: expectedP86PublicAccountArtifactPdfRoute(artifactId, "preview"),
  downloadRoute: expectedP86PublicAccountArtifactPdfRoute(artifactId, "download"),
} as const;
const exactList = {
  ok: true,
  schemaVersion: P86_PUBLIC_ACCOUNT_ARTIFACT_LIST_SCHEMA,
  artifacts: [exactRow],
} as const;
const parsedList = parseP86PublicAccountArtifactList(exactList);
check("valid exact list", parsedList?.artifacts.length === 1);
check("exact list keeps immutable routes", parsedList?.artifacts[0]?.previewRoute === exactRow.previewRoute);

const legacyId = `artifact-lens-${"b".repeat(16)}-${"a".repeat(40)}`;
const legacyRow = {
  ...exactRow,
  artifactId: legacyId,
  pdfAvailability: P86_LEGACY_EXACT_PDF_UNAVAILABLE,
  exactStoredPdf: false,
  previewRoute: null,
  downloadRoute: null,
} as const;
check("valid legacy list remains linkless", parseP86PublicAccountArtifactList({ ...exactList, artifacts: [legacyRow] })?.artifacts[0]?.previewRoute === null);
check("duplicate ids rejected", parseP86PublicAccountArtifactList({ ...exactList, artifacts: [exactRow, exactRow] }) === null);
check("extra list field rejected", parseP86PublicAccountArtifactList({ ...exactList, unexpected: true }) === null);
check("external preview route rejected", parseP86PublicAccountArtifactList({
  ...exactList,
  artifacts: [{ ...exactRow, previewRoute: "https://attacker.invalid/report.pdf" }],
}) === null);
check("wrong-id route rejected", parseP86PublicAccountArtifactList({
  ...exactList,
  artifacts: [{ ...exactRow, downloadRoute: `${exactRow.downloadRoute}&id=other` }],
}) === null);
check("digest/id mismatch rejected", parseP86PublicAccountArtifactList({
  ...exactList,
  artifacts: [{ ...exactRow, integrityToken: `sha256:${"d".repeat(64)}` }],
}) === null);
check("non-ISO timestamp rejected", parseP86PublicAccountArtifactList({
  ...exactList,
  artifacts: [{ ...exactRow, generatedAt: "2026-08-24" }],
}) === null);

const exactDetail = {
  ok: true,
  schemaVersion: P86_PUBLIC_ACCOUNT_ARTIFACT_SCHEMA,
  artifact: {
    ...exactRow,
    previewDownloadByteIdentical: true,
    preview: { rawNestedPreviewMustNotBeRendered: true },
  },
} as const;
const parsedDetail = parseP86PublicAccountArtifactDetail(exactDetail);
check("valid exact detail", parsedDetail?.artifact.previewDownloadByteIdentical === true);
check("list/detail exact match", Boolean(parsedList && parsedDetail && p86PublicAccountArtifactListMatchesDetail(parsedList.artifacts[0]!, parsedDetail.artifact)));
check("missing byte parity rejected", parseP86PublicAccountArtifactDetail({
  ...exactDetail,
  artifact: { ...exactDetail.artifact, previewDownloadByteIdentical: false },
}) === null);
check("missing blob route rejected", parseP86PublicAccountArtifactDetail({
  ...exactDetail,
  artifact: { ...exactDetail.artifact, previewRoute: null },
}) === null);
check("detail schema drift rejected", parseP86PublicAccountArtifactDetail({ ...exactDetail, schemaVersion: "velmere.public-account-artifact.v4" }) === null);
check("detail extra field rejected", parseP86PublicAccountArtifactDetail({
  ...exactDetail,
  artifact: { ...exactDetail.artifact, privatePayload: "denied" },
}) === null);

console.log(JSON.stringify({
  schemaVersion: "velmere.a102.account-customer-artifact-client-contract.v1",
  status: "PASS",
  checks: checks.length,
  passed: checks.length,
  failed: 0,
  nestedPreviewRendered: false,
}, null, 2));
