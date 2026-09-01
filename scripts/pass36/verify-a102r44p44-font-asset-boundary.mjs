#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { walk } from "./r44p44-source-lib.mjs";

const root = path.resolve(process.argv[2] ?? process.cwd());
const policy = JSON.parse(
  fs.readFileSync(path.join(root, "config/pass36/r44p44-font-asset-boundary.json"), "utf8"),
);
const rows = walk(root);
const fontBinaryPattern = /\.(?:ttf|otf|woff2?|eot)$/iu;
const bundledFontFiles = rows.filter((row) => fontBinaryPattern.test(row.path));
const renderer = fs.readFileSync(path.join(root, "lib/search/lens-pdf-renderer.ts"), "utf8");
const css = fs.readFileSync(path.join(root, "app/styles/premium-ui.css"), "utf8");
const checks = [
  ["policy:browser-no-bundled-font", policy.browserTypography?.bundledFontFilesAllowed === false],
  ["policy:pdf-external-runtime", policy.pdfTypography?.mode === "EXTERNAL_RUNTIME_FONT_EXACT_HASH_REQUIRED"],
  ["policy:pdf-env", policy.pdfTypography?.environmentVariable === "VELMERE_PDF_FONT_PATH"],
  ["policy:pdf-exact-sha", /^[a-f0-9]{64}$/u.test(policy.pdfTypography?.expectedSha256 ?? "")],
  ["policy:fail-closed-missing", policy.pdfTypography?.failClosedWhenMissing === true],
  ["policy:fail-closed-hash", policy.pdfTypography?.failClosedWhenHashMismatched === true],
  ["source:no-font-binaries", bundledFontFiles.length === 0],
  ["renderer:env-required", renderer.includes("lens_pdf_external_font_path_required")],
  ["renderer:hash-mismatch-blocked", renderer.includes("lens_pdf_external_font_sha256_mismatch")],
  ["renderer:expected-sha", renderer.includes(policy.pdfTypography.expectedSha256)],
  ["css:no-font-face", !css.includes("@font-face")],
  ["css:no-font-url", !css.includes("/fonts/velmere/")],
  ["credit:customer-false", policy.customerCredit === false],
  ["credit:sale-false", policy.saleCredit === false],
  ["credit:live-false", policy.liveCredit === false],
  ["credit:world-class-false", policy.worldClassCredit === false]
].map(([id, passed]) => ({ id, passed: Boolean(passed) }));
const failed = checks.filter((check) => !check.passed);
const receipt = {
  schemaVersion: "velmere.pass36.a102r44p44.font-asset-boundary-receipt.v1",
  revisionId: policy.revisionId,
  status: failed.length ? "FAIL_R44P44_FONT_ASSET_BOUNDARY" : "PASS_R44P44_FONT_ASSET_BOUNDARY",
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  bundledFontFiles,
  sourceFontBinaryCount: bundledFontFiles.length,
  fontBytesIncludedInSource: false,
  fontBytesIncludedInMaterials: false,
  customerCredit: false,
  saleCredit: false,
  liveCredit: false,
  worldClassCredit: false,
  rows: checks,
};
const outputPath = process.env.R44P44_FONT_BOUNDARY_OUTPUT;
if (outputPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(receipt, null, 2)}\n`);
}
console.log(JSON.stringify(receipt, null, 2));
if (failed.length) process.exit(1);
