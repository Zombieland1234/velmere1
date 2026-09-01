#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  A83_REVISION,
  evaluateA83RealIntake,
  sha256,
  verifyA83CorpusManifest,
} from "../../lib/worldclass/pass36-a83-browser-lens-pdf-real-packet-runtime.ts";

type Check = { id: string; passed: boolean; detail?: unknown };
const root = process.cwd();
const policyPath = "config/pass36/a83-browser-lens-pdf-real-packet-policy.json";
const receiptPath = "config/pass36/a83-test-receipt.json";
const historicalSummaryPath = "config/pass36/a83-source-evidence-summary.json";
const outputPath = "artifacts/closure/p32/runtime/a83-current-byte-revalidation.json";
const manifestPath = "artifacts/pass36/a83/PASS36_A83_BROWSER_LENS_PDF_CORPUS_MANIFEST.json";
const rasterPath = "artifacts/pass36/a83/PASS36_A83_BROWSER_LENS_PDF_RASTER_QA_RECEIPT.json";
const fontPath = process.env.VELMERE_PDF_FONT_PATH || "/mnt/data/velmere_external_assets/manrope-pdf-latin-plus-ext.ttf";

const j = (file: string) => JSON.parse(fs.readFileSync(file, "utf8"));
const policy = j(policyPath);
const receipt = j(receiptPath);
const manifest = j(manifestPath);
const raster = j(rasterPath);
const intake = j(policy.realIntakeIndex.path);
const historicalSummary = j(historicalSummaryPath);
const checks: Check[] = [];
const check = (id: string, passed: unknown, detail: unknown = null) => checks.push({ id, passed: Boolean(passed), detail });

check("policy:revision", policy.revisionId === A83_REVISION, policy.revisionId);
check("policy:fixture-hash", sha256(fs.readFileSync(policy.fixtureCatalog.path)) === policy.fixtureCatalog.sha256, policy.fixtureCatalog);
check("policy:intake-hash", sha256(fs.readFileSync(policy.realIntakeIndex.path)) === policy.realIntakeIndex.sha256, policy.realIntakeIndex);
check("receipt:pass", receipt.status === "PASS_A83_LOCAL_SYNTHETIC_PHYSICAL_PDF_MATRIX_ONLY" && receipt.summary?.failed === 0, receipt.summary);
check("receipt:denominators", receipt.fixtureDenominators?.physicalPdfs === 450 && receipt.fixtureDenominators?.renderedPages === 2100 && receipt.fixtureDenominators?.channelProjections === 2700 && receipt.fixtureDenominators?.semanticMutations === 8100 && receipt.fixtureDenominators?.mutationKilled === 8100, receipt.fixtureDenominators);

const verified = verifyA83CorpusManifest(root, policy, manifest, receipt.manifestIntegrityDigest);
check("manifest:verified-current-byte", verified?.ok === true, verified);
check("manifest:denominators", manifest.totals?.physicalPdfs === 450 && manifest.totals?.renderedPages === 2100 && manifest.totals?.channelProjections === 2700 && manifest.totals?.semanticMutations === 8100 && manifest.totals?.mutationKilled === 8100, manifest.totals);
check("manifest:locales", Object.values(manifest.totals?.byLocale ?? {}).every((value) => value === 150), manifest.totals?.byLocale);
check("manifest:tiers", Object.values(manifest.totals?.byTier ?? {}).every((value) => value === 150), manifest.totals?.byTier);
check("manifest:no-credit", manifest.boundaries?.realPacketCredit === 0 && manifest.boundaries?.browserCredit === 0 && manifest.boundaries?.secureDeliveryCredit === 0 && manifest.boundaries?.comprehensionCredit === 0 && manifest.boundaries?.paidGateEligible === false && manifest.boundaries?.saleEnabled === false, manifest.boundaries);

check("raster:pass", raster.status === "PASS_A83_PDF_RASTER_AND_EXTERNAL_PARSE_QA" && raster.pdfCount === 450 && raster.renderedPageCount === 2100 && raster.expectedPageCount === 2100, { status: raster.status, pdfCount: raster.pdfCount, renderedPageCount: raster.renderedPageCount });
check("raster:no-blank-or-edge", raster.blankPages === 0 && raster.pagesTouchingRasterEdge === 0, { blankPages: raster.blankPages, pagesTouchingRasterEdge: raster.pagesTouchingRasterEdge });
check("raster:parsers", raster.pypdfPassed === 450 && raster.pdfinfoPassed === 450 && raster.pdftotextPassed === 450 && raster.localeMarkerPassed === 450 && raster.ghostscriptSamplePassed === 45 && raster.failedDocuments === 0 && (raster.failures?.length ?? 0) === 0, { pypdfPassed: raster.pypdfPassed, pdfinfoPassed: raster.pdfinfoPassed, pdftotextPassed: raster.pdftotextPassed, localeMarkerPassed: raster.localeMarkerPassed, ghostscriptSamplePassed: raster.ghostscriptSamplePassed, failedDocuments: raster.failedDocuments });

const expectedFontSha = "a07eea516ecb22957f162d68a559462c9af0534487669969d500f8e92aece0fa";
const fontExists = fs.existsSync(fontPath);
const fontSha = fontExists ? sha256(fs.readFileSync(fontPath)) : null;
const fontBytes = fontExists ? fs.statSync(fontPath).size : 0;
check("font:external-exact", fontExists && fontSha === expectedFontSha && fontBytes === 46464, { fontPath, fontSha, fontBytes });
check("font:not-copied-into-source", !fs.existsSync("public/fonts/velmere/manrope-pdf-latin-plus-ext.ttf"), "public/fonts/velmere/manrope-pdf-latin-plus-ext.ttf");

const real = evaluateA83RealIntake(intake, policy);
check("real:blocked", real.decision === "BLOCKED_REAL_PACKET_EVIDENCE" && real.realPacketReady === 0 && real.rightsApproved === 0 && real.browserEvidence === 0 && real.secureDeliveryEvidence === 0 && real.comprehensionLabels === 0, real);
check("truth:no-paid-or-live", receipt.paidGateEligible === false && receipt.liveProven === false && receipt.saleEnabled === false && receipt.browserRuns === 0 && receipt.secureDeliveries === 0, { paidGateEligible: receipt.paidGateEligible, liveProven: receipt.liveProven, saleEnabled: receipt.saleEnabled, browserRuns: receipt.browserRuns, secureDeliveries: receipt.secureDeliveries });

const currentReceiptSha = sha256(fs.readFileSync(receiptPath));
const historicalReceiptSha = historicalSummary?.testReceipt?.sha256 ?? null;
const historicalSummaryState = historicalReceiptSha === currentReceiptSha
  ? "HISTORICAL_SUMMARY_MATCHES_CURRENT_RECEIPT"
  : "HISTORICAL_SUMMARY_STALE_NOT_USED_FOR_P32_CURRENT_BYTE_CREDIT";
check("historical-summary:staleness-explicit", typeof historicalSummaryState === "string", { historicalReceiptSha, currentReceiptSha, historicalSummaryState });

const failed = checks.filter((row) => !row.passed);
const report = {
  schemaVersion: "velmere.p32.a83-current-byte-revalidation.v1",
  generatedAt: new Date().toISOString(),
  state: failed.length ? "FAIL_CURRENT_BYTE_A83_REVALIDATION" : "PASS_CURRENT_BYTE_A83_PHYSICAL_PDF_AND_RASTER_QA_HISTORICAL_SUMMARY_NOT_PROMOTED",
  creditClass: "CURRENT_BYTE_INTERNAL_SYNTHETIC_PHYSICAL_PDF_REGRESSION_NO_BROWSER_NO_FINAL_HOLDOUT_NO_CUSTOMER_VALUE_NO_PAID_OR_BUILD_CREDIT",
  sourceBindings: {
    policyPath,
    policySha256: sha256(fs.readFileSync(policyPath)),
    testReceiptPath: receiptPath,
    testReceiptSha256: currentReceiptSha,
    manifestPath,
    manifestSha256: sha256(fs.readFileSync(manifestPath)),
    rasterPath,
    rasterSha256: sha256(fs.readFileSync(rasterPath)),
  },
  externalFontRecovery: {
    sourceClass: "HISTORICAL_MATERIALS_PDF_FONTFILE2_RECOVERY",
    fontPath,
    byteLength: fontBytes,
    sha256: fontSha,
    expectedSha256: expectedFontSha,
    copiedIntoSource: false,
    shippedToUser: false,
  },
  historicalSummary: {
    path: historicalSummaryPath,
    sha256: sha256(fs.readFileSync(historicalSummaryPath)),
    state: historicalSummaryState,
    rewritten: false,
  },
  summary: { checks: checks.length, passed: checks.length - failed.length, failed: failed.length },
  denominators: manifest.totals,
  rasterQa: {
    status: raster.status,
    pdfCount: raster.pdfCount,
    renderedPageCount: raster.renderedPageCount,
    blankPages: raster.blankPages,
    pagesTouchingRasterEdge: raster.pagesTouchingRasterEdge,
    ghostscriptSamplePassed: raster.ghostscriptSamplePassed,
    failedDocuments: raster.failedDocuments,
  },
  realIntake: real,
  limitations: [
    "The 450-document corpus is synthetic/offline fixture regression, not the final holdout.",
    "Browser runs and production secure deliveries remain zero.",
    "Provider/data rights, real customer comprehension, willingness-to-pay, paid-tier and production-build credit remain zero.",
    "The exact font was used as an external hash-bound QA dependency and is not copied into SOURCE or delivered as an artifact.",
    "The stale historical source summary is retained unchanged and is not promoted as current-byte evidence.",
  ],
  failures: failed,
  checks,
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exit(1);
