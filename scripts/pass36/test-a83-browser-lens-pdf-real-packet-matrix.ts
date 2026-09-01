#!/usr/bin/env node
import fs from "node:fs";
import { A83_REVISION, buildA83Corpus, evaluateA83RealIntake, sha256, validateA83Policy, verifyA83CorpusManifest } from "../../lib/worldclass/pass36-a83-browser-lens-pdf-real-packet-runtime.ts";

const policy = JSON.parse(fs.readFileSync("config/pass36/a83-browser-lens-pdf-real-packet-policy.json", "utf8"));
const checks: Array<{id:string;passed:boolean;detail?:unknown}> = [];
const check = (id:string, passed:unknown, detail:unknown=null) => checks.push({ id, passed: Boolean(passed), detail });
validateA83Policy(policy);
check("policy:fixture-hash", sha256(fs.readFileSync(policy.fixtureCatalog.path)) === policy.fixtureCatalog.sha256);
check("policy:intake-hash", sha256(fs.readFileSync(policy.realIntakeIndex.path)) === policy.realIntakeIndex.sha256);
const generated = buildA83Corpus(process.cwd(), policy, { writeFiles: true });
const replay = buildA83Corpus(process.cwd(), policy, { writeFiles: false });
check("corpus:deterministic", generated.integrity.digest === replay.integrity.digest, { first: generated.integrity.digest, second: replay.integrity.digest });
check("corpus:verify", verifyA83CorpusManifest(process.cwd(), policy, generated, generated.integrity.digest).ok, generated.totals);
check("corpus:pdfs", generated.totals.physicalPdfs === 450, generated.totals);
check("corpus:pages", generated.totals.renderedPages === 2100, generated.totals);
check("corpus:projections", generated.totals.channelProjections === 2700, generated.totals);
check("corpus:mutations", generated.totals.semanticMutations === 8100 && generated.totals.mutationKilled === 8100 && generated.mutationFailures.length === 0, generated.totals);
check("corpus:locale-counts", Object.values(generated.totals.byLocale).every((value) => value === 150), generated.totals.byLocale);
check("corpus:tier-counts", Object.values(generated.totals.byTier).every((value) => value === 150), generated.totals.byTier);
check("corpus:class-counts", Object.values(generated.classCounts).every((value) => value === 10), generated.classCounts);
check("corpus:no-credit", generated.boundaries.realPacketCredit === 0 && generated.boundaries.browserCredit === 0 && generated.boundaries.secureDeliveryCredit === 0 && generated.boundaries.comprehensionCredit === 0 && generated.boundaries.paidGateEligible === false && generated.boundaries.saleEnabled === false, generated.boundaries);
const intake = JSON.parse(fs.readFileSync(policy.realIntakeIndex.path, "utf8"));
const real = evaluateA83RealIntake(intake, policy);
check("real:required", real.requiredCases === 50, real);
check("real:zero", real.packetBundles === 0 && real.rightsApproved === 0 && real.browserEvidence === 0 && real.secureDeliveryEvidence === 0 && real.accessibilityEvidence === 0 && real.comprehensionLabels === 0 && real.tierOutputs === 0 && real.realPacketReady === 0, real);
check("real:blocked", real.decision === "BLOCKED_REAL_PACKET_EVIDENCE", real.decision);
check("policy:gaps", policy.closedByA83.length === 31, policy.closedByA83.length);
check("policy:source-summary", policy.corpusOutput.sourceSummaryPath === "config/pass36/a83-source-evidence-summary.json", policy.corpusOutput.sourceSummaryPath);
check("policy:security", Object.values(policy.pdfSecurity as Record<string, unknown>).every((value) => value === true), policy.pdfSecurity);
check("policy:page-depth", (policy.tiers as Array<{ pageCount: number }>).map((row) => row.pageCount).join(",") === "2,4,8", policy.tiers);
check("policy:channels", policy.channels.length === 6, policy.channels);
check("policy:real-evidence", policy.realPacketRequiredEvidence.length === 10, policy.realPacketRequiredEvidence);
check("truth:no-sale", generated.entries.every((row) => row.saleEnabled === false && row.liveProven === false && row.paidGateEligible === false && row.notForSale === true));
const failed = checks.filter((row) => !row.passed);
const receipt = {
  schemaVersion: "velmere.pass36.a83.browser-lens-pdf-real-packet-test-receipt.v1",
  revisionId: A83_REVISION,
  generatedAt: policy.deterministicEpoch,
  status: failed.length ? "FAIL_A83_BROWSER_LENS_PDF_MATRIX" : "PASS_A83_LOCAL_SYNTHETIC_PHYSICAL_PDF_MATRIX_ONLY",
  summary: { checks: checks.length, passed: checks.length - failed.length, failed: failed.length },
  fixtureDenominators: generated.totals,
  manifestIntegrityDigest: generated.integrity.digest,
  realIntake: real,
  realPacketsVerified: 0,
  browserRuns: 0,
  secureDeliveries: 0,
  externalAccessibilityValidations: 0,
  customerComprehensionLabels: 0,
  paidGateEligible: false,
  liveProven: false,
  saleEnabled: false,
  failures: failed,
  checks,
  truthBoundary: policy.truthBoundary,
};
fs.mkdirSync("config/pass36", { recursive: true });
fs.writeFileSync("config/pass36/a83-test-receipt.json", `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
if (failed.length) process.exit(1);
