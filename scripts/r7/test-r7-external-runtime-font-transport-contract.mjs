import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const builderPath = path.join(root, "scripts/r7/build-r7-windows-transport.py");
const templatePath = path.join(root, "scripts/r7/templates/r7-final-exact-windows.yml.template");
const policyPath = path.join(root, "config/pass36/r44p44-font-asset-boundary.json");
const externalAssetRoot = path.resolve(root, "../external_runtime_assets");
const fontPath = path.join(externalAssetRoot, "manrope-pdf-latin-plus-ext.ttf");
const licensePath = path.join(externalAssetRoot, "OFL-Manrope.txt");
const python = process.env.PYTHON?.trim() || (process.platform === "win32" ? "python" : "python3");

const helper = String.raw`
import importlib.util
import json
from pathlib import Path
import sys

spec = importlib.util.spec_from_file_location("velmere_r7_windows_transport", sys.argv[1])
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
try:
    _, _, receipt = module.verify_external_runtime_font_assets(Path(sys.argv[2]), Path(sys.argv[3]))
    print(json.dumps({"ok": True, "receipt": receipt}, separators=(",", ":")))
except Exception as error:
    print(json.dumps({"ok": False, "error": str(error)}, separators=(",", ":")))
    raise SystemExit(2)
`;

function validate(font, license) {
  const result = spawnSync(python, ["-c", helper, builderPath, font, license], {
    cwd: root,
    encoding: "utf8",
  });
  const line = result.stdout.trim().split(/\r?\n/u).at(-1) ?? "";
  return { ...result, payload: line ? JSON.parse(line) : null };
}

const policy = JSON.parse(fs.readFileSync(policyPath, "utf8"));
const template = fs.readFileSync(templatePath, "utf8");
const nextConfig = fs.readFileSync(path.join(root, "next.config.mjs"), "utf8");
const currentExecutionTests = fs.readdirSync(path.join(root, "scripts/current-execution"))
  .filter((name) => /^(?:test|verify)-.+\.(?:mjs|mts|ts)$/u.test(name));

assert.equal(currentExecutionTests.length, 52);
assert.equal(policy.pdfTypography.mode, "EXTERNAL_RUNTIME_FONT_EXACT_HASH_REQUIRED");
assert.equal(policy.pdfTypography.environmentVariable, "VELMERE_PDF_FONT_PATH");
assert.equal(policy.pdfTypography.fontBytesIncludedInSource, false);
assert.equal(policy.pdfTypography.expectedSha256, "a07eea516ecb22957f162d68a559462c9af0534487669969d500f8e92aece0fa");
assert.match(template, /Verify exact external runtime PDF font and license/u);
assert.match(template, /materializedIntoRuntimeProjectBeforeBuild/u);
assert.match(template, /Materialize verified external PDF font inside runtime project/u);
assert.match(template, /r7-work\/r7-runtime\/external-assets/u);
assert.match(template, /VELMERE_PDF_FONT_PATH=\$AbsoluteFontPath/u);
assert.match(nextConfig, /outputFileTracingIncludes/u);
assert.match(nextConfig, /\/api\/search\/\\\\\[operation\\\\\]/u);
assert.match(nextConfig, /\.\/r7-runtime\/external-assets\/manrope-pdf-latin-plus-ext\.ttf/u);
assert.match(nextConfig, /\.\/r7-runtime\/external-assets\/OFL-Manrope\.txt/u);
assert.ok(
  template.indexOf("Verify every transported execution-slice byte")
    < template.indexOf("Materialize verified external PDF font inside runtime project"),
  "external runtime assets must be materialized only after the exact archive path set is verified",
);

const valid = validate(fontPath, licensePath);
assert.equal(valid.status, 0, valid.stderr);
assert.equal(valid.payload?.ok, true);
assert.deepEqual(valid.payload.receipt, {
  mode: "EXTERNAL_RUNTIME_FONT_EXACT_HASH_REQUIRED",
  environmentVariable: "VELMERE_PDF_FONT_PATH",
  fontBytesIncludedInSource: false,
  fontBytesIncludedInExecutionSlice: false,
  transportedInGitHubExecutionSurface: true,
  materializedIntoRuntimeProjectBeforeBuild: true,
  pdfFont: {
    logicalPath: "r7-runtime/external-assets/manrope-pdf-latin-plus-ext.ttf",
    byteLength: 46_464,
    sha256: "a07eea516ecb22957f162d68a559462c9af0534487669969d500f8e92aece0fa",
    gitBlobSha1: "716393b0614fdceaf6f5578694479466ed495b14",
  },
  license: {
    logicalPath: "r7-runtime/external-assets/OFL-Manrope.txt",
    byteLength: 4_384,
    sha256: "e01b637272e0cbdfb240184dd98ea5cc671556d9894dae2668d92ab2c906787c",
    gitBlobSha1: "472064afc4b8dec9079fab03b8ffafb617a1b2d8",
  },
});

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-r7-font-transport-test-"));
try {
  const badFont = path.join(temp, "manrope-pdf-latin-plus-ext.ttf");
  const badLicense = path.join(temp, "OFL-Manrope.txt");
  fs.copyFileSync(fontPath, badFont);
  fs.copyFileSync(licensePath, badLicense);
  fs.appendFileSync(badFont, Buffer.from([0]));
  const invalidFont = validate(badFont, licensePath);
  assert.equal(invalidFont.status, 2);
  assert.equal(invalidFont.payload?.ok, false);
  assert.match(invalidFont.payload?.error ?? "", /pdf_font_byte_length_mismatch/u);

  fs.appendFileSync(badLicense, "\n");
  const invalidLicense = validate(fontPath, badLicense);
  assert.equal(invalidLicense.status, 2);
  assert.equal(invalidLicense.payload?.ok, false);
  assert.match(invalidLicense.payload?.error ?? "", /pdf_font_license_byte_length_mismatch/u);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

process.stdout.write(`${JSON.stringify({
  status: "PASS_R7_EXTERNAL_RUNTIME_FONT_TRANSPORT_CONTRACT",
  currentExecutionDenominator: currentExecutionTests.length,
  exactFontBytes: 46_464,
  exactFontSha256: valid.payload.receipt.pdfFont.sha256,
  exactLicenseBytes: 4_384,
  exactLicenseSha256: valid.payload.receipt.license.sha256,
  fontBytesIncludedInSource: false,
  fontBytesIncludedInExecutionSlice: false,
  secretCount: 0,
  customerFinalCredit: false,
}, null, 2)}\n`);
