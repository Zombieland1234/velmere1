import { existsSync, readFileSync } from 'node:fs';

const checks = [];
const add = (label, ok) => checks.push({ label, ok: Boolean(ok) });
const read = (file) => readFileSync(file, 'utf8');

const pkg = JSON.parse(read('package.json'));
const helperPath = 'lib/market-integrity/pass1254-pdf-typography-release-gate.ts';
const reportPath = 'lib/search/lens-report.ts';
const routePath = 'app/api/search/lens-report/route.ts';
const browserPath = 'components/search/VelmereIntelligenceSearchClient.tsx';
const cssPath = 'app/globals.css';
const docPath = 'docs/progress/PASS1254_1273_BUILD_PDF_TYPOGRAPHY.md';

const helper = existsSync(helperPath) ? read(helperPath) : '';
const report = read(reportPath);
const route = read(routePath);
const browser = read(browserPath);
const css = read(cssPath);
const doc = existsSync(docPath) ? read(docPath) : '';

add('PASS1254 helper exists', existsSync(helperPath));
add('Helper declares shared reader/PDF typography budget', helper.includes('pass1254-pdf-typography-release-gate') && helper.includes('same_reader_pdf_typography_budget'));
add('Helper locks no-overlap PDF footer and long-token policy', helper.includes('single_line_no_overlap') && helper.includes('hyphenate_then_ellipsis'));
add('LensReport type includes pass1254 contract', report.includes('pass1254: Pass1254PdfTypographyReleaseGate') && report.includes('const pass1254 = buildPass1254PdfTypographyReleaseGate'));
add('LensReport validator requires pass1254 budget', report.includes('report.pass1254?.previewDownloadTypography === "same_reader_pdf_typography_budget"'));
add('PDF route validates typography release before export', route.includes('pdf_typography_release_gate_mismatch') && route.includes('payload.pass1254.pdf.footerLane !== "single_line_no_overlap"'));
add('PDF route emits pass1254 header', route.includes('x-velmere-pdf-typography-release'));
add('PDF route clamps meta/footer lines through pass1254', route.includes('const compactMeta =') && route.includes('pass1254.lineClamp.footer') && route.includes('Typography ${pass1254.state}'));
add('Browser header exposes pass1254 attributes', browser.includes('data-pass1254-pdf-typography-release') && browser.includes('data-pass1254-manifest'));
add('Browser reader shows visible pass1254 status strip', browser.includes('velmere-pass1254-reader-typography') && browser.includes('pdfPreview.report.pass1254.copy.title'));
add('Browser article carries pass1254 line clamp', browser.includes('data-pass1254-line-clamp-body') && browser.includes('pdfPreview.report.pass1254.lineClamp.body'));
add('CSS hardens no-horizontal-overflow reader mode', css.includes('PASS1254–1273') && css.includes('data-pass1254-no-horizontal-overflow="true"') && css.includes('max-width: calc(100vw - 2rem)'));
add('Progress document keeps build truth honest', existsSync(docPath) && doc.includes('Full `npm run build` | NOT PROVEN HERE') && doc.includes('sandbox timeout at 240s'));
add('Package wires this verifier script', pkg.scripts?.['verify:pass1254-1273-build-pdf-typography'] === 'node scripts/verify-pass1254-1273-build-pdf-typography.mjs');
add('Package wires Node 24 build truth command', pkg.scripts?.['ci:node24-npm11-build-truth']?.includes('npm run typecheck') && pkg.scripts?.['ci:node24-npm11-build-truth']?.includes('npm run build'));

const failed = checks.filter((check) => !check.ok);
for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.label}`);
if (failed.length) {
  console.error(`\nPASS1254-1273 build/PDF typography verifier failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`\nPASS1254-1273 build/PDF typography verifier passed: ${checks.length}/${checks.length}`);
