#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";

const checks = [];
const read = (path) => readFileSync(path, "utf8");
const has = (path, needle) => read(path).includes(needle);
const push = (id, passed, detail) => checks.push({ id, passed, detail });

const files = {
  pdfPremium: "lib/market-integrity/pass1334-pdf-premium-final.ts",
  mapGraph: "lib/market-integrity/pass1354-shield-map-evidence-graph-2.ts",
  brainTruth: "lib/market-integrity/pass1374-vlm-brain-source-truth-final.ts",
  lens: "lib/search/lens-report.ts",
  browser: "components/search/VelmereIntelligenceSearchClient.tsx",
  shieldMap: "components/market-integrity/ShieldMapClient.tsx",
  route: "app/api/search/lens-report/route.ts",
  doc: "docs/progress/PASS1334_1373_MEGA_PRODUCT_PASS.md",
};

for (const [id, path] of Object.entries(files)) push(`file_${id}`, existsSync(path), path);

push("pdf_premium_builder", has(files.pdfPremium, "buildPass1334PdfPremiumFinal") && has(files.pdfPremium, "sourceAppendix") && has(files.pdfPremium, "previewDownloadParity: \"same_payload_same_depth_same_claims\""), "PASS1334 builds premium PDF cover, appendix and parity contract");
push("shield_map_graph_builder", has(files.mapGraph, "buildPass1354ShieldMapEvidenceGraph2") && has(files.mapGraph, "why_verdict_graph_not_second_table") && has(files.mapGraph, "forbiddenRepeats"), "PASS1354 blocks price table/PDF clone and defines evidence graph");
push("vlm_brain_truth_builder", has(files.brainTruth, "buildPass1374VlmBrainSourceTruthFinal") && has(files.brainTruth, "no_random_copy_no_fake_live_no_hidden_missing_data") && has(files.brainTruth, "visible_uncertainty_not_filler"), "PASS1374 enforces source truth and no fake live claims");
push("lens_report_integrated", has(files.lens, "pass1334: Pass1334PdfPremiumFinal") && has(files.lens, "pass1354: Pass1354ShieldMapEvidenceGraph2") && has(files.lens, "pass1374: Pass1374VlmBrainSourceTruthFinal"), "LensReport type exposes all three mega-pass contracts");
push("lens_report_builders_called", has(files.lens, "const pass1334 = buildPass1334PdfPremiumFinal") && has(files.lens, "const pass1354 = buildPass1354ShieldMapEvidenceGraph2") && has(files.lens, "const pass1374 = buildPass1374VlmBrainSourceTruthFinal"), "LensReport builds all three contracts from canonical payload");
push("lens_report_guarded", has(files.lens, "report.pass1334?.previewDownloadParity") && has(files.lens, "report.pass1354?.role") && has(files.lens, "report.pass1374?.hallucinationBrake"), "isLensReport rejects payloads missing premium/truth invariants");
push("browser_reader_visible", has(files.browser, "velmere-pass1334-pdf-premium-final") && has(files.browser, "velmere-pass1374-source-truth") && has(files.browser, "data-pass1354-shield-map-evidence-graph"), "Browser reader renders PDF premium and source-truth strips");
push("shield_map_visible", has(files.shieldMap, "pass1354EvidenceGraph2") && has(files.shieldMap, "data-pass1354-shield-map-evidence-graph") && has(files.shieldMap, "drawer_only_no_price_table"), "Shield Map uses PASS1354 graph and drawer contract");
push("pdf_route_guarded", has(files.route, "premium_truth_release_gate_mismatch") && has(files.route, "x-velmere-pdf-premium-final") && has(files.route, "x-velmere-vlm-brain-source-truth"), "PDF route blocks mismatched premium/truth contracts and emits headers");
push("not_just_verifier", has(files.browser, "pdfPreview.report.pass1334.executiveBlocks") && has(files.shieldMap, "pass1354EvidenceGraph2.forbiddenRepeats.map") && has(files.route, "premiumStateLine"), "Pass affects UI and PDF route, not only a verifier");
push("large_pass_scope_doc", has(files.doc, "PASS1334–1373") && has(files.doc, "PDF Premium Final") && has(files.doc, "Shield Map Evidence Graph 2.0") && has(files.doc, "VLM Brain Source Truth Final"), "Progress doc records the larger product scope");

const failed = checks.filter((check) => !check.passed);
for (const check of checks) {
  console.log(`${check.passed ? "PASS" : "FAIL"} ${check.id} — ${check.detail}`);
}
if (failed.length) {
  console.error(`\nPASS1334–1373 verifier failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`\nPASS1334–1373 mega product pass verifier passed: ${checks.length}/${checks.length}`);
