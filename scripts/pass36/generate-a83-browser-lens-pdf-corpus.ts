#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { buildA83Corpus, sha256, A83_REVISION } from "../../lib/worldclass/pass36-a83-browser-lens-pdf-real-packet-runtime.ts";

const root = process.cwd();
const policy = JSON.parse(fs.readFileSync("config/pass36/a83-browser-lens-pdf-real-packet-policy.json", "utf8"));
const corpusRoot = path.join(root, policy.corpusOutput.root);
fs.rmSync(corpusRoot, { recursive: true, force: true });
const manifest = buildA83Corpus(root, policy, { writeFiles: true });
const replay = buildA83Corpus(root, policy, { writeFiles: false });
if (manifest.integrity.digest !== replay.integrity.digest) throw new Error("a83_corpus_nondeterministic");
const runtime = {
  schemaVersion: "velmere.pass36.a83.browser-lens-pdf-fixture-runtime.v1",
  revisionId: A83_REVISION,
  generatedAt: policy.deterministicEpoch,
  status: "PASS_A83_SYNTHETIC_PHYSICAL_PDF_CORPUS_NO_REAL_CREDIT",
  manifestPath: policy.corpusOutput.manifestPath,
  manifestSha256: sha256(fs.readFileSync(policy.corpusOutput.manifestPath)),
  manifestIntegrityDigest: manifest.integrity.digest,
  totals: manifest.totals,
  classCounts: manifest.classCounts,
  claims: {
    realPacketsVerified: 0,
    providerRightsApproved: 0,
    browserRuns: 0,
    secureDeliveries: 0,
    externalAccessibilityValidations: 0,
    customerComprehensionLabels: 0,
    paidGateEligible: false,
    liveProven: false,
    saleEnabled: false,
  },
  truthBoundary: policy.truthBoundary,
};
fs.mkdirSync(path.dirname(policy.corpusOutput.runtimePath), { recursive: true });
fs.writeFileSync(policy.corpusOutput.runtimePath, `${JSON.stringify(runtime, null, 2)}\n`);
console.log(JSON.stringify(runtime, null, 2));
